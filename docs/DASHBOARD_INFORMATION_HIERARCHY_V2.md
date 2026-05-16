# Dashboard Information Hierarchy V2

## Purpose

Falcon's dashboard is an operational cockpit.

It is not a report page, a KPI wall, or a decorative landing screen. It is a sustained working environment where appraisers, reviewers, admins, and owners return throughout the day to understand what needs attention, what work belongs to them, and what risks are emerging.

The dashboard must guide attention. It should reduce operational anxiety by making priorities obvious, explaining urgency, and separating immediate work from supporting context. A user should not need to scroll through dense metrics or mentally assemble workflow state from disconnected sections before knowing what to do next.

The dashboard should create calm competence: the feeling that the operation is visible, controlled, and actionable.

## Core Dashboard Principles

### Operational Calm

Operational calm means the dashboard remains legible and composed even when the business is busy.

Late work, blocked work, and urgent handoffs should be visible without making the interface feel frantic. Falcon should communicate seriousness through hierarchy and clarity, not visual panic.

### Attention Hierarchy

The dashboard should make importance visible.

Immediate risks and next actions belong above routine context. Active work belongs before analytics. Supporting metrics should not compete visually with urgent operational queues.

### Progressive Disclosure

The dashboard should reveal detail in layers.

Users should see the highest-signal state first, then drill into queues, order rows, calendar context, and analytics as needed. The first screen should orient; deeper surfaces should explain.

### High Signal / Low Noise

Every above-the-fold surface should earn its space.

If a card, chart, or table does not help a user decide what to do, it should be moved lower, collapsed, or removed from the default dashboard experience.

### Urgency Over Density

The dashboard should prioritize urgent work over dense information.

More data can make the product feel powerful while making the user less effective. Falcon should avoid equal-weight metric grids that make overdue orders, routine counts, and low-priority analytics feel equally important.

### Action-Oriented Visibility

Visibility should lead to action.

Queues, cards, and order rows should help users answer:

- What is happening?
- Why does it matter?
- Who owns it?
- What can I do next?

### Calm Competence

The dashboard should feel premium, restrained, and operationally mature.

It should not feel like an analytics toy, a command center caricature, or a dense enterprise admin screen. It should feel like serious work can be managed clearly.

## Dashboard Layer Structure

### Immediate Attention Layer

Purpose:

Surface the small set of issues that need attention now.

Visual priority:

Highest. This layer belongs near the top of the dashboard and should be visible without deep scrolling on common desktop viewports.

What belongs there:

- Critical operational queues.
- Overdue orders.
- Due soon orders.
- Blocked orders.
- Unassigned work.
- Final approval or ready-for-delivery queues when relevant.
- Role-specific next-action prompts.

What should not belong there:

- Low-priority analytics.
- Decorative metrics.
- Broad lifetime totals without action context.
- Dense charts.
- Secondary historical reporting.

Emotional/operational goal:

The user should immediately feel oriented. They should know what deserves attention before scanning the rest of the page.

### Active Work Layer

Purpose:

Provide the main working surface for the user's active orders and responsibilities.

Visual priority:

High. This layer should appear close to the attention layer and should be easy to reach without feeling buried beneath metrics.

What belongs there:

- Active orders table.
- Queue-filtered worklists.
- Role-specific filters.
- Smart actions.
- Due-date indicators.
- Assignment and handoff context.

What should not belong there:

- All historical orders by default.
- Deep analytics.
- Configuration controls.
- Low-signal columns that reduce scanability.

Emotional/operational goal:

The user should feel that their work is organized and actionable. The active work layer should answer: what can I move forward right now?

### Context / Analytics Layer

Purpose:

Support operational decisions with trend, workload, and performance context.

Visual priority:

Secondary by default. Analytics should be available, but not compete with urgent work unless the user's role is owner/executive or the analytic signal is itself urgent.

What belongs there:

- Workload distribution.
- Throughput trends.
- Revision rates.
- Delivery performance.
- Capacity history.
- Client or appraiser performance indicators.
- Predictive risk summaries when mature.

What should not belong there:

- Required next actions.
- Critical alerts that need immediate attention.
- Primary workflow controls.

Emotional/operational goal:

The user should gain confidence and context without being distracted from the work that needs action.

## Above-the-Fold Philosophy

Above the fold, users should immediately understand:

- What needs attention now.
- What is due soon.
- What work belongs to them.
- What is blocked.

Operational urgency should not require scrolling. If an order is overdue, unassigned, blocked in review, or pending final delivery action, the dashboard should surface that early.

KPI overload reduces usability because it forces users to interpret too many equal-weight signals. Ten cards can make the dashboard look rich while making the next action less obvious. Falcon should prefer fewer, clearer attention surfaces over broad metric density.

The first screen should answer: what should I care about right now?

## Role-Specific Dashboard Priorities

### Appraiser

First-screen priorities:

- My assigned active orders.
- Due soon and overdue work.
- Needs revisions.
- Waiting on appraiser.
- Inspection complete / report not started.

Primary work surfaces:

- My active orders table.
- Queue-filtered appraiser worklists.
- Due-date and inspection context.
- Smart actions for submit to review and revision response.

Secondary information:

- Calendar.
- Recent activity.
- Review feedback history.

Minimized information:

- Company-wide KPIs.
- Reviewer workload analytics.
- Executive trend reporting.

Operational focus:

Move assigned work forward and avoid missed due dates.

Emotional UX goal:

The appraiser should feel focused, not watched. The dashboard should feel like a clear personal workbench.

### Reviewer

First-screen priorities:

- Waiting on reviewer.
- Due soon review work.
- Revision loop risk.
- Orders ready for technical clearance.

Primary work surfaces:

- Review queue.
- Assigned review orders.
- Revision history and appraiser notes.
- Smart actions for request revisions and clear review.

Secondary information:

- Calendar.
- Review workload context.
- Recently cleared or sent-back orders.

Minimized information:

- Appraiser production work not ready for review.
- Owner-level financial or business analytics.
- Client delivery controls unless configured.

Operational focus:

Keep review throughput healthy and prevent quality loops from becoming delivery risk.

Emotional UX goal:

The reviewer should feel that review work is fair, prioritized, and easy to triage.

### Admin / Operations

First-screen priorities:

- Operational queues.
- Overdue and due soon.
- Unassigned orders.
- Waiting on appraiser/reviewer.
- Final approval and ready for delivery.
- Workload imbalance.

Primary work surfaces:

- Operational queue panel.
- Active orders table.
- Assignment and handoff views.
- Calendar timeline.
- Smart actions.

Secondary information:

- Trend analytics.
- Team capacity.
- Throughput and revision metrics.

Minimized information:

- Vanity totals.
- Static reports.
- Low-priority analytics above urgent queues.

Operational focus:

Keep the business moving, prevent deadline failures, balance workload, and reduce manual chasing.

Emotional UX goal:

The admin should feel like Falcon is a calm operations control room.

### Owner / Executive

First-screen priorities:

- Operational health.
- Delivery risk.
- Bottlenecks.
- Workload balance.
- Client-facing risk.
- Exception queues.

Primary work surfaces:

- Executive operational summary.
- High-severity queues.
- Capacity and workload snapshots.
- Drill-down links into active operational surfaces.

Secondary information:

- Trend analytics.
- Team performance.
- Client performance.
- Historical delivery metrics.

Minimized information:

- Per-order detail unless drilling in.
- Repetitive task controls.
- Dense operational tables as the first surface.

Operational focus:

Understand whether the operation is healthy and where intervention is needed.

Emotional UX goal:

The owner should feel confident that the system is surfacing the right risks before they become business problems.

## Operational Queue UX Philosophy

Operational queues are operational guidance.

They should feel trustworthy because they are deterministic, explainable, and connected to observable order data. A queue card should not feel like a vague alert. It should make clear why work is being surfaced.

Queues should become clickable work funnels. A queue card should guide the user into the matching worklist without routing away or forcing a new mental model. Queue filtering should feel like narrowing attention, not changing context.

Queue visibility should prioritize actionability over analytics. Showing a queue count matters because it points to work that needs action, not because counts are interesting by themselves.

Queue severity should use restrained visual emphasis. Critical and high-priority queues should be visible, but Falcon should avoid alarm-heavy color systems that make the cockpit feel chaotic.

## Active Orders Table Philosophy

Active work belongs near the top because orders are the unit of operational action.

The table should not be a dumping ground for every order ever created. It should be a focused active work surface where urgency, assignment, due dates, and next actions are clear.

Due-date prioritization should be built into default sorting and filtering. Work that is overdue, due soon, or blocked should naturally rise in visibility.

Urgency sorting should favor operational importance over raw creation order. Newest-first is rarely the best default for operational work.

Smart filtering should help users move from queue to worklist quickly. Queue-driven worklists are more useful than broad "all orders" views when the user is trying to act.

Avoid "all orders all the time." Historical and completed work should remain accessible, but active dashboards should focus on current operational responsibility.

## Calendar Philosophy

The calendar is an operational timeline.

It should show inspections, review deadlines, final due dates, and other time-based commitments in a way that supports daily planning. It should not dominate the dashboard unless the user's role depends primarily on scheduling.

The calendar should feel supportive, not dominant. It should provide temporal context for queues and active orders, helping users understand what is coming next.

It should integrate naturally into daily flow:

- Orders due soon should connect to table/queue context.
- Site visits should be visible without overwhelming the calendar.
- Review and final due dates should be clear.
- Calendar density should remain manageable.

The calendar should avoid visual overload. Too many event types, colors, badges, and dense text blocks can make it harder to plan. Compact, consistent labels are preferable.

## KPI / Analytics Philosophy

KPIs should become contextual intelligence.

They should help users understand operational health, workload, risk, and trends. They should not be used as decorative dashboard filler.

Not all KPIs belong above the fold. Above-the-fold metrics should be limited to high-signal, role-relevant indicators that support immediate decisions.

Analytics should support decisions, not distract from work. A chart is useful when it explains risk, capacity, or performance in a way that changes operational behavior.

Current dashboard decision:

- The default dashboard is locked as a calendar-centered operational cockpit.
- Operational Attention remains a compact signal layer.
- Active Worklist appears directly beneath the cockpit.
- KPI/business cards are intentionally removed from the dashboard default experience.
- Business metrics, trend reporting, and owner analytics should move to Reports / Owner analytics rather than competing with daily workflow decisions.

Future dashboards can include expandable or scrolled KPI zones:

- Workload trends.
- Delivery performance.
- Revision rates.
- Capacity forecasts.
- Client risk.
- Appraiser/reviewer throughput.

These should remain below immediate attention and active work unless the user's role is explicitly executive or analytical.

## Motion / Interaction Philosophy

### Restrained Animation

Animation should be minimal and functional.

Use it to clarify state changes, not to decorate the interface.

### Subtle Transitions

Transitions should make filtering, expansion, and state changes feel smooth.

They should be fast enough that the product feels responsive and quiet.

### Attention-Guiding Motion

Motion can guide attention when something changes:

- A queue becomes selected.
- A filter applies.
- A drawer opens.
- A row updates.

It should never compete with the user's task.

### Hover Elevation

Hover states should communicate affordance. Slight elevation, border contrast, or background changes are enough.

### Progressive Reveal

Detail should appear when needed:

- Row expansion.
- Drawer detail.
- Secondary analytics.
- Optional queue explanation.

Progressive reveal keeps the main surface calm.

### Interaction Confidence

Controls should make it clear what happened.

Selected filters, active queues, loading states, and empty states should be visible and easy to understand.

### Avoid Gimmicky Movement

Avoid animated decoration, excessive bouncing, looping effects, and visual flourishes that make the product feel less operationally serious.

## Visual Density Philosophy

### Whitespace As Operational Clarity

Whitespace is not empty space. It is a tool for reducing mental load.

Good spacing lets users scan urgent queues, order rows, dates, and actions without fatigue.

### Surface Hierarchy

The dashboard should make surface roles clear:

- Immediate attention surfaces.
- Active work surfaces.
- Context surfaces.
- Temporary detail surfaces.

Each surface should have a clear job.

### Visual Rhythm

Consistent spacing, card sizing, typography, and section rhythm make the product feel reliable.

The user should be able to predict how to scan each dashboard section.

### Scanability

The dashboard should support fast scanning:

- Clear labels.
- Short descriptions.
- Consistent urgency badges.
- Predictable table columns.
- Compact but readable dates.

### Minimizing Visual Fatigue

Avoid dense grids, excessive borders, too many saturated colors, and too many competing typography sizes.

The dashboard should be comfortable to use repeatedly throughout the day.

### Reducing Enterprise Clutter

Enterprise clutter happens when every available metric, action, filter, and label is shown at once.

Falcon should resist that. The product should feel focused and premium, not overloaded.

## Future Dashboard Direction

### Customizable Workspace Modules

Future dashboards can support configurable modules:

- Queues.
- Calendar.
- My work.
- Review work.
- Assignment planning.
- Analytics.
- Client risk.
- Activity.

Customization should happen inside curated boundaries so the dashboard remains coherent.

### Role-Native Layouts

Dashboard layout should adapt by role:

- Appraisers get workbench-first layouts.
- Reviewers get review-priority layouts.
- Admins get operations-control layouts.
- Owners get health-and-risk layouts.

### Operational Presets

Companies should be able to choose operational presets that tune dashboard emphasis:

- Small team.
- Admin-led workflow.
- Reviewer-led workflow.
- Owner approval workflow.
- High-volume production.

Presets should adjust modules, thresholds, and emphasis without changing the underlying operational engine.

### Intelligent Queue Prioritization

Queue ordering should become more context-aware over time.

Future prioritization can consider:

- Due-date pressure.
- Workload.
- Revision loops.
- Client priority.
- Historical cycle time.

### Predictive Urgency

Falcon can eventually predict operational risk before it becomes visible in status alone.

Examples:

- Likely late delivery.
- Likely revision loop.
- Capacity stress.
- Client escalation risk.

Predictive urgency should remain explainable and should not replace deterministic workflow state.

### Workload Balancing

The dashboard should eventually help admins see who is overloaded and where work can be reassigned.

This should connect naturally to assignment actions and operational queues.

### AI-Assisted Operational Summaries

AI can summarize operational conditions:

- Why a queue is risky.
- Which orders need intervention.
- What changed since yesterday.
- What an admin should prioritize today.

AI should assist decision-making while citing deterministic signals.

### Configurable Dashboard Modes By Company/Role

Future versions can support dashboard modes by company and role:

- Minimal mode.
- Standard operations mode.
- High-volume operations mode.
- Executive health mode.

These modes should offer "as much or as little as they need" while keeping Falcon's experience architecture intact.
