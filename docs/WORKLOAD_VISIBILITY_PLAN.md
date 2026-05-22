# Workload Visibility Plan

## Purpose

Falcon should add workload visibility only after defining which workload signals are live
operational support, historical reporting, admin-only management visibility, or future analytics.
The goal is to help teams see capacity, bottlenecks, and assignment distribution without creating a
hidden scoring system, mutation surface, lifecycle shortcut, or cross-company data leak.

This is a planning and governance document. It does not change runtime behavior, routes,
dashboard UI, backend APIs, RPCs, RLS, database schema, analytics pipelines, workflow behavior,
lifecycle behavior, assignment behavior, activity, notifications, or permissions.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/DASHBOARD_ANALYTICS_PLAN.md`
- `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`

## Workload Visibility Goals

- Appraiser workload awareness: show current active assignment pressure without implying quality,
  productivity, or compensation scoring.
- Reviewer workload awareness: show current review queue concentration and review-stage ownership.
- Operational bottleneck visibility: surface where active work is collecting so dispatch,
  review, and follow-up are easier to coordinate.
- Overdue concentration visibility: identify where active overdue work is concentrated by current
  assignee or ownership lane.
- Assignment distribution visibility: help managers spot obvious imbalance in current active work
  before it becomes an SLA or customer communication risk.

## Governance Rules

- Workload visibility is read-only.
- Company scope, RLS, and existing order read permissions remain authoritative.
- Active workload metrics must use active operational order sources and must not silently include
  archived, cancelled, or voided records.
- Historical workload/productivity metrics require explicit historical/admin sources, labels, and
  audience decisions.
- Workload cards must not create employee scoring, punitive ranking, compensation, or performance
  review semantics.
- Avoid broad leaderboards. Prefer operational labels such as `Assigned work`, `Review queue`, and
  `Overdue work` over ranking language such as `top`, `worst`, `best`, or `slowest`.
- Metrics must not trigger or imply direct mutations, workflow transitions, assignment changes,
  lifecycle actions, activity writes, notifications, or document actions.
- Reuse existing governed order read paths where possible before adding new backend/view support.
- Avoid expensive analytics pipelines, scheduled jobs, materialized views, or charting in the
  initial workload slice.

## Candidate Workload Metrics

| Metric | Category | Initial Source Direction | Notes |
|---|---|---|---|
| Active assignments per appraiser | Operational/live metric | Existing active order read paths with appraiser fields | Count current active orders assigned to each appraiser; exclude retired lifecycle rows. |
| In-review counts per reviewer | Operational/live metric | Existing active order status and reviewer fields | Count active `in_review` work by reviewer where reviewer data is already available. |
| Overdue counts by assignee | Operational/live metric / admin-only metric | Existing active order due-date and assignee fields | Useful for coordination; must avoid punitive framing and exclude missing due dates. |
| Needs-revisions ownership | Operational/live metric | Existing active order status and appraiser/reviewer fields | Shows where revision follow-up is needed without creating blame semantics. |
| Aging workload buckets | Future analytics metric | Future date-window definition or backend support | Needs clear age anchor, timezone/day-boundary semantics, and likely server-side support later. |
| Unassigned orders | Operational/live metric | Existing active order participant fields | Safe as an operational dispatch signal when derived from active orders only. |
| Workload distribution imbalance | Admin-only metric / future analytics metric | Existing active order counts for MVP; future aggregate source if richer | Should be framed as staffing/dispatch support, not employee ranking. |

## Category Definitions

### Operational / Live Metrics

Operational/live workload metrics are safe for normal operational dashboards when they use active
order sources, respect current read scope, and avoid historical or punitive meaning. They answer
what the team needs to coordinate now.

Initial candidates:

- active assignments per appraiser;
- in-review counts per reviewer;
- overdue counts by assignee;
- needs-revisions ownership;
- unassigned orders.

### Historical Metrics

Historical workload metrics are explicitly about preserved-history or completed work. They require
separate labeling, approved historical readback sources, and product decisions about audience and
interpretation.

Initial candidates:

- historical productivity summaries;
- completed workload by period;
- retired lifecycle workload counts;
- historical overdue concentration.

### Admin-Only Metrics

Admin-only workload metrics may expose broader management visibility than normal team members need.
They should stay out of general dashboards until the audience, permission model, and language are
deliberate.

Initial candidates:

- workload distribution imbalance;
- staffing/capacity views;
- overdue concentration by user or role;
- exception views that imply management intervention.

### Future Analytics Metrics

Future workload analytics need stronger definitions, trend windows, aggregation, or reporting
infrastructure before implementation.

Deferred candidates:

- aging workload buckets;
- trend analytics;
- SLA calculations;
- forecasting;
- staffing recommendations;
- cross-company benchmarking.

## Recommended First Implementation

The first implementation should be lightweight workload visibility, not workforce analytics.

Recommended scope:

- compact dashboard section below or near the existing governed KPI foundation;
- current active assignments only;
- small workload cards or a compact table for appraiser and reviewer queues;
- unassigned active orders as an operational dispatch signal;
- overdue concentration only when it can be derived from active orders and framed as coordination
  support;
- no charts in the first slice.

Implementation direction:

- Reuse existing active order/dashboard read paths where possible.
- Keep metrics read-only and source-traceable.
- Keep active workload metrics scoped to active operational rows.
- Exclude archived, cancelled, and voided orders by default.
- Avoid historical metrics until a historical/admin workload surface is separately designed.
- Avoid employee ranking language and sort orders that imply punitive scoring unless product
  explicitly designs a management-only surface.
- Avoid new backend analytics pipelines, materialized views, scheduled jobs, exports, or reporting
  infrastructure in the first workload slice.

## Slice 1B Workload Foundation Read Path Audit

Current governed read inventory:

- `v_orders_active_frontend_v4` is the safest first workload source for dashboard workload
  visibility. It already backs `fetchDashboardKpis(...)`, `useDashboardKpis(...)`, dashboard
  summary rows through `useOrdersSummary(..., { scope: "dashboard" })`, and dashboard active order
  views.
- `fetchDashboardKpis(...)` uses read-only count queries against `v_orders_active_frontend_v4` and
  already scopes by `appraiser_id`, `reviewer_id`, `client_id`, and `status` where relevant. It is
  useful proof that lightweight active operational counts can be read safely, but it should not be
  expanded into a broad workload analytics contract until the workload UI is designed.
- `fetchOrdersWithFilters(...)` selects active order fields needed for first workload visibility:
  `status`, `is_archived`, `final_due_date`, `appraiser_id`, `appraiser_name`, `reviewer_id`, and
  `reviewer_name`. Its default behavior excludes archived rows and cancelled/voided rows unless a
  low-level historical opt-in is explicitly used.
- `useDashboardSummary(...)` already loads up to 1000 dashboard-scoped active order rows through
  `useOrdersSummary(...)`. These rows are the safest frontend aggregation source for a compact
  dashboard workload section if the first implementation stays small and page-size assumptions are
  made explicit.
- Operational queue helpers already derive active-row signals such as overdue, waiting on
  appraiser, waiting on reviewer, and unassigned orders from loaded order rows. These helpers are
  useful for consistency, but workload visibility should avoid reusing urgency ordering as employee
  ranking.
- Assignment packet reads in `src/features/assignments/api.js` are governed RPC paths for
  cross-company assignment packet dashboards. They are assignment-native and should remain separate
  from canonical order workload metrics unless a future design explicitly combines the two
  surfaces.

First-pass workload metric fit:

| Metric | Current Fit | Recommended Initial Handling | Notes |
|---|---|---|---|
| Active assignments per appraiser | Derivable now from existing active order reads | Lightweight frontend aggregation over dashboard active rows | Group by `appraiser_id`/`appraiser_name`; exclude rows without an appraiser and retired lifecycle rows. |
| In-review counts per reviewer | Derivable now from existing active order reads | Lightweight frontend aggregation over dashboard active rows | Filter `status = "in_review"` and group by `reviewer_id`/`reviewer_name`; unassigned review rows should be counted separately. |
| Unassigned order count | Derivable now from existing active order reads | Lightweight frontend aggregation over dashboard active rows | Count active rows missing `appraiser_id`, plus active `in_review` rows missing `reviewer_id` if the UI labels this as review assignment needed. |
| Overdue by assignee | Possible from existing active order reads, but wording-sensitive | Defer or keep as a small operational concentration count | Can combine non-null `final_due_date < now` with appraiser/reviewer ownership, but should avoid ranking language and should not include missing due dates. |
| Needs-revisions ownership | Derivable now from existing active order reads | Candidate after initial cards/table | Filter `status = "needs_revisions"` and group by current appraiser; safe if framed as follow-up coordination. |
| Aging workload buckets | Requires future backend/view support for durable semantics | Deferred | Needs a defined age anchor, day boundary, timezone semantics, and likely server-side support. |
| Workload distribution imbalance | Requires careful admin-only/product semantics | Deferred | Could be computed from active counts, but imbalance language can imply scoring; design an admin-only surface first. |

Implementation recommendation after the audit:

- Start with a compact dashboard workload section using the already loaded active dashboard order
  rows, not a new backend analytics pipeline.
- Prefer small cards or a compact table for current active appraiser assignments, current review
  queue counts, and unassigned active orders.
- Keep all labels operational and neutral: `Assigned work`, `Review queue`, `Unassigned active
  orders`, and `Overdue work concentration` if overdue is included.
- Keep overdue-by-assignee out of the first runtime slice unless the UI can present it as
  coordination context rather than ranking.
- Do not include historical, completed, archived, cancelled, or voided orders in initial workload
  metrics.
- Do not use assignment packet RPC dashboards as a substitute for canonical order workload metrics;
  keep assignment-native workload visibility separate unless a future slice defines a combined
  view.
- If the dashboard row limit or client-side grouping becomes insufficient, design server-side
  workload views or RPCs later under a separate analytics/read-model slice.

## Slice 1C Lightweight Workload Cards

Workload Visibility Slice 1C adds the first compact dashboard workload visibility section using
existing active dashboard order rows only.

Runtime scope:

- The section is rendered on `DashboardPage` after the governed KPI cards.
- Values are derived from `ordersRows` already loaded by `useDashboardSummary(...)` through the
  existing dashboard-scoped active order read path.
- No new backend API, RPC, database view, migration, materialized view, scheduled job, analytics
  pipeline, or charting library is added.
- The derivation explicitly ignores archived, completed, cancelled, and voided rows even though
  active dashboard reads should already exclude retired lifecycle rows by default.

Initial workload cards:

- `Assigned Work`: active appraiser-owned orders grouped by current appraiser for `new`,
  `in_progress`, and `needs_revisions` work.
- `Review Queue`: active `in_review` orders grouped by current reviewer.
- `Unassigned Active`: active appraiser-work rows missing an appraiser plus active review rows
  missing a reviewer.
- `Revision Follow-Up`: active `needs_revisions` orders grouped by current appraiser.

UX doctrine:

- Labels are neutral operational coordination labels, not performance labels.
- The section has no mutation controls, workflow controls, lifecycle controls, assignment controls,
  charting, score language, leaderboard language, or punitive ranking semantics.
- Sorting within compact lists is for scanability only and must not be described as best/worst,
  top/bottom, productivity, or performance.
- The section remains operational awareness. Historical productivity, SLA, forecasting, staffing,
  benchmark, and lifecycle analytics remain deferred.

## Deferred Items

- Reviewer-specific Orders filter support before reviewer-row drill links.
- Overdue-by-assignee workload visibility.
- Workload aging buckets.
- Charts/trends.
- Trend analytics.
- Historical productivity metrics.
- SLA calculations.
- Forecasting.
- Staffing recommendations.
- Cross-company benchmarking.
- Server-side analytics views if active workload queries become too expensive.
- Exports/reporting.
- Permission tightening for admin-only workload surfaces.

## Non-Goals For Slice 1A

- No runtime changes.
- No dashboard UI changes.
- No new workload cards, tables, charts, routes, read helpers, backend APIs, RPCs, migrations,
  materialized views, scheduled jobs, exports, or reports.
- No workflow, lifecycle, assignment, activity, notification, document, or permission behavior
  changes.
- No employee scoring, punitive ranking, historical leakage, cross-company benchmarking, or
  analytics backend redesign.

## Non-Goals For Slice 1B

- No runtime changes.
- No dashboard UI changes.
- No new workload cards, tables, charts, routes, read helpers, backend APIs, RPCs, migrations,
  materialized views, scheduled jobs, exports, or reports.
- No workflow, lifecycle, assignment, activity, notification, document, or permission behavior
  changes.
- No employee scoring, punitive ranking, historical leakage, cross-company benchmarking, or
  analytics backend redesign.

## Non-Goals For Slice 1C

- No backend analytics redesign, new RPC, new view, migration, materialized view, scheduled job,
  export, report, or charting library.
- No historical metrics, completed-order workload metrics, archived/cancelled/voided leakage,
  cross-company benchmarking, employee scoring, punitive ranking, or performance review semantics.
- No mutation behavior, workflow behavior, lifecycle behavior, assignment mutation behavior,
  activity write, notification fanout, document behavior, permission change, or route change.

## Slice 1D Workload Section Drill Links

Workload Visibility Slice 1D adds drill links only where the existing Orders page already supports
the route/filter end to end.

Supported links:

- `Review Queue` links to `/orders?status=in_review`.
- `Unassigned Active` links to `/orders?queue=unassigned_orders`, using the existing Orders
  operational queue query support.
- `Revision Follow-Up` links to `/orders?status=needs_revisions`.
- Assigned appraiser rows link to `/orders?appraiserId=<appraiser-id>`, using the existing
  appraiser filter.
- Revision follow-up appraiser rows link to
  `/orders?status=needs_revisions&appraiserId=<appraiser-id>`.

Intentionally read-only for now:

- Reviewer-specific rows remain non-clickable because the Orders page does not currently support a
  general `reviewerId` URL filter.
- Any future overdue-by-assignee or workload-imbalance item remains non-clickable until a complete
  governed route/filter exists.

No new query parameter, backend API, RPC, database view, analytics pipeline, charting, mutation
behavior, workflow/lifecycle behavior, assignment mutation behavior, historical metric, scoring
semantics, or ranking semantics is added by these links.

## Non-Goals For Slice 1D

- No new Orders filters or incomplete query parameters.
- No reviewer-specific drill link until reviewer filtering is supported end to end.
- No backend analytics redesign, new RPC, new view, migration, materialized view, charting, export,
  or reporting.
- No historical metrics, employee scoring, punitive ranking, cross-company benchmarking, mutation
  behavior, workflow behavior, lifecycle behavior, assignment mutation behavior, activity write,
  notification fanout, document behavior, permission change, or route change.

## Slice 1E Workload Visibility Closeout

Workload Visibility Slices 1A through 1E complete and lock the initial governed workload
visibility dashboard foundation.

Completed foundation:

- A read-only workload visibility section renders on `DashboardPage`.
- Metrics are derived from existing active dashboard `ordersRows` only.
- Active operational rows are the only intended source; archived, completed, cancelled, and voided
  rows are excluded from the workload derivation.
- `Assigned Work` provides appraiser workload awareness for active appraiser-owned work.
- `Review Queue` provides review queue visibility for active `in_review` rows.
- `Unassigned Active` provides dispatch visibility for active rows missing an appraiser or active
  review rows missing a reviewer.
- `Revision Follow-Up` provides needs-revisions ownership visibility for active follow-up work.
- Safe drill links are present only where existing Orders filters support them:
  `/orders?status=in_review`, `/orders?queue=unassigned_orders`,
  `/orders?status=needs_revisions`, `/orders?appraiserId=<appraiser-id>`, and
  `/orders?status=needs_revisions&appraiserId=<appraiser-id>`.
- Reviewer-specific drill links remain deferred because a general `reviewerId` Orders URL filter is
  not currently supported end to end.

Locked guardrails:

- Workload visibility remains read-only and must not expose mutation controls, workflow controls,
  lifecycle controls, assignment controls, activity writes, notifications, or document actions.
- Company scope, RLS, and existing order read permissions remain authoritative.
- Metrics must remain active operational metrics with no hidden historical leakage.
- No ranking, scoring, productivity, compensation, punitive, or performance-review semantics should
  be attached to the section.
- No backend analytics pipeline, dashboard-specific RPC, database view, migration, materialized
  view, scheduled job, export/reporting layer, or charting surface was added.
- No new RPCs/views are required for the initial foundation.

Deferred future work:

- Reviewer-specific Orders filter support before reviewer-row drill links.
- Overdue-by-assignee workload visibility.
- Workload aging buckets.
- Charts and trends.
- Staffing and forecasting support.
- Server-side analytics views or RPCs only if active-row frontend aggregation becomes insufficient.

## Non-Goals For Slice 1E

- No runtime changes.
- No new filters, routes, backend APIs, RPCs, views, migrations, materialized views, charts,
  exports, reports, or analytics pipeline.
- No historical metrics, employee scoring, punitive ranking, cross-company benchmarking, mutation
  behavior, workflow behavior, lifecycle behavior, assignment mutation behavior, activity write,
  notification fanout, document behavior, permission change, or route change.
