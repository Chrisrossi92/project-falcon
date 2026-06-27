# Falcon Orders List Experience Plan

## Purpose

This plan records how the Orders list and table should evolve before Premium Experience
implementation begins.

It is architecture and UX inspection only. It does not approve runtime behavior changes, workflow
changes, data-fetching changes, schema changes, RPC changes, permission changes, route changes, or
new product features.

## Review Scope

Reviewed:

- `docs/architecture/FALCON_PRODUCT_EXPERIENCE_AUDIT.md`
- `docs/architecture/FALCON_PREMIUM_EXPERIENCE_SPRINT_1_CHECKPOINT.md`
- `docs/architecture/FALCON_DESIGN_SYSTEM.md`
- `docs/architecture/FALCON_MOTION_AND_INTERACTION_GUIDE.md`
- `src/pages/orders/Orders.jsx`
- `src/features/orders/OrdersFilters.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/components/orders/table/OrdersTableRow.jsx`
- `src/components/orders/table/OrdersTablePagination.jsx`
- `src/features/orders/columns/ordersColumns.jsx`
- `src/features/orders/components/SmartActionsControl.jsx`
- `src/components/orders/drawer/OrderDrawerContent.jsx`
- `src/pages/orders/HistoricalOrders.jsx` as a related but separate historical table reference

## Current Strengths

### The Page Already Owns A Clear Job

Orders is Falcon's high-frequency triage surface. It already supports finding, comparing, and
opening operational order records without forcing users into Order Detail first.

The page has a clear header, workspace context, role-aware title/copy, a create-order action for
full operations views, URL-governed filters, active filter chips, saved views, queue-derived
filtering, pagination, inline row details, and row-level Smart Actions.

### Filters Are More Mature Than Most Surfaces

Filters are encoded in the URL and remain shareable/bookmarkable. The current filter set covers
search, status, client, appraiser, reviewer, My Work, priority, due window, queue, page, and page
size. Active filter chips make the current scope visible after a filter is applied.

Saved views are also useful because they preserve existing filter state without inventing another
navigation model.

### The Table Supports Real Triage

The unified table already exposes the fields users need for comparison:

- Order number and status
- Client and assigned appraiser
- Property/address context
- Property/report type
- Fee
- Smart Actions
- Site visit, review due, and final due dates
- AMC procurement status chips where applicable
- Row-level conservative next-step support copy

The inline drawer gives users supporting context without immediately navigating away. That is the
right pattern for quick scan-and-check work.

### Role-Focused Variants Exist

Appraiser and reviewer views already simplify some page chrome and copy. That gives future polish a
safe direction: strengthen the existing role focus rather than create new modes.

## Current Weaknesses

### Scanability Is Good But Visually Busy

The table contains the right information, but several elements compete inside each row:

- Order number link
- Status badge
- Procurement chip
- Client and appraiser
- Property summary pills
- Smart Action button or dropdown
- Due date blocks
- Next-step chip below the row

Users can find the right order, but the eye has to parse many small badges and pills before the
priority of each row is clear.

Status, due dates, client, property, assigned user, and workspace/procurement context are present,
but they do not yet have a clear hierarchy across all roles. Dates and Smart Actions often feel
equally weighted, while passive metadata sometimes looks as prominent as operational signals.

### Table Hierarchy Is Not Fully Settled

The highest-value comparison fields should be:

1. Order identity/status
2. Property/address
3. Current action or blocker
4. Due pressure
5. Client/assigned user
6. Procurement context when in AMC operations
7. Fee and secondary metadata

Current column treatment partly supports this, but the row still contains multiple badge systems:
status badges, property/report pills, procurement chips, due date cards, and next-step chips. That
can make passive metadata feel like action or risk.

The table also has a sticky first column implementation and inline detail behavior, but row
interaction semantics are currently visual-first rather than keyboard-first.

### Filters And Saved Views Use Local Styling

`OrdersFilters`, `ActiveFilterChips`, and `SavedViewsPanel` use local button, hover, error, loading,
and empty-state classes rather than Falcon's shared interaction and state primitives.

Filters are obvious, but the full filter surface is visually loud relative to the table. The active
filter chips help orientation, yet the clear actions and chips use separate local treatments from
other clickable surfaces.

The saved views panel has useful behavior, but its loading, empty, error, row hover, delete, save,
and focus treatment are all local to this page.

### Row Interaction Needs A Stronger Accessibility Baseline

Rows are visually clickable and toggle an inline drawer on click. Clicks on nested controls are
guarded by `data-no-drawer` and `data-interactive`, which is good for behavior preservation.

However, the row is rendered with `role="row"` and click handling but not as a keyboard-activatable
button/disclosure. Future polish should clarify:

- What opens the inline drawer.
- What navigates to Order Detail.
- What performs a Smart Action.
- Which cells are passive metadata.

Hover and press states currently use raw local transition, transform, shadow, and duration classes
instead of shared interaction helpers or motion tokens.

### Loading, Empty, And Error States Are Local

The table has a useful row-shaped loading skeleton and a centered empty state. Error states are
recoverable and visible. These are good foundations, but they are local implementations.

Future work should adopt Falcon state primitives while preserving the current product meaning:

- Loading should preserve table shape.
- Empty states should explain whether filters, queues, or lack of active work caused the absence.
- Error states should be calm and recoverable, not alarm-heavy.
- Saved view states should use the same language and rhythm.

### Workflow Clarity Can Be Sharpened

Orders does make the next action visible through row Smart Actions, but table controls and row
controls can compete. The page-level primary action is New Order in full operations views. Row-level
Smart Actions are primary only within a row.

Saved Views, filter controls, Clear Filters, page controls, row drawer toggling, Order Detail links,
and Smart Actions all appear on the same page. Their hierarchy should remain clear:

- Page action: create a new order.
- Table action: find and triage orders.
- Row action: advance or inspect one order.
- Utility action: save/apply/reset filtering.

### Responsive Behavior Is A Risk Area

The table uses CSS grid columns with responsive `minmax` tracks and inline overflow behavior inside
the table shell. On narrow viewports, this likely remains usable but dense.

The future responsive strategy should decide which information remains primary and which becomes
secondary:

- Keep order identity, status, property/address, due pressure, and Smart Action visible early.
- Move fee, appraiser/reviewer, property/report pills, procurement details, and long metadata into
secondary row detail or stacked summaries when width is constrained.
- Preserve explicit Order Detail navigation.
- Do not rely on hover-only cues on touch devices.

## Immediate Wins

### Slice Candidate: Table State Foundation

Adopt shared state primitives for existing table loading, empty, and recoverable error states.
Keep the same data fetching and behavior.

Use `FalconSkeleton` for row-shaped loading, `FalconEmptyState` for no results/no active work, and
`FalconErrorState` for recoverable table load failures. Preserve the existing queue-aware and
role-aware empty-state copy.

### Slice Candidate: Row Interaction Baseline

Replace raw local row hover, press, selected/open, focus-visible, and disabled-like styling with
shared interaction helpers where behavior is already interactive.

Do not make passive cells look clickable. Keep Smart Action controls, Order Detail links, and
drawer toggle behavior distinct.

### Slice Candidate: Filter And Chip Polish

Apply shared interaction helpers to existing filter chips, status pills, My Work segmented buttons,
Clear Filters, and saved-view trigger/rows.

Reduce visual loudness without removing filters or changing filter logic. Active filter state must
remain visible.

### Slice Candidate: Saved Views State Polish

Use shared state primitives for saved-view loading, empty, and error states. Keep save, apply, and
delete behavior unchanged.

Saved view rows should feel like clickable rows only where they apply a view. Delete should remain a
separate quiet secondary/destructive-adjacent action.

## Medium Improvements

### Clarify Row Hierarchy

Make row hierarchy more consistent:

- Order/status and property/address should lead.
- Smart Action should be clear but row-scoped.
- Due dates should be easy to compare and should not compete with the order identity.
- Client/appraiser should be secondary context.
- Fee should remain compact and quiet.
- Procurement chips should be visible in AMC mode without overwhelming internal rows.

This can be done through spacing, type weight, muted text, and existing tokens. It should not
change columns or remove fields in the first implementation slice.

### Improve Drawer Presentation

The inline drawer gives useful context, but its loading/error states, activity/contact/map panels,
and links use local styling. Future work should align it with the Order Detail lower-section
language and shared state primitives while preserving the same drawer content.

The drawer should remain supporting context. It should not become a second Order Detail page inside
the table.

### Make Table Controls Feel Like One System

Pagination, active queue callout, active chips, saved views, and filter controls should use one
interaction language. Pagination is especially separate today because it uses the generic `Button`
component with local surrounding layout.

Future work should keep current pagination behavior but align disabled, hover, focus, and spacing
with the shared interaction system.

### Strengthen Keyboard Semantics

Clarify whether the row itself is a disclosure control or whether a dedicated row toggle should own
expansion. The first implementation should be conservative:

- Preserve click behavior.
- Add obvious focus-visible behavior where an element is keyboard reachable.
- Avoid turning the whole row into a misleading link if nested controls already exist.
- Consider a dedicated "View details" disclosure control in a later slice only if it can be done
without workflow redesign.

## Long-Term Vision

Orders should become Falcon's standard list/table pattern:

- Calm page header with one page-level primary action where appropriate.
- Quiet, visible filters with persistent active state.
- A dense but scannable table where rows are easy to compare.
- Row-level Smart Actions that do not compete with navigation or filters.
- Consistent loading, empty, error, updating, and success feedback.
- Clear separation between passive metadata, expandable row detail, and true actions.
- Responsive behavior that preserves triage priority instead of simply squeezing every column.

The long-term pattern should later influence assignments, vendors, client portal order lists,
historical orders, and other repeated record tables. That broader table-system work should happen
only after Orders proves the pattern in one high-frequency surface.

## Implementation Roadmap

### Slice 1: Table State Foundation

Goal: standardize existing Orders table loading, empty, and error states.

Status: Completed in Premium Experience Sprint 3B.

Scope:

- Adopt shared state primitives in `UnifiedOrdersTable`.
- Preserve current loading shape, empty copy, queue-aware copy, role-aware copy, and table count.
- Do not change fetching, filters, pagination, rows, columns, actions, or drawer behavior.

Validation:

- Focused `UnifiedOrdersTable` tests.
- Orders page tests if state expectations change.
- Targeted eslint and `git diff --check`.

Implementation notes:

- `OrdersPage` now uses `FalconPageMotion` as the page wrapper.
- `UnifiedOrdersTable` now uses `FalconLoadingState` and `FalconSkeleton` for the existing
  table-loading path while preserving row-shaped placeholders and row count.
- `UnifiedOrdersTable` now uses `FalconEmptyState` for existing empty and filtered-empty states
  while preserving queue-aware, role-aware, and caller-provided copy.
- `UnifiedOrdersTable` now uses `FalconErrorState` for existing recoverable table load errors.
- Filtering, sorting, searching, row expansion, Smart Actions, pagination, permissions, routes,
  schemas, RPCs, and data fetching were left unchanged.

### Slice 2: Row Interaction Baseline

Goal: make row hover, press, focus, open, and nested-action behavior consistent.

Status: Completed in Premium Experience Sprint 3C.

Scope:

- Use shared interaction helpers in `OrdersTableRow`.
- Remove raw local transition/transform values where shared helpers cover the behavior.
- Preserve row click-to-expand behavior and nested control propagation guards.
- Add keyboard/focus polish only where the current structure safely supports it.

Validation:

- `OrdersTableRow` tests.
- `UnifiedOrdersTable` interaction tests for row expansion and Smart Action propagation.

Implementation notes:

- `OrdersTableRow` now uses Falcon's shared row interaction recipe and tokenized interaction
  timing instead of local row transition, transform, and duration classes.
- Expanded rows now use the shared selected-state treatment while preserving the existing inline
  drawer behavior and nested control propagation guards.
- Passive row metadata was lightly quieted through type weight and badge background adjustments in
  the Orders column renderers. The same columns, values, links, Smart Actions, filtering, sorting,
  search, pagination, permissions, routes, schemas, RPCs, and data fetching were left unchanged.
- Keyboard semantics were intentionally not expanded in this slice because the current row remains
  a table row with nested links and controls. A dedicated disclosure control remains a later
  accessibility slice if product design approves it.

### Slice 3: Filter And Active Chip Polish

Goal: align filters, active chips, and clear actions with Falcon's interaction foundation.

Status: Completed in Premium Experience Sprint 3D.

Scope:

- Apply shared interaction helpers to filter segmented controls, status chips, active filter chips,
  and Clear Filters.
- Keep URL serialization and filter semantics unchanged.
- Keep all existing filter options.
- Do not add new saved-view behavior.

Validation:

- Orders page filter tests.
- Focused tests for active chips if coverage exists or is added.

Implementation notes:

- `OrdersFilters` now uses Falcon shared interaction helpers and tokenized interaction timing for
  assignment scope buttons, status chips, search, and select controls.
- Active filter chips, the Clear Filters action, and the Saved Views trigger now use the shared
  quiet secondary action recipe so they stay available without competing with page-level actions.
- Filter labels remain passive text, and no filters were added, removed, or renamed.
- Search, status, client, appraiser, priority, due-window, My Work, saved-view, reset/clear,
  sorting, pagination, row expansion, row behavior, permissions, routes, schemas, RPCs, and data
  fetching were left unchanged.

### Slice 4: Table Hierarchy And Scan Speed

Goal: improve table scan speed without changing table behavior or data.

Status: Completed in Premium Experience Sprint 3E.

Scope:

- Classify visible table columns as primary, secondary, or supporting.
- Adjust type weight, muted metadata, spacing, alignment, and badge balance in row cells.
- Keep the same columns and values.
- Make order status, property/address, client, and due dates easier to scan.
- Keep assigned appraiser, fee, report type, internal identifiers, and repeated metadata visible but
  secondary or supporting.

Validation:

- Presentation tests for the visible column set and hierarchy classes.
- Focused Orders tests.
- Targeted eslint and `git diff --check`.

Implementation notes:

- Visible column classification:
  - Primary: `Property Summary` address/location, client, status badge, review/final due dates.
  - Secondary: assigned appraiser, fee, and row-scoped action area.
  - Supporting: report type, property type, internal order identifier, site date, and repeated
    metadata.
- `ordersColumns.jsx` now gives stronger visual weight to address, client, and due-date values,
  while making report type, property type, appraiser, fee, and site-date context quieter.
- The visible column list remains `Order / Status`, `Client / Appraiser`, `Property Summary`,
  `Fee`, `Actions`, and `Dates`.
- Sorting, filtering, search, pagination, row expansion, row behavior, permissions, routes,
  schemas, RPCs, and data fetching were left unchanged.

### Slice 5: Saved Views State And Interaction Polish

Goal: make Saved Views calmer and more consistent.

Status: Completed in Premium Experience Sprint 3F.

Scope:

- Use shared state primitives for loading, empty, and error states in `SavedViewsPanel`.
- Use shared interaction helpers for saved-view rows, trigger, delete, and save actions.
- Preserve create/apply/delete behavior and supported filter validation.

Validation:

- Orders page saved-view tests or focused new tests around render/apply/delete behavior.

Implementation notes:

- `SavedViewsPanel` now uses `FalconLoadingState`, `FalconEmptyState`, `FalconErrorState`, and
  `FalconUpdatingIndicator` for existing loading, empty, error, and saving states.
- Saved-view apply rows now use shared row and quiet secondary interaction treatment so the
  selectable view name is clear without making surrounding passive panel text look clickable.
- Delete remains present and governed, but now uses Falcon's destructive action baseline so it is
  visually distinct from apply/select without becoming visually loud.
- The Saved Views trigger remains a quiet secondary filter utility, and the panel hierarchy now
  separates title/help text, recoverable state, saved views, and save-current-view controls.
- Persistence, apply/delete/save behavior, supported-filter validation, filters, search, sorting,
  pagination, routes, permissions, schemas, RPCs, and data fetching were left unchanged.

### Slice 6: Inline Drawer State And Context Polish

Goal: align the expanded row drawer with the shared state and support-section language.

Status: Completed in Premium Experience Sprint 3G.

Scope:

- Use shared state primitives for drawer loading and recoverable errors.
- Make drawer activity, contacts, map/location, and operational inputs feel like supporting
  context.
- Preserve drawer content, fetching, links, activity behavior, and map behavior.

Validation:

- `OrderDrawerContent` focused tests.
- `UnifiedOrdersTable` row expansion tests.

Implementation notes:

- `OrderDrawerContent` now uses `FalconLoadingState`, `FalconSkeleton`, `FalconEmptyState`, and
  `FalconErrorState` for existing loading, no-selection, and recoverable error paths.
- Existing drawer links such as Open in Maps now use Falcon's shared quiet secondary interaction
  treatment, and telephone links retain clear focus-visible affordance.
- Contact and location panels were lightly quieted so they read as supporting context below the
  row's primary scan targets.
- Activity, operational evidence, contacts, location/map content, row expansion, row click
  behavior, nested action guards, routes, permissions, schemas, RPCs, and data fetching were left
  unchanged.

### Slice 7: Responsive Review

Goal: verify and refine Orders on narrow viewports.

Status: Completed in Premium Experience Sprint 3H.

Scope:

- Inspect mobile/narrow behavior after prior slices.
- Fix class-only wrapping, spacing, clipped text, and overflow issues.
- Do not remove fields or reorder major table meaning unless a separate responsive design slice is
  approved.

Validation:

- Browser QA across desktop and narrow widths.
- Focused tests only if structure changes.

Implementation notes:

- Orders header actions now wrap below the title on narrow widths instead of competing with the
  page description.
- Filter utility actions, assignment scope, search, client/appraiser selectors, priority, and due
  controls now stack to full width on narrow viewports before returning to inline layout on wider
  screens.
- Active filter chips now give the Filters label its own row on narrow screens, keeping Clear
  Filters available without crowding individual chips.
- Saved Views keeps the existing popover behavior, but the trigger, panel anchoring, saved-view
  rows, and save form now wrap more safely on narrow widths.
- The Orders table preserves the existing min-width/horizontal-scroll strategy; the inner table
  region now scrolls horizontally instead of clipping fixed-width rows.
- Expanded row drawer padding, loading skeletons, activity header, contact cards, and location
  controls now stack/wrap more gracefully.
- No columns, fields, filters, sorting, search, pagination, row expansion, drawer behavior, routes,
  permissions, schemas, RPCs, handlers, or data fetching were changed.

Deferred:

- A dedicated mobile table/card layout remains out of scope. If Orders needs a true touch-first
  triage experience, it should be planned as a separate responsive table design slice.

### Slice 8: Visual QA And Final Consistency Review

Goal: verify the completed Orders premium experience pass before expanding adoption to another
surface.

Status: Attempted in Premium Experience Sprint 3I. Browser QA was blocked by authentication.

Future Orders browser QA should follow
`docs/architecture/FALCON_PREMIUM_EXPERIENCE_QA_GUIDE.md`, including authenticated persona setup,
representative table/filter/drawer state coverage, viewport notes, and explicit `passed`,
`needs fixes`, `attempted`, or `blocked` status recording.

Browser availability:

- Local Vite server was started on `http://127.0.0.1:5173`.
- The in-app browser successfully opened `http://127.0.0.1:5173/orders`.
- Falcon redirected to the sign-in screen:
  - Page title: `Falcon - Continental Internal Operations`
  - Visible state: `Sign in to Falcon`
- No browser console errors were observed on the sign-in screen.

States requested but not visually verified because authentication blocked access:

- Default Orders view.
- Filtered Orders view.
- Search results.
- No-results / empty state.
- Loading state.
- Error state.
- Saved Views open.
- Expanded row drawer.
- Desktop width.
- Tablet/narrow width.
- Mobile/narrow width with horizontal table scroll.

Code-level validation still covered these surfaces:

- Orders page hierarchy, active filters, Saved Views, saved-view apply/delete/error handling, and
  URL-filter preservation.
- Orders filters and search behavior.
- Unified Orders table loading, empty, error, row interaction, Smart Actions, and drawer
  propagation guards.
- Orders row expansion and nested-control guards.
- Drawer loading, empty, error, contact, activity, map/location, and operational evidence
  rendering.

Fixes made during QA:

- None. Browser access did not reach the Orders UI, so no new visual regression was confirmed.

Deferred visual issues:

- Real desktop, tablet, and mobile browser QA remains required with an authenticated local session
  or seeded QA credentials.
- Horizontal table scroll, Saved Views popover placement, active-chip wrapping, and expanded drawer
  stacking should be visually confirmed before broadening the Orders pattern to other list/table
  surfaces.

Final recommendation:

- Treat Orders as code/test reviewed but not browser-QA confirmed.
- Complete authenticated browser QA for Orders before using this as the final list/table pattern.
- After authenticated QA passes, the next premium adoption surface should be Calendar if the goal is
  schedule scanability, or Vendor Workspace dashboard if the goal is external/vendor operational
  polish. If list/table consistency remains the priority, apply the proven Orders pattern to the
  next high-frequency table only after the visual QA blocker is cleared.

## Non-Goals

- Do not redesign the Orders workflow.
- Do not invent new filters, saved-view behavior, table features, columns, or row actions.
- Do not change data fetching, query parameters, routes, schemas, RPCs, permissions, or workflow
  handlers.
- Do not remove fields or reorder major table meaning in the first polish slices.
- Do not make passive cells look clickable.
- Do not add broad page animation or raw animation values.
- Do not apply Orders table polish to unrelated pages until this surface proves the pattern.
