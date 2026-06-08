begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'client_portal.order_requests.read',
    'client_portal',
    'Read Client Portal order requests',
    'Allows staff to view submitted Client Portal appraisal request intake records for the current company.',
    true,
    false
  ),
  (
    'client_portal.order_requests.manage',
    'client_portal',
    'Manage Client Portal order requests',
    'Allows staff to mark submitted Client Portal appraisal request intake records as reviewing or rejected.',
    true,
    false
  )
on conflict (key) do update
   set category = excluded.category,
       label = excluded.label,
       description = excluded.description,
       is_system = excluded.is_system,
       is_owner_only = excluded.is_owner_only,
       updated_at = now();

with role_permission_seed(role_name, permission_key) as (
  values
    ('Owner', 'client_portal.order_requests.read'),
    ('Owner', 'client_portal.order_requests.manage'),
    ('Admin', 'client_portal.order_requests.read'),
    ('Admin', 'client_portal.order_requests.manage')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, s.permission_key
  from role_permission_seed s
  join public.roles r
    on r.company_id is null
   and lower(r.name) = lower(s.role_name)
  join public.permissions p
    on p.key = s.permission_key
 where r.is_template = true
   and r.is_system = true
on conflict (role_id, permission_key) do nothing;

-- AMC-19.3 grants Client Portal request review/manage permissions to Owner/Admin templates so
-- AMC staff can access /client-requests without exposing the inbox to vendor or client-only users.

commit;
