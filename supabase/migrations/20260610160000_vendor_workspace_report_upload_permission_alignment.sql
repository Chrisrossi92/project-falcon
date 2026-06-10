begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'vendor_assignments.progress',
    'vendor_assignments',
    'Progress vendor assignments',
    'Allows authenticated vendor-company users to start work and submit reports for assignment packets scoped to their vendor company.',
    true,
    false
  ),
  (
    'vendor_documents.upload',
    'vendor_documents',
    'Upload vendor documents',
    'Allows authenticated vendor-company users to upload vendor documents through assignment-scoped document RPCs.',
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
    ('Vendor Admin', 'vendor_assignments.progress'),
    ('Vendor Admin', 'vendor_documents.upload')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, seed.permission_key
  from role_permission_seed seed
  join public.roles r
    on r.company_id is null
   and lower(r.name) = lower(seed.role_name)
  join public.permissions p
    on p.key = seed.permission_key
on conflict (role_id, permission_key) do nothing;

comment on table public.role_permissions is
  'Role-to-permission grants. AMC-13 report upload alignment ensures Vendor Admin has vendor_assignments.progress and vendor_documents.upload for authenticated vendor report upload preparation/registration.';

commit;
