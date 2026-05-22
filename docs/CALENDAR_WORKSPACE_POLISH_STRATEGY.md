# Calendar Workspace Polish Strategy

## Purpose

Standalone Calendar Workspace Polish Slice 1A plans the next governed polish pass for `/calendar`
so the standalone scheduling surface matches Falcon's current operational dashboard and Orders
workspace quality.

This is documentation-only plus read-only inspection. It does not change runtime code, backend
behavior, routes, permissions, RLS/RPCs, Supabase queries, calendar event derivation, scheduling
behavior, workflow behavior, lifecycle behavior, or order mutation behavior.

## Sources Inspected

Runtime:

- `src/pages/Calendar.jsx`
- `src/components/dashboard/DashboardCalendarPanel.jsx`
- `src/components/calendar/CalendarFiltersBar.jsx`
- `src/components/calendar/CalendarLegend.jsx`
- `src/components/calendar/CalendarGrid.jsx`
- `src/components/calendar/TwoWeekCalendar.jsx`
- `src/components/calendar/CalendarDayDetailRail.jsx`
- `src/components/calendar/EventChip.jsx`
- `src/lib/calendar/orderEvents.js`
- `src/lib/calendar/filterCalendarEvents.js`
- `src/lib/calendar/normalizeCalendarEvent.js`
- `src/lib/hooks/useCalendarEvents.js`

Docs:

- `docs/OPERATIONAL_DASHBOARD_POLISH_STRATEGY.md`
- `docs/ORDERS_WORKSPACE_POLISH_STRATEGY.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Current Standalone Calendar Foundation

Standalone route:

- `/calendar` renders `src/pages/Calendar.jsx`.
- The page is already framed as `Scheduling Workspace` / `Operational Schedule`.
- The page loads current app-user/company context through `useCurrentUserAppContext()`.
- Owner/admin users load current-company active orders.
- Reviewer users load in-review orders where they are reviewer/current reviewer.
- Appraiser users load assigned orders.
- The current read path uses `v_orders_active_frontend_v4` and existing order-derived calendar
  normalization.
- Archived, cancelled, and voided order visibility remains governed by the active-order read path
  and must not be widened by polish work.

Calendar controls:

- `CalendarFiltersBar` controls:
  - `2 weeks` versus `month` view;
  - one-, two-, or four-week range when the two-week view is active;
  - weekend visibility;
  - Lens values: `All`, `My Work`, `Site Visits`, `Review Handoffs`, and `Client Due`.
- `CalendarLegend` remains explanatory and does not own filter state.
- Month and two-week views support selected-day state.

Calendar surfaces:

- `TwoWeekCalendar` renders the primary two-week scheduling grid.
- `CalendarGrid` renders the month grid.
- `EventChip` renders compact site/review/final event chips with overdue/today markers.
- `CalendarDayDetailRail` renders the selected-day support rail with site/review/final counts,
  grouped event cards, order/client/address/participant context, and quiet deterministic notes.
- Event clicks still open the existing Order Detail route.

## Dashboard Versus Standalone Calendar Inconsistencies

The dashboard calendar now sits inside a clearer operational hierarchy:

- unified `Operations Dashboard` header;
- setup guidance separated from operational work;
- Calendar first as primary operational context;
- Orders immediately after Calendar as primary work surface;
- deterministic Status rail and Operational Support kept secondary.

The standalone Calendar route is functionally useful, but its shell is thinner:

- Header hierarchy is less mature than the dashboard and Orders workspace headers.
- Filter controls, legend, and selected-day rail work, but they read as separate widgets rather
  than one coordinated scheduling workspace.
- The page has limited compact context for current role/work lens/view/range.
- Loading and error states are rougher than the recently polished Orders table/drawer states.
- Mobile stacking can push the actual calendar surface below several independent controls.
- Some inherited calendar copy still uses older pressure-oriented language in lower-level
  components and should be cleaned up carefully without changing event logic.
- Dashboard and standalone calendar intentionally do not have identical data sources or view
  modes today; this difference should be preserved until a separate data-source unification design
  exists.

## Target Calendar Workspace Experience

The standalone Calendar should answer:

- What scheduled operational work is coming up?
- Which site visits, review handoffs, and client due dates are clustered?
- Which day should I inspect next?
- Which order should I open from this schedule?

Target hierarchy:

1. Calendar workspace header with calm scheduling/coordination framing.
2. Compact context row from existing app/calendar state only.
3. View, range, weekend, and Lens controls grouped as scheduling controls.
4. Primary calendar grid.
5. Selected-day detail rail as support context.
6. Legend and explanatory support kept secondary.

The page should feel like a scheduling and coordination workspace, not an analytics dashboard and
not a workflow mutation surface.

## Candidate Polish

### Stronger Calendar Header

Candidate direction:

- Keep the standalone surface clearly named as a calendar/scheduling workspace.
- Use calmer operational copy aligned with the dashboard and Orders workspace.
- Show compact context for company/current work view only if it uses already available app context.
- Avoid metric-heavy or predictive language.

Avoid:

- New counts that require new queries.
- Claims about all company history or complete delivery risk.
- Product-mode or module authority language.

### Scheduling Context Row

Candidate direction:

- Add a small read-only row derived from existing state:
  - current role/work lens;
  - active view/range;
  - weekend visibility;
  - selected day when applicable.
- Keep it explanatory, not authoritative.

Avoid:

- Cross-company aggregates.
- workload scoring;
- risk prediction;
- new server-side counts.

### Filter / Lens Grouping

Candidate direction:

- Make `CalendarFiltersBar` read as one scheduling control surface.
- Add safe accessible labels around view and Lens groups.
- Preserve every existing control value, handler, and state transition.
- Keep Lens as the primary standalone filter model.

Avoid:

- New lenses in the first polish pass.
- Changing filter semantics.
- Moving Lens state into URL/query behavior without separate design.

### Legend Placement

Candidate direction:

- Treat `CalendarLegend` as supporting explanation.
- Place it where it helps chip interpretation without competing with primary controls.

Avoid:

- Making legend items interactive unless separately designed.
- Adding hidden filter behavior.

### Selected-Day Rail Polish

Candidate direction:

- Keep the right rail as the selected-day scheduling support surface.
- Improve section hierarchy, empty state tone, and mobile stacking if needed.
- Keep per-event order links and deterministic notes exactly as support context.

Avoid:

- Treating deterministic notes as analytics, risk scoring, or prediction.
- Adding scheduling mutation controls.

### Loading / Error / Empty State Polish

Candidate direction:

- Improve rough loading and error presentation with clear, non-alarming operational copy.
- Distinguish no events for current lens/range from data-load failure.

Avoid:

- Suggesting hidden restore/reopen/unarchive behavior.
- Adding retry/write actions without separate design.

### Mobile Stacking Cleanup

Candidate direction:

- Keep controls scannable above the calendar.
- Keep the selected-day rail readable below the calendar.
- Avoid oversized explanatory copy before the primary calendar surface.

Avoid:

- Collapsing core controls into new disclosure behavior before testing.

## Governance Rules

- No backend changes.
- No Supabase changes.
- No query semantics changes.
- No new calendar data sources.
- No scheduling mutation behavior.
- No drag/drop scheduling.
- No workflow behavior changes.
- No lifecycle behavior changes.
- No permission or route-guard changes.
- No product-mode/module authority changes.
- No archived/cancelled/voided leakage into active calendar surfaces.
- No fake analytics, fake KPIs, predictive scoring, or unsupported risk language.
- No cross-company aggregates.
- No Smart Action behavior changes.

## Recommended First Implementation

Calendar Workspace Polish Slice 1B should be a frontend-only route-shell audit and context plan
before runtime edits.

Calendar Workspace Polish Slice 1C should be the first runtime pass:

- polish the `/calendar` header and spacing;
- group scheduling controls more clearly;
- add a compact read-only context row if useful;
- refine legend/rail placement;
- improve loading/error/no-event presentation;
- improve mobile stacking;
- preserve `v_orders_active_frontend_v4`, role filtering, event normalization, Lens filtering,
  selected-day behavior, event click behavior, and Order Detail navigation exactly.

No table/workflow/order mutation work belongs in this first calendar phase.

## Deferred Work

- Shared dashboard/standalone calendar shell extraction.
- Dedicated backend calendar event source unification.
- Company timezone and working-hours policy.
- Calendar saved views.
- Week/day parity for standalone calendar if product value is proven.
- Drag/drop scheduling or direct calendar editing.
- Appointment rescheduling permissions.
- Conflict detection.
- Workload/capacity modeling.
- Predictive scheduling risk.
- Unassigned/at-risk lenses.
- ICS/export or external calendar sync.
- Calendar-specific production smoke checklist.

## Slice 1A Closeout

Standalone Calendar Workspace Polish Slice 1A is complete as documentation plus read-only
inspection. The new strategy records the current standalone `/calendar` architecture, dashboard
versus calendar inconsistencies, target operational hierarchy, first-pass polish candidates,
governance rules, and deferred work.

No runtime files, backend behavior, routes, permissions, RLS/RPCs, Supabase queries, calendar
event semantics, scheduling behavior, workflow behavior, lifecycle behavior, or mutation paths
changed.

## Slice 1B Header / Workspace Hierarchy Polish

Standalone Calendar Workspace Polish Slice 1B implements the first frontend-only route-shell polish
pass for `/calendar`.

Completed:

- Reframed the page as `Calendar Workspace` under `Scheduling Coordination`.
- Kept copy focused on coordinating site visits, review handoffs, and client due dates across
  active orders.
- Added a compact read-only context group from already available state:
  - current company;
  - work-view context;
  - loaded active-order count / loading state.
- Grouped existing view, range, weekend, and Lens controls under a `Scheduling Controls` section.
- Added a compact current-view summary from existing state:
  - view/range label;
  - Lens label;
  - selected-day label.
- Kept `CalendarLegend` as supporting explanation under the control section.
- Improved loading and error presentation with non-mutating status/alert blocks.
- Kept the primary calendar grid and selected-day detail rail in the existing two-column desktop
  layout and mobile stacking pattern.

Preserved boundaries:

- No backend changes.
- No Supabase changes.
- No query semantics changes.
- No new calendar data source.
- No event mutation behavior.
- No scheduling mutation, drag/drop, workflow, lifecycle, or permission behavior changes.
- No shared dashboard calendar behavior changes.
- No archived/cancelled/voided leakage into active calendar surfaces.
- No fake analytics, fake KPIs, predictive scoring, unsupported risk language, or cross-company
  aggregates.

Validation:

- Added a focused `CalendarPage` presentation test covering the new workspace hierarchy and the
  preserved active-order read source / reviewer scope filter behavior.

## Slice 1C Calendar Body / Rail Hierarchy Polish

Standalone Calendar Workspace Polish Slice 1C polishes the calendar body, primary grid framing,
selected-day rail hierarchy, and empty state presentation without changing scheduling behavior.

Completed:

- Added a `Schedule Board` wrapper around the existing standalone calendar grid area.
- Added short board context copy derived only from the active view:
  - month view copy for scanning site visits, review handoffs, and client due dates;
  - multi-week copy for near-term operational range review.
- Added a small board mode badge (`Month calendar` or week-range calendar label).
- Added horizontal overflow protection around the calendar grid on small screens without changing
  grid components, date selection, or event rendering.
- Updated `CalendarDayDetailRail` hierarchy from generic `Day Detail` to `Selected Day`.
- Added a compact total badge and accessible event-count group label in the selected-day rail.
- Added a calm empty state when the selected day has no events.
- Added accessible order-opening labels to selected-day event buttons.

Preserved boundaries:

- No backend changes.
- No Supabase changes.
- No query semantics changes.
- No event derivation changes.
- No date selection behavior changes.
- No role scoping changes.
- No order navigation behavior changes.
- No scheduling mutation behavior.
- No workflow/lifecycle/permission behavior changes.
- No shared dashboard calendar behavior changes.
- No fake analytics, predictive scoring, new scheduling feature, or cross-company aggregate.

Validation:

- Updated the focused `CalendarPage` presentation test for the new `Schedule Board` hierarchy.
- Added a focused `CalendarDayDetailRail` presentation test covering empty state, grouped event
  rendering, and preserved order-opening callback behavior.

## Slice 1D Consistency / Accessibility / Responsive Cleanup

Standalone Calendar Workspace Polish Slice 1D closes the first Calendar Workspace polish pass with
a small consistency, accessibility, and responsive-readability sweep across the surfaces changed in
Slices 1B and 1C.

Completed:

- Normalized the Lens summary copy from `All schedule signals` to `All schedule`.
- Normalized the header context count label from `Loaded` to `Orders`.
- Added singular/plural active-order count copy for the workspace context chip.
- Added an accessible label to the combined schedule-board / selected-day-details region.
- Normalized selected-day total badge copy to `0 events`, `1 event`, or `N events`.
- Added an accessible label for the selected-day total badge.
- Reviewed header, controls, current-view chips, schedule board, horizontal grid wrapper, selected
  day rail, empty states, and order-opening buttons for duplicate wording and responsive stacking.

First-pass completion checkpoint:

- Calendar Workspace Polish Slices 1A through 1D now form the first governed standalone calendar
  polish foundation: strategy, header/workspace hierarchy, calendar body/grid/rail polish, and
  consistency/a11y/responsive cleanup.
- The foundation improves hierarchy and readability only. It does not change operational
  authority, data access, scheduling semantics, route behavior, or event/query behavior.

Preserved boundaries:

- No backend changes.
- No Supabase changes.
- No event/query semantics changes.
- No scheduling mutations.
- No permission/workflow/lifecycle changes.
- No fake analytics or predictive scoring.
- No new calendar features.
- No shared dashboard behavior changes.
- No archived/cancelled/voided leakage into active calendar surfaces.

Validation:

- Existing Calendar page and selected-day rail tests continue to cover the polished hierarchy,
  preserved read scope, selected-day empty/grouped states, and order-opening callback behavior.
