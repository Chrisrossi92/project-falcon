# Activity Timeline UX Model

## Purpose

The activity timeline is the order's operational memory.

It should help Falcon users understand what happened, who acted, what changed, and what matters next without forcing them to parse raw audit logs.

The timeline should clearly distinguish human communication from system or order history. A note from a reviewer should not feel the same as an automatic timestamp update. A status change should explain the operational transition. A low-value metadata event should remain available without competing with meaningful communication.

## Core Principle

If a person wrote it, make the person obvious.

If the system recorded it, make the change obvious.

Not all activity events deserve equal visual weight. Falcon should prioritize the events users need to read, understand, and act on, while preserving auditability for lower-value events.

## Activity Event Categories

### Human Communication

Examples:

- General order notes.
- Revision notes.
- Resubmission notes.
- Reviewer feedback.
- Admin comments.
- Internal clarification.

Visual priority: **Highest**.

What the user needs to understand:

- Who wrote it.
- What role or context they had.
- What they said.
- Whether it needs action.
- When it was written.

Recommended visual treatment:

- Message body should be prominent.
- Actor name should be clear.
- Role, avatar, or initials should help identify the speaker.
- Timestamp should be quiet but available.
- Human notes should not be visually overpowered by system badges.

### Workflow Milestones

Examples:

- Order submitted to review.
- Review cleared.
- Revisions requested.
- Final approval requested.
- Ready for client.
- Completed.

Visual priority: **High**.

What the user needs to understand:

- The workflow transition.
- Previous status and new status.
- Who initiated the transition when available.
- Whether this changes ownership or next action.

Recommended visual treatment:

- Use compact milestone rows.
- Show old value -> new value clearly.
- Give the new lifecycle state enough emphasis to scan.
- Keep actor secondary but accessible.

### Operational Metadata

Examples:

- Assignment changed.
- Review due date changed.
- Final due date changed.
- Site visit date changed.
- Fee changed.
- Order created.

Visual priority: **Medium**.

What the user needs to understand:

- Which field changed.
- Old value and new value when available.
- Whether the change affects due pressure, responsibility, or delivery risk.
- Who made the change if relevant.

Recommended visual treatment:

- Compact system event rows.
- Field label should be clear.
- Old value -> new value should be readable.
- Use muted styling unless the metadata affects urgency.

### Low-Value / Noise Events

Examples:

- Duplicate legacy status events.
- Empty detail payloads.
- Mechanical timestamp updates.
- Repeated system events with no meaningful user-facing change.
- Internal normalization events.

Visual priority: **Low**.

What the user needs to understand:

- Usually nothing during normal workflow scanning.
- The event may still matter for audit or troubleshooting.

Recommended visual treatment:

- Collapse, group, or de-emphasize.
- Keep accessible for audit history.
- Do not let these events dominate the drawer.

## Human Communication UX

Human-written content should feel like communication, not system output.

Notes, revision notes, resubmission notes, reviewer feedback, and admin comments should prioritize the message body. The user should be able to scan the timeline and quickly identify the last meaningful human statement.

Recommended treatment:

- Show actor name prominently.
- Include role when available, such as reviewer, appraiser, admin, or owner.
- Use avatar or initials to make the person easy to identify.
- Keep the note body readable and visually distinct.
- Use quiet timestamps.
- Keep system labels secondary.

Revision and resubmission notes deserve special care because they often explain why an order moved between appraiser and reviewer. These notes should remain visually connected to the workflow transition when possible.

## System / Workflow Event UX

System and workflow events should explain operational change.

Status changes, assignment changes, date changes, order creation, and completion events should not read like raw database logs. They should explain what changed in plain language.

Recommended treatment:

- Show old value -> new value clearly.
- Use compact rows for routine changes.
- Emphasize the changed field or target status.
- Keep actor secondary but available.
- Avoid making system events look like human messages.

Examples:

- Status: `in_review` -> `review_cleared`.
- Reviewer: `Unassigned` -> `Jane Reviewer`.
- Final due date: `May 20, 2026` -> `May 18, 2026`.

## Noise Reduction

Falcon should preserve auditability without overwhelming users.

Duplicate legacy events, empty detail payloads, and low-value system events can make the timeline feel noisy. Users should not have to scroll through mechanical events to find the last meaningful note or workflow transition.

Near-term approach:

- De-emphasize low-value system rows.
- Avoid rendering empty details as meaningful content.
- Make duplicate or repeated system events visually quiet.

Future approach:

- Group similar low-value events.
- Collapse noisy system activity by default.
- Offer filters for Notes, System, and All.
- Preserve full audit history behind expanded views.

## Timeline Drawer Goals

The timeline drawer should feel compact, readable, and operational.

Goals:

- Fit comfortably inside the order drawer.
- Make newest important activity easy to scan.
- Highlight human communication.
- Explain workflow changes without raw-log density.
- Remain role-aware where useful.
- Avoid making users visually chase important events through noise.

The drawer should feel like an operational timeline, not a database event stream.

## Sprint 1 Completion Note - 2026-05-16

Activity Timeline Refinement Sprint 1 established the first implementation pass for person-first operational memory.

Completed:

- Human communication rows now prioritize actor identity and message readability.
- System and workflow rows now render as quieter, compact audit memory.
- Actor identity resolution now preserves `actor_name`, `actor_role`, `actor_email`, `actor_id`, and `actor_user_id` when returned by existing feeds or RPCs.
- New notes now include best-effort actor metadata in `detail.actor`.
- Generic `User` is now intended as the final fallback only.
- Notification note language now supports person-first operational memory, while notification delivery remains separate from activity rendering.

## Sprint 2 Completion Note - 2026-05-16

Activity Timeline Refinement Sprint 2 added the first frontend-only timeline intelligence layer.

Completed:

- Adjacent human note and workflow/status events now group visually as an operational moment when they occur within 90 seconds.
- Raw activity rows are preserved inside the grouped moment.
- Auditability is preserved because no activity rows are deleted, collapsed, or filtered out.
- No fetching, services, RPCs, subscriptions, migrations, or filter behavior changed.
- Future grouping can consider actor affinity, duplicate event collapse, and urgency semantics.

## Notification Registry Lock - 2026-05-16

Notification + Activity Cohesion Slice 1 added a canonical notification event registry for current workflow and note notification semantics.

Completed:

- Notification title/body generation is centralized for `order.new_assigned`, `order.sent_to_review`, `order.sent_back_to_appraiser`, `order.review_cleared`, `order.ready_for_client`, `order.completed`, `note.appraiser_added`, and `note.reviewer_added`.
- Registry metadata now captures `key`, `label`, `category`, `priority`, `primaryRecipientRole`, `suppressActor`, `secondaryRecipientIntent`, `buildTitle`, and `buildBody`.
- Notification Settings event keys and copy now align to canonical live event keys.
- Runtime behavior is preserved: no new notification types, recipient routing changes, backend/schema/RPC changes, or queue/calendar signal notifications were added.
- Activity remains the durable order memory; notifications remain delivery prompts.

Deferred:

- Preference-policy semantics.
- Registry-driven recipient ownership matrix.
- Clearer product separation between `/activity` notification history and order-level activity timeline.

## Notification Actor Suppression Lock - 2026-05-16

Notification + Activity Cohesion Slice 2 hardened actor suppression for current workflow handoff notifications.

Completed:

- `order.sent_back_to_appraiser` now suppresses the actor consistently.
- `order.completed` now suppresses the actor when actor identity is available.
- Runtime recipient doctrine otherwise remains unchanged.
- No `ready_for_client` routing changes were made.
- No admin/owner role mapping, backend/schema/RPC/UI/queue/calendar/reminder/escalation changes were made.

Deferred:

- `ready_for_client` recipient doctrine review.
- Admin/owner recipient distinction.
- Registry-driven ownership recipient matrix.
- Notification preference-policy reconciliation.

## Actor Identity Color Lock - 2026-05-16

Actor color is now treated as part of Falcon's operational identity model. Team Directory identity colors should be the source for avatar circles and future timeline/calendar identity surfaces when available, with generated/fallback colors used only when no saved identity color exists.

Profile color saves remain tied to auth/profile identity until the team profile/auth linking model is normalized.

## Future Direction

Future activity timeline capabilities can include:

- Filtering by Notes, System, and All.
- Pinning important notes.
- Threaded communication.
- Client-visible vs internal notes.
- Mentions and notification support.
- Role-aware timeline emphasis.
- AI-assisted summaries.

AI summaries should only be grounded in timeline events. They should cite or link back to the underlying notes and workflow events so users can verify what the summary means.
