begin;

-- Phase 2 Step 2:
-- Read-only compatibility permission resolver.
-- This does not change RLS, existing helpers, user_roles, or app behavior.

create or replace function public.current_app_user_permission_keys()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  with current_user_ctx as (
    select public.current_app_user_id() as user_id
  ),
  legacy_roles as (
    select distinct lower(ur.role) as role_name
      from current_user_ctx c
      join public.user_roles ur
        on ur.user_id = c.user_id
     where c.user_id is not null
       and ur.role is not null
  ),
  owner_permissions as (
    select p.key
      from public.permissions p
     where exists (
       select 1
         from legacy_roles lr
        where lr.role_name = 'owner'
     )
  ),
  template_role_permissions as (
    select rp.permission_key as key
      from legacy_roles lr
      join public.roles r
        on r.company_id is null
       and lower(r.name) = lr.role_name
      join public.role_permissions rp
        on rp.role_id = r.id
  )
  select distinct key
    from (
      select key from owner_permissions
      union all
      select key from template_role_permissions
    ) permissions
   where key is not null
   order by key;
$$;

grant execute on function public.current_app_user_permission_keys() to authenticated;

create or replace function public.current_app_user_has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.current_app_user_permission_keys() k(permission_key)
     where k.permission_key = p_permission_key
  );
$$;

grant execute on function public.current_app_user_has_permission(text) to authenticated;

create or replace function public.current_app_user_has_any_permission(p_permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
      join public.current_app_user_permission_keys() granted(permission_key)
        on granted.permission_key = requested.permission_key
  );
$$;

grant execute on function public.current_app_user_has_any_permission(text[]) to authenticated;

create or replace function public.current_app_user_has_all_permissions(p_permission_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
      from unnest(coalesce(p_permission_keys, '{}'::text[])) requested(permission_key)
     where not exists (
       select 1
         from public.current_app_user_permission_keys() granted(permission_key)
        where granted.permission_key = requested.permission_key
     )
  );
$$;

grant execute on function public.current_app_user_has_all_permissions(text[]) to authenticated;

commit;
