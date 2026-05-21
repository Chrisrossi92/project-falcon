begin;

create or replace function public.rpc_company_member_invitation_resend_prepare(
  p_invitation_id uuid,
  p_expires_in interval default interval '7 days',
  p_reason text default null,
  p_request_id text default null
)
returns table (
  invitation_id uuid,
  prior_invitation_id uuid,
  company_id uuid,
  company_slug text,
  company_name text,
  invite_email text,
  invitation_status text,
  expires_at timestamptz,
  role_assignments jsonb
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_company_slug text;
  v_company_name text;
  v_company_status text;
  v_original public.company_member_invitations%rowtype;
  v_new_invitation_id uuid;
  v_expires_at timestamptz;
  v_role_count integer;
  v_valid_role_count integer;
  v_role_snapshot jsonb;
  v_has_owner_role boolean;
  v_reuse_membership_id uuid;
  v_reuse_membership_status text;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.invite') then
    raise exception 'invite_permission_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
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

  select *
    into v_original
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
     and cmi.company_id = v_company_id
   for update;

  if v_original.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_original.status = 'accepted' then
    raise exception 'invitation_not_resendable'
      using errcode = '22023';
  end if;

  if v_original.status not in ('prepared', 'sent', 'expired', 'cancelled', 'auth_failed') then
    raise exception 'invitation_not_resendable'
      using errcode = '22023';
  end if;

  select count(*)
    into v_role_count
    from unnest(v_original.role_ids) requested(role_id);

  select
    count(*),
    coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'role_id', r.id,
          'role_name', r.name,
          'is_owner_role', r.is_owner_role,
          'is_primary', r.id = v_original.primary_role_id,
          'status', 'inactive'
        )
        order by
          case when r.id = v_original.primary_role_id then 0 else 1 end,
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
    into v_valid_role_count, v_has_owner_role, v_role_snapshot
    from public.roles r
   where r.id = any(v_original.role_ids)
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true;

  if coalesce(v_role_count, 0) = 0
     or v_valid_role_count <> v_role_count then
    raise exception 'role_preset_invalid'
      using errcode = '22023';
  end if;

  if v_has_owner_role
     and not public.current_app_user_has_permission('users.grant_owner') then
    raise exception 'owner_grant_permission_required'
      using errcode = '42501';
  end if;

  if v_original.membership_id is not null then
    select cm.id, cm.status
      into v_reuse_membership_id, v_reuse_membership_status
      from public.company_memberships cm
     where cm.id = v_original.membership_id
       and cm.company_id = v_company_id
       and cm.user_id = v_original.invited_user_id
     for update;

    if v_reuse_membership_id is not null
       and v_reuse_membership_status = 'active' then
      raise exception 'member_already_active'
        using errcode = '23505';
    end if;
  end if;

  if v_original.invited_user_id is not null
     and exists (
       select 1
         from public.company_memberships cm
        where cm.company_id = v_company_id
          and cm.user_id = v_original.invited_user_id
          and cm.status = 'active'
     ) then
    raise exception 'member_already_active'
      using errcode = '23505';
  end if;

  if v_original.status in ('prepared', 'sent') then
    update public.company_member_invitations cmi
       set status = 'cancelled',
           cancelled_at = coalesce(cmi.cancelled_at, now()),
           metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
             'replaced_by_resend', true,
             'resend_request_id', nullif(p_request_id, '')
           ))
     where cmi.id = v_original.id;
  end if;

  v_expires_at := now() + greatest(coalesce(p_expires_in, interval '7 days'), interval '1 hour');

  insert into public.company_member_invitations (
    company_id,
    email,
    normalized_email,
    status,
    invited_by_user_id,
    invited_auth_id,
    invited_user_id,
    membership_id,
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
    v_original.email,
    v_original.normalized_email,
    'prepared',
    v_actor_user_id,
    v_original.invited_auth_id,
    v_original.invited_user_id,
    v_reuse_membership_id,
    v_original.role_ids,
    v_original.primary_role_id,
    v_role_snapshot,
    nullif(p_reason, ''),
    nullif(p_request_id, ''),
    v_expires_at,
    jsonb_strip_nulls(jsonb_build_object(
      'prior_invitation_id', v_original.id,
      'resend_prepared_by_user_id', v_actor_user_id,
      'reused_membership_id', v_reuse_membership_id
    ))
  )
  returning id into v_new_invitation_id;

  if v_reuse_membership_id is not null
     and v_original.invited_user_id is not null then
    update public.company_memberships cm
       set status = case
             when cm.status = 'active' then cm.status
             else 'invited'
           end,
           membership_type = coalesce(nullif(cm.membership_type, ''), 'invited'),
           invited_by = v_actor_user_id,
           updated_at = now()
     where cm.id = v_reuse_membership_id
       and cm.status <> 'active';

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
      v_company_id,
      v_original.invited_user_id,
      requested.role_id,
      'inactive',
      requested.role_id = v_original.primary_role_id,
      v_actor_user_id,
      now(),
      null,
      now(),
      now()
    from unnest(v_original.role_ids) requested(role_id)
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
     where ura.company_id = v_company_id
       and ura.user_id = v_original.invited_user_id
       and not (ura.role_id = any(v_original.role_ids))
       and ura.is_primary = true;
  end if;

  if v_original.status in ('prepared', 'sent') then
    update public.company_member_invitations cmi
       set metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_build_object(
             'replaced_by_invitation_id', v_new_invitation_id
           )
     where cmi.id = v_original.id;
  end if;

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
    v_actor_auth_id,
    'service_role',
    'company.member_invite_resent_prepared',
    'invitation',
    v_new_invitation_id,
    jsonb_strip_nulls(jsonb_build_object(
      'prior_invitation_id', v_original.id,
      'normalized_email', v_original.normalized_email,
      'role_ids', to_jsonb(v_original.role_ids),
      'primary_role_id', v_original.primary_role_id,
      'reason', nullif(p_reason, ''),
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_new_invitation_id,
    v_original.id,
    v_company_id,
    v_company_slug,
    v_company_name,
    v_original.normalized_email,
    'prepared'::text,
    v_expires_at,
    v_role_snapshot;
end;
$$;

create or replace function public.rpc_company_member_invitation_resend_finalize(
  p_invitation_id uuid,
  p_auth_invite_sent boolean,
  p_auth_error text default null,
  p_request_id text default null,
  p_auth_user_id uuid default null,
  p_auth_email text default null,
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
  v_auth_error text := left(nullif(trim(coalesce(p_auth_error, '')), ''), 500);
  v_user_id uuid;
  v_membership_id uuid;
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
    update public.company_member_invitations cmi
       set status = 'expired',
           finalized_at = now(),
           updated_at = now()
     where cmi.id = v_invitation.id;

    raise exception 'invitation_expired'
      using errcode = '22023';
  end if;

  if not coalesce(p_auth_invite_sent, false)
     or v_auth_error is not null then
    update public.company_member_invitations cmi
       set status = 'auth_failed',
           auth_error_code = 'auth_invite_failed',
           auth_error_message = v_auth_error,
           finalized_at = now(),
           metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
             'resend_auth_invite_sent', coalesce(p_auth_invite_sent, false),
             'resend_auth_error', v_auth_error,
             'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb),
             'resend_finalize_request_id', nullif(p_request_id, '')
           ))
     where cmi.id = v_invitation.id;

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
      'company.member_invite_resent_auth_failed',
      'invitation',
      v_invitation.id,
      jsonb_strip_nulls(jsonb_build_object(
        'normalized_email', v_invitation.normalized_email,
        'auth_error', v_auth_error,
        'request_id', nullif(p_request_id, '')
      )),
      coalesce(nullif(p_request_id, ''), v_invitation.request_id)
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

  if v_auth_email <> ''
     and v_auth_email <> v_invitation.normalized_email then
    raise exception 'auth_email_mismatch'
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
      auth_id,
      status,
      is_active,
      created_at,
      updated_at
    )
    values (
      split_part(v_invitation.normalized_email, '@', 1),
      v_invitation.normalized_email,
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

  if exists (
    select 1
      from public.company_memberships cm
     where cm.company_id = v_invitation.company_id
       and cm.user_id = v_user_id
       and cm.status = 'active'
  ) then
    raise exception 'member_already_active'
      using errcode = '23505';
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
    where public.company_memberships.status <> 'active'
  returning id into v_membership_id;

  if v_membership_id is null then
    raise exception 'member_already_active'
      using errcode = '23505';
  end if;

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
    requested.role_id = v_invitation.primary_role_id,
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

  update public.company_member_invitations cmi
     set status = 'sent',
         invited_auth_id = p_auth_user_id,
         invited_user_id = v_user_id,
         membership_id = v_membership_id,
         finalized_at = now(),
         auth_invite_sent_at = now(),
         auth_error_code = null,
         auth_error_message = null,
         metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'resend_auth_invite_sent', true,
           'provider_metadata', coalesce(p_provider_metadata, '{}'::jsonb),
           'resend_finalize_request_id', nullif(p_request_id, '')
         ))
   where cmi.id = v_invitation.id;

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
    'company.member_invite_resent_sent',
    'invitation',
    v_invitation.id,
      jsonb_strip_nulls(jsonb_build_object(
        'normalized_email', v_invitation.normalized_email,
        'target_user_id', v_user_id,
        'role_ids', to_jsonb(v_invitation.role_ids),
        'primary_role_id', v_invitation.primary_role_id,
        'request_id', nullif(p_request_id, '')
      )),
    coalesce(nullif(p_request_id, ''), v_invitation.request_id)
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

revoke all privileges on function public.rpc_company_member_invitation_resend_prepare(uuid, interval, text, text) from public, anon;
revoke all privileges on function public.rpc_company_member_invitation_resend_finalize(uuid, boolean, text, text, uuid, text, jsonb) from public, anon, authenticated;

grant execute on function public.rpc_company_member_invitation_resend_prepare(uuid, interval, text, text) to authenticated, service_role;
grant execute on function public.rpc_company_member_invitation_resend_finalize(uuid, boolean, text, text, uuid, text, jsonb) to service_role;

comment on function public.rpc_company_member_invitation_resend_prepare(uuid, interval, text, text) is
  'Phase 8C5F2 authenticated resend prepare RPC. Revalidates current-company invite authority and preset role guardrails, preserves the prior invitation as history, and creates a new prepared invitation row.';

comment on function public.rpc_company_member_invitation_resend_finalize(uuid, boolean, text, text, uuid, text, jsonb) is
  'Phase 8C5F2 service-role-only resend finalize RPC. Records the fresh Auth Admin resend result, stages invited membership and inactive preset role assignments when needed, and never returns provider tokens or links.';

commit;
