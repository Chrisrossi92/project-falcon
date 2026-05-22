# Operations Filtering Audit

## Purpose

Falcon should audit the active Orders filtering and search surface before expanding operational
filter UX. The goal is to improve navigation and visibility without introducing hidden historical
leakage, backend analytics infrastructure, mutation behavior, workflow shortcuts, or duplicate
filter semantics.

This is a docs/inventory slice. It does not change runtime behavior, routes, filters, backend APIs,
RPCs, RLS, database schema, analytics pipelines, workflow behavior, lifecycle behavior, assignment
behavior, activity, notifications, or permissions.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/WORKLOAD_VISIBILITY_PLAN.md`
- `docs/DASHBOARD_ANALYTICS_PLAN.md`
- `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`

## Active Orders Filter Chain

The current active Orders route is `src/pages/orders/Orders.jsx`.

Primary chain:

1. `Orders.jsx` reads query parameters with `readFilters(...)`.
2. `Orders.jsx` writes query parameters with `writeFilters(...)`.
3. `OrdersFilters` renders the visible filter controls and calls `onChange(...)`.
4. `UnifiedOrdersTable` seeds `useOrders(...)` from the Orders page filter object.
5. `useOrders(...)` calls `fetchOrdersWithFilters(...)`.
6. `fetchOrdersWithFilters(...)` reads from `v_orders_frontend_v4` for `scope: "orders"` and
   applies default archived and retired-lifecycle exclusions.

Queue filtering is a side path:

1. `Orders.jsx` reads `?queue=<queueId>`.
2. It loads up to 1000 active rows through `useOrdersSummary(...)`.
3. It filters those loaded rows with `orderHasQueue(order, queueId)`.
4. It passes `rowsOverride` into `UnifiedOrdersTable`.

Historical/admin readback is a separate approved path through `listHistoricalOrders(...)` and
`/orders/historical`. It must not be blended into active Orders filtering.

## Query Parameter Inventory

| Query / Filter | URL Param | Visible Control | Read Path | Current Status | Notes |
|---|---|---|---|---|---|
| Search | `q` | Yes | `fetchOrdersWithFilters(...search)` | Fully wired | Searches order number, client, appraiser, address, city, state, property type, and report type in the current low-level helper. |
| Status | `status` | Yes | `statusIn` -> `status` filter | Fully wired | Single-select URL/status pill model. `completed` is visible, while archived/cancelled/voided defaults remain excluded unless historical flags are used elsewhere. |
| Due window | `due` | Yes | `dueWindow` -> final due predicates | Fully wired for supported values | `overdue` is implemented; numeric day windows are supported by the low-level helper. UI also lists `this_week` and `next_week`, but the current low-level helper does not implement those string windows. |
| Appraiser | `appraiserId` | Yes | `appraiser_id` | Fully wired | Used by Orders filters and workload drill links. |
| Reviewer | `reviewerId` | No | `reviewer_id` | URL/read-path wired; visible control deferred | Added for governed dashboard drill links. No manual reviewer selector exists in `OrdersFilters` yet. |
| Client | `clientId` | Yes | `client_id` | Fully wired | Uses `listOrderFilterClients(...)` for control options. |
| Queue | `queue` | No direct selector | Frontend row override after `useOrdersSummary(...)` | Frontend-only over governed active rows | Used by dashboard links such as `unassigned_orders`. It is not a backend query predicate. |
| Priority | `priority` | Yes | Mixed/partial | Transitional | `OrdersFilters` exposes priority, and `src/features/orders/api.js` has a legacy/list priority path, but the active `UnifiedOrdersTable` -> `useOrders(...)` -> `fetchOrdersWithFilters(...)` path does not apply priority in the current low-level helper. |
| Page | `page` | Table pagination | `useOrders(...)` | Fully wired | Reset to `0` on `OrdersFilters` changes. |
| Page size | `pageSize` | Table pagination | `useOrders(...)` | Fully wired | URL-persisted with minimum `10`. |

## Hidden / Internal Filters

The active table and low-level helper also know about filters that are not first-class visible
Orders page controls:

| Filter | Source | Status | Notes |
|---|---|---|---|
| `assignedAppraiserId` | `UnifiedOrdersTable` / `fetchOrdersWithFilters(...)` | Internal | Collapses to `appraiser_id` in the low-level helper. Used by some role/dashboard flows. |
| `inspectedAwaitingReport` | dashboard/table filters | Internal | Filters report-writing statuses with a past site visit date. Not URL-backed in Orders. |
| `finalDueWithinDays` | dashboard/table filters | Internal | Filters final due date windows using numeric days. Not URL-backed in Orders except via `dueWindow` for the public route. |
| `from` / `to` | `useOrders(...)` / low-level helper | Internal | Filters `created_at`; no active Orders UI or URL support. |
| `includeArchived` | low-level helper | Restricted historical opt-in | Must remain confined to approved historical/admin readback paths. |
| `includeRetiredLifecycle` | low-level helper | Restricted historical opt-in | Must remain confined to approved historical/admin readback paths. |
| `mode = "reviewerQueue"` | dashboard/reviewer table mode | Internal | Adds `in_review` status behavior for reviewer queue contexts. |
| `scope` | dashboard/orders read source selector | Internal | Chooses `v_orders_active_frontend_v4` for dashboard and `v_orders_frontend_v4` for Orders. |
| `rowsOverride` | `UnifiedOrdersTable` | Frontend-only | Used for queue and dashboard row subsets. Bypasses a fresh table query. |

## Filter State Duplication

Current duplication points:

- `Orders.jsx` owns URL parsing/writing and must stay aligned with `UnifiedOrdersTable` seed keys.
- `OrdersFilters` renders only a subset of the filter object and can preserve hidden URL filters it
  does not display because it spreads the existing value before patching.
- `UnifiedOrdersTable` re-seeds filters into `useOrders(...)`, enforces appraiser role scoping, and
  may add reviewer role scoping.
- `useOrders(...)` has its own `DEFAULT_FILTERS` and explicit payload mapping to
  `fetchOrdersWithFilters(...)`.
- `fetchOrdersWithFilters(...)` has another filter destructuring layer and `applyCommonFilters(...)`
  owns the actual low-level predicates.
- `src/features/orders/api.js` contains a separate older list/count implementation with similar
  status/search/appraiser/client/due/priority concepts. It is not the current active table path
  audited here and should not be used as the source of truth for new Orders filter UX.

The duplication is manageable for small changes but makes new filter behavior easy to partially
wire. Future work should prefer one small shared filter definition or URL schema helper before
adding many more filters.

## Filter Capability Classification

| Filter | Classification | Governance Notes |
|---|---|---|
| `status` | Fully wired end-to-end | Governed by existing active Orders read path. |
| `due=overdue` | Fully wired end-to-end | Governed active Orders filter; no historical leakage by default. |
| Numeric `due` windows | Low-level supported, UI exposed | Needs test/UX confirmation if promoted beyond current dropdown behavior. |
| `due=this_week` / `due=next_week` | Visible but not implemented in current low-level helper | Partial/transitional; should be fixed or removed before relying on it. |
| `appraiserId` | Fully wired end-to-end | Governed by existing active Orders read path. |
| `reviewerId` | URL/read-path wired, no visible control | Governed by existing active Orders read path; currently used for dashboard drill links. |
| `clientId` | Fully wired end-to-end | Governed by existing active Orders read path. |
| `queue` | Frontend-only over governed active read | Useful for operational queues, but not server-side paginated. Large result sets may need backend support later. |
| `search` | Fully wired end-to-end | Governed by existing active Orders read path. |
| `priority` | Partial/transitional | Visible control exists, but current low-level active table helper does not apply it. |
| `page` / `pageSize` | Fully wired end-to-end | Applies to server-side read path except when `rowsOverride` is used. |
| `includeArchived` / `includeRetiredLifecycle` | Restricted historical/admin only | Must not be added to active Orders URL controls. |

## Operational Gaps

- Due-window mismatch: `this_week` and `next_week` appear in `OrdersFilters`, but the current
  active low-level helper only implements `overdue` and numeric day windows.
- Priority mismatch: the visible priority dropdown is not applied by `fetchOrdersWithFilters(...)`
  in the active table path.
- Reviewer filtering is URL/read-path wired but has no visible selector or active-filter chip.
- Queue filtering is frontend-only after loading up to 1000 rows, so queue counts/pages are not
  truly server-side filtered.
- Unassigned filtering is currently represented as an operational queue, not as explicit appraiser
  or reviewer null URL predicates.
- Combined filters work mechanically when they are in the filter object, but there is no visible
  active-filter summary showing combinations such as `status + reviewerId`, `due + appraiserId`,
  or `queue + search`.
- There is no unified reset control that clears URL-backed filters, hidden URL filters, and queue
  state in one obvious action.
- Filter state is duplicated across route parsing, controls, table seed, hook defaults, and API
  mapping.
- Historical/admin combinations remain intentionally separate. Active Orders should not expose
  archived or retired lifecycle opt-in flags.

## Recommended First Safe UX Improvements

1. Add visible active-filter chips for URL-backed active filters:
   `status`, `due`, `appraiserId`, `reviewerId`, `clientId`, `queue`, `q`, and page-size when
   useful. Chips should remove only their own filter and preserve the rest.
2. Add a single `Clear filters` affordance that resets active Orders URL filters back to the
   default active inventory state without touching historical/admin readback.
3. Reconcile visible filter controls with implemented predicates:
   either implement `this_week` / `next_week` in `fetchOrdersWithFilters(...)` or remove/hide them
   until implemented; either wire priority into the active helper or remove/hide the priority
   dropdown from the active Orders filter bar.
4. Keep reviewer filtering URL-backed first. Add a visible reviewer selector only if product wants
   manual reviewer filtering beyond dashboard drill links.
5. Treat saved queries as a later governed pattern after filter chips/reset behavior is stable.

## Guardrails

- Docs/inventory only for Slice B1.
- No runtime filter changes in this slice.
- No backend analytics redesign, RPC, view, migration, materialized view, scheduled job, chart,
  export, or reporting layer.
- No mutation behavior, workflow behavior, lifecycle behavior, assignment mutation behavior,
  activity write, notification fanout, document behavior, or permission change.
- No historical leakage into active Orders defaults. Archived and retired lifecycle opt-ins must
  remain explicit historical/admin readback behavior.
- Avoid ranking/scoring semantics when filters are used from workload visibility.

## Operational UX Slice B2 Active Filter Visibility Planning

Operational UX Slice B2 plans a governed active-filter visibility system before implementation.
This section is documentation only and does not change Orders runtime behavior.

### Current Query State To Surface

| Query / Filter | Current State | Visibility Plan | Removal / Reset Rule |
|---|---|---|---|
| `status` | URL-backed and read-path wired | Show a lightweight chip such as `Status: In review` | Removing the chip clears only `status` and resets `page` to `0`. |
| `q` | URL-backed and read-path wired | Show a search chip such as `Search: "123 Main"` | Removing the chip clears only `q` and resets `page` to `0`. |
| `clientId` | URL-backed and read-path wired | Show `Client: <name>` when option data is available; otherwise show a stable fallback | Removing the chip clears only `clientId` and resets `page` to `0`. |
| `appraiserId` | URL-backed and read-path wired | Show `Appraiser: <name>` when option data is available; otherwise show a stable fallback | Removing the chip clears only `appraiserId` and resets `page` to `0`. |
| `reviewerId` | URL-backed and read-path wired; no visible selector | Show `Reviewer: <name>` when option data is available; otherwise show a stable fallback | Removing the chip clears only `reviewerId` and resets `page` to `0`. |
| `due` | URL-backed and read-path wired for `overdue` and numeric windows | Show implemented due filters, starting with `Due: Overdue` | Removing the chip clears only `due` and resets `page` to `0`. |
| `queue` | URL-backed but frontend-only over governed active rows | Show an operational queue chip such as `Queue: Unassigned active` | Removing the chip clears only `queue` and resets `page` to `0`. |
| `page` | URL-backed pagination state | Do not show as a filter chip by default | Filter changes should reset `page` to `0`; page navigation remains table behavior. |
| `pageSize` | URL-backed pagination state | Do not show as a filter chip by default unless product wants an explicit non-default page-size indicator | `Clear filters` should preserve the default page size behavior unless a future UX explicitly treats page size as a filter. |

`priority` remains a transitional mismatch and should not be promoted as a governed active chip
until the visible control and current `fetchOrdersWithFilters(...)` predicate support are reconciled.
Unsupported due values such as `this_week` and `next_week` should likewise be reconciled before
they become first-class visible chips.

### Visibility Goals

- Users should immediately understand why an Orders queue is filtered after landing from dashboard
  KPI or workload drill links.
- Filter state should survive navigation and refresh through the URL, not through hidden local
  component state.
- Operational drill links should remain explainable after landing, especially combinations such as
  `status=in_review&reviewerId=<id>` or `status=needs_revisions&appraiserId=<id>`.
- Future historical/admin filters should be visually distinct from active operational filters and
  must not look like normal active queue filters.

### Recommended UX

- Add a compact active-filter chip row above the Orders table, near the existing filter controls.
- Generate chips from URL/query-backed Orders filter state only.
- Make chips removable where removal is safe and maps to clearing one query parameter.
- Provide an explicit `Clear filters` affordance when any active URL-backed filter is present.
- `Clear filters` should clear `q`, `status`, `clientId`, `appraiserId`, `reviewerId`, `due`,
  `queue`, and any future governed active filter while resetting `page` to `0`.
- Keep pagination controls as table controls. Filter changes reset page position, but page/page-size
  state should not be presented as operational filter meaning.
- Use human labels where existing option data is already available. If a label is missing, use a
  stable non-misleading fallback rather than hiding the active query state.
- Do not introduce saved views in the first chip/reset slice. Saved query patterns should wait
  until the active filter schema is stable.

### Governance Rules

- Chips reflect URL/query state only; they must not reveal local-only table defaults as if they were
  user-selected filters.
- No local-only hidden filters should affect active Orders without either URL representation or an
  explicit internal-governance reason.
- Active Orders chips must not expose `includeArchived`, `includeRetiredLifecycle`, or other
  historical/admin opt-in flags.
- Active chips are read/navigation affordances only. They must not trigger workflow, lifecycle,
  assignment, activity, notification, document, permission, or backend analytics behavior.
- No saved views, server-side analytics pipeline, new RPC/view, or filter redesign is part of this
  planning slice.

### Risky / Transitional Filters

- `queue` is useful for drill-link comprehension but remains frontend-only over a loaded active-row
  subset. Its chip label should be operational and honest; it should not imply server-side
  pagination or complete analytics semantics.
- `due=this_week` and `due=next_week` are visible in current filter controls but not implemented in
  the audited current low-level active read helper. They should be implemented, hidden, or otherwise
  reconciled before being treated as governed active chips.
- `priority` has visible-control and legacy-path support but is not applied in the current active
  table read path. It should be reconciled before it appears in the chip system.
- Future historical/admin filters require separate styling and copy, and should remain outside the
  active Orders chip row until a dedicated historical UX slice defines them.
- Internal filters such as `assignedAppraiserId`, `inspectedAwaitingReport`, `finalDueWithinDays`,
  `from` / `to`, `mode`, `scope`, and `rowsOverride` should not become user-facing chips unless a
  future slice promotes them into explicit governed URL state.

## Operational UX Slice B3 Active Filter Chips Foundation

Operational UX Slice B3 implements the first governed active-filter chip foundation on the Orders
page.

Completed behavior:

- A compact active-filter chip row now renders above the Orders table when supported active filters
  are present.
- Initial chips are derived from existing `Orders.jsx` URL/query-backed filter state only:
  `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, and `queue`.
- Removing a chip clears only that filter through the existing Orders page `onChange(...)` /
  `writeFilters(...)` path and resets `page` to `0`.
- `Clear Filters` clears the supported active filter set and preserves existing page-size behavior.
- Default Orders view remains unchanged when no supported active filters are present.
- Queue chips are explicitly labeled as derived operational filters because queue filtering remains
  frontend-only over governed active rows.
- `due=this_week`, `due=next_week`, and unknown due values are labeled transitional if they appear
  in URL state.
- Unsupported hidden/internal filters and historical/admin opt-in flags are not exposed as chips.

Tests cover chip rendering from URL state, chip removal, `Clear Filters`, and unchanged default
Orders behavior.

Guardrails remain unchanged: no backend/API/RPC/view/migration changes, no filter redesign, no
saved views, no mutation behavior, no workflow/lifecycle/assignment behavior, no backend analytics
pipeline, and no historical leakage into active defaults.

Deferred follow-up remains reconciling `priority`, implementing or hiding `due=this_week` /
`due=next_week`, adding optional human-readable labels for id-backed chips if existing option data
is promoted safely, and defining separate historical/admin chip treatment before any historical
filters are surfaced.

## Operational UX Slice B4 Filter Chip Closeout

Operational UX Slice B4 closes out the initial active-filter chip foundation without runtime
changes.

The completed chip foundation is now locked as:

- Chips are derived from existing Orders URL/query/filter state only.
- Supported active chips are `status`, `q`, `clientId`, `appraiserId`, `reviewerId`, `due`, and
  `queue`.
- Chip removal updates Orders URL/filter state through the existing Orders page filter write path.
- `Clear Filters` resets the supported active filter set.
- Page size is preserved by the clear action.
- Page reset is handled through the existing filter-change path.
- Queue chips are labeled as derived operational filters because queue filtering remains
  frontend-only over governed active rows.
- Transitional due values are labeled transitional when present.
- Historical/admin opt-in flags, hidden/internal filters, and unsupported filters are not exposed
  as chips.

No backend/API/RPC/view/migration, filter redesign, saved view, mutation behavior,
workflow/lifecycle/assignment behavior, backend analytics pipeline, or historical leakage was added.

Deferred future work:

- Reconcile `due=this_week` and `due=next_week` by implementing governed predicates or removing/
  hiding them from active controls.
- Decide whether `priority` should become a governed active filter or be removed from active
  filter controls.
- Add richer assignee/client chip labels instead of raw ids where existing option data can be used
  without hidden local-only state.
- Design saved views only after the active filter schema is stable.
- Design filter presets separately from the base chip foundation.
- Define historical/admin filter chips with distinct visual treatment before surfacing historical
  or retired lifecycle filters in any chip row.
