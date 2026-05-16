# Falcon Experience Architecture

## Purpose

Falcon is an operational environment, not just a dashboard.

The product should help appraisal teams understand what matters, who needs to act, and what is at risk without forcing users to mentally assemble the state of the business from disconnected tables, cards, and notifications.

Falcon should reduce cognitive friction. It should prioritize attention, not maximize information density. The goal is not to show every possible metric at once. The goal is to create operational calm: a user should open Falcon and quickly understand what needs attention, what work belongs to them, and what can safely wait.

This experience architecture defines how Falcon should adapt operationally to different user roles while preserving a coherent information hierarchy across the product.

## Core Philosophy

### Operational Calm

Operational calm means the interface feels controlled, legible, and purposeful even when the underlying workload is complex.

Falcon should avoid turning urgency into visual noise. Late work, blocked work, and overloaded people should be visible, but not chaotic. Calm does not mean passive. It means the product is clear about priority and confident about what it is asking the user to do next.

### Layered Attention Architecture

Falcon should organize information by attention level:

- Immediate attention: what needs action or awareness now.
- Active work: the current workload and next expected steps.
- Context and analytics: supporting information, trends, and deeper operational understanding.

Users should not have to scan every table or KPI to discover risk. The system should progressively disclose detail as the user moves from alert to worklist to order record.

### Deterministic Operational Intelligence

Operational intelligence should start with deterministic rules that can be explained from order data, workflow status, due dates, assignments, and workload.

The product should be able to answer: why is this order in this queue?

Before AI-assisted scoring or prediction, Falcon needs trustworthy deterministic foundations.

### Explainable Urgency

Urgency should always have a reason.

An order is not urgent because a card is red. It is urgent because it is overdue, due soon, blocked in review, missing assignment, or cycling through revisions. Falcon should expose that reasoning directly enough that users trust the queue.

### Role-Native Experiences

Different roles do not need the same dashboard with different permissions. They need experiences shaped around their operational responsibilities.

An appraiser needs clarity around assigned work and next deliverables. A reviewer needs review throughput and revision loops. Admins need queue control, assignment health, and delivery risk. Owners need operational confidence, bottlenecks, and business-level signal.

### Information Hierarchy Over Information Quantity

More data is not automatically more useful.

Falcon should prefer a smaller number of high-signal surfaces over dense walls of metrics. Information hierarchy should make the first screen useful, not exhaustive.

## Workflow Status vs Operational Intelligence

Workflow statuses are canonical lifecycle state.

Examples:

- `new`
- `in_progress`
- `in_review`
- `needs_revisions`
- `review_cleared`
- `pending_final_approval`
- `ready_for_client`
- `completed`

Statuses answer: where is this order in the formal lifecycle?

Operational intelligence is derived context.

Examples:

- Due Soon
- Overdue
- Waiting on Reviewer
- Waiting on Appraiser
- Revision Loop Risk
- Reviewer Overload

Operational intelligence answers: why should someone look at this now?

Users should feel guided, not overloaded. The interface should avoid making users infer urgency solely from raw status values. Status is the foundation; queues and intelligence are the operational layer above it.

## Falcon Experience Layers

### Core Operational Engine

The core operational engine is the shared foundation.

It includes:

- Canonical workflow statuses.
- Backend-enforced workflow transitions.
- Permission and responsibility rules.
- Activity history.
- Notifications.
- Operational queue evaluation.
- Deterministic risk and urgency logic.

This layer should be consistent across all roles and companies.

### Experience Templates

Experience templates adapt the product to the user's role.

They determine:

- Which attention surfaces appear first.
- Which queues matter most.
- Which actions are promoted.
- Which analytics are secondary.
- Which language and labels fit the user's job.

Templates should be curated, not endlessly configurable.

### Company Configuration

Company configuration should tune the experience without breaking the core model.

Examples:

- Due-soon windows.
- Reviewer/appraiser workload thresholds.
- Final approval policy.
- Notification preferences.
- Queue visibility.
- Operational presets by company type or size.

Configuration should adjust thresholds and modules, not create a different product for every company.

## Role Experience Templates

### Appraiser

Primary concerns:

- What work is assigned to me?
- What is due soon?
- What needs revision?
- What needs to be submitted to review?
- What inspections or report tasks are next?

Ideal dashboard focus:

- My active orders.
- Due soon and overdue work.
- Waiting on appraiser queue.
- Inspection complete / report not started.
- Needs revisions.

What should be emphasized:

- Next action per order.
- Due dates and delivery pressure.
- Revision notes and review feedback.
- Inspection and report progress.

What should be de-emphasized:

- Company-wide analytics.
- Reviewer workload.
- Owner-level business metrics.
- Dense admin controls.

Emotional/product goal:

The appraiser should feel oriented and in control of their assigned work.

Operational goals:

- Reduce missed deadlines.
- Reduce uncertainty around next action.
- Speed up report submission and revision cycles.
- Keep appraiser focus on work they can directly move.

### Reviewer

Primary concerns:

- What needs review now?
- Which orders are close to client delivery risk?
- Which appraisers need revision feedback?
- Where are review loops forming?

Ideal dashboard focus:

- Waiting on reviewer.
- Due soon review work.
- Revision loop risk.
- Review queue ordered by urgency.
- Recently cleared or sent-back work.

What should be emphasized:

- Review priority.
- Appraiser handoff context.
- Revision history.
- Technical clearance state.

What should be de-emphasized:

- Full company revenue or executive KPIs.
- Appraiser-only production tasks not ready for review.
- Delivery operations after review is cleared, unless company configuration assigns that responsibility.

Emotional/product goal:

The reviewer should feel that review work is organized, fair, and easy to triage.

Operational goals:

- Reduce review bottlenecks.
- Improve quality of revision feedback.
- Prevent late-stage delivery surprises.
- Keep technical review separate from client delivery unless configured otherwise.

### Admin / Operations

Primary concerns:

- What is late or about to be late?
- Which orders are blocked?
- Who needs assignment or reassignment?
- Where is workload uneven?
- Which handoffs need attention?

Ideal dashboard focus:

- Operational queues above raw KPIs.
- Due soon and overdue.
- Unassigned orders.
- Waiting on appraiser/reviewer.
- Final approval and ready for delivery.
- Workload balancing signals.

What should be emphasized:

- Queue counts with explainable urgency.
- Assignment gaps.
- Bottlenecks.
- Delivery risk.
- Fast access to order actions.

What should be de-emphasized:

- Vanity metrics.
- Raw totals without action context.
- Deep analytics before immediate operational risks are visible.

Emotional/product goal:

The admin should feel like Falcon is an operations control room that is calm, precise, and actionable.

Operational goals:

- Keep orders moving.
- Prevent deadline misses.
- Balance assignments.
- Reduce manual status chasing.
- Preserve visibility across the whole workflow.

### Owner / Executive

Primary concerns:

- Is the operation healthy?
- Where are bottlenecks?
- Are clients at risk?
- Is capacity balanced?
- Which issues require intervention?

Ideal dashboard focus:

- High-level operational health.
- Overdue and delivery risk.
- Workload balance.
- Revision loop risk.
- Trend and capacity signals.

What should be emphasized:

- Exceptions and trends.
- Business risk.
- Team capacity.
- Client-facing delivery confidence.

What should be de-emphasized:

- Per-order production detail unless drilling in.
- Repetitive task controls.
- Low-level table density as the first experience.

Emotional/product goal:

The owner should feel confident that Falcon is surfacing the right issues before they become business problems.

Operational goals:

- Identify bottlenecks early.
- Improve client reliability.
- Support staffing and assignment decisions.
- Understand operational performance without micromanaging every order.

## Dashboard Information Hierarchy

### Immediate Attention Layer

This belongs above the fold.

It should include:

- Critical operational queues.
- Due soon and overdue work.
- Blocked or unassigned orders.
- Final approval or delivery queues where applicable.
- Role-specific next-action prompts.

The immediate layer should answer: what needs attention right now?

### Active Work Layer

This is the main working surface.

It should include:

- Active order table.
- Role-specific filters.
- Smart actions.
- Calendar or due-date context.
- Queue-filtered worklists.

The active work layer should answer: what work am I responsible for moving?

### Context / Analytics Layer

This should remain secondary unless the user's role is explicitly executive or analytical.

It can include:

- Workload trends.
- Throughput.
- Revision rates.
- Capacity history.
- Delivery performance.
- Client or appraiser performance indicators.

The context layer should answer: what is happening over time, and what should we improve?

### Why KPI Overload Is Dangerous

KPI overload makes users feel informed while still leaving them unsure what to do.

Too many cards create equal visual weight for unequal operational importance. A dashboard with ten metrics can be less useful than three clear queues and one focused worklist.

Falcon should avoid using KPIs as decoration. Every first-screen metric should either guide attention, trigger action, or support a decision.

## Motion / Visual Philosophy

### Subtle Purposeful Motion

Motion should clarify state changes, not entertain.

Use motion for:

- Expanding detail.
- Confirming action.
- Drawing attention to newly changed state.
- Smoothing transitions between layers.

Avoid motion that competes with operational focus.

### Calm Competence

Falcon should look capable, restrained, and reliable.

The interface should communicate that high-volume operational work can be managed without panic.

### Restrained Animation

Animation should be short, subtle, and functional.

Avoid:

- Constant movement.
- Decorative animation loops.
- Overly playful transitions.
- Alert effects that make the product feel chaotic.

### Spacing Rhythm

Spacing should create scan paths.

Use consistent vertical rhythm between:

- Attention cards.
- Worklists.
- Calendar blocks.
- Detail panels.

Spacing should help users understand hierarchy without needing heavy borders or visual noise.

### Surface Hierarchy

Surfaces should have clear roles:

- Primary work surfaces: tables, queues, calendar.
- Supporting surfaces: summary cards, filters, context panels.
- Temporary surfaces: drawers, modals, confirmations.

Avoid stacking too many card-like containers inside other cards.

### Visual Weight Hierarchy

Visual weight should match operational importance.

Critical attention should be visible, but not alarming by default. Routine counts should be quiet. Destructive or urgent actions should have clear but controlled emphasis.

## Calendar Surfaces

Calendar surfaces have distinct jobs.

The dashboard calendar is the operational pressure snapshot. It should show near-term site visits, review handoffs, and client due dates as part of the daily cockpit, supporting Operational Attention and the Active Worklist without becoming a generic calendar app.

The standalone `/calendar` surface is the operational scheduling workspace. It should support fuller planning across the active workload with richer order context, role-aware event rendering, restrained filters, and calm scheduling language.

Locked calendar direction:

- `/calendar` is framed as Operational Schedule / Scheduling Workspace.
- Dashboard and standalone calendars share event normalization where safe.
- Month view uses operational event chips instead of emoji-first generic event buttons.
- Event shape carries order number, client, status, ownership, address, source field, and timing context where available.
- Dashboard Month mode uses the same event normalization and click-through behavior while remaining a pressure snapshot; standalone `/calendar` owns fuller scheduling workspace context.
- Standalone `/calendar` includes selected-day context: month and two-week day cells can update a right rail with event count, Site / Review / Final counts, grouped event lists, and order/client/address/status/ownership context where available.
- Event chip order navigation remains preserved; the right rail is contextual scheduling support, not analytics/KPI reporting.
- Standalone `/calendar` uses operational Lens controls as the primary filter model: All, My Work, Site Visits, Review Handoffs, and Client Due. Visible Signals controls are removed, and the legend explains chip meaning rather than filter state.
- Scheduling intelligence is currently deterministic metadata, not prediction: normalized events support `operationalSignals` for missing site visit, review compression, appraiser unassigned, and reviewer unassigned. The right rail shows quiet per-event and selected-day operational notes while calendar grid cells and chips remain uncluttered.

Future calendar depth should arrive in layers: deterministic unassigned/at-risk lenses, conflict and workload metadata, then drag/drop or direct schedule editing after permissions and event model stability.

## Productization Philosophy

### Curated Experiences Over Infinite Customization

Falcon should not become a blank dashboard builder.

Companies need flexibility, but most operational teams benefit from thoughtful defaults. Curated role experiences should cover the majority of use cases, with configuration used to tune thresholds, policies, and modules.

### Modular Capability Architecture

Falcon should be built from modular capabilities:

- Workflow enforcement.
- Operational queues.
- Smart actions.
- Calendar.
- Notifications.
- Activity history.
- Assignments.
- Reporting.

Modules should compose into role-native experiences without requiring each company to design its own interface from scratch.

### Scalable Simplicity

The product should grow without feeling heavier.

As Falcon adds intelligence, automation, analytics, and configuration, the first screen should remain calm. Complexity should live behind clear drill-down paths and configuration layers.

### As Much Or As Little As They Need

Different companies and roles need different levels of sophistication.

Falcon should support:

- Simple teams that need assignment, status, and due-date clarity.
- Growing teams that need workload balancing and queues.
- Mature operations that need analytics, presets, and predictive risk.

The product should reveal capability as needed rather than forcing every team into the most complex version.

## Future Direction

### Intelligent Queues

Operational queues should evolve from deterministic rules into richer intelligence, while preserving explainability.

Future queues may consider:

- Historical cycle time.
- Repeated revision patterns.
- Client urgency.
- Appraiser workload.
- Reviewer capacity.
- Due-date compression.

### Workload Balancing

Falcon should help admins assign work based on capacity, specialization, location, due dates, and current backlog.

The product should eventually answer:

- Who can take this order?
- Who is overloaded?
- Which assignment creates delivery risk?
- Which reassignment would reduce bottlenecks?

### AI-Assisted Operational Insights

AI should assist with interpretation, not replace deterministic workflow logic.

Useful future examples:

- Summarize why an order is at risk.
- Explain a revision loop.
- Suggest next best action.
- Draft client update language.
- Identify unusual workflow delays.

AI outputs should cite observable factors and remain subordinate to audited workflow state.

### Predictive Risk Systems

Predictive systems can help Falcon identify risks earlier:

- SLA breach prediction.
- Delivery confidence.
- Revision probability.
- Capacity stress.
- Client escalation risk.

Predictions should be treated as decision support, not hidden automation.

### Customizable Workspace Modules

Future workspaces can allow teams to choose which modules are visible:

- Queues.
- Calendar.
- My work.
- Review work.
- Assignment planning.
- Analytics.
- Client risk.

Customization should be bounded by curated templates so the experience remains coherent.

### Company-Level Operational Presets

Company presets can adapt Falcon to different operating models:

- Small appraisal shop.
- Reviewer-led operation.
- Admin-led operation.
- High-volume AMC-style workflow.
- Owner-approval workflow.

Presets should configure thresholds, queue visibility, approval policy, notification defaults, and dashboard emphasis while preserving the same core operational engine.
