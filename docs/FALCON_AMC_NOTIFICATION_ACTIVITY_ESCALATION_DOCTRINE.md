# Falcon AMC Notification, Activity, and Escalation Doctrine

## Purpose

This document defines the canonical doctrine for Continental AMC notification behavior, activity memory, escalation handling, and communication separation before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, notification policies, notification seeds, activity tables, activity RPCs, database migrations, automation, escalation code, permissions, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`

## Core Doctrine

- Notifications are interruptive and should usually require action or meaningful awareness.
- Queue membership is operational attention and is not automatically a notification.
- Activity is durable memory and remains the source of operational history.
- Escalations are sparse, threshold-driven, explainable, and role-targeted.
- Assignment packet notifications remain separate from canonical owner-order notifications.
- Client-facing updates remain separate from internal AMC notifications.
- Vendor Portal notification, message, and activity copy should follow `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`.
- Vendor packet activity and packet notification events should follow `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`.
- Client Portal notification, message, status-update, document/report, and activity copy should follow `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`.
- Notification copy must route users to the correct surface without leaking hidden data.
- Notifications are not workflow state, audit authority, visibility authority, or the source of truth.

## AMC Notification Doctrine

Notifications should answer:

- Who needs to act now?
- What changed that a person must know?
- Which safe surface should the user open?
- Is this interruption more useful than a quiet queue signal?

Notifications should not answer:

- Every queue membership reason.
- Every internal status transition.
- Whether hidden records exist outside a user's scope.
- Internal security, permission, RLS, RPC, module, package, or relationship topology details.
- Vendor or client information that belongs to a different visibility boundary.

Routing boundaries:

- Canonical owner-order notifications route to authorized AMC owner-order or dashboard surfaces.
- Assignment packet notifications route to `/assignments/:assignmentId` and use packet-native language.
- Vendor Portal notifications should open packet execution surfaces, not canonical orders, owner dashboards, internal queues, or client communication.
- Vendor packet notification triggers should map to packet-safe states, actions, and queues rather than owner-order lifecycle changes.
- Client/lender notifications route to client-safe request/status/document/report/message surfaces and must not expose vendor packet state, assignment lifecycle, internal review/QC, internal escalation, or AMC queue language.
- System/admin notifications route to safe admin/settings/audit surfaces where authorized.

Self-suppression:

- The actor should usually not receive a notification for their own action.
- Self-suppression should not hide required compliance/security/confirmation records from activity or audit history.
- Self-suppression may be bypassed later for explicit confirmations, delivery receipts, or admin/audit events when productized.

Future preference implications:

- Preferences should tune delivery channels and optional reminders.
- Preferences should not convert hidden data into visible data.
- Required operational escalations may remain mandatory for accountable roles.
- Company notification policy may tune thresholds later, but should not turn every queue into an inbox item.

## Notification Event Families

### Intake events

Examples:

- New request received.
- Intake needs review.
- Missing document or incomplete request.
- Intake aging beyond threshold.

Who should receive alerts:

- AMC Coordinator or intake owner when action is needed.
- AMC Admin when intake is aging or blocked beyond policy.

Who should see activity only:

- AMC users with owner-order visibility who need historical context.
- Client users only when a client-safe request received/action-needed update is intentionally created.

When self-suppression applies:

- The coordinator who marks intake reviewed should not receive a duplicate notification.

Dashboard/queue relationship:

- New Intake and Intake Needs Review queues should carry most routine intake attention.
- Notifications should appear only for blocked, aging, urgent, or client-action states.

Future preference implications:

- Intake owners may tune reminder cadence.
- Client request receipt confirmations may become configurable by client account later.

### Assignment offer/response events

Examples:

- Assignment offered.
- Vendor accepted.
- Vendor declined.
- Offer expired or revoked.

Who should receive alerts:

- Vendor users for new offers and offer changes.
- AMC Coordinator/assignment owner for accept, decline, missed response, or revoked outcomes.

Who should see activity only:

- Authorized AMC users monitoring assignment history.
- Vendor users scoped to the packet timeline.

When self-suppression applies:

- The AMC user who sends an offer should not receive an "offer sent" notification.
- The vendor actor who accepts/declines should not receive a duplicate action notification.

Dashboard/queue relationship:

- Vendor Pending Response and Vendor Declined queues track owner-side attention.
- Vendor dashboards show offers waiting and packet state.

Future preference implications:

- Vendor offer notifications are high-priority and may be required.
- AMC outcome notifications may be routed by assignment owner later.

### Vendor production events

Examples:

- Vendor starts work.
- Vendor submits work.
- Packet correction response.
- Packet completed.

Who should receive alerts:

- AMC Coordinator or Reviewer when submitted work needs review or next action.
- Vendor users for correction requested, packet completion, or material packet status change.

Who should see activity only:

- AMC users with owner-side assignment visibility.
- Vendor packet participants through packet activity.

When self-suppression applies:

- Vendor users should not receive duplicate notifications for their own start/submit action.
- AMC reviewers should not receive duplicate notifications for their own correction request.

Dashboard/queue relationship:

- Active Vendor Work, Review Queue, Revision Required, and Ready for Delivery queues should carry normal attention.
- Notifications should focus on handoffs or blocked states.

Future preference implications:

- Vendor work reminders may become configurable by packet type, due date, or company policy.

### Vendor non-response/stall events

Examples:

- Offer response deadline missed.
- No recent packet activity.
- Vendor misses expected progress update.
- Vendor does not respond to correction request.

Who should receive alerts:

- AMC Coordinator or assignment owner.
- Vendor user for reminder when policy allows.
- AMC Admin for escalated or repeated non-response.

Who should see activity only:

- Authorized AMC users monitoring vendor history.
- Vendor packet users may see safe reminder or status history only inside packet scope.

When self-suppression applies:

- System-generated reminders do not have normal actor self-suppression.
- A coordinator who manually sends a reminder should not receive a duplicate reminder-sent notification.

Dashboard/queue relationship:

- Vendor Pending Response, Stalled Vendor, Overdue, and Delivery Risk queues are primary.
- Notifications should be sparse and threshold-driven.

Future preference implications:

- Company policy may tune first reminder, escalation delay, and admin escalation threshold.

### Review events

Examples:

- Vendor submitted work enters review.
- Review started.
- Review completed.
- Review overdue.

Who should receive alerts:

- Assigned AMC Reviewer for review-ready work or review overdue.
- AMC Coordinator/Admin for overdue review or blocked delivery.

Who should see activity only:

- Authorized AMC order users.
- Vendors and clients should not see internal review mechanics unless translated into packet/client-safe actions.

When self-suppression applies:

- Reviewer should not receive duplicate notification for their own review start/completion.

Dashboard/queue relationship:

- Review Queue and Review Overdue queues are primary.
- Notification should trigger on handoff, overdue, or delivery-blocking state.

Future preference implications:

- Reviewer workload reminders may be configurable by role and threshold.

### Revision events

Examples:

- Revision requested.
- Vendor correction requested.
- Vendor correction submitted.
- Repeated revision loop detected.

Who should receive alerts:

- Vendor users when correction is requested through packet.
- AMC Reviewer/Coordinator when correction is submitted or revision loop becomes risky.
- Client users only when a client-safe update or action request is intentionally sent.

Who should see activity only:

- AMC users with readable owner-order/assignment scope.
- Vendor packet users within packet timeline.

When self-suppression applies:

- Actor requesting or submitting revision should not receive duplicate action notifications.

Dashboard/queue relationship:

- Revision Required, Review Queue, Delivery Risk, and Client Waiting may apply.
- Notifications should focus on the next accountable party.

Future preference implications:

- Revision loop escalation thresholds may become company policy.

### Final approval events

Examples:

- Ready for final approval.
- Final approval overdue.
- Final approval completed.

Who should receive alerts:

- AMC Owner/Admin or authorized final approver when approval is needed.
- Coordinator/Admin when approval delay blocks delivery.

Who should see activity only:

- Authorized AMC order users.
- Client users only see client-safe status such as "In review" or "Ready for delivery" when appropriate.

When self-suppression applies:

- Final approver should not receive duplicate notification for their own approval action.

Dashboard/queue relationship:

- Final Approval Queue and Delivery Risk are primary.

Future preference implications:

- Final approval alerts may be mandatory for accountable approvers.

### Delivery events

Examples:

- Ready for delivery.
- Report delivered.
- Delivery failed or delayed.
- Report/document viewed or acknowledged later.

Who should receive alerts:

- AMC Coordinator/delivery owner when ready for delivery or delivery failure needs action.
- Client/lender users when report/document is delivered or action is needed.
- AMC Admin for aging ready-for-delivery items.

Who should see activity only:

- Authorized AMC users for delivery history.
- Client users for client-safe delivery history.
- Vendors only if packet rules include a safe packet outcome.

When self-suppression applies:

- The delivery actor should not receive duplicate delivery-sent notification unless confirmation is explicitly productized.

Dashboard/queue relationship:

- Ready for Delivery, Delivery Risk, Client Waiting, and Recently Completed are primary.

Future preference implications:

- Client delivery notifications may have account-specific channel preferences later.

### Client communication events

Examples:

- Client sends message.
- AMC sends client update.
- Document requested.
- Document uploaded.
- Client asks post-delivery question.

Who should receive alerts:

- AMC Coordinator/account owner when client action requires response.
- Client requester/users when AMC sends a client-visible message, document request, status update, or delivery notice.

Who should see activity only:

- AMC users with client/order communication scope.
- Client users scoped to the request/account where the message is visible.

When self-suppression applies:

- Sender should not receive duplicate notification for their own message.

Dashboard/queue relationship:

- Client Waiting and Delivery Risk may apply.
- Routine client-visible history should remain activity, not inbox noise.

Future preference implications:

- Client accounts may tune message/status/delivery notification channels later.

### Escalation events

Examples:

- Vendor non-response escalation.
- Review overdue escalation.
- Final approval delay escalation.
- Client waiting escalation.
- Delivery risk escalation.
- Manual escalation.

Who should receive alerts:

- The accountable owner/role for the escalation.
- AMC Admin/Owner when policy requires oversight.

Who should see activity only:

- Authorized AMC users who need escalation history.
- Vendors or clients only when a safe, separate packet/client update is intentionally created.

When self-suppression applies:

- Manual escalator should not receive duplicate escalation-created notification.
- System-generated escalation has no normal actor self-suppression.

Dashboard/queue relationship:

- Escalation should be visible in the relevant queue reason and owner-side activity.
- Notifications should be sparse and threshold-driven.

Future preference implications:

- Escalation policy may define mandatory delivery, throttle windows, and escalation ladder later.

### System/admin events

Examples:

- Import failure.
- Integration issue.
- Relationship lifecycle issue.
- Invitation or access issue.
- Configuration/admin attention.

Who should receive alerts:

- AMC Admin, Owner, or specific operational admin role.

Who should see activity only:

- Users with authorized admin/audit visibility.

When self-suppression applies:

- System events usually do not use actor self-suppression.
- Admin actions may suppress duplicate notifications to the acting admin unless confirmation is needed.

Dashboard/queue relationship:

- Admin/settings/integration dashboards later; not client/vendor packet surfaces by default.

Future preference implications:

- Admin event severity and delivery channel preferences may be productized later.

## Activity Memory Doctrine

Canonical order activity:

- Records owner-company operational history for the AMC order.
- Includes internal status, assignment, review, delivery, escalation, and operational notes where authorized.
- Does not become visible to vendors or clients by default.

Assignment-scoped activity:

- Records assignment packet lifecycle, packet-safe messages, offer/accept/decline/start/submit/correction/completion/cancel/revoke events.
- Routes users to assignment packet surfaces.
- Does not expose canonical owner-order activity to vendors.

Client-facing communication history:

- Records client-visible messages, status updates, document requests/uploads, delivery notices, and post-delivery communication.
- Is scoped to the client account/request/document surface.
- Does not expose internal AMC notes or vendor packet messages by default.

Internal AMC notes:

- Support coordination, review, escalation, routing, and internal operational context.
- Must remain internal unless explicitly converted or copied into a client/vendor-safe update.
- Should never be mixed accidentally with client-visible or vendor-visible communication.

System/audit events:

- Record administrative, security, integration, invitation, and lifecycle facts.
- May be visible only to authorized admin/audit roles.
- Should use safe labels and avoid exposing provider/security internals in normal UI.

Visibility boundaries:

- Owner order activity, assignment packet activity, client-facing communication, internal notes, and audit/system events are separate memory streams.
- A user may see more than one stream only when each stream is independently authorized.
- Activity visibility does not imply notification delivery.

Must never be mixed accidentally:

- Internal AMC notes with client-facing updates.
- Client messages with vendor packet messages.
- Vendor packet messages with client delivery communication.
- Audit/security events with normal operational activity.
- Notification summaries with durable activity records.
- Queue reasons with workflow status.

## Escalation Doctrine

Escalation is a controlled increase in attention when queue membership alone is not enough.

### Vendor non-response

Trigger concept:

- Vendor does not accept, decline, or respond by response deadline or expected communication window.

Owner/recipient:

- AMC Coordinator/assignment owner first; AMC Admin if threshold escalates.

Dashboard behavior:

- Vendor Pending Response, Stalled Vendor, Delivery Risk when due/SLA is affected.

Notification behavior:

- Targeted reminder/escalation to accountable AMC user.
- Vendor reminder only when policy allows.

Activity behavior:

- Record reminder/escalation and any response in assignment-scoped activity and owner-side operational activity where appropriate.

Future analytics relevance:

- Response time, non-response frequency, reassignment rate, vendor reliability.

### Vendor overdue

Trigger concept:

- Vendor packet due date or expected milestone passes without submission/completion.

Owner/recipient:

- Vendor user for packet reminder.
- AMC Coordinator/Admin for owner-side escalation.

Dashboard behavior:

- Overdue, Stalled Vendor, Delivery Risk.

Notification behavior:

- Sparse vendor reminder and AMC owner-side escalation.
- Avoid repeated unthrottled reminders.

Activity behavior:

- Preserve overdue/reminder/escalation history in packet and owner-side streams as appropriate.

Future analytics relevance:

- Vendor on-time rate, SLA impact, escalation effectiveness.

### Review overdue

Trigger concept:

- Submitted work waits beyond review threshold or review due date.

Owner/recipient:

- AMC Reviewer; AMC Coordinator/Admin when delivery is blocked.

Dashboard behavior:

- Review Overdue, Review Queue, Delivery Risk.

Notification behavior:

- Targeted reviewer notification; admin escalation if aging continues.

Activity behavior:

- Record review overdue/escalation in owner order activity.

Future analytics relevance:

- Review cycle time, reviewer capacity, delivery delay contribution.

### Final approval delay

Trigger concept:

- Order is ready for final approval but approval waits beyond threshold or blocks delivery.

Owner/recipient:

- Final approver, AMC Owner/Admin, or configured approval role.

Dashboard behavior:

- Final Approval Queue and Delivery Risk.

Notification behavior:

- Targeted notification to approver; escalation to owner/admin if delayed.

Activity behavior:

- Record approval-ready, escalation, and approval outcome.

Future analytics relevance:

- Approval cycle time, delivery lag, approval bottlenecks.

### Client waiting too long

Trigger concept:

- Client/lender message, document request, status request, or delivery expectation remains unanswered beyond threshold.

Owner/recipient:

- AMC Coordinator or Client Relationship Manager later.

Dashboard behavior:

- Client Waiting and Delivery Risk when urgent.

Notification behavior:

- Targeted internal notification.
- Client-facing update only when a safe response is ready or action is needed.

Activity behavior:

- Record internal waiting/escalation and client-visible update separately.

Future analytics relevance:

- Client response time, account health, communication SLA.

### Delivery risk

Trigger concept:

- Deterministic signals indicate likely delivery miss, blocked delivery, or client impact.

Owner/recipient:

- Accountable AMC Coordinator/Admin/Owner depending on source.

Dashboard behavior:

- Delivery Risk is primary and should explain the reason.

Notification behavior:

- Role-targeted escalation when threshold is crossed.

Activity behavior:

- Record risk reason and action taken in owner order activity.

Future analytics relevance:

- SLA risk modeling later, escalation effectiveness, source-of-delay analysis.

### Repeated revision loops

Trigger concept:

- Revisions/corrections repeat beyond threshold or materially threaten delivery/client expectations.

Owner/recipient:

- AMC Reviewer and Coordinator; AMC Admin if quality or SLA risk increases.

Dashboard behavior:

- Revision Required, Review Queue, Delivery Risk.

Notification behavior:

- Targeted escalation to reviewer/coordinator; avoid broad blasts.

Activity behavior:

- Record revision loop and escalation without exposing internal notes to clients/vendors.

Future analytics relevance:

- Revision rate, quality patterns, vendor performance, review effectiveness.

### Manual escalation

Trigger concept:

- Authorized AMC user intentionally escalates an issue because normal queues are insufficient.

Owner/recipient:

- Selected accountable user/role and optional admin/owner.

Dashboard behavior:

- Escalated item should remain visible in its source queue with an escalation reason.

Notification behavior:

- Targeted notification to selected recipient(s).

Activity behavior:

- Record who escalated, safe reason, timestamp, and resolution when available.

Future analytics relevance:

- Manual escalation volume, reason trends, resolution time.

### Future automated escalation

Trigger concept:

- Policy-defined thresholds later create escalation without manual action.

Owner/recipient:

- Configured role/accountable owner based on source and company policy.

Dashboard behavior:

- Must remain explainable from known data and show the trigger reason.

Notification behavior:

- Sparse, throttled, and policy-driven.

Activity behavior:

- Record automated trigger, source data, and outcome in audit/operational memory.

Future analytics relevance:

- Automation quality, false positive rate, SLA prevention effectiveness.

## Communication Separation

Internal AMC note:

- Private operational note for AMC coordination, review, escalation, routing, or internal context.
- Not client-visible or vendor-visible by default.

Vendor packet message:

- Assignment-scoped message visible inside packet surfaces.
- Should not expose client communication or internal AMC notes unless intentionally included in the packet contract.

Client-facing update:

- Request/status/document/report message visible to client/lender users in their scoped surfaces.
- Should not expose vendor messages, vendor non-response, reviewer workload, internal queues, or internal escalation mechanics.

System status update:

- Generated operational state update such as import processed, delivery attempted, packet submitted, or status projection changed.
- May create activity and sometimes notification if action is needed.

Audit/security event:

- Administrative/security/compliance record for grants, invitations, access, imports, integrations, or protected lifecycle actions.
- Should not appear as ordinary client/vendor communication.

Notification summary:

- Short, actionable prompt that routes to the correct surface.
- It is not the durable record and should not contain hidden details.

These surfaces must not collapse into one generic "message." Each needs explicit visibility, routing, and retention semantics before implementation.

## Guardrails

- Do not notify everyone for every queue change.
- Do not expose internal escalation to clients.
- Do not expose client messages to vendors unless explicitly intended.
- Do not expose vendor packet messages to clients by default.
- Do not make the activity feed a notification inbox.
- Do not make notifications the source of truth.
- Do not create predictive escalation yet.
- Do not leak internal status, permission, security, RLS, RPC, module, package, relationship topology, or predicate terms in notification copy.
- Do not route assignment packet notifications to canonical order routes.
- Do not route client notifications to internal AMC order dashboards.
- Do not merge internal AMC notes, vendor packet messages, client-facing updates, audit events, and notification summaries into one generic communication model.
- Do not make notification preference settings widen visibility.
- Do not turn every activity event into a notification.

## Future Contributor Checklist

Before implementing AMC notification, activity, or escalation behavior, verify:

- The recipient can act on or legitimately needs the interruption.
- Queue membership alone is not being treated as notification-worthy.
- The notification routes to the correct owner-order, assignment packet, client, or admin surface.
- Actor self-suppression is considered.
- Activity remains durable memory even when notification is suppressed.
- Client-facing updates and internal AMC notes are separate.
- Vendor packet messages and client messages remain separate.
- Escalation copy is safe and does not leak hidden data.
- Automated/predictive escalation remains deferred unless explicitly scoped.
- Notification preferences tune delivery without changing data visibility.
