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
- [AMC Assignment Lifecycle Doctrine](../amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md)
- [AMC Customization Framework](../amc/AMC_CUSTOMIZATION_FRAMEWORK.md)
- [AMC Pilot Readiness Checklist](../amc/AMC_PILOT_READINESS_CHECKLIST.md)
- [AMC-14B Workspace Isolation Checkpoint](../amc/AMC_14B_WORKSPACE_ISOLATION_CHECKPOINT.md)
- [AMC-15 Visual Identity Checkpoint](../amc/AMC_15_VISUAL_IDENTITY_CHECKPOINT.md)
- [AMC-16 Permission Center Foundation](../amc/AMC_16_PERMISSION_CENTER_FOUNDATION.md)
- [AMC-16 Permission Center Checkpoint](../amc/AMC_16_PERMISSION_CENTER_CHECKPOINT.md)
- [AMC-17 Client Portal MVP Foundation](../amc/AMC_17_CLIENT_PORTAL_MVP_FOUNDATION.md)

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

Status: COMPLETE & VALIDATED for Vendor Self-Service Bidding. WS-2, WS-3.1, and WS-3.2 are
complete for Internal/AMC route and Orders URL filter bleed prevention. WS-4.1 through WS-4.5 are
complete for workspace-native navigation architecture documentation and active Internal/AMC
navigation wiring. WS-6 is complete in `../vendor/VENDOR_WORKBENCH_DOCTRINE.md`. AMC-7 preserves
the Vendor Workspace doctrine so vendor work does not get modeled as an AMC submenu or throwaway
public form.

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
- AMC-7B: complete; token read RPC for limited Vendor Order Detail.
- AMC-7B.1: complete; frontend token read wrapper.
- AMC-7C: complete; public Vendor Bid Invitation route at `/vendor/bid-invitations/:token`.
- AMC-7D: complete; public token submit RPC, frontend wrapper, and Vendor Bid Invitation submit
  form using the existing bid response lifecycle.
- AMC-7E.1: complete; coordinator-side `Copy Link` and `Copy Email Text` helpers for manual
  vendor email outreach.
- AMC-7E.2: deferred; contact targeting / selected vendor contact UX if needed.
- AMC-7E.3: deferred; real email queue/send integration.
- AMC-8: post-award assignment lifecycle expansion.
- Authenticated Vendor Workbench remains a future Vendor Workbench Expansion item unless a specific
  AMC-8 implementation slice authorizes runtime vendor access.

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

AMC-7B completed:

- `public.rpc_order_vendor_bid_invitation_read(p_token text)` validates public token reads.
- Valid token reads return a limited Vendor Order Detail payload.
- Invalid, expired, revoked, submitted, closed, or otherwise unavailable tokens return the constant
  response `{ ok: false, error: "bid_invitation_invalid_or_expired" }`.
- Valid reads update invitation telemetry only: `opened_at`, `last_opened_at`, `open_count`, and
  `updated_at`.
- No recipient status mutation, bid response creation, order mutation, or bid request lifecycle
  mutation was added.

AMC-7B.1 completed:

- `readOrderVendorBidInvitation(token)` wraps the token read RPC.
- The wrapper returns `{ ok: true }` and `{ ok: false }` payloads as-is.
- Invalid or expired business responses do not throw; transport/RPC errors still propagate.

AMC-7C completed:

- Public route `/vendor/bid-invitations/:token` was added.
- The route is outside internal `Layout` and `ProtectedRoute`.
- The page uses a standalone public Falcon / Continental layout.
- Valid tokens render limited Vendor Order Detail from the safe payload.
- Invalid, expired, and transport-error states show a generic unavailable page.
- A disabled `Submit Bid` placeholder is present.
- No submit behavior, email send, authenticated Vendor Workbench, response creation, recipient
  lifecycle mutation, order mutation, or request lifecycle mutation was added.

AMC-7D.1 completed:

- `public.rpc_order_vendor_bid_invitation_submit(p_token text, p_payload jsonb)` was added.
- The RPC supports public token-based bid submission.
- Token and lifecycle failures return the constant response
  `{ ok: false, error: "bid_invitation_invalid_or_expired" }`.
- Valid-token bad payloads return
  `{ ok: false, error: "bid_submission_invalid", field_errors: {...} }`.
- Successful submission writes a bid response, marks the recipient `responded`, sets invitation
  `submitted_at`, and advances the request to `partially_responded` or `closed`.
- The submit RPC does not mutate orders, select bids, create assignments, send email, or create
  notifications.

AMC-7D.2 completed:

- `submitOrderVendorBidInvitation(token, payload = {})` wraps the submit RPC.
- Business responses are returned as-is.
- Supabase transport/RPC errors still throw through the shared helper.

AMC-7D.3 completed:

- The public Vendor Bid Invitation page now has a working Submit Bid form.
- The form captures fee amount, currency, turn time days, proposed due date, comments, contact
  name, contact email, and contact phone.
- Successful submission shows `Your bid has been submitted.` and does not re-read the token.
- Invalid/expired submit responses show the generic unavailable state.
- Backend `field_errors` display in the form.

AMC-7E.1 completed:

- Generated bid links now expose `Copy Link`.
- Generated bid links now expose `Copy Email Text`.
- `Copy Email Text` creates a ready-to-paste vendor bid request email draft.
- No actual email send occurs.
- No `email_queue`, Resend, Edge Function, notification, or backend behavior was added.
- Clipboard unavailable/failure fallback leaves the generated link visible and tells the
  coordinator to select the text manually.
- This supports manual Gmail testing with safe test vendor contacts.

Current end-to-end flow:

1. Coordinator creates a bid request.
2. Coordinator clicks `Generate Bid Link`.
3. Coordinator copies the generated link or clicks `Copy Email Text`.
4. Coordinator manually pastes/sends the email text through Gmail or another external mail client.
5. Vendor opens the public route.
6. Vendor reviews the safe limited Vendor Order Detail.
7. Vendor submits the bid.
8. The bid response appears in the existing internal bid lifecycle.
9. Coordinator can select the bid and create an assignment offer.

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

### AMC Procurement + Vendor Self-Service MVP

Status: VALIDATED.

Validation was completed using test order `AMC-DEMO-003` and the approved test vendor contacts
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

### AMC Vendor Execution Loop Validation

Status: VALIDATED.

Validated using `AMC-DEMO-003`.

Milestone status:

- AMC-7 Vendor Self-Service Bidding: COMPLETE & VALIDATED.
- AMC-8A Assignment Offer Acceptance MVP: COMPLETE & VALIDATED.
- AMC-8B Vendor Work Tracking MVP: COMPLETE & VALIDATED.

Validated public routes:

- `/vendor/bid-invitations/:token`.
- `/vendor/assignment-offers/:token`.
- `/vendor/assignment-work/:token`.

Validated coordinator/vendor flow:

1. Coordinator selected vendor bid.
2. Coordinator created assignment offer.
3. Coordinator generated assignment offer link.
4. Vendor opened public assignment offer page.
5. Vendor accepted assignment.
6. Assignment activity logged acceptance.
7. Coordinator generated work link.
8. Vendor opened public work page.
9. Vendor clicked Start Work.
10. Assignment moved to In Progress.
11. Vendor clicked Submit Report.
12. Assignment moved to Submitted.
13. Submission note persisted.
14. Assignment activity logged Offered, Accepted, Started, and Submitted.
15. Coordinator notifications fired for acceptance and submission.

Validation notes resolved during deployed validation:

- Assignment invitation action was hidden because an owner packet exposed `id` instead of
  `assignment_id`.
- Production database was missing the assignment invitation create RPC migration.
- Generated vendor links initially used relative paths instead of absolute public URLs.

Architecture doctrine preserved:

- Offer tokens and work tokens are separate.
- Offer token is for accept/decline only.
- Work token is for post-accept work status actions.
- No vendor login is required for the MVP.
- Public work tracking does not mutate the main order lifecycle.
- Canonical assignment lifecycle remains coarse: `offered`, `accepted`, `in_progress`,
  `submitted`, `completed`, `declined`, `cancelled`, and `revoked`.
- Appraisal-specific states such as `inspection_complete` or `report_in_progress` should not be
  added to canonical assignment status yet.

Post-MVP Procurement Enhancements:

- AMC-7E.2 contact targeting UX.
- AMC-7E.3 automated email send.
- Delivery/open tracking UI.
- Copy helper polish.
- Submitted-token read state.
- Potential shared SQL helper for manual/token response semantics if duplication grows.

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
  `../amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md`.
- Vendor acceptance / decline.
- Assignment progress tracking.
- Report submission.
- Revision workflow.
- Lifecycle automation after manual lifecycle behavior is validated.

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

### AMC-8: Assignment Lifecycle Expansion

Status: AMC-8A Assignment Offer Acceptance MVP and AMC-8B Vendor Work Tracking MVP are COMPLETE &
VALIDATED using `AMC-DEMO-003`. AMC-8C through AMC-8E remain future expansion.

Purpose: define and implement the post-award lifecycle for AMC vendor assignment packets after a
selected bid has been converted into a `vendor_appraisal` assignment offer.

Dependencies:

- AMC-5 Vendor Assignment Engine MVP.
- AMC-6 Assignment Offer Workflow.
- AMC-7 Vendor Self-Service Bid Submission.
- Shared assignment packet infrastructure.
- Vendor Workbench doctrine.

Canonical doctrine:

- `../amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md`

Validated MVP deliverables:

- Public assignment offer link at `/vendor/assignment-offers/:token`.
- Vendor accept/decline without a Falcon account.
- Separate public work link at `/vendor/assignment-work/:token`.
- Vendor Start Work transition from `accepted` to `in_progress`.
- Vendor Submit Report transition from `in_progress` to `submitted`.
- Assignment activity and coordinator notifications for accepted and submitted lifecycle events.

Future deliverables:

- Appraisal-specific overlay states such as Inspection Complete and Report In Progress without
  adding them to canonical assignment status yet.
- Vendor action model expansion: Mark Inspection Complete, Upload Report, Upload Revised Report,
  and Resubmit.
- AMC coordinator action model: Revoke, Monitor, Forward to Review, Send Back to Vendor, and Close
  Lifecycle.
- Vendor Workbench queue model: Assignment Offers, Active Assignments, Awaiting Revision, and
  Completed Work.
- Decision-first assignment UX: vendor, status, due date, and next action first; details behind
  expansion.
- Client visibility model: Assignment Accepted, Inspection Scheduled, In Review, and Delivered.
- Report submission doctrine for report, optional photos, and optional workfile without email
  attachments as the canonical delivery path.
- Structured revision workflow events.
- Future lifecycle automation after manual behavior is validated.

Implementation phases:

- AMC-8A: Accept / Decline.
- AMC-8B: Work Status Tracking.
- AMC-8C: Report Submission.
- AMC-8D: Revision Workflow.
- AMC-8E: Lifecycle Automation.

Testing Strategy:

- Unit tests for assignment state transitions and allowed actions.
- Permission tests for vendor and AMC coordinator actions.
- UI tests for decision-first assignment cards and contextual packet actions.
- Upload/submission tests once report submission exists.
- Revision workflow tests once structured revision events exist.
- Regression tests preserving AMC procurement, selected bid conversion, and internal assignment
  behavior.

Success Criteria:

- Vendor assignments can move from offer through completion without leaving Falcon.
- Vendors can act on assignment offers and submit required report materials through the packet
  workflow.
- AMC coordinators can monitor, review, request revision, and close lifecycle states.
- Selected bid context remains preserved through assignment execution.
- Automation is deferred until manual lifecycle behavior is reliable, explainable, and auditable.

### AMC-9: Advanced AMC Features

Status: AMC-9 Vendor Workspace bidding runtime is complete through AMC-9H closeout and polish.
Vendor Workspace doctrine remains defined in `../vendor/VENDOR_WORKBENCH_DOCTRINE.md`.

Purpose: authenticated vendor-facing expansion after AMC MVP foundations are stable.

Dependencies:

- AMC-1 through AMC-8.
- Validated AMC procurement, public bidding, and assignment execution loops.
- Vendor Workspace permission foundation.
- Existing bid request/recipient/response lifecycle.

Completed AMC-9 runtime deliverables:

- Authenticated Vendor Workspace shell and route guard.
- Vendor Dashboard with vendor-native cards and implemented links for Available Work and My Bids.
- Available Work list for current-company open vendor opportunities.
- Work Detail at `/vendor-workspace/available-work/:workKey`, preserving route compatibility while
  using Work Detail terminology.
- Authenticated Submit Bid through the existing bid response lifecycle.
- Authenticated Pass Opportunity through the existing bid recipient lifecycle.
- My Bids / Passed Opportunities history at `/vendor-workspace/my-bids`.
- Unified Work Detail read model for available, viewed, submitted, passed/declined, selected,
  not-selected, and expired bid states.
- Vendor-visible document metadata and secure document opening through opaque document keys and
  short-lived signed URLs.

AMC-9 guardrails preserved:

- Vendor Workspace uses current-company scope.
- Vendor work is scoped to active AMC vendor relationship/profile rows.
- Vendor work is limited to AMC-scoped orders.
- No shared `/orders` route is exposed to vendors.
- No owner-side procurement or document APIs are used by Vendor Workspace UI.
- No raw order ids, relationship ids, recipient ids, vendor profile ids, document ids, storage
  buckets, storage paths, client fees, AMC margins, candidate scores, competing bids, or internal
  notes are exposed.
- Existing bid and recipient lifecycle semantics are reused; no parallel vendor bid system was
  created.

Future Vendor Workspace expansion deliverables:

- Vendor report upload and revision workflow.
- Vendor profile and coverage review/management.
- Vendor invoices and payment visibility.
- Client portals.
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
- Authenticated vendors can manage bid opportunities and bid history without internal route or data
  exposure.
- Vendor document access is authorized through opaque keys and short-lived signed URLs.

### AMC-10: Vendor Assigned Order Execution

Status: AMC-10A through AMC-10I are complete. Authenticated Vendor Workspace assigned-order
execution now covers queue, detail, start work, report upload/submission, assignment-scoped
document access, vendor revision resubmission, coordinator revision requests, and closeout polish.

Purpose: extend the validated assignment offer and work-token lifecycle into authenticated Vendor
Workspace execution surfaces without creating a second assignment system.

Dependencies:

- AMC-8B validated assignment work tracking.
- AMC-9 authenticated Vendor Workspace shell.
- Existing `order_company_assignments` vendor assignment lifecycle.
- Vendor assignment permissions.

Completed AMC-10A deliverables:

- Authenticated Assigned Orders route at `/vendor-workspace/assigned-orders`.
- `rpc_vendor_workspace_assigned_orders()` read model for current-company vendor assignment rows.
- Frontend `fetchVendorWorkspaceAssignedOrders()` API wrapper.
- Vendor Workspace navigation enables `Assigned Orders`.
- Assigned Orders page with Active, Due Soon, Needs Attention, and Submitted summary cards.
- Vendor-safe assigned order cards with property summary, owner company, report type, assignment
  status, accepted date, due date, inspection/appointment status where available, report submitted
  state, next action label, and attention flag.
- Assigned order rows link to the authenticated detail route added in AMC-10B.

Completed AMC-10B deliverables:

- Authenticated Assigned Order Detail route at
  `/vendor-workspace/assigned-orders/:assignmentWorkKey`.
- `rpc_vendor_workspace_assigned_order_detail(p_assignment_work_key text)` read model for
  current-company vendor assignment rows.
- Frontend `fetchVendorWorkspaceAssignedOrderDetail(assignmentWorkKey)` API wrapper.
- Assigned Order Detail page labeled as `Assigned Order Detail`.
- Detail sections for Status / Next Action, Property, Assignment Timeline, Scope & Instructions,
  Documents, and Report Submission.
- Vendor-safe detail fields for property summary, owner company, report type, assignment status,
  accepted date, due date, inspection/appointment status where available, report submitted state,
  next action label, attention flag, scope summary, vendor instructions, submitted report summary,
  and safe revision summary when represented.
- Vendor-visible assignment document metadata is displayed without opening/downloading from this
  route yet; assignment-scoped document authorization remains a future enhancement.
- `Start Work`, `Submit Report`, and revision actions remain disabled placeholders for future
  AMC-10 lifecycle slices.

Completed AMC-10C deliverables:

- `rpc_vendor_workspace_start_assigned_order(p_assignment_work_key text)` authenticated lifecycle
  action.
- Frontend `startVendorWorkspaceAssignedOrder(assignmentWorkKey)` API wrapper.
- Assigned Order Detail enables `Start Work` when an accepted assignment has not started.
- Start Work success refreshes assigned order detail so the server-derived status becomes
  `In Progress`.
- Start Work records the same `assignment.started` activity/notification event used by existing
  assignment lifecycle behavior.
- Already-started, submitted, completed, unavailable, and wrong-company/wrong-vendor states do not
  expose internal details and render friendly vendor-facing errors.

Completed AMC-10D deliverables:

- `rpc_vendor_workspace_submit_report(p_assignment_work_key text, p_payload jsonb)` authenticated
  lifecycle action.
- Frontend `submitVendorWorkspaceReport(assignmentWorkKey, payload)` API wrapper.
- Assigned Order Detail enables `Submit Report` for eligible in-progress and revision-requested
  assignments.
- Submit Report captures an optional delivery note and accepts opaque uploaded report document
  references.
- Submit Report success refreshes assigned order detail so the server-derived status becomes
  `Submitted / Awaiting Review`.
- Submit Report records the same `assignment.submitted` activity/notification event used by
  existing assignment lifecycle behavior.
- Not-started, already-submitted, completed, unavailable, and wrong-company/wrong-vendor states do
  not expose internal details and render friendly vendor-facing errors.
- Submit Report now requires at least one registered vendor report document.

Completed AMC-10E deliverables:

- `rpc_vendor_workspace_authorize_assignment_document_access(p_assignment_work_key text,
  p_document_key text)` authenticated document authorization RPC.
- `rpc_vendor_workspace_assignment_document_storage_lookup(p_assignment_work_key text,
  p_document_key text)` service-role-only storage lookup for signed URL generation.
- Existing `vendor-workspace-document-download-url` Edge function now supports assignment-scoped
  document downloads through `assignment_work_key` while preserving the existing bid opportunity
  document path.
- Frontend `createVendorWorkspaceAssignmentDocumentDownloadUrl(assignmentWorkKey, documentKey)` API
  wrapper.
- Assigned Order Detail documents now expose enabled `Open` actions with per-document loading and
  friendly unavailable states.
- Assignment document access requires current-company vendor scope, active AMC vendor
  relationship/profile, AMC order scope, assigned vendor assignment scope, `vendor_documents.read`,
  and vendor-visible document visibility.
- Signed URLs are short-lived and storage bucket/path values remain backend-only.

Completed AMC-10F deliverables:

- `rpc_vendor_workspace_prepare_report_document_upload(p_assignment_work_key text, p_payload jsonb)`
  authenticated report upload preparation RPC for Edge signing.
- `rpc_vendor_workspace_register_report_document(p_assignment_work_key text, p_payload jsonb)`
  authenticated report document registration RPC.
- `vendor-workspace-report-upload-url` Edge function creates signed upload URLs for server-created
  pending report document metadata.
- Frontend `createVendorWorkspaceReportUploadUrl(...)` and
  `registerVendorWorkspaceReportDocument(...)` API wrappers.
- Assigned Order Detail Submit Report panel now supports selecting and uploading PDF report files.
- Submit Report wires registered opaque document keys into
  `submitVendorWorkspaceReport(assignmentWorkKey, payload)`.
- Server-side Submit Report validation rejects empty, malformed, inactive, or unavailable report
  document keys.
- Uploaded report documents are stored as existing `order_documents` metadata with `final_report`
  category, `vendor` visibility, private storage paths, and no new document system.
- Assigned Order Detail refreshes show submitted report file count and vendor-visible document
  metadata without exposing raw storage paths.

Completed AMC-10G deliverables:

- Assigned Order Detail now exposes vendor-safe revision request state for authenticated vendors:
  request date, coordinator/company label, revision due date, prior submitted report metadata, and
  revision instructions/summary.
- `rpc_vendor_workspace_resubmit_report(p_assignment_work_key text, p_payload jsonb)` authenticated
  revision resubmission RPC.
- Frontend `resubmitVendorWorkspaceReport(assignmentWorkKey, payload)` API wrapper.
- Revision-requested assignments suppress the normal `Submit Report` action and show
  `Upload Revision File` / `Resubmit Report`.
- Revision resubmission reuses AMC-10F report upload prepare/register plumbing and existing
  `order_documents` metadata.
- Resubmission requires `vendor_assignments.progress`, `vendor_documents.upload`, active AMC vendor
  relationship/profile scope, AMC-scoped order scope, current vendor assignment scope, and
  `revision_requested` assignment state.
- Resubmission rejects empty, malformed, inactive, unavailable, or non-vendor-visible report
  document keys.
- Successful resubmission moves the existing assignment packet back to `submitted`, stamps
  `submitted_at`, records resubmission metadata in `submission_payload`, and logs/notifies
  `assignment.resubmitted`.

Completed AMC-10H deliverables:

- `rpc_amc_request_vendor_assignment_revision(p_assignment_id uuid, p_payload jsonb)` coordinator
  revision request RPC.
- Frontend assignment API wrapper for coordinator revision requests.
- Owner Assignment Packet exposes `Request Revision` for submitted `vendor_appraisal` assignments.
- Coordinator revision modal captures vendor-facing instructions and optional due date.
- Revision request moves the existing assignment packet to `revision_requested`, preserves prior
  submitted report metadata, stores vendor-facing revision instructions under
  `submission_payload.revision`, and logs/notifies `assignment.revision_requested`.
- Owner Order Detail assignment summary shows revision-requested status and safe revision summary
  fields without exposing raw submission JSON.
- Internal-only coordinator notes were intentionally deferred because the current
  activity/notification payload path is shared.

Completed AMC-10I closeout:

- Assigned Orders and Assigned Order Detail visible labels are normalized to vendor-native states:
  `Accepted`, `In Progress`, `Submitted / Awaiting Review`, `Revision Requested`,
  `Resubmitted / Awaiting Review`, and `Completed`.
- Dashboard and Assigned Orders summaries count `revision_requested` work as active and needing
  vendor attention.
- Submitted, resubmitted, completed, and unavailable states explain why vendor actions are blocked.
- Report upload/submission and document-open errors remain friendly and do not expose storage,
  RPC, or internal implementation details.
- AMC-10 documentation and Vendor Workbench doctrine now describe the completed assigned-order
  execution scope, guardrails, and future work.

AMC-10 guardrails preserved:

- Current-company scope only.
- Active AMC vendor relationship/profile required.
- AMC-scoped orders only.
- Vendor assigned orders only.
- Requires `vendor_assignments.read`.
- No shared `/orders` route.
- No raw order ids, assignment ids, relationship ids, vendor profile ids, storage paths, client
  fees, AMC margins, internal notes, candidate scores, or procurement scoring are exposed.
- No owner-side procurement APIs are used.
- The existing assignment/work lifecycle is reused; no parallel execution system is created.
- No assignment offers or order lifecycle state are mutated by the authenticated detail read model.
- Authenticated Start Work mutates only the assigned vendor assignment packet lifecycle, not the
  shared order lifecycle or token routes.
- Authenticated Submit Report mutates only the assigned vendor assignment packet lifecycle, not the
  shared order lifecycle or token routes.
- Assignment-scoped document opening uses opaque assignment/document keys only and does not expose
  raw ids or storage paths.
- Report upload uses opaque assignment/document keys, server-generated storage targets, and
  short-lived signed upload URLs only; raw bucket/path values remain backend-only.
- Report upload and submit require `vendor_documents.upload` and `vendor_assignments.progress` and
  mutate only existing order document metadata plus the assignment packet submission lifecycle.
- Revision resubmission mutates only the existing assignment packet submission lifecycle and
  existing report document metadata; it does not create a second revision system.
- Coordinator revision requests mutate only the existing assignment packet lifecycle and vendor-safe
  revision payload; they do not mutate the base order lifecycle or public token routes.
- Internal notes are not exposed to vendors.

Recommended next phase:

- Cleanup/expiration for abandoned pending vendor report uploads.
- Vendor invoices and payment visibility.
- Vendor profile and coverage request/review workflow.

### AMC-11: Internal Review Enhancements

Status: AMC-11A internal-only coordinator notes, AMC-11B abandoned pending vendor report upload
cleanup, AMC-11C Vendor Workspace profile/coverage read model, AMC-11D Vendor Profile/Coverage edit
requests, and AMC-11E internal review for vendor profile update requests are complete.

Purpose: add safe AMC/internal review tooling around vendor assignment execution without exposing
private coordinator reasoning to Vendor Workspace users, public token routes, activity payloads, or
notifications.

Completed AMC-11A deliverables:

- `order_company_assignment_internal_notes` internal-only table for coordinator notes scoped to a
  vendor assignment, source order, owner company, and author.
- `rpc_amc_vendor_assignment_internal_notes(p_assignment_id uuid)` owner/AMC-only read RPC.
- `rpc_amc_add_vendor_assignment_internal_note(p_assignment_id uuid, p_payload jsonb)` owner/AMC-only
  create RPC.
- Frontend assignment API wrappers for listing and adding internal notes.
- Owner Assignment Packet now includes an `Internal coordinator notes` panel for private
  review/revision/completion/general notes.
- Notes are separate from vendor-facing revision instructions, assignment activity, notification
  payloads, token payloads, Vendor Workspace RPCs, and the shared order lifecycle.

Completed AMC-11B deliverables:

- Pending Vendor Workspace report upload metadata now has `upload_expires_at`,
  `upload_expired_at`, and `upload_cleanup_note` fields.
- `order_documents.status` now supports `expired` for abandoned pending upload metadata.
- New Vendor Workspace report upload metadata gets a conservative 24-hour expiration timestamp when
  inserted as pending `final_report` / `vendor` rows under the assignment-scoped upload path.
- Existing pending Vendor Workspace report upload metadata is backfilled with a 24-hour expiration
  timestamp from creation time when missing.
- `rpc_amc_cleanup_abandoned_vendor_report_uploads(p_older_than interval, p_limit integer)`
  service-role maintenance RPC marks stale pending upload metadata expired.
- Cleanup is idempotent, bounded, and safe to run repeatedly.
- Storage object deletion is intentionally deferred to a storage-aware maintenance worker; AMC-11B
  performs metadata-only cleanup and returns no bucket/path values.

Completed AMC-11C deliverables:

- Read-only Vendor Workspace Profile route at `/vendor-workspace/profile`.
- Vendor Workspace navigation enables `Profile`.
- `rpc_vendor_workspace_profile()` returns current-vendor company, safe contact, coverage,
  accepted work type, status, default turn time, compliance summary, and last-updated data.
- `fetchVendorWorkspaceProfile()` frontend wrapper reads only the vendor-scoped profile RPC.
- Profile UI sections cover Company, Contacts, Coverage, Accepted Work Types, and Compliance /
  Documents.
- Direct live profile editing remains explicitly deferred.
- Empty coverage, contact, accepted work type, and compliance states use vendor-native copy.

Completed AMC-11D deliverables:

- `vendor_profile_update_requests` internal review queue table with opaque `request_key` values.
- `rpc_vendor_workspace_submit_profile_update_request(p_payload jsonb)` creates pending vendor
  profile/contact/coverage/accepted work type update requests.
- `rpc_vendor_workspace_profile_update_requests()` returns vendor-safe pending/recent request
  summaries.
- Frontend Vendor Workspace API wrappers submit and list profile update requests.
- Vendor Profile page exposes `Request Update` and a review-first modal for contact, company phone
  / website, coverage states/counties/markets, accepted property/report types, and comments.
- Vendors can see pending/recent profile update request status from the Profile page.
- Internal owner/admin-style users are notified when a request is submitted.
- Live vendor profile, contact, service-area, relationship, compliance document, pricing, and
  matching coverage data are not mutated by vendor-submitted requests.

Completed AMC-11E deliverables:

- `rpc_amc_vendor_profile_update_requests(p_status text)` returns the internal AMC review queue for
  owner/current-company users with vendor management authority.
- `rpc_amc_review_vendor_profile_update_request(p_request_key text, p_payload jsonb)` approves or
  rejects pending vendor-submitted profile update requests by opaque request key.
- Approval is the only path that applies requested live vendor profile, primary contact,
  product-eligibility, or coverage rows from the request payload.
- Rejection preserves request history and does not mutate operational vendor data.
- Vendor Directory now includes an internal `Profile Update Requests` review queue with current /
  proposed summaries, reviewer note, and approve/reject actions.
- Vendors can see safe approved/rejected decision status and reviewer message from the existing
  Vendor Workspace Profile request history.
- Vendor-facing notifications contain only safe decision copy and the opaque request key.

AMC-11A guardrails preserved:

- Owner/current-company scope only.
- Requires owner assignment read access and review/complete authority to create notes.
- AMC-scoped `vendor_appraisal` assignments only.
- No Vendor Workspace exposure.
- No public token exposure.
- No notification or shared activity payload exposure.
- No assignment/order lifecycle mutation.
- No storage paths, client fees, AMC margins, candidate/procurement data, or vendor-facing revision
  instructions are returned by the internal note RPCs.
- Pending upload cleanup affects only pending, vendor-visible `final_report` metadata created by
  Vendor Workspace assigned-order report upload paths.
- Submitted/resubmitted active report documents, wrong document types, non-vendor documents, active
  vendor-visible order documents, assignment lifecycle, order lifecycle, public token routes,
  notifications, and storage objects are not mutated by cleanup.
- Vendor Profile read model is current-company scoped, requires `vendor_profile.read`, requires an
  active AMC vendor relationship/profile, returns no raw relationship/profile ids, excludes
  coordinator notes, pricing, client fees, AMC margin, owner-side APIs, and edit mutations.
- Vendor Profile update requests are current-company scoped, require `vendor_profile.update`,
  require an active AMC vendor relationship/profile, return opaque request keys only, exclude raw
  ids/internal notes/pricing/client fees/AMC margin/compliance uploads, and do not call owner-side
  Vendor Directory mutation APIs.
- Internal profile update review is owner/current-company scoped, requires `vendors.read` and
  `vendors.update`, requires contact/service-area management authority before approval applies
  contact or coverage changes, uses opaque request keys, and does not expose internal notes,
  pricing, client fees, AMC margin, compliance uploads, raw ids, or owner-only mutation details to
  Vendor Workspace.

### AMC-12: Vendor Financial Visibility

Status: AMC-12A Vendor Invoices and Payment Visibility read model, AMC-12B Vendor Invoice
Submission Workflow, AMC-12C Internal Invoice Review and Approval Queue, AMC-12D Corrected
Vendor Invoice Resubmission, AMC-12E Payment Ledger and Scheduling Foundation, and AMC-12F Vendor
Payments Closeout and Polish are complete.

Purpose: add safe Vendor Workspace payment visibility for assigned/completed AMC work and allow
vendors to submit invoice documents for payment-eligible assignments while internal AMC users can
review invoices and track scheduled/paid ledger status without external payment processing.

Completed AMC-12A deliverables:

- Vendor Workspace route `/vendor-workspace/payments`.
- Vendor Workspace navigation enables `Payments`.
- `vendor_payments.read` vendor-side permission is seeded and granted to the Vendor Admin template.
- `rpc_vendor_workspace_payments()` returns current-vendor payment visibility rows scoped to
  assigned AMC `vendor_appraisal` assignment packets.
- `fetchVendorWorkspacePayments()` frontend wrapper reads the vendor-scoped payment RPC.
- Payments UI includes summary cards for Ready for Invoice, Invoice Received, Approved, Scheduled,
  Paid, On Hold, and Rejected.
- Payment rows show vendor-safe property, owner company, report type, assignment/completion date,
  payable vendor amount when modeled in assignment terms or selected vendor bid handoff, invoice
  status, payment status, payment date/reference label when safely modeled, and next action copy.
- Empty, loading, and unavailable states use vendor-native copy and explain that payments become
  visible once assignments reach payment-eligible states.

AMC-12A guardrails preserved:

- Current vendor company scope only.
- Requires `vendor_payments.read`.
- Requires active AMC vendor relationship/profile rows.
- AMC-scoped orders only.
- Vendor assigned work only.
- No client fees, AMC margin, owner-side financial notes, raw assignment/order/payment ids, storage
  paths, payment mutations, invoice uploads, shared `/orders`, or owner-side financial APIs.

Completed AMC-12B deliverables:

- `vendor_invoices.submit` vendor-side permission is seeded and granted to the Vendor Admin
  template.
- `rpc_vendor_workspace_prepare_invoice_upload(p_assignment_work_key text, p_payload jsonb)`
  prepares a vendor-scoped invoice upload using the existing `order_documents` metadata model.
- `vendor-workspace-invoice-upload-url` Edge function signs the server-generated invoice storage
  target and returns only a short-lived signed URL plus safe document metadata.
- `rpc_vendor_workspace_register_invoice_document(p_assignment_work_key text, p_payload jsonb)`
  activates uploaded invoice document metadata after storage object validation.
- `rpc_vendor_workspace_submit_invoice(p_assignment_work_key text, p_payload jsonb)` validates
  invoice number, invoice amount, invoice date, vendor note, and opaque invoice document keys, then
  stores `invoice_received` status on the assignment submission payload.
- `createVendorWorkspaceInvoiceUploadUrl(...)`, `registerVendorWorkspaceInvoiceDocument(...)`, and
  `submitVendorWorkspaceInvoice(...)` frontend wrappers support the Vendor Workspace flow.
- Payments rows in `ready_for_invoice` state expose a `Submit Invoice` panel for PDF upload,
  invoice number, invoice amount, invoice date, and vendor note.
- Successful invoice submission refreshes Payments and moves the row into awaiting payment review
  visibility.
- Owner/admin users receive a safe invoice-submitted notification.

AMC-12B guardrails preserved:

- Current vendor company scope only.
- Requires `vendor_payments.read` and `vendor_invoices.submit`.
- Requires active AMC vendor relationship/profile rows.
- AMC-scoped orders only.
- Vendor assigned/completed work only.
- Invoice documents use opaque document keys and existing `order_documents` metadata.
- Invoice submission records `invoice_received` only; it does not approve, schedule, or mark
  payments paid.
- No client fees, AMC margin, owner-side financial notes, raw assignment/order/payment ids, storage
  paths, payment approval/scheduling, shared `/orders`, or owner-side financial APIs.

Completed AMC-12C deliverables:

- `rpc_amc_vendor_invoices(p_status text default null)` returns an internal AMC invoice review
  queue for `invoice_received`, `approved`, `on_hold`, and `rejected` states.
- `rpc_amc_review_vendor_invoice(p_invoice_key text, p_payload jsonb)` approves, holds, or rejects
  submitted vendor invoices by opaque invoice key.
- Internal review requires `vendors.read` and `billing.update`, current-owner company scope, active
  AMC vendor relationships, AMC-scoped orders, and invoice-bearing `vendor_appraisal` assignments.
- Internal review stores invoice status, reviewed timestamp, reviewer, optional approved amount,
  internal reviewer note, and vendor-facing message under the existing invoice payload.
- Internal reviewer notes are stored separately from vendor-facing messages and are not included in
  vendor notifications.
- Vendor notifications receive only safe invoice review status and vendor-facing message.
- Vendor Directory now includes an internal `Vendor Invoice Review` queue with status filters,
  invoice summary rows, existing internal document-download access for invoice PDFs, and
  approve/hold/reject review modal.
- Vendor Payments can display safe rejected invoice status after internal review.

AMC-12C guardrails preserved:

- No Vendor Workspace approval path.
- No payment scheduling, paid-state mutation, or payment ledger mutation.
- No mutation of assignment/order lifecycle.
- Submitted invoice documents and metadata are preserved.
- Vendor-facing payloads exclude internal reviewer notes.
- No client fees, AMC margin, owner-side financial notes, raw ids in vendor-facing views, or
  procurement/candidate data.

Completed AMC-12D deliverables:

- `rpc_vendor_workspace_resubmit_invoice(p_assignment_work_key text, p_payload jsonb)` allows a
  vendor to submit corrected invoice metadata and invoice document keys after an invoice has been
  rejected.
- Corrected invoice upload/register reuses the existing Vendor Workspace invoice upload and
  `order_documents` metadata path rather than creating a second document system.
- `resubmitVendorWorkspaceInvoice(...)` wraps the corrected invoice RPC, while corrected upload and
  register aliases intentionally delegate to the existing invoice upload/register wrappers.
- Vendor Payments rejected rows show the safe vendor-facing rejection message, prior invoice
  summary, and `Submit Corrected Invoice` flow.
- Corrected submission preserves the prior rejected invoice payload in invoice history, writes the
  current invoice back to `invoice_received`, and notifies owner/admin users for review.
- Internal invoice review queue rows see the corrected invoice as `invoice_received` through the
  existing review queue.

AMC-12D guardrails preserved:

- Corrected invoice resubmission is current-vendor-company scoped, requires `vendor_payments.read`
  and `vendor_invoices.submit`, requires active AMC vendor relationship/profile rows, requires AMC
  order scope, and requires the assignment to belong to the vendor.
- Resubmission is allowed only after rejected invoice status.
- Prior rejected invoice metadata/history is preserved.
- Corrected invoice submission does not approve, hold, schedule, pay, mutate order lifecycle, or
  expose owner-side financial review controls to Vendor Workspace.
- No client fees, AMC margin, owner-side financial notes, raw ids, storage paths, shared `/orders`,
  or owner-side financial APIs are exposed.

Completed AMC-12E deliverables:

- `amc_vendor_payment_ledger` internal-only table tracks scheduled and paid vendor payment ledger
  entries for approved AMC vendor invoices.
- `rpc_amc_vendor_payment_ledger(p_status text default null)` returns an internal AMC payment queue
  for approved, scheduled, and paid vendor invoice/payment rows.
- `rpc_amc_schedule_vendor_payment(p_invoice_key text, p_payload jsonb)` schedules only approved
  vendor invoices, creates or updates a ledger entry, and moves vendor-visible status to
  `scheduled`.
- `rpc_amc_mark_vendor_payment_paid(p_payment_key text, p_payload jsonb)` marks only scheduled
  vendor payments paid, stamps paid date/reference, and moves vendor-visible status to `paid`.
- Internal Vendor Directory finance area now includes a `Vendor Payment Ledger` queue with Approved,
  Scheduled, and Paid filters.
- Internal users can schedule approved invoices and mark scheduled payments paid with payment date,
  method label, safe reference label, internal note, and separate vendor-facing payment note.
- Vendor Payments displays safe scheduled/paid status, payment date, payment method label,
  reference label, and vendor-facing payment note.

AMC-12E guardrails preserved:

- Ledger and scheduling RPCs are current-owner-company scoped and require `vendors.read` plus
  `billing.update`.
- Scheduling is allowed only from approved invoice state; mark-paid is allowed only from scheduled
  ledger state.
- Internal notes remain internal-only and are not returned through Vendor Workspace payment reads.
- Vendor-facing payment notes are separate from internal notes.
- Scheduling/paid actions do not call banks, ACH providers, payment processors, or external payment
  services.
- No client fees, AMC margin, bank account details, raw ids in Vendor Workspace, payment processor
  calls, internal notes to vendors, or invoice review history mutation are introduced.

Completed AMC-12F closeout:

- Vendor-facing payment labels are normalized to `Ready for Invoice`, `Invoice Received`,
  `Approved`, `Scheduled`, `Paid`, `On Hold`, and `Rejected`.
- Vendor Payments summary cards now count each normalized status independently.
- Rejected invoice rows clearly show the vendor-facing rejection message, prior invoice summary,
  and corrected invoice submission path.
- Scheduled and paid rows show only safe payment method label, payment date, reference label, and
  vendor-facing payment note.
- Internal invoice review and payment ledger copy explicitly separates private internal notes from
  vendor-facing messages/payment notes.
- AMC implementation documentation and Vendor Workbench doctrine now close out AMC-12 scope and
  guardrails.

AMC-12F guardrails preserved:

- No external processor, ACH, bank, card, or check-issuing integration.
- No client fee, AMC margin, bank account detail, raw id, storage path, shared `/orders`, or
  internal note exposure to Vendor Workspace.
- Existing invoice submission, review, correction, scheduling, and paid-state tests remain covered.

Recommended next phase:

- Payment processor integration only after a real banking/payments provider and reconciliation
  doctrine are selected.
- Accounting export.
- Storage-aware cleanup for abandoned invoice uploads.
- Partial invoice approval if operations need approve-some/reject-some invoice decisions.
- Optional partial-approval controls if operations need approve-some/reject-some profile request
  decisions.

### AMC-13: Operational Hardening And Smoke Validation

Status: complete for pilot readiness as of 2026-06-06. Local happy path, local edge smoke, local
vendor route-isolation coverage, staging runtime catch-up, staging disposable fixture loading,
staging happy path, and staging edge/security smoke are green.

Purpose: define repeatable end-to-end AMC MVP smoke validation before external integrations,
production cutover, or deeper automation work.

Dependencies:

- AMC-9 authenticated Vendor Workspace bidding runtime.
- AMC-10 authenticated assigned-order execution runtime.
- AMC-11 vendor profile/update request runtime.
- AMC-12 vendor invoice/payment visibility and internal payment ledger runtime.

Completed AMC-13 deliverables:

- [AMC Full MVP Smoke Test Plan](../amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md).
- [AMC Full MVP Manual Smoke Test Results - 2026-06-06](../amc/AMC_FULL_MVP_SMOKE_TEST_RESULTS_20260606.md).
- [AMC Staging Runtime Catch-Up Plan](../amc/AMC_STAGING_RUNTIME_CATCH_UP_PLAN.md).
- [AMC Pilot Readiness Checklist](../amc/AMC_PILOT_READINESS_CHECKLIST.md).
- Full happy-path checklist covering AMC order creation, candidate matching, bid request, vendor
  bid, bid selection, assignment offer, vendor acceptance, start work, document access, report
  upload/submission, coordinator review, revision request, resubmission, invoice submission,
  invoice approval, payment scheduling, and mark paid.
- Failure/edge checklist covering expired bids, declined bids, rejected/corrected invoices, wrong
  vendor access denial, Internal-vs-AMC workspace separation, Vendor Workspace `/orders` isolation,
  raw id/storage path leakage checks, internal note leakage checks, and document visibility checks.
- Manual QA evidence template for environment, build/ref, personas, fixtures, happy path results,
  edge results, defects, follow-ups, and decision.
- Recommended demo data matrix for happy path, expired bid, declined bid, rejected/corrected
  invoice, wrong-vendor denial, and Internal-vs-AMC separation fixtures.
- Automated validation command set for route diagnostics, Vendor Workspace/API tests, Vendor
  Directory/API tests, payment/invoice migration guardrail tests, lint, build, and diff hygiene.
- Local Supabase reset/bootstrap repair through `npm run supabase:reset:local`.
- Repeatable local fixture load through `npm run amc:smoke:fixtures:load`.
- Repeatable local edge smoke through `npm run amc:smoke:edge`.
- Vendor browser route-isolation coverage for direct vendor navigation to shared/internal routes.
- Staging deployment catch-up for AMC-9 through AMC-12 migrations and Vendor Workspace Edge
  Functions.
- Staging runtime probe through `npm run amc:staging:runtime:check`, currently clean with 34 RPCs,
  3 Edge Functions, and 0 failures.
- Staging disposable fixture load through `npm run amc:staging:fixtures:load`.
- Staging happy-path smoke through `npm run amc:staging:smoke:happy`, green through Vendor
  Payments `Paid`.
- Staging edge/security smoke through `npm run amc:staging:smoke:edge`, green for wrong-vendor
  denial, declined bid history, rejected/corrected invoice flow, route/RLS isolation, and vendor
  payload leakage checks.

AMC-13 defects resolved during smoke:

- Local Storage bootstrap/reset readiness for clean local replay.
- Local Storage role bootstrap for Supabase CLI/Storage API role privilege mismatch.
- Disposable local/staging smoke fixtures and vendor active-company context.
- Assignment status guard transitions for `submitted -> revision_requested` and
  `revision_requested -> submitted`.
- Payment ledger actor FK alignment for schedule/mark-paid actor attribution.
- Repeatable wrong-vendor, declined-bid, rejected/corrected-invoice, and route-isolation
  regression coverage.

AMC-13 guardrails preserved:

- Smoke execution uses disposable local/staging records only.
- Staging fixture commands require explicit staging environment variables and refuse known
  production refs.
- No production data migration, production credential workaround, private bucket path exposure,
  broad runtime policy weakening, or fake Storage tables were introduced.
- Vendor Workspace payloads remain opaque-key based and exclude raw ids, private storage paths,
  internal coordinator notes, client fees, and AMC margin.

Pilot readiness decision:

- AMC MVP is ready for controlled pilot validation in staging and a planned production pilot window
  once launch/no-launch criteria in the AMC Pilot Readiness Checklist are satisfied.
- External payment processing, accounting export, external email deliverability hardening, visual
  browser QA, production data migration, and real vendor onboarding at scale remain deferred.

Recommended next phase:

- Run the recommended pilot sequence: internal owner/admin walkthrough, vendor workspace
  walkthrough, one controlled AMC order, payment/invoice dry run, and post-pilot defect review.

### AMC-14: Pilot Readiness Closeout And Workspace Isolation

Status: AMC-14B workspace isolation checkpoint complete for controlled pilot readiness as of
2026-06-07.

Purpose: harden the shared Falcon shell so Internal Operations, AMC Operations, and Vendor
Workspace surfaces do not bleed data, routes, notifications, cached state, or role assumptions
across selected workspaces during pilot validation.

Completed AMC-14B deliverables:

- [AMC-14B Workspace Isolation Checkpoint](../amc/AMC_14B_WORKSPACE_ISOLATION_CHECKPOINT.md).
- [AMC-14B Workspace Data Isolation Audit](../amc/AMC_14B_WORKSPACE_DATA_ISOLATION_AUDIT.md).
- [AMC-14B Operation Role Scope Audit](../amc/AMC_14B_OPERATION_ROLE_SCOPE_AUDIT.md).
- Order Detail workspace isolation hardening for Internal-vs-AMC detail rendering.
- Centralized route workspace ownership guard foundation.
- Expanded guarded route coverage for orders, AMC procurement/bid/assignment, invoices/payments,
  clients, dashboard, and obvious internal/admin routes.
- Workspace switch reset and cache invalidation: Internal/AMC switches navigate to `/dashboard`
  with replace navigation, clear unsafe filters/search/storage, emit invalidation, and preserve
  authentication/session.
- Notification, unread count, activity, search, command palette, dashboard link, and recent-surface
  isolation for the selected workspace.
- Data/RLS/view audit covering high-risk tables/RPCs and restoring shared order projections to
  caller/RLS semantics.
- Operation role-scope audit confirming active authority is current-company scoped and adding a
  shell operation-access resolver that honors explicit operation metadata when present.

AMC-14B pilot-readiness certification:

- Wrong-workspace direct links fail closed before stale unsafe pages render.
- Workspace switches avoid unsafe deep-link history and clear workspace-scoped stale state.
- Secondary surfaces do not bypass route/workspace isolation.
- Vendor Workspace remains isolated from shared `/orders` and internal data paths.
- Current-company permission, app-context, user-management, invitation, and audited AMC RPC
  boundaries remain company scoped.
- Current Continental demo behavior is preserved where no explicit backend operation entitlement
  metadata exists.

AMC-14B does not certify:

- Full legal/business separation between Internal Operations and AMC Operations inside one company
  record.
- A dedicated backend operation-membership or operation-role entitlement model.
- Operation-specific onboarding/invitation workflows.
- Production-grade organization switching beyond the current active-company context.
- External payment processing, accounting export, production data migration, or broad visual browser
  QA.

Known follow-up:

- Backend authority is company-scoped today. A future backend/onboarding/permissions project should
  introduce operation entitlements that can represent users who are Owner in one operation, Admin in
  another, or absent from one operation entirely without assuming shared ownership.

### AMC-15: Visual Environment Separation

Status: AMC-15 visual identity checkpoint complete for controlled pilot readiness as of
2026-06-07.

Purpose: make Internal Operations and AMC Operations immediately feel like separate business
environments without changing routes, workflows, permissions, or data access.

Completed AMC-15 deliverables:

- [AMC-15 Visual Identity Checkpoint](../amc/AMC_15_VISUAL_IDENTITY_CHECKPOINT.md).
- Centralized workspace identity configuration for Internal/AMC titles, badges, navigation labels,
  dashboard/order copy, page chrome, and branding hooks.
- Badge and environment-label coverage in the shell, workspace selector, dashboard/order contexts,
  and shared order detail.
- Navigation and primary chrome separation:
  - Internal: Continental Internal Operations, Appraisal Production, Client Orders, Staff
    Assignments, Review Workflow, Client Relationships.
  - AMC: Falcon AMC, Management Operations, Procurement, Vendor Network, Assignment Oversight,
    Client Services.
- Page-chrome separation across Activity, Calendar, Clients, Vendors, Assignments, Orders, and
  Order Detail.
- Business-surface identity for Vendor Workspace payments, Vendor Invoices, procurement
  opportunities, assigned-order detail, and shared order detail.
- Continued compatibility with AMC-14B route ownership guards, workspace switch reset/cache
  invalidation, notification/search/activity isolation, and Vendor Workspace isolation.

AMC-15 pilot-readiness certification:

- Users have stronger visual cues for whether they are operating in Continental Internal Operations
  or Falcon AMC.
- High-risk financial, procurement, vendor, and order-detail surfaces carry explicit selected
  workspace context.
- Centralized identity helpers reduce scattered hardcoded copy for future visual refinements.
- Workflow behavior, route behavior, permissions, and data-access boundaries were not intentionally
  changed.

AMC-15 does not certify:

- Full legal/business separation between Internal Operations and AMC Operations.
- Dedicated backend operation entitlements, operation-role membership, or operation-owner records.
- Operation-specific onboarding, invitation, or user-management flows.
- Full white-label tenant onboarding, custom domains, tenant theming, production organization
  switching, external payment branding, accounting export, or broad visual browser QA.

Recommended next phase:

- AMC-16 Permission Center should define and implement the deeper permission/onboarding model for
  separate Internal/AMC ownership and authority while preserving current Continental demo behavior.

### AMC-16: Permission Center

Status: complete for the controlled-pilot Permission Center checkpoint as of 2026-06-07.

Purpose: create a readable, guided permission-management experience that lets an owner/admin
understand who has access, what role or template grants that access, what individual overrides
exist, what changed, and which operation/company context the display and save are scoped to.

Completed AMC-16 deliverables:

- [AMC-16 Permission Center Foundation](../amc/AMC_16_PERMISSION_CENTER_FOUNDATION.md).
- [AMC-16 Permission Center Checkpoint](../amc/AMC_16_PERMISSION_CENTER_CHECKPOINT.md).
- Current permission model audit covering company-scoped authority, `company_memberships`,
  `user_role_assignments`, `roles`, `role_permissions`, direct overrides, and current-company RPC
  scoping.
- Read-only Permission Center architecture for User Management.
- Central permission-center model for business-category grouping, readable permission labels,
  fallback descriptions, primary/secondary role resolution, source labels, and operation identity.
- Member Permission Center entry point from the existing Users page.
- Guided local draft flow for applying secondary role/templates and individual permission
  overrides without parent/child toggle conflicts.
- Review step summarizing templates added/removed, permissions added/removed, and affected
  categories.
- Confirmed save flow through the existing company access mutation path:
  `saveCompanyMemberAccess(...)` / `rpc_company_member_access_save(...)`.
- Success/error handling that prevents duplicate submit, refreshes member access on success, exits
  edit mode, and preserves draft changes on failure.
- Self-edit warning and explicit company/operation scope messaging.
- Audit visibility finding and UI microcopy for the current app-readable history gap.

AMC-16 certifies:

- Permission displays can be grouped into owner/admin-readable business categories without exposing
  an endless raw permission list as the primary experience.
- Permission Center can show primary role, secondary role/template grants, individual override
  markers, pending changes, effective permission state, and active operation identity.
- Owners/admins can draft, review, explicitly confirm, and save company-scoped access changes
  through the existing governed access RPCs.
- Existing `Edit Access` behavior remains available and unchanged.
- Existing backend role/override audit writes are preserved by the atomic save wrapper.

AMC-16 does not certify:

- Dedicated backend operation entitlements for separate Internal/AMC ownership inside one company.
- Operation-specific onboarding or invitation authority.
- App-readable detailed member permission history.
- A new legal/business separation model, white-label onboarding, or external organization
  administration.

Recommended follow-up:

- Design the backend operation-entitlement model needed for users who have different authority in
  Internal Operations and AMC Operations.
- Add operation-specific invitation/onboarding/user-management flows after the entitlement schema
  is explicit.
- Add an authenticated member access history/activity projection for Permission Center recent
  changes before replacing the legacy Edit Access surface.

### AMC-17: Client Portal MVP

Status: foundation started as of 2026-06-07.

Purpose: create a first-class lender/client-facing portal for ordering appraisals, tracking
progress, and downloading released reports without exposing Internal/AMC operational complexity.

Completed AMC-17 foundation deliverables:

- [AMC-17 Client Portal MVP Foundation](../amc/AMC_17_CLIENT_PORTAL_MVP_FOUNDATION.md).
- Current client model audit covering operational client records, `clients.read.*` management
  permissions, missing client-specific invite/token flow, and the absence of a preexisting
  app-readable client portal order/status/report projection.
- Client Portal route shell outside the Internal/AMC operational `Layout`.
- `ClientPortalRouteGuard` requiring explicit client portal permission before rendering the
  portal.
- Client workspace route ownership fallback for `/client-portal`.
- Frontend client portal permission constants:
  `client_portal.dashboard.view`, `client_portal.orders.read`, `client_portal.orders.create`, and
  `client_portal.reports.read`.
- Backend permission seeds for the same `client_portal.*` keys.
- `client_portal_members` mapping table for active app-user-to-client-account read scope.
- Dedicated client-safe read model:
  `v_client_portal_order_status`, `rpc_client_portal_dashboard()`,
  `rpc_client_portal_orders()`, and `rpc_client_portal_order_detail(p_order_key)`.
- Dedicated client-safe final report download authorization:
  `rpc_client_portal_report_authorize_download(p_order_key)` and
  `client-portal-report-download-url`.
- Dedicated Client Portal order request intake:
  `client_portal_order_requests` and `rpc_client_portal_order_request_create(...)`.
- Dedicated Internal/AMC client request review inbox:
  `rpc_client_portal_order_requests_for_review()`,
  `rpc_client_portal_order_request_review_detail(p_request_key)`, and
  `rpc_client_portal_order_request_review_update_status(p_request_key, p_status)`.
- Dedicated client-safe frontend API seam for those RPCs.
- Read-only Client Portal dashboard, orders list, order detail, report availability, authorized
  final report download action, client-facing order request form, and staff request review inbox.

AMC-17 foundation certifies:

- Client Portal routes can mount without operational navigation, admin, vendor, procurement,
  assignment, or permission surfaces.
- Internal/AMC users do not accidentally land in Client Portal unless they have explicit client
  portal permission.
- The frontend portal pages render client-safe order tracking data from dedicated portal RPCs.
- Client Portal reads are scoped to current company, active `client_portal_members` mappings, and
  opaque order keys.
- The page model avoids vendor bidding, internal assignment details, private notes, internal review
  chatter, procurement details, client fee, and AMC margin.
- Report exposure is limited to client-visible final report availability metadata, delivered/ready
  timestamps, file name metadata, and click-time short-lived signed URLs for authorized final
  reports only.
- Report downloads are authorized by opaque order key, current company, active client portal member
  mapping, and `client_portal.reports.read`; storage internals remain service-side only.
- New-order intake creates a submitted request record only. It derives company/client scope
  server-side, requires `client_portal.orders.create`, and does not create operational orders,
  assignments, vendor procurement, invoices, fees, or documents.
- Staff request review is operations-owned at `/client-requests`, requires
  `client_portal.order_requests.read` or `client_portal.order_requests.manage`, and supports
  list/detail plus safe status updates to `under_review` or `declined`.

AMC-17 foundation does not certify:

- client account/organization invite or token onboarding;
- production client role/template assignment;
- conversion from client request into operational orders;
- public/token status links;
- broad document browsing, draft downloads, internal docs, vendor submissions, reviewer files,
  invoices, or procurement documents;
- client portal messages/activity.

Recommended next AMC-17 slices:

- Add client portal role templates and fixture coverage for mapped client users.
- Add client invite/token onboarding after the client account model is explicit.
- Add guarded conversion from submitted client portal requests into the operational order workflow.
- Add document upload support after upload authorization and required document rules are defined.

## Dependency Graph

```text
AMC-1 -> AMC-2 -> AMC-5
AMC-5 -> AMC-6
AMC-6 -> AMC-7 -> AMC-8
AMC-8 -> AMC-9 -> AMC-10
AMC-10 -> AMC-11
AMC-3 -> AMC-4
AMC-9 depends on AMC-1 through AMC-8
AMC-10 depends on AMC-8 and AMC-9
AMC-11 depends on AMC-10
AMC-12 depends on AMC-10 and AMC-11
AMC-13 depends on AMC-9 through AMC-12
AMC-14 depends on AMC-13 and the shared shell/permissions infrastructure
AMC-15 depends on AMC-14B workspace isolation and shared workspace identity
AMC-16 depends on AMC-14B isolation, AMC-15 visual identity, and shared permissions infrastructure
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
