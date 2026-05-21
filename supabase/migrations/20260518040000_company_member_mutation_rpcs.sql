begin;

create or replace function public.rpc_company_member_role_update(
  p_user_id uuid,
  p_role_ids uuid[],
  p_primary_role_id uuid default null,
  p_reason text default null,
  p_request_id text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  changed boolean,
  active_owner_count integer,
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
  v_company_status text;
  v_membership_id uuid;
  v_membership_status text;
  v_requested_role_ids uuid[] := coalesce(p_role_ids, '{}'::uuid[]);
  v_requested_sorted uuid[];
  v_requested_count integer;
  v_valid_count integer;
  v_previous_active_role_ids uuid[];
  v_new_active_role_ids uuid[];
  v_previous_primary_role_id uuid;
  v_new_primary_role_id uuid;
  v_previous_has_owner boolean;
  v_requested_has_owner boolean;
  v_can_grant_owner boolean;
  v_can_revoke_owner boolean;
  v_changed boolean := false;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('users.manage_company_access') then
    raise exception 'users_manage_company_access_required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('roles.assign') then
    raise exception 'roles_assign_permission_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
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

  perform pg_advisory_xact_lock(hashtextextended(v_company_id::text, 0));

  select cm.id, cm.status
    into v_membership_id, v_membership_status
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id
   for update;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from unnest(v_requested_role_ids) requested(role_id)
     where requested.role_id is null
  ) then
    raise exception 'role_id_required'
      using errcode = '22023';
  end if;

  select count(*), coalesce(array_agg(requested.role_id order by requested.role_id), '{}'::uuid[])
    into v_requested_count, v_requested_sorted
    from unnest(v_requested_role_ids) requested(role_id);

  if v_requested_count <> (
    select count(distinct requested.role_id)
      from unnest(v_requested_role_ids) requested(role_id)
  ) then
    raise exception 'duplicate_role_ids'
      using errcode = '22023';
  end if;

  if p_primary_role_id is not null
     and not (p_primary_role_id = any(v_requested_role_ids)) then
    raise exception 'primary_role_not_in_submitted_roles'
      using errcode = '22023';
  end if;

  if v_requested_count > 0 then
    select count(*)
      into v_valid_count
      from public.roles r
     where r.id = any(v_requested_role_ids);

    if v_valid_count <> v_requested_count then
      raise exception 'unknown_role_id'
        using errcode = '22023';
    end if;

    if exists (
      select 1
        from public.roles r
       where r.id = any(v_requested_role_ids)
         and (
           r.company_id is not null
           or r.is_template is not true
           or r.is_system is not true
         )
    ) then
      raise exception 'role_preset_required'
        using errcode = '22023';
    end if;

    select coalesce(
      bool_or(r.is_owner_role = true or lower(r.name) = 'owner'),
      false
    )
      into v_requested_has_owner
      from public.roles r
     where r.id = any(v_requested_role_ids);
  else
    v_requested_has_owner := false;
  end if;

  select coalesce(array_agg(ura.role_id order by ura.role_id), '{}'::uuid[])
    into v_previous_active_role_ids
    from public.user_role_assignments ura
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now());

  select ura.role_id
    into v_previous_primary_role_id
    from public.user_role_assignments ura
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and ura.is_primary = true
   order by
     case lower(r.name)
       when 'owner' then 1
       when 'admin' then 2
       when 'reviewer' then 3
       when 'appraiser' then 4
       when 'billing' then 5
       else 99
     end,
     r.name,
     ura.assigned_at
   limit 1;

  v_previous_has_owner := public.user_has_owner_role_in_company(p_user_id, v_company_id);

  if v_requested_count > 0 then
    select coalesce(p_primary_role_id, r.id)
      into v_new_primary_role_id
      from public.roles r
     where r.id = any(v_requested_role_ids)
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
  else
    v_new_primary_role_id := null;
  end if;

  v_can_grant_owner := public.current_app_user_has_permission('users.grant_owner');
  v_can_revoke_owner := public.current_app_user_has_permission('users.revoke_owner');

  if v_requested_has_owner and not v_previous_has_owner and not v_can_grant_owner then
    raise exception 'users_grant_owner_permission_required'
      using errcode = '42501';
  end if;

  if v_previous_has_owner and not v_requested_has_owner then
    if not v_can_revoke_owner then
      raise exception 'users_revoke_owner_permission_required'
        using errcode = '42501';
    end if;

    perform public.assert_company_will_have_owner(v_company_id, p_user_id);
  end if;

  v_changed :=
    coalesce(v_previous_active_role_ids, '{}'::uuid[]) <> coalesce(v_requested_sorted, '{}'::uuid[])
    or v_previous_primary_role_id is distinct from v_new_primary_role_id;

  update public.user_role_assignments ura
     set status = 'inactive',
         is_primary = false,
         updated_at = now()
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and not (ura.role_id = any(v_requested_role_ids));

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
    p_user_id,
    requested.role_id,
    'active',
    requested.role_id = v_new_primary_role_id,
    v_actor_user_id,
    now(),
    null,
    now(),
    now()
  from unnest(v_requested_role_ids) requested(role_id)
  on conflict (company_id, user_id, role_id) do update
    set status = 'active',
        is_primary = excluded.is_primary,
        assigned_by = excluded.assigned_by,
        assigned_at = excluded.assigned_at,
        expires_at = null,
        updated_at = now();

  update public.user_role_assignments ura
     set is_primary = (ura.role_id = v_new_primary_role_id),
         updated_at = now()
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.role_id = any(v_requested_role_ids)
     and (
       ura.is_primary is distinct from (ura.role_id = v_new_primary_role_id)
       or ura.status <> 'active'
     );

  active_owner_count := public.company_active_owner_count(v_company_id);
  if active_owner_count < 1 then
    raise exception 'company_owner_required'
      using errcode = '23514',
            detail = 'A company must retain at least one active owner.';
  end if;

  select coalesce(array_agg(ura.role_id order by ura.role_id), '{}'::uuid[])
    into v_new_active_role_ids
    from public.user_role_assignments ura
   where ura.company_id = v_company_id
     and ura.user_id = p_user_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now());

  if v_changed then
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
      'company.member_roles_updated',
      'membership',
      v_membership_id,
      jsonb_strip_nulls(jsonb_build_object(
        'target_user_id', p_user_id,
        'previous_role_ids', to_jsonb(v_previous_active_role_ids),
        'new_role_ids', to_jsonb(v_new_active_role_ids),
        'previous_primary_role_id', v_previous_primary_role_id,
        'new_primary_role_id', v_new_primary_role_id,
        'reason', nullif(p_reason, ''),
        'request_id', nullif(p_request_id, '')
      )),
      nullif(p_request_id, '')
    );
  end if;

  return query
  select
    p_user_id,
    v_membership_id,
    v_changed,
    active_owner_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'role_assignment_id', ura.id,
          'role_id', r.id,
          'role_name', r.name,
          'is_owner_role', r.is_owner_role,
          'is_primary', ura.is_primary,
          'status', ura.status
        )
        order by
          case when ura.status = 'active' then 0 else 1 end,
          ura.is_primary desc,
          r.is_owner_role desc,
          r.name
      ) filter (where ura.id is not null),
      '[]'::jsonb
    ) as role_assignments
  from public.company_memberships cm
  left join public.user_role_assignments ura
    on ura.company_id = cm.company_id
   and ura.user_id = cm.user_id
  left join public.roles r
    on r.id = ura.role_id
 where cm.id = v_membership_id
 group by cm.user_id, cm.id;
end;
$$;

create or replace function public.rpc_company_member_set_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null,
  p_request_id text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  previous_status text,
  membership_status text,
  changed boolean,
  active_owner_count integer
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
  v_company_status text;
  v_membership_id uuid;
  v_previous_status text;
  v_new_status text := lower(trim(coalesce(p_status, '')));
  v_target_has_owner boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_new_status not in ('active', 'inactive') then
    raise exception 'invalid_membership_status'
      using errcode = '22023';
  end if;

  if v_new_status = 'inactive' then
    if not public.current_app_user_has_permission('users.deactivate') then
      raise exception 'users_deactivate_permission_required'
        using errcode = '42501';
    end if;
  elsif not (
    public.current_app_user_has_permission('users.manage_company_access')
    or public.current_app_user_has_permission('users.update')
  ) then
    raise exception 'users_reactivate_permission_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
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

  perform pg_advisory_xact_lock(hashtextextended(v_company_id::text, 0));

  select cm.id, cm.status
    into v_membership_id, v_previous_status
    from public.company_memberships cm
   where cm.company_id = v_company_id
     and cm.user_id = p_user_id
   for update;

  if v_membership_id is null then
    raise exception 'target_company_membership_required'
      using errcode = '42501';
  end if;

  v_target_has_owner := public.user_has_owner_role_in_company(p_user_id, v_company_id);

  if v_new_status = 'inactive'
     and v_previous_status = 'active'
     and v_target_has_owner then
    perform public.assert_company_will_have_owner(v_company_id, p_user_id);
  end if;

  changed := v_previous_status is distinct from v_new_status;

  if changed then
    update public.company_memberships cm
       set status = v_new_status,
           joined_at = case
             when v_new_status = 'active' then coalesce(cm.joined_at, now())
             else cm.joined_at
           end,
           updated_at = now()
     where cm.id = v_membership_id;
  end if;

  active_owner_count := public.company_active_owner_count(v_company_id);
  if active_owner_count < 1 then
    raise exception 'company_owner_required'
      using errcode = '23514',
            detail = 'A company must retain at least one active owner.';
  end if;

  if changed then
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
      case
        when v_new_status = 'active' then 'company.member_reactivated'
        else 'company.member_deactivated'
      end,
      'membership',
      v_membership_id,
      jsonb_strip_nulls(jsonb_build_object(
        'target_user_id', p_user_id,
        'previous_status', v_previous_status,
        'new_status', v_new_status,
        'reason', nullif(p_reason, ''),
        'request_id', nullif(p_request_id, '')
      )),
      nullif(p_request_id, '')
    );
  end if;

  return query
  select
    p_user_id,
    v_membership_id,
    v_previous_status,
    v_new_status,
    changed,
    active_owner_count;
end;
$$;

revoke all privileges on function public.rpc_company_member_role_update(uuid, uuid[], uuid, text, text) from public, anon;
revoke all privileges on function public.rpc_company_member_set_status(uuid, text, text, text) from public, anon;

grant execute on function public.rpc_company_member_role_update(uuid, uuid[], uuid, text, text) to authenticated, service_role;
grant execute on function public.rpc_company_member_set_status(uuid, text, text, text) to authenticated, service_role;

comment on function public.rpc_company_member_role_update(uuid, uuid[], uuid, text, text) is
  'Phase 8C5E2 guarded current-company role assignment mutation. Uses template preset roles only, preserves owner invariant, writes company audit events, and does not sync legacy user_roles.';

comment on function public.rpc_company_member_set_status(uuid, text, text, text) is
  'Phase 8C5E2 guarded current-company membership activation/deactivation mutation. Preserves owner invariant, writes company audit events, and does not mutate role assignments.';

commit;
