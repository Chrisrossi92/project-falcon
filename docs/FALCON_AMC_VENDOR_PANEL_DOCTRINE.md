# Falcon AMC Vendor Panel Doctrine

## Purpose

This document defines the canonical doctrine for Continental AMC vendor panel relationships, assignment eligibility, vendor states, and assignment routing boundaries before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, relationship statuses, assignment lifecycle, permission seeds, database migrations, billing logic, onboarding enforcement, company settings, or tenant/module/package runtime behavior.

Reference docs:

- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_AMC_NOTIFICATION_ACTIVITY_ESCALATION_DOCTRINE.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`
- `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`

## Core Doctrine

- Continental AMC uses vendor relationships to route work.
- Vendor panel membership is not order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Vendor panel membership is a business eligibility layer, not an operational data grant.
- Assignment eligibility determines whether an assignment may be offered.
- Assignment packets remain the operational visibility grant.
- Relationship state alone must never expose canonical order data.
- Vendors work from packet-native surfaces, not owner-company order dashboards.
- Vendor Portal operational doctrine lives in `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`.
- Vendor packet lifecycle, vendor-safe queues, vendor actions, activity taxonomy, and document boundaries live in `docs/FALCON_VENDOR_PACKET_LIFECYCLE_TAXONOMY.md`.
- Vendor profile, availability, readiness, capacity, and upgrade doctrine lives in `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`.
- Vendor packet messages, assignment-scoped activity, and packet notifications must remain separate from client-facing communication and canonical owner-order notifications.
- Manual assignment should be proven before suggested routing, auto-routing, or scoring-driven routing.
- External vendors must not be written into owner-company appraiser/reviewer/staff assignment fields.

## Vendor Panel Purpose

The vendor panel represents Continental AMC's managed network of companies that may receive assignment offers.

The panel should help AMC operators answer:

- Which vendor companies are eligible to receive work?
- Which vendor companies require onboarding, compliance, pause, review, or archive action?
- Which vendors are operationally available for a specific assignment?
- Which existing assignments need vendor follow-up?
- Which vendor relationships need business attention later?

The panel should not answer:

- Which canonical AMC orders can a vendor see?
- Which internal AMC review notes can a vendor access?
- Which clients/lenders belong to Continental AMC?
- Which other vendors are competing for work?
- Which internal staff member owns the order?

Operational visibility is granted only by explicit scoped surfaces such as assignment packets, owner-readable orders, client portal scope, or future portal-specific projections.

## Vendor Relationship States

The states below are conceptual panel states for planning. They do not change existing relationship status values or assignment lifecycle values.

### `invited`

Meaning:

- Continental has invited a vendor company to join the panel, but the vendor has not completed acceptance or onboarding.

Who can set it:

- AMC Owner, AMC Admin, or Vendor Relationship Manager later.

Whether assignments can be offered:

- No for normal work.
- Future limited preview/test assignments should require explicit product design.

Whether existing assignments remain visible:

- Existing assignment packets, if any, remain visible according to assignment packet rules only.

Dashboard relevance:

- Vendor Panel setup/onboarding attention.

Notification relevance:

- Invite/resend/cancel notifications may be sent through invitation surfaces.
- No order or packet notifications should be created from invited state alone.

Future analytics relevance:

- Invite conversion, invite aging, panel growth.

### `onboarding`

Meaning:

- Vendor has accepted or is being prepared, but required profile, compliance, coverage, or readiness steps are incomplete.

Who can set it:

- AMC Owner, AMC Admin, Vendor Relationship Manager later, or onboarding workflow later.

Whether assignments can be offered:

- No by default.
- Future controlled pilot work may require explicit override and audit.

Whether existing assignments remain visible:

- Existing packets remain visible if packet access already exists.
- Onboarding state does not create new packet visibility.

Dashboard relevance:

- Vendor Panel readiness queue.

Notification relevance:

- Setup reminders may be appropriate.
- No assignment offer notification unless an explicit offer exists.

Future analytics relevance:

- Onboarding time, readiness blockers, compliance completion rates.

### `active`

Meaning:

- Vendor is in good standing and generally eligible for assignment consideration.

Who can set it:

- AMC Owner, AMC Admin, or Vendor Relationship Manager later.

Whether assignments can be offered:

- Yes, subject to assignment eligibility inputs.

Whether existing assignments remain visible:

- Existing assignment packets remain visible by packet rules.

Dashboard relevance:

- Eligible panel inventory and vendor selection surfaces.

Notification relevance:

- Active state alone should not notify.
- Assignment offers, packet deadlines, messages, and escalations notify according to packet/notification policy.

Future analytics relevance:

- Active panel coverage, acceptance rates, cycle time, SLA reliability, revision trends.

### `limited`

Meaning:

- Vendor is available only for restricted use, specific products, low-risk assignments, limited regions, or capped volume.

Who can set it:

- AMC Owner, AMC Admin, or Vendor Relationship Manager later.

Whether assignments can be offered:

- Yes only when assignment criteria match the limitation.
- Future manual override should require reason and audit.

Whether existing assignments remain visible:

- Existing packets remain visible by packet rules.

Dashboard relevance:

- Vendor selection warning, coverage/capacity planning, panel health.

Notification relevance:

- No notification from limited state alone.
- Notify only when an existing assignment needs action.

Future analytics relevance:

- Limited-use effectiveness, exception rates, coverage gaps.

### `paused`

Meaning:

- Vendor is temporarily unavailable or intentionally held out of new offers.

Who can set it:

- AMC Owner, AMC Admin, Vendor Relationship Manager later, or vendor self-service availability later if productized.

Whether assignments can be offered:

- No for new work by default.
- Manual override later should require reason and audit.

Whether existing assignments remain visible:

- Existing packets remain visible unless separately cancelled, revoked, completed, or otherwise closed.

Dashboard relevance:

- Capacity/coverage gaps and paused-vendor attention.

Notification relevance:

- Optional internal notification when a key vendor is paused.
- Existing packet notifications continue according to packet policy.

Future analytics relevance:

- Availability patterns, panel capacity, coverage volatility.

### `probation`

Meaning:

- Vendor remains on the panel but requires closer monitoring due to quality, communication, compliance, SLA, or operational concerns.

Who can set it:

- AMC Owner, AMC Admin, or Vendor Relationship Manager later.

Whether assignments can be offered:

- Yes only when intentionally selected.
- Future routing should visually flag probation and require coordinator awareness.

Whether existing assignments remain visible:

- Existing packets remain visible by packet rules.

Dashboard relevance:

- Vendor Attention, quality/control review, panel management.

Notification relevance:

- No broad notification from probation state alone.
- Targeted internal attention may be appropriate when paired with active assignment risk.

Future analytics relevance:

- Recovery tracking, revision trends, escalation frequency, later scorecard input.

### `suspended`

Meaning:

- Vendor is blocked from new work because of compliance, quality, relationship, or operational risk.

Who can set it:

- AMC Owner, AMC Admin, or Vendor Relationship Manager later.

Whether assignments can be offered:

- No.

Whether existing assignments remain visible:

- Existing packets remain visible only as needed to complete, close, cancel, revoke, or preserve history.
- Suspension does not erase packet history.

Dashboard relevance:

- Vendor Panel risk attention and reassignment queue when active work exists.

Notification relevance:

- Internal notification may be appropriate when suspension affects active assignments.
- Vendor-facing copy should be safe and specific only when productized.

Future analytics relevance:

- Suspension reasons, reassignment impact, quality/compliance trends.

### `archived`

Meaning:

- Vendor relationship is no longer active for operational use.

Who can set it:

- AMC Owner or AMC Admin; Vendor Relationship Manager later if delegated.

Whether assignments can be offered:

- No.

Whether existing assignments remain visible:

- Historical packets remain visible according to assignment history and retention rules.
- Archived state does not create new visibility.

Dashboard relevance:

- Hidden from active routing by default; available in panel history if needed.

Notification relevance:

- No routine notifications.

Future analytics relevance:

- Churn, panel history, relationship lifecycle analysis.

### `declined`

Meaning:

- Vendor declined the panel invitation or declined participation.

Who can set it:

- Vendor through invitation/relationship flow, or AMC operator when recording an external response.

Whether assignments can be offered:

- No.

Whether existing assignments remain visible:

- Existing packet visibility is governed only by packet history, not declined panel state.

Dashboard relevance:

- Invitation outcome and panel growth reporting; not active routing.

Notification relevance:

- Notify responsible AMC user only when decline requires follow-up.

Future analytics relevance:

- Invite decline rate, decline reasons, panel recruitment effectiveness.

## Assignment Eligibility Doctrine

Assignment eligibility is the decision layer that determines whether Continental may offer a packet to a vendor. Eligibility is not visibility.

Inputs may include:

- Active relationship or approved limited/probation relationship.
- Vendor company type/status.
- Product mode/module access sufficient for packet work.
- Compliance/onboarding status.
- Service area later.
- License/coverage later.
- Workload/capacity later.
- Performance/SLA history later.
- Product/report type fit later.
- Client/lender restrictions later.
- Manual override later.

Eligibility rules:

- Relationship state alone does not grant order visibility.
- Eligibility only determines whether an assignment may be offered.
- Actual assignment packet creation grants scoped packet visibility.
- Packet visibility should include only the fields necessary to complete the packet contract.
- Eligibility failures should use safe internal copy and should not reveal private vendor, client, or architecture details.
- Manual override should be future work and should require reason capture, audit, and clear UI labeling.

Current implementation posture:

- Use current relationship and assignment foundations as prerequisites only.
- Do not add new eligibility storage or route behavior in this planning phase.
- Do not infer canonical order access from eligibility.

Future implementation posture:

- Add explicit, auditable eligibility projection only after vendor profile, compliance, coverage, and assignment packet contracts are stable.
- Keep eligibility diagnostics internal to AMC users.
- Keep vendor-facing copy focused on packet offers and required readiness actions.

## Vendor Profile Doctrine

Future vendor profile concepts:

- Company profile.
- Primary contacts.
- Operational contact information.
- Coverage area.
- License information.
- Specialties/product fit.
- Fee preferences.
- Availability.
- Insurance/compliance documents.
- Service-level expectations.
- Performance metrics later.
- Vendor notes and relationship history for authorized AMC users.

The canonical Vendor Portal profile, availability, readiness, and upgrade doctrine lives in `docs/FALCON_VENDOR_PROFILE_AVAILABILITY_UPGRADE_DOCTRINE.md`.

Current:

- Relationship records and assignment packet foundations exist.
- Vendor companies can receive assignment packet access when explicitly assigned.
- Vendor profile concepts are not yet a complete productized profile system.

Future:

- Safe vendor profile views for AMC-side panel management.
- Vendor self-service profile maintenance where appropriate.
- Coverage/license/compliance readiness indicators.
- Profile completeness queues.
- Vendor-side setup states using vendor-safe language.

Deferred:

- Vendor scoring.
- Vendor marketplace behavior.
- Automated eligibility ranking.
- AI assignment recommendations.
- Billing/fee split preferences as active routing authority.
- Client-visible vendor scorecards.

## Assignment Routing Doctrine

Routing starts manual.

Manual assignment first:

- AMC users should intentionally choose a vendor based on operational context.
- The UI may show safe eligibility hints later.
- The first implementation should avoid hidden ranking or automatic assignment.

Suggested vendors later:

- Suggestions may use coverage, relationship state, workload, service fit, compliance readiness, and historical performance after those inputs are trustworthy.
- Suggestions must explain why a vendor appears.
- Suggestions must not be a black-box score.

Auto-routing deferred:

- Auto-routing should wait until manual routing, packet lifecycle, compliance, vendor profiles, queue/SLA definitions, and visibility boundaries are proven.
- Auto-routing must be auditable and reversible if introduced later.

Reassignment doctrine:

- Reassignment is an AMC owner-side operational decision.
- Reassignment may revoke/cancel one packet and create another.
- Reassignment should preserve assignment-scoped activity history.
- Reassignment must not mutate owner-company appraiser/reviewer/staff columns as if the vendor were internal staff.

Declined assignment handling:

- Vendor decline should move owner-side attention to reassignment or cancellation decisions.
- Decline reasons should be captured safely when available.
- Decline does not expose canonical order history to the vendor.

Non-response handling:

- Non-response should feed Vendor Pending Response, Stalled Vendor, Delivery Risk, or SLA escalation queues as appropriate.
- AMC users may remind, revoke, cancel, or reassign according to policy.
- Client-facing surfaces should not expose vendor non-response mechanics.

Vendor capacity concerns:

- Capacity should be advisory until a formal capacity model exists.
- Capacity concerns should not silently block assignment without explainable copy.
- Future capacity signals should not widen visibility.

Relationship versus assignment lifecycle separation:

- Relationship lifecycle describes whether Continental may consider the vendor for work.
- Assignment lifecycle describes a specific packet of work.
- Order lifecycle describes owner-company operational work.
- These lifecycles may inform each other, but they must not be collapsed into one status field.

## Vendor Dashboard / Panel Dashboard Expectations

AMC-side vendor panel view:

- Active panel list.
- Onboarding and compliance readiness later.
- Paused/suspended/limited/probation indicators.
- Active assignment count.
- Pending offer count.
- Stalled or overdue assignment attention.
- Safe relationship lifecycle actions.
- Vendor profile summary later.

Vendor-side packet view:

- Offered packets.
- Active packets.
- Due soon / overdue packets.
- Corrections requested.
- Submitted/recent packets.
- Packet-scoped activity.
- Packet-scoped notifications.

Future vendor performance/attention widgets:

- Acceptance rate.
- Response time.
- On-time rate.
- Revision frequency.
- Active workload.
- Coverage gaps.
- Escalation frequency.

Dashboard boundaries:

- Vendors do not receive canonical order dashboards.
- Vendors do not see AMC internal review queues.
- Vendors do not see client/lender CRM or unrelated order data.
- AMC panel dashboards should not expose one vendor's private performance to another vendor.
- Clients should not see vendor scorecards, vendor probation/suspension state, or internal assignment routing mechanics initially.

## Guardrails

- Do not write vendors into owner-company appraiser, assigned-to, reviewer, or current-reviewer fields.
- Do not expose client/internal AMC data through the vendor panel.
- Do not treat active panel membership as order access.
- Do not treat relationship status as queue membership by itself.
- Do not build vendor scoring as a subjective black box.
- Do not auto-assign before manual routing is proven.
- Do not expose vendor scorecards to clients initially.
- Do not mix Staff company internal appraisers with AMC external vendors without clear lane separation.
- Do not show canonical `/orders/:orderId` links to assignment-only vendor users.
- Do not expose relationship topology, permission keys, module IDs, RLS, or system predicates in vendor-facing copy.
- Do not use Staff Appraisal order/review language for vendor packet surfaces.
- Do not make vendor panel state a notification source unless an action or escalation is required.

## Future Contributor Checklist

Before implementing vendor panel or assignment eligibility behavior, verify:

- The surface distinguishes panel relationship, assignment eligibility, assignment packet access, and canonical order access.
- Vendor-facing routes open packets, not owner orders.
- Existing packet visibility is preserved when a panel state changes unless packet lifecycle explicitly changes.
- Eligibility failures do not leak client, vendor, system, or authorization internals.
- Manual routing remains the baseline.
- Suggested routing is explainable and optional if introduced.
- Auto-routing remains deferred.
- Vendor profile fields are classified as current, future, or deferred.
- Client-facing surfaces do not expose internal vendor state, scorecards, non-response mechanics, or SLA risk internals.
- Hybrid companies see internal staff work and external network packet work in separate lanes.
