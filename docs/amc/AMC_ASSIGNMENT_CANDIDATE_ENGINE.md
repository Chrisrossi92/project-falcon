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

## AMC-6H: Candidate Scope Guard Doctrine

AMC-6H audits order scope separation before further assignment-offer testing. It does not change runtime code, migrations, queries, UI, route/nav, or assignment behavior.

Current candidate assumptions:

- `rpc_vendor_assignment_candidates(p_order_id)` verifies current-company order ownership and `vendors.read`.
- The frontend candidate panel appears in AMC Operations mode with `vendors.read`.
- Order Detail can derive active vendor packet state from `order_company_assignments`.

Gap:

- The order read model does not yet expose an authoritative Internal Operations vs AMC Operations scope.
- Current AMC mode can show the same internal order list/dashboard records as Internal Operations.
- Candidate/offer UI can therefore appear on an internal production order if the user has AMC mode and vendor permissions.

Doctrine:

- Candidate matching is only valid for AMC-scoped orders: orders the current company manages for external vendor fulfillment through Vendor Directory and assignment packets.
- Internal production orders should not show vendor candidates or `Offer Assignment` actions, even when the user can see AMC Operations mode.
- Do not infer candidate eligibility solely from `orders.managing_amc_id`, `orders.amc_id`, company type, operations mode, or vendor availability.
- Add an explicit order scope or fulfillment-model field before treating candidate offers as ready for production testing.

Recommended candidate gate after order-scope implementation:

```text
show candidates when:
  operationsMode = AMC Operations
  user has vendors.read
  order.operations_scope = amc_operations
  order belongs to current company

show Offer Assignment when additionally:
  user has assignment-offer authority
  no active vendor_appraisal packet exists
  candidate has complete vendor/relationship ids
```

Until that scope exists, candidate offers remain technically wired but should be treated as pre-scope workflow plumbing, not final AMC order behavior.

## AMC-6H.1: Candidate and Offer Scope Guardrail

AMC-6H.1 strengthens the candidate doctrine for compliance-sensitive lane separation.

Recommended order-scope source:

```text
orders.operations_scope in ('internal_operations', 'amc_operations')
```

Candidate search and vendor offer behavior must use this explicit order scope. They must not infer eligibility from UI mode, role, `managing_amc_id`, `amc_id`, client category, company type, or vendor coverage alone.

Required backend guard before product offer testing:

- `rpc_vendor_assignment_candidates(p_order_id)` should reject non-`amc_operations` orders.
- `rpc_order_company_assignment_offer(...)` should reject `vendor_appraisal` offers for non-`amc_operations` orders.
- Both guards should use stable backend errors so frontend copy can be owner-friendly.

Recommended stable error:

```text
order_scope_not_amc_operations
```

Recommended frontend copy:

```text
Vendor offers are only available for AMC Operations orders.
```

The candidate panel can still require AMC Operations mode and `vendors.read`, but mode/permission checks are not sufficient. The order itself must be AMC-scoped.

## AMC-6H.2: Candidate Guard Migration Proposal

AMC-6H.2 proposes, but does not implement, the runtime changes needed after `orders.operations_scope` is added.

Candidate RPC impact:

- Select `orders.operations_scope` with the existing order load.
- Reject when `operations_scope <> 'amc_operations'`.
- Use stable error `order_scope_not_amc_operations`.
- Preserve existing current-company, `vendors.read`, active relationship, vendor status, geography, and product matching rules.

Assignment offer RPC impact:

- For `p_assignment_type = 'vendor_appraisal'`, reject orders where `operations_scope <> 'amc_operations'`.
- Use the same stable error `order_scope_not_amc_operations`.
- Do not alter non-vendor assignment offer behavior in this slice.
- Preserve the existing one-active-vendor-offer guard for AMC-scoped orders.

Read/UI impact:

- Candidate panel should receive order scope from Order Detail or the order read model.
- Candidate panel should not fetch candidates for internal-scoped orders.
- `Offer Assignment` should remain hidden for internal-scoped orders even if candidate data exists in stale state.

Test impact:

- candidate RPC rejects internal orders
- candidate RPC allows AMC orders under existing permissions
- vendor-appraisal offer RPC rejects internal orders
- panel does not fetch or render candidate actions for internal orders
- active-offer errors and one-active-offer behavior still work on AMC-scoped orders

## AMC-6H.3: Candidate and Offer Scope Guard Implementation

AMC-6H.3 implements the backend scope guard foundation:

- Candidate matching now requires the order to have `operations_scope = 'amc_operations'`.
- Vendor-appraisal assignment offers now require the order to have `operations_scope = 'amc_operations'`.
- Both paths use stable error `order_scope_not_amc_operations`.
- Non-vendor assignment offer behavior is preserved.

This slice does not add UI filtering. Candidate/offer frontend visibility should still be tightened in a later slice so internal-scoped orders do not fetch candidate data or show candidate actions.

## AMC-6H.4: Mode-Aware Order Surface Filtering

AMC-6H.4 wires the explicit order scope into the existing shared order surfaces:

- Internal Operations order list reads request `operations_scope = 'internal_operations'`.
- AMC Operations order list reads request `operations_scope = 'amc_operations'`.
- Dashboard order rows and order-based KPI counts use the same mode-derived scope.
- Order Detail only renders the read/write candidate panel for AMC-scoped orders in AMC Operations mode.

Because existing orders default to `internal_operations`, AMC Operations order lists and dashboard counts can legitimately be empty until explicit AMC-scoped test orders are created. That empty state is preferred over showing internal production orders as AMC work.

This slice does not change order creation, add AMC order creation, add routes/nav, change permissions, or create `/amc/*` routes. Backend candidate and vendor-appraisal offer guards from AMC-6H.3 remain authoritative.

## AMC-6H.5: Candidate Test Order Data Plan

AMC-6H.5 proposes safe AMC candidate test data without implementation.

Recommendation:

- Use one future manual/demo AMC-scoped order seed for local validation.
- Do not bulk-backfill existing internal orders.
- Do not expose an order-scope edit UI yet.
- Do not test assignment offers against internal-scoped orders.

Minimum test order fields for candidate matching:

- `operations_scope = 'amc_operations'`
- `state`, normalized to a 2-letter code such as `OH`
- `county`, when county coverage should match, such as `Franklin`
- `postal_code` or `zip`, when ZIP coverage should match, such as `43215`
- `property_type`, such as `Commercial`, `Multifamily`, `Industrial`, `Land`, or `Residential`
- `report_type`, such as `Appraisal`, `Restricted Appraisal`, `Construction Draw`, or `Review`

Recommended candidate validation matrix:

- statewide vendor coverage plus `Commercial`/`Appraisal`
- county vendor coverage plus `Multifamily` or `Commercial`
- ZIP vendor coverage plus `Residential`
- product mismatch negative case
- internal-scoped order negative case, expecting no frontend candidate panel and backend `order_scope_not_amc_operations`

The test order should be paired with an existing demo vendor whose `vendor_service_areas.product_type` uses controlled product slugs, and whose coverage row geography matches the order state/county/ZIP being tested.

## AMC-6H.6: Candidate Test Seed Implementation

AMC-6H.6 adds a manual/local demo seed:

```text
supabase/manual/20260602_amc_test_order_seed.sql
```

Load locally:

```bash
psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/manual/20260602_amc_test_order_seed.sql
```

Candidate validation data:

- order number: `AMC-DEMO-001`
- order scope: `amc_operations`
- geography: `OH`, `Franklin`, `43215`
- order product inputs: `property_type = 'Commercial'`, `report_type = 'Appraisal'`
- expected matching vendor: `Franklin Commercial Valuation`
- expected matching coverage rows: Franklin County/ZIP `43215` with `commercial` and `appraisal` product slugs

Expected candidate behavior:

- Internal-scoped orders continue to produce no candidate UI and backend `order_scope_not_amc_operations`.
- `AMC-DEMO-001` should be visible in AMC Operations order surfaces and eligible for candidate search.
- Candidate matching should have both a county/ZIP geography path and exact product slug path available.
- The seed does not create assignments or offers automatically; offer testing remains a separate explicit action.

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

## AMC-6A: Assignment Offer Workflow Doctrine

AMC-6A is documentation/proposal only. It does not implement assignment actions, create migrations, create RPCs, create UI, send notifications, change schema/RLS, change permissions, change order behavior, or create `/amc/*` routes.

### What Is An Assignment Offer?

An Assignment Offer is the explicit handoff step between a candidate vendor recommendation and a scoped assignment packet.

Recommended lifecycle:

```text
Order
-> Candidate Vendor
-> Offer
-> Accept / Decline
-> Assignment Packet Lifecycle
```

Candidate matching answers "who appears to fit this order?" An offer answers "which vendor is being asked to take this work?" Acceptance converts that request into active assigned work inside the existing assignment packet lifecycle. Candidate results alone must never grant vendor order visibility, create a packet, send a vendor notification, or mutate order assignment columns.

### Relationship To Existing Infrastructure

The existing `order_company_assignments` architecture should be reused for assignment offers. It already models the owner-company to assigned-company packet boundary and is guarded by active `company_relationships`.

Existing reusable pieces:

- `order_company_assignments` stores the assignment packet record, owner company, assigned company, active relationship, assignment type, instructions, terms, handoff payload, due/review/expiration dates, lifecycle status, and actor timestamps.
- `rpc_order_company_assignment_offer(...)` already creates an `offered` packet and requires owner order authority, `order_company_assignments.offer`, and `relationships.assign_work`.
- `rpc_order_company_assignment_accept(uuid)` and `rpc_order_company_assignment_decline(uuid, text)` already govern vendor-side response from the assigned company.
- `rpc_order_company_assignment_start`, `submit`, `complete`, `cancel`, and `revoke` already cover the downstream packet lifecycle.
- Assignment packet activity and notifications are backend-owned through assignment lifecycle RPCs.
- `company_relationships` enforces active relationship compatibility; for `amc_vendor`, the expected packet assignment type is `vendor_appraisal`.

Reuse recommendation: do not create a parallel "vendor offers" table for MVP. The first offer implementation should bridge selected candidate rows into `rpc_order_company_assignment_offer(...)`, passing the candidate's `vendor_company_id`, `relationship_id`, and assignment type `vendor_appraisal`. Any candidate-specific context needed for audit or display can be copied into `handoff_payload` or terms, not into a new lifecycle store.

### Lifecycle States

Canonical current packet states from existing infrastructure:

- `offered`: owner has offered work to a vendor/company.
- `accepted`: assigned company accepted the offer.
- `declined`: assigned company declined the offer.
- `in_progress`: assigned company started work.
- `submitted`: assigned company submitted work back to the owner.
- `completed`: owner completed/closed the packet.
- `cancelled`: owner cancelled an offered/accepted/in-progress packet.
- `revoked`: owner revoked a current packet, including submitted work.

Doctrine labels for future product language:

- `draft`: future UI-only preparation state before calling the offer RPC; do not persist as a packet unless a separate draft-offer feature is approved.
- `viewed`: future telemetry/event state; do not make it a core lifecycle gate until vendor portal read receipts are implemented.
- `withdrawn`: owner-facing copy can map to existing `cancelled` for offered/accepted/in-progress packets or `revoked` when stronger owner withdrawal semantics are needed.
- `expired`: future scheduled transition for `offered` packets after `expires_at`; existing table has `expires_at`, but automatic expiration behavior should be designed separately.

MVP should use current persisted states rather than adding new statuses.

### Vendor Selection Workflow

Supported future workflows:

- Manual single-vendor offer.
- Manual multi-vendor offer.
- Bid request to one or many vendors.
- Availability request before formal offer.
- Future ranked/top-N outreach.

First implementation recommendation: single-vendor offer only.

Rationale:

- It reuses existing assignment packet RPCs directly.
- It avoids competing active vendors for the same work.
- It avoids bid, availability, and first-to-accept policy complexity.
- It keeps candidate recommendations advisory and makes the owner/admin choose intentionally.

MVP should not introduce bidding, automated routing, top-N fanout, or first-to-accept behavior. Those require separate doctrine for duplicate offers, vendor communications, fee terms, response deadlines, and fairness/audit rules.

### Permissions

Existing permissions should remain authoritative for MVP offer creation:

- `order_company_assignments.offer`: owner-side permission to create assignment offers.
- `relationships.assign_work`: permission to assign work through a relationship.
- existing order read/update authority enforced by `rpc_order_company_assignment_offer(...)`.

Candidate visibility remains governed by `vendors.read` plus order read authority. Offer creation should not be authorized by candidate visibility alone.

Proposed future permission:

- `vendors.assign`: optional future product-level permission if Falcon needs to separate "manage vendor directory" from "offer vendor work."

Recommendation: do not add `vendors.assign` until the workflow boundary is clear. For the first implementation, require the existing packet offer permissions and active relationship guard. If `vendors.assign` is later introduced, it should be an additional requirement, not a replacement for packet/relationship permissions.

### Notifications

Notifications are part of the offer lifecycle but remain deferred for this doctrine slice.

Existing `rpc_order_company_assignment_offer(...)` already calls assignment packet notification behavior. Future implementation must decide whether the candidate-origin offer UI uses that existing notification fanout immediately or stages offer creation before sending.

Future notification requirements:

- in-app notification for the assigned vendor/company
- email notification for assignment offer
- owner notification for accept/decline
- reminder before `expires_at`
- overdue/no-response escalation
- cancellation/revocation notification

Do not add new notification channels or reminder jobs until the offer UI and vendor response flow are explicitly approved.

### Risks

- Duplicate offers: existing unique index blocks duplicate current packets for the same order, assigned company, and assignment type, but multi-vendor offers need explicit product policy.
- Competing vendors: multi-vendor offers can create fairness and cancellation problems if more than one accepts.
- Withdrawn offers: owner-facing "withdraw" must map carefully to `cancelled` or `revoked`.
- Expired offers: `expires_at` exists, but automatic expiration should not be implied until a scheduled transition is implemented.
- Reassignment: after decline/cancel/revoke, a new offer may be valid, but audit history must remain intact.
- Relationship changes: an offer requires an active relationship; suspended/archived relationships should block new offers and may block responses depending on lifecycle policy.
- Order mutation confusion: vendor offers must not write `orders.appraiser_id`, `orders.reviewer_id`, `orders.assigned_to`, or `orders.current_reviewer_id`.
- Client visibility: client-facing status must not expose vendor identity or packet lifecycle by default.

## AMC-6B: Assignment Offer RPC/API Proposal

AMC-6B is proposal/inspection only. It does not create migrations, create RPCs, create UI, change schema/RLS, change permissions, change routes/nav, change order behavior, change assignment behavior, or create `/amc/*` routes.

### Reuse Assessment

Existing `order_company_assignments` can support MVP assignment offers without new lifecycle tables.

Reasons:

- It already stores the owner order, owner company, assigned company, active relationship, assignment type, instructions, terms, handoff payload, due/review/expiration dates, status, actor ids, and lifecycle timestamps.
- It already enforces assignment-type compatibility with relationship type. For `amc_vendor`, the compatible assignment type is `vendor_appraisal`.
- It already requires active relationships and matching owner/assigned companies through the table guard and offer RPC.
- It already has lifecycle RPCs for offer, accept, decline, start, submit, complete, cancel, and revoke.
- It already writes assignment-scoped activity and notification events through lifecycle RPCs.

Recommendation: reuse `rpc_order_company_assignment_offer(...)` for MVP. Do not create a new `vendor_assignment_offers` table or a separate vendor-offer lifecycle.

### Existing RPC To Reuse

Existing RPC:

```sql
public.rpc_order_company_assignment_offer(
  p_order_id uuid,
  p_assigned_company_id uuid,
  p_relationship_id uuid,
  p_assignment_type text,
  p_instructions text default null,
  p_terms jsonb default '{}'::jsonb,
  p_handoff_payload jsonb default '{}'::jsonb,
  p_due_at timestamptz default null,
  p_review_due_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns uuid
```

Required vendor-candidate payload mapping:

| RPC argument | Candidate/order source | MVP value |
|---|---|---|
| `p_order_id` | current order | selected order id |
| `p_assigned_company_id` | candidate | `vendor_company_id` |
| `p_relationship_id` | candidate | `relationship_id` |
| `p_assignment_type` | relationship doctrine | `vendor_appraisal` |
| `p_instructions` | owner/admin input | offer message / assignment instructions |
| `p_terms` | owner/admin input | structured terms, default `{}` |
| `p_handoff_payload` | candidate/order context | selected candidate metadata, default `{}` |
| `p_due_at` | owner/admin input | optional due date |
| `p_review_due_at` | owner/admin input | optional review due date |
| `p_expires_at` | owner/admin input | optional response deadline |

Validation behavior already enforced by the RPC:

- authenticated current app user
- active current-company membership
- `order_company_assignments.offer`
- `relationships.assign_work`
- order belongs to current company
- current user can read and update the order row
- relationship exists and is active
- relationship source matches current/order owner company
- relationship target matches assigned company
- assignment type matches the relationship type
- insert into `order_company_assignments` with status `offered`
- assignment activity and notification fanout through existing lifecycle functions

Return shape: assignment id `uuid`.

### Frontend API Proposal

Existing generic wrapper:

```js
offerAssignment({
  orderId,
  assignedCompanyId,
  relationshipId,
  assignmentType,
  instructions,
  terms,
  handoffPayload,
  dueAt,
  reviewDueAt,
  expiresAt,
})
```

Recommended vendor-candidate wrapper:

```js
offerOrderToVendor({
  orderId,
  vendorProfileId,
  vendorCompanyId,
  relationshipId,
  note,
  terms,
  dueAt,
  reviewDueAt,
  expiresAt,
  candidateSnapshot,
})
```

The wrapper should call the existing assignment API wrapper, not the database directly:

- `assignedCompanyId = vendorCompanyId`
- `assignmentType = "vendor_appraisal"`
- `instructions = note`
- `handoffPayload` should include a compact candidate snapshot such as `vendor_profile_id`, `match_score`, `match_reasons`, `coverage_matches`, and `warning_flags`

Do not use `vendorProfileId` as authority. It is useful for audit/display and stale-candidate validation, but the packet RPC authorizes through order ownership, relationship, assigned company, and existing permissions.

### Pre-Offer Validations

Before showing or submitting "Offer Assignment", the frontend should confirm:

- order id exists
- selected candidate has `vendor_profile_id`, `vendor_company_id`, and `relationship_id`
- candidate relationship/network status is active
- candidate vendor status is not `inactive` or `do_not_use`
- user has the existing assignment-offer permissions before showing the action, where available in frontend permission context
- no known current active assignment/offer blocks the MVP flow, if order-scoped assignment summaries are loaded

The backend must remain authoritative and revalidate:

- current-company membership
- order ownership and order read/update authority
- `order_company_assignments.offer`
- `relationships.assign_work`
- active relationship
- relationship target/source correctness
- assignment-type compatibility
- current packet uniqueness constraints

### One-Active-Offer Rule

MVP recommendation: allow only one active vendor assignment packet per order.

For candidate-origin vendor offers, "active" should include:

- `offered`
- `accepted`
- `in_progress`
- `submitted`

The existing unique index blocks duplicate current packets for the same order, assigned company, and assignment type. It does not by itself block multiple different vendors from receiving active offers for the same order. MVP product behavior should add an owner-side rule or wrapper validation that blocks a second current `vendor_appraisal` packet for the order unless a later multi-vendor/bid workflow is explicitly approved.

Declined, cancelled, revoked, and completed packets should remain historical and should not block a new offer unless product policy adds reassignment restrictions.

### Permission Recommendation

MVP should use existing permissions:

- `order_company_assignments.offer`
- `relationships.assign_work`
- existing order read/update authority enforced by the RPC

Candidate visibility still requires:

- `vendors.read`
- order read authority

`vendors.assign` remains optional future policy. If introduced, it should be an additional guard for vendor-origin offer UI, not a replacement for `order_company_assignments.offer` or `relationships.assign_work`.

### Future UI Behavior

Future owner/admin UI should:

- show an `Offer Assignment` button on eligible candidate rows
- open a confirmation modal
- require or strongly encourage an offer note/instructions
- allow optional terms, due date, review due date, and response deadline
- show a clear warning that this creates an assignment offer packet
- refresh candidate and current assignment panels after success

MVP UI should not add:

- bids
- multi-vendor offers
- first-to-accept routing
- automated offer creation
- notification customization beyond existing RPC fanout

Because the existing RPC already triggers assignment-scoped notifications, future UI copy should tell users that sending the offer may notify the assigned vendor/company when notification delivery is enabled.

### Revoke / Decline

Existing lifecycle supports:

- vendor/company decline through `rpc_order_company_assignment_decline(uuid, text)`
- owner cancel for offered/accepted/in-progress packets through `rpc_order_company_assignment_cancel(uuid, text)`
- owner revoke for offered/accepted/in-progress/submitted packets through `rpc_order_company_assignment_revoke(uuid, text)`

MVP candidate-offer UI can defer revoke/decline controls if the existing assignment packet surfaces already expose them. If surfaced on Order Detail later, use owner-facing copy:

- `Cancel offer` for `offered`
- `Revoke assignment` for accepted/in-progress/submitted work

### Risks

- Duplicate offers across multiple vendors if no order-level one-active-vendor rule is added.
- Stale candidate results after vendor status, coverage, relationship, or order data changes.
- Offering to a staged vendor if candidate data is bypassed; backend active relationship checks should block this.
- Offering without active relationship; backend checks already block this.
- Order already assigned through another vendor packet or internal assignment path.
- Users may confuse candidate recommendation with automatic assignment; UI must keep the action explicit.
- Existing generic offer modal can offer through any active relationship; candidate-origin UI should be narrower and vendor-specific.

### Recommended Next Slice

AMC-6C should define implementation mechanics for the one-active-vendor-offer rule and frontend API shape:

- decide whether to add a small candidate-aware SQL wrapper or rely entirely on existing `rpc_order_company_assignment_offer(...)`
- if no SQL wrapper is added, add `offerOrderToVendor(...)` as a frontend wrapper over `offerAssignment(...)`
- include preflight checks against `listOwnerAssignmentsForOrder(orderId)` where practical
- do not add UI until the wrapper and single-active-offer behavior are tested

## AMC-6C: Candidate-Aware Assignment Offer API Wrapper

Implemented frontend API support for offering an order to a selected vendor candidate using the existing assignment packet RPC path. No UI, assignment buttons, backend/RPC changes, schema/RLS changes, permission changes, route/nav changes, order behavior changes, assignment behavior changes, or `/amc/*` routes were introduced.

Added wrapper:

```js
offerOrderToVendor({
  orderId,
  vendorProfileId,
  vendorCompanyId,
  relationshipId,
  note,
  terms,
  dueAt,
  reviewDueAt,
  expiresAt,
  candidateSnapshot,
})
```

The wrapper delegates to existing `offerAssignment(...)`, which calls `rpc_order_company_assignment_offer(...)`.

Mapping:

| Vendor wrapper field | Existing assignment field |
|---|---|
| `orderId` | `orderId` / `p_order_id` |
| `vendorCompanyId` | `assignedCompanyId` / `p_assigned_company_id` |
| `relationshipId` | `relationshipId` / `p_relationship_id` |
| constant `vendor_appraisal` | `assignmentType` / `p_assignment_type` |
| `note` | `instructions` / `p_instructions` |
| `terms` | `terms` / `p_terms` |
| `candidateSnapshot` plus vendor ids | `handoffPayload` / `p_handoff_payload` |
| `dueAt` | `dueAt` / `p_due_at` |
| `reviewDueAt` | `reviewDueAt` / `p_review_due_at` |
| `expiresAt` | `expiresAt` / `p_expires_at` |

Conflict handling note:

- Existing backend uniqueness prevents duplicate current packets for the same `order_id`, `assigned_company_id`, and `assignment_type`.
- Existing backend behavior does not enforce the broader MVP rule of only one active vendor assignment packet across all vendors for a given order.
- AMC-6D/6E must add server-side or approved backend-backed enforcement before exposing an `Offer Assignment` UI action.

## AMC-6D: One Active Vendor Offer Enforcement Proposal

AMC-6D is proposal/inspection only. It does not create migrations, create RPCs, create UI, change schema/RLS, change permissions, change routes/nav, change order behavior, change assignment behavior, or create `/amc/*` routes.

### Active Vendor Assignment Statuses

For MVP vendor-offer enforcement, "active" means an `order_company_assignments` row where:

- `assignment_type = 'vendor_appraisal'`
- `status in ('offered', 'accepted', 'in_progress', 'submitted')`

Terminal or historical statuses should not block a later offer:

- `declined`
- `completed`
- `cancelled`
- `revoked`

### Scope

The MVP rule is:

> One active vendor appraisal offer/assignment per order, regardless of assigned vendor company.

Scope details:

- same `order_id`
- `assignment_type = 'vendor_appraisal'`
- any `assigned_company_id`
- only current active packet statuses: `offered`, `accepted`, `in_progress`, `submitted`

This rule does not apply to other assignment types such as `review_provider`, `staff_overflow`, `enterprise_delegated`, `billing_managed`, or `support_managed`.

### Enforcement Options

Option A: SQL partial unique index

```sql
create unique index order_company_assignments_one_active_vendor_per_order
  on public.order_company_assignments (order_id)
  where assignment_type = 'vendor_appraisal'
    and status in ('offered', 'accepted', 'in_progress', 'submitted');
```

Pros:

- strongest race-condition protection
- protects every write path, including future wrappers
- simple invariant tied directly to the table

Cons:

- requires preflight audit for existing conflicting rows before migration
- generic unique-violation error needs friendly mapping
- would block future multi-vendor bid/first-to-accept workflows until deliberately replaced or narrowed

Option B: RPC-level check only

Pros:

- easier custom error message
- can be scoped only to current offer RPC behavior
- easier to bypass later for approved bid workflows

Cons:

- weaker race-condition protection unless combined with locks
- future write paths can accidentally bypass the rule
- still needs careful transaction design

Option C: both partial unique index and RPC-level check

Pros:

- best protection and best user-facing error path
- RPC can raise a stable code before insert
- unique index remains a final concurrency backstop

Cons:

- requires both migration/index validation and RPC patch
- future multi-vendor workflows must intentionally change both the RPC policy and table invariant

Recommendation: use Option C for MVP.

### Race Condition Handling

The offer RPC already locks the source order row with `for update`. A patched RPC-level check should run after that order lock and before the insert:

```sql
if v_assignment_type = 'vendor_appraisal'
   and exists (
     select 1
       from public.order_company_assignments oca
      where oca.order_id = p_order_id
        and oca.assignment_type = 'vendor_appraisal'
        and oca.status in ('offered', 'accepted', 'in_progress', 'submitted')
   ) then
  raise exception 'order_vendor_assignment_active_exists'
    using errcode = '23505';
end if;
```

The partial unique index should still be added as the final race-condition backstop. If two offer paths somehow reach insert at the same time, the index preserves the one-active-vendor invariant.

### Error Code

Recommended stable error message:

```text
order_vendor_assignment_active_exists
```

Reasoning:

- order-scoped
- vendor-assignment specific
- clear that an active packet already exists

Alternative:

```text
vendor_assignment_active_offer_exists
```

Use the recommended code unless product wants to distinguish offered-only packets from accepted/in-progress/submitted packets. MVP should cover all active statuses, so `order_vendor_assignment_active_exists` is more accurate.

Frontend copy should map it to:

```text
This order already has an active vendor offer or assignment.
```

### Internal / Staff Assignment Interaction

This slice should not interact with internal/staff assignment fields:

- `orders.appraiser_id`
- `orders.assigned_to`
- `orders.reviewer_id`
- `orders.current_reviewer_id`

It should also not block non-vendor assignment packet types. Parallel review-provider or staff-overflow packet policy should be decided separately.

### Future Exceptions

Future workflows may intentionally relax or replace the one-active-vendor rule:

- multi-vendor bid requests
- first-to-accept workflows
- availability-only outreach
- parallel review assignment
- reassignment after decline/cancel/revoke
- emergency override by privileged owner/admin

Those should be implemented with explicit workflow state and audit semantics, not by silently bypassing the MVP guard.

## AMC-6E: One Active Vendor Offer Enforcement

Implemented backend-backed enforcement in additive migration `20260601142000_amc_one_active_vendor_offer_guard.sql`.

The migration:

- runs a preflight conflict audit and fails with `order_vendor_assignment_active_conflict` if existing data has multiple active `vendor_appraisal` packets for the same order
- adds partial unique index `order_company_assignments_one_active_vendor_per_order`
- patches `rpc_order_company_assignment_offer(...)` to raise `order_vendor_assignment_active_exists` before insert when an active vendor packet already exists for the order
- keeps non-vendor assignment types unaffected
- preserves existing same-order/same-assigned-company/same-assignment-type uniqueness from `order_company_assignments_current_unique`
- does not write `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, or `orders.current_reviewer_id`

AMC-6E does not add UI, assignment buttons, new permissions, route/nav changes, order behavior changes beyond the assignment-offer guard, or `/amc/*` routes.

### Recommended Next Slice

AMC-6F should add the first explicit `Offer Assignment` UI after enforcing permission visibility and active-offer display:

- show action only on eligible candidate rows
- require explicit owner/admin confirmation
- surface `order_vendor_assignment_active_exists` with friendly copy
- refresh candidate and order assignment panels on success
- keep bidding, multi-vendor offers, automated routing, and first-to-accept deferred

## AMC-6F: Offer Assignment UI Proposal

AMC-6F is proposal/inspection only. It does not implement UI, create assignment offers, create migrations, create RPCs, change schema/RLS, change permissions, change routes/nav, change order behavior, change assignment behavior, or create `/amc/*` routes.

### Recommended Button Placement

The first `Offer Assignment` action should appear inside each eligible candidate card in the read-only Vendor Candidates panel on Order Detail.

Display rules:

- show only in AMC Operations mode
- show only when an order id is present
- show only when the user has `vendors.read`
- show only when the user also has the existing assignment-offer permissions required by the canonical RPC path
- hide or disable when the order already has an active vendor offer/assignment if that state is available to the page
- never show in Internal Operations mode
- never show solely because AMC Operations mode is active

The button label should be:

```text
Offer Assignment
```

The candidate card is the right placement because the owner/admin is choosing one suggested vendor. A separate top-level button would force users to reselect a vendor and would be easier to confuse with generic relationship assignment.

### Confirmation Modal

The candidate offer modal should be narrower than the existing generic relationship offer modal. It should be vendor-candidate aware and should avoid raw JSON editing.

Recommended fields:

- Vendor name: read-only summary from the candidate row.
- Order summary: read-only order number, property address/city/state/ZIP, report or product context, and due date when available.
- Message/note: optional owner-facing instructions mapped to `p_instructions`.
- Due date: optional or required depending on existing assignment policy; if order due date exists, prefill conservatively.
- Review due date: optional.
- Offer expiration date: optional.

Do not expose:

- `relationship_id`
- `vendor_profile_id`
- `vendor_company_id`
- `assignment_type`
- raw `terms` JSON
- raw `handoff_payload` JSON
- candidate snapshot JSON

The candidate snapshot should be included silently through `offerOrderToVendor(...)` so the assignment packet can preserve why the vendor was selected. Terms should not be exposed as a JSON editor in this candidate-specific MVP. If fee/terms are needed later, use structured fields such as fee, payment terms, or special conditions.

Recommended modal copy:

```text
This will send an assignment offer to the vendor.
```

```text
This does not automatically mark the vendor as accepted.
```

### Permission Recommendation

The button should require all existing authorization already enforced by the backend offer RPC:

- `order_company_assignments.offer`
- `relationships.assign_work`
- current-company order read/update authority as enforced by `rpc_order_company_assignment_offer(...)`
- active current-company membership
- active compatible `amc_vendor` relationship

The candidate panel itself remains gated by `vendors.read`, but `vendors.read` must not be enough to offer work.

Recommended MVP: do not introduce `vendors.assign` in AMC-6F. If product later needs a vendor-specific assignment permission, add `vendors.assign` as an additional gate in a separate permission slice. It should not replace the packet lifecycle permissions.

### Active Offer Handling

If active offer state is detectable from existing order assignment data, the UI should avoid showing active `Offer Assignment` buttons and instead show owner-friendly copy near the candidate panel:

```text
This order already has an active vendor offer or assignment.
```

If the user still reaches the backend conflict, map `order_vendor_assignment_active_exists` to the same message. The modal should preserve entered note/date values after the error so the user does not lose context.

The UI should not attempt to enforce the one-active-offer rule on its own. Frontend visibility is a convenience; AMC-6E backend enforcement remains authoritative.

### Success Behavior

On successful offer creation:

- close the confirmation modal
- show a success toast or inline confirmation such as `Assignment offer sent.`
- refresh vendor candidates so the panel reflects current eligibility/warnings
- refresh the Order Detail assignment packet section so the active offer is visible
- consider replacing candidate action buttons with `Offer sent` if the active assignment summary is available

The success state should not imply acceptance. The vendor remains in offered status until the existing assignment lifecycle records acceptance.

### Deferred Behavior

AMC-6F should not include:

- multi-vendor offers
- bid requests
- availability requests
- first-to-accept workflows
- notification customization
- vendor portal acceptance changes
- assignment automation
- fee negotiation
- revoke/cancel UI unless already present in the existing assignment packet section
- new `/amc/*` routes

### Tests Needed

Implementation tests should cover:

- `Offer Assignment` appears on candidate cards in AMC Operations mode with required permissions.
- The button is hidden in Internal Operations mode.
- The button is hidden without `vendors.read`.
- The button is hidden or disabled without assignment-offer permissions.
- The modal renders vendor and order summaries.
- The modal does not expose raw relationship ids, assignment type, terms JSON, handoff JSON, or candidate snapshot JSON.
- Submit calls `offerOrderToVendor(...)` with order id, vendor ids, relationship id, note/date fields, and hidden candidate snapshot.
- `order_vendor_assignment_active_exists` displays `This order already has an active vendor offer or assignment.`
- Success refreshes candidates and assignment packet/order detail data.
- No assign/bid/multi-vendor controls are introduced.

### Implementation Slices

Recommended follow-up slices:

1. AMC-6F.1: active vendor offer visibility audit on Order Detail using existing owner assignment packet data.
2. AMC-6F.2: isolated candidate offer modal component wired to `offerOrderToVendor(...)` in tests only.
3. AMC-6F.3: candidate card button integration with permission gates and refresh callbacks.
4. AMC-6G: active offer/assignment display polish on Order Detail.
5. AMC-6H: owner-side revoke/cancel proposal and implementation only where the existing lifecycle supports it.

## AMC-6F.1: Active Vendor Offer Visibility Audit

AMC-6F.1 is inspection/documentation only. It does not modify runtime code, create migrations, create RPCs, create UI, change schema/RLS, change permissions, change routes/nav, change order behavior, change assignment behavior, or create `/amc/*` routes.

### Existing Data Availability

Order Detail already has the backend read needed to detect active vendor offers/assignments.

Existing frontend/API path:

- `src/pages/orders/OrderDetail.jsx` renders `OwnerOrderAssignmentsPanel` near the company-assignment context.
- `src/features/assignments/components/OwnerOrderAssignmentsPanel.jsx` calls `listOwnerAssignmentsForOrder(orderId)`.
- `src/features/assignments/api.js` maps that call to `rpc_order_company_assignment_list_for_order`.
- `supabase/migrations/20260518035000_order_company_assignment_order_list_rpc.sql` defines the order-scoped summary RPC.

The RPC returns the fields needed for active vendor-offer detection:

- `id`
- `order_id`
- `assigned_company_id`
- `assigned_company_name`
- `relationship_id`
- `relationship_type`
- `relationship_status`
- `assignment_type`
- `status`
- `instructions`
- `offered_at`
- `accepted_at`
- `started_at`
- `submitted_at`
- `completed_at`
- `cancelled_at`
- `revoked_at`
- `due_at`
- `review_due_at`
- `expires_at`

Authorization is already owner/order scoped. The RPC requires current-company membership, `order_company_assignments.read_owner`, current-company order ownership, and `current_app_user_can_read_order(p_order_id)`.

### Detection Rule

An active vendor offer/assignment is any order-scoped assignment summary row where:

- `assignment_type = 'vendor_appraisal'`
- `status in ('offered', 'accepted', 'in_progress', 'submitted')`

This aligns with AMC-6E backend enforcement and the partial unique index. No additional read RPC is required for MVP.

The frontend gap is state sharing, not data availability. Today, `OwnerOrderAssignmentsPanel` loads assignment rows internally, while `VendorAssignmentCandidatesPanel` loads candidate rows independently. To hide candidate offer actions, the next implementation should either:

- lift `listOwnerAssignmentsForOrder(orderId)` into `OrderDetail` and pass active vendor assignment state into both panels, or
- create a small shared hook such as `useOwnerAssignmentsForOrder(orderId)` that both panels can consume without duplicate policy logic.

Recommended MVP: lift the read into `OrderDetail` first if the change is small; otherwise add a shared hook. Do not create another RPC solely for active vendor offer detection.

### Display Recommendation

If an active vendor assignment exists, Order Detail should show a compact vendor assignment card near the candidate/assignment context instead of candidate offer buttons.

Example display:

```text
Vendor Assignment
Offered to:
ABC Valuation

Status:
Offered

Sent:
2026-06-01
```

Additional fields to show when available:

- due date
- review due date
- expiration date for offered packets
- network status as owner-friendly copy
- `Open Packet` link to the existing assignment packet page

Owner-facing status copy:

| Stored status | Display guidance |
|---|---|
| `offered` | Offer sent |
| `accepted` | Accepted |
| `in_progress` | In progress |
| `submitted` | Submitted |

Do not expose raw `vendor_appraisal`, relationship ids, or relationship terminology in the candidate action area.

### Terminal / Historical Statuses

Terminal or historical vendor packets should not block new candidate offer actions:

- `declined`
- `revoked`
- `completed`
- `cancelled`

Recommended display:

- Keep historical rows visible in the existing Company Assignments panel or a historical assignment section.
- Do not show them as the active Vendor Assignment card.
- Do not suppress candidate `Offer Assignment` actions solely because a terminal vendor assignment exists.
- If several historical vendor packets exist, show the most recent historical state only as context, not as a blocker.

### Safest UI Rule

Use this rule before exposing candidate offer actions:

```text
If active vendor assignment exists:
  show active Vendor Assignment card
  hide candidate Offer Assignment actions
  keep candidate matching read-only if useful

If no active vendor assignment exists:
  show candidate Offer Assignment actions for eligible candidates
```

The backend remains authoritative. Even if frontend data is stale, AMC-6E will raise `order_vendor_assignment_active_exists`.

### Recommended Next Slice

AMC-6F.2 should implement active vendor assignment state plumbing without adding the candidate offer button yet:

- centralize or lift `listOwnerAssignmentsForOrder(orderId)` state in Order Detail
- derive `activeVendorAssignment`
- render or prepare a compact active Vendor Assignment summary
- pass `activeVendorAssignment` or `hasActiveVendorAssignment` to the candidate panel
- keep candidate actions hidden because the offer button is still deferred

AMC-6F.3 can then add the candidate-specific offer modal and button with the active-offer guard already in place.

## AMC-6F.2: Active Vendor Assignment State Sharing

AMC-6F.2 implements frontend state sharing only. It does not add offer buttons, bid requests, assignment actions, backend/API/schema/RLS changes, permission changes, route/nav changes, order behavior changes, assignment behavior changes, or `/amc/*` routes.

Implementation result:

- `OrderDetail` now reuses `listOwnerAssignmentsForOrder(orderId)` when the user has owner assignment read access and either the existing assignment panel or AMC vendor candidate panel is visible.
- `OrderDetail` derives `activeVendorAssignment` from existing rows where `assignment_type = 'vendor_appraisal'` and status is `offered`, `accepted`, `in_progress`, or `submitted`.
- Historical vendor packet statuses `declined`, `revoked`, `completed`, and `cancelled` do not produce an active assignment blocker.
- `OwnerOrderAssignmentsPanel` can receive controlled assignment rows/loading/error/refresh props while preserving its existing self-loading fallback.
- `VendorAssignmentCandidatesPanel` receives `activeVendorAssignment` and displays a read-only note: `This order already has an active vendor offer or assignment.`

No active candidate offer action exists yet. The note is advisory UI state; AMC-6E backend enforcement remains authoritative.

## AMC-6F.3: Candidate Offer Button and Confirmation Modal

AMC-6F.3 adds the first candidate-specific write action on Order Detail while preserving the existing assignment packet lifecycle.

Implementation result:

- Eligible candidate cards can show `Offer Assignment` only when the panel is enabled, no active vendor assignment exists, candidate ids are complete, and the user has existing assignment-offer authority.
- The confirmation modal shows owner-facing vendor, match strength, score, best coverage match, optional message, and optional date fields.
- The modal copy states that the action sends an offer and that the vendor must accept before work is considered assigned.
- The UI does not expose relationship ids, vendor profile ids, assignment type, terms JSON, handoff payload JSON, or candidate snapshot JSON.
- Submit uses `offerOrderToVendor(...)`, includes a hidden candidate snapshot, closes on success, and refreshes Order Detail owner assignment rows so the active-assignment note can appear.
- Backend `order_vendor_assignment_active_exists` is mapped to `This order already has an active vendor offer or assignment.` and preserves modal input.

This slice does not add bids, multi-vendor offers, notification customization, vendor portal acceptance UI, revoke UI, new assignment tables, routes/nav, schema/RLS changes, order behavior changes, or `/amc/*` routes.

### AMC-6 Roadmap

- AMC-6B: Assignment Offer RPC/API proposal. Reuse existing assignment packet RPCs; define vendor-candidate wrapper and one-active-offer doctrine.
- AMC-6C: Assignment Offer API implementation. Candidate-aware frontend wrapper added.
- AMC-6D: One-active-vendor-offer enforcement proposal. Recommend RPC check plus SQL partial unique index.
- AMC-6E: One-active-vendor-offer enforcement implementation before UI exposure.
- AMC-6F: Offer Assignment UI proposal. Recommend candidate-card button and candidate-specific confirmation modal; implementation still deferred.
- AMC-6F.1: Active offer visibility audit before exposing the button. Existing order-scoped assignment summary data is sufficient; frontend state sharing is the implementation gap.
- AMC-6F.2: Active vendor assignment state sharing between Order Detail, the existing assignments panel, and the candidate panel.
- AMC-6F.3: Candidate-specific offer button and confirmation modal implementation.
- AMC-6F.4: Active Vendor Assignment summary card polish after offers are sent.
- AMC-6G: Active offer/assignment display on Order Detail. Make current offer state visible before adding broader controls.
- AMC-6H: Revoke/cancel handling. Add owner-side cancel/revoke controls only where existing lifecycle supports them.
- AMC-6I: Bid workflow. Future multi-vendor bid/availability request doctrine and implementation.

### AMC-5J: Assignment Offer Integration Proposal

Connect selected candidates to the existing assignment-offer flow using `order_company_assignments`. Assignment packet creation remains an explicit user action.
