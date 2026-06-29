# Vendor Workspace Premium Experience

## Purpose

This document defines the canonical premium experience architecture for Falcon's Vendor Workspace.
It locks the product philosophy, workflow model, dashboard hierarchy, bid lifecycle language, and
page responsibilities before additional implementation.

This is product architecture guidance only. It does not change runtime behavior, UI
implementation, routes, permissions, schemas, RPCs, workflows, data fetching, tests, navigation,
emails, notifications, Supabase logic, or deployments.

## Companion Documents

- `docs/architecture/FALCON_EXPERIENCE_FRAMEWORK.md` defines the shared cross-workspace experience
  system for shell, loading, state, motion, and portal unification.
- `docs/architecture/FALCON_PORTAL_SHELL_UNIFICATION_AUDIT.md` audits Client Portal and Vendor
  Workspace shell readiness against Falcon's premium operating-system language.
- `docs/architecture/FALCON_DESIGN_SYSTEM.md` defines Falcon's visual language, page hierarchy,
  card hierarchy, and action hierarchy.
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md` defines calm motion,
  microinteraction, and transition expectations.

## 1. Executive Summary

The Vendor Workspace is transitioning from a collection of vendor-facing pages into a cohesive
vendor operating surface.

It should feel like Falcon viewed through a vendor lens, not a separate product. Vendors should
recognize the same premium Falcon shell language, page rhythm, card hierarchy, loading behavior,
state feedback, and calm motion used across Internal Operations, Falcon AMC, and the Client Portal.

The workspace exists to help vendors understand their work pipeline and act on the right item at
the right time. Every dashboard card, page, status, empty state, and notification decision should
support one of four vendor jobs:

1. Acquire work
2. Complete work
3. Get paid
4. Maintain eligibility

Vendor Workspace implementation must remain permission-safe. Experience improvements should never
weaken vendor isolation, expose internal AMC context, alter bid or assignment logic, or change
payment behavior by implication.

## 2. Primary Vendor Question

The primary Vendor Workspace question is:

> Where is my work in the pipeline?

All dashboard and page design should reinforce this question. Vendors should be able to open the
workspace and quickly understand:

- what opportunities are available;
- which bids are waiting for an AMC decision;
- which assignments need action;
- which deadlines or revisions are urgent;
- which work is completed;
- which work is payment-eligible or paid;
- whether their profile, credentials, coverage, or documents need attention.

The workspace should reduce vendor dependence on email. Email may still support important events,
but vendors should not need to search email threads to understand status, deadlines, assignments,
or payment progress.

## 3. Vendor Job Model

The Vendor Workspace is organized around four vendor jobs.

### Acquire Work

Primary intent: decide whether to pursue available work and understand bid outcomes.

Major concepts:

- Available Opportunities
- Submitted Bids
- Bid History
- Bid Under Review
- Awarded opportunities
- Closed or expired opportunities

### Complete Work

Primary intent: manage awarded assignments from acceptance through completion.

Major concepts:

- Current Assignments
- Assignment Detail
- Inspection or appointment scheduling
- Due dates
- Documents needed to complete the assignment
- Report upload
- Submission
- Revision requests
- Resubmission
- Completed assignments

### Get Paid

Primary intent: understand invoice and payment state without needing coordinator follow-up.

Major concepts:

- Payment-eligible assignments
- Invoice submission
- Invoice received
- Invoice rejected or correction needed
- Approved payment
- Scheduled payment
- Paid work

### Maintain Eligibility

Primary intent: keep vendor profile, credentials, coverage, and supporting documents ready for AMC
work.

Major concepts:

- Profile & Credentials
- License
- Insurance
- W-9
- ACH or payment documentation
- Certifications
- Coverage areas
- Product eligibility
- Supporting uploads
- Profile update requests

## 4. Vendor Pipeline

The vendor-facing pipeline should be understandable without internal AMC terminology:

```text
Available Opportunity
↓
Bid Submitted
↓
Bid Under Review
↓
Assignment Awarded
↓
Accepted
↓
Inspection Scheduled
↓
In Progress
↓
Submitted
↓
Revision Requested
↓
Resubmitted
↓
Completed
↓
Paid
```

This pipeline is a product model, not an authorization to change schemas, workflow states, RPCs, or
status logic.

Vendor-facing pages should translate system state into clear pipeline language. Vendors should
understand where the work stands, what they can do next, and what is waiting on Falcon AMC or the
client. They should not need to infer status from email timing, hidden internal statuses, raw ids,
or coordinator messages.

## 5. Bid History Philosophy

Bid history should provide transparency without making the vendor relationship feel adversarial.

Falcon should show vendors what happened to bid opportunities, but it should not create harsh or
unnecessary negative experiences. A vendor can understand that an opportunity is no longer active
without receiving a blunt rejection event or a demoralizing email.

Preferred neutral language:

- `Under Review`
- `Awarded`
- `Closed`
- `Expired`

Avoid vendor-facing bid outcome language such as:

- `Rejected`
- `Denied`
- `Lost`

Avoid email alerts whose primary message is that the vendor was not selected. If future
notification work is approved, bid outcome communication should be useful, neutral, and
relationship-preserving. The workspace can show closed or expired outcomes in context without
turning every non-award into a negative interruption.

## 6. Dashboard Hierarchy

The Vendor Dashboard should not become a wall of equal cards. It should prioritize action and
pipeline clarity.

The dashboard should answer:

> What should I work on right now?

and:

> Where is my work in the pipeline?

### Primary Dashboard Content

Primary content should represent immediate work and urgent pipeline movement:

- Available Opportunities
- Submitted Bids
- Current Assignments
- Due Soon
- Revisions Waiting

### Secondary Dashboard Content

Secondary content should support planning and follow-through without competing with urgent work:

- Recently Completed
- Payments
- Bid History

### Supporting Dashboard Content

Supporting content should reinforce vendor readiness and eligibility:

- Profile & Credentials
- Coverage
- Documents/supporting uploads

Dashboard hierarchy should make the next action obvious. Counts and cards should be arranged by
operational priority, not by database source or implementation convenience.

## 7. Compact Schedule Requirement

The Vendor Dashboard should include a compact schedule or calendar element.

Purpose:

- show upcoming appointments;
- show upcoming due dates;
- provide workload awareness;
- help vendors plan capacity before accepting or bidding on additional work.

The schedule should not dominate the dashboard. It should be smaller than the full Calendar
experience and should support a quick operational read. It should not become a second full calendar
inside the dashboard.

The compact schedule should prioritize vendor-relevant dates:

- bid due dates;
- inspection or appointment times;
- assignment due dates;
- revision due dates where applicable;
- payment or invoice deadlines only if they become workflow-relevant.

## 8. Page Responsibilities

Each major Vendor Workspace surface should have a clear primary question.

| Surface | Primary Question | Responsibility |
| --- | --- | --- |
| Vendor Dashboard | What should I work on right now? | Summarize pipeline health, urgent work, due dates, available opportunities, submitted bids, current assignments, revisions, and payment/profile signals. |
| Available Work | What opportunities can I respond to? | Show vendor-visible opportunities, bid due dates, assignment context, safe documents, and entry points to bid or pass. |
| Submitted Bids | What bids are waiting for a decision? | Show active submitted bids, their status, timing, and safe opportunity context without exposing AMC selection internals. |
| Bid History | What happened to prior opportunities? | Show neutral outcomes such as awarded, closed, or expired, preserving transparency without adversarial language. |
| Current Assignments | What assigned work needs action? | Show accepted, in-progress, due-soon, submitted, and revision-requested assignments with clear next steps. |
| Assignment Detail | What do I need to complete this assignment? | Provide property context, documents, due dates, upload/submission flow, revision flow, and status history for one assigned item. |
| Profile & Credentials | Am I eligible and ready for future work? | Centralize vendor profile, license, insurance, W-9, ACH/payment documentation, certifications, coverage, and update requests. |
| Payments | What work is ready to invoice, under review, scheduled, or paid? | Show payment-eligible assignments, invoice status, corrections, approval, scheduled payment, and paid history. |
| Completed/Historical Assignments | What work have I completed? | Provide a calm record of completed work, submitted reports, payment state, and safe historical context. |

Page responsibilities should remain distinct. A page may link to related work, but it should not
compete with the page that owns the workflow.

## 9. Documents And Credentials Consolidation

`Documents` should not compete as a primary workspace concept unless workflow requires it.

The preferred direction is to move toward:

> Profile & Credentials

This area should contain:

- license;
- insurance;
- W-9;
- ACH/payment documentation;
- certifications;
- coverage;
- supporting uploads.

Assignment-specific documents should remain available in assignment or opportunity context.
Credential and eligibility documents should move toward Profile & Credentials so vendors understand
them as part of readiness, not as a disconnected file cabinet.

This is a product direction only. It does not authorize route changes, navigation changes, storage
changes, document permission changes, upload changes, or profile workflow changes.

## 10. Experience Standards

Vendor Workspace should follow Falcon's shared premium experience language.

Required alignment:

- Shared shell: Vendor Workspace should feel like Falcon with vendor permissions, not a separate
  vendor product.
- Calm loading states: use contextual copy and layout-preserving loading where appropriate.
- Skeletons over spinners: use skeletons for known dashboard, card, list, document, and assignment
  shapes.
- Subtle motion: use motion only to clarify state, orient navigation, or reduce harsh transitions.
- Consistent card hierarchy: primary work, supporting context, and history should not all receive
  equal visual weight.
- Clear empty/error states: explain what happened and what the vendor can do next without exposing
  internal implementation details.
- No redundant clutter: avoid duplicate cards, repeated counts, equal-weight sections, and
  secondary details that compete with immediate work.

Vendor Workspace experience work should reference:

- `docs/architecture/FALCON_EXPERIENCE_FRAMEWORK.md`
- `docs/architecture/FALCON_PORTAL_SHELL_UNIFICATION_AUDIT.md`
- `docs/architecture/FALCON_DESIGN_SYSTEM.md`
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md`

## 11. Non-Goals

This document does not authorize:

- permission changes;
- route changes;
- navigation changes;
- workflow changes;
- new notifications;
- new email behavior;
- schema changes;
- RPC changes;
- data-fetching changes;
- bid award logic changes;
- assignment lifecycle changes;
- payment logic changes;
- storage or document access changes;
- auth/session changes;
- UI implementation changes by itself.

Implementation must happen in future scoped slices. Each future implementation slice must preserve
vendor isolation, existing route guards, existing workflow semantics, and Falcon's RPC-first
governance model unless a separate approved design explicitly changes those boundaries.
