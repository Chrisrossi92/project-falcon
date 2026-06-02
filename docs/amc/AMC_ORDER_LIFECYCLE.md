# AMC Order Lifecycle

## Purpose

The AMC Order Lifecycle defines how AMC Operations Mode should represent order progress while reusing Falcon's shared order engine.

## Shared Order Engine

AMC orders should use Falcon's shared order infrastructure wherever possible.

The goal is one order engine with different operational lenses, not a disconnected AMC order system.

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
