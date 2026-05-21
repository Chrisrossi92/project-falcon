# Order Direct Write RLS Restriction Design

## Purpose

Phase 10G1 designs how to restrict direct browser/table writes to `orders` now that active primary order mutation paths are RPC-backed or canonical.

This is documentation-only plus read-only schema/code inspection. It does not add migrations, backend behavior changes, frontend behavior changes, RLS/RPC changes, permission changes, routes, registries, UI changes, tests, or helper removal.

## Sources Inspected

Docs inspected:

- `docs/ORDER_RPC_ONLY_MUTATION_CLOSEOUT.md`
- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md`
- `docs/ORDER_DIRECT_HELPER_DEPRECATION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema/RLS inspected:

- `supabase/migrations/20260518012000_company_order_read_isolation.sql`
- `supabase/migrations/20260518019000_company_order_write_policy_cleanup.sql`
- current order mutation RPC migrations for create, update, status transition, assignment, date update, and order-number override

Frontend/service inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/features/orders/actions.js`
- `src/lib/utils/updateOrderStatus.js`
- direct `.from("orders")` reads/writes and deprecated direct helper call sites

## Current RLS Policy Inventory

`orders` has company-aware read/write policies.

Read policy:

- `orders_select_company_lifecycle_visibility`
  - Allows authenticated users to read orders through lifecycle/responsibility visibility.
  - This is a read policy and should not change in the direct-write restriction slice.

Write policies:

- `orders_insert_company_authorized`
  - `for insert to authenticated`
  - Allows direct inserts when `current_app_user_can_create_order()` passes and the inserted row is scoped to `current_company_id()`.

- `orders_update_company_authorized`
  - `for update to authenticated`
  - Allows direct updates when `current_app_user_can_update_order_row(company_id, appraiser_id, assigned_to, reviewer_id, status)` passes.
  - This is row-scoped, not column-specific. It can still permit direct mutation of sensitive columns if a browser caller bypasses the RPC-backed helpers.

- `orders_delete_company_authorized`
  - `for delete to authenticated`
  - Allows direct deletes for current-company rows when the user has `orders.delete` or `orders.archive`.

Read projection grants remain present for order views such as:

- `v_orders_frontend_v4`
- `v_orders_active_frontend_v4`
- `v_orders_list`
- `v_orders_list_with_last_activity`

The 10G implementation path must leave select/read behavior unchanged.

## Current Mutation Access Model

Canonical active mutation paths:

- Create: `createOrderViaRpc(...)` -> `rpc_create_order(payload jsonb)`
- Normal edit: `updateOrderViaRpc(...)` -> `rpc_update_order(order_id uuid, patch jsonb)`
- Site visit: `updateSiteVisitAtViaRpc(...)` -> `rpc_update_order(...)`
- Site visit calendar projection: `src/lib/api/orders.js#updateSiteVisitAt(...)` orchestrates best-effort `rpc_create_calendar_event(...)` after the RPC-backed order update.
- Status/smart workflow: canonical `ordersService` workflow helpers -> `rpc_transition_order_status(...)`
- Explicit order-number override: `overrideOrderNumber(...)` -> `rpc_order_number_override(...)`
- Edit-mode order-number availability: `isOrderNumberAvailableV2(...)` -> `rpc_is_order_number_available_v2(...)`

Deprecated but still exported direct mutation helpers:

- direct create/update helpers in `src/lib/services/ordersService.js`
- direct create/update/date/assignment/archive helpers in `src/lib/api/orders.js`
- legacy action adapters in `src/features/orders/actions.js`
- legacy direct status fallback in `src/lib/utils/updateOrderStatus.js`

These helpers now have deprecation annotations and development-only warnings, but they still can execute where imported. RLS restriction is the backend safety step that prevents reintroduced direct browser writes from becoming authority.

## Target Access Model

Target state:

- Authenticated browser users can read orders through existing select policies and read projections.
- Authenticated browser users cannot directly insert, update, or delete `orders` rows through PostgREST/table APIs.
- Order mutations happen through narrowly scoped, security-definer RPCs with explicit guards.
- `service_role` and migration/admin contexts retain operational ability as required.
- Existing canonical RPCs continue to work after restriction.
- Deprecated direct helpers fail clearly during smoke if any active route still uses them.

This target should be reached only after route/import smoke proves active user-facing writes are RPC-backed.

## Restriction Options

| Option | Description | Pros | Risks / Notes | Recommendation |
|---|---|---|---|---|
| Option A | Revoke direct table write grants from `authenticated` if safe | Strong direct-write block at privilege layer | Requires exact grant inventory; can break PostgREST paths unexpectedly; must verify security-definer RPC execution still works | Keep as later or companion hardening after grant inventory. Do not start here without SQL smoke. |
| Option B | Replace `orders` insert/update/delete policies with authenticated deny policies | Explicitly blocks browser writes while keeping read policies untouched | Must verify security-definer RPCs are owned/executed in a way that still permits mutation; stale direct helpers fail immediately | Recommended first implementation shape for 10G3 if 10G2 smoke passes. |
| Option C | Allow only service-role/security-definer RPC paths | Aligns with RPC-only mutation goal | Needs smoke proving each canonical RPC still mutates successfully | Recommended target model, implemented by Option B and verified with SQL/browser smoke. |
| Option D | Leave reads/select policies unchanged | Avoids breaking lists, details, dashboards, reviewer/appraiser views, and related order-derived reads | None if write policies are isolated carefully | Required. |
| Option E | Transitional policy allowing specific safe direct updates only if needed | Can preserve an unexpected active compatibility path | Keeps direct table writes alive and can mask migration gaps | Use only if 10G2 finds an active direct write that cannot be migrated immediately. Time-box and document it. |

Recommended approach: Option B as the first narrow backend implementation, with Option D mandatory and Option E only as a fallback. Option A should be considered after a grant inventory if deny policies are insufficient or if future hardening wants a privilege-layer block as well.

## Recommended Staged Approach

### 10G2: Route / Import Smoke And Active-Caller Verification

Before implementation:

- run import/caller scans for direct order mutation helpers;
- route-smoke active order create, edit, detail site visit, table site visit, smart workflow actions, explicit order-number override, and order read-only screens;
- verify deprecated direct helpers are not used by active user-facing paths;
- confirm assignment/archive/delete direct helpers are not active route dependencies;
- identify any remaining direct write that needs migration or an explicit transitional policy.

### 10G3: Implement Narrow RLS / Write Restriction If Safe

If 10G2 passes:

- add one migration that changes only `orders` direct write policies;
- leave select/read policies unchanged;
- replace direct authenticated insert/update/delete allowance with deny policies or equivalent direct-write block;
- preserve service-role/admin/migration compatibility;
- do not remove helpers in the same slice;
- do not change RPC definitions unless SQL smoke proves a narrowly scoped compatibility fix is required.

### 10G4: SQL / Browser Smoke Verification

After implementation:

- SQL smoke canonical RPC create/edit/site-visit update/status transition/order-number override;
- SQL smoke direct authenticated insert/update/delete denial;
- browser or route smoke active order create, edit, detail/table site visit, workflow actions, override, order list/detail reads;
- confirm read projections and dashboards still work.

### 10G5: Closeout

Document:

- final order mutation authority map;
- exact policies changed;
- direct helper state;
- remaining assignment/archive/delete cleanup;
- rollback notes and any transitional exceptions.

## Preflight Must Pass Before Implementation

- Create order via UI/API path uses `createOrderViaRpc(...)` / `rpc_create_order(...)`.
- Edit order via UI/API path uses `updateOrderViaRpc(...)` / `rpc_update_order(...)`.
- Site visit via UI/API path uses `updateSiteVisitAtViaRpc(...)` / `rpc_update_order(...)`.
- Status workflow uses canonical RPC-backed transition helpers.
- Explicit order-number override uses `overrideOrderNumber(...)` / `rpc_order_number_override(...)`.
- No active user-facing direct order insert/update/delete calls remain.
- Deprecated direct helpers are not imported by active user-facing mutation routes.
- Admin, reviewer, appraiser, and owner paths still read orders correctly.
- Order list, order detail, dashboard counts, notifications, activity, and calendar reads are unaffected.
- SQL smoke confirms canonical security-definer RPCs still mutate successfully under the proposed restriction.
- Negative SQL smoke confirms direct authenticated insert/update/delete is blocked where intended.

## Rollback Plan

The 10G3 migration should be reversible:

- keep the prior policy definitions in the design/implementation notes;
- use a single migration for the write-policy restriction;
- if active route smoke fails, restore the previous insert/update/delete policies in a follow-up rollback migration;
- do not combine helper removal, RPC refactors, or read-policy changes with the restriction migration.

Rollback should restore write compatibility only. It should not alter read policies, order-number behavior, workflow RPCs, or helper annotations.

## No-Go Rules

- No select/read restriction changes.
- No breaking service-role or security-definer RPC mutation paths.
- No RLS restriction without route/import smoke.
- No helper removal in the same slice as RLS restriction.
- No status/workflow behavior changes.
- No uniqueness or order-numbering changes.
- No assignment/archive/delete semantics redesign inside the RLS restriction migration.
- No broad permission expansion to make tests pass.
- No mega-RPC consolidation.

## 10G1 Result

Phase 10G1 is complete as design only.

Recommended decision:

- Proceed to 10G2 route/import smoke and active-caller verification.
- If 10G2 passes, implement a narrow 10G3 direct-write restriction by replacing authenticated direct insert/update/delete policies with a deny-write model while leaving read policies unchanged.
- Do not implement RLS restrictions, remove helpers, or alter RPC behavior in 10G1.

## 10G2 Preflight Result

Phase 10G2 completed read-only caller/import verification and targeted test smoke. No active user-facing direct `orders` insert/update/delete path was found in the primary routed order mutation flows.

### Import / Caller Scan Summary

| Finding | Classification | Evidence | Action |
|---|---|---|---|
| `OrderForm` create | Active user-facing | `src/components/orders/form/OrderForm.jsx` imports and calls `createOrderViaRpc(...)` | Pass |
| `OrderForm` edit | Active user-facing | `src/components/orders/form/OrderForm.jsx` imports and calls `updateOrderViaRpc(...)` | Pass |
| `OrderDetail` site visit save | Active user-facing | `src/pages/orders/OrderDetail.jsx` imports and calls `updateSiteVisitAtViaRpc(...)` | Pass |
| `UnifiedOrdersTable` site visit save | Active user-facing compatibility wrapper | `src/features/orders/UnifiedOrdersTable.jsx` calls `updateSiteVisitAt(...)`, which delegates to `updateSiteVisitAtViaRpc(...)` and then best-effort calendar projection | Pass |
| Order-number override | Active user-facing | `src/components/orders/form/AssignmentFields.jsx` imports and calls `overrideOrderNumber(...)` | Pass |
| Smart workflow/status actions | Active user-facing | `UnifiedOrdersTable`, `QuickActionsDrawerPanel`, and `ReviewerActionCell` use canonical `ordersService` workflow helpers backed by `rpc_transition_order_status(...)` | Pass by import/code inspection; no dedicated status workflow test found in this preflight |
| Direct `ordersService.createOrder/updateOrder/deleteOrder/archiveOrder/setOrderStatus` | Exported helper surface | Definitions and tests only in the scan; direct helpers emit development warnings | Legacy/exported, not active primary path |
| Direct table write helpers in `src/lib/api/orders.js` | Exported helper surface | Direct status/date/assignment/bulk/archive/create helpers remain and warn in development; `updateSiteVisitAt(...)` is intentionally RPC-backed | Legacy/exported; do not remove before 10G3 |
| `src/features/orders/OrderActionsPanel.jsx` and `src/features/orders/actions.js` | Legacy/unmounted surface | `OrderActionsPanel` imports legacy actions, but route scan did not find it mounted in `src/routes/index.jsx` | Keep classified as legacy risk |
| `src/lib/utils/updateOrderStatus.js` | Legacy utility | Exports direct fallback; no active import found | Keep classified as legacy risk |
| `src/lib/api/reviews.js#submitReviewDecision` | Legacy/unknown utility | Contains direct `orders.review_status` update; no active import found | Keep classified as legacy risk for future review workflow cleanup |
| Direct `.from("orders")` reads | Active read paths | Dashboard, detail loaders, drawers, notifications, activity, hooks, and API read helpers use select/count only | Read access must remain unchanged |

### Active Mutation Preflight Table

| Mutation path | Expected RPC/canonical path | Evidence found | Test coverage | Status |
|---|---|---|---|---|
| Create order | `createOrderViaRpc(...)` -> `rpc_create_order(...)` | `OrderForm.jsx` create branch calls `createOrderViaRpc(payload)` | `OrderForm.test.jsx`; `ordersServiceCreateOrderViaRpc.test.js` | Pass |
| Edit order | `updateOrderViaRpc(...)` -> `rpc_update_order(...)` | `OrderForm.jsx` edit branch calls `updateOrderViaRpc(order.id, payload)` | `OrderForm.test.jsx`; `ordersServiceCreateOrderViaRpc.test.js` | Pass |
| Site visit from detail | `updateSiteVisitAtViaRpc(...)` -> `rpc_update_order(...)` | `OrderDetail.jsx` calls `updateSiteVisitAtViaRpc(order.id, iso || null)` | `OrderDetail.test.jsx`; `ordersServiceCreateOrderViaRpc.test.js` | Pass |
| Site visit from table | `updateSiteVisitAt(...)` -> `updateSiteVisitAtViaRpc(...)` -> `rpc_update_order(...)`, then best-effort `rpc_create_calendar_event(...)` | `UnifiedOrdersTable.jsx` calls the compatibility helper; helper delegates to RPC-backed wrapper | `ordersApiSiteVisit.test.js`; `ordersServiceCreateOrderViaRpc.test.js` | Pass |
| Order-number override | `overrideOrderNumber(...)` -> `rpc_order_number_override(...)` | `AssignmentFields.jsx` calls `overrideOrderNumber(orderId, candidate, reason)` | `AssignmentFields.test.jsx`; `ordersServiceCreateOrderViaRpc.test.js` | Pass |
| Status/smart workflow | Canonical helpers -> `rpc_transition_order_status(...)` | `UnifiedOrdersTable`, `QuickActionsDrawerPanel`, and `ReviewerActionCell` import canonical service helpers; service helpers call `rpc_transition_order_status(...)` | No dedicated workflow test found in this preflight | Pass by inspection; add route/browser smoke in 10G3 validation |
| Deprecated direct helpers | Not active primary path | Scan finds definitions/tests/legacy surfaces, not active primary routed create/edit/site-visit/override path | Direct helper warning tests pass | Monitor |

Targeted tests run:

```bash
npm test -- src/lib/services/__tests__/ordersServiceCreateOrderViaRpc.test.js src/components/orders/form/__tests__/OrderForm.test.jsx src/components/orders/form/__tests__/AssignmentFields.test.jsx src/lib/api/__tests__/ordersApiSiteVisit.test.js src/pages/orders/__tests__/OrderDetail.test.jsx
```

Result: 5 files passed, 35 tests passed.

### 10G2 Decision

RLS direct-write restriction is ready for 10G3 narrow implementation, with one caveat: 10G3 validation should include explicit status/smart workflow route or browser smoke because no dedicated status workflow test file was found during this preflight.

No RLS, RPC, permission, route, helper, frontend behavior, backend behavior, migration, registry, UI, or production behavior changed in 10G2.

## 10G3 Implementation Result

Phase 10G3 added `supabase/migrations/20260518067000_restrict_orders_direct_writes.sql`.

The migration is intentionally narrow:

- drops `orders_insert_company_authorized`;
- drops `orders_update_company_authorized`;
- drops `orders_delete_company_authorized`;
- adds `orders_insert_rpc_only` with `with check (false)` for `authenticated`;
- adds `orders_update_rpc_only` with `using (false)` and `with check (false)` for `authenticated`;
- adds `orders_delete_rpc_only` with `using (false)` for `authenticated`;
- preserves `orders_select_company_lifecycle_visibility`;
- does not change view/read grants;
- does not change RPC definitions or RPC grants;
- does not remove direct helper exports.

Current post-migration policy inventory:

| Policy | Command | Role | Effect |
|---|---|---|---|
| `orders_select_company_lifecycle_visibility` | `select` | `authenticated` | Preserves company/lifecycle/responsibility read access. |
| `orders_insert_rpc_only` | `insert` | `authenticated` | Blocks direct browser/table inserts. |
| `orders_update_rpc_only` | `update` | `authenticated` | Blocks direct browser/table updates. |
| `orders_delete_rpc_only` | `delete` | `authenticated` | Blocks direct browser/table deletes. |

SQL smoke was run against the local database after the migration applied:

| Smoke | Result |
|---|---|
| `rpc_create_order(...)` | Passed; returned server-generated order number. |
| `rpc_update_order(...)` ordinary update | Passed. |
| `rpc_update_order(...)` site-visit update | Passed. |
| `rpc_order_number_override(...)` | Passed; returned `updated`. |
| `rpc_transition_order_status(...)` | Passed; transitioned `new` to `in_review`. |
| Direct authenticated insert | Blocked with SQLSTATE `42501`. |
| Direct authenticated update | Blocked; affected zero rows and did not change data. |
| Direct authenticated delete | Blocked; affected zero rows. |
| Authenticated select/read | Passed for an authorized current-company user. |
| Service-role direct insert | Passed. |

Validation caveat:

- `supabase db reset` applied migrations through `20260518067000_restrict_orders_direct_writes.sql`, but the Supabase CLI exited nonzero at the final container health check because `supabase_storage_project-falcon` was unhealthy.
- `supabase status` showed the local stack running with some optional services stopped, and direct DB smoke through `docker exec supabase_db_project-falcon psql ...` passed.

Decision:

- Active RPC mutation flows are preserved.
- Direct authenticated browser/table writes to `public.orders` are blocked.
- Reads are preserved.
- Deprecated direct helpers remain exported and development-warned, but they will now fail against real RLS for authenticated direct writes.

## 10G4 Closeout Result

Phase 10G4 is complete in `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_CLOSEOUT.md`.

Closeout decision:

- Phase 10G is complete through the direct-write RLS restriction lock.
- Direct authenticated `orders` insert/update/delete is blocked.
- Active RPC mutation paths, read/select access, and service-role behavior are preserved.
- Deprecated direct helpers remain in place and should not be removed until route/browser smoke and dev-warning observation justify it.
- The local Supabase storage health-check failure is documented separately from DB/order validation and should be handled only if storage-backed features or clean reset health become current priorities.
