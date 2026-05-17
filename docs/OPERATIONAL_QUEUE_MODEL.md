# Operational Queue Model

## Purpose

Operational queues help Falcon users decide what needs attention next.

They are not the order lifecycle itself. They are derived views that combine workflow status, dates, assignment, workload, and risk signals into actionable worklists for appraisers, reviewers, admins, and owners.

The goal is to make daily operations easier to scan:

- Which orders are late or becoming late?
- Which orders are blocked?
- Which person or role needs to act?
- Which work is at risk before it becomes a client issue?
- Which orders should be escalated or reassigned?

## Workflow Status vs Operational Queue

### Workflow Status

Workflow status is the canonical lifecycle state of an order.

Examples:

- `new`
- `in_progress`
- `in_review`
- `needs_revisions`
- `review_cleared`
- `pending_final_approval`
- `ready_for_client`
- `completed`

Status answers: **Where is this order in the formal lifecycle?**

Workflow status should remain stable, deterministic, and suitable for backend enforcement.

### Operational Queue

An operational queue is a derived worklist or alert bucket.

Examples:

- Due Soon
- Overdue
- Waiting on Reviewer
- Revision Loop Risk

Queue membership answers: **Why should someone look at this order now?**

An order can appear in multiple queues at once. For example, an order can be `in_review`, `Due Soon`, and `Reviewer Overload` at the same time.

Operational queues are derived operational intelligence, not core order statuses.

## Queue Principles

- Queues should be deterministic.
- Queues should be explainable.
- Queue membership should be reproducible from order fields, assignments, timestamps, and configuration.
- Users should be able to understand why an order appears in a queue.
- Queues should not replace workflow enforcement.
- Queues should not create hidden lifecycle states.
- Queue logic should start simple and become configurable only after repeated operational need is clear.

## Current Frontend Assessment Foundation

Operational Queue Intelligence Slice 1 is complete.

Falcon now has a shared deterministic frontend order assessment helper. It produces quiet, explainable metadata from the current normalized order row without changing workflow status, persistence, dashboard UI, or backend behavior.

Assessment shape:

```txt
queueIds
signals
nextOwner
primaryQueueId
```

Current centralized queues:

- `due_soon`
- `overdue`
- `waiting_on_reviewer`
- `waiting_on_appraiser`
- `final_approval_queue`
- `ready_for_delivery`
- `unassigned_orders`

Signals are operational explanations, not predictive scoring. Examples include "Client due date is within 48 hours.", "Review is waiting on reviewer.", and "Ownership assignment is incomplete."

Existing dashboard queue counts and filtering are preserved. The dashboard still presents Operational Attention and Active Worklist behavior as before; this slice only centralizes the deterministic assessment layer.

No backend, schema, RPC, or UI changes were made for this slice.

Operational Queue Intelligence Slice 2 is complete.

When a dashboard queue is selected, the Active Worklist now shows quiet explanatory queue context derived from the shared assessment signal labels. This helps explain why the current filtered worklist exists without adding row clutter or alert language.

Example behavior:

- Due Soon explains that the client due date is within 48 hours.
- Waiting on Reviewer explains that review is waiting on reviewer action.
- Ready For Delivery explains that the order is ready for delivery.

Queue cards, queue filtering, table columns, order click-through, and Smart Actions remain unchanged. Row-level signal display is intentionally deferred to avoid table clutter.

No backend, schema, RPC, new queue, prediction, or scoring changes were made for Slice 2.

## Initial Proposed Operational Queues

### Due Soon

Purpose: Surface orders approaching a client-facing due date.

Suggested logic:

- Order is not `completed`.
- Final due date is within the configured warning window, initially 48 hours.
- Final due date is not already overdue.

Target user: Admin, owner, assigned appraiser, assigned reviewer where relevant.

Urgency level: High.

Suggested actions:

- Review current status and next owner.
- Confirm appraiser/reviewer ETA.
- Prioritize review or final approval work.
- Contact client if delivery risk is material.

### Overdue

Purpose: Surface orders past a client-facing due date.

Suggested logic:

- Order is not `completed`.
- Final due date is before now.

Target user: Admin, owner.

Urgency level: Critical.

Suggested actions:

- Escalate internally.
- Confirm cause of delay.
- Reassign or reprioritize work if needed.
- Update client communication plan.

### Stuck Orders

Purpose: Identify orders that have not moved for too long.

Suggested logic:

- Order is not `completed`.
- `updated_at` or last status change is older than a configured threshold for the current status.
- Initial threshold can be status-specific:
  - `new`: 24 hours.
  - `in_progress`: 3 business days.
  - `in_review`: 1 business day.
  - `needs_revisions`: 2 business days.
  - `review_cleared`: 1 business day.

Target user: Admin, owner.

Urgency level: Medium / high.

Suggested actions:

- Identify current owner.
- Ask for status.
- Reassign if blocked.
- Add note documenting follow-up.

### Waiting on Reviewer

Purpose: Show orders where reviewer action is the next expected step.

Suggested logic:

- Status is `in_review`.
- Reviewer is assigned.
- Review due date is present or review has been pending longer than a configured threshold.

Target user: Reviewer, admin, owner.

Urgency level: Medium / high.

Suggested actions:

- Reviewer completes review.
- Reviewer requests revisions.
- Admin checks reviewer workload.
- Admin reassigns reviewer if needed.

### Waiting on Appraiser

Purpose: Show orders where appraiser action is the next expected step.

Suggested logic:

- Status is `new`, `in_progress`, or `needs_revisions`.
- Appraiser is assigned.
- Order is due soon, overdue, or has been in the current status longer than the configured threshold.

Target user: Appraiser, admin, owner.

Urgency level: Medium / high.

Suggested actions:

- Appraiser schedules inspection, uploads report, or resubmits to review.
- Admin checks ETA.
- Admin reassigns if the appraiser is blocked.

### Inspection Complete / Report Not Started

Purpose: Find orders where fieldwork appears complete but report work has not progressed.

Suggested logic:

- Site visit date/time is in the past.
- Status is `new` or `in_progress`.
- No report upload or review submission has occurred.
- Optional: threshold starts after site visit, such as 24 hours.

Target user: Appraiser, admin.

Urgency level: Medium.

Suggested actions:

- Appraiser starts or completes report.
- Admin confirms whether inspection occurred.
- Admin updates site visit if the date is wrong.

### Final Approval Queue

Purpose: Surface orders awaiting owner/admin final approval before client delivery.

Suggested logic:

- Status is `pending_final_approval`.
- Order is not completed.

Target user: Owner, admin.

Urgency level: High.

Suggested actions:

- Approve for client delivery.
- Request additional changes.
- Confirm any client-specific delivery requirements.

### Ready For Delivery

Purpose: Show orders cleared for client delivery but not yet completed.

Suggested logic:

- Status is `ready_for_client`.
- Order is not `completed`.

Target user: Admin, owner, delivery coordinator.

Urgency level: High.

Suggested actions:

- Deliver report to client.
- Confirm delivery channel.
- Mark completed when delivery is done.

### Reviewer Overload

Purpose: Identify reviewers with too many active review responsibilities.

Suggested logic:

- Count active assigned review orders by reviewer.
- Include statuses such as `in_review` and optionally `pending_final_approval` if reviewer participation is configured.
- Compare count against a configured reviewer capacity threshold.

Target user: Admin, owner.

Urgency level: Medium.

Suggested actions:

- Rebalance review assignments.
- Delay new review assignment to overloaded reviewer.
- Escalate due-soon review work.

### Appraiser Overload

Purpose: Identify appraisers with too many active production responsibilities.

Suggested logic:

- Count active assigned orders by appraiser.
- Include statuses such as `new`, `in_progress`, and `needs_revisions`.
- Compare count and due-date pressure against a configured appraiser capacity threshold.

Target user: Admin, owner.

Urgency level: Medium.

Suggested actions:

- Rebalance assignments.
- Avoid assigning new work to overloaded appraiser.
- Escalate overdue or due-soon work.

### Unassigned Orders

Purpose: Surface orders missing required assignment.

Suggested logic:

- Order is not `completed`.
- Appraiser is missing, reviewer is missing when review is required, or both.
- Initial MVP can focus on missing appraiser for `new` and `in_progress` orders.

Target user: Admin, owner.

Urgency level: High.

Suggested actions:

- Assign appraiser.
- Assign reviewer if required.
- Confirm client/report type assignment rules.

### Revision Loop Risk

Purpose: Identify orders cycling between review and revisions.

Suggested logic:

- Order has entered `needs_revisions` more than once.
- Or order has multiple recent `request_revisions` transitions.
- Or order has been in `needs_revisions` beyond a configured threshold.

Target user: Admin, owner, reviewer, appraiser.

Urgency level: Medium / high.

Suggested actions:

- Review revision history.
- Clarify reviewer/appraiser expectations.
- Admin mediates or escalates.
- Consider reassignment or additional quality review.

## Future Intelligent Queues

Later Falcon versions can add AI-assisted or model-assisted queues, but those should build on deterministic queue foundations.

Known deferred deterministic queue work:

- Stuck orders.
- Revision loop risk.
- Reviewer/appraiser overload.
- Capacity modeling.
- At-risk scoring.
- Company-configurable thresholds.
- Backend canonical queue source.

Potential future queues:

- Delivery Risk Score.
- Client Escalation Risk.
- Revision Probability.
- Capacity Forecast.
- SLA Breach Prediction.
- Quality Review Risk.
- Assignment Recommendation.

Future intelligent queues should:

- Explain the factors behind each recommendation.
- Avoid hiding deterministic rules inside opaque scores.
- Allow admins/owners to override or dismiss recommendations.
- Be validated against historical operational outcomes.
- Never replace backend workflow enforcement.
