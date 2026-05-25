# Falcon Design System Foundation

## Purpose

This document codifies Falcon's emerging operational design language after the first-pass polish of
the Dashboard, Orders, Calendar, Clients, and Assignments workspaces.

Phase 1A is documentation only. It does not introduce runtime components, theme tokens, Tailwind
configuration, backend behavior, Supabase behavior, query behavior, permissions, product-mode
authority, feature expansion, or animation libraries.

The goal is not a redesign. The goal is to make the patterns already present in Falcon explicit so
future slices stay coherent, restrained, accessible, and governable.

Reference polished foundations:

- `operational-dashboard-polish-v1`
- `orders-workspace-polish-v1`
- `calendar-workspace-polish-v1`
- `clients-workspace-polish-v1`
- `assignments-workspace-polish-v1`

Inspected surfaces:

- `src/features/dashboard/DashboardPage.jsx`
- `src/pages/orders/Orders.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/pages/Calendar.jsx`
- `src/components/calendar/CalendarDayDetailRail.jsx`
- `src/pages/clients/ClientsIndex.jsx`
- `src/components/clients/ClientCard.jsx`
- `src/pages/clients/ClientDetail.jsx`
- `src/features/assignments/AssignmentsPage.jsx`
- `src/features/assignments/AssignedAssignmentInbox.jsx`
- `src/features/assignments/OwnerAssignmentManagement.jsx`
- `src/features/assignments/AssignmentPrimitives.jsx`

## Operational UX Philosophy

Falcon's operational product surfaces are workspaces, not landing pages. A workspace should open
directly into the user's current operational frame: what surface they are in, what scope they are
working inside, what the primary work surface is, and which support signals are secondary.

Core principles:

- Make the primary work surface obvious. Calendar, Orders table, client directory, assignment
  lanes, and packet/detail surfaces should not compete with secondary cards.
- Use existing governed data only. Do not invent analytics, priority, pressure, risk, capacity, or
  scoring signals in presentation code.
- Reinforce authorization boundaries in language and layout. Assignment packet surfaces should
  feel packet-scoped; historical orders should feel preserved and read-only; setup guidance should
  feel advisory.
- Keep unavailable or future product concepts hidden unless there is a specific contextual reason
  to show an upgrade or setup prompt.
- Prefer dense but calm operational hierarchy over decorative composition.
- Use motion as small interaction feedback, not as decoration or implied intelligence.
- Preserve existing route, permission, query, lifecycle, workflow, and mutation authority when
  polishing presentation.

## Current Visual Language

Falcon's current polished surfaces share these traits:

- White operational shells on a slate page/background context.
- Thin slate borders, small shadows, and restrained `ring-1 ring-slate-100` accents.
- Rounded corners in the `rounded-lg`, `rounded-xl`, and occasional `rounded-2xl` range.
- Slate as the dominant neutral system, with blue, emerald, amber, rose, purple, violet, and
  indigo reserved for status, category, or attention meaning.
- Compact uppercase eyebrow labels for workspace lanes and metadata.
- Short operational page titles such as `Operations Dashboard`, `Orders Workspace`,
  `Calendar Workspace`, `Clients Workspace`, and `Assignments Workspace`.
- Read-only context tiles and chips immediately below or beside the header.
- Primary work surfaces first, with support rails or operational support panels after or beside
  the primary surface.

Avoid:

- Marketing hero patterns.
- Decorative gradients, orbs, large illustrations, and visual effects that do not carry
  operational meaning.
- Nested cards inside cards unless the inner card is a repeated item, metric tile, modal, or
  structured metadata field.
- One-off palettes that make a workspace feel unrelated to Falcon's operational language.
- Disabled future modules as clutter.

## Falcon v1 Brand / Layout Direction

`docs/FALCON_V1_OPERATIONAL_COMPLETION_STRATEGY.md` locks Falcon v1 as Continental's Internal Staff
Appraiser Platform.

`docs/FALCON_V1_BRAND_SHELL_LAYOUT_AUDIT.md` extends that lock with the Phase A1 visual/shell/layout
audit before implementation.

`docs/FALCON_V1_SHELL_NAV_REFACTOR_PLAN.md` extends Phase A1 with the Phase A2 shell/navigation
planning direction.

Design-system work for v1 should support that direction by making Falcon feel like a premium
operational console:

- stronger contrast than the early prototype surfaces;
- defined borders around operational zones;
- framed work areas that make the current task obvious;
- layered surfaces with purposeful depth;
- accent-wall style visual anchors where they create operational orientation;
- restrained shadow hierarchy;
- calm but structured interface rhythm;
- low cognitive load for repeated daily use.

This direction does not authorize decorative redesign or feature expansion. Visual richness must
serve the internal operational loop for appraisers, reviewers, owners, and admins.

Phase A1 identifies the first visual completion priorities as shell hierarchy, workspace
containment, navigation hierarchy, surface layering, role/work anchors, and density/elevation
consistency.

Phase A2 refines the shell/navigation side of that work: daily operational lanes should visually
lead, management/support should be secondary, active workspace identity should be stronger, and
shell containment should connect navigation, workspace headers, and primary work surfaces.

`docs/FALCON_V1_SURFACE_ELEVATION_SYSTEM_PLAN.md` extends the v1 visual direction with Phase A3
surface/elevation planning. It defines repeatable recipes for app background, workspace shell,
primary operational panels, secondary context panels, action/decision surfaces, read-only evidence
surfaces, high-priority states, and table/list surfaces before broad workspace polish.

Phase A3 does not authorize runtime implementation, CSS refactors, broad component rewrites, route
or permission changes, workflow changes, dashboard data rewrites, backend/Supabase changes, AMC
features, Client Portal work, automation, notifications, mobile/native implementation, or AI work.

Phase A3.1 adds the first runtime surface recipe foundation in
`src/components/workspace/WorkspaceSurface.jsx`. It is a passive helper layer only: recipes and a
small wrapper for primary, secondary, action, evidence, priority, and table/list surfaces. Existing
Dashboard, Orders, and Order Detail surfaces are not migrated by A3.1; later workspace passes
should opt into the helper one surface family at a time.

## Workspace Shell Standard

A Falcon workspace should generally use this hierarchy:

1. Workspace header
2. Optional read-only context strip
3. Controls or setup guidance when relevant
4. Primary work surface
5. Secondary support rail or support section
6. Detail, history, or advisory content

The order can change when the surface has a stronger operational reason. For example, the
dashboard keeps Calendar before Orders because the current operational cockpit is calendar-first.

### Workspace Header

Headers establish the operational frame.

Recommended structure:

- Eyebrow: small uppercase domain label, such as `Falcon Operations`, `Active Operations`,
  `Scheduling Coordination`, `Relationship Management`, or `Packet Coordination`.
- H1: literal workspace name.
- Support copy: one concise sentence explaining the current work surface and scope.
- Optional action group: only existing, allowed actions. Do not add future-action placeholders.
- Optional context tiles: company, work view, active count, visible lanes, or access scope.

Typical styling:

- `rounded-xl` or `rounded-2xl`
- `border border-slate-200`
- `bg-white` or `bg-slate-50/80` when the header needs a quieter relationship/detail feel
- `px-4/5 py-4`, with `lg:px-6` only for larger workspace shells
- `shadow-sm`, optionally `ring-1 ring-slate-100`

### Context Strips

Context strips are read-only scope indicators. They should clarify operational scope without
becoming fake analytics.

Good context values:

- Company
- Work View
- Active Orders
- Visible Orders
- Access
- Navigation
- Active Filter
- Results
- Selected Day

Bad context values:

- Scores without a backend model
- Predicted risk
- Workload pressure
- Performance labels
- Hidden permission or role implementation details
- Raw IDs unless the ID is already the user-facing record label

Context tiles should be compact, scan-friendly, and stable under responsive wrapping.

### Primary Work Surface

Primary work surfaces should stay visually stronger than support content:

- Orders: `UnifiedOrdersTable` is the main active inventory.
- Dashboard: Calendar first, Orders table second.
- Calendar: schedule board first, selected-day rail second.
- Clients: relationship controls and directory first, detail context second.
- Assignments: Received Work and Sent Assignments lanes first, packet detail second.

The support rail should not look like a competing dashboard unless its data is authoritative and
the slice explicitly designs it.

## Section Shells And Cards

### Section Shells

Use section shells for bounded workspace areas:

- `rounded-xl` or `rounded-2xl`
- `border border-slate-200`
- `bg-white`
- `p-3`, `p-4`, or `px-4 py-4`
- `shadow-sm`

Section headers should be short and operational:

- `Calendar`
- `Active Worklist`
- `Status`
- `Operational Support`
- `Relationship Controls`
- `Client Directory`
- `Schedule Board`
- `Received Work`
- `Sent Assignments`
- `Packet Context`

### Cards

Cards should represent repeated operational objects, context summaries, or bounded detail blocks.

Card standards:

- Keep cards compact and information-dense.
- Use a clear identity line first.
- Put status/category badges near identity.
- Use metadata tiles for structured secondary details.
- Put links/actions in a predictable bottom or right-side action area.
- Make the whole card interactive only when that is already the established behavior.
- Use hover feedback sparingly: border, background, small shadow, or tiny translate only.

Card examples already present:

- Client relationship cards.
- Received assignment packet rows.
- Sent assignment packet rows.
- Operational KPI cards.
- Packet timeline rows.

## Spacing Cadence

Current Falcon spacing is intentionally compact.

Recommended cadence:

- Page stack: `space-y-4` or `space-y-5`.
- Workspace header: `px-4 py-4`, `px-5 py-4`, or `lg:px-6`.
- Section shell: `p-3` or `p-4`; use `px-5 py-4` for denser headers.
- Internal section gap: `gap-2`, `gap-3`, or `gap-4`.
- Metadata tile: `px-3 py-2`.
- Chip/badge: `px-2 py-0.5`, `px-2.5 py-1`, or `px-3 py-1.5`.
- Control height: usually `h-9` or `px-3 py-2`.

Avoid large vertical gaps unless the surface is a true top-level page separator.

## Typography Rhythm

Recommended rhythm:

- Eyebrows: `text-xs` or `text-[11px]`, uppercase, semibold, expanded tracking, slate 400 or 500.
- H1: `text-2xl font-semibold tracking-tight text-slate-950`.
- Section headings: `text-base font-semibold` or compact uppercase `text-xs font-semibold`.
- Body/support copy: `text-sm leading-6 text-slate-500/600`.
- Metadata labels: `text-[10px]` or `text-[11px]`, uppercase, semibold, slate 400 or 500.
- Metadata values: `text-sm font-medium/semibold text-slate-800/950`.
- Numeric counts: use `tabular-nums` when the count is visually prominent.

Do not use hero-scale type inside work surfaces, rails, cards, drawers, or compact detail panels.

## Color, Elevation, And Status Language

### Neutral System

Use slate as the neutral operational foundation:

- `slate-50` for quiet support backgrounds.
- `slate-100/200` for borders and separators.
- `slate-400/500/600` for labels and support copy.
- `slate-700/800/900/950` for strong text and primary actions.

### Status And Category Tones

Status colors must be deterministic and tied to explicit state:

- Blue: new, site, route, or selected active control.
- Amber: in-progress, due soon, warning, past due when not severe.
- Rose: needs revisions, void/cancel danger, destructive confirmation, load errors.
- Emerald: ready, completed, active, success.
- Purple/Indigo/Violet: review, submitted, AMC/category distinction, owner review.
- Slate/Gray: neutral, inactive, archived, terminal, unknown.

Do not use color to imply a model that does not exist. For example, do not introduce
red/yellow/green operational risk unless the risk contract exists.

### Elevation

Current elevation is shallow:

- `shadow-sm` for shells and cards.
- `shadow-md` only on hover or floating panels where needed.
- Avoid heavy shadow stacks.

## Badge And Action Hierarchy

### Badges

Badges communicate state, category, or scope.

Standards:

- Use `rounded-full border`.
- Use `text-[11px]` or `text-xs`.
- Keep labels short and user-facing.
- Avoid raw implementation terms.
- Use `aria-pressed` for toggle/filter chips.

### Actions

Action hierarchy:

- Primary: dark slate filled button for the main existing action.
- Secondary: white or slate border button.
- Danger: rose treatment for destructive or terminal lifecycle actions.
- Links: underline or button styling based on whether the action navigates inside workflow.

Rules:

- Do not place lifecycle actions in tables unless a separate lifecycle slice designs it.
- Do not add fake disabled future actions.
- Do not move mutation controls between surfaces during presentation polish.
- Use descriptive accessible labels when the visible label is generic, such as `Open packet`.

## Control Grouping

Controls should live under a named group when the surface has more than one control.

Current examples:

- `Scheduling Controls`
- `Relationship Controls`
- Saved Views beside Orders filters
- Assignment status filters in lane headers
- Status rail filters beside Dashboard Orders

Guidelines:

- Keep search/filter/sort controls visually together.
- Keep secondary controls, such as Saved Views or Historical Orders, visibly secondary.
- Preserve canonical URL/query behavior when filters are URL-backed.
- Do not add local-only hidden filter state during polish.
- Controls should wrap cleanly on mobile and keep visible labels.

## Empty, Loading, And Error States

State surfaces should be calm and operational.

Loading:

- Use a short `role="status"` message.
- Do not show fake skeleton metrics unless the final shape is stable.

Empty:

- State what is empty and why, if known.
- Suggest a safe existing adjustment when appropriate, such as broadening filters.
- Do not expose hidden modules or future capabilities.

Error:

- Use `role="alert"`.
- Keep language direct and non-alarming.
- Avoid leaking database, policy, or implementation details unless the surface is explicitly
  diagnostic.

Assignment-specific empty/error language should preserve packet-scope safety and avoid implying
canonical order fallback.

## Responsive Standards

Current responsive rules:

- Stack header content before context tiles on mobile.
- Let context tiles become one-column or wrapped chips on narrow screens.
- Keep primary work surface above support rails on mobile.
- Use desktop sticky rails only with `lg:sticky` or wider.
- Protect wide grids/tables with `overflow-x-auto`.
- Keep table/card actions reachable without horizontal clipping.
- Use `sm`, `md`, `lg`, and `xl` breakpoints to progressively enhance density, not to hide core
  context.

Avoid mobile layouts where secondary support cards appear before the primary work surface.

## Accessibility Expectations

Minimum expectations:

- Every major workspace surface should have a heading or explicit `aria-label`.
- Region labels should distinguish lanes, rails, detail headers, packet actions, and context strips.
- Button labels should describe the action outcome.
- Links with generic visible text should have descriptive `aria-label` values.
- Toggle chips and filters should use `aria-pressed` where appropriate.
- Loading and error states should use `role="status"` and `role="alert"`.
- Decorative separators should be `aria-hidden`.
- Motion should respect `motion-reduce`.
- Heading order should remain coherent inside workspace pages and detail pages.

## Soft Reactive Operational UX

Falcon's motion philosophy is soft, local, and functional.

Current standard:

- Hover feedback through background, border, text color, or shallow shadow.
- Small selected-state shifts only where they communicate active selection.
- `transition` or `transition-all duration-200` for local control feedback.
- `motion-reduce` handling for transform-based feedback.

Motion should:

- confirm an interaction;
- help a selected filter or active card feel responsive;
- remain subtle enough for repeated operational use.

Motion should not:

- imply ranking, urgency, risk, or predictive intelligence;
- animate layout in ways that make tables or worklists harder to scan;
- introduce a new dependency before a separate motion implementation slice;
- rely on ambiguous ad hoc Tailwind easing tokens that are already called out as build-warning
  cleanup debt.

Future token direction, not implemented in Phase 1A:

- Standard durations: 150ms for hover/focus, 200ms for selected-state feedback.
- Standard easing: plain `ease-out` until a tested design token exists.
- Transform discipline: small translate only, with `motion-reduce` fallback.
- No global animation library until a dedicated implementation phase proves the need.

## Candidate Primitives

These are documentation-only extraction candidates. They should not be implemented until a later
slice proves the extraction preserves behavior and reduces duplication.

- `WorkspaceHeader`
- `WorkspaceContextStrip`
- `WorkspaceContextTile`
- `WorkspaceSection`
- `WorkspaceControlGroup`
- `OperationalCard`
- `MetadataGrid`
- `MetadataTile`
- `StatusBadge`
- `AttentionChip`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `SupportRail`
- `DetailHeader`
- `PacketHeader`
- `ActionButton`

Extraction rules:

- Extract one primitive family at a time.
- Start with passive presentational wrappers.
- Keep route, permission, query, mutation, and data ownership unchanged.
- Preserve existing class names and behavior where tests depend on them.
- Add tests around every migrated surface before moving the next workspace.

## Phase 1B Primitive Extraction Inventory

Phase 1B inspected the polished Dashboard, Orders, Calendar, Clients, and Assignments workspaces
for repeated UI structures that are stable enough to consider extracting later. This is still
documentation only. No primitive is implemented in Phase 1B.

### Repeated Patterns Found

Workspace headers are repeated across Dashboard, Orders, Calendar, Clients, Client Detail, and
Assignments:

- eyebrow label;
- H1 workspace/detail title;
- one-sentence operational support copy;
- optional right-side context or action area;
- rounded bordered shell with `shadow-sm`;
- responsive flex wrapping.

Context strips and context tiles are repeated across Dashboard, Calendar, Clients, Client Detail,
Orders, and Assignments:

- label/value tile structure;
- compact uppercase label;
- slate border/background;
- read-only operational scope such as Company, Work View, Results, Orders, Access, Navigation, or
  Active Filter.

Section shells are repeated across every polished workspace:

- rounded bordered white shell;
- compact section heading;
- optional support copy;
- internal `gap-3` / `gap-4` content cadence;
- `aria-labelledby` or region label when the section is meaningful.

Card shells are repeated in client cards, assignment packet rows, operational KPI cards, workload
visibility cards, selected-day event rows, and packet timeline rows:

- identity-first content;
- status/category badges near the identity line;
- structured metadata tiles;
- predictable action/link affordance;
- subtle hover treatment only when interactive.

State blocks are repeated with slight variation:

- loading messages with `role="status"`;
- error messages with `role="alert"`;
- empty states with dashed or quiet bordered treatment;
- assignment-specific empty/error language that preserves packet-scope boundaries.

Control groups repeat in Calendar, Clients, Orders, Dashboard status filters, and Assignments:

- heading plus support copy;
- grouped search/filter/select/button controls;
- secondary actions kept visually lighter;
- URL/query-backed controls remain authoritative where applicable.

Action regions repeat in assignment packets, client detail headers, Orders saved views, dashboard
setup prompt, and lifecycle/detail surfaces:

- primary dark slate actions;
- secondary bordered actions;
- danger rose actions;
- descriptive accessible labels where visible text is generic.

Badge and status treatment repeats across order statuses, client categories/statuses, assignment
statuses, active filter chips, context chips, and attention chips:

- rounded pill shape;
- border plus light background;
- deterministic color tied to explicit state;
- compact semibold text.

Soft interaction/motion repeats in cards, status filters, chips, and links:

- `transition`;
- hover border/background/text changes;
- shallow hover shadow;
- tiny translate only on cards or selected filters;
- `motion-reduce` for transform feedback.

### Candidate Ranking

| Candidate | Safety | Reuse Value | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| `StateBlock` / `LoadingState` / `EmptyState` / `ErrorState` | High | High | Low | Safest first extraction candidate. Mostly passive, low styling variance, easy to test. |
| `ContextTile` | High | High | Low | Strong first or second candidate. Repeated label/value structure with no behavior. |
| `WorkspaceSection` | High | High | Medium | Good candidate after state/context primitives. Needs careful heading/ARIA flexibility. |
| `ActionButton` | Medium | High | Medium | Existing assignment primitive is close, but variants affect many mutation surfaces. Extract slowly. |
| `StatusBadge` / `Badge` | Medium | High | Medium | Useful but color semantics differ by domain. Start with neutral badge shell before status mapping. |
| `WorkspaceHeader` | Medium | High | Medium | High reuse, but each workspace has different action/context needs. Extract after smaller shells. |
| `WorkspaceContextStrip` | Medium | Medium | Medium | Useful once `ContextTile` exists. Strip layout varies between chips and tiles. |
| `ControlGroup` | Medium | Medium | Medium | Controls are behavior-adjacent. Extract only a passive wrapper around title/support/content. |
| `CardShell` / `OperationalCard` | Medium | Medium | Medium-high | Card layout differs by domain. Extract only after cards converge further. |
| `SupportRail` | Medium-low | Medium | Medium-high | Desktop sticky behavior and mobile ordering vary by surface. Defer until more rails exist. |
| Motion token map | Medium-low | Medium | Medium | Define recipes before runtime tokens. Avoid Tailwind/theme changes in the first runtime slice. |
| `WorkspaceShell` whole-page abstraction | Low | High | High | Too broad for first implementation. Defer until smaller primitives prove stable. |

### First Runtime Slice Recommendation

The safest first implementation slice is a **state block primitive extraction**:

- create a small passive state component family, likely under `src/components/ui/` or
  `src/components/workspace/`;
- support `loading`, `empty`, `error`, and neutral/advisory tones;
- preserve `role="status"` and `role="alert"` semantics;
- accept title, message, optional action, and optional className;
- migrate one low-risk surface first, preferably a docs-backed workspace state such as Calendar
  loading/error or Clients directory loading/error/empty;
- add focused presentation tests for the migrated surface;
- leave assignment-specific `AssignmentState` in place until packet-scope language can be migrated
  deliberately.

Why this slice is safest:

- state blocks are mostly passive presentation;
- they do not own route, query, permission, data, workflow, lifecycle, or mutation behavior;
- they already have consistent tone across polished workspaces;
- the accessibility contract is easy to lock with tests;
- the visual blast radius is smaller than extracting headers, cards, controls, or badges.

### Second Slice Recommendation

After state blocks, extract `ContextTile` as a passive label/value primitive.

Likely migration candidates:

- Calendar `ContextChip`;
- Clients `ContextPill`;
- Client Detail `ContextTile`;
- Dashboard header context tiles;
- Assignments workspace context tiles.

Guardrails:

- keep context values read-only;
- do not introduce calculations inside the primitive;
- keep layout wrappers owned by the calling workspace;
- do not convert chip-based filters into context tiles.

### Deferred Extraction Candidates

Defer these until the smaller primitives are proven:

- `WorkspaceHeader`;
- `WorkspaceContextStrip`;
- `WorkspaceSection`;
- `ActionButton`;
- `StatusBadge`;
- `CardShell`;
- `SupportRail`;
- global motion tokens;
- Tailwind theme token changes;
- a whole-page `WorkspaceShell`.

These have more surface-specific variation and higher risk of accidental visual or accessibility
regression.

### Phase 1B Guardrails

- No runtime changes.
- No component rewrites.
- No Tailwind/global theme rewrite.
- No backend, Supabase, query, route, permission, workflow, lifecycle, or mutation behavior
  changes.
- No visual redesign.
- No animation library integration.
- No broad extraction before a passive, focused primitive proves safe.

## Phase 1C State Primitive Extraction

Phase 1C implemented the first runtime design-system primitive extraction using passive workspace
state blocks only.

Implemented primitive:

- `src/components/workspace/WorkspaceState.jsx`

Exported helpers:

- `WorkspaceState`
- `WorkspaceLoadingState`
- `WorkspaceErrorState`
- `WorkspaceEmptyState`

Initial migrated surfaces:

- Calendar route loading and error states.
- Clients directory loading, error, and empty states.
- Client Detail loading, error, and not-found states.

The extraction intentionally avoided assignment packet states because `AssignmentState` carries
packet-specific safety language and action behavior. It also avoided Orders table state blocks
because table skeleton loading, queue empty copy, pagination context, and table chrome are more
surface-specific.

### Behavior Preserved

- Existing loading copy is preserved.
- Existing error copy is preserved.
- Existing empty-state copy is preserved.
- `role="status"` is preserved for loading states.
- `role="alert"` is preserved for error states.
- Empty states remain non-alerting and non-status by default.
- Existing route, query, permission, data, workflow, lifecycle, and mutation behavior is unchanged.
- Existing workspace layout intent is preserved.

### Lessons Learned

- The safest first primitive is a presentation wrapper with no knowledge of data, permissions,
  routes, or domain behavior.
- Domain-specific state systems should not be collapsed prematurely. Assignment packet state
  language remains deliberately separate.
- Table-specific state is not automatically generic. Orders table loading and empty handling should
  wait until a table-shell or worklist-state slice exists.
- Primitive extraction should migrate only one or two low-risk surfaces at a time, with focused
  tests before broader adoption.

### Next Safe Extraction Candidate

The next recommended design-system slice remains passive context tiles:

- add a small `WorkspaceContextTile` primitive;
- migrate one low-risk surface first;
- keep layout grids/chip strips owned by each workspace;
- keep values read-only and caller-derived.

## Phase 1D Context Primitive Extraction

Phase 1D implemented the second runtime design-system primitive extraction using read-only
workspace context tiles and strips.

Implemented primitive:

- `src/components/workspace/WorkspaceContext.jsx`

Exported helpers:

- `WorkspaceContextStrip`
- `WorkspaceContextTile`

Initial migrated surfaces:

- Calendar workspace header context tiles.
- Clients workspace header context tiles.
- Client Detail header context tiles.
- Assignments workspace context strip and tiles.

The extraction intentionally avoided Orders workspace context because that strip is filter-aware,
chip-based, and tied to active queue/search/status summary behavior. It also avoided the Dashboard
header context because one tile has a dark active-count treatment and should wait for either a
count-tile variant or a dedicated dashboard header extraction.

### Behavior Preserved

- Existing context labels and values are preserved.
- Existing aria labels on context regions are preserved.
- Existing responsive grid/wrap behavior remains owned by each workspace.
- Existing data sources and caller-derived values are unchanged.
- Context tiles remain read-only and non-interactive.
- No filter chips, controls, or computed behavior moved into the primitive.

### Lessons Learned

- A small label/value primitive is useful only if layout remains caller-owned.
- Context values should stay caller-derived. The primitive should not know about company,
  permissions, filters, counts, packets, or order status.
- Domain-specific context strips should stay local until their behavior is explicitly designed.
- Visual variants should be limited to class overrides before introducing a token or variant map.

### Next Safe Extraction Candidate

The next safe candidate is still a narrow `WorkspaceSection` wrapper, but only if the implementation
keeps headings, ARIA, and layout flexible. Workspace headers, action buttons, status badges, card
shells, support rails, and motion tokens remain deferred.

## Phase 1E Section Primitive Extraction

Phase 1E implemented the third runtime design-system primitive extraction using passive workspace
section shells.

Implemented primitive:

- `src/components/workspace/WorkspaceSection.jsx`

Exported helpers:

- `WorkspaceSection`
- `WorkspaceSectionMeta`

Initial migrated surfaces:

- Calendar `Schedule Board` shell.
- Clients `Client Directory` shell.
- Client Detail `Client Contact`, `Related Orders`, `Visible Order Context`, and `Relationship Notes`
  shells.

The extraction intentionally avoided Orders table chrome because it is a primary worklist surface with
table-specific density, filtering, and Smart Action behavior. It avoided Dashboard support areas
because dashboard shelling needs separate KPI/widget semantics. It avoided Assignments lane wrappers
because their headers contain status filters and refresh actions; those lanes are closer to future
card/list shells than passive section grouping. It also avoided extracting Clients `Relationship
Controls` because the header includes a create action and interactive filter controls.

### Behavior Preserved

- Existing section titles, descriptions, and read-only meta text are preserved.
- Existing heading IDs and `aria-labelledby` relationships are preserved where they existed.
- Existing responsive header alignment is caller-owned through conservative class overrides.
- Existing data sources, filters, forms, tables, and route behavior are unchanged.
- The primitive does not own actions, controls, badges, cards, lists, query state, or mutation state.

### Lessons Learned

- A useful section primitive needs flexible heading, support copy, and read-only meta slots, but should
  not understand domain controls.
- Caller-owned class overrides are still safer than a large variant system at this stage.
- Section extraction should stop before table chrome, dashboard widgets, assignment lanes, and control
  panels unless those surfaces get their own focused primitive design.
- Preserving heading IDs explicitly keeps presentation extraction from weakening accessibility.

### Next Safe Extraction Candidate

The next low-risk candidate is not a broad workspace shell. Safer options are a narrow read-only card
shell for repeated non-clickable metric/detail cards or a focused status/badge inventory before any
runtime badge extraction. Interactive action regions, dashboard widgets, Orders table chrome, and
assignment packet lanes remain deferred.

## Current Standards, Future Enhancements, Deferred Experiments

### Current Standards

- Workspace-first layout.
- Compact operational headers.
- Read-only context strips.
- Bordered section shells.
- Deterministic badges and status colors.
- Primary work surface before support content.
- Calm loading, empty, and error states.
- Responsive stacking and table/grid overflow protection.
- Small local motion with `motion-reduce` handling.
- Presentation polish must not change runtime authority.

### Future Enhancements

- Shared React presentation primitives.
- A documented Tailwind class recipe map.
- Shared status/category badge helper.
- Shared empty/loading/error components.
- Shared context-strip and metadata-tile components.
- A narrow motion token cleanup.
- Workspace visual regression or browser smoke checklist.
- Mode-specific workspace shells after product-mode runtime semantics are implemented.

### Deferred Experimental Ideas

- Dark mode overhaul.
- Theme token rewrite.
- Animation library integration.
- Dashboard personalization.
- Configurable widget system.
- Charting or analytics design system.
- Density preferences.
- Client Portal and Vendor Portal visual variants.
- Design token package extraction.

None of these experiments should be implemented as part of Phase 1A.

## Phase 1A Completion Lock

Falcon Design System Foundation Phase 1A is complete when:

- this document exists;
- the roadmap and execution plan reference it as docs-only codification;
- no runtime code, backend code, Supabase configuration, Tailwind/global theme, or feature behavior
  changed;
- `git diff --check` passes.
