# Falcon Active Dashboard Migration Plan

## Purpose

This document defines the safe implementation plan and migration lock for Falcon's active dashboard behavior as it moves toward current-live dashboard registry helpers while preserving Staff/default dashboard behavior and assignment-dashboard safety.

It is documentation only. It does not change `DashboardGate`, dashboard components, routes, navigation, command palette behavior, permissions, seeds, migrations, billing, onboarding, company settings, module settings, product-mode runtime behavior, or backend visibility.

The goal is to keep current dashboard behavior explicit before any further dashboard shell work. Current-live dashboard metadata may describe behavior, but permission hooks, active route guards, and existing data/RPC boundaries remain authority.

## Phase 9H39 Migration Lock

Phase 9H37 and Phase 9H38 completed the behavior-preserving current dashboard helper extraction and active `DashboardGate` migration.

Completed:

- `src/lib/dashboard/currentDashboardResolution.js` now resolves current dashboard state from current capability inputs and `currentDashboardRegistry` metadata.
- `DashboardGate` now uses current-live dashboard resolution for branch selection.
- Loading behavior remains unchanged: `LoadingState` still receives "Loading dashboard...".
- Staff/default order dashboard priority remains unchanged.
- Assignment-only dashboard behavior remains unchanged.
- Mixed order/assignment users still receive the order dashboard first.
- Users with no dashboard capability still receive the same unavailable fallback copy.
- No Vendor Portal or Client Portal future dashboard shells are live.

Safety boundary:

- No product-mode or shadow dashboard metadata is active dashboard authority.
- No mode-aware dashboard shells were introduced.
- No dashboard component, dashboard widget, data hook, or RPC behavior changed.
- No route, navigation, or `CommandPalette` behavior changed.
- No permissions, seeds, migrations, company settings, or module settings changed.

Validation baseline:

- `currentDashboardResolution` tests cover order-capable, assignment-only, mixed-user, unavailable, loading, safe fallback, and no future Vendor/Client shell output.
- `DashboardGate` tests cover loading, order-capable, assignment-only, mixed-user, unavailable, and no future Vendor/Client shell rendering.
- Dashboard diagnostics tests still pass.
- `npm run lint`, `npm run build`, and `git diff --check` pass.
- Static import scans confirm no product-mode/shadow metadata imports in active dashboard, navigation, route, `ProtectedRoute`, or command authority surfaces.

Current Phase 9H milestone:

- Desktop and mobile primary `TopNav` use current-live primary navigation helpers.
- Settings/admin utility links use current-live utility link helpers.
- `CommandPalette` command construction and order-search fallback use current-live command helpers.
- `DashboardGate` dashboard resolution uses current-live dashboard resolution.

## Phase 9H40 Runtime Metadata Consolidation Lock

Phase 9H is now consolidated as a complete runtime metadata and current-live registry migration foundation.

Completed Phase 9H dashboard-related foundation:

- Product mode constants/metadata, module registry/categories/helpers, shadow dashboard diagnostics, shadow empty-state/upgrade diagnostics, cross-registry integrity guard, and the protected Product Metadata Diagnostics page are complete and remain diagnostic/non-authoritative.
- `currentDashboardRegistry` describes current live dashboard behavior.
- `currentDashboardResolution` drives active `DashboardGate` branch selection from current capability inputs and current-live dashboard metadata.
- Active `DashboardGate` now uses current-live dashboard resolution.
- Loading behavior, Staff/default order dashboard priority, assignment-only dashboard behavior, mixed-user order priority, and unavailable/no-dashboard fallback are preserved.
- No Vendor Portal or Client Portal future dashboard shell is live.

Safety boundary:

- No product-mode/shadow dashboard authority was introduced.
- No mode-aware dashboard shell was introduced.
- No dashboard component, widget, data hook, or RPC boundary changed.
- No route, nav, or `CommandPalette` behavior changed as part of dashboard migration.
- Route/action permissions and existing data/RPC boundaries remain authority.
- No company/module settings, billing/onboarding enforcement, migrations, permission/seed changes, RLS changes, or RPC authority changes were introduced.

Phase 9H validation baseline:

- Metadata, shadow diagnostics, dashboard parity diagnostics, dashboard diagnostics, current dashboard resolution, and active `DashboardGate` tests pass.
- Lint, build, and `git diff --check` pass.
- Static import scans confirm product-mode/shadow metadata is not imported into active command, navigation, route, or dashboard authority surfaces.

Next allowed options:

- Pause Phase 9H and begin a fresh phase/thread from the H40 consolidation baseline.
- Start H41 route metadata broader extraction as a tiny behavior-preserving live registry migration.
- Start H41 current dashboard widget registry cleanup as a tiny behavior-preserving metadata cleanup.
- Continue onboarding/package planning later, after route/data contracts and product-mode rollout semantics are clearer.
- Defer company module settings, billing/package enforcement, onboarding enforcement, and database-backed runtime composition.

## Current Dashboard Behavior

### DashboardGate

The active `/dashboard` route is authenticated-only at the route wrapper level. `DashboardGate` decides which dashboard surface to render from the resolved permission set.

Current routing behavior:

- While permissions are loading, `DashboardGate` shows `LoadingState` with "Loading dashboard...".
- Order-capable users receive the Staff/default order dashboard when they have any of:
  - `navigation.orders.view`
  - `orders.read.all`
  - `orders.read.assigned`
- Assignment-capable users receive the assignment-native dashboard only when they have assignment read permission and do not have order-dashboard permissions.
- Assignment dashboard permissions are:
  - `order_company_assignments.read_assigned`
  - `order_company_assignments.read_owner`
- Users with neither order-dashboard nor assignment-dashboard permission receive the stable unavailable state.
- If a user has both order and assignment dashboard permissions, the order dashboard wins.

This precedence is active behavior. It is not a Hybrid dashboard model.

### Staff / Default Order Dashboard

The Staff/default order dashboard is `src/features/dashboard/DashboardPage.jsx`.

Current behavior:

- Uses `useDashboardSummary({ refreshKey })`.
- Derives role/lens context through `useCurrentUserAppContext()`.
- Uses `useOrdersSummary(..., { scope: "dashboard" })` for dashboard order rows.
- Uses `useDashboardKpis(...)` for order KPI values.
- Renders `DashboardCalendarPanel` over dashboard order rows.
- Renders operational queue summaries from `summarizeOperationalQueues(...)`.
- Renders `UnifiedOrdersTable` with `scope="dashboard"`.
- Opens canonical order details at `/orders/:orderId`.
- Filters dashboard work through order table filters and queue IDs.
- Uses Staff/default language such as "Falcon Operations", "Operational Cockpit", "Orders", "My Orders", "Reviewer Dashboard", and "Admin Dashboard".

Current role/lens assumptions:

- Owner/admin-style users are treated as broad operational dashboard users.
- Reviewers receive reviewer-specific title/copy and reviewer queue/table filtering.
- Appraisers receive assigned-work framing and appraiser filters.
- Mixed order/assignment users receive the order dashboard first through `DashboardGate`.

### Assignment-Native Dashboard

The assignment-native dashboard is `src/features/dashboard/AssignmentDashboardPage.jsx`.

Current behavior:

- Renders only after `DashboardGate` chooses assignment dashboard access.
- Shows "Company Work" / "Assignment Dashboard" copy.
- Renders `AssignedWorkDashboard` when `order_company_assignments.read_assigned` is present.
- Renders `OwnerSentAssignmentsDashboard` when `order_company_assignments.read_owner` is present.
- Does not fetch order dashboard data.
- Does not use `DashboardPage`, `UnifiedOrdersTable`, order KPIs, order calendar, order activity, or canonical order detail links.
- Shows explicit unavailable/error copy when assignment dashboard access is missing or assignment data fails.
- Error copy states that no order dashboard fallback was attempted.

Assigned-company dashboard data boundary:

- `AssignedWorkDashboard` calls `listAssignedAssignments()`.
- `listAssignedAssignments()` calls `rpc_order_company_assignment_inbox`.
- Rows link only to `/assignments/:assignmentId`.
- Rows use the action label "Open Packet".

Owner sent-assignment dashboard data boundary:

- `OwnerSentAssignmentsDashboard` calls `listOwnerAssignments()`.
- `listOwnerAssignments()` calls `rpc_order_company_assignment_list`.
- Rows link only to `/assignments/:assignmentId`.
- Rows use the action label "Open Packet".

Current assignment dashboard widgets:

- Assigned Work: Offered, Active Work, Due Soon, Overdue, Submitted.
- Sent Assignments: Sent Active, Submitted, Overdue, Expiring Offers, Completed Recently.

### Data Hooks And RPC Boundaries

Current order-dashboard data boundaries:

- `useDashboardSummary()` derives current-user app context through `rpc_current_user_app_context()` via `useCurrentUserAppContext()`.
- `useDashboardSummary()` uses order summary/table hooks with `scope="dashboard"`.
- `useDashboardKpis()` supplies current order KPI values.
- `DashboardCalendarPanel` receives already-readable dashboard order rows.
- `UnifiedOrdersTable` remains the dashboard worklist surface for order-capable users.

Current assignment-dashboard data boundaries:

- Assignment dashboard metrics are frontend summaries over assignment RPC rows.
- Assigned-company rows come from assignment packet/list RPC access, not canonical order reads.
- Owner sent-assignment rows come from owner assignment RPC access.
- Assignment rows expose safe assignment display fields and assignment packet links only.

These data boundaries must not be widened by dashboard registry extraction.

### Dashboard Links And Actions

Current Staff/default dashboard links/actions:

- Open order detail at `/orders/:orderId`.
- Filter work through dashboard-scoped order table state.
- Navigate from queue context into order list/order detail behavior where current components already do so.
- Smart Actions may appear inside dashboard order rows through `UnifiedOrdersTable`.

Current assignment dashboard links/actions:

- Open assignment packets at `/assignments/:assignmentId`.
- Refresh assignment dashboard RPC rows.
- No canonical `/orders/:orderId` links.
- No order table, order KPI, order activity, or order calendar reuse.

## Migration Philosophy

- Preserve Staff/default dashboard behavior first.
- Preserve assignment-only dashboard safety before any helper extraction or dashboard composition work.
- Current-live dashboard registry describes current behavior only.
- Current-live dashboard metadata is not product-mode authority.
- Permission hooks remain dashboard visibility authority.
- Existing route guards and backend data/RPC boundaries remain access authority.
- No mode-aware dashboard shell should be introduced yet.
- No Vendor Portal or Client Portal dashboard should become live until routes, projections, data contracts, and safe mode-native copy exist.
- No AMC command-center shell should become live until queue contracts and AMC operational semantics are implementation-ready.
- Do not use dashboard widgets as authorization.
- Do not expose hidden modules as empty cards, disabled widgets, locked clutter, or future shell placeholders.

## Recommended Stages

### Stage 1: Extract Current Dashboard Helper Only

- Complete in Phase 9H37.
- Current dashboard concepts are extracted into a current-live helper.
- `DashboardPage`, `AssignmentDashboardPage`, and dashboard widgets remain unchanged.
- Current `DashboardGate` precedence is represented as descriptive current-live metadata only.
- Current Staff/default dashboard sections, labels, data sources, links, and order-dashboard assumptions are represented.
- Current assignment dashboard sections, packet-only links, assignment RPC boundaries, and no-order-fallback safety are represented.
- Product-mode metadata, shadow dashboard metadata, module composition, package metadata, company settings, and module settings are not imported into active dashboard authority.

### Stage 2: Add Parity Tests Against CurrentDashboardRegistry

- Complete in Phase 9H37 and Phase 9H38.
- Helper tests verify current dashboard resolution output against current-live registry metadata.
- `DashboardGate` tests verify loading, order-capable, assignment-only, mixed-user, unavailable, and no future portal shell rendering.
- Staff/default dashboard concepts, labels, links, and data boundary notes remain represented.
- Assignment dashboard concepts, packet-only route metadata, and assignment RPC boundary notes remain represented.
- No Vendor Portal or Client Portal dashboard shell is returned as current-live output.
- No product-mode or shadow metadata becomes runtime authority.

### Stage 3: Keep Current-Vs-Shadow Diagnostics Separate

- Current-vs-shadow dashboard parity diagnostics already exist in Product Metadata Diagnostics.
- Continue using diagnostics only for comparison.
- Diagnostics must not affect `/dashboard`, `DashboardGate`, dashboard rendering, permission checks, route guards, or data fetching.

### Stage 4: Migrate One Low-Risk Dashboard Metadata Reference If Useful

- Phase 9H38 migrated the low-risk `DashboardGate` branch-selection reference to current-live resolution.
- Rendered dashboard components, data hooks, widgets, query scopes, and route behavior were not moved.
- Further metadata reference migration should wait for Phase 9H consolidation or a fresh tiny-slice plan.

### Stage 5: Later Consider DashboardGate Shell Resolution

- Mode-aware `DashboardGate` shell resolution remains deferred.
- Any future shell resolver must preserve order-dashboard precedence, assignment-only safety, unavailable state behavior, and permission loading behavior unless explicitly changed by a dedicated migration.
- Mode-aware shell resolution requires company/module settings, route availability, safe data contracts, and mode-native dashboard copy.

## Risks

- Breaking assignment-only `DashboardGate` safety.
- Exposing Staff/default order dashboard to assignment-only users.
- Mixing Staff, AMC, Vendor, and Client language in one dashboard surface.
- Widening order, client, assignment, activity, calendar, or notification data access by treating dashboard metadata as authority.
- Confusing widget visibility with authorization.
- Reusing order dashboard widgets for Vendor or Client modes.
- Introducing AMC/Vendor/Client dashboard shells before routes and data contracts exist.
- Breaking Staff/default operational cockpit behavior while extracting metadata.
- Routing assignment dashboard rows to canonical order pages.
- Treating mixed users as Hybrid-ready without lane design.

## Required Tests

- `DashboardGate` safety and precedence.
- Assignment-only users continue to receive assignment dashboard, not Staff/default order dashboard.
- Users with both order and assignment dashboard permissions continue to receive the current order dashboard unless a future slice explicitly changes that behavior.
- Staff/default dashboard concepts, labels, links, and data boundaries remain represented.
- Assignment dashboard packet-only links remain represented.
- No Vendor Portal or Client Portal dashboard shell appears in current-live helper output.
- No product-mode or shadow metadata becomes runtime authority.
- No data hook or RPC boundary changes.
- No route, navigation, command palette, permission, seed, migration, or backend behavior changes.

## Stop Conditions

Stop the migration if any of the following happen:

- Any `/dashboard` routing regression.
- Any widened order, client, assignment, activity, calendar, or notification visibility.
- Any assignment-only user receives the Staff/default order dashboard.
- Any assignment dashboard row routes to canonical order detail.
- Any Vendor Portal or Client Portal future dashboard shell becomes live.
- Any shadow dashboard metadata becomes runtime authority.
- Any product-mode metadata becomes runtime authority.
- Any data hook/RPC boundary changes without explicit implementation approval.
- Any route, nav, command palette, permission, seed, migration, RLS, or RPC change appears in a dashboard-planning slice.

## Next Recommended Slice

The next safe implementation options are:

- Pause Phase 9H and begin a fresh phase/thread from the H40 consolidation baseline.
- Start H41 route metadata broader extraction as a tiny behavior-preserving live registry migration.
- Start H41 current dashboard widget registry cleanup as a tiny behavior-preserving metadata cleanup.
- Continue onboarding/package planning later, after route/data contracts and product-mode rollout semantics are clearer.
