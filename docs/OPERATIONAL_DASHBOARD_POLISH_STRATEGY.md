# Operational Dashboard Polish Strategy

## Purpose

Phase 10K1 designs the next dashboard/product UX phase focused on making Falcon feel more
operationally useful: workload, bottlenecks, review flow, overdue work, and quick triage.

This is documentation-only plus read-only inspection. It does not add runtime code,
migrations, backend behavior changes, routes, registries, UI, tests, permissions, RLS, RPCs,
analytics queries, product-mode authority, or module authority.

## Sources Inspected

Runtime:

- `src/features/dashboard/DashboardPage.jsx`
- `src/features/dashboard/DashboardGate.jsx`
- `src/lib/hooks/useDashboardSummary.js`
- `src/lib/hooks/useDashboardKpis.js`
- `src/lib/hooks/useOrders.js`
- `src/lib/api/dashboardKpis.js`
- `src/lib/api/orders.js`
- `src/features/queues/orderAssessment.js`
- `src/features/queues/queueDefinitions.js`
- `src/features/queues/queueSummary.js`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/features/orders/smartActions.js`
- `src/components/dashboard/DashboardCalendarPanel.jsx`
- `src/components/orders/view/QuickActionsDrawerPanel.jsx`
- `src/components/orders/table/ReviewerActionCell.jsx`
- `src/lib/constants/orderStatus.js`
- `src/lib/permissions/constants.js`
- `src/routes/index.jsx`

Docs:

- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_DASHBOARD_PARITY_AUDIT.md`
- `docs/FALCON_OPERATIONAL_INTELLIGENCE_MODEL.md`
- `docs/DASHBOARD_INFORMATION_HIERARCHY_V2.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`

## Current Dashboard State

Active `/dashboard` behavior:

- `/dashboard` is authenticated at the route wrapper.
- `DashboardGate` chooses the active dashboard surface based on current permission resolution.
- Order-capable users land on `DashboardPage`.
- Assignment-only users are routed to assignment-native dashboard surfaces.
- Authenticated users without dashboard capability receive a stable unavailable state.

Current order dashboard:

- Uses `useDashboardSummary(...)`.
- Loads current app-user context through `useCurrentUserAppContext()`.
- Derives owner/admin/reviewer/appraiser lensing from active current-company role context.
- Uses `useOrdersSummary(...)` and `useDashboardKpis(...)`.
- Reads order rows through `fetchOrdersWithFilters(...)`.
- Uses `v_orders_active_frontend_v4` for dashboard-scoped rows/KPIs.
- Uses `v_orders_frontend_v4` for broader orders scope elsewhere.
- Renders a Falcon Operations hero.
- Renders the Owner Setup diagnostic prompt when `settings.view` is available.
- Renders `OperationalQueuesPanel` from deterministic queue summaries over dashboard order rows.
- Renders `DashboardCalendarPanel` for temporal context.
- Renders `UnifiedOrdersTable` with dashboard scope and optional active queue filtering.
- Provides admin status chips for broad status filtering.
- Links selected dashboard queues to `/orders?queue=<queueId>`.

Current safe dashboard metrics:

- total active orders;
- in progress;
- due in 7 days;
- inspected / awaiting report;
- due to client in 2 days.

Current deterministic queue signals:

- due soon;
- overdue;
- waiting on reviewer;
- waiting on appraiser;
- final approval queue;
- ready for delivery;
- unassigned orders.

Queue definitions also exist for stuck orders, inspection complete / report not started,
reviewer overload, appraiser overload, and revision loop risk, but not all of those have
implemented row-level signal logic today.

Current smart action foundation:

- `UnifiedOrdersTable` and drawer surfaces use canonical workflow helpers for active smart
  actions.
- `getSmartOrderActions(...)` maps available actions by role/status/permission.
- Appraiser actions include Send to Review / Resubmit to Review for eligible statuses.
- Reviewer actions include Request Revisions and Clear Review for in-review orders.
- Admin-like workflow actions can include Send to Review, Request Revisions, Clear Review,
  Request Final Approval, Mark Ready for Client, and Mark Complete when status and permissions
  allow.

## Current Operational Gaps

The dashboard is functional, but it can feel more like a calendar plus table than a daily
operations command surface.

Current gaps:

- Workload is not summarized by owner, reviewer, or appraiser in a dedicated section.
- Review bottlenecks are not elevated as a first-class section.
- Due soon and overdue work exist as queue/KPI signals, but they are not yet framed as a
  daily triage list.
- The dashboard does not explicitly explain what needs action now versus what is routine context.
- Recent activity is not currently a dashboard section.
- Team capacity / assignment load is mostly future; deterministic overload queue IDs exist, but
  implemented data should be verified before surfacing them.
- Reviewer-specific dashboard behavior is mostly an order table lens rather than a polished
  review queue experience.
- Appraiser-specific dashboard behavior is mostly an assigned work lens rather than a polished
  "what should I do next" workbench.
- Summary card code exists but is not currently rendered as the primary first-screen hierarchy.
- Some older/stub surfaces remain present, such as the disabled `showReviewQueue` placeholder.

## Target Dashboard Experience

The next dashboard phase should make the first screen answer:

- What needs attention today?
- Which work is late or at risk?
- Who owns the next step?
- Which review or delivery handoff is blocked?
- What should I open next?

The dashboard should feel operational, not analytical-first. Analytics can follow after the
daily triage surface is trustworthy.

Target hierarchy:

1. Highest-severity attention and due pressure.
2. Orders needing action, grouped by queue or next owner.
3. Role-specific worklist or review/appraiser queue.
4. Calendar context.
5. Recent activity and supporting links.

## Recommended Dashboard Sections

### Workload Snapshot

Purpose:

- Show the current load in a compact, scannable way.

Safe current data:

- total active orders;
- in progress;
- due in 7 days;
- inspected / awaiting report;
- due to client in 2 days.

10K2 candidate:

- Reintroduce or polish a compact snapshot row using existing `summary.orders` values only.

Avoid in 10K2:

- per-user capacity metrics unless derived from already loaded dashboard rows and clearly labeled
  as current visible workload only.

### Orders Needing Action

Purpose:

- Make the queue panel the main triage surface instead of an abstract alert row.

Safe current data:

- `summarizeOperationalQueues(ordersRows)`;
- `getTopOperationalQueues(...)`;
- selected queue filtering in `UnifiedOrdersTable`;
- `/orders?queue=<queueId>` link.

10K2 candidate:

- Improve heading/copy around selected queue state and show a clearer "why this queue exists"
  line using existing queue descriptions/explanations.

### Review Bottlenecks

Purpose:

- Surface review handoffs, revision loops, final approval, and ready-for-client work.

Safe current data:

- order status values: `in_review`, `needs_revisions`, `review_cleared`,
  `pending_final_approval`, `ready_for_client`;
- reviewer lens filtering in `useDashboardSummary(...)`;
- deterministic `waiting_on_reviewer`, `final_approval_queue`, and `ready_for_delivery` queues;
- smart actions already gated by role/status/permission.

10K2 candidate:

- Add a small review-focused summary or filter area only if it uses already loaded dashboard rows.

Deferred:

- reviewer cycle time;
- review age thresholds;
- revision-loop risk;
- reviewer overload;
- new review analytics RPCs.

### Overdue / Due Soon

Purpose:

- Give due pressure a clear triage lane.

Safe current data:

- `due_in_7`;
- `due_to_client_2`;
- deterministic due-soon / overdue queue evaluation from dashboard rows;
- final due fields from existing order projections.

10K2 candidate:

- Make due pressure visible in a compact section or selected queue preset without new queries.

Deferred:

- SLA policy;
- business-day calendars;
- client-specific due thresholds;
- predictive delivery risk.

### Recent Activity

Purpose:

- Help users understand what changed recently.

Safe current data:

- Active activity surfaces exist elsewhere, but the dashboard strategy should inspect current
  activity projections before adding a dashboard feed.

10K2 candidate:

- Do not add this unless an existing dashboard-safe feed is already available and cheap.

Deferred:

- new activity aggregation;
- cross-order activity feed changes;
- additional activity RPCs.

### My Assignments

Purpose:

- Give appraisers and reviewers a role-specific "my work" surface.

Safe current data:

- appraiser dashboard filters use assigned appraiser IDs and statuses `new`, `in_progress`,
  `needs_revisions`;
- reviewer dashboard filters use reviewer ID and `in_review`;
- `UnifiedOrdersTable` already supports dashboard scope and smart actions.

10K2 candidate:

- Polish role-specific empty states, section labels, and worklist copy using the existing table.

Deferred:

- assignment packet dashboards are separate and should not be blended into owned-order dashboard
  lanes without explicit labeling.

### Team Capacity / Assignment Load

Purpose:

- Help owners/admins see whether work is concentrated on one person.

Safe current data:

- currently loaded dashboard rows include appraiser/reviewer IDs and names.

10K2 candidate:

- Only consider a lightweight client-side visible-row count by appraiser/reviewer if it is clearly
  labeled as "visible active workload" and not a full capacity metric.

Deferred:

- capacity targets;
- workload scoring;
- calendar availability;
- performance analytics;
- reviewer/appraiser overload queue activation unless signal logic is implemented and verified.

### Quick Links / Smart Actions

Purpose:

- Help users move from triage to action.

Safe current data:

- existing route links to `/orders`, `/orders/new`, `/calendar`, `/settings/owner-setup`,
  and `/users` where existing permissions allow;
- smart actions inside `UnifiedOrdersTable` and drawers.

10K2 candidate:

- Add or polish quick links only when using existing routes and existing permission helpers.
- Do not move mutation controls into new dashboard widgets unless the same canonical smart action
  component and permissions are reused.

Deferred:

- dashboard-level bulk actions;
- direct status controls outside existing smart-action patterns;
- any action that requires new mutation contracts.

## Role-Specific UX

### Owner / Admin

Primary needs:

- whole-company active workload;
- overdue and due-soon pressure;
- review bottlenecks;
- unassigned work;
- assignment load by appraiser/reviewer;
- final approval / ready-for-client handoffs.

Recommended dashboard emphasis:

- Workload Snapshot;
- Orders Needing Action;
- Overdue / Due Soon;
- Review Bottlenecks;
- Team Capacity / Assignment Load;
- Quick Links to Orders, New Order, Calendar, Team Access, and Owner Setup when permitted.

### Reviewer

Primary needs:

- in-review queue;
- returned/revision context;
- ready-for-client and review-cleared handoffs if permitted;
- clear next action per order.

Recommended dashboard emphasis:

- Review Bottlenecks;
- My Assignments as review work;
- Orders Needing Action filtered to reviewer-owned signals;
- Smart Actions in the table/drawer.

Avoid:

- whole-company appraiser capacity unless reviewer also has admin-like authority.

### Appraiser

Primary needs:

- assigned work;
- due soon;
- overdue;
- needs revisions;
- submit-to-review / resubmit actions.

Recommended dashboard emphasis:

- My Assignments;
- Overdue / Due Soon;
- Orders Needing Action filtered to appraiser-owned signals;
- Smart Actions for Send to Review / Resubmit to Review.

Avoid:

- review queue internals or admin workload metrics unless the user has those permissions.

## Safe Data Sources Already Available

Use these before adding backend work:

- `v_orders_active_frontend_v4` through `fetchOrdersWithFilters(..., scope: "dashboard")`;
- `v_orders_frontend_v4` for broader order list/detail contexts;
- `useDashboardSummary(...)`;
- `useDashboardKpis(...)`;
- `useOrdersSummary(...)`;
- `UnifiedOrdersTable` dashboard scope;
- deterministic queue evaluator and summaries over already loaded dashboard rows;
- existing order status constants and labels;
- existing smart action helpers and canonical workflow services;
- current permission hooks such as `useCan(...)`, `useEffectivePermissions(...)`;
- current app-user context through `useCurrentUserAppContext()`.

These data sources must remain scoped by existing views, RLS, route guards, and permission
patterns. Dashboard polish should not bypass those boundaries.

## Risky Or Deferred Data Sources

Defer or inspect more deeply before using:

- direct reads from `orders`;
- direct reads from activity tables;
- new analytics RPCs;
- cross-company aggregates;
- global team workload statistics;
- SLA policy tables or generated SLA scoring;
- calendar availability/capacity scoring;
- hidden product-mode/module metadata as runtime authority;
- assignment packet data mixed into owned-order dashboard lanes;
- AMC/vendor/client dashboards that require mode-specific safe projections;
- any metric that cannot be explained from visible, authorized rows.

## Recommended Implementation Sequence

### 10K2 - Dashboard Copy / Layout Shell Using Existing Data

Scope:

- frontend-only dashboard layout/copy polish;
- use existing dashboard data only;
- no migrations;
- no new analytics RPCs;
- no RLS/RPC changes;
- preserve `DashboardGate` behavior;
- preserve route guards and role/permission lenses;
- preserve `UnifiedOrdersTable` and smart action mutation paths.

Recommended 10K2 implementation:

1. Reframe the first dashboard section around operational triage.
2. Add or polish a compact Workload Snapshot using existing `summary.orders` values.
3. Improve Orders Needing Action / Operational Attention copy and selected-queue explanation.
4. Add at most one role-aware high-value widget if it can be derived from already loaded rows:
   - Owner/Admin: due pressure or review bottleneck counts.
   - Reviewer: in-review queue summary.
   - Appraiser: due soon / needs revisions summary.
5. Keep the calendar present but supporting, not dominant.
6. Keep mutations inside existing table/drawer smart actions.
7. Add focused dashboard tests for rendered sections, role copy, and no fake metrics.

### 10K3 - Focused Browser Smoke

After 10K2, run browser smoke for:

- owner/admin dashboard;
- reviewer dashboard;
- appraiser dashboard;
- queue selection;
- order open from dashboard;
- smart action availability remains unchanged;
- no cross-company or permission leakage.

### Later - Analytics / Capacity Model Design

Only after the dashboard shell proves useful:

- design safe team capacity metrics;
- design review-cycle analytics;
- design recent activity feed if needed;
- design SLA/delivery risk model;
- design AMC-native dashboard lanes when queue contracts are ready.

## No-Go Rules

- No new RLS changes in 10K2.
- No new RPC changes in 10K2.
- No cross-company leakage.
- No fake metrics or placeholder numbers.
- No expensive queries without inspection.
- No direct table reads that bypass established views/RPCs.
- No role-authority changes.
- No product-mode or module authority.
- No dashboard-level mutation controls outside existing smart-action/canonical RPC paths.
- No assignment packet data blended into owned-order dashboard lanes without explicit lane design.
- No Vendor or Client dashboard leakage of internal order/review/staff workload.

## 10K1 Decision

Phase 10K1 is complete as strategy-only. Recommended next phase is 10K2: implement dashboard
copy/layout polish using existing dashboard data only, preserving current backend, permissions,
route guards, dashboard resolution, order read projections, and smart-action mutation paths.

## 10K2 Implementation Update

Phase 10K2 implemented the operational dashboard layout shell in
`src/features/dashboard/DashboardPage.jsx`.

Implemented:

- Polished the header with a visible active-work count from existing `summary.orders.count`.
- Added a `Workload Snapshot` section.
- Reused the existing `summaryCards` data structure and `SummaryCard` component.
- Rendered existing summary values only:
  - total active orders;
  - inspected / awaiting report;
  - due to client in 2 days;
  - role-scoped order count;
  - in progress;
  - due in 7 days.
- Added `Orders Needing Action` copy around deterministic queue filtering.
- Added two triage widgets derived only from already loaded `ordersRows` and existing queue
  summaries:
  - `Due Soon / Overdue`;
  - `Review Bottlenecks`.
- Kept `OperationalQueuesPanel`, `DashboardCalendarPanel`, and `UnifiedOrdersTable` on their
  existing data sources.
- Renamed worklist section copy by role:
  - Owner/Admin: `Active Worklist`;
  - Reviewer: `My Review Work`;
  - Appraiser: `My Assignments`.

Data sources used:

- `useDashboardSummary(...)`;
- existing `summary.orders` values;
- existing `ordersRows`;
- `summarizeOperationalQueues(...)`;
- `getTopOperationalQueues(...)`;
- `getQueueSummaryById(...)`;
- existing queue IDs and deterministic queue evaluator;
- existing `UnifiedOrdersTable` dashboard scope.

10K2 did not add migrations, backend behavior, routes, registries, permissions, RLS/RPCs,
analytics RPCs, direct table reads, product-mode/module authority, fake metrics, or new
dashboard mutation paths. Smart actions remain inside the existing table/drawer canonical
workflow paths.

Tests were added in `src/features/dashboard/__tests__/DashboardPage.test.jsx` for rendered
polished sections, existing-data widget counts, queue filtering, role-specific worklist copy,
and preservation of dashboard table props. Existing `DashboardGate` tests continue to cover
dashboard resolution behavior.

## 10K3 Implementation Update

Phase 10K3 improved dashboard worklist interaction without changing dashboard data access.

Implemented:

- Added a `Priority Worklist Preview` below the operational queue controls.
- When a queue filter is selected, the preview becomes a focused queue worklist such as
  `Overdue Worklist`.
- Preview cards render only fields already present on loaded dashboard rows:
  - order number;
  - formatted workflow status;
  - property/address label when available;
  - client-facing due date when available;
  - appraiser or reviewer label/name when available.
- Added `View order` links to the existing `/orders/:id` detail route.
- Improved empty states for:
  - no due soon / overdue rows;
  - no review bottleneck rows;
  - no operational queue alerts;
  - no orders needing action in the loaded dashboard rows.
- Kept `UnifiedOrdersTable` as the complete worklist and smart-action surface.

Data sources used:

- existing `ordersRows` from `useDashboardSummary(...)`;
- existing deterministic queue membership through `orderHasQueue(...)`;
- existing queue summaries and selected queue state;
- existing order detail route links.

10K3 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, fake metrics, smart-action changes, product-mode/module authority, or
dashboard mutation behavior.

Tests were extended in `src/features/dashboard/__tests__/DashboardPage.test.jsx` for preview
row rendering, `View order` links, selected-queue preview copy, empty states, and the existing
role-aware worklist labels.

## 10K4 Implementation Update

Phase 10K4 rebalanced the dashboard around Calendar plus Orders as the primary operating
surfaces.

Implemented:

- Moved `Calendar Context` directly below the header/setup prompt as the first primary visual
  work area.
- Kept the existing Orders table directly after Calendar as the main worklist surface.
- Moved `Workload Snapshot` and `Orders Needing Action` into a compact support panel beside
  the Orders table on wide screens and below it on narrow screens.
- Reduced the triage widgets into smaller supporting indicators.
- Kept the existing operational queue filters, but made them supporting context rather than the
  dominant page flow.
- Removed the `Priority Worklist Preview` mini-worklist because it could imply stronger
  prioritization than the deterministic queue signals actually support.

Preserved:

- `DashboardCalendarPanel` data and open-order behavior;
- `UnifiedOrdersTable` behavior, smart actions, queue filtering, and date refresh callback;
- existing dashboard hooks and loaded row projections;
- existing route and permission behavior.

10K4 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, pinning, fake prioritization, fake metrics, smart-action changes, or
dashboard mutation behavior.

Tests were updated to assert Calendar renders before the Orders table and compact support
indicators, the priority preview is removed, compact widgets still render from existing data,
queue filtering still narrows the existing table rows, and role-aware worklist labels remain.

## 10K5 Implementation Update

Phase 10K5 simplified dashboard copy and refined the supporting rail so Calendar and Orders
remain the primary surfaces.

Implemented:

- Renamed `Calendar Context` to `Schedule`.
- Replaced `Visible Active Work` with `Active Orders`.
- Removed negative/technical `pressure` language from dashboard runtime copy.
- Reduced explanatory subtitles around the schedule and support widgets.
- Removed the `Workload Snapshot` card stack from the rail because it competed with the
  Calendar plus Orders flow.
- Kept only compact operational attention cards and queue filters in the support rail.
- Made the support rail sticky on wide screens with `lg:sticky lg:top-24 lg:self-start`.

Preserved:

- Calendar remains first.
- The Orders table remains the main worklist immediately after Calendar.
- Support cards still derive from existing loaded dashboard rows and queue summaries.
- Queue filters still narrow the existing table rows.
- Smart actions remain in the existing table/drawer workflow.

10K5 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, pinning, fake prioritization, fake metrics, smart-action changes, or
dashboard mutation behavior.

Tests were updated to assert the simplified `Schedule` label, absence of `pressure` in rendered
dashboard copy, removal of `Workload Snapshot`, continued compact support cards, table-first
ordering before the support rail, and unchanged queue filtering.

## 10K6 Implementation Update

Phase 10K6 replaced the subjective support widgets with a simple status timeline rail.

Implemented:

- Removed the `Review Bottlenecks` widget from the dashboard rail.
- Removed the due-soon/overdue attention widget from the dashboard rail.
- Replaced the rail with canonical order status filters:
  - `New`;
  - `In Progress`;
  - `In Review`;
  - `Needs Revisions`;
  - `Ready for Client`.
- Counts are derived from already loaded dashboard `ordersRows`.
- Selecting a status filters the existing Orders table rows.
- `Clear Filter` restores the full loaded-row table.
- The rail remains compact and sticky on wide screens.

Preserved:

- Calendar remains first.
- Orders remains the primary worklist.
- The rail uses existing order statuses from `src/lib/constants/orderStatus.js`.
- Smart actions remain in the existing table/drawer workflow.
- No priority preview was reintroduced.

10K6 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, pinning, fake prioritization, fake metrics, smart-action changes, or
dashboard mutation behavior.

Tests were updated to assert simple status labels, status counts from loaded rows, removal of
`Review Bottlenecks`, absence of `pressure` wording, status filtering of the Orders table, and
`Clear Filter` restoration.

## 10K7 Implementation Update

Phase 10K7 replaced the vertical status timeline with a compact colored status grid.

Implemented:

- Converted the right rail from a vertical list/timeline into a two-column grid of compact
  status cards.
- Kept the same canonical status filters:
  - `New`;
  - `In Progress`;
  - `In Review`;
  - `Needs Revisions`;
  - `Ready for Client`.
- Used colors aligned with the existing order status badge tones:
  - blue for `New`;
  - amber for `In Progress`;
  - indigo for `In Review`;
  - rose for `Needs Revisions`;
  - emerald for `Ready for Client`.
- Each card shows the status label and count only.
- Selected cards use a stronger same-family color plus ring and `aria-pressed`.
- `Clear Filter` remains compact below the grid.
- Reduced the rail column from `22rem` to `17rem` on wide screens to give the Orders table
  more horizontal room.

Preserved:

- Calendar remains first.
- Orders remains the primary worklist.
- Status counts still derive from already loaded dashboard `ordersRows`.
- Status selection still filters the existing Orders table.
- The rail remains sticky on wide screens.

10K7 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, pinning, fake prioritization, fake metrics, smart-action changes, or
dashboard mutation behavior.

Tests were updated to assert status grid labels/counts, status-color classes, selected state,
clear-filter restoration, removal of older operational-attention wording, and preserved table
filter behavior.

## 10K8 Implementation Update

Phase 10K8 converted the compact status grid into a narrower sticky single-column rail and added
subtle CSS-only selected-state motion.

Implemented:

- Replaced the two-column status grid with a single-column status rail.
- Reduced the wide-screen rail column from `17rem` to `13rem` so the Orders table has more room.
- Kept the same canonical status filters:
  - `New`;
  - `In Progress`;
  - `In Review`;
  - `Needs Revisions`;
  - `Ready for Client`.
- Kept status colors aligned with existing order status badge tones.
- Each card shows the status label and count only.
- Selected cards use same-family color, ring, a light shadow, and a small horizontal shift.
- Motion is CSS/Tailwind-only with `motion-reduce` handling.
- `Clear Filter` remains compact under the rail.

Preserved:

- Calendar remains first.
- Orders remains the primary worklist.
- Status counts still derive from already loaded dashboard `ordersRows`.
- Status selection still filters the existing Orders table.
- Sticky rail behavior remains on wide screens.

10K8 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, pinning, fake prioritization, fake metrics, smart-action changes, or
dashboard mutation behavior.

Tests were updated to assert the single-column status filter group, removal of the old two-column
expectation, selected-state motion class, status filtering, and clear-filter restoration.

## 10K9 Implementation Update

Phase 10K9 cleaned up the dashboard calendar section copy so it reads as the primary Calendar
surface.

Implemented:

- Renamed the dashboard calendar section label from `Schedule` to `Calendar`.
- Removed the dashboard calendar subtitle/tagline.
- Confirmed `Schedule pressure` is not rendered by the dashboard page.

Preserved:

- `DashboardCalendarPanel` controls, labels, legend, date range, events, and open-order behavior.
- Calendar remains first.
- Orders remains the primary worklist after Calendar.
- The status rail and table filtering behavior remain unchanged.

10K9 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, data sources, smart-action changes, or dashboard mutation behavior.

Tests were updated to assert `Calendar` renders and the removed calendar copy does not render.

## 10K10 Implementation Update

Phase 10K10 polished the dashboard header into a cleaner command-center surface while preserving
dashboard authority and data sources.

Implemented:

- Replaced role-specific page titles with a stable `Operations Dashboard` title.
- Added calmer role-aware subtitle copy:
  - owner/admin: current-company calendar, active orders, and workflow handoffs;
  - reviewer: calendar context and assigned review work;
  - appraiser/default: calendar context, assigned orders, and revision follow-up.
- Added compact header context chips for:
  - current company name from existing app context;
  - current work view / role lens from existing dashboard summary state;
  - active order count from existing `summary.orders.count`.
- Tightened header spacing, alignment, and responsive stacking.
- Refined the Owner Setup prompt into a compact `Setup Guidance` strip below the operational
  header so setup/readiness stays separate from operational work.
- Kept Calendar immediately after the setup prompt as the primary operational context.
- Kept Orders immediately after Calendar as the primary work surface.
- Kept the deterministic single-column Status rail beside the Orders table on wide screens and
  stacked naturally on smaller screens.
- Moved KPI cards, workload visibility, and operational readiness into a clearly labeled
  `Operational Support` section below the primary Calendar plus Orders flow.
- Tightened the desktop rail from `13rem` to `12rem` and adjusted sticky offset from `top-24` to
  `top-20` so it reads as a supporting control rather than a competing panel.

Preserved:

- Calendar remains the primary operational context.
- Orders table remains the primary work surface.
- Status rail remains deterministic and simple.
- Status counts still derive from already loaded dashboard `ordersRows`.
- Header active count still derives from existing `summary.orders.count`.
- Company and role context derive from existing dashboard/app context only.
- Owner Setup prompt remains permission-gated by existing `settings.view`.
- Operational readiness remains read-only and diagnostic.
- Smart actions remain in the existing table/drawer workflow.

10K10 did not add backend calls, migrations, routes, registries, permissions, RLS/RPCs,
analytics queries, new dashboard data sources, fake KPIs, predictive scoring, product-mode/module
authority, dashboard authority changes, or dashboard mutation behavior.

Tests were updated in `src/features/dashboard/__tests__/DashboardPage.test.jsx` and
`src/features/dashboard/__tests__/OwnerSetupDashboardPrompt.test.jsx` to assert the unified
header, company/work-view context, primary Calendar/Orders/Status ordering, secondary support
section, compact setup guidance copy, and preserved table/status filtering behavior.

## 10K11 Closeout / Dashboard Polish Foundation Lock

Phase 10K11 closes out the current Operational Dashboard polish foundation as complete for this
track. The completed dashboard is an operational command-center surface, not an analytics product,
forecasting engine, or product-mode dashboard framework.

Locked completed foundation:

- Unified `Operations Dashboard` header.
- Compact current company, work-view, and active-order context derived from existing dashboard/app
  context.
- Setup/readiness guidance separated from operational work as a read-only `Setup Guidance` prompt.
- Calendar remains first as the primary operational context.
- Orders remains the primary work surface.
- Deterministic Status rail remains simple, based on existing loaded dashboard rows and canonical
  order statuses.
- KPI cards, workload visibility, and read-only operational readiness live in secondary
  `Operational Support`.
- Dashboard copy avoids fake urgency, fake analytics, predictive scoring, and unsupported pressure
  language.

Locked guardrails:

- No backend changes.
- No new queries.
- No analytics redesign.
- No dashboard authority changes.
- No product-mode authority.
- No hidden mutation behavior.
- No cross-company aggregates.
- No fake KPIs.
- No predictive scoring.
- No dashboard-level mutation controls outside existing table/drawer smart-action paths.
- No assignment packet data blended into owned-order dashboard lanes.
- No Vendor or Client dashboard leakage of internal order/review/staff workload.
- Existing `DashboardGate`, route guards, permissions, order projections, `UnifiedOrdersTable`,
  `DashboardCalendarPanel`, and smart-action/canonical workflow paths remain authoritative.

Deferred dashboard work:

- Richer owner analytics/reporting page.
- True server-side analytics if active-row frontend aggregation becomes insufficient.
- Configurable dashboard widgets.
- Dashboard personalization.
- Mode-specific dashboards later for Staff, AMC, Vendor, Client, and Hybrid experiences.
- Calendar scheduling intelligence later.
- Workload trends, aging buckets, staffing/forecasting, review-cycle analytics, and exports.
- Production/deployment verification remains separate from dashboard polish.

Recommended next direction:

- Pause the Operational Dashboard polish track at 10K11 unless production smoke or user feedback
  identifies a concrete layout issue.
- Treat richer analytics/reporting as a new design phase with backend/data contracts before
  implementation.
- Treat mode-specific dashboards as future product-mode runtime work, not an extension of the
  current Staff/default operational dashboard polish.
