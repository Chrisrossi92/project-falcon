# AMC Order Lifecycle

## Purpose

The AMC Order Lifecycle defines how AMC Operations Mode should represent order progress while reusing Falcon's shared order engine.

## Shared Order Engine

AMC orders should use Falcon's shared order infrastructure wherever possible.

The goal is one order engine with different operational lenses, not a disconnected AMC order system.

## Workspace Boundary Doctrine

AMC Operations is a workspace context, not a view filter over Internal Operations. The platform-wide
workspace doctrine lives in `docs/FALCON_WORKSPACE_DOCTRINE_NAVIGATION_ARCHITECTURE.md`.

When users switch between Internal Operations and AMC Operations, Falcon should reset workspace
context, clear workspace-specific filters/selections, navigate to that workspace's dashboard, and
reload scoped data. Route persistence must not show an Internal Operations order inside AMC
Operations or an AMC Operations order inside Internal Operations.

AMC Operations should use procurement/vendor language and visual identity cues that distinguish it
from Internal Operations while preserving the shared Falcon platform. Future Vendor Workspace
surfaces are not AMC subpages; AMC-7 tokenized vendor bid links should be designed as the
limited-access version of a future Vendor Order Detail screen. Vendor Workbench doctrine lives in
`docs/vendor/VENDOR_WORKBENCH_DOCTRINE.md`.

## AMC-6H: Order Scope Doctrine and Data Separation Audit

AMC-6H is inspection/documentation only. It does not change code, migrations, queries, UI, schema/RLS, route/navigation, or assignment behavior.

### Doctrine

Falcon should remain one platform with one shared order engine. Operations Mode changes workflow and data scope; it must not become a substitute for authorization.

Internal Operations orders are orders the current company expects to fulfill primarily through internal production staff, appraisers, reviewers, and internal assignment columns such as `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, or `orders.current_reviewer_id`.

AMC Operations orders are orders the current company manages for external vendor fulfillment through Vendor Directory coverage, `company_relationships`, and `order_company_assignments` packets. A vendor offer should create or advance assignment packet state; it should not write vendors into internal appraiser/reviewer columns.

Candidate and offer UI should only appear for AMC-scoped orders. Showing candidate actions on an internal production order is unsafe because users may offer vendor work for orders that should remain in staff/appraiser production.

### Current Data Findings

Existing order and read-model fields provide useful context but do not yet provide a clean authoritative scope:

- `orders.company_id` identifies the owner/current company and is already used as tenant scope.
- `orders.client_id` identifies the ordering client for the current company.
- `orders.managing_amc_id` exists and is projected in `v_orders_frontend_v4` with `amc_name`; current create/update RPCs validate it as an attachable current-company AMC client.
- `orders.amc_id` exists as a legacy AMC reference and is projected as a fallback AMC name.
- `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, and related fields represent internal production assignment.
- `order_company_assignments` represents cross-company packet assignment and is the canonical vendor offer/work packet model.
- Current `/orders` and dashboard reads use `v_orders_frontend_v4` through frontend filters; they do not currently filter by Internal vs AMC order scope.

Existing `managing_amc_id` is not enough by itself to define AMC Operations scope. It currently represents a managed AMC/client relationship on an order, not a declared fulfillment model. Some historical/internal orders may have AMC/client metadata while still being fulfilled internally.

### Schema Gap

Falcon needs an explicit order-scope model before AMC Operations can safely filter orders and before vendor offer testing should be treated as product-ready.

Recommended minimal field/model:

- Add an explicit order scope or fulfillment model field on `orders`, for example `operations_scope` or `fulfillment_model`.
- Supported MVP values should distinguish at least:
  - `internal_operations`
  - `amc_operations`
- Future values can be considered for hybrid or client/vendor portal workflows only after product doctrine is defined.

This field should be owned by backend order create/update RPCs and included in order read projections. It should not be inferred at runtime solely from operations mode, vendor candidates, client category, or company type.

### Client Scope

Clients should eventually be mode-aware as well, but client mode should follow order behavior rather than create a separate product:

- Internal Operations client views should prioritize clients associated with internal production orders.
- AMC Operations client views should prioritize lender/client accounts whose orders are managed for vendor fulfillment.
- A client may appear in both modes if the same company legitimately handles both internal and AMC-scoped work for that client.

Client filtering should be implemented as mode-aware query scope, not as separate `/amc/*` client routes.

### Route Doctrine

Use the same `/orders` route with mode-aware data queries/filters. Do not create a separate `/amc/orders` route tree for MVP.

The mode-aware read layer should:

- keep route and shell composition shared
- filter order lists/dashboards by explicit order scope
- prevent candidate/offer UI on non-AMC-scoped orders
- preserve backend permission checks as the source of authority

### Existing Continental Order Classification

Until an explicit scope field exists, existing Continental internal orders should be treated as Internal Operations by default. Historical orders should not be automatically reclassified as AMC Operations merely because they have client or AMC-like metadata.

If real AMC-managed orders already exist, they need an explicit migration/backfill plan with human-reviewed criteria before being surfaced in AMC Operations. Do not infer them from vendor candidates or `managing_amc_id` alone.

### Preconditions Before Offer Assignment Testing

Before testing candidate `Offer Assignment` as product behavior:

- order scope must be explicit on the order/read model
- AMC mode `/orders`, dashboard, and order detail must filter or guard by AMC scope
- candidate panel must require both AMC Operations mode and AMC-scoped order
- offer button must be hidden/disabled for internal-scoped orders
- test seed data must include at least one known AMC-scoped order with vendor coverage and one internal-scoped order that remains hidden or ineligible in AMC mode
- backend offer RPC should continue to enforce owner-company, relationship, permission, and one-active-offer rules

### Recommended Implementation Slices

1. AMC-6H.1: Order scope field proposal. Define exact column name, allowed values, defaults, migration/backfill strategy, and read-projection changes.
2. AMC-6H.2: Order scope backend implementation. Add schema/RPC/read projection support and default existing orders to Internal Operations unless explicitly backfilled.
3. AMC-6H.3: Backend order-scope foundation and candidate/offer RPC guards.
4. AMC-6H.4: Mode-aware order/dashboard API filters and candidate panel visibility gating.
5. AMC-6H.5: AMC test order creation/backfill path. Add safe seed/test fixtures for AMC-scoped orders and verify internal orders remain out of AMC Operations.

## AMC-6H.1: Order Scope and Compliance Separation Doctrine

AMC-6H.1 is documentation/proposal only. It does not change runtime code, migrations, queries, UI, schema/RLS, route/navigation, or assignment behavior.

### Compliance Doctrine

Falcon remains one platform, but Internal Operations and AMC Operations must be treated as separate operational lanes. This separation is legally and compliance-sensitive because the two lanes can imply different assignment eligibility, vendor independence, audit expectations, client communication paths, review responsibilities, and operational controls.

The order lane must be explicit on the order record. It must not be inferred from:

- the current UI mode
- the user's role
- a route or dashboard selection
- `orders.managing_amc_id`
- `orders.amc_id`
- vendor coverage availability
- whether a candidate RPC can find matching vendors

AMC orders must route only through eligible external vendor workflow and assignment packets. Internal orders must route only through internal staff/appraiser/reviewer workflow unless a later approved conversion workflow changes the order lane with audit history. Candidate and offer UI must be impossible on internal orders, including through stale frontend state.

Internal staff, appraisers, and reviewers should not see AMC operational tools unless explicitly authorized. AMC mode availability remains a user/tooling gate; it is not enough to classify order data.

### Schema Recommendation

Recommended field:

```text
orders.operations_scope text not null default 'internal_operations'
```

Recommended MVP values:

- `internal_operations`
- `amc_operations`

Deferred value:

- `hybrid`

`operations_scope` is preferred over `fulfillment_model` because the separation is broader than who performs the work. It governs visibility, workflow lane, candidate eligibility, assignment mechanism, audit posture, and reporting. A future `fulfillment_model` could still exist as a subordinate concept if product needs more detailed execution modeling.

Alternative considered:

```text
orders.fulfillment_model in ('internal_staff', 'vendor_network')
```

This is less complete for Falcon's needs because it describes execution but not the surrounding operational lane. For example, an AMC-scoped order might still have internal review or quality-control work, and an internal order might use internal overflow processes. `operations_scope` remains clearer as the compliance boundary.

### Backfill Plan

Default existing orders to `internal_operations`.

Do not automatically classify existing Continental orders as AMC Operations based on `managing_amc_id`, `amc_id`, client category, company type, or historical assignment rows. Those fields may describe relationships or legacy metadata, but they are not sufficient proof of vendor-network management.

Recommended backfill sequence:

1. Add the field with default `internal_operations`.
2. Backfill all existing null values to `internal_operations`.
3. Produce an audit report of possible AMC-managed candidates using non-authoritative signals such as `managing_amc_id`, active vendor packets, client category, or manual known order lists.
4. Require human review before updating any existing order to `amc_operations`.
5. Record the actor, timestamp, source criteria, and reason for each reviewed scope change.

### Order Creation Scope

Order creation must choose scope explicitly through backend-owned create/update paths.

Recommended MVP rules:

- Internal Operations create flow defaults to `internal_operations`.
- AMC Operations create flow defaults to `amc_operations`.
- The frontend may suggest the default based on mode, but the backend RPC must validate and persist the explicit value.
- Users should see clear lane copy before creating an AMC order, such as `Managed for vendor network fulfillment`.
- Internal order create flows should not expose vendor candidates, vendor offer controls, or vendor packet language.

Changing an existing order's scope should be a controlled operation, not a casual edit field. A future conversion flow should require permission, reason, and audit logging.

### Client Scope

Clients should be mode-aware but not hard-partitioned by default.

Recommended doctrine:

- A client can have internal-scoped orders, AMC-scoped orders, or both.
- Client Directory views can be filtered by order scope once order scope exists.
- Client records should not become the sole source of order scope.
- Optional future client metadata may define a default order scope for new orders, but each order must still store explicit scope.

This prevents a client-level mistake from incorrectly moving all future or historical orders across operational lanes.

### UI Guardrails

UI should reduce cross-lane mistakes:

- AMC mode order lists and dashboards should show only `amc_operations` orders.
- Internal mode order lists and dashboards should show only `internal_operations` orders unless a deliberate cross-scope admin/reporting view is built.
- Order Detail should display a compact lane badge, for example `Internal Operations` or `AMC Operations`.
- Candidate and `Offer Assignment` controls should be absent for internal-scoped orders.
- Internal assignment controls should be absent or clearly disabled for AMC-scoped orders where vendor packet workflow is required.
- Create/edit screens should avoid ambiguous labels like "assignment" when the lane requires either staff assignment or vendor offer.

### Backend Guards Required Before Offer Testing

Before candidate offers are tested as product behavior, backend and read-model guards should exist:

- `orders.operations_scope` exists and is projected in `v_orders_frontend_v4` and detail reads.
- `rpc_vendor_assignment_candidates(p_order_id)` rejects non-`amc_operations` orders with a stable error.
- `rpc_order_company_assignment_offer(...)` rejects `vendor_appraisal` offers for non-`amc_operations` orders with a stable error.
- Order list/dashboard reads support explicit scope filtering.
- Any order-scope update path validates allowed values and logs audit history.
- Existing owner-company, relationship, permission, and one-active-vendor-offer checks remain unchanged.

Recommended stable backend error:

```text
order_scope_not_amc_operations
```

User-facing copy:

```text
Vendor offers are only available for AMC Operations orders.
```

### Audit and History

The following history must be preserved:

- original order creation scope
- scope changes, including previous scope, new scope, actor, timestamp, and reason
- vendor candidate snapshot used when an offer is created
- assignment packet lifecycle events
- internal assignment history for internal-scoped orders
- file/activity/client communication history

Changing scope must not erase previous activity, assignment packets, internal assignment fields, submissions, or client communications. If a future conversion workflow allows moving an order between lanes, it should preserve old lane history and start a new auditable lane segment rather than rewriting history.

### Recommended Next Slice

AMC-6H.2 should be a migration/RPC proposal, not implementation yet:

- choose final column name and check constraint
- define read projection changes
- define create/update RPC payload and validation behavior
- define audit event model for scope changes
- define stable backend errors
- define fixtures for one internal order and one AMC order

## AMC-6H.2: Order Scope Migration Proposal

AMC-6H.2 is proposal/inspection only. It does not create migrations, modify code, change queries, change UI, change schema/RLS, or change assignment behavior.

### Proposed Migration Design

Add an explicit order scope column:

```sql
alter table public.orders
  add column if not exists operations_scope text not null default 'internal_operations';

alter table public.orders
  add constraint orders_operations_scope_valid
  check (operations_scope in ('internal_operations', 'amc_operations'));
```

Backfill:

```sql
update public.orders
   set operations_scope = 'internal_operations'
 where operations_scope is null;
```

Recommended comments:

- `orders.operations_scope`: `Compliance-sensitive operational lane for the order. internal_operations orders use internal staff/appraiser workflow; amc_operations orders use AMC/vendor-network workflow. Must not be inferred from UI mode.`
- constraint comment or migration comment should note `hybrid` is deferred.

Recommended indexes:

```sql
create index if not exists idx_orders_company_operations_scope
  on public.orders (company_id, operations_scope);

create index if not exists idx_orders_company_scope_status_created
  on public.orders (company_id, operations_scope, status, created_at desc);
```

The first index supports basic mode-aware list filters. The second is optional but likely useful because `/orders` and dashboard reads commonly combine company, status/active filters, and recent ordering. If index churn is a concern, start with `idx_orders_company_operations_scope` only and add the compound index after query-plan review.

Read projections to update:

- `v_orders_frontend_v4`
- `v_orders_active_frontend_v4`
- any order list/detail RPCs or projections that select explicit order columns
- frontend order mappers/types/tests that expect order detail/list shape

### Runtime and Query Impact

Order list behavior:

- Internal Operations mode should request `operations_scope = internal_operations`.
- AMC Operations mode should request `operations_scope = amc_operations`.
- Same `/orders` route remains.
- No `/amc/*` route tree should be introduced.

Dashboard behavior:

- Internal Operations dashboard should summarize and list only internal-scoped orders.
- AMC Operations dashboard should summarize and list only AMC-scoped orders.
- Assignment-only/received-work dashboards remain packet-driven and should not use order scope as authorization.

Candidate RPC behavior:

- `rpc_vendor_assignment_candidates(p_order_id uuid)` should load the order and reject it unless `operations_scope = 'amc_operations'`.
- Stable error: `order_scope_not_amc_operations`.

Assignment offer behavior:

- `rpc_order_company_assignment_offer(...)` should reject `p_assignment_type = 'vendor_appraisal'` unless the order is `amc_operations`.
- Non-vendor assignment types should preserve existing behavior unless a later doctrine changes their lane restrictions.
- Existing owner-company, relationship, assignment type compatibility, permission, and one-active-vendor-offer guards remain in place.

### Order Creation Scope

Backend create/update RPCs should own scope persistence:

- Internal create path defaults to `internal_operations`.
- AMC create path may submit `operations_scope = amc_operations`.
- If no explicit scope is submitted, backend defaults to `internal_operations`.
- Scope values outside the check constraint should raise a stable validation error such as `order_operations_scope_invalid`.
- Switching scope on an existing order should be deferred to a dedicated conversion RPC with reason/audit, not exposed as a generic edit field.

Potential create payload:

```json
{
  "operations_scope": "amc_operations"
}
```

Frontend mode can suggest the value, but backend must validate it.

### Existing Data Plan

All existing orders default to `internal_operations`.

Future audit/backfill should be separate from the additive schema migration:

- produce candidate list of possible AMC-managed orders using non-authoritative signals
- review manually
- update approved orders to `amc_operations`
- record source criteria, actor, timestamp, and reason

Do not silently reclassify based on `managing_amc_id`, `amc_id`, active vendor packets, or client metadata alone.

### UI Implications

Until AMC-scoped test orders exist, AMC mode `/orders` and dashboard may legitimately show an empty state.

Expected UI after implementation:

- AMC mode order lists show only AMC orders.
- Internal mode order lists show only internal orders.
- Order Detail displays the order lane.
- Candidate panel and `Offer Assignment` action are absent for internal-scoped orders.
- New Order in AMC mode should clearly indicate the order is being created for AMC/vendor-network workflow.
- Internal staff/appraiser/reviewer surfaces remain internal-scoped by default.

### Testing Plan

Schema/migration tests:

- column exists
- default is `internal_operations`
- check constraint allows only `internal_operations` and `amc_operations`
- comments exist
- existing orders backfill to internal
- index exists where approved

Read/query tests:

- order projections include `operations_scope`
- list/dashboard filters pass scope for operations mode
- Internal mode excludes AMC orders
- AMC mode excludes internal orders
- empty AMC mode state renders safely

RPC guard tests:

- candidate RPC rejects internal-scoped orders with `order_scope_not_amc_operations`
- candidate RPC allows AMC-scoped orders when existing permissions and vendor conditions pass
- vendor-appraisal offer RPC rejects internal-scoped orders with `order_scope_not_amc_operations`
- non-vendor assignment offer behavior remains unchanged
- one-active-vendor-offer guard still applies after scope guard

UI tests:

- candidate panel hidden on internal order even in AMC mode
- offer button hidden on internal order
- candidate panel appears on AMC order with `vendors.read`
- offer button appears only on AMC order with assignment-offer authority and complete candidate data

### Risks

- Classifying historical orders incorrectly could expose internal production work in AMC queues.
- Relying on UI mode alone would still allow stale or direct-link mistakes.
- Adding only a frontend filter without RPC guards would leave offer/candidate backend paths unsafe.
- Overusing client-level defaults could misclassify mixed clients.
- Scope changes without audit could obscure why an order moved between compliance lanes.

### Next Slice

AMC-6H.3 should propose or implement the additive migration and read-projection updates after the column name, constraint, indexes, stable errors, and audit expectations are accepted.

## AMC-6H.3: Order Operations Scope Foundation

AMC-6H.3 adds the backend foundation for explicit order lane separation. It does not add mode-aware list/dashboard filtering, order creation UI changes, route/nav changes, assignment UI changes, or `/amc/*` routes.

Implementation result:

- Added `orders.operations_scope text not null default 'internal_operations'`.
- Added `orders_operations_scope_valid` for `internal_operations` and `amc_operations`.
- Backfilled existing null scope values to `internal_operations`.
- Added `idx_orders_company_operations_scope`.
- Documented `operations_scope` as a compliance-sensitive operational lane.
- Projected `operations_scope` through `v_orders_frontend_v4` and `v_orders_active_frontend_v4`.
- Added frontend order service selection of `operations_scope` for list/detail reads.
- Patched `rpc_vendor_assignment_candidates(p_order_id)` to reject non-`amc_operations` orders with `order_scope_not_amc_operations`.
- Patched `rpc_order_company_assignment_offer(...)` to reject `vendor_appraisal` offers on non-`amc_operations` orders with the same error.
- Preserved non-vendor assignment offer behavior.

Mode-aware filtering remains deferred. Until AMC-6H.4, AMC mode can still use shared list/dashboard reads, but candidate and vendor-appraisal offer backend paths now have scope guards.

## AMC-6H.4: Mode-Aware Orders and Dashboard Filtering

AMC-6H.4 uses the explicit order lane to separate shared order surfaces by Operations Mode.

Implementation result:

- `/orders` remains the shared route.
- Internal Operations mode requests `operations_scope = 'internal_operations'`.
- AMC Operations mode requests `operations_scope = 'amc_operations'`.
- Queue-derived order reads use the same scope as the visible Orders list.
- Dashboard order rows and order-based KPI counts use the same mode-derived scope.
- Order row mapping preserves projected `operations_scope` for downstream UI guardrails.
- Order Detail hides the Vendor Candidates panel unless the loaded order is AMC-scoped and the user is in AMC Operations with `vendors.read`.

Existing orders default to `internal_operations`, so AMC Operations order queues can be empty until explicit AMC-scoped orders exist. This is the intended compliance-safe behavior.

This slice does not change order creation UI, add AMC order creation, add routes/nav, change permissions, change schema, add `/amc/*` routes, or alter assignment behavior beyond suppressing candidate/offer UI on internal-scoped orders.

## AMC-6H.5: AMC Test Order Data Plan

AMC-6H.5 is documentation/proposal only. It does not create seed files, migrations, UI, routes/nav, schema/RLS changes, permission changes, or assignment behavior.

Recommended test-data approach:

- Add a manual/demo SQL seed later for one clearly labeled AMC-scoped test order.
- Do not bulk-backfill existing orders to `amc_operations`.
- Do not add an order-scope edit UI yet.
- Do not add an admin-only scope toggle until audit, permission, and history requirements are defined.
- Keep existing Continental/internal orders classified as `internal_operations` unless reviewed through a deliberate future backfill process.

Why manual/demo seed first:

- Existing orders default to `internal_operations`, which is the compliance-safe baseline.
- A manual seed allows local validation of AMC Orders, Dashboard counts, candidate matching, and offer guards without implying a production classification process.
- A seed can be explicit, reversible, and limited to local/demo environments.
- It avoids giving users a premature scope toggle that could misclassify live internal production orders.

Recommended future manual seed shape:

```sql
-- Example only; do not run as production backfill.
insert into public.orders (
  company_id,
  operations_scope,
  order_number,
  manual_client_name,
  property_address,
  city,
  state,
  county,
  postal_code,
  property_type,
  report_type,
  status,
  created_at,
  updated_at
) values (
  public.current_company_id(),
  'amc_operations',
  'AMC-DEMO-001',
  'AMC Demo Lender',
  '100 Demo Ave',
  'Columbus',
  'OH',
  'Franklin',
  '43215',
  'Commercial',
  'Appraisal',
  'new',
  now(),
  now()
);
```

Minimum candidate-matching fields:

- `operations_scope = 'amc_operations'`
- state, such as `OH`
- county, such as `Franklin`, when testing county coverage
- ZIP/postal code, such as `43215`, when testing ZIP coverage
- `property_type`, such as `Commercial`, `Multifamily`, `Industrial`, `Land`, or `Residential`
- `report_type`, such as `Appraisal`, `Restricted Appraisal`, `Construction Draw`, or `Review`
- status that remains visible in active order lists, such as `new`
- current-company ownership through `company_id`

Order creation doctrine:

- Normal order creation should continue to default to `internal_operations`.
- A future AMC creation path may set `operations_scope = 'amc_operations'` explicitly.
- The user-facing choice should be lane-aware, not a raw technical field.
- Suggested future owner/admin copy: `Fulfillment lane: Internal Operations / AMC Operations`.
- The UI should explain that AMC Operations orders can be offered to external vendors; Internal Operations orders stay in staff/appraiser workflow.

Admin-only scope toggle proposal:

- Defer for now.
- If added later, it should be owner/admin only, audited, require a reason, and be blocked once incompatible assignment state exists.
- It should not be a casual edit field on the order form.

Recommended next slice:

AMC-6H.6 should add a local/manual demo seed file for a single AMC-scoped test order, with comments that it is non-production test data and does not classify existing internal orders.

## AMC-6H.6: AMC Test Order Seed Implementation

AMC-6H.6 adds a manual/local demo seed:

```text
supabase/manual/20260602_amc_test_order_seed.sql
```

Load locally after migrations through AMC-6H.4:

```bash
psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/manual/20260602_amc_test_order_seed.sql
```

Seed behavior:

- Reuses `falcon_default` as the owner company.
- Creates or updates one clearly labeled demo vendor: `Franklin Commercial Valuation`.
- Creates or updates one active AMC-scoped order: `AMC-DEMO-001`.
- Sets `operations_scope = 'amc_operations'`.
- Uses Columbus/Franklin County, Ohio test geography: `OH`, `Franklin`, `43215`.
- Uses `property_type = 'Commercial'` and `report_type = 'Appraisal'`.
- Adds active vendor coverage rows for Franklin County/ZIP `43215` with `commercial` and `appraisal` product slugs.
- Creates no assignments, offers, bid requests, notifications, users, permissions, routes/nav, schema/RLS changes, or `/amc/*` routes.
- Does not alter existing production/internal orders or backfill historical records.

Expected local behavior:

- Internal Operations `/orders` should not show `AMC-DEMO-001`.
- AMC Operations `/orders` should show `AMC-DEMO-001`.
- Order Detail for `AMC-DEMO-001` in AMC Operations mode can render Vendor Candidates for users with `vendors.read`.
- Candidate matching should include `Franklin Commercial Valuation` when the vendor candidate RPC and vendor demo data are available.
- Assignment offers are still governed by existing permissions, active-assignment guardrails, and the `amc_operations` scope guard.

## Internal Lifecycle vs AMC Lifecycle

Internal Operations focuses on:

- appraiser assignment
- reviewer assignment
- internal production
- split/revenue tracking
- review handoff

AMC Operations focuses on:

- client intake
- vendor assignment
- vendor progress
- review/delivery
- client service
- margin and vendor performance

## MVP AMC Statuses

MVP AMC statuses:

- new
- assigned
- in_progress
- review
- delivered
- complete

Status labels may be hardcoded for MVP, but they should be treated as defaults rather than permanent rules.

## Hold/Escalation Concepts

AMC workflow should leave room for:

- hold reasons
- client delays
- vendor delays
- escalation flags
- late-work tracking
- stalled assignment tracking

Hold and escalation behavior should be documented before implementation because they affect reporting, notifications, and lifecycle state.

## Assignment State

Assignment state may differ from lifecycle status.

Future assignment states may include:

- unassigned
- outreach sent
- accepted
- declined
- assigned
- reassigned

Assignment offers for AMC vendor candidates should reuse the existing assignment packet lifecycle. Candidate selection is advisory; only an explicit offer action creates an `order_company_assignments` packet. MVP vendor offers should be single-vendor and should not create bidding, automated routing, or multi-vendor first-to-accept behavior until separately approved.

AMC-6C adds frontend API support for mapping a selected vendor candidate into the existing assignment offer RPC path. It does not add UI, lifecycle states, or automatic assignment behavior.

AMC-6E implements backend-backed one-active-vendor-offer enforcement for MVP: one active `vendor_appraisal` packet per order across `offered`, `accepted`, `in_progress`, and `submitted` statuses. Declined, completed, cancelled, and revoked packets remain historical and do not block a later vendor offer.

AMC-6F proposes the first candidate-aware `Offer Assignment` UI without implementing it. The recommended UI is a candidate-card action on Order Detail in AMC Operations mode, gated by existing assignment-offer permissions plus candidate visibility, with a confirmation modal for message, due date, optional review due date, and optional expiration. The modal should include the candidate snapshot silently and should not expose raw relationship ids, assignment type, terms JSON, or handoff JSON. Backend `order_vendor_assignment_active_exists` should display as "This order already has an active vendor offer or assignment."

AMC-6F.1 audits active vendor offer visibility before adding the button. Order Detail already has the needed order-scoped assignment summary through `rpc_order_company_assignment_list_for_order(uuid)`, including `assignment_type`, `status`, assigned company name, relationship status, and lifecycle timestamps. Active vendor packets are `vendor_appraisal` rows in `offered`, `accepted`, `in_progress`, or `submitted` status. No new read RPC is required for MVP; the implementation gap is sharing that loaded assignment state with the candidate panel so active vendor offers can display as a Vendor Assignment summary and candidate offer actions can stay hidden.

AMC-6F.2 shares active vendor assignment state on Order Detail without adding offer actions. Order Detail now loads the existing owner assignment rows once when the user can read owner assignments and assignment/candidate surfaces are visible, derives `activeVendorAssignment`, passes controlled rows into the existing assignments panel, and passes active assignment state into the vendor candidate panel. The candidate panel displays a read-only active-offer note when applicable. Historical statuses remain non-blocking.

AMC-6F.3 adds the candidate-card `Offer Assignment` button and confirmation modal on Order Detail. The action uses the existing `offerOrderToVendor(...)` wrapper and canonical `rpc_order_company_assignment_offer(...)` lifecycle path, includes a hidden candidate snapshot, refreshes owner assignment rows after success, and maps `order_vendor_assignment_active_exists` to "This order already has an active vendor offer or assignment." The modal does not expose raw relationship ids, vendor profile ids, assignment type, terms JSON, handoff JSON, or candidate snapshot JSON. No new lifecycle tables, routes/nav, schema/RLS changes, bid workflow, revoke UI, vendor portal acceptance UI, or `/amc/*` routes are introduced.

AMC-6J defines future multi-vendor bid request doctrine. Candidate matching recommends vendors; bid request outreach asks multiple vendors for availability, fee, turn time/date, and comments; assignment offer happens only after an owner/admin selects a vendor or bid. Bid requests are not assignments and should not create active `vendor_appraisal` assignment packets. The current `Offer Assignment` action remains a direct-award MVP path, but once bidding exists it should be visually secondary to `Request Bids` / `Request Availability` for orders where vendor selection is still open.

Future bid request records should track requested client due date, requested vendor report due-to-AMC date, optional internal review due date, response expiration, requester, vendor responses, proposed fee, proposed turn time/date, vendor comments, and selected/declined/expired outcomes. AMC may either select directly from responses or later present bid options to the client for approval. Client-facing bid approval, vendor portal response, notifications/reminders, automatic lowest-bid selection, first-to-accept, and multi-vendor assignment offers remain deferred.

AMC-6J.1 resets current candidate action copy so direct assignment does not read as the primary long-term AMC workflow. The `Offer Assignment` action remains available for known-vendor direct awards, but candidate cards label that area as `Direct award` and state that multi-vendor bid requests are planned. This copy change does not add bid requests, multi-select, backend changes, route/nav changes, or assignment behavior changes.

AMC-6K proposes the future bid request schema without implementation. Recommended model:

- `order_vendor_bid_requests`: parent outreach cycle for an AMC-scoped order.
- `order_vendor_bid_request_recipients`: one row per vendor recipient.
- `order_vendor_bid_responses`: vendor fee, turn time/date, and comments.

Bid request lifecycle remains separate from assignment packet lifecycle. Request-level states should include `draft`, `sent`, `partially_responded`, `closed`, `cancelled`, and `expired`. Recipient-level states should include `pending`, `sent`, `viewed`, `responded`, `declined`, `expired`, `cancelled`, `selected`, and `not_selected`. Selecting a bid should convert through the existing assignment-offer path and include candidate/bid snapshots in handoff metadata. Bid request creation and vendor response must not create assignment packets.

Recommended bid-specific permissions are `bid_requests.read`, `bid_requests.create`, `bid_requests.update`, and `bid_requests.select`. These are preferred long term because bid outreach is not assignment creation. A temporary bridge using existing assignment-offer authority plus `vendors.read` can be considered only if explicitly documented.

AMC-6L turns the bid doctrine into a concrete migration plan without implementation. The proposed additive tables are `order_vendor_bid_requests`, `order_vendor_bid_request_recipients`, and `order_vendor_bid_responses`, with service-role-only direct access, RLS enabled, status check constraints, lifecycle timestamps, comments, and indexes for company/order/status, recipient vendor lookup, and selected/submitted responses. Structural constraints should prevent duplicate recipients inside one request, while cross-request duplicate-open outreach for the same order/vendor should be enforced by RPCs unless the recipient table later denormalizes `order_id`.

Permission seeding should be a separate migration from schema foundation. Owner/Admin templates should receive `bid_requests.read`, `bid_requests.create`, `bid_requests.update`, and `bid_requests.select`; vendor-side bid response permissions and portal access remain deferred. Bid request creation, response submission, and selection must not create assignment packets until the selected bid is converted through the existing assignment-offer RPC and active-offer guard.

AMC-6M.1 adds the bid request permission constants and seed migration only. Owner/Admin templates receive `bid_requests.read`, `bid_requests.create`, `bid_requests.update`, and `bid_requests.select`; Reviewer, Appraiser, Billing, and future vendor-side roles receive none. No bid tables, bid RPCs, UI, route/nav changes, or assignment behavior changes are introduced.

AMC-6M.2 adds the bid request schema foundation only. The new tables are `order_vendor_bid_requests`, `order_vendor_bid_request_recipients`, and `order_vendor_bid_responses`, with status constraints, metadata checks, lifecycle timestamps, structural consistency guards, indexes, RLS enabled, direct app table access revoked, service-role grants, and comments. Bid request and response records remain separate from assignment packet lifecycle; no RPCs, UI, assignment writes, order mutations, route/nav changes, or `/amc/*` routes are introduced.

AMC-6N proposes the bid request RPC layer without implementation. Recommended RPCs are `rpc_order_vendor_bid_request_create(p_order_id uuid, p_payload jsonb)`, `rpc_order_vendor_bid_requests_for_order(p_order_id uuid)`, `rpc_order_vendor_bid_response_record(p_recipient_id uuid, p_payload jsonb)`, and `rpc_order_vendor_bid_response_select(p_response_id uuid)`. Create/list/record/select behavior should require bid permissions, current-company membership, order read/update authority as appropriate, AMC-scoped orders, eligible active `amc_vendor` relationships, and duplicate-open-recipient guards. These RPCs must not create assignment packets; selected responses should only produce selected-bid context for later conversion through the existing assignment-offer path.

AMC-6O.1 implements the first backend bid request RPCs: create and list. `rpc_order_vendor_bid_request_create` creates a parent bid request and recipient rows only after checking AMC order scope, `bid_requests.create`, `vendors.read`, order read authority, eligible vendor profiles, active `amc_vendor` relationships, and duplicate-open outreach. `rpc_order_vendor_bid_requests_for_order` returns request, recipient, vendor company, and response summary JSON for an order and requires `bid_requests.read`. Response record/select RPCs, frontend APIs, UI, assignment packet creation, order mutations, notifications, and `/amc/*` routes remain deferred.

AMC-6O.2 implements backend bid response record/select RPCs without assignment creation. `rpc_order_vendor_bid_response_record` requires `bid_requests.update`, current-company membership, order read authority, and `amc_operations` order scope before recording fee, currency, proposed due date, turn time, comments, and submitted timestamp for one recipient. It marks the recipient `responded` and advances the parent request to `partially_responded` or `closed`. `rpc_order_vendor_bid_response_select` requires `bid_requests.select`, rejects cancelled/expired requests and declined/expired/cancelled/not-selected recipients, marks one submitted response selected, marks sibling active recipients `not_selected`, and closes the request. Selected responses are bid-comparison decisions only; they do not create assignment packets, mutate orders, call assignment-offer RPCs, send notifications, add UI/frontend APIs, or create `/amc/*` routes.

AMC-6P adds frontend API wrappers for bid request RPCs only. `createOrderVendorBidRequest`, `listOrderVendorBidRequests`, `recordOrderVendorBidResponse`, and `selectOrderVendorBidResponse` map UI-friendly parameters to the backend create/list/record/select RPCs and surface RPC errors for future UI handling. This slice adds no UI, no routes/nav, no assignment-offer calls, no selected-bid-to-assignment conversion, no order mutations, no notification behavior, and no `/amc/*` routes.

AMC-6Q adds a read-only Bid Requests panel component for future Order Detail integration. The isolated panel loads through `listOrderVendorBidRequests(orderId)` and displays request status, due dates, recipient counts, responded counts, recipient vendor names/statuses, response fee/turn-time details, and selected response summary when present. The panel has no Request Bids button, no response record/select controls, no assignment conversion controls, no assignment-offer calls, no order mutations, no route/nav changes, no notification behavior, and no `/amc/*` routes.

AMC-6Q.1 integrates the read-only Bid Requests panel into shared Order Detail for AMC-scoped orders only. The panel is visible only in AMC Operations mode, only when `order.operations_scope = 'amc_operations'`, and only for users with `bid_requests.read`. It remains read-only and adds no Request Bids button, response record/select controls, assignment conversion controls, assignment-offer calls, backend/schema changes, route/nav changes, order mutations, notifications, or `/amc/*` routes.

AMC-6R proposes the first Request Bids UI but does not implement it. The recommended workflow is a top-level `Request bids` action in Vendor Candidates, candidate multi-select with selected count and select-all-eligible support, and a Request Bids modal for message, response due date, desired vendor report due date, and client delivery due date. Candidate snapshots should be attached automatically. Fee entry is excluded because vendors respond with fee/turn time. Existing direct `Offer Assignment` remains secondary for known-vendor direct awards. If an active `vendor_appraisal` offer/assignment exists, both Request Bids and direct-award actions should be hidden. Submission should call `createOrderVendorBidRequest(...)`, refresh Bid Requests history, and create no assignment packet.

AMC-6R.1 adds candidate multi-select state only. Vendor Candidates now shows selectable checkboxes for candidates with `vendor_profile_id`, `vendor_company_id`, and `relationship_id`, a selected count, `Select all eligible`, `Clear selection`, and ineligible explanations. Active vendor assignment state disables candidate selection. Direct `Offer Assignment` remains functional as a secondary direct-award action where permitted. This slice does not add a Request Bids modal, call bid request create APIs, create bid rows, record/select responses, create assignments, mutate orders, change backend/schema/RLS/permissions/routes/nav, send notifications, or create `/amc/*` routes.

AMC-6R.2 adds the Request Bids modal shell without submit behavior. `Request bids` appears in Vendor Candidates when no active vendor assignment blocks outreach, stays disabled until one or more eligible candidates are selected, and opens a modal with selected vendors, message, response due date, desired vendor report due date, client delivery due date, and `No assignment is created until a bid is selected.` The modal submit control is disabled as `Coming next`; cancel/close works. This slice does not call bid request APIs, create bid rows, record/select responses, create assignments, mutate orders, change backend/schema/RLS/permissions/routes/nav, send notifications, or create `/amc/*` routes.

AMC-6R.3 enables Request Bids submit integration. The modal calls `createOrderVendorBidRequest(...)` with selected candidate recipients, message, response due date, desired vendor report due date, client delivery due date, and candidate snapshots. Success closes the modal, clears candidate selection, shows a success toast, and refreshes read-only Bid Requests history. Errors keep the modal open and preserve input. This slice creates bid request/recipient rows only through the existing bid RPC wrapper; it does not create assignments, call assignment-offer APIs, record/select bid responses, mutate orders, add notifications, change backend/schema/RLS/permissions/routes/nav, or create `/amc/*` routes.

AMC-6S adds manual bid response entry in the Bid Requests panel for owner/admin users with `bid_requests.update`. Eligible recipient rows in `pending`, `sent`, or `viewed` status can open a response modal for fee amount, currency, proposed vendor due date, turn time days, and comments. Submit calls the existing response-record API wrapper, refreshes Bid Requests history on success, and preserves form input on error. This slice does not select a bid, create assignment packets, call assignment-offer APIs, add vendor portal response, send notifications, mutate orders, change backend/schema/RLS/permissions/routes/nav, or create `/amc/*` routes.

AMC-6T adds bid response selection in the Bid Requests panel for users with `bid_requests.select`. Eligible recorded, unselected responses on open bid requests expose `Select bid`; the confirmation modal shows vendor name, fee, proposed due date, turn time, comments when present, and states that selecting the bid does not create an assignment yet. Submit calls the existing response-select API wrapper and refreshes Bid Requests history on success so selected and not-selected recipient states render from the RPC response. This slice does not create assignments, call assignment-offer APIs, convert selected bids to assignment packets, add notifications, add vendor portal behavior, mutate orders, change backend/schema/RLS/permissions/routes/nav, or create `/amc/*` routes.

AMC-6U proposes selected-bid conversion into the canonical assignment packet lifecycle. The conversion action should live on the selected response in the Bid Requests panel as `Create assignment offer` or `Offer assignment from selected bid`. Conversion should map the selected recipient/vendor relationship plus response fee, currency, turn time, proposed due date, bid request id, recipient id, response id, and selected bid snapshot into `offerOrderToVendor(...)` / `rpc_order_company_assignment_offer(...)`. The safer implementation path is a backend selected-bid conversion wrapper that loads the selected response server-side, verifies AMC order scope, selected status, no active vendor assignment, assignment-offer authority, active `amc_vendor` relationship, and vendor profile eligibility, then creates the assignment offer through the existing guarded assignment packet path. After success, the assignment packet becomes canonical, active assignment state refreshes, Bid Requests remains historical, and no further responses should be accepted for the closed request. This is docs/proposal only and does not create UI, RPCs, assignments, notifications, backend/schema changes, route/nav changes, or `/amc/*` routes.

AMC-6V.2 proposes a compact AMC order-level bid status summary without implementation. The summary should describe procurement/outreach state separately from the appraisal lifecycle status. It should answer whether the order has not been sent for bid, is out for bid, has responses, has a selected bid, has an assignment offer, is assigned, has no viable bids because outreach expired, or has cancelled bid outreach.

Recommended MVP status labels:

- `Not sent for bid`: no bid request rows and no active vendor assignment.
- `Out for bid`: at least one open request has pending/sent/viewed recipients and no selected response.
- `Bids received`: at least one response exists, no selected response, and outreach is still open or partially responded.
- `Bid selected`: a selected response exists, but no assignment offer has been created from it yet.
- `Assignment offered`: an active `vendor_appraisal` assignment packet exists in `offered` status.
- `Assigned`: an active `vendor_appraisal` assignment packet exists in `accepted`, `in_progress`, or `submitted` status.
- `No bids / expired`: the latest bid request is expired or closed with no responses or no selected response.
- `Cancelled`: all relevant bid request outreach for the order was cancelled and no active assignment exists.

These labels should be derived for MVP from bid request rows, recipient statuses, selected responses, and active assignment packet state. They should not be stored directly on `orders` unless later reporting or performance requirements prove that a materialized summary is needed. Derived state prevents drift between bid request history, selected response state, and canonical `order_company_assignments` lifecycle.

The summary should show useful operational facts when available:

- number of vendors contacted
- number of vendors responded
- lowest fee
- fastest turn time or earliest proposed due date
- selected vendor
- bid response deadline
- client due date from the request/order
- assignment status if an assignment packet exists

Recommended surfaces:

- Order Detail top summary card, near lane/status/date context.
- Orders list compact AMC bid/procurement status chip.
- AMC dashboard procurement queue later.

This status must not replace the existing order/appraisal lifecycle status. It is a separate AMC procurement/bid status that helps operators understand vendor outreach and selection at a glance.

Recommended implementation slices:

1. AMC-6V.3: derive helper/util from bid request list data plus active assignment state.
2. AMC-6V.4: compact Bid Status card on Order Detail.
3. AMC-6V.5: Orders list AMC bid status chip proposal and batched read-model recommendation.
4. AMC-6V.6: bid workflow validation closeout and AMC-7 vendor self-service deferral.
5. Future: AMC dashboard procurement queue after a batched procurement summary read model exists.

AMC-6V.2 is docs/proposal only. It does not add runtime code, stored order fields, migrations, RPCs, UI, route/nav changes, assignment behavior changes, notifications, order mutations, or `/amc/*` routes.

AMC-6V.3 implements the pure frontend derivation helper only. `deriveOrderBidStatus({ bidRequests, activeVendorAssignment })` maps already-loaded bid request rows and active vendor assignment state into status, label, counts, selected vendor, lowest fee, fastest turn time, earliest proposed due date, response due date, client due date, assignment status, and display tone. Assignment offer/assigned state takes precedence over bid outreach state; selected bids take precedence over open/terminal outreach. This slice adds no UI, API calls, backend/schema changes, route/nav changes, assignment behavior changes, order mutations, notifications, or `/amc/*` routes.

AMC-6V.4 adds the first read-only Order Detail bid status summary card for AMC-scoped orders. The card appears only in AMC Operations mode, only for `amc_operations` orders, and only when the user has `bid_requests.read`. It reuses bid request rows loaded by the Bid Requests panel, so no second bid request API call is introduced. The card shows procurement status, contacted/responded counts, lowest fee, fastest turn time or earliest proposed due date, selected vendor, response/client due dates, and assignment status when applicable. It adds no write controls and does not create bids, record/select responses, create assignments, mutate orders, change backend/schema/routes/nav, send notifications, or create `/amc/*` routes.

AMC-6V.5 proposes the Orders list AMC bid status chip but recommends deferring the chip until a lightweight batched read model exists. The Orders list currently reads order rows from the frontend order views and should not fetch bid request history per row. The future list chip should be compact and limited to `Not sent for bid`, `Out for bid`, `Bids received`, `Bid selected`, `Assignment offered`, and `Assigned`. It should be backed by a server-side projection such as `rpc_amc_order_procurement_summaries(order_ids uuid[])`, derived from bid requests, recipients, responses, selected response state, and active `vendor_appraisal` assignment packets. Client-side per-order bid fetches are rejected for MVP because they create N+1 queries, stale derivation risk, and performance issues. This slice is docs/proposal only and adds no runtime code, UI, API calls, migrations, RPCs, backend/schema changes, order mutations, route/nav changes, assignment behavior changes, notifications, stored order status, or `/amc/*` routes.

AMC-6V.6 closes out the current internal bid workflow validation. Manual coordinator workflow is validated through AMC-scoped order visibility, candidate loading, multi-vendor selection, bid request/recipient creation, Bid Requests history display, and owner/admin manual response recording. Vendor self-service bid response remains deferred to future AMC-7. AMC-7 should cover secure/tokenized bid response links, a limited Vendor Order Detail, no full vendor account requirement for the first version, fee/turn-time/proposed-due-date/comments submission, expiration handling, audit trail, and later authenticated Vendor Workbench workflows. AMC-6V.6 is documentation/light-validation only and adds no runtime code, vendor portal, routes/nav, schema/RLS changes, bid behavior changes, assignment behavior changes, notifications, order mutations, or `/amc/*` routes.

AMC-6W completes selected-bid to assignment-offer conversion. A selected bid is still not an assignment; it becomes an assignment offer only when an authorized user clicks `Create Assignment Offer` in `BidRequestsPanel`. The runtime path is `BidRequestsPanel` -> `convertSelectedBidToAssignmentOffer(responseId)` -> `rpc_order_vendor_bid_response_convert_to_assignment_offer(...)` -> `rpc_order_company_assignment_offer(...)` -> the existing `order_company_assignments` packet lifecycle. The selected-bid wrapper delegates to the existing assignment-offer RPC, so the canonical active-offer guard, AMC order-scope guard, assignment-offer authorization, notification/activity behavior, and assignment packet state model remain centralized.

Request Bids -> Select Bid -> Create Assignment Offer is now the primary AMC procurement path. Direct Award remains a secondary path for known-vendor single-vendor awards. Bid request and response rows remain historical after conversion and are not marked converted yet; the created assignment offer is visible through the existing Company Assignments panel and assignment packet detail page after Order Detail refreshes owner assignment rows. Vendor self-service bidding remains deferred to AMC-7.

AMC-6X completes the Orders list procurement status chip and batched read model. The Orders list uses `rpc_amc_order_procurement_summaries(p_order_ids uuid[])` through `fetchAmcOrderProcurementSummaries(orderIds)` to load one summary row per visible eligible AMC order. The chip renders in the `Order / Status` cell beneath the normal lifecycle status. It appears only for AMC Operations rows where `operations_scope = 'amc_operations'`; Internal Operations rows are excluded. Missing summaries render no chip, and summary fetch errors are logged without breaking the table.

AMC-6X status precedence:

1. `Assigned`
2. `Assignment Offered`
3. `Bid Selected`
4. `Responses Received`
5. `Bids Requested`
6. `No Bids`

AMC procurement MVP is now complete for the internal coordinator path: candidate vendors, Request Bids, manual response entry, Select Bid, Create Assignment Offer, assignment packet lifecycle handoff, Order Detail procurement summary, and Orders list procurement chip. Deferred items remain AMC-7 vendor self-service bidding, procurement dashboard queue, client-facing bid review, procurement filters, and an explicit converted bid row marker.

AMC-7A.1 adds backend tokenized bid invitation infrastructure. The new
`order_vendor_bid_request_recipient_invitations` table stores recipient-scoped invitation delivery
and access records. The authenticated `rpc_order_vendor_bid_invitation_create(...)` RPC creates an
invitation for a bid recipient, returns the plaintext token once, stores only a SHA-256 token hash
and token last four, and returns the relative path `/vendor/bid-invitations/<token>`. This slice
does not add public token read/submit RPCs, public vendor UI, email send, response recording,
assignment conversion, order mutation, or recipient lifecycle mutation.

AMC-7A.2 adds internal coordinator link generation. The frontend wrapper
`createOrderVendorBidInvitation(recipientId, payload = {})` calls the invitation create RPC, and
`BidRequestsPanel` shows `Generate Bid Link` for open/invitable recipients when the coordinator has
bid update authority. The generated path displays inline as selectable text. There is no
copy-to-clipboard helper yet. Manual response entry, bid selection, selected-bid assignment
conversion, and existing procurement summary behavior remain unchanged.

AMC-7B adds public-safe token read support. The new
`rpc_order_vendor_bid_invitation_read(p_token text)` RPC validates tokenized invitations and returns
a limited Vendor Order Detail payload for valid tokens. Invalid, expired, revoked, submitted,
closed, or otherwise unavailable tokens return the constant response
`{ ok: false, error: "bid_invitation_invalid_or_expired" }`. Valid reads update only invitation
telemetry (`opened_at`, `last_opened_at`, `open_count`, and `updated_at`). Token reads do not mutate
recipient status, create bid responses, mutate orders, or mutate bid request lifecycle state.

AMC-7B.1 adds the frontend read wrapper. `readOrderVendorBidInvitation(token)` calls the token read
RPC and returns `{ ok: true }` or `{ ok: false }` payloads as-is. Invalid or expired business
responses do not throw; Supabase transport/RPC errors still propagate through the existing API
helper.

AMC-7C adds the public Vendor Bid Invitation route at `/vendor/bid-invitations/:token`. The route is
outside the internal `Layout` and `ProtectedRoute`, uses a standalone public Falcon / Continental
layout, and renders a limited Vendor Order Detail from the safe token payload. Invalid, expired, and
transport-error states show the same generic unavailable page. A disabled `Submit Bid` placeholder
is present, but no submit behavior, email send, authenticated Vendor Workbench, recipient lifecycle
mutation, response creation, order mutation, or request lifecycle mutation is added.

Current AMC-7C manual testing flow: coordinator creates a bid request, clicks `Generate Bid Link`,
manually copies the displayed `/vendor/bid-invitations/<token>` path, and opens the public page. The
vendor-facing page loads safe order detail. The vendor still contacts the coordinator or uses the
manual response path until AMC-7D adds token submit behavior.

AMC-7D.1 adds token-based public bid submission. The new
`rpc_order_vendor_bid_invitation_submit(p_token text, p_payload jsonb)` RPC validates tokenized
invitations, returns the constant invalid/expired response
`{ ok: false, error: "bid_invitation_invalid_or_expired" }` for token and lifecycle failures, and
returns `{ ok: false, error: "bid_submission_invalid", field_errors: {...} }` for valid-token bad
payloads. On success, it writes a bid response, marks the recipient `responded`, sets invitation
`submitted_at`, and advances the parent request to `partially_responded` or `closed`. It does not
mutate orders, select bids, create assignment packets, send email, or create notifications.

AMC-7D.2 adds the frontend submit wrapper.
`submitOrderVendorBidInvitation(token, payload = {})` calls the public token submit RPC and returns
business responses as-is. Supabase transport/RPC errors still throw through the shared API helper.

AMC-7D.3 enables the public Vendor Bid Invitation page submit form. The page now captures fee
amount, currency, turn time days, proposed due date, comments, contact name, contact email, and
contact phone. Successful submission shows `Your bid has been submitted.` and does not re-read the
token because the current read RPC treats submitted tokens as unavailable. Invalid/expired submit
responses show the generic unavailable state, while backend `field_errors` render in the form.

Current AMC-7D end-to-end flow: coordinator creates a bid request, clicks `Generate Bid Link`, and
shares or opens `/vendor/bid-invitations/<token>`. The vendor reviews the safe limited Vendor Order
Detail and submits fee, timing, comments, and contact details. The submitted response appears in the
existing internal bid lifecycle, where the coordinator can select the bid and create an assignment
offer through the selected-bid conversion path.

AMC-7E.1 adds coordinator-side copy helpers for generated vendor bid invitation links. After a link
is generated, `BidRequestsPanel` now exposes `Copy Link` and `Copy Email Text`. `Copy Link` copies
the generated `/vendor/bid-invitations/<token>` path or link. `Copy Email Text` creates a
ready-to-paste vendor bid request email draft using safe order/request fields and the generated bid
link. No actual email send occurs, and no `email_queue`, Resend, Edge Function, notification, or
backend behavior is added. If the browser clipboard API is unavailable or fails, the generated link
remains visible and the coordinator is told to select the text manually.

Current AMC-7E.1 manual Gmail testing flow:

1. Add a test vendor contact using one of the approved test emails:
   - `chris@therossicompany.com`
   - `chrisrossi92@gmail.com`
2. Create a bid request.
3. Generate a bid link.
4. Click `Copy Email Text`.
5. Paste and send manually from Gmail.
6. Open the public vendor link.
7. Submit the bid.
8. Confirm the bid appears internally.

AMC-7E.1 leaves contact targeting / selected vendor contact UX, real email queue/send integration,
reply-to/sender/template infrastructure, email delivery status tracking, and authenticated Vendor
Workbench deferred.

## AMC Procurement + Vendor Self-Service MVP

Status: VALIDATED.

Validation was completed using `AMC-DEMO-003` with approved test vendor contacts
`chris@therossicompany.com` and `chrisrossi92@gmail.com`.

Validated flow:

1. AMC order creation.
2. Vendor candidate matching.
3. Request Bids.
4. Bid request creation.
5. Vendor invitation generation.
6. Public vendor invitation route.
7. Vendor-safe order detail.
8. Vendor bid submission.
9. Internal bid response creation.
10. Bid selection.
11. Assignment offer conversion.
12. Assignment packet creation.
13. Assignment packet visibility.
14. Assignment packet detail access.

Validated outcomes:

- Vendor can participate without a Falcon account.
- Tokenized invitation workflow functions.
- Public vendor page does not expose internal AMC data.
- Vendor response enters the existing procurement lifecycle.
- Selected bid preserves fee, timing, due date, and comments.
- Assignment offer conversion preserves selected bid context.
- Assignment packet loads successfully.
- AMC Operations users can access the packet contextually through `Open Packet`.

Post-MVP Procurement Enhancements:

- AMC-7E.2 contact targeting UX.
- AMC-7E.3 automated email send.
- Delivery/open tracking UI.
- Copy helper polish.
- Submitted-token read state.

Vendor Workbench Expansion:

- Authenticated vendor login.
- Available Work.
- My Bids.
- Assigned Orders.
- Documents/Tasks.
- Invoices.
- Vendor Profile management.

Assignment Lifecycle Expansion:

- AMC-8 assignment lifecycle doctrine is defined in
  `docs/amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md`.
- Vendor acceptance / decline.
- Assignment progress tracking.
- Report submission.
- Revision workflow.
- Lifecycle automation after manual lifecycle behavior is validated.

## AMC-8 Assignment Lifecycle Expansion

AMC-8 defines the post-award lifecycle for AMC vendor assignments after selected-bid conversion
creates a `vendor_appraisal` assignment packet.

Canonical doctrine: `docs/amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md`.

AMC-8 proposed states:

- Offered.
- Accepted.
- Declined.
- In Progress.
- Inspection Complete.
- Report In Progress.
- Submitted.
- Revision Requested.
- Resubmitted.
- Completed.
- Cancelled.
- Revoked.

AMC-8 implementation phases:

- AMC-8A: Accept / Decline.
- AMC-8B: Work Status Tracking.
- AMC-8C: Report Submission.
- AMC-8D: Revision Workflow.
- AMC-8E: Lifecycle Automation.

## Delivery State

Delivery state may include:

- report received
- in review
- revision requested
- delivered to client
- completed

Delivery behavior should reuse activity, notifications, files, and reporting where possible.

## Future Cross-Platform Workflow: Lender Correction / Revision Requests

This future workflow applies to both Internal Operations Mode and AMC Operations Mode. It is deferred and not implemented in the current AMC work.

Open question to revisit before implementation:

- Should lender correction requests reopen the existing order or create a new order?

Recommended doctrine:

- Normal corrections and revisions should stay attached to the existing order.
- Falcon should create a correction/revision cycle record linked to the order.
- Original completion, delivery, and submission history should be preserved.
- Each cycle should track requested items, requester, due date, assigned internal user or vendor, status, and resubmission timestamp.
- A new order should be created only when scope, property, client engagement, or fee basis materially changes.

Deferred roadmap items:

- correction request lifecycle
- revision status handling
- notifications and reminders
- appraiser/vendor response tracking
- audit trail and history
- client-facing correction communication

The workflow must not erase the original order outcome, hide prior submissions, or make correction handling mode-specific unless product policy explicitly requires mode-specific copy or permissions.

## Customization Opportunities

Future lifecycle customization may include:

- status labels
- required transitions
- escalation thresholds
- client-specific delivery steps
- vendor-specific follow-up rules
- notification policies

## Future Expansion

- configurable lifecycle models
- client-specific workflow templates
- vendor-facing progress updates
- delivery quality checks
- SLA tracking
- escalation automation
