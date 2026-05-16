# Order Workflow Status Write Audit

## Purpose

This audit documents every currently identified path that can change order workflow status. The goal is to harden Falcon's order lifecycle before further productization.

This document is intentionally audit-focused. It tracks current risk, completed hardening work, and remaining cleanup targets.

## Current hardening status

Status: **Primary workflow helpers use backend RPC; generic status usage audit next.**

Completed:

- Added canonical workflow transition map: `src/lib/workflow/orderWorkflow.js`.
- Added workflow guard helpers: `src/lib/workflow/orderWorkflowGuards.js`.
- Wrapped primary workflow helpers in `src/lib/services/ordersService.js`:
  - `sendOrderToReview` → `submit_to_review`
  - `sendOrderBackToAppraiser` → `request_revisions`
  - `clearReview` → `approve_review`
  - `requestFinalApproval` → `request_final_approval`
  - `markReadyForClient` → `ready_for_client`
  - `completeOrder` → `complete`
- Routed live drawer quick actions through guarded workflow helpers:
  - `src/components/orders/view/QuickActionsDrawerPanel.jsx`
- Routed reviewer shortcut actions through guarded workflow helpers:
  - `src/components/orders/table/ReviewerActionCell.jsx`
- Quarantined the unsafe freeform `OrderActionsPanel` by removing its public barrel export from:
  - `src/features/orders/index.js`
- Added guardrail comments to legacy/generic status helpers:
  - `src/lib/api/orders.js`
  - `src/lib/utils/updateOrderStatus.js`
  - `src/features/orders/actions.js`
- Created and applied `rpc_transition_order_status`.
- Validated backend transition validation and permission enforcement.
- Validated missing permission rejection and invalid transition rejection.
- Validated happy path `submit_to_review`.
- Disabled duplicate legacy order activity triggers.
- Confirmed RPC transitions now produce one clean `status_changed` activity row.
- Migrated primary workflow helpers to `rpc_transition_order_status`:
  - `sendOrderToReview`
  - `sendOrderBackToAppraiser`
  - `clearReview`
  - `requestFinalApproval`
  - `markReadyForClient`
  - `completeOrder`
- Tested full lifecycle through backend RPC: `new` -> `in_review` -> `review_cleared` -> `pending_final_approval` -> `ready_for_client` -> `completed`.
- Tested request revisions path through backend RPC: `in_review` -> `needs_revisions`.
- Confirmed activity logging remains clean with one canonical `status_changed` row per new transition.
- Confirmed notification/toast behavior is preserved.

## Canonical workflow reference

The canonical transition map lives at:

```txt
src/lib/workflow/orderWorkflow.js
```

That file defines the intended workflow transitions, required permissions, actor roles, and notification event keys.

The guard helpers live at:

```txt
src/lib/workflow/orderWorkflowGuards.js
```

Those helpers validate transition keys and current statuses before workflow helpers update order status.

## Current canonical UI path

### `src/features/orders/UnifiedOrdersTable.jsx`

Primary table workflow actions call named service helpers from `src/lib/services/ordersService.js`:

- `sendOrderToReview`
- `sendOrderBackToAppraiser`
- `clearReview`
- `requestFinalApproval`
- `markReadyForClient`
- `completeOrder`

Risk level: **Low / improving**

Reason: the main table path routes through Smart Actions and guarded service helpers. Permission fallback remains intentionally preserved for MVP compatibility. The primary workflow helpers now call the backend transition RPC.

Recommended action: **Audit remaining generic status helpers and legacy RPCs before restricting direct status writes.**

## Status write surfaces

### `src/lib/services/ordersService.js`

Primary guarded workflow helpers:

- `sendOrderToReview(orderId, actorId, options)`
- `sendOrderBackToAppraiser(orderId, actorId, options)`
- `clearReview(orderId, note)`
- `requestFinalApproval(orderId, note)`
- `markReadyForClient(orderId, note)`
- `completeOrder(orderId, actorId)`

Remaining generic or legacy status helpers:

- `setOrderStatus(orderId, status)`
- `updateOrderStatus(orderId, status, extra)`
- `startReview(orderId, note)`
- `requestRevisions(orderId, note)`
- `markComplete(orderId, note)`
- `putOnHold(orderId, note)`
- `resumeInProgress(orderId, note)`
- `sendToClient(orderId, note)`
- `markDelivered(orderId, note)`

Risk level: **Medium**

Reason: the active workflow path is guarded, but generic helpers still exist for compatibility and can bypass transition semantics if reintroduced into UI.

Recommended action: **Do not use generic setters for normal workflow UI. Later, retire or restrict them behind explicit admin override/backfill semantics.**

## Legacy / alternate paths

### `src/lib/api/orders.js`

Identified status write helpers:

- `updateOrderStatus(orderId, next)`
- `bulkUpdateStatus(orderIds, status)`
- `createOrder(payload)` can set initial status from payload

Risk level: **Medium / documented**

Reason: these functions directly update the `orders` table. Guardrail comments now warn against using them for normal workflow lifecycle actions.

Recommended action: **Keep only for compatibility/admin/backfill until usage is proven gone. Eventually route bulk/admin status changes through explicit override workflow.**

### `src/lib/utils/updateOrderStatus.js`

Identified behavior:

- Attempts `rpc_update_order_status` first.
- Falls back to direct `orders.status` update.
- Falls back to legacy `logOrderEvent` after direct update.

Risk level: **Medium / documented**

Reason: RPC-first is directionally good, but fallback behavior keeps legacy audit paths alive and bypasses the frontend workflow transition map. Guardrail comments now warn against normal lifecycle usage.

Recommended action: **Deprecate or rewrite after a canonical transition RPC exists.**

### `src/features/orders/actions.js`

Identified behavior:

- `updateOrderStatus(orderId, newStatus, note)` calls `rpc_update_order_status`.
- `assignOrder` calls `rpc_assign_order`.
- `updateDueDates` calls `rpc_update_due_dates`.

Risk level: **Medium / documented**

Reason: RPC usage is better than direct table updates, but the status wrapper still accepts arbitrary new status and does not reference the canonical workflow transition map. Guardrail comments now warn against normal lifecycle usage.

Recommended action: **Keep as legacy RPC wrapper only if no active UI imports remain. Otherwise replace usage with guarded workflow helpers.**

## UI drift points

### `src/components/orders/table/ReviewerActionCell.jsx`

Current behavior:

- Reviewer shortcut buttons now call guarded workflow helpers:
  - `sendOrderBackToAppraiser`
  - `clearReview`

Risk level: **Low**

Recommended action: **Eventually replace with shared Smart Actions renderer to avoid duplicated action UI.**

### `src/components/orders/view/QuickActionsDrawerPanel.jsx`

Current behavior:

- Appraiser/reviewer quick actions now call guarded workflow helpers:
  - `sendOrderToReview`
  - `clearReview`
  - `sendOrderBackToAppraiser`

Risk level: **Low / medium**

Reason: status writes are now guarded, but this component still duplicates action rendering outside the main Smart Actions model.

Recommended action: **Eventually replace with shared Smart Actions descriptors.**

### `src/features/orders/OrderActionsPanel.jsx`

Current behavior:

- Contains a freeform status input and calls `features/orders/actions.updateOrderStatus`.
- No longer exported from `src/features/orders/index.js`.

Risk level: **Medium / quarantined**

Reason: the file still exists, but normal barrel imports no longer expose it.

Recommended action: **Keep quarantined. Later delete, move to dev-only tooling, or replace with explicit admin override workflow.**

## Productization risks remaining

The primary workflow path is now guarded and backed by `rpc_transition_order_status`, but remaining productization risks are:

1. Generic status helpers still exist for compatibility and could be misused later.
2. Permission context is not yet passed into service-layer guards; current calls preserve MVP fallback behavior.
3. Workflow action rendering is still duplicated across table/drawer/reviewer shortcut surfaces.
4. Company-specific workflow settings do not exist yet.
5. `rpc_update_order_status` must remain until the generic usage audit is complete.
6. RLS should not be tightened until the generic usage audit is complete.
7. Backend notification ownership should be considered later; frontend notification behavior is currently preserved.

## Recommended cleanup sequence

### Slice 1 — Completed

Create canonical workflow transition map:

```txt
src/lib/workflow/orderWorkflow.js
```

### Slice 2 — Completed

Document all known status mutation surfaces in this audit file.

### Slice 3 — Completed

Add workflow guard helpers:

```txt
src/lib/workflow/orderWorkflowGuards.js
```

### Slice 4 — Completed

Wrap `ordersService.sendOrderToReview` with the transition guard.

### Slice 5 — Completed

Wrap the remaining primary workflow helpers:

- `sendOrderBackToAppraiser`
- `clearReview`
- `requestFinalApproval`
- `markReadyForClient`
- `completeOrder`

### Slice 6 — Completed

Quarantine or route unsafe UI drift points:

- `ReviewerActionCell.jsx` now uses guarded helpers.
- `QuickActionsDrawerPanel.jsx` now uses guarded helpers.
- `OrderActionsPanel` is no longer exported from the orders barrel.

### Slice 7 — Completed

Document generic legacy status mutation helpers as deprecated for normal workflow:

- `src/lib/api/orders.js`
- `src/lib/utils/updateOrderStatus.js`
- `src/features/orders/actions.js`

### Slice 8 — Completed

Consolidate action rendering:

- Reduce duplicated workflow button logic.
- Move table/drawer/detail surfaces toward one Smart Actions descriptor model.
- Keep existing handlers and modals while sharing descriptors.

### Slice 9 — Completed

Design Supabase enforcement:

- `rpc_transition_order_status` created and applied.
- Transition validation works.
- Permission enforcement works.
- Missing permission rejection validated.
- Invalid transition rejection validated.
- Happy path `submit_to_review` validated.
- Duplicate legacy order activity triggers disabled.
- Activity now logs one clean `status_changed` row after an RPC transition.

Goal: frontend and backend enforce the same lifecycle rules.

### Slice 10 — Completed

Migrate frontend workflow helpers to the transition RPC one at a time:

- `sendOrderToReview` uses `rpc_transition_order_status`.
- `sendOrderBackToAppraiser` uses `rpc_transition_order_status`.
- `clearReview` uses `rpc_transition_order_status`.
- `requestFinalApproval` uses `rpc_transition_order_status`.
- `markReadyForClient` uses `rpc_transition_order_status`.
- `completeOrder` uses `rpc_transition_order_status`.
- Full lifecycle tested through backend RPC: `new` -> `in_review` -> `review_cleared` -> `pending_final_approval` -> `ready_for_client` -> `completed`.
- Request revisions path tested through backend RPC: `in_review` -> `needs_revisions`.
- Activity logging confirmed clean with one canonical `status_changed` row per new transition.
- Notification/toast behavior preserved.

### Slice 11 — Next

Audit remaining generic status helpers and legacy RPCs before restriction:

- Keep old `rpc_update_order_status` until the generic usage audit is complete.
- Do not tighten RLS until the generic usage audit is complete.
- Consider backend notification ownership later.

## Immediate next slice recommendation

Proceed with a generic status usage audit before restriction.

Specifically:

1. Identify remaining imports/callers of generic status helpers and `rpc_update_order_status`.
2. Classify each path as active UI, admin/support override, compatibility, or dead code.
3. Decide which paths move to `rpc_transition_order_status`, which need explicit override semantics, and which can remain temporarily.

This keeps restriction work grounded in real usage before removing legacy RPCs or tightening RLS.
