begin;

create extension if not exists "pgcrypto";

create table if not exists public.company_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null,
  actor_user_id uuid null,
  actor_auth_id uuid null,
  actor_kind text not null default 'service_role',
  event_type text not null,
  target_type text not null,
  target_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text null,
  created_at timestamptz not null default now(),
  constraint company_audit_events_actor_kind_check
    check (actor_kind in ('service_role', 'operator', 'system')),
  constraint company_audit_events_event_type_check
    check (event_type ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint company_audit_events_target_type_check
    check (target_type in ('bootstrap', 'company', 'user', 'membership', 'role_assignment'))
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_audit_events_company_id_fkey'
       and conrelid = 'public.company_audit_events'::regclass
  ) then
    alter table public.company_audit_events
      add constraint company_audit_events_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_audit_events_actor_user_id_fkey'
       and conrelid = 'public.company_audit_events'::regclass
  ) then
    alter table public.company_audit_events
      add constraint company_audit_events_actor_user_id_fkey
      foreign key (actor_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create index if not exists idx_company_audit_events_company_created
  on public.company_audit_events (company_id, created_at desc);

create index if not exists idx_company_audit_events_idempotency
  on public.company_audit_events (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_company_audit_events_event_created
  on public.company_audit_events (event_type, created_at desc);

alter table public.company_audit_events enable row level security;

revoke all privileges on table public.company_audit_events from public, anon, authenticated;
grant all privileges on table public.company_audit_events to service_role;

create or replace function public.company_active_owner_count(p_company_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct ura.user_id)::integer
    from public.user_role_assignments ura
    join public.company_memberships cm
      on cm.company_id = ura.company_id
     and cm.user_id = ura.user_id
     and cm.status = 'active'
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = p_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and (r.is_owner_role = true or lower(r.name) = 'owner');
$$;

create or replace function public.user_has_owner_role_in_company(
  p_user_id uuid,
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_role_assignments ura
      join public.company_memberships cm
        on cm.company_id = ura.company_id
       and cm.user_id = ura.user_id
       and cm.status = 'active'
      join public.roles r
        on r.id = ura.role_id
     where ura.user_id = p_user_id
       and ura.company_id = p_company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
       and (r.is_owner_role = true or lower(r.name) = 'owner')
  );
$$;

create or replace function public.assert_company_will_have_owner(
  p_company_id uuid,
  p_excluding_user_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner_count integer;
begin
  select count(distinct ura.user_id)::integer
    into v_owner_count
    from public.user_role_assignments ura
    join public.company_memberships cm
      on cm.company_id = ura.company_id
     and cm.user_id = ura.user_id
     and cm.status = 'active'
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = p_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and (r.is_owner_role = true or lower(r.name) = 'owner')
     and (p_excluding_user_id is null or ura.user_id <> p_excluding_user_id);

  if coalesce(v_owner_count, 0) < 1 then
    raise exception 'company_owner_required'
      using errcode = '23514',
            detail = 'A company must retain at least one active owner.';
  end if;

  return true;
end;
$$;

create or replace function public.rpc_company_bootstrap(
  p_company_slug text,
  p_company_name text,
  p_company_type text default 'staff_shop',
  p_timezone text default 'America/New_York',
  p_locale text default 'en-US',
  p_owner_auth_id uuid default null,
  p_owner_email text default null,
  p_owner_name text default null,
  p_owner_phone text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  company_id uuid,
  company_slug text,
  company_name text,
  company_type text,
  company_status text,
  owner_user_id uuid,
  owner_auth_id uuid,
  owner_email text,
  membership_id uuid,
  owner_role_assignment_id uuid,
  owner_role_id uuid,
  active_company_metadata jsonb,
  bootstrap_status text,
  idempotency_key text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_company_slug text := lower(btrim(coalesce(p_company_slug, '')));
  v_company_name text := btrim(coalesce(p_company_name, ''));
  v_company_type text := lower(btrim(coalesce(p_company_type, 'staff_shop')));
  v_timezone text := btrim(coalesce(p_timezone, 'America/New_York'));
  v_locale text := btrim(coalesce(p_locale, 'en-US'));
  v_owner_email text := lower(btrim(coalesce(p_owner_email, '')));
  v_owner_name text := btrim(coalesce(p_owner_name, ''));
  v_owner_phone text := nullif(btrim(coalesce(p_owner_phone, '')), '');
  v_idempotency_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_company_id uuid;
  v_owner_user_id uuid;
  v_membership_id uuid;
  v_owner_role_assignment_id uuid;
  v_owner_role_id uuid;
  v_active_company_metadata jsonb;
  v_existing_company public.companies%rowtype;
  v_completed_event public.company_audit_events%rowtype;
  v_existing_user_by_auth public.users%rowtype;
  v_existing_user_by_email public.users%rowtype;
  v_active_membership_count integer;
begin
  if v_idempotency_key is null then
    raise exception 'idempotency_key_required' using errcode = '22023';
  end if;

  if v_company_slug = '' or v_company_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid_company_slug' using errcode = '22023';
  end if;

  if v_company_slug = 'falcon_default' then
    raise exception 'reserved_company_slug' using errcode = '22023';
  end if;

  if v_company_name = '' then
    raise exception 'company_name_required' using errcode = '22023';
  end if;

  if p_owner_auth_id is null then
    raise exception 'owner_auth_id_required' using errcode = '22023';
  end if;

  if v_owner_email = '' or v_owner_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_owner_email' using errcode = '22023';
  end if;

  if v_owner_name = '' then
    raise exception 'owner_name_required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'metadata_must_be_object' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.company_types ct
     where ct.key = v_company_type
       and ct.is_active = true
  ) then
    raise exception 'invalid_company_type' using errcode = '22023';
  end if;

  select *
    into v_completed_event
    from public.company_audit_events cae
   where cae.event_type = 'company.bootstrap.completed'
     and cae.idempotency_key = v_idempotency_key
   order by cae.created_at desc
   limit 1;

  if found then
    select *
      into v_existing_company
      from public.companies c
     where c.id = v_completed_event.company_id;

    if not found then
      raise exception 'bootstrap_partial_state_requires_operator_review'
        using errcode = '55000',
              detail = 'Completed bootstrap audit event references a missing company.';
    end if;

    if v_existing_company.slug <> v_company_slug then
      raise exception 'idempotency_key_company_slug_mismatch' using errcode = '23505';
    end if;

    select u.*
      into v_existing_user_by_auth
      from public.users u
     where u.auth_id = p_owner_auth_id;

    if not found
       or v_existing_user_by_auth.id::text <> coalesce(v_completed_event.metadata ->> 'owner_user_id', '')
       or lower(v_existing_user_by_auth.email) <> v_owner_email then
      raise exception 'idempotency_key_owner_mismatch' using errcode = '23505';
    end if;

    select cm.id
      into v_membership_id
      from public.company_memberships cm
     where cm.company_id = v_existing_company.id
       and cm.user_id = v_existing_user_by_auth.id
       and cm.status = 'active'
     limit 1;

    select ura.id, ura.role_id
      into v_owner_role_assignment_id, v_owner_role_id
      from public.user_role_assignments ura
      join public.roles r
        on r.id = ura.role_id
       and (r.is_owner_role = true or lower(r.name) = 'owner')
     where ura.company_id = v_existing_company.id
       and ura.user_id = v_existing_user_by_auth.id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
     limit 1;

    if v_membership_id is null
       or v_owner_role_assignment_id is null
       or public.company_active_owner_count(v_existing_company.id) <> 1 then
      raise exception 'bootstrap_partial_state_requires_operator_review'
        using errcode = '55000',
              detail = 'Completed bootstrap state no longer has exactly one active owner.';
    end if;

    v_active_company_metadata := jsonb_build_object(
      'company_id', v_existing_company.id,
      'active_company_id', v_existing_company.id,
      'current_company_id', v_existing_company.id
    );

    return query
    select
      v_existing_company.id,
      v_existing_company.slug,
      v_existing_company.name,
      v_existing_company.company_type,
      v_existing_company.status,
      v_existing_user_by_auth.id,
      v_existing_user_by_auth.auth_id,
      lower(v_existing_user_by_auth.email),
      v_membership_id,
      v_owner_role_assignment_id,
      v_owner_role_id,
      v_active_company_metadata,
      'idempotent_replay'::text,
      v_idempotency_key;
    return;
  end if;

  select *
    into v_existing_company
    from public.companies c
   where c.slug = v_company_slug;

  if found then
    if exists (
      select 1
        from public.company_audit_events cae
       where cae.company_id = v_existing_company.id
         and cae.event_type = 'company.bootstrap.completed'
    ) then
      raise exception 'duplicate_company_slug' using errcode = '23505';
    end if;

    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Company slug exists without a matching completed bootstrap audit event.';
  end if;

  select r.id
    into v_owner_role_id
    from public.roles r
   where r.company_id is null
     and lower(r.name) = 'owner'
     and r.is_owner_role = true
   order by r.created_at asc
   limit 1;

  if v_owner_role_id is null then
    raise exception 'owner_template_role_missing' using errcode = '55000';
  end if;

  insert into public.company_audit_events (
    actor_kind,
    event_type,
    target_type,
    metadata,
    idempotency_key
  ) values (
    'service_role',
    'company.bootstrap.started',
    'bootstrap',
    jsonb_build_object(
      'company_slug', v_company_slug,
      'company_type', v_company_type,
      'owner_auth_id', p_owner_auth_id,
      'owner_email', v_owner_email,
      'metadata', v_metadata
    ),
    v_idempotency_key
  );

  insert into public.companies (
    slug,
    name,
    status,
    timezone,
    locale,
    settings,
    company_type,
    operating_mode_settings
  ) values (
    v_company_slug,
    v_company_name,
    'active',
    v_timezone,
    v_locale,
    '{}'::jsonb,
    v_company_type,
    '{}'::jsonb
  )
  returning id into v_company_id;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.created',
    'company',
    v_company_id,
    jsonb_build_object(
      'company_slug', v_company_slug,
      'company_name', v_company_name,
      'company_type', v_company_type,
      'timezone', v_timezone,
      'locale', v_locale
    ),
    v_idempotency_key
  );

  select u.*
    into v_existing_user_by_auth
    from public.users u
   where u.auth_id = p_owner_auth_id;

  if found then
    if lower(v_existing_user_by_auth.email) <> v_owner_email then
      raise exception 'owner_auth_id_email_mismatch' using errcode = '23505';
    end if;

    update public.users u
       set name = case when btrim(coalesce(u.name, '')) = '' then v_owner_name else u.name end,
           display_name = coalesce(nullif(btrim(u.display_name), ''), v_owner_name),
           full_name = coalesce(nullif(btrim(u.full_name), ''), v_owner_name),
           phone = coalesce(nullif(btrim(u.phone), ''), v_owner_phone),
           status = coalesce(nullif(btrim(u.status), ''), 'active'),
           is_active = true,
           updated_at = now()
     where u.id = v_existing_user_by_auth.id
     returning u.id into v_owner_user_id;
  else
    select u.*
      into v_existing_user_by_email
      from public.users u
     where lower(u.email) = v_owner_email;

    if found then
      if v_existing_user_by_email.auth_id is not null
         and v_existing_user_by_email.auth_id <> p_owner_auth_id then
        raise exception 'owner_email_already_linked_to_different_auth_user'
          using errcode = '23505';
      end if;

      update public.users u
         set auth_id = p_owner_auth_id,
             name = case when btrim(coalesce(u.name, '')) = '' then v_owner_name else u.name end,
             display_name = coalesce(nullif(btrim(u.display_name), ''), v_owner_name),
             full_name = coalesce(nullif(btrim(u.full_name), ''), v_owner_name),
             phone = coalesce(nullif(btrim(u.phone), ''), v_owner_phone),
             role = 'owner',
             status = coalesce(nullif(btrim(u.status), ''), 'active'),
             is_active = true,
             is_admin = true,
             updated_at = now()
       where u.id = v_existing_user_by_email.id
       returning u.id into v_owner_user_id;
    else
      insert into public.users (
        name,
        email,
        role,
        display_name,
        full_name,
        phone,
        auth_id,
        status,
        is_active,
        is_admin
      ) values (
        v_owner_name,
        v_owner_email,
        'owner',
        v_owner_name,
        v_owner_name,
        v_owner_phone,
        p_owner_auth_id,
        'active',
        true,
        true
      )
      returning id into v_owner_user_id;
    end if;
  end if;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.owner_user_linked',
    'user',
    v_owner_user_id,
    jsonb_build_object(
      'owner_user_id', v_owner_user_id,
      'owner_auth_id', p_owner_auth_id,
      'owner_email', v_owner_email
    ),
    v_idempotency_key
  );

  insert into public.company_memberships (
    company_id,
    user_id,
    status,
    membership_type,
    is_primary,
    joined_at
  ) values (
    v_company_id,
    v_owner_user_id,
    'active',
    'bootstrap_owner',
    true,
    now()
  )
  returning id into v_membership_id;

  select count(*)::integer
    into v_active_membership_count
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.status = 'active';

  if v_active_membership_count <> 1 then
    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Bootstrap company must have exactly one active membership.';
  end if;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.membership_created',
    'membership',
    v_membership_id,
    jsonb_build_object(
      'membership_id', v_membership_id,
      'owner_user_id', v_owner_user_id,
      'membership_type', 'bootstrap_owner'
    ),
    v_idempotency_key
  );

  insert into public.user_role_assignments (
    company_id,
    user_id,
    role_id,
    status,
    is_primary,
    assigned_by,
    assigned_at,
    expires_at
  ) values (
    v_company_id,
    v_owner_user_id,
    v_owner_role_id,
    'active',
    true,
    null,
    now(),
    null
  )
  returning id into v_owner_role_assignment_id;

  if public.company_active_owner_count(v_company_id) <> 1
     or not public.user_has_owner_role_in_company(v_owner_user_id, v_company_id) then
    raise exception 'bootstrap_partial_state_requires_operator_review'
      using errcode = '55000',
            detail = 'Bootstrap company must have exactly one active owner.';
  end if;

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.owner_role_assigned',
    'role_assignment',
    v_owner_role_assignment_id,
    jsonb_build_object(
      'role_assignment_id', v_owner_role_assignment_id,
      'owner_role_id', v_owner_role_id,
      'owner_user_id', v_owner_user_id
    ),
    v_idempotency_key
  );

  v_active_company_metadata := jsonb_build_object(
    'company_id', v_company_id,
    'active_company_id', v_company_id,
    'current_company_id', v_company_id
  );

  insert into public.company_audit_events (
    company_id,
    actor_kind,
    event_type,
    target_type,
    target_id,
    metadata,
    idempotency_key
  ) values (
    v_company_id,
    'service_role',
    'company.bootstrap.completed',
    'bootstrap',
    v_company_id,
    jsonb_build_object(
      'company_id', v_company_id,
      'company_slug', v_company_slug,
      'owner_user_id', v_owner_user_id,
      'owner_auth_id', p_owner_auth_id,
      'owner_email', v_owner_email,
      'membership_id', v_membership_id,
      'owner_role_assignment_id', v_owner_role_assignment_id,
      'owner_role_id', v_owner_role_id,
      'active_company_metadata', v_active_company_metadata
    ),
    v_idempotency_key
  );

  return query
  select
    v_company_id,
    v_company_slug,
    v_company_name,
    v_company_type,
    'active'::text,
    v_owner_user_id,
    p_owner_auth_id,
    v_owner_email,
    v_membership_id,
    v_owner_role_assignment_id,
    v_owner_role_id,
    v_active_company_metadata,
    'created'::text,
    v_idempotency_key;
end;
$$;

revoke all privileges on function public.company_active_owner_count(uuid) from public, anon, authenticated;
revoke all privileges on function public.user_has_owner_role_in_company(uuid, uuid) from public, anon, authenticated;
revoke all privileges on function public.assert_company_will_have_owner(uuid, uuid) from public, anon, authenticated;
revoke all privileges on function public.rpc_company_bootstrap(text, text, text, text, text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.company_active_owner_count(uuid) to service_role;
grant execute on function public.user_has_owner_role_in_company(uuid, uuid) to service_role;
grant execute on function public.assert_company_will_have_owner(uuid, uuid) to service_role;
grant execute on function public.rpc_company_bootstrap(text, text, text, text, text, uuid, text, text, text, text, jsonb) to service_role;

revoke all privileges on table public.companies from anon, authenticated;
revoke all privileges on table public.company_memberships from anon, authenticated;
revoke all privileges on table public.user_role_assignments from anon, authenticated;
revoke all privileges on table public.roles from anon, authenticated;
revoke all privileges on table public.role_permissions from anon, authenticated;

comment on table public.company_audit_events is
  'Service-role-only audit log for company setup and future company administration events. App roles have no direct access.';

comment on function public.company_active_owner_count(uuid) is
  'Counts active owner-role assignments for active members of a company. Service-role helper for owner invariants.';

comment on function public.user_has_owner_role_in_company(uuid, uuid) is
  'Returns whether the user is an active owner-role assignee and active member of the company. Service-role helper for owner invariants.';

comment on function public.assert_company_will_have_owner(uuid, uuid) is
  'Raises company_owner_required when excluding a user would leave a company with no active owner.';

comment on function public.rpc_company_bootstrap(text, text, text, text, text, uuid, text, text, text, text, jsonb) is
  'Service-role/operator-only company bootstrap. Creates one company, one first-owner app user mapping, one active membership, one owner role assignment, and company audit events. Does not create operational visibility.';

commit;
