# Falcon Vendor Packet Lifecycle Taxonomy

## Purpose

This document defines the canonical taxonomy for Vendor Portal packet states, packet surfaces, vendor actions, vendor-visible activity, and vendor-safe dashboard queues before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, assignment lifecycle code, workflow statuses, notification behavior, activity tables/RPCs, permission seeds, database migrations, billing logic, onboarding enforcement, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`

## Core Doctrine

- Vendor packet lifecycle is assignment-scoped.
- Vendor packet states are not canonical owner-order workflow statuses.
- Vendor packet actions do not mutate owner-order lifecycle directly.
- AMC/order lifecycle should react through controlled owner-side systems later.
- Vendor dashboard queues are packet-safe attention groupings, not AMC internal queue names.
- Vendor-visible activity is assignment-scoped and should not reuse canonical order activity directly.
- Relationship state and vendor panel membership never create packet visibility.
- Vendor profile completion, readiness, and availability never create packet visibility.
- Packet attachments, vendor deliverables, and revision materials must stay inside explicit packet document boundaries.
- Vendor Portal surfaces must use packet-native labels and hide internal AMC, client/lender, permission, and module terminology.

## Vendor Packet Lifecycle States

The states below are conceptual Vendor Portal packet states. They do not change existing assignment lifecycle code or database status values.

### `offer_received`

Meaning:

- The vendor has received an assignment offer and can open the packet.

Vendor-visible label:

- Offer received.

AMC/internal meaning:

- An owner company has created an offer packet for a specific vendor company.
- The offer is awaiting vendor review or response.

Allowed vendor actions:

- Review packet.
- Accept offer.
- Decline offer.
- Send question/update where packet messaging is enabled.

Allowed AMC actions:

- Update safe packet instructions or attachments.
- Send packet message.
- Revoke offer.
- Let offer expire.
- Cancel packet where appropriate.

Dashboard queue relevance:

- `new_offers`.
- `due_soon` when response deadline is near.
- `overdue` when response deadline has passed.

Notification relevance:

- New offer notification to vendor users.
- Owner-side activity/notification according to assignment offer doctrine.

Activity relevance:

- Record assignment offered and packet opened/reviewed later.

Exit conditions:

- Vendor reviews, accepts, declines, offer expires, offer is revoked, or packet is cancelled.

### `offer_reviewed`

Meaning:

- The vendor opened or reviewed the packet but has not accepted or declined.

Vendor-visible label:

- Offer reviewed.

AMC/internal meaning:

- The offer is still pending, but vendor engagement has occurred.

Allowed vendor actions:

- Accept offer.
- Decline offer.
- Send question/update.
- Reopen packet details.

Allowed AMC actions:

- Send follow-up.
- Update safe packet details.
- Revoke offer.
- Let offer expire.
- Cancel packet.

Dashboard queue relevance:

- `new_offers`.
- `due_soon` or `overdue` based on response deadline.

Notification relevance:

- Usually quiet after initial offer.
- Reminder notification may be appropriate near response deadline.

Activity relevance:

- Record packet reviewed/opened as packet activity where useful.

Exit conditions:

- Accept, decline, expiration, revocation, or cancellation.

### `accepted`

Meaning:

- The vendor accepted the assignment offer.

Vendor-visible label:

- Accepted.

AMC/internal meaning:

- Vendor has committed to the packet; owner-side operations can treat the assignment as active responsibility.

Allowed vendor actions:

- Start work.
- Send question/update.
- View requirements and documents.

Allowed AMC actions:

- Send packet message.
- Update safe instructions.
- Cancel or revoke according to assignment lifecycle rules.
- Monitor due dates and packet risk.

Dashboard queue relevance:

- `active_work`.
- `due_soon` when work deadline is near.

Notification relevance:

- Notify AMC owner/coordinator of acceptance.
- Avoid duplicate notification to the accepting vendor actor.

Activity relevance:

- Record offer accepted in packet activity and owner-side assignment activity.

Exit conditions:

- Vendor starts work, packet is cancelled/revoked, or work is otherwise closed by owner-side process.

### `declined`

Meaning:

- The vendor declined the assignment offer.

Vendor-visible label:

- Declined.

AMC/internal meaning:

- The vendor will not perform this packet; owner-side routing must choose another path.

Allowed vendor actions:

- View declined packet summary where retention allows.
- Send safe follow-up only if messaging remains open.

Allowed AMC actions:

- Review decline reason.
- Reassign/offer to another vendor.
- Close/archive declined packet visibility later.

Dashboard queue relevance:

- Usually exits active vendor queues.
- May appear in `cancelled_or_unavailable` if recent packet history is shown.

Notification relevance:

- Notify AMC owner/coordinator.
- Do not notify vendor actor about their own decline.

Activity relevance:

- Record decline and safe reason/context where supplied.

Exit conditions:

- Packet becomes historical, archived, or removed from vendor dashboard according to retention policy.

### `active`

Meaning:

- The packet is accepted and active, but work may not yet be marked in progress.

Vendor-visible label:

- Active.

AMC/internal meaning:

- The vendor has an active assignment responsibility.

Allowed vendor actions:

- Start work.
- Send question/update.
- Submit work if ready.
- View packet requirements and documents.

Allowed AMC actions:

- Send packet message.
- Update safe instructions.
- Request status.
- Cancel or revoke according to lifecycle rules.

Dashboard queue relevance:

- `active_work`.
- `due_soon`.
- `overdue`.

Notification relevance:

- Usually queue-first.
- Notify for due risk, owner request, or material packet update.

Activity relevance:

- Record status changes, owner messages, vendor updates, and due-risk reminders where applicable.

Exit conditions:

- Vendor starts work, submits work, packet is cancelled/revoked, or packet becomes unavailable.

### `in_progress`

Meaning:

- Vendor has started work on the packet.

Vendor-visible label:

- In progress.

AMC/internal meaning:

- Vendor production is underway.

Allowed vendor actions:

- Send question/update.
- Submit work.
- Upload deliverables where enabled.
- View packet timeline.

Allowed AMC actions:

- Send packet message.
- Request update.
- Update safe packet context.
- Cancel/revoke according to lifecycle rules.

Dashboard queue relevance:

- `active_work`.
- `due_soon`.
- `overdue`.

Notification relevance:

- Usually quiet unless due risk, owner request, or vendor update needs action.

Activity relevance:

- Record work started, updates, messages, and document activity.

Exit conditions:

- Submit work, cancellation, revocation, or owner-side closure.

### `submitted`

Meaning:

- Vendor submitted work or deliverables for owner-side review.

Vendor-visible label:

- Submitted.

AMC/internal meaning:

- Owner-side review/QC or next operational step is needed.
- Submission does not mean client delivery or final completion.

Allowed vendor actions:

- View submitted packet.
- Send clarification/update if messaging remains open.
- Await correction or completion.

Allowed AMC actions:

- Review/QC submitted work.
- Request revision/correction.
- Mark vendor packet completed.
- Cancel/revoke only where lifecycle rules allow.

Dashboard queue relevance:

- `submitted_waiting`.

Notification relevance:

- Notify AMC reviewer/coordinator as a handoff event.
- Vendor confirmation may be shown as activity/confirmation, not necessarily an interruptive notification.

Activity relevance:

- Record submitted work and attached deliverables.

Exit conditions:

- Revision requested, packet completed, packet cancelled/revoked, or owner-side process reopens work.

### `revision_requested`

Meaning:

- AMC has requested a packet-visible correction or revision from the vendor.

Vendor-visible label:

- Correction requested.

AMC/internal meaning:

- Owner-side review found a vendor-action item that should be returned to the vendor through packet-safe context.

Allowed vendor actions:

- Review correction request.
- Send question/update.
- Start revision work.
- Submit correction/resubmission.

Allowed AMC actions:

- Clarify correction request.
- Send supporting packet-safe material.
- Cancel/revoke where appropriate.
- Mark resolved only through controlled owner-side review later.

Dashboard queue relevance:

- `revision_requests`.
- `due_soon` or `overdue` if correction due date exists.

Notification relevance:

- Notify vendor users.
- Notify owner-side users when vendor responds or resubmits.

Activity relevance:

- Record correction requested with safe summary.
- Do not expose internal review notes unless intentionally converted into packet-safe text.

Exit conditions:

- Vendor starts revision, resubmits, correction is cancelled/withdrawn, or packet is closed.

### `revision_in_progress`

Meaning:

- Vendor is actively working on a requested correction/revision.

Vendor-visible label:

- Revision in progress.

AMC/internal meaning:

- Vendor has acknowledged or started the correction loop.

Allowed vendor actions:

- Send question/update.
- Resubmit work.
- Upload correction materials.

Allowed AMC actions:

- Clarify request.
- Send packet-safe update.
- Cancel/revoke where appropriate.

Dashboard queue relevance:

- `revision_requests`.
- `due_soon`.
- `overdue`.

Notification relevance:

- Usually quiet until resubmission, deadline risk, or message/update.

Activity relevance:

- Record revision started and related vendor updates.

Exit conditions:

- Resubmission, cancellation, revocation, or packet closure.

### `resubmitted`

Meaning:

- Vendor submitted revised/corrected work after a revision request.

Vendor-visible label:

- Resubmitted.

AMC/internal meaning:

- Owner-side review/QC should evaluate the corrected submission.

Allowed vendor actions:

- View resubmitted packet.
- Send clarification/update where messaging remains open.

Allowed AMC actions:

- Review/QC resubmission.
- Request another correction if necessary.
- Mark completed.

Dashboard queue relevance:

- `submitted_waiting`.

Notification relevance:

- Notify AMC reviewer/coordinator.
- Vendor may receive confirmation as activity/inline feedback.

Activity relevance:

- Record resubmission and deliverables.

Exit conditions:

- Completed, another revision requested, cancelled, or revoked.

### `completed`

Meaning:

- Vendor assignment responsibility is completed or accepted by the owner-side process.

Vendor-visible label:

- Completed.

AMC/internal meaning:

- Vendor packet is closed from vendor production perspective.
- Owner order may still have delivery, client, billing, or post-delivery work.

Allowed vendor actions:

- View completed packet where retention allows.
- View safe completion outcome.

Allowed AMC actions:

- Close/archive packet.
- Reopen or request follow-up only through explicit future design.

Dashboard queue relevance:

- `completed_recently`.

Notification relevance:

- Notify vendor users when completion materially affects their work record.
- Notify owner-side users only where completion is a handoff or audit need.

Activity relevance:

- Record packet completed.

Exit conditions:

- Historical retention, archive, or future reopened/follow-up flow.

### `cancelled`

Meaning:

- The packet was cancelled and is no longer available for vendor work.

Vendor-visible label:

- Cancelled.

AMC/internal meaning:

- Owner-side assignment was cancelled for business or operational reasons.

Allowed vendor actions:

- View cancellation summary where retention allows.
- No production/submission actions.

Allowed AMC actions:

- Record cancellation reason internally.
- Send vendor-safe cancellation note.
- Route/order work through another path if needed.

Dashboard queue relevance:

- `cancelled_or_unavailable` if recent history is shown.

Notification relevance:

- Notify vendor users if cancellation affects active or offered work.

Activity relevance:

- Record vendor-safe cancellation event.
- Internal cancellation reason may remain hidden.

Exit conditions:

- Historical retention or archive.

### `revoked`

Meaning:

- AMC withdrew the packet/offer from the vendor.

Vendor-visible label:

- No longer available.

AMC/internal meaning:

- Owner-side operations revoked vendor access to the packet.

Allowed vendor actions:

- View limited unavailable summary where appropriate.
- No accept, production, or submission actions.

Allowed AMC actions:

- Reassign/reoffer through owner-side routing.
- Preserve audit and internal reason.

Dashboard queue relevance:

- `cancelled_or_unavailable` if recent history is shown.

Notification relevance:

- Notify vendor users if the packet was previously visible.

Activity relevance:

- Record vendor-safe revocation/unavailable event.
- Do not expose internal reason unless intentionally safe.

Exit conditions:

- Historical retention or archive.

### `expired`

Meaning:

- The offer response deadline passed before the vendor accepted or declined.

Vendor-visible label:

- Offer expired.

AMC/internal meaning:

- The offer is no longer actionable and owner-side routing should continue.

Allowed vendor actions:

- View expired offer summary where retention allows.
- No accept/decline unless owner explicitly reopens/reoffers later.

Allowed AMC actions:

- Offer to another vendor.
- Reoffer later through a new packet or explicit reopening design.

Dashboard queue relevance:

- `cancelled_or_unavailable` if recent history is shown.

Notification relevance:

- Notify AMC owner/coordinator when an offer expires.
- Vendor reminder should happen before expiration, not after by default.

Activity relevance:

- Record offer expired.

Exit conditions:

- Historical retention, archive, or future reoffer.

## Vendor Dashboard Queues

Vendor dashboard queues are packet-safe attention surfaces. They should not expose AMC internal queue names, owner-order lifecycle statuses, client/lender internal data, or hidden relationship topology.

### `new_offers`

Source packet states:

- `offer_received`
- `offer_reviewed`

Urgency:

- High when response deadline is near; Medium otherwise.

Primary action:

- Review packet, accept offer, or decline offer.

Empty state language:

- "No offers are waiting for your response."

Notification relationship:

- New offers should notify.
- Reminders may notify near response deadline.

What must not be exposed:

- Other vendors, owner routing strategy, internal unassigned queue, client account internals, or vendor ranking.

### `active_work`

Source packet states:

- `accepted`
- `active`
- `in_progress`

Urgency:

- Medium by default; High when due soon; Critical when overdue.

Primary action:

- Start work, continue work, send update, or submit work.

Empty state language:

- "No assigned work is in progress."

Notification relationship:

- Queue-first.
- Notify only for material updates, due risk, or owner requests.

What must not be exposed:

- AMC internal work queues, reviewer workload, client waiting status, or owner-order KPIs.

### `due_soon`

Source packet states:

- `offer_received`
- `offer_reviewed`
- `accepted`
- `active`
- `in_progress`
- `revision_requested`
- `revision_in_progress`

Urgency:

- High; Critical when threshold is very close and policy says escalation is needed.

Primary action:

- Respond to offer, submit work, or respond to correction.

Empty state language:

- "No packets are due soon."

Notification relationship:

- Reminders may notify based on packet due thresholds.
- Queue membership alone should not guarantee notification.

What must not be exposed:

- Internal SLA queue names, client escalation, owner delivery risk, or policy thresholds in technical terms.

### `overdue`

Source packet states:

- `offer_received`
- `offer_reviewed`
- `accepted`
- `active`
- `in_progress`
- `revision_requested`
- `revision_in_progress`

Urgency:

- Critical.

Primary action:

- Respond, submit, resubmit, or send an update.

Empty state language:

- "No packets are overdue."

Notification relationship:

- Notify vendor users according to reminder/escalation policy.
- Notify AMC owner/coordinator through owner-side escalation doctrine.

What must not be exposed:

- Internal escalation notes, client/lender pressure, vendor score impact, or owner-side SLA calculations.

### `revision_requests`

Source packet states:

- `revision_requested`
- `revision_in_progress`

Urgency:

- High when newly requested or due soon; Critical when overdue.

Primary action:

- Review correction request, respond, and resubmit work.

Empty state language:

- "No corrections are waiting."

Notification relationship:

- New correction requests should notify vendor users.
- Resubmissions notify owner-side reviewers/coordinators.

What must not be exposed:

- Internal review notes, reviewer workload, QC queue labels, or client complaint/internal escalation details.

### `submitted_waiting`

Source packet states:

- `submitted`
- `resubmitted`

Urgency:

- Low for vendor attention; Medium if vendor clarification is requested later.

Primary action:

- View submitted packet or send clarification where messaging remains open.

Empty state language:

- "No submitted packets are waiting."

Notification relationship:

- Submission confirmation may be inline/activity.
- Owner-side review-ready notifications are separate and should not leak review details to vendor.

What must not be exposed:

- Owner review queue, reviewer identity, internal approval, client delivery timeline, or final report status by default.

### `completed_recently`

Source packet states:

- `completed`

Urgency:

- Low.

Primary action:

- View completed packet where retention allows.

Empty state language:

- "Completed packets will appear here."

Notification relationship:

- Completion may notify when material to vendor record.

What must not be exposed:

- Client delivery, payment status, final report access, or owner-order completion unless explicitly productized.

### `cancelled_or_unavailable`

Source packet states:

- `declined`
- `cancelled`
- `revoked`
- `expired`

Urgency:

- Low for vendor history; High only when an active packet becomes unavailable.

Primary action:

- View safe unavailable summary.

Empty state language:

- "No unavailable packets are shown."

Notification relationship:

- Notify vendor users when an offer or active packet is revoked/cancelled.
- Offer expiration usually notifies owner-side users; vendor reminder should precede expiration.

What must not be exposed:

- Internal cancellation reason, owner routing strategy, other vendor offers, relationship discipline notes, or client/internal escalation context.

## Vendor Actions

Vendor actions are packet-scoped. They do not mutate canonical owner-order lifecycle directly. AMC/order lifecycle should react through controlled owner-side systems later, such as owner-side assignment review, status transition, delivery, or escalation workflows.

### Review packet

- Opens assignment packet details and records packet engagement where appropriate.
- Does not accept work or mutate owner-order lifecycle.

### Accept offer

- Confirms vendor commitment to the assignment packet.
- Creates owner-side assignment response attention.
- Does not assign the vendor into owner-company staff/appraiser/reviewer fields.

### Decline offer

- Declines the packet offer and may capture safe reason/context.
- Returns routing responsibility to owner-side operations.
- Does not expose alternate vendors or routing strategy.

### Start work

- Marks vendor production as started in packet scope.
- Helps vendor dashboard and owner-side assignment monitoring.
- Does not mutate canonical owner-order workflow directly.

### Send question/update

- Creates vendor-visible packet communication and owner-side assignment activity.
- Must not write internal AMC notes or client-facing comments unless explicitly bridged.

### Submit work

- Uploads/submits vendor deliverables to the packet.
- Creates owner-side review/QC attention.
- Does not mark owner order delivered, completed, or ready for client by itself.

### Respond to revision

- Sends question/update or acknowledges correction request in packet scope.
- Keeps internal review details hidden unless they were translated into packet-safe correction text.

### Resubmit work

- Sends corrected deliverables back to owner-side review/QC.
- Does not complete the owner order or deliver to the client.

### View completed packet

- Allows historical packet review where retention rules permit.
- Does not grant full order, client, billing, or final delivery access.

### Update profile/availability later

- Future action for vendor readiness, scheduling, service area, capacity, and profile maintenance.
- May affect assignment eligibility later, but never grants packet or order visibility by itself.

## Vendor-Visible Activity Taxonomy

Vendor-visible activity is assignment-scoped. It should be sourced from assignment packet activity or safe packet projections, not canonical order activity.

### Offer events

Examples:

- Assignment offered.
- Offer updated.
- Offer reviewed.
- Offer expiring soon.
- Offer expired.

Visibility:

- Vendor packet users and authorized owner-side assignment users.

Hidden:

- Routing strategy, other vendors, internal unassigned queue, vendor ranking.

### Acceptance / decline events

Examples:

- Offer accepted.
- Offer declined.
- Decline reason submitted where safe.

Visibility:

- Vendor packet users and authorized owner-side assignment users.

Hidden:

- Owner reassignment strategy, comparison with other vendors, relationship discipline notes.

### Vendor updates

Examples:

- Vendor started work.
- Vendor sent update.
- Vendor asked a question.
- Vendor uploaded a file.

Visibility:

- Vendor packet users and authorized owner-side assignment users.

Hidden:

- Client-facing communication unless explicitly relayed.

### AMC requests

Examples:

- Operations sent packet message.
- Operations requested update.
- Operations updated safe packet instructions.

Visibility:

- Vendor packet users and authorized owner-side assignment users.

Hidden:

- Internal AMC notes, escalation reasons, and security/audit details.

### Revision requests

Examples:

- Correction requested.
- Correction clarified.
- Revision due date updated.

Visibility:

- Vendor packet users and authorized owner-side assignment users.

Hidden:

- Internal reviewer notes unless intentionally converted into packet-safe correction text.
- Review queue and workload details.

### Submission events

Examples:

- Work submitted.
- Corrected work resubmitted.
- Deliverable uploaded.

Visibility:

- Vendor packet users and authorized owner-side assignment users.

Hidden:

- Owner review decision internals, client delivery package, final report release status unless explicitly productized.

### System / audit-safe events

Examples:

- Packet cancelled.
- Packet revoked.
- Packet completed.
- Offer expired.

Visibility:

- Vendor-safe summaries only.

Hidden:

- Internal reason codes, security/audit payloads, admin-only comments, policy/helper names.

### Hidden / internal events

These must not appear in Vendor Portal activity by default:

- Canonical owner-order activity.
- Internal AMC notes.
- Client-facing comments.
- Internal review/QC notes.
- Internal escalation notes.
- Permission/security/audit implementation details.
- Relationship-management notes.
- Other vendor routing or scoring events.

## Vendor-Safe Document / Report Boundaries

### Packet attachments

- Documents intentionally included for vendor execution.
- May include safe instructions, source documents, order-specific materials, or supporting documents selected by AMC.
- Must not imply access to the full owner-order document library.

### Vendor deliverables

- Files, reports, forms, photos, or other materials submitted by the vendor through the packet.
- Remain packet-scoped until owner-side systems intentionally promote them into review, delivery, or archive surfaces.

### Revision materials

- Correction instructions and supporting materials explicitly included for the vendor.
- Internal annotations must be translated into packet-safe text before exposure.

### Final report visibility later

- Final report access for vendors is deferred.
- Vendor completion does not automatically grant final report, client delivery package, or post-delivery communication access.

### Client documents hidden by default

- Client/lender account documents, client messages, client delivery packages, and client-specific requirements remain hidden unless explicitly included in the packet contract.

### Internal review materials hidden by default

- Reviewer notes, QC checklists, internal risk flags, approval notes, and internal escalation materials remain hidden unless intentionally abstracted into a packet-safe correction or request.

## Guardrails

- No canonical order status labels unless intentionally translated.
- No internal AMC queue names.
- No client/lender internal data.
- No vendor access from relationship state alone.
- No hidden module, package, permission, RLS, RPC, helper, or `company_id` terms.
- No direct canonical order mutation from vendor packet actions.
- No generic Staff order table reuse.
- No canonical order activity reuse as the Vendor packet timeline.
- No owner-order links for assignment-only vendor users.
- No client-facing comment exposure unless explicitly relayed into the packet.
- No internal AMC note exposure.
- No vendor scorecard or routing-rank exposure.

## Future Contributor Checklist

Before implementing packet lifecycle or dashboard surfaces, verify:

- Packet state labels are vendor-facing and packet-native.
- Dashboard queues are derived from packet state, dates, and packet-safe activity only.
- Vendor actions write packet/assignment events, not direct owner-order workflow transitions.
- Vendor notifications route to packet surfaces.
- Vendor activity reads assignment-scoped activity only.
- Internal AMC notes, client comments, and owner-order activity are not reused directly.
- Documents are intentionally included in the packet contract.
- Relationship or panel state is never treated as visibility.
