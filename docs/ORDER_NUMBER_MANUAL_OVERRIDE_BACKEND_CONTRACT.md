# Order Number Manual Override Backend Contract

## Purpose

Phase 10E8D designs the future guarded manual order-number override path before implementation.

This is documentation-only plus read-only code and schema inspection. It does not add migrations, backend behavior, frontend behavior, route changes, registry changes, tests, uniqueness/index changes, Owner Setup numbering configuration, bootstrap seeding, legacy function removal, or manual override behavior.

The goal is to separate normal order editing from explicit order-number override, because order numbers are visible operational identifiers and must be company-scoped, validated, and audited before Falcon can safely relax legacy global numbering assumptions.

Phase 10E8E implements the backend-only RPC in `supabase/migrations/20260518064000_order_number_override_rpc.sql`. No frontend API wrapper, UI wiring, generic update cleanup, create-mode override, uniqueness/index change, Owner Setup numbering configuration, bootstrap seeding, or legacy function removal was added.

Phase 10E8F adds the unwired frontend service wrapper `overrideOrderNumber(orderId, orderNumber, reason)` in `src/lib/services/ordersService.js`. It calls only `rpc_order_number_override(...)`, returns the RPC JSON result, and is not wired into UI, normal edit submit, create mode, or availability checks.

Phase 10E8G adds the explicit override UI design in `docs/ORDER_NUMBER_OVERRIDE_UI_DESIGN.md`. It remains documentation-only and recommends read-only edit display, a dedicated `Change order number` action, v2 availability as guidance, and `overrideOrderNumber(...)` as the only future mutation path.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_DESIGN.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend/code inspected:

- `src/lib/services/ordersService.js`
- `src/components/inputs/OrderNumberField.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/components/orders/form/OrderForm.jsx`
- `src/lib/permissions/constants.js`

Schema/functions inspected:

- `supabase/migrations/20260518017000_company_order_intake_attachment_authorization.sql`
- `supabase/migrations/20260518018000_company_order_legacy_rpc_import_quarantine.sql`
- `supabase/migrations/20260518019000_company_order_write_policy_cleanup.sql`
- `supabase/migrations/20260518022000_company_assignment_date_rpc_guardrails.sql`
- `supabase/migrations/20260518023000_company_activity_log_policy_rpc_hardening.sql`
- `supabase/migrations/20260518026000_company_explicit_authenticated_grants.sql`
- `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql`
- `supabase/migrations/20260518063000_order_number_availability_v2.sql`

## Current Update / Manual Behavior

Active edit submit still uses direct table update:

- `OrderForm` edit mode builds a patch with `order_number`.
- `OrderForm` calls `ordersService.updateOrder(order.id, payload)`.
- `ordersService.updateOrder(...)` performs `supabase.from("orders").update(patch).eq("id", orderId).select("*").single()`.

This means order-number changes are currently ordinary order updates, subject to current RLS and database uniqueness, but not a distinct audited override action.

Existing guarded update RPCs also accept order number:

- `public.rpc_update_order(order_id uuid, patch jsonb)`
- `public.rpc_order_update(p_order_id uuid, p jsonb)`

Both require `current_app_user_can_update_order_row(...)`, then set:

```sql
order_number = coalesce(nullif(patch->>'order_number',''), order_number)
```

or equivalent. They do not use `rpc_is_order_number_available_v2(...)`, do not require a separate override permission, and do not write a specific order-number override activity event.

10E8C changed only availability preview behavior:

- `OrderNumberField` now calls `ordersService.isOrderNumberAvailableV2(...)`.
- The v2 wrapper calls `rpc_is_order_number_available_v2(...)` with the current order id.
- Create mode remains generated on save and performs no availability checks.
- Edit/update submit behavior remains unchanged.

## Recommended Backend Contract

Use a dedicated manual override RPC:

```sql
public.rpc_order_number_override(
  p_order_id uuid,
  p_order_number text,
  p_reason text default null
) returns jsonb
```

A dedicated RPC is safer than overloading generic order update because:

- order number changes are special, visible identity changes;
- the normal edit patch still has many unrelated fields;
- generic update paths currently accept `order_number` without a distinct audit event;
- future UI should require an explicit action, not accidental form-state changes;
- tests and permission decisions are easier to isolate around one RPC.

The RPC should be `security definer` with stable `search_path = public`, matching guarded app RPC style.

## Caller Model

Allowed callers:

- authenticated app users with active current-company context and explicit override authority;
- service role for controlled backend/operator jobs if needed.

Disallowed callers:

- anonymous users;
- authenticated users without active current-company membership;
- users whose current company does not own the order;
- users with only create-mode form state;
- users with only general read permissions.

The function should revoke `PUBLIC` and `anon`, then grant only to `authenticated` and, if consistent with project convention, `service_role`.

## Permission Strategy

Known existing permissions include:

- `orders.update.assigned`
- `orders.update.all`
- `activity.create.system_event`
- `activity.create.note.assigned`
- `activity.create.note.all`
- `activity.moderate`

No dedicated order-number override permission is currently confirmed in seed/constants.

Recommended implementation decision:

1. Prefer a new dedicated permission later, such as `order_number.override` or `order_number.manage`, if a permission seed slice is acceptable.
2. For a minimal first implementation without permission seed changes, require `orders.update.all`.
3. Do not allow `orders.update.assigned` alone to change order numbers.
4. Do not treat activity permissions as override authority. Activity permissions can support logging policy but should not authorize identity changes.

The backend contract should make the permission choice explicit in 10E8E before implementation.

## Required Validation Rules

The override RPC should:

- require non-null `p_order_id`;
- load and lock the target order, likely `for update`, to serialize concurrent override attempts;
- require the order to belong to `current_company_id()` using `coalesce(company_id, default_company_id())`;
- require active current-company membership;
- require override authority;
- trim `p_order_number`;
- reject blank values;
- reject values longer than the schema/availability limit, currently 80 characters in the v2 availability RPC;
- validate format conservatively.

Initial format recommendation:

- allow uppercase/lowercase letters, digits, dashes, underscores, and periods only;
- reject control characters and leading/trailing whitespace after trim;
- defer arbitrary custom format strings until the company-safe numbering-rule model is complete.

No-op behavior:

- If the normalized number equals the current `orders.order_number`, return a no-op result without writing audit/activity.
- Do not treat no-op as an error unless UX requires it.

## Company-Scoped Availability

The override must validate company-scoped availability server-side.

Recommended behavior:

- Reuse the same logic as `rpc_is_order_number_available_v2(...)`, or extract a lower-level helper later.
- Scope conflict checks to `current_company_id()`.
- Exclude the current order id.
- Return or raise a clear conflict if another same-company order owns the number.
- Do not expose cross-company conflicting order ids.

While global uniqueness remains active:

- the override must still be prepared for the database unique constraint on `orders.order_number` to reject a number used by another company;
- a global uniqueness violation should produce a clear error such as `order_number_globally_reserved_during_transition`;
- do not weaken the current global uniqueness constraint in 10E8E.

## Update Behavior

The override RPC should update only:

- `orders.order_number`
- `orders.updated_at`

It should not update:

- client fields;
- assignments;
- dates;
- fees;
- status;
- notes;
- company ownership;
- numbering rule/counter state;
- readiness/onboarding state.

The RPC should not allocate a new generated number. It should only validate and persist an explicit override.

## Audit / Activity Behavior

Manual order-number override must write a durable activity/audit event when the value changes.

Recommended event surface:

- `activity_log`, because this is an order-level operational change visible in order timelines.

Recommended event type:

- `order_number.manual_override`

Recommended payload/detail:

```json
{
  "old_order_number": "2026001",
  "new_order_number": "FALCON-2026-001",
  "reason": "Corrected duplicate imported number",
  "source": "rpc_order_number_override",
  "scope": "company"
}
```

Recommended message:

- `Order number changed from 2026001 to FALCON-2026-001`

Actor fields should follow the existing `rpc_log_event(...)` / activity logging pattern:

- current app user id where available;
- authenticated user id;
- current company id;
- order id.

If `rpc_log_event(...)` is reused, confirm it does not reject the event due to permissions after the override has already succeeded. Prefer writing inside the same transaction/function body so the order update and activity record succeed or fail together.

`company_audit_events` is not recommended as the primary surface for this change because the event is order-scoped, not company setup/bootstrap-scoped. It may be added later only if there is a separate compliance requirement.

## Error Shape

For an RPC returning `jsonb`, recommended error handling is fail-closed with SQLSTATEs plus stable messages:

- `order_not_found` / `42501` or `P0002` depending project convention;
- `order_not_in_current_company` / `42501`;
- `order_number_override_not_authorized` / `42501`;
- `order_number_required` / `22023`;
- `order_number_too_long` / `22023`;
- `order_number_invalid_format` / `22023`;
- `order_number_unavailable` / `23505` or `22023`;
- `order_number_globally_reserved_during_transition` / `23505`.

Do not return cross-company details in errors.

## Result Shape

Recommended result:

```json
{
  "status": "updated",
  "order_id": "uuid",
  "company_id": "uuid",
  "old_order_number": "2026001",
  "new_order_number": "FALCON-2026-001",
  "activity_event_id": "uuid-or-text-if-available",
  "warnings": [
    {
      "code": "global_uniqueness_still_enforced",
      "message": "Global order-number uniqueness remains active during migration."
    }
  ],
  "updated_at": "timestamp"
}
```

No authority/grant fields should be returned.

If the value is unchanged:

```json
{
  "status": "unchanged",
  "order_id": "uuid",
  "company_id": "uuid",
  "old_order_number": "2026001",
  "new_order_number": "2026001",
  "activity_event_id": null,
  "warnings": []
}
```

## Relationship To Generic Order Update

The final target is:

- generic order update should not accept `order_number` as a normal patch field;
- manual number changes should go through `rpc_order_number_override(...)`;
- frontend direct table updates should stop sending `order_number` except through the explicit override flow;
- existing `rpc_update_order(...)` and `rpc_order_update(...)` should later reject or ignore `order_number` unless an explicit override mode is designed.

10E8E should not attempt to migrate all generic update behavior unless it is explicitly scoped. The first safe implementation is additive RPC-only.

## Relationship To Edit UI

The UI should eventually move from normal text-field editing to an explicit action:

- show current order number read-only by default;
- provide `Change order number` only to users who can attempt override;
- require a reason if the backend contract requires it;
- call the override RPC;
- refresh the order after success;
- show backend validation errors;
- do not rely on frontend-only availability as final authority.

10E8C availability can remain a helper signal, but the override RPC must revalidate on submit.

## Recommended Implementation Sequence

### 10E8E: Backend Override RPC Only

- Add `rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb`.
- Require active current-company membership.
- Require order belongs to current company.
- Require the selected override permission strategy.
- Validate and check company-scoped availability server-side.
- Update only `orders.order_number`.
- Write `activity_log` event on effective change.
- Preserve generic update/direct table behavior for this slice unless explicitly scoped.
- Do not wire frontend yet.

10E8E result:

- Implemented `public.rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb`.
- Authenticated callers require active current-company context and `orders.update.all`.
- `service_role` is allowed for controlled backend/operator use.
- Reason is accepted and trimmed but not required.
- The RPC validates nonblank order numbers, max length 80, and a conservative `^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$` format.
- The target order is locked, must belong to `current_company_id()`, and only `orders.order_number` plus `updated_at` are changed.
- Same-company conflicts are rejected before update.
- Global uniqueness remains in place; global conflicts surface as `order_number_globally_reserved_during_transition`.
- Effective changes write `activity_log.event_type = 'order_number.manual_override'` with old number, new number, reason, source, and company scope.
- No-op same-number calls return `status: unchanged` and do not write activity.
- Generic order update and frontend edit submit still need later cleanup.

### 10E8F: Frontend API Wrapper Only

- Add `overrideOrderNumber(orderId, orderNumber, reason)`.
- Call only `rpc_order_number_override(...)`.
- Do not wire the edit UI yet.
- Test success, conflict, permission error, and no direct table update.

10E8F result:

- Added `overrideOrderNumber(orderId, orderNumber, reason = null)` to `src/lib/services/ordersService.js`.
- The wrapper calls `supabase.rpc("rpc_order_number_override", { p_order_id, p_order_number, p_reason })`.
- It does not call `updateOrder(...)`, direct-update `orders`, call availability RPCs, or perform local validation.
- It remains unwired from UI and normal edit submit.

### 10E8G: Explicit Edit UI Override

- Make edit-mode order number read-only by default.
- Add explicit override action/modal.
- Require reason if selected.
- Use v2 availability as guidance only.
- Submit through override RPC.
- Refresh order after success.

10E8G result:

- Added `docs/ORDER_NUMBER_OVERRIDE_UI_DESIGN.md` as a design-only UI contract.
- The proposed UI keeps create mode excluded and makes edit-mode order number read-only by default.
- The future action is an explicit `Change order number` dialog with a candidate number and optional reason.
- Frontend v2 availability remains guidance only; backend `rpc_order_number_override(...)` remains the final validation and audit path.
- Normal edit submit should later stop carrying `order_number`.
- No runtime UI, API wiring, backend behavior, uniqueness constraint, Owner Setup, bootstrap, or legacy function behavior changed.

10E8H result:

- Added the edit-mode UI shell in `AssignmentFields`.
- The current order number displays read-only by default.
- `Change order number` opens a local dialog with candidate number and optional reason fields.
- The shell was intentionally unwired in 10E8H.

10E8I result:

- Wired the explicit shell to `overrideOrderNumber(...)`.
- The shell enables save only for a nonblank changed candidate.
- It may show `isOrderNumberAvailableV2(...)` guidance but still relies on the backend override RPC for final validation and audit.
- Successful override updates the local displayed order number through the parent form callback.
- Normal edit submit remains separate and still needs 10E8J cleanup to stop carrying `order_number`.

10E8J result:

- Removed `order_number` from normal `OrderForm` edit/update payload construction.
- The form still keeps order-number state for read-only display and explicit override updates.
- `overrideOrderNumber(...)` is now the only frontend order-number mutation path.
- Backend generic update RPCs and direct update helper definitions were not changed in this slice and still need future hardening.

10E8K result:

- Added `docs/ORDER_NUMBER_GENERIC_UPDATE_HARDENING_DESIGN.md` as a design-only backend hardening plan.
- The design confirms `rpc_update_order(...)`, `rpc_order_update(uuid,jsonb)`, generic direct table update helpers, and row-scoped direct update policies remain backend risk surfaces.
- Recommended first implementation is RPC-level rejection of `order_number` keys in generic update RPCs.
- Direct table update policy risk and optional trigger guard are deferred to follow-up slices.

10E8L result:

- Implemented `supabase/migrations/20260518065000_generic_order_update_reject_order_number.sql`.
- `rpc_update_order(uuid,jsonb)` and `rpc_order_update(uuid,jsonb)` reject JSON patches containing `order_number` and direct callers to `rpc_order_number_override(...)`.
- The quarantined text-id `rpc_order_update(text,jsonb)` remains service-role-only and also rejects `order_number` before its legacy quarantine exception.
- Ordinary generic update fields, update authorization/scoping, client/AMC attachment guards, return types, and grants are preserved.
- Direct table update policy risk remains future work.

### Later: Generic Update Cleanup

- Inspect and limit direct table update policy/helper risk so lower-level callers cannot bypass the explicit override path.
- Keep global uniqueness until company-scoped uniqueness migration is ready.

## Hard No-Go Rules

- No implicit override from editing a normal field alone.
- No create-mode override.
- No frontend-only duplicate validation.
- No unaudited order-number changes.
- No direct table update as the final order-number override path.
- No cross-company conflict disclosure.
- No uniqueness swap in the override RPC slice.
- No browser access to `next_order_number_v2(...)`.
- No Owner Setup numbering configuration.
- No bootstrap numbering seeding.
