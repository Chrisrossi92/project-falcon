# Falcon Vendor Portal Operational Blueprint

## Purpose

This document defines the canonical Vendor Portal operational blueprint for external vendors participating in Continental AMC and future AMC ecosystems.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, permission seeds, database migrations, relationship lifecycle, assignment lifecycle, notification/activity behavior, onboarding enforcement, billing logic, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_ARCHITECTURE.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_AMC_VENDOR_PANEL_DOCTRINE.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`

## Core Doctrine

- Vendor Portal is an assignment-only operational workspace.
- Vendor Portal is a complete product experience for external vendors, not a restricted Staff Appraisal account.
- Vendor Portal is a packet execution surface, not canonical order operations.
- Vendor users should never feel like they are missing internal Staff, AMC, or Client tools.
- Assignment packet access is not canonical order access.
- Vendor relationships and vendor panel membership are not visibility grants.
- Assignment packet messages, activity, documents, notifications, and lifecycle actions remain assignment-scoped.
- Vendor packet states, queues, actions, activity, and document boundaries should follow `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`.
- Vendor profile, availability, readiness, capacity, and upgrade doctrine should follow `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`.
- Client-facing communication and internal AMC notes must not leak into Vendor Portal unless explicitly included in the packet contract.
- Completed packet history is not the same as full company order history.

## Vendor Portal Purpose

Vendor Portal should help an external vendor answer:

- What assignment offers need my response?
- What packets am I responsible for now?
- What work is due soon or overdue?
- What correction or revision requests need action?
- What documents, instructions, requirements, or messages are relevant to this packet?
- What have I submitted, completed, or closed?

Vendor Portal should not help a vendor answer:

- What orders does Continental AMC own?
- Which clients/lenders does Continental serve?
- Which internal AMC coordinator, reviewer, or queue owns the order?
- Which other vendors were offered or considered for the work?
- What internal notes, review findings, SLA escalations, or vendor scorecards exist?
- What unrelated orders, clients, queues, relationships, or dashboards exist elsewhere in Falcon?

The portal should feel like a focused workbench for packet execution. It should not expose a blank Orders module, an inaccessible Client CRM, a disabled AMC Dashboard, or Staff-mode workflow labels.

## Vendor Operational Lifecycle

### 1. Invite / Join Panel

The vendor may be invited to join an AMC vendor panel or relationship network.

Current doctrine:

- Panel invitation and relationship membership are business eligibility concepts.
- Joining a panel does not expose orders, clients, internal queues, or assignment packets.
- Vendor onboarding state can affect future eligibility, but not visibility by itself.

Future/deferred:

- Vendor self-service onboarding, profile readiness, compliance document upload, license validation, and availability setup remain future systems.
- Vendor profile/readiness affects assignment eligibility only; it does not grant packet, order, client, activity, or dashboard visibility.

### 2. Receive Assignment Offer

The vendor receives a packet offer when an AMC owner company explicitly offers work.

Current doctrine:

- The offer packet is the first operational visibility grant.
- Offer notification should route to the assignment packet, not to a canonical order.
- The offer should include only safe, assignment-relevant context.

The vendor should be able to understand the work request, due dates, requirements, and response deadline without seeing AMC internal workflow or client account internals.

### 3. Review Packet

The vendor reviews the assignment packet before accepting or declining.

The packet may include:

- Assignment type and work request summary.
- Safe property or subject context needed to evaluate the work.
- Due dates, response deadline, and expected deliverables.
- Instructions and requirements selected by the AMC.
- Safe documents needed for the assignment.
- Packet messages or updates visible to the vendor.

The packet must not include unrelated client/account data, internal AMC notes, other vendor information, review workload, internal escalation state, hidden order fields, or permission/security terminology.

### 4. Accept / Decline

The vendor can accept or decline the offer through packet actions.

Doctrine:

- Accepting starts vendor responsibility for the packet.
- Declining should capture safe reason/context where supported without exposing internal routing strategy.
- Declined packets should remain visible according to assignment lifecycle rules only.
- Accept/decline events should write assignment-scoped activity and route owner-side notifications according to AMC notification doctrine.

### 5. Production

Accepted packets become active vendor work.

The vendor should see:

- Current packet state.
- Work requirements.
- Due dates.
- Safe files/documents.
- Messages and updates.
- Submission affordances where supported.
- Assignment-scoped timeline.

The vendor should not see AMC review queues, client waiting queues, internal SLA risk, coordinator dashboards, or owner-company activity feed.

### 6. Upload / Submit

Submission is the vendor handoff back to the AMC.

Doctrine:

- Submission belongs to the assignment lifecycle.
- Submission does not directly complete or deliver the canonical order.
- Submitted work can create owner-side review/QC attention without exposing review mechanics to the vendor.
- Submitted files/documents should remain packet-scoped unless separately promoted into owner-order or client-delivery surfaces.

### 7. Revisions / Corrections

Corrections are packet-visible requests for vendor action.

Doctrine:

- Vendor-facing language should use "correction requested" or "revision requested" only when that language is intentionally exposed.
- Internal reviewer/QC mechanics should be abstracted.
- Correction messages should identify what the vendor needs to do, not internal review queue state.
- Correction submission should return the packet to owner-side review attention.

### 8. Completion

Completion means the vendor's assignment responsibility is closed or accepted by the owner-side process.

Doctrine:

- Vendor completion is not the same as client delivery.
- Vendor completion does not imply the vendor can see final client delivery, internal approval, billing, or post-delivery communication.
- Completion should remain visible in packet history according to retention and assignment lifecycle rules.

### 9. Historical Packet Access Later

Historical access is a future product decision.

Future doctrine:

- Vendors may need completed packet history for records, quality follow-up, and repeat-work context.
- Historical packet access should remain assignment-scoped.
- Historical access should not become full order history or client CRM access.

## Vendor Packet Doctrine

### Vendors Can See

Vendors may see packet-scoped fields such as:

- Assignment offer/status.
- Owner company display name where safe.
- Assignment type.
- Work request summary.
- Response deadline.
- Due/revision dates relevant to the packet.
- Safe property/work context needed to perform the assignment.
- Requirements and instructions intentionally included by the AMC.
- Required deliverables.
- Safe packet documents.
- Vendor-visible packet messages and updates.
- Assignment-scoped activity/timeline.
- Packet actions such as accept, decline, start, submit, respond to correction, or view completion outcome.

### Vendors Cannot See

Vendors should not see:

- Canonical order dashboard, order list, or order detail routes.
- Internal AMC queues, client exception queues, review queues, SLA escalation queues, or owner dashboards.
- Client CRM/account data unless explicitly included in the packet contract.
- Client-facing messages unless explicitly bridged into the packet.
- Internal AMC notes.
- Internal review workload, reviewer identity, or QC process details unless intentionally abstracted.
- Other vendors, other assignment offers, vendor selection strategy, or relationship topology.
- Unrelated orders, unrelated clients, owner-team data, or internal calendars.
- Fees, splits, billing, or payout details unless a future vendor billing/payout surface is productized.
- Permission, RLS, RPC, package, `company_id`, or "canonical order access" terminology.

### Assignment-Scoped Visibility

Assignment packet visibility is scoped to the packet.

Rules:

- An active vendor relationship does not create packet visibility.
- Panel membership does not create packet visibility.
- Offer creation creates the offer packet visibility surface.
- Accepted work continues through assignment lifecycle visibility.
- Cancelled, revoked, expired, completed, and archived packet history should follow explicit packet retention rules.
- Vendor Portal should never infer access from client association, company relationship existence, or internal AMC order visibility.

### Communication Boundaries

Vendor-visible communication includes packet messages, correction requests, and packet updates.

It excludes:

- Internal AMC notes.
- Client/lender messages.
- Internal escalation discussion.
- Security/audit events.
- Owner-order activity feed entries not intentionally projected into the packet.

If a client-facing update must be shared with a vendor, it should be explicitly copied or projected into the packet as vendor-safe context.

### Document Boundaries

Vendor packet documents are documents intentionally included for assignment execution.

Vendor Portal must not expose:

- Full owner-order document libraries by default.
- Client delivery packages by default.
- Internal review annotations unless intentionally converted into a correction request.
- Other vendors' submissions.
- Documents belonging to unrelated orders or clients.

### Client Visibility Rules

Vendors should not see client/lender identity, account details, contact details, client messages, or client status unless that information is required for the assignment and explicitly included in the packet.

Client Portal status, delivery, and communication surfaces are separate from Vendor Portal packet execution.

### Internal AMC Visibility Rules

Vendors should not see:

- AMC internal owner, coordinator, reviewer, or queue responsibility.
- Internal SLA, escalation, or delivery-risk reasoning.
- Vendor panel scorecards or internal relationship notes.
- Internal order lifecycle states unless translated into packet-safe status.

### Activity Visibility Rules

Vendor Portal should show assignment-scoped activity only.

It should not show canonical owner-order activity, client-facing communication history, internal AMC notes, system/audit events, or notification delivery logs unless a future projection intentionally exposes a safe summary.

### Status Vocabulary

Vendor-facing packet status should be packet-native:

- Offered.
- Accepted.
- Declined.
- In Progress.
- Submitted.
- Correction Requested.
- Completed.
- Cancelled.
- Revoked.
- Expired.

These labels are not canonical order lifecycle statuses. They should not mutate owner-order workflow directly.

The canonical packet lifecycle taxonomy, including conceptual packet states, vendor-safe dashboard queues, packet actions, activity families, and document/report boundaries, lives in `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`.

## Vendor Dashboard Blueprint

Dashboard name:

- Assignment Packet Dashboard.

Primary daily question:

- Which assigned packets need my response, work, submission, or correction?

Primary sections:

- Offers Waiting: assignment offers requiring accept/decline response.
- Active Packets: accepted work currently in progress.
- Due Soon: packet work approaching due or response deadline.
- Corrections Requested: packets requiring correction or revision action.
- Messages / Updates: recent vendor-visible packet communication.
- Submitted / Recently Completed: packets submitted, completed, or recently closed.

Secondary/future sections:

- Vendor Profile Readiness.
- Availability / Schedule later.
- Completed Work history later.
- Packet performance or analytics later.
- Contextual Staff Appraisal upgrade prompt where the vendor is exploring internal operations.

Dashboard guardrails:

- No canonical order dashboard exposure.
- No owner-company order KPIs.
- No internal AMC queues.
- No client exception queues.
- No hidden-module cards.
- No "upgrade to unlock Orders" dashboard clutter.

## Vendor Navigation Blueprint

Default navigation should be packet-native:

- Dashboard.
- My Assignments.
- Due Soon.
- Revisions.
- Messages / Updates.
- Completed Work.
- Profile / Availability later.
- Settings.

What must stay hidden:

- Orders as canonical owned order management.
- Clients as CRM/account management.
- AMC Dashboard.
- Vendor Panel administration.
- Reviews / QC.
- Internal Calendar / SLA.
- Relationship topology.
- Client Portal request/status surfaces.
- Billing, payouts, analytics, integrations, and AI unless productized for Vendor Portal.
- Broad Team Access unless vendor organization administration is explicitly enabled.

Navigation should not display hidden items as disabled entries.

## Vendor Language Doctrine

Preferred words:

- Assignment.
- Packet.
- Offer.
- Work request.
- Due date.
- Submit work.
- Correction requested.
- Revision response where appropriate.
- Timeline.
- Message from operations.
- Completed work.
- Profile.
- Availability.

Avoid:

- Order list.
- Client CRM.
- Staff dashboard.
- AMC queue.
- Reviewer queue.
- QC queue.
- Internal workflow.
- Canonical order.
- Owner order.
- Permission, entitlement, RLS, RPC, relationship topology, or security policy terms.

Language should make Vendor Portal feel purpose-built:

- "No assignment offers are waiting."
- "Submit work for this packet."
- "A correction was requested for this packet."
- "Completed packets will appear here."

Language should not imply missing Staff tools:

- Avoid "You do not have access to Orders."
- Avoid "Upgrade to unlock hidden modules."
- Avoid "Canonical order access denied."

## Vendor Communication Doctrine

Vendor-visible communication surfaces:

- Packet messages.
- Assignment offer updates.
- Correction or revision requests.
- Safe status updates from operations.
- Submission confirmations.
- Completion outcomes.

Who can send vendor-visible updates:

- Authorized AMC users through assignment/packet surfaces.
- Authorized vendor users inside their packet scope.
- System events only when they are packet-safe and action-relevant.

Who can read vendor-visible updates:

- Vendor users with packet access.
- Authorized AMC users with owner-side assignment visibility.

Communication separation:

- Internal AMC notes stay internal.
- Client-facing messages stay client-facing.
- Vendor packet messages stay packet-facing.
- System/audit events stay in audit/system surfaces unless safely summarized.
- Notification summaries are delivery prompts, not durable conversation records.

Notification expectations:

- New offer, offer changes, correction requests, due-risk reminders, material packet messages, and completion outcomes may notify.
- Routine queue movement, internal review changes, owner-side SLA calculations, or client-facing updates should not automatically notify vendors.
- Vendor notifications should route to assignment packets and use packet-native language.

## Vendor Upgrade Doctrine

Vendor Portal can lead to Staff Appraisal Mode when a vendor wants to run their own internal operations in Falcon.

Upgrade framing:

- Use contextual operational outcomes.
- "Run your own appraisal operations with Staff Appraisal Mode."
- "Add internal order management when you are ready to manage your own clients and team."

Upgrade framing should not:

- Tell vendors they are missing features.
- Show persistent locked Staff nav.
- Show disabled Orders, Clients, Reviews, or Team Access surfaces.
- Interrupt packet execution.
- Imply Vendor Portal is a second-class account.

Future upgrade paths:

- Staff Appraisal Mode for owned orders, clients, team, calendar, reviews, and delivery.
- AI/report assistance later where vendor-side report support is productized.
- Analytics later after Staff Mode or vendor performance products are defined.

## Vendor Visibility Doctrine

Visibility rules:

- Assignment packet access is not canonical order access.
- Vendor relationships do not grant operational visibility.
- Vendor panel membership does not grant operational visibility.
- Eligibility determines whether work may be offered, not whether data is visible.
- Completed assignment history is separate from full company operations.
- Vendor users should never see unrelated orders, unrelated clients, internal AMC queues, owner-company activity, or client portal communication.
- Vendor Portal should never route assignment-only users to canonical order pages.

Visibility should be explicit, scoped, and explainable from packet membership/lifecycle.

## Guardrails

- No canonical order dashboard exposure.
- No internal AMC queue leakage.
- No hidden-module clutter.
- No client operational leakage.
- No permission/security terminology in UI.
- No relationship-topology exposure.
- No mixed Staff/Vendor dashboard language.
- No internal review workflow leakage unless intentionally abstracted.
- Do not expose vendor names, scorecards, or comparison data to other vendors.
- Do not expose client messages to vendors unless explicitly projected into the packet.
- Do not expose vendor packet messages to clients by default.
- Do not make completed packet history behave like full order history.
- Do not write Vendor Portal behavior around owner-company appraiser/reviewer assignment fields.

## Deferred Future Systems

The following systems are intentionally deferred:

- Vendor scorecards.
- Capacity management.
- Service area routing.
- Mobile-first field workflows.
- AI packet assistance.
- Auto-routing.
- Availability calendars.
- Billing and payout systems.
- Vendor performance analytics.
- Compliance document automation.
- License/coverage verification.
- Vendor organization administration beyond minimum settings.

These systems should build on stable assignment packet visibility, Vendor Portal language, notification/activity separation, and panel eligibility doctrine.

## Future Contributor Checklist

Before implementing Vendor Portal surfaces, verify:

- The surface is assignment-packet scoped.
- The user-facing words are packet-native.
- Hidden Staff, AMC, Client, and admin modules do not render as disabled clutter.
- Packet links do not route to canonical order pages.
- Vendor notifications route to assignment packet surfaces.
- Vendor activity reads assignment-scoped history, not owner-order activity.
- Client-facing communication remains separate.
- Internal AMC notes and escalations remain hidden.
- Relationship or panel state is not treated as visibility.
- Upgrade prompts describe Staff Appraisal outcomes only in relevant contexts.
