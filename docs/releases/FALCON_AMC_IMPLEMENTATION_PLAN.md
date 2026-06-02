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

Status: AMC-6A assignment-offer workflow doctrine, AMC-6B assignment offer RPC/API proposal, AMC-6C candidate-aware assignment offer frontend API wrapper, AMC-6D one-active-vendor-offer enforcement proposal, AMC-6E backend one-active-vendor-offer guard, AMC-6F Offer Assignment UI proposal, AMC-6F.1 active vendor offer visibility audit, and AMC-6F.2 active vendor assignment state sharing completed. No assignment buttons/UI, notifications, permission changes, route/navigation changes, order behavior changes outside the assignment-offer guard, or `/amc/*` routes have been introduced.

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
- Deferred implementation slices for active Vendor Assignment summary display, candidate-specific offer modal, and candidate-card button integration.
- Future lifecycle roadmap for offer RPC/API/UI, vendor response, and bid workflows.

Testing Strategy:

- Permission tests for offer authority.
- Regression tests that candidate visibility alone cannot create offers.
- Assignment packet lifecycle tests for offer, accept, decline, cancel, revoke, and complete paths.
- UI tests for explicit owner/admin offer action after implementation is approved.
- UI tests should verify candidate-card button visibility in AMC Operations mode, assignment-offer permission gates, hidden raw ids/JSON, candidate snapshot submission, active-offer error mapping, success refresh behavior, and absence of bid/multi-vendor controls.
- UI tests should verify active vendor assignments hide candidate offer actions while declined, revoked, completed, and cancelled vendor packets remain historical context and do not block a new offer.

Success Criteria:

- Assignment offers are explicit user actions.
- Candidate recommendations do not create assignments automatically.
- Offer creation reuses packet lifecycle infrastructure instead of creating a parallel vendor-offer system.

### AMC-7: Vendor Performance System

Purpose: track vendor metrics that can inform assignment decisions and reporting.

Dependencies:

- AMC-2 Vendor Directory.
- AMC-6 assignment offer workflow.
- Order lifecycle and completion signals.

Deliverables:

- Acceptance rate.
- Turn time.
- Revision rate.
- Completion rate.

Testing Strategy:

- Unit tests for metric aggregation.
- Regression tests for assignment and completion event capture.
- Reporting tests for vendor-level summaries.

Success Criteria:

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
- vendor performance metrics can begin informing recommendations

## Validation

This slice is documentation only.

- No code changes.
- No schema changes.
- Validate diff hygiene with `git diff --check`.
