# Falcon Interaction And Motion Foundation

## Purpose

This document codifies Falcon's interaction philosophy, motion language, feedback behavior, and
operational responsiveness standards after the first workspace polish passes and the initial
workspace primitive extraction.

Phase 1A is documentation only. It does not introduce runtime code, animation libraries,
Tailwind/global theme changes, component rewrites, branding changes, workflow behavior, backend
behavior, Supabase behavior, query behavior, or runtime motion tokens.

The goal is not visual redesign. The goal is to make Falcon's emerging interaction behavior
explicit so future surfaces feel responsive, premium, calm, and operationally confident without
becoming playful or decorative.

Inspected interaction surfaces:

- `src/components/shell/TopNav.jsx`
- `src/features/dashboard/DashboardPage.jsx`
- `src/components/dashboard/DashboardCalendarPanel.jsx`
- `src/pages/orders/Orders.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/pages/Calendar.jsx`
- `src/components/calendar/TwoWeekCalendar.jsx`
- `src/components/calendar/EventChip.jsx`
- `src/components/calendar/EventPopover.jsx`
- `src/components/clients/ClientCard.jsx`
- `src/pages/clients/ClientsIndex.jsx`
- `src/pages/clients/ClientDetail.jsx`
- `src/features/assignments/AssignmentsPage.jsx`
- `src/features/assignments/AssignedAssignmentInbox.jsx`
- `src/features/assignments/OwnerAssignmentManagement.jsx`
- `src/features/assignments/AssignmentPrimitives.jsx`
- modal and confirmation surfaces in orders, assignments, relationships, users, and owner setup.

## Interaction Philosophy

Falcon is an operational system. Interaction should help users feel that the interface is alive,
current, and dependable, but never theatrical.

Core principles:

- Motion is feedback, not decoration.
- Interaction should confirm affordance before action and acknowledge completion after action.
- The product should feel calm under load: loading, errors, disabled states, and success feedback
  should be legible without shouting.
- Spatial movement should be tiny and meaningful. A small lift or shift can imply clickability; a
  large movement can imply playfulness or fake intelligence.
- Data state changes should feel deterministic. Do not animate a status, queue, or count in a way
  that implies predictive scoring or hidden automation.
- Reduced-motion support is required for any spatial movement.
- Authorization boundaries remain more important than motion polish. Do not animate hidden,
  disabled, or unauthorized features into visibility.

## Current Interaction Patterns

The current app already uses a restrained Tailwind-native interaction language:

- Buttons and chips use `transition` with small background, border, and text-color changes.
- Client cards use `hover:-translate-y-0.5`, `hover:shadow-md`, and
  `motion-reduce:hover:translate-y-0` as the clearest existing soft card-lift pattern.
- Calendar day cells use background and ring changes for hover, today, and selected states.
- Inputs use focus rings such as `focus:ring-2 focus:ring-slate-200` or
  `focus:ring-2 focus:ring-blue-100`.
- Selected filters and segments use background, ring, and border changes instead of large motion.
- Modals and drawers use elevated white surfaces, borders, and `shadow-xl` over static backdrops.
- Loading states are mostly text-first, with limited pulse/spinner use only where useful.
- Toasts acknowledge completion or failure with short, direct copy.
- Assignment packet and lifecycle action surfaces avoid unnecessary movement around guarded actions.

## Soft Operational Responsiveness

Falcon's target interaction feel is soft operational responsiveness:

- Subtle: no bounce, jiggle, elastic, or attention-seeking animation.
- Graceful: transitions should smooth state changes without delaying work.
- Reactive: hover/focus/press states should respond immediately.
- Cinematic but restrained: elevation, opacity, and tiny spatial shifts are acceptable when they
  clarify focus or object hierarchy.
- Professional: motion should serve repeated daily work, not entertain.

Avoid:

- Decorative entrance animations on normal workspace load.
- Animated fake metrics, pressure scores, risk scores, or capacity indicators.
- Repeated looping animation except a minimal loading indicator.
- Large slide, zoom, rotate, parallax, or spring effects in operational workspaces.
- Animation that delays route changes, saves, lifecycle actions, or assignment packet decisions.

## Hover Standards

Hover behavior should clarify that an element is interactive.

Recommended patterns:

- Buttons: background and border shift, with optional text-color shift.
- Text links: underline, text-color shift, or both.
- Selectable cards: slight border strengthening, subtle background shift, or small shadow increase.
- Repeated row links: background shift only, usually `hover:bg-slate-50`.
- Calendar cells: background and ring changes, not movement.
- Disabled controls: no hover affordance beyond disabled cursor/opacity treatment.

Avoid:

- Hover effects on passive context tiles, metrics, or read-only metadata.
- Multiple simultaneous effects when one is enough.
- Large card lifts on dense operational grids.

## Press And Release Feedback

Press feedback should be immediate and conservative.

Current standard:

- Press/release is mostly browser-native plus disabled/loading states.
- Submit buttons should disable during in-flight mutation when the existing flow supports it.
- Destructive or lifecycle actions should acknowledge through confirmation modals and final toasts,
  not through dramatic button animation.

Future safe pattern:

- Small `active:translate-y-px` or `active:scale-[0.99]` may be considered for shared buttons only
  after a button primitive exists and reduced-motion behavior is defined.

Do not add one-off press transforms to individual mutation buttons.

## Card Elevation And Reactivity

Cards should react only when they are interactive or navigational.

Standards:

- Passive cards use stable border, background, and shadow.
- Clickable/navigational cards may use:
  - `transition`;
  - `hover:border-slate-300`;
  - `hover:shadow-md`;
  - a maximum lift of `hover:-translate-y-0.5`;
  - `motion-reduce:hover:translate-y-0`.
- Repeated dense rows should prefer background shift over lift.

The existing `ClientCard` is the current best example of acceptable card motion. Assignment packet
rows intentionally use background shift instead because they are list-like and operationally dense.

## Drawer And Modal Standards

Drawer and modal interaction should prioritize clarity and guarded action confidence.

Current standard:

- Modal surfaces use white panels, borders, and `shadow-xl`.
- Confirmation modals keep language explicit and actions stable.
- Overlay/backdrop treatment is calm and should not compete with the task.
- Closing a modal should be predictable through existing close/cancel controls.

Future standards before runtime implementation:

- If modal entrance/exit motion is added, use short opacity plus a tiny vertical transform.
- Destructive confirmation modals should not bounce, shake, or animate danger state.
- Assignment and lifecycle modals should never imply that authority exists before backend/RPC
  authorization confirms it.

## Toast And Acknowledgment Standards

Toast feedback should be short and operational.

Standards:

- Success toasts confirm the completed action in plain language.
- Error toasts state that the action failed and whether changes were made.
- Lifecycle toasts should reinforce preserved-history doctrine when relevant.
- Toasts should not explain implementation details, permission keys, RPC names, auth IDs, or storage
  internals.
- Toasts should not be used as the only place where a blocking form error appears.

Examples of current product tone:

- `Client updated`
- `Company profile updated.`
- `Order cancelled. Its history was preserved.`
- `Could not void order. No changes were made.`

## Loading And State-Change Transitions

Loading behavior should reassure without implying stale or fake precision.

Standards:

- Prefer stable loading blocks that keep layout from jumping.
- Use text-first loading copy for workspace surfaces.
- Use pulse/spinner only for clear in-flight work such as refresh or assignment loading.
- Avoid skeletons unless the target surface's dimensions are stable.
- State changes after save should refresh through the existing data path instead of local optimistic
  visual tricks unless a future slice explicitly designs optimistic behavior.

For data state changes:

- Status changes should be reflected by canonical badges and refreshed rows/details.
- Queue/filter changes should be immediate and deterministic.
- Count changes should not animate as if they are analytics.

## Section Expansion And Collapse

Expansion/collapse should be rare and practical.

Current guidance:

- Prefer always-visible dense sections for operational work.
- Use accordions only when the content is secondary or repeated.
- Expansion should not hide required workflow actions.
- If animated later, use short height/opacity transitions only where content dimensions are safe.

Do not introduce expandable sections as a way to hide unclear information architecture.

## Focus And Accessibility Standards

Focus states are part of the motion system because they show interaction readiness without pointer
hover.

Standards:

- Every interactive control must have a visible focus state.
- Focus rings should generally use subtle slate or blue rings already present in the app.
- Keyboard-selectable calendar days must retain visible selected/focused distinction.
- Hover-only information must also be available by focus or visible text.
- Reduced-motion behavior is required for spatial transforms.
- Motion must not be the only way to communicate state.

Preferred focus language:

- `focus:outline-none focus:ring-2 focus:ring-slate-200`
- `focus:border-slate-500`
- `focus:ring-blue-100` where blue already carries selected or active focus meaning.

## Motion Token Guidance

These are documentation-level standards only. Do not add runtime tokens until a later explicit
implementation slice.

### Duration

- Micro feedback: 100-150ms.
- Standard hover/focus/elevation transitions: 150-200ms.
- Modal/drawer enter/exit if later added: 180-240ms.
- Avoid transitions longer than 250ms in operational flows.

### Easing

- Default UI easing should feel calm and direct.
- Prefer standard CSS/Tailwind easing until a token cleanup is approved.
- Existing ambiguous dynamic `ease-[${EASING}]` build warning should be handled separately; do not
  introduce more dynamic easing classes.

Recommended future token names:

- `motion.duration.fast`
- `motion.duration.standard`
- `motion.duration.panel`
- `motion.easing.standard`
- `motion.easing.exit`

### Elevation

- Passive shell: `shadow-sm`.
- Interactive card hover: `hover:shadow-md`.
- Floating menu/modal: `shadow-xl`.
- Avoid stacking multiple shadows on nested passive surfaces.

### Opacity

- Use opacity primarily for disabled or transition-in/out states.
- Disabled controls should remain legible and explainable by surrounding copy when needed.
- Avoid opacity-only differences for selected state.

### Spatial Movement

- Maximum current-card lift: `-translate-y-0.5`.
- Dense rows and calendar cells should use background/ring changes instead of movement.
- Any spatial hover must include reduced-motion handling.

## Current Standards

Current Falcon interaction standards are:

- Tailwind-native transitions only.
- Hover states are mostly background, border, text-color, ring, shadow, or tiny translate changes.
- Focus rings are visible and restrained.
- Loading states are text-first and layout-stable.
- Toasts are short, direct acknowledgments.
- Modals/drawers use elevation and clear confirmation language.
- Read-only context and section primitives remain passive.
- Motion never creates product authority, data access, lifecycle behavior, or workflow behavior.

## Future Implementation Phases

Safe future implementation categories:

1. Interaction inventory and class recipe cleanup:
   - document repeated hover/focus/elevation recipes;
   - remove one-off inconsistent classes only where behavior is unchanged.
2. Shared button/action primitive planning:
   - codify primary, secondary, danger, quiet, and disabled behavior;
   - include focus, loading, and reduced-motion standards.
3. Card/reactive shell primitive:
   - only for stable clickable cards;
   - keep passive cards separate.
4. Modal/drawer transition plan:
   - design before implementation;
   - preserve confirmation semantics and action authority.
5. Motion token implementation:
   - add tokens only after Tailwind/build warning posture is clear;
   - no dynamic class expansion that increases build ambiguity.

## Deferred Experimental Ideas

Deferred until Falcon has stronger runtime design-system infrastructure:

- Animation library integration.
- Spring physics.
- Drag-and-drop scheduling.
- Animated dashboard widget rearrangement.
- Route transition animations.
- Animated charts or analytics.
- Gesture-driven mobile interactions.
- Dark-mode motion variants.
- Global theme token rewrite.
- Personalized density/motion preferences.

These ideas are not part of Phase 1A and should not be mixed into operational polish slices.

## Phase 1A Completion Lock

Falcon Interaction and Motion Foundation Phase 1A is complete when:

- this document exists;
- the roadmap and execution plan reference it as docs-only codification;
- no runtime code, component rewrite, animation library, Tailwind/global theme change, backend
  behavior, Supabase behavior, query behavior, workflow behavior, or product feature changed;
- `git diff --check` passes.

## Phase 1B Toast Acknowledgment Refinement

Phase 1B implemented Falcon's first runtime interaction refinement through shared passive
acknowledgment surfaces.

Implemented:

- `src/components/feedback/FalconToaster.jsx`
- global `react-hot-toast` presentation options through `FalconToaster`
- refined local `ToastProvider` shell in `src/lib/hooks/useToast.jsx`

The refinement improves toast/acknowledgment presentation without changing existing toast triggers,
messages, mutation flows, stack order, or default local dismissal timing.

### Runtime Cadence

The first runtime cadence uses Tailwind-native motion only:

- soft entrance via `animate-in`, `fade-in`, `slide-in-from-top-2`, and `zoom-in-95`;
- reduced-motion opt-out through `motion-reduce:animate-none`;
- stronger but still restrained elevation through white translucent panels and slate shadows;
- subtle tone emphasis through border colors, icon themes, and a narrow accent rail;
- compact rhythm with `rounded-xl`, `px-3 py-2.5`, and short operational copy.

### Behavior Preserved

- Existing `react-hot-toast` call sites remain unchanged.
- Existing `useToast()` call sites remain unchanged.
- Existing toast message copy remains unchanged.
- Existing local provider default dismissal timing remains `3500ms`.
- Existing local provider stacking remains top-right newest-last order.
- Success/info/default acknowledgments use polite status semantics.
- Error acknowledgments use alert semantics.
- No backend behavior, Supabase behavior, query behavior, workflow behavior, lifecycle behavior, or
  notification fanout changed.

### Lessons Learned

- The safest first motion implementation is presentation-only and shared at the provider level.
- Toast movement can establish Falcon's responsiveness cadence without touching feature flows.
- Reduced-motion handling should be included at the same time as any spatial entrance motion.
- Direct `react-hot-toast` and local `useToast` paths should remain visually aligned until a future
  consolidation decision is made.

### Skipped Candidates

Skipped during Phase 1B:

- drawer/modal transitions;
- card hover token extraction;
- button press transforms;
- global Tailwind motion tokens;
- route transitions;
- notification logic rewrites;
- toast trigger/message normalization.

These remain future design-system implementation candidates and should not be mixed into mutation or
workflow slices.

## Phase 1C Workspace Primitive Tactile Cadence

Phase 1C implemented restrained tactile feedback support in Falcon's foundational workspace
primitives.

Touched primitives:

- `WorkspaceContextTile`
- `WorkspaceSection`
- `WorkspaceState`

The implementation is intentionally conservative:

- `WorkspaceContextTile` and `WorkspaceSection` now share the same transition cadence for border,
  background, shadow, and transform changes.
- Hover lift, hover shadow, strengthened border, and focus-within ring treatment are opt-in through
  `interactive`.
- Default context tiles and sections remain passive and do not gain hover movement.
- Spatial hover feedback includes `motion-reduce:hover:translate-y-0`.
- `WorkspaceState` gains only a color-transition cadence for mounted loading/error/empty state
  changes; it does not gain hover or spatial motion.

### Behavior Preserved

- Existing callers do not pass `interactive`, so current workspace pages keep the same passive
  behavior.
- Layout, copy, aria relationships, roles, state semantics, data flow, query behavior, workflow
  behavior, and mutation behavior are unchanged.
- No animation library, Tailwind/global theme rewrite, backend behavior, Supabase behavior, route
  behavior, or broad redesign was introduced.

### Lessons Learned

- Tactile feedback should be available at the primitive layer without forcing motion onto passive
  operational metadata.
- Opt-in interactivity is safer than adding global hover treatment to section shells.
- `focus-within` is the right primitive-level hook for future clickable or control-bearing sections
  because it supports keyboard users without requiring new behavior.
- State blocks should use color cadence only; loading/error/empty states should not feel like
  clickable objects.

### Skipped Candidates

Skipped during Phase 1C:

- adding interactive props to `WorkspaceContextStrip`;
- migrating current passive sections or tiles to interactive treatment;
- card-shell extraction;
- button/action press transforms;
- modal/drawer transitions;
- global motion tokens;
- Tailwind theme changes.

The next safe interaction slice should remain similarly narrow, likely focused on shared button or
card-action inventory before runtime extraction.
