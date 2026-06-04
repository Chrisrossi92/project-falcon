begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'vendor_workspace.view',
    'vendor_workspace',
    'View Vendor Workspace',
    'Future permission for authenticated vendor-company users to access the Vendor Workspace shell.',
    true,
    false
  ),
  (
    'vendor_bids.read',
    'vendor_bids',
    'Read vendor bids',
    'Future permission for authenticated vendor-company users to view bid requests and submitted bids scoped to their vendor company.',
    true,
    false
  ),
  (
    'vendor_bids.respond',
    'vendor_bids',
    'Respond to vendor bids',
    'Future permission for authenticated vendor-company users to submit or update bid responses scoped to their vendor company.',
    true,
    false
  ),
  (
    'vendor_assignments.read',
    'vendor_assignments',
    'Read vendor assignments',
    'Future permission for authenticated vendor-company users to view assignment packets scoped to their vendor company.',
    true,
    false
  ),
  (
    'vendor_assignments.respond',
    'vendor_assignments',
    'Respond to vendor assignments',
    'Future permission for authenticated vendor-company users to accept or decline assignment offers scoped to their vendor company.',
    true,
    false
  ),
  (
    'vendor_assignments.progress',
    'vendor_assignments',
    'Progress vendor assignments',
    'Future permission for authenticated vendor-company users to start work and submit reports for assignment packets scoped to their vendor company.',
    true,
    false
  ),
  (
    'vendor_documents.read',
    'vendor_documents',
    'Read vendor documents',
    'Future permission for authenticated vendor-company users to read vendor-visible documents through assignment-scoped document RPCs.',
    true,
    false
  ),
  (
    'vendor_documents.upload',
    'vendor_documents',
    'Upload vendor documents',
    'Future permission for authenticated vendor-company users to upload vendor documents through assignment-scoped document RPCs.',
    true,
    false
  ),
  (
    'vendor_profile.read',
    'vendor_profile',
    'Read vendor profile',
    'Future permission for authenticated vendor-company users to read their vendor company profile surface.',
    true,
    false
  ),
  (
    'vendor_profile.update',
    'vendor_profile',
    'Update vendor profile',
    'Future permission for authenticated vendor-company users to update allowed vendor-owned profile fields.',
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

insert into public.roles (name, description, is_template, is_system, is_owner_role)
select
  'Vendor Admin',
  'Authenticated vendor-company role for future Vendor Workspace access. Grants only vendor-side permissions.',
  true,
  true,
  false
where not exists (
  select 1
    from public.roles r
   where r.company_id is null
     and lower(r.name) = lower('Vendor Admin')
);

with role_permission_seed(role_name, permission_key) as (
  values
    ('Vendor Admin', 'vendor_workspace.view'),
    ('Vendor Admin', 'vendor_bids.read'),
    ('Vendor Admin', 'vendor_bids.respond'),
    ('Vendor Admin', 'vendor_assignments.read'),
    ('Vendor Admin', 'vendor_assignments.respond'),
    ('Vendor Admin', 'vendor_assignments.progress'),
    ('Vendor Admin', 'vendor_documents.read'),
    ('Vendor Admin', 'vendor_documents.upload'),
    ('Vendor Admin', 'vendor_profile.read'),
    ('Vendor Admin', 'vendor_profile.update')
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

-- AMC-9A.1 adds Vendor Admin as a future authenticated Vendor Workspace role template only.
-- No vendor routes, nav, pages, public token changes, assignment lifecycle changes, bid
-- lifecycle changes, order visibility, or owner-side vendors/bid_requests/orders grants
-- are introduced by this migration.

commit;
