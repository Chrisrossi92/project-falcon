# Falcon Workspace Doctrine And Navigation Architecture

## Purpose

This document locks Falcon's workspace boundary doctrine before AMC-7 vendor self-service work begins.

Falcon is one platform with multiple role-native workspaces, not one app with hidden menu items. A workspace is an operational context with its own mental model, data scope, navigation language, visual identity, and default landing surface.

This document began as planning/doctrine. WS-2, WS-3.1, WS-3.2, and WS-4.2 through WS-4.4 now have
runtime coverage for the Internal Operations / AMC Operations boundary and workspace-native
navigation wiring. It does not implement permissions, backend changes, schema changes, Supabase
changes, workflow changes, AMC-7 token links, Vendor Portal behavior, notifications, or production
data changes.

## Primary Workspaces

Falcon's primary workspace model is:

1. Internal Operations Workspace
2. AMC Operations Workspace
3. Future Vendor Workspace

The workspaces can share platform infrastructure, route primitives, components, permissions, order records, assignment packets, activity, files, and notification systems. They should not share stale UI state or imply that the same visible route means the same operational context.

## Core Doctrine

Workspace is broader than navigation. It controls:

- default dashboard/landing surface;
- data scope;
- route eligibility;
- sidebar/navigation group labels;
- workspace-specific filters and selections;
- visible terminology;
- visual identity treatment;
- allowed workflow affordances.

Permissions remain action authority. Workspace context determines the operational world in which permissioned actions can appear.

## Workspace Transition Rule

Switching workspaces is a context reset, not a view filter.

When a user switches between Internal Operations and AMC Operations, Falcon should:

- update workspace context;
- clear workspace-specific filters, queues, selected rows, selected dashboard lanes, and table state;
- clear persisted order detail context where it could show a cross-workspace order;
- navigate to the target workspace dashboard;
- reload target workspace data;
- prevent route persistence from showing an Internal Operations order inside AMC Operations or an AMC Operations order inside Internal Operations.

This rule is intentionally stricter than a normal table filter change. It protects users from believing they have entered a new operational world while still looking at stale data from the previous one.

## Dashboard Landing Rule

Workspace switch should land on the workspace dashboard, not preserve the current route.

Recommended landing targets:

- Internal Operations Workspace: `/dashboard`
- AMC Operations Workspace: `/dashboard` with `operationsMode = amc_operations`
- Future Vendor Workspace: `/vendor/orders` or `/vendor/dashboard` after vendor auth exists

Falcon may continue sharing route paths such as `/dashboard` and `/orders` for Internal and AMC operations, but switching workspace should still reset to the dashboard entry point for that workspace.

Runtime status:

- WS-2 complete: Internal Operations / AMC Operations switching navigates to `/dashboard`.
- WS-3.1 complete: workspace switch navigation uses replace semantics so the browser back button
  does not immediately revive the prior workspace route.
- Query/search state is not preserved on workspace switch.
- Clicking the already-active workspace mode does nothing.

## Route Persistence Guardrail

Route persistence is unsafe across workspace boundaries.

Examples to prevent:

- user opens an internal order detail;
- user switches to AMC Operations;
- app preserves `/orders/:id`;
- internal order content remains visible under AMC navigation.

Required guardrails:

- detail pages must validate that the loaded row belongs to the active workspace scope;
- invalid cross-workspace detail routes should redirect to the active workspace dashboard or show a scope-safe not-found state;
- persisted list filters should be keyed by workspace;
- saved selections and queue state should be cleared on workspace switch;
- browser history should not be trusted as workspace authority.

Runtime status:

- WS-3.2 complete: the Orders page detects mounted `operationsMode` changes and clears Orders URL
  filters/search params back to the default Orders state.
- Internal/AMC route bleed prevention is now runtime-enforced for workspace switch navigation and
  mounted Orders URL filters.
- Saved views are unchanged; workspace scoping for saved views is deferred to WS-3.4.

Backend/RPC guards remain authoritative. Frontend route guards are user-experience guardrails, not security boundaries.

## Internal Operations Workspace

Internal Operations should feel like an appraisal production system.

Language:

- Orders
- My Work
- Review Queue
- Appraisers
- Review
- Revisions
- Ready for Client
- Internal assignments

Primary workflows:

- internal order creation and update;
- staff appraiser execution;
- reviewer queue and revisions;
- owner/admin operations command;
- calendar and site visit coordination;
- file/readiness context for internal production.

Navigation should emphasize:

- Operations Command / Dashboard
- Orders
- My Work for appraiser shells
- Review Queue for reviewer shells
- Calendar
- Team/Settings as secondary support

Visual identity should be appraisal-production native: calm, operational, dense enough for review/production comparison, and focused on internal lifecycle state.

## AMC Operations Workspace

AMC Operations should feel like a procurement and vendor-management system.

Language:

- Vendor Candidates
- Request Bids
- Bid Requests
- Responses Received
- Selected Bid
- Create Assignment Offer
- Vendor Assignment
- Vendor Directory
- Network
- Procurement status

Primary workflows:

- AMC-scoped order monitoring;
- vendor candidate discovery;
- bid request outreach;
- manual/internal bid response entry;
- selected bid conversion to assignment offer;
- assignment packet lifecycle handoff;
- vendor directory and coverage management.

Navigation should emphasize:

- AMC Operations dashboard
- Orders with procurement visibility
- Vendors / Network
- Calendar where relevant
- Clients/lenders where explicitly supported

Visual identity should remain recognizably Falcon but use a distinct AMC accent/header treatment and procurement/vendor language. It should not look like Internal Operations with only a hidden Vendors menu added.

## Future Vendor Workspace

The Vendor Workspace is a future role-native workspace, not an AMC subpage.

Canonical doctrine: `docs/vendor/VENDOR_WORKBENCH_DOCTRINE.md`.

Vendor-native labels:

- Available Work
- My Bids
- Assigned Orders
- Documents
- Invoices
- Profile

Primary workflows:

- view available bid invitations;
- open vendor-facing order detail;
- submit bids;
- accept or decline assignment offers;
- upload documents;
- manage compliance/vendor docs;
- view billing/payment/task status.

The AMC-7 tokenized bid invitation page should be designed as a limited-access rendering of the future Vendor Order Detail screen. It should not be a throwaway standalone form.

WS-6 complete: Vendor Workbench doctrine defines the vendor worldview, navigation, dashboard,
Vendor Order Detail, token versus authenticated access model, vendor-facing status model,
documents/tasks model, billing labels, hidden internal data, security doctrine, and AMC-7/AMC-8
roadmap. Vendor Workbench remains future runtime scope.

AMC-7A complete through AMC-7A.2: backend tokenized bid invitation storage, authenticated
coordinator invitation creation, and coordinator-side `Generate Bid Link` display now exist for open
bid recipients. Generated paths use `/vendor/bid-invitations/<token>`, but public vendor
route/read/submit behavior is still deferred. Vendor Workspace runtime access remains future scope
until AMC-7B/7C/7D add the public token read RPC, limited Vendor Order Detail route, and submit bid
flow.

## Sidebar And Navigation Differences

Navigation should be workspace-native.

Falcon navigation should be derived from first-class workspace definitions, not scattered
`operationsMode` conditionals. The route registry should remain the canonical source for route
paths, route IDs, and permission metadata. Workspace definitions should decide section IDs, section
labels, link ordering, mobile ordering, and workspace-specific labels after permission filtering.

Runtime status:

- WS-4.2 complete: `src/lib/navigation/workspaceNavigationDefinitions.js` defines active
  Internal Operations and AMC Operations navigation definitions.
- Future Vendor Workspace and Client Workspace definitions exist as inactive placeholders only;
  they are not exposed in active navigation.
- WS-4.3a complete: primary desktop navigation visibility now derives from workspace definitions
  while preserving route paths, permission/profile filtering, and existing visible output.
- WS-4.3b complete: AMC desktop/sidebar sections now derive from workspace definitions. AMC section
  labels are workspace-native: Procurement, Vendors, and Clients. Internal profile grouping remains
  unchanged.
- WS-4.4 complete: AMC mobile ordering now derives from workspace definitions while preserving the
  existing Orders, Calendar, Vendors, Clients order. Internal mobile ordering remains unchanged.

Conceptual workspace definition model:

- `INTERNAL_OPERATIONS`: Operations, Management, Reporting, System.
- `AMC_OPERATIONS`: Procurement, Vendors, Clients, Analytics, System.
- Future `VENDOR_WORKSPACE`: Work, Documents, Financials, Profile.
- Future `CLIENT_WORKSPACE`: Orders, Documents, Messages, Billing, Profile.

Internal Operations:

- prioritize production/review lifecycle;
- use appraiser/reviewer/admin labels;
- keep vendor/procurement language absent unless explicitly entering AMC Operations;
- show Dashboard;
- group Orders, Calendar, and role-appropriate My Work / Assignments under Operations;
- group Clients and permission-appropriate Users under Management;
- group Reports / Analytics under Reporting when those surfaces exist;
- group Settings under System.

Internal Operations should hide:

- Vendor Directory;
- Vendor Coverage;
- Bid Requests;
- AMC procurement queues.

AMC Operations:

- prioritize procurement/vendor work;
- group vendor network surfaces distinctly;
- show bid/procurement language in row chips and panels;
- keep internal staff assignment language secondary or absent where it would confuse vendor workflow;
- show Dashboard;
- group Orders, Calendar, future Procurement Queue, and future standalone Bid Requests under Procurement;
- group Vendor Directory, future Coverage, future Performance, and future Compliance under Vendors;
- group Clients under Clients;
- group Reports / AMC analytics under Analytics when those surfaces exist;
- group Settings under System.

AMC Operations should hide:

- My Work;
- Internal Assignments direct navigation;
- Relationships direct navigation;
- Users / Staff Directory unless explicitly needed later for admin system settings;
- internal production-only surfaces.

Vendor Workspace:

- use vendor-facing workbench labels;
- avoid internal lifecycle labels;
- hide client fee, AMC margin, other vendor bids, internal notes, candidate scoring, and internal queue data;
- show Dashboard;
- group Available Work, My Bids, and Assigned Orders under Work;
- group vendor documents under Documents;
- group Invoices under Financials;
- group Company Profile, Coverage, Contacts, Insurance, License, and Compliance under Profile.

Future Client Workspace:

- use client-facing request/status language;
- group Orders under Orders;
- group reports and uploaded/downloaded files under Documents;
- group client/coordinator communication under Messages;
- group invoices or payment status under Billing where supported;
- group account/contact settings under Profile.

## Shared Route Doctrine

Shared routes may remain physically shared when the active workspace gives them different meaning:

- `/dashboard`
- `/orders`
- `/calendar`
- `/clients`
- `/settings`

The route path is not the workspace. The workspace context determines data scope, visible actions,
labels, secondary chips, table filters, detail affordances, empty states, and dashboard content.

## Hidden But Reachable Doctrine

Some routes may be hidden from primary navigation but remain reachable through explicit workflow
links. Hiding a route from the workspace nav should not remove legitimate workflow access.

Example:

- AMC Operations may hide direct Assignments navigation, but assignment packets remain reachable
  from Order Detail after selected bid conversion.

This doctrine keeps primary navigation workspace-native without breaking handoff workflows.

## Visual Identity Guidance

Each workspace should feel like entering a related but distinct operational system.

Shared:

- Falcon platform identity;
- typography and component quality;
- shell conventions;
- permission discipline;
- audit/activity confidence.

Distinct:

- header identity and subtitle copy;
- sidebar section labels;
- workspace accent tone;
- empty-state language;
- action verbs;
- dashboard cards and status chips;
- primary table secondary context.

Do not make the distinction depend only on one navigation toggle label.

## Runtime Implementation Plan

Recommended sequence:

1. WS-1: workspace doctrine docs.
   - Lock role-native workspace doctrine, transition reset rules, route persistence guardrails, and Vendor Workspace positioning.

2. WS-2: mode switch navigates to workspace dashboard.
   - Complete. Switching Internal/AMC Operations updates workspace context and navigates to `/dashboard`.

3. WS-3: clear workspace-specific filters/state on switch.
   - WS-3.1 complete: workspace switch navigation uses replace semantics and does not preserve query/search state.
   - WS-3.2 complete: mounted Orders pages clear URL filters on actual `operationsMode` change.
   - WS-3.4 deferred: saved view workspace scoping design/migration.

4. WS-4: workspace-specific sidebar/nav definitions.
   - WS-4.1 complete: workspace-native navigation architecture is locked in documentation.
   - WS-4.2 complete: `workspaceNavigationDefinitions.js` added active Internal/AMC definitions and inactive future Vendor/Client placeholders.
   - WS-4.3a complete: primary desktop navigation visibility derives from workspace definitions with behavior preserved.
   - WS-4.3b complete: AMC desktop/sidebar sections derive from workspace definitions and use Procurement, Vendors, and Clients labels; Internal grouping remains unchanged.
   - WS-4.4 complete: AMC mobile ordering derives from workspace definitions with behavior preserved; Internal mobile ordering remains unchanged.
   - WS-4.5 complete: tests and closeout docs.

5. WS-5: workspace visual identity pass.
   - WS-5.1 complete: `getWorkspaceIdentity(operationsMode)` added a narrow presentation identity
     layer. Internal identity remains unchanged/default. AMC identity adds Procurement Command
     shell copy, procurement-focused Dashboard and Orders copy, and restrained cyan accents in the
     shell context panel/sidebar ring and Orders eyebrow chip.
   - WS-5.2 complete: documentation closeout.
   - WS-5.3 deferred: optional broader workspace frame accent after visual review.

6. WS-6: vendor workbench doctrine.
   - Complete. `docs/vendor/VENDOR_WORKBENCH_DOCTRINE.md` defines Vendor Workbench as a peer
     workspace, not an AMC subpage, and locks limited token invitation plus future authenticated
     vendor access doctrine before AMC-7.

7. WS-7: AMC-7 tokenized vendor order detail.
   - Build the tokenized bid invitation page as the limited-access version of the future Vendor Order Detail screen.

## Risks And Unknowns

- Saved views are still company/user scoped but not workspace scoped; WS-3.4 should design and migrate saved view workspace scoping.
- Internal mobile navigation still uses the existing profile ordering; future migration to workspace
  definitions is optional and should be behavior-preserving.
- `/orders/:id` route reuse needs scope-safe detail guarding to avoid cross-workspace order visibility.
- Dashboard rows and Orders list rows may share components but need workspace-native labels and state reset behavior.
- Vendor Workspace authentication and vendor-company user mapping are not yet defined.
- Tokenized vendor order detail must avoid leaking internal order data, client fee, margin, other bids, and candidate scoring.
- Visual identity changes must stay restrained enough to preserve one Falcon platform rather than fragmenting into unrelated apps.
- Layout frame styling is intentionally deferred after WS-5.1 to avoid broad shell churn before
  visual review.
