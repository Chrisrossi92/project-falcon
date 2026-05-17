# Falcon Operational Intelligence Model

## Purpose

This document defines Falcon's unified operational-intelligence model.

It consolidates queue intelligence, scheduling intelligence, ownership semantics, workflow pressure, activity memory, and notification discipline into one product language.

This is not an implementation plan. It is the product-system architecture for how Falcon should understand operational work.

## 1. Core Philosophy

Falcon provides operational clarity under pressure.

The product should help users answer:

- What is on my plate?
- When is it due?
- What should I work on first?
- Who owns the next action?
- What changed and why?

Falcon's intelligence should be:

- High signal and low noise.
- Calm under deadline pressure.
- Deterministic before predictive.
- Explainable from order, schedule, assignment, workflow, and activity data.
- Restrained in visual treatment.
- Useful without becoming alert spam.

Falcon should quietly understand operations. It should not manufacture urgency, crowd the screen with badges, or force users to interpret raw status and date fields alone.

### Surface Roles

Each major surface has a distinct job:

- Dashboard: operational pressure snapshot.
- Orders: operational inventory and workspace.
- Calendar: operational scheduling workspace.
- Activity: operational memory.
- Notifications: personal delivery prompts, not the source of truth.

These surfaces should share the same operational language while presenting different levels of detail.

## 2. Operational Signals

Operational signals are deterministic observations derived from current business data.

They are not workflow statuses. They are not predictions. They explain why a user may need to look at an order, day, handoff, or assignment.

Signals should be:

- Deterministic: reproducible from known data.
- Explainable: understandable in plain language.
- Contextual: shown where they help a user act.
- Quiet: visually restrained unless the user drills into detail.

Current signal examples:

- `missing_site_visit`
- `review_compression`
- `appraiser_unassigned`
- `reviewer_unassigned`
- `due_soon`
- `overdue`
- `waiting_on_reviewer`
- `waiting_on_appraiser`
- `final_approval_queue`
- `ready_for_delivery`
- `unassigned_orders`

### Signal Shape

Signals should follow a stable conceptual shape:

```txt
id
label
tone
ownerRole
source
```

Optional supporting fields can include:

```txt
orderId
orderNumber
date
nextOwner
sourceField
metadata
```

### Tone Semantics

Tone describes display priority, not emotional urgency.

Recommended tones:

- `low`: quiet context.
- `medium`: useful operational cue.
- `high`: important work pressure.
- `critical`: reserved for clearly overdue or blocked conditions.

Tone should not produce noisy UI by default. A high or critical tone may affect sorting or grouping before it affects color intensity.

### Ownership Semantics

A signal may identify the role or person most likely to act next:

- Appraiser: production, inspection, report work, revision response.
- Reviewer: review, revision request, technical clearance.
- Admin/owner: assignment gaps, final approval, delivery, escalation.

Ownership is contextual. A global role does not mean a person owns every order in that role's domain.

### Source Semantics

Every signal should have a source.

Examples:

- `final_due_at`
- `review_due_at`
- `site_visit_at`
- `status`
- `appraiser_id`
- `reviewer_id`
- `activity_log`

Source fields make signals explainable and auditable. If Falcon cannot explain a signal from known source data, the signal should not appear as operational intelligence.

## 3. Queue Intelligence Model

Queues answer: why should someone look at this order now?

Operational queues are derived attention systems. They combine status, dates, assignment, and deterministic signals into worklists.

Queues are not:

- Kanban boards.
- Project management lanes.
- Hidden lifecycle states.
- Duplicated workflow statuses.
- Broad analytics cards.

### Queue Purpose

Queues help users prioritize active work.

Examples:

- Due Soon.
- Overdue.
- Waiting on Reviewer.
- Waiting on Appraiser.
- Final Approval Queue.
- Ready For Delivery.
- Unassigned Orders.

An order may appear in multiple queues. The workflow status remains canonical; queue membership explains attention.

### Queue Selection Logic

Queue logic should be deterministic and derived from current order fields.

Current frontend assessment shape:

```txt
queueIds
signals
nextOwner
primaryQueueId
```

This allows Falcon to:

- Filter dashboard and Orders worklists consistently.
- Explain why a queue exists.
- Identify the likely next owner.
- Preserve workflow status separately from operational attention.

### Primary Queue

`primaryQueueId` is the strongest current attention reason for an order.

It should support sorting, compact summaries, and future prioritization. It should not erase secondary queue memberships.

### Queue Explanations

Queue explanations should be short, calm, and tied to signal labels.

Examples:

- "Showing orders where client due date is within 48 hours."
- "Showing orders where review is waiting on reviewer."
- "Showing orders where order is ready for delivery."

Explanations belong near selected queue context, not repeated in every row by default.

### Active Worklist Semantics

The Active Worklist is the operational work surface for selected dashboard pressure.

It should:

- Reflect selected queue context.
- Preserve order click-through.
- Keep table columns stable.
- Avoid row clutter.
- Provide a path to the full Orders inventory.

Dashboard queue context can link to Orders through `/orders?queue=<queue_id>`, where the same shared queue evaluator is used for the queue-filtered inventory view.

## 4. Scheduling Intelligence Model

Scheduling intelligence answers: what is happening in time, and where is schedule pressure forming?

Calendar intelligence should remain quieter than queue intelligence because calendar grids can become visually overloaded quickly.

### Scheduling Pressure

Scheduling pressure can come from:

- Site visits not scheduled before review/final due dates.
- Review and final due dates compressed too closely.
- Missing appraiser or reviewer ownership.
- Heavy concentration of review or final delivery events on one day.

Current deterministic scheduling signals include:

- `missing_site_visit`
- `review_compression`
- `appraiser_unassigned`
- `reviewer_unassigned`

### Right Rail Context

Scheduling intelligence should live primarily in contextual surfaces such as the standalone calendar right rail.

The right rail can show:

- Selected day event count.
- Site / Review / Final counts.
- Grouped event lists.
- Order, client, address, status, and ownership context.
- Quiet per-event operational notes.
- Soft aggregate notes for heavy selected-day concentration.

This keeps the calendar grid readable while making deeper context available when the user selects a day.

### Calendar Grid Discipline

Calendar grids should remain calm.

Event chips should show compact operational labels and type meaning. They should not carry dense warnings, long explanations, or multiple competing badges.

The dashboard calendar remains a pressure snapshot. The standalone calendar is the scheduling workspace.

## 5. Ownership Semantics

Ownership answers: who should act next?

Falcon should distinguish:

- Visibility: who can see the order.
- Responsibility: who is expected to act.
- Assignment: who is formally assigned.
- Handoff: when responsibility moves from one role to another.

### Next Owner

`nextOwner` is derived from workflow status, assignment, and operational signal context.

Examples:

- `in_review` with reviewer assigned: reviewer is likely next owner.
- `needs_revisions` with appraiser assigned: appraiser is likely next owner.
- `pending_final_approval`: admin/owner is likely next owner.
- Missing assignment: admin/owner is likely next owner because assignment must be resolved.

### Appraiser Responsibility

Appraiser responsibility generally covers:

- New assigned orders.
- Inspection scheduling.
- Report production.
- Revision response.
- Resubmission to review.

Appraiser active dashboard work should not keep review-cleared or delivery-stage orders in the active production queue.

### Reviewer Responsibility

Reviewer responsibility generally covers:

- Orders submitted to review.
- Resubmissions.
- Revision requests.
- Review clearance.

Reviewer role does not create universal review ownership across all orders.

### Admin/Owner Visibility

Admins and owners may have broad visibility, but broad visibility should not become broad personal alert noise.

Admin/owner intelligence should emphasize:

- Assignment gaps.
- Delivery pressure.
- Final approval.
- Escalation paths.
- Operational bottlenecks.

### Handoff Semantics

Workflow handoffs should be explicit.

Examples:

- Appraiser submits to review: responsibility moves to reviewer.
- Reviewer requests revisions: responsibility moves back to appraiser.
- Reviewer clears review: responsibility moves to admin/owner for release policy.
- Admin marks ready for client: delivery responsibility becomes active.

Activity history should record the handoff. Queue and notification behavior should reflect the handoff without creating duplicate noise.

### Canonical Workflow Vocabulary

User-facing workflow actions should use one canonical vocabulary across Smart Actions, notifications, activity summaries, drawers, details, and queue context.

| Transition Key | Canonical User Label | Ownership Result |
| --- | --- | --- |
| `submit_to_review` | Send to Review | Appraiser hands review responsibility to reviewer. |
| `submit_to_review` from `needs_revisions` | Resubmit to Review | Appraiser returns revised work to reviewer. |
| `request_revisions` | Request Revisions | Reviewer sends revision responsibility back to appraiser. |
| `approve_review` | Clear Review | Reviewer clears technical review and hands release responsibility to admin/owner. |
| `request_final_approval` | Request Final Approval | Admin requests owner/admin approval before client release. |
| `ready_for_client` | Mark Ready for Client | Admin/owner marks the order ready for client delivery. |
| `complete` | Mark Complete | Admin/owner closes the delivery workflow. |

Internal transition keys can remain stable even when user-facing copy changes. Copy should describe the operational handoff, not only the target status.

Workflow Cohesion Slice 1 is complete. User-facing Smart Actions, workflow modal copy, notification fallback copy, activity fallback wording, and safe legacy action labels now align to this vocabulary. Explicit `order.ready_for_client` notification title/body copy is in place. No workflow behavior, permissions, RPCs, statuses, queue logic, or lifecycle structure changed.

## 6. Quiet Intelligence Philosophy

Falcon avoids:

- Alert spam.
- Red warning soup.
- Fake AI urgency.
- Enterprise dashboard clutter.
- Noisy predictive scoring.
- Equal visual weight for unequal operational importance.
- Making users parse raw database state to understand urgency.

Falcon prefers:

- Subtle contextual awareness.
- Deterministic explainability.
- Operational guidance.
- Quiet pressure indication.
- Clear next-owner language.
- Drill-down paths from summary to detail.
- Calm surfaces that still reveal urgency.

Quiet intelligence means Falcon can say "this needs attention" without making the entire interface feel like an emergency.

Language should stay operational:

- "Client due date is within 48 hours."
- "Review is waiting on reviewer."
- "No site visit scheduled."
- "Review and client due dates are tightly compressed."
- "Reviewer not assigned."

Language should avoid inflated urgency:

- "Critical risk."
- "High alert."
- "Severe bottleneck."
- "AI predicts failure."

Predictive or probabilistic language should not appear until Falcon has a validated intelligence model and can explain the supporting evidence.

## 7. Deferred Intelligence Systems

The following systems are intentionally deferred:

- Predictive scoring.
- At-risk scoring.
- Capacity modeling.
- Reviewer overload scoring.
- Appraiser overload scoring.
- Conflict prediction.
- AI operational recommendations.
- Tenant-configurable thresholds.
- Backend canonical intelligence engine.
- Backend canonical calendar source.
- Workload/capacity models.
- Deterministic unassigned/at-risk lenses beyond currently available metadata.
- Chip or month-cell warning indicators.
- Drag/drop scheduling and direct schedule editing.

These systems should build on deterministic foundations. They should not be added as isolated UI features.

Future intelligence should preserve:

- Explainability.
- Source attribution.
- Role-aware ownership.
- Calm visual hierarchy.
- Activity auditability.

## 8. Product System Cohesion

Calendar, queues, activity, Orders, and notifications should share one operational language.

### Calendar

Calendar explains schedule pressure.

It should show site visits, review handoffs, and client due dates with compact event semantics. The standalone calendar can expose richer selected-day context; the dashboard calendar should remain a pressure snapshot.

### Queues

Queues explain attention.

They should identify why work needs review now and who likely owns the next action. Queue selection can narrow the dashboard Active Worklist and Orders inventory without changing workflow status.

### Activity

Activity explains what happened.

It is operational memory, not a notification feed. Human communication, workflow milestones, and system events should be visually distinct but preserved for audit.

### Orders

Orders is the operational inventory and workspace.

It should support search, filtering, queue context, row actions, and full order detail without duplicating dashboard cards or turning into a separate project management system.

### Notifications

Notifications are delivery prompts.

They should route direct personal prompts and configured alerts. They are not the source of truth; activity remains the durable record.

Notification + Activity Cohesion Slice 1 is complete. Falcon now has a canonical notification event registry for current workflow and note delivery events. The registry is the semantic source of truth for notification copy and metadata, with these fields:

```txt
key
label
category
priority
primaryRecipientRole
suppressActor
secondaryRecipientIntent
buildTitle
buildBody
```

Title/body generation is centralized for:

- `order.new_assigned`
- `order.sent_to_review`
- `order.sent_back_to_appraiser`
- `order.review_cleared`
- `order.ready_for_client`
- `order.completed`
- `note.appraiser_added`
- `note.reviewer_added`

Notification Settings event keys and labels now align to canonical live event keys. Runtime behavior is unchanged: no new notification types, recipient routing changes, backend/schema/RPC changes, or queue/calendar signal notifications were added.

Notification + Activity Cohesion Slice 2 is complete. Actor suppression is now hardened for workflow handoff notifications: `order.sent_back_to_appraiser` suppresses the actor consistently, and `order.completed` suppresses the actor when actor identity is available. Runtime recipient doctrine otherwise remains unchanged.

Still deferred:

- `ready_for_client` recipient doctrine review.
- Admin/owner recipient distinction.
- Registry-driven ownership recipient matrix.
- Notification preference-policy reconciliation.
- `/activity` notification-history versus order activity separation.

### Shared Language

Across surfaces, Falcon should use consistent concepts:

- Order number for user-facing identity.
- Workflow status for lifecycle.
- Operational queue for attention.
- Signal for deterministic explanation.
- Next owner for responsibility.
- Activity for memory.
- Notification for prompt.

This cohesion is what makes Falcon feel like an operations command center instead of disconnected tables, calendars, and alerts.
