begin;

create or replace function public.rpc_company_member_list(
  p_include_inactive boolean default false
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
  with member_roles as (
    select
      cm.user_id,
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
      ) as role_assignments,
      coalesce(
        bool_or(
          ura.status = 'active'
          and (ura.expires_at is null or ura.expires_at > now())
          and (r.is_owner_role = true or lower(r.name) = 'owner')
        ),
        false
      ) as is_owner
    from public.company_memberships cm
    left join public.user_role_assignments ura
      on ura.company_id = cm.company_id
     and ura.user_id = cm.user_id
    left join public.roles r
      on r.id = ura.role_id
   where cm.company_id = v_company_id
   group by cm.user_id
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
  order by
    case when cm.status = 'active' then 0 else 1 end,
    coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email);
end;
$$;

create or replace function public.rpc_company_role_preset_list()
returns table (
  role_id uuid,
  role_key text,
  role_name text,
  description text,
  is_owner_role boolean,
  is_system boolean,
  is_template boolean,
  active_assignment_count integer,
  permission_count integer,
  owner_only_permission_count integer,
  assignable_by_current_user boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_can_read_roles boolean;
  v_can_assign_roles boolean;
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

  v_can_read_roles := public.current_app_user_has_permission('roles.read');
  if not v_can_read_roles then
    raise exception 'roles_read_permission_required'
      using errcode = '42501';
  end if;

  v_can_assign_roles :=
    public.current_app_user_has_permission('roles.assign')
    and public.current_app_user_has_permission('users.manage_company_access');
  v_can_grant_owner := public.current_app_user_has_permission('users.grant_owner');

  return query
  select
    r.id as role_id,
    trim(both '_' from regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g')) as role_key,
    r.name as role_name,
    r.description,
    r.is_owner_role,
    r.is_system,
    r.is_template,
    coalesce(assignment_counts.active_assignment_count, 0)::integer as active_assignment_count,
    coalesce(permission_counts.permission_count, 0)::integer as permission_count,
    coalesce(permission_counts.owner_only_permission_count, 0)::integer as owner_only_permission_count,
    case
      when r.is_owner_role or lower(r.name) = 'owner' then v_can_grant_owner
      else v_can_assign_roles
    end as assignable_by_current_user
  from public.roles r
  left join lateral (
    select count(*)::integer as active_assignment_count
      from public.user_role_assignments ura
     where ura.company_id = v_company_id
       and ura.role_id = r.id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
  ) assignment_counts on true
  left join lateral (
    select
      count(*)::integer as permission_count,
      count(*) filter (where p.is_owner_only)::integer as owner_only_permission_count
      from public.role_permissions rp
      join public.permissions p
        on p.key = rp.permission_key
     where rp.role_id = r.id
  ) permission_counts on true
  where r.company_id is null
    and r.is_template = true
    and r.is_system = true
  order by
    case lower(r.name)
      when 'owner' then 1
      when 'admin' then 2
      when 'appraiser' then 3
      when 'reviewer' then 4
      when 'billing' then 5
      else 99
    end,
    r.name;
end;
$$;

revoke all privileges on function public.rpc_company_member_list(boolean) from public, anon;
revoke all privileges on function public.rpc_company_role_preset_list() from public, anon;

grant execute on function public.rpc_company_member_list(boolean) to authenticated, service_role;
grant execute on function public.rpc_company_role_preset_list() to authenticated, service_role;

comment on function public.rpc_company_member_list(boolean) is
  'Phase 8C5E1 safe current-company member projection. Returns current-company membership rows and safe role labels only; no auth ids, raw permission keys, operational data, or cross-company members.';

comment on function public.rpc_company_role_preset_list() is
  'Phase 8C5E1 safe template role preset projection. Returns template role summaries and aggregate counts only; no raw permission arrays or custom role editing.';

commit;
