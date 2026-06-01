-- AMC-2P local/demo Vendor Directory seed data.
--
-- Purpose:
--   Add deterministic demo vendor records for visual validation of the
--   read-only Vendor Directory and Vendor Profile pages.
--
-- Scope:
--   - Intended for local/dev/demo databases only.
--   - Uses the existing falcon_default company as the owner company.
--   - Creates vendor companies, amc_vendor relationships, vendor profiles,
--     primary contacts, and service-area rows.
--   - Does not create orders, assignment packets, users, roles, permissions,
--     RPCs, UI, or /amc routes.
--
-- Run locally after migrations have been applied:
--   psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -f supabase/manual/20260601_amc_vendor_demo_seed.sql
--
-- Run from a service-role/admin SQL session. Normal app RLS blocks direct
-- table writes by design.

begin;

do $$
begin
  if to_regclass('public.company_relationships') is null
     or to_regclass('public.company_vendor_profiles') is null
     or to_regclass('public.vendor_contacts') is null
     or to_regclass('public.vendor_service_areas') is null then
    raise exception 'AMC vendor directory tables are required before loading AMC vendor demo seed data. Apply migrations through AMC-2F first.';
  end if;

  if not exists (
    select 1
      from public.companies
     where slug = 'falcon_default'
  ) then
    raise exception 'falcon_default company is required before loading AMC vendor demo seed data';
  end if;
end;
$$;

drop table if exists pg_temp.amc_vendor_demo_seed;

create temp table amc_vendor_demo_seed (
  vendor_slug text primary key,
  vendor_name text not null,
  vendor_status text not null,
  relationship_status text not null,
  website text not null,
  public_phone text not null,
  primary_address jsonb not null,
  default_assignment_instructions text not null,
  capabilities jsonb not null,
  product_eligibility jsonb not null,
  internal_notes text not null,
  tags text[] not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  contact_role text not null
) on commit drop;

insert into amc_vendor_demo_seed (
  vendor_slug,
  vendor_name,
  vendor_status,
  relationship_status,
  website,
  public_phone,
  primary_address,
  default_assignment_instructions,
  capabilities,
  product_eligibility,
  internal_notes,
  tags,
  contact_name,
  contact_email,
  contact_phone,
  contact_role
) values
  (
    'amc-demo-abc-valuation',
    'ABC Valuation',
    'preferred',
    'active',
    'https://abcvaluation.example',
    '(614) 555-0101',
    '{"city": "Columbus", "state": "OH", "line1": "100 Market Street", "postal_code": "43215"}'::jsonb,
    'Preferred first call for central Ohio residential and small commercial coverage.',
    '{"rush_available": true, "complex_commercial": false, "review_support": false}'::jsonb,
    '{"residential": true, "commercial": true, "multifamily": true, "industrial": false, "review": false}'::jsonb,
    'AMC-2P demo vendor. Local visual validation only.',
    array['central-ohio', 'preferred', 'residential', 'commercial']::text[],
    'Amanda Pierce',
    'amanda.pierce@abcvaluation.example',
    '(614) 555-0102',
    'Primary Coordinator'
  ),
  (
    'amc-demo-columbus-valuation-group',
    'Columbus Valuation Group',
    'active',
    'active',
    'https://columbusvaluation.example',
    '(614) 555-0111',
    '{"city": "Dublin", "state": "OH", "line1": "220 Metro Place", "postal_code": "43017"}'::jsonb,
    'Use for balanced residential and multifamily coverage around the Columbus metro.',
    '{"rush_available": false, "complex_commercial": false, "review_support": false}'::jsonb,
    '{"residential": true, "commercial": false, "multifamily": true, "industrial": false, "review": false}'::jsonb,
    'AMC-2P demo vendor. Local visual validation only.',
    array['columbus-metro', 'multifamily', 'residential']::text[],
    'Marcus Bell',
    'marcus.bell@columbusvaluation.example',
    '(614) 555-0112',
    'Operations Lead'
  ),
  (
    'amc-demo-midwest-commercial-appraisal',
    'Midwest Commercial Appraisal',
    'active',
    'active',
    'https://midwestcommercial.example',
    '(216) 555-0121',
    '{"city": "Cleveland", "state": "OH", "line1": "55 Public Square", "postal_code": "44113"}'::jsonb,
    'Use for commercial, industrial, and income-producing property assignments.',
    '{"rush_available": false, "complex_commercial": true, "review_support": true}'::jsonb,
    '{"residential": false, "commercial": true, "multifamily": true, "industrial": true, "review": true}'::jsonb,
    'AMC-2P demo vendor. Local visual validation only.',
    array['commercial', 'industrial', 'northeast-ohio']::text[],
    'Nina Patel',
    'nina.patel@midwestcommercial.example',
    '(216) 555-0122',
    'Commercial Desk'
  ),
  (
    'amc-demo-buckeye-valuation-partners',
    'Buckeye Valuation Partners',
    'probation',
    'active',
    'https://buckeyevaluation.example',
    '(330) 555-0131',
    '{"city": "Akron", "state": "OH", "line1": "18 Summit Avenue", "postal_code": "44308"}'::jsonb,
    'Use selectively while turn-time review is in progress.',
    '{"rush_available": false, "complex_commercial": false, "review_support": false}'::jsonb,
    '{"residential": true, "commercial": false, "multifamily": true, "industrial": false, "review": false}'::jsonb,
    'AMC-2P demo vendor on probation status for visual validation.',
    array['probation', 'akron', 'residential']::text[],
    'Leo Granger',
    'leo.granger@buckeyevaluation.example',
    '(330) 555-0132',
    'Vendor Manager'
  ),
  (
    'amc-demo-cleveland-review-services',
    'Cleveland Review Services',
    'do_not_use',
    'suspended',
    'https://clevelandreview.example',
    '(216) 555-0141',
    '{"city": "Cleveland", "state": "OH", "line1": "301 Lakeside Avenue", "postal_code": "44114"}'::jsonb,
    'Do not route new work. Kept in directory to validate suspended/do-not-use display states.',
    '{"rush_available": false, "complex_commercial": true, "review_support": true}'::jsonb,
    '{"residential": false, "commercial": true, "multifamily": false, "industrial": false, "review": true}'::jsonb,
    'AMC-2P demo vendor intentionally marked do_not_use.',
    array['do-not-use', 'review', 'cleveland']::text[],
    'Erin Walsh',
    'erin.walsh@clevelandreview.example',
    '(216) 555-0142',
    'Review Contact'
  );

drop table if exists pg_temp.amc_vendor_demo_service_areas;

create temp table amc_vendor_demo_service_areas (
  vendor_slug text not null,
  state text not null,
  county text null,
  zip text null,
  market text null,
  radius_miles numeric null,
  product_type text null,
  status text not null default 'active'
) on commit drop;

insert into amc_vendor_demo_service_areas (
  vendor_slug,
  state,
  county,
  zip,
  market,
  radius_miles,
  product_type,
  status
) values
  ('amc-demo-abc-valuation', 'OH', 'Franklin', '43215', 'Columbus Metro', 35, 'residential', 'active'),
  ('amc-demo-abc-valuation', 'OH', 'Delaware', null, 'Columbus North', 40, 'commercial', 'active'),
  ('amc-demo-columbus-valuation-group', 'OH', 'Franklin', '43219', 'Columbus Metro', 30, 'residential', 'active'),
  ('amc-demo-columbus-valuation-group', 'OH', 'Union', null, 'Columbus Northwest', 35, 'multifamily', 'active'),
  ('amc-demo-columbus-valuation-group', 'OH', 'Licking', null, 'Columbus East', 35, 'residential', 'active'),
  ('amc-demo-midwest-commercial-appraisal', 'OH', 'Cuyahoga', '44113', 'Cleveland Metro', 50, 'commercial', 'active'),
  ('amc-demo-midwest-commercial-appraisal', 'OH', 'Franklin', null, 'Columbus Metro', 75, 'industrial', 'active'),
  ('amc-demo-midwest-commercial-appraisal', 'OH', 'Summit', null, 'Akron-Canton', 45, 'multifamily', 'active'),
  ('amc-demo-buckeye-valuation-partners', 'OH', 'Summit', '44308', 'Akron-Canton', 30, 'residential', 'active'),
  ('amc-demo-buckeye-valuation-partners', 'OH', 'Portage', null, 'Akron East', 35, 'multifamily', 'active'),
  ('amc-demo-cleveland-review-services', 'OH', 'Cuyahoga', '44114', 'Cleveland Metro', 25, 'review', 'active'),
  ('amc-demo-cleveland-review-services', 'OH', 'Lake', null, 'Cleveland East', 30, 'commercial', 'inactive');

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
  '{"demo_seed": "amc_2p"}'::jsonb,
  'vendor',
  '{}'::jsonb
from amc_vendor_demo_seed s
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      timezone = excluded.timezone,
      locale = excluded.locale,
      settings = public.companies.settings || excluded.settings,
      company_type = excluded.company_type,
      updated_at = now();

with owner_company as (
  select id
    from public.companies
   where slug = 'falcon_default'
),
missing_relationships as (
  select
    owner_company.id as owner_company_id,
    vendor_company.id as vendor_company_id,
    s.relationship_status,
    s.vendor_name
  from amc_vendor_demo_seed s
  cross join owner_company
  join public.companies vendor_company
    on vendor_company.slug = s.vendor_slug
  where not exists (
    select 1
      from public.company_relationships cr
     where cr.source_company_id = owner_company.id
       and cr.target_company_id = vendor_company.id
       and cr.relationship_type = 'amc_vendor'
       and cr.status in ('invited', 'active', 'suspended')
  )
)
insert into public.company_relationships (
  source_company_id,
  target_company_id,
  relationship_type,
  status,
  invited_at,
  approved_at,
  suspended_at,
  settings,
  compliance,
  notes
)
select
  mr.owner_company_id,
  mr.vendor_company_id,
  'amc_vendor',
  mr.relationship_status,
  now(),
  case when mr.relationship_status = 'active' then now() else null end,
  case when mr.relationship_status = 'suspended' then now() else null end,
  '{"demo_seed": "amc_2p", "assignment_required_for_visibility": true}'::jsonb,
  '{"summary": "Demo compliance summary only", "demo_seed": "amc_2p"}'::jsonb,
  'AMC-2P demo AMC/vendor relationship for local visual validation: ' || mr.vendor_name
from missing_relationships mr;

with owner_company as (
  select id
    from public.companies
   where slug = 'falcon_default'
)
update public.company_relationships cr
   set status = s.relationship_status,
       approved_at = case
         when s.relationship_status = 'active' then coalesce(cr.approved_at, now())
         else cr.approved_at
       end,
       suspended_at = case
         when s.relationship_status = 'suspended' then coalesce(cr.suspended_at, now())
         else cr.suspended_at
       end,
       settings = cr.settings || '{"demo_seed": "amc_2p", "assignment_required_for_visibility": true}'::jsonb,
       compliance = cr.compliance || '{"summary": "Demo compliance summary only", "demo_seed": "amc_2p"}'::jsonb,
       notes = 'AMC-2P demo AMC/vendor relationship for local visual validation: ' || s.vendor_name,
       updated_at = now()
  from amc_vendor_demo_seed s
  cross join owner_company
  join public.companies vendor_company
    on vendor_company.slug = s.vendor_slug
 where cr.source_company_id = owner_company.id
   and cr.target_company_id = vendor_company.id
   and cr.relationship_type = 'amc_vendor'
   and cr.status in ('invited', 'active', 'suspended');

with owner_company as (
  select id
    from public.companies
   where slug = 'falcon_default'
),
profile_rows as (
  select
    owner_company.id as owner_company_id,
    vendor_company.id as vendor_company_id,
    cr.id as relationship_id,
    s.vendor_status,
    s.website,
    s.primary_address,
    s.public_phone,
    s.default_assignment_instructions,
    s.capabilities,
    s.product_eligibility,
    s.internal_notes,
    s.tags
  from amc_vendor_demo_seed s
  cross join owner_company
  join public.companies vendor_company
    on vendor_company.slug = s.vendor_slug
  left join lateral (
    select cr_current.id
      from public.company_relationships cr_current
     where cr_current.source_company_id = owner_company.id
       and cr_current.target_company_id = vendor_company.id
       and cr_current.relationship_type = 'amc_vendor'
       and cr_current.status in ('invited', 'active', 'suspended')
     order by cr_current.updated_at desc nulls last, cr_current.created_at desc nulls last
     limit 1
  ) cr on true
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
from profile_rows
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

delete from public.vendor_contacts vc
using public.company_vendor_profiles cvp,
      public.companies owner_company,
      public.companies vendor_company,
      amc_vendor_demo_seed s
where vc.vendor_profile_id = cvp.id
  and cvp.owner_company_id = owner_company.id
  and cvp.vendor_company_id = vendor_company.id
  and owner_company.slug = 'falcon_default'
  and vendor_company.slug = s.vendor_slug;

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
  cvp.id,
  null,
  s.contact_name,
  s.contact_email,
  s.contact_phone,
  s.contact_role,
  true,
  false,
  'AMC-2P demo primary contact. Does not route assignment notifications.'
from amc_vendor_demo_seed s
join public.companies vendor_company
  on vendor_company.slug = s.vendor_slug
join public.companies owner_company
  on owner_company.slug = 'falcon_default'
join public.company_vendor_profiles cvp
  on cvp.owner_company_id = owner_company.id
 and cvp.vendor_company_id = vendor_company.id;

delete from public.vendor_service_areas vsa
using public.company_vendor_profiles cvp,
      public.companies owner_company,
      public.companies vendor_company,
      amc_vendor_demo_seed s
where vsa.vendor_profile_id = cvp.id
  and cvp.owner_company_id = owner_company.id
  and cvp.vendor_company_id = vendor_company.id
  and owner_company.slug = 'falcon_default'
  and vendor_company.slug = s.vendor_slug;

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
  cvp.id,
  sa.state,
  sa.county,
  sa.zip,
  sa.market,
  sa.radius_miles,
  sa.product_type,
  sa.status
from amc_vendor_demo_service_areas sa
join public.companies vendor_company
  on vendor_company.slug = sa.vendor_slug
join public.companies owner_company
  on owner_company.slug = 'falcon_default'
join public.company_vendor_profiles cvp
  on cvp.owner_company_id = owner_company.id
 and cvp.vendor_company_id = vendor_company.id;

select
  s.vendor_name,
  cvp.vendor_status,
  cr.status as relationship_status,
  vc.name as primary_contact,
  count(vsa.id) as service_area_rows
from amc_vendor_demo_seed s
join public.companies vendor_company
  on vendor_company.slug = s.vendor_slug
join public.companies owner_company
  on owner_company.slug = 'falcon_default'
join public.company_vendor_profiles cvp
  on cvp.owner_company_id = owner_company.id
 and cvp.vendor_company_id = vendor_company.id
left join public.company_relationships cr
  on cr.id = cvp.relationship_id
left join public.vendor_contacts vc
  on vc.vendor_profile_id = cvp.id
 and vc.is_primary is true
left join public.vendor_service_areas vsa
  on vsa.vendor_profile_id = cvp.id
group by s.vendor_name, cvp.vendor_status, cr.status, vc.name
order by s.vendor_name;

commit;
