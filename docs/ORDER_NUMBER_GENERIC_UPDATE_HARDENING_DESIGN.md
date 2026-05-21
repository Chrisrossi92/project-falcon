# Order Number Generic Update Hardening Design

## Purpose

Phase 10E8K designs how to prevent generic backend and direct order update paths from changing `order_number` outside the explicit override RPC.

This is documentation-only plus read-only code/schema inspection. It does not add migrations, backend behavior changes, frontend behavior changes, route changes, registry changes, tests, uniqueness/index changes, Owner Setup numbering configuration, bootstrap seeding, or legacy function removal.

The target invariant is: `rpc_order_number_override(...)` is the only supported backend mutation path for order-number changes.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_NUMBER_OVERRIDE_UI_DESIGN.md`
- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_BACKEND_CONTRACT.md`
- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_DESIGN.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend/service code inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`

Schema/function/policy migrations inspected:

- `supabase/migrations/20260518000000_baseline_extensions_and_schema.sql`
- `supabase/migrations/20260518017000_company_order_intake_attachment_authorization.sql`
- `supabase/migrations/20260518018000_company_order_legacy_rpc_import_quarantine.sql`
- `supabase/migrations/20260518019000_company_order_write_policy_cleanup.sql`
- `supabase/migrations/20260518026000_company_explicit_authenticated_grants.sql`
- `supabase/migrations/20260518064000_order_number_override_rpc.sql`

## Current Frontend State

Active create path:

- `OrderForm` create submit calls `createOrderViaRpc(payload)`.
- Create payloads omit `order_number`.
- `rpc_create_order(payload jsonb)` generates the number server-side.

Active normal edit path:

- `OrderForm` edit submit calls `ordersService.updateOrder(order.id, payload)`.
- `buildOrderPayload(..., { isEdit: true })` no longer includes `order_number`.
- The form keeps `values.order_number` only for read-only display and explicit override updates.

Explicit override path:

- `AssignmentFields` exposes `Change order number`.
- The dialog calls `overrideOrderNumber(orderId, candidate, reason || null)`.
- The wrapper calls `rpc_order_number_override(...)`.

Frontend state is now correct, but backend/direct paths still need hardening.

## Backend / Direct Update Paths Found

### `ordersService.updateOrder(orderId, patch)`

Location:

- `src/lib/services/ordersService.js`

Behavior:

```js
supabase
  .from("orders")
  .update(patch)
  .eq("id", orderId)
  .select("*")
  .single()
```

Current active use:

- Active `OrderForm` edit submit still uses this helper for ordinary fields.
- After 10E8J, the active form payload no longer includes `order_number`.

Risk:

- The helper remains generic and will update any patch key that RLS permits.
- A future caller could still pass `order_number` unless the helper is narrowed or backend guards prevent it.

### `src/lib/api/orders.js` Direct Update Helpers

Found direct `orders` table update helpers:

- `updateOrderStatus(orderId, next)`
- `updateOrderDates(orderId, { siteVisit, reviewDue, finalDue })`
- `assignAppraiser(orderId, appraiserId)`
- `assignClient(orderId, clientId)`
- `bulkUpdateStatus(orderIds, status)`
- `bulkAssignAppraiser(orderIds, appraiserId)`

These helpers do not currently update `order_number` directly, but they use direct table updates and rely on RLS. They should remain in scope for broader direct-update migration planning.

### `public.rpc_update_order(order_id uuid, patch jsonb)`

Definitions inspected:

- baseline definition in `20260518000000_baseline_extensions_and_schema.sql`
- current replacement in `20260518017000_company_order_intake_attachment_authorization.sql`

Current behavior:

```sql
order_number = coalesce(nullif(patch->>'order_number',''), order_number)
```

Risk:

- The RPC is granted to `authenticated`.
- It enforces update authorization and client/AMC attachment guards.
- It still treats `order_number` as ordinary patch data.

### `public.rpc_order_update(p_order_id uuid, p jsonb)`

Definitions inspected:

- baseline definition in `20260518000000_baseline_extensions_and_schema.sql`
- current replacement in `20260518017000_company_order_intake_attachment_authorization.sql`

Current behavior:

```sql
order_number = coalesce(nullif(p->>'order_number',''), o.order_number)
```

Risk:

- The RPC is granted to `authenticated`.
- It enforces update authorization and client/AMC attachment guards.
- It still treats `order_number` as ordinary patch data.

### Deprecated Text-ID `rpc_order_update(p_order_id text, p_patch jsonb)`

Migration:

- `20260518018000_company_order_legacy_rpc_import_quarantine.sql`

Current behavior:

- Quarantined for authenticated callers and raises a deprecated exception.
- Service-role compatibility remains granted, but the body still raises.

Risk:

- Low for browser/authenticated usage because it is quarantined.
- Keep documented until removed.

### Direct Table RLS Policy

Migration:

- `20260518019000_company_order_write_policy_cleanup.sql`

Policy:

- `orders_update_company_authorized`

Behavior:

```sql
for update
to authenticated
using (current_app_user_can_update_order_row(...))
with check (current_app_user_can_update_order_row(...))
```

Risk:

- Policy is row-scoped, not column-scoped.
- Any authenticated caller with update authority and direct table access can update `order_number` unless a trigger or column-level privilege strategy prevents it.

## Active vs Inactive Risk Summary

Active frontend path now safe from normal edit payload:

- `OrderForm` normal edit does not send `order_number`.
- Explicit override is the only active frontend order-number mutation path.

Backend risk remains:

- `rpc_update_order(...)` still accepts `order_number`.
- `rpc_order_update(uuid,jsonb)` still accepts `order_number`.
- Direct table update policy still permits field-agnostic updates for authorized rows.
- `ordersService.updateOrder(...)` is still a generic patch helper.

## Hardening Options

### Option 1: RPC-Level Rejection

Update generic RPCs to reject `order_number` keys.

Recommended first backend hardening:

- `rpc_update_order(order_id uuid, patch jsonb)` should raise a clear exception if `patch ? 'order_number'`.
- `rpc_order_update(p_order_id uuid, p jsonb)` should raise a clear exception if `p ? 'order_number'`.
- Error should point callers to `rpc_order_number_override(...)`.
- Keep all ordinary fields unchanged.

Pros:

- Small blast radius.
- Directly protects authenticated RPC callers.
- Easy to smoke test.

Cons:

- Does not protect direct table update callers.

### Option 2: RPC-Level Stripping

Ignore/remove `order_number` from generic RPC payloads.

Use only if compatibility requires nonbreaking behavior.

Pros:

- Less likely to break clients that still send stale `order_number`.

Cons:

- Silent ignore can hide bad callers.
- Harder to catch unauthorized override attempts.

Recommendation:

- Prefer rejection for RPCs unless implementation inspection finds an active caller that still sends stale `order_number`.

### Option 3: Database Trigger Guard

Add a `before update of order_number` trigger on `orders`.

The trigger would reject `order_number` changes unless an explicit backend-controlled context marker is present. The override RPC would set that marker locally inside its transaction.

Possible shape:

```sql
perform set_config('falcon.allow_order_number_override', 'true', true);
```

Then the trigger checks:

```sql
current_setting('falcon.allow_order_number_override', true) = 'true'
```

Pros:

- Protects all paths, including direct table updates and future accidental callers.
- Best final backend guarantee.

Cons:

- Needs careful design so service-role jobs, migrations, imports, and tests can still operate intentionally.
- Can break legitimate data repair scripts if not documented.
- Must avoid letting browser callers set trusted flags directly through unsafe RPCs.

Recommendation:

- Consider after RPC hardening and direct table policy inspection.
- If direct table updates must remain broad, a trigger guard is likely the strongest final protection.

### Option 4: RLS / Column Privilege Strategy

Use column-level update privileges or policy structure to prevent `order_number` direct updates.

Pros:

- Could reduce reliance on trigger flags.

Cons:

- Supabase/PostgREST direct table update behavior and existing grants need catalog verification.
- RLS policies are row-level and do not naturally express per-column mutation restrictions.
- Broad `authenticated` table grants may complicate column-level revokes.

Recommendation:

- Inspect in 10E8M before choosing.
- Do not rely on frontend-only direct helper cleanup as final authority.

### Option 5: Move Updates To RPC-Only

Deprecate direct table update helpers and move order edits to guarded RPCs.

Pros:

- Cleaner authority boundary.
- Easier audit/logging and validation.

Cons:

- Larger migration.
- Existing direct helpers cover status, dates, assignment, archive, and generic edit behavior.

Recommendation:

- Treat as a later migration, not the first 10E8 hardening slice.

## Recommended Implementation Sequence

### 10E8L: Harden Generic Update RPCs

Implement one migration that updates:

- `public.rpc_update_order(order_id uuid, patch jsonb)`
- `public.rpc_order_update(p_order_id uuid, p jsonb)`

Recommended behavior:

- Reject `order_number` key if present.
- Preserve existing authorization behavior.
- Preserve existing client/AMC attachment guards.
- Preserve ordinary update fields.
- Preserve grants/revokes.
- Add comments pointing to `rpc_order_number_override(...)`.

Verification:

- RPC update with ordinary fields still succeeds.
- RPC update with `order_number` fails.
- Explicit `rpc_order_number_override(...)` still succeeds.
- Normal `OrderForm` edit remains unaffected because it no longer sends `order_number`.

10E8L result:

- Implemented in `supabase/migrations/20260518065000_generic_order_update_reject_order_number.sql`.
- `public.rpc_update_order(order_id uuid, patch jsonb)` now rejects patches containing `order_number`.
- `public.rpc_order_update(p_order_id uuid, p jsonb)` now rejects patches containing `order_number`.
- Quarantined `public.rpc_order_update(p_order_id text, p_patch jsonb)` remains service-role-only and now rejects `order_number` before raising the legacy quarantine exception.
- Existing signatures, return types, ordinary-field update behavior, authorization/scoping, client/AMC attachment guards, and grants are preserved.
- Direct table update policy risk remains deferred to 10E8M.

### 10E8M: Inspect / Limit Direct Table Update Policy Risk

Read-only or design-first slice unless safe implementation is obvious.

Tasks:

- Inspect actual replayed grants on `orders`.
- Inspect whether column-level revoke is feasible with Supabase/PostgREST.
- Confirm all active direct update helpers and their required fields.
- Decide whether direct helper narrowing is enough or a trigger is required.

### 10E8N: Optional Database Trigger Guard

Implement only if needed after 10E8M.

Recommended behavior:

- `before update of order_number` trigger rejects changes by default.
- `rpc_order_number_override(...)` sets a transaction-local allow flag.
- Error message points to explicit override RPC.
- Service-role/operator repair behavior is explicitly documented.

### Later: Deprecate Direct Update Helper

Longer-term target:

- Replace `ordersService.updateOrder(...)` generic patch helper with a narrow app RPC or field-specific helpers.
- Keep order-number override isolated.
- Add audit/activity where appropriate for sensitive order edits.

## 10E8L No-Go Rules

- No direct table policy rewrite in the RPC hardening slice.
- No trigger guard until direct update risk is inspected.
- No uniqueness/index changes.
- No create-mode changes.
- No Owner Setup numbering configuration.
- No bootstrap seeding.
- No broad workflow/status refactor.
- No breaking existing non-number order edits.

## Hard No-Go Rules

- No unaudited `order_number` updates.
- No generic update path changing `order_number`.
- No frontend-only protection as final guarantee.
- No direct table patch treated as final order-number authority.
- No breaking existing non-number order edits.
- No uniqueness swap in 10E8 hardening.
- No fallback to legacy global availability as override authority.
