# Falcon AMC Queue + Workflow Taxonomy

## Purpose

This document defines the canonical queue and workflow taxonomy for AMC Operations Mode and Continental AMC before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, queue code, workflow statuses, notification behavior, permission seeds, database migrations, billing logic, onboarding enforcement, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`

## Core Doctrine

- AMC queues are deterministic operational attention systems.
- Queue membership is not a workflow status by itself.
- Queue IDs are internal implementation vocabulary and must not be user-facing.
- AMC workflow should not blindly reuse Staff Appraisal order status labels.
- Assignment lifecycle is distinct from owner-company order lifecycle.
- Vendor packet status is distinct from AMC queue status.
- Client status is a simplified outward-facing projection.
- Internal AMC queue membership may be derived from owner order state, assignment status, due dates, review dates, activity, relationship state, and SLA policy.
- Vendor panel state and assignment eligibility doctrine should follow `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`.
- Vendor packet lifecycle states and vendor-safe dashboard queues should follow `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md` and must not reuse AMC internal queue names.
- Client/lender intake, status, communication, and delivery doctrine should follow `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`.
- Notification, activity, and escalation behavior should follow `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`.
- Not every queue should create a notification.
- Activity remains durable operational memory.
- Predictive scoring, vendor scoring, auto-routing, and automated escalation remain deferred.

## Queue Priority Levels

Priority levels are planning vocabulary:

- Critical: probable SLA/client impact or overdue operational action.
- High: action needed soon or current blocker.
- Medium: active queue requiring routine attention.
- Low: informational or recent-history queue.

Priority should guide dashboard order and escalation behavior. It should not automatically determine notification delivery.

## AMC Queue Taxonomy

### `new_intake`

Display label:

- New Intake.

Purpose:

- Captures newly received lender/client/direct/AMC-created requests that need initial operational triage.

Primary actor:

- AMC Coordinator.

Source data needed:

- Owner order/request creation timestamp, request source, client/lender identity, intake completeness fields, required documents, due dates, SLA policy.

Entry conditions:

- Request/order exists in AMC scope.
- Intake has not been triaged.
- Order is not cancelled, delivered, or completed.

Exit conditions:

- Intake is marked ready, incomplete, cancelled/withdrawn, or moved to a client/document-needed state.

Priority level:

- Medium; High when aging near intake SLA.

Dashboard placement:

- Intake section.

Notification relationship:

- Usually quiet dashboard attention.
- Notify coordinator/admin only when intake aging crosses threshold or a client action is time-sensitive.

Future analytics relevance:

- Intake volume, intake aging, intake source mix, client/lender demand patterns.

### `intake_needs_review`

Display label:

- Intake Needs Review.

Purpose:

- Captures intake records that require human validation before assignment or production.

Primary actor:

- AMC Coordinator or AMC Admin.

Source data needed:

- Intake completeness, document requirements, client/lender flags, manual review flag, risk indicators, product type, due/SLA data.

Entry conditions:

- Intake has missing, conflicting, unusual, or risk-marked data.
- Order/request cannot move to assignment-ready state without review.

Exit conditions:

- Intake is corrected and ready, returned for client/document action, cancelled/withdrawn, or intentionally routed for internal handling.

Priority level:

- High when blocking assignment or SLA-sensitive; Medium otherwise.

Dashboard placement:

- Intake section.

Notification relationship:

- Quiet by default.
- Notify assigned coordinator/admin when blocked intake approaches SLA threshold.

Future analytics relevance:

- Intake defect rate, client/lender data quality, document bottleneck patterns.

### `unassigned`

Display label:

- Unassigned.

Purpose:

- Captures assignment-ready AMC work that has not yet been assigned internally or offered to a vendor.

Primary actor:

- AMC Coordinator or AMC Admin.

Source data needed:

- Intake-ready state, owner order data, assignment records, internal assignment fields, vendor eligibility data, due dates, SLA policy.

Entry conditions:

- Intake is ready.
- No active internal owner assignment or active vendor assignment packet exists.
- Order is not cancelled, delivered, or completed.

Exit conditions:

- Internal fulfillment is assigned.
- Vendor offer is created.
- Order is cancelled/withdrawn.

Priority level:

- High; Critical if SLA is near or overdue.

Dashboard placement:

- Assignment section.

Notification relationship:

- Queue first.
- Notify coordinator/admin when unassigned work crosses aging/SLA threshold.

Future analytics relevance:

- Assignment lag, routing bottlenecks, capacity gaps, vendor panel coverage gaps.

### `vendor_pending_response`

Display label:

- Vendor Pending Response.

Purpose:

- Captures assignment offers waiting for vendor acceptance or decline.

Primary actor:

- AMC Coordinator; Vendor responds from packet surface.

Source data needed:

- Assignment packet status, offer timestamp, response deadline, relationship status, vendor company, due/SLA data.

Entry conditions:

- Assignment packet is offered.
- Vendor has not accepted, declined, expired, or been revoked.

Exit conditions:

- Vendor accepts, declines, offer expires, offer is revoked/cancelled, or assignment is reassigned.

Priority level:

- Medium; High/Critical when response deadline or SLA is near.

Dashboard placement:

- Assignment section and Vendor Attention section.

Notification relationship:

- Vendor receives offer notification.
- AMC receives quiet queue signal first; targeted escalation if response deadline is missed.

Future analytics relevance:

- Vendor response time, acceptance rate, non-response rate, routing effectiveness.

### `vendor_declined`

Display label:

- Vendor Declined.

Purpose:

- Captures recently declined offers that need reassignment, cancellation, or operational review.

Primary actor:

- AMC Coordinator or Vendor Relationship Manager later.

Source data needed:

- Assignment packet status, decline timestamp/reason, owner order state, available vendor candidates, due/SLA data.

Entry conditions:

- Vendor declines assignment offer.
- Owner order still needs fulfillment.

Exit conditions:

- New vendor offer is created.
- Internal fulfillment is assigned.
- Order is cancelled/withdrawn.
- Decline is acknowledged and no action remains.

Priority level:

- High; Critical when SLA is threatened.

Dashboard placement:

- Assignment section and Vendor Attention section.

Notification relationship:

- Notify responsible AMC coordinator/admin for actionable decline.
- Avoid broad notification spam for routine declines if queue is monitored.

Future analytics relevance:

- Decline reason trends, vendor fit, coverage gaps, acceptance scoring later.

### `vendor_active_work`

Display label:

- Active Vendor Work.

Purpose:

- Tracks accepted vendor packets currently in production.

Primary actor:

- Vendor; AMC Coordinator monitors.

Source data needed:

- Assignment packet accepted/in-progress status, due/review dates, recent packet activity, vendor company, owner order linkage.

Entry conditions:

- Vendor accepted packet and work is not submitted, completed, cancelled, or revoked.

Exit conditions:

- Vendor submits, packet is completed, correction requested, cancelled, revoked, or reassigned.

Priority level:

- Medium; High when due soon; Critical when overdue/stalled.

Dashboard placement:

- Vendor Attention section.

Notification relationship:

- Usually dashboard-only for AMC.
- Vendor due-soon/overdue notifications may apply based on policy.

Future analytics relevance:

- Active workload, vendor capacity, cycle time, work-in-progress aging.

### `due_soon`

Display label:

- Due Soon.

Purpose:

- Captures owner orders or assignment packets approaching a due/SLA deadline.

Primary actor:

- Responsible AMC Coordinator, AMC Reviewer, Vendor, or AMC Admin depending on source.

Source data needed:

- Owner order due dates, assignment packet due dates, review due dates, delivery due dates, SLA thresholds, current stage.

Entry conditions:

- Due/SLA deadline falls within configured due-soon threshold.
- Work is not completed/delivered/cancelled.

Exit conditions:

- Work progresses beyond risk state, is completed/delivered, is cancelled/withdrawn, or becomes overdue.

Priority level:

- High.

Dashboard placement:

- Delivery Risk section; also relevant inside Assignment and Review sections.

Notification relationship:

- Queue first.
- Role-targeted due-soon reminders only for actionable owners.

Future analytics relevance:

- SLA pressure forecasting later, due-date compression trends, workload balancing.

### `overdue`

Display label:

- Overdue.

Purpose:

- Captures owner orders, assignment packets, review tasks, or delivery tasks past due.

Primary actor:

- Responsible role based on overdue source: Coordinator, Reviewer, Vendor, Admin.

Source data needed:

- Due dates, current stage, assignment packet status, review state, delivery state, SLA policy.

Entry conditions:

- Actionable work is past due and not completed/delivered/cancelled.

Exit conditions:

- Work is completed, submitted, reviewed, delivered, reassigned, cancelled/withdrawn, or deadline is legitimately revised.

Priority level:

- Critical.

Dashboard placement:

- Delivery Risk section and relevant operational section.

Notification relationship:

- Targeted notifications are appropriate.
- Repeated notifications should be throttled and explainable.

Future analytics relevance:

- SLA misses, bottleneck analysis, vendor/reviewer performance, client impact analysis.

### `stalled_vendor`

Display label:

- Stalled Vendor.

Purpose:

- Identifies active vendor packets with no recent progress, missed response, or concerning activity gaps.

Primary actor:

- AMC Coordinator; Vendor Relationship Manager later.

Source data needed:

- Assignment packet status, packet activity timestamp, due date, response deadline, vendor messages, SLA policy.

Entry conditions:

- Vendor packet is offered or active and has missed a response/progress threshold.
- No recent packet activity exists within expected window.

Exit conditions:

- Vendor responds, activity resumes, packet is submitted/completed, offer is revoked, assignment is cancelled/reassigned.

Priority level:

- High; Critical if due/SLA risk exists.

Dashboard placement:

- Vendor Attention section and Delivery Risk section.

Notification relationship:

- AMC targeted escalation when stall crosses threshold.
- Vendor reminder may be sent according to notification policy.

Future analytics relevance:

- Vendor responsiveness, communication risk, reassignment triggers, future vendor scoring.

### `revision_required`

Display label:

- Revision Required.

Purpose:

- Captures packets/orders where correction or revision work is needed before approval/delivery.

Primary actor:

- Vendor for packet correction; AMC Reviewer/Coordinator for owner-side tracking.

Source data needed:

- Review outcome, correction request timestamp, assignment packet status, revision notes visibility, due/revision dates.

Entry conditions:

- AMC review requests vendor correction or internal revision.
- Work is not resubmitted/approved/completed.

Exit conditions:

- Vendor resubmits, internal revision is completed, request is cancelled, order is withdrawn.

Priority level:

- High; Critical when revision blocks SLA/delivery.

Dashboard placement:

- Review / Quality Control section and Vendor Attention section.

Notification relationship:

- Vendor should receive correction request notification.
- AMC queue tracks pending revision; escalation if aging.

Future analytics relevance:

- Revision frequency, vendor quality, reviewer workload, client delay analysis.

### `review_queue`

Display label:

- Review Queue.

Purpose:

- Captures submitted or internally completed work awaiting AMC review/QC.

Primary actor:

- AMC Reviewer.

Source data needed:

- Vendor submitted status, internal report-ready status, review assignment, review due date, owner order state.

Entry conditions:

- Work is submitted/ready for AMC review.
- Review/QC has not been completed.

Exit conditions:

- Review completed, revision requested, final approval requested, cancelled/withdrawn.

Priority level:

- High; Medium if not SLA-sensitive.

Dashboard placement:

- Review / Quality Control section.

Notification relationship:

- Reviewer notification may apply when work enters assigned review.
- Dashboard queue remains the primary review workload surface.

Future analytics relevance:

- Review cycle time, reviewer capacity, quality bottlenecks.

### `review_overdue`

Display label:

- Review Overdue.

Purpose:

- Captures review/QC work past review due date or aging threshold.

Primary actor:

- AMC Reviewer; AMC Admin for escalation.

Source data needed:

- Review due date, review assignment, submitted timestamp, current review state, SLA policy.

Entry conditions:

- Review-ready work is past review due date or review aging threshold.

Exit conditions:

- Review completed, revision requested, final approval requested, cancelled/withdrawn, deadline legitimately revised.

Priority level:

- Critical.

Dashboard placement:

- Review / Quality Control section and Delivery Risk section.

Notification relationship:

- Target assigned reviewer first.
- Escalate to admin if unresolved past escalation threshold.

Future analytics relevance:

- Reviewer capacity, review SLA, staffing signals.

### `final_approval_queue`

Display label:

- Final Approval.

Purpose:

- Captures reviewed work needing final AMC approval before delivery.

Primary actor:

- AMC Admin or AMC Owner/authorized approver.

Source data needed:

- Review completion state, final approval requirement, approver assignment/authority, delivery due date, owner order state.

Entry conditions:

- Review/QC complete.
- Final approval required and not granted.

Exit conditions:

- Final approval granted, revision requested, cancelled/withdrawn.

Priority level:

- High; Critical when delivery due date is near/overdue.

Dashboard placement:

- Review / Quality Control section and Delivery Risk section.

Notification relationship:

- Target authorized approver when approval becomes actionable or aging.

Future analytics relevance:

- Approval cycle time, final bottleneck analysis, delivery delay attribution.

### `ready_for_delivery`

Display label:

- Ready for Delivery.

Purpose:

- Captures approved work that can be delivered to client/lender.

Primary actor:

- AMC Coordinator or AMC Admin.

Source data needed:

- Final approval state, delivery channel, client/lender scope, report/document availability, delivery status.

Entry conditions:

- Work approved and deliverable artifact/status is ready.
- Client delivery has not occurred.

Exit conditions:

- Delivered, blocked by missing artifact/client issue, cancelled/withdrawn.

Priority level:

- High.

Dashboard placement:

- Delivery Risk section and Client Waiting section.

Notification relationship:

- Notify delivery owner when delivery-ready state becomes actionable.
- Client notification occurs only after delivery or client-safe action need.

Future analytics relevance:

- Delivery lag, report-ready-to-delivered timing, client satisfaction signals later.

### `delivery_risk`

Display label:

- Delivery Risk.

Purpose:

- Consolidates work at risk of missing client/lender delivery expectation.

Primary actor:

- AMC Admin, AMC Coordinator, AMC Owner for high-risk items.

Source data needed:

- SLA policy, order due dates, assignment status, review state, final approval state, delivery state, activity recency, client waiting state.

Entry conditions:

- Any deterministic condition indicates likely delivery/SLA miss or blocked delivery.

Exit conditions:

- Risk resolved, work delivered/completed, cancelled/withdrawn, or deadline legitimately revised.

Priority level:

- Critical.

Dashboard placement:

- Delivery Risk section.

Notification relationship:

- Sparse, role-targeted escalation is appropriate.
- Avoid broad notifications for every risk signal.

Future analytics relevance:

- SLA analytics, predictive SLA risk later, escalation effectiveness.

### `client_waiting`

Display label:

- Client Waiting.

Purpose:

- Captures work where client/lender is waiting on status, document, report, response, or delivery.

Primary actor:

- AMC Coordinator or Client Relationship Manager later.

Source data needed:

- Client/lender request state, client messages, document requests, delivery status, due dates, last client-facing update timestamp.

Entry conditions:

- Client action/response/update is pending from AMC.
- Client/lender-facing status requires attention.

Exit conditions:

- Client-safe update sent, requested document/report delivered, client action resolved, order completed/cancelled.

Priority level:

- High; Critical if tied to SLA or urgent client escalation.

Dashboard placement:

- Client Waiting section and Delivery Risk section when SLA-sensitive.

Notification relationship:

- Notify responsible coordinator/account owner for urgent waiting states.
- Client notifications should use client-safe language and only when communication is ready/needed.

Future analytics relevance:

- Client communication latency, account health, lender scorecards later.

### `completed_recently`

Display label:

- Recently Completed.

Purpose:

- Provides recent completion/delivery context without mixing completed work into active attention queues.

Primary actor:

- AMC Coordinator, AMC Admin, Client Relationship Manager later.

Source data needed:

- Completion timestamp, delivery timestamp, client/lender, vendor assignment summary, final state.

Entry conditions:

- Work completed/delivered within configured recent window.

Exit conditions:

- Recent window expires or record is archived according to retention/display policy.

Priority level:

- Low.

Dashboard placement:

- Recent Completion section.

Notification relationship:

- Usually no internal notification.
- Client delivery notification may already have occurred at delivery time.

Future analytics relevance:

- Completion volume, delivery trends, recent outcome review, client/vendor performance later.

## AMC Workflow Stages

These stages describe AMC operational lifecycle vocabulary. They are not a request to add database statuses.

`intake_received`:

- Request/order has entered AMC intake and needs triage.

`intake_ready`:

- Intake is complete enough to route or assign.

`assignment_needed`:

- Work is ready for internal or vendor assignment.

`vendor_offered`:

- An assignment packet offer has been sent to a vendor.

`vendor_accepted`:

- Vendor accepted the packet and is responsible for packet work.

`vendor_in_progress`:

- Vendor is actively working inside the packet boundary.

`vendor_submitted`:

- Vendor submitted packet work for AMC review.

`amc_review`:

- Work is under AMC review/QC.

`revisions_requested`:

- AMC requested correction/revision before approval/delivery.

`final_approval`:

- Review is complete and final approval is required or pending.

`ready_for_delivery`:

- Work is approved and ready to deliver to client/lender.

`delivered`:

- Report/document/status was delivered to the client/lender.

`completed`:

- Operational lifecycle is closed while activity remains durable.

`cancelled/withdrawn`:

- Work is no longer active due to cancellation, withdrawal, or equivalent terminal outcome.

## Relationship To Existing Lifecycles

Canonical order lifecycle:

- Remains the owner-company operational lifecycle.
- Should not be blindly relabeled into AMC queue names.
- May supply source signals for AMC queues.
- Still requires governed transition authority where transitions exist.

AMC operational lifecycle:

- Describes AMC command-center work from intake through delivery.
- May be derived from order status, assignment packet state, review state, due dates, client state, activity recency, and SLA policy.
- Should be implementation-safe and explainable before any new status is introduced.

Assignment lifecycle:

- Belongs to assignment packets.
- Uses packet vocabulary such as offered, accepted, declined, in progress, submitted, correction requested, completed, cancelled, revoked, and expired.
- Grants packet visibility only.
- Does not grant canonical order visibility.

Vendor packet status:

- Is vendor-facing and packet-scoped.
- Should not expose AMC internal review/approval mechanics unless translated into packet-safe actions.

Client status:

- Is a simplified outward-facing projection.
- Uses request/status/document/report/delivery language.
- Should not expose internal AMC queue IDs, vendor scoring, SLA risk mechanics, review queue pressure, or vendor non-response.
- Should not mutate canonical order lifecycle directly.
- Should follow the client/lender doctrine before client portal queues, document access, or delivery surfaces are implemented.

## Dashboard Grouping

Likely AMC dashboard sections:

- Intake.
- Assignment.
- Vendor Performance / Vendor Attention.
- Review / Quality Control.
- Delivery Risk.
- Client Waiting.
- Recent Completion.

Grouping rules:

- Intake contains `new_intake` and `intake_needs_review`.
- Assignment contains `unassigned`, `vendor_pending_response`, and `vendor_declined`.
- Vendor Performance / Vendor Attention contains `vendor_active_work`, `stalled_vendor`, and vendor-related `due_soon`/`overdue`.
- Review / Quality Control contains `review_queue`, `review_overdue`, `revision_required`, and `final_approval_queue`.
- Delivery Risk contains `due_soon`, `overdue`, `delivery_risk`, `ready_for_delivery`, and high-risk `client_waiting`.
- Client Waiting contains client-facing operational waiting states.
- Recent Completion contains `completed_recently`.

The same record may appear in more than one queue when the reasons are distinct and explainable. Duplicate appearance should be labeled by reason, not hidden behind one ambiguous state.

## SLA + Notification Relationship

The detailed AMC notification, activity, and escalation doctrine lives in `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`. The summary below defines the queue relationship only; implementation should use the dedicated doctrine before wiring notification event families, escalation thresholds, activity projections, or communication surfaces.

- Queue membership is operational attention.
- Notifications are interruptive delivery prompts.
- Activity is durable memory.
- Not every queue should produce a notification.
- Escalations should be sparse, role-targeted, and threshold-driven.
- Actor self-notifications should be suppressed where appropriate.
- Repeated reminders should be throttled.
- Queue reasons should remain explainable from known data.
- Notifications should route to the correct surface:
  - AMC internal order or dashboard surface for owner-company operational notifications.
  - `/assignments/:assignmentId` for packet notifications.
  - Client-safe request/status/document/report surfaces for client notifications.

Quiet queue examples:

- New intake during normal operating window.
- Active vendor work not near due date.
- Recently completed work.

Notification-worthy examples:

- Vendor offer response deadline missed.
- Packet overdue.
- Review overdue.
- Final approval blocking delivery.
- Ready-for-delivery item aging.
- Client waiting on urgent response.
- Delivery risk above escalation threshold.

## Guardrails

- Do not expose AMC internal queues to vendors.
- Do not expose vendor scoring, SLA risk mechanics, or internal delivery risk to clients.
- Do not treat client-facing status as canonical lifecycle authority.
- Do not treat relationship status as queue eligibility by itself.
- Do not treat vendor panel membership or assignment eligibility as visibility.
- Do not make queue IDs user-facing.
- Do not create new statuses unless lifecycle doctrine requires them.
- Do not implement predictive scoring yet.
- Do not make queue membership an authorization grant.
- Do not let assignment packet visibility drift into canonical order visibility.
- Do not make every queue an interruptive notification.
- Do not make activity feeds behave like notification inboxes.
- Do not collapse internal AMC notes, vendor packet messages, client-facing updates, audit events, and notification summaries into one generic message surface.
- Do not use Staff order queue labels for Vendor or Client surfaces.
- Do not add billing/onboarding/package enforcement as part of queue taxonomy work.

## Future Analytics Relevance

Future analytics may use these queues to derive:

- Intake aging.
- Assignment lag.
- Vendor response time.
- Vendor acceptance/decline rate.
- Vendor cycle time.
- Revision rate.
- Review cycle time.
- SLA miss rate.
- Delivery lag.
- Client waiting time.
- Queue aging by role.
- Escalation frequency and resolution time.

These analytics remain deferred until queue definitions, source data, visibility boundaries, and product-mode implementation slices are stable.
