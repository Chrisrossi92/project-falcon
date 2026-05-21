begin;

-- Phase 2 permission seed correction:
-- Standard users can view the company user directory read-only.
-- This grants only users.read to non-admin template roles.

with role_permission_seed(role_name, permission_key) as (
  values
    ('Appraiser', 'users.read'),
    ('Reviewer', 'users.read'),
    ('Billing', 'users.read')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, s.permission_key
  from role_permission_seed s
  join public.roles r
    on r.company_id is null
   and lower(r.name) = lower(s.role_name)
  join public.permissions p
    on p.key = s.permission_key
on conflict (role_id, permission_key) do nothing;

commit;
