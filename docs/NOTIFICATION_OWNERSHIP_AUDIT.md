# Notification Ownership Audit

## Purpose

This audit inventories currently identified notification creation and fanout paths before further
CRUD hardening. It separates workflow notifications, assignment notifications, lifecycle
notifications, note/comment notifications, document notification gaps, and legacy compatibility
helpers.

This is a planning and test-guard document. Sprint 5B makes no runtime behavior, notification
redesign, permission, RLS, workflow, lifecycle, assignment, document, RPC, route, or UI changes.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`

## Current Status

Status: **Sprint 5B inventories notification mutation and fanout ownership without behavior
changes. Notification insertion is guarded by `rpc_notification_create(...)` for frontend-created
rows, backend trigger-owned for internal appraiser assignment rows, and backend RPC-owned for
cross-company assignment packet rows. Normal workflow and note/comment notification fanout remains
frontend-orchestrated through `emitNotification(...)`. Lifecycle and document notifications are
currently missing/deferred by doctrine rather than silently filled from frontend code.**

## Ownership Map

| Surface | Path | Owner Category | Current Doctrine |
|---|---|---|---|
| Notification insert guard | `rpc_notification_create(patch jsonb)` | Backend RPC-owned insert gate | Authenticated callers need source `order_id`, current-company readable/updateable order scope, and active recipient membership; service role may create system rows without order source |
| Workflow send/resubmit to review | `ordersService.sendOrderToReview(...)` -> `emitNotification("order.sent_to_review", ...)` -> `rpc_notification_create(...)` | Frontend-orchestrated / transitional | Sends to reviewer plus admin recipients after successful transition RPC; resubmission payload is frontend-built |
| Workflow request revisions | `ordersService.sendOrderBackToAppraiser(...)` -> `emitNotification("order.sent_back_to_appraiser", ...)` -> `rpc_notification_create(...)` | Frontend-orchestrated / transitional | Sends to appraiser plus admin recipients after successful transition RPC |
| Workflow clear review | `ordersService.clearReview(...)` -> `emitNotification("order.review_cleared", ...)` -> `rpc_notification_create(...)` | Frontend-orchestrated / transitional | Sends to admin recipients after successful transition RPC |
| Workflow request final approval | `ordersService.requestFinalApproval(...)` | Missing fanout | Transition has `notificationEvent: null`; no identified notification fanout today |
| Workflow ready for client | `ordersService.markReadyForClient(...)` -> `emitNotification("order.ready_for_client", ...)` -> `rpc_notification_create(...)` | Frontend-orchestrated / transitional | Sends to reviewer plus admin recipients after successful transition RPC |
| Workflow complete | `ordersService.completeOrder(...)` -> `emitNotification("order.completed", ...)` -> `rpc_notification_create(...)` | Frontend-orchestrated / transitional | Sends to admins and appraiser after successful transition RPC |
| Internal appraiser assignment | `trg_orders_insert_assignment_notification` -> `tg_orders_insert_assignment_notification()` | Backend trigger-owned | Creates `order.new_assigned` / `order.reassigned` for `appraiser_id` insert/update |
| Internal reviewer assignment | order create/edit `reviewer_id` mutation | Missing fanout | No identified reviewer assignment notification doctrine/fanout |
| Internal `assigned_to` compatibility assignment | `rpc_assign_order(...)` | Missing fanout / transitional | Compatibility path writes activity only; no notification fanout |
| Cross-company assignment packets | `rpc_order_company_assignment_*` -> `notify_order_company_assignment_event(...)` | Backend RPC-owned | Assignment-scoped notifications for offer/accept/decline/submit/complete/cancel/revoke; `assignment.started` intentionally silent |
| General order notes/comments | `ActivityNoteForm` -> `emitNotification("note.appraiser_added" / "note.reviewer_added", ...)` -> `rpc_notification_create(...)` | Frontend-orchestrated / transitional | Best-effort note notification after successful note activity write |
| Workflow notes | `UnifiedOrdersTable` optional review/revision note activity | Missing direct note fanout | Notes are activity-only there; workflow notification payload may include `note_text` for current transition fanout |
| Order archive/cancel/void lifecycle | `rpc_order_archive(...)`, `rpc_order_cancel(...)`, `rpc_order_void(...)` | Missing fanout by doctrine | Lifecycle RPCs write activity only; future notification policy must decide recipients and replace frontend-only side effects |
| Order documents upload/archive | `rpc_order_document_finalize_upload(...)`, `rpc_order_document_archive(...)` | Missing fanout by doctrine | Document RPCs write activity only; no upload/archive notification fanout found |
| Legacy notification utility | `src/lib/api/notifications.js#sendNotification(...)` -> `rpc_notification_create(...)` | Deprecated / compatibility candidate | RPC-backed but bypasses event registry, recipient policy, title/body registry, and typed ownership doctrine |
| Email queue side effect | `trg_notifications_queue_email` after insert on `notifications` | Backend trigger-owned delivery side effect | Delivery reaction to notification rows, not a separate product fanout authority |
| Legacy system helpers | `_notify_user(...)`, `rpc_notify_admins(...)`, `rpc_notify_user(...)` | Deprecated / compatibility candidates | Direct generic notification helpers exist in baseline SQL; no active frontend caller found in this pass |

## Insert Authority

`rpc_notification_create(patch jsonb)` is the guarded insert surface for frontend-created
notifications. For authenticated users, order-tied notifications require:

- a source `order_id`;
- current-company membership;
- source order company matching current company;
- readable order scope;
- updateable order-row scope;
- recipient active membership in the source company.

The RPC centralizes tenant checks, but it does not decide event semantics or recipient fanout. Those
decisions are currently split between frontend orchestration, order triggers, and assignment packet
RPCs.

Direct authenticated inserts into `notifications` are blocked by RLS policy. New frontend fanout
should not bypass `rpc_notification_create(...)`.

## Workflow Notifications

Normal workflow notifications remain frontend service-owned after the canonical status transition
RPC succeeds:

- `order.sent_to_review`;
- `order.sent_back_to_appraiser`;
- `order.review_cleared`;
- `order.ready_for_client`;
- `order.completed`.

The frontend resolves recipients from order participants plus `fetchAdminRecipients()`, suppresses
the acting user through `resolveOrderParticipants(...)`, loads `notification_policies`, builds
title/body through `notificationEvents.js`, and inserts one row per recipient through
`rpc_notification_create(...)`.

`request_final_approval` has no identified notification fanout today and remains a doctrine gap.
Future backend workflow notification ownership must replace this frontend fanout rather than
duplicate it.

## Assignment Notifications

Assignment notification ownership is split by assignment type:

- Internal `appraiser_id` assignment is backend trigger-owned by
  `trg_orders_insert_assignment_notification`, which emits `order.new_assigned` or
  `order.reassigned` rows for the appraiser.
- Internal `reviewer_id` assignment has no identified notification fanout.
- Internal `assigned_to` compatibility assignment through `rpc_assign_order(...)` has no identified
  notification fanout.
- Cross-company assignment packet lifecycle notifications are backend RPC-owned through
  `notify_order_company_assignment_event(...)`, route to `/assignments/:assignmentId`, and keep
  assigned-company payloads assignment-scoped rather than canonical-order-scoped.

No active duplicate assignment notification bug was found. The main gap is mixed ownership and
missing reviewer/`assigned_to` notification doctrine.

## Lifecycle Notifications

Archive, cancel, and void do not currently emit notifications. `docs/ORDER_RETIREMENT_DOCTRINE.md`
already reserves lifecycle notification policy as a future decision and explicitly warns against
frontend-only lifecycle notification side effects.

Current doctrine: lifecycle RPCs own lifecycle activity, preserve existing notification records,
and remain notification-silent until a deliberate policy slice defines recipients, language, and
backend ownership.

## Note And Comment Notifications

General order note/comment notifications are frontend-orchestrated:

- `ActivityNoteForm` writes the note through `logNote(...)`;
- then it best-effort emits either `note.appraiser_added` or `note.reviewer_added`;
- `emitNotification(...)` uses registry text and policy rules before calling
  `rpc_notification_create(...)`.

This path is transitional. It is not atomic with the note activity write, and notification failure is
logged without failing the note. Workflow review/revision notes in `UnifiedOrdersTable` are separate
activity rows and are not directly note-notified; their text may be included in the related
workflow notification payload.

## Document Notifications

No active order document upload/archive notification fanout was found. Document finalize/archive
currently write backend-owned activity only. Future document notification fanout should be
backend-owned by the document RPC or a clearly scoped backend fanout helper.

## Risks And Gaps

- **Frontend-generated authoritative workflow notifications:** normal workflow fanout is not yet
  backend-owned, so recipient rules and payload structure live in frontend code.
- **Mixed assignment ownership:** appraiser assignment is trigger-owned, packet assignment is
  RPC-owned, while reviewer and `assigned_to` fanout are missing/deferred.
- **Missing lifecycle fanout doctrine:** archive/cancel/void intentionally remain notification-silent
  until policy is designed.
- **Missing `request_final_approval` fanout:** the workflow descriptor has `notificationEvent: null`.
- **Payload inconsistency:** frontend workflow/note payloads, appraiser assignment trigger payloads,
  and assignment packet payloads use different shapes, link paths, categories, and actor metadata.
- **Actor attribution inconsistency:** frontend workflow/note paths suppress or include actor details
  in payloads, while backend trigger/RPC paths vary by event family.
- **Legacy helpers:** `sendNotification(...)`, `_notify_user(...)`, `rpc_notify_admins(...)`, and
  `rpc_notify_user(...)` are generic seams that can bypass event-registry doctrine if reused.
- **Email delivery coupling:** `trg_notifications_queue_email` reacts to inserted rows. Fanout owners
  must avoid duplicate inserts because email delivery may duplicate along with in-app rows.

## Deferred Cleanup

- Move normal workflow notification fanout backend-side after recipient semantics are locked.
- Decide `request_final_approval` notification semantics.
- Define reviewer assignment and `assigned_to` compatibility notification doctrine.
- Decide lifecycle notification recipients/language for archive, cancel, and void.
- Decide whether document upload/archive needs notifications and keep any implementation backend-owned.
- Quarantine or remove generic notification helpers that bypass the event registry.
- Normalize notification payload shape, actor attribution, category, priority, and link path
  conventions for new events.
- Add source-scan protections for direct notification inserts and low-level notification helper usage
  if Sprint 5C moves from documentation to runtime hardening.
