# Falcon Mode Language Guide

## Purpose

This document defines Falcon's canonical vocabulary guide for mode-specific navigation, dashboards, empty states, command palette entries, upgrade prompts, notifications, activity labels, and user-facing surface copy.

It is planning documentation only. It does not change source code, component copy, route configuration, navigation components, dashboard components, permission seeds, database migrations, billing logic, onboarding enforcement, or company settings.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`

## Core Doctrine

- Language should match the user's job in the selected product mode.
- Staff users can see order, workflow, assignment, review, revision, client, due-date, and delivery language.
- AMC users can see intake, assignment, vendor panel, client/lender, SLA, QC/review, escalation, and delivery-risk language.
- Vendor users should see assignment, packet, offer, work request, due date, submission, correction, and timeline language, not owner-company order operations language.
- Vendor Portal copy should follow `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md` before assignment packet dashboard, navigation, message, activity, notification, or upgrade surfaces are implemented.
- Vendor packet state labels, queue labels, action labels, and activity labels should follow `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`.
- Vendor profile, availability, readiness, and upgrade copy should follow `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`.
- Client users should see request, status, document, report, delivery, action-needed, and message language, not internal workflow, reviewer, appraiser production, or vendor assignment language.
- Client-facing AMC/lender copy should follow `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md` before client portal intake, status, document/report delivery, or client communication surfaces are implemented.
- Client Portal copy should follow `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md` before client dashboard, navigation, request, status, document/report, message, activity, notification, or upgrade surfaces are implemented.
- Hybrid users should see clear lane labels separating internal operations from network work.
- Error and empty-state language should be safe, plain, and non-leaky.
- Hidden modules stay hidden in copy as well as UI.
- Upgrade prompts should name the outcome, not expose implementation mechanics.
- Language, labels, and errors should follow the UX guardrails in `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`.

## Terms That Must Not Leak

Normal UI copy must not expose architecture, authorization, or database terms such as:

- `module_id`
- permission key
- relationship topology
- RLS
- RPC
- row policy
- canonical order access
- assignment visibility predicate
- active-company claim
- `company_id`
- tenant enforcement
- security definer
- security invoker
- service role
- package entitlement
- backend helper
- readable-order predicate
- readable-client predicate

Safe user-facing alternatives:

- "This item is not available in your current workspace."
- "No packets are available for this relationship."
- "No requests match these filters."
- "You can see assigned work here."
- "Ask an owner to update your team access."

## Shared Copy Rules

- Prefer the noun the user already understands in that mode.
- Put the next natural action first.
- Explain empty results without implying the product is broken.
- Do not describe hidden modules as missing.
- Do not show locked-feature language in navigation, dashboards, or global empty states.
- Keep permission-limited copy narrow and practical.
- Avoid exposing whether data exists outside the user's current scope.
- Use upgrade prompts only where the user is already showing intent for the adjacent capability.
- Keep command palette labels action-oriented and mode-native.

## Staff Appraisal Mode

Preferred product language:

- Orders.
- Clients.
- Appraisers.
- Reviewers.
- Assignments.
- Due dates.
- Calendar.
- Review.
- Revisions.
- Delivery.
- Activity.
- Team Access.

Dashboard title language:

- Staff Operations Dashboard.
- Orders needing attention.
- Due soon / overdue.
- Appraiser workload.
- Reviewer workload.
- Review queue.
- Recent activity.

Navigation labels:

- Dashboard.
- Orders.
- Calendar.
- Clients.
- Team Access.
- Reports / Analytics when enabled.
- Settings.

Command palette labels:

- New order.
- Find order.
- Add client.
- Invite team member.
- Open calendar.
- Start review.
- Request revisions.
- Mark ready for client.

Empty-state language:

- "No orders need attention right now."
- "Create your first order to start tracking assignment, review, and delivery."
- "No orders match these filters."
- "No review work is waiting."

Upgrade-prompt language:

- "Add client portal access for status and report delivery."
- "Explore analytics for delivery and review trends."
- "Use AI summaries to prepare order updates."
- "Join network assignment workflows when your team is ready."

Notification/activity label considerations:

- Order, workflow, review, revision, assignment, and delivery events can be explicit.
- Actor labels can use appraiser, reviewer, admin, owner, or client where appropriate.
- Activity should preserve operational memory without turning every event into a notification.

Words to avoid:

- Packet as the primary owned-order concept.
- Vendor panel unless network modules are enabled.
- Request dashboard as the primary internal staff dashboard.
- Locked, disabled, entitlement, canonical, predicate, RLS, or permission key.

Internal terms that must not leak:

- Canonical order access.
- `orders.read.all`.
- `orders.update.assigned`.
- Company claim.
- Readable-order predicate.

Examples of good copy:

- "No orders need review right now."
- "Create an order to start tracking assignment, review, and delivery."
- "No orders match these filters."
- "Reviewer requested revisions."

Examples of bad copy:

- "No canonical order rows are readable."
- "Enable vendor_portal to unlock packets."
- "Permission orders.read.all is required."
- "Upgrade to see hidden AMC tools."

Minimum viable implementation guidance:

- Use Staff vocabulary on current order, client, calendar, dashboard, review, and team surfaces.
- Replace generic access-denied and empty-state copy with safe operational language.
- Do not surface hidden module names in Staff nav or dashboard copy.

Future enhanced implementation guidance:

- Support company terminology profiles for local role naming.
- Add role-aware microcopy for appraiser, reviewer, billing, admin, and owner lenses.
- Add copy QA checks for forbidden architecture terms.

## AMC Operations Mode

Preferred product language:

- Intake.
- Client/lender.
- Vendor.
- Vendor panel.
- Assignment.
- Offer.
- Acceptance.
- SLA.
- QC.
- Review.
- Escalation.
- Delivery risk.
- Relationship.

Dashboard title language:

- AMC Network Operations Dashboard.
- Intake queue.
- Vendor offers.
- Active assignments.
- SLA risk.
- QC queue.
- Client exceptions.

Navigation labels:

- AMC Dashboard.
- Orders / Intake.
- Assignments.
- Vendor Panel.
- Clients / Lenders.
- Reviews / QC.
- Calendar / SLA.
- Analytics when enabled.
- Integrations when enabled.
- Settings.

Command palette labels:

- Intake order.
- Find order.
- Offer assignment.
- Find vendor.
- Open relationship.
- Review / QC order.
- Escalate SLA.
- Open client account.

Empty-state language:

- "No orders are waiting for intake."
- "No vendor offers need follow-up."
- "No SLA exceptions are active."
- "No vendors are active in this panel yet."

Upgrade-prompt language:

- "Add Vendor Portal so vendors can accept and complete packets."
- "Add Client Portal so clients can submit requests and see status."
- "Connect integrations for intake and delivery automation."
- "Use analytics to monitor SLA and vendor performance."

Notification/activity label considerations:

- Use vendor accepted assignment, vendor declined offer, SLA risk, QC complete, client document received, report delivered, and escalation language.
- Use appraiser only for internal staff appraisers, not as the default external vendor label.
- Keep client/lender-facing activity separate from vendor-facing packet activity.

Words to avoid:

- Staff shop.
- Staff cockpit.
- Appraisal shop order as first-run framing.
- Vendor packet dashboard as the entire AMC dashboard.
- Canonical order access.
- Relationship grants access.

Internal terms that must not leak:

- Relationship topology.
- Assignment visibility predicate.
- `relationships.assign_work`.
- `order_company_assignments.read_owner`.
- Service-role assignment path.

Examples of good copy:

- "No vendor offers need follow-up."
- "Assign this file to an active vendor."
- "SLA risk is clear for the selected queue."
- "No client exceptions match these filters."

Examples of bad copy:

- "No Staff tools are available."
- "Relationship exists, so order visibility should be granted."
- "Assignment predicate failed."
- "Vendor portal module is hidden by package."

Minimum viable implementation guidance:

- Use AMC vocabulary on queue labels, dashboards, assignment surfaces, vendor panel surfaces, and command entries.
- Keep owner-company order language internal to AMC operators only.
- Do not expose vendor packet-only wording as the primary AMC surface.

Future enhanced implementation guidance:

- Add client/lender terminology profiles.
- Add SLA severity vocabulary by queue type.
- Add vendor-performance and client-exception copy variants.

## Vendor Portal Mode

Preferred product language:

- Assignment.
- Packet.
- Offer.
- Accept.
- Decline.
- Work request.
- Due date.
- Submit.
- Correction.
- Timeline.
- Profile.
- Availability.

Dashboard title language:

- Assignment Packet Dashboard.
- Offers waiting.
- Active packets.
- Due soon.
- Corrections requested.
- Submitted work.

Navigation labels:

- Dashboard.
- My Assignments.
- Due Soon.
- Revisions.
- Messages / Updates.
- Completed Work.
- Profile / Availability.
- Settings.

Command palette labels:

- Open packet.
- Accept offer.
- Decline offer.
- Submit work.
- View timeline.
- Update profile.
- Open calendar.

Empty-state language:

- "No assignment packets are available yet."
- "No offers are waiting for your response."
- "No active packets match these filters."
- "Your submitted packets will appear here."

Upgrade-prompt language:

- "Run your own appraisal operations with Staff Appraisal Mode."
- "Add internal order management when you are ready to manage your own clients and team."
- "Use reporting tools for your own company work."

Notification/activity label considerations:

- Use assignment offered, offer accepted, packet due soon, work submitted, correction requested, packet completed, and message from operations.
- Use packet-safe lifecycle labels such as Offer received, Offer reviewed, Accepted, In progress, Submitted, Correction requested, Resubmitted, Completed, Cancelled, No longer available, and Offer expired where appropriate.
- Do not expose owner-company client names, order details, review internals, fees, or internal notes unless explicitly included in the packet contract.

Words to avoid:

- Order list.
- Client CRM.
- Reviewer queue.
- Internal workflow.
- Staff dashboard.
- Admin tools.
- Canonical order.
- Owner order.

Internal terms that must not leak:

- Canonical order access.
- `order_id`.
- `order_company_assignments`.
- Assigned-company read predicate.
- Owner-company scope.

Examples of good copy:

- "No assignment packets are available yet."
- "Submit work for this packet."
- "A correction was requested for this packet."
- "No offers match these filters."

Examples of bad copy:

- "No orders found."
- "You do not have access to Staff tools."
- "orders.read.assigned is required."
- "Canonical order access denied."

Minimum viable implementation guidance:

- Use packet and assignment language for every Vendor dashboard, nav, command, empty-state, and notification surface.
- Never link Vendor users to internal order copy or internal order dashboard labels.
- Hide unavailable internal modules without naming them.

Future enhanced implementation guidance:

- Add vendor profile-readiness language.
- Add packet status microcopy for offer, accepted, in progress, submitted, correction, completed, cancelled, and revoked states.
- Add network-specific availability and capacity wording.

## Client Portal Mode

Preferred product language:

- Request.
- Order status.
- Report.
- Document.
- Delivery.
- Action needed.
- Submitted.
- In progress.
- Delivered.
- Message.
- Account.

Dashboard title language:

- Client Order Status Dashboard.
- Requests in progress.
- Action needed.
- Reports available.
- Documents needed.
- Recent updates.

Navigation labels:

- Dashboard.
- Submit Request.
- My Requests.
- Status Updates.
- Documents / Reports.
- Messages / Updates.
- Organization Users later.
- Billing later.
- Settings.

Command palette labels:

- Submit request.
- View status.
- Upload document.
- Download report.
- Message operations.
- Open account settings.

Empty-state language:

- "No requests have been submitted yet."
- "No reports are available yet."
- "Nothing needs your action right now."
- "No documents match these filters."

Upgrade-prompt language:

- "Connect integrations for automated request submission."
- "Add advanced reporting for portfolio visibility."
- "Enable billing views for invoice and payment tracking."

Notification/activity label considerations:

- Use request received, status updated, document needed, document uploaded, report delivered, message from operations, and action needed.
- Do not expose appraiser assignment, reviewer status, vendor offers, QC internals, or owner-company workflow states.
- Treat client-facing status as a plain-language projection, not internal lifecycle authority.
- Do not expose assignment packet state, vendor packet activity, internal escalation labels, or SLA queue language.

Words to avoid:

- Appraiser.
- Reviewer.
- Workflow.
- QC queue.
- Vendor panel.
- Assignment packet.
- SLA escalation.
- Vendor assignment.
- Internal lifecycle.
- Packet.
- Staff tools.

Internal terms that must not leak:

- Client portal scope predicate.
- Readable client helper.
- `clients.read.assigned`.
- Order company ownership.
- Internal status transition key.

Examples of good copy:

- "Your request is in progress."
- "A report is ready to download."
- "Upload the requested document to keep this request moving."
- "No requests match these filters."

Examples of bad copy:

- "Reviewer requested revisions."
- "Vendor assignment declined."
- "Workflow status changed to ready_for_review."
- "Client visibility predicate failed."

Minimum viable implementation guidance:

- Use request/status/document/report language across all Client surfaces.
- Translate internal order milestones into client-safe status labels.
- Hide internal operations, vendor, review, and assignment terms.

Future enhanced implementation guidance:

- Add client account terminology profiles for lender, broker, enterprise, and branch contexts.
- Add document lifecycle copy for requested, uploaded, accepted, rejected, and delivered states.
- Add safe delivery-risk messaging that does not expose internal staffing or vendor details.

## Hybrid / Ecosystem Mode

Preferred product language:

- Internal Operations.
- Network Work.
- Sent Assignments.
- Received Packets.
- Relationships.
- Client Access.
- Vendor Panel.
- Intelligence.
- Administration.

Dashboard title language:

- Ecosystem Operations Dashboard.
- Internal Operations.
- Network Work.
- Sent Assignments.
- Received Packets.
- Relationship Health.
- Client Activity.

Navigation labels:

- Dashboard.
- Internal Operations.
- Network Work.
- Assignments.
- Relationships.
- Clients.
- Vendor Panel.
- Analytics when enabled.
- Settings.

Command palette labels:

- Open internal order.
- Open packet.
- Offer assignment.
- Open relationship.
- View client request.
- Find vendor.
- Find client.
- Open network activity.

Empty-state language:

- "Internal Operations: no active orders need attention."
- "Network Work: no packets are available."
- "Sent Assignments: no vendor follow-up is waiting."
- "Relationships: no active relationships match these filters."

Upgrade-prompt language:

- "Add Vendor Portal for external packet execution."
- "Add Client Portal for request and status visibility."
- "Add analytics for internal and network performance."
- "Add integrations for intake and delivery automation."

Notification/activity label considerations:

- Prefix or group events by lane when ambiguity is possible.
- Use internal order language only in the Internal Operations lane.
- Use packet language only in Received Packets or Vendor-facing lanes.
- Use request/status language only in Client Access lanes.

Words to avoid:

- Generic "work items" when the lane matters.
- Blended order/packet/request copy.
- Relationship grants access.
- No orders in packet-only lanes.
- No packets in internal-order lanes.

Internal terms that must not leak:

- Relationship topology.
- Canonical order access.
- Assignment packet predicate.
- Product-mode resolver.
- Module bundle.

Examples of good copy:

- "Internal Operations: no orders need review."
- "Network Work: no packets are available yet."
- "Sent Assignments: no vendor offers need follow-up."
- "Client Access: no requests need action."

Examples of bad copy:

- "No work items found."
- "Hybrid modules are disabled."
- "Relationship exists but canonical order access is denied."
- "Assigned packet predicate returned false."

Minimum viable implementation guidance:

- Label every Hybrid dashboard section and nav lane clearly.
- Keep internal orders, sent assignments, received packets, relationships, and client access visually and verbally separate.
- Do not reuse one empty-state message across all lanes.

Future enhanced implementation guidance:

- Add lane-specific command palette grouping.
- Add notification grouping by lane.
- Add company-configurable lane names while preserving canonical semantics.

## Error And Access Copy

Safe error copy:

- "This item is not available in your current workspace."
- "This item may have been completed, removed, or moved outside your current scope."
- "Ask an owner to update your team access."
- "No packets are available for this relationship."
- "No requests match these filters."

Unsafe error copy:

- "RLS denied this row."
- "Missing permission key."
- "Canonical order unreadable."
- "Assignment visibility predicate failed."
- "Company ID mismatch."
- "RPC returned no rows because security definer filtered the result."

## Minimum Copy Review Checklist

Before implementing UI copy from this guide:

- Confirm the selected product mode.
- Confirm the user's surface: dashboard, navigation, command palette, empty state, upgrade prompt, notification, activity, or error.
- Use the mode's preferred noun for the primary object.
- Verify hidden modules are not named.
- Verify internal architecture terms are absent.
- Verify Vendor and Client copy does not reuse Staff or AMC internal operations language.
- Verify Hybrid copy names the lane.
- Verify upgrade prompts are contextual and sparse.
- Run the standard validation for any implementation slice.
