# Falcon Continental AMC Operational Blueprint

## Purpose

This document defines Continental AMC's canonical operational blueprint inside Falcon.

Continental AMC is Falcon's flagship internal AMC deployment and proving ground. It validates AMC Operations Mode, Vendor Portal Mode, Client Portal Mode, Hybrid/Ecosystem participation, assignment packet doctrine, SLA/queue systems, network operations language, and cross-company visibility boundaries.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, permission seeds, database migrations, billing logic, onboarding enforcement, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_ARCHITECTURE.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_V1_AMC_OPERATIONAL_SURFACE_SUPPRESSION_DOCTRINE.md`

## Core Doctrine

- Continental AMC is the proving ground, not the global default UX.
- Staff Appraisal Mode remains the primary SaaS sales path despite AMC sophistication.
- AMC operations should feel like a network operations command center.
- Continental validates Vendor Portal and Client Portal surfaces without making Staff Mode feel cluttered.
- Hidden AMC architecture may exist in Falcon v1 without exposing AMC operational surfaces to Staff
  Appraisal users.
- Assignment packet access is not canonical order access.
- Assignment lifecycle is operationally distinct from internal order lifecycle.
- AMC queue and workflow taxonomy lives in `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`.
- AMC vendor panel and assignment eligibility doctrine lives in `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`.
- AMC client/lender intake and delivery doctrine lives in `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`.
- AMC notification, activity, and escalation doctrine lives in `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`.
- Relationship state alone grants no operational visibility.
- Visibility remains explicit and scoped through company membership, permissions, readable owner records, assignment packets, and portal scope.
- Vendors should operate from assignment packets, not internal AMC order dashboards.
- Clients/lenders should operate from request/status/document/report surfaces, not internal AMC workflow.
- Hybrid participants must keep internal operations and AMC/network participation in separate lanes.
- Notifications should interrupt only when action or escalation is needed; activity remains the durable operational memory.

## Continental AMC Purpose Inside Falcon

Continental AMC exists inside Falcon to prove that Falcon can support a full AMC operating model without weakening the simpler Staff Appraisal product.

Continental validates:

- AMC mode as a complete product surface.
- Vendor Portal Mode for external appraisers/vendors.
- Client Portal Mode for lenders and direct clients.
- Hybrid participation for staff appraisal companies that also accept network work.
- Assignment packet doctrine across company boundaries.
- SLA, queue, escalation, and exception-management systems.
- Relationship lifecycle without relationship state becoming visibility authority.
- Network activity and notification boundaries.

Continental must not:

- Become the global default navigation/dashboard model.
- Force AMC vocabulary into Staff Appraisal Mode.
- Expose internal AMC order operations to vendors or clients.
- Treat vendor assignment as owner-company core order assignment.
- Reuse Staff dashboard language for Vendor or Client surfaces.
- Become a reason to build billing, onboarding, or tenant settings before module metadata is stable.

## AMC Operational Lifecycle

The full Continental AMC operational movie:

1. Intake.
   - A lender/client request, direct client order, AMC-created order, or imported order enters AMC intake.
   - Intake validates client context, property/order details, due dates, product type, required documents, and delivery expectations.

2. Assignment.
   - Work is assigned to internal AMC staff only when intentionally handled internally.
   - External vendor fulfillment uses assignment packets through `order_company_assignments`, not owner-company core order assignment columns.
   - Assignment eligibility is based on vendor relationship status, service fit, geography/coverage, availability, compliance readiness, workload, and later performance signals.

3. Vendor acceptance.
   - Vendors receive an assignment offer packet.
   - Vendors accept or decline from packet-native surfaces.
   - Non-response becomes an AMC queue/escalation signal, not silent drift.

4. Production.
   - Accepted vendors work inside the packet boundary.
   - Vendors see only safe packet fields and packet-scoped instructions, due dates, communications, activity, and status.
   - AMC users monitor vendor progress from owner-side assignment and SLA queues.

5. Review.
   - AMC review/QC is internal to AMC operations.
   - Reviewers see canonical owner-company order context where authorized.
   - Vendors and clients do not see internal review queue mechanics unless translated into packet/client-safe actions.

6. Revisions.
   - AMC may request vendor correction through the packet.
   - Internal review notes, reviewer identity, and owner-company workflow state stay internal unless deliberately shared.
   - Client-facing revision or document needs are translated into client-safe action language.

7. Escalation.
   - Escalation occurs when SLA, vendor non-response, overdue work, blocked review, client waiting, or delivery-risk conditions require attention.
   - Escalation should first create deterministic attention queues, then interrupt targeted users only when needed.

8. Final approval.
   - Final approval remains an internal AMC authority step.
   - Approval readiness should be visible to authorized AMC roles.
   - Vendor/client surfaces should see only safe outcome/status language.

9. Delivery.
   - Delivery sends the completed report/document/status to the client/lender through the appropriate channel.
   - Delivery state should update client-facing status without exposing internal approval mechanics.

10. Completion.
    - Completion closes the operational loop for the owner-company order and any related assignment packet.
    - Completion does not erase activity; activity remains the durable memory.

11. Post-delivery/client communication.
    - Client questions, document requests, delivery confirmations, and post-delivery issues remain visible in client-safe language.
    - Internal AMC follow-up remains separate from client-facing messaging.

## Intake Doctrine

Continental intake covers:

- Lender/client order intake.
- Direct client intake.
- AMC-created orders.
- Imported or integration-created orders later.
- Hybrid/internal fulfillment.
- Vendor fulfillment.

Intake should establish:

- Client/lender identity.
- Request source.
- Product/report type.
- Property and borrower/context details where appropriate.
- Due dates and SLA expectations.
- Required documents.
- Assignment eligibility.
- Internal review/final approval expectations.
- Communication and delivery channel.

Intake queues:

- New intake.
- Incomplete intake.
- Ready for assignment.
- Needs client information.
- Needs document.
- Internal fulfillment candidate.
- Vendor fulfillment candidate.
- SLA-sensitive intake.

Intake dashboard expectations:

- Show volume and attention by intake state.
- Separate incomplete intake from ready-to-assign work.
- Highlight client waiting and SLA-sensitive requests.
- Avoid exposing client-facing request copy to internal AMC operators when operational intake details are needed.
- Avoid exposing internal intake states to clients/lenders.

Assignment eligibility should consider:

- Whether internal staff will fulfill the work.
- Whether a vendor relationship is active.
- Whether vendor compliance/onboarding is sufficient.
- Whether the vendor covers the geography/product type.
- Whether workload and due date make the assignment practical.
- Whether the work should remain internal due to client, risk, complexity, or SLA constraints.

## Vendor Panel Doctrine

The canonical vendor panel, relationship-state, and assignment eligibility doctrine for Continental AMC lives in `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`. The summary below is operational context; implementation should use the doctrine document before wiring active panel states, assignment eligibility checks, vendor profile surfaces, routing suggestions, or vendor performance widgets.

Vendor panel doctrine:

- Vendor panel records represent active or potential operational relationships.
- Active vendor relationships are required for normal assignment offers.
- Relationship lifecycle state alone grants no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Vendor onboarding should establish identity, coverage, compliance, communication expectations, and packet readiness.
- Vendor assignment eligibility is a separate operational decision from relationship existence.
- Assignment packets remain the scoped visibility grant.

Vendor visibility boundaries:

- Vendors see assignment packets offered or assigned to their company.
- Vendors do not see canonical AMC order dashboards.
- Vendors do not see unrelated AMC clients, lenders, orders, internal notes, review queues, staff workload, fee logic, or other vendor performance.
- Vendors do not receive `/orders/:orderId` links for packet work.

Internal staff vs external vendor separation:

- Internal AMC staff may work on owner-company order records if authorized.
- External vendors work through assignment packets.
- External vendors are not written into owner-company core order assignment columns such as `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, or `orders.current_reviewer_id`.
- Overflow vendor work remains assignment-packet work, not internal staff assignment.

Vendor performance concepts later:

- Acceptance rate.
- On-time rate.
- Revision frequency.
- Communication responsiveness.
- Coverage and capacity.
- Client-specific performance.
- SLA reliability.

These are deferred analytics concepts and should not become automatic assignment authority until deliberately designed.

## Assignment Packet Doctrine

Assignment packets are the cross-company work unit for vendors.

Vendors should see:

- Assignment type.
- Assigned company and owner company display names where safe.
- Packet status.
- Due/review/expiration dates.
- Safe property/order context required to complete the work.
- Safe instructions and requirements.
- Required documents or deliverables when included in the packet contract.
- Packet-scoped activity.
- Packet-scoped notifications.
- Packet lifecycle actions such as accept, decline, start, submit, respond to correction, and view timeline.

Vendors should not see:

- Canonical owner-company order detail.
- Internal AMC order dashboards.
- Client CRM data unless explicitly included in the packet contract.
- AMC internal notes.
- Reviewer queues or reviewer assignment.
- Internal workflow transition keys.
- Other vendor offers or assignments.
- Fees, splits, or billing details unless explicitly productized.
- Relationship topology.
- Permission/system terminology.

Packet lifecycle vocabulary:

- Offered.
- Accepted.
- Declined.
- In progress.
- Submitted.
- Correction requested.
- Completed.
- Cancelled.
- Revoked.
- Expired.

Communication boundaries:

- Vendor communication should be packet-scoped.
- AMC internal order activity should not appear in vendor timelines.
- Client/lender communication should not appear in vendor timelines unless intentionally included in the packet contract.
- Packet communication may inform AMC owner-side queues without granting canonical order access to the vendor.

Assignment-scoped activity:

- Records offer, acceptance, decline, start, submission, correction request, completion, cancellation, revocation, and safe notes.
- Does not reuse `activity_log` as canonical owner order activity.
- Does not expose owner internal activity.

Assignment-scoped notifications:

- Deep-link to `/assignments/:assignmentId`.
- Use packet-native language.
- Notify vendors for offers, due soon, overdue, correction requested, accepted/declined outcomes, and packet messages when needed.
- Notify AMC operators for vendor non-response, submitted work, correction responses, overdue packet work, and escalation conditions.

Assignment packet dashboards:

- Vendor view: offers waiting, active packets, due soon, corrections requested, submitted/recent work.
- AMC owner view: pending offers, active vendor work, due soon/overdue vendor packets, stalled vendors, submitted work awaiting review.

## AMC Operational Queues

The canonical queue/workflow taxonomy for AMC Operations Mode lives in `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`. The list below is the operational summary; implementation should use the taxonomy document before wiring active dashboard queues, queue IDs, workflow projections, SLA rules, or notification relationships.

Core AMC queues:

- New intake.
- Incomplete intake.
- Unassigned.
- Vendor pending response.
- Accepted / in production.
- Due soon.
- Overdue.
- Stalled vendor.
- Revision required.
- Review queue.
- Final approval queue.
- Delivery risk.
- SLA escalation.
- Client waiting.
- Completed awaiting delivery.
- Delivered / recently completed.

Queue doctrine:

- Queues are deterministic attention systems.
- Queue membership should be explainable from known order, assignment, relationship, due-date, status, and activity data.
- Queues are not hidden workflow states.
- Queue state should not automatically become a notification.
- Vendor and client queues should not leak internal AMC workflow vocabulary.

## SLA + Escalation Doctrine

SLA ownership:

- Continental owns client/lender SLA accountability.
- Vendors own packet commitments inside the assignment contract.
- Internal AMC roles own monitoring, escalation, review, approval, and delivery readiness.

Escalation triggers:

- New intake aging beyond threshold.
- Assignment not offered.
- Vendor offer not accepted or declined by response deadline.
- Accepted packet approaching due date.
- Packet overdue.
- Vendor submitted work waiting for review.
- Review queue aging.
- Revision/correction not returned.
- Final approval waiting.
- Delivery ready but not delivered.
- Client waiting on status, document, or report.

Overdue behavior:

- Overdue should first appear in deterministic queues.
- Interruptions should target the responsible role, not every user.
- Repeated reminders should be throttled and explainable.
- Overdue does not automatically widen visibility.

Vendor non-response:

- Non-response should move to vendor pending response / stalled vendor attention.
- AMC users may remind, cancel, revoke, or reassign according to operational policy.
- Vendor non-response should not be exposed to clients as internal mechanics.

Reassignment doctrine:

- Reassignment is an AMC owner-side decision.
- Reassignment may cancel/revoke one packet and create another.
- Reassignment should preserve activity history.
- Reassignment should not mutate original owner order assignment columns as if the vendor were internal staff.

Client communication expectations:

- Clients/lenders should receive status-level updates, document requests, delivery messages, and safe delay communication.
- Clients/lenders should not see vendor non-response, reviewer queue pressure, internal staff workload, or relationship mechanics.

Quiet vs interruptive escalation:

- Quiet: dashboard/queue signal, badge, filtered list, owner-side activity.
- Interruptive: targeted notification for imminent SLA risk, overdue vendor response, client waiting, report ready for delivery, or high-risk exception.

## AMC Dashboard Blueprint

Dashboard name:

- AMC Network Operations Dashboard.

Primary daily question:

- Which client orders need intake, assignment, vendor follow-up, review, approval, delivery, or SLA escalation?

Primary sections:

- Intake queue.
- Unassigned / assignment-ready work.
- Vendor pending response.
- Active vendor production.
- Due soon / overdue.
- Review / QC queue.
- Final approval queue.
- Delivery risk and SLA escalation.
- Client waiting.

Secondary sections:

- Vendor panel health.
- Relationship lifecycle attention.
- Client/lender volume and exceptions.
- Recently delivered/completed.
- Integration/import status later.
- Analytics and performance exceptions later.

Command-center expectations:

- Prioritize queues over decorative metrics.
- Make responsibility and next action clear.
- Keep vendor and client monitoring visible without leaking internal detail across surfaces.
- Support fast movement from queue to order/assignment/review surfaces for authorized AMC users.
- Avoid dashboard clutter from irrelevant Staff, Vendor-only, or Client-only modules.

Operational visibility:

- AMC internal users see owner-company order context according to company membership, permissions, and readable order/client rules.
- Vendor users see packet dashboards only.
- Client/lender users see request/status/document/report dashboards only.

Lane separation:

- Internal AMC order operations.
- Vendor assignment operations.
- Client/lender status and communication.
- Relationship/vendor panel management.
- Analytics/integrations later.

Future analytics surfaces:

- SLA trend analytics.
- Vendor acceptance and on-time rates.
- Revision frequency.
- Client/lender volume and delivery performance.
- Queue aging.
- Escalation frequency.

## AMC Role Families

These are conceptual responsibilities only. They do not define permission seeds.

AMC Owner:

- Owns company configuration, operational policy, vendor/client strategy, escalation doctrine, package decisions, and high-risk exceptions.

AMC Admin:

- Runs broad AMC operations, manages queues, oversees assignment/review/delivery workflows, and handles escalations.

AMC Coordinator:

- Handles intake, assignment preparation, vendor follow-up, status coordination, and client-facing operational updates.

AMC Reviewer:

- Performs QC/review, revision requests, final review readiness, and review-related escalation.

AMC Operations Support:

- Supports document collection, client updates, packet follow-up, queue cleanup, and administrative operational tasks.

Vendor Relationship Manager later:

- Manages vendor panel health, onboarding readiness, compliance follow-up, relationship lifecycle, and vendor performance review.

Client Relationship Manager later:

- Manages lender/client account readiness, communication expectations, exceptions, scorecards, and delivery follow-up.

## Hybrid Participation Doctrine

Staff companies can participate in Continental AMC without becoming AMC operators.

Participation patterns:

- Staff company receives assignment packets from Continental AMC.
- Staff company keeps internal orders in Staff Appraisal Mode.
- Hybrid company may have both internal order operations and received/sent network work.

Rules:

- Internal orders remain internal.
- Assignment packets remain packet-scoped.
- Continental relationships do not expose staff-company internal orders to Continental.
- Staff-company appraisers/vendors do not get canonical Continental order access through packet work.
- Hybrid dashboards must separate Internal Operations, Received Packets, Sent Assignments, Relationships, and Client Access lanes.
- Network work should not blend into owned internal order queues without a clear lane.

Upgrade path concepts:

- Staff company can join Continental AMC Panel as a network participant.
- Vendor-only participant can upgrade to Staff Appraisal Mode for internal operations.
- Hybrid company can add AMC, vendor, client, analytics, integrations, or AI modules intentionally.

## Client/Lender Doctrine

The canonical client/lender intake, status, communication, and delivery doctrine for Continental AMC lives in `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`. The summary below is operational context; implementation should use the doctrine document before wiring client portal intake, client-facing status projections, document/report delivery, client communication, lender integrations, or client-facing dashboard surfaces.

Clients/lenders should see:

- Requests/orders they submitted or are scoped to see.
- Status summaries.
- Action-needed items.
- Requested documents.
- Uploaded/downloadable documents.
- Reports/delivery artifacts when available.
- Safe messages and activity.
- Delivery expectations and status updates.

Clients/lenders should not see:

- Internal AMC workflow states.
- Reviewer/appraiser assignment mechanics.
- Vendor offer/acceptance/decline states.
- Vendor panel or relationship state.
- Assignment packet details.
- Internal notes.
- Internal review queue.
- Staff workload.
- SLA calculations unless intentionally productized as client-safe status.
- Permission/system terminology.

Request/status/document expectations:

- Client surfaces should speak in request, status, document, report, delivery, and action-needed language.
- Client empty states should not mention missing internal modules.
- Client status should summarize operational reality without leaking internal mechanics.
- Client-facing status is a projection and must not mutate canonical order lifecycle directly.

Communication expectations:

- Use plain, client-safe copy.
- Communicate delay or action needed without exposing vendor or review internals.
- Keep post-delivery communication linked to the client-visible request/report context.

Delivery expectations:

- Delivery state should be explicit and client-safe.
- Report/document availability should be clear.
- Completed internal workflow should not equal client delivery unless delivery actually occurred.
- Vendors do not gain client document/report access after delivery unless packet rules explicitly allow it.

## Notification + Activity Doctrine

The canonical notification, activity, escalation, and communication-separation doctrine for Continental AMC lives in `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`. The summary below is operational context; implementation should use the doctrine document before wiring notification event families, activity projections, escalation behavior, communication surfaces, notification preferences, or automation.

Who gets interrupted:

- The user or role that can act on the issue.
- AMC coordinators/admins for intake, assignment, vendor non-response, SLA escalation, and delivery risk.
- AMC reviewers for review/QC and revision-related work.
- Vendors for offers, packet due soon/overdue, corrections, packet messages, and accepted/revoked outcomes.
- Clients/lenders for action-needed items, document requests, status updates, and delivery/report availability.

Who gets visibility only:

- Users who need operational awareness but do not own the immediate action.
- Owner/admin dashboards should show quiet queue signals before broad notification blasts.

Boundaries:

- Canonical owner order notifications route to owner-company order surfaces.
- Assignment packet notifications route to `/assignments/:assignmentId`.
- Client/lender notifications route to client-safe request/status/document/report surfaces.
- Packet notifications do not expose canonical order links.
- Client notifications do not expose internal AMC workflow or vendor state.

Escalation behavior:

- Use deterministic queues first.
- Escalate to targeted notification when risk or action urgency crosses threshold.
- Avoid notifying every admin for every queue signal.
- Suppress actor-self notifications where appropriate.
- Preserve escalation history as activity.
- Keep manual and future automated escalation explainable, sparse, and role-targeted.

Operational memory:

- Activity remains the durable memory.
- Notifications are delivery prompts, not the source of truth.
- Assignment packet activity and owner order activity remain distinct.
- Client-facing activity should be curated and safe.
- Internal AMC notes, vendor packet messages, client-facing updates, audit/security events, system status updates, and notification summaries must remain separate surfaces.

## Guardrails

Forbidden patterns:

- Exposing canonical order dashboards to vendors.
- Linking vendor packet work to `/orders/:orderId`.
- Leaking internal review operations to clients/lenders.
- Letting client-facing status mutate canonical order lifecycle directly.
- Mixing client-facing comments with internal AMC notes without explicit visibility.
- Exposing vendor names, vendor performance, assignment packet details, or internal escalation mechanics to clients by default.
- Using Staff Appraisal empty-state language in Vendor or Client AMC surfaces.
- Treating relationship state as visibility authority.
- Letting assignment packet visibility drift into canonical order visibility.
- Mixing internal and external operational queues without lane labels.
- Sending notification spam for every queue signal.
- Showing hidden-module clutter or locked-feature catalogs.
- Showing permission keys, RLS, RPC names, relationship topology, assignment predicates, `company_id`, or package entitlement language in UI.
- Building billing/onboarding/tenant settings before module metadata and package doctrine are stable.
- Building lender integrations or billing enforcement as part of client/lender doctrine work.

Safe defaults:

- Hide surfaces rather than render disabled clutter.
- Use packet-native Vendor language.
- Use request/status/document Client language.
- Use AMC queue-command language for internal AMC users.
- Keep Hybrid lanes separate.
- Keep relationship lifecycle and assignment packet access distinct.
- Prefer quiet queues before interruptive notifications.

## Future Systems

Future but deferred:

- Vendor scoring.
- SLA analytics.
- Lender scorecards.
- Vendor scorecards.
- Auto-routing.
- AI assignment recommendations.
- Predictive SLA risk.
- Vendor marketplace.
- Automated escalation systems.
- Billing and fee split systems.
- Integration-driven intake automation.
- Client/lender analytics dashboards.
- Vendor compliance automation.

These systems should build on stable product-mode metadata, assignment packet doctrine, company settings, visibility boundaries, queue doctrine, and package/onboarding semantics. They should not be built ahead of the foundational product-mode implementation slices.
