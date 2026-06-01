# AMC Vendor Schema Proposal

## Purpose

This document defines the lean schema foundation for AMC Vendor Directory support. The schema foundation has been implemented additively; later RPC/UI/permission sections remain planning guidance unless marked complete.

The proposal follows `AMC_VENDOR_ERD_AND_OWNERSHIP_MODEL.md`: vendors are company-backed, relationship-aware, and assignment-packet-compatible.

## AMC-2F Implementation Status

AMC-2F implements the lean additive schema foundation proposed here:

- `company_vendor_profiles`
- `vendor_contacts`
- `vendor_service_areas`

The implementation is schema foundation only. It does not add vendor RPCs, permissions, role grants, runtime code, UI, navigation, route exposure, assignment behavior, order behavior, or `/amc/*` routes.

## AMC-2L Closeout Status

AMC-2L does not change the schema. The read-only Vendor Directory foundation remains hidden and non-mutating; vendor permissions, vendor roles, assignment candidate RPCs, mutation RPCs, navigation exposure, assignment behavior, order behavior, and `/amc/*` routes remain deferred.

## Guardrails

- Vendors are primarily companies.
- Vendor users are members or contacts of vendor companies.
- Vendor assignment uses assignment records.
- `order_company_assignments` remains the canonical vendor assignment table unless a later approved audit proves it insufficient.
- Vendor assignment must not write to `orders.appraiser_id`, `orders.reviewer_id`, or `orders.assigned_to`.
- `company_type`, product mode, and operations mode are not authorization.
- Do not create `/amc/*` route forks.
- Do not expose framework-native `/relationships` or `/assignments` as the polished Vendor Directory or Assignment Queue without a wrapper UX.

## Explicit Reuse

Vendor Directory should reuse these existing foundations:

- `companies`: canonical company identity and vendor company record.
- `company_relationships`: directional AMC-to-vendor relationship lifecycle.
- `company_relationship_types`: `amc_vendor` vocabulary and source/target company-type compatibility.
- `company_memberships`: authenticated vendor users belonging to vendor companies.
- `users` and `user_profiles`: app user identity/profile data for linked contacts.
- `user_role_assignments`: future vendor-company permission assignment.
- `order_company_assignments`: canonical assignment packet for vendor work.
- `order_company_assignment_activity`: packet-scoped assignment history.

## Proposed DDL

The following DDL is illustrative. It must be reviewed before any migration is created.

### `company_vendor_profiles`

```sql
create table public.company_vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  vendor_company_id uuid not null references public.companies(id) on delete restrict,
  relationship_id uuid null references public.company_relationships(id) on delete set null,
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
    check (vendor_status in ('active', 'inactive', 'pending', 'preferred', 'do_not_use', 'probation'))
);
```

Notes:

- `owner_company_id` is the AMC/staff/hybrid company managing the directory entry.
- `vendor_company_id` is the vendor company.
- `relationship_id` should normally point to an `amc_vendor` relationship, but should remain nullable for staged vendor intake if product-approved.
- Canonical company identity remains in `companies`.
- Assignment state and assignment fees remain out of this table.

### `vendor_contacts`

```sql
create table public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.company_vendor_profiles(id) on delete cascade,
  user_id uuid null references public.users(id) on delete set null,
  name text not null,
  email text null,
  phone text null,
  role_label text null,
  is_primary boolean not null default false,
  receives_assignment_notifications boolean not null default false,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:

- `user_id` is nullable so Vendor Directory can support non-portal contacts.
- Authenticated vendor users should still belong to the vendor company through `company_memberships`.
- Notification behavior should not be implemented by this table alone; assignment notification fanout must remain permission/RPC-owned.

### `vendor_service_areas`

```sql
create table public.vendor_service_areas (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.company_vendor_profiles(id) on delete cascade,
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
    check (status in ('active', 'inactive'))
);
```

Notes:

- Coverage should be queryable; do not hide MVP coverage matching in opaque JSON.
- Product-specific coverage should be allowed without requiring a full rules engine.
- Performance, assignment decisions, relationship lifecycle, and compliance documents do not belong here.

## Recommended Indexes

### `company_vendor_profiles`

```sql
create unique index company_vendor_profiles_owner_vendor_unique
  on public.company_vendor_profiles (owner_company_id, vendor_company_id);

create index idx_company_vendor_profiles_owner_status
  on public.company_vendor_profiles (owner_company_id, vendor_status);

create index idx_company_vendor_profiles_vendor_company
  on public.company_vendor_profiles (vendor_company_id);

create index idx_company_vendor_profiles_relationship
  on public.company_vendor_profiles (relationship_id);

create index idx_company_vendor_profiles_tags
  on public.company_vendor_profiles using gin (tags);
```

### `vendor_contacts`

```sql
create index idx_vendor_contacts_profile
  on public.vendor_contacts (vendor_profile_id);

create index idx_vendor_contacts_user
  on public.vendor_contacts (user_id)
  where user_id is not null;

create unique index vendor_contacts_one_primary_per_profile
  on public.vendor_contacts (vendor_profile_id)
  where is_primary;

create index idx_vendor_contacts_assignment_notifications
  on public.vendor_contacts (vendor_profile_id, receives_assignment_notifications);
```

### `vendor_service_areas`

```sql
create index idx_vendor_service_areas_profile
  on public.vendor_service_areas (vendor_profile_id);

create index idx_vendor_service_areas_state_county
  on public.vendor_service_areas (state, county)
  where status = 'active';

create index idx_vendor_service_areas_zip
  on public.vendor_service_areas (zip)
  where status = 'active';

create index idx_vendor_service_areas_product
  on public.vendor_service_areas (product_type)
  where status = 'active';
```

## Proposed RLS Strategy

Use RPC-first access for MVP. Avoid direct app-role table access until read/write semantics are fully tested.

Recommended table posture:

- Enable RLS on all three tables.
- Revoke direct table access from `anon` and `authenticated`.
- Grant table access only to `service_role`.
- Expose reads and writes through security-definer RPCs that validate current company membership and permissions.

Read rules should be based on:

- current user has active membership in `owner_company_id`, and
- current user has a future vendor read permission, or
- current user has assignment-scoped access through `order_company_assignments` only where a packet-specific read model is explicitly designed.

Write rules should be based on:

- current user has active membership in `owner_company_id`, and
- current user has future vendor create/update/manage permissions, and
- relationship references, when supplied, match `owner_company_id -> vendor_company_id`.

Relationship validation should ensure:

- `company_relationships.source_company_id = owner_company_id`
- `company_relationships.target_company_id = vendor_company_id`
- `company_relationships.relationship_type = 'amc_vendor'`
- active relationship is required for normal assignment eligibility, but not necessarily for staged directory intake if approved.

Do not authorize by:

- operations mode
- product mode
- `companies.company_type`
- client-side route visibility
- relationship metadata alone

## Proposed RPC / Read Model Strategy

### Read RPCs

Suggested read RPCs:

- `rpc_vendor_directory_list(p_status text default null, p_query text default null)`
- `rpc_vendor_profile_detail(p_vendor_profile_id uuid)`
- `rpc_vendor_profile_service_areas(p_vendor_profile_id uuid)`
- `rpc_vendor_profile_contacts(p_vendor_profile_id uuid)`
- `rpc_vendor_assignment_candidates(p_order_id uuid)`

`rpc_vendor_directory_list` should return a flattened read model:

- vendor profile id
- vendor company id
- vendor company name
- vendor status
- relationship id
- relationship status
- relationship type
- primary contact summary
- service area summary
- product eligibility summary
- tags
- last updated

`rpc_vendor_assignment_candidates` should be separate from the directory list. It can later apply order geography, product type, relationship status, vendor status, and service-area filters without overloading the general directory view.

### Mutation RPCs

Suggested mutation RPCs:

- `rpc_vendor_profile_create(p_payload jsonb)`
- `rpc_vendor_profile_update(p_vendor_profile_id uuid, p_patch jsonb)`
- `rpc_vendor_contact_create(p_vendor_profile_id uuid, p_payload jsonb)`
- `rpc_vendor_contact_update(p_contact_id uuid, p_patch jsonb)`
- `rpc_vendor_service_area_create(p_vendor_profile_id uuid, p_payload jsonb)`
- `rpc_vendor_service_area_update(p_service_area_id uuid, p_patch jsonb)`

Mutation RPCs should:

- validate current company membership
- validate future vendor permissions
- use explicit allowlists
- reject assignment fields
- reject canonical company identity changes unless the RPC is explicitly designed for company profile updates
- validate relationship/company consistency
- update `updated_at`
- eventually write audit/activity where product-approved

## Proposed Permissions

Future permissions should be explicit and separate from relationship and assignment packet permissions:

- `vendors.read`
- `vendors.create`
- `vendors.update`
- `vendors.archive`
- `vendors.contacts.manage`
- `vendors.service_areas.manage`
- `vendors.compliance.manage`
- `vendors.financial_terms.view`
- `vendors.financial_terms.manage`
- `vendors.assign`
- `vendors.performance.view`

Relationship and assignment permissions still remain relevant:

- `relationships.read`
- `relationships.invite`
- `relationships.approve`
- `relationships.suspend`
- `relationships.archive`
- `relationships.assign_work`
- `order_company_assignments.read_owner`
- `order_company_assignments.read_assigned`
- `order_company_assignments.offer`
- `order_company_assignments.respond`
- `order_company_assignments.progress`
- `order_company_assignments.complete`
- `order_company_assignments.cancel`
- `order_company_assignments.revoke`

MVP can start with a narrow subset:

- `vendors.read`
- `vendors.create`
- `vendors.update`
- `vendors.contacts.manage`
- `vendors.service_areas.manage`
- `vendors.assign`

Do not use vendor permissions to grant canonical order, client, activity, or assignment packet access. Those remain controlled by existing order/client/activity/assignment permissions and backend predicates.

## Migration Strategy

Before any migration is created:

1. Review this proposal and approve final table names.
2. Confirm whether staged vendor profiles without `relationship_id` are allowed.
3. Confirm whether `website`, `primary_address`, and `public_phone` belong in `companies` or `company_vendor_profiles` for MVP.
4. Confirm whether `vendor_status` should be a text check constraint or lookup table.
5. Confirm whether one vendor profile per owner/vendor pair is sufficient for MVP.
6. Confirm if initial write RPCs should include archive/deactivate or defer lifecycle.

If approved, migration should be a narrow additive migration:

- create three tables
- add check constraints
- add indexes
- enable RLS
- revoke app-role direct table access
- grant service-role table access
- add comments documenting non-authorization semantics
- do not grant roles or permissions to users yet unless separately approved

No existing table should be rewritten in the first migration.

## Test Strategy

Database-level tests should cover:

- table existence
- required constraints
- foreign keys
- owner/vendor uniqueness
- primary contact uniqueness
- RLS enabled
- direct app-role access blocked
- service-role access retained
- relationship/company consistency in RPCs once RPCs exist

RPC tests should cover:

- owner company member can read vendor profiles with `vendors.read`
- user without `vendors.read` cannot read vendor profiles
- profile create/update rejects mismatched relationship/company pairs
- profile update rejects assignment fields
- contacts can link to nullable `users.id`
- service-area filters return active coverage rows
- assignment candidate RPC excludes inactive vendors and inactive service areas

Frontend tests should wait until read-model API/UI slices:

- Vendor Directory list renders read-model rows
- primary contact summary renders
- coverage summary renders
- inactive/do-not-use status is visible
- assignment candidate selector does not expose canonical relationship internals

## Open Decisions Requiring Approval

- Should `relationship_id` be required for every vendor profile, or can intake create a staged profile before relationship approval?
- Should `vendor_status` be relationship-scoped, profile-scoped, or both?
- Should website/address/public phone move to `companies` first, or stay in vendor profile for MVP?
- Should `company_vendor_profiles` use one row per owner/vendor pair, or support multiple programs per owner/vendor pair later?
- Should fee agreement notes live in `company_relationships.settings`, `company_vendor_profiles`, or a deferred financial table?
- Should product eligibility remain JSON for MVP or use a normalized eligibility table immediately?
- Should vendor contacts receive assignment notifications before a Vendor Portal exists, or should notifications stay limited to company users with assignment permissions?
- Which vendor permissions should be seeded first, and which roles should receive them?
- Should `vendors.archive` mean archive the vendor profile only, suspend/archive the relationship, or both through separate actions?

## Explicit Non-Goals

- No migrations in this slice.
- No schema changes in this slice.
- No runtime code changes.
- No permission grants.
- No vendor roles.
- No vendor screens.
- No navigation changes.
- No `/amc/*` routes.
- No assignment behavior changes.
- No changes to `orders.appraiser_id`, `orders.reviewer_id`, or `orders.assigned_to`.
- No replacement of `order_company_assignments`.
