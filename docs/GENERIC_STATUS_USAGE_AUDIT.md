# Generic Status Usage Audit

## Purpose

Document remaining generic or arbitrary order status update surfaces before removing or restricting anything.

The primary workflow helpers now use `rpc_transition_order_status`, but Falcon still has compatibility paths that can accept arbitrary status values. Those paths must be audited before any RLS tightening, grants removal, or RPC deletion.

## Explicit Rule

Do not remove `public.rpc_update_order_status` or tighten `orders.status` RLS until active usage is confirmed gone or migrated to an explicit replacement.

## Summary

| Surface | Type | Current status | Risk | Recommended action |
| --- | --- | --- | --- | --- |
| `src/features/orders/actions.js:updateOrderStatus` | Frontend RPC wrapper | Legacy / quarantined caller path | Medium | Keep temporarily; verify no active UI imports beyond quarantined legacy panels before removal or rewrite. |
| `src/lib/utils/updateOrderStatus.js` | Frontend utility | Unknown / legacy utility | Medium / high | Audit imports and callers; replace active workflow use with named `ordersService` helpers. |
| `src/lib/api/orders.js:updateOrderStatus` | Frontend direct table update | Legacy API helper | Medium | Keep for compatibility until callers are classified; do not use for normal lifecycle workflow. |
| `src/lib/api/orders.js:bulkUpdateStatus` | Frontend direct table bulk update | Unknown / possible admin-support path | High | Audit callers and product intent; likely needs explicit admin override semantics before restriction. |
| `public.rpc_update_order_status` | Backend RPC | Active compatibility RPC exists in migrations | High | Keep until active frontend/backend usage is confirmed gone; then plan deprecation or controlled override replacement. |
| `public.rpc_update_order_status_with_note` | Backend RPC | Unknown live-db candidate; not found in local migrations | Unknown | Verify against live Supabase functions before making assumptions. |
| `public.rpc_update_order_v1` | Backend RPC | Unknown live-db candidate; not found in local migrations | Unknown | Verify against live Supabase functions before making assumptions. |

## Frontend Surfaces

### `src/features/orders/actions.js:updateOrderStatus`

- Accepts arbitrary `newStatus`.
- Calls `rpc_update_order_status`.
- Current repo note: already marked deprecated for normal workflow lifecycle actions.
- Apparent usage: imported by `src/features/orders/OrderActionsPanel.jsx`, which is documented as quarantined from the public orders barrel.
- Status: **Legacy / quarantined caller path**.
- Risk: **Medium** because it can still mutate arbitrary status if imported directly.
- Recommended action: audit any active imports outside quarantined legacy UI. If unused, remove or keep quarantined until a broader cleanup. If used, migrate normal workflow callers to named `ordersService` helpers.

### `src/lib/utils/updateOrderStatus.js`

- Accepts arbitrary `newStatus`.
- Attempts `rpc_update_order_status` first.
- Falls back to direct `orders.status` update.
- Also manually logs status activity on fallback.
- Status: **Unknown / legacy utility**.
- Risk: **Medium / high** because it combines arbitrary status mutation, fallback direct table writes, and legacy logging.
- Recommended action: audit imports and runtime usage. Replace normal workflow callers with named `ordersService` helpers. Any remaining admin/support use should be redesigned as an explicit override path.

### `src/lib/api/orders.js:updateOrderStatus`

- Accepts arbitrary `next` status.
- Directly updates `orders.status`.
- Current repo note: already marked deprecated for normal workflow lifecycle actions.
- Status: **Legacy API helper**.
- Risk: **Medium** because it bypasses transition semantics and backend RPC permission checks.
- Recommended action: audit callers. Keep only as temporary compatibility until active usage is classified.

### `src/lib/api/orders.js:bulkUpdateStatus`

- Accepts arbitrary `status`.
- Directly updates multiple `orders.status` rows.
- Current repo note: already marked deprecated for normal workflow lifecycle actions.
- Status: **Unknown / possible admin-support path**.
- Risk: **High** because bulk arbitrary status changes are not lifecycle-safe.
- Recommended action: audit callers and product intent. If needed, replace with explicit admin override semantics, audit logging, and permission requirements before tightening RLS.

## Backend Surfaces

### `public.rpc_update_order_status`

- Exists in active local migrations.
- Accepts arbitrary `p_new_status`.
- Updates `orders.status`.
- Calls `rpc_log_status_change`.
- Status: **Active compatibility RPC**.
- Risk: **High** because it bypasses the transition map and can duplicate or diverge from canonical activity behavior.
- Recommended action: do not remove yet. First verify no active app path still depends on it. If a support/admin override is needed, create a deliberately named override RPC with explicit permission checks and audit semantics.

### `public.rpc_update_order_status_with_note`

- Named as a possible backend surface.
- Not found in local active or archived migrations during this audit pass.
- Status: **Unknown live-db candidate**.
- Risk: **Unknown** until live Supabase functions are checked.
- Recommended action: verify with live database function inventory before restriction work.

### `public.rpc_update_order_v1`

- Named as a possible backend surface.
- Not found in local active or archived migrations during this audit pass.
- Status: **Unknown live-db candidate**.
- Risk: **Unknown** until live Supabase functions are checked.
- Recommended action: verify with live database function inventory before restriction work.

## Archived / Legacy Functions

Archived migrations also define older copies of `public.rpc_update_order_status`.

- `supabase/migrations_archive/2025-08-16_orders_rpcs_fix.sql`
- `supabase/migrations_archive/2025-08-16_orders_rls_and_rpcs.sql`

Status: **Archived legacy definitions**.

Recommended action: treat as historical context only unless a live database has diverged from the active migration set.

## Next Audit Steps

1. Search active imports and runtime callers for each frontend helper.
2. Query live Supabase for functions named `rpc_update_order_status`, `rpc_update_order_status_with_note`, and `rpc_update_order_v1`.
3. Classify each surface as active UI, admin/support override, compatibility, or dead code.
4. Migrate normal workflow usage to named `ordersService` helpers backed by `rpc_transition_order_status`.
5. Design any needed admin/support override separately, with explicit permission checks and audit behavior.
6. Only after usage is confirmed gone or replaced, consider removing legacy RPC usage or tightening RLS.
