# Order Direct Write RLS Restriction Closeout

## Purpose

Phase 10G4 closes the order direct-write RLS restriction arc after Phase 10G3 blocked direct authenticated browser/table writes to `public.orders`.

This is documentation-only plus verification review. It does not add runtime code changes, migrations, backend behavior changes, frontend behavior changes, permissions, RLS/RPC changes, routes, registries, UI changes, tests, or helper removal.

## Completed 10G Work

- 10G1 designed the direct-write restriction strategy and recommended a staged write-policy restriction after caller verification.
- 10G2 verified active user-facing order mutation paths are RPC-backed or canonical.
- 10G3 implemented the narrow write-policy restriction in `supabase/migrations/20260518067000_restrict_orders_direct_writes.sql`.
- 10G4 documents the closeout state and separates the local Supabase storage health caveat from DB/order validation.

## What Changed In 10G3

The 10G3 migration removed the prior direct authenticated write policies:

- `orders_insert_company_authorized`
- `orders_update_company_authorized`
- `orders_delete_company_authorized`

It added explicit RPC-only blocking policies:

- `orders_insert_rpc_only`
- `orders_update_rpc_only`
- `orders_delete_rpc_only`

It preserved the read policy:

- `orders_select_company_lifecycle_visibility`

No view/read projection grants, RPC definitions, RPC grants, helper exports, frontend behavior, routes, registries, UI, order numbering, uniqueness, or storage objects changed.

## Current Order Mutation Authority

Active mutation paths remain RPC-backed:

- create order: `createOrderViaRpc(...)` -> `rpc_create_order(...)`
- edit order: `updateOrderViaRpc(...)` -> `rpc_update_order(...)`
- site visit update: `updateSiteVisitAtViaRpc(...)` / `updateSiteVisitAt(...)` -> `rpc_update_order(...)`
- order-number override: `overrideOrderNumber(...)` -> `rpc_order_number_override(...)`
- status transition: canonical workflow helpers -> `rpc_transition_order_status(...)`

Deprecated direct helper exports remain in code and remain development-warned. Against real authenticated RLS, direct insert/update/delete attempts on `public.orders` are now expected to fail or affect zero rows.

## Smoke Result Table

| Operation | Expected path | Smoke result | Status |
|---|---|---|---|
| create order | `rpc_create_order(...)` | Returned a server-generated order number. | Pass |
| edit order | `rpc_update_order(...)` | Updated ordinary edit fields. | Pass |
| site visit update | `rpc_update_order(...)` through site-visit patch | Updated `site_visit_at`. | Pass |
| order number override | `rpc_order_number_override(...)` | Returned `updated`. | Pass |
| status transition | `rpc_transition_order_status(...)` | Transitioned `new` to `in_review`. | Pass |
| authenticated select/read | `orders_select_company_lifecycle_visibility` | Authorized current-company read returned the order. | Pass |
| authenticated direct insert | direct `insert into public.orders` as `authenticated` | Blocked with SQLSTATE `42501`. | Pass |
| authenticated direct update | direct `update public.orders` as `authenticated` | Affected zero rows and did not change data. | Pass |
| authenticated direct delete | direct `delete from public.orders` as `authenticated` | Affected zero rows. | Pass |
| service-role direct insert | direct `insert into public.orders` as `service_role` | Insert succeeded. | Pass |

## Validation Caveat

`supabase db reset` applied migrations through `20260518067000_restrict_orders_direct_writes.sql`, including the 10G3 migration. The CLI then exited nonzero after the final local service health check because:

```text
supabase_storage_project-falcon container is not ready: unhealthy
```

This is documented as a local Supabase storage health issue, not an order/RLS migration failure, because:

- migration application reached and applied `20260518067000_restrict_orders_direct_writes.sql`;
- `supabase status` showed the local stack running;
- direct database connectivity through `docker exec supabase_db_project-falcon psql ...` worked;
- order/RLS SQL smoke passed against the reset database;
- active frontend mutation tests, lint, build, and `git diff --check` passed after 10G3.

Do not claim local Supabase storage is healthy until the storage container health check is repaired and rerun successfully.

## Recommended Storage Follow-Up

Track storage separately if either condition becomes true:

- local Supabase resets must finish with all service health checks passing before the next DB-heavy phase;
- Falcon features under active development depend on Supabase Storage, file uploads, logos, attachments, or report/document storage.

Suggested storage-specific repair path:

- inspect `supabase status`;
- inspect `supabase_storage_project-falcon` logs;
- restart Supabase local services or Docker Desktop if needed;
- rerun `supabase db reset`;
- rerun a storage-specific smoke only if storage-backed features are in scope.

Do not fold storage repair into order mutation/RLS follow-up unless order features start depending on storage.

## Recommended Next Phase Options

Recommended default: **pause order mutation/RLS work here**.

Phase 10G achieved the intended backend hardening checkpoint: active primary order mutation paths are RPC-backed, reads are preserved, service-role/admin behavior remains available, and direct authenticated order writes are blocked.

Next options:

- **Option A: Move back to product/onboarding features.**
  - Appropriate if no active route smoke failures appear and storage is not blocking current product work.

- **Option B: Route-level browser smoke for create/edit/site visit/status.**
  - Useful if more runtime confidence is needed before removing deprecated helpers.
  - Focus on create order, edit order, site visit from detail/table, smart workflow actions, order-number override, order list, and order detail.

- **Option C: Storage health repair.**
  - Appropriate if storage-backed features are needed or if local reset health must be clean before more DB work.
  - Keep this separate from order RLS unless a direct dependency appears.

- **Option D: Legacy helper removal later after more runtime confidence.**
  - Do not remove helpers immediately after 10G.
  - Wait for route/browser smoke and a period of dev-warning observation.

## Remaining No-Go Items

- Do not remove deprecated direct helpers without route/import proof and runtime confidence.
- Do not change read/select policies as part of order write hardening.
- Do not broaden permissions to compensate for RLS restriction.
- Do not drop legacy numbering uniqueness/functions in this closeout.
- Do not collapse all order mutations into one mega-RPC.
- Do not redesign archive/delete/assignment semantics inside the completed RLS restriction arc.
- Do not claim Supabase storage is healthy.

## 10G4 Result

Phase 10G is complete through 10G4.

Current decision:

- Direct authenticated browser/table writes to `public.orders` are blocked.
- Active RPC mutation flows are preserved.
- Order select/read access is preserved.
- Service-role direct behavior remains available.
- Deprecated direct helpers remain exported and development-warned, but direct authenticated writes now fail against real RLS.
- Local Supabase storage health remains a separate caveat.

## 10I1 Follow-Up

Phase 10I1 created `docs/ROUTE_LEVEL_BROWSER_SMOKE_PLAN.md` as the route-level browser smoke plan for Owner Setup and the primary order create, edit, site-visit, status/smart-action, and order-number override flows. The plan is documentation-only; browser execution remains the next validation step before additional product work or deprecated helper removal.

## 10I2 / 10I3 Follow-Up

Phase 10I2 executed the route-level browser smoke plan and found read/projection blockers after order creation. Owner Setup passed, `/orders/new` preserved generated-on-save order-number behavior, and `rpc_create_order(...)` succeeded, but assignable-user loading failed on `u.split_pct`, order edit failed with `permission denied for table amcs`, order detail failed to load, and the orders list did not expose the smoke order consistently enough for site-visit/status smoke.

Phase 10I3 repaired those blockers narrowly:

- `supabase/migrations/20260518068000_fix_assignable_users_and_order_read_views.sql` replaces `rpc_company_assignable_users(text)` so `default_split_pct` uses existing `users.fee_split` / `users.split` and no longer references missing `users.split_pct`.
- The routed order read views now execute as owner-backed safe projections while preserving their current-company/order-read predicates. This avoids broad direct browser grants on joined tables such as `amcs` or `activity_log`.

The 10G direct-write restriction remains intact. Direct authenticated `orders` insert/update/delete were not re-enabled, and active mutation paths still use the existing RPC/canonical create, edit, site-visit, status, and order-number override surfaces.

Next step: run Phase 10I4 as a browser rerun from Order Create onward, covering assignment selector load, created-order readback, edit, table/detail site visit, smart action, order-number override, and final list/detail/edit readback.

## 10I4 / 10I5 Follow-Up

Phase 10I4 reran the browser smoke from Order Create onward after the 10I3 projection repair. Order Create, Detail, Edit, table/detail site-visit updates, and final readback passed, but two activity-related blockers remained:

- `Send to Review` failed before status transition because workflow-note logging hit `activity_log_created_by_fkey`.
- Explicit order-number override opened safely but did not persist because `rpc_order_number_override(...)` hit the same activity identity/FK class of failure.

Phase 10I5 repaired those blockers narrowly in `supabase/migrations/20260518069000_activity_log_identity_fk_repair.sql`:

- `actor_user_id` remains the canonical FK-backed app-user actor field.
- Legacy `created_by` is populated only when the auth user has a matching `profiles_legacy` row; otherwise it remains null.
- `rpc_log_event(...)` and `rpc_order_number_override(...)` retain activity/audit writes and useful actor display fields.

The 10G direct-write restriction remains intact. SQL smoke after 10I5 confirmed workflow note logging, `rpc_transition_order_status(...)`, and `rpc_order_number_override(...)` succeed while direct authenticated `orders` insert remains blocked and direct authenticated update affects zero rows.

Next step: run Phase 10I6 as a focused browser rerun for the failed 10I4 smart-action and order-number override flows plus final list/detail/edit readback.
