# AMC Assignment Lifecycle Doctrine

## Purpose

This document defines the complete post-award lifecycle for AMC vendor assignments after a selected
bid has been converted into a vendor assignment packet.

AMC-7 validated procurement through assignment packet creation and contextual packet access. AMC-8A
and AMC-8B are now validated for public assignment-offer acceptance and public work status
tracking. Later AMC-8 slices expand what happens after award: richer report upload, revision
handling, and automation.

This is doctrine documentation only. It does not implement runtime code, routes, permissions,
schema/RLS changes, Supabase migrations, backend RPC changes, email behavior, notifications,
automation, report upload behavior, or production data changes.

## Lifecycle Boundary

AMC assignment lifecycle begins when a selected bid is converted into a `vendor_appraisal`
assignment packet. It should reuse Falcon's shared assignment packet infrastructure rather than
creating a parallel vendor-only assignment system.

The lifecycle should preserve selected bid context, assignment terms, due dates, coordinator
instructions, vendor comments, uploaded documents, revision events, and audit history.

It should not mutate internal staff appraiser assignment columns or expose internal AMC data to
vendors.

## Validated MVP Status

Validation order: `AMC-DEMO-003`.

Validated milestones:

- AMC-7 Vendor Self-Service Bidding: COMPLETE & VALIDATED.
- AMC-8A Assignment Offer Acceptance MVP: COMPLETE & VALIDATED.
- AMC-8B Vendor Work Tracking MVP: COMPLETE & VALIDATED.

Validated public routes:

- `/vendor/bid-invitations/:token`.
- `/vendor/assignment-offers/:token`.
- `/vendor/assignment-work/:token`.

Validated execution loop:

1. Coordinator selected vendor bid.
2. Coordinator created assignment offer.
3. Coordinator generated assignment offer link.
4. Vendor opened public assignment offer page.
5. Vendor accepted assignment.
6. Assignment activity logged acceptance.
7. Coordinator generated work link.
8. Vendor opened public work page.
9. Vendor clicked Start Work.
10. Assignment moved to `in_progress`.
11. Vendor clicked Submit Report.
12. Assignment moved to `submitted`.
13. Submission note persisted.
14. Assignment activity logged Offered, Accepted, Started, and Submitted.
15. Coordinator notifications fired for acceptance and submission.

Resolved validation notes:

- Assignment invitation action was hidden because an owner packet exposed `id` instead of
  `assignment_id`.
- Production database was missing the assignment invitation create RPC migration.
- Generated vendor links initially used relative paths instead of absolute public URLs.

## Token Doctrine

Offer tokens and work tokens are separate.

- Offer token: public accept/decline only.
- Work token: post-accept work status actions only.

The MVP does not require vendor login. Tokenized public work tracking should not mutate the main
order lifecycle, create internal staff assignment writes, or become an authenticated Vendor
Workbench substitute.

## Assignment States

Validated MVP canonical states:

- Offered.
- Accepted.
- Declined.
- In Progress.
- Submitted.
- Completed.
- Cancelled.
- Revoked.

Future workflow overlays or labels may include:

- Inspection Complete.
- Report In Progress.
- Revision Requested.
- Resubmitted.

Do not add appraisal-specific states such as `inspection_complete` or `report_in_progress` to
canonical assignment status yet. State labels may be translated for vendor-facing or client-facing
surfaces, but the underlying lifecycle should stay auditable and consistent.

## Vendor Action Model

### Offered

Vendor actions:

- Accept.
- Decline.

### Accepted

Vendor actions:

- Start Work.

### In Progress

Vendor actions:

- Mark Inspection Complete.
- Upload Report.

### Submitted

Vendor state:

- Await Review.

No vendor mutation is required while AMC/internal review is pending.

### Revision Requested

Vendor actions:

- Upload Revised Report.
- Resubmit.

## AMC Coordinator Action Model

### Offered

Coordinator actions:

- Revoke.

### Accepted

Coordinator action:

- Monitor.

### Submitted

Coordinator action:

- Forward to Review.

### Revision Requested

Coordinator action:

- Send Back to Vendor.

### Completed

Coordinator action:

- Close Lifecycle.

## Vendor Workbench Queues

The authenticated Vendor Workbench should organize post-award assignments around decision-first
queues:

- Assignment Offers.
- Active Assignments.
- Awaiting Revision.
- Completed Work.

These queues should lead vendors to the next required action rather than exposing an internal
assignment-management table.

## Decision-First Assignment UX

Assignment surfaces should follow `docs/FALCON_DECISION_FIRST_UX_DOCTRINE.md`.

Default assignment cards should show:

- Vendor.
- Status.
- Due Date.
- Next Action.

Details should be hidden behind expansion, drawers, details panels, or contextual actions unless
they are required for the next action.

Reference detail includes:

- selected bid snapshot;
- assignment terms;
- coordinator instructions;
- vendor comments;
- report/document history;
- contacts;
- audit trail.

## Client Visibility

Client-facing assignment progress should be simplified and should not expose internal AMC workflow
detail.

Future client-facing labels:

- Assignment Accepted.
- Inspection Scheduled.
- In Review.
- Delivered.

Clients should not see vendor negotiation detail, other vendor bids, internal assignment packet
events, internal reviewer notes, AMC margin, or internal procurement commentary.

## Report Submission Doctrine

Vendor report submission should occur through the assignment packet workflow.

Vendor submits:

- Report.
- Optional photos.
- Optional workfile.

No email attachments should be required for report delivery. Email may notify users that a report
was submitted, but the canonical report/document record should live in Falcon.

## Revision Doctrine

Revision requests should become structured workflow events.

A revision event should preserve:

- requester;
- requested timestamp;
- requested changes;
- due date where applicable;
- vendor response/resubmission timestamp;
- related report/document versions;
- final completion outcome.

Revision handling should not erase the original submitted report or previous submission history.

## Future Automation

Automation should support the assignment lifecycle after the human workflow is reliable.

Future automation examples:

- reminder emails;
- overdue nudges;
- inspection reminders;
- report due reminders.

Automation must remain explainable, auditable, and overrideable by authorized AMC coordinators.

## Implementation Phases

### AMC-8A: Accept / Decline

Complete and validated. Public assignment offer links allow vendors to accept or decline offered
assignment packets without a Falcon account.

### AMC-8B: Work Status Tracking

Complete and validated for the MVP coarse lifecycle. Public work links allow vendors to start work
and submit report status, moving assignments from `accepted` to `in_progress` to `submitted`.
Inspection Complete and Report In Progress remain future overlays, not canonical statuses.

### AMC-8C: Report Submission

Future scope. Add report upload/submission workflow for report, optional photos, and optional
workfile.

### AMC-8D: Revision Workflow

Add structured revision requests, revised report upload, and resubmission behavior.

### AMC-8E: Lifecycle Automation

Add reminder, overdue, inspection, and report-due automation only after manual lifecycle behavior is
validated.

## Non-Goals

AMC-8 doctrine does not introduce:

- authenticated Vendor Workbench runtime;
- client portal runtime;
- email sending;
- notification automation;
- invoice/payment workflow;
- internal staff assignment lifecycle changes;
- new `/amc/*` routes;
- duplicate assignment packet tables;
- backend lifecycle changes without a separate implementation plan.
