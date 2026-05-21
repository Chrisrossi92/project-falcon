# Frontend Order Create RPC Migration Design

## Purpose

Phase 10E7A designs the migration from browser-prefetched/direct order-number creation toward guarded RPC/server-generated order creation before implementation.

This is documentation-only plus read-only code/schema inspection. It does not add runtime code, migrations, backend behavior, frontend behavior, UI changes, route changes, registry changes, tests, uniqueness/index changes, Owner Setup numbering configuration, bootstrap seeding, update/manual override changes, or active order creation changes.

Phase 10E7B implements the first API boundary in `src/lib/services/ordersService.js` as `createOrderViaRpc(payload)`. The wrapper calls only `supabase.rpc("rpc_create_order", { payload })`, returns the created order row, propagates RPC errors, and is not wired into `OrderForm` yet. Active create behavior, browser prefetch, direct table helpers, `OrderNumberField`, edit/update/manual override behavior, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

Phase 10E7C wires only the active create submit branch in `src/components/orders/form/OrderForm.jsx` to `createOrderViaRpc(payload)`. Edit submit remains on `updateOrder(...)`, browser prefetch still calls legacy `rpc_get_next_order_number()`, create-mode order-number UI is unchanged, the direct `createOrder(payload)` helper still exists, and manual override/update behavior remains deferred.

Phase 10E7D removes the create-mode browser prefetch from `OrderForm`. New-order create mode no longer calls legacy `rpc_get_next_order_number()` or populates `values.order_number` from the browser. The create header now shows `Generated on save`, and normal create submit sends `order_number: null` while the guarded RPC remains the source of truth.

Phase 10E7E converts the create-mode order-number control in `AssignmentFields` to a read-only/generated-later display. New-order creation no longer presents `Order #` as an editable authoritative field. Edit mode keeps the existing editable order-number input until a separate manual override/update hardening design.

Phase 10E7F removes create-mode order-number payload authority. New-order payloads no longer include `order_number`, and active create mode has no order-number availability check. `OrderNumberField` remains unchanged for nonblank/manual-style values outside the active create path.

Phase 10E8C updates the edit-mode availability path only. `OrderNumberField` now calls `ordersService.isOrderNumberAvailableV2(...)`, which uses `rpc_is_order_number_available_v2(...)` with the current order id when available. Create mode remains generated-on-save, submits no authoritative `order_number`, and performs no availability check. Manual override and edit/update submit hardening remain separate deferred work.

## Context

Phase 10E6B updated only `public.rpc_create_order(payload jsonb)`.

Current guarded RPC behavior:

- generates `orders.order_number` server-side through `next_order_number_v2(current_company_id(), now())`;
- ignores submitted `payload.order_number`;
- preserves create authorization and client/AMC attachment guards;
- returns the created order row with the server-generated number.

Initial 10E7A unchanged surfaces:

- active `OrderForm` create still uses direct table insert through `ordersService.createOrder`;
- active `OrderForm` create still prefetches a legacy number with `rpc_get_next_order_number()`;
- edit/update paths can still submit `order_number`;
- direct table path can still persist a supplied `order_number`;
- global uniqueness remains active;
- manual override remains deferred.

After 10E7F, the active `OrderForm` create path uses `createOrderViaRpc(payload)`, create-mode prefetch is removed, create-mode `AssignmentFields` shows a generated-later/read-only order-number state, and create payloads omit `order_number`. Edit/update paths, direct helper definitions, global uniqueness, and manual override remain unchanged.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_CREATION_V2_NUMBERING_RPC_DESIGN.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/components/inputs/OrderNumberField.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/pages/NewOrder.jsx`
- `src/pages/orders/EditOrder.jsx`
- route references for `/orders/new`
- order-number references through `rg`

Backend context inspected from prior 10E6B work:

- `public.rpc_create_order(payload jsonb)`
- `public.next_order_number_v2(uuid, timestamptz)`
- legacy `public.rpc_get_next_order_number(...)`

## Current Create Form State Flow

`OrderForm` owns local `values` state for both create and edit mode.

On edit:

- `values.order_number` is hydrated from `order.order_number`.
- The form submits through `updateOrder(order.id, payload)`.

On create:

- `values` starts empty.
- A `useEffect` calls `supabase.rpc("rpc_get_next_order_number")`.
- If successful, the returned value is stored as `values.order_number`.
- The header preview displays `values.order_number || "Generating order number"`.
- `AssignmentFields` renders an editable `Order #` input bound to `value.order_number`.

No separate form validation schema requiring `order_number` was found during this inspection. The field is carried because prefetch and editable form state populate it.

## Current Order-Number Prefetch Flow

`OrderForm` calls:

```js
supabase.rpc("rpc_get_next_order_number")
```

The call passes no company argument and therefore uses the legacy database default:

```sql
p_company_key = 'falcon_default'
```

This browser prefetch is still authoritative in the active direct table create path because the returned number is included in the direct insert payload.

Target state:

- create mode should not prefetch or reserve authoritative numbers in browser state;
- the generated number should be known after `rpc_create_order(...)` returns;
- create-mode UI can show "Generated on create" or equivalent until the order exists.

## Current Submit Payload Flow

`buildOrderPayload(values, { isEdit })` always includes:

```js
order_number: values.order_number || null
```

Create submit currently calls:

```js
createOrder(payload)
```

Edit submit currently calls:

```js
updateOrder(order.id, payload)
```

10E7 should change create behavior without changing edit/update behavior yet.

## Current Direct Table Create Path

The active imported create service is `src/lib/services/ordersService.js`.

Current behavior:

```js
supabase.from("orders").insert(payload).select("*").maybeSingle()
```

This direct path inserts whatever `payload.order_number` contains, subject to RLS, triggers, and global uniqueness.

## Secondary Create API Path

`src/lib/api/orders.js` also exports `createOrder(payload = {})`.

It maps:

```js
order_number: payload.order_number || payload.order_no || null
```

Then performs a direct table insert. No active `OrderForm` import from this helper was found, but it remains a possible create dependency and should not be removed without call-site/test coverage.

## Order Number Inputs And Validation

Confirmed inputs:

- `AssignmentFields` includes an editable `Order #` input bound to `order_number`.
- `OrderNumberField` performs a global direct `orders.order_number` availability check, but no active `OrderForm` import of this component was found in this inspection.

Create-mode target:

- `order_number` should not be editable as a normal create field.
- frontend validation should not require it for create.
- global availability checks should not run for normal create.
- the returned RPC row should populate post-create navigation/detail views.

Edit-mode target, later:

- existing order number should remain visible;
- order-number changes should be treated as manual override, not ordinary form state;
- manual override needs a separate backend contract before broad UI support.

## Required Changes To Use `rpc_create_order`

To move active create to server-generated numbering:

1. Add or update a create API wrapper that calls:
   ```js
   supabase.rpc("rpc_create_order", { payload })
   ```
2. Keep create payload construction compatible with current order fields.
3. Do not rely on `payload.order_number`; the RPC ignores it.
4. Change `OrderForm` create submit to call the RPC wrapper.
5. Refetch/navigate using the returned order row.
6. Remove or disable the legacy create-mode prefetch.
7. Make create-mode order-number UI display-only/generated-later.

## What Should Remain Unchanged Initially

During the first frontend migration slices:

- edit mode should continue using existing update behavior;
- update/manual override should not change;
- direct table create helpers should not be deleted until call-site coverage is clear;
- legacy `rpc_get_next_order_number(...)` should remain for compatibility until active create no longer calls it;
- global uniqueness should remain unchanged;
- Owner Setup numbering configuration should remain deferred.

## Compatibility Strategy

### Temporary Form State Compatibility

10E7 can temporarily leave `values.order_number` in form state even after create submit moves to RPC.

Because `rpc_create_order(...)` ignores submitted `payload.order_number`, leaving the value in payload during the first migration is not authoritative for the RPC path.

However, this is only a transition convenience. Later cleanup should stop setting and submitting `order_number` for create mode.

### Returned Server Number

The created RPC row should be the source of display after create.

Expected handling:

- `onSaved(result)` receives the created row.
- `NewOrderPage` currently shows `success("Order created")` and navigates by `result.id`.
- The detail page and order views can display `result.order_number` after navigation.

Optional later polish:

- update the toast to include the returned order number only after the RPC migration is stable.

### Create Validation

Create validation should stop assuming `order_number` is required before submit.

No explicit required validation was found, but cleanup should ensure:

- empty `values.order_number` does not block create;
- "Generating order number" copy is replaced with non-reservation copy;
- no availability check is triggered for normal create.

### Edit Mode Difference

Edit mode should remain separate.

For 10E7:

- edit can continue hydrating and submitting `order_number` through the current update path;
- this preserves existing behavior while create is migrated;
- manual override/update hardening should be a later phase.

### Direct Table Path Preservation

Direct table create helpers should remain in place until the active form path and secondary callers are migrated and tested.

Do not delete or block them in 10E7B unless inspection and tests prove they are unused.

## Recommended Implementation Sequence

### 10E7B Create API Wrapper

Smallest safe implementation:

- Add a dedicated RPC create wrapper, or change `ordersService.createOrder` if call-site review confirms it is only used for order create.
- Wrapper calls only `supabase.rpc("rpc_create_order", { payload })`.
- Preserve error propagation conventions.
- Do not change `OrderForm` submit yet if a smaller slice is preferred.
- Add tests for RPC call shape, submitted order-number non-authority expectation, and no direct insert in the wrapper.

10E7B result: complete. `createOrderViaRpc(payload)` was added beside the existing direct `createOrder(payload)` helper. It is intentionally unwired and tested as an API boundary only.

Recommended service name if adding a new method:

- `createOrderViaRpc(payload)`

If replacing `ordersService.createOrder` directly:

- verify there are no secondary callers depending on direct table insert semantics;
- update tests in the same slice.

### 10E7C OrderForm Submit Uses RPC Create

- Change create submit to call the RPC-backed create service.
- Keep edit submit on `updateOrder`.
- Preserve inline client creation behavior before order create.
- Keep `payload.order_number` temporarily if needed; it is ignored by RPC.
- Navigate with the returned row.

10E7C result: complete. The create branch now calls `createOrderViaRpc(payload)` and the edit branch still calls `updateOrder(order.id, payload)`. The existing `onSaved(result)` and navigation behavior continue to use the returned row.

### 10E7D Remove Authoritative Browser Prefetch

- Remove create-mode call to `rpc_get_next_order_number`.
- Replace "Generating order number" with "Generated on create" or similar.
- Do not add a browser-callable v2 prefetch RPC.

10E7D result: complete. `OrderForm` create mode no longer imports the Supabase client or calls `rpc_get_next_order_number()`. The create preview reads `Generated on save`. Edit mode still displays the existing order number.

### 10E7E Create-Mode Order Number Display

- In create mode, render order number as display-only/generated-later.
- Keep edit mode behavior unchanged until manual override design.
- Avoid presenting the generated-later field as a setup gate or permission authority.

10E7E result: complete. `AssignmentFields` now renders `Generated on save` plus `Assigned automatically when saved.` in create mode instead of a normal editable `Order #` input. Edit mode continues to render the existing order-number input. Create submit still succeeds without an authoritative browser number and continued to send `order_number: null` through the current payload builder until 10E7F.

### 10E7F Remove Global Availability Check From Create Mode

- Ensure `OrderNumberField` or equivalent global direct availability checks are not used in create mode.
- Keep availability/manual override redesign for later update/manual override work.

10E7F result: complete. Active create mode has no order-number availability check and `buildOrderPayload(...)` omits `order_number` for new-order creates. Edit mode still includes `order_number` in update payloads. `OrderNumberField` remains unchanged for nonblank values and is not part of the active create-mode path.

### Later Manual Override Design

- Define explicit override permission.
- Define reason/audit requirements.
- Define company-scoped availability validation.
- Harden update RPC/manual edit path.

## 10E7B Recommended Scope

Recommended next implementation:

- Add or modify one create API service method to call `rpc_create_order`.
- Prefer adding a named wrapper first if there is any uncertainty about secondary direct-table callers.
- Do not change `OrderForm` submit in 10E7B unless the service is already centralized and test coverage is straightforward.
- Do not remove browser prefetch yet.
- Do not remove `Order #` UI yet.
- Do not change edit/update behavior.
- Do not change direct table helper deletion/removal.

This keeps 10E7B easy to verify: the new frontend API boundary can be tested without altering user-facing create behavior.

10E7B verification:

- wrapper calls `rpc_create_order` with `{ payload }`;
- wrapper does not call `supabase.from("orders").insert(...)`;
- wrapper does not call `rpc_get_next_order_number`;
- wrapper does not call `rpc_is_order_number_available`;
- wrapper returns the server-created order row, including `order_number`;
- wrapper propagates RPC errors for caller mapping.

10E7C verification:

- create submit calls `createOrderViaRpc(payload)`;
- create submit no longer calls the direct `createOrder(payload)` helper;
- edit submit still calls `updateOrder(order.id, payload)`;
- browser prefetch remains present in create mode;
- submitted `payload.order_number` remains temporary passthrough and is ignored by the guarded RPC.

Next implementation should be 10E7D: remove or disable the authoritative browser prefetch from create mode and update create-mode copy to reflect server generation on submit.

10E7D verification:

- create mode does not call `rpc_get_next_order_number`;
- create submit still calls `createOrderViaRpc(payload)`;
- create payload did not require an authoritative browser number and sent `order_number: null` while the generated-later field cleanup was pending;
- edit submit still calls `updateOrder(order.id, payload)`;
- no manual override behavior was added.

10E7E/10E7F verification:

- create mode shows generated-later/read-only order-number copy;
- create mode does not expose an editable order-number input;
- create submit calls `createOrderViaRpc(payload)`;
- create payload omits `order_number`;
- blank `OrderNumberField` state does not check availability;
- edit mode still preserves the existing editable order-number input and update payload.

## No-Go Rules

- No frontend-generated authoritative order numbers.
- No manual override by plain `order_number` field.
- No browser-callable v2 prefetch RPC.
- No direct table create path removal without call-site and test coverage.
- No edit/update manual override behavior change in 10E7B.
- No uniqueness/index changes.
- No Owner Setup numbering configuration.
- No bootstrap seeding.
- No fallback to `company_key` as tenant authority.

## Open Questions Before Implementation

- Should 10E7B add `createOrderViaRpc(payload)` beside `createOrder`, or replace `ordersService.createOrder` immediately?
- Are there active callers of `src/lib/api/orders.js#createOrder` that need migration or quarantine?
- 10E7E answered the create-mode `Order #` question by converting the control to read-only/generated-later copy.
- Should the create success toast include the returned order number, or should the detail page remain the first display surface?
- How quickly should 10E7D follow 10E7C to close the legacy prefetch/null-counter conflict window?
