# Vendor Workbench Doctrine

## Purpose

This document defines the future Vendor Workspace / Vendor Workbench before authenticated vendor
runtime implementation.

The Vendor Workspace is a peer workspace in Falcon. It is not an AMC subpage, not a public bid form,
and not a thin wrapper around internal Order Detail. AMC Operations manages procurement. Vendor
Workbench lets external vendors understand available work, submitted bids, won assignments, required
tasks, documents, and payment status inside a vendor-native operational world.

AMC-7 Vendor Self-Service Bidding, AMC-8A Assignment Offer Acceptance MVP, and AMC-8B Vendor Work
Tracking MVP validated the no-login token workflow. That proved the execution engine works, but the
intended product is not manual copy/paste links. The real product direction is authenticated vendor
login, vendor dashboard, automated email delivery, bid management, assigned order management,
document exchange, submission workflow, and future invoicing/payment visibility.

This document is doctrine/planning only. It does not add runtime routes, permissions, backend
changes, schema/RLS changes, token models, email behavior, vendor accounts, payment behavior,
notifications, or UI.

## 2026-06 Vendor Account Pivot

Authoritative decision: [ADR: Falcon AMC Separate Product Context](../architecture/ADR_AMC_SEPARATE_PRODUCT_CONTEXT.md).

Vendor Workspace remains vendor-company scoped, but Falcon AMC should not manage many individual
appraiser logins under one vendor company for MVP. Each vendor company should have one primary
Falcon-facing vendor manager/contact, usually the main licensed signing appraiser. That person
accepts assignments, receives notifications, submits reports and invoices, and remains accountable
for signing.

Other vendor-side assistants or staff may help prepare reports inside the vendor firm, but Falcon
AMC does not need to track those assistants as app users unless a later approved product slice
introduces a specific workflow. Existing authenticated Vendor Workspace bootstrap and tokenized
workflows remain compatibility behavior until a later slice migrates them intentionally.

## Core Principle

The vendor does not care about Falcon internals.

The vendor cares about:

1. Getting work.
2. Managing work.
3. Submitting work.
4. Getting paid.

Every Vendor Workspace screen should support one of those four goals. Screens, labels, and actions
should be role-native and should not require vendors to understand AMC coordinator workflows,
candidate scoring, bid-recipient rows, assignment packet internals, or internal order lifecycle
language.

## Vendor Worldview

Vendor users do not think in internal appraisal operations, AMC coordinator queues, candidate
scoring, or relationship management language. Vendor Workbench should answer:

- What work is available?
- What bids have I submitted?
- What work did I win?
- What do I need to do today?
- What documents or tasks are required?
- When do I get paid?

The workspace should use direct, action-oriented language. Vendor users should see work, bids,
assignment offers, required submissions, due dates, messages, documents, invoices, and profile
readiness. They should not see internal procurement mechanics.

## Product And Workspace Separation Doctrine

Falcon has separate product worlds:

1. Internal Operations Workspace.
2. AMC Operations Workspace.
3. Vendor Workspace.
4. Future Client Workspace.

Internal Operations and Falcon AMC are now separate account/product contexts as the long-term
target. Vendor Workspace belongs to the Falcon AMC product context and should not depend on a shared
Internal/AMC login. Separate domains, deployments, auth contexts, redirect URLs, and email link
targets should be planned before production migration.

Vendor notifications, navigation, dashboards, and task surfaces should not bleed into Internal or
AMC workspace views. AMC Operations can monitor vendor work and act as coordinator, but it should
not become the vendor's workspace.

The notification center may eventually support unified viewing, but default behavior must remain
workspace-scoped and clearly separated. A vendor should not see internal AMC queue language, and an
AMC coordinator should not see vendor task navigation as if it were an internal module.

## Workspace Navigation

Recommended Vendor Workspace navigation:

- Dashboard
- Available Work
- My Bids
- Assigned Orders
- Documents / Tasks
- Invoices
- Profile

Navigation groups:

- Work: Available Work, My Bids, Assigned Orders.
- Documents: Documents / Tasks.
- Financials: Invoices.
- Profile: Company Profile, Coverage, Contacts, Insurance, License, Compliance.

Vendor navigation should not expose AMC Operations navigation labels such as Procurement, Vendors,
Clients, internal Assignments, Relationships, Users, candidate matching, or internal production
queues.

## Vendor Dashboard

The Vendor Dashboard should be a workbench summary, not an AMC dashboard with vendor filtering.

The first question should be:

```text
What needs my attention right now?
```

Recommended cards and queues:

- Needs Attention
- Available Bid Requests
- Pending Bids
- Assignment Offers
- Active Assigned Orders
- Reports Due Soon / Due Today
- Revision Requests
- Documents Needed
- Outstanding Invoices / Payments, future
- My Next Actions

The dashboard should prioritize next actions over reporting. Counts should lead to filtered
worklists or Vendor Order Detail screens. Empty states should explain what the vendor can do next,
such as maintain profile readiness, coverage, contacts, and compliance documents.

Avoid cluttered admin metrics unless they help the vendor make a decision or take action.

## Available Work Doctrine

Available Work answers the vendor's decision:

```text
Should I bid or pass?
```

Available Work cards should prioritize:

- property address or market;
- property type;
- scope;
- due date or requested turn time;
- bid deadline;
- fee guidance, if available;
- client/order source, if appropriate;
- required documents available;
- complexity indicators.

Primary actions:

- View Work Detail.
- Submit Bid.
- Pass Opportunity.

Secondary data should live behind disclosure. Vendors should not need to scan raw order metadata,
candidate-match explanations, internal bid request ids, or coordinator-only notes to decide whether
to bid.

## My Bids Doctrine

My Bids should answer:

- What did I bid?
- What is still pending?
- What did I win?
- What did I lose?
- What needs follow-up?

Vendor-facing bid statuses:

- Draft, future optional.
- Submitted.
- Viewed / Under Review, if trackable.
- Selected.
- Not Selected.
- Expired.
- Withdrawn, future optional.

The bid list should make the vendor's prior commitment clear: fee, turn time, proposed due date,
comments, submitted timestamp, and current outcome. Loss or expiration copy should be simple and
non-internal.

## Assigned Orders Doctrine

Assigned Orders is the vendor's main work queue.

It should answer:

- What work do I have?
- What is due next?
- What needs action?
- What is waiting on the AMC/client?
- What have I submitted?

Cards or rows should prioritize:

- property;
- status;
- due date;
- fee;
- next action;
- last update.

Primary actions:

- Accept / Decline Assignment.
- Start Work.
- Submit Report.
- Upload report documents.
- Respond to Revision.
- Upload supplemental documents, future.

Assigned Orders should use the canonical assignment lifecycle while presenting vendor-native labels.
It should not introduce appraisal-specific canonical statuses such as `inspection_complete` or
`report_in_progress` until Falcon has a structured overlay model for those details.

Authenticated Vendor Workspace execution now reuses the existing assignment packet lifecycle for
assigned-order queue, detail, Start Work, Submit Report, assignment-scoped document opening, report
file upload, revision request visibility, revision resubmission, and coordinator-created revision
requests. Report upload uses opaque assignment/document keys, server-generated private storage
targets, short-lived signed upload URLs, and existing `order_documents` metadata; vendors must not
see raw order ids, assignment ids, storage paths, owner-side document APIs, client fees, AMC margin,
internal notes, or procurement/candidate data.

Revision requests are shown as an assigned-order execution state, not as a separate work system.
Vendors should see only vendor-safe revision request metadata: request date, AMC coordinator/company
label, due date, prior submission summary, and revision instructions. Resubmission should reuse the
same report upload plumbing and move the existing assignment packet back to awaiting AMC review.
Coordinator-created revision requests must store vendor-facing instructions separately from any
future internal-only note model. Until that internal-only model exists, coordinator revision notes
must be treated as vendor-facing.

Vendor-native assigned-order labels are:

- Accepted.
- In Progress.
- Submitted / Awaiting Review.
- Revision Requested.
- Resubmitted / Awaiting Review.
- Completed.

Blocked or terminal states should explain what happened:

- Submitted / Awaiting Review means the AMC coordinator is reviewing the submitted report.
- Resubmitted / Awaiting Review means a revision response has been sent back for review.
- Completed means no further vendor action is available.
- Unavailable documents and uploads should use friendly retry/contact copy and must not expose
  storage paths, signed URL internals, RPC names, or raw ids.

## Vendor Order Detail

Vendor Order Detail is the core Vendor Workbench screen.

It should support two access modes:

- `token_invitation`
- `authenticated_vendor`

The underlying screen concept should be the same in both access modes: a vendor-facing order detail
surface with a strict access boundary. Token access gets the minimum order and bid invitation context
needed to make a bid decision. Authenticated vendor access can show a broader vendor relationship
context, assigned-order tasks, document requirements, messages, and invoice state.

Vendor Order Detail sections:

- Property / Order Summary
- Scope
- Bid Request
- Assignment Status
- Documents / Tasks
- Messages / Activity
- Billing / Invoice Status later

The screen should avoid internal tabs and labels. It should present vendor-safe facts and next
actions. The vendor should be able to answer what the order is, what is being requested, what is due,
what they have submitted, what the current assignment state is, what documents or tasks remain, and
what payment status exists later.

## Vendor Order Workspace Doctrine

Each assigned order should have a focused vendor workspace with:

- Overview.
- Requirements.
- Documents.
- Messages / Notes, future.
- Activity.
- Submission.

The top summary should show:

- property;
- fee;
- due date;
- status;
- next required action.

Detailed supporting information should sit behind expandable sections or contextual panels. The
vendor order workspace should not mirror internal Order Detail or AMC packet detail one-for-one.

## Tokenized Bid Invitation Doctrine

AMC-7 token links should open a limited Vendor Order Detail, not a bare form.

Flow:

1. Bid Invitation Email.
2. `/vendor/bid-invitations/:token`.
3. Limited Vendor Order Detail.
4. Submit Bid modal.
5. Existing bid response lifecycle.

Token invitation access should be scoped to one bid request recipient and the minimum order context
needed to respond. The Submit Bid action should write through the existing bid response lifecycle,
not through a parallel vendor-only response table.

The token page should be designed as the constrained version of future authenticated Vendor Order
Detail. The first AMC-7 version may have no full vendor login requirement, but it should not become a
throwaway standalone bid form that later has to be replaced.

### AMC-7A Runtime Foundation

AMC-7A.1 adds the first backend invitation foundation without adding public vendor access.

Completed:

- `public.order_vendor_bid_request_recipient_invitations` stores delivery/access records scoped to
  bid request recipients.
- `public.rpc_order_vendor_bid_invitation_create(p_recipient_id uuid, p_payload jsonb default '{}')`
  creates coordinator-generated invitations for authenticated users with bid update authority.
- Plaintext tokens are returned once from the create RPC.
- Only the SHA-256 token hash and token last four are stored.
- The create RPC returns a relative path in the form `/vendor/bid-invitations/<token>`.
- Invitation creation does not mutate bid recipient lifecycle state.

AMC-7A.2 adds a coordinator-side internal link generation surface without adding vendor access.

Completed:

- `createOrderVendorBidInvitation(recipientId, payload = {})` wraps the invitation create RPC.
- `BidRequestsPanel` exposes `Generate Bid Link` for open/invitable recipients when the coordinator
  has update authority.
- The generated link path displays inline as selectable text.
- No copy-to-clipboard helper, email send, public route, token read RPC, token submit RPC, response
  recording, bid selection, assignment conversion, or recipient lifecycle mutation is added.

### AMC-7B / AMC-7C Read-Only Public Vendor Detail

AMC-7B adds public-safe token read support without adding submit behavior.

Completed:

- `public.rpc_order_vendor_bid_invitation_read(p_token text)` validates tokenized invitations.
- The RPC returns a limited Vendor Order Detail payload for valid tokens.
- Invalid, expired, revoked, submitted, closed, or otherwise unavailable tokens return the constant
  response `{ ok: false, error: "bid_invitation_invalid_or_expired" }`.
- Valid reads update only invitation telemetry: `opened_at`, `last_opened_at`, `open_count`, and
  `updated_at`.
- Token reads do not mutate recipient status, create bid responses, mutate orders, or mutate bid
  request lifecycle state.

AMC-7B.1 adds the frontend API wrapper without UI behavior.

Completed:

- `readOrderVendorBidInvitation(token)` calls the public token read RPC.
- The wrapper returns `{ ok: true }` and `{ ok: false }` payloads as-is.
- The wrapper does not throw for invalid/expired business responses; only Supabase transport/RPC
  errors propagate as exceptions.

AMC-7C adds the first public Vendor Bid Invitation page.

Completed:

- `/vendor/bid-invitations/:token` is registered as a public route.
- The route is outside internal `Layout` and `ProtectedRoute`.
- The page uses a standalone public Falcon / Continental layout without TopNav, sidebar, workspace
  switcher, command palette, or internal app footer.
- Valid tokens render a limited Vendor Order Detail from the safe RPC payload.
- Invalid, expired, revoked, submitted, closed, and transport-error states render the same generic
  unavailable state.
- A disabled `Submit Bid` placeholder is present.
- No submit RPC, email send, authenticated Vendor Workbench, recipient lifecycle mutation, response
  creation, order mutation, or request lifecycle mutation is added.

Current manual testing flow:

1. Coordinator creates a bid request.
2. Coordinator clicks `Generate Bid Link` for an open recipient.
3. Coordinator manually copies the returned path.
4. Coordinator or vendor opens `/vendor/bid-invitations/<token>`.
5. The public Vendor Bid Invitation page loads the safe order detail.
6. Vendor still contacts the coordinator or uses the manual response path until AMC-7D adds token
   submit behavior.

### AMC-7D Public Vendor Bid Submission

AMC-7D completes the first token-based vendor self-service bid submission path.

AMC-7D.1 adds the public submit RPC:

- `public.rpc_order_vendor_bid_invitation_submit(p_token text, p_payload jsonb)` validates the
  tokenized invitation and bid lifecycle server-side.
- Invalid, expired, revoked, submitted, closed, or otherwise unavailable token states return the
  constant response `{ ok: false, error: "bid_invitation_invalid_or_expired" }`.
- Valid-token payload errors return
  `{ ok: false, error: "bid_submission_invalid", field_errors: {...} }`.
- Successful submission writes a bid response, marks the recipient `responded`, sets invitation
  `submitted_at`, and advances the bid request to `partially_responded` or `closed`.
- The submit RPC does not mutate the order, select a bid, create an assignment packet, send email,
  or create notifications.

AMC-7D.2 adds the frontend submit wrapper:

- `submitOrderVendorBidInvitation(token, payload = {})` calls the token submit RPC.
- Business responses are returned as-is.
- Supabase transport/RPC errors still throw through the shared API helper.

AMC-7D.3 enables the public page form:

- `/vendor/bid-invitations/:token` now includes a working Submit Bid form.
- The form captures fee amount, currency, turn time days, proposed due date, comments, contact
  name, contact email, and contact phone.
- Successful submission shows `Your bid has been submitted.` and does not re-read the token,
  because submitted token reads currently resolve to the generic unavailable state.
- Invalid/expired submit responses show the generic unavailable state.
- Backend `field_errors` display in the form.

Current AMC-7D end-to-end flow:

1. AMC coordinator creates a bid request.
2. Coordinator clicks `Generate Bid Link` for an open recipient.
3. Coordinator manually copies or opens `/vendor/bid-invitations/<token>`.
4. Vendor opens the public link and reviews the safe limited Vendor Order Detail.
5. Vendor submits fee, timing, comments, and contact details.
6. The bid response appears in the existing internal bid lifecycle.
7. Coordinator can select the bid and create an assignment offer through the existing internal
   selected-bid conversion path.

### AMC-7E.1 Coordinator Copy Helpers

AMC-7E.1 adds coordinator-side copy helpers for generated vendor bid invitation links.

Completed:

- Generated bid links now expose `Copy Link`.
- Generated bid links now expose `Copy Email Text`.
- `Copy Email Text` creates a ready-to-paste vendor bid request email draft.
- No actual email send occurs.
- No `email_queue`, Resend, Edge Function, notification, or backend behavior is added.
- If the browser clipboard API is unavailable or fails, the generated link remains visible and the
  coordinator is told to select the text manually.
- This supports manual Gmail testing with safe test vendor contacts.

Current AMC-7E.1 manual email testing flow:

1. Add a test vendor contact using one of the approved test emails:
   - `chris@therossicompany.com`
   - `chrisrossi92@gmail.com`
2. Create a bid request.
3. Generate a bid link.
4. Click `Copy Email Text`.
5. Paste and send manually from Gmail.
6. Open the public vendor link.
7. Submit the bid.
8. Confirm the bid appears internally.

Deferred:

- AMC-7E.2 contact targeting / selected vendor contact UX if needed.
- AMC-7E.3 real email queue/send integration.
- Reply-to, sender, and template infrastructure.
- Email delivery status tracking.
- Authenticated Vendor Workbench.

### AMC Procurement + Vendor Self-Service MVP

Status: VALIDATED.

Validation was completed using `AMC-DEMO-003` and approved test vendor contacts
`chris@therossicompany.com` and `chrisrossi92@gmail.com`.

Validated flow:

1. AMC order creation.
2. Vendor candidate matching.
3. Request Bids.
4. Bid request creation.
5. Vendor invitation generation.
6. Public vendor invitation route.
7. Vendor-safe order detail.
8. Vendor bid submission.
9. Internal bid response creation.
10. Bid selection.
11. Assignment offer conversion.
12. Assignment packet creation.
13. Assignment packet visibility.
14. Assignment packet detail access.

Validated outcomes:

- Vendor can participate without a Falcon account.
- Tokenized invitation workflow functions.
- Public vendor page does not expose internal AMC data.
- Vendor response enters the existing procurement lifecycle.
- Selected bid preserves fee, timing, due date, and comments.
- Assignment offer conversion preserves selected bid context.
- Assignment packet loads successfully.
- AMC Operations users can access the packet contextually through `Open Packet`.

### AMC Vendor Execution Loop MVP

Status: VALIDATED.

Milestone status:

- AMC-7 Vendor Self-Service Bidding: COMPLETE & VALIDATED.
- AMC-8A Assignment Offer Acceptance MVP: COMPLETE & VALIDATED.
- AMC-8B Vendor Work Tracking MVP: COMPLETE & VALIDATED.

Validated public routes:

- `/vendor/bid-invitations/:token`.
- `/vendor/assignment-offers/:token`.
- `/vendor/assignment-work/:token`.

Validated tokenized vendor flow:

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

Validation notes resolved during deployed testing:

- Assignment invitation action was hidden because an owner packet exposed `id` instead of
  `assignment_id`.
- Production database was missing the assignment invitation create RPC migration.
- Generated vendor links initially used relative paths instead of absolute public URLs.

Vendor access doctrine:

- Offer tokens and work tokens are separate.
- Offer token is for accept/decline only.
- Work token is for post-accept work status actions.
- No vendor login is required for the MVP.
- Tokenized public work tracking does not mutate the main order lifecycle.
- Canonical assignment status remains coarse: `offered`, `accepted`, `in_progress`, `submitted`,
  `completed`, `declined`, `cancelled`, and `revoked`.
- Appraisal-specific states such as `inspection_complete` and `report_in_progress` remain future
  overlays, not canonical assignment statuses.

Post-MVP Procurement Enhancements:

- AMC-7E.2 contact targeting UX.
- AMC-7E.3 automated email send.
- Delivery/open tracking UI.
- Copy helper polish.
- Submitted-token read state.

Vendor Workbench Expansion:

- Authenticated vendor login.
- Available Work.
- My Bids.
- Assigned Orders.
- Documents/Tasks.
- Invoices.
- Vendor Profile management.

Assignment Lifecycle Expansion:

- AMC-8 assignment lifecycle doctrine is defined in
  `docs/amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md`.
- Vendor acceptance / decline is complete and validated for the token MVP.
- Assignment progress tracking is complete and validated for Start Work and Submit Report status.
- Full report upload/submission remains future scope.
- Revision workflow.
- Lifecycle automation after manual lifecycle behavior is validated.

## Authenticated Vendor Doctrine

Future authenticated vendor flow:

1. Vendor logs in.
2. Vendor Dashboard.
3. Vendor Order Detail.
4. Submit bids, accept assignments, upload documents, manage invoices/profile.

Authenticated access should be relationship/company scoped. The default MVP actor is the primary
vendor manager/contact/signing appraiser for the vendor company. That vendor manager should see only
work tied to vendor companies and relationships they are authorized to represent. Vendor managers
may eventually manage company profile readiness, contacts, coverage, insurance/license/compliance
documents, and invoices.

Authenticated Vendor Workbench should reuse assignment packet lifecycle concepts for assignment
offers and assigned work. It should not create a separate assignment system.

AMC-8 post-award assignment lifecycle doctrine lives in
`docs/amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md`. Vendor Workbench assigned-order surfaces should
lead with decision-first assignment cards showing vendor, status, due date, and next action, with
selected bid context, terms, comments, documents, contacts, and audit detail behind expansion.

## Vendor Status Model

Vendor-facing status labels should be separate from AMC-facing procurement status labels.

AMC-facing procurement statuses:

- No Bids
- Bids Requested
- Responses Received
- Bid Selected
- Assignment Offered
- Assigned

Vendor-facing statuses:

- Available to Bid
- Bid Submitted
- Not Selected
- Bid Accepted
- Assignment Offered
- Assignment Accepted
- Assignment Declined
- Assigned
- In Progress
- Inspection Complete
- Report In Progress
- Submitted
- Revision Requested
- Resubmitted
- Completed
- Paid

Status translation should be derived from bid request recipient state, selected response state,
assignment packet state, order lifecycle state, document/task completion, and payment state. Vendor
status should not overwrite AMC procurement status or internal order lifecycle status.

## Documents Versus Tasks Doctrine

Vendor-required documents should be treated as task-like work items. The vendor should think "What
do I need to submit?" rather than "What folder do I browse?"

Documents from AMC/client to vendor may include:

- Engagement letter.
- Order form.
- Subject property documents.
- Purchase contract.
- Rent roll.
- Financial statements.
- Property contact info.
- Prior appraisal, if provided.
- Tax/property record cards.
- Photos/surveys/plans, if provided.

Documents from vendor to AMC may include:

- Completed report.
- Invoice.
- Revision response.
- Supporting files.
- Inspection notes/photos, future optional.

Examples:

- W9
- License
- E&O
- Report upload
- Photos
- Workfile
- Revision request
- Invoice submission

Documents / Tasks should distinguish:

- Required.
- Optional.
- Missing.
- Uploaded.
- Submitted.
- Accepted / Needs Revision, future.

Documents / Tasks should have clear status, due date where relevant, accepted/rejected state where
relevant, and resubmission language where needed. Document browsing can exist, but required work
should be presented as actionable tasks.

## Vendor Profile Doctrine

Vendor Profile should eventually power matching.

Profile areas:

- Company/contact details.
- Licenses/certifications.
- Coverage areas.
- Property type specialties.
- Fee preferences.
- Turn-time preferences.
- Current capacity.
- Insurance/W-9/compliance documents.
- Payment/invoicing details, future.
- Availability / out-of-office status.

Profile should help Falcon decide:

- Who is eligible?
- Who is available?
- Who is likely a good fit?
- Who should not receive this request?

Vendor profile management should be vendor-native, but owner-side Vendor Directory remains the AMC
source of relationship governance, status, and eligibility controls.

## Billing Doctrine

Vendor-facing billing should be simple and avoid accounting jargon.

Recommended statuses:

- Not Ready
- Invoice Needed
- Submitted
- Approved
- Paid

Billing should appear only when the vendor has a legitimate payment relationship to the assignment
or order. Internal accounting fields, margin, client fee, reconciliation details, and admin-only
payment controls should remain hidden.

## Hidden Internal Data

Vendor users must never see:

- AMC margin
- client fee unless intentionally allowed
- other vendor names or bids
- candidate scores
- internal notes
- reviewer/appraiser internal assignments
- internal audit metadata
- relationship ids or company ids
- private client documents

Vendor-facing read models and RPCs should be explicitly limited. Do not rely on frontend hiding to
protect internal data.

## Security Doctrine

- Token access is limited and scoped.
- Authenticated access is relationship/company scoped.
- No plaintext tokens are stored.
- Public token RPCs return limited data only.
- Bid submit must use the existing response lifecycle.
- Assignment accept must use the assignment packet lifecycle.
- Token expiration, revocation, recipient status, and submitted response state must be checked
  server-side.
- Token reads should not expose raw internal identifiers unless those identifiers are explicitly
  safe for the public access model.
- Token activity should be auditable without exposing internal audit metadata to the vendor.

Security is enforced by backend/RPC contracts. Vendor Workbench UI is an experience boundary, not an
authorization boundary.

## Automation Doctrine

Manual copy/paste token workflow is scaffolding only.

Target coordinator workflow:

1. Select vendors from candidate list.
2. Include/exclude vendors with minimal clicks.
3. Review or personalize the bid request message.
4. Click Send.

Target Falcon workflow:

1. Send personalized bid request emails.
2. Include secure portal/deep links.
3. Track delivery/open/response where supported.
4. Send reminders.
5. Mark expired requests.
6. Surface the next best coordinator action.

Target vendor workflow:

1. Receive email.
2. Open Falcon Vendor Workspace.
3. Review available work.
4. Bid or pass.
5. If selected, manage the assignment inside Vendor Workspace.

Automation should reduce copy/paste work without hiding lifecycle state. Coordinators must still
understand what was sent, who received it, who opened/responded, what expired, and what action is
recommended next.

## Decision-First UX Doctrine

Vendor Workspace should follow `docs/FALCON_DECISION_FIRST_UX_DOCTRINE.md`.

Level 1:

- status;
- due date;
- next action;
- critical blockers.

Level 2:

- summaries;
- supporting context.

Level 3:

- full details;
- audit/history/source data.

Screens should be minimal, relevant, and role-native. Vendor users should never have to understand
internal AMC concepts to complete their work.

## Implementation Roadmap

1. WS-6: Vendor Workbench doctrine.
   - Define vendor worldview, navigation, dashboard, Vendor Order Detail, status model, hidden data,
     security rules, and implementation sequencing.

2. AMC-7A: token/invitation backend model.
   - Complete through AMC-7A.2 for the internal coordinator path.
   - Adds secure token representation tied to bid request recipients.
   - Stores only hashed tokens plus token last four.
   - Returns plaintext token once with `/vendor/bid-invitations/<token>`.
   - Adds coordinator-side `Generate Bid Link` display.
   - Does not add public read/submit RPCs, public route, email send, or recipient lifecycle mutation.

3. AMC-7B: token read RPC for limited Vendor Order Detail.
   - Complete. Public/token RPC returns vendor-safe order summary, scope, bid request context, and
     deadline.
   - Complete. RPC rejects expired, revoked, invalid, submitted, already-ineligible, or
     unauthorized token states with a constant failure response.
   - Complete. Token reads update invitation open telemetry only.

4. AMC-7C: public Vendor Bid Invitation route.
   - Complete. `/vendor/bid-invitations/:token` renders a read-only limited Vendor Order Detail.
   - Complete. The route is public and outside the internal Falcon app shell.
   - Complete. Submit is represented by a disabled placeholder until AMC-7D.

5. AMC-7D: Submit Bid modal/RPC.
   - Complete. Public token submit writes bid responses through the existing bid response
     lifecycle.
   - Complete. The public Vendor Bid Invitation page now supports fee, timing, comments, and
     contact field submission.
   - Complete. Submission preserves order boundaries and does not select a bid, create an
     assignment, send email, or create notifications.

6. AMC-7E: email link generation/send.
   - AMC-7E.1 complete. Coordinator-side `Copy Link` and `Copy Email Text` helpers support manual
     vendor email outreach without sending email from Falcon.
   - Future AMC-7E slices may add contact targeting and real vendor-safe email queue/send
     integration.
   - Do not expose raw internal ids or internal procurement details in email content.

7. AMC-8: Assignment Lifecycle Expansion.
   - Post-award assignment states, vendor actions, AMC coordinator actions, Vendor Workbench queues,
     report submission doctrine, revision workflow, and later lifecycle automation are defined in
     `docs/amc/AMC_ASSIGNMENT_LIFECYCLE_DOCTRINE.md`.
   - Authenticated Vendor Workbench runtime remains future scope unless a specific AMC-8
     implementation slice authorizes vendor access.

8. AMC-9: Vendor Workspace Runtime Doctrine.
   - Doctrine complete in this document.
   - Runtime complete through AMC-9H for authenticated Vendor Workspace bidding and history.
   - Implemented surfaces: Vendor Dashboard, Available Work, Work Detail, Submit Bid, Pass
     Opportunity, My Bids / Passed Opportunities, unified history detail, and vendor-safe document
     opening through signed URLs.
   - Route compatibility is preserved: Work Detail continues to use
     `/vendor-workspace/available-work/:workKey`.
   - Guardrails remain: current-company scope, active AMC vendor relationship/profile, AMC-only
     orders, no shared `/orders`, no owner-side procurement/document APIs, no raw ids, no storage
     paths, no client fees, no AMC margin, no candidate scores, no competing bids, and no internal
     notes.

9. AMC-10: Vendor Assigned Order Execution.
   - AMC-10A through AMC-10I are complete.
   - Runtime surfaces: `/vendor-workspace/assigned-orders` and
     `/vendor-workspace/assigned-orders/:assignmentWorkKey`.
   - Implemented behavior: vendor-safe assigned order list from existing `order_company_assignments`
     lifecycle rows, Active/Due Soon/Needs Attention/Submitted summary cards, assignment status,
     accepted date, due date, inspection/appointment status where available, report submitted state,
     next action label, and row navigation into an authenticated assigned order detail.
   - Detail behavior: vendor-safe status/next action, property, timeline, scope and instructions,
     document metadata, report submission summary, and revision summary where safely represented.
   - Start Work is enabled for eligible accepted assignments and reuses the existing assignment
     lifecycle by moving work to In Progress and logging/notifying `assignment.started`.
   - Submit Report is enabled for eligible in-progress assignments and reuses the existing
     assignment lifecycle by moving work to Submitted / Awaiting Review, stamping `submitted_at`,
     and logging/notifying `assignment.submitted`.
   - Assignment-scoped document opening is enabled through opaque assignment/document keys and
     short-lived signed URLs for vendor-visible documents.
   - Report upload plumbing is enabled through opaque assignment/document keys, server-generated
     storage targets, short-lived signed upload URLs, and existing `order_documents` metadata.
   - Vendor revision visibility and resubmission are enabled for `revision_requested` assignments.
   - Coordinator revision request is enabled on submitted vendor assignment packets and stores only
     vendor-facing instructions in the shared revision payload.
   - Closeout polish normalizes state labels, blocked-state copy, dashboard/Assigned Orders
     revision counts, friendly document/upload errors, and AMC-10 documentation.
   - Guardrails remain: current-company scope, active AMC vendor relationship/profile, AMC-only
     orders, `vendor_assignments.read`, no shared `/orders`, no owner-side procurement APIs, no raw
     ids, no storage paths, no client fees, no AMC margin, no internal notes, and no candidate or
     procurement scoring.

10. AMC-11: Internal Review Enhancements.
   - AMC-11A is complete for internal-only coordinator notes on vendor assignment review/revision
     decisions.
   - Coordinator notes are stored in a separate internal-only model and are not Vendor Workspace
     payloads, vendor notifications, public token payloads, or shared activity entries.
   - Vendor-facing revision instructions remain separate from private review reasoning.
   - Vendor Workspace assigned-order detail continues to exclude internal notes.
   - AMC-11B is complete for abandoned pending vendor report upload cleanup.
   - Pending Vendor Workspace report upload metadata receives a conservative expiration timestamp,
     and service-role maintenance can mark stale pending metadata expired without touching submitted
     reports, resubmitted reports, vendor-visible active documents, assignment lifecycle, order
     lifecycle, notifications, token routes, or storage objects.
   - Storage object cleanup remains future storage-aware maintenance work; Vendor Workspace must not
     expose bucket/path values.
   - AMC-11C is complete for read-only Vendor Workspace Profile / Coverage visibility.
   - `/vendor-workspace/profile` shows vendor-safe company, contact, coverage, accepted work type,
     status, default turn time, compliance summary, and last-updated data.
   - Profile reads require `vendor_profile.read`, current-company scope, and an active AMC vendor
     relationship/profile.
   - Profile reads do not expose raw relationship/profile ids, internal coordinator notes, pricing,
     client fees, AMC margin, owner-side APIs, or edit mutations.
   - AMC-11D is complete for review-first Vendor Profile / Coverage edit requests.
   - Vendors can submit proposed contact, company phone / website, coverage state/county/market,
     accepted property/report type, and explanation changes from `/vendor-workspace/profile`.
   - Vendor-submitted requests are stored as pending internal review records and do not mutate live
     operational profile, coverage, relationship, pricing, compliance document, or matching data.
   - Vendors can see pending/recent request status through opaque request keys only.
   - AMC-11E is complete for internal AMC review/approve/reject handling.
   - Internal users review requests from Vendor Directory using opaque request keys and current /
     proposed summaries.
   - Approval is the only path that applies requested live profile, contact, accepted work type, or
     coverage changes.
   - Rejection preserves request history and does not mutate operational vendor data.
   - Vendors see only safe decision status and reviewer message in Vendor Workspace Profile; no
     approval controls, raw ids, internal notes, pricing, client fees, AMC margin, owner APIs, or
     review internals are exposed.

11. AMC-12: Vendor Financial Visibility.
   - AMC-12A is complete for read-only Vendor Workspace invoice/payment visibility.
   - `/vendor-workspace/payments` shows payment activity for assigned AMC work using vendor-safe
     assignment/payment rows.
   - Payment visibility requires `vendor_payments.read`, current vendor company scope, active AMC
     vendor relationship/profile rows, AMC-scoped orders, and vendor assigned work.
   - Rows may show payable vendor amount only when safely modeled in assignment terms or selected
     vendor bid handoff.
   - The page shows Ready for Invoice, Invoice Received, Approved, Scheduled, Paid, On Hold, and
     Rejected summaries.
   - AMC-12B is complete for vendor invoice submission from payment-eligible assigned work.
   - Vendors with `vendor_invoices.submit` can upload PDF invoice files through a signed upload URL,
     register safe invoice document metadata, and submit invoice number, amount, date, and vendor
     note.
   - Invoice documents reuse existing `order_documents` metadata with opaque document keys; Vendor
     Workspace does not receive storage bucket/path values.
   - Invoice submission records `invoice_received` on the assignment submission payload and notifies
     owner/admin users.
   - AMC-12C is complete for internal AMC invoice review.
   - Internal users with vendor read and billing update authority can review submitted invoices from
     Vendor Directory, open invoice PDFs through the existing internal document access pattern, and
     approve, hold, or reject invoices.
   - Review stores internal reviewer notes separately from vendor-facing decision messages.
   - Vendors see only safe payment status and vendor-facing messages through Vendor Workspace
     notifications and Payments visibility.
   - AMC-12D is complete for corrected vendor invoice resubmission after rejection.
   - Rejected Payments rows show the vendor-facing rejection message, prior invoice summary, and
     `Submit Corrected Invoice` action.
   - Corrected invoice upload/register reuses the existing invoice document upload path and opaque
     invoice document keys.
   - Corrected invoice resubmission preserves the prior rejected invoice metadata/history, moves the
     current invoice back to `invoice_received`, and notifies internal users for review.
   - AMC-12E is complete for internal payment ledger and scheduling foundation.
   - Internal users with vendor read and billing update authority can schedule approved invoices and
     mark scheduled payments paid from Vendor Directory.
   - Vendor Payments can show safe `Scheduled` and `Paid` statuses, payment date, method label,
     reference label, and vendor-facing payment note.
   - Payment scheduling/paid tracking is internal ledger state only; it does not initiate ACH, check,
     bank transfer, card, or payment processor activity.
   - AMC-12F is complete for Vendor Payments closeout and polish.
   - Vendor-facing payment labels are normalized to `Ready for Invoice`, `Invoice Received`,
     `Approved`, `Scheduled`, `Paid`, `On Hold`, and `Rejected`.
   - Rejected invoice rows show the vendor-facing rejection message, prior invoice summary, and
     corrected invoice path.
   - Scheduled and paid rows show only safe method/date/reference labels and vendor-facing payment
     notes.
   - Internal review and ledger surfaces keep private internal notes separate from vendor-facing
     messages/payment notes.
   - This slice does not support real payment transfer execution, external payment processor
     integration, client fees, AMC margin, owner-side financial notes to vendors, raw ids in
     vendor-facing views, storage paths, or shared `/orders`.

12. Next Vendor Workspace phases.
   - AMC-13A smoke execution using `../amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md`.
   - External payment processor integration only after provider/reconciliation doctrine is selected.
   - Accounting export.
   - Storage-aware cleanup for abandoned invoice uploads.
   - Partial invoice approval if operations need approve-some/reject-some invoice decisions.
   - Optional partial-approval controls for profile update requests if operations need
     approve-some/reject-some decisions.

## Explicit Non-Goals

WS-6 does not implement:

- vendor routes;
- token tables or token RPCs;
- vendor auth;
- public bid pages;
- bid response mutation changes;
- assignment accept/decline UI;
- document/task uploads;
- invoice behavior;
- notifications or emails;
- permission changes;
- schema/RLS changes;
- runtime navigation changes.
