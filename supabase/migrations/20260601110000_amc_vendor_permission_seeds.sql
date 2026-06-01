begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'vendors.read',
    'vendors',
    'Read vendors',
    'View vendor directory records for the current company.',
    true,
    false
  ),
  (
    'vendors.create',
    'vendors',
    'Create vendors',
    'Create vendor company/profile entries for the current company.',
    true,
    false
  ),
  (
    'vendors.update',
    'vendors',
    'Update vendors',
    'Update vendor profile metadata and status.',
    true,
    false
  ),
  (
    'vendors.contacts.manage',
    'vendors',
    'Manage vendor contacts',
    'Create/update vendor contacts.',
    true,
    false
  ),
  (
    'vendors.service_areas.manage',
    'vendors',
    'Manage vendor service areas',
    'Create/update vendor coverage rows.',
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
    ('Owner', 'vendors.read'),
    ('Owner', 'vendors.create'),
    ('Owner', 'vendors.update'),
    ('Owner', 'vendors.contacts.manage'),
    ('Owner', 'vendors.service_areas.manage'),
    ('Admin', 'vendors.read'),
    ('Admin', 'vendors.create'),
    ('Admin', 'vendors.update'),
    ('Admin', 'vendors.contacts.manage'),
    ('Admin', 'vendors.service_areas.manage')
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

-- AMC-2S seeds the MVP vendor permission catalog and default Owner/Admin grants only.
-- Vendor Directory route/RPC/nav gates remain on temporary relationships.read until AMC-2T.
-- No vendor roles, mutation RPCs, UI, assignment behavior, order behavior, or /amc/* routes are introduced.

commit;
