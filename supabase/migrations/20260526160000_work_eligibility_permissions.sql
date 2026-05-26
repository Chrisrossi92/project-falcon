begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'orders.assignable_as_appraiser',
    'orders',
    'Assignable as Appraiser',
    'Allows this member to be selected as the assigned appraiser on company orders. Does not grant management surfaces.',
    true,
    false
  ),
  (
    'orders.assignable_as_reviewer',
    'orders',
    'Assignable as Reviewer',
    'Allows this member to be selected as the reviewer on company orders. Does not grant management surfaces.',
    true,
    false
  )
on conflict (key) do update
  set category = excluded.category,
      label = excluded.label,
      description = excluded.description,
      is_system = excluded.is_system,
      is_owner_only = excluded.is_owner_only;

insert into public.role_permissions (role_id, permission_key)
select r.id, seeded.permission_key
from public.roles r
join (
  values
    ('Appraiser', 'orders.assignable_as_appraiser'),
    ('Reviewer', 'orders.assignable_as_reviewer')
) as seeded(role_name, permission_key)
  on lower(r.name) = lower(seeded.role_name)
where r.company_id is null
  and r.is_template = true
  and r.is_system = true
on conflict (role_id, permission_key) do nothing;

create or replace function public.app_user_permission_keys_for_company(
  p_user_id uuid,
  p_company_id uuid
)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  with ctx as (
    select
      p_user_id as user_id,
      p_company_id as company_id,
      public.default_company_id() as default_company_id
  ),
  membership as (
    select cm.id as membership_id
      from ctx
      join public.company_memberships cm
        on cm.user_id = ctx.user_id
       and cm.company_id = ctx.company_id
       and cm.status = 'active'
     where ctx.user_id is not null
       and ctx.company_id is not null
  ),
  assigned_roles as (
    select r.id, r.name, r.is_owner_role
      from ctx
      join membership on true
      join public.user_role_assignments ura
        on ura.user_id = ctx.user_id
       and ura.company_id = ctx.company_id
       and ura.status = 'active'
       and (ura.expires_at is null or ura.expires_at > now())
      join public.roles r
        on r.id = ura.role_id
  ),
  legacy_roles as (
    select distinct lower(trim(ur.role)) as role_name
      from ctx
      join membership on true
      left join public.users u
        on u.id = ctx.user_id
      join public.user_roles ur
        on ur.user_id = ctx.user_id
        or ur.user_id = u.auth_id
     where ctx.company_id = ctx.default_company_id
       and ur.role is not null
  ),
  owner_permissions as (
    select p.key
      from public.permissions p
     where exists (
       select 1
         from assigned_roles ar
        where ar.is_owner_role
           or lower(ar.name) = 'owner'
     )
        or exists (
       select 1
         from legacy_roles lr
        where lr.role_name = 'owner'
     )
  ),
  assigned_role_permissions as (
    select rp.permission_key as key
      from assigned_roles ar
      join public.role_permissions rp
        on rp.role_id = ar.id
  ),
  legacy_template_role_permissions as (
    select rp.permission_key as key
      from legacy_roles lr
      join public.roles r
        on r.company_id is null
       and lower(r.name) = lr.role_name
      join public.role_permissions rp
        on rp.role_id = r.id
  ),
  role_derived_permissions as (
    select key from owner_permissions
    union
    select key from assigned_role_permissions
    union
    select key from legacy_template_role_permissions
  ),
  explicit_grants as (
    select cmpo.permission_key as key
      from ctx
      join membership m on true
      join public.company_member_permission_overrides cmpo
        on cmpo.company_id = ctx.company_id
       and cmpo.membership_id = m.membership_id
       and cmpo.user_id = ctx.user_id
       and cmpo.effect = 'grant'
  ),
  explicit_revokes as (
    select cmpo.permission_key as key
      from ctx
      join membership m on true
      join public.company_member_permission_overrides cmpo
        on cmpo.company_id = ctx.company_id
       and cmpo.membership_id = m.membership_id
       and cmpo.user_id = ctx.user_id
       and cmpo.effect = 'revoke'
  )
  select distinct key
    from (
      select key from role_derived_permissions
      union
      select key from explicit_grants
    ) permissions
   where key is not null
     and not exists (
       select 1
         from explicit_revokes er
        where er.key = permissions.key
     )
   order by key;
$$;

revoke all privileges on function public.app_user_permission_keys_for_company(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.app_user_permission_keys_for_company(uuid, uuid)
  to service_role;

create or replace function public.current_app_user_permission_keys_for_company(p_company_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select permission_key
    from public.app_user_permission_keys_for_company(
      public.current_app_user_id(),
      p_company_id
    ) as resolved(permission_key)
   where public.current_app_user_id() is not null
     and p_company_id is not null
     and public.current_app_user_has_company(p_company_id)
   order by permission_key;
$$;

create or replace function public.current_app_user_can_assign_order_target(
  p_target_user_id uuid,
  p_company_id uuid,
  p_assignment_kind text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      p_target_user_id as target_user_id,
      coalesce(p_company_id, public.default_company_id()) as company_id,
      lower(trim(coalesce(p_assignment_kind, ''))) as assignment_kind
  ),
  required_permission as (
    select
      n.target_user_id,
      n.company_id,
      case
        when n.assignment_kind in ('appraiser', 'assigned_to') then 'orders.assignable_as_appraiser'
        when n.assignment_kind in ('reviewer', 'current_reviewer') then 'orders.assignable_as_reviewer'
        else null
      end as permission_key
    from normalized n
  )
  select
    p_target_user_id is null
    or auth.role() = 'service_role'
    or exists (
      select 1
        from required_permission rp
        join public.company_memberships cm
          on cm.user_id = rp.target_user_id
         and cm.company_id = rp.company_id
         and cm.status = 'active'
        join public.app_user_permission_keys_for_company(rp.target_user_id, rp.company_id) granted(permission_key)
          on granted.permission_key = rp.permission_key
       where rp.company_id = public.current_company_id()
         and rp.permission_key is not null
    );
$$;

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
      coalesce(u.fee_split, u.split) as default_split_pct,
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
      ) as role_keys
    from active_member_users amu
    left join active_roles ar
      on ar.user_id = amu.user_id
   group by amu.user_id
  ),
  permission_summary as (
    select
      amu.user_id,
      coalesce(bool_or(k.permission_key = 'orders.assignable_as_appraiser'), false) as can_be_appraiser,
      coalesce(bool_or(k.permission_key = 'orders.assignable_as_reviewer'), false) as can_be_reviewer
    from active_member_users amu
    left join lateral public.app_user_permission_keys_for_company(amu.user_id, v_company_id) k(permission_key)
      on true
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
    coalesce(ps.can_be_appraiser, false) as can_be_appraiser,
    coalesce(ps.can_be_reviewer, false) as can_be_reviewer,
    amu.default_split_pct,
    amu.is_active,
    amu.status
  from active_member_users amu
  left join role_summary rs
    on rs.user_id = amu.user_id
  left join permission_summary ps
    on ps.user_id = amu.user_id
  where case
    when v_purpose = 'appraiser' then coalesce(ps.can_be_appraiser, false)
    when v_purpose = 'reviewer' then coalesce(ps.can_be_reviewer, false)
    when v_purpose = 'order_assignment' then coalesce(ps.can_be_appraiser, false) or coalesce(ps.can_be_reviewer, false)
    else true
  end
  order by
    coalesce(nullif(amu.display_name, ''), nullif(amu.full_name, ''), nullif(amu.name, ''), amu.email),
    amu.user_id;
end;
$$;

revoke all privileges on function public.current_app_user_permission_keys_for_company(uuid)
  from public, anon;
grant execute on function public.current_app_user_permission_keys_for_company(uuid)
  to authenticated, service_role;

revoke execute on function public.current_app_user_can_assign_order_target(uuid, uuid, text)
  from public, anon;
grant execute on function public.current_app_user_can_assign_order_target(uuid, uuid, text)
  to authenticated, service_role;

revoke all privileges on function public.rpc_company_assignable_users(text)
  from public, anon;
grant execute on function public.rpc_company_assignable_users(text)
  to authenticated, service_role;

comment on function public.app_user_permission_keys_for_company(uuid, uuid) is
  'Target-user company-aware effective permission resolver. Effective permissions are active role permissions plus explicit grants minus explicit revokes.';

comment on function public.current_app_user_permission_keys_for_company(uuid) is
  'Current-user company-aware effective permission resolver. Effective permissions are active role permissions plus explicit grants minus explicit revokes.';

comment on function public.current_app_user_can_assign_order_target(uuid, uuid, text) is
  'Validates appraiser/reviewer assignment targets using explicit work eligibility permissions instead of role labels.';

comment on function public.rpc_company_assignable_users(text) is
  'Safe current-company assignable user projection. Returns active current-company members with Appraiser/Reviewer eligibility derived from effective permissions, including explicit grants and revokes.';

commit;
