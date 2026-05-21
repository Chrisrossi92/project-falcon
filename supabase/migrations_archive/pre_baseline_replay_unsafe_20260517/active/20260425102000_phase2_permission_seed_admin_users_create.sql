begin;

-- Phase 2 permission seed correction:
-- Admin template role can create users.

insert into public.role_permissions (role_id, permission_key)
select r.id, 'users.create'
  from public.roles r
  join public.permissions p
    on p.key = 'users.create'
 where r.company_id is null
   and lower(r.name) = 'admin'
on conflict (role_id, permission_key) do nothing;

commit;
