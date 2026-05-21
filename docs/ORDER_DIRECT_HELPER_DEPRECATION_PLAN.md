# Order Direct Helper Deprecation Plan

## Purpose

Phase 10F6 audits remaining exported direct order helpers after active create, edit, explicit order-number override, and active site-visit update paths moved to guarded RPC-backed paths.

This is documentation-only plus read-only inspection. It does not add runtime code changes, migrations, backend behavior changes, frontend behavior changes, tests, RLS/RPC changes, routes, registries, UI changes, or helper removal.

## Sources Inspected

Docs inspected:

- `docs/ORDER_MUTATION_REMAINING_PATH_AUDIT.md`
- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md`
- `docs/SITE_VISIT_DATE_RPC_MIGRATION_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Code inspected:

- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/features/orders/api.js`
- `src/features/orders/actions.js`
- `src/lib/utils/updateOrderStatus.js`
- call sites for `createOrder(...)`, `updateOrder(...)`, `deleteOrder(...)`, `archiveOrder(...)`, `setOrderStatus(...)`, `updateOrderDates(...)`, `assignParticipants(...)`, and `updateSiteVisitAt(...)`
- tests importing order service/API helpers

## Classification Terms

- Active primary path: used by the current core create/edit/order-number/site-visit workflow.
- Active secondary path: user-facing but not the main form path.
- Legacy/unmounted: exported or present in UI code, but no mounted active caller was found in this inspection.
- Test-only: used only by tests.
- Unknown: no active caller found, but export is broad enough that removal should wait for a focused cleanup pass.
- Safe to deprecate: no active caller found and a safer replacement exists.
- Must migrate first: active user-facing caller remains.

## Helper Classification Table

| helper/module | Direct table write? | Current callers | Active user-facing? | RPC replacement exists? | Risk level | Recommended action | Timing |
|---|---:|---|---:|---:|---|---|---|
| `ordersService.createOrder(payload)` | Yes, direct insert | No active caller found; `OrderForm` uses `createOrderViaRpc(...)` | No | Yes, `createOrderViaRpc(...)` -> `rpc_create_order(...)` | Medium if reused | Mark deprecated/quarantined in code comments or dev warning; do not remove until import scan/test pass is dedicated | 10F7 |
| `ordersService.createOrderViaRpc(payload)` | No | `OrderForm` create; service tests | Yes, primary | n/a | Low | Keep canonical create wrapper | Done/monitor |
| `ordersService.updateOrder(orderId, patch)` | Yes, direct update | No active `OrderForm` caller after 10F3C; legacy alias `updateOrderStatus(...)` in same module calls it | Not confirmed | Yes, `updateOrderViaRpc(...)` -> `rpc_update_order(...)` | Medium if reused | Deprecate direct helper and replace/remove `updateOrderStatus(...)` alias before RLS restriction | 10F7 |
| `ordersService.updateOrderViaRpc(orderId, patch)` | No | `OrderForm` edit; `updateSiteVisitAtViaRpc(...)`; service tests | Yes, primary | n/a | Low | Keep canonical normal edit/update wrapper | Done/monitor |
| `ordersService.updateSiteVisitAtViaRpc(orderId, siteVisitAt)` | No | `OrderDetail.saveAppt(...)`; `src/lib/api/orders.js#updateSiteVisitAt(...)`; service tests | Yes | n/a | Low | Keep canonical site-visit date wrapper | Done/monitor |
| `ordersService.overrideOrderNumber(...)` | No | `AssignmentFields` explicit override UI; service tests | Yes | n/a | Low | Keep canonical explicit override wrapper | Done/monitor |
| `ordersService.deleteOrder(orderId)` | Yes, direct delete | No active caller found | No | Baseline delete RPC exists only as legacy/text-id compatibility; archive-first design still needed | Medium/High if reused | Do not expose casually; mark deprecated or internal-only; design archive/delete RPC before removal/RLS restriction | 10F7 or archive/delete batch |
| `ordersService.archiveOrder(orderId)` | Yes, direct `is_archived` update | No active caller found | No | Baseline `rpc_order_archive(uuid)` exists | Medium | Deprecate direct helper; decide archive RPC wrapper semantics before any UI wiring | Archive/delete batch |
| `ordersService.setOrderStatus(orderId, status)` | Yes, direct status update | No active caller found; legacy aliases call it | No | Yes, canonical workflow helpers -> `rpc_transition_order_status(...)` | Medium/High if reused | Quarantine; do not route active UI through it | 10F7 |
| `ordersService.startReview(...)`, `requestRevisions(...)`, `markComplete(...)`, `putOnHold(...)`, `resumeInProgress(...)`, `sendToClient(...)`, `markDelivered(...)` | Mixed; several call `setOrderStatus(...)` | No active caller found | No | Yes, canonical workflow helpers for supported transitions | Medium | Deprecate or rewrite aliases to canonical transition helpers only if compatibility needed | 10F7 |
| `ordersService.updateOrderDates(...)` | Yes, direct date update | No active caller found | No | Yes, `updateSiteVisitAtViaRpc(...)`, `updateOrderViaRpc(...)`, and `rpc_update_order_dates(...)` | Medium | Deprecate/quarantine after 10F5B; keep until direct helper cleanup pass | 10F7 |
| `ordersService.assignParticipants(...)`, `assignAppraiser(...)`, `assignReviewer(...)`, `updateAssignees(...)` | Yes, direct appraiser/reviewer update | No active caller found | No | Partial: `rpc_assign_order(...)` for appraiser assignment; reviewer path needs design | Medium | Do not remove until assignment semantics are designed; add deprecation comments/dev warnings first | Assignment batch or 10F7 annotations |
| `ordersService.updateOrderStatus(orderId, status, extra)` | Yes via `updateOrder(...)` | No active caller found | No | Yes, canonical workflow transition helpers | Medium/High if reused | Deprecate; remove direct status fallback before RLS restriction | 10F7 |
| `ordersService.sendOrderToReview(...)`, `sendOrderBackToAppraiser(...)`, `completeOrder(...)`, `clearReview(...)`, `requestFinalApproval(...)`, `markReadyForClient(...)` | No direct mutation; read-before-RPC plus `rpc_transition_order_status(...)` | `UnifiedOrdersTable`, `QuickActionsDrawerPanel`, `ReviewerActionCell` for some actions | Yes | n/a | Low | Keep canonical smart workflow helpers | Done/monitor |
| `ordersService.isOrderNumberAvailable(...)` | No mutation; direct global table count | No active caller found after v2 availability wiring | No | Yes, `isOrderNumberAvailableV2(...)` | Medium as stale authority if reused | Deprecate; keep v2 as active field path | 10F7 |
| `ordersService.isOrderNumberAvailableV2(...)` | No mutation; RPC read | `OrderNumberField`, `AssignmentFields`, tests | Yes | n/a | Low | Keep canonical availability helper | Done/monitor |
| `src/lib/api/orders.js#updateSiteVisitAt(...)` | No direct write after 10F5B; uses RPC-backed wrapper plus calendar RPC | `UnifiedOrdersTable`; API tests | Yes, secondary | Yes, delegates to `updateSiteVisitAtViaRpc(...)` | Low | Keep as compatibility helper for table/calendar behavior; eventually move to service layer if desired | Monitor |
| `src/lib/api/orders.js#updateOrderStatus(...)` | Yes, direct status update | No active caller found | No | Yes, canonical workflow helpers | Medium/High if reused | Deprecate/quarantine | 10F7 |
| `src/lib/api/orders.js#updateOrderDates(...)` | Yes, direct date update | No active caller found | No | Yes, RPC-backed date/site-visit wrappers | Medium | Deprecate/quarantine | 10F7 |
| `src/lib/api/orders.js#assignAppraiser(...)`, `assignClient(...)`, `bulkAssignAppraiser(...)` | Yes, direct assignment/client updates | No active caller found | No | Partial; assignment/client attach semantics need specific wrappers | Medium | Add comments/dev warnings; do not remove before assignment/client mutation design | Assignment batch |
| `src/lib/api/orders.js#bulkUpdateStatus(...)` | Yes, direct bulk status update | No active caller found | No | No safe bulk workflow equivalent confirmed | High if reused | Quarantine; do not replace with broad bulk RPC without workflow design | 10F7 |
| `src/lib/api/orders.js#createOrder(payload)` | Yes, direct insert, includes `order_number` if supplied | No active caller found | No | Yes, `createOrderViaRpc(...)` | Medium/High if reused | Deprecate/quarantine; this is unsafe for future browser create | 10F7 |
| `src/lib/api/orders.js#archiveOrder(orderId)` | Yes, direct archive update | No active caller found | No | Baseline archive RPC exists | Medium | Defer to archive/delete batch | Later batch |
| `src/features/orders/actions.js#updateOrderStatus(...)` | No direct table write, but calls quarantined legacy RPC | Only `OrderActionsPanel`, which appears legacy/unmounted | No active caller found | Yes, canonical workflow helpers | Medium | Keep quarantined; remove or rewrite if `OrderActionsPanel` is revived | 10F7/E cleanup |
| `src/features/orders/actions.js#assignOrder(...)` | No direct table write; calls assignment RPC | Only `OrderActionsPanel`, which appears legacy/unmounted | No active caller found | Yes, but argument semantics should be verified | Low/Medium | Leave with legacy panel until cleanup; prefer canonical assignment wrapper if revived | E cleanup |
| `src/features/orders/actions.js#updateDueDates(...)` | No direct table write; calls `rpc_update_due_dates` name | Only `OrderActionsPanel`, which appears legacy/unmounted | No active caller found | Canonical inspected date RPC is `rpc_update_order_dates(...)` | Medium if revived | Quarantine or align during date helper cleanup | 10F7/E cleanup |
| `src/lib/utils/updateOrderStatus.js` | Yes, direct status fallback if legacy RPC fails | No active caller found | No | Yes, canonical workflow helpers | High if reused | Deprecate/remove direct fallback before RLS restriction | 10F7 |
| `src/features/orders/api.js` | No mutation found in inspected file | `useOrders` read hook | Yes, read-only | n/a | Low | Keep out of mutation deprecation except import hygiene | Monitor |

## Remaining Helper / Caller Summary

Active primary paths are already RPC-backed:

- create: `createOrderViaRpc(...)`;
- normal edit: `updateOrderViaRpc(...)`;
- explicit order-number override: `overrideOrderNumber(...)`;
- site visit from `OrderDetail`: `updateSiteVisitAtViaRpc(...)`;
- active smart workflow actions: canonical workflow helpers backed by `rpc_transition_order_status(...)`.

Active secondary path:

- `src/lib/api/orders.js#updateSiteVisitAt(...)` is still called by `UnifiedOrdersTable`, but after 10F5B it delegates to the RPC-backed site-visit wrapper and only retains best-effort calendar projection.

Legacy/unmounted or no active caller found:

- direct create/update/delete/archive helpers in `ordersService`;
- direct status/date/assignment helpers in `ordersService`;
- direct write helpers in `src/lib/api/orders.js`, except `updateSiteVisitAt(...)` which is now RPC-backed;
- `OrderActionsPanel` plus `src/features/orders/actions.js`;
- `src/lib/utils/updateOrderStatus.js`.

Test-only usage found:

- RPC wrappers and `updateSiteVisitAt(...)` are covered by targeted tests.
- No tests were found that require preserving direct table writes as active behavior.

## Recommended Bigger-Slice Actions

### Batch 1: Deprecation Annotations And Tests

Add explicit comments and, where appropriate, development-only warnings to exported direct helpers that now have no active caller.

Targets:

- `ordersService.createOrder(...)`
- `ordersService.updateOrder(...)`
- `ordersService.deleteOrder(...)`
- `ordersService.archiveOrder(...)`
- `ordersService.setOrderStatus(...)`
- `ordersService.updateOrderDates(...)`
- `ordersService.assignParticipants(...)` and convenience wrappers
- `ordersService.updateOrderStatus(...)`
- stale `isOrderNumberAvailable(...)`
- direct write helpers in `src/lib/api/orders.js`
- `src/lib/utils/updateOrderStatus.js`

Warnings should be development-only and should not fire from canonical wrappers. Prefer comments for helpers that are only legacy compatibility exports and may be removed soon.

### Batch 2: Legacy Surface Cleanup

Remove or quarantine unmounted legacy UI/adapters if import scans remain clean:

- `OrderActionsPanel`
- `src/features/orders/actions.js`
- `src/lib/utils/updateOrderStatus.js`

If any are retained, route status/date behavior through canonical helpers rather than direct fallback or quarantined RPC names.

### Batch 3: Assignment / Archive / Delete Design

Do not remove assignment/archive/delete helpers solely because no caller was found. First define the intended future behavior:

- appraiser assignment through `rpc_assign_order(...)`;
- reviewer assignment through a reviewed guarded path;
- archive through explicit archive RPC semantics;
- hard delete as exceptional/admin-only or removed from UI-facing helpers.

### Batch 4: RLS Restriction Design

Proceed only after active direct writes are gone or explicitly quarantined.

RLS restriction should be a backend design slice, not part of helper cleanup. It must include SQL smoke tests for canonical RPC create/edit/status/site-visit/override paths.

## Recommended 10F7 Implementation Batch

Recommended 10F7: **deprecation annotations and usage guards only**.

Reason:

- The active user-facing create/edit/site-visit/order-number/status paths are already RPC-backed or canonical.
- No active caller was found for most direct helpers.
- Assignment/archive/delete semantics still need dedicated design before replacement.
- RLS restriction should wait until helper deprecation and any legacy surface cleanup are complete.

Suggested 10F7 scope:

- Add clear deprecation comments to direct helper exports.
- Add targeted development-only warnings for high-risk direct helper calls if that fits project conventions.
- Add or adjust tests to ensure active `OrderForm`, `UnifiedOrdersTable` site-visit, `OrderDetail` site-visit, and explicit override paths do not call direct helpers.
- Do not remove helpers yet unless import scans and tests prove they are unused.
- Do not restrict RLS.

## Do Not Do Yet

- Do not restrict direct table RLS in the deprecation batch.
- Do not remove exported helpers before import scans and targeted tests cover active paths.
- Do not replace assignment helpers without assignment semantics review.
- Do not replace archive/delete helpers without archive/delete semantics review.
- Do not revive `OrderActionsPanel` or legacy status utilities.
- Do not add broad bulk mutation RPCs.
- Do not reintroduce `order_number` into normal create/edit payloads.

## 10F6 Result

Phase 10F6 is complete as direct helper deprecation and usage planning.

Current decision:

- Active core order mutation paths are materially RPC-backed.
- Remaining direct helpers should be deprecated/guarded as a grouped cleanup batch before RLS restriction.
- RLS restriction remains a later backend design and implementation phase.

## Phase 10F7 Implementation Result

Phase 10F7 added deprecation annotations and development-only usage guards without removing helpers.

Implemented guard behavior:

- `src/lib/services/ordersService.js` now has a `warnDeprecatedDirectOrderMutation(...)` helper.
- High-risk direct helpers in `ordersService` call the guard in development only:
  - `createOrder(...)`
  - `updateOrder(...)`
  - `deleteOrder(...)`
  - `archiveOrder(...)`
  - `setOrderStatus(...)`
  - `updateOrderDates(...)`
  - `assignParticipants(...)`
  - `updateOrderStatus(...)`
- Canonical RPC-backed wrappers do not warn:
  - `createOrderViaRpc(...)`
  - `updateOrderViaRpc(...)`
  - `updateSiteVisitAtViaRpc(...)`
  - `overrideOrderNumber(...)`
  - workflow transition helpers backed by `rpc_transition_order_status(...)`
- `src/lib/api/orders.js` now has a matching development-only guard for high-risk direct mutation helpers.
- `src/lib/api/orders.js#updateSiteVisitAt(...)` does not warn because it is intentionally retained as a compatibility helper that delegates to the RPC-backed site-visit wrapper and preserves best-effort calendar projection.
- `src/features/orders/actions.js` now warns in development when legacy action adapters are used.
- `src/lib/utils/updateOrderStatus.js` now warns in development before using its legacy direct status fallback path.

Explicitly unchanged:

- No helpers were removed.
- No active create/edit/site-visit/order-number/status behavior changed.
- No backend/RPC implementation changed.
- No RLS restriction was added.
- Assignment/archive/delete replacement remains deferred to dedicated semantics design.

Validation coverage added/updated:

- Active create path still calls `createOrderViaRpc(...)` and does not call deprecated direct `createOrder(...)`.
- Active edit path still calls `updateOrderViaRpc(...)` and does not call deprecated direct `updateOrder(...)`.
- Active site-visit path still uses the RPC-backed wrapper and preserves best-effort calendar behavior.
- Development warnings are emitted for direct helpers under test.
- RPC-backed wrappers remain warning-free.

## Phase 10F8 Closeout Result

Phase 10F8 is complete in `docs/ORDER_RPC_ONLY_MUTATION_CLOSEOUT.md`.

Closeout decision:

- Active primary order mutation paths are RPC-backed or canonical.
- Deprecated direct helpers remain exported and guarded in development.
- Remaining helper risk is documented and acceptable as a compatibility state before RLS design.
- Falcon is ready for direct-write RLS restriction design, but not immediate restriction implementation.
- Next phase should perform route/import smoke and SQL restriction design before changing policies.
