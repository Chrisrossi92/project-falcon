# Order Lifecycle Model

## Purpose

Falcon's order lifecycle should control workflow actions, active responsibility, visibility, communication routing, and notification delivery without hardcoding behavior to global role names.

The lifecycle model should be simple enough for MVP, but structured enough to support configurable appraisal firms, custom role names, reviewer queues, field tasks, client portal access, and company-specific workflow policies.

Core rules:

- `order.id` is the internal database/routing identifier.
- `order.order_number` is the user-facing identifier.
- Global role permissions decide what a user can generally do.
- Order-specific responsibility decides what a user is responsible for on a specific order.
- Visibility is separate from bell notification delivery.
- Activity log is the durable workflow and communication history.
- Notifications are delivery records generated from lifecycle and communication events.

## Canonical MVP Statuses

Recommended MVP statuses:

```txt
new
assigned
in_progress
inspection_scheduled
inspection_in_progress
inspection_complete
in_review
needs_revisions
ready_for_client
delivered
completed
canceled
on_hold
```

If MVP scope needs to stay tighter, `inspection_*`, `delivered`, `canceled`, and `on_hold` can be added after the core flow is stable. The core minimum status set is:

```txt
new
in_progress
in_review
needs_revisions
ready_for_client
completed
```

The expanded list is documented here so implementation decisions do not block future inspector, delivery, cancellation, or pause workflows.

## Status Definitions

### `new`

The order has been created but may not yet be fully assigned or started.

Meaning:

- Intake is complete enough to create an order record.
- Company order number should exist or be reserved.
- Assignment may be pending.
- No production work is expected yet unless assigned immediately.

Active participants:

- Admin/owner: visible, operationally active.
- Appraiser: active only if already assigned.
- Reviewer: inactive unless directly assigned/tagged.
- Inspector/field rep: inactive unless a field task is created.
- Billing: inactive unless billing workflow starts at intake.

Typical notifications:

- Assigned appraiser if assigned at creation.
- Admin/owner only by company preference.

### `assigned`

The order has required staff assignments but work has not meaningfully started.

Meaning:

- Appraiser has been assigned.
- Reviewer may be assigned now or later.
- The order is ready for production.

Active participants:

- Appraiser: active.
- Reviewer: inactive/passive unless company policy activates reviewer at assignment.
- Admin/owner: visible.
- Inspector/field rep: inactive unless task assigned.

Typical notifications:

- Appraiser receives assignment.
- Reviewer receives assignment only if company policy says reviewer assignment is a bell event.
- Admin feed records assignment.

### `in_progress`

The assigned appraiser is actively working the order.

Meaning:

- Appraisal work is underway.
- Internal notes, documents, and production updates are expected.
- Reviewer is not responsible yet unless tagged or company policy says early review is active.

Active participants:

- Appraiser: active primary.
- Reviewer: passive/inactive unless tagged or early-review policy applies.
- Admin/owner: visible.
- Inspector/field rep: active only for assigned task windows.
- Billing: passive unless billing work exists.

Typical notifications:

- Appraiser receives direct assignment/workflow notes.
- Reviewer does not receive routine appraiser activity unless tagged or policy-enabled.
- Admin/owner bell notifications are preference-controlled.

### `inspection_scheduled`

A field visit, inspection, or photo task has been scheduled.

Meaning:

- Appraisal work may continue, but a field participant has an active task.
- This can be a primary order status or a parallel task status depending implementation maturity.

Active participants:

- Appraiser: active.
- Inspector/field rep: active for their assigned task.
- Reviewer: passive.
- Admin/owner: visible.

Typical notifications:

- Field rep receives schedule/assignment.
- Appraiser receives inspection scheduling update.
- Admin feed records task schedule.

Implementation note:

For MVP, prefer modeling inspection as an `order_tasks` record rather than forcing the whole order into an inspection status. The status is listed for companies that want inspection as a visible order phase.

### `inspection_in_progress`

The field participant is actively completing their task.

Meaning:

- Field task is underway.
- Field updates/photos may be added.

Active participants:

- Inspector/field rep: active primary for task.
- Appraiser: active secondary.
- Admin/owner: visible.
- Reviewer: passive.

Typical notifications:

- Appraiser receives completion-relevant field updates.
- Admin/owner by preference.

### `inspection_complete`

Field work is complete and responsibility returns to appraisal production.

Meaning:

- Field task deliverables are submitted.
- Appraiser can continue or finalize production.

Active participants:

- Appraiser: active primary.
- Inspector/field rep: inactive after completion unless tagged or task reopened.
- Reviewer: passive.
- Admin/owner: visible.

Typical notifications:

- Appraiser receives inspection completion.
- Field rep receives no more routine order notifications.

### `in_review`

The order has been submitted for review.

Meaning:

- Appraiser has submitted work.
- Reviewer is responsible for quality review.
- Appraiser remains involved for questions and corrections.

Active participants:

- Reviewer: active primary.
- Appraiser: active secondary.
- Admin/owner: visible.
- Inspector/field rep: inactive unless tagged or task reopened.
- Billing: passive.

Typical notifications:

- Reviewer receives submission to review.
- Appraiser receives reviewer notes, questions, and revision requests.
- Admin feed records review submission.

### `needs_revisions`

Reviewer requested changes and responsibility returns to the appraiser.

Meaning:

- The order is not approved.
- Appraiser needs to address reviewer comments.
- Reviewer remains visible but is not primary until resubmission.

Active participants:

- Appraiser: active primary.
- Reviewer: active secondary/passive, depending company policy.
- Admin/owner: visible.
- Inspector/field rep: inactive unless revision requires a field task.

Typical notifications:

- Appraiser receives revision request.
- Reviewer receives resubmission when appraiser responds.
- Admin feed records revision request.

### `ready_for_client`

Internal review is approved and the order is ready for delivery.

Design decision:

- Default Falcon workflow should separate reviewer clearance from client release.
- Reviewer role remains technical review: send back to appraiser and clear review/review cleared.
- Admin/owner controls client release by default: mark ready for client and mark completed.
- Company settings may optionally allow reviewer release for firms whose workflow permits it.
- When marked ready for client, the appraiser should generally be notified that the report has been cleared/released.
- Admins/owners should remain notified or action-aware, while reviewer notification should be optional/configurable.
- These notification choices should be controlled by company workflow/notification settings later.
- Final owner approval should be configurable: none, always required, or required by client/report type/threshold/manual decision later.
- Potential future statuses include `review_cleared` and `pending_final_approval` before `ready_for_client`.

Meaning:

- Internal work is complete.
- Delivery/admin/client-facing workflow is next.
- Company policy decides whether reviewer or admin owns final delivery.

Active participants:

- Admin/delivery owner: active if delivery is admin-owned.
- Reviewer: active or passive depending company policy.
- Appraiser: passive unless tagged.
- Billing: active if invoice/payment must be prepared before delivery.
- Client portal user: may become visible if client delivery preview is enabled.

Typical notifications:

- Delivery/admin role receives ready-for-client event if configured.
- Billing receives event if configured.
- Appraiser may receive status update by preference.

### `delivered`

The report or client-facing deliverable has been sent.

Meaning:

- Client has received the order deliverable.
- Billing or final closure may remain.

Active participants:

- Billing: active if payment/invoice remains.
- Admin/owner: visible.
- Appraiser/reviewer: passive unless follow-up is needed.
- Client portal user: active for client-facing access.

Typical notifications:

- Client portal user may receive delivery notification.
- Billing may receive delivery/completion workflow notification.
- Admin feed records delivery.

### `completed`

The order is fully complete.

Meaning:

- Production, review, delivery, and required billing closure are finished.
- Routine workflow notifications stop.
- Historical activity remains visible according to permissions.

Active participants:

- No routine active internal participants.
- Admin/owner: visible.
- Billing: passive unless post-completion adjustment.
- Participants remain visible for historical context.

Typical notifications:

- Optional completion notification by preference.
- No routine note notifications unless reopened, tagged, or company policy says otherwise.

### `canceled`

The order was canceled before completion.

Meaning:

- Active production work should stop.
- Existing activity remains audit-visible.
- Billing may still need cancellation fees or adjustments.

Active participants:

- Admin/owner: active for closure.
- Billing: active if cancellation billing exists.
- Appraiser/reviewer/field rep: inactive unless needed for closeout.

Typical notifications:

- Assigned participants receive cancellation if they were active.
- Client portal user may receive cancellation if client-facing.
- Admin feed records cancellation.

### `on_hold`

The order is temporarily paused.

Meaning:

- Work is suspended.
- Active participants should not receive routine reminders unless the hold changes.
- The previous status should be stored so the order can resume correctly.

Active participants:

- Admin/owner: active for hold management.
- Appraiser/reviewer/field rep: paused.
- Billing: active only if hold affects billing.

Typical notifications:

- Active participants receive hold notification.
- Resume notification goes to participants who become active again.

## Status Transition Map

Recommended allowed transitions:

| From | To | Trigger | Required Permission | Typical Actor |
| --- | --- | --- | --- | --- |
| none | `new` | Create order | `orders.create` | Admin, owner, delegated intake |
| `new` | `assigned` | Required assignment complete | `assignments.assign_appraiser` | Admin, owner |
| `new` | `in_progress` | Assign and start immediately | `orders.create` + `assignments.assign_appraiser` or `workflow.status.start` | Admin, owner, assigned appraiser if allowed |
| `assigned` | `in_progress` | Start work | `workflow.status.start` or appraiser responsibility | Assigned appraiser, admin |
| `in_progress` | `inspection_scheduled` | Schedule field task | `assignments.assign_inspector` | Admin, appraiser if delegated |
| `inspection_scheduled` | `inspection_in_progress` | Begin field task | `workflow.task.start_inspection` | Assigned inspector/field rep |
| `inspection_in_progress` | `inspection_complete` | Complete field task | `workflow.task.complete_inspection` | Assigned inspector/field rep |
| `inspection_complete` | `in_progress` | Resume appraisal work | appraiser responsibility or `workflow.status.start` | Assigned appraiser |
| `in_progress` | `in_review` | Submit to review | `workflow.status.submit_to_review` | Assigned appraiser, admin override |
| `in_review` | `needs_revisions` | Request revisions | `workflow.status.request_revisions` | Assigned reviewer, admin override |
| `needs_revisions` | `in_review` | Resubmit to review | `workflow.status.resubmit` | Assigned appraiser, admin override |
| `in_review` | `ready_for_client` | Approve review | `workflow.status.approve_review` | Assigned reviewer, admin override |
| `ready_for_client` | `delivered` | Deliver to client | `workflow.status.deliver_to_client` | Admin, reviewer if delegated |
| `delivered` | `completed` | Close order | `workflow.status.complete` | Admin, billing if delegated, owner |
| `ready_for_client` | `completed` | Close without separate delivery status | `workflow.status.complete` | Admin, owner |
| any active | `on_hold` | Place hold | `workflow.status.hold` | Admin, owner |
| `on_hold` | previous active status | Resume | `workflow.status.resume` | Admin, owner |
| any active | `canceled` | Cancel order | `workflow.status.cancel` | Admin, owner |
| `completed` | previous active status or `in_progress` | Reopen | `workflow.status.reopen` | Admin, owner |
| `canceled` | previous active status or `new` | Uncancel/reopen | `workflow.status.reopen` | Owner, delegated admin |

## Required Permission Keys

Recommended lifecycle permission keys:

```txt
orders.create
orders.read.assigned
orders.read.all
orders.update.assigned
orders.update.all
assignments.assign_appraiser
assignments.assign_reviewer
assignments.assign_inspector
assignments.reassign
workflow.status.start
workflow.status.submit_to_review
workflow.status.request_revisions
workflow.status.resubmit
workflow.status.approve_review
workflow.status.ready_for_client
workflow.status.deliver_to_client
workflow.status.complete
workflow.status.hold
workflow.status.resume
workflow.status.cancel
workflow.status.reopen
workflow.override_status
workflow.task.start_inspection
workflow.task.complete_inspection
```

Order responsibility can satisfy some workflow permissions within the order context. For example, an assigned appraiser can submit their assigned order to review even if they do not have a global `workflow.status.submit_to_review` permission.

Company-level overrides such as `workflow.override_status` should be restricted to owner/admin-style permission bundles.

## Active Participant Matrix

| Status | Appraiser | Reviewer | Admin/Owner | Inspector / Field Rep | Billing | Client Portal User |
| --- | --- | --- | --- | --- | --- | --- |
| `new` | Active if assigned | Inactive unless tagged/policy | Visible / operational | Inactive unless task assigned | Inactive unless intake billing | Hidden unless portal intake |
| `assigned` | Active | Passive unless policy | Visible | Inactive unless task assigned | Inactive | Hidden |
| `in_progress` | Active primary | Passive unless tagged | Visible | Active only for task | Passive | Hidden |
| `inspection_scheduled` | Active | Passive | Visible | Active primary | Passive | Hidden |
| `inspection_in_progress` | Active secondary | Passive | Visible | Active primary | Passive | Hidden |
| `inspection_complete` | Active primary | Passive | Visible | Inactive unless reopened | Passive | Hidden |
| `in_review` | Active secondary | Active primary | Visible | Inactive unless tagged | Passive | Hidden |
| `needs_revisions` | Active primary | Active secondary/passive | Visible | Inactive unless task assigned | Passive | Hidden |
| `ready_for_client` | Passive | Active or passive by policy | Active for delivery | Inactive | Active if billing needed | Optional preview |
| `delivered` | Passive | Passive | Visible | Inactive | Active if unpaid | Active |
| `completed` | Historical/passive | Historical/passive | Visible | Historical/passive | Passive | Active if portal allows archive |
| `canceled` | Inactive | Inactive | Active closeout | Inactive | Active if fee/payment | Active only if client-facing |
| `on_hold` | Paused | Paused | Active hold manager | Paused | Passive | Hidden or limited |

## Notification Rules By Stage

Notification delivery should be generated from lifecycle events, responsibility, company preferences, and per-user preferences.

General rules:

- Direct active participants receive bell notifications for events requiring their attention.
- Admins/owners have visibility in communication/audit feeds.
- Admin/owner bell notifications are preference-controlled except critical operational/security events.
- Participants who are inactive should not receive routine bell notifications unless tagged, watching, or company policy says otherwise.
- All notification text should show `order.order_number`, not the internal UUID.

### Create / Assign

Recipients:

- Assigned appraiser on assignment.
- Assigned reviewer only if company policy says reviewer assignment is actionable immediately.
- Field rep if a task is assigned.
- Admin feed always records event.

### Production Notes During `in_progress`

Recipients:

- If appraiser adds note targeted to reviewer while reviewer is inactive, notify reviewer only if tagged or note category requires review visibility.
- If admin/reviewer adds note to assigned appraiser, notify appraiser.
- Admin feed records communication.

### Submit To Review

Recipients:

- Assigned reviewer receives bell notification.
- Assigned appraiser may receive confirmation by preference.
- Admin feed records submission.

### Reviewer Note During `in_review`

Recipients:

- Assigned appraiser receives bell notification.
- Admin feed records communication.

### Request Revisions

Recipients:

- Assigned appraiser receives high-importance bell notification.
- Reviewer remains visible for thread/revision history.
- Admin feed records revision request.

### Resubmit To Review

Recipients:

- Assigned reviewer receives bell notification.
- Assigned appraiser may receive confirmation by preference.
- Admin feed records resubmission.

### Approve Review / Ready For Client

Recipients:

- Delivery/admin role if configured.
- Billing role if ready-for-client triggers invoice workflow.
- Appraiser by preference.
- Admin feed records approval.

### Deliver / Complete

Recipients:

- Client portal user if client-facing notifications are enabled.
- Billing role if completion triggers billing closeout.
- Admin/owner by preference.
- Routine internal participant notifications should be optional.

### Cancel / Hold / Reopen

Recipients:

- All currently active participants.
- Billing if billing impact exists.
- Client portal user if client-facing.
- Admin feed records event.

## Participant Activation And Inactivation

### Appraiser

Becomes active:

- When assigned to the order.
- When order starts or is moved to `in_progress`.
- When revisions are requested.
- When tagged in communication.

Becomes inactive/passive:

- After `ready_for_client`, unless tagged or company policy keeps appraiser active through delivery.
- After `completed` or `canceled`.
- When reassigned away from the order.

### Reviewer

Becomes active:

- When order enters `in_review`.
- When assigned and company policy activates reviewer immediately.
- When directly tagged.
- When appraiser resubmits revisions.

Becomes inactive/passive:

- When status moves to `needs_revisions`, unless policy keeps reviewer active as secondary.
- When status moves to `ready_for_client`, if delivery is admin-owned.
- After `completed` or `canceled`.
- When reassigned away from the order.

### Inspector / Field Rep

Becomes active:

- When assigned to an inspection/field/photo task.
- When task status is `pending`, `scheduled`, or `in_progress`.

Becomes inactive:

- When task is completed, canceled, or reassigned.
- When order is completed/canceled unless a closeout task remains.

### Billing

Becomes active:

- When invoice/payment task is created.
- When order reaches `ready_for_client`, `delivered`, `completed`, or `canceled` if billing policy requires action.

Becomes inactive:

- When billing task is completed or waived.

### Admin / Owner

Admin/owner visibility:

- Broad visibility across all orders and communication, depending permissions.

Admin/owner bell activity:

- Preference-controlled.
- Should not automatically mirror all participant notifications.

## Reassignment Rules

Reassignment should create durable activity entries and update responsibility windows.

### Appraiser Reassignment

Allowed actors:

- Owner.
- Admin/delegated user with `assignments.reassign` and `assignments.assign_appraiser`.

Effects:

- Old appraiser responsibility becomes inactive.
- New appraiser responsibility becomes active if status is not terminal.
- Activity log records actor, old appraiser, new appraiser, status, and reason if provided.
- New appraiser receives assignment notification.
- Old appraiser receives removal/reassignment notification by company preference.
- Existing authored notes remain attributed to old appraiser.

Edge behavior:

- If order is `in_review`, reassignment should not automatically pull the order out of review unless company policy says new appraiser must acknowledge work.
- If order is `needs_revisions`, new appraiser becomes active primary and receives revision context.

### Reviewer Reassignment

Allowed actors:

- Owner.
- Admin/delegated user with `assignments.reassign` and `assignments.assign_reviewer`.

Effects:

- Old reviewer responsibility becomes inactive.
- New reviewer becomes active if status is `in_review`, or passive/assigned if pre-review.
- Activity log records reassignment.
- New reviewer receives notification if currently active or if reviewer assignment notification preference is enabled.
- Old reviewer receives notification by preference.

Edge behavior:

- If reassigned mid-review, new reviewer should receive a high-context notification with latest status and review notes.
- Pending revision requests from old reviewer remain in activity history.

### Inspector / Field Rep Reassignment

Allowed actors:

- Owner.
- Admin/delegated user with `assignments.assign_inspector` or `assignments.reassign`.
- Appraiser if company delegates field task assignment.

Effects:

- Old task assignee becomes inactive.
- New field participant becomes active for the task.
- Task activity records reassignment.
- Notifications go to new assignee and optionally old assignee.

## Reviewer Lifecycle

Reviewer participation should be lifecycle-aware.

Default reviewer behavior:

1. Reviewer can be assigned before review.
2. Reviewer is passive before `in_review` unless tagged or early-review policy is enabled.
3. Reviewer becomes active when the order enters `in_review`.
4. Reviewer can add notes, request revisions, or approve review.
5. When revisions are requested, appraiser becomes primary active participant.
6. Reviewer remains visible and may remain secondary active depending company policy.
7. When appraiser resubmits, reviewer becomes primary active again.
8. When review is approved, reviewer becomes passive unless company policy makes reviewer responsible for delivery.
9. Completed/canceled orders leave reviewer with historical visibility only.

Reviewer-specific permissions:

- `orders.read.assigned`
- `activity.create.note.assigned`
- `communications.view.assigned`
- `workflow.status.request_revisions`
- `workflow.status.approve_review`
- `workflow.status.ready_for_client`

Important rule:

A user with global reviewer permissions is not active on every order. They are active only when assigned, tagged, or granted queue-level work.

## Future Inspector / Field Role Integration

Do not model inspectors as permanent order participants unless the company wants them to see broad order context. Prefer task-scoped participation.

Suggested `order_tasks` model:

```txt
id
order_id
task_type: site_visit | field_photos | inspection | document_collection
assigned_to_user_id
status: pending | scheduled | in_progress | completed | canceled
due_at
scheduled_at
completed_at
metadata
created_by
created_at
updated_at
```

Inspector permissions:

- `orders.read.task_assigned`
- `workflow.task.start_inspection`
- `workflow.task.complete_inspection`
- `documents.upload.assigned`
- `activity.create.note.assigned`

Inspector notification rules:

- Notify when assigned.
- Notify on schedule changes.
- Notify on task comments that mention or target the inspector.
- Stop routine notifications after task completion/cancellation.

Order lifecycle integration:

- Field tasks can run in parallel with `in_progress`.
- Company may optionally expose `inspection_scheduled`, `inspection_in_progress`, and `inspection_complete` as order statuses.
- For MVP, task status should be enough unless dispatch/field workflow is a primary selling point.

## Activity Log Requirements

Every lifecycle transition should write a durable activity event.

Recommended event payload fields:

```json
{
  "order_id": "internal-uuid",
  "order_number": "ORD-24008",
  "actor": {
    "user_id": "public-users-id",
    "name": "Chris Rossi",
    "role_on_order": "appraiser"
  },
  "event_key": "workflow.submitted_to_review",
  "from_status": "in_progress",
  "to_status": "in_review",
  "reason": null,
  "participants": {
    "appraiser_id": "public-users-id",
    "reviewer_id": "public-users-id"
  },
  "importance": "normal"
}
```

Activity log records should be retained even if participants are later removed, users are deactivated, or roles change.

## Notification Payload Requirements

Lifecycle notifications should include enough context to render cleanly without extra queries.

Recommended payload fields:

```json
{
  "order_id": "internal-uuid",
  "order_number": "ORD-24008",
  "event_key": "workflow.requested_revisions",
  "importance": "high",
  "actor": {
    "user_id": "public-users-id",
    "name": "Pam Casper",
    "role_on_order": "reviewer"
  },
  "recipient": {
    "user_id": "public-users-id",
    "name": "Chris Rossi",
    "role_on_order": "appraiser"
  },
  "from_status": "in_review",
  "to_status": "needs_revisions",
  "communication": {
    "kind": "workflow",
    "kind_label": "Revision request",
    "direction_label": "Pam Casper → Chris Rossi"
  }
}
```

Visible notification text should use:

- Title: human event summary, such as `Pam Casper requested revisions`.
- Body: note/reason text when available.
- Order line: visible `ORD-24008` link.

Never show a full internal UUID as the visible order label except in explicit debug tooling.

## Edge Cases

### Reopen Completed Order

Rules:

- Requires `workflow.status.reopen`.
- Activity log records reopen reason.
- Reopened status should be explicit:
  - back to `in_progress` if appraiser work is needed.
  - back to `in_review` if review correction is needed.
  - back to `ready_for_client` if delivery correction is needed.
- Reactivate participants based on reopened status.
- Notify reactivated participants.

### Reassignment Mid-Review

Rules:

- New reviewer becomes active immediately if status is `in_review`.
- New appraiser becomes active secondary if status is `in_review`, primary if `needs_revisions`.
- Old participant becomes inactive but keeps historical attribution.
- Activity log should show old and new assignee.
- Notification payload should include reassignment reason if provided.

### Appraiser Removed With No Replacement

Rules:

- Order should move to `new` or `assigned` depending remaining assignments.
- Active appraiser responsibility ends.
- Admin/owner should receive operational alert if no appraiser exists and order is not terminal.

### Reviewer Removed During Review

Rules:

- Order remains `in_review` but review queue is blocked.
- Admin/owner receives operational alert.
- Appraiser should not receive routine review notifications until a reviewer is assigned or tagged.

### Order On Hold During Active Field Task

Rules:

- Field task should pause unless company policy says it can continue.
- Active task assignee receives hold notification.
- Resume should reactivate task assignee only if task remains incomplete.

### Canceled After Work Started

Rules:

- Active participants receive cancellation notification.
- Billing may become active for cancellation fee.
- Activity log remains visible.
- Routine note notifications stop unless tagged or closeout communication.

### User Deactivated While Assigned

Rules:

- Assignment should be flagged as invalid/blocking.
- Admin/owner receives operational alert.
- Historical activity remains attributed to deactivated user.
- New assignment should be required before workflow can continue.

### Global Admin Assigned As Appraiser

Rules:

- Order responsibility takes priority for workflow/notification routing.
- If admin is assigned appraiser, they act as appraiser for that order's participant logic.
- Admin/global permissions still allow extra admin actions, but should not change communication direction labels.

### Missing Order Number

Rules:

- Internal UUID can be used for routing.
- Visible UI should use a debug-safe shortened fallback only when no `order_number` exists.
- Missing order number should be treated as data quality issue for created orders.

## MVP Implementation Guidance

### Phase 1: Stabilize Core Statuses

- Use `new`, `in_progress`, `in_review`, `needs_revisions`, `ready_for_client`, and `completed`.
- Ensure status transitions write activity events.
- Ensure notifications use `order.order_number`.
- Ensure order assignment controls direct participant routing.

### Phase 2: Explicit Transition Helpers

- Centralize transition checks in a helper/service.
- Stop scattering status string checks across components.
- Return:
  - allowed transitions
  - required permission
  - active participants
  - notification recipients

### Phase 3: Add Reassignment Semantics

- Record old/new assignees.
- End old responsibility windows.
- Notify new active participants.
- Add blocked-state behavior for missing required assignees.

### Phase 4: Add Field Tasks

- Add `order_tasks` for inspection/photo/document collection.
- Keep field role task-scoped.
- Add task notifications and activity entries.

### Phase 5: Add Admin Communication Feed

- Build feed from activity log, not bell notifications.
- Show actor, recipient/context, order number, category, importance, and timestamp.
- Let admin bell preferences filter what becomes urgent.

### Phase 6: Company Workflow Configuration

- Let companies configure:
  - whether reviewer assignment triggers bell notification.
  - whether reviewer owns delivery.
  - whether completion requires delivered status.
  - whether billing becomes active at ready-for-client or delivered.
  - field task requirements.

## What To Avoid

- Do not add many UI statuses without transition rules.
- Do not let global reviewer role make every reviewer active on every order.
- Do not let admin visibility become automatic admin bell delivery.
- Do not use internal UUIDs as visible order identifiers.
- Do not make inspectors permanent full-order participants by default.
- Do not let reassignment erase historical activity attribution.
- Do not bypass permission checks because a transition button is hidden in the UI.
