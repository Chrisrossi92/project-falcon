# Vendor Workbench Doctrine

## Purpose

This document defines the future Vendor Workspace / Vendor Workbench before AMC-7 tokenized bid
link implementation.

The Vendor Workspace is a peer workspace in Falcon. It is not an AMC subpage, not a public bid form,
and not a thin wrapper around internal Order Detail. AMC Operations manages procurement. Vendor
Workbench lets external vendors understand available work, submitted bids, won assignments, required
tasks, documents, and payment status inside a vendor-native operational world.

This document is doctrine/planning only. It does not add runtime routes, permissions, backend
changes, schema/RLS changes, token models, email behavior, vendor accounts, payment behavior,
notifications, or UI.

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

Recommended cards and queues:

- Available Bid Requests
- Pending Bids
- Assignment Offers
- Active Assigned Orders
- Due Soon
- Documents Needed
- Invoices / Payment Status

The dashboard should prioritize next actions over reporting. Counts should lead to filtered
worklists or Vendor Order Detail screens. Empty states should explain what the vendor can do next,
such as maintain profile readiness, coverage, contacts, and compliance documents.

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

Authenticated access should be relationship/company scoped. Vendor users should see only work tied
to vendor companies and relationships they are authorized to represent. Vendor users may eventually
manage company profile readiness, contacts, coverage, insurance/license/compliance documents, and
invoices.

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

Examples:

- W9
- License
- E&O
- Report upload
- Photos
- Workfile
- Revision request
- Invoice submission

Documents / Tasks should have clear status, due date where relevant, accepted/rejected state where
relevant, and resubmission language where needed. Document browsing can exist, but required work
should be presented as actionable tasks.

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
