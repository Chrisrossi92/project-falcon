# Order Edit RPC Migration Design

## Purpose

Phase 10F2 designs the migration of normal `OrderForm` edit submit from direct table update to a guarded RPC update path.

This is documentation-only plus read-only inspection. It does not add migrations, backend behavior changes, frontend behavior changes, route changes, registry changes, UI changes, tests, RLS changes, RPC changes, permission changes, or direct helper removal.

## Sources Inspected

Docs inspected:

- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md`
- `docs/ORDER_NUMBERING_REFACTOR_CLOSEOUT_AUDIT.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend/code inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/lib/services/ordersService.js`
- `src/pages/orders/EditOrder.jsx`
- `src/pages/NewOrder.jsx`
- `src/components/orders/form/__tests__/OrderForm.test.jsx`

Backend inspected:

- `public.rpc_update_order(order_id uuid, patch jsonb)`
- `public.rpc_order_update(p_order_id uuid, p jsonb)`
- current grants for generic update RPCs
- current client/AMC attachment guards
- Phase 10E8L `order_number` rejection hardening

## Current Edit Flow

Current active edit flow:

1. `EditOrder` loads an order from `v_orders_frontend_v4` and direct `orders`, then merges both rows.
2. `EditOrder` renders `OrderForm` with the merged row.
3. `OrderForm` hydrates local form state.
4. On submit, `buildOrderPayload(nextValues, { isEdit: true })` builds a patch.
5. The edit branch calls `updateOrder(order.id, payload)`.
6. `ordersService.updateOrder(...)` direct-updates `public.orders` through Supabase table update.
7. `onSaved(updatedRow)` runs and `EditOrder` navigates to `/orders/:id`.

The current active edit payload no longer includes `order_number`.

## Target Edit Flow

Target 10F3 flow:

1. `OrderForm` continues to build the same edit payload.
2. The edit branch calls a new service wrapper, recommended as `updateOrderViaRpc(orderId, patch)`.
3. `updateOrderViaRpc(...)` calls `supabase.rpc("rpc_update_order", { order_id: orderId, patch })`.
4. The RPC enforces update authorization, current-company scoping through existing helpers, client/AMC attachment guards, and `order_number` rejection.
5. The returned `public.orders` row is passed through to existing `onSaved(result)` behavior.

Create and explicit order-number override remain separate:

- create branch continues using `createOrderViaRpc(payload)`;
- explicit order-number override continues using `overrideOrderNumber(...)`;
- normal edit submit must not call `overrideOrderNumber(...)`.

## RPC Choice

Recommended first RPC:

- `public.rpc_update_order(order_id uuid, patch jsonb)`

Reason:

- It already accepts the argument names that map naturally to a frontend wrapper: `order_id` and `patch`.
- It preserves existing update authorization through `current_app_user_can_update_order_row(...)`.
- It validates client and managing AMC attachments.
- It was hardened in 10E8L to reject `order_number`.
- Its field coverage best matches current `OrderForm` property/manual-client/fee/notes payload.

Known gaps:

- `rpc_update_order(...)` does not currently update `reviewer_id`.
- It updates `appraiser_split`, but `OrderForm` currently sends `split_pct`.
- It updates `appraiser_fee`, `base_fee`, property address fields, client/AMC/manual client, appraiser, and notes.
- It does not update `property_type`, `report_type`, `entry_contact_name`, `entry_contact_phone`, `site_visit_at`, `review_due_at`, or `final_due_at`.

Alternative:

- `public.rpc_order_update(p_order_id uuid, p jsonb)` covers `reviewer_id`, `site_visit_at`, and some date/fee fields, but it does not cover the current form's `property_address`, `postal_code`, `base_fee`, `appraiser_fee`, `split_pct`, contact fields, report/property type, or notes as sent.

Decision:

- Use `rpc_update_order(...)` first if preserving current direct-update behavior for the known covered fields is acceptable.
- If 10F3 must preserve every current direct-update field exactly, add a new backend migration before frontend wiring or expand `rpc_update_order(...)` in the same medium slice with explicit SQL smoke tests.
- Do not silently switch to `rpc_order_update(...)` without resolving field coverage gaps.

## Return Shape

Current direct helper returns the updated `orders` row from `.select("*").single()`.

Both candidate RPCs return `public.orders`.

`updateOrderViaRpc(orderId, patch)` should return the RPC `data ?? null` or throw the Supabase error, matching `createOrderViaRpc(...)` and existing service style.

No frontend mapper should be introduced in 10F3 unless tests show the current `onSaved` path requires view-shaped data. `EditOrder` currently navigates using `updatedRow.id`, so the raw order row is sufficient for the existing container behavior.

## Fields / Payload Rules

Known edit payload fields from `buildOrderPayload(..., { isEdit: true })`:

- `client_id`
- `manual_client_name`
- `managing_amc_id`
- `appraiser_id`
- `reviewer_id`
- `base_fee`
- `split_pct`
- `appraiser_fee`
- `property_address`
- `city`
- `state`
- `postal_code`
- `property_type`
- `report_type`
- `entry_contact_name`
- `entry_contact_phone`
- `site_visit_at`
- `review_due_at`
- `final_due_at`
- `notes`

Rules:

- `order_number` remains excluded.
- `status` remains excluded from edit payload. Workflow status changes must stay on workflow RPCs.
- `company_id` must remain excluded.
- owner/role/permission fields must remain excluded.
- direct order-number override remains separate through `rpc_order_number_override(...)`.
- date changes should be reviewed before relying on generic edit RPC coverage because dedicated date RPCs already exist.
- assignment changes should be reviewed before relying on generic edit RPC coverage because assignment-specific RPCs/permissions exist for some flows.

Field coverage risk for 10F3:

| Field group | Current direct edit sends? | `rpc_update_order(...)` coverage | 10F3 recommendation |
|---|---:|---:|---|
| client/manual client/managing AMC | Yes | Yes | Safe candidate |
| appraiser | Yes | Yes | Safe candidate, but assignment semantics should be revisited in 10F4 |
| reviewer | Yes | No | Decide whether to defer, add coverage, or use another RPC |
| base/appraiser fee | Yes | Yes | Safe candidate |
| split percent | Yes as `split_pct` | No, RPC expects `appraiser_split` | Map `split_pct` to `appraiser_split` or add RPC coverage |
| property address/city/state/postal code | Yes | Yes | Safe candidate |
| property/report type | Yes | No | Decide whether to defer or add coverage |
| entry contact fields | Yes | No | Decide whether to defer or add coverage |
| site/review/final dates | Yes | Partial/no | Prefer dedicated date RPC design or add explicit coverage |
| notes | Yes | Yes | Safe candidate |

## Recommended 10F3 Implementation

Recommended medium slice:

1. Add `updateOrderViaRpc(orderId, patch)` to `src/lib/services/ordersService.js`.
2. The wrapper should call only `supabase.rpc("rpc_update_order", { order_id: orderId, patch })`.
3. Preserve existing `updateOrder(...)` direct helper for compatibility, but stop active `OrderForm` edit submit from using it.
4. Wire `OrderForm` edit branch to `updateOrderViaRpc(...)`.
5. Preserve create branch on `createOrderViaRpc(...)`.
6. Preserve explicit override path on `overrideOrderNumber(...)`.
7. Add/adjust tests in one pass.

Important 10F3 decision before implementation:

- Either accept that only `rpc_update_order(...)` covered fields are migrated in the first implementation and document uncovered fields as deferred, or expand the backend RPC to cover current payload fields in the same medium slice.
- If backend RPC expansion is included, keep it narrow and explicitly list fields. Do not create an arbitrary broad patch RPC.

## Parity Test Plan

Service wrapper tests:

- `updateOrderViaRpc(orderId, patch)` calls `rpc_update_order` with `{ order_id, patch }`.
- It returns the RPC result.
- It propagates RPC errors.
- It does not direct-update `orders`.
- It does not call `rpc_order_number_override`.
- It does not call `rpc_create_order`.

OrderForm tests:

- Edit submit calls `updateOrderViaRpc`.
- Edit submit no longer calls direct `updateOrder`.
- Create submit still calls `createOrderViaRpc`.
- Edit payload excludes `order_number`.
- Create payload still excludes `order_number`.
- Normal edit submit does not call `overrideOrderNumber`.
- Existing `onSaved(result)` behavior is preserved.
- RPC error renders the existing safe error state.

Override tests:

- Existing explicit override tests continue proving `overrideOrderNumber(...)` is only called from the override action, not normal edit submit.

Backend SQL smoke if RPC coverage changes:

- Valid ordinary edit succeeds.
- Missing permission/current company is rejected.
- Invalid client/AMC attachment is rejected.
- `order_number` key is rejected.
- Any newly added fields update as expected.

## Do Not Do In 10F3

- Do not change create behavior.
- Do not change order-number override behavior.
- Do not restrict direct table RLS yet.
- Do not remove direct helpers yet.
- Do not change workflow/status behavior.
- Do not change assignment permissions casually.
- Do not collapse every order mutation into one mega-RPC.

## Open Questions For 10F3

- Should reviewer changes remain part of ordinary edit, or move to a reviewer/assignment-specific path?
- Should date fields in ordinary edit route through dedicated date RPCs instead of generic update?
- Should `split_pct` be mapped to `appraiser_split`, or should the backend use `split_pct` directly?
- Are `property_type`, `report_type`, and contact fields intentionally writable today, and should the RPC preserve them now?
- Does any `onSaved` consumer require view-shaped fields beyond `id` after edit?

## Phase 10F3A Field Coverage Follow-Up

Phase 10F3A is complete as documentation plus read-only inspection in `docs/ORDER_UPDATE_RPC_FIELD_COVERAGE_DESIGN.md`.

The field coverage design keeps `rpc_update_order(order_id uuid, patch jsonb)` as the preferred migration target, but recommends a backend-coverage-first slice before frontend wiring. The recommended 10F3B migration should narrowly expand `rpc_update_order(...)` to cover the current normal edit payload fields that are not covered today:

- `reviewer_id`
- `split_pct`
- `property_type`
- `report_type`
- `entry_contact_name`
- `entry_contact_phone`
- `site_visit_at`
- `review_due_at`
- `final_due_at`

The same expansion must preserve the existing `order_number` rejection, current update authorization, client/AMC attachment guards, current-company scoping, and explicit field allowlist. Normal edit submit should not move to the RPC until this backend coverage is either verified or consciously narrowed with documented deferred fields.

Phase 10F3B implemented that backend expansion in `supabase/migrations/20260518066000_rpc_update_order_edit_field_coverage.sql`. The RPC now covers the normal edit payload fields identified in 10F3A, while frontend edit submit remains on the existing direct helper until the next frontend wiring slice.

## Phase 10F3C Frontend Wiring Result

Phase 10F3C wired the active normal edit submit path to the guarded RPC wrapper.

Implemented frontend changes:

- `src/lib/services/ordersService.js` now exports `updateOrderViaRpc(orderId, patch)`.
- `updateOrderViaRpc(...)` calls only `supabase.rpc("rpc_update_order", { order_id: orderId, patch })`.
- `src/components/orders/form/OrderForm.jsx` now uses `updateOrderViaRpc(order.id, payload)` for edit submit.
- Create submit remains on `createOrderViaRpc(payload)`.
- Explicit order-number override remains separate through `overrideOrderNumber(...)`.
- `ordersService.updateOrder(...)` remains exported for compatibility but is no longer the active normal `OrderForm` edit path.

Tests updated:

- service tests cover `updateOrderViaRpc(...)` RPC args, return behavior, error propagation, and no direct table update;
- `OrderForm` tests verify edit submit calls `updateOrderViaRpc(...)`, does not call direct `updateOrder(...)`, keeps create submit on `createOrderViaRpc(...)`, does not call override during normal edit submit, and keeps `order_number` out of normal edit payload.

No backend/RPC behavior, migrations, RLS, route, registry, status/workflow behavior, create behavior, or override behavior changed in this wiring slice.
