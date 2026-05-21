# Order Number Manual Override Design

## Purpose

Phase 10E8A designs the company-scoped order-number availability and manual override strategy before implementing edit/update/manual override changes.

This is documentation-only plus read-only code/schema inspection. It does not add migrations, backend behavior, frontend behavior, route changes, registry changes, UI changes, tests, uniqueness/index changes, Owner Setup numbering configuration, bootstrap seeding, or manual override implementation.

## Context

Phase 10E7F completed create-mode cleanup:

- new-order create uses guarded `rpc_create_order(payload jsonb)` through `createOrderViaRpc(payload)`;
- create payloads omit `order_number`;
- create mode no longer prefetches or checks order-number availability;
- create mode displays order number as generated on save;
- backend create generates the authoritative order number server-side with `next_order_number_v2(...)`;
- edit/update still preserves the existing `order_number` path;
- manual override remains unchanged and deferred.

The remaining risk is the edit/update/manual path, not create mode.

## Sources Inspected

Documentation inspected:

- `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema and code inspected:

- `supabase/migrations/20260518000000_baseline_extensions_and_schema.sql`
- `supabase/migrations/20260518017000_company_order_intake_attachment_authorization.sql`
- `supabase/migrations/20260518002000_baseline_static_seed_data.sql`
- `supabase/migrations/20260518026000_company_explicit_authenticated_grants.sql`
- `supabase/migrations/20260518004000_company_scope_order_projection_preservation.sql`
- `supabase/migrations/20260518006000_company_scope_notification_activity_writes.sql`
- `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql`
- `src/components/inputs/OrderNumberField.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/components/orders/form/OrderForm.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/lib/permissions/constants.js`

## Current Behavior

### Create Mode

Create mode is no longer an order-number authority:

- `OrderForm` create submit calls `createOrderViaRpc(payload)`.
- `buildOrderPayload(...)` omits `order_number` for new-order creates.
- `AssignmentFields` create mode renders generated-later copy instead of an editable `Order #` input.
- `OrderNumberField` is not part of the active create path.

No create-mode manual override should be added.

### Edit / Update Mode

Edit mode still hydrates and sends `order_number`:

- `OrderForm` hydrates `values.order_number` from the existing order.
- `AssignmentFields` renders an editable `Order #` input when `isEdit` is true.
- `buildOrderPayload(..., { isEdit: true })` includes `order_number`.
- `ordersService.updateOrder(orderId, patch)` performs a direct `orders` table update.

This means order-number edits can still ride along as ordinary edit form state.

### Backend Update RPCs

The inspected guarded update RPCs accept order-number changes:

- `public.rpc_update_order(order_id uuid, patch jsonb)`
- `public.rpc_order_update(p_order_id uuid, p jsonb)`

The current effective behavior is:

- require order update authorization;
- preserve the existing number if no nonblank `order_number` is supplied;
- set `order_number = coalesce(nullif(...), existing order_number)` when supplied;
- rely on existing global database uniqueness as the final collision guard.

These RPCs do not currently distinguish a manual number override from ordinary order editing and do not validate against a company numbering rule.

### Availability Checks

Confirmed global availability checks:

- `src/components/inputs/OrderNumberField.jsx` reads `orders` directly and checks `orders.order_number = value`.
- `ordersService.isOrderNumberAvailable(orderNo, { excludeId })` reads `orders` directly and checks `orders.order_number`, then falls back to legacy `order_no`.
- `public.rpc_is_order_number_available(p_order_number text, p_ignore_order_id text default null)` checks `public.orders.order_number` globally.

These checks are not company-scoped and can leak cross-company existence by returning unavailable for a number used by another company.

## Why Global Availability Is Insufficient

Global order-number availability is incompatible with SaaS numbering because:

- future target uniqueness is `(company_id, order_number)`, not global `order_number`;
- two companies should eventually be able to use the same natural numbering sequence;
- a global unavailable result can reveal that another company has a given number;
- global checks do not map to the company-id-backed v2 numbering model;
- frontend direct table checks are not a backend authority boundary;
- manual override is a sensitive operation that should be explicit, permissioned, and audited.

Global uniqueness still exists today and should remain until a separate uniqueness migration proves company-scoped safety.

## Desired Company-Scoped Availability Behavior

Add a guarded v2 RPC before wiring any UI:

```sql
public.rpc_is_order_number_available_v2(
  p_order_number text,
  p_order_id uuid default null
) returns jsonb
```

Recommended behavior:

- require authenticated current-company context;
- require active company membership;
- require existing order read/update authority appropriate to the caller, or a dedicated numbering-read permission if introduced later;
- trim and validate `p_order_number`;
- reject blank values;
- reject invalid format or excessive length;
- scope lookup to `orders.company_id = current_company_id()`;
- ignore `p_order_id` only when that order belongs to the current company and is readable/updatable by the caller;
- while global uniqueness remains, return both company-scoped availability and a warning when a global collision would still block persistence;
- never expose the colliding order id or cross-company details;
- return a structured result rather than a bare boolean.

Suggested result shape:

```json
{
  "available": true,
  "company_scoped_available": true,
  "globally_blocked": false,
  "normalized_order_number": "2026001",
  "checked_company_id": "uuid",
  "ignored_order_id": "uuid-or-null",
  "warnings": [],
  "source": {
    "rpc": "rpc_is_order_number_available_v2",
    "version": 1
  }
}
```

If global uniqueness still blocks a number that is otherwise company-scoped available, return a safe warning such as:

```json
{
  "available": false,
  "company_scoped_available": true,
  "globally_blocked": true,
  "warnings": ["global_uniqueness_still_enforced"]
}
```

Do not return cross-company order ids, company names, or user data.

## Desired Manual Override Behavior

Manual override should not be casual form state.

Recommended model:

- preserve existing order number by default on normal edit;
- treat any attempted order-number change as a manual override;
- require an explicit user action such as `Change order number`;
- require a backend RPC, not direct table update;
- require current-company order update authorization;
- require either a future dedicated permission such as `order_number.override` / `order_number.manage`, or a carefully selected existing admin-level order permission such as `orders.update.all` for the first implementation;
- consider requiring `activity.create.system_event` or an internal system event path for audit logging, but do not make activity permissions a substitute for override authority;
- require a reason if product UX can support it;
- validate format and company-scoped availability through backend logic;
- reject create-mode use;
- reject blank override values;
- reject no-op changes or treat them as no-op without audit;
- write an order activity/audit event when the value changes;
- return the updated order with the final `order_number`.

Suggested future RPC:

```sql
public.rpc_order_number_override(
  p_order_id uuid,
  p_order_number text,
  p_reason text default null
) returns public.orders
```

This RPC should:

- lock/read the target order;
- confirm `orders.company_id = current_company_id()`;
- confirm caller can update the order and has override authority;
- normalize and validate the candidate number;
- call or share validation logic with `rpc_is_order_number_available_v2(...)`;
- update only `orders.order_number`;
- insert an audit/activity event with old number, new number, reason, actor, and company;
- fail closed if global uniqueness still blocks persistence.

## Permission / Guard Strategy

Known existing permissions include:

- `orders.update.assigned`
- `orders.update.all`
- `activity.create.note.assigned`
- `activity.create.note.all`
- `activity.create.system_event`
- `activity.moderate`

No dedicated order-number override permission was found in current seeds/constants.

Recommended decision:

- 10E8B should not add a permission; it should add availability only.
- Manual override implementation should decide between:
  - a new dedicated permission such as `order_number.override` / `order_number.manage`;
  - an existing high-trust permission, likely `orders.update.all`, for a minimal first pass.
- Assigned-user update permission alone should not grant order-number override by default.

## Audit Strategy

Manual order-number change should create a durable event.

Existing event surfaces include:

- `activity_log` order activity rows and insert helpers;
- `rpc_log_event(...)` for order activity;
- `company_audit_events` for company/admin setup events.

Recommended first target:

- write an order-scoped activity event because the changed value is operational order history;
- event type: `order_number.manual_override` or `order.order_number_changed`;
- include old number, new number, reason, actor id, company id, and source RPC metadata;
- avoid putting cross-company availability details in the event payload.

If company-audit coverage is desired later, add a separate company audit event only after the order activity event is stable.

## Frontend UX Strategy

Create mode:

- keep generated-later display;
- do not expose manual override;
- do not call availability checks;
- submit no `order_number`.

Edit mode, first safe UX:

- display current order number as read-only by default;
- show a gated `Change` action only for users with confirmed override capability once a backend contract exists;
- open a deliberate override control/modal with candidate number and reason;
- call company-scoped availability RPC for the candidate;
- submit override only through a guarded manual override RPC;
- refetch or update the order from the RPC result;
- do not use `OrderNumberField` direct table checks as final authority.

`OrderNumberField` should either be retired from order editing or converted to use the v2 availability RPC before it is used for manual override UX.

## Recommended Implementation Sequence

### 10E8B: Company-Scoped Availability RPC Only

- Add `rpc_is_order_number_available_v2(...)`.
- Use current-company scope.
- Ignore same-company current order when editing.
- Return structured JSON.
- Do not wire frontend yet.
- Do not change edit/update behavior.
- Do not change uniqueness constraints.
- Preserve legacy `rpc_is_order_number_available(...)`.

10E8B result: implemented in `supabase/migrations/20260518063000_order_number_availability_v2.sql`.

The new `public.rpc_is_order_number_available_v2(p_order_number text, p_order_id uuid default null) returns jsonb`:

- requires authenticated/service-role execution;
- resolves `current_company_id()`;
- requires active current-company membership for authenticated callers;
- trims and rejects blank order numbers;
- checks conflicts only within the resolved current company;
- excludes `p_order_id` only when that order belongs to the current company;
- returns `available`, `order_number`, `company_id`, `conflicting_order_id`, and `scope: company`;
- performs no mutation and writes no audit event.

The legacy `rpc_is_order_number_available(...)` remains unchanged and unwired changes were not made.

### 10E8C: Wire Edit-Mode Availability to v2 RPC

- Add a frontend API wrapper for the v2 availability RPC.
- Update or replace `OrderNumberField` only in edit/manual contexts.
- Do not enable actual override unless the value is still submitted through existing update behavior and explicitly accepted as an interim risk.
- Prefer read-only current order number until 10E8D.

10E8C result: implemented in the frontend availability path only.

- `ordersService.isOrderNumberAvailableV2(orderNo, { orderId })` calls only `rpc_is_order_number_available_v2(...)`.
- `OrderNumberField` now uses the v2 wrapper instead of a direct global `orders` table lookup.
- `AssignmentFields` passes the current edit order id so the v2 RPC can exclude the current order.
- Create mode remains excluded from order-number availability checks.
- Normal edit/update submit behavior was unchanged at 10E8C time; 10E8J later removed `order_number` from the active normal `OrderForm` edit payload.
- No backend migration, uniqueness change, legacy RPC removal, or manual override implementation was added.

### 10E8D: Design / Implement Guarded Manual Override Path

10E8D result: completed as backend contract/design only in `docs/ORDER_NUMBER_MANUAL_OVERRIDE_BACKEND_CONTRACT.md`.

The contract recommends a dedicated `rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb` rather than overloading generic order update. The future RPC should require active current-company membership, confirm the order belongs to the current company, use explicit override authority, validate the candidate number, check company-scoped availability server-side, update only `orders.order_number`, and write an `activity_log` event with old/new number and reason when changed.

No implementation was added. Existing edit/update submit behavior still sends `order_number` through the normal update path until the backend override RPC and explicit UI flow are implemented.

10E8E result: implemented backend-only in `supabase/migrations/20260518064000_order_number_override_rpc.sql`.

`public.rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb` now exists. Authenticated callers require active current-company scope and `orders.update.all`; `service_role` is allowed. The RPC locks the target order, verifies company ownership, trims and validates the new number, rejects same-company conflicts, updates only `orders.order_number` and `updated_at`, writes an `activity_log` event on effective change, and returns a narrow JSON result. Reason is optional for this first backend slice. Generic order update, frontend edit submit, create mode, uniqueness constraints, and legacy functions remain unchanged.

10E8F result: implemented as a frontend service wrapper only.

`ordersService.overrideOrderNumber(orderId, orderNumber, reason)` now calls only `rpc_order_number_override(...)` with `p_order_id`, `p_order_number`, and `p_reason`, returns the RPC JSON result, and propagates errors. It is not wired into edit UI or normal edit submit. It does not call `updateOrder`, direct-update `orders`, call availability RPCs, change create mode, or change backend behavior.

10E8G result: completed as UI design-only in `docs/ORDER_NUMBER_OVERRIDE_UI_DESIGN.md`.

The design recommends replacing casual edit-mode order-number editing with a read-only display plus an explicit `Change order number` action. The future dialog should collect a candidate order number and optional reason, use `isOrderNumberAvailableV2(...)` as guidance only, submit through `overrideOrderNumber(...)`, and update local order state or refetch from the RPC result. Normal edit submit should later stop carrying `order_number`. No runtime UI, backend behavior, tests, uniqueness changes, create-mode behavior, Owner Setup configuration, bootstrap seeding, or legacy function behavior changed.

10E8H result: implemented the UI shell only.

`AssignmentFields` edit mode now shows the current order number read-only and exposes `Change order number`. The shell dialog collects a candidate order number and optional reason, but `Save order number` is disabled and no override API, availability API, backend RPC, or order mutation is called. Create mode remains generated on save. Normal edit submit remained unchanged in 10E8H; 10E8J later removed order number from the active normal edit payload.

10E8I result: wired the explicit override action.

The edit-mode shell now enables `Save order number` for a nonblank changed candidate, calls `overrideOrderNumber(orderId, candidate, reason || null)`, renders loading/safe error state, and updates the displayed form order number from the RPC result on success. `isOrderNumberAvailableV2(...)` is used only as company-scoped guidance. Create mode remains generated on save and has no override action. Normal edit submit remains on the existing update path and should be cleaned up next so it no longer carries `order_number`.

10E8J result: removed order number from normal edit payload.

`OrderForm` edit submit still uses the existing `updateOrder(...)` path for ordinary fields, but `buildOrderPayload(..., { isEdit: true })` no longer includes `order_number`. The displayed order number remains in form state for read-only display and explicit override updates. The explicit `overrideOrderNumber(...)` action is now the only frontend path that changes order numbers. Backend generic update RPCs/direct helper definitions remain unchanged and need later hardening.

- Decide permission.
- Add explicit override RPC.
- Require reason if selected.
- Validate availability with v2 logic.
- Write audit/activity event.
- Update edit UI to call the override RPC.

### Later: Company-Scoped Uniqueness Migration

- Add `(company_id, order_number)` unique index for non-null numbers.
- Keep global uniqueness until data and write paths are proven safe.
- Drop or quarantine global uniqueness only in a dedicated migration phase.

## Hard No-Go Rules

- No global availability as long-term authority.
- No create-mode manual override.
- No order-number changes without audit.
- No frontend-only duplicate check.
- No direct table manual override path as final target.
- No uniqueness drop/swap in 10E8.
- No browser access to `next_order_number_v2(...)`.
- No fallback to legacy `company_key` as tenant authority.
- No cross-company collision detail leakage.
- No Owner Setup numbering configuration in 10E8.
- No bootstrap numbering seeding in 10E8.

## 10E8A Completion

Phase 10E8A is complete as design-only.

No migrations, backend behavior, frontend behavior, route behavior, registry behavior, UI behavior, tests, uniqueness constraints, Owner Setup, or bootstrap behavior changed.
