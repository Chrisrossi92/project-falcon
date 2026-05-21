# Falcon Client Portal Operational Blueprint

## Purpose

This document defines the canonical Client Portal operational blueprint for lenders, direct clients, and requester organizations participating in Continental AMC and future Falcon ecosystems.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, workflow statuses, permission seeds, database migrations, billing logic, onboarding enforcement, company settings, client portal UI, tenant/module/package runtime behavior, or document delivery behavior.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_ARCHITECTURE.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_AMC_CLIENT_LENDER_DOCTRINE.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`

## Core Doctrine

- Client Portal is a request, status, document, report, and communication workspace.
- Client Portal must feel like a complete client-facing experience, not restricted Staff Appraisal Mode or restricted AMC Operations Mode.
- Client access is request-scoped and account-scoped. It is not internal workflow, vendor, queue, review, or assignment packet visibility.
- Client-facing status is a projection layer. It is not canonical order lifecycle authority and does not mutate internal workflow directly.
- Clients and lenders should see what they requested, what needs their action, what has changed, and what documents or reports are available.
- Clients and lenders should not see internal AMC queues, vendor packet lifecycle, assignment mechanics, reviewer/appraiser workflow, private notes, internal escalation, staff workload, or relationship topology.
- Client-visible communication must be separate from internal AMC notes and vendor packet messages.
- Report and document access must be scoped to the request, account, or delivery policy that intentionally exposes it.

## Client Portal Purpose

Client Portal answers:

- How do I submit a request?
- Was the request received and acknowledged?
- What is the current client-facing status?
- What does my team need to provide?
- Which documents or reports are available?
- What has operations communicated to us?
- Which completed requests can we reference later?

Client Portal does not answer:

- Which vendor received, declined, accepted, or completed an assignment.
- Which appraiser, reviewer, coordinator, or internal role owns the next step unless intentionally exposed as support context.
- Which internal AMC queue contains the order.
- Whether an internal SLA or escalation threshold has been triggered.
- What internal notes, review comments, QC findings, vendor performance, or staff workload signals exist.
- Whether hidden records exist outside the client's account/request scope.

## Client Operational Lifecycle

### Submit request

The client creates a request with property/request details, requester context, product/report needs, due expectations, instructions, and documents where supported.

Client-visible meaning:

- The request has been submitted or saved depending on completion state.

Internal meaning:

- AMC intake can triage the request, validate completeness, and move it into internal intake queues.

Visibility boundary:

- The client sees the submitted request and safe intake confirmation. The client does not see internal intake defects, routing candidates, or staff assignment.

### Request received

Falcon confirms that the request reached operations.

Client-visible meaning:

- The request was received.

Internal meaning:

- AMC operations has a new intake item or imported/client-submitted request to review.

Visibility boundary:

- Receipt confirmation should not expose internal queue IDs, import diagnostics, validation internals, or SLA assumptions.

### Request acknowledged

Operations confirms the request is understood or actively being reviewed.

Client-visible meaning:

- Operations has acknowledged the request and is reviewing details.

Internal meaning:

- AMC intake has begun triage, clarified requirements, or accepted the request into operations.

Visibility boundary:

- Acknowledgement does not reveal coordinator workload, reviewer availability, vendor routing, or escalation state.

### Assignment / in-progress visibility

The client may see that work is assigned, scheduled, or in progress through safe status language.

Client-visible meaning:

- Work is underway.

Internal meaning:

- The order may be assigned internally, offered to a vendor, accepted by a vendor, in production, in review, or otherwise moving through AMC operations.

Visibility boundary:

- Client status should not expose assignment packet states, vendor identity/performance by default, vendor non-response, internal reviewer state, or AMC queue names.

### Status updates

Clients receive meaningful progress changes in plain language.

Client-visible meaning:

- The request moved to a client-safe milestone or needs attention.

Internal meaning:

- Internal order, assignment, review, delivery, document, or communication state changed enough to warrant a client-facing update.

Visibility boundary:

- Status updates should be sparse and useful. They should not mirror every internal workflow transition.

### Revision / additional information requests later

Operations may ask the client for missing documents, clarification, corrections, or additional context.

Client-visible meaning:

- Action is needed from the client.

Internal meaning:

- AMC operations needs client input to continue, confirm, revise, or deliver work.

Visibility boundary:

- The request should describe the needed client action without exposing internal review notes, vendor messages, or escalation mechanics.

### Delivery

Reports or documents become available according to delivery policy.

Client-visible meaning:

- A report or document is available for review/download, or delivery has been completed.

Internal meaning:

- AMC delivery authority has released the document/report through the approved channel.

Visibility boundary:

- Delivery does not expose internal approval history, review comments, staff handoffs, or vendor deliverables that are not client-facing.

### Completed access

The request remains available after completion according to retention, account scope, and delivery rules.

Client-visible meaning:

- The completed request, final client-visible status, messages, and available documents can be referenced later.

Internal meaning:

- The internal order may remain archived, closed, reopened internally, or retained for compliance.

Visibility boundary:

- Completed access is historical request access, not full internal order access.

### Historical requests later

Future portal surfaces may support searchable prior requests, documents, reports, and communication history.

Client-visible meaning:

- The client can find past request outcomes and documents where allowed.

Internal meaning:

- Historical access follows request/account scope and retention policy.

Visibility boundary:

- Historical access must not widen to unrelated clients, internal queues, vendor records, or staff operations.

## Client-Facing Visibility Doctrine

Clients can see:

- Requests they submitted or are allowed to view through their client organization/account.
- Client-facing status labels and milestone timestamps where useful.
- Action-needed items that require client input.
- Client-visible messages, updates, and communication history.
- Documents and reports explicitly shared with the client.
- Delivery and completion state.
- Historical request records where retention/account policy allows.

Clients cannot see:

- Internal AMC order dashboard, queues, SLA queues, escalation queues, or review queues.
- Vendor assignment offers, packet lifecycle, packet activity, vendor messages, vendor scorecards, or vendor performance.
- Appraiser/reviewer/staff workflow, internal ownership, workload, private notes, QC findings, or internal review comments.
- Other client organizations, unrelated requesters, hidden requests, internal clients CRM, or relationship topology.
- Permission names, security language, backend object names, internal IDs, or package/module mechanics.

Request visibility:

- Request access is scoped by client organization/account, requester rules, and explicit portal visibility.
- Request access does not imply access to the canonical owner order or internal order detail.

Status visibility:

- Client-facing status should be translated from internal operational state into plain-language milestones.
- Status labels should emphasize progress, action needed, delivery, completion, or hold/cancelled state.
- Client-facing status should not expose canonical transition keys, internal queue IDs, or assignment packet state.

Document/report visibility:

- Packet attachments, internal review materials, vendor deliverables, and client documents are different visibility classes.
- Clients see only documents/reports deliberately shared through request/account delivery rules.
- Internal review materials and vendor working files are hidden by default.

Communication visibility:

- Client messages and client-visible updates are deliberate communication records.
- Vendor packet messages and internal AMC notes are hidden unless intentionally converted into a client-safe update.
- A reply from a client should route to the appropriate request/account communication surface, not to vendor packet threads.

Activity visibility:

- Client-visible activity is a safe projection of request events, communication, document availability, and delivery.
- Canonical order activity is not reused directly for clients.
- Internal audit/security events, queue membership, assignment activity, and review activity stay internal unless productized as client-safe summaries.

Escalation visibility:

- Internal escalation exists to manage AMC operations.
- Clients may see client-safe delay, action-needed, or support-contact updates when appropriate.
- Clients should not see internal escalation labels, SLA risk severity, queue thresholds, staff accountability, or vendor non-response mechanics.

## Client Dashboard Blueprint

Dashboard name:

- Client Order Status Dashboard.

Primary daily question:

- What requests need my attention, what is their status, and what reports or documents are available?

Primary sections:

- Active Requests.
- Waiting on Me.
- Recent Updates.
- Delivered Reports / Documents.
- Communication History.

Secondary sections:

- Submit Request shortcut.
- Completed Requests.
- Saved drafts or reusable request templates later.
- Billing / Invoices later.
- Portfolio analytics later.

Assignment and queue boundaries:

- No internal AMC queues.
- No vendor packet queues.
- No reviewer/appraiser workload.
- No SLA escalation queues.
- No owner-company operational dashboard widgets.

## Client Navigation Blueprint

Default navigation lanes:

- Dashboard.
- Submit Request.
- My Requests.
- Status Updates.
- Documents / Reports.
- Messages / Updates.
- Organization Users later.
- Billing later.
- Settings.

What must stay hidden:

- AMC Dashboard, Orders / Intake, Assignments, Vendor Panel, Reviews / QC, Calendar / SLA, and internal analytics.
- Staff Appraisal Orders, Clients CRM, Team Access, appraiser/reviewer queues, review workflow, and internal calendar.
- Vendor Portal My Assignments, assignment packets, vendor profile/readiness, vendor messages, and completed packet history.
- Relationship management and relationship topology.
- Permission, package, module, or security administration concepts.

## Client Language Doctrine

Preferred language:

- Request.
- Order status.
- Report.
- Document.
- Delivery.
- Action needed.
- Submitted.
- Received.
- Acknowledged.
- In progress.
- Update.
- Message.
- Completed.

Use request language for:

- Intake, submission, saved drafts, account-visible records, and historical records.

Use status language for:

- Received, acknowledged, in progress, waiting on you, report ready, delivered, completed, cancelled, or on hold.

Use delivery/document language for:

- Report available, document requested, document uploaded, delivery complete, and documents shared.

Use communication language for:

- Message from operations, update, clarification requested, action needed, and reply.

Avoid:

- Internal workflow, lifecycle, transition, queue, SLA escalation, QC queue, reviewer queue, appraiser queue, assignment packet, vendor offer, vendor accepted, vendor declined, canonical order, permission, RLS, RPC, module, entitlement, relationship topology, or package terms.

## Client Communication Doctrine

Client-visible updates:

- Confirm request receipt, acknowledgement, meaningful status changes, action-needed items, document/report availability, delivery, and completion.
- Should be plain-language and tied to the request or account.

Request clarification messages:

- Ask for missing documents, corrected details, contact clarification, scheduling information, or other client-owned inputs.
- Should tell the client what to do next without exposing internal blockers.

Delivery updates:

- Announce report/document availability, delivery completion, or post-delivery follow-up where allowed.
- Should route to Documents / Reports or the relevant request.

Internal note separation:

- Internal AMC notes are hidden.
- Internal notes should never become client-visible accidentally.
- When internal context must be shared, it should be rewritten or converted into an intentional client-visible update.

Vendor message separation:

- Vendor packet messages are hidden from clients by default.
- Vendor comments should not be passed through raw to clients.
- Client updates derived from vendor work should be safe summaries created by authorized AMC operations.

Notification expectations:

- Notify clients for request received, action needed, document requested, meaningful status update, report delivered, and direct message.
- Do not notify clients for every internal workflow transition, queue change, vendor packet state, review action, or escalation threshold.
- Notifications should deep-link to client-safe request, status, document/report, or message surfaces.

Status-update expectations:

- Status updates should be useful enough to reduce client uncertainty.
- Status updates should not become noisy progress telemetry.
- Status should use safe broader labels when internal state is complex or ambiguous.

## Client Portal Upgrade Doctrine

Upgrade copy should be contextual and respectful:

- "Connect lender systems for automated request submission."
- "Use reporting to monitor portfolio activity."
- "Add billing views for invoice and payment tracking."
- "Add organization controls for multi-office requester teams."

Upgrade copy should not say:

- "Unlock hidden AMC tools."
- "You are missing Staff features."
- "Upgrade to see internal workflow."
- "Permission denied."

Possible future upgrade paths:

- Lender integration upgrades for automated intake and delivery.
- Analytics/reporting upgrades for portfolio visibility.
- Billing/reporting upgrades for invoices, payments, and account summaries.
- Multi-office client organization controls.
- AI summaries or status explanations after projection rules are stable.

Upgrade prompts should not appear:

- During urgent action-needed or document-upload flows.
- On error states caused by visibility scope.
- In navigation as disabled internal modules.
- Where the prompt would reveal internal AMC/vendor functionality.

## Client Visibility Doctrine

- Client access is request scoped.
- Client access is not internal workflow access.
- Client access is not vendor visibility.
- Client access is not queue visibility.
- Client access does not expose assignment packet lifecycle.
- Client-facing status is a projection layer.
- Client organization membership does not expose unrelated clients, orders, vendors, queues, documents, reports, or activity.
- Completed request history is separate from full company operations.

## Guardrails

- No internal AMC queues.
- No vendor packet visibility.
- No reviewer/appraiser workflow leakage.
- No assignment lifecycle exposure.
- No permission/security terminology in UI.
- No hidden-module clutter.
- No internal escalation visibility.
- No operational dashboard reuse from Staff Appraisal or AMC Operations.
- No generic Staff order table reuse.
- No client/lender access from relationship state alone.
- No raw canonical order activity reuse for client timelines.
- No raw vendor comments, review notes, or internal notes in client communication.

## Deferred Future Systems

The following systems are intentionally deferred:

- Lender integrations.
- Billing/invoices.
- Automated delivery confirmation.
- Borrower-facing workflows later.
- Analytics/reporting.
- Multi-office client organizations.
- Approval workflows.
- AI summaries/status explanations.
- Saved request templates.
- Client-specific delivery preferences.
- Client organization user administration.

## Future Contributor Checklist

Before implementing Client Portal surfaces, verify:

- The surface answers a client request/status/document/message job.
- The surface does not reuse Staff, AMC, Vendor, queue, review, or assignment packet language.
- Client-visible status is a projection and cannot mutate canonical order lifecycle directly.
- Documents/reports are explicitly shared through request/account delivery rules.
- Activity is client-safe and not raw canonical order activity.
- Notifications route to client-safe surfaces only.
- Empty states and upgrade prompts are contextual, sparse, and non-leaky.
- Relationship state, client organization membership, and historical access do not widen operational visibility beyond explicit request/account scope.
