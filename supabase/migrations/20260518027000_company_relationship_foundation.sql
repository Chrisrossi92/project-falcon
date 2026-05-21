begin;

create extension if not exists "pgcrypto";

create table if not exists public.company_types (
  key text primary key,
  label text not null,
  description text null,
  default_settings jsonb not null default '{}'::jsonb,
  onboarding_defaults jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_types_key_format check (key ~ '^[a-z][a-z0-9_]*$')
);

insert into public.company_types (
  key,
  label,
  description,
  default_settings,
  onboarding_defaults,
  sort_order
) values
  (
    'staff_shop',
    'Staff Shop',
    'Internal appraisal operation with company-local staff assignment and review.',
    '{"relationship_visibility": "none"}'::jsonb,
    '{}'::jsonb,
    10
  ),
  (
    'amc',
    'AMC',
    'Appraisal management company coordinating work with internal users and approved vendors.',
    '{"relationship_visibility": "assignment_required"}'::jsonb,
    '{}'::jsonb,
    20
  ),
  (
    'vendor',
    'Vendor',
    'External vendor company that may receive assigned operational work from approved source companies.',
    '{"relationship_visibility": "assignment_required"}'::jsonb,
    '{}'::jsonb,
    30
  ),
  (
    'hybrid',
    'Hybrid',
    'Company that combines staff-shop operations with AMC/vendor coordination.',
    '{"relationship_visibility": "assignment_required"}'::jsonb,
    '{}'::jsonb,
    40
  ),
  (
    'review_firm',
    'Review Firm',
    'External or internalized review provider participating through explicit assignment.',
    '{"relationship_visibility": "assignment_required"}'::jsonb,
    '{}'::jsonb,
    50
  ),
  (
    'enterprise',
    'Enterprise',
    'Parent or enterprise operator managing multiple operating companies or programs.',
    '{"relationship_visibility": "relationship_admin_only"}'::jsonb,
    '{}'::jsonb,
    60
  )
on conflict (key) do update
  set label = excluded.label,
      description = excluded.description,
      default_settings = excluded.default_settings,
      onboarding_defaults = excluded.onboarding_defaults,
      sort_order = excluded.sort_order,
      is_active = true,
      updated_at = now();

alter table public.companies
  add column if not exists company_type text;

alter table public.companies
  add column if not exists operating_mode_settings jsonb;

alter table public.companies
  alter column company_type set default 'staff_shop';

alter table public.companies
  alter column operating_mode_settings set default '{}'::jsonb;

update public.companies
   set company_type = 'staff_shop'
 where company_type is null;

update public.companies
   set operating_mode_settings = '{}'::jsonb
 where operating_mode_settings is null;

alter table public.companies
  alter column company_type set not null;

alter table public.companies
  alter column operating_mode_settings set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'companies_company_type_fkey'
       and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_company_type_fkey
      foreign key (company_type)
      references public.company_types(key)
      on update cascade
      on delete restrict
      not valid;
  end if;
end;
$$;

create table if not exists public.company_relationship_types (
  key text primary key,
  label text not null,
  description text null,
  allowed_source_company_types text[] not null default '{}'::text[],
  allowed_target_company_types text[] not null default '{}'::text[],
  default_settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_relationship_types_key_format check (key ~ '^[a-z][a-z0-9_]*$')
);

insert into public.company_relationship_types (
  key,
  label,
  description,
  allowed_source_company_types,
  allowed_target_company_types,
  default_settings,
  sort_order
) values
  (
    'amc_vendor',
    'AMC Vendor',
    'Directional relationship from an AMC or hybrid operator to an approved vendor company.',
    array['amc', 'hybrid'],
    array['vendor', 'staff_shop'],
    '{"assignment_required_for_visibility": true}'::jsonb,
    10
  ),
  (
    'staff_overflow_vendor',
    'Staff Overflow Vendor',
    'Directional overflow relationship from a staff or hybrid operation to an approved vendor.',
    array['staff_shop', 'hybrid'],
    array['vendor', 'staff_shop'],
    '{"assignment_required_for_visibility": true}'::jsonb,
    20
  ),
  (
    'review_provider',
    'Review Provider',
    'Directional relationship for review work supplied by an external review firm or approved staff shop.',
    array['staff_shop', 'amc', 'hybrid'],
    array['review_firm', 'staff_shop'],
    '{"assignment_required_for_visibility": true}'::jsonb,
    30
  ),
  (
    'enterprise_child',
    'Enterprise Child',
    'Directional enterprise relationship from a parent operator to a child operating company.',
    array['enterprise'],
    array['staff_shop', 'amc', 'hybrid', 'vendor', 'review_firm'],
    '{"operational_visibility": "none_without_assignment"}'::jsonb,
    40
  ),
  (
    'billing_managed',
    'Billing Managed',
    'Directional billing administration relationship. Does not grant operational order visibility by itself.',
    array['enterprise', 'amc', 'hybrid'],
    array['staff_shop', 'amc', 'hybrid', 'vendor', 'review_firm'],
    '{"operational_visibility": "none_without_assignment"}'::jsonb,
    50
  ),
  (
    'support_managed',
    'Support Managed',
    'Directional support administration relationship. Does not grant operational order visibility by itself.',
    array['enterprise'],
    array['staff_shop', 'amc', 'hybrid', 'vendor', 'review_firm'],
    '{"operational_visibility": "none_without_assignment"}'::jsonb,
    60
  )
on conflict (key) do update
  set label = excluded.label,
      description = excluded.description,
      allowed_source_company_types = excluded.allowed_source_company_types,
      allowed_target_company_types = excluded.allowed_target_company_types,
      default_settings = excluded.default_settings,
      sort_order = excluded.sort_order,
      is_active = true,
      updated_at = now();

create table if not exists public.company_relationships (
  id uuid primary key default gen_random_uuid(),
  source_company_id uuid not null,
  target_company_id uuid not null,
  relationship_type text not null,
  status text not null default 'invited',
  invited_by_user_id uuid null,
  approved_by_user_id uuid null,
  suspended_by_user_id uuid null,
  archived_by_user_id uuid null,
  declined_by_user_id uuid null,
  invited_at timestamptz null,
  approved_at timestamptz null,
  suspended_at timestamptz null,
  archived_at timestamptz null,
  declined_at timestamptz null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  settings jsonb not null default '{}'::jsonb,
  compliance jsonb not null default '{}'::jsonb,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_relationships_distinct_companies check (source_company_id <> target_company_id),
  constraint company_relationships_status_valid check (status in ('invited', 'active', 'suspended', 'archived', 'declined', 'expired'))
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_source_company_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_source_company_fkey
      foreign key (source_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_target_company_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_target_company_fkey
      foreign key (target_company_id)
      references public.companies(id)
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_relationship_type_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_relationship_type_fkey
      foreign key (relationship_type)
      references public.company_relationship_types(key)
      on update cascade
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_invited_by_user_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_invited_by_user_fkey
      foreign key (invited_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_approved_by_user_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_approved_by_user_fkey
      foreign key (approved_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_suspended_by_user_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_suspended_by_user_fkey
      foreign key (suspended_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_archived_by_user_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_archived_by_user_fkey
      foreign key (archived_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'company_relationships_declined_by_user_fkey'
       and conrelid = 'public.company_relationships'::regclass
  ) then
    alter table public.company_relationships
      add constraint company_relationships_declined_by_user_fkey
      foreign key (declined_by_user_id)
      references public.users(id)
      on delete set null
      not valid;
  end if;
end;
$$;

create unique index if not exists company_relationships_current_unique
  on public.company_relationships (source_company_id, target_company_id, relationship_type)
  where status in ('invited', 'active', 'suspended');

create index if not exists idx_company_relationships_source_status
  on public.company_relationships (source_company_id, status);

create index if not exists idx_company_relationships_target_status
  on public.company_relationships (target_company_id, status);

create index if not exists idx_company_relationships_type_status
  on public.company_relationships (relationship_type, status);

create index if not exists idx_company_relationships_created_at
  on public.company_relationships (created_at desc);

create or replace function public.tg_company_relationship_foundation_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_company_types_touch_updated_at on public.company_types;
create trigger trg_company_types_touch_updated_at
before update on public.company_types
for each row execute function public.tg_company_relationship_foundation_touch_updated_at();

drop trigger if exists trg_company_relationship_types_touch_updated_at on public.company_relationship_types;
create trigger trg_company_relationship_types_touch_updated_at
before update on public.company_relationship_types
for each row execute function public.tg_company_relationship_foundation_touch_updated_at();

drop trigger if exists trg_company_relationships_touch_updated_at on public.company_relationships;
create trigger trg_company_relationships_touch_updated_at
before update on public.company_relationships
for each row execute function public.tg_company_relationship_foundation_touch_updated_at();

alter table public.company_types enable row level security;
alter table public.company_relationship_types enable row level security;
alter table public.company_relationships enable row level security;

revoke all privileges on table public.company_types from public, anon, authenticated;
revoke all privileges on table public.company_relationship_types from public, anon, authenticated;
revoke all privileges on table public.company_relationships from public, anon, authenticated;
revoke all privileges on function public.tg_company_relationship_foundation_touch_updated_at() from public, anon, authenticated;

grant all privileges on table public.company_types to service_role;
grant all privileges on table public.company_relationship_types to service_role;
grant all privileges on table public.company_relationships to service_role;
grant execute on function public.tg_company_relationship_foundation_touch_updated_at() to service_role;

comment on table public.company_types is
  'Phase 8B relationship foundation. Static operating-mode presets for company setup, labels, defaults, and product configuration. company_type must not hardcode RLS, workflow behavior, or operational visibility.';

comment on column public.company_types.key is
  'Stable lookup key. Uses lookup/config rows instead of a PostgreSQL enum so future company operating modes can be added safely.';

comment on column public.company_types.default_settings is
  'Static defaults for future setup/configuration. Not an authorization source.';

comment on column public.company_types.onboarding_defaults is
  'Future onboarding defaults for this company type. No onboarding UI reads this in Phase 8B.';

comment on column public.companies.company_type is
  'Phase 8B static operating-mode key. Defaults existing companies to staff_shop and drives future presets/labels/setup defaults only; it does not grant visibility or change workflow behavior.';

comment on column public.companies.operating_mode_settings is
  'Company-local future operating-mode settings. Not trusted for authorization and not consumed by operational RLS/workflow in Phase 8B.';

comment on table public.company_relationship_types is
  'Phase 8B relationship foundation. Static directional relationship vocabulary. Relationships enable future assignment, and assignment grants future visibility; type rows alone do not expose operational data.';

comment on column public.company_relationship_types.allowed_source_company_types is
  'Advisory source company_type list for future onboarding/validation flows. Not enforced against operational visibility in Phase 8B.';

comment on column public.company_relationship_types.allowed_target_company_types is
  'Advisory target company_type list for future onboarding/validation flows. Not enforced against operational visibility in Phase 8B.';

comment on table public.company_relationships is
  'Phase 8B relationship foundation. Directional source-company to target-company relationship records. These records do not grant order, client, activity, notification, calendar, queue, or workflow visibility until future assignment-backed authorization is implemented.';

comment on column public.company_relationships.source_company_id is
  'Directional relationship owner/source company. For example, an AMC or staff shop approving a vendor relationship.';

comment on column public.company_relationships.target_company_id is
  'Directional relationship participant/target company. For example, a vendor or review provider company.';

comment on column public.company_relationships.relationship_type is
  'Static relationship type key from company_relationship_types.';

comment on column public.company_relationships.status is
  'Relationship lifecycle status. Active/suspended/invited relationships still do not grant operational visibility without future order-company assignment records.';

comment on column public.company_relationships.settings is
  'Future relationship-specific operational settings. Not consumed by RLS or workflow in Phase 8B.';

comment on column public.company_relationships.compliance is
  'Future trust/compliance metadata for vendor approval, insurance, certification, or support checks. Not consumed by RLS or workflow in Phase 8B.';

commit;
