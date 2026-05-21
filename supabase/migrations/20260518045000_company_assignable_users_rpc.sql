begin;

create or replace function public.rpc_company_assignable_users(
  p_purpose text default 'all'
)
returns table (
  user_id uuid,
  display_name text,
  full_name text,
  name text,
  email text,
  avatar_url text,
  display_color text,
  membership_status text,
  role_assignments jsonb,
  role_keys text[],
  can_be_appraiser boolean,
  can_be_reviewer boolean,
  default_split_pct numeric,
  is_active boolean,
  status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_purpose text := lower(trim(coalesce(p_purpose, 'all')));
  v_company_status text;
  v_authorized boolean;
begin
  if v_actor_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = '42501';
  end if;

  if v_company_id is null then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_purpose not in ('all', 'order_assignment', 'appraiser', 'reviewer') then
    raise exception 'invalid_assignable_user_purpose'
      using errcode = '22023';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current_company_membership_required'
      using errcode = '42501';
  end if;

  select c.status
    into v_company_status
    from public.companies c
   where c.id = v_company_id;

  if not found then
    raise exception 'company_not_found'
      using errcode = '42501';
  end if;

  if v_company_status <> 'active' then
    raise exception 'company_inactive'
      using errcode = '42501';
  end if;

  v_authorized :=
    public.current_app_user_has_permission('users.read')
    or public.current_app_user_has_permission('orders.create')
    or public.current_app_user_has_permission('orders.update.all')
    or public.current_app_user_has_permission('orders.read.all')
    or public.current_app_user_has_permission('orders.read.assigned');

  if not v_authorized then
    raise exception 'assignable_users_permission_required'
      using errcode = '42501';
  end if;

  return query
  with active_member_users as (
    select
      cm.user_id,
      cm.status as membership_status,
      u.display_name,
      u.full_name,
      u.name,
      u.email,
      u.avatar_url,
      coalesce(nullif(u.display_color, ''), nullif(u.color, '')) as display_color,
      coalesce(u.fee_split, u.split, u.split_pct) as default_split_pct,
      coalesce(u.is_active, true) as is_active,
      coalesce(nullif(u.status, ''), 'active') as status
    from public.company_memberships cm
    join public.users u
      on u.id = cm.user_id
   where cm.company_id = v_company_id
     and cm.status = 'active'
     and coalesce(u.is_active, true) = true
     and lower(coalesce(nullif(u.status, ''), 'active')) = 'active'
  ),
  active_roles as (
    select
      ura.user_id,
      ura.id as role_assignment_id,
      r.id as role_id,
      r.name as role_name,
      trim(both '_' from regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g')) as role_key,
      ura.is_primary
    from public.user_role_assignments ura
    join public.roles r
      on r.id = ura.role_id
   where ura.company_id = v_company_id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true
  ),
  role_summary as (
    select
      amu.user_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_assignment_id', ar.role_assignment_id,
            'role_id', ar.role_id,
            'role_key', ar.role_key,
            'role_name', ar.role_name,
            'display_name', ar.role_name,
            'is_primary', ar.is_primary
          )
          order by
            ar.is_primary desc,
            case ar.role_key
              when 'owner' then 1
              when 'admin' then 2
              when 'appraiser' then 3
              when 'reviewer' then 4
              when 'billing' then 5
              else 99
            end,
            ar.role_name
        ) filter (where ar.role_id is not null),
        '[]'::jsonb
      ) as role_assignments,
      coalesce(
        array_agg(distinct ar.role_key order by ar.role_key)
          filter (where ar.role_key is not null),
        array[]::text[]
      ) as role_keys,
      coalesce(bool_or(ar.role_key = 'appraiser'), false) as can_be_appraiser,
      coalesce(bool_or(ar.role_key = 'reviewer'), false) as can_be_reviewer
    from active_member_users amu
    left join active_roles ar
      on ar.user_id = amu.user_id
   group by amu.user_id
  )
  select
    amu.user_id,
    coalesce(nullif(amu.display_name, ''), nullif(amu.full_name, ''), nullif(amu.name, ''), amu.email) as display_name,
    coalesce(nullif(amu.full_name, ''), nullif(amu.name, ''), nullif(amu.display_name, '')) as full_name,
    amu.name,
    amu.email,
    amu.avatar_url,
    amu.display_color,
    amu.membership_status,
    coalesce(rs.role_assignments, '[]'::jsonb) as role_assignments,
    coalesce(rs.role_keys, array[]::text[]) as role_keys,
    coalesce(rs.can_be_appraiser, false) as can_be_appraiser,
    coalesce(rs.can_be_reviewer, false) as can_be_reviewer,
    amu.default_split_pct,
    amu.is_active,
    amu.status
  from active_member_users amu
  left join role_summary rs
    on rs.user_id = amu.user_id
  where case
    when v_purpose = 'appraiser' then coalesce(rs.can_be_appraiser, false)
    when v_purpose = 'reviewer' then coalesce(rs.can_be_reviewer, false)
    when v_purpose = 'order_assignment' then coalesce(rs.can_be_appraiser, false) or coalesce(rs.can_be_reviewer, false)
    else true
  end
  order by
    coalesce(nullif(amu.display_name, ''), nullif(amu.full_name, ''), nullif(amu.name, ''), amu.email),
    amu.user_id;
end;
$$;

revoke all privileges on function public.rpc_company_assignable_users(text) from public, anon;
grant execute on function public.rpc_company_assignable_users(text) to authenticated, service_role;

comment on function public.rpc_company_assignable_users(text) is
  'Phase 8C5G4A1 safe current-company assignable user projection. Returns active current-company members with Appraiser/Reviewer eligibility derived from active normalized template role assignments only; no auth ids, raw permission keys, operational records, or cross-company users.';

commit;
