# Falcon AMC Implementation Plan

## Purpose

This plan converts the AMC doctrine documents into an implementation roadmap with dependencies, sequencing, guardrails, testing strategy, and MVP scope.

AMC implementation may proceed in parallel with Falcon V1.1 stabilization, but Internal Operations remains the active production validation environment. AMC development should reuse Falcon infrastructure whenever possible and should not destabilize the internal pilot path.

This document is the authoritative execution plan for AMC development.

Source doctrine:

- [Falcon AMC MVP Plan](./FALCON_AMC_MVP_PLAN.md)
- [AMC Operations Command](../amc/AMC_OPERATIONS_COMMAND.md)
- [AMC Vendor Directory](../amc/AMC_VENDOR_DIRECTORY.md)
- [AMC Vendor Coverage Doctrine](../amc/AMC_VENDOR_COVERAGE_DOCTRINE.md)
- [AMC Vendor Assignment Engine](../amc/AMC_VENDOR_ASSIGNMENT_ENGINE.md)
- [AMC Assignment Candidate Engine](../amc/AMC_ASSIGNMENT_CANDIDATE_ENGINE.md)
- [AMC Vendor Performance Model](../amc/AMC_VENDOR_PERFORMANCE_MODEL.md)
- [AMC Financial Model](../amc/AMC_FINANCIAL_MODEL.md)
- [AMC Order Lifecycle](../amc/AMC_ORDER_LIFECYCLE.md)
- [AMC Customization Framework](../amc/AMC_CUSTOMIZATION_FRAMEWORK.md)

## Core Principles

- One Platform.
- Two Operational Modes.
- Shared Order Engine.
- Shared Client Engine.
- Shared Calendar.
- Shared Notification System.
- Shared Reporting Engine.
- Shared Permissions Engine.

AMC should extend Falcon, not replace Falcon.

Falcon workspace doctrine is locked in
`../FALCON_WORKSPACE_DOCTRINE_NAVIGATION_ARCHITECTURE.md`. Internal Operations, AMC Operations, and
the future Vendor Workspace are role-native workspaces. Switching workspaces is a context reset,
not a view filter. Runtime now navigates Internal/AMC workspace switches to `/dashboard`, uses
replace navigation so the browser back button does not immediately revive the prior workspace
route, does not preserve query/search state on workspace switch, and clears Orders URL filters when
`operationsMode` changes while Orders is mounted. Active-mode clicks do nothing. Workspace-native
navigation definitions now drive primary desktop visibility, AMC desktop/sidebar grouping, and AMC
mobile ordering while preserving route paths, permissions, dashboard routing, command palette
behavior, workflow reachability, and Internal mobile/profile grouping. WS-5.1 adds a narrow AMC
visual/copy identity layer through `getWorkspaceIdentity(operationsMode)`: TopNav uses
`Procurement Command`, Dashboard and Orders use procurement/vendor-management copy, and restrained
cyan accents appear in the shell context panel/sidebar ring and Orders eyebrow chip. Internal
identity remains unchanged/default. Saved views are unchanged and deferred for workspace scoping in
WS-3.4.

## Phase Overview

### AMC-1: Operations Command

Status: foundation complete through AMC-1F mode availability permissions.

Purpose: enable switching between Internal Operations and AMC Operations without leaving Falcon.

Dependencies:

- Falcon V1.1 shell and navigation stability.
- Existing permissions and current-user context.
- Existing notification and dashboard shell patterns.

Deliverables:

- Operations Command architecture.
- Mode switching.
- Mode-aware navigation.
- Cross-mode notification indicators.
- AMC Operations mode availability restricted to owner/admin users with `vendors.read`; Internal Operations remains always available.
- Stored AMC mode safely falls back to Internal Operations when AMC is unavailable.

Testing Strategy:

- Unit tests for mode resolution and navigation composition.
- Browser smoke tests for switching modes without losing session.
- Permission tests for users with and without AMC access.
- Shell tests for hidden AMC toggle, denied switch attempts, and stored-mode fallback.

Success Criteria:

- User can switch operational context without leaving Falcon.
- Only explicitly authorized owner/admin vendor users see AMC Operations Mode.
- Appraiser/reviewer/staff users remain in Internal Operations by default.
- Internal Operations remains stable.
- No vendor functionality is introduced yet.

### AMC-2: Vendor Directory

Status: Vendor Directory foundation implemented through AMC-4B with schema, read RPCs, read-only UI, AMC Operations navigation exposure, vendor permission gates, mutation RPCs, frontend mutation API wrappers, first Add Vendor UI, create-workflow hardening, Vendor Profile metadata editing, vendor contact create/update UI, vendor service-area create/update UI, controlled frontend product taxonomy, frontend static OH/MI/IN state-county constants, isolated reusable CoverageBuilder utilities/component, Add Vendor CoverageBuilder integration, Vendor Profile bulk Add Coverage, compressed CoverageBuilder previews, Vendor Profile coverage display compression, Add Vendor save diagnostics, long-term vendor coverage doctrine, owner-facing terminology polish, hardened owner-facing vendor error messages, Vendor Profile future-module roadmap, structured Vendor Profile metadata controls, Vendor Profile summary cards, and Vendor Profile layout polish; no service-area bulk edit/delete, archive workflow, vendor role, assignment candidate, assignment behavior, or `/amc/*` route exposure yet.

Purpose: create the vendor management foundation.

Dependencies:

- AMC-1 mode architecture.
- Permissions model for vendor visibility and management.
- Vendor Company first doctrine.
- Existing company relationship and order-company assignment framework audit.

Deliverables:

- Existing AMC/company-assignment framework audit.
- Lean vendor profile/contact/service-area schema foundation.
- Read-only Vendor Directory RPC layer.
- Frontend read API wrappers.
- Hidden read-only Vendor Directory route.
- Hidden read-only Vendor Profile detail route.
- AMC Operations-only Vendors navigation exposure gated by `vendors.read`.
- Local/demo vendor seed data for visual validation.
- MVP vendor permission constants and Owner/Admin permission catalog grants.
- Vendor Directory read route/RPC/nav gate migration from `relationships.read` to `vendors.read`.
- Vendor mutation RPC layer for profile, contact, and service-area CRUD foundations.
- Frontend mutation API wrappers for vendor profile, contact, and service-area CRUD foundations.
- Add Vendor UI for first owner-side create workflow.
- Add Vendor workflow hardening for duplicate-submit prevention, compact payloads, reset/error behavior, and no-id success responses.
- Vendor Profile metadata edit UI gated by `vendors.update`.
- Vendor contact create/update UI gated by `vendors.contacts.manage`.
- Vendor service-area create/update UI gated by `vendors.service_areas.manage`.
- Controlled frontend product taxonomy for vendor coverage product type inputs.
- Static frontend state/county constants for OH, MI, and IN.
- Isolated reusable CoverageBuilder component and row-generation utilities for future coverage workflows.
- Add Vendor CoverageBuilder integration that submits generated service-area rows through the existing vendor create payload.
- Vendor Profile bulk Add Coverage workflow using CoverageBuilder and existing service-area create wrappers.
- CoverageBuilder preview compression with opt-in generated row detail and development/test Add Vendor save diagnostics.
- Vendor Profile coverage display compression grouped by geography, state, and product summary while preserving expanded single-row edit.
- Vendor coverage doctrine for commercial and residential geography/product coverage.
- Owner-facing Vendor Directory terminology polish for CoverageBuilder, network status, coverage-row cleanup, and Operational Notes labels.
- Centralized owner-facing vendor error message mapping for stable backend error codes.
- Vendor Profile future-module roadmap covering Orders, Bid History, Performance Metrics / Scores, Compliance, Financial Terms, Activity / Notes, Coverage / Eligibility, and Contacts.
- Structured Vendor Profile metadata controls for `capabilities` and `product_eligibility` that preserve backend-compatible JSON object payloads without exposing raw JSON editing.
- Vendor Profile summary cards for Status, Contacts, Coverage, Products, and Network using already-loaded profile/contact/coverage data.
- Vendor Profile layout polish that keeps Profile/Contacts primary, Coverage prominent, and notes/operational metadata secondary without new data dependencies.
- Vendor CRUD.
- Coverage areas.
- Vendor contacts.
- Vendor statuses.

Testing Strategy:

- Unit/API tests for vendor create, read, update, archive/deactivate behavior.
- Permission tests for view/manage access.
- UI tests for vendor list, detail, and form states.

Success Criteria:

- Vendor records can be managed independently from internal users.
- Vendor Company is the primary assignment unit.
- Individual vendor appraiser contacts can be represented without requiring individual assignment.
- Vendor assignment uses assignment records, not `orders.appraiser_id`, `orders.reviewer_id`, or `orders.assigned_to`.
- Existing company relationship and order-company assignment infrastructure is reused where sufficient before new vendor tables are introduced.
- AMC surfaces extend shared Falcon routes and shell patterns rather than forking into a separate AMC route tree.

### AMC-3: AMC Financial Layer

Purpose: support the AMC financial perspective.

Dependencies:

- Shared order read model.
- Permission decisions for financial visibility.
- AMC financial doctrine.

Deliverables:

- Client Fee.
- Vendor Fee.
- AMC Margin.

Testing Strategy:

- Unit tests for margin calculation.
- Permission tests for fee/margin visibility.
- Order view tests for AMC financial labels.

Success Criteria:

- Orders can display AMC margin calculations.
- Internal production fee/split display remains unchanged.
- Financial visibility is permission-aware.

### AMC-4: AMC Dashboard

Purpose: create the AMC operational command center.

Dependencies:

- AMC-1 Operations Command.
- AMC-2 Vendor Directory.
- AMC-3 Financial Layer.
- Existing dashboard/workbench patterns.

Deliverables:

- Orders received.
- Orders assigned.
- Orders awaiting assignment.
- Orders delivered.
- Margin visibility.

Testing Strategy:

- Unit tests for dashboard metric derivation.
- UI tests for dashboard cards, queues, and empty states.
- Permission tests for financial and operational sections.

Success Criteria:

- Owner/Admin can manage AMC activity from one dashboard.
- AMC visibility does not duplicate or replace Internal Operations Dashboard behavior.
- Dashboard gives faster operational awareness than a static order list.

### AMC-5: Vendor Assignment Engine MVP

Status: AMC-5A candidate-engine proposal, AMC-5B order/vendor field audit, AMC-5C product/location normalization helper proposal, AMC-5D backend-only candidate SQL helpers/RPC, AMC-5D.1 SQL validation/product-mapping patch, AMC-5E frontend candidate API wrapper, AMC-5F candidate panel placement proposal, AMC-5G isolated read-only candidate panel component, AMC-5H read-only Order Detail integration, and AMC-5I candidate panel explainability polish completed. No assignment creation, schema table/RLS, permission, route/navigation, order behavior, assignment behavior, or `/amc/*` route changes have been introduced.

Purpose: implement the first AMC assignment workflow.

Dependencies:

- AMC-2 Vendor Directory.
- Coverage data.
- Shared order and notification infrastructure.
- AMC order lifecycle doctrine.

Deliverables:

- Assignment Candidate Engine proposal and read-only candidate RPC shape.
- Read-only candidate panel with explainable match strength, grouped reasons, warning copy, and expandable coverage details.
- Order/vendor field audit for geography, product, timing, and authorization inputs.
- Product/location normalization helper proposal for state, county, ZIP, market text, and order-to-vendor product slug mapping before candidate SQL implementation.
- Backend-only SQL normalization helpers and read-only `rpc_vendor_assignment_candidates(p_order_id uuid)`.
- AMC-5D.1 isolated SQL validation and product mapping patch for literal commercial order property types.
- Frontend read-only `listVendorAssignmentCandidates(orderId)` API wrapper.
- Candidate panel placement proposal recommending a read-only Order Detail panel for AMC Operations users with `vendors.read` and order read access.
- Isolated read-only `VendorAssignmentCandidatesPanel` component for suggested vendor display.
- Read-only Order Detail integration of `VendorAssignmentCandidatesPanel` in AMC Operations mode with `vendors.read`.
- Coverage matching.
- Vendor recommendation list.
- Manual assignment.
- Top-N outreach workflow.

Testing Strategy:

- Unit tests for coverage eligibility.
- Unit tests for recommendation ordering.
- UI tests for selecting vendors, deselecting vendors, and top-N outreach.
- Notification/activity tests for assignment outreach.

Success Criteria:

- Users can identify and contact candidate vendors quickly.
- Coverage acts as a primary eligibility gate.
- Users retain control over final vendor selection.

### AMC-6: Assignment Offer Workflow

Status: AMC-6A assignment-offer workflow doctrine, AMC-6B assignment offer RPC/API proposal, AMC-6C candidate-aware assignment offer frontend API wrapper, AMC-6D one-active-vendor-offer enforcement proposal, AMC-6E backend one-active-vendor-offer guard, AMC-6F Offer Assignment UI proposal, AMC-6F.1 active vendor offer visibility audit, AMC-6F.2 active vendor assignment state sharing, AMC-6F.3 candidate-card offer button/modal, AMC-6H order scope doctrine/audit, AMC-6H.1 compliance-sensitive order scope doctrine, AMC-6H.2 order scope migration proposal, AMC-6H.3 order operations scope foundation, AMC-6H.4 mode-aware Orders/Dashboard filtering, AMC-6H.5 AMC test order data plan, AMC-6H.6 manual AMC test order seed, AMC-6J multi-vendor bid request workflow doctrine, AMC-6J.1 candidate action copy reset, AMC-6K bid request schema proposal, AMC-6L bid request schema migration proposal, AMC-6M.1 bid request permission seeds, AMC-6M.2 bid request schema foundation, AMC-6N bid request RPC proposal, AMC-6O.1 bid request create/list RPCs, AMC-6O.2 bid response record/select RPCs, AMC-6P bid request frontend API wrappers, AMC-6Q read-only Bid Requests panel, AMC-6Q.1 Order Detail bid request panel integration, AMC-6R Request Bids UI proposal, AMC-6R.1 candidate multi-select state, AMC-6R.2 Request Bids modal shell, AMC-6R.3 Request Bids submit integration, AMC-6S manual bid response entry UI, AMC-6T Select Bid UI, AMC-6U selected-bid-to-assignment conversion proposal, AMC-6V.2 order bid status summary proposal, AMC-6V.3 bid status derivation helper, AMC-6V.4 Order Detail bid status summary card, AMC-6V.5 Orders list AMC bid status chip proposal, AMC-6V.6 bid workflow validation closeout, AMC-6W selected-bid-to-assignment-offer conversion, and AMC-6X Orders list procurement chip/read model completed. AMC procurement MVP is complete for the internal coordinator path. No route/navigation changes, order creation UI changes, stored order bid status, vendor self-service response, bid rows marked converted, vendor portal, or `/amc/*` routes have been introduced.

Purpose: define and implement the explicit owner/admin action that turns a selected candidate vendor into an offered assignment packet.

Dependencies:

- AMC-2 Vendor Directory.
- AMC-5 candidate engine and read-only candidate panel.
- Existing `order_company_assignments` packet lifecycle.
- Active `company_relationships`.

Deliverables:

- AMC-6A assignment offer lifecycle doctrine.
- Reuse recommendation for existing `order_company_assignments` and `rpc_order_company_assignment_offer(...)`.
- Single-vendor offer MVP recommendation.
- AMC-6B RPC/API proposal for reusing `rpc_order_company_assignment_offer(...)`.
- Candidate-aware frontend wrapper proposal: `offerOrderToVendor(...)`.
- Candidate-aware frontend wrapper implementation over the existing `offerAssignment(...)` RPC path.
- One-active-vendor-offer MVP rule proposal.
- AMC-6D backend enforcement proposal: RPC-level check plus SQL partial unique index.
- Recommended stable error code: `order_vendor_assignment_active_exists`.
- AMC-6E additive migration `20260601142000_amc_one_active_vendor_offer_guard.sql`.
- Preflight conflict audit for existing active vendor packet conflicts.
- Partial unique index `order_company_assignments_one_active_vendor_per_order`.
- Patched `rpc_order_company_assignment_offer(...)` stable error `order_vendor_assignment_active_exists`.
- AMC-6F UI proposal for a candidate-card `Offer Assignment` action and candidate-specific confirmation modal.
- Permission recommendation to require existing assignment-offer authority, not `vendors.read` alone.
- Active-offer UI error copy: `This order already has an active vendor offer or assignment.`
- AMC-6F.1 active vendor offer visibility audit confirming existing `rpc_order_company_assignment_list_for_order(uuid)` data can detect active `vendor_appraisal` packets without a new read RPC.
- Recommended active-state rule: `vendor_appraisal` plus `offered`, `accepted`, `in_progress`, or `submitted`.
- AMC-6F.2 Order Detail state sharing for owner assignment rows, `activeVendorAssignment` derivation, controlled assignment panel rows, and candidate-panel active-offer note.
- AMC-6F.3 candidate-card `Offer Assignment` button and confirmation modal.
- Candidate offer submit path through `offerOrderToVendor(...)` with hidden candidate snapshot and owner assignment refresh on success.
- Candidate offer modal hides raw relationship ids, vendor profile ids, assignment type, terms JSON, handoff JSON, and candidate snapshot JSON.
- AMC-6H order scope doctrine: Internal Operations orders are internally fulfilled production work; AMC Operations orders are externally managed/vendor-fulfilled work.
- AMC-6H schema gap: current `orders.company_id`, `client_id`, `managing_amc_id`, `amc_id`, internal assignment columns, and `order_company_assignments` do not provide a single authoritative Internal-vs-AMC order-scope discriminator.
- Recommended future field/model: explicit `orders.operations_scope` or `orders.fulfillment_model` with at least `internal_operations` and `amc_operations`.
- AMC-6H.1 schema recommendation: prefer `orders.operations_scope` because the boundary controls visibility, workflow, assignment eligibility, audit posture, and compliance lane separation; `fulfillment_model` is too narrow for the primary lane.
- Recommended `operations_scope` MVP values: `internal_operations` and `amc_operations`; defer `hybrid`.
- Backfill doctrine: default existing orders to `internal_operations`; only move existing orders to `amc_operations` after human-reviewed audit/backfill.
- Order creation doctrine: Internal create defaults to `internal_operations`; AMC create defaults to `amc_operations`; backend RPCs must persist and validate explicit scope.
- Backend guard proposal: candidate RPC and `vendor_appraisal` offer RPC should reject non-`amc_operations` orders with stable error `order_scope_not_amc_operations`.
- Audit doctrine: preserve scope changes, actor, timestamp, reason, candidate snapshot, packet lifecycle, internal assignment history, activity, files, and client communications.
- AMC-6H.2 migration proposal: add `orders.operations_scope text not null default 'internal_operations'` with check constraint for `internal_operations` and `amc_operations`, backfill existing rows to internal, comment the compliance lane, and add at least a `(company_id, operations_scope)` index.
- AMC-6H.2 read impact: project `operations_scope` through order list/detail views and filter Orders/Dashboard reads by operations mode using the explicit scope.
- AMC-6H.2 guard impact: candidate RPC and `vendor_appraisal` offer RPC must reject non-AMC orders before product offer testing.
- AMC-6H.2 testing plan: schema/default/check/comment/index tests, mode-aware query tests, candidate/offer guard tests, and UI hidden-action tests for internal-scoped orders.
- AMC-6H.3 migration `20260601143000_amc_order_operations_scope_foundation.sql` adds `orders.operations_scope`, allowed-value constraint, existing-order internal backfill, `(company_id, operations_scope)` index, comments, read projection, and backend candidate/offer guards.
- AMC-6H.3 projects `operations_scope` through current order list/detail reads without adding mode-aware filtering yet.
- AMC-6H.3 candidate and vendor-appraisal offer guards raise `order_scope_not_amc_operations` for non-AMC orders; non-vendor assignment offer behavior is preserved.
- AMC-6H.4 applies mode-derived `operations_scope` filters to shared `/orders` reads, queue-derived Orders reads, dashboard order rows, and dashboard order-based KPI counts.
- AMC-6H.4 hides the Vendor Candidates panel on internal-scoped orders even when AMC Operations mode is active.
- AMC-6H.4 intentionally leaves AMC Operations order queues empty until explicit AMC-scoped test orders are created; existing orders remain internal by default.
- AMC-6H.5 recommends a future manual/demo seed for one clearly labeled AMC-scoped test order rather than bulk backfill or scope-edit UI.
- AMC-6H.5 minimum test order fields: `operations_scope = 'amc_operations'`, state, county when county matching is tested, ZIP/postal code when ZIP matching is tested, `property_type`, `report_type`, active-list status, and current-company ownership.
- AMC-6H.5 defers order creation lane selection and any admin-only scope toggle until audit, permission, and history requirements are defined.
- AMC-6H.6 adds `supabase/manual/20260602_amc_test_order_seed.sql`, a manual/local seed for one AMC-scoped order `AMC-DEMO-001` and one matching demo vendor `Franklin Commercial Valuation`.
- AMC-6H.6 load command: `psql -v ON_ERROR_STOP=1 "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/manual/20260602_amc_test_order_seed.sql`.
- AMC-6H.6 creates no assignments/offers, does not backfill existing orders, and is not for production use.
- AMC-6J bid request doctrine: candidate matching recommends vendors, bid request outreach asks multiple vendors for fee/turn time/availability, and assignment offer happens only after a vendor or bid is selected.
- AMC-6J keeps bid requests separate from assignment packets; bid requests should not create active `vendor_appraisal` assignment packets or count as assigned work.
- AMC-6J recommends future `Request Bids` / `Request Availability` multi-select candidate workflow, bid comparison panel, and selected-bid-to-assignment conversion through the canonical assignment offer RPC.
- AMC-6J defers vendor portal response UI, notifications/reminders, automatic lowest-bid selection, first-to-accept, client-facing bid approval, and multi-vendor assignment offers.
- AMC-6J.1 keeps `Offer Assignment` functional but moves candidate-card copy toward `Direct award`, with helper copy that multi-vendor bid requests are planned.
- AMC-6J.1 does not add `Request Bids`, multi-select, bid schema/RPCs, backend changes, assignment behavior changes, routes/nav changes, or `/amc/*` routes.
- AMC-6K proposes bid request schema with `order_vendor_bid_requests`, `order_vendor_bid_request_recipients`, and `order_vendor_bid_responses`.
- AMC-6K request states: `draft`, `sent`, `partially_responded`, `closed`, `cancelled`, and `expired`.
- AMC-6K recipient states: `pending`, `sent`, `viewed`, `responded`, `declined`, `expired`, `cancelled`, `selected`, and `not_selected`.
- AMC-6K recommends explicit bid permissions: `bid_requests.read`, `bid_requests.create`, `bid_requests.update`, and `bid_requests.select`.
- AMC-6K guards: AMC-scoped orders only, active `amc_vendor` relationship, no assignment packet on request/response, no duplicate open recipient to the same vendor/order, and selected bid conversion through the existing assignment-offer guard.
- AMC-6L concrete DDL proposal: `order_vendor_bid_requests`, `order_vendor_bid_request_recipients`, and `order_vendor_bid_responses` as additive service-role-owned tables with RLS enabled, direct app table privileges revoked, status checks, lifecycle timestamps, comments, and bid-specific indexes.
- AMC-6L recommends `unique (bid_request_id, vendor_profile_id)` for duplicate recipients within a request, while enforcing duplicate open outreach for the same order/vendor through RPCs unless recipient rows later denormalize `order_id`.
- AMC-6L recommends seeding `bid_requests.read`, `bid_requests.create`, `bid_requests.update`, and `bid_requests.select` in a separate permission migration for Owner/Admin templates only; vendor response/portal permissions remain deferred.
- AMC-6L sequencing: schema migration, permission seed migration, bid request RPCs, frontend wrappers, candidate multi-select `Request Bids`, bid comparison panel, then selected-bid conversion through existing assignment-offer guardrails.
- AMC-6M.1 adds permission constants and migration `20260602152000_amc_bid_request_permission_seeds.sql`.
- AMC-6M.1 grants `bid_requests.read`, `bid_requests.create`, `bid_requests.update`, and `bid_requests.select` to Owner/Admin system templates only; Reviewer, Appraiser, Billing, and future vendor-side roles receive none.
- AMC-6M.1 creates no bid request tables, RPCs, UI, route/nav changes, assignment behavior, order behavior, or `/amc/*` routes.
- AMC-6M.2 adds migration `20260602153000_amc_bid_request_schema_foundation.sql`.
- AMC-6M.2 creates `order_vendor_bid_requests`, `order_vendor_bid_request_recipients`, and `order_vendor_bid_responses` with status constraints, metadata checks, timestamps, FKs, indexes, RLS, service-role-only direct access, comments, and structural consistency guards.
- AMC-6M.2 keeps workflow behavior deferred: no bid request RPCs, frontend APIs, UI, assignment writes, order mutations, route/nav changes, or `/amc/*` routes.
- AMC-6N proposes bid request RPCs: `rpc_order_vendor_bid_request_create`, `rpc_order_vendor_bid_requests_for_order`, `rpc_order_vendor_bid_response_record`, and `rpc_order_vendor_bid_response_select`.
- AMC-6N requires bid permissions, current-company membership, order authority, AMC-scoped orders, eligible active `amc_vendor` relationships, duplicate-open-recipient guards, stable errors, and no assignment packet writes.
- AMC-6N defers vendor-authenticated response submission, vendor portal views, notifications, client bid approval, cancellation/expiration RPCs, response versioning, automatic selection, and selected-bid-to-assignment implementation.
- AMC-6O.1 adds migration `20260602154000_amc_bid_request_create_list_rpcs.sql`.
- AMC-6O.1 implements `rpc_order_vendor_bid_request_create(p_order_id uuid, p_payload jsonb)` and `rpc_order_vendor_bid_requests_for_order(p_order_id uuid)`.
- AMC-6O.1 create RPC requires `amc_operations` order scope, `bid_requests.create`, `vendors.read`, current-company order read authority, active `amc_vendor` relationships, eligible vendor profiles, and no duplicate open bid recipient for the same order/vendor.
- AMC-6O.1 list RPC requires `bid_requests.read` and current-company order read authority, and returns bid request, recipient, vendor company, and response summary JSON.
- AMC-6O.1 creates no assignment packets, mutates no orders, sends no notifications, adds no frontend APIs/UI, and creates no `/amc/*` routes.
- AMC-6O.2 adds migration `20260602155000_amc_bid_response_record_select_rpcs.sql`.
- AMC-6O.2 implements `rpc_order_vendor_bid_response_record(p_recipient_id uuid, p_payload jsonb)` and `rpc_order_vendor_bid_response_select(p_response_id uuid)`.
- AMC-6O.2 record RPC requires `bid_requests.update`, current-company order read authority, and `amc_operations` order scope before recording response fee, currency, proposed due date, turn time, comments, and submitted timestamp; it marks the recipient responded and advances the parent request status.
- AMC-6O.2 select RPC requires `bid_requests.select`, current-company order read authority, and `amc_operations` order scope before selecting one submitted response, marking sibling active recipients not-selected, and closing the request.
- AMC-6O.2 creates no assignment packets, calls no assignment-offer RPCs, mutates no orders, sends no notifications, adds no frontend APIs/UI, and creates no `/amc/*` routes.
- AMC-6P adds `src/features/bids/api.js` wrappers for bid request create/list and response record/select RPCs.
- AMC-6P maps frontend-friendly create inputs to `rpc_order_vendor_bid_request_create`, maps list to `rpc_order_vendor_bid_requests_for_order`, maps response record to `rpc_order_vendor_bid_response_record`, and maps response select to `rpc_order_vendor_bid_response_select`.
- AMC-6P surfaces RPC errors directly for future UI mapping and adds no UI, routes/nav, assignment-offer calls, selected-bid-to-assignment conversion, order mutations, notifications, or `/amc/*` routes.
- AMC-6Q adds an isolated read-only `BidRequestsPanel` component.
- AMC-6Q loads through `listOrderVendorBidRequests(orderId)` and displays request status, due dates, recipient counts, responded counts, recipient vendor names/statuses, response fee/turn-time details, and selected response summary when present.
- AMC-6Q adds no Request Bids button, response record/select controls, assignment conversion controls, assignment-offer calls, route/nav changes, order mutations, notifications, or `/amc/*` routes.
- AMC-6Q.1 integrates the read-only Bid Requests panel into shared Order Detail near vendor candidates/assignment context.
- AMC-6Q.1 shows the panel only in AMC Operations mode, only for `amc_operations` orders, and only for users with `bid_requests.read`.
- AMC-6Q.1 adds no bid creation, response record/select UI, assignment conversion, backend/schema changes, route/nav changes, order mutations, notifications, or `/amc/*` routes.
- AMC-6R proposes Request Bids as the primary candidate-panel action with candidate multi-select, selected count, select-all-eligible support, and a Request Bids modal.
- AMC-6R modal fields should include message, response due date, desired vendor report due date, and client delivery due date; fee entry remains excluded because vendors respond with fee.
- AMC-6R submit path should call `createOrderVendorBidRequest(...)`, attach candidate snapshots automatically, refresh Bid Requests history, and create no assignment packet.
- AMC-6R keeps direct `Offer Assignment` secondary per candidate, and both Request Bids and direct award should be hidden when an active vendor assignment exists.
- AMC-6R recommended implementation slices: AMC-6R.1 candidate multi-select state, AMC-6R.2 Request Bids modal, AMC-6R.3 create/refresh integration, AMC-6R.4 bid response recording UI later.
- AMC-6R.1 implements candidate selection state only: candidate checkboxes, selected count, `Select all eligible`, `Clear selection`, and ineligible reasons.
- AMC-6R.1 does not add a Request Bids modal, call bid request APIs, create bid rows, record/select responses, convert bids to assignments, change backend/schema/RLS/permissions/routes/nav, mutate orders, send notifications, or create `/amc/*` routes.
- AMC-6R.2 adds a Request Bids modal shell showing selected vendors, message, response due date, desired vendor report due date, client delivery due date, and `No assignment is created until a bid is selected.`
- AMC-6R.2 keeps submit disabled as `Coming next`; it does not call bid request APIs, create bid rows, record/select responses, convert bids to assignments, change backend/schema/RLS/permissions/routes/nav, mutate orders, send notifications, or create `/amc/*` routes.
- AMC-6R.3 enables Request Bids submit through `createOrderVendorBidRequest(...)` using selected candidate recipients and candidate snapshots.
- AMC-6R.3 success closes the modal, clears selection, shows a toast, and refreshes read-only Bid Requests history; errors preserve input and show a friendly message.
- AMC-6R.3 does not create assignments, call assignment-offer APIs, record/select bid responses, mutate orders, add notifications, change backend/schema/RLS/permissions/routes/nav, or create `/amc/*` routes.
- AMC-6S adds manual bid response entry to `BidRequestsPanel` for users with `bid_requests.update`.
- AMC-6S allows response recording only for recipient rows in `pending`, `sent`, or `viewed` status while the parent request remains open for response collection.
- AMC-6S records fee amount, currency, proposed due date, turn time days, and comments through `recordOrderVendorBidResponse(...)`, refreshes Bid Requests history on success, and preserves modal input on error.
- AMC-6S does not select bids, create assignments, call assignment-offer APIs, add vendor portal response, send notifications, mutate orders, change backend/schema/RLS/permissions/routes/nav, or create `/amc/*` routes.
- AMC-6T adds `Select bid` for recorded, unselected responses on open bid requests when the user has `bid_requests.select`.
- AMC-6T confirmation shows vendor name, fee, proposed due date, turn time, comments when present, and states that selecting the bid does not create an assignment yet.
- AMC-6T calls `selectOrderVendorBidResponse(...)`, refreshes Bid Requests history on success, and renders selected/not-selected recipient states returned by the RPC.
- AMC-6T does not create assignments, call assignment-offer APIs, convert selected bids to assignment packets, add notifications, add vendor portal behavior, mutate orders, change backend/schema/RLS/permissions/routes/nav, or create `/amc/*` routes.
- AMC-6U proposes selected-bid conversion through the existing assignment packet lifecycle, with the conversion action on the selected response in Bid Requests as `Create assignment offer` or `Offer assignment from selected bid`.
- AMC-6U maps selected recipient vendor ids, relationship id, response fee/currency/turn time/proposed due date, bid request id, recipient id, response id, and selected bid snapshot into the assignment offer terms and handoff payload.
- AMC-6U recommends a backend selected-bid conversion wrapper before UI exposure unless the existing assignment-offer RPC already validates all selected-bid integrity guards.
- AMC-6U preconditions include AMC order scope, selected response status, no active vendor assignment, assignment-offer authority, active `amc_vendor` relationship, and eligible vendor profile.
- AMC-6U is docs/proposal only and adds no UI, RPCs, assignments, notifications, backend/schema changes, route/nav changes, order mutations, or `/amc/*` routes.
- AMC-6W implements selected-bid conversion through the existing assignment packet lifecycle.
- AMC-6W backend adds `rpc_order_vendor_bid_response_convert_to_assignment_offer(...)`, which loads the selected response, recipient, request, order, relationship, and vendor profile server-side, revalidates selected status and assignment-offer guards, then delegates to `rpc_order_company_assignment_offer(...)`.
- AMC-6W frontend adds `convertSelectedBidToAssignmentOffer(responseId, payload = {})` and a `Create Assignment Offer` action on the selected response summary in `BidRequestsPanel`.
- AMC-6W keeps Selected Bid distinct from Assignment Offer: selecting a bid does not create an assignment, and bid rows remain historical and are not marked converted yet.
- AMC-6W makes Request Bids -> Select Bid -> Create Assignment Offer the primary AMC procurement path, while Direct Award remains secondary for known-vendor single-vendor awards.
- AMC-6W refreshes owner assignment rows after conversion so the created offer appears in the existing Company Assignments panel and packet detail flow.
- AMC-6W does not add vendor self-service bidding, vendor portal routes, client-facing bid approval, stored order procurement status, bid-row converted markers, route/nav changes, or `/amc/*` routes.
- AMC-6V.2 proposes a compact derived AMC bid/procurement status for orders.
- AMC-6V.2 recommended statuses are `Not sent for bid`, `Out for bid`, `Bids received`, `Bid selected`, `Assignment offered`, `Assigned`, `No bids / expired`, and `Cancelled`.
- AMC-6V.2 recommends deriving status from bid request rows, recipient/response state, selected response state, and active `vendor_appraisal` assignment packets rather than storing status on `orders` for MVP.
- AMC-6V.2 recommended summary fields include vendors contacted, responses received, lowest fee, fastest turn time or earliest proposed due date, selected vendor, response deadline, client due date, and assignment status.
- AMC-6V.2 recommended surfaces are an Order Detail summary card, Orders list AMC bid status chip, and later AMC dashboard procurement queue.
- AMC-6V.2 is docs/proposal only and adds no runtime code, stored order fields, migrations, RPCs, UI, assignment behavior changes, order mutations, route/nav changes, notifications, or `/amc/*` routes.
- AMC-6V.3 adds `deriveOrderBidStatus({ bidRequests, activeVendorAssignment })` in `src/features/bids/bidStatus.js`.
- AMC-6V.3 derives status, label, contacted/responded counts, selected vendor, lowest fee, fastest turn time, earliest proposed due date, response/client due dates, assignment status, and display tone from already-loaded data.
- AMC-6V.3 preserves precedence where active assignment wins over bid state and selected bid wins over open/terminal outreach.
- AMC-6V.3 adds no UI, API calls, backend/schema changes, assignment behavior changes, order mutations, route/nav changes, notifications, or `/amc/*` routes.
- AMC-6V.4 adds a read-only AMC bid status card on Order Detail using `deriveOrderBidStatus(...)`.
- AMC-6V.4 gates the card to AMC Operations mode, `amc_operations` orders, and `bid_requests.read`.
- AMC-6V.4 reuses bid request rows loaded by `BidRequestsPanel` through an `onBidRequestsChange` callback to avoid duplicate bid request API calls.
- AMC-6V.4 displays status, contacted/responded counts, lowest fee, fastest turn time or earliest proposed due date, selected vendor, response/client due dates, and active assignment status where available.
- AMC-6V.4 adds no bid creation, response record/select behavior, assignment creation, backend/schema changes, order mutations, route/nav changes, notifications, or `/amc/*` routes.
- AMC-6V.5 proposes an Orders list AMC procurement/bid status chip but recommends deferring UI until a lightweight batched read model exists.
- AMC-6V.5 minimum list labels are `Not sent for bid`, `Out for bid`, `Bids received`, `Bid selected`, `Assignment offered`, and `Assigned`.
- AMC-6V.5 rejects client-side per-order bid request fetches for the Orders list because they create N+1 queries, stale derivation risk, and list performance issues.
- AMC-6V.5 recommends a future server-side projection such as `rpc_amc_order_procurement_summaries(order_ids uuid[])` before adding the chip.
- AMC-6V.5 is docs/proposal only and adds no runtime code, UI, API calls, migrations, RPCs, backend/schema changes, order mutations, route/nav changes, assignment behavior changes, notifications, stored order bid status, or `/amc/*` routes.
- AMC-6X completes the Orders list procurement chip/read model recommended by AMC-6V.5.
- AMC-6X backend adds `rpc_amc_order_procurement_summaries(p_order_ids uuid[])`, returning one summary row per eligible AMC order with status, label, tone, contacted/responded counts, selected vendor, response/client dates, and assignment state.
- AMC-6X frontend adds `fetchAmcOrderProcurementSummaries(orderIds)` and uses it from `UnifiedOrdersTable` with one batched request for visible AMC order ids.
- AMC-6X renders the chip in the `Order / Status` cell beneath the normal appraisal lifecycle status.
- AMC-6X chips render only for AMC Operations rows; Internal Operations rows are excluded.
- AMC-6X status precedence is `Assigned`, `Assignment Offered`, `Bid Selected`, `Responses Received`, `Bids Requested`, then `No Bids`.
- AMC-6X missing summaries render no chip, and fetch errors do not break the Orders table.
- AMC-6X does not add procurement filters, dashboard queue work, client-facing bid review, vendor self-service bidding, stored order bid status, bid-row converted markers, route/nav changes, or `/amc/*` routes.
- AMC-6V.6 closes out the internal manual bid workflow validation through AMC-scoped order visibility, candidate loading, multi-vendor selection, bid request/recipient creation, Bid Requests history display, and owner/admin manual response recording.
- AMC-6V.6 explicitly defers vendor self-service bid response to future AMC-7.
- AMC-7 should cover secure/tokenized bid response links, a minimal vendor-facing response page, no full vendor account requirement for the first version, fee/turn-time/proposed-due-date/comments submission, expiration handling, audit trail, and later authenticated vendor portal workflows.
- AMC-6V.6 is documentation/light-validation only and adds no runtime code, vendor portal, routes/nav, schema/RLS changes, bid behavior changes, assignment behavior changes, notifications, order mutations, or `/amc/*` routes.
- Same `/orders` route should remain; order/dashboard reads should become mode-aware through explicit scope filters rather than `/amc/*` routes.
- Existing Continental internal orders should default to Internal Operations until a human-reviewed backfill identifies real AMC-managed orders.
- Candidate and Offer Assignment UI should be guarded by AMC-scoped order data before product testing.
- Deferred implementation slices for active Vendor Assignment summary display and broader vendor response/revoke handling.
- Future lifecycle roadmap for bid request schema/RPC, multi-select candidate UI, bid comparison, selected-bid-to-assignment conversion, vendor response, and client approval workflows.

Testing Strategy:

- Permission tests for offer authority.
- Regression tests that candidate visibility alone cannot create offers.
- Assignment packet lifecycle tests for offer, accept, decline, cancel, revoke, and complete paths.
- UI tests for explicit owner/admin offer action after implementation is approved.
- UI tests should verify candidate-card button visibility in AMC Operations mode, assignment-offer permission gates, hidden raw ids/JSON, candidate snapshot submission, active-offer error mapping, success refresh behavior, and absence of bid/multi-vendor controls.
- UI tests should verify active vendor assignments hide candidate offer actions while declined, revoked, completed, and cancelled vendor packets remain historical context and do not block a new offer.
- Before testing offers as product behavior, fixtures must include explicit AMC-scoped and internal-scoped orders, and candidate/offer actions must be absent for internal-scoped orders.
- Future bid schema tests should verify table comments, status constraints, current-company/order indexes, AMC-scope guards, active relationship checks, duplicate-open-recipient prevention, and absence of assignment packet writes during request/response.
- Future bid RPC tests should verify payload validation, permission gates, stable error codes, no duplicate open recipients, no assignment writes, lifecycle transitions, and selected response context for later assignment-offer conversion.

Success Criteria:

- Assignment offers are explicit user actions.
- Candidate recommendations do not create assignments automatically.
- Offer creation reuses packet lifecycle infrastructure instead of creating a parallel vendor-offer system.

### AMC-7: Vendor Self-Service Bidding and Performance System

Status: initial token invitation foundation complete through AMC-7A.2. WS-2, WS-3.1, and WS-3.2
are complete for Internal/AMC route and Orders URL filter bleed prevention. WS-4.1 through WS-4.5
are complete for workspace-native navigation architecture documentation and active Internal/AMC
navigation wiring. WS-6 is complete in `../vendor/VENDOR_WORKBENCH_DOCTRINE.md`. AMC-7 should
preserve the Vendor Workspace doctrine so vendor work does not get modeled as an AMC submenu or
throwaway public form.

Purpose: add the first vendor-facing bid response path and track vendor metrics that can inform assignment decisions and reporting.

Dependencies:

- AMC-2 Vendor Directory.
- AMC-6 assignment offer workflow.
- AMC-6 bid request and response workflow.
- Order lifecycle and completion signals.

Deliverables:

- Secure/tokenized bid response link tied to a bid request recipient.
- Limited vendor-facing order detail page with transparent order context for bid decisions.
- `Submit Bid` action from that limited order detail.
- First version does not require a full vendor account.
- Vendor response form for fee, turn time, proposed due date, and comments.
- Expiration handling for stale or invalid bid response links.
- Audit trail for link creation, access, submission, expiration, and coordinator overrides.
- Later authenticated vendor portal workflows.
- Acceptance rate.
- Turn time.
- Revision rate.
- Completion rate.

Workspace and navigation prerequisites before AMC-7 runtime:

- WS-1: workspace doctrine docs.
- WS-2: complete; mode switch navigates to `/dashboard`.
- WS-3.1: complete; workspace switch uses replace navigation and does not preserve query/search state.
- WS-3.2: complete; Orders clears URL filters on mounted `operationsMode` change.
- WS-3.4: deferred; saved view workspace scoping design/migration.
- WS-4.1: complete; workspace-native navigation architecture locked in documentation.
- WS-4.2: complete; `workspaceNavigationDefinitions.js` added active Internal/AMC definitions and inactive future Vendor/Client placeholders.
- WS-4.3a: complete; primary desktop nav visibility derives from workspace definitions with behavior preserved.
- WS-4.3b: complete; AMC desktop/sidebar sections derive from workspace definitions and render Procurement, Vendors, and Clients labels; Internal profile grouping remains unchanged.
- WS-4.4: complete; AMC mobile ordering derives from workspace definitions with behavior preserved; Internal mobile ordering remains unchanged.
- WS-4.5: complete; tests and closeout docs.
- WS-5.1: complete; AMC visual/copy identity layer added through `getWorkspaceIdentity`, with
  Internal identity unchanged/default and no route, permission, data, workflow, command palette,
  saved view, or navigation composition behavior changes.
- WS-5.2: complete; documentation closeout.
- WS-5.3: deferred; optional broader workspace frame accent after visual review.
- WS-6: complete; Vendor Workbench doctrine defines vendor worldview, navigation, dashboard,
  Vendor Order Detail, token versus authenticated access, vendor-facing statuses, documents/tasks,
  billing labels, hidden data, security doctrine, and AMC-7/AMC-8 sequencing.
- WS-7: AMC-7 tokenized vendor order detail.

AMC-7 implementation roadmap:

- AMC-7A: complete through AMC-7A.2; token/invitation backend model and coordinator-side link
  generation.
- AMC-7B: token read RPC for limited Vendor Order Detail.
- AMC-7C: public Vendor Bid Invitation route at `/vendor/bid-invitations/:token`.
- AMC-7D: Submit Bid modal/RPC that uses the existing bid response lifecycle.
- AMC-7E: email link generation/send.
- AMC-8 or later: authenticated Vendor Workbench.

Workspace navigation doctrine:

- Internal Operations: Operations, Management, Reporting, System.
- AMC Operations: Procurement, Vendors, Clients, Analytics, System.
- Future Vendor Workspace: Work, Documents, Financials, Profile.
- Future Client Workspace: Orders, Documents, Messages, Billing, Profile.
- Shared routes such as `/dashboard`, `/orders`, `/calendar`, `/clients`, and `/settings` may
  remain physically shared while workspace context controls meaning, data scope, labels, and actions.
- Hidden workflow routes may remain reachable through contextual links. AMC may hide direct
  Assignments navigation while assignment packets remain reachable from Order Detail after selected
  bid conversion.

AMC-7 tokenized bid links should open a limited-access Vendor Order Detail page. That page should be
designed as the constrained version of the future authenticated Vendor Workspace order detail, not
as a disposable standalone bid form.

AMC-7A.1 completed:

- `public.order_vendor_bid_request_recipient_invitations` stores bid-recipient-scoped invitation
  records.
- `public.rpc_order_vendor_bid_invitation_create(p_recipient_id uuid, p_payload jsonb default '{}')`
  creates invitations for authenticated coordinators with bid update authority.
- Plaintext tokens are returned once and never stored.
- Stored token data is limited to the SHA-256 token hash and last four.
- The create RPC returns `/vendor/bid-invitations/<token>`.
- No public read/submit RPC, public route, email send, or recipient lifecycle mutation was added.

AMC-7A.2 completed:

- `createOrderVendorBidInvitation(recipientId, payload = {})` wraps the invitation create RPC.
- `BidRequestsPanel` exposes `Generate Bid Link` for open/invitable recipients.
- Generated paths display inline as selectable text.
- No copy helper, email send, response recording, bid selection, assignment conversion, or manual
  workflow change was added.

Current internal testing flow:

1. Coordinator creates a bid request.
2. Coordinator clicks `Generate Bid Link`.
3. Coordinator manually copies the displayed path.
4. The public vendor page does not exist yet.
5. AMC-7B must add the public token read RPC before the link becomes usable.

Testing Strategy:

- Unit tests for metric aggregation.
- Token/link authorization and expiration tests.
- Vendor response submission tests.
- Regression tests for assignment and completion event capture.
- Reporting tests for vendor-level summaries.

Success Criteria:

- Vendors can submit a bid response through a constrained self-service path without creating an assignment.
- Performance data can influence recommendations.
- Vendor metrics are explainable and auditable.
- Raw metrics can be shown before any composite score is introduced.

### AMC-8: Assignment Automation

Purpose: support configurable assignment models.

Dependencies:

- AMC-5 Vendor Assignment Engine MVP.
- AMC-6 Assignment Offer Workflow.
- AMC-7 Vendor Performance System.
- AMC Customization Framework.

Deliverables:

- Manual assignment model.
- Ranked recommendation model.
- Round robin model.
- First accept model.
- Company-level assignment philosophy selection.

Testing Strategy:

- Unit tests for each assignment model.
- Configuration tests for company-level mode selection.
- End-to-end tests for outreach and acceptance flows.

Success Criteria:

- Companies can choose assignment philosophy.
- Falcon does not hardcode one AMC operating model.
- Automation remains explainable and overrideable.

### AMC-9: Advanced AMC Features

Purpose: future expansion after AMC MVP foundations are stable.

Dependencies:

- AMC-1 through AMC-8.
- Validated pilot usage and operational feedback.
- Approved scope for portal, bidding, payment, or analytics work.

Deliverables:

- Vendor portals.
- Client portals.
- Bidding.
- Capacity management.
- Advanced analytics.
- Future cross-platform lender correction / revision request workflow for both Internal Operations Mode and AMC Operations Mode.

Deferred correction/revision roadmap:

- correction request lifecycle
- revision status handling
- notifications and reminders
- appraiser/vendor response tracking
- audit trail and history
- client-facing correction communication

Recommended correction/revision doctrine:

- Normal corrections and revisions stay attached to the existing order.
- A correction/revision cycle record should be linked to the order.
- Original completion, delivery, and submission history should be preserved.
- Requested items, requester, due date, assigned user/vendor, status, and resubmission timestamp should be tracked.
- A new order should be created only when scope, property, client engagement, or fee basis materially changes.

Testing Strategy:

- Feature-specific unit, permission, browser, and integration tests.
- Portal access and tenant-boundary testing where applicable.
- Regression coverage against Internal Operations and AMC MVP workflows.

Success Criteria:

- Advanced features build on the shared Falcon platform.
- Portal or automation work does not create a disconnected AMC system.
- Expansion is driven by validated operational need.

## Dependency Graph

```text
AMC-1 -> AMC-2 -> AMC-5
AMC-5 -> AMC-6
AMC-6 -> AMC-7 -> AMC-8
AMC-3 -> AMC-4
AMC-9 depends on AMC-1 through AMC-8
```

Operational notes:

- AMC-1 should precede visible AMC workflows.
- AMC-2 should precede vendor assignment.
- AMC-3 can proceed in parallel with AMC-2 if financial visibility and permissions are scoped.
- AMC-4 depends on enough data from AMC-2 and AMC-3 to be operationally useful.
- AMC-6 depends on candidate selection and existing assignment packet lifecycle.
- AMC-7 depends on real assignment/completion signals from AMC-6.

## Parallel RC1/V1.1 Work

AMC development proceeds alongside:

- Internal pilot testing.
- V1.1 stabilization.
- Workflow refinement.

Internal pilot findings should continuously feed AMC design. Internal Operations remains the proving ground for shared order, calendar, notification, activity, dashboard, and permission infrastructure.

AMC work must not block V1.1 stabilization or change Internal Operations behavior without explicit approval.

## Competitive Advantage Doctrine

Falcon should outperform competitors through:

- fewer clicks
- better visibility
- better assignment recommendations
- better operational awareness
- better presentation
- better customization

Every AMC feature should be evaluated against these principles.

The AMC layer should reduce manual communication, surface operational insights sooner, and make assignment decisions easier than competing AMC platforms.

## Non-Goals

Do not:

- build a separate Falcon AMC platform
- duplicate existing Falcon functionality
- hardcode company-specific workflows
- ignore customization opportunities
- bypass shared permissions
- create a second order, client, calendar, notification, reporting, or user system
- start client portal, vendor portal, bidding, or payment processing before AMC MVP foundations are stable

## Success Definition

AMC MVP is complete when Continental could reasonably operate a small AMC workflow through Falcon without needing vendor portals, bidding systems, or payment processing.

Minimum success means:

- users can switch into AMC Operations Mode
- vendor companies can be managed
- AMC fees and margin can be viewed by authorized users
- AMC work can be monitored from an AMC dashboard
- candidate vendors can be identified and contacted
- AMC procurement can proceed through Request Bids, manual response entry, Select Bid, Create Assignment Offer, and assignment packet lifecycle handoff
- AMC order rows show compact procurement visibility without N+1 bid queries
- vendor performance metrics can begin informing recommendations

Current AMC procurement MVP status:

- Complete for the internal coordinator workflow as of AMC-6X.
- Workspace boundary runtime is enforced for switch-to-dashboard behavior and mounted Orders URL filter resets.
- Deferred: AMC-7 vendor self-service bidding, procurement dashboard queue, client-facing bid review, procurement filters, explicit converted bid row marker, and WS-3.4 saved view workspace scoping.

## Validation

This slice is documentation only.

- No code changes.
- No schema changes.
- Validate diff hygiene with `git diff --check`.
