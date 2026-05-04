# Smart Actions Consolidation Audit

## Purpose

Falcon now has guarded primary workflow helpers, but order workflow action rendering is still duplicated across multiple UI surfaces. This audit defines the path toward one shared Smart Actions rendering model.

## Current canonical action logic

### `src/features/orders/smartActions.js`

This is the current action descriptor builder.

It accepts:

- `order`
- `role`
- `permissions`
- `handlers`

It returns action descriptors with:

- `id`
- `label`
- `visible`
- `disabled`
- `isPrimary`
- `onClick`

This should remain the canonical frontend action-decision layer for the current MVP.

## Current canonical table renderer

### `src/features/orders/columns/ordersColumns.jsx`

The table currently imports `getSmartOrderActions()` and renders the action descriptors inside the actions column.

Current behavior:

- No visible actions: render nothing.
- One visible action: render one compact direct button.
- Multiple visible actions: render dropdown with primary action as the trigger label.
- Dropdown uses portal rendering to avoid table clipping.

This is the best current renderer and should be extracted rather than duplicated.

## Other action surfaces

### `src/components/orders/view/QuickActionsDrawerPanel.jsx`

Current status:

- Now routes actions through guarded workflow helpers.
- Still duplicates workflow action visibility/rendering outside `getSmartOrderActions()`.
- Uses role checks directly from `useRole()`.

Risk:

- Low for status safety.
- Medium for product drift because labels/visibility can diverge from the table.

Recommendation:

- Replace with a shared Smart Actions renderer after the renderer is extracted.

### `src/components/orders/table/ReviewerActionCell.jsx`

Current status:

- Now routes actions through guarded workflow helpers.
- Still duplicates reviewer action buttons outside `getSmartOrderActions()`.

Risk:

- Low for status safety.
- Medium for UI/action drift.

Recommendation:

- Replace with shared Smart Actions renderer or retire if no longer used by active table path.

### `src/features/orders/OrderActionsPanel.jsx`

Current status:

- Quarantined by removing its public barrel export from `src/features/orders/index.js`.
- Still exists and still contains freeform status update UI.

Risk:

- Medium while file exists.
- Critical if reintroduced into production UI.

Recommendation:

- Keep quarantined.
- Later delete, move to dev-only tooling, or replace with explicit admin override workflow.

## Consolidation target

Create a reusable action rendering component that accepts already-built action descriptors.

Suggested file:

```txt
src/features/orders/components/SmartActionsControl.jsx
```

Suggested props:

```ts
SmartActionsControl({
  actions,
  size = "table",
  align = "end",
  triggerLabel = "View Actions",
  className,
})
```

Expected behavior:

- Filter visible actions.
- Hide when no actions are visible.
- Render one button when one action is visible.
- Render dropdown when multiple actions are visible.
- Preserve disabled states.
- Preserve primary-action trigger label behavior.
- Preserve portal dropdown behavior.

## Why render descriptors instead of rebuilding actions inside the component?

Keep responsibilities separate:

- `getSmartOrderActions()` decides what actions exist.
- `SmartActionsControl` decides how to render those actions.
- Parent surfaces provide handlers/context.

This allows table, drawer, detail, and future mobile views to share the same visual behavior without coupling all surfaces to one data-fetching or permission strategy.

## Recommended implementation sequence

### Slice 1 — Next

Extract the current table action rendering into `SmartActionsControl.jsx`.

Scope:

- Add new component.
- Update only `ordersColumns.jsx` to use it.
- Do not change action logic.
- Do not change handlers.
- Do not change Smart Actions descriptors.
- Preserve current table UI exactly.

Validation:

- `npm run build`
- `git diff --check`
- Live table action behavior unchanged.

### Slice 2

Update `QuickActionsDrawerPanel.jsx` to render via `getSmartOrderActions()` + `SmartActionsControl` instead of hardcoded role buttons.

Scope:

- Keep existing guarded handlers.
- Keep drawer styling reasonable.
- Do not add workflow notes yet.

### Slice 3

Evaluate whether `ReviewerActionCell.jsx` is still used by an active table path.

If unused:

- Mark deprecated or remove from active imports.

If used:

- Replace contents with `SmartActionsControl` using reviewer action descriptors.

### Slice 4

Design action-specific modals/forms later:

- revision note required/optional behavior
- resubmission note behavior
- date/site visit handling
- admin override reason

Do not mix this with renderer extraction.

## Productization benefit

This consolidation moves Falcon toward:

- one workflow decision model
- one visual action model
- fewer duplicated role/status checks
- lower risk of future invalid actions
- easier company-specific workflow customization later

## Current recommendation

Proceed with Slice 1: extract `SmartActionsControl.jsx` and update only the table actions column to use it.
