# AMC Order Lifecycle

## Purpose

The AMC Order Lifecycle defines how AMC Operations Mode should represent order progress while reusing Falcon's shared order engine.

## Shared Order Engine

AMC orders should use Falcon's shared order infrastructure wherever possible.

The goal is one order engine with different operational lenses, not a disconnected AMC order system.

## Internal Lifecycle vs AMC Lifecycle

Internal Operations focuses on:

- appraiser assignment
- reviewer assignment
- internal production
- split/revenue tracking
- review handoff

AMC Operations focuses on:

- client intake
- vendor assignment
- vendor progress
- review/delivery
- client service
- margin and vendor performance

## MVP AMC Statuses

MVP AMC statuses:

- new
- assigned
- in_progress
- review
- delivered
- complete

Status labels may be hardcoded for MVP, but they should be treated as defaults rather than permanent rules.

## Hold/Escalation Concepts

AMC workflow should leave room for:

- hold reasons
- client delays
- vendor delays
- escalation flags
- late-work tracking
- stalled assignment tracking

Hold and escalation behavior should be documented before implementation because they affect reporting, notifications, and lifecycle state.

## Assignment State

Assignment state may differ from lifecycle status.

Future assignment states may include:

- unassigned
- outreach sent
- accepted
- declined
- assigned
- reassigned

Assignment offers for AMC vendor candidates should reuse the existing assignment packet lifecycle. Candidate selection is advisory; only an explicit offer action creates an `order_company_assignments` packet. MVP vendor offers should be single-vendor and should not create bidding, automated routing, or multi-vendor first-to-accept behavior until separately approved.

AMC-6C adds frontend API support for mapping a selected vendor candidate into the existing assignment offer RPC path. It does not add UI, lifecycle states, or automatic assignment behavior.

AMC-6E implements backend-backed one-active-vendor-offer enforcement for MVP: one active `vendor_appraisal` packet per order across `offered`, `accepted`, `in_progress`, and `submitted` statuses. Declined, completed, cancelled, and revoked packets remain historical and do not block a later vendor offer.

AMC-6F proposes the first candidate-aware `Offer Assignment` UI without implementing it. The recommended UI is a candidate-card action on Order Detail in AMC Operations mode, gated by existing assignment-offer permissions plus candidate visibility, with a confirmation modal for message, due date, optional review due date, and optional expiration. The modal should include the candidate snapshot silently and should not expose raw relationship ids, assignment type, terms JSON, or handoff JSON. Backend `order_vendor_assignment_active_exists` should display as "This order already has an active vendor offer or assignment."

AMC-6F.1 audits active vendor offer visibility before adding the button. Order Detail already has the needed order-scoped assignment summary through `rpc_order_company_assignment_list_for_order(uuid)`, including `assignment_type`, `status`, assigned company name, relationship status, and lifecycle timestamps. Active vendor packets are `vendor_appraisal` rows in `offered`, `accepted`, `in_progress`, or `submitted` status. No new read RPC is required for MVP; the implementation gap is sharing that loaded assignment state with the candidate panel so active vendor offers can display as a Vendor Assignment summary and candidate offer actions can stay hidden.

AMC-6F.2 shares active vendor assignment state on Order Detail without adding offer actions. Order Detail now loads the existing owner assignment rows once when the user can read owner assignments and assignment/candidate surfaces are visible, derives `activeVendorAssignment`, passes controlled rows into the existing assignments panel, and passes active assignment state into the vendor candidate panel. The candidate panel displays a read-only active-offer note when applicable. Historical statuses remain non-blocking.

## Delivery State

Delivery state may include:

- report received
- in review
- revision requested
- delivered to client
- completed

Delivery behavior should reuse activity, notifications, files, and reporting where possible.

## Future Cross-Platform Workflow: Lender Correction / Revision Requests

This future workflow applies to both Internal Operations Mode and AMC Operations Mode. It is deferred and not implemented in the current AMC work.

Open question to revisit before implementation:

- Should lender correction requests reopen the existing order or create a new order?

Recommended doctrine:

- Normal corrections and revisions should stay attached to the existing order.
- Falcon should create a correction/revision cycle record linked to the order.
- Original completion, delivery, and submission history should be preserved.
- Each cycle should track requested items, requester, due date, assigned internal user or vendor, status, and resubmission timestamp.
- A new order should be created only when scope, property, client engagement, or fee basis materially changes.

Deferred roadmap items:

- correction request lifecycle
- revision status handling
- notifications and reminders
- appraiser/vendor response tracking
- audit trail and history
- client-facing correction communication

The workflow must not erase the original order outcome, hide prior submissions, or make correction handling mode-specific unless product policy explicitly requires mode-specific copy or permissions.

## Customization Opportunities

Future lifecycle customization may include:

- status labels
- required transitions
- escalation thresholds
- client-specific delivery steps
- vendor-specific follow-up rules
- notification policies

## Future Expansion

- configurable lifecycle models
- client-specific workflow templates
- vendor-facing progress updates
- delivery quality checks
- SLA tracking
- escalation automation
