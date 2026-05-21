# Route-Level Browser Smoke Results

## Purpose

Phase 10I2 executed the route-level browser smoke plan from `docs/ROUTE_LEVEL_BROWSER_SMOKE_PLAN.md` after the Phase 10G direct authenticated `orders` write restriction and Phase 10H Owner Setup polish.

Result: Phase 10I2 did not fully pass. Owner Setup and order creation through the create RPC passed, but later order read/edit/site-visit/status/override routes were blocked by existing RPC/view permission failures. No runtime code, migrations, backend behavior, routes, registries, UI, tests, RLS/RPCs, or feature behavior were changed.

## Execution Environment

- App: local Vite dev server against local Supabase.
- Browser: headless Chrome driven through the Chrome DevTools Protocol because the `agent-browser` command was not installed in this workspace.
- Data scope: disposable local smoke fixture only.
- Smoke users:
  - Owner/Admin: `owner.smoke@example.test`
  - Appraiser: `appraiser.smoke@example.test`
- Smoke company: local default active company.
- Smoke order created during execution:
  - Order id: `39616e43-6432-4463-8aed-1d90cbe163e4`
  - Order number: `2026001`
  - Starting status: `new`

## Pass / Fail Summary

| Flow | Route | Result | Blocker? | Likely category |
|---|---|---:|---:|---|
| Owner Setup | `/settings/owner-setup` | Pass | No | None |
| Order Create route load | `/orders/new` | Partial pass | Yes | RPC/UI |
| Order Create save | `/orders/new` | Pass | No | None |
| Order Create readback | `/orders/:id` | Fail | Yes | RLS/permission/read projection |
| Order Edit | `/orders/:id/edit` | Fail | Yes | RLS/permission/read projection |
| Site Visit table path | `/orders` as assigned appraiser | Fail | Yes | RPC/read projection/data visibility |
| Site Visit detail path | `/orders/:id` | Fail | Yes | RLS/permission/read projection |
| Status / Smart Actions | `/orders` | Fail | Yes | RPC/read projection/data visibility |
| Order Number Override | `/orders/:id/edit` | Not executable | Yes | Blocked by edit route load failure |
| Final readback | `/orders`, `/orders/:id`, `/orders/:id/edit` | Fail | Yes | RLS/permission/read projection |

## Detailed Results

| Step | Flow | Route | Action taken | Expected result | Actual result | Console / network / Supabase signal | Likely category | Blocker? | Notes |
|---:|---|---|---|---|---|---|---|---:|---|
| 1 | Owner Setup | `/settings/owner-setup` | Signed in as Owner/Admin and opened route. | Page loads with setup guidance, context status, grouped cards, authority boundary, and sample fallback. | Passed. Page rendered expected Owner Setup layout. | No blocking console error observed. | None | No | Confirms route guard and shell after 10H polish. |
| 2 | Owner Setup | `/settings/owner-setup` | Waited for live setup context. | Live setup context loads, or safe fallback appears. | Passed. Live setup context loaded through guarded read-only RPC and readiness status rendered. | `rpc_company_setup_context` succeeded. | None | No | Static sample fallback remained visible below. |
| 3 | Owner Setup | `/settings/owner-setup` | Updated Company Profile name and saved. | Save uses guarded profile update path, shows success, refetches context, and displays updated values. | Passed. Company name saved and context refreshed. | `rpc_company_profile_update` succeeded; success toast displayed. | None | No | Smoke value used: `Falcon Default Company Smoke`. |
| 4 | Owner Setup | `/settings/owner-setup` | Inspected deferred and diagnostic cards. | Deferred cards remain non-actionable and Company Profile is the only write card. | Passed. Deferred cards had explanatory copy only; no module/setup activation controls were present. | No mutation calls from deferred cards. | None | No | 10H no-go boundary held. |
| 5 | Order Create route load | `/orders/new` | Opened new order route. | Form loads, order number says generated on save, and no order-number prefetch occurs. | Partial pass. The route loaded and the generated-on-save message was visible; no order-number prefetch was observed. Appraiser/reviewer selectors failed to populate and a raw SQL-ish error appeared in the UI. | `rpc_company_assignable_users` returned HTTP 400 with `column u.split_pct does not exist`. No `rpc_get_next_order_number` call observed. | RPC/UI | Yes | The order number behavior passed, but assignable-user loading is a blocker for normal create UX. |
| 6 | Order Create save | `/orders/new` | Created a valid low-risk order while leaving failed appraiser/reviewer selectors unset. | Save succeeds through `rpc_create_order`, then navigates to the returned order id. | Passed. Order was created through the RPC and returned order number `2026001`. | `rpc_create_order` succeeded. | None | No | The smoke order was later patched with fixture assignments by setup tooling only so downstream appraiser checks could be attempted. |
| 7 | Order Create readback | `/orders/:id` | Followed navigation/readback for created order. | Detail/header or list shows server-generated order number after save/navigation. | Failed. Detail route showed `Failed to load order.` | Browser console showed `Failed to load order Object`. | RLS/permission/read projection | Yes | Blocks reliable created-order readback. |
| 8 | Order Edit load | `/orders/:id/edit` | Opened edit route for the smoke order as Owner/Admin. | Edit form loads, order number is display-only, and override is the only number mutation affordance. | Failed. Route rendered `Failed: permission denied for table amcs`. | Supabase/Postgres message: `permission denied for table amcs`. | RLS/permission/read projection | Yes | Blocks normal edit and order-number override execution. |
| 9 | Order Edit normal save | `/orders/:id/edit` | Attempted to proceed with normal edit. | Save succeeds through `rpc_update_order`; ordinary fields persist. | Not executable because edit route did not load. | Same edit-route load failure. | RLS/permission/read projection | Yes | No normal edit mutation was attempted. |
| 10 | Order Edit order-number separation | `/orders/:id/edit` | Attempted to confirm normal edit leaves order number unchanged. | Normal edit does not change order number. | Not executable because edit route did not load. | Same edit-route load failure. | RLS/permission/read projection | Yes | Separation remains unverified in browser. |
| 11 | Site Visit table path | `/orders` | Signed in as assigned appraiser and opened table path for the smoke order. | Table exposes site-visit date control for visible assigned order; save uses RPC-backed helper and calendar side effect remains best-effort. | Failed. No site-visit button/control was available for the smoke order. | Console showed `fetchOrdersWithFilters count error: Object`; network also showed repeated `rpc_company_assignable_users` HTTP 400 failures. | RPC/read projection/data visibility | Yes | Since the row/control was not visible, no site-visit mutation or calendar side effect could be tested. |
| 12 | Site Visit detail path | `/orders/:id` | Opened smoke order detail route. | Detail loads and site visit saves through `updateSiteVisitAtViaRpc`. | Failed. Detail route showed `Failed to load order.` | Browser console showed `Failed to load order Object`. | RLS/permission/read projection | Yes | No detail site-visit mutation was attempted. |
| 13 | Status / Smart Actions | `/orders` | Looked for a normal smart action on an eligible `new` order. | A visible action such as Send to Review succeeds through `rpc_transition_order_status`. | Failed. No `Send to Review` action was available because the smoke order was not visible/actionable in the table. | Console showed order/filter count failure; no transition RPC was attempted. | RPC/read projection/data visibility | Yes | Status remained `new` in database readback. |
| 14 | Smart Action note modal | `/orders` | Attempted note modal path if action appeared. | Modal submits and transition completes. | Not executable because no action appeared. | No note or transition RPC observed. | Data visibility | Yes | Blocked by preceding table/action visibility failure. |
| 15 | Order Number Override | `/orders/:id/edit` | Attempted to open edit route and explicit order-number dialog. | Override succeeds through `rpc_order_number_override`, or safe permission error appears. | Not executable because edit route failed before the dialog could open. | Supabase/Postgres message: `permission denied for table amcs`. | RLS/permission/read projection | Yes | Override route remains unverified in browser. |
| 16 | Override failure separation | `/orders/:id/edit` | Attempted unavailable/unauthorized override scenario if safe. | Safe error does not break normal edit save. | Not executable because edit route failed before the dialog could open. | Same edit-route load failure. | RLS/permission/read projection | Yes | Normal edit/override separation remains unverified in browser. |
| 17 | Final readback | `/orders`, `/orders/:id`, `/orders/:id/edit` | Re-opened list, detail, and edit surfaces for the smoke order. | Created/edited/site-visit/status/order-number states read consistently. | Failed. List/detail/edit did not provide consistent readable surfaces; detail failed and edit failed. | Detail: `Failed to load order.` Edit: `permission denied for table amcs`. | RLS/permission/read projection | Yes | Database readback confirmed the created order remained `status = new`, `site_visit_at = null`, and order number `2026001`. |

## Blockers Found

1. `rpc_company_assignable_users` fails in the browser with `column u.split_pct does not exist`.
   - Routes affected: `/orders/new`, `/orders`, and any surface that loads assignment selectors.
   - Impact: New Order route shows a raw SQL-ish error and assignment selectors are empty.
   - Category: RPC/UI.
   - Recommended focused fix: replace the RPC reference to nonexistent `u.split_pct` with fields that exist on `public.users` or a guarded compatible expression, then rerun create/list smoke.

2. Edit route cannot load a readable order because of `permission denied for table amcs`.
   - Route affected: `/orders/:id/edit`.
   - Impact: Normal edit, normal-edit order-number separation, and explicit order-number override cannot be tested.
   - Category: RLS/permission/read projection.
   - Recommended focused fix: inspect `v_orders_frontend_v4`, related `amcs` access, and route read queries so authorized current-company users can load permitted orders without granting mutation authority.

3. Detail route fails with `Failed to load order.`
   - Route affected: `/orders/:id`.
   - Impact: Created-order readback and detail site-visit smoke cannot run.
   - Category: RLS/permission/read projection.
   - Recommended focused fix: inspect the detail read path that uses the frontend order projection and align required grants/RLS for authorized current-company reads.

4. Orders table did not expose the assigned smoke order as actionable for appraiser site-visit or smart-action smoke.
   - Route affected: `/orders`.
   - Impact: Table site-visit update and smart-action transition could not be executed.
   - Category: RPC/read projection/data visibility.
   - Recommended focused fix: repair the assignable-users RPC failure first, then verify order-list read/count behavior and assignment visibility for active company members.

## Recommended Next Step

Start a narrow Phase 10I3 route-smoke blocker repair before adding more product features:

1. Fix `rpc_company_assignable_users` so assignment selectors do not fail with `u.split_pct`.
2. Fix authorized order read projections around `v_orders_frontend_v4` and `amcs` so list/detail/edit routes can load permitted current-company orders.
3. Rerun the Phase 10I2 smoke plan from Order Create onward.

Do not proceed to broader product work or deprecated helper removal until the browser smoke can execute the edit, site-visit, smart-action, override, and final readback routes.

## 10I3 Repair Update

Phase 10I3 implemented the narrow blocker repair in `supabase/migrations/20260518068000_fix_assignable_users_and_order_read_views.sql`.

Fixed blockers:

- `rpc_company_assignable_users` no longer references nonexistent `public.users.split_pct`. The safe projection now derives `default_split_pct` from existing `users.fee_split` / `users.split`.
- `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity` now execute as owner-backed safe projections instead of `security_invoker` views. The existing current-company/order-read predicates remain in the views, so browser reads do not require broad direct grants on joined tables such as `amcs` or `activity_log`.

Unchanged safety boundaries:

- Direct authenticated `orders` insert/update/delete policies remain blocked by the 10G3 RPC-only RLS restriction.
- Order create/edit/site-visit/status/override mutation paths were not changed.
- No route redesign, product feature work, broad `amcs` browser grant, or cross-company visibility expansion was added.

10I3 validation:

- `supabase db reset`: passed with migration `20260518068000_fix_assignable_users_and_order_read_views.sql` applied.
- Targeted SQL smoke: passed for assignable users, owner order detail/list projections, assigned-appraiser order detail/list projections, and direct authenticated order write blocking.
- Targeted frontend tests: passed for `assignableUsersApi`, `AssignmentFields`, and `OrderDetail` site-visit wrapper behavior.

Required 10I4 rerun scope:

- Rerun the route-level browser smoke from Order Create onward.
- Confirm assignment selectors load on `/orders/new`.
- Confirm created order reads back on `/orders/:id`, `/orders/:id/edit`, and `/orders`.
- Execute the previously blocked edit, table/detail site-visit, smart-action, order-number override, and final readback checklist items.

## 10I4 Rerun After 10I3 Repairs

Phase 10I4 reran the route-level browser smoke from Order Create onward after the 10I3 assignable-user and order-read projection repairs.

Execution notes:

- App: local Vite dev server against local Supabase.
- Browser: headless Chrome driven through the Chrome DevTools Protocol because the `agent-browser` command was not installed in this workspace.
- Data scope: disposable local smoke fixture only.
- Smoke users:
  - Owner/Admin: `owner.10i4@example.test`
  - Appraiser: `appraiser.10i4@example.test`
  - Reviewer: `reviewer.10i4@example.test`
- Smoke order:
  - Order id: `540dc3bc-9101-4def-a79b-05ef9ad15ee2`
  - Order number: `2026001`
  - Starting status: `new`

Result: Phase 10I4 did not fully pass. The 10I3 repairs fixed the assignable-users selector blocker and the order list/detail/edit readback blockers, and site-visit saves now work from both table and detail paths. Two remaining blockers were found after those repairs: smart-action submission fails before status transition because activity-note logging violates `activity_log_created_by_fkey`, and explicit order-number override shows a safe UI error while leaving the order number unchanged.

### 10I4 Pass / Fail Summary

| Flow | Route | Result | Blocker? | Likely category |
|---|---|---:|---:|---|
| Order Create route load | `/orders/new` | Pass | No | None |
| Order Create save/readback | `/orders/new` -> `/orders/:id` | Pass | No | None |
| Order Detail readback | `/orders/:id` | Pass | No | None |
| Order Edit load/save | `/orders/:id/edit` | Pass | No | None |
| Site Visit table path | `/orders` as assigned appraiser | Pass | No | None |
| Site Visit detail path | `/orders/:id` | Pass | No | None |
| Status / Smart Actions | `/orders` as assigned appraiser | Fail | Yes | RPC/data/activity logging |
| Order Number Override | `/orders/:id/edit` as Owner/Admin | Fail | Yes | RPC/activity logging/unknown |
| Final readback | `/orders`, `/orders/:id`, `/orders/:id/edit` | Pass with known workflow blockers | No for readback | None |

### 10I4 Detailed Results

| Step | Flow | Route | Action taken | Expected result | Actual result | Console / network / Supabase signal | Likely category | Blocker? | Notes |
|---:|---|---|---|---|---|---|---|---:|---|
| 1 | Order Create route load | `/orders/new` | Opened new order route as Owner/Admin. | Assignment selectors load, order number says generated on save, and no browser prefetch occurs. | Passed. Appraiser, reviewer, and client selectors loaded; generated-on-save copy remained visible. | `rpc_company_assignable_users` returned HTTP 200. No `rpc_get_next_order_number` prefetch observed. | None | No | Confirms the 10I3 assignable-users RPC repair fixed the `u.split_pct` blocker. |
| 2 | Order Create save | `/orders/new` | Created a smoke order with appraiser and reviewer assignments. | Save succeeds through `rpc_create_order`; returned order number appears after navigation. | Passed. Created order id `540dc3bc-9101-4def-a79b-05ef9ad15ee2` with order number `2026001`. | `rpc_create_order` returned HTTP 200. | None | No | Server-generated order number appeared on the detail route. |
| 3 | Order Detail readback | `/orders/:id` | Opened created order detail route. | Detail route loads created order and visible content matches the created order. | Passed. Detail showed order `2026001`, `10I4 Smoke Client`, `410 Smoke Route Ave`, assigned appraiser, and assigned reviewer. | No `Failed to load order` error. | None | No | Confirms the 10I3 projection repair fixed the detail readback blocker. |
| 4 | Order Edit load | `/orders/:id/edit` | Opened edit route as Owner/Admin. | Edit form loads, order number is display-only, and the normal form does not expose direct order-number editing. | Passed. Edit form loaded with display-only order number `2026001` and separate `Change order number` action. | No `permission denied for table amcs` error. | None | No | Confirms the 10I3 projection repair avoided broad `amcs` grants while restoring route load. |
| 5 | Order Edit normal save | `/orders/:id/edit` | Changed an ordinary notes field and saved. | Save succeeds through `rpc_update_order`; normal edit does not change order number. | Passed. Notes updated and order number remained `2026001`. | `rpc_update_order` returned HTTP 200. Database readback showed `notes = 10I4 smoke normal edit note` and order number unchanged. | None | No | Normal edit and explicit order-number override remain separate surfaces. |
| 6 | Site Visit table path | `/orders` as assigned appraiser | Opened orders table, used the row `Site: Not set` control, and saved a site visit. | Row is visible/actionable; site visit update succeeds through RPC-backed path; calendar projection remains nonfatal. | Passed. Table row was visible and site visit saved. | `rpc_update_order` returned HTTP 200. No fatal calendar error blocked the save. | None | No | Database readback later showed `site_visit_at` populated. |
| 7 | Site Visit detail path | `/orders/:id` as assigned appraiser | Opened detail route and updated the site visit from the detail page control. | Detail site visit update succeeds through RPC-backed path. | Passed. Detail save updated the site visit. | `rpc_update_order` returned HTTP 200. Database readback showed `site_visit_at = 2026-05-21 10:30:00`. | None | No | Detail route stayed readable after the update. |
| 8 | Status / Smart Actions | `/orders` as assigned appraiser | Clicked `Send to Review`, entered a workflow note, and confirmed. | Status transition succeeds through canonical RPC and no direct-write RLS error appears. | Failed. The modal opened and submitted, but the flow failed before status transition. The order remained `status = new`. | Console: `Failed to send to review Error: insert or update on table "activity_log" violates foreign key constraint "activity_log_created_by_fkey"`. Network showed `rpc_log_event` HTTP 409. | RPC/data/activity logging | Yes | This is not the 10G direct-order-write RLS blocker; it is an activity-log identity/FK blocker in the smart-action note path. |
| 9 | Order Number Override | `/orders/:id/edit` as Owner/Admin | Opened the explicit `Change order number` dialog, entered an available replacement number, added a reason, and saved. | Override succeeds through `rpc_order_number_override`, or a safe permission error appears; normal edit remains separate. | Failed with safe UI error. Dialog opened and availability check passed, but save showed `Falcon could not change this order number. Refresh and try again.` Database readback kept order number `2026001`. | Network showed `rpc_is_order_number_available_v2` HTTP 200 and `rpc_order_number_override` responses including HTTP 409; console showed `Failed to override order number Object`. | RPC/activity logging/unknown | Yes | Normal edit remained separate and still usable, but explicit override did not persist. This likely overlaps with activity-log write/FK behavior and needs focused repair. |
| 10 | Final readback | `/orders`, `/orders/:id`, `/orders/:id/edit` | Reopened list, detail, and edit surfaces for the smoke order. | List/detail/edit consistently show the order; no `amcs` permission error and no assignable-users error. | Passed for readback. All three routes showed order `2026001` and the updated site visit. | `v_orders_frontend_v4`, `orders`, `rpc_company_assignable_users`, and client-option calls returned HTTP 200. No `permission denied for table amcs`, no `u.split_pct`, and no `Failed to load order` text appeared. | None | No | A nonblocking `profiles` 403 was observed for owner profile lookup, but it did not affect list/detail/edit readback. |

### 10I4 Remaining Blockers

1. Smart action workflow note logging blocks status transition.
   - Route/action: `/orders` as assigned appraiser, `Send to Review`.
   - Visible UI message: `Failed to send to review: insert or update on table "activity_log" violates foreign key constraint "activity_log_created_by_fkey"`.
   - Network/RPC signal: `rpc_log_event` returned HTTP 409 before the status transition completed.
   - Database readback: order remained `status = new`.
   - Likely category: RPC/data/activity logging.
   - Recommended focused fix phase: align activity-log actor fields/FKs for authenticated app users and workflow note logging, then rerun smart-action smoke.

2. Explicit order-number override does not persist.
   - Route/action: `/orders/:id/edit` as Owner/Admin, `Change order number`.
   - Visible UI message: `Falcon could not change this order number. Refresh and try again.`
   - Network/RPC signal: availability check returned HTTP 200; `rpc_order_number_override` returned HTTP 409 during save.
   - Database readback: order number remained `2026001`.
   - Likely category: RPC/activity logging/unknown.
   - Recommended focused fix phase: inspect `rpc_order_number_override` transaction logging and activity-log FK behavior, then rerun override smoke.

### 10I4 Recommendation

Start a narrow Phase 10I5 activity-log/workflow blocker repair before broader product work:

1. Fix authenticated activity logging for workflow notes so `Send to Review` can proceed to the canonical status transition.
2. Fix or isolate `rpc_order_number_override` activity logging so an authorized owner/admin override either persists or returns a precise safe permission/validation error without ambiguous double-response behavior.
3. Rerun only the failed 10I4 steps plus final readback: smart action, order-number override, list/detail/edit readback, and direct authenticated `orders` write-block confirmation if SQL is touched.

## 10I5 Activity Log Identity / FK Repair

Phase 10I5 repaired the activity identity/FK blocker in `supabase/migrations/20260518069000_activity_log_identity_fk_repair.sql`.

Root cause:

- `activity_log.created_by` is a legacy nullable FK to `profiles_legacy(id)`, whose ids are auth user ids.
- Current routed app users are canonicalized through `public.users.id` and `public.current_app_user_id()`.
- `rpc_log_event(...)` and `rpc_order_number_override(...)` wrote `auth.uid()` into `created_by` unconditionally.
- Smoke users, and normal app users without a legacy profile row, therefore failed activity inserts with `activity_log_created_by_fkey`.
- `actor_user_id` already exists as the canonical app-user FK to `public.users(id)`, so the durable actor attribution target was available.

Fix:

- Both active `rpc_log_event` overloads now keep `actor_user_id = current_app_user_id()` as canonical actor attribution.
- Both logger overloads still preserve `actor_id = auth.uid()` for compatibility and display diagnostics.
- `created_by` is now populated only when a matching `profiles_legacy` row exists; otherwise it remains null, which is allowed by the legacy FK.
- `created_by_name` and `created_by_email` continue to come from `_activity_actor()` for useful display attribution.
- `rpc_order_number_override(...)` uses the same FK-safe activity identity behavior.
- Order RLS, workflow authorization, order-number override authorization, route behavior, registries, and frontend behavior were not changed.

10I5 SQL smoke:

- `supabase db reset`: passed with migration `20260518069000_activity_log_identity_fk_repair.sql` applied.
- `rpc_log_event(uuid, text, jsonb)` as an assigned appraiser without a `profiles_legacy` row: passed and wrote a `note` activity row.
- `rpc_transition_order_status(...)` as the assigned appraiser: passed from `new` to `in_review` after note logging.
- `rpc_order_number_override(...)` as Owner/Admin without a `profiles_legacy` row: passed, returned `status = updated`, changed the order number, and wrote `order_number.manual_override` activity.
- Activity rows had valid `actor_user_id` references to `public.users(id)` and FK-safe nullable `created_by`.
- Direct authenticated `orders` insert remained blocked by RLS; direct authenticated update affected zero rows.

Required 10I6 rerun scope:

- Rerun only the previously failed browser smoke flows plus final readback:
  - Status / Smart Actions: `Send to Review` with a note from `/orders`.
  - Order Number Override: explicit dialog from `/orders/:id/edit`.
  - Final readback across `/orders`, `/orders/:id`, and `/orders/:id/edit`.
  - Confirm no `activity_log_created_by_fkey`, no direct-write RLS error, no `amcs` permission error, and no assignable-users `split_pct` error.

## 10I6 Focused Browser Smoke Rerun After 10I5

Phase 10I6 reran only the previously failed browser smoke flows after the 10I5 activity-log identity/FK repair.

Execution notes:

- App: local Vite dev server against local Supabase.
- Browser: headless Chrome driven through the Chrome DevTools Protocol because the `agent-browser` command was not installed in this workspace.
- Data scope: disposable local smoke fixture only.
- Smoke users:
  - Owner/Admin: `owner.10i6.826557@example.test`
  - Appraiser: `appraiser.10i6.826557@example.test`
  - Reviewer: `reviewer.10i6.826557@example.test`
- Smoke order:
  - Order id: `30000000-0000-4000-8000-000000010601`
  - Original order number: `10I6-001-826557`
  - Override order number: `10I6-OVERRIDE-163217`

Result: Phase 10I6 passed. The focused browser rerun confirmed the 10I5 activity identity repair unblocked both previously failed paths. The order moved from `new` to `in_review`, the explicit order-number override persisted, and final list/detail/edit readback stayed consistent.

### 10I6 Focused Result Summary

| Flow | Route | Result | Blocker? | Likely category |
|---|---|---:|---:|---|
| Smart Action / Status Workflow | `/orders` as assigned appraiser | Pass | No | None |
| Order Number Override | `/orders/:id/edit` as Owner/Admin | Pass | No | None |
| Final readback | `/orders`, `/orders/:id`, `/orders/:id/edit` | Pass | No | None |

### 10I6 Detailed Results

| Step | Flow | Route | Action taken | Expected result | Actual result | Console / network / Supabase signal | Likely category | Blocker? | Notes |
|---:|---|---|---|---|---|---|---|---:|---|
| 1 | Smart Action / Status Workflow | `/orders` as assigned appraiser | Opened the orders table, clicked `Send to Review`, entered a note, and confirmed. | Workflow note logs, canonical transition succeeds, no `activity_log_created_by_fkey`, and order status changes. | Passed. Row changed from `New` to `In Review`. | `rpc_log_event` returned HTTP 200; `rpc_transition_order_status` returned HTTP 200; no activity FK, permission, or RLS error appeared. | None | No | Confirms the workflow note path no longer blocks the status transition. |
| 2 | Order Number Override | `/orders/:id/edit` as Owner/Admin | Opened `Change order number`, entered `10I6-OVERRIDE-163217`, waited for availability, and saved. | Availability passes, override RPC succeeds, activity logging does not fail, and visible order number changes. | Passed. Dialog save succeeded and edit page displayed `10I6-OVERRIDE-163217`. | `rpc_is_order_number_available_v2` returned HTTP 200; `rpc_order_number_override` returned HTTP 200; no activity FK, permission, or RLS error appeared. | None | No | Confirms explicit override remains separate from normal edit and now persists. |
| 3 | Final readback | `/orders`, `/orders/:id`, `/orders/:id/edit` | Reopened list, detail, and edit routes as Owner/Admin. | All surfaces show updated status/order number with no earlier read/projection errors. | Passed. List/detail/edit all showed `10I6-OVERRIDE-163217`; detail and edit showed `In Review`. | `v_orders_frontend_v4`, `orders`, `rpc_company_assignable_users`, and order-form client option calls returned HTTP 200. No `permission denied for table amcs`, no `column u.split_pct does not exist`, no `Failed to load order`, and no direct-write RLS error appeared. | None | No | A nonblocking owner-profile lookup still returned HTTP 403, matching 10I4 behavior and not affecting smoke criteria. |

### 10I6 Database Readback

- `orders.id = 30000000-0000-4000-8000-000000010601`
- `orders.order_number = 10I6-OVERRIDE-163217`
- `orders.status = in_review`
- Activity rows for `note` and `order_number.manual_override` have non-null `actor_user_id`.
- Activity rows have FK-safe `created_by` values and display names `Appraiser 10I6` / `Owner 10I6`.

### 10I6 Result

The route-level smoke blockers from 10I2 and 10I4 are now cleared in the focused local browser rerun. Recommended next step is to move to the next product phase, with normal caution around the separate nonblocking owner-profile lookup 403 and existing lint/build warnings.

## 10I7 Browser Smoke Validation Closeout

Phase 10I7 closes the route-level browser smoke validation phase in
`docs/ROUTE_LEVEL_BROWSER_SMOKE_CLOSEOUT.md`.

Result: Phase 10I is complete through 10I7. The final validated route set is:

- Owner Setup.
- Order Create.
- Order Detail.
- Order Edit.
- Site Visit table path.
- Site Visit detail path.
- Smart Action / Status Workflow.
- Order Number Override.
- Final list/detail/edit readback.

The repaired blockers were the assignable-users split projection, authorized order read
projections for list/detail/edit, workflow activity logging identity, and order-number
override activity logging identity. The validated architecture remains RPC/canonical for
active order mutations, direct authenticated `orders` writes remain blocked, read projections
work for authorized users, Owner Setup profile save still works after polish, and activity
logging now works for workflow and override paths.

Remaining nonblocking observation:

- Owner profile lookup returns HTTP 403 in the browser session observed during smoke. It did
  not affect the route-level smoke criteria, order readback, order mutation RPCs, or Owner
  Setup Company Profile save path.

Recommended default next step: Team/Staff setup bridge from Owner Setup to the existing Team
Access route, with no new backend writes and existing permissions/route guards kept intact.

## 10I2 Validation

- Targeted tests: not run; this phase changed documentation only and did not touch related testable runtime code.
- `npm run lint`: passed with existing warnings; no lint errors.
- `npm run build`: passed with existing Tailwind/chunk-size warnings.
- `git diff --check`: passed.
