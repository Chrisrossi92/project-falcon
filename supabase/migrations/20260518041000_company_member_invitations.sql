begin;

create extension if not exists "pgcrypto";

create table if not exists public.company_member_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  normalized_email text not null,
  status text not null default 'prepared',
  invited_by_user_id uuid not null references public.users(id) on delete restrict,
  invited_auth_id uuid null,
  invited_user_id uuid null references public.users(id) on delete set null,
  membership_id uuid null references public.company_memberships(id) on delete set null,
  role_ids uuid[] not null,
  primary_role_id uuid null references public.roles(id) on delete restrict,
  role_snapshot jsonb not null default '[]'::jsonb,
  reason text null,
  request_id text null,
  expires_at timestamptz not null,
  prepared_at timestamptz not null default now(),
  finalized_at timestamptz null,
  auth_invite_sent_at timestamptz null,
  accepted_at timestamptz null,
  cancelled_at timestamptz null,
  auth_error_code text null,
  auth_error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_member_invitations_status_check
    check (status in ('prepared', 'sent', 'accepted', 'cancelled', 'expired', 'auth_failed')),
  constraint company_member_invitations_email_check
    check (normalized_email = lower(trim(email)) and normalized_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint company_member_invitations_role_ids_nonempty
    check (array_length(role_ids, 1) is not null)
);

create index if not exists idx_company_member_invitations_company_status
  on public.company_member_invitations (company_id, status);

create index if not exists idx_company_member_invitations_company_email
  on public.company_member_invitations (company_id, normalized_email);

create index if not exists idx_company_member_invitations_invited_auth
  on public.company_member_invitations (invited_auth_id)
  where invited_auth_id is not null;

create index if not exists idx_company_member_invitations_request_id
  on public.company_member_invitations (request_id)
  where request_id is not null;

create unique index if not exists company_member_invitations_pending_unique
  on public.company_member_invitations (company_id, normalized_email)
  where status in ('prepared', 'sent');

create or replace function public.tg_company_member_invitations_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_company_member_invitations_touch_updated_at on public.company_member_invitations;
create trigger trg_company_member_invitations_touch_updated_at
before update on public.company_member_invitations
for each row execute function public.tg_company_member_invitations_touch_updated_at();

alter table public.company_member_invitations enable row level security;

revoke all privileges on table public.company_member_invitations from public, anon, authenticated;
grant all privileges on table public.company_member_invitations to service_role;

do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conname = 'company_audit_events_target_type_check'
       and conrelid = 'public.company_audit_events'::regclass
  ) then
    alter table public.company_audit_events
      drop constraint company_audit_events_target_type_check;
  end if;

  alter table public.company_audit_events
    add constraint company_audit_events_target_type_check
    check (target_type in ('bootstrap', 'company', 'user', 'membership', 'role_assignment', 'invitation'));
end;
$$;

create or replace function public.rpc_company_member_invite_prepare(
  p_email text,
  p_role_ids uuid[],
  p_primary_role_id uuid default null,
  p_expires_in interval default interval '7 days',
  p_reason text default null,
  p_request_id text default null
)
returns table (
  invitation_id uuid,
  company_id uuid,
  company_slug text,
  company_name text,
  invite_email text,
  invitation_status text,
  expires_at timestamptz,
  role_assignments jsonb,
  requires_auth_invite boolean,
  existing_app_user_id uuid,
  existing_auth_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_company_slug text;
  v_company_name text;
  v_company_status text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_display_email text := trim(coalesce(p_email, ''));
  v_role_ids uuid[] := coalesce(p_role_ids, '{}'::uuid[]);
  v_role_ids_sorted uuid[];
  v_role_count integer;
  v_valid_role_count integer;
  v_primary_role_id uuid;
  v_role_snapshot jsonb;
  v_existing_user_id uuid;
  v_existing_auth_id uuid;
  v_existing_membership_status text;
  v_existing_invitation public.company_member_invitations%rowtype;
  v_invitation_id uuid;
  v_expires_at timestamptz;
  v_requested_has_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'invalid_email'
      using errcode = '22023';
  end if;

  if not public.current_app_user_has_permission('users.invite') then
    raise exception 'invite_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.assign') then
    raise exception 'role_assign_permission_required'
      using errcode = '42501';
  end if;

  select c.slug, c.name, c.status
    into v_company_slug, v_company_name, v_company_status
    from public.companies c
   where c.id = v_company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from unnest(v_role_ids) requested(role_id)
     where requested.role_id is null
  ) then
    raise exception 'invalid_role_ids'
      using errcode = '22023';
  end if;

  select count(*), coalesce(array_agg(requested.role_id order by requested.role_id), '{}'::uuid[])
    into v_role_count, v_role_ids_sorted
    from unnest(v_role_ids) requested(role_id);

  if coalesce(v_role_count, 0) = 0 then
    raise exception 'invalid_role_ids'
      using errcode = '22023';
  end if;

  if v_role_count <> (
    select count(distinct requested.role_id)
      from unnest(v_role_ids) requested(role_id)
  ) then
    raise exception 'duplicate_role_ids'
      using errcode = '22023';
  end if;

  if p_primary_role_id is not null
     and not (p_primary_role_id = any(v_role_ids)) then
    raise exception 'primary_role_not_in_submitted_roles'
      using errcode = '22023';
  end if;

  select count(*)
    into v_valid_role_count
    from public.roles r
   where r.id = any(v_role_ids);

  if v_valid_role_count <> v_role_count then
    raise exception 'unknown_role_id'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.roles r
     where r.id = any(v_role_ids)
       and (
         r.company_id is not null
         or r.is_template is not true
         or r.is_system is not true
       )
  ) then
    raise exception 'role_preset_required'
      using errcode = '22023';
  end if;

  select coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false)
    into v_requested_has_owner
    from public.roles r
   where r.id = any(v_role_ids);

  if v_requested_has_owner
     and not public.current_app_user_has_permission('users.grant_owner') then
    raise exception 'owner_grant_permission_required'
      using errcode = '42501';
  end if;

  select coalesce(p_primary_role_id, r.id)
    into v_primary_role_id
    from public.roles r
   where r.id = any(v_role_ids)
   order by
     case when r.id = p_primary_role_id then 0 else 1 end,
     case lower(r.name)
       when 'owner' then 1
       when 'admin' then 2
       when 'reviewer' then 3
       when 'appraiser' then 4
       when 'billing' then 5
       else 99
     end,
     r.name
   limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'role_id', r.id,
        'role_name', r.name,
        'is_owner_role', r.is_owner_role,
        'is_primary', r.id = v_primary_role_id,
        'status', 'inactive'
      )
      order by
        case when r.id = v_primary_role_id then 0 else 1 end,
        case lower(r.name)
          when 'owner' then 1
          when 'admin' then 2
          when 'reviewer' then 3
          when 'appraiser' then 4
          when 'billing' then 5
          else 99
        end,
        r.name
    ),
    '[]'::jsonb
  )
    into v_role_snapshot
    from public.roles r
   where r.id = any(v_role_ids);

  select u.id, u.auth_id
    into v_existing_user_id, v_existing_auth_id
    from public.users u
   where lower(u.email) = v_email
   order by u.auth_id is null, u.created_at
   limit 1;

  if v_existing_user_id is not null then
    select cm.status
      into v_existing_membership_status
      from public.company_memberships cm
     where cm.company_id = v_company_id
       and cm.user_id = v_existing_user_id;

    if v_existing_membership_status = 'active' then
      raise exception 'member_already_active'
        using errcode = '23505';
    elsif v_existing_membership_status is not null then
      raise exception 'member_exists_inactive'
        using errcode = '23505';
    end if;
  end if;

  update public.company_member_invitations cmi
     set status = 'expired',
         updated_at = now()
   where cmi.company_id = v_company_id
     and cmi.status in ('prepared', 'sent')
     and cmi.expires_at <= now();

  select *
    into v_existing_invitation
    from public.company_member_invitations cmi
   where cmi.company_id = v_company_id
     and cmi.normalized_email = v_email
     and cmi.status in ('prepared', 'sent')
   order by cmi.created_at desc
   limit 1
   for update;

  if v_existing_invitation.id is not null then
    if (
      nullif(p_request_id, '') is not null
      and v_existing_invitation.request_id = nullif(p_request_id, '')
    ) or (
      v_existing_invitation.role_ids = v_role_ids_sorted
      and v_existing_invitation.primary_role_id is not distinct from v_primary_role_id
    ) then
      return query
      select
        v_existing_invitation.id,
        v_company_id,
        v_company_slug,
        v_company_name,
        v_existing_invitation.normalized_email,
        v_existing_invitation.status,
        v_existing_invitation.expires_at,
        v_existing_invitation.role_snapshot,
        (v_existing_auth_id is null),
        v_existing_user_id,
        v_existing_auth_id;
      return;
    end if;

    raise exception 'invite_already_pending'
      using errcode = '23505';
  end if;

  v_expires_at := now() + greatest(coalesce(p_expires_in, interval '7 days'), interval '1 hour');

  insert into public.company_member_invitations (
    company_id,
    email,
    normalized_email,
    status,
    invited_by_user_id,
    role_ids,
    primary_role_id,
    role_snapshot,
    reason,
    request_id,
    expires_at,
    metadata
  )
  values (
    v_company_id,
    v_display_email,
    v_email,
    'prepared',
    v_actor_user_id,
    v_role_ids_sorted,
    v_primary_role_id,
    v_role_snapshot,
    nullif(p_reason, ''),
    nullif(p_request_id, ''),
    v_expires_at,
    jsonb_strip_nulls(jsonb_build_object(
      'existing_app_user_id', v_existing_user_id,
      'has_existing_auth_identity', v_existing_auth_id is not null
    ))
  )
  returning id into v_invitation_id;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_company_id,
    v_actor_user_id,
    auth.uid(),
    'service_role',
    'company.member_invite_prepared',
    'invitation',
    v_invitation_id,
    jsonb_strip_nulls(jsonb_build_object(
      'normalized_email', v_email,
      'target_user_id', v_existing_user_id,
      'role_ids', to_jsonb(v_role_ids_sorted),
      'primary_role_id', v_primary_role_id,
      'reason', nullif(p_reason, ''),
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_invitation_id,
    v_company_id,
    v_company_slug,
    v_company_name,
    v_email,
    'prepared'::text,
    v_expires_at,
    v_role_snapshot,
    (v_existing_auth_id is null),
    v_existing_user_id,
    v_existing_auth_id;
end;
$$;

create or replace function public.rpc_company_member_invite_finalize(
  p_invitation_id uuid,
  p_auth_user_id uuid,
  p_auth_email text,
  p_auth_invite_sent boolean default true,
  p_auth_error_code text default null,
  p_auth_error_message text default null,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns table (
  invitation_id uuid,
  company_id uuid,
  invite_email text,
  invitation_status text,
  invited_user_id uuid,
  membership_id uuid,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_invitation public.company_member_invitations%rowtype;
  v_company_status text;
  v_auth_email text := lower(trim(coalesce(p_auth_email, '')));
  v_auth_error_code text := left(nullif(trim(coalesce(p_auth_error_code, '')), ''), 120);
  v_auth_error_message text := left(nullif(trim(coalesce(p_auth_error_message, '')), ''), 500);
  v_user_id uuid;
  v_membership_id uuid;
  v_primary_role_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required'
      using errcode = '42501';
  end if;

  select *
    into v_invitation
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
   for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_invitation.status <> 'prepared' then
    raise exception 'invitation_not_prepared'
      using errcode = '22023';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_invitation.company_id;

  if v_company_status is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  if v_invitation.expires_at <= now() then
    update public.company_member_invitations
       set status = 'expired',
           finalized_at = now()
     where id = v_invitation.id;

    raise exception 'invitation_expired'
      using errcode = '22023';
  end if;

  if v_auth_email <> v_invitation.normalized_email then
    raise exception 'auth_email_mismatch'
      using errcode = '22023';
  end if;

  if v_auth_error_code is not null then
    update public.company_member_invitations
       set status = 'auth_failed',
           auth_error_code = v_auth_error_code,
           auth_error_message = v_auth_error_message,
           finalized_at = now(),
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
             'auth_invite_sent', p_auth_invite_sent,
             'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb)
           ))
     where id = v_invitation.id;

    insert into public.company_audit_events (
      company_id,
      actor_user_id,
      actor_auth_id,
      actor_kind,
      event_type,
      target_type,
      target_id,
      metadata,
      idempotency_key
    )
    values (
      v_invitation.company_id,
      v_invitation.invited_by_user_id,
      null,
      'service_role',
      'company.member_invite_auth_failed',
      'invitation',
      v_invitation.id,
      jsonb_strip_nulls(jsonb_build_object(
        'normalized_email', v_invitation.normalized_email,
        'auth_error_code', v_auth_error_code,
        'auth_error_message', v_auth_error_message,
        'request_id', v_invitation.request_id
      )),
      v_invitation.request_id
    );

    return query
    select
      v_invitation.id,
      v_invitation.company_id,
      v_invitation.normalized_email,
      'auth_failed'::text,
      null::uuid,
      null::uuid,
      v_invitation.expires_at;
    return;
  end if;

  if p_auth_user_id is null then
    raise exception 'auth_user_required'
      using errcode = '22023';
  end if;

  select u.id
    into v_user_id
    from public.users u
   where u.auth_id = p_auth_user_id
   limit 1;

  if v_user_id is null then
    select u.id
      into v_user_id
      from public.users u
     where lower(u.email) = v_invitation.normalized_email
     order by u.auth_id is null, u.created_at
     limit 1;
  end if;

  if v_user_id is null then
    insert into public.users (
      name,
      email,
      role,
      auth_id,
      status,
      is_active,
      created_at,
      updated_at
    )
    values (
      split_part(v_invitation.normalized_email, '@', 1),
      v_invitation.normalized_email,
      'appraiser',
      p_auth_user_id,
      'active',
      true,
      now(),
      now()
    )
    returning id into v_user_id;
  else
    update public.users u
       set auth_id = coalesce(u.auth_id, p_auth_user_id),
           updated_at = now()
     where u.id = v_user_id
       and u.auth_id is null;
  end if;

  insert into public.company_memberships (
    company_id,
    user_id,
    status,
    membership_type,
    is_primary,
    invited_by,
    joined_at,
    created_at,
    updated_at
  )
  values (
    v_invitation.company_id,
    v_user_id,
    'invited',
    'invited',
    false,
    v_invitation.invited_by_user_id,
    null,
    now(),
    now()
  )
  on conflict (company_id, user_id) do update
    set status = 'invited',
        membership_type = 'invited',
        invited_by = excluded.invited_by,
        updated_at = now()
  returning id into v_membership_id;

  v_primary_role_id := v_invitation.primary_role_id;

  insert into public.user_role_assignments (
    company_id,
    user_id,
    role_id,
    status,
    is_primary,
    assigned_by,
    assigned_at,
    expires_at,
    created_at,
    updated_at
  )
  select
    v_invitation.company_id,
    v_user_id,
    requested.role_id,
    'inactive',
    requested.role_id = v_primary_role_id,
    v_invitation.invited_by_user_id,
    now(),
    null,
    now(),
    now()
  from unnest(v_invitation.role_ids) requested(role_id)
  on conflict (company_id, user_id, role_id) do update
    set status = 'inactive',
        is_primary = excluded.is_primary,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at,
        expires_at = null,
        updated_at = now();

  update public.user_role_assignments ura
     set is_primary = false,
         updated_at = now()
   where ura.company_id = v_invitation.company_id
     and ura.user_id = v_user_id
     and not (ura.role_id = any(v_invitation.role_ids))
     and ura.is_primary = true;

  update public.company_member_invitations
     set status = 'sent',
         invited_auth_id = p_auth_user_id,
         invited_user_id = v_user_id,
         membership_id = v_membership_id,
         finalized_at = now(),
         auth_invite_sent_at = case when p_auth_invite_sent then now() else auth_invite_sent_at end,
         auth_error_code = null,
         auth_error_message = null,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'auth_invite_sent', p_auth_invite_sent,
           'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb)
         ))
   where id = v_invitation.id;

  insert into public.company_audit_events (
    company_id,
    actor_user_id,
    actor_auth_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  )
  values (
    v_invitation.company_id,
    v_invitation.invited_by_user_id,
    p_auth_user_id,
    'service_role',
    'company.member_invite_sent',
    'invitation',
    v_invitation.id,
    jsonb_strip_nulls(jsonb_build_object(
      'normalized_email', v_invitation.normalized_email,
      'target_user_id', v_user_id,
      'invited_auth_id', p_auth_user_id,
      'role_ids', to_jsonb(v_invitation.role_ids),
      'primary_role_id', v_invitation.primary_role_id,
      'request_id', v_invitation.request_id
    )),
    v_invitation.request_id
  );

  return query
  select
    v_invitation.id,
    v_invitation.company_id,
    v_invitation.normalized_email,
    'sent'::text,
    v_user_id,
    v_membership_id,
    v_invitation.expires_at;
end;
$$;

revoke all privileges on function public.rpc_company_member_invite_prepare(text, uuid[], uuid, interval, text, text) from public, anon;
revoke all privileges on function public.rpc_company_member_invite_finalize(uuid, uuid, text, boolean, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.rpc_company_member_invite_prepare(text, uuid[], uuid, interval, text, text) to authenticated, service_role;
grant execute on function public.rpc_company_member_invite_finalize(uuid, uuid, text, boolean, text, text, jsonb) to service_role;

comment on table public.company_member_invitations is
  'Phase 8C5E3 service-role-owned company member invitation records. Prepared/sent invitations grant no operational visibility and do not activate memberships.';

comment on function public.rpc_company_member_invite_prepare(text, uuid[], uuid, interval, text, text) is
  'Phase 8C5E3 authenticated invite prepare RPC. Validates current-company invite authority and preset role guardrails, creates a prepared invitation, and does not create membership or role assignment rows.';

comment on function public.rpc_company_member_invite_finalize(uuid, uuid, text, boolean, text, text, jsonb) is
  'Phase 8C5E3 service-role-only invite finalize RPC. Records Auth Admin result, creates invited inactive membership and inactive preset role assignments, and does not activate access.';

commit;
