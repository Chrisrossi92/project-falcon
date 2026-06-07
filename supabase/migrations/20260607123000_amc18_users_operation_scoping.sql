begin;

create or replace function public.company_role_matches_operations_scope(
  p_role_id uuid,
  p_operations_scope text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select nullif(lower(trim(coalesce(p_operations_scope, ''))), '') as operations_scope
  ),
  role_row as (
    select
      r.id,
      r.name,
      r.is_owner_role
    from public.roles r
    where r.id = p_role_id
  ),
  role_permission as (
    select rp.permission_key
    from public.role_permissions rp
    where rp.role_id = p_role_id
  )
  select case
    when (select operations_scope from normalized) is null then true
    when (select operations_scope from normalized) not in ('internal_operations', 'amc_operations') then false
    when exists (
      select 1
      from role_row r
      where r.is_owner_role = true
         or lower(r.name) = 'owner'
    ) then true
    when (select operations_scope from normalized) = 'amc_operations' then exists (
      select 1
      from role_permission rp
      where rp.permission_key like 'vendor\_%' escape '\'
         or rp.permission_key like 'vendor_workspace.%'
         or rp.permission_key like 'bid_requests.%'
         or rp.permission_key like 'order_company_assignments.%'
         or rp.permission_key in (
           'client_portal.order_requests.read',
           'client_portal.order_requests.manage'
         )
    )
    when (select operations_scope from normalized) = 'internal_operations' then exists (
      select 1
      from role_permission rp
      where rp.permission_key like 'orders.%'
         or rp.permission_key like 'assignments.%'
         or rp.permission_key like 'workflow.%'
         or rp.permission_key like 'activity.%'
         or rp.permission_key like 'communications.%'
         or rp.permission_key like 'documents.%'
         or rp.permission_key like 'billing.%'
         or rp.permission_key like 'clients.%'
         or rp.permission_key like 'users.%'
         or rp.permission_key like 'roles.%'
         or rp.permission_key like 'reports.%'
         or rp.permission_key like 'settings.%'
         or rp.permission_key like 'company.%'
         or rp.permission_key like 'navigation.%'
    )
    else false
  end;
$$;

create or replace function public.rpc_company_member_list(
  p_include_inactive boolean default false,
  p_operations_scope text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  display_name text,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  display_color text,
  membership_status text,
  membership_type text,
  is_primary boolean,
  joined_at timestamptz,
  auth_linked boolean,
  is_owner boolean,
  role_assignments jsonb,
  can_update_roles boolean,
  can_deactivate boolean,
  can_reactivate boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_operations_scope text := nullif(lower(trim(coalesce(p_operations_scope, ''))), '');
  v_can_read_users boolean;
  v_can_update_roles boolean;
  v_can_deactivate_users boolean;
  v_can_reactivate_users boolean;
  v_owner_count integer;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  if v_operations_scope is not null
     and v_operations_scope not in ('internal_operations', 'amc_operations') then
    raise exception 'invalid_member_operations_scope'
      using errcode = '22023';
  end if;

  v_can_read_users := public.current_app_user_has_permission('users.read');
  if not v_can_read_users then
    raise exception 'users_read_permission_required'
      using errcode = '42501';
  end if;

  v_can_update_roles :=
    public.current_app_user_has_permission('users.manage_company_access')
    and public.current_app_user_has_permission('roles.assign');
  v_can_deactivate_users := public.current_app_user_has_permission('users.deactivate');
  v_can_reactivate_users :=
    public.current_app_user_has_permission('users.manage_company_access')
    or public.current_app_user_has_permission('users.update');

  select public.company_active_owner_count(v_company_id)
    into v_owner_count;

  return query
  with scoped_role_assignments as (
    select
      cm.user_id,
      ura.id as role_assignment_id,
      ura.role_id,
      r.name as role_name,
      r.is_owner_role,
      ura.is_primary,
      ura.status,
      ura.expires_at
    from public.company_memberships cm
    join public.user_role_assignments ura
      on ura.company_id = cm.company_id
     and ura.user_id = cm.user_id
    join public.roles r
      on r.id = ura.role_id
   where cm.company_id = v_company_id
     and public.company_role_matches_operations_scope(ura.role_id, v_operations_scope)
  ),
  member_roles as (
    select
      sra.user_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_assignment_id', sra.role_assignment_id,
            'role_id', sra.role_id,
            'role_name', sra.role_name,
            'is_owner_role', sra.is_owner_role,
            'is_primary', sra.is_primary,
            'status', sra.status
          )
          order by
            case when sra.status = 'active' then 0 else 1 end,
            sra.is_primary desc,
            sra.is_owner_role desc,
            sra.role_name
        ),
        '[]'::jsonb
      ) as role_assignments,
      coalesce(
        bool_or(
          sra.status = 'active'
          and (sra.expires_at is null or sra.expires_at > now())
          and (sra.is_owner_role = true or lower(sra.role_name) = 'owner')
        ),
        false
      ) as is_owner,
      coalesce(
        bool_or(
          sra.status = 'active'
          and (sra.expires_at is null or sra.expires_at > now())
        ),
        false
      ) as has_active_scoped_role
    from scoped_role_assignments sra
   group by sra.user_id
  )
  select
    u.id as user_id,
    cm.id as membership_id,
    coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email) as display_name,
    coalesce(nullif(u.full_name, ''), nullif(u.name, ''), nullif(u.display_name, '')) as full_name,
    u.email,
    u.phone,
    u.avatar_url,
    coalesce(nullif(u.display_color, ''), nullif(u.color, '')) as display_color,
    cm.status as membership_status,
    cm.membership_type,
    cm.is_primary,
    cm.joined_at,
    u.auth_id is not null as auth_linked,
    coalesce(mr.is_owner, false) as is_owner,
    coalesce(mr.role_assignments, '[]'::jsonb) as role_assignments,
    v_can_update_roles as can_update_roles,
    (
      v_can_deactivate_users
      and cm.status = 'active'
      and not (coalesce(mr.is_owner, false) and v_owner_count <= 1)
    ) as can_deactivate,
    (
      v_can_reactivate_users
      and cm.status <> 'active'
    ) as can_reactivate
  from public.company_memberships cm
  join public.users u
    on u.id = cm.user_id
  left join member_roles mr
    on mr.user_id = cm.user_id
  where cm.company_id = v_company_id
    and (p_include_inactive or cm.status = 'active')
    and (
      v_operations_scope is null
      or coalesce(mr.has_active_scoped_role, false)
    )
  order by
    case when cm.status = 'active' then 0 else 1 end,
    coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email);
end;
$$;

revoke all privileges on function public.company_role_matches_operations_scope(uuid, text) from public, anon;
revoke all privileges on function public.rpc_company_member_list(boolean, text) from public, anon;

grant execute on function public.company_role_matches_operations_scope(uuid, text) to authenticated, service_role;
grant execute on function public.rpc_company_member_list(boolean, text) to authenticated, service_role;

comment on function public.company_role_matches_operations_scope(uuid, text) is
  'AMC-18 helper for Users operation scoping. Maps role permission metadata to Internal or AMC operation relevance while preserving no-scope fallback behavior.';

comment on function public.rpc_company_member_list(boolean, text) is
  'AMC-18 operation-aware current-company member projection. Optional operations_scope filters members and returned role assignments so Internal, AMC, Vendor Workspace, and Client Portal user surfaces do not bleed into each other.';

commit;
