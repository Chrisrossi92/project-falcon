begin;

create or replace function public.rpc_company_member_invitations_list(
  p_status text default 'open',
  p_limit integer default 100
)
returns table (
  invitation_id uuid,
  invite_email text,
  invitation_status text,
  role_assignments jsonb,
  primary_role_id uuid,
  invited_by_display_name text,
  created_at timestamptz,
  expires_at timestamptz,
  auth_invite_sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  can_cancel boolean,
  can_resend boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_status_filter text := lower(trim(coalesce(p_status, 'open')));
  v_statuses text[];
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 250);
  v_can_manage_invites boolean;
  v_can_grant_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not (
    public.current_app_user_has_permission('users.read')
    or (
      public.current_app_user_has_permission('users.invite')
      and public.current_app_user_has_permission('users.manage_company_access')
    )
  ) then
    raise exception 'company_invitation_read_permission_required'
      using errcode = '42501';
  end if;

  v_can_manage_invites :=
    public.current_app_user_has_permission('users.invite')
    and public.current_app_user_has_permission('users.manage_company_access');
  v_can_grant_owner := public.current_app_user_has_permission('users.grant_owner');

  v_statuses := case
    when v_status_filter = 'open' then array['prepared', 'sent', 'auth_failed']::text[]
    when v_status_filter = 'terminal' then array['accepted', 'cancelled', 'expired']::text[]
    when v_status_filter = 'all' then array['prepared', 'sent', 'auth_failed', 'accepted', 'cancelled', 'expired']::text[]
    when v_status_filter in ('prepared', 'sent', 'accepted', 'cancelled', 'expired', 'auth_failed') then array[v_status_filter]::text[]
    else null
  end;

  if v_statuses is null then
    raise exception 'invalid_invitation_status_filter'
      using errcode = '22023';
  end if;

  return query
  select
    cmi.id as invitation_id,
    cmi.normalized_email as invite_email,
    cmi.status as invitation_status,
    coalesce(role_projection.role_assignments, '[]'::jsonb) as role_assignments,
    cmi.primary_role_id,
    coalesce(
      nullif(inviter.display_name, ''),
      nullif(inviter.full_name, ''),
      nullif(inviter.name, ''),
      inviter.email
    ) as invited_by_display_name,
    cmi.created_at,
    cmi.expires_at,
    cmi.auth_invite_sent_at,
    cmi.accepted_at,
    cmi.cancelled_at,
    (
      v_can_manage_invites
      and cmi.status in ('prepared', 'sent', 'auth_failed')
      and (
        not coalesce(role_projection.has_owner_role, false)
        or v_can_grant_owner
      )
    ) as can_cancel,
    (
      v_can_manage_invites
      and cmi.status in ('prepared', 'sent', 'auth_failed', 'cancelled', 'expired')
      and (
        not coalesce(role_projection.has_owner_role, false)
        or v_can_grant_owner
      )
    ) as can_resend
  from public.company_member_invitations cmi
  left join public.users inviter
    on inviter.id = cmi.invited_by_user_id
  left join lateral (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_id', r.id,
            'role_key', trim(both '_' from regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g')),
            'role_name', r.name,
            'display_name', r.name,
            'is_primary', r.id = cmi.primary_role_id
          )
          order by
            case when r.id = cmi.primary_role_id then 0 else 1 end,
            case lower(r.name)
              when 'owner' then 1
              when 'admin' then 2
              when 'reviewer' then 3
              when 'appraiser' then 4
              when 'billing' then 5
              else 99
            end,
            r.name
        ) filter (where r.id is not null),
        '[]'::jsonb
      ) as role_assignments,
      coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false) as has_owner_role
    from unnest(cmi.role_ids) requested(role_id)
    left join public.roles r
      on r.id = requested.role_id
  ) role_projection on true
  where cmi.company_id = v_company_id
    and cmi.status = any(v_statuses)
  order by
    case cmi.status
      when 'sent' then 1
      when 'prepared' then 2
      when 'auth_failed' then 3
      when 'expired' then 4
      when 'cancelled' then 5
      when 'accepted' then 6
      else 99
    end,
    cmi.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.rpc_company_member_invitation_cancel(
  p_invitation_id uuid,
  p_reason text default null,
  p_request_id text default null
)
returns table (
  invitation_id uuid,
  invitation_status text,
  cancelled_at timestamptz,
  changed boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_actor_auth_id uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_invitation public.company_member_invitations%rowtype;
  v_has_owner_role boolean;
  v_cancelled_at timestamptz;
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

  select *
    into v_invitation
    from public.company_member_invitations cmi
   where cmi.id = p_invitation_id
     and cmi.company_id = v_company_id
   for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found'
      using errcode = '22023';
  end if;

  if v_invitation.status = 'cancelled' then
    return query
    select
      v_invitation.id,
      v_invitation.status,
      v_invitation.cancelled_at,
      false;
    return;
  end if;

  if v_invitation.status in ('accepted', 'expired') then
    raise exception 'invitation_not_cancelable'
      using errcode = '22023';
  end if;

  if v_invitation.status not in ('prepared', 'sent', 'auth_failed') then
    raise exception 'invitation_not_cancelable'
      using errcode = '22023';
  end if;

  select coalesce(bool_or(r.is_owner_role = true or lower(r.name) = 'owner'), false)
    into v_has_owner_role
    from unnest(v_invitation.role_ids) requested(role_id)
    join public.roles r
      on r.id = requested.role_id;

  if v_has_owner_role
     and not public.current_app_user_has_permission('users.grant_owner') then
    raise exception 'owner_grant_permission_required'
      using errcode = '42501';
  end if;

  update public.company_member_invitations cmi
     set status = 'cancelled',
         cancelled_at = coalesce(cmi.cancelled_at, now()),
         metadata = coalesce(cmi.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'cancel_reason', nullif(p_reason, ''),
           'cancel_request_id', nullif(p_request_id, ''),
           'cancelled_by_user_id', v_actor_user_id
         ))
   where cmi.id = v_invitation.id
   returning cmi.cancelled_at into v_cancelled_at;

  update public.user_role_assignments ura
     set status = 'inactive',
         is_primary = false,
         expires_at = coalesce(ura.expires_at, now()),
         updated_at = now()
   where v_invitation.membership_id is not null
     and ura.company_id = v_invitation.company_id
     and ura.user_id = v_invitation.invited_user_id
     and ura.role_id = any(v_invitation.role_ids)
     and ura.status = 'inactive';

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
    'company.member_invite_cancelled',
    'invitation',
    v_invitation.id,
    jsonb_strip_nulls(jsonb_build_object(
      'normalized_email', v_invitation.normalized_email,
      'role_ids', to_jsonb(v_invitation.role_ids),
      'primary_role_id', v_invitation.primary_role_id,
      'reason', nullif(p_reason, ''),
      'request_id', nullif(p_request_id, '')
    )),
    nullif(p_request_id, '')
  );

  return query
  select
    v_invitation.id,
    'cancelled'::text,
    v_cancelled_at,
    true;
end;
$$;

revoke all privileges on function public.rpc_company_member_invitations_list(text, integer) from public, anon;
revoke all privileges on function public.rpc_company_member_invitation_cancel(uuid, text, text) from public, anon;

grant execute on function public.rpc_company_member_invitations_list(text, integer) to authenticated, service_role;
grant execute on function public.rpc_company_member_invitation_cancel(uuid, text, text) to authenticated, service_role;

comment on function public.rpc_company_member_invitations_list(text, integer) is
  'Phase 8C5F1 safe current-company invitation management projection. Returns invitation lifecycle summaries and safe role labels only; no auth ids, provider tokens, raw permissions, or operational data.';

comment on function public.rpc_company_member_invitation_cancel(uuid, text, text) is
  'Phase 8C5F1 guarded current-company invitation cancellation RPC. Cancels prepared, sent, or auth-failed invitations only, writes audit, and does not mutate legacy user_roles or active accepted memberships.';

commit;
