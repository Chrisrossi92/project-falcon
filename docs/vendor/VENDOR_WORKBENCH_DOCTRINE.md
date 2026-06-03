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

Current internal testing flow:

1. Coordinator creates a bid request.
2. Coordinator clicks `Generate Bid Link` for an open recipient.
3. Coordinator manually copies the returned path.
4. The public vendor page does not exist yet.
5. AMC-7B must add the token read RPC before the link becomes usable.

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
- Assigned
- In Progress
- Submitted
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
   - Public/token RPC returns vendor-safe order summary, scope, bid request context, deadline, and
     current response state.
   - RPC rejects expired, revoked, invalid, already-ineligible, or unauthorized token states.

4. AMC-7C: public Vendor Bid Invitation route.
   - Add `/vendor/bid-invitations/:token`.
   - Render limited Vendor Order Detail from the token read RPC.
   - Do not require a full vendor account for the first version.

5. AMC-7D: Submit Bid modal/RPC.
   - Submit fee, turn time, proposed due date, and comments through the existing bid response
     lifecycle.
   - Preserve existing response status, request status, and audit rules.

6. AMC-7E: email link generation/send.
   - Generate tokenized invitation links and send vendor-safe email copy.
   - Do not expose raw internal ids or internal procurement details in email content.

7. AMC-8 or later: authenticated Vendor Workbench.
   - Vendor Dashboard, authenticated Vendor Order Detail, assignment acceptance, document/task
     upload, invoice/profile workflows, contacts, coverage, insurance/license/compliance.

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
