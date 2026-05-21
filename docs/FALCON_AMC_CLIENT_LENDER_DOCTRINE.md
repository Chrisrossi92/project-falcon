# Falcon AMC Client/Lender Doctrine

## Purpose

This document defines the canonical doctrine for Continental AMC client/lender intake, client-facing status, document/report delivery, client communication, and Client Portal boundaries before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, workflow statuses, permission seeds, database migrations, billing logic, onboarding enforcement, company settings, client portal UI, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`

## Core Doctrine

- Clients and lenders submit or receive orders.
- Client/lender access is scoped to requests, status, documents, reports, messages, and account context.
- Client/lender access is not internal AMC workflow visibility.
- Client-facing status is a projection, not internal lifecycle authority.
- Client Portal Mode should feel purpose-built, not like read-only Staff Appraisal Mode or read-only AMC Operations Mode.
- Client Portal operational doctrine lives in `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`; client dashboard, navigation, request, status, document/report, communication, notification, and upgrade surfaces should follow it.
- Clients should not see internal AMC queue IDs, vendor assignment mechanics, reviewer workload, vendor SLA risk, staff workload, permission terms, or relationship topology.
- Delivery is controlled by authorized AMC users and delivery policy, not by client-facing status labels alone.
- Client-facing communication must be explicit about visibility: internal notes and client-visible updates are different records or clearly different visibility states.
- Client-facing updates and notifications must remain separate from internal AMC notifications and vendor packet messages.

## Client/Lender Purpose Inside Continental AMC

Continental AMC client/lender surfaces exist to support request intake, order status visibility, document exchange, report delivery, and safe communication.

Clients/lenders should be able to answer:

- What requests have we submitted?
- What is the current status?
- What needs our action?
- Which documents or reports are available?
- Has the report been delivered?
- What did operations communicate to us?

Clients/lenders should not be able to answer:

- Which vendor was offered the work unless intentionally configured later.
- Which vendor declined or missed a deadline.
- Which reviewer is overloaded.
- Which internal AMC queue currently contains the order.
- Which internal workflow transition is next.
- Which internal staff member owns escalation unless deliberately exposed as account support.

## Intake Channels

### AMC-created internal intake

Current/future/deferred status:

- Current concept and current operational baseline.

Data required:

- Client/lender identity, requester/contact, property/request details, product/report type, due date, required documents, delivery expectations, and internal notes.

Operational owner:

- AMC Coordinator or AMC Admin.

Dashboard/queue impact:

- May enter New Intake, Intake Needs Review, Unassigned, Client Waiting, or Delivery Risk depending on completeness and urgency.

Visibility boundary:

- Internal intake details stay inside AMC operations.
- Client-facing status appears only when a client/lender portal surface or communication is intentionally created.

### Client portal request

Current/future/deferred status:

- Future productized channel.

Data required:

- Requester identity, client organization, property/request details, product/report type, requested due date, documents, instructions, and safe message context.

Operational owner:

- Client requester submits; AMC Coordinator owns triage after submission.

Dashboard/queue impact:

- Should create client-safe received/submitted state and internal New Intake or Intake Needs Review queue membership.

Visibility boundary:

- Client sees the submitted request, client-facing status, documents/messages, and delivery outcome.
- Client does not see internal intake defects, assignment eligibility, vendor routing, or internal review mechanics.

### Lender portal/integration later

Current/future/deferred status:

- Deferred.

Data required:

- Integration identity, lender account mapping, request payload, document payloads, due/SLA expectations, delivery callback rules, and audit metadata.

Operational owner:

- AMC operations owns triage; integration owner/admin owns mapping and monitoring later.

Dashboard/queue impact:

- May create integration/import attention, New Intake, Intake Needs Review, Client Waiting, or Delivery Risk signals.

Visibility boundary:

- Integration payloads should be normalized into safe intake records.
- Integration errors should not expose provider internals to normal client users.

### Email/manual intake

Current/future/deferred status:

- Current operational reality; productized capture/enrichment later.

Data required:

- Sender/contact, client/lender identity, request details, attachments/documents, due date, product type, and any special instructions.

Operational owner:

- AMC Coordinator.

Dashboard/queue impact:

- Manual intake should enter New Intake or Intake Needs Review until validated.

Visibility boundary:

- Email/manual artifacts remain internal unless deliberately shared or converted into client-visible messages/documents.

### Imported order batch later

Current/future/deferred status:

- Deferred.

Data required:

- Source file/batch identity, client mapping, row-level request details, documents, due dates, import validation results, and operator audit.

Operational owner:

- AMC Admin or operations support.

Dashboard/queue impact:

- Should create import status attention plus New Intake/Intake Needs Review records after validation.

Visibility boundary:

- Clients see accepted requests/status only, not raw import rows, validation internals, or failed row diagnostics unless intentionally reported.

### Repeat-client quick order later

Current/future/deferred status:

- Future.

Data required:

- Client/account defaults, requester identity, product/report type, property/request details, required documents, due date, and delivery preference.

Operational owner:

- Client requester initiates; AMC Coordinator triages exceptions.

Dashboard/queue impact:

- Complete quick orders may enter Intake Ready/Unassigned.
- Incomplete quick orders enter Intake Needs Review or Client Waiting.

Visibility boundary:

- Client sees request and status.
- Internal defaults, pricing, routing, vendor eligibility, and review policy remain internal unless productized.

## Client-Facing Status Doctrine

Client-facing status is a simplified outward-facing projection. It is not internal lifecycle authority and must not mutate canonical order lifecycle directly.

Preferred outward statuses:

- Received.
- Being reviewed.
- Assigned.
- In progress.
- In review.
- Revision in progress.
- Ready for delivery.
- Delivered.
- Completed.
- Cancelled / on hold.

Status guidance:

- Received: the request was received and is waiting for intake/triage.
- Being reviewed: operations is checking request details, documents, or requirements.
- Assigned: work has been assigned or routed, without exposing internal assignee/vendor mechanics by default.
- In progress: the work is underway.
- In review: the completed work is being reviewed by operations/QC.
- Revision in progress: updates or corrections are being handled.
- Ready for delivery: the report/document is approved or prepared for client delivery.
- Delivered: the report/document has been delivered or made available.
- Completed: the request is closed after delivery and any post-delivery handling.
- Cancelled / on hold: the request is not actively progressing because it was cancelled, withdrawn, or paused.

Projection rules:

- Client status should be reassuring and plain-language.
- Client status should hide vendor offer state, vendor non-response, vendor score/risk, reviewer workload, staff workload, internal SLA escalation, and assignment packet details.
- Client status should not expose internal queue IDs.
- Client status should be explainable from internal order, assignment, review, delivery, document, and communication state.
- If internal state is ambiguous, use a safe broader status rather than leaking internals.

## Client Communication Doctrine

Detailed notification, activity, escalation, and communication-separation doctrine lives in `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`. The summary below defines client/lender communication behavior only.

Client messages are client-visible communications tied to a request/order/account context.

Who can send client messages:

- Authorized AMC users.
- Client/lender users where replies or inbound messages are enabled.
- System/integration senders later through controlled templates and audit.

Who can read client messages:

- Authorized AMC users with client/order communication scope.
- Client/lender users scoped to the relevant client organization/request.
- Future integration surfaces only through explicit delivery/audit rules.

Relationship to activity history:

- Client messages may create internal activity memory.
- Internal activity is not automatically client-visible.
- Client-visible communication should be distinguishable from internal AMC notes.
- Client messages should preserve durable history without becoming noisy notifications by default.

Internal notes versus client-facing updates:

- Internal notes are for AMC operations, review, escalation, routing, and staff coordination.
- Client-facing updates are safe, intentional communications to the client/lender.
- A note should never become client-visible by accident.
- UI should require explicit visibility selection when both note types exist.

Safe error/copy rules:

- Use plain explanations such as "This request is not available in your account" or "No documents are available yet."
- Do not reveal whether hidden internal data exists.
- Do not mention permission keys, RLS, module IDs, relationship topology, assignment predicates, or canonical order access.
- Do not expose provider/import internals to normal client users.

Notification expectations:

- Notify clients for request received, action needed, document requested, status update when meaningful, report delivered, and direct message.
- Do not notify clients for every internal workflow step.
- Notify AMC users when a client message, missing document, urgent request, or delivery issue needs action.
- Throttle repeated reminders and preserve activity as the durable memory.

## Delivery Doctrine

Ready for delivery:

- Internal AMC work has reached a state where report/document delivery can be prepared.
- Ready for delivery is internal authority plus delivery readiness, not just client-facing copy.
- Client-facing "Ready for delivery" should appear only when it is safe and useful.

Delivered:

- The report/document has been sent, published, or made available to the client/lender.
- Delivered status should include a durable delivery event.
- Delivery should not expose internal final approval, reviewer notes, or vendor packet mechanics.

Document/report access:

- Clients may view/download delivered reports and approved supporting documents where allowed.
- Clients may upload requested documents where enabled.
- Access should be request/account-scoped.
- Document names, categories, and statuses should use client-safe language.

Delivery confirmation later:

- Future confirmation may track delivered, viewed, downloaded, acknowledged, or integration callback received.
- Confirmation should not become billing or compliance authority until explicitly designed.

Revision/addendum later:

- Revision or addendum flows should distinguish client-requested changes, AMC-requested corrections, vendor corrections, and delivered addenda.
- Client-facing copy should use plain language such as "Revision in progress" or "Updated report available."
- Internal review/vendor correction details remain hidden unless intentionally shared.

Post-delivery communication:

- Clients may ask questions, request clarification, or receive follow-up after delivery.
- Post-delivery communication should remain tied to the delivered request/order context.
- Completion should not remove access to allowed delivered documents or communication history.

Who controls delivery:

- Authorized AMC users and future delivery automation controlled by AMC policy.
- Vendors do not directly deliver to clients through the AMC client portal unless explicitly configured later.
- Client users cannot self-mark internal delivery complete.

Vendor visibility after delivery:

- Vendors can see packet history according to packet rules.
- Vendors do not gain client portal document/report access because delivery occurred.
- Vendors cannot see client post-delivery communication unless explicitly included in packet scope.

## Client Portal Dashboard Expectations

Client Portal dashboards should show:

- Submitted requests.
- Requests needing action.
- Status updates.
- Delivered reports/documents.
- Recent communication.
- Billing/invoice information later.
- Account settings where appropriate.

Client Portal dashboards should not show:

- Internal AMC queues.
- Vendor offers, vendor names, or vendor performance by default.
- Reviewer/appraiser internal workflow.
- SLA risk mechanics.
- Staff workload.
- Assignment packet state.
- Permission/module/system terms.

Dashboard language:

- Use request, status, document, report, delivery, action needed, message, and account.
- Avoid workflow, reviewer queue, vendor panel, assignment offer, packet, SLA escalation, internal review, and canonical order.

## AMC-Side Client/Lender Management Expectations

AMC-side client/lender management should eventually support:

- Client organizations.
- Requester users.
- Client contacts.
- Client-specific intake requirements.
- Client-specific required documents.
- SLA/default due rules later.
- Delivery preferences later.
- Communication history.
- Intake defaults.
- Account notes visible only to authorized AMC users.
- Integration mapping later.
- Billing/invoice settings later.

Current:

- Client records and company-scoped client management foundations exist.
- Broad client management has moved toward safe RPC surfaces.
- Client Portal UI is not implemented by this doctrine.

Future:

- Client organization account surfaces.
- Requester/user management.
- Client-safe request and document flows.
- Delivery preference configuration.
- Client communication surfaces.

Deferred:

- Lender integrations.
- Billing enforcement.
- Payment/invoice workflows.
- Advanced client analytics.
- Client-specific automated SLA policy.
- Client self-service onboarding.

## Guardrails

- Do not expose internal AMC queues to clients.
- Do not expose vendor names or vendor performance by default.
- Do not expose reviewer/appraiser internal workflow unless intentionally configured later.
- Do not let client status mutate canonical order lifecycle directly.
- Do not mix client-facing comments with internal notes without explicit visibility.
- Do not build lender integrations yet.
- Do not add billing enforcement yet.
- Do not expose assignment packet details in Client Portal surfaces.
- Do not expose vendor non-response or internal escalation mechanics.
- Do not expose internal queue IDs, permission keys, relationship topology, RLS, RPC names, or canonical order access language.
- Do not turn every internal status change into a client notification.
- Do not make Client Portal feel like a restricted AMC operator dashboard.

## Future Contributor Checklist

Before implementing client/lender intake, Client Portal, delivery, or client communication behavior, verify:

- Client-facing status is a projection, not lifecycle authority.
- Client users open request/status/document surfaces, not AMC internal order operations.
- Internal notes and client-visible messages are separated by explicit visibility.
- Delivery access is request/account-scoped.
- Client users cannot infer vendor state, vendor performance, review workload, or internal SLA escalation.
- Client notifications are meaningful and sparse.
- Imported/integration errors use safe copy.
- Billing and lender integrations remain deferred unless explicitly scoped.
- Vendor packet access and Client Portal access remain separate visibility models.
