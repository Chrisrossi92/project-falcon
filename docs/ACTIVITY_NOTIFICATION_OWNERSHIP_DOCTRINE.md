# Activity And Notification Ownership Doctrine

## Purpose

This doctrine consolidates the Sprint 5A activity audit and Sprint 5B notification audit into a
single ownership rule set for future CRUD stabilization work.

This is a planning and test-guard document. Sprint 5C makes no runtime behavior, notification
redesign, permission, RLS, workflow, lifecycle, assignment, document, RPC, route, or UI changes.

Related doctrine:

- `docs/CRUD_STABILIZATION_MATRIX.md`
- `docs/ACTIVITY_EVENT_OWNERSHIP_AUDIT.md`
- `docs/NOTIFICATION_OWNERSHIP_AUDIT.md`
- `docs/ORDER_WORKFLOW_STATUS_WRITE_AUDIT.md`
- `docs/ORDER_ASSIGNMENT_MUTATION_AUDIT.md`
- `docs/ORDER_RETIREMENT_DOCTRINE.md`

## Current Status

Status: **Sprint 5C defines unified activity and notification ownership doctrine without behavior
changes. Authoritative domain mutations should own their durable activity and eventual
notification fanout whenever possible. Frontend-emitted activity or notification side effects are
transitional unless explicitly product-approved. New work must avoid duplicate frontend/backend
fanout for the same event. Payloads must be safe, minimal, source-traceable, and actor attribution
must come from authenticated app user/company context rather than arbitrary frontend strings.**

## Core Doctrine

1. The authoritative mutation path owns operational side effects.

   If a backend RPC, trigger, or Edge-mediated path is authoritative for a domain mutation, that
   same backend-owned boundary should own the activity event and any notification fanout whenever
   practical.

2. Activity is durable operational memory; notifications are delivery prompts.

   Activity should record what happened and be suitable for history/audit readback. Notifications
   should prompt the right recipient to act or notice. Notifications must not become the only durable
   record of a domain event.

3. Frontend side effects are transitional unless explicitly approved.

   Frontend-created notes and workflow notifications are known transitional seams. New authoritative
   lifecycle, workflow, assignment, document, team, relationship, or client events should not add
   frontend-only activity or notification writes.

4. Do not duplicate fanout.

   A future backend notification owner must replace the current frontend fanout for the same event,
   not run in parallel. Duplicating inserts can duplicate in-app prompts and downstream email queue
   work.

5. Payloads must be safe and minimal.

   Payloads should include source identifiers and display metadata needed for routing/rendering.
   They must not include signed URLs, storage paths, bucket names, broad client data, hidden packet
   data, unrelated internal notes, or other fields outside the event's authorized surface.

6. Payloads must be source-traceable.

   New activity/notification payloads should identify the source domain object, source event key,
   source company where relevant, and route target where relevant. Assignment packet payloads should
   remain packet-scoped and must not grant canonical owner-order visibility to assigned-company
   recipients.

7. Actor attribution is backend context.

   Authoritative system events should derive actor user and company from current app user/current
   company context inside the backend boundary. Frontend display strings may be used as UI labels,
   but they should not be authoritative actor identity for security-relevant events.

8. Read-side permission gates are not write authority.

   Frontend permission checks can hide affordances and shape recipient UI, but backend RPCs/triggers
   remain responsible for authorization, company scope, actor identity, and side-effect ownership.

## Current Ownership Baseline

| Event Family | Current Activity Owner | Current Notification Owner | Doctrine Status |
|---|---|---|---|
| Order create/edit | Order audit triggers | Appraiser assignment trigger only | Activity acceptable; notification ownership is partial |
| Workflow status | Order audit trigger after `rpc_transition_order_status(...)` | Frontend `ordersService` / `emitNotification(...)` | Activity acceptable; notification fanout transitional |
| Workflow review/revision notes | Frontend `logNote(...)` through `rpc_log_event(...)` | Included in workflow fanout payload only where current frontend sends it | Transitional, not atomic |
| General order notes | Frontend `logNote(...)` through `rpc_log_event(...)` | Frontend `ActivityNoteForm` / `emitNotification(...)` | Transitional but product-accepted today |
| Archive/cancel/void lifecycle | Lifecycle RPCs plus status audit trigger where status changes | Missing/deferred | Activity acceptable; notification doctrine deferred |
| Order documents | Document RPCs through `rpc_log_event(...)` | Missing/deferred | Activity acceptable; notification doctrine deferred |
| Internal appraiser/reviewer assignment | Order audit trigger for participant activity | Appraiser assignment trigger only | Mixed; reviewer fanout deferred |
| Internal `assigned_to` compatibility | `rpc_assign_order(...)` compatibility activity | Missing/deferred | Transitional compatibility |
| Cross-company assignment packets | Assignment lifecycle RPCs into `order_company_assignment_activity` | Assignment lifecycle RPCs through `notify_order_company_assignment_event(...)` | Backend-owned and packet-scoped |
| Legacy review helper | Frontend compatibility wrapper through `rpc_log_event(...)` | None identified | Deprecated cleanup candidate |

## Payload Rules

New activity and notification payloads should prefer:

- stable source identifiers, such as `order_id`, `assignment_id`, `document_id`, or relationship id;
- event key or event type;
- source company and recipient company identifiers where the event crosses company boundaries;
- order number or short display label when already authorized for the recipient;
- route target, such as `/orders/:id` or `/assignments/:assignmentId`;
- concise reason/note text only when the event doctrine explicitly permits it.

New payloads should avoid:

- signed URLs;
- storage bucket names;
- storage object paths;
- unrelated client/account details;
- broad order fields outside the recipient's authorized surface;
- arbitrary frontend actor names as authoritative identity;
- duplicated note bodies in multiple unrelated event rows unless intentionally designed.

## Actor Attribution Rules

Backend-owned events should use:

- `current_app_user_id()`;
- `current_company_id()`;
- active company membership checks;
- backend-resolved user profile data only where display metadata is needed.

Frontend-owned transitional events may pass display labels for current UI, but future backend
ownership should replace those labels with backend-resolved actor identity and only preserve
frontend text as non-authoritative display context.

## No-Duplicate Migration Rule

When moving a fanout path backend-side:

1. Define backend recipients, payload, actor, company scope, category, priority, and link path.
2. Add the backend fanout.
3. Remove or quarantine the matching frontend fanout in the same cleanup slice.
4. Add source-scan or service tests that prevent reintroducing the frontend emission.
5. Verify the event produces one notification row per intended recipient.

This applies especially to workflow notifications, note/comment notifications, lifecycle
notifications, and future document notifications.

## Priority Future Migrations

1. **Workflow notifications.**
   Move `order.sent_to_review`, `order.sent_back_to_appraiser`, `order.review_cleared`,
   `order.ready_for_client`, and `order.completed` fanout from frontend `emitNotification(...)` to
   backend-owned transition orchestration. Decide `request_final_approval` fanout at the same time.

2. **Review/revision notes.**
   Move optional resubmission/revision note creation into backend workflow orchestration if notes
   need to be atomic with status transitions. Backend ownership should decide whether those notes
   also produce note notifications or remain workflow payload context only.

3. **Reviewer assignment notifications.**
   Define whether `reviewer_id` assignment should notify reviewers, admins, or owners, and whether
   it belongs in the same participant-assignment backend surface as appraiser assignment.

4. **Lifecycle notification doctrine.**
   Decide archive/cancel/void notification recipients, language, priority, and whether any are
   silent by default. Lifecycle fanout must be backend-owned by lifecycle RPCs or a clearly scoped
   backend helper.

5. **Document notification doctrine.**
   Decide whether upload/finalize/archive should notify appraisers, reviewers, admins, clients, or
   no one. Any document notification payload must omit storage internals and signed access details.

6. **Generic helper quarantine.**
   Quarantine or narrow low-level activity and notification helpers so new product events cannot
   bypass canonical backend ownership, event registries, or source-scan protections.

## Deferred Non-Goals

- No notification redesign is implemented in Sprint 5C.
- No workflow, lifecycle, assignment, document, client, relationship, or team behavior changes.
- No new RPCs, triggers, RLS policies, UI, or source-scan behavior changes.
- No decision that all notifications must exist; explicit silent behavior remains valid when
  product doctrine says the event should be activity-only.
