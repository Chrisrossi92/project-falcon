# Falcon Premium Experience Sprint 1 Checkpoint

## Purpose

This checkpoint records the reusable Premium Experience foundation completed through Sprint 1G
before adoption expands beyond the dashboard.

It is architecture documentation only. It does not approve runtime behavior changes, workflow
changes, database changes, RPC changes, permission changes, route changes, or broad UI redesigns.

## What Now Exists

### Motion Tokens

Falcon's shared motion tokens live in:

`src/lib/motion/falconMotion.js`

They define the canonical duration, easing, distance, scale, opacity, and reduced-motion helpers
that future motion work must use.

### Motion Primitives

Falcon's shared motion primitives live in:

`src/components/motion/`

They provide `FalconPageMotion`, `FalconCardMotion`, `FalconListMotion`,
`FalconListItemMotion`, `FalconFade`, and `FalconCollapse` for future page, surface, list,
presence, and disclosure movement.

### Interaction Helpers

Falcon's shared interaction helpers live in:

`src/lib/ui/falconInteractions.js`

They standardize clickable surfaces, hover lift, press feedback, selected state, disabled state,
focus-visible rings, row hover, card hover, quiet secondary actions, and destructive action
baselines.

### Interactive Surface Primitive

Falcon's interactive surface primitive lives in:

`src/components/interaction/FalconInteractiveSurface.jsx`

It gives future clickable card, row, and surface work a consistent class, focus, selected,
disabled, and event passthrough pattern without scattering interaction class logic.

### State Feedback Primitives

Falcon's shared state primitives live in:

`src/components/state/`

They provide `FalconSkeleton`, `FalconLoadingState`, `FalconEmptyState`, `FalconErrorState`,
`FalconUpdatingIndicator`, and `FalconSuccessState` for calm loading, empty, error, updating, and
success feedback.

### First Dashboard Motion Adoption

Premium Experience Sprint 1C adopted shared motion primitives on the active dashboard surface.
The dashboard page/container, header card grid, dashboard cards, and AMC pipeline card/grid areas
now prove the shared motion pattern in one limited product surface.

### First Dashboard Interaction Adoption

Premium Experience Sprint 1E adopted shared interaction helpers and the interactive surface
primitive on the same dashboard area. Existing interactive dashboard stage items and attention
surfaces gained consistent clickable, hover, press, focus, and selected behavior without changing
workflow meaning.

### First Dashboard State Adoption

Premium Experience Sprint 1G adopted shared state primitives on the dashboard's existing state UI.
The dashboard uses the shared state foundation where appropriate while preserving existing data
fetching, text meaning, layout intent, and accessibility.

## Rules Going Forward

- Product screens must not introduce raw animation values. Use shared motion tokens and primitives.
- Product screens should consume shared primitives and helpers instead of local one-off polish.
- Adopt one surface at a time so behavior stays reviewable and reversible.
- Do not make static content look clickable.
- Preserve business logic, product meaning, accessibility, workflows, routes, permissions, schemas,
  RPCs, and data fetching.
- Respect reduced motion through the shared token and primitive layer.
- Motion must clarify state, hierarchy, or feedback. It must not decorate.
- Interaction polish must follow actual user affordance.
- State UI must reduce uncertainty, preserve layout where possible, and avoid noisy loading
  treatment.

## Recommended Next Adoption Surfaces

1. Order Detail
2. Orders list/table
3. Vendor Workspace dashboard
4. Client Portal dashboard
5. Modal/drawer surfaces
6. Forms/save feedback

## Risks And Watchouts

- Over-animating could make Falcon feel slower or less trustworthy.
- Inconsistent hover behavior could make similar surfaces feel unrelated.
- Passive cards must not gain clickable treatment unless they already navigate, open, select, or
  perform an action.
- Loading states can create layout shift if skeletons do not preserve the shape of the content they
  replace.
- Full lint is currently blocked by unrelated known hook-rule issues in route test files, so focused
  tests and targeted lint remain the validation path for these polish slices until those blockers
  are resolved.

## Validation Status

- Focused Premium Experience tests are passing for motion, interaction, state primitives, and the
  dashboard surface.
- Targeted eslint is passing for the changed Premium Experience files.
- `git diff --check` is passing for the Sprint 1 documentation and implementation changes.
- Full lint remains blocked by unrelated known hook-rule issues in route test files.

## Next Recommended Slice

Inspect Order Detail first. If it has existing clear interactive surfaces or loading, empty, error,
updating, or success states, use Order Detail as the next adoption target.

If Order Detail does not have clear existing surfaces that can be improved without changing product
meaning, use the Orders list/table next. The Orders list/table is likely to provide safer row hover,
focus, loading, empty, and recoverable error patterns without requiring new workflow behavior.

## Non-Goals

- Do not animate full screens broadly.
- Do not add raw Framer Motion usage in product screens.
- Do not redesign workflows.
- Do not change business logic, data fetching, schemas, RPCs, routes, permissions, or deployment
  behavior.
- Do not expand adoption beyond a named surface in a single slice.
