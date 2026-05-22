# Dashboard Analytics Plan

## Purpose

Falcon should add operational dashboard metrics only after defining which metrics are active
operations, historical readback, admin-only visibility, or future analytics. Dashboard analytics
must remain read-only and must not become a hidden write path, lifecycle action surface, or
cross-company data leak.

This is a planning and governance document. It does not change runtime behavior, routes, dashboard
UI, backend APIs, RPCs, RLS, database schema, analytics pipelines, activity, notifications, order
lifecycle behavior, assignment behavior, or permissions.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`

## Governance Rules

- Dashboards remain read-only.
- Metrics must respect existing company scope, RLS, and frontend permission gates.
- Active operational metrics must use active order sources and must not silently include archived,
  cancelled, or voided records.
- Historical metrics require explicit historical readback sources or approved opt-in query helpers.
- Admin-only metrics must be clearly scoped to admin surfaces and must not appear in normal
  operational dashboards by accident.
- Metrics must not trigger, imply, or couple to direct mutations, lifecycle changes, workflow
  transitions, assignment changes, activity writes, notification fanout, or document actions.
- Metrics should be source-traceable: each card or value should have a known read source and a clear
  inclusion/exclusion rule.
- No hidden lifecycle state leakage into active metrics. Cancelled, voided, and archived records can
  appear only in deliberately labeled historical/admin metrics.
- Expensive aggregation, trend analytics, and cross-company reporting should wait for deliberate
  backend/API design rather than being improvised in frontend query loops.

## Candidate KPI Inventory

| KPI | Category | Initial Source Direction | Notes |
|---|---|---|---|
| Active order count | Active operational metric | Existing active order list/query summary paths | Count only active operational rows; exclude archived, cancelled, and voided rows by default. |
| Overdue orders | Active operational metric | Existing active order read paths with due-date fields | Count active rows whose due dates are past due; do not include retired lifecycle rows. |
| In-review backlog | Active operational metric | Existing active order status/read paths | Count active orders in review statuses only; useful for operations and reviewer planning. |
| Review turnaround | Future analytics metric | Future derived event/date model | Requires precise start/end semantics and likely backend aggregation before productizing. |
| Appraiser workload | Active operational metric | Existing active order participant/read paths | Count active assigned work by appraiser; should not include historical rows unless explicitly labeled. |
| Reviewer workload | Active operational metric | Existing active order participant/read paths | Count active assigned review work by reviewer; keep separate from review turnaround analytics. |
| Cancelled/voided historical counts | Historical metric | `listHistoricalOrders(...)` or future historical aggregate helper | Must be labeled historical and explicitly opt into retired lifecycle readback. |
| Lifecycle trends | Future analytics metric | Future analytics/reporting source | Requires event/time-series design; do not infer trends from ad hoc frontend snapshots. |
| Assignment load distribution | Admin-only metric / future analytics metric | Existing assignment/order read paths for MVP; future aggregate source for richer views | Operational versions can show active load; cross-company or historical distribution is deferred. |

## Category Definitions

### Active Operational Metrics

Active operational metrics are safe for normal dashboards when they use current active read paths
and exclude archived, cancelled, and voided orders by default. They answer what the team needs to
work now.

Initial candidates:

- active order count;
- overdue orders;
- in-review backlog;
- appraiser workload;
- reviewer workload.

### Historical Metrics

Historical metrics are explicitly about preserved-history records. They must use approved
historical readback helpers or future historical aggregate APIs and must be labeled so users do not
confuse them with active queue workload.

Initial candidates:

- cancelled/voided historical counts;
- archived historical counts if product asks for them;
- historical lifecycle summaries.

### Admin-Only Metrics

Admin-only metrics may expose operational management visibility that is broader than a normal user
needs. They should stay out of general dashboards until permission and audience are deliberate.

Initial candidates:

- assignment load distribution across users or companies;
- reviewer/appraiser capacity views;
- historical exception counts if they imply performance or governance review.

### Future Analytics Metrics

Future analytics metrics require stronger definitions, trend windows, aggregation, or reporting
infrastructure before implementation.

Deferred candidates:

- review turnaround;
- lifecycle trends;
- advanced assignment load distribution;
- historical reporting and exports.

## Recommended First Implementation

The first implementation should be lightweight operational KPI cards, not an analytics platform.

Recommended scope:

- active order count;
- overdue orders;
- in-review backlog;
- appraiser workload summary where existing participant fields are already available;
- reviewer workload summary where existing participant fields are already available.

Implementation direction:

- Reuse existing order query/read paths.
- Keep metrics read-only.
- Keep active metrics scoped to active operational rows.
- Avoid historical counts in the first dashboard slice unless the card is explicitly labeled and
  uses a governed historical readback source.
- Avoid expensive client-side polling or broad fanout queries.
- Avoid new backend analytics pipelines, materialized views, scheduled jobs, exports, or BI tooling
  in the first slice.

## Slice 1B KPI Card Foundation

Dashboard Analytics Slice 1B implements the first lightweight operational KPI row on the active
order dashboard. The row contains:

- `Active Orders`;
- `In Review`;
- `Needs Revisions`;
- `Overdue Orders`.

Source and scope:

- Values come through existing dashboard read paths: `DashboardPage` -> `useDashboardSummary(...)`
  -> `useDashboardKpis(...)` -> `fetchDashboardKpis(...)`.
- `fetchDashboardKpis(...)` reads `v_orders_active_frontend_v4`, preserving the existing active
  order source and company/RLS boundary.
- The cards are active operational metrics only. Archived, cancelled, and voided orders remain
  excluded by the active view and must not be backfilled into these cards through historical query
  helpers.
- The cards are display-only. They do not link, filter, mutate, trigger Smart Actions, change
  workflow state, change lifecycle state, emit activity, emit notifications, or call new RPCs.

The first card set intentionally does not include historical counts, charts, trend windows,
workload distribution, exports, scheduled reporting, or a dashboard-specific analytics contract.
Those remain deferred until separately designed.

## Slice 1C KPI State Drill Links

Dashboard Analytics Slice 1C makes supported KPI cards useful without adding analytics
infrastructure:

- `Active Orders` links to `/orders`, the existing default active Orders queue.
- `In Review` links to `/orders?status=in_review`, using the existing Orders page status query
  support.
- `Needs Revisions` links to `/orders?status=needs_revisions`, using the same existing status
  query support.
- `Overdue Orders` remains read-only for now. The Orders page has due-window UI state, but the
  current active table read path does not yet pass a supported overdue filter through to
  `fetchOrdersWithFilters(...)`; adding that behavior should be a separate order-list filter slice.

These drill links are active operational read links only. They do not add backend APIs, RPCs,
analytics tables, charts, historical readback links, lifecycle controls, workflow controls,
mutation actions, activity writes, notification fanout, or active-list default behavior changes.

## Slice 1D Overdue Filter Planning

Current inventory:

- `OrdersPage` already reads and writes a `due` query parameter as `filters.dueWindow`.
- `OrdersFilters` already exposes a `Due` selector with an `Overdue` option.
- `UnifiedOrdersTable` includes `dueWindow` in its local seed, but `useOrders(...)` does not pass
  `dueWindow` through to `fetchOrdersWithFilters(...)`.
- The active low-level order read helper currently supports `finalDueWithinDays`, which finds
  active orders due from now through a future day limit. It does not currently support overdue
  final due filtering.
- `fetchDashboardKpis(...)` already computes the dashboard `Overdue Orders` KPI from
  `v_orders_active_frontend_v4` using `final_due_date < now` and non-null `final_due_date`.

Operational definition:

- The authoritative first overdue date field should be `final_due_date`, matching the dashboard
  KPI and the active order read projection.
- Overdue means the final due date is before the current time/day boundary used by the active read
  helper. The first implementation can use `new Date().toISOString()` consistently with existing
  KPI and due-window code; if product later needs calendar-day semantics by company timezone, that
  should be a separate specification.
- Missing `final_due_date` values are not overdue.
- Archived, cancelled, and voided orders must remain excluded from active overdue filtering by
  default. Historical overdue analysis belongs to a separately labeled historical/admin metric.
- Completed orders should not be introduced into the active overdue dashboard path. If the active
  Orders list can currently show completed rows by default, the overdue drill-link implementation
  must explicitly keep the overdue active workload scope aligned with active operational records,
  not historical/completed reporting.

Recommended first implementation:

- Add a small query/read-path slice that wires the existing `due=overdue` URL/filter state through
  `UnifiedOrdersTable`, `useOrders(...)`, and `fetchOrdersWithFilters(...)`.
- Extend `fetchOrdersWithFilters(...)` with an explicit, read-only overdue filter that applies
  `final_due_date < now` and excludes null `final_due_date`.
- Keep the default Orders page behavior unchanged when no `due` query parameter is present.
- Keep archived/cancelled/voided exclusion in the existing default active read behavior.
- Add tests proving `?due=overdue` reaches the low-level read helper, filters on
  `final_due_date`, excludes null due dates, preserves default active-list behavior, and does not
  call mutation RPCs.

Deferred options:

- Frontend-only overdue filtering over already loaded rows is not recommended for the primary
  Orders page because it would be page-size dependent and could hide matching rows outside the
  current page.
- Backend/view support can wait unless the overdue query becomes expensive or needs richer
  semantics such as timezone-specific day boundaries, SLA windows, or historical analytics.

## Slice 1E Overdue Orders Filter Support

Dashboard Analytics Slice 1E implements the governed active Orders overdue filter without changing
dashboard KPI drill-link behavior yet.

Runtime support:

- The existing `?due=overdue` Orders page query state now reaches the active Orders table read path
  through `OrdersPage` -> `UnifiedOrdersTable` -> `useOrders(...)` -> `fetchOrdersWithFilters(...)`.
- `fetchOrdersWithFilters(...)` treats `dueWindow: "overdue"` as a read-only active-list filter:
  `final_due_date` must be non-null and before the current timestamp.
- Default active-list exclusion still applies: archived rows are excluded unless explicitly opted
  in by approved low-level readback helpers, and cancelled/voided rows are excluded unless an
  approved historical readback path opts in.
- Default Orders page behavior is unchanged when `due` is absent.

The dashboard `Overdue Orders` KPI card remains non-clickable in this slice. The filter is now
available and tested, but linking the KPI card to `/orders?due=overdue` should be a separate small
slice after this support is validated in context.

No backend analytics pipeline, new RPC, migration, materialized view, charting library, mutation
behavior, workflow/lifecycle behavior, activity write, notification fanout, historical count, or
retired-record drill path was added.

## Slice 1F Overdue KPI Drill Link

Dashboard Analytics Slice 1F completes the first KPI drill-link set now that the active Orders
overdue filter is supported:

- `Active Orders` links to `/orders`;
- `In Review` links to `/orders?status=in_review`;
- `Needs Revisions` links to `/orders?status=needs_revisions`;
- `Overdue Orders` links to `/orders?due=overdue`.

All four links target governed active Orders views. The overdue drill link uses the Slice 1E
read-path support, which filters active orders by non-null `final_due_date` before the current
timestamp while preserving default archived/cancelled/voided exclusions. No historical readback
helper, retired-record opt-in, lifecycle action, workflow action, mutation control, backend
analytics infrastructure, charting, activity write, or notification fanout is involved.

## Slice 1G KPI Foundation Closeout

Dashboard Analytics Slice 1G closes out the initial governed KPI foundation without runtime
changes. The completed foundation contains four compact active operational cards:

- `Active Orders`;
- `In Review`;
- `Needs Revisions`;
- `Overdue Orders`.

The cards remain active-order-only metrics. Values continue to flow through existing dashboard read
paths and active order projections, preserving company scope, RLS, and default archived,
cancelled, and voided exclusions. Retired lifecycle records and historical readback helpers must
not be introduced into these cards unless a future card is explicitly labeled historical/admin and
uses an approved historical source.

The governed drill links are locked as:

- `Active Orders` -> `/orders`;
- `In Review` -> `/orders?status=in_review`;
- `Needs Revisions` -> `/orders?status=needs_revisions`;
- `Overdue Orders` -> `/orders?due=overdue`.

The foundation is read-only. It adds no mutation controls, workflow controls, lifecycle controls,
activity writes, notification fanout, backend analytics pipeline, dashboard-specific RPC,
materialized view, scheduled reporting, charting library, historical metric, or cross-company
aggregate. Future KPI/dashboard work should build from this foundation only when the metric's
source, audience, active-versus-historical semantics, and drill behavior are explicit.

## Deferred Items

- Workload cards.
- Reviewer/appraiser queues.
- Trend charts.
- Historical metrics.
- Lifecycle analytics.
- Server-side analytics views if needed.
- Exports/reporting.
- Cross-company analytics.
- Advanced BI/reporting dashboards.
- Scheduled reporting.
- Historical counts/KPIs beyond clearly labeled simple readback.
- Lifecycle trend analysis.
- Review turnaround analytics.
- Assignment load distribution across companies or historical windows.
- Admin-only analytics permission tightening.

## Non-Goals For Slice 1A

- No runtime dashboard changes.
- No new KPI cards.
- No backend/API/RPC/RLS changes.
- No analytics backend redesign.
- No new database tables, views, materialized views, scheduled jobs, or Edge Functions.
- No mutation behavior changes.
- No lifecycle behavior changes.
- No activity or notification behavior changes.
- No cross-company analytics.

## Non-Goals For Slice 1B

- No backend analytics redesign.
- No new RPCs, migrations, database tables, materialized views, scheduled jobs, or Edge Functions.
- No charting library.
- No historical KPI cards.
- No dashboard mutation controls, lifecycle buttons, workflow actions, restore/reopen/unarchive
  behavior, activity writes, or notification fanout.
- No active-list behavior change.

## Non-Goals For Slice 1C

- No new filter implementation for overdue orders.
- No historical, archived, cancelled, or voided drill links from active KPI cards.
- No backend/API/RPC/RLS changes.
- No mutation controls, lifecycle/workflow behavior changes, charting, or reporting.

## Non-Goals For Slice 1D

- No runtime overdue filter wiring yet.
- No dashboard Overdue KPI drill link yet.
- No backend analytics redesign, new RPC, migration, materialized view, scheduled job, or charting.
- No mutation behavior, workflow behavior, lifecycle behavior, activity writes, notification
  fanout, or historical leakage into active metrics.

## Non-Goals For Slice 1E

- No dashboard Overdue KPI drill link yet.
- No new backend analytics infrastructure.
- No historical or retired lifecycle filtering from active KPI cards.
- No mutation behavior, workflow/lifecycle behavior, charting, exports, or scheduled reporting.

## Non-Goals For Slice 1F

- No new KPI types or historical KPI cards.
- No backend analytics redesign, new RPC, migration, materialized view, scheduled job, charting, or
  reporting.
- No mutation behavior, workflow behavior, lifecycle behavior, activity write, notification fanout,
  or historical leakage into active metrics.

## Non-Goals For Slice 1G

- No runtime changes.
- No new KPI cards, filters, routes, read helpers, backend APIs, RPCs, migrations, materialized
  views, scheduled jobs, charting, exports, or reporting.
- No mutation behavior, workflow behavior, lifecycle behavior, activity write, notification fanout,
  historical leakage into active metrics, or cross-company analytics.
