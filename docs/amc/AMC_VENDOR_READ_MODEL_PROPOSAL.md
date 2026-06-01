# AMC Vendor Read Model Proposal

## Purpose

This document defines and tracks the first Vendor Directory read-model and RPC layer for AMC Operations.

AMC-2F added the lean schema foundation:

- `company_vendor_profiles`
- `vendor_contacts`
- `vendor_service_areas`

## AMC-2H Implementation Status

AMC-2H implements the first read-only Vendor Directory RPC layer:

- `rpc_vendor_directory_list(p_status text default null, p_query text default null)`
- `rpc_vendor_profile_detail(p_vendor_profile_id uuid)`
- `rpc_vendor_profile_contacts(p_vendor_profile_id uuid)`
- `rpc_vendor_profile_service_areas(p_vendor_profile_id uuid)`

The implementation is read-only. It does not add assignment candidate RPCs, mutation RPCs, permission seeds, vendor roles, UI, navigation, route exposure, assignment behavior, order behavior, or `/amc/*` routes.

Because `vendors.read` is not approved or seeded yet, AMC-2H uses active current-company membership plus existing `relationships.read` as a temporary read gate. This preserves RPC-only access and avoids broad table exposure while vendor-specific permissions remain deferred.

## AMC-2I Implementation Status

AMC-2I adds frontend API wrappers for the read-only Vendor Directory RPCs:

- `listVendorDirectory({ status, query } = {})`
- `getVendorProfileDetail(vendorProfileId)`
- `getVendorProfileContacts(vendorProfileId)`
- `getVendorProfileServiceAreas(vendorProfileId)`

The implementation is frontend API plumbing only. It does not add UI, routes, navigation, permission seeds, vendor roles, mutation RPCs, assignment candidate calls, assignment behavior, order behavior, or `/amc/*` routes.

## AMC-2L Closeout Status

AMC-2L keeps the Vendor Directory read model read-only and hidden while hardening null handling, route diagnostics, and UI empty states. The closeout does not add navigation exposure, vendor permissions, vendor roles, mutation RPCs, assignment candidate RPCs, assignment behavior, order behavior, or `/amc/*` routes.

## Guardrails

- Vendors are primarily companies.
- Vendor profiles are relationship-aware, but staged profiles may exist without `relationship_id`.
- Vendor assignment uses assignment records.
- `order_company_assignments` remains the canonical vendor assignment table.
- Vendor assignment must not write to `orders.appraiser_id`, `orders.reviewer_id`, or `orders.assigned_to`.
- Operations mode, product mode, and `company_type` are not authorization.
- Vendor Directory should expose vendor-management language, not framework-native relationship internals.
- Assignment candidates are deferred and must not grant order or assignment access by themselves.

## MVP Read Use Cases

### Vendor Directory List

Users need a searchable vendor list for the current owner company. The list should show vendor identity, status, relationship state, primary contact summary, coverage summary, product eligibility summary, tags, and last update time.

### Vendor Profile Detail

Users need a detail read model for a single vendor profile. The detail should include canonical company identity, vendor profile metadata, relationship context, assignment instructions, capabilities, product eligibility, and timestamps.

### Vendor Contacts

Users need contact rows for a vendor profile, including a primary contact and optional linked app user. Contacts are not a notification routing mechanism in this slice.

### Vendor Service Areas

Users need structured coverage rows for a vendor profile. Service areas should remain queryable for later assignment matching.

### Future Assignment Candidates

Users will eventually need candidate vendors for an order. This should be a separate read model from the general directory list because candidate logic depends on order geography, product type, vendor status, relationship status, service areas, and assignment permissions.

## Proposed RPCs

The read layer should be RPC-first. App roles should not receive direct table access for these tables.

Suggested RPCs:

- `rpc_vendor_directory_list(p_status text default null, p_query text default null)`
- `rpc_vendor_profile_detail(p_vendor_profile_id uuid)`
- `rpc_vendor_profile_contacts(p_vendor_profile_id uuid)`
- `rpc_vendor_profile_service_areas(p_vendor_profile_id uuid)`
- `rpc_vendor_assignment_candidates(p_order_id uuid)` deferred

All MVP read RPCs should infer the current owner company from the authenticated user's active/current company context using the same company membership pattern already used elsewhere in Falcon. Do not accept `owner_company_id` from the client unless a later multi-company admin flow explicitly needs it and validates it server-side.

## Return Shapes

### `rpc_vendor_directory_list`

Parameters:

- `p_status text default null`
- `p_query text default null`

Returns one row per vendor profile visible to the current owner company:

| Field | Type | Source / notes |
|---|---|---|
| `vendor_profile_id` | `uuid` | `company_vendor_profiles.id` |
| `vendor_company_id` | `uuid` | `company_vendor_profiles.vendor_company_id` |
| `vendor_company_name` | `text` | `companies.name` for the vendor company |
| `vendor_status` | `text` | `company_vendor_profiles.vendor_status` |
| `relationship_id` | `uuid null` | `company_vendor_profiles.relationship_id` |
| `relationship_status` | `text null` | `company_relationships.status`; null for staged profiles |
| `primary_contact_name` | `text null` | Primary `vendor_contacts.name` where `is_primary` is true |
| `primary_contact_email` | `text null` | Primary `vendor_contacts.email` |
| `primary_contact_phone` | `text null` | Primary `vendor_contacts.phone` |
| `service_area_summary` | `jsonb` | Aggregated active service-area summary |
| `product_eligibility` | `jsonb` | `company_vendor_profiles.product_eligibility` |
| `tags` | `text[]` | `company_vendor_profiles.tags` |
| `updated_at` | `timestamptz` | Greatest relevant profile/contact/service-area update if practical; otherwise profile `updated_at` |

Filtering:

- `p_status` filters `company_vendor_profiles.vendor_status` when provided.
- `p_query` should match vendor company name, primary contact name, primary contact email, tags, county, zip, market, or product type where practical.
- Staged profiles without `relationship_id` should appear in the directory when the user is authorized for the owner company.

Ordering:

- Prefer `vendor_company_name asc`, then `updated_at desc`.

### `rpc_vendor_profile_detail`

Parameters:

- `p_vendor_profile_id uuid`

Returns one row:

| Field | Type | Source / notes |
|---|---|---|
| `vendor_profile_id` | `uuid` | `company_vendor_profiles.id` |
| `owner_company_id` | `uuid` | `company_vendor_profiles.owner_company_id` |
| `vendor_company_id` | `uuid` | `company_vendor_profiles.vendor_company_id` |
| `vendor_company_name` | `text` | `companies.name` |
| `vendor_company_type` | `text null` | `companies.company_type`; display/config only, not authorization |
| `relationship_id` | `uuid null` | `company_vendor_profiles.relationship_id` |
| `relationship_status` | `text null` | `company_relationships.status` |
| `relationship_type` | `text null` | Expected `amc_vendor` when relationship exists |
| `vendor_status` | `text` | `company_vendor_profiles.vendor_status` |
| `website` | `text null` | `company_vendor_profiles.website` |
| `primary_address` | `jsonb` | `company_vendor_profiles.primary_address` |
| `public_phone` | `text null` | `company_vendor_profiles.public_phone` |
| `default_assignment_instructions` | `text null` | General instructions only |
| `capabilities` | `jsonb` | `company_vendor_profiles.capabilities` |
| `product_eligibility` | `jsonb` | `company_vendor_profiles.product_eligibility` |
| `internal_notes` | `text null` | `company_vendor_profiles.internal_notes` |
| `tags` | `text[]` | `company_vendor_profiles.tags` |
| `created_at` | `timestamptz` | `company_vendor_profiles.created_at` |
| `updated_at` | `timestamptz` | `company_vendor_profiles.updated_at` |

The detail RPC should not return assignment packets, order data, client data, financial terms, compliance documents, performance scoring, or portal access state in MVP.

### `rpc_vendor_profile_contacts`

Parameters:

- `p_vendor_profile_id uuid`

Returns contact rows for the profile:

| Field | Type | Source / notes |
|---|---|---|
| `vendor_contact_id` | `uuid` | `vendor_contacts.id` |
| `vendor_profile_id` | `uuid` | `vendor_contacts.vendor_profile_id` |
| `user_id` | `uuid null` | Optional linked `users.id` |
| `linked_user_display_name` | `text null` | From `user_profiles` if easy and safe |
| `name` | `text` | `vendor_contacts.name` |
| `email` | `text null` | `vendor_contacts.email` |
| `phone` | `text null` | `vendor_contacts.phone` |
| `role_label` | `text null` | `vendor_contacts.role_label` |
| `is_primary` | `boolean` | `vendor_contacts.is_primary` |
| `receives_assignment_notifications` | `boolean` | Future hint only; no notification fanout yet |
| `notes` | `text null` | `vendor_contacts.notes` |
| `created_at` | `timestamptz` | `vendor_contacts.created_at` |
| `updated_at` | `timestamptz` | `vendor_contacts.updated_at` |

Ordering:

- Primary contact first.
- Then `name asc`.

### `rpc_vendor_profile_service_areas`

Parameters:

- `p_vendor_profile_id uuid`

Returns service-area rows for the profile:

| Field | Type | Source / notes |
|---|---|---|
| `vendor_service_area_id` | `uuid` | `vendor_service_areas.id` |
| `vendor_profile_id` | `uuid` | `vendor_service_areas.vendor_profile_id` |
| `state` | `text null` | `vendor_service_areas.state` |
| `county` | `text null` | `vendor_service_areas.county` |
| `zip` | `text null` | `vendor_service_areas.zip` |
| `market` | `text null` | `vendor_service_areas.market` |
| `radius_miles` | `numeric null` | `vendor_service_areas.radius_miles` |
| `product_type` | `text null` | `vendor_service_areas.product_type` |
| `status` | `text` | `vendor_service_areas.status` |
| `created_at` | `timestamptz` | `vendor_service_areas.created_at` |
| `updated_at` | `timestamptz` | `vendor_service_areas.updated_at` |

Ordering:

- Active rows first.
- Then `state`, `county`, `zip`, `market`, `product_type`.

### `rpc_vendor_assignment_candidates` Deferred

Parameters:

- `p_order_id uuid`

Future return shape:

| Field | Type | Source / notes |
|---|---|---|
| `vendor_profile_id` | `uuid` | Candidate vendor profile |
| `vendor_company_id` | `uuid` | Candidate vendor company |
| `vendor_company_name` | `text` | Vendor company name |
| `vendor_status` | `text` | Must be assignment-eligible |
| `relationship_id` | `uuid` | Active AMC/vendor relationship required |
| `relationship_status` | `text` | Active/approved relationship state |
| `matched_service_area_ids` | `uuid[]` | Matching active coverage rows |
| `service_area_match_summary` | `jsonb` | Explainable coverage match |
| `product_eligibility_match` | `boolean` | Explainable product match |
| `primary_contact_name` | `text null` | Summary only |
| `primary_contact_email` | `text null` | Summary only |
| `recommendation_reason` | `text null` | Future explainability text |

This RPC should not create assignments, send notifications, grant order access, or alter assignment state.

## Authorization Strategy

This proposal assumes an RPC-first access pattern.

MVP read authorization should require:

- authenticated user
- active membership in the current owner company
- future `vendors.read` permission

Future assignment candidate reads should additionally respect assignment and order access rules. Vendor candidate visibility must not imply permission to view full order details or create assignments.

Do not authorize by:

- operations mode
- product mode
- `companies.company_type`
- client-side route visibility
- relationship metadata alone
- direct table grants to app roles

Direct table access from `anon` and `authenticated` should remain blocked. Security-definer RPCs should enforce membership and future permissions explicitly.

## Query Strategy

### Directory List

`rpc_vendor_directory_list` should join:

- `company_vendor_profiles` as the base table
- `companies` for vendor company identity
- `company_relationships` for optional relationship status
- `vendor_contacts` for primary contact summary
- `vendor_service_areas` for active service-area summary

The service-area summary should be compact and deterministic. A reasonable MVP shape:

```json
{
  "active_count": 3,
  "states": ["NY", "NJ"],
  "counties": ["Westchester", "Bergen"],
  "zips": ["10601"],
  "markets": ["NY Metro"],
  "product_types": ["commercial", "multifamily"]
}
```

Duplicate service-area values should be deduped in summary arrays.

### Profile Detail

`rpc_vendor_profile_detail` should read one `company_vendor_profiles` row scoped to the current owner company and join vendor company and optional relationship context.

Contacts and service areas should stay in their own RPCs for MVP to keep the detail payload stable and avoid nested aggregation churn.

### Contacts

`rpc_vendor_profile_contacts` should verify the parent profile belongs to the current owner company before returning rows. Optional `user_id` joins should be read-only metadata and must not imply vendor portal access.

### Service Areas

`rpc_vendor_profile_service_areas` should verify the parent profile belongs to the current owner company before returning rows. Both active and inactive rows should be returned for profile management; assignment candidates should use active rows only.

## Edge Cases

- Staged profile without `relationship_id`: visible in Vendor Directory and profile detail, excluded from assignment candidates until an active `amc_vendor` relationship exists.
- Inactive vendors: visible in directory with status, excluded from assignment candidates.
- `do_not_use` vendors: visible in directory with status, excluded from assignment candidates.
- Vendor company missing optional metadata: return null optional fields and keep canonical name/id present.
- No primary contact: return null primary contact fields; do not synthesize from arbitrary contacts.
- Multiple primary contacts should be prevented by schema; if legacy data ever violates this, choose newest `updated_at` and surface cleanup separately.
- No service areas: directory summary should return an empty object or zero-count summary, not null if the UI benefits from stable shape.
- Duplicate service-area rows: detail can return rows as stored; summaries should dedupe repeated state/county/zip/market/product values.
- Future vendor users linked through `user_id`: return linked display metadata only when allowed; do not infer membership, portal status, or notification routing from contact linkage alone.

## Assignment Candidate Strategy

`rpc_vendor_assignment_candidates` should remain deferred until Vendor Directory read RPCs are stable.

Future candidate logic should require:

- active vendor profile
- vendor status is not `inactive` or `do_not_use`
- active `amc_vendor` relationship
- active service-area match against order geography
- product eligibility match when product data is available
- assignment permissions and order access validated separately

Candidate logic should stay explainable. The RPC should return why a vendor matched, not just a sorted list. Recommendation ranking, rotation, first-accept workflows, outreach fanout, and performance scoring remain later AMC-5/AMC-6/AMC-7 work.

## Future Implementation Tests

Database/RPC tests should cover:

- authenticated membership in owner company is required
- future `vendors.read` permission is required
- app roles cannot read tables directly
- staged vendors appear in directory
- staged vendors are excluded from assignment candidates
- `do_not_use` vendors appear in directory with status
- `do_not_use` vendors are excluded from assignment candidates
- inactive vendors are excluded from assignment candidates
- primary contact summarization returns the primary contact only
- no primary contact returns null primary contact fields
- service-area summaries dedupe repeated values
- contact `user_id` is optional
- linked contact user metadata does not grant portal or assignment access
- `company_type`, operations mode, and product mode do not authorize reads

Frontend tests should wait for the UI slice and should verify that Vendor Directory consumes the read model without exposing relationship or assignment internals.

## Recommended Next Slice

Next slice:

```text
AMC-2H -- Implement Vendor Directory read RPCs, still no UI.
```

AMC-2H should create only the read RPC layer and associated database tests. It should not add mutation RPCs, permissions grants, vendor roles, UI, navigation, routes, assignment workflows, assignment candidate execution, or `/amc/*` routes unless separately approved.
