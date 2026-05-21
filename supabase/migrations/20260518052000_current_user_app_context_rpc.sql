begin;

create or replace function public.rpc_current_user_app_context()
returns table (
  user_id uuid,
  current_company_id uuid,
  company_name text,
  company_slug text,
  has_current_company_membership boolean,
  display_name text,
  full_name text,
  email text,
  avatar_url text,
  display_color text,
  role_assignments jsonb,
  role_keys text[],
  primary_role_key text,
  is_owner boolean,
  is_admin_role boolean,
  is_reviewer_role boolean,
  is_appraiser_role boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
begin
  if v_user_id is null then
    raise exception 'app_user_not_found'
      using errcode = 'P0001',
            hint = 'An authenticated app user is required.';
  end if;

  return query
  with ctx as (
    select
      v_user_id as app_user_id,
      public.current_company_id() as resolved_company_id
  ),
  app_user as (
    select
      u.id,
      u.email,
      coalesce(nullif(trim(u.display_name), ''), nullif(trim(u.full_name), ''), nullif(trim(u.name), ''), u.email) as display_name,
      nullif(trim(u.full_name), '') as full_name,
      u.avatar_url,
      coalesce(nullif(trim(u.display_color), ''), nullif(trim(u.color), '')) as display_color
    from public.users u
    join ctx on ctx.app_user_id = u.id
  ),
  active_company as (
    select
      c.id,
      c.name,
      c.slug
    from ctx
    join public.companies c
      on c.id = ctx.resolved_company_id
     and c.status = 'active'
    where public.current_app_user_has_company(ctx.resolved_company_id)
  ),
  active_roles as (
    select
      ura.id as role_assignment_id,
      r.id as role_id,
      regexp_replace(lower(trim(r.name)), '[^a-z0-9]+', '_', 'g') as role_key,
      r.name as role_name,
      r.name as role_display_name,
      ura.is_primary,
      r.is_owner_role,
      case lower(trim(r.name))
        when 'owner' then 1
        when 'admin' then 2
        when 'reviewer' then 3
        when 'appraiser' then 4
        when 'billing' then 5
        else 99
      end as role_order
    from ctx
    join active_company ac on true
    join public.user_role_assignments ura
      on ura.user_id = ctx.app_user_id
     and ura.company_id = ac.id
     and ura.status = 'active'
     and (ura.expires_at is null or ura.expires_at > now())
    join public.roles r
      on r.id = ura.role_id
     and r.company_id is null
     and r.is_template = true
     and r.is_system = true
  ),
  ordered_role_keys as (
    select array_agg(role_key order by role_order, role_key) as keys
    from (
      select distinct role_key, role_order
      from active_roles
      where role_key is not null and role_key <> ''
    ) roles
  ),
  role_summary as (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'role_assignment_id', ar.role_assignment_id,
            'role_id', ar.role_id,
            'role_key', ar.role_key,
            'role_name', ar.role_name,
            'display_name', ar.role_display_name,
            'is_primary', ar.is_primary
          )
          order by ar.is_primary desc, ar.role_order, ar.role_name
        ),
        '[]'::jsonb
      ) as assignments,
      coalesce((select keys from ordered_role_keys), array[]::text[]) as keys,
      (
        select ar.role_key
        from active_roles ar
        order by ar.is_primary desc, ar.role_order, ar.role_name
        limit 1
      ) as primary_key,
      coalesce(bool_or(ar.is_owner_role or ar.role_key = 'owner'), false) as has_owner,
      coalesce(bool_or(ar.role_key = any (array['owner', 'admin'])), false) as has_admin,
      coalesce(bool_or(ar.role_key = 'reviewer'), false) as has_reviewer,
      coalesce(bool_or(ar.role_key = 'appraiser'), false) as has_appraiser
    from active_roles ar
  )
  select
    au.id as user_id,
    ac.id as current_company_id,
    ac.name as company_name,
    ac.slug as company_slug,
    (ac.id is not null) as has_current_company_membership,
    au.display_name,
    au.full_name,
    au.email,
    au.avatar_url,
    au.display_color,
    coalesce(rs.assignments, '[]'::jsonb) as role_assignments,
    coalesce(rs.keys, array[]::text[]) as role_keys,
    rs.primary_key as primary_role_key,
    coalesce(rs.has_owner, false) as is_owner,
    coalesce(rs.has_admin, false) as is_admin_role,
    coalesce(rs.has_reviewer, false) as is_reviewer_role,
    coalesce(rs.has_appraiser, false) as is_appraiser_role
  from app_user au
  left join active_company ac on true
  left join role_summary rs on true;
end;
$$;

revoke execute on function public.rpc_current_user_app_context() from public;
revoke execute on function public.rpc_current_user_app_context() from anon;
grant execute on function public.rpc_current_user_app_context() to authenticated;
grant execute on function public.rpc_current_user_app_context() to service_role;

comment on function public.rpc_current_user_app_context() is
  'Phase 8C5J1 stable UI context for the current app user and active company. Returns safe profile fields and display-only normalized role labels for the resolved current company; does not expose permission keys, auth ids, legacy public.users.role, or public.user_roles.';

commit;
