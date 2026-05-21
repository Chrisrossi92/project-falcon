# Falcon Mode Empty States + Upgrade Surfaces

## Purpose

This document defines Falcon's canonical mode-native empty-state and contextual upgrade-prompt blueprint before implementation.

It is planning documentation only. It does not change source code, routes, navigation, dashboard components, command palette behavior, permission seeds, billing logic, onboarding enforcement, company settings, or database migrations.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_MODE_NAV_DASHBOARD_BLUEPRINT.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`

## Core Doctrine

- Empty states should feel native to the selected product mode.
- Empty states should suggest the next natural action, not expose missing modules.
- Upgrade prompts should be contextual, sparse, and tied to real intent.
- Falcon should not create a locked-feature graveyard.
- Hidden modules stay hidden, not disabled.
- Do not tell Vendor or Client users that they do not have access to Staff tools.
- Vendor empty states should talk about assignments and packets, not canonical orders.
- Client empty states should talk about requests, status, documents, reports, and client actions, not workflows, reviews, appraisers, or vendors.
- Staff empty states should focus on creating, importing, assigning, reviewing, and delivering operational work.
- AMC empty states should focus on intake, assignment, vendor panel readiness, client/lender flow, QC, and SLA management.
- Hybrid empty states should keep internal and network lanes separate.
- Relationship state alone grants no operational visibility and should not be described as if it does.
- Empty-state and upgrade-prompt copy should follow the mode-native vocabulary rules in `docs/FALCON_MODE_LANGUAGE_GUIDE.md`.
- Empty states and upgrade prompts should follow the forbidden-pattern and safe-default rules in `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`.

## Empty-State Types

First-run empty state:

- Shown when a mode surface is usable but the company/user has not yet started the relevant workflow.
- Should point to setup or the first natural action.

No-data empty state:

- Shown when the surface has no records in its normal unfiltered state.
- Should describe absence in mode-native terms.

Filtered-empty state:

- Shown when active filters remove otherwise available records.
- Should suggest clearing filters or adjusting criteria.

Permission-limited empty state:

- Shown only when the user can enter a surface but lacks authority for some actions.
- Should explain the current user's available scope without advertising hidden modules.

Relationship/assignment/client-scope empty state:

- Shown when visibility depends on relationship lifecycle, assignment packet access, or client/order portal scope.
- Should describe the scoped access model without implying broader visibility exists.

Setup-needed empty state:

- Shown when a required setup step blocks natural work.
- Should identify the setup step and the permitted next action.

## Upgrade Prompt Rules

Show upgrade prompts only when:

- The user is already in a related enabled workflow.
- The unavailable module clearly extends the current workflow.
- The prompt can be dismissed or ignored without blocking core work.
- The user has a plausible role or permission context to act on the prompt.

Show nothing instead of an upsell when:

- The missing module is intentionally hidden for the product mode.
- The user lacks permission to act and the prompt would be noise.
- The surface is empty because data is outside readable order, client, assignment, or portal scope.
- The prompt would reveal internal concepts to Vendor or Client users.
- The prompt would interrupt an urgent operational action.
- The prompt would appear as a locked nav item, locked dashboard section, or feature catalog.

## Staff Appraisal Mode

First-run empty state:

- "Create your first order, add a client, or invite your team to start operations."
- Primary action can be New Order when `orders.create` is available.
- Secondary action can be Add Client or Invite Team when permitted.

No-data empty state:

- Orders: no orders are active yet.
- Clients: no clients are set up yet.
- Reviews: no orders are waiting for review.
- Calendar: no inspection or due-date events are scheduled.

Filtered-empty state:

- State that no orders match the current filters.
- Offer Clear Filters.
- Do not imply the user lacks access when the result is filter-driven.

Permission-limited empty state:

- Explain the user's current operational scope, such as assigned orders or readable clients.
- Suggest contacting an owner/admin only for company-level setup or role changes.
- Do not show owner-only controls as locked UI.

Relationship/assignment/client-scope empty state:

- If network assignments are enabled, distinguish owned internal orders from assignment packets.
- If client portal is enabled, distinguish internal client records from client-facing access.
- Do not imply Continental AMC Panel participation exposes internal orders to external companies.

Setup-needed empty state:

- Missing clients: add a client before creating client-linked orders.
- Missing assignable users: invite appraisers/reviewers before assignment.
- Missing review setup: configure reviewer/team readiness when review workflows are enabled.

Contextual upgrade surfaces:

- Client Portal from report delivery/client communication context.
- Analytics from trend, reporting, or export context.
- AI Workspace from activity summary or order summarization context.
- Integrations from intake/import/export context.
- Continental AMC Panel from network opportunity context only.

Wording rules:

- Use orders, clients, appraisers, reviewers, due dates, review, revision, delivery.
- Keep copy operational and direct.
- Suggest the next work action first.

What not to say:

- "Unlock AMC tools" in primary order workflows.
- "You do not have vendor portal access."
- "No data because your package is limited."
- "Upgrade to see hidden modules."

What must stay hidden:

- AMC command-center surfaces unless enabled.
- Vendor packet execution unless network modules are enabled.
- Client portal surfaces unless client-facing access is enabled.
- Billing/integration prompts outside related context.

When to show nothing instead of an upsell:

- A user is completing urgent order work.
- The missing feature is unrelated to the current order/client/review task.
- The user lacks authority to evaluate company package changes.

Minimum viable implementation:

- Mode-native empty states for Orders, Clients, Calendar, Reviews, Team Access, and Dashboard widgets.
- Clear filter-empty copy.
- No locked module nav.

Future enhanced implementation:

- Setup-aware checklists.
- Contextual prompts based on repeated workflow patterns.
- Package-aware prompts for owners only.
- AI-assisted empty-state copy suggestions constrained by product doctrine.

## AMC Operations Mode

First-run empty state:

- "Set up client/lender intake, build your vendor panel, and start assigning work."
- Primary action can be Add Client/Lender, Invite Vendor Relationship, or Create Intake Order depending on permissions and enabled modules.

No-data empty state:

- Intake: no orders are waiting for intake.
- Assignments: no vendor offers or active assignments need attention.
- Vendor Panel: no active vendor relationships are available.
- Reviews/QC: no files are waiting for QC.
- SLA: no current SLA exceptions.

Filtered-empty state:

- State that no AMC work matches the current queue, status, vendor, client, or SLA filters.
- Offer Clear Filters or adjust queue criteria.

Permission-limited empty state:

- Explain that the user can see only the AMC queues or client/vendor surfaces assigned to their role.
- Do not expose owner/admin panel controls as locked UI.

Relationship/assignment/client-scope empty state:

- Vendor relationship exists but no assignment is available: say no assignment packets are active for that vendor relationship.
- Client/lender relationship exists but no client orders are visible: say no client orders are currently in scope.
- Never imply relationship existence alone grants order/client visibility.

Setup-needed empty state:

- No vendor panel: create or activate vendor relationships before offering assignments.
- No client/lender flow: configure client/lender intake before operational volume.
- No reviewer/QC readiness: set up reviewer capacity before review queue expansion.

Contextual upgrade surfaces:

- Vendor Portal from vendor assignment and panel workflows.
- Client Portal from client/lender status, report delivery, or request workflows.
- Analytics from SLA, vendor performance, or client performance context.
- Integrations from intake/import/export context.
- AI Workspace from escalation or exception-summary context.

Wording rules:

- Use intake, assignments, vendors, panel, client/lender, SLA, QC, escalation.
- Keep copy queue-command and exception-management oriented.

What not to say:

- "Create your first appraisal shop order" as the AMC first-run action.
- "No Staff tools available."
- "Vendor has access to this order" when only a relationship exists.
- "Unlock client portal" as generic persistent nav copy.

What must stay hidden:

- Staff-only appraisal shop cockpit language where it conflicts with AMC operations.
- Vendor-only packet execution shell for internal AMC users.
- Client-only request/status shell for internal AMC users.
- Package prompts outside client/vendor/intake/analytics context.

When to show nothing instead of an upsell:

- The user is viewing SLA exceptions or urgent assignment follow-up.
- The related module is not enabled and the current role cannot act on package changes.
- The prompt would expose internal vendor/client modules to the wrong user type.

Minimum viable implementation:

- Mode-native empty states for Intake, Assignments, Vendor Panel, Clients/Lenders, Reviews/QC, Calendar/SLA, and Dashboard queues.
- Relationship/assignment-scope empty states that reinforce no visibility from relationships alone.

Future enhanced implementation:

- Setup readiness states for vendor panel and client/lender intake.
- SLA-aware empty-state variants.
- Contextual upgrade prompts for vendor/client portals and integrations.
- Owner-only package prompts tied to measurable workflow need.

## Vendor Portal Mode

First-run empty state:

- "No assignment packets are available yet."
- If profile setup is incomplete, guide the vendor to complete profile readiness.
- If no setup is required, keep the state quiet and assignment-focused.

No-data empty state:

- Offers: no assignment offers are waiting.
- Active work: no assigned packets are in progress.
- Submitted work: no packets have been submitted yet.
- Completed work: no completed packet history is available yet.

Filtered-empty state:

- State that no packets match the current filters.
- Offer Clear Filters.
- Use assignment status and due-date language, not order/client/admin language.

Permission-limited empty state:

- Explain only the current packet scope.
- Do not mention missing Staff, AMC, Client, or internal order permissions.
- Do not render internal controls as locked actions.

Relationship/assignment/client-scope empty state:

- Relationship active but no packet offered: say no packets have been offered or assigned through this relationship.
- Offered packet unavailable: say the offer may no longer be active or visible.
- No canonical order references.

Setup-needed empty state:

- Vendor profile incomplete: complete profile details required for assignments.
- Compliance setup incomplete: complete required vendor readiness steps if such setup exists.
- Calendar/scheduling setup incomplete: connect or confirm scheduling preferences if enabled.

Contextual upgrade surfaces:

- Staff Appraisal Mode only where the vendor is exploring their own internal operations workspace.
- Profile or readiness enhancements only where tied to receiving/completing assignments.

Wording rules:

- Use offers, assignment packets, due dates, submit work, corrections, packet timeline, profile readiness.
- Keep copy direct, limited, and action-oriented.
- Treat the vendor as an external participant, not an internal staff user.

What not to say:

- "No orders found."
- "You do not have access to Staff tools."
- "Ask an admin for order access."
- "Unlock internal order management."
- "Reviewer queue is empty."

What must stay hidden:

- Canonical orders.
- Clients CRM.
- Internal review/QC queues.
- AMC administration.
- Client portal request/status surfaces.
- Internal team operations unless separately enabled for vendor company administration.

When to show nothing instead of an upsell:

- No assignment packets are currently offered or active.
- The vendor lacks any signal of intent to run internal operations.
- A packet is unavailable because of lifecycle/status/scope rules.
- The prompt would reveal internal owner-company concepts.

Minimum viable implementation:

- Packet-native first-run, no-data, filtered-empty, and unavailable-packet states.
- Profile/setup-needed state if vendor readiness is required.
- No Staff/AMC locked surfaces.

Future enhanced implementation:

- Vendor readiness checklist.
- Packet lifecycle-specific empty states.
- Completed packet history empty state.
- Contextual Staff Mode upgrade prompt for vendors with clear internal-ops intent.

## Client Portal Mode

First-run empty state:

- "Submit your first request or check back when orders and documents are shared with you."
- Primary action can be Submit Request when permitted.
- If request creation is not enabled, explain that no shared order status is available yet.

No-data empty state:

- Requests/Orders: no requests or shared orders are available yet.
- Reports/Documents: no delivered reports or documents are available yet.
- Messages/Activity: no client-visible updates are available yet.
- Required actions: nothing needs client action.

Filtered-empty state:

- State that no requests, statuses, reports, or documents match the current filters.
- Offer Clear Filters.
- Do not expose internal statuses as filter explanations.

Permission-limited empty state:

- Explain client-visible scope only.
- If the user can view but not create requests, say request submission is not available for this account.
- Do not mention internal staff/admin roles.

Relationship/assignment/client-scope empty state:

- Client account exists but no orders are shared: say no order status is currently shared with this account.
- Order status unavailable: say this order is not available in the portal.
- Do not mention appraiser, reviewer, vendor assignment, QC, or workflow authority.

Setup-needed empty state:

- Missing client account setup: complete account setup before request submission if required.
- Missing document requirements: upload requested documents only when the request/order asks for them.
- Missing integration setup: show only to client admins in integration context.

Contextual upgrade surfaces:

- Integrations from repeated request/document exchange workflows.
- Analytics/reporting from portfolio/status history context.
- Billing from invoice/payment context only when enabled or package-relevant.
- Advanced reporting from report/document history context.

Wording rules:

- Use request, order status, report, document, action needed, delivered, shared with you.
- Translate internal statuses into client-facing language.
- Keep copy calm, clear, and externally safe.

What not to say:

- "No workflow items."
- "Reviewer queue is empty."
- "No appraiser assigned."
- "You do not have access to Staff tools."
- "Unlock internal order management."
- "Vendor assignment is unavailable."

What must stay hidden:

- Internal order cockpit.
- Appraiser/reviewer queues.
- Vendor assignments.
- Internal lifecycle transitions.
- Clients CRM/admin surfaces.
- Internal activity that is not client-visible.

When to show nothing instead of an upsell:

- The user has no shared orders or reports and request creation is not enabled.
- The user is not a client admin and cannot act on integrations/billing.
- The prompt would reveal internal operations concepts.

Minimum viable implementation:

- Request/status/report/document empty states.
- Filtered-empty copy using client-facing language.
- Permission-limited copy that does not mention Staff/Admin tools.
- No internal workflow terminology.

Future enhanced implementation:

- Request template guidance.
- Document requirement checklists.
- Integration setup states for client admins.
- Portfolio analytics prompts tied to actual usage.

## Hybrid / Ecosystem Mode

First-run empty state:

- Show lane-specific first-run states instead of one generic empty dashboard.
- Internal lane: create/import operational work.
- Network lane: establish relationships or wait for assignment packets.
- Client lane: configure request/status/report sharing if enabled.

No-data empty state:

- Internal Operations: no owned operational work is active.
- Network Work: no assignment packets are offered or active.
- Sent Assignments: no outsourced assignments are active.
- Relationships: no active relationship records are available.
- Client/Portal: no client-facing requests/status/documents are available.

Filtered-empty state:

- Keep filter-empty copy lane-specific.
- Offer Clear Filters for the current lane only.
- Do not imply another lane has missing data.

Permission-limited empty state:

- Explain the user's current lane scope.
- Do not reveal hidden lanes or disabled modules.
- Do not mix internal order permissions with packet permissions.

Relationship/assignment/client-scope empty state:

- Relationship lane: relationship records do not grant order/client visibility.
- Assignment lane: packet visibility comes from assignment packets.
- Client lane: client/order portal scope determines visibility.
- Internal lane: owned/readable orders determine visibility.

Setup-needed empty state:

- Internal lane setup: clients, team, order intake, review readiness.
- Network lane setup: relationships and assignment packet readiness.
- Client lane setup: client-facing request/status/report configuration.
- Admin lane setup: package/company settings only when those modules exist.

Contextual upgrade surfaces:

- AMC module prompts from internal-to-network assignment context.
- Vendor Portal prompts from sent assignment/vendor relationship context.
- Client Portal prompts from client/report/status context.
- Analytics/AI prompts from cross-lane visibility context.
- Integrations prompts from intake/export/handoff context.
- Billing/package prompts only in administration or package-management context.

Wording rules:

- Name the lane first.
- Keep internal, received network, sent network, and client-facing vocabulary distinct.
- Use Staff or AMC language only inside the relevant internal lane.
- Use packet language inside assignment lanes.
- Use request/status/report language inside client-facing lanes.

What not to say:

- "No data in Falcon" when only one lane is empty.
- "Unlock all modules."
- "Relationship grants access."
- "No orders" for packet-only network lanes.
- "No packets" for internal order lanes.

What must stay hidden:

- Modules not explicitly enabled.
- Internal workflow concepts from vendor/client lanes.
- Packet concepts from internal-only lanes.
- Relationship-derived operational data without assignment/client/order scope.
- Persistent locked nav items for optional modules.

When to show nothing instead of an upsell:

- The empty lane is intentionally not part of the company's enabled mode.
- The user is in a lane where the unavailable module would confuse scope.
- The user lacks authority to manage packages/modules.
- The prompt would blend internal and network concepts.

Minimum viable implementation:

- Lane-specific first-run, no-data, filtered-empty, and permission-limited states.
- No cross-lane generic empty dashboard.
- No relationship-as-visibility wording.

Future enhanced implementation:

- Lane setup checklists.
- Cross-lane readiness indicators.
- Owner/admin package prompts scoped to the relevant lane.
- AI summaries that preserve lane boundaries and visibility scope.

## Global Anti-Patterns

- Locked module lists.
- Disabled nav items for hidden modules.
- Generic "you do not have access" language where a mode-native empty state is better.
- Staff/Admin language in Vendor or Client modes.
- Order language in packet-only vendor surfaces.
- Workflow/review language in client-facing surfaces.
- Relationship wording that implies operational visibility.
- Upgrade prompts in urgent execution flows.
- Upsells shown to users who cannot act on package/module changes.

## Minimum Registry Fields

Future empty-state registry entries should include:

- `empty_state_id`
- `module_id`
- Product modes.
- Surface type.
- Empty-state type.
- Required modules.
- Required permissions.
- Scope type, such as order, client, assignment packet, relationship, or portal.
- Trigger condition.
- Headline.
- Body.
- Primary action.
- Secondary action.
- Suppression conditions.
- Optional upgrade prompt reference.

Future upgrade prompt registry entries should include:

- `upgrade_prompt_id`
- Related module.
- Trigger surface.
- Product modes.
- Required current context.
- Required user authority.
- Package/entitlement condition.
- Message.
- Call to action.
- Destination.
- Suppression conditions.

## Validation Checklist

Before implementation, verify:

- Empty states use mode-native vocabulary.
- Empty states suggest a natural next action where one exists.
- Empty states do not expose hidden modules.
- Upgrade prompts are sparse and contextual.
- Vendor states talk about assignments/packets, not canonical orders.
- Client states talk about requests/status/documents, not workflows/reviews.
- Staff states focus on operational work creation/import/assignment/review.
- AMC states focus on intake, assignment, vendor panel, client/lender flow, QC, and SLA.
- Hybrid states preserve lane boundaries.
- Visibility remains scoped by company membership plus readable object, assignment packet, or portal scope.
