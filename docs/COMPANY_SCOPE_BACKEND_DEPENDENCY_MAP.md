# Company Scope Backend Dependency Map

## Purpose

This document maps Falcon's active backend dependencies that must be considered before introducing company scoping.

It answers the operational migration question:

If Falcon adds `company_id` to orders, clients, notifications, and activity, what must change together?

This is an inspection document. It does not introduce schema changes, RLS changes, RPC changes, frontend company filters, tenant routing, onboarding, billing, or company settings UI.

## Migration Rule

No `company_id` enforcement until dependent views, RPCs, triggers, RLS policies, and frontend callers are mapped and backfilled.

Company scoping must be additive first:

- Add company-aware fields and tables before enforcing isolation.
- Backfill existing single-company data to a default company before constraints.
- Update backend views, RPCs, triggers, and RLS together with their frontend callers.
- Do not rely on frontend-only company filtering for isolation.
- Do not enforce company-scoped uniqueness before numbering and lookup paths are company-aware.

## Baseline Replay Lock - 2026-05-17

Clean local Supabase replay now starts from the curated Falcon baseline rather than the old historical migration chain.

Locked state:

- Historical replay-unsafe migrations are archived under `supabase/migrations_archive/pre_baseline_replay_unsafe_20260517/active`.
- Active migrations are the curated baseline plus multi-company foundation through Slice 7H2A.
- Permission parity passed before the Slice 6C wrapper migration.
- Slice 7A added the active-company context contract without enforcing tenant isolation.
- Slice 7B made orders the first backend-enforced company read-isolated operational root.
- Slice 7C patched order-derived calendar, activity, and notification `SECURITY DEFINER` read bypasses so they require readable source orders.
- Slice 7D made clients company-owned operational records for read isolation.
- Slice 7E1 made client table writes require company-aware backend authorization.
- Slice 7E2 hardened `merge_clients` and legacy client mutation RPCs through current-company authorization.
- Slice 7E3A made order intake company/client/AMC attachment backend-enforced.
- Slice 7E3B quarantined legacy uuid-based order RPC/import paths.
- Slice 7F1 replaced legacy order table write policies with company-aware insert/update/delete policies.
- Slice 7F2 made `rpc_transition_order_status(uuid, text, text)` company-aware.
- Slice 7F3 quarantined legacy arbitrary workflow/status RPCs while preserving signatures.
- Slice 7F4A added assignment/date mutation guardrails and quarantined stale assignment/date RPCs.
- Slice 7G1 hardened activity log table policies and active activity RPCs.
- Slice 7G2A hardened notification table policies and active notification create/read-state RPCs.
- Slice 7H1 quarantined unsafe legacy exposed views while preserving canonical hardened view access.
- Slice 7H2A replaced broad app-role grants with explicit authenticated allowlist grants.
- Local `supabase db reset` passed against the active chain after the Slice 6C wrapper migration, Slice 7A active-company contract migration, Slice 7B order read isolation migration, Slice 7C order-derived read safety migration, Slice 7D client read isolation migration, Slice 7E1 client table write authorization migration, Slice 7E2 client mutation RPC hardening migration, Slice 7E3A order intake attachment authorization migration, Slice 7E3B legacy order RPC/import quarantine migration, Slice 7F1 order write policy cleanup migration, Slice 7F2 canonical workflow transition RPC hardening migration, Slice 7F3 legacy workflow/status RPC quarantine migration, Slice 7F4A assignment/date mutation guardrail migration, Slice 7G1 activity log policy/RPC hardening migration, Slice 7G2A notification policy/RPC hardening migration, Slice 7H1 legacy view/grant quarantine migration, and Slice 7H2A explicit authenticated grants migration.
- Generated Supabase TypeScript types were refreshed from the replayed local database.
- The Supabase Storage startup issue encountered during validation was local temp-state/tooling, not Falcon SQL.

## 1. Orders Domain

Risk level: Critical.

### Canonical Resources

- `public.orders`
- `orders.order_number`
- `orders.appraiser_id`
- `orders.reviewer_id`
- `orders.assigned_to`
- `orders.client_id`
- `orders.site_visit_at`
- `orders.review_due_at`
- `orders.final_due_at`

### Dependent Backend Objects

Views:

- `public.v_orders_frontend_v4`
- `public.v_orders_active_frontend_v4`
- `public.v_orders_list_with_last_activity`

RPCs:

- `public.rpc_transition_order_status`
- `public.rpc_update_order_status`
- `public.rpc_assign_order`
- `public.rpc_update_due_dates`
- `public.rpc_create_calendar_event`

Triggers / activity / notification coupling:

- Order update activity triggers.
- Assignment notification triggers.
- Workflow notification creation through frontend workflow services.
- Calendar event creation for site visits.

RLS / helper coupling:

- Order lifecycle visibility policies.
- `public.current_app_user_id()`
- `public.current_is_admin()`
- `public.current_is_appraiser()`
- `public.current_company_id()`
- `public.current_app_user_has_current_company()`
- `public.current_app_user_can_read_order_row(...)`
- `public.current_app_user_can_read_order(uuid)`
- `public.can_read_order(uuid)`
- Permission resolver helpers such as `public.current_app_user_has_permission()`.

### Active Frontend Callers

- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/features/orders/api.js`
- `src/features/orders/actions.js`
- `src/pages/orders/OrderDetail.jsx`
- `src/pages/orders/EditOrder.jsx`
- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/drawer/OrderDrawerContent.jsx`
- `src/components/activity/ActivityNoteForm.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Calendar.jsx`
- `src/lib/hooks/useMyorders.js`
- `src/lib/api/reviews.js`
- `src/components/inputs/OrderNumberField.jsx`
- `src/main.jsx` debug helper

### Current Scoping Assumption

Orders are scoped by RLS, lifecycle state, app user identity, assignment fields, legacy admin/appraiser helpers, Slice 7B company read isolation, and Slice 7C order-derived read safety. Order reads now require current-company membership, order company match, and existing lifecycle/responsibility visibility; order-derived calendar, activity, and notification reads call back into that boundary.

`v_orders_frontend_v4` and `v_orders_active_frontend_v4` are central read projections. Calendar, dashboard, clients, drawers, and order forms depend on them or on direct `orders` access. The four active order read projections use `security_invoker = true` and explicit order read predicates.

### Company ID Migration Impact

`orders.company_id` is now the first enforced tenant boundary for order reads. It must continue flowing into:

- Order read views.
- Order lifecycle RLS.
- Workflow transition RPCs.
- Assignment RPCs.
- Activity writes.
- Notification recipient creation.
- Calendar event joins.
- Client order lists and client metrics.
- Order numbering uniqueness.

Adding `orders.company_id` without updating views/RPCs/RLS would create false confidence: frontend lists may still work, but backend enforcement and cross-domain joins could leak or misroute data. Slice 7B closed the base order read gap, and Slice 7C closed the first order-derived read bypasses. Write paths, workflow RPCs, table-level calendar event policies, and non-order-root domains remain separate enforcement work.

### Must Change Together

- Add and backfill `orders.company_id` to a default company.
- Expose `company_id` from `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, and `v_orders_list_with_last_activity`.
- Update order RLS policies to require company membership plus lifecycle/responsibility rules. Completed for order SELECT in Slice 7B.
- Keep `current_app_user_can_read_order_row(...)` as the shared predicate for order SELECT policy, order views, and order-derived read RPCs.
- Keep `can_read_order(uuid)` as a compatibility wrapper over `current_app_user_can_read_order(uuid)`.
- Update `rpc_transition_order_status` to validate company membership before transition.
- Update legacy status/assignment RPCs or keep them quarantined and blocked from active callers.
- Update order activity triggers/RPCs so emitted activity has the same company as the order.
- Update notification creation paths so workflow and assignment notifications inherit order company context.
- Update calendar event creation and order-derived calendar views to preserve company scope.
- Ensure order-derived read RPCs and compatibility views filter through `current_app_user_can_read_order(...)`. Completed for Slice 7C calendar, activity, and notification read bypasses.
- Update client order lists and metrics to respect company scope server-side.
- Rework `orders.order_number` uniqueness only after numbering is company-aware.

### Recommended Migration Order

1. Add a default company and backfill `orders.company_id` without enforcement.
2. Add `company_id` to order read projections.
3. Update workflow/assignment RPCs and order triggers to preserve order company context.
4. Update order RLS to include company membership while preserving lifecycle visibility. Completed for order SELECT in Slice 7B.
5. Update order-derived read RPCs and read projections to use explicit order predicates. Completed for `rpc_get_activity_feed`, `rpc_list_orders`, and active order read views in Slice 7B.
6. Patch order-derived calendar, activity, and notification read bypasses. Completed for `v_admin_calendar`, `v_admin_calendar_enriched`, `get_calendar_events`, `get_admin_calendar_events`, `get_order_activity_flexible`, `get_order_activity_flexible_v3`, `v_order_activity_feed`, `v_order_activity_compat`, `rpc_get_notifications`, `rpc_get_unread_count`, `rpc_notifications_list`, and `rpc_notifications_unread_count` in Slice 7C.
7. Update dependent client, user/team, write/workflow, realtime, and table-policy paths.
8. Only then enforce non-null company scope and company-scoped order number uniqueness.

## 2. Clients Domain

Risk level: High.

### Canonical Resources

- `public.clients`
- Client primary contact fields.
- Future client/contact normalization surfaces.

### Dependent Backend Objects

Views:

- `public.v_client_kpis`
- `public.v_client_metrics`
- `public.v_orders_frontend_v4` through `orders.client_id`.

RPCs:

- `public.merge_clients`
- `public.client_name_taken`
- `public.get_clients_for_user`

RLS / policies:

- `clients_select_company_visibility`
- `clients_insert_company_authorized`
- `clients_update_company_authorized`
- `clients_delete_company_authorized`
- Client write authorization helpers.
- Appraiser-scoped client visibility through readable assigned orders.

### Active Frontend Callers

- `src/lib/services/clientsService.js`
- `src/pages/clients/ClientsIndex.jsx`
- `src/pages/clients/ClientDetail.jsx`
- `src/components/clients/ClientForm.jsx`
- `src/components/clients/ClientDetailPanel.jsx`
- `src/components/clients/ClientDrawerContent.jsx`
- `src/components/orders/form/ClientFields.jsx`
- `src/features/orders/OrdersFilters.jsx`

### Current Scoping Assumption

Clients are company-owned operational records for read isolation, table-write authorization, mutation RPC authorization, and order intake attachment. Root client reads require current-company membership, client company match, and either `clients.read.all` or `clients.read.assigned` through a readable source order. Direct table writes and legacy client mutation RPC wrappers require current-company membership, client company match where applicable, and create/update/delete permissions. Merge now requires current-company membership, readable source/target clients, `clients.update.all`, and `clients.archive`. Linked order `client_id` rows must be readable, same-company, and non-merged; linked `managing_amc_id` rows must also be `category = 'amc'`. Uniqueness, frontend behavior, workflow, and Smart Actions remain unchanged.

### Company ID Migration Impact

`clients.company_id` is now the read, table-write, legacy mutation RPC, merge, and order intake attachment boundary for client lists, duplicate checks, KPIs, order/client read joins, direct client table mutations, client mutation RPCs, and linked order client/AMC attachments. Client inserts resolve company scope server-side through `current_company_id()`, updates preserve existing company ownership, and frontend-sent `company_id` is ignored. Order inserts also resolve company scope server-side through `current_company_id()`, order updates preserve existing company ownership, and frontend-sent order `company_id` is ignored. Uniqueness/canonicalization remains deferred.

Client scoping cannot be frontend-only because New Order intake, client duplicate checks, and client metrics must agree with backend visibility.

### Must Change Together

- Add and backfill `clients.company_id`.
- Update client RLS to require company membership. Completed for client SELECT/read isolation in Slice 7D.
- Update client table write RLS to require company-aware backend authorization. Completed for direct table INSERT/UPDATE/DELETE in Slice 7E1.
- Update `v_client_kpis` and `v_client_metrics` to group by company and filter through readable-client/readable-order predicates. Completed in Slice 7D.
- Update `merge_clients` to reject cross-company merges and require current-company authorization. Completed in Slice 7E2.
- Update `client_name_taken` to check duplicates within company scope. Completed with `current_company_id()` and readable-client logic in Slice 7D.
- Update order intake client selectors to read company-scoped clients through backend policy. Covered by direct client SELECT policy in Slice 7D; inline table-based client creation remains compatible for authorized users after Slice 7E1.
- Ensure `orders.client_id` and `orders.managing_amc_id` reference readable, non-merged clients in the same company before enforcement. Completed for direct table writes and bigint-compatible order RPCs in Slice 7E3A.

### Recommended Migration Order

1. Backfill clients to the default company.
2. Backfill or verify `orders.client_id` company consistency.
3. Update duplicate-name and merge RPCs.
4. Update client KPI/metric views.
5. Enforce company-scoped client read RLS. Completed in Slice 7D.
6. Enforce company-scoped direct client table write RLS. Completed in Slice 7E1.
7. Harden client write RPCs and merge authorization. Completed in Slice 7E2.
8. Harden order intake direct table writes and bigint-compatible RPCs. Completed in Slice 7E3A.
9. Quarantine legacy uuid order RPCs. Completed in Slice 7E3B.
10. Replace legacy order table write policies with company-aware policies. Completed in Slice 7F1.
11. Harden canonical workflow transition RPC. Completed in Slice 7F2.
12. Quarantine legacy arbitrary workflow/status RPCs. Completed in Slice 7F3.
13. Harden date/assignment RPCs. Completed in Slice 7F4A.
14. Harden activity log table policies and active activity RPCs. Completed in Slice 7G1.
15. Harden notification table policies and active notification create/read-state RPCs. Completed in Slice 7G2A.
16. Rewrite imports and handle uniqueness/canonicalization.

## 3. Identity / Permissions Domain

Risk level: Critical.

### Canonical Resources

- `public.users`
- `public.profiles` compatibility view.
- `public.user_profiles`
- `public.user_roles`
- `public.roles`
- `public.permissions`
- `public.role_permissions`

### Dependent Backend Objects

Identity helpers:

- `public.current_app_user_id()`
- `public.current_is_admin()`
- `public.current_is_appraiser()`

Permission helpers:

- `public.current_app_user_permission_keys()`
- `public.current_app_user_has_permission()`
- `public.current_app_user_has_any_permission()`
- `public.current_app_user_has_all_permissions()`

Legacy admin/user RPCs still present for dependency review:

- `rpc_get_my_role`
- `rpc_list_users_with_roles`
- `rpc_set_user_role`
- `rpc_admin_set_user_role`
- `rpc_admin_users_update`
- `rpc_admin_users_set_active`
- `rpc_me_upsert`
- `team_list_users`
- `team_get_user`

### Active Frontend Callers

- `src/lib/hooks/useCurrentUser.js`
- `src/lib/hooks/usePermissions.js`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/components/calendar/useCurrentUserIds.js`
- `src/lib/services/notificationsService.js`
- `src/lib/services/activityService.js`
- `src/features/auth/useCurrentUserAppContext.js`

### Current Scoping Assumption

`public.users` maps app users to Supabase Auth through `auth_id`. Frontend route authority and display/lens context no longer use legacy role strings, `public.users.role`, or `public.user_roles`; they use permission helpers and `rpc_current_user_app_context()`. Permission tables exist, Slice 6C routes the four active permission helpers through `current_company_id()` and company-aware successor helpers, and Slice 7A makes `current_company_id()` membership-validated when an active-company JWT/app metadata claim is present.

Phase 8C5K pause state:

- Legacy role RPCs are revoked from `anon` and `authenticated`; `service_role` compatibility remains.
- Direct app-role reads from `public.user_roles` are revoked.
- `order_activity` and `review_flow` no longer use legacy role-string admin checks.
- Remaining legacy SQL cleanup is intentionally deferred until product direction and final implementation path are locked.

### Company ID Migration Impact

Company scoping requires membership-aware identity resolution. A user may eventually belong to more than one company, and effective permissions must be resolved in a company context. Current compatibility mode resolves that context through `current_company_id()`: valid active-company claims are accepted only for active members, and missing/invalid/non-member claims fall back to `falcon_default`.

Without company-aware membership, order RLS, notification routing, role assignment, team directory visibility, and workflow permission checks cannot be safely tenant-scoped.

### Must Change Together

- Introduce company membership before enforcing company-scoped permissions.
- Preserve `current_app_user_id()` as auth-to-app-user mapping.
- Keep the Slice 6C permission wrappers on `current_company_id()` and the Slice 7A membership-validated active-company contract until enforcement slices migrate policies/RPCs.
- Migrate legacy `user_roles` text roles into company-scoped role assignments.
- Keep template roles as platform defaults.
- Update admin/user RPCs to operate within company membership.
- Update Team Directory and assignment selectors to list users by company membership and permission/responsibility.
- Leave remaining legacy helpers, `public.profiles.role`, default-company fallback paths, `public.user_roles`, and `public.users.role` in place during the pause.
- Use `rpc_current_company_context()` for diagnostics while tenant isolation is not yet enforced.

### Recommended Migration Order

1. Add company membership model and default-company membership backfill.
2. Add company-aware permission resolver functions alongside current compatibility helpers.
3. Wrap the four active permission helpers through `current_company_id()` after parity verification.
4. Add membership-validated active-company context and diagnostics.
5. Update assignment/user directory RPCs to use company membership.
6. Clean up permissive RLS policies and add active-company filters to security-definer RPCs.
7. Update RLS and workflow RPCs to call company-aware permission checks.
8. Retire text-role behavior only after app and policy usage are migrated.

Slice 7A completed step 4 only. It did not enforce tenant isolation, tighten RLS, filter security-definer RPCs, modify frontend hooks, change `ProtectedRoute`, add organization switching, alter workflow semantics, or change legacy role/admin helper behavior.

Slice 7B completed the first read-isolation enforcement step for orders only. It did not change writes, workflow transitions, frontend code, organization switching, Smart Actions, client policies, calendar policies, notification policies, user policies, or tenant UI.

Slice 7C completed order-derived read safety for calendar, activity, and notification read paths. It patched `SECURITY DEFINER` bypasses and compatibility views without changing writes, workflow transitions, frontend code, organization switching, client policies, user/team policies, Smart Actions, or `calendar_events` table policies.

Slice 7D completed client read isolation. It added `current_app_user_can_read_client_row(uuid, bigint)`, removed broad client SELECT bypasses, converted legacy client `ALL` policies into command-specific write policies, recreated client KPI/metrics views with `security_invoker = true` and explicit readable-client/readable-order predicates, and patched `get_clients_for_user()` plus `client_name_taken(...)`. It did not change client write behavior, `merge_clients`, order intake writes, frontend code, contacts/AMC/lender hierarchy behavior, workflow semantics, or Smart Actions. Caveat: `clients.name` remains globally unique; company-scoped duplicate/canonicalization strategy is deferred.

Slice 7E1 completed client table write authorization. It added `current_app_user_can_create_client()`, `current_app_user_can_update_client_row(uuid, bigint)`, and `current_app_user_can_delete_client_row(uuid, bigint)`, tightened `tg_clients_preserve_company_id()` so inserts resolve to `current_company_id()` and updates preserve existing `company_id`, removed broad/global client write policies, and added `clients_insert_company_authorized`, `clients_update_company_authorized`, and `clients_delete_company_authorized`. Direct frontend writes and inline New Order client creation remain compatible for authorized users. Hard delete remains current behavior but now requires `clients.delete`. Slice 7E1 did not change uniqueness, `merge_clients`, order intake RPCs, frontend code, workflow semantics, or Smart Actions.

Slice 7E2 completed client mutation RPC and merge hardening. It hardened `merge_clients(bigint, bigint, jsonb)` with current-company membership, readable source/target client checks, `clients.update.all`, `clients.archive`, cross-company drift guards, already-merged source/target guards, and current-company-only linked order/child-client reassignment. It preserved legacy create/update/delete RPC signatures as compatibility wrappers while enforcing the Slice 7E1 helpers, revoked `PUBLIC` and `anon` execute privileges for the seven client mutation RPCs, and preserved `authenticated`/`service_role` grants. Slice 7E2 did not change frontend code, uniqueness or indexes, order-write RPCs, workflow semantics, or Smart Actions.

Slice 7E3A completed backend order intake attachment authorization. It added `current_app_user_can_create_order()`, `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`, `current_app_user_can_attach_order_client(bigint)`, and `current_app_user_can_attach_order_amc(bigint)`. Order inserts now resolve `company_id` from `current_company_id()`, order updates preserve `OLD.company_id`, and frontend-sent order `company_id` is ignored. Linked `client_id` must be readable, same-company, and non-merged. Linked `managing_amc_id` must be readable, same-company, non-merged, and `category = 'amc'`. Manual-only orders remain allowed. `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)` were patched. Legacy uuid order RPCs and `import_orders_from_json` remain deferred. Slice 7E3A did not change frontend code, workflow semantics, Smart Actions, uniqueness behavior, or `orders.amc_id`.

Slice 7E3B completed legacy order RPC/import quarantine. `rpc_order_create(jsonb)` and `rpc_order_update(text, jsonb)` preserve their signatures but now raise explicit deprecated/quarantined exceptions. `import_orders_from_json(jsonb)` is service-role-only and marked deprecated/unsafe for multi-company imports. `PUBLIC`, `anon`, and `authenticated` execute privileges were revoked from all three legacy paths. Active bigint-compatible order RPCs and direct order create/update remain working. Slice 7E3B did not change frontend code, workflow semantics, uniqueness behavior, order intake UI, `managing_amc_id`, `orders.amc_id`, or active bigint-compatible intake behavior.

Slice 7F1 completed order table write policy cleanup. It removed legacy order insert/update/delete policies, added `orders_insert_company_authorized`, `orders_update_company_authorized`, and `orders_delete_company_authorized`, and routes table writes through `current_app_user_can_create_order()` and `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)` where applicable. Trigger-owned `company_id` behavior remains authoritative, so inserts resolve through `current_company_id()`, updates preserve existing company ownership, and frontend-sent `company_id` remains ignored. Direct frontend order writes remain compatible for authorized users. Slice 7F1 did not patch workflow/status/date/assignment RPCs, change Smart Actions, change lifecycle semantics, alter notification/activity behavior, or modify frontend code.

Slice 7F2 completed canonical workflow transition RPC hardening. `rpc_transition_order_status(uuid, text, text)` now requires current-company membership, target order company matching `current_company_id()`, readable order authorization through `current_app_user_can_read_order(uuid)`, and update authorization through `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)` before any transition. Existing transition validation, required workflow permission checks, Smart Actions semantics, lifecycle governance, and trigger-driven status activity behavior are preserved. Legacy workflow/status/date/assignment RPCs remain unchanged and deferred.

Slice 7F3 completed legacy arbitrary workflow/status RPC quarantine. Deprecated arbitrary status/workflow RPC signatures are preserved, but their bodies now raise clear deprecated/quarantined exceptions: `rpc_update_order_status(uuid, text)`, `rpc_update_order_status_with_note(uuid, text, text)`, `rpc_order_set_status(text, text)`, `rpc_order_set_status(uuid, text, text)`, `rpc_order_mark_complete(text, text)`, `rpc_order_ready_to_send(text)`, `rpc_order_send_to_client(text, jsonb)`, `rpc_review_approve(text, text)`, `rpc_review_request_revisions(text, text)`, `rpc_review_start(text)`, `rpc_update_order_v1(uuid, text, uuid, timestamptz, timestamptz, timestamptz, jsonb)`, and `set_order_status(uuid, text)`. `PUBLIC`, `anon`, and `authenticated` execute privileges were revoked; `service_role` remains granted but still receives the deprecated exceptions. `rpc_transition_order_status(uuid, text, text)` remains the only lifecycle authority. Assignment/date RPCs, frontend code, Smart Actions, canonical transition semantics, notification generation, and activity generation were unchanged.

Slice 7F4A completed assignment/date mutation guardrails. It added assignment target helpers, trigger-level validation for `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, and `orders.current_reviewer_id`, and patched `rpc_assign_order(uuid, uuid, text)`, `rpc_update_due_dates(uuid, date, date)`, and `rpc_update_order_dates(uuid, timestamptz, timestamptz, timestamptz)` so assignment/date mutations require current-company membership, readable/updateable current-company orders, and valid same-company assignment targets with appropriate role/capability where practical. Stale assignment/date RPCs were quarantined: `rpc_assign_order(uuid, uuid)`, `rpc_assign_reviewer(uuid, uuid)`, `rpc_assign_next_reviewer(uuid)`, both `rpc_order_set_dates(...)` overloads, `rpc_order_update_dates(text, ...)`, and `set_order_appointment(uuid, timestamptz, text)`. Direct table update compatibility, Smart Actions, queue/calendar projections, frontend behavior, and existing assignment/date activity side effects were preserved. `current_reviewer_id` model cleanup, review-route redesign, and `calendar_events` table policy cleanup remain deferred.

Slice 7G1 completed activity log table/RPC hardening. It removed broad `USING true` / `WITH CHECK true` activity policies, made authenticated `activity_log` reads and inserts company/order-aware, blocked authenticated access to `order_id is null` activity by default, kept update/delete blocked for authenticated users, and patched both active `rpc_log_event` overloads so activity writes require current-company membership plus readable/updateable source orders. Activity side effects and frontend activity feed shapes were preserved. Notifications, users/team directory, `calendar_events`, workflow semantics, frontend code, and org switching remain unchanged.

Slice 7G2A completed notification table policy and active notification RPC hardening. Notification table policies now use `current_app_user_id()` as the canonical identity, direct authenticated notification INSERT/UPDATE/DELETE is blocked, and SELECT requires the current user plus a readable source order when `order_id` is present. `rpc_notification_create(jsonb)` now requires current-company membership and readable/updateable current-company source orders for authenticated order-tied notifications, derives company from the source order, requires the recipient to be an active member of that source company, preserves actor suppression, blocks authenticated non-order notification creation, and preserves service-role non-order creation for operator/system paths. Mark-read, mark-all-read, dismiss, dismiss-seen, and legacy mark-read wrappers only mutate current-user readable notifications. Legacy manual/debug notification RPCs are quarantined with app-role execute revoked. Notification bell/read-count compatibility was preserved. Notification preferences, company-specific notification settings, productized manual/system notifications, users/team directory, `calendar_events`, workflow semantics, frontend code, and org switching remain deferred.

Slice 7H1 completed legacy exposed view/grant quarantine. `anon` and `authenticated` SELECT was revoked from 17 unsafe legacy views: `v_orders_unified`, `v_orders_frontend`, `v_orders_list_v2`, `v_orders_list_with_last_activity_v2`, `v_orders_unified_list`, `v_orders_dashboard_active`, `v_admin_dashboard_counts`, `v_calendar_events`, `v_calendar_unified`, `v_admin_calendar_v2`, `v_calendar_events_admin`, `v_calendar_events_appraiser`, `v_amcs`, `profiles`, `v_email_queue`, `v_staging_raw_orders_2025_ord`, and `v_user_notification_prefs`. Canonical hardened views remain accessible: `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, `v_orders_list_with_last_activity`, `v_admin_calendar`, `v_admin_calendar_enriched`, `v_client_kpis`, `v_client_metrics`, and `v_client_kpis_appraiser`. `v_order_activity_feed` and `v_order_activity_compat` now hide `order_id is null` rows and require readable source orders. Quarantine/future explicit-grants cleanup comments were added, and no objects were moved, renamed, or removed.

Slice 7H2A completed explicit authenticated grant hardening. Broad `PUBLIC`, `anon`, and `authenticated` table/view, sequence, and function privileges were revoked. `anon` now has no table, view, sequence, or function access in `public`, and `authenticated` access is explicit allowlist only. Canonical hardened views, current direct table compatibility surfaces, and active hardened RPC/helper functions remain granted. Quarantined workflow/status RPCs, legacy uuid order RPCs, importers, debug/manual notification helpers, and email queue worker paths remain inaccessible to app roles. `service_role` broad access is intentionally preserved for operator/backfill compatibility, while `supabase_admin` future-object default ACL cleanup remains a manual/platform-role follow-up.

## 4. Notifications Domain

Risk level: High.

### Canonical Resources

- `public.notifications`
- `public.notification_policies`
- `public.notification_preferences`
- `public.email_outbox`
- Notification event registry in frontend code.

### Dependent Backend Objects

RPCs:

- `public.rpc_notification_create`
- `public.rpc_get_notifications`
- `public.rpc_get_unread_count`
- `public.rpc_mark_notification_read`
- `public.rpc_mark_all_notifications_read`
- `public.rpc_dismiss_notification`
- `public.rpc_dismiss_seen_notifications`
- Notification preference RPCs.

Triggers / policies:

- Notification RLS policies.
- Notification email queue trigger.
- Assignment notification triggers.
- Global `notification_policies` lookup.

### Active Frontend Callers

- `src/components/notifications/NotificationBell.jsx`
- `src/pages/Activity.jsx`
- `src/features/notifications/api.js`
- `src/features/notifications/index.js`
- `src/features/notifications.js`
- `src/lib/services/api.js`
- `src/lib/services/notificationsService.js`
- `src/lib/api/notifications.js`

### Current Scoping Assumption

Notifications are user-scoped through `notifications.user_id = current_app_user_id()`. Order-tied notification reads, unread counts, and direct table SELECT now also require readable source orders. Direct authenticated notification INSERT/UPDATE/DELETE is blocked; read-state mutations flow through RPCs that only affect current-user readable notifications. Event policies and notification preferences are still global/default surfaces. Workflow and assignment notifications derive recipients from order assignment, admin recipient lookup, roles, and notification policy.

Slice 7G2A adds a company boundary for authenticated order-tied notification creation: the source order must be readable/updateable in the current company, company context is derived from the source order, and recipients must be active members of that source company. Authenticated non-order notification creation remains blocked. Service-role non-order notification creation is preserved for operator/system paths until a productized manual/system notification path exists.

### Company ID Migration Impact

Notifications should inherit company context from the source event, usually the order. Notification reads should remain personal, but they must not mix records across company workspaces when organization switching exists.

Notification policy needs a company override layer seeded from platform defaults.

### Must Change Together

- Add and backfill `notifications.company_id`. Completed in the foundation baseline/foundation migrations.
- Add company context to `rpc_notification_create` payload validation or server-side resolution. Foundation work derives company from source orders, and Slice 7G2A enforces source-order company membership for authenticated order-tied creates.
- Update notification read RPCs to filter by current user and active company when org switching exists. Current compatibility behavior filters by current user and readable source order; explicit active-company-only notification history remains deferred until org switching exists.
- Preserve Slice 7C and Slice 7G2A behavior: order-tied notifications must be hidden and excluded from unread counts when the source order is unreadable, and read-state mutation RPCs must only affect current-user readable notifications.
- Update assignment/workflow notification creation to inherit `orders.company_id`.
- Update notification email trigger to preserve company context for email policy decisions.
- Split global `notification_policies` into platform defaults plus company overrides later.
- Keep `notification_preferences` user-scoped unless preferences become company-specific.
- Keep authenticated non-order notification creation blocked until manual/system notifications have explicit product semantics and company context.

### Recommended Migration Order

1. Add nullable `notifications.company_id` and backfill from `order_id` when available.
2. Update notification creation paths to set company from source order.
3. Add company-aware read RPC variants before org switching UI. Slice 7C patched current notification read RPCs for order-derived read safety.
4. Harden notification table policies and active notification create/read-state RPCs. Completed in Slice 7G2A.
5. Introduce company notification policy overrides after source company context is reliable.

## 5. Activity Domain

Risk level: High.

### Canonical Resources

- `public.activity_log`
- `activity_log.actor_user_id`
- Legacy activity actor fields retained for compatibility.

### Dependent Backend Objects

RPCs:

- `public.rpc_log_event`
- `public.rpc_log_note`
- `public.rpc_get_activity_feed`

RLS / realtime:

- Activity RLS policies.
- Realtime subscriptions on `activity_log`.
- Order update activity triggers.

### Active Frontend Callers

- `src/lib/services/activityService.js`
- `src/lib/logactivity.js`
- `src/lib/utils/logOrderEvent.js`
- `src/components/activity/ActivityNoteForm.jsx`
- `src/pages/orders/OrderDetail.jsx`

### Current Scoping Assumption

Activity is order-scoped and identity-scoped through current app user, order assignment, and admin/reviewer/appraiser logic. Activity display still uses compatibility actor fields and profile hydration.

Slice 7G1 makes authenticated direct activity table access company/order-aware. Reads require readable source orders, inserts require readable/updateable current-company source orders, authenticated `order_id is null` rows are blocked by default, and update/delete remain blocked for authenticated users.

### Company ID Migration Impact

Activity should inherit company context from the order or source entity. Activity read policies must use both company membership and order visibility/responsibility.

Activity is a durable audit surface; company scoping must not orphan existing history.

### Must Change Together

- Add and backfill `activity_log.company_id` from `activity_log.order_id -> orders.company_id`.
- Update `rpc_log_event` and `rpc_log_note` to set company from the order.
- Update order activity triggers to write company context.
- `rpc_get_activity_feed`, `get_order_activity_flexible`, and `get_order_activity_flexible_v3` now enforce order readability through `current_app_user_can_read_order(uuid)`.
- `v_order_activity_feed` and `v_order_activity_compat` now hide order-tied rows unless the source order is readable.
- Update remaining activity RLS policies and realtime assumptions to enforce company membership plus order visibility.
- Broad `USING true` / `WITH CHECK true` activity policies are removed, and both active `rpc_log_event` overloads enforce current-company membership plus readable/updateable source orders.
- Update realtime assumptions so subscriptions cannot expose cross-company activity.
- Preserve legacy actor fields until display-name hydration no longer depends on them.

### Recommended Migration Order

1. Backfill activity company from orders after orders are backfilled.
2. Update activity write RPCs and triggers.
3. Update activity read RPCs/RLS. Slice 7B and 7C patched the active/legacy order activity read RPCs and compatibility views for order readability. Slice 7G1 hardened direct table reads/inserts and both active `rpc_log_event` overloads.
4. Update realtime subscription strategy before org switching UI.

## 6. Calendar / Scheduling Domain

Risk level: Medium-high.

### Canonical Resources

- Order-derived scheduling fields on `public.orders`.
- `public.calendar_events`
- Calendar views and RPCs.

### Dependent Backend Objects

Views:

- `public.v_admin_calendar`
- `public.v_admin_calendar_enriched`
- `public.v_orders_active_frontend_v4`

RPCs:

- `public.get_calendar_events`
- `public.rpc_create_calendar_event`

### Active Frontend Callers

- `src/pages/Calendar.jsx`
- `src/components/admin/AdminCalendar.jsx`
- `src/lib/hooks/useCalendarEvents.js`
- `src/lib/services/calendarService.js`
- `src/lib/api/calendar.js`
- `src/lib/api/orders.js`
- `src/lib/services/api.js`

### Current Scoping Assumption

Calendar surfaces are order-derived and assignment/RLS dependent. Legacy calendar views join `calendar_events`, `orders`, `clients`, and profile data. Company timezone and working-day policy are currently platform defaults.

### Company ID Migration Impact

Calendar events must align with order company and company scheduling policy. Calendar reads should be company-scoped in backend views/RPCs, not filtered only by the frontend.

If `calendar_events` remains a separate table, it needs either its own `company_id` or a strict order join that enforces same-company access.

### Must Change Together

- Decide whether `calendar_events.company_id` is stored or derived from `orders.company_id`.
- Backfill calendar event company from linked orders if stored.
- Update `v_admin_calendar` and `v_admin_calendar_enriched` to include and filter company scope. Slice 7C added readable-order predicates.
- Update `get_calendar_events` and `rpc_create_calendar_event`. Slice 7C patched `get_calendar_events` reads; write behavior in `rpc_create_calendar_event` remains deferred.
- Keep `calendar_events` table policy tightening deferred until table-level calendar enforcement is scoped separately.
- Update order inline site-visit saves that create calendar events.
- Add company scheduling policy later for timezone, weekends, and compression thresholds.

### Recommended Migration Order

1. Complete order company backfill first.
2. Add company context to calendar events or enforce through order joins.
3. Update calendar views/RPCs.
4. Introduce company calendar policy only after data isolation is reliable.

## 7. Order Numbering Domain

Risk level: High.

### Canonical Resources

- `public.order_numbering_rules`
- `public.order_number_counters`
- `public.rpc_get_next_order_number`
- `orders.order_number`

### Dependent Backend Objects

- Global unique partial index on `orders(order_number)`.
- `rpc_get_next_order_number(p_company_key text, p_effective_at timestamptz)`.
- `order_numbering_rules.company_key`.
- `order_number_counters(rule_id, counter_year)`.

### Active Frontend Callers

- `src/components/orders/form/OrderForm.jsx`
- `src/components/inputs/OrderNumberField.jsx`
- `src/lib/services/ordersService.js`

### Current Scoping Assumption

Order numbering uses `company_key = 'falcon_default'`, not `company_id`. `orders.order_number` uniqueness is global.

### Company ID Migration Impact

Order numbering must become company-scoped before new-company onboarding is live. Otherwise two companies cannot safely use overlapping order number formats, and New Order intake may generate numbers from the wrong counter.

### Must Change Together

- Add company-scoped numbering rules or add `company_id` to existing numbering rules.
- Backfill the default rule to the default company.
- Update counters to partition by company/rule/year.
- Update `rpc_get_next_order_number` to accept or resolve company context server-side.
- Replace global order number uniqueness with company-scoped uniqueness only after backfill checks.
- Update order creation to use company-aware numbering.

### Recommended Migration Order

1. Add company-scoped numbering rule compatibility while preserving `falcon_default`.
2. Backfill existing rule/counter rows to the default company.
3. Add company-aware RPC behavior.
4. Switch order creation to company-aware numbering.
5. Replace global uniqueness with `(company_id, order_number)` after collision checks.

## Cross-Domain Couplings

- Order transition -> `orders.status` -> order activity trigger/RPC -> workflow notification -> email queue.
- Order assignment -> `orders.appraiser_id` / `orders.reviewer_id` -> user/profile/role lookup -> assignment notification -> order visibility.
- Order due dates and site visits -> calendar views/RPCs -> dashboard calendar -> queue assessment.
- Order lifecycle state -> queue membership -> dashboard active worklist -> Orders queue filters.
- Client merge -> `clients` -> `orders.client_id` -> client KPIs/metrics -> order read projections.
- Order numbering -> New Order intake -> `orders.order_number` uniqueness -> notification payload labels.
- Identity mapping -> permission resolver -> workflow RPC authorization -> RLS visibility.
- Activity actor identity -> profile hydration -> audit display -> notification/activity history coherence.

## First Safe Migration Candidate

The first safe implementation candidate was the default-company foundation slice with no enforcement:

- Create a canonical default company record.
- Add nullable `company_id` to `orders`, `clients`, `notifications`, and `activity_log`.
- Backfill existing rows to the default company, deriving notification/activity company from related orders where possible.
- Do not change RLS, org switching, frontend filters, uniqueness, or company settings UI in the same slice.

That foundation has now been followed by backend projection/RPC context work through Slice 7A, order read isolation in Slice 7B, order-derived read safety in Slice 7C, client read isolation in Slice 7D, client table write authorization in Slice 7E1, client mutation RPC/merge hardening in Slice 7E2, order intake attachment authorization in Slice 7E3A, legacy order RPC/import quarantine in Slice 7E3B, order table write policy cleanup in Slice 7F1, canonical workflow transition RPC hardening in Slice 7F2, legacy arbitrary workflow/status RPC quarantine in Slice 7F3, assignment/date mutation guardrails in Slice 7F4A, activity log table/RPC hardening in Slice 7G1, notification table/RPC hardening in Slice 7G2A, legacy exposed view/grant quarantine in Slice 7H1, and explicit authenticated grant hardening in Slice 7H2A. The next enforcement work should remain narrow and continue into users/team, `calendar_events`, notification preference/company settings semantics, productized manual/system notification paths, service-role/operator grant cleanup, `supabase_admin` platform default-ACL cleanup, `current_reviewer_id` model cleanup, review-route redesign, importer rewrite, client canonicalization/uniqueness, realtime, and remaining table-policy boundaries. Tenant isolation is not complete until those backend boundaries are tightened.

## Items That Can Remain Global Temporarily

- Platform workflow transition keys and vocabulary.
- Platform permission catalog.
- Template roles.
- Default policy modules.
- Notification event registry.
- Global notification policy defaults, if treated as seed defaults rather than company-specific policy.
- Legacy compatibility views while company-aware replacements are introduced.

## Items That Must Not Be Frontend-Filtered Only

- Orders.
- Clients.
- Activity.
- Notifications.
- Calendar events.
- User/team directory membership.
- Workflow transition authorization.
- Order numbering and duplicate checks.
- Client merge and duplicate-name checks.

## Anti-Patterns

- Frontend-only company filtering.
- Adding nullable `company_id` without a backfill and verification plan.
- Updating views without updating RLS.
- Updating RLS without updating frontend service assumptions and RPC callers.
- Enforcing company-scoped uniqueness before order numbering migration.
- Building tenant settings UI before policy contracts exist.
- Passing trusted `company_id` values directly from the frontend for sensitive writes.
- Creating per-company lifecycle status sets that fragment workflow doctrine.
- Duplicating notification doctrine instead of using platform defaults plus company overrides.
- Allowing global admin notification routing after company membership exists.
