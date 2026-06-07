# AMC Full MVP Smoke Test Plan

## Purpose

This plan defines the repeatable end-to-end smoke test for the Falcon AMC MVP after AMC-9 through
AMC-12. It validates the full AMC operating loop before any external payment, email, accounting, or
banking integration is added.

Run this plan in local/staging with disposable AMC smoke data only. Do not use real customer,
vendor, borrower, lender, payment, bank, or tax data.

## Scope

Covered:

- AMC order creation and workspace separation.
- Candidate matching and bid request workflow.
- Authenticated Vendor Workspace bidding.
- Assignment offer, acceptance, assigned-order execution, report upload, revision, and resubmission.
- Vendor profile update request and internal review.
- Vendor invoice submission, internal invoice review, corrected invoice resubmission, scheduling,
  and mark-paid ledger tracking.
- Document access checks for vendor-visible documents.
- Guardrail checks for route isolation, raw-id/storage-path leakage, wrong-vendor denial, and
  Internal-vs-AMC separation.

Not covered:

- External payment processor, ACH, bank, card, or check issuing.
- Real email send.
- Accounting export.
- Production data migration.
- Client portal workflows.

## Required Personas

Use dedicated smoke users with clearly labeled test email addresses.

| Persona | Workspace | Required Capabilities |
| --- | --- | --- |
| AMC Owner/Admin | AMC Operations | Order create/read, candidate/bid workflow, assignment offer, vendor management, invoice review, billing update, document access |
| Vendor Admin | Vendor Workspace | Vendor workspace view, bid response, assignment read/progress, document read/upload, profile read/update request, payment read, invoice submit |
| Wrong Vendor Admin | Vendor Workspace | Same vendor permissions but different vendor company |
| Internal Operations User | Internal Operations | Normal Internal workspace access without AMC vendor workspace data |

## Recommended Demo Data Matrix

| Fixture | Purpose | Required State |
| --- | --- | --- |
| `AMC-SMOKE-HAPPY-001` | Full happy path | AMC-scoped order, commercial report type, known market/county, no existing assignment |
| `AMC-SMOKE-EXPIRED-001` | Expired bid edge case | AMC-scoped order with expired bid request/recipient |
| `AMC-SMOKE-DECLINED-001` | Passed opportunity edge case | AMC-scoped order with vendor recipient declined |
| `AMC-SMOKE-INVOICE-REJECT-001` | Rejected/corrected invoice loop | Completed vendor assignment with rejected invoice |
| `AMC-SMOKE-WRONG-VENDOR-001` | Tenant denial | Work/assignment belonging to a different vendor company |
| `INT-SMOKE-SEPARATION-001` | Workspace separation | Internal-scoped order that must not appear in AMC/Vendor work queues |

Minimum supporting records:

- One active AMC owner company.
- Two active AMC vendor companies with active `amc_vendor` relationships.
- Active vendor profiles with coverage matching `AMC-SMOKE-HAPPY-001`.
- Vendor contacts for manual outreach if email-copy behavior is tested.
- At least one vendor-visible order document and one internal-only document.
- At least one approved invoice row for scheduling smoke and one scheduled payment row for mark-paid
  smoke, unless those states are created during the happy path.

## Happy Path Checklist

Use one clean AMC-scoped order and one vendor company for the full path.

1. AMC Order Creation
   - Create or load an AMC-scoped order.
   - Confirm it appears in AMC Operations order/dashboard views.
   - Confirm it does not appear in Internal Operations order/dashboard views.
   - Evidence: order number, operations scope, screenshot or test note.

2. Candidate Matching
   - Open AMC order detail.
   - Confirm candidate panel loads matching vendors.
   - Confirm candidate display does not expose candidate scores, raw relationship ids, or internal
     notes.
   - Evidence: candidate vendor names and eligibility summary.

3. Bid Request
   - Select eligible vendor candidates.
   - Create a bid request.
   - Confirm Bid Requests history shows contacted vendors and no assignment packet exists yet.
   - Evidence: request status and recipient count.

4. Vendor Bid
   - Log in as Vendor Admin.
   - Open `/vendor-workspace/available-work`.
   - Open Work Detail by `workKey`.
   - Submit bid with fee, turn time, proposed due date, and comments.
   - Confirm Vendor Workspace shows submitted/read-only state and suppresses decline.
   - Evidence: submitted bid summary.

5. Bid Selection
   - Return as AMC Owner/Admin.
   - Confirm the bid appears in Bid Requests history.
   - Select the bid.
   - Confirm selection does not create an assignment yet.
   - Evidence: selected bid state.

6. Assignment Offer
   - Create assignment offer from selected bid.
   - Confirm Company Assignments panel shows vendor assignment offer.
   - Confirm selected bid context is preserved.
   - Evidence: assignment offer row.

7. Vendor Acceptance
   - Use public offer token or authenticated path if available for this fixture.
   - Vendor accepts the assignment.
   - Confirm assignment moves to accepted and appears in `/vendor-workspace/assigned-orders`.
   - Evidence: accepted assignment status.

8. Start Work
   - Vendor opens Assigned Order Detail.
   - Click Start Work.
   - Confirm status refreshes to In Progress and action is suppressed afterward.
   - Evidence: in-progress status and activity/notification if visible.

9. Document Access
   - Vendor opens a vendor-visible document from Assigned Order Detail.
   - Confirm signed URL opens/downloads.
   - Confirm storage bucket/path is not visible in UI or API payload.
   - Confirm internal-only document is absent or unavailable.
   - Evidence: document filename and no storage path leakage.

10. Report Upload / Submission
    - Vendor uploads a PDF report.
    - Submit report with delivery note.
    - Confirm status becomes Submitted / Awaiting Review.
    - Confirm uploaded report metadata appears safely.
    - Evidence: submitted report summary and document count.

11. Coordinator Review
    - AMC Owner/Admin opens the assignment/order review surface.
    - Confirm submitted report metadata is visible.
    - Add internal-only coordinator note if relevant.
    - Confirm Vendor Workspace cannot see internal note.
    - Evidence: review surface state.

12. Revision Request
    - Coordinator requests revision with vendor-facing instructions and optional due date.
    - Confirm assignment moves to Revision Requested.
    - Confirm vendor sees only safe revision instructions.
    - Evidence: revision requested status and vendor-facing instructions.

13. Resubmission
    - Vendor uploads corrected/supplemental report.
    - Resubmit report with response note.
    - Confirm status returns to Submitted / Awaiting Review or Resubmitted / Awaiting Review.
    - Evidence: resubmitted report summary.

14. Invoice Submission
    - Complete/close assignment to payment-eligible state if needed.
    - Vendor opens `/vendor-workspace/payments`.
    - Submit invoice PDF, invoice number, amount, date, and vendor note.
    - Confirm status becomes Invoice Received.
    - Evidence: invoice summary and document count.

15. Invoice Approval
    - AMC Owner/Admin opens Vendor Invoice Review.
    - Open invoice document through internal document access.
    - Approve invoice with approved amount and optional internal note.
    - Confirm Vendor Payments shows Approved and no internal reviewer note.
    - Evidence: approved invoice status.

16. Payment Scheduling
    - Open Vendor Payment Ledger.
    - Schedule the approved invoice with date, method label, safe reference, internal note, and
      vendor-facing note.
    - Confirm Vendor Payments shows Scheduled, date, method/reference label, and vendor-facing note.
    - Evidence: scheduled payment row.

17. Mark Paid
    - Mark scheduled payment paid with paid date and reference.
    - Confirm Vendor Payments shows Paid, payment date, safe method/reference, and no internal note.
    - Evidence: paid payment row.

## Failure And Edge Case Checklist

Run these after the happy path or with prebuilt fixtures.

| Case | Steps | Expected Result |
| --- | --- | --- |
| Expired bid | Open expired opportunity as vendor | Detail shows expired/unavailable state; submit/decline actions are suppressed |
| Declined bid | Decline an available opportunity | Existing recipient lifecycle stores declined/pass state; submit bid is blocked afterward |
| Rejected invoice | Reject submitted invoice with vendor-facing message | Vendor sees Rejected status, message, prior invoice summary, and corrected invoice path |
| Corrected invoice | Vendor submits corrected invoice after rejection | Prior invoice history preserved; status returns to Invoice Received; internal queue sees corrected invoice |
| Wrong vendor access | Log in as wrong vendor and open another vendor `workKey` / `assignmentWorkKey` | Unavailable/denied state; no raw ids or internal details |
| Internal vs AMC separation | Switch Internal/AMC workspaces and inspect order/dashboard queues | Internal orders stay Internal; AMC orders stay AMC; workspace switch resets to dashboard |
| Vendor `/orders` isolation | Attempt `/orders` and shared internal routes as Vendor Workspace user | Vendor cannot access shared internal order workspace |
| Raw id leak check | Inspect Vendor Workspace pages and network payloads for ids/storage paths | No raw order ids, assignment ids, relationship ids, profile ids, recipient ids, document ids, storage bucket/path values |
| Internal note leak check | Add internal review/payment/coordinator notes | Vendor views and notifications do not show internal-only notes |
| Document visibility | Try vendor-visible and internal-only documents | Vendor-visible opens through signed URL; internal-only remains hidden/unavailable |

## Manual QA Evidence Template

Copy this block for each smoke run.

```text
Smoke run:
Environment:
Date/time:
Build/ref:
AMC owner user:
Vendor user:
Wrong vendor user:
Happy path fixture:
Edge fixture(s):

Happy path result:
- AMC order creation:
- Candidate matching:
- Bid request:
- Vendor bid:
- Bid selection:
- Assignment offer:
- Vendor acceptance:
- Start work:
- Document access:
- Report upload/submission:
- Coordinator review:
- Revision request:
- Resubmission:
- Invoice submission:
- Invoice approval:
- Payment scheduling:
- Mark paid:

Failure/edge result:
- Expired bid:
- Declined bid:
- Rejected/corrected invoice:
- Wrong vendor denial:
- Internal vs AMC separation:
- Vendor /orders isolation:
- Raw id/storage path leakage:
- Internal note leakage:
- Document visibility:

Defects found:
Follow-up tasks:
Decision:
```

## Automated Validation To Run With Manual Smoke

Run before manual QA:

```bash
npm test -- \
  src/lib/routes/__tests__/routeCompositionDiagnostics.test.js \
  src/features/vendorWorkspace/__tests__/VendorWorkspaceShell.test.jsx \
  src/features/vendorWorkspace/__tests__/vendorWorkspaceApi.test.js \
  src/features/vendors/__tests__/VendorDirectoryPage.test.jsx \
  src/features/vendors/__tests__/vendorApi.test.js \
  src/lib/permissions/__tests__/vendorWorkspacePaymentsRpcMigration.test.js \
  src/lib/permissions/__tests__/amcVendorPaymentLedgerRpcMigration.test.js \
  src/lib/permissions/__tests__/amcVendorInvoiceReviewQueueRpcMigration.test.js
npm run lint
npm run build
git diff --check
```

Add SQL/RPC targeted tests for any future defect found during manual execution before closing that
defect.

## Pass / Fail Criteria

Pass requires:

- Happy path reaches Paid without external payment integration.
- Vendor Workspace never exposes shared `/orders`, raw ids, storage paths, client fee, AMC margin,
  candidate scores, competing bids, or internal notes.
- Wrong vendor cannot open another vendor opportunity, assignment, document, invoice, or payment
  context.
- Internal and AMC workspace order/dashboard queues remain separated by `operations_scope`.
- Rejected/corrected invoice loop preserves prior invoice history and returns corrected invoice to
  internal review.
- Manual QA evidence is recorded with build/ref, personas, fixtures, and defects/follow-ups.

Fail if any data-isolation, raw-id/storage-path leakage, wrong-vendor access, internal-note leakage,
or Internal/AMC workspace separation issue appears.
