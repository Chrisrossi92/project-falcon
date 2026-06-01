# AMC Vendor ERD and Ownership Model

## Purpose

This document defines the Vendor Directory entity model and field ownership boundaries for the schema and read-only hidden UI foundation.

Falcon remains one platform. AMC vendor functionality should extend the existing company, relationship, assignment packet, notification, activity, and permission foundations rather than creating a separate AMC system.

## AMC-2L Closeout Status

The read-only Vendor Directory foundation now has additive schema, read-only RPCs, frontend API wrappers, and hidden read-only directory/profile routes. The ownership model remains unchanged: no vendor permissions, vendor roles, mutation RPCs, assignment candidate RPCs, assignment behavior, order behavior, navigation exposure, or `/amc/*` routes have been introduced.

## Core Doctrine

- Vendors are primarily companies.
- Vendor users are members or contacts of vendor companies.
- Vendor assignment uses assignment records.
- `order_company_assignments` should remain the canonical vendor assignment table unless a later approved audit proves it insufficient.
- Vendor assignment must not write to `orders.appraiser_id`, `orders.reviewer_id`, or `orders.assigned_to`.
- Operations mode and company type are presentation/configuration context, not authorization.

## Recommended Entity Model

### Company

Canonical organization identity.

Existing foundation:

- `companies`
- `company_types`

Company owns stable organization facts such as name, slug, company type, public status, timezone, locale, and broad operating settings.

### Company Relationship

Directional relationship between two companies.

Existing foundation:

- `company_relationships`
- `company_relationship_types`

For AMC vendor work, the expected relationship is:

```text
AMC Company -> company_relationships.relationship_type = amc_vendor -> Vendor Company
```

Relationship records own AMC-to-vendor lifecycle state and relationship-specific notes, settings, and compliance summaries. Relationship existence alone does not grant order, client, activity, notification, calendar, queue, or workflow visibility.

### Vendor Profile

Vendor-directory metadata owned by the AMC/vendor-management domain.

Proposed future table:

- `company_vendor_profiles`

Vendor profiles should attach to a vendor company and, when relationship-specific, to an owner AMC company and relationship. They should not replace `companies`.

### Vendor Contact

Human contact associated with a vendor profile.

Proposed future table:

- `vendor_contacts`

A contact may optionally link to an authenticated `users.id`, but contacts should also support non-portal people.

### Vendor Service Area

Queryable coverage and eligibility data for assignment decisions.

Proposed future table:

- `vendor_service_areas`

Service areas should support geography and product-type coverage without hiding assignment eligibility in unstructured JSON.

### Assignment Packet

Scoped work assignment from an owner company to an assigned company.

Existing foundation:

- `order_company_assignments`

Assignment packets own vendor assignment state, due dates, terms, handoff payload, submission payload, lifecycle timestamps, and the assigned vendor company.

### Assignment Activity

Assignment-scoped lifecycle history.

Existing foundation:

- `order_company_assignment_activity`

Assignment activity is separate from canonical order activity and should remain packet-scoped.

### Vendor User / Company Membership

Authenticated user participation in a vendor company.

Existing foundation:

- `users`
- `user_profiles`
- `company_memberships`
- `user_role_assignments`

Vendor users should belong to vendor companies through company membership. User identity should not be treated as the vendor assignment unit.

## Entity Relationship Diagram

```text
AMC Company
  |
  v
Company Relationship (relationship_type = amc_vendor)
  |
  v
Vendor Company
  |-- Vendor Profile
  |-- Vendor Contacts
  |     `-- optional linked User
  |-- Vendor Service Areas
  `-- Company Memberships
        `-- Vendor Users

Order
  |
  v
Order Company Assignment
  |-- Owner Company
  |-- Assigned Vendor Company
  |-- optional Primary Vendor Contact/User later
  |-- Assignment Terms
  |-- Assignment Status
  `-- Assignment Activity
```

## Field Ownership Matrix

| Field / concept | Owner | Notes |
|---|---|---|
| Legal/company name | Company | Store on `companies`; do not duplicate in vendor profile except denormalized read models. |
| Public/company website | Company or Vendor Profile | Prefer company if broadly true; use vendor profile if AMC-specific or vendor-directory-only. |
| Primary address | Company or Vendor Profile | Company for canonical address; vendor profile for directory-specific display if canonical address does not exist yet. |
| Public phone | Company or Vendor Profile | Company if organization-wide; contact if person-specific. |
| Company type | Company | Existing `companies.company_type`; not authorization. |
| Approved/suspended relationship status | Company Relationship | Existing `company_relationships.status`. |
| Preferred/do-not-use status for this AMC | Company Relationship or Vendor Profile | If specific to one AMC/vendor relationship, keep relationship-scoped. |
| Relationship notes | Company Relationship | Existing `company_relationships.notes`. |
| Relationship-specific compliance summary | Company Relationship | Existing `company_relationships.compliance` can hold lightweight summary only. |
| Relationship-specific fee agreement notes | Company Relationship or Vendor Profile | Keep relationship-scoped if negotiated between AMC and vendor. |
| Client/vendor eligibility restrictions | Company Relationship or future eligibility table | Defer complex client-specific rules. |
| Internal tags | Vendor Profile | Directory/search metadata. |
| Default assignment instructions | Vendor Profile | General instructions only; assignment-specific instructions stay on assignment packet. |
| General capabilities | Vendor Profile | Keep summary here; detailed product rows may come later. |
| Product eligibility summary | Vendor Profile | Use structured JSON only for MVP summary; queryable rows can follow if needed. |
| Primary contact name/email/phone | Vendor Contact | Contact-level, not company-level. |
| Notification preferences | Vendor Contact or future notification preferences | Do not overload company relationship metadata. |
| Role label | Vendor Contact | Example: owner, coordinator, appraiser, accounting. |
| Linked user id | Vendor Contact | Nullable FK to `users.id` for authenticated vendor users. |
| State | Vendor Service Area | Queryable coverage. |
| County | Vendor Service Area | Queryable coverage. |
| ZIP | Vendor Service Area | Queryable coverage. |
| Radius | Vendor Service Area | Queryable coverage. |
| Market | Vendor Service Area | Queryable coverage. |
| Product type | Vendor Service Area | Coverage can vary by product. |
| Assigned vendor company | Assignment Packet | Existing `order_company_assignments.assigned_company_id`. |
| Optional primary vendor user/contact | Assignment Packet later | Do not add until vendor contacts are stable. |
| Assignment fee | Assignment Packet or future vendor fee table | Assignment-specific fee belongs with assignment terms/financial layer. |
| Assignment due date | Assignment Packet | Existing `due_at` / `review_due_at`. |
| Assignment status | Assignment Packet | Existing `status`. |
| Accepted/submitted/completed timestamps | Assignment Packet | Existing lifecycle timestamps. |
| Assignment packet terms | Assignment Packet | Existing `terms`. |

## Reuse Decisions

### Should `order_company_assignments` remain canonical for vendor assignments?

Yes. It already models owner-company to assigned-company work, requires an active relationship, supports `vendor_appraisal`, has lifecycle state, owns packet activity, and routes assignment notifications without granting canonical order visibility.

### Should vendor relationships be built on `company_relationships`?

Yes. `company_relationships` already models directional company-to-company relationships and includes `amc_vendor` through `company_relationship_types`.

### Should Vendor Directory wrap `/relationships` logic instead of exposing `/relationships` directly?

Yes. `/relationships` is framework-native and exposes relationship lifecycle vocabulary. Vendor Directory should reuse relationship RPCs and data but present vendor-management language: vendor status, coverage, contacts, compliance summary, and assignment readiness.

### Should Assignment Queue eventually wrap `/assignments` logic instead of exposing `/assignments` directly?

Yes. `/assignments` is packet-native and useful as a foundation, but AMC Assignment Queue should present AMC operational language and only expose packet mechanics where helpful.

### Should vendor assignment ever write to `orders.appraiser_id`, `orders.reviewer_id`, or `assigned_to`?

No. Those fields are internal production assignment fields. External vendor fulfillment must remain assignment-packet based.

## Proposed Minimum Future Schema

### `company_vendor_profiles`

Purpose: AMC/vendor-directory metadata around a vendor company.

Suggested fields:

- `id uuid primary key`
- `owner_company_id uuid references companies(id)`
- `vendor_company_id uuid references companies(id)`
- `relationship_id uuid references company_relationships(id)`
- `vendor_status text`
- `website text`
- `primary_address jsonb`
- `public_phone text`
- `default_assignment_instructions text`
- `capabilities jsonb`
- `product_eligibility jsonb`
- `internal_notes text`
- `tags text[]`
- `created_at timestamptz`
- `updated_at timestamptz`

Do not store assignment status, assignment fees, assignment due dates, packet terms, or canonical company identity here.

### `vendor_contacts`

Purpose: people attached to a vendor profile.

Suggested fields:

- `id uuid primary key`
- `vendor_profile_id uuid references company_vendor_profiles(id)`
- `user_id uuid references users(id) null`
- `name text`
- `email text`
- `phone text`
- `role_label text`
- `is_primary boolean`
- `receives_assignment_notifications boolean`
- `notes text`
- `created_at timestamptz`
- `updated_at timestamptz`

Do not store company-level legal identity, relationship lifecycle status, service area, or assignment lifecycle data here.

### `vendor_service_areas`

Purpose: searchable coverage/eligibility rows.

Suggested fields:

- `id uuid primary key`
- `vendor_profile_id uuid references company_vendor_profiles(id)`
- `state text`
- `county text`
- `zip text`
- `market text`
- `radius_miles numeric`
- `product_type text`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

Do not store assignment decisions, performance scores, or relationship lifecycle state here.

## Deferred Schema

Defer until Vendor Directory MVP proves the shape:

- vendor compliance documents
- W-9/tax documents
- E&O/insurance lifecycle
- license/certification lifecycle
- scorecards
- performance metrics
- fee schedules/rate cards
- capacity/workload projections
- vendor portal identity flows
- client-specific eligibility rules
- automated ranking weights

## Risks and Anti-Patterns

- Duplicating assignment tables would split lifecycle, permissions, notifications, and activity.
- Bloated `companies` rows would mix canonical identity with relationship-specific vendor facts.
- Hiding too much in JSON metadata would make coverage, compliance, and eligibility hard to query and validate.
- Exposing framework-native `/relationships` as the Vendor Directory would leak implementation vocabulary.
- Exposing `/assignments` directly as AMC Assignment Queue would leak packet mechanics before AMC UX is designed.
- Using `company_type` as authorization would bypass permissions and RLS/RPC authority.
- Using operations mode as authorization would violate Operations Command doctrine.
- Creating `/amc/*` route forks would split Falcon into separate platforms.
- Writing external vendor assignment into internal order participant columns would corrupt internal workflow semantics.

## Next Implementation Recommendation

Next slice:

```text
AMC-2E -- Vendor schema migration proposal for lean vendor profile/contact/service-area tables.
```

AMC-2E should still be a proposal/review slice unless explicitly approved to create migrations. It should define table DDL, indexes, RLS/RPC posture, permissions, read-model RPC shape, and test strategy before implementation.
