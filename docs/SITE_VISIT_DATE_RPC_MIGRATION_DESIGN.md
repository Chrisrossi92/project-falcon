# Site Visit Date RPC Migration Design

## Purpose

Phase 10F5A designs the migration of active site-visit/date mutation paths from direct `orders` table updates to a guarded RPC-backed path while preserving existing calendar-event behavior.

This is documentation-only plus read-only inspection. It does not add migrations, backend behavior changes, frontend behavior changes, tests, RLS/RPC changes, routes, registries, UI changes, or helper removal.

## Sources Inspected

Docs inspected:

- `docs/ORDER_MUTATION_REMAINING_PATH_AUDIT.md`
- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend/service code inspected:

- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/lib/api/orders.js#updateSiteVisitAt(...)`
- `src/lib/services/ordersService.js#updateOrderViaRpc(...)`
- `src/lib/api/calendar.js#createEvent(...)`
- `src/components/dates/SiteVisitPicker.jsx`
- order form/date field references for `site_visit_at`

Backend inspected:

- `public.rpc_update_order(order_id uuid, patch jsonb)`
- `public.rpc_update_order_dates(uuid, timestamptz, timestamptz, timestamptz)`
- `public.rpc_create_calendar_event(text, text, timestamptz, timestamptz, uuid, uuid, text, text)`
- order update permission helpers used by date/update RPCs
- calendar event company-scope projection behavior

## Current Site Visit Mutation Paths

### `UnifiedOrdersTable`

`UnifiedOrdersTable` passes `onSetSiteVisit` into order table columns. The active handler:

- receives an order and ISO timestamp from `SiteVisitPicker`;
- calls `src/lib/api/orders.js#updateSiteVisitAt(orderPk, iso, extras)`;
- refreshes the table on success;
- calls `onOrderDatesChanged?.(updated)`;
- shows success/error toasts.

`updateSiteVisitAt(...)` currently:

- direct-updates `orders.site_visit_at` and `orders.updated_at`;
- returns the first updated row;
- after the order update succeeds, best-effort calls `rpc_create_calendar_event(...)`;
- logs a warning if calendar event creation fails, but still returns the updated order row.

### `OrderDetail`

`OrderDetail.saveAppt(iso)` currently:

- direct-updates `orders.site_visit_at` and `orders.updated_at`;
- uses `alert(...)` for direct update errors;
- calls `refresh()` on success.

It does not create a calendar event in the inspected implementation.

### Other Date Helpers

Other date helpers remain available but no active caller was found in the 10F4 inspection:

- `src/lib/api/orders.js#updateOrderDates(...)`
- `src/lib/services/ordersService.js#updateOrderDates(...)`

Those helpers also direct-update order date fields and should be quarantined or rewritten after active site-visit paths are migrated.

## Calendar Side-Effect Findings

Current calendar behavior is best-effort and frontend-orchestrated:

- `updateSiteVisitAt(...)` direct-updates the order first.
- It then calls `rpc_create_calendar_event(...)`.
- Calendar RPC failure is logged as a warning and does not fail the order date update.

The calendar RPC derives `company_id` server-side from `p_order_id -> orders.company_id`, with fallback to `default_company_id()`. It inserts a `calendar_events` row and returns the event id. Existing docs also note calendar projection behavior and dashboard refresh behavior, but this slice found no single backend transaction that combines site-visit update plus calendar event creation.

This means 10F5B should preserve behavior by keeping calendar event creation best-effort in the frontend flow initially. Moving calendar projection into the same backend transaction should be a separate calendar model design because it changes failure semantics, duplicate-event behavior, and transaction boundaries.

## Target RPC-Backed Mutation Path

The preferred first target is existing `updateOrderViaRpc(orderId, { site_visit_at })`, which calls:

- `rpc_update_order(order_id uuid, patch jsonb)`

Reasons:

- `rpc_update_order(...)` already covers `site_visit_at` after Phase 10F3B.
- The active normal edit path already uses `updateOrderViaRpc(...)`.
- The RPC preserves update authorization, current-company scoping, client/AMC guards, and `order_number` rejection.
- It returns the updated order row, which matches current `updateSiteVisitAt(...)` caller expectations.
- It avoids introducing a new backend RPC before calendar side-effect semantics are intentionally redesigned.

Alternative:

- `rpc_update_order_dates(...)` is also guarded and updates `site_visit_at`, `review_due_at`, and `final_due_at`.

Do not choose the date RPC as the first implementation unless the implementation explicitly wants a date-specific API surface. For a minimal migration of two active site-visit-only callers, `updateOrderViaRpc(...)` is already available and tested as the generic guarded edit boundary.

## Recommended Frontend Wrapper Design

Add or adjust one service wrapper in the next implementation slice:

- Suggested name: `updateSiteVisitAtViaRpc(orderId, siteVisitAt, options = {})`
- Suggested location: `src/lib/services/ordersService.js` or `src/lib/api/orders.js`, depending on the existing import path chosen for minimal churn.

Recommended behavior:

- call `updateOrderViaRpc(orderId, { site_visit_at: siteVisitAt || null })`;
- do not direct-update `orders`;
- return the updated order row;
- if `options.createCalendarEvent !== false` and `siteVisitAt` is present, best-effort call `rpc_create_calendar_event(...)` with the same title/address/appraiser semantics currently used by `updateSiteVisitAt(...)`;
- log but do not throw calendar-event errors, preserving current non-authoritative calendar behavior;
- do not mutate status, workflow fields, review fields, or order-number fields.

Implementation can also reuse `src/lib/api/calendar.js#createEvent(...)` if doing so does not revive broader legacy calendar adapter behavior. Direct `supabase.rpc("rpc_create_calendar_event", ...)` is acceptable for parity with current code.

## Recommended 10F5B Medium Slice

Implement one medium batch:

1. Add or adjust the site-visit update service to call `updateOrderViaRpc(orderId, { site_visit_at })`.
2. Preserve current best-effort `rpc_create_calendar_event(...)` behavior after a successful order update.
3. Migrate `UnifiedOrdersTable` to the RPC-backed site-visit service.
4. Migrate `OrderDetail.saveAppt(...)` to the same service.
5. Preserve existing refresh, toast, callback, and error behavior as much as possible.
6. Add targeted tests:
   - service wrapper calls `rpc_update_order` through `updateOrderViaRpc` or directly with equivalent args;
   - service wrapper does not direct-update `orders`;
   - calendar RPC is called after successful update when timestamp exists;
   - calendar RPC failure does not fail the site-visit save;
   - `UnifiedOrdersTable` site-visit action uses the RPC-backed wrapper;
   - `OrderDetail.saveAppt(...)` uses the RPC-backed wrapper;
   - no status/workflow mutation occurs.
7. Update docs.
8. Run targeted tests first, then full lint/build once at the batch end.

## Testing Plan

Service tests:

- valid site visit update returns the updated order row;
- `site_visit_at` is sent as the only order patch field;
- clearing the site visit sends `site_visit_at: null`;
- direct `.from("orders").update(...)` is not called;
- calendar event creation happens only after successful order update;
- calendar event error is logged/non-fatal;
- order update error prevents calendar event creation and surfaces safely.

Component tests:

- `UnifiedOrdersTable` invokes the RPC-backed site-visit update wrapper and preserves refresh/toast behavior.
- `OrderDetail` invokes the same wrapper and refreshes on success.

Backend smoke for later implementation, if SQL is run:

- `rpc_update_order(...)` accepts `site_visit_at`.
- missing current-company/update authority is rejected.
- `order_number` remains rejected.

## No-Go Rules

- No direct table update for active `site_visit_at` paths after 10F5B migration.
- No removal of current calendar-event behavior.
- No new backend calendar side effect until calendar projection semantics are separately designed.
- No status/workflow mutation.
- No order-number mutation.
- No RLS restriction yet.
- No broad date mutation overhaul.
- No direct helper removal before active callers are migrated and tests cover the new path.

## 10F5A Result

Phase 10F5A is complete as site-visit/date mutation design only.

Recommended decision:

- Use the existing guarded `rpc_update_order(...)` path through `updateOrderViaRpc(...)` for the first implementation.
- Preserve current frontend best-effort calendar projection after successful order update.
- Migrate both active callers in one medium 10F5B slice.

## Phase 10F5B Implementation Result

Phase 10F5B migrated the active site-visit update paths to the guarded RPC-backed update path.

Runtime changes:

- `src/lib/services/ordersService.js` now exports `updateSiteVisitAtViaRpc(orderId, siteVisitAt)`.
- The wrapper calls `updateOrderViaRpc(orderId, { site_visit_at: siteVisitAt || null })`.
- `src/lib/api/orders.js#updateSiteVisitAt(...)` now uses the RPC-backed wrapper and no longer direct-updates `orders`.
- `updateSiteVisitAt(...)` still creates a calendar event with `rpc_create_calendar_event(...)` after a successful site-visit update.
- Calendar event creation remains best-effort and non-authoritative; calendar failure logs a warning and does not fail the order date update.
- `OrderDetail.saveAppt(...)` now calls `updateSiteVisitAtViaRpc(...)` and preserves the existing refresh behavior.
- `OrderDetail.saveAppt(...)` still does not create a calendar event, matching its prior behavior.

Explicitly unchanged:

- No backend/RPC implementation changed.
- No status/workflow behavior changed.
- No RLS restriction was added.
- No transactional calendar-side-effect RPC was added.
- No broad date mutation overhaul was done.
