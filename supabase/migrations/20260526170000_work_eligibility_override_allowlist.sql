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

create or replace function public.permission_override_is_v1_safe(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_permission_key in (
      'orders.assignable_as_appraiser',
      'orders.assignable_as_reviewer'
    )
    or exists (
      select 1
        from public.permissions p
       where p.key = p_permission_key
         and p.category in (
           'orders',
           'clients',
           'users',
           'roles',
           'workflow',
           'billing',
           'settings'
         )
    );
$$;

revoke all privileges on function public.permission_override_is_v1_safe(text) from public, anon;
grant execute on function public.permission_override_is_v1_safe(text) to authenticated, service_role;

comment on function public.permission_override_is_v1_safe(text) is
  'Returns true for explicit V1-safe permission override keys. Work eligibility permissions are explicitly allowed and do not unlock hidden AMC, Assignments, Relationships, or vendor surfaces.';

commit;
