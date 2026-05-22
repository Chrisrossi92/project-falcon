# Orders Workspace Polish Strategy

## Purpose

Orders Workspace Polish Slice 1A plans the next governed Orders page polish pass so Falcon's
primary order workspace matches the improved operational dashboard quality.

This is documentation-only plus read-only inspection. It does not change runtime code, backend
behavior, routes, permissions, RLS/RPCs, filters, queries, saved views, Smart Actions, lifecycle
behavior, table columns, or order mutation behavior.

## Sources Inspected

Runtime:

- `src/pages/orders/Orders.jsx`
- `src/pages/orders/HistoricalOrders.jsx`
- `src/features/orders/OrdersFilters.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/components/orders/NewOrderButton.jsx`
- `src/components/orders/table/OrdersTableRow.jsx`
- `src/components/orders/table/OrderStatusBadge.jsx`
- `src/components/orders/drawer/OrderDrawerContent.jsx`
- `src/features/orders/smartActions.js`
- `src/features/queues/queueDefinitions.js`
- `src/features/queues/queueEvaluator.js`
- `src/features/queues/queueSummary.js`
- `src/lib/hooks/useOrders.js`
- `src/lib/api/orders.js`
- `src/lib/api/orderSavedViews.js`

Docs:

- `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`
- `docs/HISTORICAL_ADMIN_READBACK_PLAN.md`
- `docs/SAVED_VIEWS_PLAN.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Current Orders Workspace Foundation

Active Orders page:

- Routed Orders page renders an `Operational Inventory` header.
- Primary actions in the header are:
  - `Saved Views`;
  - `Historical Orders`;
  - `New Order`.
- Query params drive current filters through `readFilters(...)` / `writeFilters(...)`.
- Active list behavior excludes archived, cancelled, and voided orders by default through the
  existing active-order read path.
- Historical orders are intentionally separate on `/orders/historical`.

Filter/search foundation:

- `OrdersFilters` exposes search, client, appraiser, status, priority, and due-window controls.
- Status filtering is single-select through `statusIn[0]`.
- Active filter chips render separately after the filter panel.
- Chips support clearing individual filters and clearing all active filters.
- Queue filters are derived from dashboard/queue links via the `queue` query parameter and are
  represented as active chips.
- Queue filtering currently loads a broader source set through `useOrdersSummary(...)` and applies
  deterministic `orderHasQueue(...)` client-side before passing `rowsOverride` into the table.

Saved Views foundation:

- `SavedViewsPanel` is local to the Orders page header.
- It lists saved views through `listOrderSavedViews()`.
- It creates saved views through `createOrderSavedView(...)`.
- It deletes saved views through `deleteOrderSavedView(...)`.
- Saved view payloads are limited to a known allowlist of current query/filter keys.
- Applying a saved view rewrites the current Orders query params without changing filter semantics.

Table/workflow foundation:

- `UnifiedOrdersTable` remains the active table surface.
- The table owns pagination, drawer expansion, site-visit editing compatibility, and existing Smart
  Action rendering through canonical workflow helpers.
- Smart Actions remain governed by existing role/status/permission logic and backend workflow RPCs.
- Lifecycle actions archive/cancel/void are intentionally not in the active table; they remain
  controlled Order Detail-only actions.
- No table-row hard delete, restore, reopen, unarchive, archive, cancel, or void action is present
  in the active Orders table.

Historical Orders foundation:

- `/orders/historical` is a secondary read-only surface for archived, cancelled, and voided orders.
- It has explicit state filters for all historical, archived, cancelled, and voided.
- It links to preserved-history Order Detail readback.
- It has no lifecycle mutation controls.

## UX Goals

The next Orders page polish pass should make the Orders page feel like Falcon's primary
operational inventory rather than just a table with controls.

Goals:

- Improve the page hierarchy so users immediately understand active operational work versus
  preserved history.
- Reduce visual clutter around filters, saved views, and top-level actions.
- Make saved views and active filter chips feel intentional rather than appended.
- Clarify that queue filters are derived operational views over active orders.
- Keep workflow actions obvious inside the table/drawer without making the workspace chaotic.
- Make empty states explain whether the issue is no orders, no filter matches, or historical records
  living elsewhere.
- Improve mobile stacking so search, filters, saved views, and actions stay scannable.
- Preserve current operational governance and query behavior.

## Candidate Polish

### Stronger Page Header

Candidate direction:

- Reframe the header around `Orders Workspace` or `Orders Inventory`.
- Add concise subtitle copy explaining that this is the active order workspace.
- Keep primary creation action visible but not visually competing with filter tools.
- Show a small active/historical distinction without implying historical records are part of the
  active list.

Avoid:

- New counts or metrics unless already safely available from the current read path.
- Claims that the page includes all historical records.

### Cleaner Active / Historical Navigation

Candidate direction:

- Make `Historical Orders` look like a secondary workspace link.
- Consider a compact two-link workspace switcher:
  - `Active Orders`;
  - `Historical Orders`.
- Keep historical navigation explicit and secondary.

Avoid:

- Mixing archived/cancelled/voided rows into the active table.
- Adding restore/reopen/unarchive affordances.

### Refined Filter / Search Area

Candidate direction:

- Make search visually primary within the filter panel.
- Group client/appraiser/status/due filters more cleanly.
- Keep `priority` only as current behavior unless a later audit decides whether it should remain.
- Improve label hierarchy so filters read as operational controls, not form clutter.

Avoid:

- Adding new filters in this slice.
- Changing query param semantics.
- Changing existing filter option sources.

### Saved Views Placement Polish

Candidate direction:

- Keep Saved Views near the filter/search system instead of treating it like a primary order action.
- Clarify saved views as personal filter presets.
- Preserve create/apply/delete behavior exactly.

Avoid:

- Renaming saved view schema fields.
- Changing saved view filter allowlist.
- Adding sharing, default views, pinned views, or team views.

### Active Filter Chip Layout Polish

Candidate direction:

- Visually attach chips to the filter panel or workspace summary.
- Make queue chips clearly marked as derived.
- Make `Clear Filters` easy to find without dominating the page.

Avoid:

- Changing chip behavior.
- Hiding active filters behind an overflow menu before separate design.

### Table Support Copy

Candidate direction:

- Add small copy above the table that explains the current surface:
  - active operational orders;
  - saved/filtered view when filters exist;
  - queue-derived view when `queue` is active.
- Keep Smart Actions in the table/drawer as the obvious workflow action surface.

Avoid:

- Table column redesign in the first slice.
- Bulk actions.
- New workflow or lifecycle actions.

### Empty-State Polish

Candidate direction:

- Distinguish:
  - no active orders;
  - no orders match current filters;
  - historical records may be under Historical Orders.
- Link to `New Order` or `Historical Orders` only where existing route/permission behavior already
  allows.

Avoid:

- Suggesting hidden lifecycle restoration.
- Treating empty active list as a data failure.

### Mobile Stacking Cleanup

Candidate direction:

- Stack header actions predictably.
- Keep search first within filters.
- Let status/filter chips wrap cleanly.
- Keep saved views reachable without pushing the table too far down.

Avoid:

- Collapsing core filters into new disclosure behavior unless separately tested.

### Status / Filter Summary Context

Candidate direction:

- Add a compact summary line derived from current filter state:
  - active workspace;
  - filtered status;
  - derived queue;
  - search term.
- Use existing filter state only.

Avoid:

- New analytics counts.
- Server-side count changes.
- Cross-company aggregates.

## Governance Rules

- No backend changes.
- No query behavior changes.
- No new filters unless separately designed.
- No historical leakage into the active list.
- No lifecycle actions in the table.
- No mutation behavior changes.
- No Smart Actions behavior changes.
- No saved view behavior changes.
- No direct table reads outside existing hooks/API boundaries.
- No route-guard or permission behavior changes.
- No product-mode or module authority.
- No fake KPIs, predictive scoring, or analytics claims.
- Archived, cancelled, and voided records remain excluded by default from active Orders.
- Historical/Admin readback remains explicit and separate.

## Recommended First Implementation

Orders Workspace Polish Slice 1B should be frontend-only header/filter layout polish.

Recommended scope:

1. Refine the Orders page header hierarchy and copy.
2. Place `Saved Views` closer to filter/search controls while preserving behavior.
3. Clarify `Historical Orders` as a secondary read-only workspace link.
4. Polish filter panel spacing, label hierarchy, and mobile wrapping without changing controls.
5. Polish active filter chip layout and queue-derived copy without changing chip behavior.
6. Add a small table support summary from existing filter state only.
7. Preserve `UnifiedOrdersTable` props, data hooks, table columns, Smart Actions, lifecycle
   separation, saved-view APIs, and query params.
8. Add focused tests for rendered hierarchy, links/actions, chip behavior preservation, saved view
   reachability, and no table/lifecycle action expansion.

Out of scope for the first implementation:

- table column redesign;
- table density redesign;
- bulk actions;
- new filters;
- new queries;
- saved view semantics changes;
- backend queue filtering;
- historical search;
- analytics/reporting.

## Deferred Work

- Table column density redesign.
- Bulk actions.
- Advanced saved views.
- Owner analytics/reporting.
- Historical admin search.
- Server-side queue filtering.
- Configurable table views.
- Shared/team saved views.
- Pinned/default views.
- Column chooser or per-user table preferences.
- Saved view sharing/permissions.
- Dedicated owner reporting page.
- Export/reporting workflows.

## Slice 1A Decision

Orders Workspace Polish Slice 1A is complete as strategy-only. The recommended next slice is
frontend-only header/filter layout polish that preserves all current data, query, saved-view,
workflow, lifecycle, and table behavior.

## Slice 1B Header / Context Audit

Orders Workspace Polish Slice 1B audits the current Orders page structure before implementation.
This slice is docs/inventory only and changes no runtime files.

### Current Structure

Page title/header:

- Header eyebrow is `Operational Inventory`.
- Page title is `Orders`.
- Subtitle says users can search, filter, and manage the full order record without changing
  dashboard queue focus.
- Header actions sit to the right:
  - `Saved Views`;
  - `Historical Orders`;
  - `New Order`.

Historical Orders link placement:

- `Historical Orders` is placed in the same header action cluster as `Saved Views` and `New Order`.
- It is visually similar to `Saved Views`, even though it is a secondary read-only workspace rather
  than a filter tool.
- Active versus historical order separation exists functionally, but the hierarchy could explain it
  more clearly.

Saved Views placement:

- `Saved Views` sits in the top-right page header action cluster.
- The popover describes saved views as personal URL presets for the Orders queue.
- Saved Views behavior is sound, but placement makes it visually compete with page navigation and
  order creation.
- Saved Views is more closely related to the filter/search system than to the primary page action.

Search/filter layout:

- `OrdersFilters` renders as a separate card below the header.
- Search is first and full-width on small screens with a fixed desktop width.
- Client and appraiser selects sit beside search on wider layouts.
- Status pills form a long row below search/client/appraiser.
- Priority and Due selects sit in a third row.
- The filter card is functional but visually dense because every control has similar weight.

Active filter chip placement:

- Active chips render as a separate card-like strip below `OrdersFilters`.
- Chips correctly show status, search, client, appraiser, reviewer, due, and queue context.
- Queue chips explicitly say `(derived)`.
- `Clear Filters` is useful but can drift to the far right and visually compete with chips on wide
  layouts.
- Chips feel appended rather than integrated with the filter/search workspace.

Queue/filter context:

- Queue context is derived from the `queue` query parameter and deterministic queue membership.
- Queue rows are produced by loading a broader active-order source set and applying
  `orderHasQueue(...)` client-side.
- Active queue summary is passed into `UnifiedOrdersTable` as `activeQueue`.
- The page header does not currently explain when the table is showing a queue-derived view.

Orders table hierarchy:

- `UnifiedOrdersTable` follows filters and chips directly.
- The table is the operational work surface and owns drawer expansion, pagination, site visit
  compatibility, and Smart Actions.
- There is no small workspace summary between filters and table explaining active inventory,
  filtered view, or queue-derived view.
- Lifecycle actions remain absent from the table, which is correct.

Empty/loading states:

- Table loading copy is `Loading active work...`.
- Empty active copy is `No active orders to show.`
- Queue empty copy is `No orders match this operational queue.`
- Historical Orders has separate loading, error, no historical records, and no state-filter match
  copy.
- Empty states are safe but could better distinguish no active inventory, no filter matches, and
  historical records living in the separate read-only workspace.

Mobile stacking behavior:

- Header actions wrap in the header cluster.
- Filter controls wrap naturally, with search first.
- Status pills can create a long section before the table.
- Active chips wrap naturally but add another full strip before the table.
- Saved Views remains reachable, but its header placement may push primary order creation and
  historical navigation into a crowded action cluster.

### Primary vs Secondary Elements

Primary today:

- Page title and subtitle.
- `New Order`.
- Search/filter card.
- Active filter chips when present.
- `UnifiedOrdersTable`.
- Smart Actions inside the table/drawer.

Secondary today:

- `Saved Views`, though it visually competes with primary actions.
- `Historical Orders`, though it represents a separate read-only workspace.
- Queue context, which is mostly visible through chips/table behavior rather than page hierarchy.

### Weak Context / Clutter Findings

- The header says `full order record`, but the page actually shows active operational inventory by
  default; historical records live elsewhere.
- Saved Views and Historical Orders are visually grouped with New Order even though they serve
  different jobs.
- Filter controls all carry similar visual weight, which makes search/status/due hierarchy less
  clear.
- Active chips feel detached from the filter card.
- Queue-derived table state could be clearer before the user reaches the table.
- The table is correctly primary, but it lacks a small supporting context line explaining the
  current view.
- On mobile, header actions, filter rows, status pills, and chips can stack into a tall control
  area before the user reaches the work surface.

### Safe First-Pass Polish Targets

- Stronger operational header that says this is the active Orders workspace/inventory.
- Compact support/context row using existing filter state only.
- Cleaner secondary controls grouping:
  - keep `New Order` as the primary action;
  - move or visually associate `Saved Views` with filtering;
  - make `Historical Orders` a secondary read-only workspace link.
- Active filter summary improvements:
  - keep chips visible;
  - keep clear-one and clear-all behavior;
  - visually connect chips to the filter/search workspace.
- Spacing/alignment cleanup inside the filter card.
- Historical-link hierarchy cleanup so users understand active and historical records are separate.
- Mobile layout improvements through wrapping/spacing only, not new disclosure behavior.
- Table support copy from existing filter state only:
  - active inventory;
  - filtered view;
  - queue-derived view.

### Explicit Avoidance For Slice 1C

- No table column redesign.
- No filter/query behavior changes.
- No Smart Actions changes.
- No Saved Views behavior changes.
- No queue logic changes.
- No lifecycle behavior changes.
- No backend changes.
- No new filters.
- No historical leakage into active Orders.
- No table-level lifecycle actions.

### Slice 1B Decision

Orders Workspace Polish Slice 1B is complete as a documentation-only audit. The recommended next
implementation slice is a frontend-only Orders header/filter/context polish pass that preserves
the current query params, saved-view APIs, queue logic, table props, table columns, Smart Actions,
lifecycle separation, and historical readback boundaries.

## Slice 1C Header / Filter Layout Polish

Orders Workspace Polish Slice 1C implements the first frontend-only Orders workspace polish pass.

Completed:

- The active Orders header now uses `Orders Workspace` with `Active Operations` framing and copy
  that clearly separates active inventory from archived/cancelled/voided historical readback.
- `New Order` remains the only primary header action.
- `Saved Views` moved into the filter/search control header through a render slot, keeping it near
  the URL-backed filter system it controls.
- `Historical Orders` now sits beside `Saved Views` as a secondary read-only workspace link instead
  of visually competing with `New Order`.
- `OrdersFilters` copy now says `Filter Active Orders` and describes active operational filtering.
- Active filter chips keep their existing clear-one and clear-all behavior, with tighter wrapping
  and mobile alignment.
- A compact read-only Orders workspace context strip now appears before the table, using existing
  filter state only to explain:
  - normal active inventory;
  - filtered active views;
  - queue-derived active views.
- Queue-derived context remains based on the existing `queue` query parameter, loaded rows, and
  `activeQueue` summary already passed to `UnifiedOrdersTable`.
- The active table remains immediately after the filter/chip/context area and continues to receive
  the same filter props, `rowsOverride`, and `activeQueue` data.

Preserved boundaries:

- No backend changes.
- No Supabase changes.
- No query/filter semantic changes.
- No Saved Views API or behavior changes.
- No Smart Actions behavior changes.
- No table column redesign.
- No lifecycle action relocation.
- No fake analytics, predictive scoring, or new KPI claims.
- No archived/cancelled/voided leakage into active Orders.
- No new data source, route, permission, RLS/RPC, mutation path, or historical query behavior.

Validation:

- Focused Orders page tests cover the new hierarchy, filter-action grouping, context strip,
  saved-view behavior, active filter chip behavior, and unchanged table prop behavior.

## Slice 1D Orders Table Presentation Polish

Orders Workspace Polish Slice 1D polishes the existing `UnifiedOrdersTable` presentation without
changing table behavior.

Completed:

- Added a compact table chrome/header inside `UnifiedOrdersTable` with:
  - `Orders Table` label;
  - active table mode (`Active orders` or `Queue worklist`);
  - existing total count;
  - existing page context;
  - short explanatory copy derived only from current table mode.
- Preserved the existing active queue panel and queue-derived row override behavior.
- Improved loading presentation from repeated text rows to lightweight skeleton rows using the
  existing loading state and page size.
- Improved error presentation with a clearer alert block while preserving the existing error source.
- Improved empty-state presentation with clearer copy and no action controls.
- Tightened row spacing slightly and retained existing column definitions, cell renderers, drawer
  behavior, pagination behavior, and Smart Action renderers.
- Kept footer pagination and total count behavior intact.

Preserved boundaries:

- No backend changes.
- No Supabase changes.
- No query/filter/Saved Views behavior changes.
- No table column redesign or column data changes.
- No Smart Action logic, labels, handlers, permissions, or render behavior changes.
- No lifecycle action movement.
- No status, queue, pagination, drawer, or row expansion semantic changes.
- No archived/cancelled/voided visibility changes.
- No fake analytics, predictive scoring, or new data source.

Validation:

- Added a focused `UnifiedOrdersTable` presentation test covering active table chrome, queue
  worklist context, empty-state behavior, loading skeleton behavior, and absence of lifecycle action
  controls in empty state.

## Slice 1E Order Drawer / Detail Presentation Polish

Orders Workspace Polish Slice 1E polishes the inline order drawer/detail surface without changing
drawer behavior, data loading, activity behavior, actions, permissions, or lifecycle boundaries.

Completed:

- `OrderDrawerContent` now renders clearer loading, no-selection, and error presentation states.
- The inline drawer header now has a stronger hierarchy with:
  - `Inline order detail` label;
  - larger order number;
  - existing status badge;
  - existing client, appraiser, and property context;
  - the existing full-detail link restyled as a secondary action.
- Activity remains the primary drawer content area and still uses the existing `ActivityLog` with
  composer enabled.
- Contact context is grouped into clearer bordered cards for client contact, property contact, and
  access notes.
- Location preview copy and card styling are calmer while preserving existing map/placeholder and
  external maps behavior.
- Mobile/readability polish is limited to spacing, grouping, borders, and typography.
- `OrderOpenFullLink` receives presentational button-like styling while preserving the same route.

Preserved boundaries:

- No backend changes.
- No Supabase changes.
- No query/filter/Saved Views behavior changes.
- No drawer open/close behavior changes.
- No drawer data-loading query changes.
- No activity composer or activity fetch behavior changes.
- No Smart Actions changes.
- No lifecycle action movement.
- No permission/authority changes.
- No table column redesign.
- No new mutation controls or drawer features.

Validation:

- Added a focused drawer presentation test covering the polished loaded hierarchy, no-selection
  state, error state, preserved full-detail link, preserved activity composer, and absence of
  lifecycle action controls in the no-selection state.

## Slice 1F Consistency / Accessibility / Responsive Sweep

Orders Workspace Polish Slice 1F closes the first Orders Workspace polish pass with a small
consistency, accessibility, and responsive-readability sweep across the surfaces changed in
Slices 1C through 1E.

Completed:

- Added explicit accessible context labels where safe:
  - Orders workspace context strip;
  - Orders filter utility group;
  - Orders table wrapper;
  - loading status indicators.
- Associated filter labels with their existing select controls for client, appraiser, priority, and
  due window.
- Added an accessible label to the active search input without changing the placeholder, query
  state, or search behavior.
- Added an accessible group label to the existing status filter pill set.
- Normalized touched-file imports by removing unused React default imports where JSX transform does
  not require them.
- Reviewed header, filters, active chips, table chrome, loading/empty/error states, and drawer
  grouping for duplicate wording, spacing, and responsive stacking.
- Kept the 1C/1D/1E layout hierarchy intact:
  - `New Order` remains primary;
  - `Saved Views` and `Historical Orders` remain filter/workspace utilities;
  - active chips remain visible and removable;
  - table chrome remains deterministic and non-analytic;
  - drawer detail remains presentational and read/action neutral.

First-pass completion checkpoint:

- Orders Workspace Polish Slices 1A through 1F now form the first governed Orders workspace polish
  foundation: strategy, audit, active page header/filter/context polish, table presentation polish,
  drawer/detail presentation polish, and consistency/a11y/responsive cleanup.
- The foundation improves hierarchy and readability only. It does not change operational authority,
  data access, mutation behavior, route behavior, or saved-view/filter/table semantics.

Preserved boundaries:

- No backend changes.
- No Supabase changes.
- No query/filter/Saved Views behavior changes.
- No Smart Actions behavior changes.
- No lifecycle action movement.
- No table column redesign.
- No new product features.
- No permission/authority changes.
- No archived/cancelled/voided leakage into active Orders.
- No fake analytics, predictive scoring, or new data source.

Validation:

- Existing Orders page, table presentation, and drawer presentation tests continue to cover the
  polished hierarchy and unchanged behavior boundaries.
