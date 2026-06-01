begin;

create extension if not exists "pgcrypto";

create table if not exists public.company_vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_company_id uuid not null,
  vendor_company_id uuid not null,
  relationship_id uuid null,
  vendor_status text not null default 'active',
  website text null,
  primary_address jsonb not null default '{}'::jsonb,
  public_phone text null,
  default_assignment_instructions text null,
  capabilities jsonb not null default '{}'::jsonb,
  product_eligibility jsonb not null default '{}'::jsonb,
  internal_notes text null,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_vendor_profiles_distinct_companies
    check (owner_company_id <> vendor_company_id),
  constraint company_vendor_profiles_status_valid
    check (vendor_status in ('active', 'inactive', 'pending', 'preferred', 'do_not_use', 'probation')),
  constraint company_vendor_profiles_primary_address_object
    check (jsonb_typeof(primary_address) = 'object'),
  constraint company_vendor_profiles_capabilities_object
    check (jsonb_typeof(capabilities) = 'object'),
  constraint company_vendor_profiles_product_eligibility_object
    check (jsonb_typeof(product_eligibility) = 'object')
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_vendor_profiles_owner_company_fkey'
       and conrelid = 'public.company_vendor_profiles'::regclass
  ) then
    alter table public.company_vendor_profiles
      add constraint company_vendor_profiles_owner_company_fkey
      foreign key (owner_company_id)
      references public.companies(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_vendor_profiles_vendor_company_fkey'
       and conrelid = 'public.company_vendor_profiles'::regclass
  ) then
    alter table public.company_vendor_profiles
      add constraint company_vendor_profiles_vendor_company_fkey
      foreign key (vendor_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_vendor_profiles_relationship_fkey'
       and conrelid = 'public.company_vendor_profiles'::regclass
  ) then
    alter table public.company_vendor_profiles
      add constraint company_vendor_profiles_relationship_fkey
      foreign key (relationship_id)
      references public.company_relationships(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create table if not exists public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null,
  user_id uuid null,
  name text not null,
  email text null,
  phone text null,
  role_label text null,
  is_primary boolean not null default false,
  receives_assignment_notifications boolean not null default false,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_contacts_name_not_blank
    check (btrim(name) <> '')
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'vendor_contacts_vendor_profile_fkey'
       and conrelid = 'public.vendor_contacts'::regclass
  ) then
    alter table public.vendor_contacts
      add constraint vendor_contacts_vendor_profile_fkey
      foreign key (vendor_profile_id)
      references public.company_vendor_profiles(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'vendor_contacts_user_fkey'
       and conrelid = 'public.vendor_contacts'::regclass
  ) then
    alter table public.vendor_contacts
      add constraint vendor_contacts_user_fkey
      foreign key (user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create table if not exists public.vendor_service_areas (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null,
  state text null,
  county text null,
  zip text null,
  market text null,
  radius_miles numeric null,
  product_type text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_service_areas_status_valid
    check (status in ('active', 'inactive')),
  constraint vendor_service_areas_radius_non_negative
    check (radius_miles is null or radius_miles >= 0)
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'vendor_service_areas_vendor_profile_fkey'
       and conrelid = 'public.vendor_service_areas'::regclass
  ) then
    alter table public.vendor_service_areas
      add constraint vendor_service_areas_vendor_profile_fkey
      foreign key (vendor_profile_id)
      references public.company_vendor_profiles(id)
      on delete cascade
      not valid;
  end if;
end;
$$;

create or replace function public.tg_amc_vendor_directory_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_company_vendor_profiles_touch_updated_at on public.company_vendor_profiles;
create trigger trg_company_vendor_profiles_touch_updated_at
before update on public.company_vendor_profiles
for each row execute function public.tg_amc_vendor_directory_touch_updated_at();

drop trigger if exists trg_vendor_contacts_touch_updated_at on public.vendor_contacts;
create trigger trg_vendor_contacts_touch_updated_at
before update on public.vendor_contacts
for each row execute function public.tg_amc_vendor_directory_touch_updated_at();

drop trigger if exists trg_vendor_service_areas_touch_updated_at on public.vendor_service_areas;
create trigger trg_vendor_service_areas_touch_updated_at
before update on public.vendor_service_areas
for each row execute function public.tg_amc_vendor_directory_touch_updated_at();

create unique index if not exists company_vendor_profiles_owner_vendor_unique
  on public.company_vendor_profiles (owner_company_id, vendor_company_id);

create unique index if not exists company_vendor_profiles_relationship_unique
  on public.company_vendor_profiles (relationship_id)
  where relationship_id is not null;

create index if not exists idx_company_vendor_profiles_owner_status
  on public.company_vendor_profiles (owner_company_id, vendor_status);

create index if not exists idx_company_vendor_profiles_vendor_company
  on public.company_vendor_profiles (vendor_company_id);

create index if not exists idx_company_vendor_profiles_relationship
  on public.company_vendor_profiles (relationship_id);

create index if not exists idx_company_vendor_profiles_tags
  on public.company_vendor_profiles using gin (tags);

create index if not exists idx_vendor_contacts_profile
  on public.vendor_contacts (vendor_profile_id);

create index if not exists idx_vendor_contacts_user
  on public.vendor_contacts (user_id)
  where user_id is not null;

create unique index if not exists vendor_contacts_one_primary_per_profile
  on public.vendor_contacts (vendor_profile_id)
  where is_primary;

create index if not exists idx_vendor_contacts_assignment_notifications
  on public.vendor_contacts (vendor_profile_id, receives_assignment_notifications);

create index if not exists idx_vendor_service_areas_profile
  on public.vendor_service_areas (vendor_profile_id);

create index if not exists idx_vendor_service_areas_state_county
  on public.vendor_service_areas (state, county)
  where status = 'active';

create index if not exists idx_vendor_service_areas_zip
  on public.vendor_service_areas (zip)
  where status = 'active';

create index if not exists idx_vendor_service_areas_product
  on public.vendor_service_areas (product_type)
  where status = 'active';

alter table public.company_vendor_profiles enable row level security;
alter table public.vendor_contacts enable row level security;
alter table public.vendor_service_areas enable row level security;

revoke all privileges on table public.company_vendor_profiles from public, anon, authenticated;
revoke all privileges on table public.vendor_contacts from public, anon, authenticated;
revoke all privileges on table public.vendor_service_areas from public, anon, authenticated;
revoke all privileges on function public.tg_amc_vendor_directory_touch_updated_at() from public, anon, authenticated;

grant all privileges on table public.company_vendor_profiles to service_role;
grant all privileges on table public.vendor_contacts to service_role;
grant all privileges on table public.vendor_service_areas to service_role;
grant execute on function public.tg_amc_vendor_directory_touch_updated_at() to service_role;

comment on table public.company_vendor_profiles is
  'AMC-2F additive Vendor Directory profile metadata. Vendors remain company-backed through companies, relationship-aware through company_relationships, and assignment-packet-compatible through order_company_assignments. This table does not authorize access.';

comment on column public.company_vendor_profiles.owner_company_id is
  'Company managing this vendor directory entry. Runtime authorization must be enforced by future RPCs, permissions, membership checks, and RLS posture; operations mode and company_type are not authorization.';

comment on column public.company_vendor_profiles.vendor_company_id is
  'Vendor company identity. Canonical company facts remain owned by public.companies.';

comment on column public.company_vendor_profiles.relationship_id is
  'Optional company_relationships link for staged vendor intake. Normal assignment eligibility still requires an active amc_vendor relationship and an order_company_assignments packet.';

comment on column public.company_vendor_profiles.vendor_status is
  'Profile-scoped Vendor Directory status for MVP. Relationship lifecycle remains owned by company_relationships.status.';

comment on column public.company_vendor_profiles.default_assignment_instructions is
  'General vendor-directory instructions. Assignment-specific instructions and terms remain owned by order_company_assignments.';

comment on table public.vendor_contacts is
  'AMC-2F additive Vendor Directory contacts. Contacts may link to users, but authenticated vendor users should belong to vendor companies through company_memberships. This table does not route assignment notifications by itself.';

comment on column public.vendor_contacts.receives_assignment_notifications is
  'Future preference hint only. AMC-2F does not send assignment notifications to vendor_contacts; assignment notification fanout remains RPC/permission owned.';

comment on table public.vendor_service_areas is
  'AMC-2F additive searchable vendor coverage rows. Assignment decisions remain future RPC behavior and vendor assignment remains in order_company_assignments.';

comment on function public.tg_amc_vendor_directory_touch_updated_at() is
  'AMC-2F shared updated_at trigger for Vendor Directory foundation tables.';

commit;
