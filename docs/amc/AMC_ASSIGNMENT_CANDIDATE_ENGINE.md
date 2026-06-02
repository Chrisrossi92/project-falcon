# AMC Assignment Candidate Engine

## Purpose

The Assignment Candidate Engine is the first decision-support layer between Vendor Directory coverage data and actual assignment packet creation.

Its job is to answer one question for an owner/admin user:

> Which vendors are reasonable candidates for this order, and why?

AMC-5A is proposal-only. It does not create candidate RPCs, assignment packets, notifications, route changes, permission changes, schema changes, or `/amc/*` routes.

## Current Foundation

The engine should reuse existing Falcon primitives:

- `orders` for order geography, product/report type, status, and due timing.
- `company_vendor_profiles` for owner-scoped vendor status, structured capabilities, product eligibility metadata, and relationship linkage.
- `vendor_service_areas` for positive geography/product coverage rows.
- `vendor_contacts` for primary contact summaries.
- `company_relationships` for active owner-to-vendor network state.
- `order_company_assignments` for actual assignment packet records after a user chooses to offer work.

`order_company_assignments` remains the canonical assignment table. Candidate matching must not write to `orders.appraiser_id`, `orders.reviewer_id`, `orders.assigned_to`, or assignment lifecycle tables.

## Candidate Matching Inputs

### Order Inputs

Use currently available order fields first:

- property state: `orders.state`
- county: `orders.county`
- ZIP/postal code: `coalesce(orders.zip, orders.postal_code)`
- city/address context: `orders.city`, `orders.address`, `orders.property_address`
- product/order context: `orders.report_type`, `orders.property_type`
- timing context: `orders.due_date`, `orders.final_due_at`, `orders.review_due_date`, `orders.review_due_at`, `orders.site_visit_at`

Market is not a strongly normalized order field today. If market matching is needed in MVP, it should be derived carefully or treated as a future explicit field audit item.

### Vendor Inputs

Use Vendor Directory data already created by AMC-2 through AMC-4:

- `company_vendor_profiles.vendor_status`
- linked `company_relationships.status`
- active `vendor_service_areas` rows
- `vendor_service_areas.product_type`
- primary contact from `vendor_contacts`
- structured `company_vendor_profiles.capabilities`
- structured `company_vendor_profiles.product_eligibility`

Coverage/product rows should be the primary matching source. Profile-level product eligibility should be a fallback or exception source, not the long-term primary matching table.

## Eligibility Rules

Candidate search should apply hard eligibility before scoring:

- The caller must be authenticated and belong to the active current company.
- The order must belong to the current owner company.
- The caller must have order access for the candidate-search context.
- The vendor profile must belong to the current owner company.
- `vendor_status` must not be `inactive` or `do_not_use`.
- The vendor must have an active owner-to-vendor relationship before an assignment offer can be created.
- The vendor must have active coverage matching the order geography unless the user explicitly expands search later.
- The vendor must match the order product/report type when product data is available.

`pending` and `probation` vendors may be visible as warning candidates only if product policy wants staff review. They should not silently rank as normal active vendors.

Candidate search must not authorize by operations mode, product mode, route visibility, relationship metadata alone, or direct table grants.

## Geography Matching Priority

Recommended matching priority:

1. ZIP exact match.
2. County match.
3. Market/radius match.
4. Statewide match.

The priority is specificity-first. A ZIP match should outrank county and state coverage when product and relationship conditions are equal.

Radius matching should remain conservative until geocoding or reliable coordinate data exists. In MVP, market/radius rows can be presented as explainable matches when the market context is present, with a warning if exact distance cannot be verified.

## Product Matching

Product matching should use stable product slugs:

- Prefer `vendor_service_areas.product_type`.
- Map order `report_type` / `property_type` to a candidate product slug through an explicit mapping layer.
- Fall back to `company_vendor_profiles.product_eligibility` only when a vendor has no product-specific coverage row or when profile-level exceptions are intentionally configured.
- Avoid free-text ambiguity in candidate logic.

Coverage rows with no `product_type` should be treated cautiously. They may represent legacy broad coverage, but the candidate result should include a warning flag rather than silently treating broad coverage as all products.

## Scoring Model V1

V1 scoring should be simple, explainable, and deterministic. Suggested model:

| Input | Score guidance |
|---|---:|
| ZIP match | +50 |
| County match | +40 |
| Market/radius match | +30 |
| Statewide match | +20 |
| Product match from coverage row | +25 |
| Product match from profile fallback | +10 |
| Preferred vendor status | +15 |
| Active vendor status | +10 |
| Probation vendor status | -10 and warning |
| Active relationship | +10 |
| Staged/no active relationship | exclude from offer-ready results |
| Complete primary contact | +5 |
| Future performance score | reserved, default 0 |

The result should return `match_reasons` and `warning_flags` so users can see why a vendor appears. The score must not create assignments automatically.

## RPC Proposal

Suggested MVP RPC:

```sql
rpc_vendor_assignment_candidates(p_order_id uuid)
```

Suggested return shape:

| Field | Type | Notes |
|---|---|---|
| `vendor_profile_id` | `uuid` | Owner-scoped vendor profile. |
| `vendor_company_id` | `uuid` | Vendor company id. |
| `vendor_company_name` | `text` | Display name. |
| `vendor_status` | `text` | Active/preferred/probation/etc. |
| `relationship_id` | `uuid` | Active relationship for offer-ready candidates. |
| `relationship_status` | `text` | Relationship state. |
| `match_score` | `integer` | Deterministic score. |
| `match_reasons` | `jsonb` | Human-explainable reasons. |
| `coverage_matches` | `jsonb` | Matching service-area ids and summarized geography/product fit. |
| `primary_contact` | `jsonb` | Primary contact summary only. |
| `warning_flags` | `text[]` | Examples: `probation_vendor`, `missing_product_specific_coverage`, `radius_not_verified`. |

The RPC should not:

- create assignments
- send notifications
- create activity
- grant order access to the vendor
- mutate order state
- mutate vendor coverage
- write assignment packets

## Permission Recommendation

MVP candidate search should require:

- authenticated current-company user
- current-company order access
- `vendors.read`

If the candidate surface is embedded directly inside an assignment-offer workflow, require the same permissions needed to offer work:

- `order_company_assignments.offer`
- `relationships.assign_work`

Do not add a new `vendors.assign` permission for MVP unless product requirements call for separating "find candidates" from "offer assignments." A future `vendors.assign` permission can be introduced after the workflow boundary is clearer.

## Deferred Behavior

AMC-5A does not implement:

- actual assignment creation
- bid requests
- vendor scoring from history
- fee comparison
- automated routing
- notifications
- capacity/workload checks
- compliance expiration checks
- vendor portal response workflows
- first-to-accept routing
- top-N outreach fanout
- geocoding-backed radius matching
- normalized coverage-region tables

## Risks And Guardrails

- Poor order location data can produce false negatives. AMC-5B should verify state/county/ZIP normalization before matching.
- County names need normalization across order data and static county constants.
- Product mapping from `report_type` and `property_type` to product slugs must be explicit and tested.
- Coverage matches must not imply automatic assignment eligibility.
- Operations mode must not become authorization.
- Radius matching can overpromise without geocoding.
- Full-state coverage must not explode into county rows.
- Staged vendors without active relationships can remain visible in Vendor Directory, but should be excluded from offer-ready candidate results.

## AMC-5B Field Audit

AMC-5B inspected the existing order, vendor, relationship, and assignment surfaces to determine whether candidate matching can be implemented with current data.

Files inspected:

- `supabase/migrations/20260518000000_baseline_extensions_and_schema.sql`
- `supabase/migrations/20260518004000_company_scope_order_projection_preservation.sql`
- `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql`
- `supabase/migrations/20260518066000_rpc_update_order_edit_field_coverage.sql`
- `supabase/migrations/20260518029000_order_company_assignment_foundation.sql`
- `supabase/migrations/20260518032000_order_company_assignment_activity_notifications.sql`
- `supabase/migrations/20260528120000_amc_vendor_directory_schema_foundation.sql`
- `supabase/migrations/20260601120000_amc_vendor_directory_vendors_read_gate.sql`
- `src/lib/services/ordersService.js`
- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/PropertyFields.jsx`
- `src/components/orders/drawer/OrderDrawerContent.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/components/ui/AddressAutocomplete.jsx`
- `src/features/assignments/api.js`
- `src/features/assignments/components/OfferAssignmentModal.jsx`
- `src/features/vendors/coverage/productTypes.js`
- `src/features/vendors/coverage/coverageBuilderUtils.js`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/amc/AMC_VENDOR_ASSIGNMENT_ENGINE.md`
- `docs/amc/AMC_VENDOR_COVERAGE_DOCTRINE.md`
- `docs/amc/AMC_VENDOR_READ_MODEL_PROPOSAL.md`
- `docs/amc/AMC_VENDOR_ERD_AND_OWNERSHIP_MODEL.md`

### Order Geography Availability

The `orders` table has the fields needed for conservative geography matching:

| Candidate input | Current source | Notes |
|---|---|---|
| State | `orders.state` | Order form uppercases state input, but existing rows may still require normalization. |
| County | `orders.county` | Present in the table and older projections, but not currently populated by the primary order form payload. |
| ZIP | `coalesce(orders.postal_code, orders.zip)` | Current form writes `postal_code`; legacy rows may use `zip`. |
| City | `orders.city` | Available in table, view, drawer, and detail. |
| Address | `coalesce(orders.property_address, orders.address)` and `address_line1` view alias | Available for display and maps, not sufficient for matching without geocoding. |
| Market | none canonical | Vendor coverage supports `market`, but current order data does not expose a normalized market field. |
| Location JSON | `orders.location` | Present in baseline schema, but no current candidate-ready lat/lng contract was found. |

`AddressAutocomplete` can derive county from Google address components, but the primary order form does not currently wire county into the create/update payload. County matching should therefore be treated as available only when existing order data includes a normalized county.

### Product And Order Type Availability

The order model has product-like fields:

| Candidate input | Current source | Notes |
|---|---|---|
| Report type | `orders.report_type` | Current UI options: Appraisal, Restricted Appraisal, Construction Draw, Trip Fee, Review, Other. Legacy values can still appear. |
| Property type | `orders.property_type` | Current UI options include Industrial, Office, Retail, Multifamily, Land, Mixed-Use, Residential, and other commercial/residential categories. |
| Assignment type | `order_company_assignments.assignment_type` | Packet assignment type, not an order product. `amc_vendor` relationships map to `vendor_appraisal`. |
| Order product | none canonical | No separate stable order product slug field was found. |
| Client/product taxonomy | none candidate-ready | No current client-specific product taxonomy was found for candidate matching. |

### Product Slug Mapping Readiness

Current order fields can map to vendor product slugs only through an explicit helper. They should not be matched by ad hoc free-text comparison inside the candidate RPC.

Reasonable first mapping assumptions:

| Vendor slug | Candidate order-field source |
|---|---|
| `appraisal` | `report_type = 'Appraisal'` |
| `restricted_appraisal` | `report_type = 'Restricted Appraisal'` or legacy restricted values |
| `construction_draw` | `report_type = 'Construction Draw'` |
| `review` | `report_type = 'Review'` |
| `residential` | `property_type = 'Residential'` |
| `commercial` | commercial property types not otherwise mapped more specifically |
| `industrial` | `property_type = 'Industrial'` |
| `multifamily` | `property_type = 'Multifamily'` |
| `land` | `property_type = 'Land'` |
| `short_term_rental` | no reliable current order-field source |

Ambiguities:

- `report_type = 'Appraisal'` is broad and does not distinguish residential vs commercial.
- `property_type = 'Office'`, `Retail`, `Mixed-Use`, `Medical Office`, `Self Storage`, `Hospitality`, and similar values likely map to `commercial`, but that mapping must be explicit.
- `Trip Fee` and `Other` should not silently match product coverage.
- `short_term_rental` needs a dedicated order signal before it can be matched confidently.

### Vendor Geography Availability

`vendor_service_areas` supports the current MVP coverage patterns:

| Coverage pattern | Current representation |
|---|---|
| Statewide | `state` populated; `county`, `zip`, `market`, and `radius_miles` empty. |
| County | `state` and `county` populated. |
| ZIP | `state` and `zip` populated. |
| Market | `state` and `market` populated. |
| Radius | `radius_miles` populated, usually with `state` and/or `market`. |
| Product-specific coverage | `product_type` populated with a stable vendor product slug. |

This is enough for exact state/county/ZIP and textual market matches. It is not enough for true radius distance math unless reliable coordinates are introduced later.

### Assignment Offer Authorization Boundary

Candidate matching must stay separate from assignment packet creation.

Existing assignment offer creation uses `rpc_order_company_assignment_offer(...)`, which enforces:

- current app user
- current company membership
- `order_company_assignments.offer`
- `relationships.assign_work`
- order ownership by current company
- `current_app_user_can_read_order(p_order_id)`
- `current_app_user_can_update_order_row(...)`
- active `company_relationships` row
- relationship source matches owner company and order owner company
- relationship target matches assigned company
- assignment type compatible with relationship type

Existing assignment lifecycle RPCs govern:

- owner/assigned packet reads through `order_company_assignments.read_owner` and `order_company_assignments.read_assigned`
- accept/decline through `order_company_assignments.respond`
- start/submit through `order_company_assignments.progress`
- complete through `order_company_assignments.complete`
- cancel through `order_company_assignments.cancel`
- revoke through `order_company_assignments.revoke`

The candidate RPC should not duplicate packet lifecycle behavior. If candidate results are used inside the offer workflow, it should align with the same offer permissions.

### Readiness Assessment

`rpc_vendor_assignment_candidates(p_order_id uuid)` can be implemented now as a conservative read-only RPC with these limitations:

- exact state match is ready
- exact ZIP match is ready when ZIP/postal code exists
- county match is ready only when `orders.county` is populated
- statewide vendor coverage is ready
- product matching is ready only after an explicit order-to-vendor product slug mapping helper is defined
- market match is not ready as a primary rule because orders lack a canonical market field
- radius distance math is not ready because no candidate-ready lat/lng contract was found

The RPC does not require a new schema for MVP if it accepts these limitations and returns warning flags for incomplete order geography/product data.

### Normalization Gaps

Known gaps before implementation:

- State casing should normalize to uppercase two-letter codes.
- County names need consistent suffix handling, such as `Franklin` vs `Franklin County`.
- ZIPs should normalize to five-digit strings for exact matching, with ZIP+4 trimmed to the leading five digits.
- `orders.county` may be null because current create/update payloads do not include county.
- `orders.postal_code` and legacy `orders.zip` both exist.
- `report_type` and `property_type` values are display labels, not stable slugs.
- Legacy `report_type` values such as Narrative, Form, or Restricted can appear.
- `short_term_rental` has no reliable order signal today.
- Market/radius coverage lacks an order-side market and geocoding contract.
- Null location fields should reduce score or return warning flags rather than producing broad false-positive matches.

### Recommended MVP Matching Assumptions

The safe first candidate engine should:

- require current-company order ownership and order read access
- require `vendors.read`
- optionally require assignment-offer permissions when embedded in offer flow
- normalize state, county, and ZIP before comparison
- match ZIP exactly when both sides have ZIP
- match county exactly when both sides have normalized county and state
- match statewide coverage by state only
- include market/radius only as warning-backed textual matches until coordinates exist
- use active `vendor_service_areas` rows only
- use `vendor_service_areas.product_type` first
- use an explicit product mapping helper for `report_type` and `property_type`
- fall back to `product_eligibility` only when explicitly documented
- exclude `inactive` and `do_not_use` vendor statuses
- require active `amc_vendor` relationship for offer-ready results
- return warning flags for missing county, missing ZIP, unknown product mapping, broad legacy coverage, and unverified radius

## AMC-5C Normalization Helper Proposal

AMC-5C inspected existing order mappers, order form fields, vendor product taxonomy constants, CoverageBuilder utilities, and vendor service-area rows. The current frontend has useful UI-side helpers, but candidate matching should be backed by SQL-safe normalization helpers because the candidate RPC will run in the database.

### Existing Helper Context

Frontend helpers already exist for vendor coverage UI:

- `src/features/vendors/coverage/productTypes.js` defines stable vendor product slugs and display labels.
- `src/features/vendors/coverage/coverageBuilderUtils.js` trims text, uppercases state codes, parses ZIP tokens, validates ZIP format, normalizes product labels to slugs, and validates OH/MI/IN county selections for the CoverageBuilder UI.
- `src/features/vendors/coverage/states.js` and `src/features/vendors/coverage/counties.js` provide frontend OH/MI/IN state and county constants.
- `src/lib/mappers/orderMapper.js` maps order rows into frontend shape and aliases `postal_code` / `zip`, but does not normalize county or product slugs.

These helpers should inform fixtures and frontend display behavior, but SQL matching should not depend on JS-only logic.

### Location Normalization Helpers

Recommended SQL helper functions for AMC-5D:

| Helper | Purpose | Proposed behavior |
|---|---|---|
| `amc_candidate_normalized_text(text)` | Shared trim/null helper | Trim whitespace; return null for empty strings. |
| `amc_candidate_normalized_state(text)` | State matching | Trim, uppercase, require two ASCII letters; return null when invalid/unknown. |
| `amc_candidate_normalized_zip(text)` | ZIP matching | Trim, accept `12345` or `12345-6789`; return leading five digits; return null otherwise. |
| `amc_candidate_normalized_county(text)` | County matching | Trim, lowercase for comparison, collapse whitespace, remove trailing `county`, remove punctuation-only noise, title/display formatting handled separately. |
| `amc_candidate_normalized_market(text)` | Market text matching | Trim, lowercase, collapse whitespace; exact normalized text only. |

Null/unknown inputs should return null rather than raising. Candidate matching should surface warning flags such as `missing_order_zip`, `missing_order_county`, or `invalid_vendor_zip` instead of failing the candidate read.

County normalization should compare `Franklin`, `franklin county`, and ` Franklin County ` as the same county. It should not attempt fuzzy spelling correction.

### Product Normalization Helpers

Recommended SQL helper functions:

| Helper | Purpose |
|---|---|
| `amc_candidate_normalized_product_slug(text)` | Normalize known vendor product labels/slugs to a stable slug. |
| `amc_candidate_order_product_slugs(p_report_type text, p_property_type text)` | Return candidate vendor product slugs inferred from an order. |

Recommended order-to-product mapping:

| Order input | Product slug |
|---|---|
| `report_type = Appraisal` | `appraisal` fallback |
| `report_type = Restricted Appraisal` | `restricted_appraisal` |
| legacy `report_type = Restricted` | `restricted_appraisal` |
| `report_type = Construction Draw` | `construction_draw` |
| `report_type = Review` | `review` |
| `property_type = Residential` | `residential` |
| `property_type = Industrial` | `industrial` |
| `property_type = Multifamily` | `multifamily` |
| `property_type = Land` | `land` |
| `property_type in Office, Retail, Mixed-Use, Special Purpose, Medical Office, Self Storage, Hospitality, Restaurant, Auto Service, Car Wash, Gas Station/C-Store, Bank Branch, School/Daycare, Religious Facility, Agricultural` | `commercial` |
| `short_term_rental` | no current order source; do not infer |
| `Trip Fee`, `Other`, blank, unknown legacy value | no product slug unless product policy explicitly chooses `appraisal` fallback |

If both report and property type produce slugs, return all useful slugs in deterministic priority order. Example: `report_type = Appraisal` and `property_type = Multifamily` should produce `multifamily` plus `appraisal`, with `multifamily` considered more specific for product coverage matching.

`appraisal` should be a fallback, not a broad override that makes every appraiser eligible. If a vendor has product-specific coverage for `commercial`, `multifamily`, or `residential`, those should outrank a generic `appraisal` match.

### Matching Helper Design

Recommended design:

- Implement SQL helper functions first because `rpc_vendor_assignment_candidates(p_order_id uuid)` must run matching close to the data.
- Keep frontend product constants for labels and UI selection.
- Add frontend constants/tests later only to mirror SQL fixtures, not to authorize or compute database candidate results.
- Avoid shared JS-only candidate matching because it would either duplicate sensitive authorization logic or require broad table data in the browser.
- Keep helper functions small and immutable where possible so they can be tested directly with SQL fixtures.

Suggested helper names for AMC-5D:

- `public.amc_candidate_normalized_text(text)`
- `public.amc_candidate_normalized_state(text)`
- `public.amc_candidate_normalized_zip(text)`
- `public.amc_candidate_normalized_county(text)`
- `public.amc_candidate_normalized_market(text)`
- `public.amc_candidate_normalized_product_slug(text)`
- `public.amc_candidate_order_product_slugs(text, text)`

These helpers should be revoked from direct app-role execution unless the candidate RPC needs them callable externally. The candidate RPC can call them internally.

### Conservative MVP Rules

Candidate matching should initially use:

- exact normalized ZIP match
- exact normalized county/state match
- exact normalized state-only statewide match
- exact normalized market text match only when an order market source exists
- exact product slug match against `vendor_service_areas.product_type`
- fallback to `appraisal` only when product cannot be mapped more specifically and product policy accepts broad appraisal coverage
- no fuzzy county matching
- no fuzzy product matching
- no geocoding
- no radius distance calculation
- no all-except exclusion logic

Radius rows can be returned with `radius_not_verified` only when a textual market/state context matches. They should not be scored as verified distance matches until lat/lng exists.

### Edge Cases

- Missing order county: skip county matching and return `missing_order_county`.
- Missing order ZIP: skip ZIP matching and return `missing_order_zip`.
- Unknown report/property type: return `unknown_order_product` and avoid product-specific matches unless generic fallback is explicitly allowed.
- County suffixes: normalize trailing `County`; do not remove meaningful words in county names.
- Mixed casing: normalize state, county, market, and product labels before comparison.
- Residential vs commercial ambiguity: do not infer residential/commercial solely from `report_type = Appraisal`; use `property_type`.
- Broad commercial properties: map known commercial property labels to `commercial`, but allow more specific mappings like `industrial`, `multifamily`, and `land` to take precedence.
- Legacy vendor coverage with null product type: include only as broad coverage with `missing_product_specific_coverage` warning, not as a strong product match.

## Implementation Slices

### AMC-5B: Order/Vendor Field Audit

Completed as documentation-only audit. Existing fields are sufficient for a conservative exact-match candidate RPC, but product and location normalization should be explicitly designed before implementation.

### AMC-5C: Product/Location Normalization Helper Proposal

Completed as documentation-only proposal. The recommended path is SQL helper functions for candidate RPC matching, with frontend constants used for labels and mirrored fixture expectations.

### AMC-5D: Candidate RPC Implementation

Implemented as additive backend-only migration `20260601140000_amc_vendor_assignment_candidate_rpcs.sql`.

The migration adds SQL helper functions for candidate normalization:

- `amc_candidate_normalized_text(text)`
- `amc_candidate_normalized_state(text)`
- `amc_candidate_normalized_zip(text)`
- `amc_candidate_normalized_county(text)`
- `amc_candidate_normalized_market(text)`
- `amc_candidate_normalized_product_slug(text)`
- `amc_candidate_order_product_slugs(text, text)`

It also adds read-only RPC `rpc_vendor_assignment_candidates(p_order_id uuid)`.

The RPC:

- requires authenticated current-company context
- requires active current-company membership
- requires active current company
- requires `vendors.read`
- requires current-company order ownership and `current_app_user_can_read_order(p_order_id)`
- requires active `amc_vendor` relationship
- excludes `inactive` and `do_not_use` vendor statuses
- uses active `vendor_service_areas` rows only
- matches exact normalized ZIP, county/state, market text when order market metadata exists, and statewide rows
- matches exact normalized product slugs derived from order `report_type` / `property_type`
- scores ZIP highest, then county, market, and statewide matches
- adds preferred vendor bonus and probation penalty
- returns explainable `match_reasons`, `coverage_matches`, `primary_contact`, and `warning_flags`

The RPC does not create assignments, bid requests, notifications, frontend routes, UI, order mutations, assignment packet mutations, schema table changes, or `/amc/*` routes.

### AMC-5D.1: Candidate SQL Validation Follow-Up

Validated AMC-5D in an isolated Supabase Postgres container because the local Supabase DB container was unhealthy and could not start. The local Supabase failure was caused by PostgreSQL failing to include `/etc/postgresql-custom/conf.d`, producing `configuration file "/etc/postgresql/postgresql.conf" contains errors`.

The isolated replay applied the required baseline/order/company/vendor dependency subset plus AMC-5D, then applied patch migration `20260601141000_amc_vendor_candidate_product_mapping_fix.sql`.

The validation found one product mapping bug: literal order property type `Commercial` did not map to vendor product slug `commercial`. The patch migration replaces only `amc_candidate_order_product_slugs(text, text)` and preserves the existing read-only candidate behavior.

Rolled-back runtime validation confirmed:

- helper functions compile
- grants and comments compile
- `amc_candidate_order_product_slugs('Narrative Appraisal', 'Commercial')` returns `commercial`
- `rpc_vendor_assignment_candidates(p_order_id uuid)` returns an expected active vendor candidate with ZIP/county coverage matches, score, reasons, primary contact JSON, and warning flags
- no assignment creation, order mutation, frontend wrapper, UI, route/nav, schema table/RLS, permission, or `/amc/*` changes were introduced

### AMC-5E: Frontend API Wrapper

Implemented `listVendorAssignmentCandidates(orderId)` in the vendor frontend API layer.

The wrapper:

- calls `rpc_vendor_assignment_candidates` with `p_order_id`
- returns candidate rows as provided by the read-only RPC
- surfaces Supabase RPC errors for callers to handle
- does not create assignment offers, bid requests, notifications, UI, routes/nav, schema/RLS, permissions, order mutations, assignment behavior, or `/amc/*` routes

No candidate panel UI exists yet.

### AMC-5F: Candidate Panel

Proposal completed for first candidate placement.

Recommended MVP placement: add a read-only **Vendor Candidates** panel to the shared Order Detail page, above or adjacent to the existing company-assignment packet section. The panel should appear only in AMC Operations mode for users who can read the order and have `vendors.read`. AMC Operations mode is a visibility condition only; authorization still comes from the candidate RPC and existing permission checks.

The Order Detail page is the right first surface because it already shows the full order, property, product, schedule, files, activity, and assignment packet context. It also already owns the explicit assignment-offer modal, so candidate results can inform staff without creating a separate queue or implying automatic routing.

Do not place the first MVP in:

- the order drawer, because the drawer is dense and optimized for compact review/context scanning
- a dedicated Assignment Queue, because that would imply a new routing workflow before assignment behavior is designed
- a hidden/internal route, because candidate results need to be evaluated in order context
- Vendor Directory reverse lookup, because the first user question is "who can handle this order?", not "what orders match this vendor?"

The read-only candidate panel should display:

- vendor name
- vendor status
- match score
- match reasons
- best coverage match, plus expandable coverage matches if useful
- primary contact name/email/phone when present
- warning flags such as missing order ZIP/county/product mapping
- relationship/network status as owner-friendly copy, not raw relationship terminology

Required states:

- loading candidates
- no candidates found
- missing order location/product data
- candidate RPC error
- candidates found

Deferred:

- offer assignment button
- bid request action
- assign/routing automation
- notifications
- ranking automation beyond the RPC score
- candidate queue navigation
- `/amc/*` route tree

Likely implementation files:

- `src/pages/orders/OrderDetail.jsx`
- `src/features/vendors/api.js`
- `src/features/vendors/components/VendorAssignmentCandidatesPanel.jsx`
- `src/pages/orders/__tests__/OrderDetail.test.jsx`
- `src/features/vendors/__tests__/VendorAssignmentCandidatesPanel.test.jsx`

Next slice: AMC-5H should integrate the isolated read-only panel into Order Detail under AMC Operations visibility and existing permission gates.

### AMC-5G: Read-Only Candidate Panel Component

Implemented `VendorAssignmentCandidatesPanel` as an isolated reusable component.

The panel:

- accepts `orderId`, `enabled`, and `className`
- returns `null` when disabled
- calls `listVendorAssignmentCandidates(orderId)` only when enabled with an order id
- renders loading, error, empty, missing-order-context, and candidates-found states
- displays vendor company name, match score, vendor status, network status, match reasons, coverage matches, primary contact, and warning flags
- includes copy that candidates are based on coverage/product fit and do not assign work automatically

AMC-5G does not integrate into Order Detail, create assignment offers, create bid requests, send notifications, add route/nav changes, change schema/RLS/permissions, change order behavior, change assignment behavior, or create `/amc/*` routes.

### AMC-5H: Order Detail Candidate Panel Integration

Integrated `VendorAssignmentCandidatesPanel` into the shared Order Detail page near the assignment/company-assignment context.

Visibility rules:

- current operations mode must be AMC Operations
- the current user must have `vendors.read`
- an order id must be present
- the candidate RPC still enforces authenticated current-company context, `vendors.read`, active relationship eligibility, and existing order read authorization

AMC-5H remains read-only. It does not add assign buttons, bid requests, assignment creation, notifications, order mutations, schema/RLS changes, permission changes, route/nav changes, assignment behavior changes, or `/amc/*` routes.

### AMC-5I: Candidate Panel Explainability Polish

Hardened the read-only candidate panel so users can better understand why a vendor appears before any assignment actions exist.

The panel now:

- shows match strength labels (`Strong match`, `Good match`, `Possible match`, `Limited match`) with the numeric score secondary
- groups available reason data into Geography, Product, Vendor status, and Network status without inventing unavailable score math
- maps geography/product/status/network reasons to owner-facing copy such as "ZIP coverage matches this order" and "Active network vendor"
- maps warning flags to clear sentences for missing ZIP/county, unknown product mapping, text-only market matches, and probation vendors
- shows the best coverage match first and keeps the full coverage match list behind an expandable "View all coverage matches" control

AMC-5I remains read-only. It does not add assign buttons, bid requests, assignment creation, notifications, backend/RPC/schema changes, permission changes, route/nav changes, order behavior changes, assignment behavior changes, or `/amc/*` routes.

### AMC-5J: Assignment Offer Integration Proposal

Connect selected candidates to the existing assignment-offer flow using `order_company_assignments`. Assignment packet creation remains an explicit user action.
