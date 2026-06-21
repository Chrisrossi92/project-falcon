begin;

create extension if not exists "pgcrypto";

alter table public.company_vendor_profiles
  drop constraint if exists company_vendor_profiles_status_valid;

alter table public.company_vendor_profiles
  add constraint company_vendor_profiles_status_valid
  check (vendor_status in ('active', 'inactive', 'pending', 'preferred', 'do_not_use', 'probation', 'suspended'));

create unique index if not exists company_vendor_profiles_id_vendor_company_unique
  on public.company_vendor_profiles (id, vendor_company_id);

create table if not exists public.vendor_coverage_states (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null,
  company_id uuid not null,
  state_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_coverage_states_state_code_valid
    check (state_code = upper(state_code) and state_code ~ '^[A-Z]{2}$')
);

create table if not exists public.vendor_coverage_counties (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null,
  company_id uuid not null,
  state_code text not null,
  county_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_coverage_counties_state_code_valid
    check (state_code = upper(state_code) and state_code ~ '^[A-Z]{2}$'),
  constraint vendor_coverage_counties_county_name_not_blank
    check (btrim(county_name) <> '')
);

create table if not exists public.vendor_property_types (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null,
  company_id uuid not null,
  property_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_property_types_value_valid
    check (property_type in (
      'commercial',
      'industrial',
      'retail',
      'office',
      'multifamily',
      'agricultural',
      'land',
      'residential'
    ))
);

create table if not exists public.vendor_assignment_types (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null,
  company_id uuid not null,
  assignment_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_assignment_types_value_valid
    check (assignment_type in (
      'appraisal',
      'review',
      'desktop',
      'restricted',
      'evaluation'
    ))
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'vendor_coverage_states_profile_company_fkey'
       and conrelid = 'public.vendor_coverage_states'::regclass
  ) then
    alter table public.vendor_coverage_states
      add constraint vendor_coverage_states_profile_company_fkey
      foreign key (vendor_profile_id, company_id)
      references public.company_vendor_profiles(id, vendor_company_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'vendor_coverage_counties_profile_company_fkey'
       and conrelid = 'public.vendor_coverage_counties'::regclass
  ) then
    alter table public.vendor_coverage_counties
      add constraint vendor_coverage_counties_profile_company_fkey
      foreign key (vendor_profile_id, company_id)
      references public.company_vendor_profiles(id, vendor_company_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'vendor_property_types_profile_company_fkey'
       and conrelid = 'public.vendor_property_types'::regclass
  ) then
    alter table public.vendor_property_types
      add constraint vendor_property_types_profile_company_fkey
      foreign key (vendor_profile_id, company_id)
      references public.company_vendor_profiles(id, vendor_company_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'vendor_assignment_types_profile_company_fkey'
       and conrelid = 'public.vendor_assignment_types'::regclass
  ) then
    alter table public.vendor_assignment_types
      add constraint vendor_assignment_types_profile_company_fkey
      foreign key (vendor_profile_id, company_id)
      references public.company_vendor_profiles(id, vendor_company_id)
      on delete cascade;
  end if;
end;
$$;

drop trigger if exists trg_vendor_coverage_states_touch_updated_at on public.vendor_coverage_states;
create trigger trg_vendor_coverage_states_touch_updated_at
before update on public.vendor_coverage_states
for each row execute function public.tg_amc_vendor_directory_touch_updated_at();

drop trigger if exists trg_vendor_coverage_counties_touch_updated_at on public.vendor_coverage_counties;
create trigger trg_vendor_coverage_counties_touch_updated_at
before update on public.vendor_coverage_counties
for each row execute function public.tg_amc_vendor_directory_touch_updated_at();

drop trigger if exists trg_vendor_property_types_touch_updated_at on public.vendor_property_types;
create trigger trg_vendor_property_types_touch_updated_at
before update on public.vendor_property_types
for each row execute function public.tg_amc_vendor_directory_touch_updated_at();

drop trigger if exists trg_vendor_assignment_types_touch_updated_at on public.vendor_assignment_types;
create trigger trg_vendor_assignment_types_touch_updated_at
before update on public.vendor_assignment_types
for each row execute function public.tg_amc_vendor_directory_touch_updated_at();

create unique index if not exists vendor_coverage_states_profile_state_unique
  on public.vendor_coverage_states (vendor_profile_id, state_code);

create unique index if not exists vendor_coverage_counties_profile_state_county_unique
  on public.vendor_coverage_counties (vendor_profile_id, state_code, lower(btrim(county_name)));

create unique index if not exists vendor_property_types_profile_type_unique
  on public.vendor_property_types (vendor_profile_id, property_type);

create unique index if not exists vendor_assignment_types_profile_type_unique
  on public.vendor_assignment_types (vendor_profile_id, assignment_type);

create index if not exists idx_vendor_coverage_states_company_state
  on public.vendor_coverage_states (company_id, state_code);

create index if not exists idx_vendor_coverage_counties_company_state_county
  on public.vendor_coverage_counties (company_id, state_code, lower(btrim(county_name)));

create index if not exists idx_vendor_property_types_company_type
  on public.vendor_property_types (company_id, property_type);

create index if not exists idx_vendor_assignment_types_company_type
  on public.vendor_assignment_types (company_id, assignment_type);

alter table public.vendor_coverage_states enable row level security;
alter table public.vendor_coverage_counties enable row level security;
alter table public.vendor_property_types enable row level security;
alter table public.vendor_assignment_types enable row level security;

revoke all privileges on table public.vendor_coverage_states from public, anon, authenticated;
revoke all privileges on table public.vendor_coverage_counties from public, anon, authenticated;
revoke all privileges on table public.vendor_property_types from public, anon, authenticated;
revoke all privileges on table public.vendor_assignment_types from public, anon, authenticated;

grant all privileges on table public.vendor_coverage_states to service_role;
grant all privileges on table public.vendor_coverage_counties to service_role;
grant all privileges on table public.vendor_property_types to service_role;
grant all privileges on table public.vendor_assignment_types to service_role;

comment on table public.vendor_coverage_states is
  'Vendor Coverage Engine V1A normalized statewide coverage. Additive data foundation only; no matching, recommendation UI, bid automation, or assignment behavior.';

comment on table public.vendor_coverage_counties is
  'Vendor Coverage Engine V1A normalized county coverage. Additive data foundation only; no matching, recommendation UI, bid automation, or assignment behavior.';

comment on table public.vendor_property_types is
  'Vendor Coverage Engine V1A normalized property-type eligibility. Additive data foundation only; no matching, recommendation UI, bid automation, or assignment behavior.';

comment on table public.vendor_assignment_types is
  'Vendor Coverage Engine V1A normalized assignment-type eligibility. Additive data foundation only; no matching, recommendation UI, bid automation, or assignment behavior.';

comment on column public.vendor_coverage_states.company_id is
  'Vendor company id. The composite FK requires this value to match company_vendor_profiles.vendor_company_id for the linked vendor_profile_id.';

comment on column public.vendor_coverage_counties.company_id is
  'Vendor company id. The composite FK requires this value to match company_vendor_profiles.vendor_company_id for the linked vendor_profile_id.';

comment on column public.vendor_property_types.company_id is
  'Vendor company id. The composite FK requires this value to match company_vendor_profiles.vendor_company_id for the linked vendor_profile_id.';

comment on column public.vendor_assignment_types.company_id is
  'Vendor company id. The composite FK requires this value to match company_vendor_profiles.vendor_company_id for the linked vendor_profile_id.';

comment on constraint company_vendor_profiles_status_valid on public.company_vendor_profiles is
  'Vendor Coverage Engine V1A allows suspended vendor profile status for future eligibility decisions. Status alone does not authorize or assign work.';

commit;
