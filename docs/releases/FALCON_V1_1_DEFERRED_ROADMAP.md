# Falcon V1.1 Deferred Roadmap

## Purpose

This is a living roadmap for ideas and features intentionally deferred during Falcon V1 RC1 stabilization and internal pilot preparation.

These items are not promises, commitments, or scheduled delivery scope. They were kept out of RC1 to protect release-candidate stability, preserve office pilot focus, and avoid introducing new architecture while the V1 operational surface is being validated.

## Release Reference

- RC1 release doc: [FALCON_V1_RC1.md](./FALCON_V1_RC1.md)
- Production URL: https://continentalres.com
- Git tag reference: `falcon-v1-rc1`
- Pilot users: Abby, Kady, Chris

V2 architecture work is paused during pilot stabilization. Only V1 blockers, security issues, hosted deployment issues, notification/email failures, and small tester-reported user-facing fixes should interrupt the RC1 pilot.

## Evaluation Model

Each deferred item should be revisited after pilot feedback with:

- summary
- business value
- why deferred
- pilot feedback dependency
- estimated complexity/risk
- likely target phase

## Workflow Enhancements

### Second Appraiser Workflow

- Summary: Support assigning, tracking, and compensating a second appraiser or assistant appraiser on an order.
- Business value: Matches more complex production staffing patterns and supports shared field/report work.
- Why deferred: RC1 assignment flows were stabilized around one primary appraiser to avoid introducing new lifecycle, fee, notification, and print-packet complexity.
- Pilot feedback dependency: Validate how often real office orders need a second appraiser, what responsibilities differ, and whether this is assignment, collaboration, or fee-only tracking.
- Estimated complexity/risk: High. Touches data model, assignment UI, fee handling, notification routing, reports, and print packet.
- Likely target phase: V2.

### Inspection-Only / Trip-Fee Support

- Summary: First-class workflow treatment for inspection-only work, trip fees, and non-standard product outcomes.
- Business value: Reduces awkward order handling for partial assignments, field-only services, and fee-only events.
- Why deferred: RC1 added report/product options for `Trip Fee` and related V1 labels but avoided custom lifecycle branching.
- Pilot feedback dependency: Determine whether these are standalone orders, report/product types, billing events, or exceptions on standard orders.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.1.

### Expanded Fee Split Handling

- Summary: Add richer handling for appraiser split percent, base fee, appraiser fee, second appraiser fees, and exception cases.
- Business value: Improves billing accuracy and reduces manual reconciliation.
- Why deferred: RC1 confirmed owner/admin editability for core fee fields but avoided second-appraiser and complex split modeling.
- Pilot feedback dependency: Gather real examples of fee edge cases, overrides, and how office staff expect totals to reconcile.
- Estimated complexity/risk: Medium to high.
- Likely target phase: V1.x / V2.

### Richer Assignment Lifecycle Controls

- Summary: Add explicit assignment accept/decline, reassignment reasons, assignment status history, and deeper assignment state transitions.
- Business value: Makes assignment accountability clearer and reduces ambiguity around work ownership.
- Why deferred: RC1 focused on reliable assign/reassign display, notification, and dedupe behavior.
- Pilot feedback dependency: Confirm whether current assignment edits are enough for internal use or if staff need explicit acceptance and reason tracking.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.1 / V1.x.

## Communication Enhancements

### @mentions In Activity

- Summary: Let users mention teammates in order activity notes and trigger targeted notifications.
- Business value: Improves collaboration and directs attention without leaving Falcon.
- Why deferred: Mention parsing, identity resolution, notification semantics, and permissions add new interaction complexity.
- Pilot feedback dependency: Validate whether activity notes become the primary collaboration surface during pilot.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.1.

### Reply-To-Email Activity Logging

- Summary: Capture replies to notification emails and append them to order activity.
- Business value: Keeps off-app communication attached to the order record.
- Why deferred: Requires inbound email routing, sender identity matching, threading, spam/error handling, and audit rules.
- Pilot feedback dependency: Confirm whether users reply to Falcon emails in practice and which replies should become activity.
- Estimated complexity/risk: High.
- Likely target phase: V2.

### Editable Email Templates

- Summary: Allow owner/admin users to edit transactional email text and possibly template variants.
- Business value: Lets offices tailor tone, instructions, and customer-facing language.
- Why deferred: RC1 email templates were stabilized in code to reduce delivery risk and avoid template governance problems.
- Pilot feedback dependency: Gather actual wording changes requested by office staff before exposing template administration.
- Estimated complexity/risk: Medium to high.
- Likely target phase: V1.x / V2.

### Admin Notification Controls

- Summary: Add deeper owner/admin controls for notification policies, channel locks, and defaults.
- Business value: Allows office leadership to tune notification noise and enforce required alerts.
- Why deferred: RC1 shipped policy/default/lock mechanics but avoided a broad admin management surface.
- Pilot feedback dependency: Identify which notification controls are actually needed after real pilot usage.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.1 / V1.x.

### Reminder Automation

- Summary: Automated reminders for due dates, upcoming site visits, pending reviews, missing documents, and stalled orders.
- Business value: Reduces manual follow-up and helps prevent missed deadlines.
- Why deferred: Reminder timing, channel preferences, and escalation rules require real operational tuning.
- Pilot feedback dependency: Determine which reminders are useful versus noisy in the office workflow.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.x.

### Overdue Escalation Workflows

- Summary: Escalate overdue review/final/site-visit milestones to managers, owners, or designated roles.
- Business value: Makes deadline risk visible before it affects clients.
- Why deferred: Escalation chains and severity rules need pilot evidence to avoid false alarms.
- Pilot feedback dependency: Observe which overdue states matter and who should be notified.
- Estimated complexity/risk: Medium to high.
- Likely target phase: V1.x / V2.

### Richer Branded Email Assets / Logos

- Summary: Add stable logos, richer branding, and possibly role-specific email visual treatment.
- Business value: Improves professionalism of external and staff-facing emails.
- Why deferred: RC1 intentionally avoided image dependencies until stable asset URLs and email-client behavior are verified.
- Pilot feedback dependency: Confirm whether email polish materially matters during internal pilot and which brand assets are approved.
- Estimated complexity/risk: Low to medium.
- Likely target phase: V1.1.

## Taxonomy / Admin Controls

### Owner-Configurable Property Type Lists

- Summary: Let owners/admins manage property type options instead of relying on hardcoded V1 lists.
- Business value: Supports office-specific appraisal categories and future market expansion.
- Why deferred: RC1 used a hardcoded appraisal-office list to keep forms stable and avoid admin taxonomy architecture.
- Pilot feedback dependency: Identify which property types are missing, unused, or confusing during real order entry.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.x.

### Owner-Configurable Report/Product Types

- Summary: Let owners/admins manage report/product type options.
- Business value: Supports office product catalogs, billing distinctions, and non-standard services.
- Why deferred: RC1 used a hardcoded V1 list and preserved legacy display compatibility.
- Pilot feedback dependency: Validate whether current product types match actual office use and billing/reporting needs.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.x.

### Configurable Statuses / Categories

- Summary: Allow configuration of statuses, categories, and possibly lifecycle labels.
- Business value: Helps Falcon adapt to different offices without code changes.
- Why deferred: Status/lifecycle semantics are central to workflows, notifications, dashboards, and reporting.
- Pilot feedback dependency: Determine whether current V1 statuses represent office reality before making them configurable.
- Estimated complexity/risk: High.
- Likely target phase: V2.

## Reporting / Business Intelligence

### Bid Tracker

- Summary: Track bids, outcomes, won/lost reasons, pricing, and related client context.
- Business value: Improves sales visibility and helps forecast future appraisal work.
- Why deferred: Explicitly kept out of RC1 to protect the operational order workflow.
- Pilot feedback dependency: Understand whether bid tracking should be lightweight or a dedicated workflow.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.1.

### Close-Rate Analytics

- Summary: Measure bid/order conversion rates by client, product type, market, and staff.
- Business value: Supports pricing strategy and business development decisions.
- Why deferred: Depends on reliable bid and outcome data not present in RC1.
- Pilot feedback dependency: Define what counts as opportunity, quote, bid, won, lost, or no-response.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.x.

### Client Pricing Trends

- Summary: Analyze pricing by client, property type, report/product type, geography, appraiser, and time period.
- Business value: Helps owners spot underpriced work and client profitability patterns.
- Why deferred: Requires stable fee data and reporting requirements from actual use.
- Pilot feedback dependency: Confirm which fee fields staff trust and what comparisons matter.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.x.

### Operational KPI Dashboards

- Summary: Dashboards for order volume, cycle time, overdue work, review bottlenecks, and completion throughput.
- Business value: Gives leadership visibility into office performance and workload health.
- Why deferred: RC1 prioritized workflow correctness over analytics breadth.
- Pilot feedback dependency: Identify the few KPIs office staff actually use weekly.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.1 / V1.x.

### Workload Analytics

- Summary: Analyze appraiser/reviewer workload, capacity, due pressure, and assignment balance.
- Business value: Improves staffing decisions and reduces bottlenecks.
- Why deferred: Needs validated assignment and completion patterns from real pilot usage.
- Pilot feedback dependency: Determine whether workload should be based on active orders, due dates, site visits, fee volume, or review burden.
- Estimated complexity/risk: Medium to high.
- Likely target phase: V1.x.

## Mobile / UX

### PWA Polish

- Summary: Improve installability, offline posture, icons, splash behavior, and mobile browser polish.
- Business value: Makes Falcon easier to use from phones/tablets without native app investment.
- Why deferred: RC1 focused on core hosted desktop/tablet workflow stability.
- Pilot feedback dependency: Determine how often internal users rely on mobile during real work.
- Estimated complexity/risk: Low to medium.
- Likely target phase: V1.1.

### Mobile Workflow Optimization

- Summary: Improve mobile ergonomics for order detail, notes, assignments, print/download, and quick actions.
- Business value: Supports staff who check or update orders away from a desk.
- Why deferred: Mobile polish can sprawl quickly and should be guided by pilot usage.
- Pilot feedback dependency: Identify the most common mobile tasks and pain points.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.x.

### Eventual Native / Mobile Companion App

- Summary: Explore a native or companion mobile app for field use and quick updates.
- Business value: Could improve field workflows, notifications, photo capture, and offline resilience.
- Why deferred: Native/mobile architecture is outside V1 stabilization and needs a validated mobile workflow first.
- Pilot feedback dependency: Confirm that mobile demand exceeds what a polished PWA can satisfy.
- Estimated complexity/risk: High.
- Likely target phase: V2.

### Photo Upload Enhancements

- Summary: Improve field photo upload, categorization, thumbnails, metadata, and document readiness integration.
- Business value: Better supports inspection and workfile evidence collection.
- Why deferred: RC1 document metadata/listing was stabilized without expanding media-heavy workflows.
- Pilot feedback dependency: Determine whether photo capture happens inside Falcon or remains outside the app.
- Estimated complexity/risk: Medium.
- Likely target phase: V1.x.

## Portal / Multi-Tenant Expansion

### Client / Vendor Portal Expansion

- Summary: Expand client and vendor-facing portals beyond suppressed V1 surfaces.
- Business value: Enables external collaboration, status visibility, document delivery, and request intake.
- Why deferred: RC1 is an internal staff pilot; external-facing portal behavior requires more governance and polish.
- Pilot feedback dependency: Identify which external workflows are safe and valuable to expose first.
- Estimated complexity/risk: High.
- Likely target phase: V2.

### AMC / Staff-Model Separation Evolution

- Summary: Refine Falcon behavior for AMC workflows versus internal staff appraisal office workflows.
- Business value: Keeps Falcon adaptable to different operating models without confusing V1 users.
- Why deferred: RC1 deliberately focuses on the internal Continental staff workflow.
- Pilot feedback dependency: Observe which AMC concepts remain useful and which should stay suppressed for staff mode.
- Estimated complexity/risk: High.
- Likely target phase: V2.

### Deeper Multi-Company Support

- Summary: Expand multi-company behavior, company switching, tenant administration, and cross-company safety.
- Business value: Supports broader deployment models and future multi-tenant productization.
- Why deferred: V1 compatibility and current-company foundations exist, but deeper multi-tenant UX is outside RC1.
- Pilot feedback dependency: Confirm whether near-term use remains single-office or needs multi-company operations.
- Estimated complexity/risk: High.
- Likely target phase: V2.

## Pilot Feedback Queue

Reserved for Abby, Kady, and Chris feedback during the internal pilot.

| Date | Reporter | Area | Feedback | Severity | Decision | Target |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | Abby | TBD | TBD | TBD | TBD | TBD |
| TBD | Kady | TBD | TBD | TBD | TBD | TBD |
| TBD | Chris | TBD | TBD | TBD | TBD | TBD |

## Roadmap Governance

- Do not start V2 architecture work during RC1 pilot stabilization.
- Keep V1.1 candidates small, pilot-validated, and test-backed.
- Promote an item only when business value is clear and the pilot has produced concrete evidence.
- Treat this document as a triage aid, not a delivery contract.
