# Order Number Override UI Design

## Purpose

Phase 10E8G designs the explicit edit-mode order-number override UI before wiring `overrideOrderNumber(...)`.

This is documentation-only plus read-only frontend inspection. It does not add runtime code, migrations, backend behavior, route changes, registry changes, UI changes, tests, uniqueness/index changes, Owner Setup numbering configuration, bootstrap seeding, or manual override wiring.

The goal is to make future order-number changes explicit, company-scoped, backend-validated, and auditable instead of treating `order_number` as casual edit form state.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_BACKEND_CONTRACT.md`
- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_DESIGN.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/components/inputs/OrderNumberField.jsx`
- `src/features/relationships/components/RelationshipActionConfirmModal.jsx`
- `src/lib/services/ordersService.js`

## Current Frontend State

Create mode is already server-numbered:

- `OrderForm` create submit calls `createOrderViaRpc(payload)`.
- Create payloads omit `order_number`.
- `AssignmentFields` create mode displays `Generated on save`.
- Create mode does not call availability checks.

Edit mode is still not hardened:

- `OrderForm` hydrates `values.order_number` from the existing order.
- `AssignmentFields` renders `OrderNumberField` as an editable input when `isEdit` is true.
- `OrderNumberField` calls `isOrderNumberAvailableV2(...)` for nonblank values.
- `buildOrderPayload(..., { isEdit: true })` no longer includes `order_number`.
- `OrderForm` edit submit still calls `updateOrder(order.id, payload)`.

The backend override path exists but remains unwired:

- `rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null)`
- `overrideOrderNumber(orderId, orderNumber, reason = null)`

## Proposed UX Pattern

Edit mode should display the current order number as read-only by default.

The normal edit form should include an explicit action:

- Button label: `Change order number`
- Placement: inside the existing Assignment & Fee section near the displayed order number
- Behavior: opens a modal/dialog or compact panel dedicated to order-number override

The override UI should ask for:

- New order number
- Optional reason

The reason can remain optional because the 10E8E backend RPC accepts nullable `p_reason`. The UI should still make the field visible so Falcon can later make the reason required without redesigning the interaction.

Recommended copy:

- Display state: `Current order number`
- Action: `Change order number`
- Dialog title: `Change order number`
- Reason label: `Reason`
- Reason helper: `Optional context for the order activity log.`
- Submit: `Save order number`

Avoid copy that implies create-mode numbering, access authority, or feature unlocks.

## Component Placement

Keep the visual entry point in `AssignmentFields` because that is where order status, assignment, fees, and order number already live.

Move override behavior into a dedicated component, for example:

- `OrderNumberOverrideControl`
- `OrderNumberOverrideDialog`

This keeps `AssignmentFields` from owning RPC details and gives the override workflow a clear test boundary.

`OrderNumberField` should no longer be the long-term edit-mode component. It currently behaves like a normal editable input. Future slices should either replace it with the dedicated override control or reduce it to a read-only display helper.

## Dialog / Panel Behavior

Use the existing confirmation modal pattern as the closest local precedent:

- focused modal surface;
- cancel and submit buttons;
- Escape/backdrop close when not submitting;
- local loading state;
- safe inline error message;
- optional text area for notes/reason.

The override dialog should:

- initialize the new number field with the current order number or an empty value based on UX preference;
- trim values before checking/submitting;
- disable submit while checking availability or saving;
- close on successful override;
- keep the normal edit form unsaved state separate from the override action.

## Availability Check Behavior

Availability is guidance only. The backend override RPC remains the authority.

The dialog should use:

```js
isOrderNumberAvailableV2(orderNumber, { orderId })
```

Recommended behavior:

- Do not check blank input.
- Do not check unchanged input.
- Debounce checks.
- Pass the current order id so the backend can exclude the current order.
- Show `Available` / `Already used` / `Unable to verify` states.
- Do not expose cross-company details.
- Revalidate through `overrideOrderNumber(...)` on submit regardless of frontend availability state.

If the availability check fails due to permission or network error, the UI should not claim the number is valid. It should allow retry or surface a safe error.

## Submit / Refetch Behavior

Submit should call only:

```js
overrideOrderNumber(orderId, newOrderNumber, reason)
```

On success, the UI should use the RPC result as the source of truth:

- update local form/order state with `new_order_number`;
- optionally trigger a parent refetch if the surrounding order detail page has a reload pattern;
- show a success toast or inline confirmation consistent with existing order pages;
- keep the normal edit form save action separate.

The backend writes the activity/audit event. The frontend should not write activity rows directly.

## Error Handling

Map backend errors to safe user-facing copy.

Expected classes:

- not authorized / permission denied;
- order not found in current company;
- blank or invalid order number;
- same-company conflict;
- global uniqueness still blocks this value during migration;
- generic failure.

The UI should not expose another company, user, or order if a global uniqueness conflict occurs.

## Normal Edit Submit Separation

Normal edit submit must not be the override path.

Future cleanup should remove `order_number` from the normal edit payload once the explicit override UI is available. Until that cleanup is done, any UI slice that introduces the override action must avoid creating two independent ways to change the number.

The desired final edit behavior is:

- normal `Save Changes` updates ordinary order fields only;
- `Change order number` is the only order-number mutation path;
- create mode remains generated on save and has no override action.

## Recommended Implementation Sequence

### 10E8H Edit-Mode Override Shell

Make edit-mode order-number display read-only and add an explicit `Change order number` action shell.

Scope:

- no API submit yet;
- no backend changes;
- no create-mode changes;
- no normal edit payload cleanup yet unless the shell can be added safely with tests;
- preserve generated-on-save create behavior.

10E8H result:

- Implemented the edit-mode UI shell in `src/components/orders/form/AssignmentFields.jsx`.
- Edit mode now displays the current order number read-only by default.
- `Change order number` opens a local shell dialog with candidate order-number and optional reason fields.
- The shell is explicitly unwired: it does not call `overrideOrderNumber(...)`, does not call availability RPCs, and does not mutate form/order state.
- Normal edit submit remained unchanged in 10E8H; 10E8J later removed `order_number` from that normal edit payload.
- Create mode remains generated on save with no order-number input or availability check.

### 10E8I Wire Override Action

Wire the explicit action to `overrideOrderNumber(...)`.

Scope:

- use v2 availability as frontend guidance;
- submit through the backend override RPC;
- update local order/form state or trigger a safe refetch after success;
- show loading, success, and safe error states;
- do not make normal edit submit change order number.

10E8I result:

- Wired the edit-mode shell to `overrideOrderNumber(orderId, candidate, reason || null)`.
- `Save order number` is enabled only when the candidate is nonblank and differs from the current order number.
- The shell uses `isOrderNumberAvailableV2(...)` as company-scoped guidance only; backend override remains authoritative.
- Success closes the dialog and notifies the parent via `onChange({ order_number: new_order_number })` so the displayed order number updates.
- Errors render safe inline copy.
- Normal edit submit remains on the existing `updateOrder(...)` path and is not required for the explicit override action.
- Create mode remains generated on save and does not expose override UI.

### 10E8J Remove Order Number From Normal Edit Payload

Remove `order_number` from generic edit payload/update behavior.

Scope:

- update `buildOrderPayload(..., { isEdit: true })`;
- adjust tests so normal edit submit cannot change `order_number`;
- keep the explicit override action as the only frontend mutation path;
- do not change uniqueness constraints.

10E8J result:

- Removed `order_number` from the normal edit/update payload in `OrderForm`.
- Create payloads continue to omit `order_number`.
- The form can still keep `values.order_number` for read-only display and explicit override state.
- The explicit `Change order number` flow remains the only frontend path that calls `overrideOrderNumber(...)`.
- Backend generic update RPCs/direct helper definitions are unchanged and still need later hardening.

### Later Backend Cleanup

After the UI path is explicit and tested:

- migrate generic update RPCs/direct update paths away from `order_number` changes;
- add a dedicated permission if needed;
- continue uniqueness/index migration separately;
- keep legacy functions only as long as compatibility requires.

## No-Go Rules

- No create-mode override.
- No normal edit submit changing order number.
- No override without the backend override RPC.
- No frontend-only duplicate check.
- No unaudited update.
- No direct `orders` table update for manual override.
- No uniqueness/index changes in a UI slice.
- No Owner Setup numbering configuration.
- No bootstrap seeding.
- No cross-company conflict detail exposure.

## Testing Strategy Later

Future UI tests should cover:

- edit mode displays current order number read-only;
- `Change order number` opens the override dialog;
- blank and unchanged values do not call availability;
- candidate values call `isOrderNumberAvailableV2(...)` with the current order id;
- submit calls `overrideOrderNumber(...)`;
- success updates visible order number or triggers refetch;
- backend errors render safe messages;
- create mode has no override action;
- normal edit submit does not call override and does not carry `order_number`.
