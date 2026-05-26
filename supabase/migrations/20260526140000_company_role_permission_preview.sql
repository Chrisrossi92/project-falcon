begin;

create or replace function public.rpc_company_role_permission_preview()
returns table (
  role_id uuid,
  role_key text,
  role_name text,
  permission_key text,
  permission_category text,
  permission_label text,
  permission_description text,
  is_owner_only boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
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
    p.key as permission_key,
    p.category as permission_category,
    p.label as permission_label,
    p.description as permission_description,
    p.is_owner_only
  from public.roles r
  join public.role_permissions rp
    on rp.role_id = r.id
  join public.permissions p
    on p.key = rp.permission_key
  where r.company_id is null
    and r.is_template = true
    and r.is_system = true
    and (
      case
        when r.is_owner_role or lower(r.name) = 'owner' then v_can_grant_owner
        else v_can_assign_roles
      end
    )
  order by
    case lower(r.name)
      when 'owner' then 1
      when 'admin' then 2
      when 'appraiser' then 3
      when 'reviewer' then 4
      when 'billing' then 5
      else 99
    end,
    r.name,
    p.category,
    p.label;
end;
$$;

revoke all privileges on function public.rpc_company_role_permission_preview() from public, anon;
grant execute on function public.rpc_company_role_permission_preview() to authenticated, service_role;

comment on function public.rpc_company_role_permission_preview() is
  'Read-only current-company role preset permission preview for access editing. Returns human-readable template role permission labels only; does not expose member-specific overrides or mutate access.';

commit;
