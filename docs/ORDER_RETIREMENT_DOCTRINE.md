# Order Retirement Doctrine

## Purpose

Falcon needs one clear doctrine for retiring orders before adding archive, cancel, void, or delete
behavior. Order retirement is operational history management, not ordinary record deletion.

This document records doctrine and the current archive/cancel/void implementation state. It does
not add runtime behavior, statuses, UI controls, smart actions, helper removal, storage deletion, or
permission changes.

## Current State

Current active order mutation paths are RPC-backed or canonical:

- create: `createOrderViaRpc(...)` -> `rpc_create_order(...)`
- edit: `updateOrderViaRpc(...)` -> `rpc_update_order(...)`
- site visit: `updateSiteVisitAtViaRpc(...)` / `updateSiteVisitAt(...)` -> `rpc_update_order(...)`
- order number override: `overrideOrderNumber(...)` -> `rpc_order_number_override(...)`
- workflow status: canonical helpers -> `rpc_transition_order_status(...)`

Direct authenticated browser writes to `public.orders` are blocked by
`20260518067000_restrict_orders_direct_writes.sql`.

Sprint 2B added guarded `rpc_order_archive(p_order_id uuid, p_reason text default null)` in
`supabase/migrations/20260518075000_order_archive_rpc.sql`. Sprint 2O added guarded
`rpc_order_cancel(p_order_id uuid, p_reason text)` and
`rpc_order_void(p_order_id uuid, p_reason text)` in
`supabase/migrations/20260518077000_order_cancel_void_rpcs.sql`.

The current active lifecycle UI is limited to controlled Order Detail actions. Archive, cancel, and
void use service wrappers that call only their backend RPCs, refresh loaded order state after
success, and do not perform optimistic status mutation or direct table writes.

Deprecated direct helpers still exist and should not be used by new work:

- `src/lib/services/ordersService.js#deleteOrder`
- `src/lib/services/ordersService.js#archiveOrder`
- `src/lib/api/orders.js#archiveOrder`

Sprint 2A source scan found no active imports of `deleteOrder` or `archiveOrder` outside their
defining files, but the exports should remain quarantined until tests and route smoke make removal
safe.

## Doctrine Summary

| Action | Meaning | Normal UI Availability | Data Removal |
|---|---|---|---|
| Archive | Retire from active operations while preserving lifecycle status, workfile, and history. | Controlled internal Order Detail action. | None |
| Cancel | Mark a legitimate order as stopped before completion. | Controlled internal Order Detail action. | None |
| Void | Administratively invalidate an erroneous, duplicate, or mistaken order record. | Controlled internal Order Detail action. | None |
| Hard delete | Physically remove order data. | Unavailable in normal UI. | Operator/service-role only if ever needed |

Hard delete must remain unavailable in normal Falcon UI.

## Archive

Use archive when an order should leave active operational worklists without changing the business
truth of what happened.

Appropriate examples:

- duplicate operational record kept for audit context;
- stale internal order no longer part of active work;
- historical workfile that should not appear in active queues;
- cleanup after migration/import validation where retention is still required.

Archive should:

- set `orders.is_archived = true`;
- preserve `orders.status`;
- preserve `orders.order_number`;
- remove the order from active list/dashboard/calendar surfaces that intentionally exclude archived
  records;
- keep direct detail access for users who still have readable order permission, unless product later
  adds a dedicated archived-order view;
- create backend-side activity such as `order.archived`;
- avoid frontend-only logging;
- avoid deleting documents, activity, notifications, assignments, calendar rows, or order number
  history.

Sprint 2B implemented the first backend archive surface as guarded
`rpc_order_archive(p_order_id uuid, p_reason text default null)`.

## Cancel

Use cancel when the order was legitimate, but the work is intentionally stopped before completion.
Cancel is a lifecycle outcome, not an archive flag.

Appropriate examples:

- client withdraws request;
- lender cancels assignment;
- property access or scope change means the order should not proceed;
- AMC/vendor work is stopped for a business reason.

Cancel is not the same as archive:

- cancel is business state;
- archive is active-surface retirement;
- a cancelled order may or may not also be archived later.

Cancel should preserve:

- `orders.order_number`, which must never be released or reused;
- order documents and private storage objects;
- order activity history plus the `order.cancelled` event;
- assignment records unless a future assignment-cancellation doctrine says otherwise;
- notification records unless a future notification policy says otherwise;
- calendar rows unless future projection rules intentionally suppress or mark them.

Current implementation:

- `rpc_order_cancel(p_order_id uuid, p_reason text)` is the backend-owned cancel path;
- `cancelOrderViaRpc(orderId, reason)` is the frontend service wrapper;
- Order Detail is the only active UI entry point;
- `orders.cancel` is required by the backend RPC;
- reason is required and trimmed;
- cancel sets only `status = 'cancelled'` and `updated_at = now()`;
- cancel writes backend-side activity event `order.cancelled` with safe payload;
- cancelled orders are excluded from active operational lists by default;
- direct Order Detail readback remains available for preserved history.

Do not add table-row cancel, bulk cancel, smart-action cancel, restore/reopen, direct order writes,
or frontend-only activity/notification side effects.

## Void

Use void when the order record is materially invalid and should remain visible only as an audit
artifact. Void is an administrative invalidation/error correction outcome, not a delete operation
and not a substitute for archive.

Appropriate examples:

- order created under the wrong entity or wrong source record;
- duplicate order opened by mistake where the record itself should be invalidated;
- invalid intake record created by mistake;
- operator correction where audit retention still matters.

Void should be rarer than cancel.

Void should preserve:

- `orders.order_number`, which must never be released or reused;
- order documents and private storage objects;
- order activity history plus the `order.voided` event;
- assignment records unless a future invalidation doctrine explicitly cancels/revokes them;
- notification records unless a future notification policy says otherwise;
- calendar rows unless future projection rules intentionally suppress or mark them.

Current implementation:

- `rpc_order_void(p_order_id uuid, p_reason text)` is the backend-owned void path;
- `voidOrderViaRpc(orderId, reason)` is the frontend service wrapper;
- Order Detail is the only active UI entry point;
- `orders.void` is required by the backend RPC;
- reason is required and trimmed;
- void sets only `status = 'voided'` and `updated_at = now()`;
- void writes backend-side activity event `order.voided` with safe payload;
- voided orders are excluded from active operational lists by default;
- direct Order Detail readback remains available for preserved history.

Do not add table-row void, bulk void, smart-action void, restore/reopen, direct order writes, or
frontend-only activity/notification side effects.

## Hard Delete

Hard delete should not be a normal product feature.

Do not add:

- hard delete buttons;
- bulk delete UI;
- direct browser `orders.delete()` paths;
- app-role `rpc_order_delete(...)` exposure;
- order-number reuse after deletion.

If hard delete is ever needed, it should be an operator/service-role remediation path with a backup,
retention/legal approval, and explicit documentation. It should not share the normal app
archive/cancel/void UX.

## Domain Effects

### Order Visibility

Archive should remove orders from active views by using the existing `is_archived` filtering
behavior. Archived order detail may remain readable for authorized users if the route has an id and
the current-company order read predicate passes.

Cancel and void are terminal statuses. They should not be normalized to `completed`, and they do not
automatically imply archive.

### Documents

Order documents are workflow assets and workfile support. Archive, cancel, and void must preserve
order document metadata and private storage objects.

Rules:

- do not hard-delete storage objects during order retirement;
- do not change document visibility scopes automatically;
- do not expose signed URLs or storage paths in retirement activity;
- keep document access governed by `order_documents` metadata, readable order scope, and document
  permissions.

### Activity

Retirement events must be backend-owned activity.

Recommended events:

- `order.archived`
- `order.cancelled`
- `order.voided`

Payload should include:

- actor app user id;
- order id;
- reason when provided;
- previous status;
- archive/cancel/void timestamp;
- source RPC name.

Payload must not include storage paths, signed URLs, private notes made visible to the wrong scope,
or broad dumped row snapshots.

### Notifications

Notifications should be sparse and backend-owned.

Archive should not necessarily notify everyone. Future notification policy can decide whether
archive events are owner/admin-only or silent. Cancel is more likely to need notifications for
assigned appraisers, reviewers, vendor packet participants, and relevant internal operators. Void
should usually be internal/admin only.

No frontend-only notification side effects should be added.

### Assignments

Archive must not silently mutate assignment packets.

First archive RPC should either:

- allow archive only when no active assignment packets require lifecycle resolution; or
- preserve assignments unchanged and clearly document that archive only removes the canonical order
  from active owner worklists.

Assignment records are preserved during archive, cancel, and void unless future doctrine says
otherwise. Future assignment-specific lifecycle work should decide whether active packets are
blocked, cancelled, revoked, or left as preserved context when an order is cancelled or voided.

### Calendar Events

Archive should remove the order from active calendar projections that derive from active orders, but
should not delete stored calendar rows.

Future cancel/void behavior should preserve calendar records by default and mark or suppress
calendar events through projection logic rather than hard-deleting history. Calendar event cleanup,
if ever needed, should be a separate backend contract.

### Order Numbers

Retirement must never release or reuse an order number.

Archive, cancel, void, and any operator hard-delete path must preserve the uniqueness and historical
meaning of issued order numbers. Existing order number override auditing remains separate and should
not be folded into retirement.

### Reporting And History

Archive should exclude orders from active operations by default but keep them available for audit,
workfile support, invoicing research, and historical reporting where permission allows.

Cancel and void should be reportable as distinct terminal outcomes once implemented. Hard delete is
not reportable because the normal app should not do it.

### Permissions

Archive uses `orders.archive`.

Do not use `orders.delete` for archive UI. Keep `orders.delete` reserved and unused by normal UI
until Falcon has a separate retention/legal deletion model, if ever.

Cancel uses `orders.cancel`. Void uses `orders.void`.

Sprint 2L adds database permission catalog rows for `orders.cancel` and `orders.void` without
template role grants. Sprint 2M adds frontend constants and readiness helpers. Sprint 2O enforces
the matching permission in backend RPCs. Sprint 2Q uses those helpers only for controlled Order
Detail visibility.

## Archive Confirmation UX Copy

Sprint 2G defined copy/state doctrine only. Sprint 2H wires this copy into the controlled internal
Order Detail archive action only. Do not reuse it in table row menus, bulk actions, restore flows,
cancel flows, or void flows without a separate design slice.

Recommended confirmation modal copy:

- Modal title: `Archive order`
- Warning language: `This removes the order from active operational lists. It does not delete the
  order, change its status, remove documents, remove activity, or release the order number.`
- Optional reason field label: `Reason for archive (optional)`
- Confirm button label: `Archive order`
- Success toast copy: `Order archived. It was removed from active lists, and its history was
  preserved.`
- Failure toast copy: `Could not archive order. No changes were made.`

Archive UI must communicate these meanings clearly:

- archived orders are hidden from active operational lists where archived orders are excluded;
- archive is not delete;
- archive preserves documents, activity, and order number history;
- archive does not change the order status;
- archive does not cancel, void, complete, or otherwise transition workflow status.

Do not use destructive-delete language such as `Delete order`, `Remove permanently`, or `Erase`.
Do not imply the order can be restored unless restore behavior is explicitly designed.

Archived Order Detail notice:

- Notice title: `Archived order`
- Notice language: `This order is preserved for history. It is hidden from active operational lists
  and archive does not change status, remove documents, remove activity, or release the order
  number.`

Sprint 2I uses this notice on direct archived Order Detail readback. The archive action should not
render for an order where `is_archived = true`.

## Cancel / Void UX Copy

Sprint 2N defines copy doctrine. Sprint 2Q wires this copy into controlled Order Detail cancel/void
actions only. Do not reuse it in table row menus, bulk actions, smart actions, restore/reopen flows,
or other surfaces without a separate design slice.

Cancel confirmation copy:

- Modal title: `Cancel order`
- Warning language: `Cancelling marks a legitimate order as stopped before completion. It does not
  delete the order, release the order number, or remove documents/activity.`
- Reason field label: `Reason for cancellation`
- Confirm button label: `Cancel order`
- Success toast copy: `Order cancelled. Its history was preserved.`
- Failure toast copy: `Could not cancel order. No changes were made.`

Void confirmation copy:

- Modal title: `Void order`
- Warning language: `Voiding marks this order as administratively invalid, such as a duplicate,
  mistake, or record opened in error. It does not delete the order, release the order number, or
  remove documents/activity.`
- Reason field label: `Reason for voiding`
- Confirm button label: `Void order`
- Success toast copy: `Order voided. Its history was preserved.`
- Failure toast copy: `Could not void order. No changes were made.`

Cancel and void reason fields should be required unless future doctrine explicitly changes that
rule. Reasons must be persisted only by backend-owned lifecycle RPCs, never by frontend-only
activity or direct order mutation paths.

## Archived Readback Surface Rules

Sprint 2J completes the current archive lifecycle for internal Order Detail use. The approved
runtime behavior is:

- a permitted internal user archives from Order Detail only;
- the backend sets `is_archived = true` without changing status or order number;
- active operational lists exclude the archived row by default;
- direct Order Detail readback remains available for preserved history;
- the archived detail notice is shown;
- the archive action no longer renders.

Future archived-order readback surfaces must follow these rules:

- archived orders may appear only in explicit `Archived`, `History`, or `Admin` surfaces;
- archived orders must not be mixed into default active queues, dashboards, worklists, calendar
  pressure surfaces, or operational inventory unless `includeArchived` is intentionally set by an
  approved archived/history surface;
- `includeArchived` should stay confined to low-level order read APIs until a future surface is
  explicitly whitelisted;
- restore/unarchive is not supported;
- archived records are read-only preserved-history records by default;
- future lifecycle actions against archived records require their own doctrine, permission, backend
  RPC, activity behavior, and UI design.

Do not add archived list UI, restore/unarchive, archive filters, table row archive, bulk archive, or
active queue opt-ins as incidental follow-up work.

## Backend Archive Implementation

Sprint 2B implemented the first runtime slice:

1. Added `rpc_order_archive(p_order_id uuid, p_reason text default null)`.
2. Requires an authenticated caller, not `anon`, `public`, or service-role execution.
3. Requires current app user identity, current company context, and active current-company
   membership.
4. Requires the order to belong to the current company.
5. Requires readable order scope.
6. Requires `orders.archive`.
7. Returns unchanged metadata for an already archived order.
8. Sets only `is_archived = true` and `updated_at = now()`.
9. Writes backend-side `order.archived` activity with safe payload containing `order_id` and
   optional `reason`.
10. Returns safe order metadata only.

The implementation preserves:

- `orders.status`;
- `orders.order_number`;
- order documents and storage objects;
- assignments;
- notifications;
- calendar rows;
- existing activity history.

No archive UI, frontend wrapper, cancel behavior, void behavior, delete behavior, status mutation,
or compatibility hack was added.

Sprint 2E added the frontend service wrapper only:

- `archiveOrderViaRpc(orderId, reason = null)` calls `rpc_order_archive` with `p_order_id` and
  `p_reason`;
- deprecated `archiveOrder(...)` and `deleteOrder(...)` helpers remain throwing quarantine stubs;
- direct archive/delete mutations remain blocked by source-scan tests;
- no UI activation was added.

Sprint 2H added the first controlled internal UI entry point:

- Order Detail renders `Archive order` only when `canArchiveOrder(order, permissions)` allows it;
- the confirmation uses the Sprint 2G copy;
- submission calls only `archiveOrderViaRpc(orderId, reason)`;
- success refreshes loaded order state instead of applying an optimistic local mutation;
- failure leaves the modal open and reports that no changes were made;
- no table-row archive, bulk archive, hard delete, restore/unarchive, cancel, void, status mutation,
  direct table write, RLS change, or migration was added.

Sprint 2I hardened archived visibility after the controlled UI entry point:

- active list queries exclude archived rows by default;
- future archived readback surfaces must opt in explicitly with `includeArchived`;
- Order Detail still loads archived orders directly for preserved history;
- shared order mapping carries `is_archived`;
- archived Order Detail shows the archive notice and hides the archive action;
- no restore/unarchive, table-row archive, bulk archive, hard delete, cancel, void, status mutation,
  direct table write, RLS change, or migration was added.

Sprint 2J documented the current internal Order Detail archive lifecycle as complete and added
future archived-list guardrails. `includeArchived` remains a low-level order read API option only;
active components must not use it unless a future archived/history surface is explicitly approved
and whitelisted in the source-scan guard.

Sprint 2K defines cancel/void doctrine before implementation:

- `cancel` means a legitimate order is stopped before completion;
- `void` means an administrative invalidation, error, duplicate, or mistaken order record;
- archive remains active-surface retirement without lifecycle status mutation;
- hard delete remains forbidden in normal UI;
- then-reserved backend events were `order.cancelled` and `order.voided`;
- then-reserved permissions were `orders.cancel` and `orders.void`.

No migration, UI, RPC, status constant, smart action, source-scan, permission seed, RLS, or runtime
behavior changed in Sprint 2K.

Sprint 2L seeds `orders.cancel` and `orders.void` as permission catalog rows only:

- no role grants are added;
- owner/all-permission resolution can see them through the normal permission catalog;
- company role/permission assignment systems can present/assign them later;
- no frontend constants, RPCs, UI, statuses, smart actions, RLS policies, or behavior are added.

Sprint 2M adds frontend static permission constants and pure readiness helpers only:

- `PERMISSIONS.ORDERS_CANCEL = 'orders.cancel'`;
- `PERMISSIONS.ORDERS_VOID = 'orders.void'`;
- `canCancelOrder(order, permissions)`;
- `canVoidOrder(order, permissions)`.

The readiness helpers deny missing orders, archived orders, loading/error permission state, and
missing matching permission keys. They do not call backend RPCs, mutate order status, write data,
render UI, or imply cancel/void behavior exists.

Sprint 2N defines cancel/void confirmation copy doctrine only:

- cancel modal title `Cancel order`, required reason label `Reason for cancellation`, confirm label
  `Cancel order`, success toast `Order cancelled. Its history was preserved.`, and failure toast
  `Could not cancel order. No changes were made.`;
- void modal title `Void order`, required reason label `Reason for voiding`, confirm label
  `Void order`, success toast `Order voided. Its history was preserved.`, and failure toast
  `Could not void order. No changes were made.`;
- both warnings must explain that the action does not delete the order, release the order number, or
  remove documents/activity.

No runtime helper, UI, RPC, migration, status mutation, source-scan change, or active behavior was
added in Sprint 2N.

Sprint 2O implements backend-only guarded cancel/void lifecycle RPCs:

- `rpc_order_cancel(p_order_id uuid, p_reason text)`;
- `rpc_order_void(p_order_id uuid, p_reason text)`.

Both RPCs require authenticated current-company access, current app user identity, active
membership, readable order scope, a trimmed non-empty reason, and the matching `orders.cancel` or
`orders.void` permission. Both deny archived orders. Cancel sets only `status = 'cancelled'` and
`updated_at = now()` and writes `order.cancelled` activity. Void sets only `status = 'voided'` and
`updated_at = now()` and writes `order.voided` activity. Payloads are safe and limited to
`order_id` and `reason`.

Sprint 2P adds frontend service wrappers only:

- `cancelOrderViaRpc(orderId, reason)`;
- `voidOrderViaRpc(orderId, reason)`.

The wrappers call only their matching backend RPC, require a non-empty reason, trim the reason
before sending it, throw RPC errors for callers to handle, and do not use direct table writes. The
CRUD source scan restricts cancel/void wrapper reachability to the service file, tests, and the
controlled Order Detail surface.

Sprint 2Q adds the first controlled internal cancel/void UI entry points on Order Detail only:

- `Cancel order` renders only when `canCancelOrder(order, permissions)` allows it;
- `Void order` renders only when `canVoidOrder(order, permissions)` allows it;
- confirmation uses the Sprint 2N copy;
- reason is required, trimmed before submit, and the confirm button stays disabled while empty;
- submission calls only `cancelOrderViaRpc(order.id, reason)` or
  `voidOrderViaRpc(order.id, reason)`;
- success uses doctrine toast copy and refreshes loaded order state;
- failure shows the doctrine failure copy inline and does not mutate local status;
- actions disappear after a refreshed `cancelled` or `voided` terminal state because readiness
  helpers deny those statuses.

No table row action, bulk action, hard delete, restore/reopen, direct write, RLS change, migration,
or smart-action behavior is added in Sprint 2Q.

Sprint 2R defines and enforces post-cancel/void visibility:

- `cancelled` orders are excluded from active operational queues/lists by default;
- `voided` orders are excluded from active operational queues/lists by default;
- direct Order Detail remains loadable for preserved history;
- cancelled Order Detail shows `Cancelled order` preserved-history notice;
- voided Order Detail shows `Voided order` preserved-history notice;
- archive, cancel, and void actions do not render after `cancelled` or `voided`;
- low-level `includeRetiredLifecycle` exists only for future explicit History/Admin readback
  surfaces and is blocked from active components by source scan.

Do not add restore/reopen, history list UI, table-row lifecycle actions, bulk lifecycle actions,
direct writes, RLS changes, or migrations as part of post-cancel/void readback hardening.

Sprint 2S locks the archive/cancel/void lifecycle as complete for the current scope:

- backend RPCs own archive, cancel, and void mutations;
- service wrappers may call only the matching backend RPCs;
- Order Detail is the only active UI surface for archive, cancel, and void;
- active operational lists exclude archived, cancelled, and voided orders by default;
- direct Order Detail readback remains available for preserved history;
- future History/Admin surfaces must explicitly opt into archived or retired lifecycle readback
  through low-level flags and source-scan whitelists;
- hard delete is forbidden in normal UI;
- restore, reopen, and unarchive are not supported;
- source scans block direct delete/archive writes and restrict lifecycle wrappers plus
  `includeArchived` / `includeRetiredLifecycle` readback flags.

Do not expand lifecycle behavior beyond this locked scope without a separate doctrine, permission,
backend RPC, activity, source-scan, and UI design slice.

Sprint 2B validation:

- local migration SQL applied successfully directly against the local Postgres container after the
  Supabase CLI reset path was blocked;
- function signature verified as `rpc_order_archive(uuid,text) returns jsonb`;
- execute grants verified for `authenticated = true`, `anon = false`, `public = false`, and
  `service_role = false`;
- full `supabase db reset` remained blocked by the Supabase storage image pull failure for
  `public.ecr.aws/supabase/storage-api:optimize-existing-functions-again`.

No repo SQL test harness exists yet. Future SQL/browser smoke should cover unauthenticated denial,
missing `orders.archive` denial, authorized archive, retained status/order number, and
`order.archived` activity.

## Helper Quarantine

Deprecated helpers that should be quarantined harder after `rpc_order_archive(...)` exists:

- `src/lib/services/ordersService.js#deleteOrder`: replace with a throwing deprecated stub or remove
  after import scans confirm no callers.
- `src/lib/services/ordersService.js#archiveOrder`: rewrite to call the archive RPC or remove after
  callers are migrated.
- `src/lib/api/orders.js#archiveOrder`: rewrite to call the archive RPC or remove after callers are
  migrated.

Do not remove these helpers before route/import proof and focused tests confirm no active caller
depends on them.

## Recommended Test Guards

Source-scan guard additions:

- fail if any non-watchlisted frontend file imports `deleteOrder` from order service modules;
- fail if any non-watchlisted frontend file imports `archiveOrder` from order service modules;
- fail if any frontend file performs direct `supabase.from('orders').delete(...)`;
- fail if any frontend file performs direct `supabase.from('orders').update({ is_archived: ... })`
  outside explicitly quarantined legacy helper files;
- keep direct authenticated `orders` insert/update/delete scan coverage in the CRUD surface scan.

Backend smoke for the archive RPC should later cover:

- owner/admin with `orders.archive` can archive current-company readable order;
- user without `orders.archive` is denied;
- cross-company order is denied;
- direct authenticated `orders` update/delete remain blocked;
- archive writes `order.archived` activity;
- archived order is excluded from active list projections;
- documents remain intact and list/download behavior remains governed by document permissions.

## Deferred Decisions

Defer these until after the current archive/cancel/void lifecycle scope is stable:

- whether archived/cancelled/voided records need explicit History/Admin readback surfaces;
- whether any future restore/reopen/unarchive lifecycle should exist at all;
- whether archived detail needs a dedicated route beyond the current preserved-history notice;
- whether active assignment packets block archive or only cancel/void;
- whether notifications are emitted for archive by default.

## Anti-Patterns

- hard delete UI;
- treating cancel as completed;
- using archive to hide data that should have been corrected through audit-safe override flows;
- deleting documents or storage objects during order retirement;
- frontend-only activity or notification side effects;
- exposing archive/delete through direct table helpers;
- using `orders.delete` as a normal product permission;
- adding restore/reopen/unarchive behavior without a separate backend-owned lifecycle design;
- mixing archived, cancelled, or voided orders into active queues without explicit History/Admin
  opt-in.
