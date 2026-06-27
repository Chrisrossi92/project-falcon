# Falcon Page Inventory

## Purpose

This document maintains the canonical inventory of Falcon's primary pages. It defines why each page
exists, who it serves, what information belongs on the surface, what should be progressively
disclosed, and what future intelligence may support the workflow.

This is living architecture. Future UI work should update this inventory when pages are added,
removed, renamed, split, consolidated, or materially redesigned.

Companion documents:

- `docs/architecture/FALCON_INFORMATION_ARCHITECTURE_AND_UX_GUIDE.md` defines the page hierarchy
  and layout philosophy.
- `docs/architecture/FALCON_PRODUCT_PRINCIPLES.md` defines the permanent product philosophy behind
  Falcon's design decisions.
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md` defines motion, transition,
  microinteraction, and animation philosophy.
- `docs/architecture/FALCON_DESIGN_SYSTEM.md` defines Falcon's visual language and reusable design
  categories.

## Inventory Maintenance Rules

- Add a page entry before or alongside implementation of a new primary page.
- Update a page entry when the page's purpose, primary user, smart action, or visibility model
  changes.
- Consult the motion guide when a page introduces new transitions, step flows, drawers, modals,
  collapsible sections, or microinteractions.
- Consult the design system when a page introduces or changes visual hierarchy, card types, button
  hierarchy, badges, tables, drawers, modals, wizards, empty states, icons, or responsive behavior.
- Keep implementation status factual and current.
- Do not use this inventory to approve runtime, schema, permission, deployment, notification, or
  email changes by implication. Those changes still require their own design and governance work.

## Primary Pages

### Dashboard

| Field | Detail |
| --- | --- |
| Purpose | Provide the user's operational starting point. |
| Primary user(s) | Internal operators, appraisers, managers, and permitted operations users. |
| Why the user comes here | To understand what needs attention now and where to go next. |
| Immediately visible information | Priority work, urgent statuses, upcoming deadlines, review needs, and the most relevant primary action. |
| Secondary information | Recent activity, workload summaries, team context, and operational metrics. |
| Hidden / progressive disclosure | Historical trends, lower-priority queues, diagnostics, and detailed analytics. |
| Smart Actions | Open highest-priority work, create order, review due item, continue assigned task. |
| Future Intelligence opportunities | Prioritize work by urgency, risk, role, due date, stalled state, and missing dependencies. |
| Current implementation status | Existing primary operational surface; inventory entry should be refined as dashboard UX evolves. |

### Calendar

| Field | Detail |
| --- | --- |
| Purpose | Show time-bound operational commitments and risk. |
| Primary user(s) | Internal operators, appraisers, managers, and scheduling users. |
| Why the user comes here | To see inspections, review deadlines, client deadlines, and schedule conflicts. |
| Immediately visible information | Today's commitments, upcoming site visits, due-for-review items, due-to-client items, and conflicts. |
| Secondary information | Assignee, client, property, order status, and event source. |
| Hidden / progressive disclosure | Full event history, linked order metadata, notes, and lower-priority calendar categories. |
| Smart Actions | Open order, schedule inspection, resolve conflict, mark scheduling issue. |
| Future Intelligence opportunities | Detect conflicts, suggest inspection windows, flag deadline risk, and recommend rebalancing. |
| Current implementation status | Existing or planned operational calendar surface; keep aligned with roadmap calendar scope. |

### Order Detail

| Field | Detail |
| --- | --- |
| Purpose | Provide the authoritative working view of one order. |
| Primary user(s) | Internal operators, appraisers, reviewers, AMC staff, vendor contacts, and authorized client users depending on product context. |
| Why the user comes here | To understand the order, see what requires attention, and take the next correct action. |
| Immediately visible information | Order identifier, property, client, vendor or appraiser, due dates, status, blockers, and primary smart action. |
| Secondary information | Fees, assignment state, recent activity, documents summary, workspace context, and contact details. |
| Hidden / progressive disclosure | Audit history, long notes, full document previews, version history, raw metadata, and operational diagnostics. |
| Smart Actions | Send to review, offer assignment, submit report, approve revision, request correction, upload package. |
| Future Intelligence opportunities | Detect stalled orders, summarize blockers, recommend next action, surface missing documents, and explain status risk. |
| Current implementation status | Existing critical surface; future redesigns should follow the UX guide's Order Detail principles. |

### Orders List

| Field | Detail |
| --- | --- |
| Purpose | Help users find, filter, compare, and triage orders. |
| Primary user(s) | Internal operators, AMC staff, appraisers, reviewers, managers. |
| Why the user comes here | To locate work, scan pipeline state, and move into the right order. |
| Immediately visible information | Order number, client, property, status, due date, assignee or vendor, and attention indicators. |
| Secondary information | Fee, product type, created date, workflow stage, and last activity. |
| Hidden / progressive disclosure | Advanced filters, saved views, export controls, bulk metadata, and diagnostics. |
| Smart Actions | Open order, create order, apply saved view, continue highest-priority order. |
| Future Intelligence opportunities | Smart filters, priority ranking, stale-order detection, and recommended saved views by role. |
| Current implementation status | Existing or active MVP surface; inventory should track filter and triage changes. |

### Client Portal Dashboard

| Field | Detail |
| --- | --- |
| Purpose | Give clients a clear view of their requests, orders, documents, and required actions. |
| Primary user(s) | Client users and authorized client contacts. |
| Why the user comes here | To see request/order status, provide missing information, and retrieve deliverables. |
| Immediately visible information | Active requests, active orders, required client actions, status, and available deliverables. |
| Secondary information | Recent updates, submitted request history, contact context, and deadline context. |
| Hidden / progressive disclosure | Detailed audit trail, long document lists, internal-only operational details, and unavailable metadata. |
| Smart Actions | Request appraisal, upload document, respond to request, download deliverable. |
| Future Intelligence opportunities | Explain status in client-safe language, highlight missing client inputs, and predict expected next milestone. |
| Current implementation status | Portal surface; keep client-safe visibility and payload rules aligned with governance. |

### Vendor Dashboard

| Field | Detail |
| --- | --- |
| Purpose | Give vendors a focused view of assignments, bids, submissions, and payments-related work. |
| Primary user(s) | Vendor manager/contact and signing appraiser for a vendor company. |
| Why the user comes here | To accept work, manage assignment progress, submit reports, and resolve corrections. |
| Immediately visible information | Offered assignments, active assignments, due dates, correction requests, and next required vendor action. |
| Secondary information | Fees, property summary, client-safe order context, recent vendor-facing updates. |
| Hidden / progressive disclosure | Full document lists, invoice history, vendor credentials, historical assignments, and support details. |
| Smart Actions | Accept assignment, decline assignment, submit report, submit invoice, upload correction. |
| Future Intelligence opportunities | Warn about deadline risk, identify incomplete submissions, summarize correction requests, and suggest next vendor action. |
| Current implementation status | Vendor Workspace surface; changes must preserve vendor isolation and access rules. |

### Vendor Credentials

| Field | Detail |
| --- | --- |
| Purpose | Maintain vendor qualification, licensing, insurance, and compliance information. |
| Primary user(s) | AMC staff, vendor manager/contact, compliance reviewers. |
| Why the user comes here | To verify whether a vendor is qualified, current, and assignable. |
| Immediately visible information | Credential status, license state, expiration warnings, insurance state, and compliance blockers. |
| Secondary information | Credential documents, renewal dates, jurisdiction coverage, and reviewer notes safe for the viewer. |
| Hidden / progressive disclosure | Historical credential versions, audit trail, rejected documents, and internal compliance commentary. |
| Smart Actions | Upload credential, request update, approve credential, mark credential issue. |
| Future Intelligence opportunities | Detect expiring credentials, suggest assignment eligibility, and summarize missing compliance evidence. |
| Current implementation status | Existing or planned credential surface; keep sensitive document visibility role-scoped. |

### Client Request Appraisal

| Field | Detail |
| --- | --- |
| Purpose | Let clients initiate an appraisal request with the minimum necessary friction. |
| Primary user(s) | Client users and authorized client contacts. |
| Why the user comes here | To submit a new appraisal request and provide required order-start information. |
| Immediately visible information | Required request fields, property, borrower or transaction context where applicable, due needs, and submit action. |
| Secondary information | Optional notes, supporting documents, contact preferences, and request guidance. |
| Hidden / progressive disclosure | Advanced requirements, specialized property details, long explanations, and internal intake mapping. |
| Smart Actions | Submit appraisal request, upload engagement package, save draft. |
| Future Intelligence opportunities | Pre-fill known client/property data, detect missing package elements, and route requests by product or complexity. |
| Current implementation status | Client request surface; keep request intake aligned with client-safe language and backend authority. |

### Review Workspace

| Field | Detail |
| --- | --- |
| Purpose | Support focused review of reports, revisions, and quality-control decisions. |
| Primary user(s) | Reviewers, internal operators, appraisers, AMC review staff. |
| Why the user comes here | To determine whether work can move forward or requires correction. |
| Immediately visible information | Review target, current review status, critical findings, due date, and primary review action. |
| Secondary information | Checklist state, reviewer notes, comparable documents, prior revision context. |
| Hidden / progressive disclosure | Full audit history, long document previews, historical comments, and advanced quality diagnostics. |
| Smart Actions | Approve, request revision, assign reviewer, return to vendor/appraiser, send to client. |
| Future Intelligence opportunities | Summarize report issues, compare revisions, flag missing required sections, and explain confidence/risk. |
| Current implementation status | Existing or planned review surface; future work should keep human approval explicit. |

### AMC Dashboard

| Field | Detail |
| --- | --- |
| Purpose | Provide AMC-specific operational command over requests, vendor assignment, orders, and review. |
| Primary user(s) | AMC staff, AMC managers, permitted operations users. |
| Why the user comes here | To see AMC work needing intake, assignment, vendor follow-up, review, or client delivery. |
| Immediately visible information | New requests, unassigned orders, vendor responses needed, late assignments, review queue, and primary next action. |
| Secondary information | Vendor capacity, client mix, service-level indicators, and recent AMC activity. |
| Hidden / progressive disclosure | Detailed performance analytics, diagnostics, full vendor history, and lower-priority queues. |
| Smart Actions | Assign vendor, open request, send to review, follow up with vendor, deliver report. |
| Future Intelligence opportunities | Recommend vendor matches, predict SLA risk, prioritize follow-ups, and summarize queue health. |
| Current implementation status | AMC product surface; must remain compatible with product-separation architecture. |

### Vendor Assignment

| Field | Detail |
| --- | --- |
| Purpose | Help AMC users select, offer, and manage vendor assignment for an order. |
| Primary user(s) | AMC staff and vendor assignment managers. |
| Why the user comes here | To choose a qualified vendor and move the order into execution. |
| Immediately visible information | Order summary, assignment requirements, eligible vendors, fee, due date, and offer action. |
| Secondary information | Vendor credentials, performance indicators, distance or coverage, current workload, and prior client experience. |
| Hidden / progressive disclosure | Detailed vendor history, credential documents, internal notes, and scoring diagnostics. |
| Smart Actions | Offer assignment, reassign vendor, request bid, withdraw offer. |
| Future Intelligence opportunities | Rank vendors by eligibility, risk, workload, geography, performance, and compliance. |
| Current implementation status | AMC workflow surface; future intelligence must remain explainable and human-controlled. |

### Engagement Package

| Field | Detail |
| --- | --- |
| Purpose | Collect, organize, and expose the documents needed to start or complete an order. |
| Primary user(s) | Internal operators, AMC staff, clients, vendors, appraisers, reviewers depending on context. |
| Why the user comes here | To upload, review, confirm, or retrieve order documents. |
| Immediately visible information | Required documents, missing documents, uploaded package status, and primary document action. |
| Secondary information | Document type, uploader, upload date, version, and viewer-safe status. |
| Hidden / progressive disclosure | Full previews, version history, rejected documents, storage diagnostics, and audit events. |
| Smart Actions | Upload package, request missing document, replace document, mark package complete. |
| Future Intelligence opportunities | Classify uploaded documents, detect missing items, summarize package readiness, and warn about unsafe exposure. |
| Current implementation status | Existing or planned document workflow surface; must preserve safe payload and storage-path rules. |

### Settings

| Field | Detail |
| --- | --- |
| Purpose | Let authorized users manage account, company, role, notification, and operational preferences. |
| Primary user(s) | Authorized internal users, managers, admins, and permitted portal users depending on context. |
| Why the user comes here | To adjust configuration that affects users, permissions, notifications, or personal setup. |
| Immediately visible information | Relevant settings categories, current profile/company context, and safe primary settings actions. |
| Secondary information | Preference details, notification choices, role summaries, and integration status. |
| Hidden / progressive disclosure | Advanced admin controls, diagnostics, audit history, and dangerous configuration details. |
| Smart Actions | Save preferences, invite user, update profile, manage notification settings. |
| Future Intelligence opportunities | Recommend missing setup, detect risky configuration, and explain permission effects before changes. |
| Current implementation status | Existing settings surface; permission and environment changes require separate governance. |

### Notifications

| Field | Detail |
| --- | --- |
| Purpose | Surface timely, safe, and actionable updates. |
| Primary user(s) | All authenticated product users, scoped to their role and product context. |
| Why the user comes here | To see what changed, what needs attention, and what action is required. |
| Immediately visible information | New actionable notifications, source object, safe summary, time, and next action. |
| Secondary information | Read state, notification category, related order/client/vendor context, and historical notifications. |
| Hidden / progressive disclosure | Notification preferences, delivery diagnostics, full event history, and internal-only payload details. |
| Smart Actions | Open related work, mark read, resolve required action, adjust notification preference. |
| Future Intelligence opportunities | Group related updates, suppress noise, summarize changes, and prioritize action-required notifications. |
| Current implementation status | Existing or planned notification surface; must preserve safe payload and product-context rules. |

## Future Page Placeholders

Add full inventory entries before implementing or materially redesigning these pages:

- User Management
- Team Roles
- Activity
- Reports
- Billing
- Vendor Directory
- Client Directory
- Product Diagnostics
- Invite Acceptance
- Public Vendor Offer
- Public Client Request Status
