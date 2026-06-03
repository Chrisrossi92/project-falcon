begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'bid_requests.read',
    'bid_requests',
    'Read bid requests',
    'View bid request cycles, recipients, and responses for current-company AMC orders.',
    true,
    false
  ),
  (
    'bid_requests.create',
    'bid_requests',
    'Create bid requests',
    'Create/send bid outreach to eligible vendors.',
    true,
    false
  ),
  (
    'bid_requests.update',
    'bid_requests',
    'Update bid requests',
    'Cancel, expire, close, or update bid request recipient lifecycle state.',
    true,
    false
  ),
  (
    'bid_requests.select',
    'bid_requests',
    'Select bid responses',
    'Select a vendor response for conversion to an assignment offer.',
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
    ('Owner', 'bid_requests.read'),
    ('Owner', 'bid_requests.create'),
    ('Owner', 'bid_requests.update'),
    ('Owner', 'bid_requests.select'),
    ('Admin', 'bid_requests.read'),
    ('Admin', 'bid_requests.create'),
    ('Admin', 'bid_requests.update'),
    ('Admin', 'bid_requests.select')
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

-- AMC-6M.1 seeds the bid request permission catalog and default Owner/Admin grants only.
-- Reviewer, Appraiser, Billing, and future vendor-side bid response permissions remain deferred.
-- No bid request tables, RPCs, UI, routes/nav, assignment behavior, order behavior, schema/RLS changes, or /amc/* routes are introduced.

commit;
