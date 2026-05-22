# Activity Event Ownership Audit

## Purpose

This audit inventories currently identified activity creation paths before further CRUD hardening.
It separates canonical order activity, frontend-orchestrated notes, lifecycle events, assignment
packet activity, document activity, and legacy compatibility seams.

This is a planning and test-guard document. Sprint 5A makes no runtime behavior, permission, RLS,
workflow, lifecycle, assignment, document, notification, RPC, route, or UI changes.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`

## Current Status

Status: **Sprint 5A inventories activity event mutation ownership without behavior changes. Order
system activity is mostly trigger-owned or backend RPC-owned. Human notes remain
frontend-orchestrated through guarded `rpc_log_event(...)`. Cross-company assignment packet activity
is intentionally separate from canonical `activity_log` and uses
`order_company_assignment_activity`. Legacy review/activity wrappers remain compatibility seams and
future quarantine candidates.**

## Ownership Map

| Surface | Path | Activity Store | Owner Category | Current Doctrine |
|---|---|---|---|---|
| Order create | `rpc_create_order(...)` insert -> `trg_orders_audit_ins` / `tg_orders_audit_ins()` | `activity_log` | Trigger-owned | Canonical `order_created` activity for order insert |
| Order normal edit | `rpc_update_order(...)` update -> `trg_orders_audit_upd` / `tg_orders_audit_upd()` | `activity_log` | Trigger-owned | Canonical `dates_updated`, `assignee_changed`, and `fee_changed` activity |
| Workflow status | `ordersService` canonical helpers -> `rpc_transition_order_status(...)` -> order update trigger | `activity_log` | Trigger-owned after backend RPC mutation | Canonical `status_changed`; RPC deliberately avoids a second status logger |
| Order archive | `archiveOrderViaRpc(...)` -> `rpc_order_archive(...)` | `activity_log` | Backend RPC-owned | Explicit `order.archived` event with safe payload |
| Order cancel/void | `cancelOrderViaRpc(...)` / `voidOrderViaRpc(...)` -> lifecycle RPCs | `activity_log` | Backend RPC-owned plus status trigger | Explicit `order.cancelled` / `order.voided`; status update also produces `status_changed` |
| Order number override | `overrideOrderNumber(...)` -> `rpc_order_number_override(...)` | `activity_log` | Backend RPC-owned | Explicit `order_number.manual_override` event |
| General order notes | `ActivityNoteForm` / `OrderActivity` -> `logNote(...)` -> `rpc_log_event(...)` | `activity_log` | Frontend-orchestrated through guarded RPC | Transitional acceptable note path; not authoritative lifecycle/status activity |
| Workflow notes | `UnifiedOrdersTable` optional review/revision note -> `logNote(...)` -> `rpc_log_event(...)` | `activity_log` | Frontend-orchestrated through guarded RPC | Transitional note orchestration before selected workflow transitions |
| Review decision helper | `src/lib/api/reviews.js#submitReviewDecision(...)` -> `logActivity(...)` -> `rpc_log_event(...)` | `activity_log` | Transitional / deprecated candidate | Legacy review-field path outside canonical workflow status doctrine |
| Low-level activity wrappers | `src/lib/logactivity.js`, `src/lib/utils/logOrderEvent.js` -> `rpc_log_event(...)` | `activity_log` | Transitional compatibility | RPC-backed, but should not become new authoritative system-event paths |
| Document upload finalize | `finalizeOrderDocumentUpload(...)` -> `rpc_order_document_finalize_upload(...)` -> `rpc_log_event(...)` | `activity_log` | Backend RPC-owned, via guarded activity RPC | Explicit `order_document.uploaded` without storage path, bucket, or signed URL data |
| Document archive | `archiveOrderDocument(...)` -> `rpc_order_document_archive(...)` -> `rpc_log_event(...)` | `activity_log` | Backend RPC-owned, via guarded activity RPC | Explicit `order_document.archived` without storage path, bucket, or signed URL data |
| Internal `assigned_to` compatibility assignment | `assignOrder(...)` -> `rpc_assign_order(...)` | `activity_log` | Backend RPC-owned compatibility | Inserts legacy-shaped `action = 'assignment'`; no matching trigger activity |
| Cross-company assignment packets | `rpc_order_company_assignment_*` lifecycle RPCs -> `log_order_company_assignment_event(...)` | `order_company_assignment_activity` | Backend RPC-owned | Assignment-scoped activity only; not canonical order activity |
| Disabled legacy order triggers | `trg_orders_activity`, `trg_orders_log` / `log_order_changes()` | `activity_log` if enabled | Deprecated / disabled duplicate candidates | Triggers are disabled and documented as duplicate legacy order activity |

## Canonical Order Trigger Activity

The active order audit trigger path is:

- `trg_orders_audit_ins` -> `tg_orders_audit_ins()` writes `order_created`.
- `trg_orders_audit_upd` -> `tg_orders_audit_upd()` writes:
  - `status_changed`;
  - `dates_updated`;
  - `assignee_changed`;
  - `fee_changed`.

These triggers are the canonical source for ordinary order create/update and workflow status
activity. Legacy broad triggers `trg_orders_activity` and `trg_orders_log` remain disabled because
they duplicate the canonical audit triggers.

## Backend RPC-Owned Activity

The following backend RPCs write explicit activity rows and should remain authoritative for their
specialized events:

- `rpc_order_archive(...)` writes `order.archived`.
- `rpc_order_cancel(...)` writes `order.cancelled`.
- `rpc_order_void(...)` writes `order.voided`.
- `rpc_order_number_override(...)` writes `order_number.manual_override`.
- `rpc_order_document_finalize_upload(...)` writes `order_document.uploaded` through
  `rpc_log_event(...)`.
- `rpc_order_document_archive(...)` writes `order_document.archived` through `rpc_log_event(...)`.
- `rpc_assign_order(...)` writes compatibility `action = 'assignment'` for `assigned_to`.

Cancel and void intentionally also update `orders.status`, so the order audit trigger can add a
separate `status_changed` row. That is not currently an obvious duplicate bug because the lifecycle
event and status audit event carry different meanings, but future lifecycle UI should account for
both rows.

## Frontend-Orchestrated Activity

Frontend-orchestrated activity is currently limited to note/review compatibility paths that call
guarded RPCs instead of direct table writes:

- `src/lib/services/activityService.js#logNote(...)` calls `rpc_log_event(...)` with
  `event_type = 'note'`.
- `src/components/activity/ActivityNoteForm.jsx` uses `logNote(...)` for general order notes and
  separately emits note notifications.
- `src/components/orders/view/OrderActivity.jsx` uses `logNote(...)` from an older inline note UI.
- `src/features/orders/UnifiedOrdersTable.jsx` creates optional review/revision notes before some
  workflow transitions.
- `src/lib/logactivity.js#logActivity(...)` and `src/lib/utils/logOrderEvent.js` are lower-level
  compatibility wrappers around `rpc_log_event(...)`.
- `src/lib/api/reviews.js#submitReviewDecision(...)` remains a legacy review-field helper that
  calls `logActivity(...)`.

These paths are transitional. New authoritative system events should not be added from frontend
code; they should be owned by the relevant backend RPC or trigger.

## Assignment Activity Boundary

Cross-company assignment packet activity does not write canonical `activity_log` rows. It uses
`order_company_assignment_activity` through `log_order_company_assignment_event(...)`, and
assignment activity reads use assignment-specific RPCs. This keeps assigned-company packet activity
separate from owner-company order activity and avoids granting canonical order/client visibility.

Internal order participant activity remains split:

- `appraiser_id` / `reviewer_id` changes are trigger-owned `assignee_changed` rows.
- `assigned_to` compatibility assignment is `rpc_assign_order(...)`-owned and uses older
  `action = 'assignment'` shape.

## Document Activity Boundary

Document finalize/archive activity is backend-owned by document RPCs and delegated to
`rpc_log_event(...)` for insertion. Current document payloads include document identity and display
metadata but intentionally omit storage bucket, storage path, and signed URL data.

Prepare-upload creates pending metadata but does not create an activity row. Finalize upload is the
operational activity point.

## Risks And Gaps

- **Duplicate status/lifecycle rows:** cancel/void produce both `status_changed` and lifecycle
  activity. This is intentional today but should be rendered as related operational history rather
  than treated as an accidental duplicate.
- **Frontend notes are not atomic with workflow transitions:** optional review/revision notes are
  created before status transition RPC calls and can succeed even if the later transition fails.
- **Payload shape inconsistency:** trigger rows often use compact `detail` JSON and `actor_id`;
  newer RPC rows use `actor_user_id`, `actor_id`, `created_by`, `created_by_name`, and message
  fields. Compatibility views/services normalize this for UI, but event authorship is not uniform.
- **Legacy `action` shape:** `rpc_assign_order(...)` still inserts `action = 'assignment'` instead
  of a modern `event_type` value.
- **Legacy review helper:** `submitReviewDecision(...)` directly updates review fields and logs a
  review activity event through a compatibility wrapper, outside canonical workflow status doctrine.
- **Compatibility wrappers:** `logActivity(...)` and `logOrderEvent(...)` are RPC-backed, but they
  are low-level seams that could reintroduce frontend-authored system events if reused casually.
- **Missing activity coverage:** relationship lifecycle, team access changes, invitations, and
  client archive semantics are outside this order/activity stabilization pass and should be audited
  in their own CRUD slices.

## Deferred Cleanup

- Move review/revision workflow notes into backend-owned orchestration if they need to be atomic
  with status transitions.
- Decide whether general order notes should remain frontend-orchestrated through `rpc_log_event(...)`
  or move behind a dedicated note RPC.
- Quarantine or narrow low-level activity wrappers so new system events cannot be frontend-authored.
- Retire or redesign `submitReviewDecision(...)` activity behavior with the legacy review-field
  cleanup.
- Normalize activity payload and actor fields for new backend-owned events.
- Decide whether `rpc_assign_order(...)` should be retired or migrated to a modern participant
  assignment event shape.
- Add source-scan protections for direct `activity_log` writes and low-level activity wrapper usage
  if Sprint 5B moves from documentation to runtime hardening.
