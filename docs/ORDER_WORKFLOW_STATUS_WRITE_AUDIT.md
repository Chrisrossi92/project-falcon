# Order Workflow Status Write Audit

## Purpose

This audit documents every currently identified path that can change order workflow status. The goal is to harden Falcon's order lifecycle before further productization.

This document is intentionally audit-only. It does not change runtime behavior.

## Canonical workflow reference

The canonical transition map now lives at:

```txt
src/lib/workflow/orderWorkflow.js
```

That file defines the intended workflow transitions, required permissions, actor roles, and notification event keys.

## Current canonical UI path

### `src/features/orders/UnifiedOrdersTable.jsx`

Primary table workflow actions call named service helpers from `src/lib/services/ordersService.js`:

- `sendOrderToReview`
- `sendOrderBackToAppraiser`
- `clearReview`
- `requestFinalApproval`
- `markReadyForClient`
- `completeOrder`

This is the preferred current UI path because it routes through Smart Actions and avoids freeform status changes.

Risk level: **Medium**

Reason: the table path is mostly clean, but the service helpers it calls still update status directly and are not yet backed by a single transition guard.

Recommended action: **Keep, then wire to transition guard.**

## Status write surfaces

### `src/lib/services/ordersService.js`

Identified status write helpers:

- `setOrderStatus(orderId, status)`
- `updateOrderStatus(orderId, status, extra)`
- `startReview(orderId, note)`
- `requestRevisions(orderId, note)`
- `clearReview(orderId, note)`
- `requestFinalApproval(orderId, note)`
- `markReadyForClient(orderId, note)`
- `markComplete(orderId, note)`
- `putOnHold(orderId, note)`
- `resumeInProgress(orderId, note)`
- `sendToClient(orderId, note)`
- `markDelivered(orderId, note)`
- `sendOrderToReview(orderId, actorId, options)`
- `sendOrderBackToAppraiser(orderId, actorId, options)`
- `completeOrder(orderId, actorId)`

Risk level: **High**

Reason: this file contains both explicit workflow helpers and generic status setters. Some transitions emit notifications, some do not. Some validate current status, while others directly update `orders.status`.

Recommended action: **Wrap all workflow status changes through a single transition helper. Retire generic status setters from UI usage.**

## Legacy / alternate paths

### `src/lib/api/orders.js`

Identified status write helpers:

- `updateOrderStatus(orderId, next)`
- `bulkUpdateStatus(orderIds, status)`
- `createOrder(payload)` can set initial status from payload

Risk level: **High**

Reason: these functions directly update the `orders` table. `bulkUpdateStatus` can change multiple statuses at once without using workflow transition rules, notification logic, or explicit activity context.

Recommended action: **Restrict to admin/backfill use or route through explicit admin override workflow. Do not use for normal workflow actions.**

### `src/lib/utils/updateOrderStatus.js`

Identified behavior:

- Attempts `rpc_update_order_status` first.
- Falls back to direct `orders.status` update.
- Falls back to legacy `logOrderEvent` after direct update.

Risk level: **High**

Reason: RPC-first is directionally good, but fallback behavior keeps legacy audit paths alive and bypasses the new workflow transition map.

Recommended action: **Deprecate or rewrite after canonical transition RPC exists.**

### `src/features/orders/actions.js`

Identified behavior:

- `updateOrderStatus(orderId, newStatus, note)` calls `rpc_update_order_status`.
- `assignOrder` calls `rpc_assign_order`.
- `updateDueDates` calls `rpc_update_due_dates`.

Risk level: **Medium**

Reason: RPC usage is better than direct table updates, but this still accepts arbitrary new status and does not reference the canonical workflow transition map.

Recommended action: **Keep as legacy RPC wrapper only if no active UI imports remain. Otherwise replace with canonical workflow helper.**

## UI drift points

### `src/components/orders/table/ReviewerActionCell.jsx`

Identified behavior:

- Direct buttons set status to `needs_revisions` or `review_cleared` via `src/lib/api/orders.updateOrderStatus`.

Risk level: **High**

Reason: bypasses Smart Actions, workflow notes, transition validation, and notification behavior.

Recommended action: **Remove from active table usage or refactor to use Smart Actions / canonical transition helper.**

### `src/components/orders/view/QuickActionsDrawerPanel.jsx`

Identified behavior:

- Appraiser button sets status to `in_review`.
- Reviewer buttons set status to `review_cleared` or `needs_revisions`.
- Uses `ordersService.updateOrderStatus`, not named workflow helpers.

Risk level: **High**

Reason: bypasses Smart Actions, role/status validation, workflow note modal, and transition-specific notification behavior.

Recommended action: **Replace with Smart Actions-driven controls or remove if obsolete.**

### `src/features/orders/OrderActionsPanel.jsx`

Identified behavior:

- Contains a freeform status input and calls `features/orders/actions.updateOrderStatus`.

Risk level: **Critical**

Reason: freeform status entry is unsafe for normal product usage and is not compatible with a controlled lifecycle.

Recommended action: **Restrict to dev/admin debug tooling or remove from production routes.**

## Productization risks

The current app has a polished primary workflow path, but legacy status mutation paths can bypass it. That creates several product risks:

1. UI can show only valid Smart Actions while another component allows invalid status changes.
2. Notifications may not fire consistently.
3. Activity history may depend on fallback or trigger behavior rather than explicit workflow intent.
4. Future company-specific workflow rules would be hard to enforce.
5. Multi-company reuse would be risky because direct status writes are harder to govern with company-specific policies.

## Recommended cleanup sequence

### Slice 1 — Completed

Create canonical workflow transition map:

```txt
src/lib/workflow/orderWorkflow.js
```

### Slice 2 — Completed

Document all known status mutation surfaces in this audit file.

### Slice 3 — Next

Add a shared transition helper that validates a requested transition against `ORDER_WORKFLOW_TRANSITIONS` but does not yet replace existing service helpers.

Suggested file:

```txt
src/lib/workflow/orderWorkflowGuards.js
```

Initial helper responsibilities:

- normalize current status
- validate transition key
- check allowed `from` statuses
- return transition metadata
- produce clear error messages

No database writes in this slice.

### Slice 4

Refactor `ordersService.sendOrderToReview` to use the transition guard internally while preserving existing behavior.

### Slice 5

Refactor `sendOrderBackToAppraiser`, `clearReview`, `requestFinalApproval`, `markReadyForClient`, and `completeOrder` to use the transition guard.

### Slice 6

Remove or quarantine unsafe UI drift points:

- `ReviewerActionCell.jsx`
- `QuickActionsDrawerPanel.jsx`
- `OrderActionsPanel.jsx`
- direct status mutation exports not needed by active UI

### Slice 7

Design Supabase enforcement:

- either transition RPC
- or trigger/policy enforcement
- or both

Goal: frontend and backend enforce the same lifecycle rules.

## Immediate next slice recommendation

Proceed with Slice 3: add a pure workflow guard module with no database writes and no runtime integration yet.

That gives us executable validation logic we can test and then gradually wire into the service layer without breaking existing UI behavior.
