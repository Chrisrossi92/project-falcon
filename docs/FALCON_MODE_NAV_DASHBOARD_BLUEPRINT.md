# Falcon Mode Navigation + Dashboard Blueprint

## Purpose

This document defines Falcon's mode-specific dashboard and navigation design blueprint before implementation.

It is planning documentation only. It does not change source code, route configuration, navigation components, dashboard components, command palette behavior, permission seeds, database migrations, billing logic, onboarding UI, or company settings.

Reference docs:

- `docs/FALCON_PRODUCT_MODE_ARCHITECTURE.md`
- `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`
- `docs/FALCON_NAVIGATION_COMPOSITION.md`
- `docs/FALCON_PRODUCT_MODE_IMPLEMENTATION_SLICES.md`
- `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md`
- `docs/FALCON_MODE_LANGUAGE_GUIDE.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`
- `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`
- `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`
- `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`

## Core Doctrine

- Staff Appraisal dashboard remains an operational cockpit.
- AMC Operations dashboard is a network operations and queue command center.
- Continental AMC is the flagship proving ground for AMC dashboard, vendor panel, client/lender, assignment packet, and SLA queue design.
- AMC queue grouping and workflow taxonomy should follow `docs/FALCON_AMC_QUEUE_WORKFLOW_TAXONOMY.md`.
- Vendor Portal dashboard is assigned work packet execution.
- Client Portal dashboard is request, status, document, report, and communication visibility.
- Client Portal dashboard and navigation doctrine should follow `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`.
- Hybrid / Ecosystem dashboard uses separate lanes instead of blending everything.
- Vendor and Client modes must not reuse internal staff/admin order language.
- Hidden modules stay hidden, not disabled.
- Upgrade prompts remain contextual and sparse.
- Assignment-only users should not see canonical order dashboards.
- Client users should not see appraiser, reviewer, vendor assignment, or internal workflow concepts.
- Relationship state alone grants no operational visibility.
- Dashboard widgets and nav entries must still respect readable order, readable client, assignment packet, or portal scope.
- Navigation, dashboard, command palette, empty-state, upgrade-prompt, notification, and activity labels should follow the mode-native vocabulary rules in `docs/FALCON_MODE_LANGUAGE_GUIDE.md`.
- Navigation and dashboard implementation should follow the product-mode UX guardrails and forbidden-pattern checklist in `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`.
- Current dashboard behavior is locked in `docs/FALCON_DASHBOARD_PARITY_AUDIT.md`; review it before any live dashboard shell or widget migration.
- Active dashboard migration must follow `docs/FALCON_ACTIVE_DASHBOARD_MIGRATION_PLAN.md`; preserve Staff/default behavior, assignment-only dashboard safety, and existing data/RPC boundaries before any helper extraction or shell resolution.

## Shared Design Rules

Dashboard shells:

- Each mode gets its own dashboard name, page language, primary question, and section hierarchy.
- Shared widgets may exist internally, but their labels and placement must be mode-native.
- A dashboard should answer the daily operating question before offering analytics, setup, or upgrades.
- Active Staff/default and assignment-only dashboards should remain fallback-safe until a mode-native replacement is explicitly implemented and verified.
- Current-live dashboard registry helpers may describe current behavior, but they must not become product-mode authority, permission authority, route authority, or data-access authority.
- Vendor and Client dashboard shells must remain future-only until route shells, safe projections, and mode-native copy exist.

Navigation:

- Product mode determines the lane structure.
- Enabled modules contribute nav entries.
- Permissions decide whether a user can see or use a nav entry.
- Hidden modules do not render as disabled or locked nav clutter.

Command palette:

- Commands should derive from enabled modules plus permissions.
- Commands should use the current mode's vocabulary.
- Commands should not expose hidden module concepts.
- Dangerous commands should remain explicit and rare.

Empty states:

- Empty states should describe the current mode's operating reality.
- Empty states may suggest setup, a next action, or a sparse contextual upgrade.
- Empty states should never imply the account is broken because another mode's modules are hidden.
- Detailed empty-state and upgrade-prompt wording rules live in `docs/FALCON_MODE_EMPTY_STATES_AND_UPGRADES.md`.

Upgrade prompts:

- Use only where a user has a natural reason to care.
- Keep prompts contextual to the current lane or widget.
- Do not create a locked-feature catalog.

## Staff Appraisal Mode

Dashboard name:

- Staff Operations Dashboard.

Primary daily question:

- What orders need attention today, who owns them, and what is blocking delivery?

Primary dashboard sections:

- Active order attention queue.
- Due soon / overdue orders.
- Appraiser workload.
- Reviewer workload.
- Revision and review bottlenecks.
- Calendar pressure for inspections and delivery.

Secondary dashboard sections:

- Recent operational activity.
- New order intake shortcuts.
- Client/order trend summary if analytics is enabled.
- Team invitation or setup reminders if setup is incomplete.

Default navigation lanes:

- Dashboard.
- Orders.
- Calendar.
- Clients.
- Team Access.
- Reports / Analytics if enabled.
- Settings.

Mobile navigation expectations:

- Prioritize Dashboard, Orders, Calendar, and quick order search.
- Keep Team Access and Settings accessible but secondary.
- Avoid exposing optional modules in the primary mobile tab set unless enabled and commonly used.

Command palette expectations:

- New order.
- Find order.
- Open assigned/review work.
- Add client.
- Invite team member.
- Open calendar.
- Review or transition workflow actions where permitted.

Empty states:

- No active orders: suggest creating an order or importing/intaking work if available.
- No clients: suggest adding the first client.
- No team members: suggest inviting staff when the user has Team Access authority.
- No review work: say there is no review work waiting, not that Review is unavailable.

Upgrade prompt surfaces:

- Client-facing access prompt from client/report delivery context.
- Analytics/reporting prompt from trend or export context.
- AI prompt from activity/order summary context.
- Continental AMC Panel prompt from assignment/network opportunity context only.

Language/tone rules:

- Use internal operations language: orders, appraisers, reviewers, clients, due dates, review, revisions, delivery.
- Keep the tone operational, direct, and work-queue oriented.

What must be hidden:

- AMC panel administration unless AMC/hybrid modules are enabled.
- Vendor packet execution unless vendor/network modules are enabled.
- Client portal shell unless client-facing access is enabled.
- Billing/integrations unless packaged/enabled.

What must not be reused from other modes:

- AMC vendor-panel command center language.
- Vendor packet-only language as the primary dashboard framing.
- Client request/status-only language as the internal staff dashboard.

Minimum viable dashboard:

- Active order queue.
- Due soon / overdue queue.
- Appraiser/reviewer responsibility summary.
- Calendar pressure summary.
- Recent activity.

Future enhanced dashboard:

- Workload/capacity signals.
- Client delivery trends.
- Review cycle analytics.
- AI operational summaries.
- Contextual client portal and reporting prompts.

## AMC Operations Mode

Dashboard name:

- AMC Network Operations Dashboard.

Primary daily question:

- Which client orders need intake, assignment, vendor follow-up, review, or SLA escalation?

Primary dashboard sections:

- Intake / unassigned orders.
- Vendor offer and acceptance queue.
- Active assignment SLA pressure.
- Review / QC queue.
- Client/lender exception queue.
- Vendor follow-up and escalation queue.

Secondary dashboard sections:

- Vendor panel health.
- Relationship lifecycle alerts.
- Client/lender volume summary.
- Integration/import status if integrations are enabled.
- Analytics and performance exceptions if analytics is enabled.

Default navigation lanes:

- AMC Dashboard.
- Orders / Intake.
- Assignments.
- Vendor Panel.
- Clients / Lenders.
- Reviews / QC.
- Calendar / SLA.
- Analytics if enabled.
- Integrations if enabled.
- Settings.

Mobile navigation expectations:

- Prioritize Dashboard, Intake, Assignments, and Reviews / QC.
- Vendor Panel should be reachable quickly for coordinator/vendor-manager roles.
- Keep analytics, integrations, and admin settings secondary on mobile.

Command palette expectations:

- Intake order.
- Find order.
- Offer assignment.
- Find vendor.
- Open relationship.
- Review order.
- Escalate SLA.
- Open client/lender account where permitted.

Empty states:

- No intake: say there are no orders waiting for intake.
- No vendor offers: say there are no offers waiting for vendor response.
- No relationships: guide creating vendor/client relationships if the user has permission.
- No review queue: say no files are awaiting QC/review.

Upgrade prompt surfaces:

- Vendor Portal prompt from vendor assignment and panel workflows.
- Client Portal prompt from client/lender status or report delivery workflows.
- Analytics prompt from vendor/client performance context.
- Integrations prompt from intake/import or client handoff context.

Language/tone rules:

- Use AMC operations language: intake, assignments, vendors, panel, SLA, QC, client/lender, escalation.
- Keep the tone queue-command and exception-management oriented.

What must be hidden:

- Staff-only appraisal shop language where it conflicts with AMC operations.
- Vendor-only packet execution shell for internal AMC users.
- Client-only request/status shell for internal AMC users.
- Internal Staff Mode team/appraiser cockpit assumptions that do not apply to AMC coordinators.

What must not be reused from other modes:

- Staff Appraisal dashboard as the default AMC dashboard.
- Vendor packet execution dashboard for internal AMC coordinators.
- Client portal status dashboard for internal AMC users.

Minimum viable dashboard:

- Intake/unassigned queue.
- Assignment offer/accepted/in-progress summary.
- SLA pressure.
- Review/QC queue.
- Client exception queue.

Future enhanced dashboard:

- Vendor panel performance.
- Client/lender SLA analytics.
- Exception forecasting.
- Integration health.
- AI-assisted escalation summaries.

## Vendor Portal Mode

Canonical blueprint:

- Vendor Portal dashboard and navigation doctrine lives in `docs/FALCON_VENDOR_PORTAL_BLUEPRINT.md`.
- Vendor Portal is assignment-only packet execution, not canonical order operations.

Dashboard name:

- Assignment Packet Dashboard.

Primary daily question:

- Which assigned packets need my response, work, submission, or correction?

Primary dashboard sections:

- Offered packets awaiting accept/decline.
- Accepted work in progress.
- Due soon / expiring packets.
- Submitted packets and correction requests.
- Assignment-scoped activity.

Secondary dashboard sections:

- Vendor profile readiness.
- Calendar/schedule dates if enabled.
- Completed packet history.
- Messages or packet notes where enabled.

Default navigation lanes:

- Dashboard.
- My Assignments.
- Due Soon.
- Revisions.
- Messages / Updates.
- Completed Work.
- Profile / Availability later.
- Settings.

Mobile navigation expectations:

- Prioritize Dashboard and Assignments.
- Packet actions must be reachable without internal order navigation.
- Notifications and Profile / Settings should remain accessible but secondary.

Command palette expectations:

- Open packet.
- Accept offer.
- Decline offer.
- Start work.
- Submit work.
- View assignment timeline.
- Update vendor profile.

Empty states:

- No offered packets: say there are no assignment offers waiting.
- No active packets: say there is no assigned work in progress.
- Profile incomplete: guide profile completion if required for assignment readiness.
- Completed history empty: say no completed packets are available yet.

Upgrade prompt surfaces:

- Staff Appraisal Mode prompt only where a vendor is clearly exploring internal operations tooling.
- No persistent locked Staff/AMC nav or dashboard clutter.

Language/tone rules:

- Use packet language: offers, assigned packets, due dates, submit work, corrections, assignment timeline.
- Do not use canonical internal order cockpit language.
- Do not refer to appraiser/reviewer ownership as internal company workflow responsibility.

What must be hidden:

- Canonical order list and order detail routes.
- Internal clients CRM.
- Team Access for internal company staff management unless separately enabled for vendor company administration.
- AMC panel administration.
- Client portal request/status surfaces.
- Internal workflow transition concepts not exposed through packet actions.

What must not be reused from other modes:

- Staff Appraisal operational cockpit.
- AMC command center.
- Internal review/QC queues.
- Client request/status dashboard.

Minimum viable dashboard:

- Offered packets.
- Active packets.
- Due/expiration indicators.
- Packet action buttons.
- Assignment-scoped activity.

Future enhanced dashboard:

- Vendor profile readiness score.
- Scheduling/calendar coordination.
- Packet performance history.
- Contextual Staff Mode upgrade path.

## Client Portal Mode

Canonical blueprint:

- Client Portal dashboard and navigation doctrine lives in `docs/FALCON_CLIENT_PORTAL_BLUEPRINT.md`.
- Client Portal is request/status/document workspace, not internal order operations, AMC queue operations, or vendor packet execution.

Dashboard name:

- Client Order Status Dashboard.

Primary daily question:

- What is the status of my requested orders, reports, documents, and required actions?

Primary dashboard sections:

- Active requests.
- Waiting on me.
- Recent updates.
- Delivered reports / documents.
- Communication history.

Secondary dashboard sections:

- Submit Request shortcut.
- Completed requests.
- Draft or reusable request templates later.
- Billing / Invoices later.
- Integration/API status if enabled.
- Reporting/analytics summary if enabled.

Default navigation lanes:

- Dashboard.
- Submit Request.
- My Requests.
- Status Updates.
- Documents / Reports.
- Messages / Updates.
- Organization Users later.
- Billing later.
- Settings.

Mobile navigation expectations:

- Prioritize Dashboard, Requests / Orders, and Reports / Documents.
- Client action prompts should be obvious and direct.
- Internal workflow concepts must not appear in mobile tabs or quick actions.

Command palette expectations:

- Submit request.
- Find request/order.
- View status.
- Download report.
- Upload requested document.
- Message operations.
- Manage client settings where permitted.

Empty states:

- No requests: suggest submitting the first request if permitted.
- No delivered reports: say no reports are available yet.
- No required actions: say there is nothing requiring client action.
- No messages/activity: say no client-visible updates are available yet.

Upgrade prompt surfaces:

- Integrations prompt from repeated request or document workflows.
- Analytics/reporting prompt from status/report history context.
- Billing prompt only where billing is enabled or package-relevant.

Language/tone rules:

- Use client-facing language: request, order status, report, document, action needed, delivered.
- Avoid internal operational labels unless translated into client-facing status.
- Do not expose appraiser, reviewer, vendor assignment, QC, or internal lifecycle terms.

What must be hidden:

- Internal order cockpit.
- Appraiser/reviewer queues.
- Vendor assignment and relationship management.
- Vendor packet lifecycle and assignment packet surfaces.
- Clients CRM/admin surfaces.
- Team Access for internal Falcon operators.
- Internal workflow transition controls.
- Internal escalation and SLA queue details.

What must not be reused from other modes:

- Staff Appraisal order cockpit.
- AMC queue command center.
- Vendor packet execution dashboard.
- Internal activity feed language that exposes operational details.

Minimum viable dashboard:

- Request list.
- Status summary.
- Required client actions.
- Delivered reports/documents.
- Client-visible activity/messages.

Future enhanced dashboard:

- Saved request templates.
- Portfolio-level status analytics.
- Integration/API status.
- Billing/invoice summary.
- Advanced reporting exports.

## Hybrid / Ecosystem Mode

Dashboard name:

- Ecosystem Operations Dashboard.

Primary daily question:

- What internal work and network work need attention, and which lane owns the next action?

Primary dashboard sections:

- Internal Operations lane for owned orders and staff work.
- Network Work lane for received assignment packets.
- Sent Assignments lane for outsourced/vendor work.
- Relationship Attention lane.
- Client/Portal lane if client-facing access is enabled.

Secondary dashboard sections:

- Cross-lane attention summary.
- Calendar/SLA summary separated by lane.
- Analytics/AI summaries where enabled.
- Admin/setup prompts where relevant.

Default navigation lanes:

- Internal Operations.
- Network Work.
- Relationships.
- Clients / Portals if enabled.
- Intelligence if analytics, reports, or AI are enabled.
- Administration for settings, billing, integrations, onboarding, and tenant administration where enabled.

Mobile navigation expectations:

- Keep lane switching explicit.
- Prioritize the user's current responsibility lane.
- Do not merge owned order actions and packet actions into one ambiguous mobile list.

Command palette expectations:

- Commands should be lane-aware.
- Owned order commands target canonical order surfaces.
- Packet commands target assignment packet surfaces.
- Relationship commands target relationship lifecycle surfaces.
- Client portal commands target client-facing surfaces only.

Empty states:

- Internal lane empty states should use Staff/AMC internal operations language based on enabled internal modules.
- Network lane empty states should use assignment packet language.
- Relationship lane empty states should explain relationship setup without implying order visibility.
- Client lane empty states should use client-facing request/status/report language.

Upgrade prompt surfaces:

- Lane-specific prompts for AMC, vendor, client, analytics, AI, billing, integrations, or onboarding modules.
- Prompts must explain which lane would expand.

Language/tone rules:

- Use lane labels consistently.
- Keep internal operations, received network work, sent network work, and client-facing work distinct.
- Avoid catch-all dashboards that blend unrelated concepts.

What must be hidden:

- Any module not explicitly enabled.
- Internal Staff/AMC concepts from vendor/client-only lanes.
- Packet concepts from internal-only lanes unless network work is enabled.
- Relationship-derived operational data without explicit assignment/client/order visibility.

What must not be reused from other modes:

- A single Staff dashboard with network widgets bolted on.
- A single AMC dashboard that hides internal staff work.
- A vendor packet dashboard as the whole company dashboard when internal operations are enabled.
- A client portal dashboard as the whole company dashboard when internal operations are enabled.

Minimum viable dashboard:

- Clear internal versus network lane separation.
- Owned order attention if internal operations are enabled.
- Assignment packet attention if network work is enabled.
- Relationship attention without operational data leakage.
- Lane-specific empty states.

Future enhanced dashboard:

- Cross-lane workload analytics.
- SLA and due-date comparison by lane.
- Network performance summaries.
- AI summaries by lane.
- Package-aware lane expansion prompts.

## Global Anti-Reuse Rules

- Do not route assignment-only users to canonical order dashboards.
- Do not show client users appraiser, reviewer, vendor assignment, internal workflow, or QC concepts.
- Do not use Staff Appraisal order cockpit copy for Vendor Portal or Client Portal.
- Do not use AMC command-center copy for Staff Appraisal unless AMC modules are enabled.
- Do not blend Hybrid lanes into a single ambiguous queue.
- Do not show disabled nav for hidden modules.
- Do not make upgrade prompts persistent sidebars or locked menus.
- Do not let relationship state imply operational visibility.

## Design Validation Checklist

Before implementing any dashboard/nav slice, verify:

- The target mode has a named dashboard and primary daily question.
- Primary sections answer that question directly.
- Secondary sections do not overwhelm primary work.
- Default nav lanes match enabled modules.
- Mobile nav preserves the mode's most common daily actions.
- Command palette entries do not expose hidden modules.
- Empty states are mode-native.
- Upgrade prompts are sparse and contextual.
- Hidden modules stay hidden.
- Visibility still depends on readable order, readable client, assignment packet, or portal scope.
