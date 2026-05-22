# Order Workflow Status Write Audit

## Purpose

This audit documents every currently identified path that can change order workflow status. The goal is to harden Falcon's order lifecycle before further productization.

This document is intentionally audit-focused. It tracks current risk, completed hardening work, and remaining cleanup targets.

## Current hardening status

Status: **Sprint 3 workflow mutation stabilization is substantially complete. Normal workflow
status mutation is backend-owned by `rpc_transition_order_status(...)`; frontend transition calls
must use canonical `ordersService` helpers; direct status writes remain quarantined/blocked; and
remaining workflow side-effect/UI duplication work is deferred explicitly below.**

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
- Sprint 3A re-inventoried active workflow/status mutation entry points before additional workflow
  expansion.
- Sprint 3B converted remaining direct/generic frontend status write helpers into throwing
  quarantine stubs and expanded CRUD source scans around direct status writes.
- Sprint 3C consolidated approved normal workflow transitions through the canonical
  `ordersService` transition RPC helper and expanded tests/source scans around direct
  `rpc_transition_order_status(...)` reachability.
- Sprint 3D audited workflow activity and notification ownership without changing runtime
  behavior.
- Sprint 3E inventoried frontend-owned workflow note/notification orchestration and documented
  transitional ownership boundaries.
- Sprint 3F audited Smart Actions against the canonical workflow transition doctrine without
  changing runtime behavior.
- Sprint 3G audited workflow transition permission semantics across Smart Actions, service guards,
  and `rpc_transition_order_status(...)` without changing runtime behavior.
- Sprint 3H documented reviewer shortcut and duplicated workflow action surface doctrine without
  changing runtime behavior.
- Sprint 3I locked the current workflow mutation stabilization doctrine and deferred cleanup list
  without changing runtime behavior.

## Sprint 3A Authoritative Workflow Mutation Map

Normal workflow/status transitions must use:

```txt
UI surface -> Smart Actions / controlled handler -> ordersService named workflow helper
  -> ordersService internal transition RPC helper
  -> rpc_transition_order_status(p_order_id, p_transition_key, p_note)
```

Lifecycle retirement actions are separate from normal workflow status transitions:

```txt
Order Detail archive/cancel/void action -> ordersService lifecycle wrapper
  -> rpc_order_archive / rpc_order_cancel / rpc_order_void
```

Do not route normal workflow through generic status setters, direct `orders.status` updates,
legacy review RPCs, or the quarantined freeform `OrderActionsPanel`.

### Backend-Owned Normal Workflow Transitions

| Transition key | Source status | Target status | Service helper | Primary UI surfaces | Backend authority |
|---|---|---|---|---|---|
| `submit_to_review` | `new`, `in_progress`, `needs_revisions` | `in_review` | `sendOrderToReview(...)` | `UnifiedOrdersTable`, dashboard table, drawer quick actions | `rpc_transition_order_status(...)` |
| `request_revisions` | `in_review` | `needs_revisions` | `sendOrderBackToAppraiser(...)` | `UnifiedOrdersTable`, reviewer shortcut, drawer quick actions | `rpc_transition_order_status(...)` |
| `approve_review` | `in_review` | `review_cleared` | `clearReview(...)` | `UnifiedOrdersTable`, reviewer shortcut, drawer quick actions | `rpc_transition_order_status(...)` |
| `request_final_approval` | `review_cleared` | `pending_final_approval` | `requestFinalApproval(...)` | `UnifiedOrdersTable` admin action | `rpc_transition_order_status(...)` |
| `ready_for_client` | `review_cleared`, `pending_final_approval` | `ready_for_client` | `markReadyForClient(...)` | `UnifiedOrdersTable` admin action | `rpc_transition_order_status(...)` |
| `complete` | `ready_for_client` | `completed` | `completeOrder(...)` | `UnifiedOrdersTable` admin action | `rpc_transition_order_status(...)` |

The backend RPC owns current-company context, readable order scope, updateable order scope,
transition allowlist, target status, and matching `workflow.status.*` permission enforcement.

`src/lib/services/ordersService.js` is the only approved frontend file that may call
`rpc_transition_order_status(...)` directly. Active UI surfaces should call the named service
helpers above, not the RPC string, generic status helpers, or duplicate transition adapters.

### Backend-Owned Retirement Lifecycle Transitions

| Action | Source state | Target mutation | Service wrapper | Active UI surface | Backend authority |
|---|---|---|---|---|---|
| Archive | readable non-archived order | `is_archived = true` only | `archiveOrderViaRpc(...)` | Order Detail only | `rpc_order_archive(...)` |
| Cancel | readable non-archived order with required reason | `status = 'cancelled'` only | `cancelOrderViaRpc(...)` | Order Detail only | `rpc_order_cancel(...)` |
| Void | readable non-archived order with required reason | `status = 'voided'` only | `voidOrderViaRpc(...)` | Order Detail only | `rpc_order_void(...)` |

Archive/cancel/void are complete for the current Order Detail scope after Sprint 2S. They must not
be mixed into table-row actions, bulk actions, smart actions, restore/reopen/unarchive flows, or
generic workflow helpers without a separate design slice.

### Frontend-Owned Or Compatibility Status Paths

| Path | Current status | Mutation ownership risk | Activity guarantee |
|---|---|---|---|
| `src/lib/services/ordersService.js#setOrderStatus(...)` | Exported throwing compatibility helper after Sprint 3B | Throws before direct `orders.status` mutation | None; callers must use canonical workflow helpers |
| `src/lib/services/ordersService.js#updateOrderStatus(...)` | Exported throwing compatibility helper after Sprint 3B | Throws before generic status patch | None; callers must use canonical workflow helpers |
| `startReview`, `requestRevisions`, `markComplete`, `putOnHold`, `resumeInProgress`, `sendToClient`, `markDelivered` aliases | Exported compatibility aliases after Sprint 3B | Funnel into throwing quarantine helpers | None; callers must use canonical workflow helpers |
| `src/lib/api/orders.js#updateOrderStatus(...)` | Exported throwing legacy API helper after Sprint 3B | Throws before direct `orders.status` mutation | None; callers must use canonical workflow helpers |
| `src/lib/api/orders.js#bulkUpdateStatus(...)` | Exported throwing legacy API helper after Sprint 3B | Throws before direct bulk `orders.status` mutation | None; callers need a future explicit bulk workflow design |
| `src/lib/utils/updateOrderStatus.js` | Throwing legacy utility after Sprint 3B | Throws before legacy RPC or direct fallback | None; callers must use canonical workflow helpers |
| `src/features/orders/actions.js#updateOrderStatus(...)` | Throwing legacy adapter after Sprint 3B | Throws before quarantined arbitrary-status RPC | None; callers must use canonical workflow helpers |
| `src/features/orders/OrderActionsPanel.jsx` | Quarantined UI file, no barrel export | Freeform status input if reintroduced | No canonical transition guarantee |
| `src/lib/api/reviews.js#submitReviewDecision(...)` | Legacy review field helper | Directly updates `review_status`, not `orders.status` | Logs frontend activity through legacy path |

These paths should not be used by active routed workflow UI. After Sprint 3B, known order-status
helpers throw before mutation and source scans block new direct `.update({ status: ... })` patterns.
They remain compatibility/export risks until removed or converted into explicit admin
override/backfill behavior.

### Duplicated UI Surfaces

The following surfaces can initiate the same canonical transitions:

- `src/features/orders/UnifiedOrdersTable.jsx` and dashboard table usage;
- `src/components/orders/view/QuickActionsDrawerPanel.jsx`;
- `src/components/orders/table/ReviewerActionCell.jsx`.

All currently call backend-owned service helpers for their active transitions. The duplication risk
is UI and permission-display drift, not direct status mutation. Future work should consolidate
these through shared Smart Action descriptors/rendering before adding more workflow transitions.

### Role And Permission Coupling Points

- `src/features/orders/smartActions.js` still branches on role strings such as `appraiser`,
  `reviewer`, `admin`, and `owner` for action visibility.
- `UnifiedOrdersTable` derives role from current app context and passes permission booleans into
  Smart Actions.
- `QuickActionsDrawerPanel` independently derives appraiser/reviewer/admin-like role and permission
  state.
- Service helpers call `assertOrderWorkflowTransition(...)` with `permissions: { loading: true }`
  and `allowDuringPermissionFallback: true`, so frontend permission checks remain visibility-only;
  backend RPC permission enforcement is authoritative.
- Reviewer shortcut actions rely on backend/service enforcement more than local permission display.

### Activity And Notification Guarantees

- `rpc_transition_order_status(...)` updates only status and `updated_at`; current activity logging
  is guaranteed by existing order update triggers that write one `status_changed` row.
- The RPC deliberately does not call a second status activity logger to avoid duplicate activity.
- `UnifiedOrdersTable` logs optional workflow notes through `logNote(...)` before send-to-review or
  request-revisions transitions; those notes are frontend-orchestrated and separate from canonical
  status activity.
- Service helpers still emit workflow notifications from frontend service code after the RPC
  returns. Backend notification ownership is not yet complete for normal workflow transitions.
- Legacy/direct status helpers do not have transition-specific activity or notification guarantees.

### Sprint 3D Activity / Notification Ownership Map

| Transition | Backend activity | Frontend activity | Backend notification | Frontend notification |
|---|---|---|---|---|
| `submit_to_review` | `status_changed` from `tg_orders_audit_upd` after `rpc_transition_order_status(...)` | Optional note from `UnifiedOrdersTable` via `logNote(...)` / `rpc_log_event(...)` before transition | None for normal workflow fanout | `ordersService.sendOrderToReview(...)` emits `order.sent_to_review` through `emitNotification(...)` / `rpc_notification_create(...)` |
| `request_revisions` | `status_changed` from `tg_orders_audit_upd` after `rpc_transition_order_status(...)` | Optional note from `UnifiedOrdersTable` via `logNote(...)` / `rpc_log_event(...)` before transition | None for normal workflow fanout | `ordersService.sendOrderBackToAppraiser(...)` emits `order.sent_back_to_appraiser` through `emitNotification(...)` / `rpc_notification_create(...)` |
| `approve_review` | `status_changed` from `tg_orders_audit_upd` after `rpc_transition_order_status(...)` | None in active helpers | None for normal workflow fanout | `ordersService.clearReview(...)` emits `order.review_cleared` through `emitNotification(...)` / `rpc_notification_create(...)` |
| `request_final_approval` | `status_changed` from `tg_orders_audit_upd` after `rpc_transition_order_status(...)` | None in active helpers | None for normal workflow fanout | None currently identified |
| `ready_for_client` | `status_changed` from `tg_orders_audit_upd` after `rpc_transition_order_status(...)` | None in active helpers | None for normal workflow fanout | `ordersService.markReadyForClient(...)` emits `order.ready_for_client` through `emitNotification(...)` / `rpc_notification_create(...)` |
| `complete` | `status_changed` from `tg_orders_audit_upd` after `rpc_transition_order_status(...)` | None in active helpers | None for normal workflow fanout | `ordersService.completeOrder(...)` emits `order.completed` through `emitNotification(...)` / `rpc_notification_create(...)` |

Current backend details:

- `rpc_transition_order_status(...)` is the status mutation boundary and intentionally performs no
  direct notification writes and no direct activity writes beyond the `orders` update.
- `tg_orders_audit_upd` is the active backend activity owner for normal workflow status changes; it
  inserts one `status_changed` row with safe `from` / `to` detail when `orders.status` changes.
- Legacy `trg_orders_activity` is disabled and documented as duplicate activity; baseline
  `trg_orders_notifications` is deprecated/inert and returns `new`.
- Legacy arbitrary workflow/status RPCs remain quarantined and should not be revived as activity or
  notification fallback paths.

Ownership doctrine after Sprint 3D:

- Status transition mutation must remain backend-owned by `rpc_transition_order_status(...)`.
- Status-change activity should remain backend-owned and should not be duplicated by frontend
  `status_changed` logging.
- Optional human workflow notes are separate note activity; they are currently frontend-orchestrated
  through `logNote(...)` and should move backend-side only in a deliberate note-ownership slice.
- Workflow notifications are currently frontend service-orchestrated after successful RPC return;
  future backend notification ownership must replace, not duplicate, these frontend emissions.

Identified gaps:

- `request_final_approval` has no currently identified workflow notification fanout.
- Workflow notification writes are not atomic with the status transition because they happen after
  the RPC returns from frontend service code.
- Optional note creation for send-to-review/request-revisions can succeed before a later transition
  failure, because the note is created before the status RPC call.
- Backend notification ownership exists for other domains, such as assignment lifecycle, but normal
  workflow notification fanout has not yet moved behind the workflow transition RPC.

### Sprint 3E Frontend Orchestration Inventory

Workflow-related frontend calls to note/activity/notification helpers are currently:

| Location | Helper / RPC path | Current use | Category | Future direction |
|---|---|---|---|---|
| `src/features/orders/UnifiedOrdersTable.jsx` | `logNote(...)` -> `rpc_log_event(...)` | Optional send-to-review resubmission note and request-revisions note before status transition | Temporary bridge | Move into backend-owned workflow transition/note orchestration if notes must be atomic with transitions |
| `src/lib/services/ordersService.js#sendOrderToReview(...)` | `emitNotification(...)` -> `rpc_notification_create(...)` | `order.sent_to_review` fanout after successful transition | Temporary bridge | Replace with backend workflow notification fanout; do not run both frontend and backend fanout for the same event |
| `src/lib/services/ordersService.js#sendOrderBackToAppraiser(...)` | `emitNotification(...)` -> `rpc_notification_create(...)` | `order.sent_back_to_appraiser` fanout after successful transition | Temporary bridge | Replace with backend workflow notification fanout; do not duplicate |
| `src/lib/services/ordersService.js#clearReview(...)` | `emitNotification(...)` -> `rpc_notification_create(...)` | `order.review_cleared` fanout after successful transition | Temporary bridge | Replace with backend workflow notification fanout; do not duplicate |
| `src/lib/services/ordersService.js#markReadyForClient(...)` | `emitNotification(...)` -> `rpc_notification_create(...)` | `order.ready_for_client` fanout after successful transition | Temporary bridge | Replace with backend workflow notification fanout; do not duplicate |
| `src/lib/services/ordersService.js#completeOrder(...)` | `emitNotification(...)` -> `rpc_notification_create(...)` | `order.completed` fanout after successful transition | Temporary bridge | Replace with backend workflow notification fanout; do not duplicate |
| `src/components/activity/ActivityNoteForm.jsx` | `logNote(...)` plus `emitNotification(...)` | General order note creation and `note.appraiser_added` / `note.reviewer_added` communication notifications | Acceptable frontend orchestration for current note UI, but not part of status transition authority | Keep separate from workflow status mutation; evaluate backend note ownership in the note cleanup slice |
| `src/components/orders/view/OrderActivity.jsx` | `logNote(...)` | General Order Detail note creation | Acceptable frontend orchestration for current note UI | Keep separate from workflow status mutation; evaluate with note cleanup |
| `src/lib/api/reviews.js#submitReviewDecision(...)` | `logActivity(...)` -> `rpc_log_event(...)` | Legacy review-field activity after direct `review_status` update | Duplicated/risky legacy path | Keep out of active workflow surfaces; future cleanup should quarantine or replace with canonical workflow/review RPC ownership |
| `src/lib/utils/logOrderEvent.js` / `src/lib/logactivity.js` | `rpc_log_event(...)` wrappers | Low-level compatibility activity wrappers | Temporary compatibility seam | Do not use for normal workflow status activity; status activity is backend trigger-owned |
| `src/lib/api/notifications.js#sendNotification(...)` | `rpc_notification_create(...)` | Generic notification helper | Temporary compatibility seam | Do not use for normal workflow fanout without explicit productized notification-authoring design |

Transition reliance summary:

- Review notes: `submit_to_review` may create a frontend `Resubmission note` before the backend
  status transition.
- Revision notes: `request_revisions` may create a frontend `Revision note` before the backend
  status transition.
- Final approval requests: `request_final_approval` currently has backend status activity only and
  no identified frontend/backend notification fanout.
- Handoff notifications: `submit_to_review`, `request_revisions`, `approve_review`,
  `ready_for_client`, and `complete` currently rely on frontend service fanout after the backend
  transition returns.

Sprint 3E doctrine:

- Backend-owned workflow mutation remains authoritative even when frontend note/notification
  orchestration surrounds it.
- Frontend workflow note and notification orchestration is transitional unless a future design
  explicitly approves it as long-term.
- New backend notification fanout must replace the matching frontend `emitNotification(...)` call
  in the same slice; do not allow duplicate frontend plus backend fanout for one workflow event.
- Frontend code must not create fallback `status_changed` activity for normal workflow transitions.
- Generic notification/activity helpers should not become alternate workflow mutation side-effect
  paths.

## Sprint 3A Findings

- **Already backend-owned:** all active normal workflow transitions listed in the canonical map and
  Order Detail archive/cancel/void lifecycle actions.
- **Still frontend-owned or generic:** direct status helpers, bulk status helper, legacy utility,
  legacy action adapter, quarantined `OrderActionsPanel`, and review-field decision helper.
- **Duplicated across UI:** send-to-review, request-revisions, and clear-review appear through the
  main table/dashboard, drawer quick actions, and reviewer shortcut surfaces.
- **Missing backend ownership:** workflow notification side effects and optional workflow note
  creation are not fully backend-owned; generic legacy status paths also lack canonical activity
  guarantees.
- **Inconsistent logic risk:** Smart Actions, drawer actions, reviewer shortcut actions, service
  guards, and backend RPC transition rules must remain aligned manually until action descriptors are
  fully shared across UI and backend.

## Sprint 3B Quarantine Result

Sprint 3B hardens the inventory without adding workflow features:

- `ordersService.updateOrder(...)` now rejects patches containing `status` before direct update;
- `ordersService.setOrderStatus(...)` and `ordersService.updateOrderStatus(...)` now throw;
- stale `ordersService` aliases that funnel through `setOrderStatus(...)` now throw;
- `src/lib/api/orders.js#updateOrderStatus(...)` and `bulkUpdateStatus(...)` now throw;
- `src/lib/utils/updateOrderStatus.js` no longer calls `rpc_update_order_status`, direct
  `orders.status` fallback, or manual legacy status activity;
- `src/features/orders/actions.js#updateOrderStatus(...)` no longer calls the quarantined generic
  status RPC and throws instead;
- CRUD source scans now fail on direct frontend order status update patterns and legacy status
  helper reachability outside quarantine files.

Approved behavior preserved:

- Smart Action / workflow UI continues to call named `ordersService` helpers;
- named workflow helpers continue to call `rpc_transition_order_status(...)`;
- backend transition validation, permissions, and existing `status_changed` activity guarantees
  remain authoritative;
- archive/cancel/void lifecycle RPCs are unchanged.

Still deferred:

- removal of exported legacy status helper names;
- backend-owned workflow notification side effects;
- backend-owned optional workflow note creation;
- consolidation of duplicated Smart Action rendering across table, drawer, and reviewer shortcut
  surfaces;
- any bulk workflow transition design.

## Sprint 3C Wrapper Consolidation Result

Sprint 3C keeps workflow behavior unchanged while tightening the approved path:

- `src/lib/services/ordersService.js` now centralizes the direct
  `rpc_transition_order_status(...)` call behind one internal transition helper;
- named workflow helpers remain the only approved frontend service API for active workflow
  transitions: `sendOrderToReview(...)`, `sendOrderBackToAppraiser(...)`, `clearReview(...)`,
  `requestFinalApproval(...)`, `markReadyForClient(...)`, and `completeOrder(...)`;
- active Smart Actions, dashboard/table actions, drawer quick actions, and reviewer shortcuts were
  confirmed to call those named helpers rather than direct RPC/status mutation paths;
- service tests assert the RPC name, `p_order_id`, `p_transition_key`, `p_note`, error propagation,
  and absence of direct `orders.status` updates for approved helpers;
- CRUD source scans now keep direct `rpc_transition_order_status(...)` calls confined to
  `ordersService.js`.

Still deferred:

- workflow notification side effects remain frontend service-owned after successful RPC return;
- optional workflow note creation remains frontend-orchestrated before selected transitions;
- duplicated Smart Action rendering across table, drawer, and reviewer shortcut surfaces remains a
  future UI consolidation target;
- no bulk workflow transition design exists.

## Sprint 3D Ownership Audit Result

Sprint 3D made no runtime changes. It confirms the current ownership split:

- normal workflow status mutation: backend-owned by `rpc_transition_order_status(...)`;
- normal workflow status activity: backend-owned by `tg_orders_audit_upd` as one
  `status_changed` row;
- optional workflow note activity: frontend-orchestrated through `logNote(...)` /
  `rpc_log_event(...)`;
- normal workflow notification fanout: frontend service-owned through `emitNotification(...)` /
  `rpc_notification_create(...)`;
- deprecated backend notification trigger behavior for orders is inert, and duplicate legacy order
  activity trigger behavior remains disabled.

No clear duplicate activity or notification write bug was found in active normal workflow paths.

## Sprint 3E Orchestration Inventory Result

Sprint 3E made no runtime changes. It classifies active workflow note/notification orchestration as
transitional:

- optional workflow notes for `submit_to_review` and `request_revisions` are frontend-created
  before transition and can remain only as a bridge until backend note ownership is designed;
- workflow handoff notifications are frontend service-emitted after successful transitions and must
  be removed when backend fanout is introduced;
- `request_final_approval` has no currently identified notification fanout;
- general order note notifications remain separate from status transition authority;
- legacy review-field and generic activity/notification helpers remain risky compatibility seams
  and should not be reused for canonical workflow side effects.

## Sprint 3F Smart Actions Audit

Sprint 3F made no runtime changes. It compared active Smart Action mapping and duplicated action
surfaces against the canonical workflow transition doctrine.

### Smart Action Mapping

| Action id / label | Transition | Status visibility | Primary surface behavior | Service helper | Permission expectation | Side-effect ownership |
|---|---|---|---|---|---|---|
| `send_to_review` / `Send to Review` | `submit_to_review` | `new`, `in_progress` | Appraiser primary action; admin/table action is secondary when handler is present | `sendOrderToReview(...)` | `workflow.status.submit_to_review` | Backend status/activity; frontend notification fanout |
| `send_to_review` / `Resubmit to Review` | `submit_to_review` | `needs_revisions` | Appraiser primary action; admin/table action is secondary when handler is present | `sendOrderToReview(...)` | `workflow.status.resubmit` | Backend status/activity; frontend optional note plus notification fanout |
| `send_back_to_appraiser` / `Request Revisions` | `request_revisions` | `in_review` | Reviewer secondary action; admin/table action when handler and permission are present | `sendOrderBackToAppraiser(...)` | `workflow.status.request_revisions` | Backend status/activity; frontend optional note plus notification fanout |
| `clear_review` / `Clear Review` | `approve_review` | `in_review` | Reviewer primary action; admin/table action when handler and permission are present | `clearReview(...)` | `workflow.status.approve_review` | Backend status/activity; frontend notification fanout |
| `request_final_approval` / `Request Final Approval` | `request_final_approval` | `review_cleared` | Admin/table-only action | `requestFinalApproval(...)` | `workflow.status.ready_for_client` | Backend status/activity; no notification fanout currently identified |
| `ready_for_client` / `Mark Ready for Client` | `ready_for_client` | `review_cleared`, `pending_final_approval` | Admin/table primary action | `markReadyForClient(...)` | `workflow.status.ready_for_client` | Backend status/activity; frontend notification fanout |
| `complete` / `Mark Complete` | `complete` | `ready_for_client` | Admin/table primary action | `completeOrder(...)` | `workflow.status.complete` | Backend status/activity; frontend notification fanout |

### Surface Comparison

| Surface | Smart Action usage | Current category | Notes |
|---|---|---|---|
| `src/features/orders/UnifiedOrdersTable.jsx` through `getColumnsForRole(...)` | Full `getSmartOrderActions(...)` descriptor model | Valid active table/dashboard surface | Hosts the main handlers, workflow note modal for send/resend/revisions, and admin workflow actions |
| `src/features/orders/columns/ordersColumns.jsx` | Renders `SmartActionsControl` from shared descriptors | Valid active renderer | Table and dashboard variants use the same descriptor output with variant-specific layout |
| `src/components/orders/view/QuickActionsDrawerPanel.jsx` | Calls `getSmartOrderActions(...)` for appraiser/reviewer drawer actions | Valid but subset surface | Excludes admin actions and uses browser confirm instead of the table workflow note modal; still routes to canonical helpers |
| `src/components/orders/table/ReviewerActionCell.jsx` | Does not use `getSmartOrderActions(...)` | Transitional duplicate surface | Calls canonical reviewer helpers but duplicates reviewer action rendering and has less local permission display |
| `src/features/orders/OrderActionsPanel.jsx` | Freeform status input, not shared descriptors | Quarantined unsafe surface | Not barrel-exported; must stay out of routed UI unless redesigned around canonical descriptors |

### Sprint 3F Findings

- Valid Smart Actions are the six canonical normal workflow transitions only:
  `submit_to_review`, `request_revisions`, `approve_review`, `request_final_approval`,
  `ready_for_client`, and `complete`.
- Table/dashboard Smart Actions and drawer quick actions route to named `ordersService` helpers,
  not direct status writes or direct RPC strings.
- Reviewer shortcut actions still call canonical helpers, but remain duplicated/transitional
  because they bypass the shared Smart Action descriptor renderer.
- `request_final_approval` remains the only canonical Smart Action with no currently identified
  notification fanout.
- `submit_to_review` resubmission visibility and backend RPC enforcement both use
  `workflow.status.resubmit` when the current status is `needs_revisions`.
- Table-safe actions are normal workflow actions only. Archive, cancel, void, restore, reopen,
  unarchive, hard delete, and bulk lifecycle/status actions remain outside Smart Actions.
- Order Detail lifecycle actions are separate from Smart Actions. Do not move archive/cancel/void
  into the table/drawer Smart Action model without a separate lifecycle design slice.

## Sprint 3G Permission Semantics Audit

Sprint 3G made no runtime changes. It compared frontend Smart Action visibility, workflow guard
metadata, service helper preflight checks, and `rpc_transition_order_status(...)` backend
permission enforcement.

### Authoritative Permission Mapping

| Transition / action | Source status | Required permission | Expected role visibility | Frontend visibility source | Backend enforcement source |
|---|---|---|---|---|---|
| `submit_to_review` / Send to Review | `new`, `in_progress` | `workflow.status.submit_to_review` | Appraiser primary; admin/table secondary when handler is present | `getSmartOrderActions(...)` via `canSubmitToReview`; `ORDER_WORKFLOW_TRANSITIONS.submit_to_review.requiredPermission` | `rpc_transition_order_status(...)` case `submit_to_review` when current status is not `needs_revisions` |
| `submit_to_review` / Resubmit to Review | `needs_revisions` | `workflow.status.resubmit` | Appraiser primary; admin/table secondary when handler is present | `getSmartOrderActions(...)` via `canResubmit`; `ORDER_WORKFLOW_TRANSITIONS.submit_to_review.resubmissionPermission`; `validateOrderWorkflowTransition(...)` selects resubmission permission | `rpc_transition_order_status(...)` case `submit_to_review` when current status is `needs_revisions` |
| `request_revisions` / Request Revisions | `in_review` | `workflow.status.request_revisions` | Reviewer visible; admin/table visible when handler and permission are present | `getSmartOrderActions(...)` via `canRequestRevisions`; `ORDER_WORKFLOW_TRANSITIONS.request_revisions.requiredPermission` | `rpc_transition_order_status(...)` case `request_revisions` |
| `approve_review` / Clear Review | `in_review` | `workflow.status.approve_review` | Reviewer primary; admin/table visible when handler and permission are present | `getSmartOrderActions(...)` via `canApproveReview`; `ORDER_WORKFLOW_TRANSITIONS.approve_review.requiredPermission` | `rpc_transition_order_status(...)` case `approve_review` |
| `request_final_approval` / Request Final Approval | `review_cleared` | `workflow.status.ready_for_client` | Admin/table only in current UI | `getSmartOrderActions(...)` via `canReadyForClient`; `ORDER_WORKFLOW_TRANSITIONS.request_final_approval.requiredPermission` | `rpc_transition_order_status(...)` case `request_final_approval` |
| `ready_for_client` / Mark Ready for Client | `review_cleared`, `pending_final_approval` | `workflow.status.ready_for_client` | Admin/table primary in current UI | `getSmartOrderActions(...)` via `canReadyForClient`; `ORDER_WORKFLOW_TRANSITIONS.ready_for_client.requiredPermission` | `rpc_transition_order_status(...)` case `ready_for_client` |
| `complete` / Mark Complete | `ready_for_client` | `workflow.status.complete` | Admin/table primary in current UI | `getSmartOrderActions(...)` via `canComplete`; `ORDER_WORKFLOW_TRANSITIONS.complete.requiredPermission` | `rpc_transition_order_status(...)` case `complete` |

### Sprint 3G Findings

- Frontend Smart Action permission booleans align with backend required permissions for the active
  canonical transitions.
- Resubmit/revision semantics are aligned: resubmission from `needs_revisions` uses
  `workflow.status.resubmit`; reviewer revision requests use `workflow.status.request_revisions`.
- Final approval and ready-for-client intentionally share `workflow.status.ready_for_client` in
  frontend metadata and backend enforcement.
- Service helpers perform status preflight through `assertOrderWorkflowTransition(...)` but pass
  `permissions: { loading: true }` with `allowDuringPermissionFallback: true`; frontend
  permissions remain visibility hints, and backend RPC enforcement is authoritative.
- Role assumptions are UI visibility rules, not backend authorization. Backend permission checks,
  current-company scope, readable order scope, and updateable order scope remain the source of
  truth.
- Reviewer shortcut actions still rely more heavily on service/backend enforcement than shared
  local permission display because they bypass `getSmartOrderActions(...)`.

Deferred after Sprint 3G:

- Consolidate duplicated role/display logic across table/dashboard, drawer, and reviewer shortcut
  surfaces.
- Decide whether `request_final_approval` should have a separate permission from
  `workflow.status.ready_for_client` in a future permission-design slice. Do not change this
  without an explicit permission model decision.
- Keep backend RPC permission semantics unchanged unless a future migration deliberately changes
  the workflow permission contract.

## Sprint 3H Reviewer Shortcut / Action Surface Doctrine

Sprint 3H made no runtime changes. It inventories duplicated workflow action surfaces and defines
which surfaces are primary, acceptable contextual duplicates, or transitional merge targets.

### Active Action Surface Inventory

| Surface | Active actions | Source of action logic | Current doctrine |
|---|---|---|---|
| Table/dashboard actions in `UnifiedOrdersTable` via `ordersColumns` | Send/Resubmit to Review, Request Revisions, Clear Review, Request Final Approval, Mark Ready for Client, Mark Complete | `getSmartOrderActions(...)` descriptors rendered by `SmartActionsControl` | Primary normal workflow surface |
| Drawer/sidebar quick actions in `OrderSidebarPanel` / `QuickActionsDrawerPanel` | Send to Review, Request Revisions, Clear Review for appraiser/reviewer roles | `getSmartOrderActions(...)` descriptors rendered by `SmartActionsControl`, with local drawer handlers | Acceptable contextual duplicate while it remains descriptor-backed and helper-backed |
| Reviewer shortcut cell in `ReviewerActionCell` | Request Revisions, Clear Review | Local buttons calling `sendOrderBackToAppraiser(...)` and `clearReview(...)` | Transitional duplicate; should merge into shared descriptors or be removed from active rendering when no longer needed |
| Order Detail normal workflow actions | No separate normal workflow action set identified; sidebar may include drawer quick actions | N/A | Do not add a separate Order Detail normal workflow surface without a design slice |
| Order Detail lifecycle actions | Archive, Cancel, Void | Dedicated readiness helpers and lifecycle RPC wrappers | Separate controlled lifecycle surface; not part of Smart Actions |
| Quarantined `OrderActionsPanel` | Freeform status input if reintroduced | Legacy local status adapter | Unsafe/quarantined; must not be used as a workflow surface |

### Duplicate Action Matrix

| Workflow action | Primary surface | Acceptable duplicate | Transitional / merge target | Notes |
|---|---|---|---|---|
| Send / Resubmit to Review | Table/dashboard Smart Actions | Drawer quick actions for appraiser context | None currently identified | Review/resubmission notes are table-modal only today |
| Request Revisions / Return to Appraiser | Table/dashboard Smart Actions | Drawer quick actions for reviewer context | Reviewer shortcut cell | All paths call canonical service helper; shortcut duplicates labels/permission display |
| Clear Review / Approve Review | Table/dashboard Smart Actions | Drawer quick actions for reviewer context | Reviewer shortcut cell | `Clear Review` is the current canonical label; "Approve Review" is the transition meaning |
| Request Final Approval | Table/dashboard Smart Actions | None currently identified | None | Admin/table-only; no drawer or Order Detail duplicate identified |
| Mark Ready for Client | Table/dashboard Smart Actions | None currently identified | None | Admin/table-only; no drawer or Order Detail duplicate identified |
| Mark Complete | Table/dashboard Smart Actions | None currently identified | None | Admin/table-only |
| Archive / Cancel / Void | Order Detail lifecycle action area | None | None | Must remain Order Detail-only, not table/drawer Smart Actions |

### Sprint 3H Doctrine

- The primary normal workflow surface is the table/dashboard Smart Actions renderer backed by
  `getSmartOrderActions(...)` and named `ordersService` helpers.
- Drawer quick actions are acceptable duplicates only while they use shared Smart Action
  descriptors and canonical service helpers. They should stay lightweight/contextual and should not
  introduce unique workflow transitions or lifecycle actions.
- `ReviewerActionCell` is a transitional duplicate. It is currently safe because it calls canonical
  helpers, but it should eventually be removed or rewritten to use the shared descriptor renderer
  so reviewer transitions have one visibility/label/permission model.
- Order Detail should not grow a separate normal workflow action set unless a future design slice
  explicitly makes Order Detail the primary workflow surface.
- Lifecycle actions remain Order Detail-only. Archive, cancel, void, restore, reopen, unarchive,
  hard delete, and bulk lifecycle/status behavior must not be added to Smart Actions as part of
  reviewer shortcut consolidation.
- Future workflow UI work should reduce duplicated rendering before adding more workflow actions.

## Sprint 3I Workflow Mutation Stabilization Lock

Sprint 3I made no runtime changes. It marks the Sprint 3 workflow mutation stabilization track as
substantially complete for the current product scope.

Locked doctrine:

- `rpc_transition_order_status(...)` is the authoritative backend mutation boundary for normal
  order workflow status transitions.
- Canonical `ordersService` helpers are the authoritative frontend transition API:
  `sendOrderToReview(...)`, `sendOrderBackToAppraiser(...)`, `clearReview(...)`,
  `requestFinalApproval(...)`, `markReadyForClient(...)`, and `completeOrder(...)`.
- Active UI must not call `rpc_transition_order_status(...)` directly. `ordersService.js` owns the
  direct RPC call through its internal transition helper.
- Direct frontend `orders.status` writes, generic status helpers, bulk status helpers, arbitrary
  status adapters, and the freeform `OrderActionsPanel` remain quarantined or blocked by source
  scans.
- Smart Actions are the primary normal workflow UI surface. Drawer actions are transitional
  contextual duplicates only while they remain descriptor-backed and canonical-helper backed.
- `ReviewerActionCell` is a transitional duplicate for reviewer transitions and should eventually
  merge into shared Smart Action descriptors or be removed from active rendering.
- Archive, cancel, and void lifecycle actions remain controlled Order Detail-only actions and are
  not part of Smart Actions or normal workflow transitions.
- Backend workflow status mutation and backend `status_changed` audit activity are authoritative.
  Frontend code must not add fallback `status_changed` activity.
- Frontend workflow notes and notifications remain transitional orchestration only. Future backend
  ownership must replace matching frontend emissions instead of duplicating them.

Known deferred items:

- Move normal workflow notification fanout backend-side and remove matching frontend
  `emitNotification(...)` calls in the same slice.
- Move review/resubmission and revision note orchestration backend-side if those notes must be
  atomic with workflow transitions.
- Consolidate or remove `ReviewerActionCell` so reviewer transitions share one descriptor,
  visibility, permission, and label model.
- Decide whether `request_final_approval` needs notification fanout and whether it needs a
  distinct permission separate from `workflow.status.ready_for_client`.
- Design explicit History/Admin readback surfaces before exposing archived/cancelled/voided order
  lists or retired lifecycle readback flags in active UI.
- Keep bulk workflow transitions, restore/reopen/unarchive, and lifecycle table actions out of
  scope until separately designed.

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
