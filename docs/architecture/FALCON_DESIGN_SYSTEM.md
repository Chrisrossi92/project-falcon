# Falcon Design System

## Purpose

This document defines Falcon's visual language.

It answers:

> When should something look a certain way?

Future UI work should consult this document before introducing new visual patterns.

This is not a CSS guide. It is a product design language. Component implementation belongs
elsewhere.

This is product architecture guidance only. It does not change runtime behavior, application code,
routes, workflows, database schema, RPCs, permissions, UI components, emails, notifications, or
deployments.

Companion documents:

- `docs/architecture/FALCON_EXPERIENCE_FRAMEWORK.md` defines the shared platform experience system
  across Internal Operations, Falcon AMC, Client Portal, and Vendor Workspace.
- `docs/architecture/FALCON_INFORMATION_ARCHITECTURE_AND_UX_GUIDE.md` defines the page hierarchy
  and layout philosophy.
- `docs/architecture/FALCON_PAGE_INVENTORY.md` maintains the canonical inventory of primary pages.
- `docs/architecture/FALCON_PRODUCT_PRINCIPLES.md` defines the permanent product philosophy behind
  Falcon's decisions.
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md` defines motion, transition,
  microinteraction, and animation philosophy.
- `docs/architecture/FALCON_PREMIUM_EXPERIENCE_SPRINT_1_CHECKPOINT.md` records the completed
  Premium Experience Sprint 1 foundation, adoption rules, risks, and next target guidance.

## Foundational Philosophy

Falcon should feel:

- Calm
- Professional
- Modern
- Fast
- Spacious without wasting space
- Premium
- Purposeful

Every visual element must earn its place.

## Page Structure

Standard Falcon page hierarchy:

1. Page Header
2. Overview
3. Current Work
4. Supporting Sections
5. Historical Detail

### Page Header

The page header should establish purpose, expose the dominant Smart Action when one exists, and
offer primary tools without crowding the page.

### Overview

The overview should contain high-ROI information: the information most likely to help the user
understand state and decide what to do next.

### Current Work

Current Work is the page's primary content. This is where the user's main task should happen.

### Supporting Sections

Supporting sections provide useful context that should not compete with the primary workflow.

### Historical Detail

Historical detail belongs lower in the hierarchy, behind progressive disclosure, or on a dedicated
surface when volume or complexity grows.

## Card Types

Cards should frame meaningful units of information or action. Do not use cards merely to decorate
page sections.

### Summary Card

Purpose: show a compact high-level state or metric.

Use when a user needs a fast read on status, count, risk, progress, or queue health.

Do not use for long explanations, unrelated fields, or information that should be in the primary
workflow.

### Information Card

Purpose: group related context.

Use for client details, property details, assignment context, credential summaries, or safe metadata
that supports a decision.

Do not use when the information is the page's main task or when a simple row/list would be clearer.

### Action Card

Purpose: present a focused task with a clear next step.

Use when the card itself is a call to complete work, such as upload documents, schedule inspection,
or resolve a correction.

Do not use for passive information or multiple competing workflows.

### Insight Card

Purpose: surface interpreted information, risk, recommendation, or summary.

Use when Falcon is helping the user understand what matters.

Do not use for opaque automation or unexplained recommendations.

### Warning Card

Purpose: identify a risk, blocker, overdue item, missing requirement, or compliance issue.

Use when the user needs to act or account for risk.

Do not use for routine status or decorative emphasis.

### Timeline Card

Purpose: show ordered activity, history, or workflow progression.

Use when sequence matters.

Do not use for unrelated updates or dense audit data that belongs in a history view.

### Document Card

Purpose: represent a document, package item, or file state.

Use when users need to inspect, replace, upload, approve, or download a document.

Do not expose unsafe storage paths, bucket names, internal notes, or hidden packet data.

### Preview Card

Purpose: show enough of an object to support recognition or selection.

Use for document previews, assignment previews, request previews, or selected object previews.

Do not use when full inspection is required; move the user to a larger preview, drawer, or page.

## Button Hierarchy

### Primary

Use for the dominant action on a screen. There should be one primary action per screen whenever
possible.

Examples:

- Send to Review
- Offer Assignment
- Approve
- Submit

### Secondary

Use for useful actions that support the workflow without owning it.

Examples:

- Edit
- Print
- Back

### Ghost

Use for low-emphasis actions, navigation-adjacent commands, and actions that should remain
available without increasing visual weight.

Examples:

- Navigation
- Links

### Danger

Use for actions that can remove, void, cancel, archive, or otherwise meaningfully alter lifecycle
state.

Examples:

- Archive
- Cancel
- Void
- Delete

Danger actions should be explicit, sparse, and governed by product and permission rules.

### Smart Action

Smart Actions are the preferred primary workflow actions. They should answer what the user should
do next.

## Smart Actions

Only one primary workflow should dominate a screen whenever possible.

Other actions belong in:

- More Actions
- Dropdowns
- Drawers
- Secondary buttons

Smart Actions should be visible, specific, and task-oriented. They should not be generic labels when
a more precise verb is available.

## Interaction Polish

Falcon's shared interaction helpers live in:

```text
src/lib/ui/falconInteractions.js
```

The optional primitive wrapper lives in:

```text
src/components/interaction/
```

Future clickable cards, rows, quiet secondary actions, and destructive action baselines should use
these shared helpers or `FalconInteractiveSurface` instead of hand-rolled hover, press, selected,
disabled, and focus-visible classes.

Interaction states should behave this way:

- Hover should clarify clickability with a subtle surface, border, shadow, or row background change.
- Press feedback should be brief and tactile without delaying the action.
- Selected state should be visible through border, background, and ring, not color alone.
- Disabled state should reduce emphasis, prevent pointer action, and avoid looking selectable.
- Focus-visible state must remain obvious for keyboard users.
- Destructive actions should stay explicit and sparse; hover polish must not soften the seriousness
  of the action.

Interaction polish should support confidence and speed. It should not decorate passive information
or imply that a non-clickable surface is interactive.

### First Dashboard Adoption

Premium Experience Sprint 1E adopted shared interaction polish on the active dashboard's AMC
pipeline controls in:

```text
src/features/dashboard/DashboardPage.jsx
```

The adoption is intentionally limited to controls that were already interactive: the pipeline stage
buttons and the All attention filter. Static dashboard summary cards remain passive, even though
they use motion wrappers for entrance polish. Future interaction work must follow the same rule:
only apply clickable-surface polish where the user can actually click, focus, select, or activate
the surface.

## State Feedback

Falcon's shared loading, empty, error, updating, and success primitives live in:

```text
src/components/state/
```

Future screens should use these shared primitives before creating local loading, empty, error, or
confirmation UI. State feedback should reduce uncertainty, preserve layout where possible, and help
the user understand what is happening without adding noise.

Use state primitives this way:

- `FalconSkeleton`: preserve expected layout while content is loading. Prefer skeletons over
  spinners when the shape of the content is known.
- `FalconLoadingState`: use for section-level loading where brief explanatory context is helpful.
- `FalconEmptyState`: use when there is no data, no matching result, or setup is not configured
  yet. Empty states should be task-oriented and should not feel like errors.
- `FalconErrorState`: use for recoverable UI-level failures. Keep the tone calm unless the issue is
  destructive or critical.
- `FalconUpdatingIndicator`: use for inline saving, refreshing, or updating states that should not
  block interaction unless the underlying workflow already requires blocking.
- `FalconSuccessState`: use for subtle save or submit confirmations.

Avoid spinners unless no better layout-preserving option exists. State UI should clarify state,
next action, or expected continuation; it should not decorate waiting.

### First Dashboard State Adoption

Premium Experience Sprint 1G adopted `FalconSkeleton` for the active dashboard's primary count
loading placeholder in:

```text
src/features/dashboard/DashboardPage.jsx
```

The adoption preserves the existing product meaning: the count is still loading, the card remains
in place, and no new state or workflow behavior is introduced. Future state primitive adoption
should follow the same rule: replace local presentation only when the shared primitive preserves the
existing meaning, accessibility, and layout intent.

## Badges

Badges should identify meaningful state, not decorate the interface.

Use badges for:

- Status
- Priority
- Workspace
- Attention

Never overuse badges. Avoid decorative badges.

## Status Colors

Status colors should communicate intent consistently. This guide does not assign implementation
tokens.

| Color | Intended use |
| --- | --- |
| Green | Complete |
| Blue | Information |
| Amber | Needs attention |
| Red | Blocking |
| Gray | Context |

Color should not be the only signal. Labels, icons, and layout should also communicate state.

## Typography

Typography should reinforce hierarchy without repeating information.

### Large Page Titles

Use for the primary object or purpose of the page.

### Section Titles

Use for meaningful sections that help users scan and orient.

### Body

Use for readable operational content and concise explanations.

### Metadata

Use for dates, ownership, secondary identifiers, and supporting context.

### Muted Labels

Use for low-emphasis field labels and secondary context.

Avoid repeating information Falcon already knows or has already established nearby.

## Spacing

Whitespace is intentional. Spacing should separate meaning, not decorate.

Prefer fewer larger sections over dozens of tiny containers.

Spacing should clarify:

- What belongs together
- What is secondary
- What is actionable
- What belongs to history or deep detail

## Tables

Use tables when users need to compare many objects across consistent fields.

Tables are appropriate for:

- Order lists
- Vendor lists
- Client lists
- Audit-like records
- Work queues with sortable attributes

Cards are better when each item needs richer context, actions, or preview behavior.

Lists are better when users need quick scanning without many comparable columns.

Avoid dense tables when the workflow depends on judgment, explanation, or progressive disclosure.

## Drawers

Use drawers for:

- Supporting detail
- Editing
- Secondary information

Avoid placing primary workflows in drawers. If a workflow is the reason the user came to the page,
it should usually be on the page or in a dedicated flow.

## Modals

Modals are for:

- Confirmation
- Short workflows
- Focused editing

If scrolling becomes excessive, the workflow should become its own page or wizard.

## Wizards

Use step-based workflows when the user must move through:

- Multiple decisions
- Review
- Confirmation
- Document generation

Examples:

- Offer Assignment
- Future Client Onboarding
- Company Setup

Wizards should clarify progression and prevent users from facing too many choices at once.

## Empty States

Every empty state should encourage action.

Bad:

- No documents.

Better:

- Upload engagement package.

Empty states should explain what can happen next, not merely report absence.

## Icons

Icons should reinforce labels. They should never replace labels for important actions or ambiguous
concepts.

Use icons to improve scanning, support button recognition, and clarify repeated controls.

## Progressive Disclosure

Information should graduate through visibility levels as its importance increases.

### Always Visible

Use for primary purpose, decision information, Smart Actions, blockers, and required next steps.

### Expandable

Use for supporting context that is useful but not always needed.

### Drawer

Use for secondary detail, focused editing, or contextual inspection.

### Separate Page

Use when a workflow or information set becomes too important, complex, or large for a drawer or
section.

### History

Use for audit trails, version history, older activity, and deep operational context.

Information should move toward visibility when it becomes necessary for decisions or action. It
should move deeper when it is occasional, historical, or distracting from the main task.

## Responsiveness

Falcon should be desktop first, laptop optimized, tablet usable, and mobile functional.

Responsive behavior should preserve hierarchy. Never simply stack infinite cards when doing so
makes the workflow harder to scan or complete.

## Design Consistency

Prefer:

- Existing patterns
- Existing cards
- Existing buttons
- Existing layouts

Do not invent new UI patterns unless necessary. New patterns should solve a real product problem
and should be added to the design system when they become reusable.

## The Removal Test

Ask:

> If we remove this element, does the user lose anything important?

If not, it probably should not exist.

## The Premium Test

Every screen should feel like expensive enterprise software.

Not because it has more graphics, but because:

- Hierarchy is obvious
- Motion is intentional
- Spacing is consistent
- Actions are clear
- Information is calm

## Implementation

This document defines Falcon's visual language.

Component implementation belongs elsewhere.

This document should evolve with Falcon.
