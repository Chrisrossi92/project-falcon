# Falcon Dashboard Parity Audit

## Purpose

This audit compares Falcon's current active dashboard behavior with the inert shadow dashboard composition diagnostics.

It is documentation only. It does not change `DashboardGate`, dashboard components, navigation, routes, command palette behavior, permissions, seeds, migrations, billing, onboarding, company settings, or runtime product behavior.

The shadow dashboard metadata remains diagnostic and non-authoritative. Active route guards, `DashboardGate`, and backend visibility rules remain the authority for what a user can see.

Live navigation migration must follow `docs/FALCON_ACTIVE_NAVIGATION_MIGRATION_PLAN.md` so dashboard entry points and assignment-only dashboard safety do not drift from active nav or route authority.

Active dashboard migration follows `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md`. Phase 9H37 and Phase 9H38 completed the current-live helper extraction and active `DashboardGate` helper migration while preserving behavior.

## Phase 9H21 Diagnostics Lock

The dashboard diagnostics layer is now code-backed and displayed in the protected Product Metadata Diagnostics page.

Completed current-live registry:

- `src/lib/dashboard/currentDashboardRegistry.js`

Completed parity diagnostics:

- `src/lib/dashboard/dashboardParityDiagnostics.js`

Diagnostics page coverage:

- The page displays shadow dashboard diagnostics and live-vs-shadow dashboard parity for the selected product mode.
- The dashboard parity section shows matched concepts, live-only dashboard entries, shadow-only/future dashboard gaps, lane metadata, widget/section notes, and permission metadata warnings.
- The page also displays product modes, module registry metadata, shadow navigation, routes, command palette, empty-state, and upgrade diagnostics, plus navigation/command parity sections.

Safety boundary:

- At Phase 9H21, active `DashboardGate`, `DashboardPage`, `AssignmentDashboardPage`, and dashboard widgets remained unchanged. Since Phase 9H38, only `DashboardGate` branch selection uses current-live dashboard resolution; rendered dashboard pages and widgets remain unchanged.
- Active `TopNav`, mobile navigation, `CommandPalette`, routes, and route authority remain unchanged.
- Permissions, seeds, migrations, company/module settings, billing, onboarding, and package behavior remain unchanged.
- The current-live dashboard registry is descriptive only and is not imported by active dashboard components.
- Shadow dashboard metadata and parity output are diagnostic/non-authoritative and do not authorize visibility.

Migration readiness:

- Staff/default dashboard behavior is closest to parity.
- Assignment-native dashboard concepts are described as packet-only foundations without widening order/client visibility.
- AMC is partial/future and still needs a command-center shell, intake/assignment/vendor/client lanes, queue contracts, and SLA semantics.
- Vendor dashboard migration remains future shell/data-contract dependent despite assignment packet foundations.
- Client dashboard migration remains future shell/data-contract dependent.
- Hybrid lane separation remains future; mixed users currently follow existing `DashboardGate` precedence rather than a composed Hybrid dashboard.
- Dashboard migration should remain planning-only until active navigation migration proves the registry approach.

## Phase 9H36 Active Dashboard Migration Plan

Phase 9H36 added `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md` as the safety plan for migrating active dashboard behavior toward current-live dashboard helpers.

The plan locks:

- Current `DashboardGate` permission precedence must be preserved.
- Staff/default `DashboardPage` behavior must be preserved first.
- Assignment-only dashboard safety must remain intact.
- Assignment dashboard rows must remain packet-only and route only to `/assignments/:assignmentId`.
- Current order-dashboard data hooks and assignment dashboard RPC boundaries remain authority and must not be widened by metadata.
- Current-live dashboard registry metadata describes behavior only.
- Permission hooks, route guards, and backend visibility remain authority.
- No mode-aware dashboard shell is allowed yet.
- No Vendor Portal or Client Portal dashboard shell may become live before real routes and safe data contracts exist.
- Routes, navigation, command palette behavior, permissions, seeds, migrations, company settings, and module settings remain unchanged.

Completed follow-up implementation:

- Phase 9H37 extracted current dashboard concepts into a current-live helper.
- Phase 9H38 switched `DashboardGate` branch selection to the helper while preserving rendered behavior.
- Phase 9H39 locks the migration before any further dashboard shell work.

## Phase 9H39 DashboardGate Registry Migration Lock

Phase 9H37 and Phase 9H38 completed the dashboard helper extraction and active `DashboardGate` migration:

- `src/lib/dashboard/currentDashboardResolution.js` now describes current dashboard resolution behavior from current capability inputs and current-live dashboard registry metadata.
- `DashboardGate` now uses current-live dashboard resolution for branch selection.
- Loading behavior is preserved.
- Staff/default order dashboard priority is preserved.
- Assignment-only dashboard behavior is preserved.
- Mixed-user order dashboard priority is preserved.
- The unavailable/no-dashboard fallback is preserved.
- No Vendor Portal or Client Portal future dashboard shell is live.

Safety boundary:

- No product-mode or shadow dashboard metadata is active dashboard authority.
- No mode-aware dashboard shells were introduced.
- No dashboard component, dashboard widget, data hook, or RPC boundary changed.
- No route, navigation, or `CommandPalette` behavior changed.
- No permissions, seeds, migrations, company settings, or module settings changed.

Validation baseline:

- `currentDashboardResolution` tests pass.
- `DashboardGate` tests pass.
- Dashboard composition and parity diagnostics tests pass.
- `npm run lint`, `npm run build`, and `git diff --check` pass.
- Static import scans confirm no product-mode/shadow metadata imports in active dashboard, navigation, route, `ProtectedRoute`, or command authority surfaces.

Current Phase 9H milestone:

- Desktop/mobile primary `TopNav` uses current-live primary navigation helpers.
- Settings/admin utility links use current-live utility link helpers.
- `CommandPalette` command construction and order-search fallback use current-live command helpers.
- `DashboardGate` dashboard resolution uses current-live dashboard resolution.

Next allowed options:

- Phase 9H40 overall Phase 9H implementation consolidation/doc lock.
- Then decide whether to continue tiny live migrations or pause product-mode implementation and move to another roadmap phase.

## Current Active Dashboard Surfaces

### DashboardGate

The active `/dashboard` route is authenticated-only at the route wrapper level. `DashboardGate` decides which dashboard shell to render from the current permission set:

- Order-capable users receive the Staff/default order dashboard when they have `navigation.orders.view`, `orders.read.all`, or `orders.read.assigned`.
- Assignment-capable users receive the assignment-native dashboard when they have `order_company_assignments.read_assigned` or `order_company_assignments.read_owner` and do not have order-dashboard permissions.
- Users with neither order dashboard nor assignment dashboard permission receive a stable unavailable state.
- If both order and assignment dashboard permissions are present, the order dashboard wins. Mixed users do not currently receive a combined Hybrid dashboard.

### Staff / Default Dashboard

The active order dashboard is `DashboardPage`. It remains an internal operational cockpit, not a mode-composed dashboard.

Current behavior:

- Uses `useDashboardSummary` and order-backed dashboard data.
- Uses `DashboardCalendarPanel` for calendar-centered operational pressure.
- Uses deterministic operational queue summaries from active dashboard orders.
- Uses `UnifiedOrdersTable` with `scope="dashboard"` for the worklist.
- Opens canonical order detail routes through `/orders/:orderId`.
- Links operational queue filters to `/orders?queue=<queueId>`.
- Uses role/lens assumptions from current app context and dashboard summary:
  - reviewer gets "Reviewer Dashboard" and reviewer queue mode.
  - admin gets "Admin Dashboard", admin status chips, and broader order filters.
  - other order-capable users get "My Dashboard" and assigned-work framing.

Current active dashboard sections:

- Falcon Operations header.
- Operational Cockpit.
- Operational Attention queue panel.
- Dashboard calendar panel.
- Orders / My Orders worklist.
- Admin status chips for order filtering.

### Assignment-Native Dashboard

The active assignment dashboard is `AssignmentDashboardPage`. It is intentionally separate from the order dashboard.

Current behavior:

- Shows a "Company Work" / "Assignment Dashboard" header.
- Renders `AssignedWorkDashboard` when the user can read assigned packets.
- Renders `OwnerSentAssignmentsDashboard` when the user can read owner-side sent assignments.
- Does not fetch order dashboard data.
- Does not use `UnifiedOrdersTable`, order KPIs, order calendar, or canonical order activity.
- Shows explicit unavailable/error copy that no order dashboard fallback was attempted.

Assigned work widgets:

- Offered.
- Active Work.
- Due Soon.
- Overdue.
- Submitted.
- Rows link to `/assignments/:assignmentId` and label the action as "Open Packet".

Owner sent-assignment widgets:

- Sent Active.
- Submitted.
- Overdue.
- Expiring Offers.
- Completed Recently.
- Rows link to `/assignments/:assignmentId` and label the action as "Open Packet".

### Calendar / Attention / Worklist Surfaces

The current order dashboard combines several concerns into the Staff/default cockpit:

- Calendar pressure comes from order-derived dashboard rows.
- Operational attention comes from deterministic queue evaluation over dashboard orders.
- Worklist behavior comes from `UnifiedOrdersTable`.
- Smart Actions can appear inside dashboard table rows through the order table.
- Dashboard links move users into canonical order routes and order-list queue filters.

The assignment dashboard does not reuse those surfaces. It derives metrics from assignment list RPC rows and links only to assignment packet routes.

## Current Risks

- Staff cockpit assumptions are embedded in the active order dashboard through order language, operational queues, canonical order links, appraiser/reviewer/admin lenses, and order table reuse.
- Assignment-only dashboard safety depends on `DashboardGate` preferring assignment surfaces only when order dashboard permission is absent.
- Mixed users currently get the order dashboard first, so Hybrid/Ecosystem lane separation is not represented.
- AMC Operations has partial building blocks but no AMC-native command center shell, intake queue shell, vendor follow-up lanes, SLA escalation dashboard, or client/lender exception dashboard.
- Vendor Portal has assignment dashboard foundations, but the active assignment dashboard is still generic company-work language rather than a complete vendor packet execution dashboard.
- Client Portal has no active request/status/document dashboard shell.
- Staff dashboard copy such as "Falcon Operations", "Operational Cockpit", "Orders", "My Orders", "Reviewer Dashboard", and "Admin Dashboard" is unsafe as a universal mode dashboard.
- Dashboard widgets and route links are permission-driven and data-source-driven, not module-driven.
- If widget composition is introduced too early, hidden modules could appear as empty cards or locked clutter.
- Dashboard widgets must not become permission authority; they can only reflect visibility that route guards and backend data boundaries already enforce.
- Reusing order dashboard widgets for Vendor or Client modes would leak internal workflow, order, review, client CRM, or AMC operations concepts.

## Shadow Dashboard Expectations

The shadow dashboard diagnostics are generated from metadata only. They do not drive active dashboard rendering.

### Staff Appraisal

Shadow shell:

- Staff Operations Dashboard.
- Daily question: What orders need attention today, who owns them, and what is blocking delivery?

Shadow sections/widgets:

- Active Order Attention.
- Due Soon and Overdue.
- Client Operational Summary.
- Team Access Setup.
- Review / QC Queue.
- Calendar Pressure.
- Notification Attention.
- Recent Activity.

Parity assessment:

- Staff is closest to current active behavior.
- Current order dashboard covers active order attention, due pressure, calendar pressure, operational queues, and order worklists.
- Current dashboard does not expose module-owned Team Access Setup, Client Operational Summary, Recent Activity, or a real Review / QC Queue section as shadow metadata describes.
- Staff/dashboard migration should preserve the current operational cockpit before introducing module-owned widgets.

### AMC Operations

Shadow shell:

- AMC Network Operations Dashboard.
- Daily question: Which client orders need intake, assignment, vendor follow-up, review, or SLA escalation?

Shadow sections/widgets:

- Intake and Unassigned Orders.
- Client and Lender Exceptions.
- Assignment SLA Pressure.
- Relationship Attention.
- Review / QC Queue.
- Calendar Pressure.
- AMC Network Command Center.
- Notification Attention.
- Recent Activity.

Parity assessment:

- Current dashboard has assignment, relationship, order, calendar, and review-adjacent foundations, but not an AMC-native shell.
- Active order dashboard language is Staff/internal rather than AMC network operations language.
- Active assignment dashboard can show sent-assignment pressure, but it is not integrated into an AMC command center.
- AMC dashboard implementation should wait for queue contracts and AMC operational semantics to be implementation-ready.

### Vendor Portal

Shadow shell:

- Assignment Packet Dashboard.
- Daily question: What assigned packets do I need to accept, work, update, or submit?

Shadow sections/widgets:

- Active Assignment Packets.
- Vendor Packet Dashboard.
- Calendar Pressure.
- Notification Attention.
- Recent Activity.

Parity assessment:

- Current assignment dashboard provides the safest existing foundation for Vendor Portal work.
- It already avoids order dashboard fallback and links only to assignment packets.
- It does not yet provide a Vendor-native shell, vendor profile/setup context, packet-specific calendar semantics, or vendor-specific copy.
- The Staff/default order dashboard must not be reused for Vendor Portal.

### Client Portal

Shadow shell:

- Client Order Status Dashboard.
- Daily question: What requests need my attention, what is their status, and what reports or documents are available?

Shadow sections/widgets:

- Client Status Dashboard.
- Recent Updates.
- Delivered Documents / Reports.
- Active Requests.
- Waiting on Me.
- Notification Attention.
- Recent Activity.

Parity assessment:

- There is no active Client Portal dashboard shell.
- Active order, assignment, relationship, user, review, and AMC dashboard widgets are not client-safe.
- Client dashboard migration must wait for real client portal routes, request/status projections, document/report contracts, and client-safe communication/activity surfaces.

### Hybrid / Ecosystem

Shadow shell:

- Ecosystem Operations Dashboard.
- Daily question: What internal work and network work need attention, and which lane owns the next action?

Shadow expected sections:

- Internal Operations lane.
- Network Work lane.
- Sent Assignments lane.
- Relationship Attention lane.
- Client/Portal lane.

Parity assessment:

- Active `DashboardGate` does not render lane-aware Hybrid dashboards.
- Mixed users currently get the order dashboard first.
- Existing assignment and relationship foundations can inform future lanes, but there is no active unified Hybrid shell.
- Hybrid migration must preserve explicit separation between owned orders, sent assignments, received packets, relationships, and client-facing work.

## Gaps

Current Staff-compatible areas:

- Order attention and worklist.
- Due-soon/overdue pressure.
- Calendar-centered operational view.
- Reviewer/admin/appraiser dashboard lenses.
- Deterministic queue signals over readable orders.
- Canonical order links for order-capable users.

Existing assignment dashboard foundations:

- Assignment-only dashboard route through `DashboardGate`.
- Assigned-company work metrics and rows.
- Owner sent-assignment metrics and rows.
- Packet-only links to `/assignments/:assignmentId`.
- No order dashboard fallback for assignment dashboard errors.
- No order table, order KPI, order calendar, or canonical activity reuse.

Missing AMC-native dashboard shell:

- AMC Network Operations Dashboard.
- Intake/unassigned queue sections.
- Vendor offer/acceptance and SLA escalation sections.
- Client/lender exception sections.
- Relationship attention integrated as network operations.
- AMC command-center language and queue grouping.

Missing Vendor dashboard shell:

- Assignment Packet Dashboard page framing.
- Vendor-native packet acceptance/work/submission/revision sections.
- Packet calendar semantics.
- Vendor profile/readiness/setup context.
- Vendor-safe notifications/activity framing.

Missing Client dashboard shell:

- Client Order Status Dashboard.
- Active requests and waiting-on-me sections.
- Delivered document/report widgets.
- Client-safe updates and communication history.
- Request/status search and submission context.

Missing Hybrid lane separation:

- Internal Operations lane.
- Network Work lane.
- Sent Assignments lane.
- Received Packet lane.
- Relationship Attention lane.
- Client/Portal lane.
- Clear precedence rules for mixed-permission users.

Widgets that should remain hardcoded for now:

- Current Staff/default `DashboardPage`.
- `DashboardGate` precedence.
- Assignment dashboard assigned-work and owner-sent widgets.
- Dashboard calendar panel.
- Operational attention queue panel.
- Dashboard-scoped `UnifiedOrdersTable`.

Widgets that should eventually become module-owned:

- Active order attention.
- Due soon / overdue pressure.
- Calendar pressure.
- Client operational summary.
- Review / QC queue.
- Team access setup.
- Assignment packet pressure.
- Relationship attention.
- Notification attention.
- Recent activity.
- Client status, documents/reports, and updates.

## Migration Recommendations

Safe future migration order:

1. Preserve Staff/default dashboard behavior first.
2. Keep assignment-only dashboard safety intact and avoid order fallback for assignment users.
3. Add a shadow-vs-current dashboard comparison audit or test fixture before live dashboard composition.
4. Introduce a read-only composed dashboard preview only if it remains behind diagnostics/settings-style access and does not replace `/dashboard`.
5. Align dashboard widget gates with route and backend visibility before metadata affects rendering.
6. Migrate one low-risk Staff dashboard section at a time, with an immediate fallback to the current hardcoded section.
7. Keep the current assignment dashboard hardcoded until Vendor Portal route/data contracts exist.
8. Do not build Vendor or Client dashboard shells until real portal routes, data contracts, and safe vocabulary exist.
9. Do not build the AMC dashboard shell until AMC queue contracts and command-center semantics are implementation-ready.
10. Do not build Hybrid dashboards until lane precedence and mixed-user behavior are explicitly designed.

## Guardrails

- Do not treat shadow dashboard metadata as authority.
- Do not reuse the Staff dashboard for Vendor or Client modes.
- Do not expose internal AMC queues to Vendor or Client users.
- Do not expose canonical order dashboards to assignment-only users.
- Do not expose hidden modules as empty cards, disabled widgets, or locked clutter.
- Do not use dashboard widgets to widen access beyond route guards and backend visibility.
- Do not break the existing operational cockpit for Staff/default users.
- Do not widen assignment packet visibility or route assignment rows to canonical orders.
- Do not mix Hybrid lanes without explicit labels.
- Do not introduce Vendor, Client, or AMC dashboard placeholders before their routes and data contracts exist.

## Validation Baseline

For active dashboard migration:

- This audit must be reviewed against `DashboardGate`, `DashboardPage`, and `AssignmentDashboardPage`.
- `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md` remains the boundary for any later dashboard metadata reference work or shell work.
- `currentDashboardResolution` and `DashboardGate` tests must stay green.
- Shadow dashboard diagnostics must be reviewed manually for Staff, AMC, Vendor, Client, and Hybrid modes.
- Staff/default operational cockpit behavior must be preserved or explicitly fallback-safe.
- Assignment-only dashboard safety must be validated.
- Vendor/Client hidden-surface guardrails must still pass.
- Route exposure and data source visibility must be mapped for every dashboard link and widget.
- Dashboard permission metadata must remain non-authoritative until explicit authorization wiring exists.
- `npm run lint`, `npm run build`, and `git diff --check` should pass before and after any future dashboard wiring slice.
