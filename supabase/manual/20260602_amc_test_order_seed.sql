-- AMC-6H.6 local/demo AMC-scoped test order seed.
--
-- Purpose:
--   Create one safe AMC Operations order and one matching demo vendor so
--   AMC-scoped order list, dashboard, candidate matching, and offer guards can
--   be validated locally without using internal production orders.
--
-- Scope:
--   - Intended for local/dev/demo databases only.
--   - Reuses the existing falcon_default company as the owner company.
--   - Creates or updates only clearly labeled AMC demo records.
--   - Does not backfill or reclassify existing orders.
--   - Does not create assignments, offers, bid requests, notifications, users,
--     permissions, UI, routes, nav, schema, RLS, order creation behavior, or
--     /amc routes.
--
-- Run locally after migrations through AMC-6H.4 have been applied:
--   psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -f supabase/manual/20260602_amc_test_order_seed.sql
--
-- Run from a service-role/admin SQL session. Normal app RLS blocks direct
-- table writes by design. Never run this against production.

begin;

do $$
begin
  if to_regclass('public.orders') is null then
    raise exception 'orders table is required before loading AMC test order seed data';
  end if;

  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'operations_scope'
  ) then
    raise exception 'orders.operations_scope is required before loading AMC test order seed data. Apply AMC-6H.3 first.';
  end if;

  if to_regclass('public.company_relationships') is null
     or to_regclass('public.company_vendor_profiles') is null
     or to_regclass('public.vendor_contacts') is null
     or to_regclass('public.vendor_service_areas') is null then
    raise exception 'AMC vendor directory tables are required before loading AMC test order seed data';
  end if;

  if not exists (
    select 1
      from public.companies
     where slug = 'falcon_default'
  ) then
    raise exception 'falcon_default company is required before loading AMC test order seed data';
  end if;

  if exists (
    select 1
      from public.orders
     where order_number = 'AMC-DEMO-001'
       and coalesce(notes, '') not like '%AMC-6H.6 demo test order%'
  ) then
    raise exception 'Order number AMC-DEMO-001 already exists and is not marked as AMC-6H.6 demo data. Refusing to modify it.';
  end if;
end;
$$;

drop table if exists pg_temp.amc_test_order_seed;

create temp table amc_test_order_seed (
  owner_slug text not null,
  vendor_slug text not null,
  vendor_name text not null,
  order_number text not null,
  manual_client_name text not null,
  property_address text not null,
  city text not null,
  state text not null,
  county text not null,
  postal_code text not null,
  property_type text not null,
  report_type text not null
) on commit drop;

insert into amc_test_order_seed (
  owner_slug,
  vendor_slug,
  vendor_name,
  order_number,
  manual_client_name,
  property_address,
  city,
  state,
  county,
  postal_code,
  property_type,
  report_type
) values (
  'falcon_default',
  'amc-demo-franklin-commercial-valuation',
  'Franklin Commercial Valuation',
  'AMC-DEMO-001',
  'AMC Demo Lender',
  '100 Demo Avenue',
  'Columbus',
  'OH',
  'Franklin',
  '43215',
  'Commercial',
  'Appraisal'
);

insert into public.companies (
  slug,
  name,
  status,
  timezone,
  locale,
  settings,
  company_type,
  operating_mode_settings
)
select
  s.vendor_slug,
  s.vendor_name,
  'active',
  'America/New_York',
  'en-US',
  '{"demo_seed": "amc_6h_6"}'::jsonb,
  'vendor',
  '{}'::jsonb
from amc_test_order_seed s
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      timezone = excluded.timezone,
      locale = excluded.locale,
      settings = public.companies.settings || excluded.settings,
      company_type = excluded.company_type,
      updated_at = now();

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
),
vendor_company as (
  select c.id
    from public.companies c
    join seed s on s.vendor_slug = c.slug
)
insert into public.company_relationships (
  source_company_id,
  target_company_id,
  relationship_type,
  status,
  invited_at,
  approved_at,
  settings,
  compliance,
  notes
)
select
  owner_company.id,
  vendor_company.id,
  'amc_vendor',
  'active',
  now(),
  now(),
  '{"demo_seed": "amc_6h_6", "assignment_required_for_visibility": true}'::jsonb,
  '{"summary": "AMC-6H.6 demo compliance summary only", "demo_seed": "amc_6h_6"}'::jsonb,
  'AMC-6H.6 demo active AMC/vendor relationship for candidate testing.'
from owner_company
cross join vendor_company
where not exists (
  select 1
    from public.company_relationships cr
   where cr.source_company_id = owner_company.id
     and cr.target_company_id = vendor_company.id
     and cr.relationship_type = 'amc_vendor'
     and cr.status in ('invited', 'active', 'suspended')
);

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
),
vendor_company as (
  select c.id
    from public.companies c
    join seed s on s.vendor_slug = c.slug
)
update public.company_relationships cr
   set status = 'active',
       approved_at = coalesce(cr.approved_at, now()),
       suspended_at = null,
       settings = cr.settings || '{"demo_seed": "amc_6h_6", "assignment_required_for_visibility": true}'::jsonb,
       compliance = cr.compliance || '{"summary": "AMC-6H.6 demo compliance summary only", "demo_seed": "amc_6h_6"}'::jsonb,
       notes = 'AMC-6H.6 demo active AMC/vendor relationship for candidate testing.',
       updated_at = now()
  from owner_company
  cross join vendor_company
 where cr.source_company_id = owner_company.id
   and cr.target_company_id = vendor_company.id
   and cr.relationship_type = 'amc_vendor';

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
),
vendor_company as (
  select c.id
    from public.companies c
    join seed s on s.vendor_slug = c.slug
),
relationship as (
  select cr.id
    from public.company_relationships cr
    cross join owner_company
    cross join vendor_company
   where cr.source_company_id = owner_company.id
     and cr.target_company_id = vendor_company.id
     and cr.relationship_type = 'amc_vendor'
     and cr.status in ('invited', 'active', 'suspended')
   order by case cr.status when 'active' then 0 when 'invited' then 1 else 2 end,
            cr.updated_at desc nulls last,
            cr.created_at desc nulls last
   limit 1
)
insert into public.company_vendor_profiles (
  owner_company_id,
  vendor_company_id,
  relationship_id,
  vendor_status,
  website,
  primary_address,
  public_phone,
  default_assignment_instructions,
  capabilities,
  product_eligibility,
  internal_notes,
  tags
)
select
  owner_company.id,
  vendor_company.id,
  relationship.id,
  'preferred',
  'https://franklincommercial.example',
  '{"line1": "200 Demo Plaza", "city": "Columbus", "state": "OH", "postal_code": "43215"}'::jsonb,
  '(614) 555-0161',
  'AMC-6H.6 demo vendor for Franklin County commercial candidate matching.',
  '{"commercial": true, "rush_orders": false, "review_assignments": false}'::jsonb,
  '{"commercial": true, "appraisal": true, "multifamily": true}'::jsonb,
  'AMC-6H.6 demo vendor. Local validation only.',
  array['amc-6h-6', 'franklin-county', 'commercial']::text[]
from owner_company
cross join vendor_company
cross join relationship
on conflict (owner_company_id, vendor_company_id) do update
  set relationship_id = excluded.relationship_id,
      vendor_status = excluded.vendor_status,
      website = excluded.website,
      primary_address = excluded.primary_address,
      public_phone = excluded.public_phone,
      default_assignment_instructions = excluded.default_assignment_instructions,
      capabilities = excluded.capabilities,
      product_eligibility = excluded.product_eligibility,
      internal_notes = excluded.internal_notes,
      tags = excluded.tags,
      updated_at = now();

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
),
vendor_company as (
  select c.id
    from public.companies c
    join seed s on s.vendor_slug = c.slug
),
profile as (
  select cvp.id
    from public.company_vendor_profiles cvp
    cross join owner_company
    cross join vendor_company
   where cvp.owner_company_id = owner_company.id
     and cvp.vendor_company_id = vendor_company.id
)
delete from public.vendor_contacts vc
using profile
where vc.vendor_profile_id = profile.id
  and coalesce(vc.notes, '') like '%AMC-6H.6 demo%';

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
),
vendor_company as (
  select c.id
    from public.companies c
    join seed s on s.vendor_slug = c.slug
),
profile as (
  select cvp.id
    from public.company_vendor_profiles cvp
    cross join owner_company
    cross join vendor_company
   where cvp.owner_company_id = owner_company.id
     and cvp.vendor_company_id = vendor_company.id
)
insert into public.vendor_contacts (
  vendor_profile_id,
  user_id,
  name,
  email,
  phone,
  role_label,
  is_primary,
  receives_assignment_notifications,
  notes
)
select
  profile.id,
  null,
  'Jordan Franklin',
  'jordan.franklin@franklincommercial.example',
  '(614) 555-0162',
  'Commercial Coordinator',
  true,
  false,
  'AMC-6H.6 demo primary contact. Does not route assignment notifications.'
from profile;

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
),
vendor_company as (
  select c.id
    from public.companies c
    join seed s on s.vendor_slug = c.slug
),
profile as (
  select cvp.id
    from public.company_vendor_profiles cvp
    cross join owner_company
    cross join vendor_company
   where cvp.owner_company_id = owner_company.id
     and cvp.vendor_company_id = vendor_company.id
)
delete from public.vendor_service_areas vsa
using profile
where vsa.vendor_profile_id = profile.id
  and vsa.state = 'OH'
  and vsa.county = 'Franklin'
  and vsa.zip = '43215'
  and vsa.product_type in ('commercial', 'appraisal');

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
),
vendor_company as (
  select c.id
    from public.companies c
    join seed s on s.vendor_slug = c.slug
),
profile as (
  select cvp.id
    from public.company_vendor_profiles cvp
    cross join owner_company
    cross join vendor_company
   where cvp.owner_company_id = owner_company.id
     and cvp.vendor_company_id = vendor_company.id
)
insert into public.vendor_service_areas (
  vendor_profile_id,
  state,
  county,
  zip,
  market,
  radius_miles,
  product_type,
  status
)
select
  profile.id,
  'OH',
  'Franklin',
  '43215',
  'Columbus Metro',
  25,
  product_type,
  'active'
from profile
cross join (
  values ('commercial'), ('appraisal')
) products(product_type);

with seed as (
  select * from amc_test_order_seed
),
owner_company as (
  select c.id
    from public.companies c
    join seed s on s.owner_slug = c.slug
)
insert into public.orders (
  company_id,
  operations_scope,
  order_number,
  manual_client,
  manual_client_name,
  property_address,
  address,
  city,
  county,
  state,
  postal_code,
  zip,
  location,
  property_type,
  report_type,
  status,
  base_fee,
  fee_amount,
  date_ordered,
  due_date,
  final_due_at,
  review_due_at,
  notes,
  created_at,
  updated_at
)
select
  owner_company.id,
  'amc_operations',
  seed.order_number,
  seed.manual_client_name,
  seed.manual_client_name,
  seed.property_address,
  seed.property_address,
  seed.city,
  seed.county,
  seed.state,
  seed.postal_code,
  seed.postal_code,
  jsonb_build_object(
    'market',
    'Columbus Metro',
    'demo_seed',
    'amc_6h_6'
  ),
  seed.property_type,
  seed.report_type,
  'new',
  1800,
  1800,
  current_date,
  current_date + 14,
  now() + interval '14 days',
  now() + interval '7 days',
  'AMC-6H.6 demo test order. Local/demo AMC Operations validation only. Do not use for production or internal-order backfill.',
  now(),
  now()
from seed
cross join owner_company
on conflict (order_number) do update
  set company_id = excluded.company_id,
      operations_scope = excluded.operations_scope,
      manual_client = excluded.manual_client,
      manual_client_name = excluded.manual_client_name,
      property_address = excluded.property_address,
      address = excluded.address,
      city = excluded.city,
      county = excluded.county,
      state = excluded.state,
      postal_code = excluded.postal_code,
      zip = excluded.zip,
      location = excluded.location,
      property_type = excluded.property_type,
      report_type = excluded.report_type,
      status = excluded.status,
      base_fee = excluded.base_fee,
      fee_amount = excluded.fee_amount,
      date_ordered = excluded.date_ordered,
      due_date = excluded.due_date,
      final_due_at = excluded.final_due_at,
      review_due_at = excluded.review_due_at,
      notes = excluded.notes,
      updated_at = now();

select
  o.order_number,
  o.operations_scope,
  o.manual_client_name,
  o.state,
  o.county,
  coalesce(o.postal_code, o.zip) as zip,
  o.property_type,
  o.report_type,
  vendor_company.name as expected_matching_vendor,
  count(vsa.id) filter (where vsa.status = 'active') as active_matching_coverage_rows
from amc_test_order_seed seed
join public.orders o
  on o.order_number = seed.order_number
join public.companies owner_company
  on owner_company.slug = seed.owner_slug
join public.companies vendor_company
  on vendor_company.slug = seed.vendor_slug
join public.company_vendor_profiles cvp
  on cvp.owner_company_id = owner_company.id
 and cvp.vendor_company_id = vendor_company.id
left join public.vendor_service_areas vsa
  on vsa.vendor_profile_id = cvp.id
 and vsa.state = seed.state
 and vsa.county = seed.county
 and vsa.zip = seed.postal_code
 and vsa.product_type in ('commercial', 'appraisal')
group by
  o.order_number,
  o.operations_scope,
  o.manual_client_name,
  o.state,
  o.county,
  coalesce(o.postal_code, o.zip),
  o.property_type,
  o.report_type,
  vendor_company.name;

commit;
