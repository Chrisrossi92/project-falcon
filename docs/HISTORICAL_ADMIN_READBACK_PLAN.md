# Historical/Admin Readback Plan

## Purpose

Historical/Admin readback surfaces provide explicit, governed visibility into operational records
that are intentionally absent from active queues. The first goal is not to add new lifecycle power;
it is to make preserved operational history findable for authorized internal users without
polluting active work surfaces.

Primary purposes:

- archived order visibility;
- cancelled and voided order visibility;
- operational audit and history review;
- admin recovery/reference workflows where staff need to answer what happened;
- future historical reporting and search foundations.

This is a planning document for Historical/Admin Readback Slice 1A. It does not change runtime
behavior, permissions, RLS, RPCs, query flags, routes, UI, lifecycle behavior, workflow behavior,
assignment behavior, activity writes, notification fanout, storage behavior, or database schema.

Related doctrine:

- `docs/ORDER_RETIREMENT_DOCTRINE.md`
- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`

## Governance Rules

Historical/Admin surfaces must follow these rules:

- Read-only by default.
- Historical query behavior must be explicit opt-in only.
- Active operational queues, dashboards, calendars, and pressure surfaces remain clean by default.
- Archived, cancelled, and voided records must not appear in active order lists unless a surface is
  deliberately designed and named as historical/admin readback.
- No restore, reopen, unarchive, or hard-delete behavior in the initial surfaces.
- No lifecycle mutation actions initially.
- No bulk historical actions initially.
- Historical surfaces must clearly indicate retired state:
  - archived;
  - cancelled;
  - voided.
- Historical surfaces must not bypass existing company scope, readable-order scope, permissions,
  RLS, or backend authorization.
- Historical readback flags such as `includeArchived` and `includeRetiredLifecycle` must remain
  confined to approved low-level read APIs until a specific runtime surface is whitelisted.
- Frontend visibility controls are not authorization; backend/RLS scope remains authoritative.
- Historical readback must not create activity rows, notifications, lifecycle transitions, document
  signed URLs, or assignment side effects by itself.

## Likely Surface Types

### Archived Orders View

Purpose: show orders removed from active operational lists through archive while preserving their
status, order number, documents, activity, assignments, and history.

Rules:

- opt into archived rows explicitly;
- show clear `Archived` state;
- keep rows read-only;
- link only to preserved-history Order Detail readback;
- exclude restore/unarchive and hard delete.

### Retired Orders View

Purpose: show terminal lifecycle records, especially cancelled and voided orders, that are
preserved for history but excluded from active operational queues.

Rules:

- opt into cancelled/voided rows explicitly;
- show clear `Cancelled` or `Voided` state;
- keep rows read-only;
- link only to preserved-history Order Detail readback;
- exclude reopen/restore and lifecycle action menus.

### Admin-Only Historical Filters

Purpose: allow authorized internal users to include historical states from a clearly labeled
admin/history surface without changing default order-list behavior.

Rules:

- filters must start from a historical/admin route or mode, not active queues;
- filter labels must make inclusion explicit, such as `Archived`, `Cancelled`, `Voided`, or
  `All historical`;
- query behavior must use approved low-level opt-in flags only within whitelisted files;
- no hidden toggles that silently mix retired rows into active dashboards.

### Historical Order Detail Readback

Purpose: preserve direct read access to individual archived/cancelled/voided orders for history,
support, and audit review.

Current Order Detail already supports preserved-history readback for direct access. Future
historical list surfaces may link into the same detail route or a deliberately read-only variant.

Rules:

- show retired lifecycle notices prominently;
- hide lifecycle/archive controls once the order is archived, cancelled, or voided;
- do not add restore/reopen/unarchive affordances;
- preserve existing document and activity authorization boundaries.

### Lifecycle Timeline Visibility

Purpose: support audit review by making lifecycle history legible through already authorized
activity/timeline data.

Rules:

- timeline visibility is read-only;
- lifecycle events should come from existing backend-owned activity where available;
- do not create frontend fallback lifecycle activity;
- do not expose raw payloads, storage internals, auth ids, or permission internals.

## Initial MVP Recommendation

The recommended first runtime implementation, after this planning slice, is a simple filtered
historical list surface:

- route or navigation entry labeled `Historical Orders`;
- read-only only;
- reuse existing order table/list patterns where practical;
- default to historical records rather than active work;
- explicitly include archived and retired lifecycle records through approved low-level opt-in query
  flags;
- show clear state badges for `Archived`, `Cancelled`, and `Voided`;
- link to existing preserved-history Order Detail readback;
- render no lifecycle mutation buttons, no bulk actions, no restore/reopen/unarchive, and no hard
  delete.

The first MVP should prefer one combined `Historical Orders` surface over multiple specialized
screens. Separate `Archived Orders` and `Retired Orders` views can be split later if operational
usage proves they need different filters or permissions.

## Data And Query Posture

Current low-level order read paths already reserve explicit opt-in behavior:

- `includeArchived` for archived rows;
- `includeRetiredLifecycle` for cancelled/voided rows.

The initial runtime surface should not invent a new broad query helper. It should whitelist a
specific historical readback path that uses these flags intentionally, with source-scan updates
documenting the allowed files. Active order list defaults must continue excluding archived,
cancelled, and voided rows.

## Permission Posture

The first planning assumption is that historical readback uses existing order read permissions and
company scope. A future implementation may decide whether the `Historical Orders` navigation entry
requires an additional admin permission, but it must not widen data access beyond the current
user's authorized company/order scope.

Do not use a frontend-only role check as authority. Backend/RLS/current-company enforcement remains
authoritative.

## Deferred Items

Deferred until separate design slices:

- restore, reopen, and unarchive flows;
- bulk historical actions;
- table-row lifecycle menus;
- export/reporting;
- advanced audit analytics;
- cross-company admin views;
- external/client history views;
- client-safe history packets;
- document download/export bundles;
- retention policy automation;
- new reporting tables or materialized views.

## Non-Goals For Slice 1A

- No runtime surface.
- No route.
- No UI.
- No query flag whitelist change.
- No source-scan change.
- No lifecycle mutation behavior.
- No restore/reopen/unarchive.
- No new RPC/API/database table.
- No activity or notification behavior change.

## Slice 1B Historical Query Foundation

Historical/Admin Readback Slice 1B adds the first controlled read-only query foundation without
exposing a UI route or navigation entry.

Implemented foundation:

- `listHistoricalOrders(...)` is a dedicated low-level read helper in `src/lib/api/orders.js`.
- The helper reuses `fetchOrdersWithFilters(...)`.
- It explicitly opts into archived readback with `includeArchived: true`.
- It explicitly opts into retired lifecycle readback with `includeRetiredLifecycle: true`, covering
  cancelled and voided orders.
- It forces the normal orders read scope and strips caller-provided historical flags before setting
  the governed values itself.

Guardrails preserved:

- no UI route;
- no navigation item;
- no restore, reopen, unarchive, hard delete, or lifecycle mutation action;
- no table action change;
- no backend API, RPC, RLS, migration, database table, activity write, or notification behavior
  change;
- active/default list behavior still excludes archived, cancelled, and voided orders;
- `includeArchived` and `includeRetiredLifecycle` remain confined to approved low-level order
  readback files by source scan.

The helper is intentionally a foundation only. A future runtime `Historical Orders` surface must
still be separately designed and whitelisted before calling this helper from routed UI.

## Slice 1C Historical Orders Page Foundation

Historical/Admin Readback Slice 1C adds the first read-only runtime surface for historical order
readback.

Implemented foundation:

- `src/pages/orders/HistoricalOrders.jsx` renders a dedicated `Historical Orders` page.
- The page calls only `listHistoricalOrders(...)` for order data.
- The route `/orders/historical` is protected by existing order read permissions.
- The page is not added to prominent navigation in this slice.
- Rows link to existing `/orders/:id` Order Detail preserved-history readback.
- Retired state indicators clearly show `Archived`, `Cancelled`, and `Voided` where applicable.

Read-only guardrails:

- no row action column;
- no Smart Actions;
- no archive/cancel/void buttons;
- no restore, reopen, unarchive, or hard delete controls;
- no workflow controls;
- no assignment controls;
- no document download or signed URL behavior;
- no backend API, RPC, RLS, migration, active-list query, activity, notification, or lifecycle
  behavior change.

This is intentionally a simple historical list foundation. Future slices may add scoped filters,
pagination controls, richer empty states, or admin navigation placement only if the same explicit
historical readback doctrine remains intact.

## Slice 1D Historical Orders Access And Navigation Doctrine

Historical/Admin Readback Slice 1D defines conservative discovery for the runtime historical page.

Access confirmation:

- `/orders/historical` remains an active route.
- The route uses the same existing order read permissions as `/orders`:
  `orders.read.all` or `orders.read.assigned`.
- The route does not introduce a new permission, backend API, RPC, RLS policy, or company-scope
  bypass.
- The page continues to call only `listHistoricalOrders(...)`.

Navigation decision:

- Do not add `Historical Orders` to the primary app navigation yet.
- Do not place it as equal weight to the active `/orders` operational queue.
- Expose it as a secondary link from the active Orders page header.
- Label the link exactly `Historical Orders`.
- Style the link as a secondary bordered control, not the primary operational action.
- Do not display counts or status totals unless a future slice can reuse already available data or
  deliberately approves an additional safe read.

Guardrails preserved:

- no dashboard widget;
- no primary nav item;
- no row actions;
- no Smart Actions;
- no archive/cancel/void controls;
- no restore, reopen, unarchive, or hard delete controls;
- no workflow, assignment, document download, signed URL, backend API, RPC, RLS, migration,
  active-list query, activity, notification, or lifecycle behavior change.

Future placement may move to an admin/history section if Falcon introduces a governed historical
navigation area. That future move should keep the page visually separate from active operational
queues.

## Slice 1E Historical Orders UX Polish

Historical/Admin Readback Slice 1E improves clarity on the existing read-only historical page
without expanding behavior.

UX additions:

- The page copy now explicitly says Historical Orders is read-only.
- The page explains archived, cancelled, and voided orders are preserved for internal history and
  reference.
- The page clarifies active orders remain in the normal Orders queue.
- A small local state filter set is available:
  - `All historical`;
  - `Archived`;
  - `Cancelled`;
  - `Voided`.

Filter doctrine:

- Filters are frontend-only.
- Filters operate only on the currently loaded `listHistoricalOrders(...)` result.
- Filters do not add backend API, RPC, RLS, migration, active-list query, or source-scan behavior.
- Filters do not change active Orders list behavior.
- Filters do not show counts beyond the already loaded/shown historical rows.

Guardrails preserved:

- no row actions;
- no Smart Actions;
- no archive/cancel/void controls;
- no restore, reopen, unarchive, or hard delete controls;
- no lifecycle mutation behavior;
- no workflow controls;
- no assignment controls;
- no document download, signed URL, file-content, activity, notification, backend API, RPC, RLS,
  migration, active-list query, or dashboard behavior change.

## Slice 1F Historical Orders Closeout

Historical/Admin Readback Slice 1F closes out the initial governed Historical Orders readback
surface.

Completed foundation:

- dedicated `/orders/historical` route;
- route protection through existing order read permissions and existing company/read scope;
- read-only historical list;
- explicit `listHistoricalOrders(...)` query helper;
- explicit archived and retired lifecycle readback opt-in inside the helper;
- archived, cancelled, and voided state labels;
- frontend-only state filters for `All historical`, `Archived`, `Cancelled`, and `Voided`;
- links to existing `/orders/:id` preserved-history Order Detail readback;
- conservative secondary `Historical Orders` entry point from the active Orders page;
- no primary navigation item and no dashboard widget.

Locked guardrails:

- no row actions;
- no Smart Actions;
- no table action menu;
- no archive/cancel/void controls;
- no restore, reopen, unarchive, or hard delete controls;
- no lifecycle mutation behavior;
- no workflow controls;
- no assignment controls;
- no document download, signed URL, file-content, backend API, RPC, RLS, migration, active-list
  query, activity, notification, permission, or company-scope behavior change.

Deferred future enhancements:

- server-side historical filtering and search;
- historical counts, summaries, or KPIs;
- richer lifecycle timeline visibility;
- admin-only permission tightening if product/security needs a narrower readback audience;
- restore/reopen/unarchive doctrine, not implementation;
- exports and reporting;
- client-safe or external history views;
- advanced audit analytics;
- cross-company admin views, if ever productized under separate company-scope doctrine.

The initial readback feature is complete for the current governed scope. Future historical work
should start from this completed foundation and must explicitly preserve active queue cleanliness
and read-only default behavior unless a separate lifecycle doctrine slice says otherwise.
