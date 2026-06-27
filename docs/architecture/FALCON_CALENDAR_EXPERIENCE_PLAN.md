# Falcon Calendar Experience Plan

## Purpose

This plan records how the Calendar surface should evolve before Premium Experience implementation
begins.

It is architecture and UX inspection only. It does not approve runtime behavior changes, event
logic changes, data-fetching changes, schema changes, RPC changes, permission changes, route
changes, workflow changes, or new calendar features.

## Review Scope

Reviewed:

- `docs/architecture/FALCON_PRODUCT_EXPERIENCE_AUDIT.md`
- `docs/architecture/FALCON_PREMIUM_EXPERIENCE_SPRINT_1_CHECKPOINT.md`
- `docs/architecture/FALCON_DESIGN_SYSTEM.md`
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md`
- `src/pages/Calendar.jsx`
- `src/components/calendar/CalendarFiltersBar.jsx`
- `src/components/calendar/CalendarGrid.jsx`
- `src/components/calendar/TwoWeekCalendar.jsx`
- `src/components/calendar/CalendarDayDetailRail.jsx`
- `src/components/calendar/EventChip.jsx`
- `src/components/calendar/CalendarLegend.jsx`
- `src/components/calendar/DayCell.jsx`
- `src/components/calendar/EventPopover.jsx`
- `src/lib/calendar/normalizeCalendarEvent.js`
- `src/pages/__tests__/Calendar.test.jsx`
- `src/components/calendar/__tests__/CalendarDayDetailRail.test.jsx`

Related but not treated as the target surface:

- `src/components/admin/AdminCalendar.jsx` is marked as a legacy/quarantined calendar surface and
  should not be revived for this Premium Experience pass.
- Dashboard calendar panels reuse some calendar components, but the target for this plan is the
  standalone Calendar page.

## Current Strengths

### The Page Has A Clear Scheduling Job

Calendar is already a dedicated schedule coordination surface. The page does not try to become
Order Detail or Orders. It focuses on active-order schedule pressure: site visits, review handoffs,
and client due dates.

The current hierarchy is recognizable:

- Workspace header
- Company/work-view/order context
- Scheduling controls
- Legend
- Schedule board
- Selected-day detail rail

That is the right information architecture for a calendar workspace.

### Schedule Context Is Visible

The header and context tiles make the workspace, role lens, and active order count visible before
the board. This helps users understand whether they are looking at company-wide, review-focused,
assigned, or personal schedule work.

The page also derives scope from the active operations mode and user role. Reviewers see in-review
work, non-admin appraisers see assigned work, and admins see the broader active schedule. Future
polish should preserve that behavior.

### Event Types Are Semantically Useful

The normalized event model distinguishes:

- Site visits
- Review handoffs
- Client due dates
- Other events

Those categories map to real operational questions. Users need to know what happens in the field,
what needs review, and what is due to the client.

### The Selected-Day Rail Is A Strong Pattern

`CalendarDayDetailRail` turns a dense calendar cell into a readable daily summary. It groups events
by type, shows counts, preserves order-opening behavior, and includes a calm empty state.

This should remain the primary place for detail. The board should support scanning; the rail should
support inspection.

### Existing Tests Protect Core Page Meaning

The current tests verify the standalone scheduling hierarchy, workspace context, active-order read
source, reviewer scope filters, selected-day grouping, empty state, and order-opening behavior.
Future slices should extend those tests rather than replacing them with visual-only assertions.

## Current Weaknesses

### Schedule Scanability Is Good But Not Yet Premium

Users can understand today or this week, but the board still asks them to decode several competing
signals:

- Event chip color
- Event type label
- Late or Today marker
- Address text
- Appraiser/reviewer context
- Day background for today
- Day background for selected day
- Current view and lens pills above the board

The result is useful, but visually busy. Site visits, review due dates, and client due dates are
distinguishable, yet their hierarchy is not fully settled. Review and final due events can feel
similar unless the user reads the label closely.

### Event Hierarchy Needs Sharper Roles

Primary schedule signals should be:

1. Today and the selected day
2. Overdue or due-today review/client due work
3. Site visits with specific times
4. Near-term review handoffs
5. Near-term client due dates
6. Supporting owner/client/address context

The current `EventChip` tries to show type, pressure, owner, time, address, and order context inside
a very small space. That is often the right data, but not all of it should have equal visual weight.

Colors are useful but are doing a lot of work. Site, review, final, today, late, selected, and
hover states all rely on local color, border, and background choices. Future polish should make
meaning clear without adding louder badges.

### Calendar Navigation Is Functional But Locally Styled

Month view has Prev and Next buttons around the current month label. Two-week view has Prev, Today,
range text, and Next in a sticky local header.

The controls work, but they do not yet share one interaction language:

- Month navigation buttons are simpler and lower polish than two-week navigation buttons.
- Today exists in the two-week view but not the month view.
- The current range is readable but not visually connected to the selected day and board metadata.
- Date controls use local transition and hover classes rather than shared interaction helpers.

### Filters And Context Are Split Across Several Visual Layers

Calendar has view, range, weekend, and lens controls. It does not currently have explicit
appraiser, reviewer, client, or workspace filter controls in the standalone surface. Workspace and
role scope are derived from context rather than selected manually.

Current filter state is visible through control selection and the Current calendar view pills. That
is helpful, but the page repeats the same idea in several places:

- Context tiles
- Scheduling Controls description
- View/lens/selected-day pills
- Segmented controls
- Legend
- Board metadata pill

This creates more control chrome than the schedule needs.

### Interaction Quality Is Mixed

Existing interactions:

- Day cells can be clicked and keyboard-activated with Enter or Space.
- Event chips stop propagation and open the order.
- Selected day and today have visual treatment.
- Event chips expose hover/focus-within popover-like detail.
- "More" affordances appear when a day has too many events.

Gaps:

- Calendar controls, day cells, event chips, and rail order buttons use local hover/focus styling.
- Focus-visible treatment is not consistently explicit.
- Event chip hover detail depends on hover/focus-within presentation that may crowd clipped cells.
- Empty days are clickable when day selection is enabled, but their affordance is subtle.
- Passive day counts and context pills should not feel like independent controls.

### State Quality Uses Older Local Primitives

Top-level loading and error states use `WorkspaceLoadingState` and `WorkspaceErrorState` rather
than Falcon's shared Premium Experience state primitives.

Existing state behavior is understandable, but future polish should align it with:

- `FalconLoadingState`
- `FalconSkeleton`
- `FalconEmptyState`
- `FalconErrorState`

The board also has no shared calendar-shaped skeleton. Loading should preserve the board and rail
shape where practical rather than showing only a generic message.

Calendar currently has a selected-day empty state, but there is no equivalent page-level empty
state for a schedule with no active events in the selected range. That absence may be acceptable,
but if an empty state already exists in implementation it should use shared primitives.

### Responsive Behavior Is The Main Risk Area

The schedule board uses horizontal overflow and a minimum width. That is a reasonable current
strategy, but it should feel intentional:

- Month view uses `min-w-[44rem]`.
- The board and detail rail stack below large widths.
- Event chips truncate aggressively.
- Filter controls wrap, but can still create a dense control band before the schedule.
- Sticky behavior exists inside `TwoWeekCalendar`; future polish should not add more sticky
  behavior without a separate slice.

On narrow widths, the biggest risk is not missing functionality. The risk is clipped event meaning,
crowded controls, and users not realizing they need horizontal scroll.

## Schedule Scanability Evaluation

Today and this week are understandable, especially in two-week view where the visible range is
explicit. Month view is stronger for orientation than triage because dense days can hide important
events behind truncation and "+ more" indicators.

Site visits are easiest to distinguish because they can include time. Review due and client due
events are distinguishable through type labels and color, but they both read as due-date pressure
and need a clearer hierarchy around urgency.

Recommended emphasis order:

| Signal | Recommended Weight | Reason |
| --- | --- | --- |
| Today / selected day | Primary | Orients the user before they inspect events. |
| Late / due today review and final events | Primary | Highest schedule risk. |
| Site visits with time | Primary | Time-specific operational commitments. |
| Review handoffs | Secondary-primary | Important handoff pressure, especially for reviewers. |
| Client due dates | Secondary-primary | Delivery pressure, often more important near due date. |
| Assigned users | Secondary | Needed for company schedule, less important for personal views. |
| Client/address details | Supporting | Useful for recognition, but not every cell can carry all detail. |
| Order number | Utility | Best exposed as open-order action or rail detail, not dominant chip text. |

## Event Hierarchy Evaluation

Event chips should continue to be compact, but future slices should make their visual roles more
consistent:

- Use type color as a category cue, not as the only hierarchy.
- Use urgency markers sparingly for overdue and due-today work.
- Keep address/property as the recognition anchor.
- Show owner context when role requires it, especially admin/owner/reviewer views.
- Avoid turning every chip into a multi-badge surface.
- Keep richer detail in the selected-day rail.

The selected-day rail can carry stronger event hierarchy than the grid because it has more space.
It should be the place where appraiser/reviewer names, client context, operational signals, and
open-order controls are easiest to read.

## Calendar Navigation Evaluation

Navigation controls are clear enough for current use, but they should feel more consistent:

- Prev, Today, and Next should share the same helper-driven interaction treatment when they exist.
- Current month or range should be visually centered and stable.
- The selected-day label should stay visible but should not compete with range navigation.
- The month and two-week views should feel like variants of one calendar control system.

Do not add new date-navigation features in the first polish slices. Improve the existing controls
only.

## Filters And Context Evaluation

Current controls:

- View: month or two weeks.
- Range: one, two, or four weeks in two-week mode.
- Weekends toggle in two-week mode.
- Lens: all, my work, site visits, review handoffs, client due.
- Workspace and role context from app context and operations mode.

Current active state is visible, but split between selected controls and pills. Future polish
should reduce competition and clarify what is selectable versus informational.

Do not invent appraiser, reviewer, client, or workspace filters as part of this plan. If those
filters become product requirements later, they should be planned separately because they would
change filtering behavior and data expectations.

## Interaction Quality Evaluation

Existing keyboard support for day selection is a good baseline. Future polish should standardize:

- Focus-visible rings for segmented controls, day cells, event chips, "more" controls, navigation,
  and rail order buttons.
- Hover and press treatment through shared interaction helpers.
- Selected day and current day states so they are visually distinct without becoming loud.
- Event chip hover/focus details so they do not clip awkwardly inside horizontally scrolled cells.
- Passive context chips and legend items so they do not look clickable.

Motion should be minimal. Calendar users are scanning dense time-based information. Use shared
motion primitives only where state changes are already meaningful, such as page/container entrance
or selected-day detail changes. Do not stagger individual events.

## State Quality Evaluation

Recommended future state hierarchy:

- Top-level loading: layout-preserving board and rail skeleton where practical.
- Top-level error: calm recoverable error state preserving the page shell.
- Empty schedule: if no events exist for the selected scope/range, explain the scope and suggest
  changing the lens or date range.
- Selected-day empty: keep the current meaning, but align with `FalconEmptyState` if the layout can
  remain stable.
- Updating: only use `FalconUpdatingIndicator` if the calendar gains an existing refresh/updating
  state. Do not invent one for polish.

## Responsive Evaluation

Current horizontal scrolling should remain the short-term strategy. A mobile calendar redesign is
out of scope.

Future narrow-viewport polish should verify:

- Header context tiles wrap without pushing the board too far down.
- Scheduling controls stack cleanly.
- Active view/lens/selected-day pills remain readable.
- The board makes horizontal scroll apparent without clipping controls.
- Event chips truncate in a way that still preserves type and urgency.
- The selected-day rail stacks below the board and remains useful as the primary detail surface.
- Navigation controls do not overflow in month or two-week view.

## Immediate Wins

### Slice Candidate: Calendar State Foundation

Adopt shared state primitives for existing top-level loading and error states.

Use `FalconLoadingState`, `FalconSkeleton`, and `FalconErrorState` where meaning is unchanged.
Preserve the current active-order query, workspace scoping, role scoping, event derivation, and
calendar layout.

### Slice Candidate: Calendar Page Motion Foundation

Wrap the Calendar page/container with `FalconPageMotion` if consistent with the Order Detail and
Orders foundation slices.

Do not animate individual events or full schedule transitions. Reduced motion must be respected
through the primitive.

### Slice Candidate: Navigation And Control Interaction Baseline

Apply shared interaction helpers to existing calendar controls:

- Prev / Today / Next
- View segmented controls
- Range controls
- Weekend toggle
- Lens controls

Keep all labels, filter logic, and date behavior unchanged.

### Slice Candidate: Event Chip And Day Cell Interaction Baseline

Apply shared interaction treatment only to existing clickable day cells, event chips, "+ more"
controls, and rail open-order buttons.

Do not make passive legend items, context pills, or count cards look clickable.

## Medium Improvements

### Clarify Event Type And Urgency Hierarchy

Make site, review, and final events easier to compare without changing event logic:

- Keep type labels visible.
- Make overdue and due-today states more recognizable.
- Quiet supporting owner/address text when it competes with urgency.
- Keep richer context in the selected-day rail.

### Simplify Control Chrome

Reduce visual competition between the context tiles, current-view pills, segmented controls,
legend, and board metadata. Keep all existing information available, but make informational chips
quieter than actual controls.

### Improve Selected-Day Rail State Quality

Align selected-day empty and event group presentation with shared state and interaction patterns
where practical. Preserve grouping, counts, open-order controls, and operational notes.

### Responsive Wrapping Pass

Review narrow widths after state and interaction polish:

- Control rows
- Board overflow
- Event chip truncation
- Selected-day rail stacking
- Navigation wrapping

Keep horizontal scroll. Do not introduce a new mobile calendar layout in the first pass.

## Long-Term Vision

Calendar should become Falcon's calm schedule command surface:

- The board helps users see timing pressure quickly.
- The selected-day rail helps users inspect the day without losing calendar context.
- Event categories remain consistent across Calendar, Dashboard calendar panels, and future
  schedule widgets.
- Interaction treatment is shared with the rest of Falcon's premium foundation.
- State feedback preserves layout and reduces uncertainty.

Longer-term work may define a reusable calendar interaction system for month, week, event, and
detail-rail behavior. That should happen only after the standalone Calendar surface proves the
pattern.

## Implementation Roadmap

### Slice 1: State And Page Foundation

Goal: adopt shared page motion and state primitives without changing event logic.

Scope:

- Wrap the Calendar page/container with `FalconPageMotion` if appropriate.
- Replace existing top-level `WorkspaceLoadingState` with shared loading/skeleton primitives.
- Replace existing top-level `WorkspaceErrorState` with `FalconErrorState`.
- Preserve page shell, board layout, role scoping, operations-mode scoping, and event derivation.

Validation:

- Focused Calendar page tests.
- Motion/state primitive tests if affected.
- Targeted eslint.
- `git diff --check`.

### Slice 2: Navigation And Filter Interaction Polish

Goal: make existing calendar controls feel consistent with Falcon's shared interaction system.

Scope:

- Apply shared interaction helpers to existing navigation, view, range, weekend, and lens controls.
- Preserve all filter/date behavior.
- Make active control states clearer without adding new filters.
- Keep passive context and legend items passive.

Validation:

- Focused Calendar controls tests.
- Verify view/lens/range/weekend controls still render and preserve behavior.
- Targeted eslint.
- `git diff --check`.

### Slice 3: Day Cell And Event Chip Baseline

Goal: improve scanability and interaction clarity for existing clickable day/event surfaces.

Scope:

- Standardize hover, focus-visible, selected day, current day, and event chip treatment.
- Use shared interaction helpers where practical.
- Keep event type, urgency, text, click behavior, and order-opening behavior unchanged.
- Do not add per-event animation or stagger.

Validation:

- Focused calendar grid, two-week calendar, and event chip tests.
- Confirm day selection and event click behavior remain intact.
- Targeted eslint.
- `git diff --check`.

### Slice 4: Selected-Day Rail Polish

Goal: make selected-day detail easier to scan while preserving grouping and actions.

Scope:

- Align empty, grouped event, operational note, and open-order button presentation with shared
  state and interaction patterns.
- Keep event grouping by site, review, final, and other.
- Preserve order-opening behavior and count labels.

Validation:

- `CalendarDayDetailRail` focused tests.
- Interaction/state tests if affected.
- Targeted eslint.
- `git diff --check`.

### Slice 5: Responsive And Overflow Review

Goal: make the existing calendar strategy less fragile on narrower widths.

Scope:

- Review header context wrapping.
- Review scheduling controls wrapping.
- Review board horizontal overflow.
- Review event chip clipping/truncation.
- Review selected-day rail stacking.
- Keep current horizontal scroll strategy.
- Do not introduce a new mobile calendar/card layout.

Validation:

- Focused tests only if class or structure assertions change.
- Browser QA when authenticated local access is available.
- Targeted eslint if code changes.
- `git diff --check`.

### Slice 6: Visual QA And Final Consistency Review

Goal: verify Calendar polish across representative states before treating it as the schedule
surface pattern.

Follow `docs/architecture/FALCON_PREMIUM_EXPERIENCE_QA_GUIDE.md`.

Representative states:

- Admin/owner company schedule.
- Reviewer schedule.
- Appraiser assigned schedule.
- Month view.
- Two-week view.
- One-week and four-week ranges.
- Weekends visible and hidden.
- All schedule lens.
- My Work lens.
- Site Visits lens.
- Review Handoffs lens.
- Client Due lens.
- Selected day with no events.
- Selected day with multiple event types.
- Days with more events than visible chip limit.
- Desktop, tablet/narrow, and mobile/narrow widths.

Checks:

- Today and selected day are easy to distinguish.
- Site, review, and final event meanings are clear.
- Overdue and due-today pressure is visible without becoming noisy.
- Navigation controls are balanced.
- Filters wrap cleanly.
- Board horizontal scroll works without clipped controls.
- Event chips remain readable enough for scanning.
- Selected-day rail remains the primary detail surface.
- Passive legend/context content does not look clickable.
- No awkward layout shifts, clipped buttons, or broken wrapping.

## Non-Goals

- Do not redesign the calendar workflow.
- Do not invent new calendar features.
- Do not add appraiser, reviewer, client, or workspace filters in these polish slices.
- Do not change event derivation, event type normalization, order scoping, role scoping, data
  fetching, schemas, RPCs, permissions, routes, or navigation behavior.
- Do not reintroduce the legacy admin `FullCalendar` surface.
- Do not create a new mobile calendar layout in the first Premium Experience pass.
- Do not animate every event or add decorative motion.
