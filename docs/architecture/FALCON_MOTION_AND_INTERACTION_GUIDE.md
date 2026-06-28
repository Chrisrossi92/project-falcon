# Falcon Motion And Interaction Guide

## Purpose

This guide defines how Falcon should use motion, transitions, microinteractions, progressive
disclosure, and animation to create a premium, calm, modern experience.

Motion should clarify state, guide attention, and make the product feel responsive. Motion should
never distract, delay work, or decorate for its own sake.

This is product architecture guidance only. It does not change runtime behavior, application code,
routes, workflows, database schema, RPCs, permissions, UI components, emails, notifications, or
deployments.

Companion documents:

- `docs/architecture/FALCON_EXPERIENCE_FRAMEWORK.md` defines the shared platform experience system
  and the cross-workspace loading, state, shell, and portal expectations that motion supports.
- `docs/architecture/FALCON_INFORMATION_ARCHITECTURE_AND_UX_GUIDE.md` defines the page hierarchy
  and layout philosophy.
- `docs/architecture/FALCON_PAGE_INVENTORY.md` maintains the canonical inventory of primary pages.
- `docs/architecture/FALCON_PRODUCT_PRINCIPLES.md` defines the permanent product philosophy behind
  Falcon's decisions.
- `docs/architecture/FALCON_DESIGN_SYSTEM.md` defines Falcon's visual language and reusable design
  categories.
- `docs/architecture/FALCON_PREMIUM_EXPERIENCE_SPRINT_1_CHECKPOINT.md` records the completed
  Premium Experience Sprint 1 foundation, adoption rules, risks, and next target guidance.

## Motion Principles

### Calm Over Flashy

Falcon motion should feel composed and professional. It should reduce abruptness without creating
the impression that the interface is performing for attention.

### Purpose Before Decoration

Every animation should answer a product question:

> What state changed?

If motion does not clarify state, guide attention, or improve perceived responsiveness, it should
not be added.

### Fast Enough To Feel Responsive

Motion should never make users wait for routine work. Common interactions should complete quickly
enough that the product feels immediate.

### Slow Enough To Be Perceived

Motion should be long enough for users to understand what changed. Extremely fast transitions can
feel like flicker rather than quality.

### Consistent Easing And Duration

Similar interactions should use similar timing and easing. Consistency matters more than novelty.

### Respect Reduced Motion Preferences

Falcon must respect reduced motion preferences when motion is implemented. Reduced motion should
preserve state clarity without relying on large movement.

### Motion Should Support Information Hierarchy

Motion should reinforce what matters first. Primary information and smart actions should feel
stable. Secondary and deep-detail surfaces can use motion to reveal or dismiss context.

## Where Motion Belongs

Motion belongs where it helps users understand state, location, progression, or interaction
feedback.

- Page transitions
- Modal open and close
- Drawer open and close
- Accordion and collapsible sections
- Tabs
- Smart Action state changes
- Toasts and notifications
- Dashboard cards entering or updating
- Hover and press states
- Date and time pickers
- Assignment wizard steps
- Engagement package preview transitions

## Where Motion Does Not Belong

Motion should not interfere with speed, judgment, or trust.

- Critical form submission delays
- Destructive actions
- Dense data tables
- Constant looping animations
- Anything that slows high-frequency workflows
- Anything that hides important information

Destructive actions should prioritize clarity, confirmation, and reversibility where appropriate.
Motion must not soften or obscure the seriousness of the action.

## Standard Motion Defaults

Recommended defaults for future implementation:

| Interaction | Duration |
| --- | --- |
| Microinteraction | 120-180ms |
| Panel, drawer, or modal | 180-240ms |
| Page transition | 180-260ms |
| Wizard step transition | 200-280ms |

Easing should generally use subtle ease-out behavior. Spring motion should be reserved for cases
where it helps an object feel spatially connected, such as shared layout movement or panel
transitions.

Avoid bouncy or playful motion in professional workflows.

## Shared Motion Tokens

Falcon's reusable motion tokens live in:

```text
src/lib/motion/falconMotion.js
```

Future motion work must use these shared tokens for durations, easing, distances, scale/press
feedback, opacity states, and reduced-motion handling. Do not introduce scattered local animation
constants unless a new shared token has first been considered and documented.

Use timing tokens this way:

- `fast`: microinteractions, hover feedback, press feedback, menu reveals, and other interactions
  that should feel nearly immediate.
- `normal`: standard UI transitions such as tabs, lightweight section reveals, and common state
  changes.
- `slow`: panels, drawers, modals, page sections, and transitions where users need to understand
  spatial change.
- `deliberate`: rare, high-context transitions where a slightly longer movement clarifies
  progression. Do not use for routine work.

Motion must clarify state, location, progression, or feedback. It should never be added as
decoration, and it must never make core workflows feel slower.

## Shared Motion Primitives

Falcon's reusable motion primitives live in:

```text
src/components/motion/
```

Product screens should consume these primitives instead of using raw motion values directly. Raw
tokens belong in shared primitives, wrappers, or carefully reviewed component infrastructure; page
and feature code should stay boring and consistent.

Use the primitives this way:

- `FalconPageMotion`: subtle opacity and vertical entrance for future page or container-level
  transitions. Do not use it to animate every screen by default.
- `FalconCardMotion`: dashboard cards and elevated surfaces that need subtle entrance or opt-in
  hover/press feedback.
- `FalconListMotion`: future list wrappers where rows or cards need consistent child timing.
- `FalconListItemMotion`: rows or cards inside lists, with restrained opacity and position
  transitions.
- `FalconFade`: state changes, empty states, contextual panels, and other simple visibility
  changes.
- `FalconCollapse`: progressive disclosure for supporting or deep-detail content where layout
  clarity matters.

These primitives must continue to import values from `src/lib/motion/falconMotion.js`, respect
reduced-motion preferences, and avoid decorative motion.

## Shared Interaction Polish

Falcon's shared interaction helpers live in:

```text
src/lib/ui/falconInteractions.js
```

The optional clickable-surface primitive lives in:

```text
src/components/interaction/
```

Use these helpers for hover, press, focus-visible, selected, disabled, row-hover, card-hover, quiet
secondary action, and destructive action baseline states. Future clickable surfaces should consume
the shared helpers or `FalconInteractiveSurface` rather than scattering one-off hover and press
classes.

Interaction polish is not entrance animation. Hover and press states should be immediate, subtle,
and token-driven. Reduced-motion preferences must remove movement while preserving state clarity.

## Shared State Feedback

Falcon's shared state feedback primitives live in:

```text
src/components/state/
```

Loading, empty, error, updating, and success states should use these shared primitives before
introducing local one-off state UI. Prefer skeletons and layout preservation over spinners when the
future content shape is known. Use motion only when it clarifies state; reduced-motion preferences
must remove movement without hiding the state.

State feedback should answer a simple question: what is happening, and what can the user do next?
It should reduce uncertainty, not add visual noise.

### First State Adoption Example

Premium Experience Sprint 1G adopted `FalconSkeleton` for the active dashboard's primary count
loading placeholder in:

```text
src/features/dashboard/DashboardPage.jsx
```

The adoption is intentionally narrow: it replaces a local loading marker with a layout-preserving
shared primitive while keeping the same product meaning and dashboard behavior.

### First Interaction Adoption Example

Premium Experience Sprint 1E adopted shared interaction polish on the active dashboard's AMC
pipeline controls in:

```text
src/features/dashboard/DashboardPage.jsx
```

Only controls that already had real click and selected behavior were updated. Static dashboard
summary cards were left passive. Future adoption must follow actual user affordance: do not make
non-clickable content look clickable, and do not add hover/press polish where there is no user
action.

### First Adoption Example

Premium Experience Sprint 1C adopted the shared primitives on the active dashboard surface in:

```text
src/features/dashboard/DashboardPage.jsx
```

The dashboard uses `FalconPageMotion` for the page container, `FalconListMotion` for the header
stat grid and AMC pipeline grid, `FalconCardMotion` for the header stat cards, and
`FalconListItemMotion` for AMC pipeline stage items. This is the preferred adoption model: apply
motion to a small, meaningful surface, preserve layout and behavior, and avoid animating the entire
product at once.

## Reusable Motion Patterns

### Fade / Slide Page Section

Use for page sections entering after navigation, filtering, or loading. Movement should be subtle
and should not cause content to feel unstable.

### Expand / Collapse

Use for progressive disclosure, especially deep detail, supporting context, and optional sections.
Expansion should make the relationship between summary and detail clear.

### Shared Layout Movement

Use when the same object changes location, size, or emphasis. This is appropriate for selected
cards, drawers, tab indicators, and object-to-detail transitions.

### Staggered Dashboard Cards

Use sparingly for dashboard entry or major data refresh. Staggering should make the screen feel
organized, not theatrical.

### Step Wizard Transition

Use for assignment, intake, engagement package, or setup flows where users move through a sequence.
Motion should reinforce progress without delaying the next step.

### Status Change Pulse

Use as a brief confirmation that state changed. Pulses should be subtle, short-lived, and never
loop continuously.

### Button Press Feedback

Use for immediate tactile response on smart actions, secondary actions, and icon buttons. Press
feedback should not delay the actual action.

### Dropdown Reveal

Use for menus, filters, and compact option sets. Dropdowns should feel anchored to their trigger
and should dismiss cleanly.

### Calendar / Date Picker Transitions

Use for month navigation, date selection, and time selection. Motion should preserve orientation
and avoid making scheduling feel imprecise.

## Premium Feel Without Clutter

Falcon should feel closer to Linear, Figma, and Notion-quality interactions than to consumer gaming
UI. Motion should make screens feel expensive, intentional, and responsive.

Premium motion is quiet. It uses restraint, consistency, spatial continuity, and fast feedback. It
does not rely on constant animation, bounce, spectacle, or decoration.

## Accessibility

- Respect `prefers-reduced-motion`.
- Motion cannot be the only signal of state, success, failure, warning, or required action.
- Avoid flashing or pulsing alerts.
- Ensure keyboard users are not disadvantaged by animation timing or focus movement.
- Preserve focus order and visible focus states when panels, drawers, modals, tabs, and menus
  animate.

## Implementation Guidance

When motion is implemented:

- Prefer reusable motion wrappers or components over one-off animations.
- Keep motion tokens and constants centralized.
- Avoid adding Framer Motion directly throughout the app without shared patterns.
- Every animation should answer: what state changed?
- Keep professional workflows calm and fast.
- Preserve reduced-motion behavior from the beginning, not as a later patch.

Framer Motion can be a strong fit for shared layout movement, panel transitions, route-like
transitions, and interaction state. It should be introduced through intentional patterns rather than
scattered local animation decisions.

## Future Work

- Add animated workspace transitions.
- Add reusable collapsible section behavior.
- Add custom date/time picker interactions.
- Add assignment wizard transitions.
