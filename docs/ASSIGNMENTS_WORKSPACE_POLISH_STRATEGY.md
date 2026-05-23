# Assignments Workspace Polish Strategy

## Purpose

This strategy plans the first governed polish pass for Falcon's standalone `/assignments`
workspace. The goal is to make assignment packets feel like a clear coordination workspace while
preserving the existing assignment lifecycle, packet-scoped visibility, company boundaries, and RPC
mutation authority.

This is planning documentation only. Slice 1A makes no runtime, backend, Supabase, query,
permission, workflow, state-machine, staffing, dispatch, analytics, route, RLS/RPC, or UI behavior
change.

## Current Foundation Inspected

Runtime files inspected:

- `src/routes/index.jsx`
- `src/features/assignments/AssignmentsPage.jsx`
- `src/features/assignments/AssignmentDetail.jsx`
- `src/features/assignments/AssignedAssignmentInbox.jsx`
- `src/features/assignments/OwnerAssignmentManagement.jsx`
- `src/features/assignments/AssignedOfferPacket.jsx`
- `src/features/assignments/AssignedWorkPacket.jsx`
- `src/features/assignments/OwnerAssignmentPacket.jsx`
- `src/features/assignments/AssignmentActions.jsx`
- `src/features/assignments/AssignmentPrimitives.jsx`
- `src/features/assignments/api.js`
- `src/features/assignments/components/AssignedWorkDashboard.jsx`
- `src/features/assignments/components/OwnerSentAssignmentsDashboard.jsx`
- `src/features/assignments/components/OwnerOrderAssignmentsPanel.jsx`
- `src/features/assignments/components/AssignmentActivityTimeline.jsx`
- `src/features/dashboard/AssignmentDashboardPage.jsx`

Governance and product doctrine inspected:

- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Current Architecture

### Routes And Access

The standalone workspace uses:

- `/assignments`
- `/assignments/:assignmentId`

Both routes are guarded by `ASSIGNMENT_NAV_PERMISSIONS`, which allow access through either:

- `order_company_assignments.read_assigned`
- `order_company_assignments.read_owner`

This route access is assignment-packet native. It does not grant canonical order access, client
access, calendar access, order activity access, or owner-company workflow visibility.

### Workspace Lanes

`AssignmentsPage` currently renders a compact page shell and then conditionally renders two lanes:

- `AssignedAssignmentInbox` for packets assigned to the current company.
- `OwnerAssignmentManagement` for packets offered by the current company.

The assigned lane reads from `rpc_order_company_assignment_inbox(...)`. It supports an assignment
status filter and renders assignment rows with packet status, order number where available,
owner-company context, location, instructions preview, due/expiration dates, and deterministic
attention chips such as expired offer, awaiting owner action, and past due.

The owner lane reads from `rpc_order_company_assignment_list(...)`. It supports an assignment status
filter and renders owner-managed rows with assigned company, packet status, relationship type,
instructions preview, due/updated dates, and deterministic attention chips such as needs owner
review, offer expired, and past due.

### Detail Resolution

`AssignmentDetail` resolves the packet by permission and packet type:

- owner readers attempt `rpc_order_company_assignment_owner_packet(...)`;
- assigned readers attempt `rpc_order_company_assignment_offer_packet(...)`;
- assigned readers then attempt `rpc_order_company_assignment_work_packet(...)`;
- when resolution fails, the route shows assignment-specific denied/error states and does not fall
  back to broad order reads.

This is the correct visibility posture. Detail polish must preserve packet resolution order and
must not introduce canonical order fallback for assigned-company users.

### Packet Surfaces

The detail route renders one of three packet presentations:

- `AssignedOfferPacket`
- `AssignedWorkPacket`
- `OwnerAssignmentPacket`

Each packet surface uses existing read data and shared assignment primitives for status badges,
meta chips, field grids, JSON summaries, terminal state messaging, and assignment-scoped activity.

Owner packets may include an `Open Order` link when the owner-side packet includes `order_id`.
Assigned offer/work packets do not link assigned-company users to canonical order detail.

### Actions And Mutations

Assignment lifecycle actions are isolated in `AssignmentActions.jsx` and call only assignment RPC
wrappers from `src/features/assignments/api.js`.

Approved packet lifecycle wrappers are:

- `offerAssignment(...)`
- `acceptAssignment(...)`
- `declineAssignment(...)`
- `startAssignment(...)`
- `submitAssignment(...)`
- `completeAssignment(...)`
- `cancelAssignment(...)`
- `revokeAssignment(...)`

These wrappers call `rpc_order_company_assignment_*` functions. They do not mutate owner-company
participant columns and do not implement staffing, ranking, dispatch, or order workflow actions.

### Activity

`AssignmentActivityTimeline` reads from `rpc_order_company_assignment_activity(...)` and renders
assignment-scoped lifecycle history only. It explicitly avoids canonical order activity fallback.

### Related Surfaces

Assignments also appear in:

- `AssignmentDashboardPage`, which provides assignment-only dashboard access for users without
  canonical order dashboard access.
- `AssignedWorkDashboard`, which derives deterministic assigned-packet attention metrics from
  already loaded assignment rows.
- `OwnerSentAssignmentsDashboard`, which derives deterministic owner-side sent-assignment metrics
  from already loaded assignment rows.
- `OwnerOrderAssignmentsPanel`, which appears on owner-side Order Detail for assignment packets tied
  to a specific order and uses owner-side packet reads.

These surfaces are useful references for polish language and hierarchy, but the standalone
workspace should not inherit dashboard analytics framing or create new metrics during the first
polish pass.

## Current UX Findings

### What Works

- The workspace already separates assigned-company work from owner-company sent assignments.
- Route guards and detail resolution preserve assignment packet visibility.
- Assignment actions already use backend-owned lifecycle RPCs.
- Status filters are simple and explicit.
- Owner and assigned packets already use packet-native detail components.
- Assignment activity is already scoped to the packet.
- Dashboard widgets already establish useful language for assigned work and sent assignments.

### Current Weaknesses

- The standalone page header is thin compared with the polished Dashboard, Orders, Calendar, and
  Clients workspaces.
- The page title `Assignments` does not fully communicate packet coordination, sent versus received
  work, or current-company context.
- The two lanes are useful but compete visually because both render similar card shells without a
  higher-level workspace hierarchy.
- Status filters, refresh buttons, counts, and row badges are functional but feel like raw controls
  rather than a composed coordination workspace.
- The assigned lane and owner lane use related but not fully normalized language:
  `Work Assigned To Us`, `Work We Assigned Out`, `Assigned Work`, `Sent Assignments`, `Owner Packet`,
  and `Company Work`.
- Operational context is implicit. Users can infer whether they are looking at received packets,
  sent packets, offers, active work, or owner review, but the shell does not summarize that clearly.
- Empty/loading/error states are safe but terse and could better explain packet-only boundaries.
- Detail packet headers are serviceable, but action areas, timeline, instructions, terms, handoff,
  submission, and compliance sections could use stronger hierarchy in a later slice.
- Mobile stacking is simple but can put controls, counts, and row metadata into dense blocks.

## Target Workspace Mental Model

The standalone Assignments workspace should be framed as:

**Packet Coordination**

It is not a canonical order worklist, a staffing dispatcher, a vendor scoring surface, or an AMC
queue analytics surface. It is the place where companies coordinate scoped assignment packets.

The workspace should clearly separate two lanes:

- **Received Work:** assignment offers and active work packets assigned to the current company.
- **Sent Assignments:** owner-company oversight of packets offered to other companies.

Each lane should make the next operational question obvious:

- Which offers need a response?
- Which received work is active, due soon, past due, or submitted?
- Which sent assignments need owner review?
- Which offers have expired or may need follow-up?
- Which packets are terminal and preserved as packet history?

The detail route should continue the same mental model:

- assigned-company detail is a work packet, not order detail;
- owner detail is an owner packet, with canonical order navigation only for authorized owner users;
- lifecycle actions are packet actions, not order Smart Actions;
- activity is assignment-scoped packet memory.

## Safe First-Pass Polish Path

### Slice 1B Recommended Implementation

Make a frontend-only shell polish to `AssignmentsPage` and the two lane headers.

Safe targets:

- Rename the page frame to `Assignments Workspace` or `Packet Coordination`.
- Add calmer operational subtitle copy that explains received and sent assignment packets.
- Add a compact read-only context/support row using existing permission/lane availability only:
  received work visible, sent assignments visible, packet-scoped access only.
- Group the two lane sections under clearer labels:
  `Received Work` and `Sent Assignments`.
- Keep existing status filters, counts, refresh actions, rows, and links.
- Improve spacing, alignment, and mobile wrapping around lane headers and controls.
- Normalize loading/error/empty state tone without changing behavior.

Preserve:

- `ASSIGNMENT_NAV_PERMISSIONS`;
- `listAssignedAssignments(...)` and `listOwnerAssignments(...)`;
- existing status filter values and filter semantics;
- existing row links to `/assignments/:assignmentId`;
- existing packet counts derived from currently loaded rows;
- existing action visibility and lifecycle RPC wrappers;
- existing dashboard and Order Detail assignment surfaces.

### Later First-Pass Slices

Potential later frontend-only polish slices:

- **Slice 1C:** assignment lane/card presentation polish for list rows, counts, and empty states.
- **Slice 1D:** assignment packet detail header/action hierarchy polish.
- **Slice 1E:** assignment activity/timeline and JSON section readability polish.
- **Slice 1F:** consistency, accessibility, and responsive cleanup checkpoint.

Each implementation slice should stay presentational unless a separate backend or lifecycle design
explicitly authorizes behavior changes.

## Governance Rules

During the Assignments Workspace polish phase:

- No backend changes.
- No Supabase changes.
- No assignment query semantics changes.
- No assignment workflow or state-machine changes.
- No permission or company-scoping changes.
- No Smart Action behavior changes.
- No canonical order visibility broadening.
- No client visibility broadening.
- No relationship visibility broadening.
- No staffing, dispatch, auto-routing, vendor scoring, ranking, capacity, or recommendation logic.
- No fake analytics, predictive scoring, unsupported risk language, or cross-company aggregates.
- No queue semantics changes.
- No new assignment lifecycle actions.
- No table/list bulk actions.
- No direct table writes.
- No frontend-authored assignment activity or notification fanout.
- No Vendor Portal or Client Portal product shell activation.
- No hidden mutation behavior inside presentation polish.

Assignment packet access remains separate from canonical order access. Relationship state, vendor
panel membership, company type, product mode, and module metadata do not grant packet visibility.

## Deferred Work

Deferred operational intelligence and product work:

- staffing or dispatch recommendations;
- vendor eligibility scoring;
- capacity and workload forecasting;
- SLA/risk scoring;
- assignment queue analytics;
- server-side assignment analytics views or RPCs;
- saved assignment views;
- advanced assignment search and pagination;
- assignment history/admin readback surfaces;
- assignment document/package enhancements;
- packet messaging surfaces;
- backend-owned note/comment workflows;
- broader assignment notification doctrine changes;
- participant assignment RPC unification for internal appraiser/reviewer assignment;
- Vendor Portal live product shell;
- Client Portal coordination surfaces;
- AMC-native queue command center behavior;
- configurable assignment workspace widgets;
- production/deployment verification.

## Slice 1A Completion

Assignments Workspace Polish Slice 1A is complete as docs-first planning and architecture
inspection. It creates this governed strategy, records the current assignment workspace architecture
and weaknesses, defines the target packet-coordination mental model, recommends the first safe
frontend-only polish path, and locks governance boundaries before implementation.

No runtime files, backend code, Supabase configuration, migrations, routes, permissions, query
semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic,
queue semantics, analytics, or mutation behavior changed.

## Slice 1B Completion

Assignments Workspace Polish Slice 1B is complete as frontend-only workspace shell and lane-header
polish.

Runtime changes:

- `AssignmentsPage` now frames `/assignments` as `Assignments Workspace` under `Packet
  Coordination`.
- The page now includes a compact read-only context strip for current work view, packet-scoped
  access, and packet-only navigation.
- `AssignedAssignmentInbox` now presents the received-company lane as `Received Work` with clearer
  packet-scope support copy.
- `OwnerAssignmentManagement` now presents the owner-company lane as `Sent Assignments` with
  clearer owner-side packet support copy.
- Lane header spacing, background treatment, loading copy, empty-state copy, and status-filter
  labels were polished without changing data flow.
- Focused presentation tests cover the workspace hierarchy, lane labels, preserved list RPC calls,
  preserved status filter arguments, packet navigation links, and denied access state.

Preserved boundaries:

- existing `/assignments` and `/assignments/:assignmentId` routes;
- existing assignment read permission gates;
- existing `listAssignedAssignments(...)` and `listOwnerAssignments(...)` calls;
- existing status filter values and semantics;
- existing packet links to `/assignments/:assignmentId`;
- existing assignment lifecycle action components and RPC wrappers;
- existing packet detail resolution;
- existing dashboard and Order Detail assignment surfaces.

No backend code, Supabase configuration, migrations, permissions, company-scoping behavior, query
semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic,
queue semantics, canonical order/client/relationship visibility, fake analytics, predictive
scoring, RLS/RPC behavior, or mutation behavior changed.

## Slice 1C Completion

Assignments Workspace Polish Slice 1C is complete as frontend-only assignment packet card/list
presentation polish.

Runtime changes:

- Received Work rows now render as clearer packet cards with `Received Packet` hierarchy, order
  number identity, status/attention badges, labeled owner/type/location metadata, instruction
  preview treatment, due/expiration dates, and an explicit `Open packet` affordance.
- Sent Assignments rows now render as clearer packet cards with `Sent Packet` hierarchy, assigned
  company identity, status/attention badges, labeled type/relationship metadata, instruction
  preview treatment, due/updated dates, and an explicit `Open packet` affordance.
- Packet links now have descriptive accessible labels for received and sent assignment packets.
- Focused tests were extended to cover packet-card labels, preserved packet links, displayed
  metadata, instruction previews, and unchanged list/filter RPC behavior.

Preserved boundaries:

- existing list RPC calls and arguments;
- existing status filter values and semantics;
- existing displayed assignment data only;
- existing packet links to `/assignments/:assignmentId`;
- existing permissions and lane visibility;
- existing assignment detail, lifecycle actions, and RPC wrappers;
- existing dashboard and Order Detail assignment behavior.

No backend code, Supabase configuration, migrations, permissions, company-scoping behavior, query
semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic,
queue semantics, canonical order/client/relationship visibility, fake analytics, predictive
scoring, new packet actions, RLS/RPC behavior, or mutation behavior changed.

## Slice 1E Completion

Assignments Workspace Polish Slice 1E is complete as the first-pass consistency, accessibility, and
responsive cleanup checkpoint.

Runtime cleanup:

- Received Work and Sent Assignments lane sections now expose accessible region labels.
- Shared packet detail headers now expose accessible detail-region labels.
- Packet action areas now expose an accessible `Packet actions` region label.
- Focused tests were updated to lock the lane region labels and packet detail/action labels.

First-pass polish foundation now covers:

- docs-first Assignments workspace strategy and architecture inspection;
- `Assignments Workspace` shell and packet-coordination framing;
- Received Work and Sent Assignments lane-header polish;
- packet card/list presentation polish;
- shared assignment packet detail header/context/instruction presentation;
- consistency, accessibility, and responsive-readability cleanup.

Preserved boundaries:

- existing `/assignments` and `/assignments/:assignmentId` routes;
- existing assignment read permission gates and company scoping;
- existing list/detail RPC calls and arguments;
- existing status filter semantics;
- existing packet detail resolution order;
- existing assignment lifecycle action components and RPC wrappers;
- existing owner-side order navigation availability;
- existing dashboard and Order Detail assignment behavior.

No backend code, Supabase configuration, migrations, permissions, company-scoping behavior, query
semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic,
queue semantics, canonical order/client/relationship visibility, fake analytics, predictive
scoring, new packet actions, RLS/RPC behavior, or mutation behavior changed.

## Slice 1D Completion

Assignments Workspace Polish Slice 1D is complete as frontend-only assignment packet detail
presentation polish.

Runtime changes:

- `AssignmentPrimitives` now provides a shared `PacketHeader` presentation primitive for packet
  detail headers.
- `AssignmentPrimitives` now wraps field grids as `Packet Context` sections and provides a shared
  print-safe instruction display treatment.
- `AssignedOfferPacket`, `AssignedWorkPacket`, and `OwnerAssignmentPacket` now use the shared packet
  header for consistent eyebrow, title, subtitle, status, packet meta chips, and action placement.
- Owner packet `Open Order` remains an owner-side secondary action and now has a descriptive
  accessible label.
- `BackLink` now returns users to `Back to Assignments Workspace`.
- Focused packet presentation tests cover assigned offer hierarchy, assigned work hierarchy, owner
  packet order navigation, packet context rendering, instruction rendering, and activity timeline
  preservation.

Preserved boundaries:

- existing packet detail route and packet resolution order;
- existing packet data and section content;
- existing assignment lifecycle action components;
- existing assignment RPC wrappers and action behavior;
- existing owner-only order navigation availability;
- existing assignment-scoped activity timeline reads.

No backend code, Supabase configuration, migrations, permissions, company-scoping behavior, query
semantics, assignment workflow/state-machine behavior, Smart Actions, staffing/dispatch logic,
queue semantics, canonical order/client/relationship visibility, fake analytics, predictive
scoring, new packet actions, RLS/RPC behavior, or mutation behavior changed.
