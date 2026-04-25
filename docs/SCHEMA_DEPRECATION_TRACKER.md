# Schema Deprecation Tracker

## Purpose

This tracker records current legacy tables, columns, views, functions, triggers, and RLS policies that must be kept, migrated, rebuilt, archived, or dropped as Falcon moves toward the canonical schema.

Allowed dispositions:

- Keep canonical
- Keep temporarily
- Migrate/rebuild
- Archive/drop later

Primary rule:

No destructive deletes until canonical replacements are created, tested, backfilled, and app code no longer reads legacy fields.

Roadmap phases refer to `docs/IMPLEMENTATION_ROADMAP.md`.

## 1. User / Profile Identity Tables And Columns

### `public.users`

Disposition: Keep canonical.

Current purpose:

Canonical app user table linked to Supabase auth through `auth_id`.

Current risk:

Some current code, migrations, and policies still use `auth.uid()` or `user_profiles.user_id` as if it were the app user ID.

Progress:

- Phase 1 Batch 1 added `public.current_app_user_id()` and aligned notification/preference identity.
- Phase 1 Batch 2 Step 1 aligned key RLS read/check paths and lifecycle order visibility.
- Activity actor write paths still need cleanup.

Canonical replacement:

None. This is the canonical user table.

Migration action:

- Confirm all required profile fields exist or can be added.
- Add `company_id`, `status`, and `settings` when company foundation begins.
- Ensure app-domain records reference `public.users.id`.
- Continue removing direct `auth.uid()` comparisons from app-domain logic by routing through `public.current_app_user_id()`.

Drop/archive condition:

Never drop as part of current plan.

Roadmap phase:

Phase 1, Phase 5.

### `public.users.auth_id`

Disposition: Keep canonical.

Current purpose:

Maps Falcon app users to `auth.users.id`.

Current risk:

Logic can accidentally compare `auth.uid()` directly to app-domain foreign keys instead of mapping through this column.

Progress:

- `public.current_app_user_id()` is now the required helper for auth-to-app-user mapping.
- Notification identity paths are resolved.
- RLS/read-check identity paths are partially resolved.
- Remaining `auth.uid()` activity actor writes are the next Phase 1 target.

Canonical replacement:

None.

Migration action:

- Use `public.current_app_user_id()` for all app-domain comparisons.
- Continue audit of RPCs, triggers, and RLS policies.
- Patch remaining activity logging actor writes so actors are stored as `public.users.id`.

Drop/archive condition:

Never drop while Supabase Auth is used.

Roadmap phase:

Phase 1.

### `public.users.role`

Disposition: Keep temporarily.

Current purpose:

Legacy/global role display or behavior fallback.

Current risk:

Hardcodes behavior around one role per user and conflicts with configurable permission bundles.

Canonical replacement:

Normalized `roles`, `permissions`, `role_permissions`, and `user_roles`.

Migration action:

- Keep for compatibility.
- Map legacy role strings to permissions in app compatibility layer.
- Backfill into normalized roles.

Drop/archive condition:

Safe only after app, RPCs, views, and policies no longer read `users.role`.

Roadmap phase:

Phase 2, Phase 6.

### `public.user_profiles`

Disposition: Archive/drop later.

Current purpose:

Auth-based profile table with display name, color, phone, avatar, activity status, and split fields.

Current risk:

Duplicates `public.users`, uses `user_id references auth.users(id)`, and reinforces auth ID/app user ID confusion.

Canonical replacement:

Profile fields on `public.users` or a compatibility view over `public.users`.

Migration action:

- Keep temporarily.
- Backfill needed profile fields into `public.users`.
- Update views/RPCs to read canonical user records.

Drop/archive condition:

Safe after `public.profiles`, activity actor hydration, admin user management, and calendar views no longer depend on it.

Roadmap phase:

Phase 1, Phase 6.

### `public.profiles` view

Disposition: Keep temporarily.

Current purpose:

Facade over `auth.users`, `user_profiles`, and `user_roles` for frontend/admin user views.

Current risk:

Uses auth IDs as primary visible IDs, selects only one role, and hides the planned multi-role model.

Canonical replacement:

Canonical user/profile view over `public.users` plus normalized role summaries.

Migration action:

- Keep as compatibility view.
- Create a new canonical user view later if useful.
- Move app code to `public.users`/permission helpers.

Drop/archive condition:

Safe when no app/RPC/view code references `profiles`.

Roadmap phase:

Phase 1, Phase 2, Phase 6.

## 2. Roles / `user_roles`

### `public.permissions`

Disposition: Keep canonical.

Current purpose:

System permission catalog for capability checks.

Current risk:

No behavior is wired to permissions yet, so existing role/helper paths still control access.

Progress:

- Phase 2 Step 2 added read-only compatibility resolver functions that can return current app user permission keys.
- Phase 2 Step 3 added frontend permission constants and hooks that can consume resolver output.
- Phase 2 Step 4 wired initial navigation, route guard, New Order button, and user edit/view permission plumbing: `TopNav` now uses `CLIENTS_READ_ALL` for clients route selection and `USERS_READ` for Users nav visibility with legacy fallback, `ProtectedRoute` accepts optional permission gate props, `/users` uses `USERS_READ`, `/settings` uses `SETTINGS_VIEW`, `/settings/notifications` uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`, CommandPalette filters commands by permission, NewOrderButton uses `ORDERS_CREATE`, and UserDetail/UserCard edit behavior uses `USERS_UPDATE`.
- Chris, Pam, and Abby validated access successfully.
- Chris/appraiser validated no New Order button; Abby/admin validated New Order button visible.
- Users directory access model is finalized: `USERS_READ` grants read-only directory access, `USERS_UPDATE` grants edit actions, and `USERS_CREATE` grants user creation.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing template roles.
- `USERS_CREATE` is granted to the Admin template role.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser validated read-only Users access; Abby/admin validated full Users access.
- Client create/edit UI and routes now use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions are gated by `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path is gated by `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser validated scoped read-only client access, no client Edit/Delete actions, and `Click to see orders` card text.
- Abby/admin validated client edit access and admin edit capability.
- SQL editor has no app auth context, so validation must run through an authenticated app context or manual user-id joins.

Canonical replacement:

None. This is the canonical permission catalog.

Migration action:

- Phase 2 Step 1 created and seeded this table with system permissions.
- Phase 2 Step 2 added a compatibility permission resolver.
- Phase 2 Step 3 added `PERMISSIONS`, `ALL_PERMISSION_KEYS`, `useEffectivePermissions()`, `useCan()`, and `useCanAny()`.
- Phase 2 Step 4 wired permission helpers into initial navigation, CommandPalette, selected route guard, New Order button, and user edit/view plumbing.
- Later wire RLS, RPCs, navigation, and order action gates to permission checks.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 2, Phase 6.

### `public.roles`

Disposition: Keep canonical.

Current purpose:

Template and future company-scoped role bundles.

Current risk:

Template roles exist, but users are not assigned through normalized roles yet. Existing `public.user_roles` text roles still drive fallback behavior.
Some remaining top-level navigation visibility and all workflow/action visibility still use legacy frontend paths. Phase 2 Step 4 completed low-risk CommandPalette filtering, started route guard migration, finalized Users directory access, gated the New Order button by `ORDERS_CREATE`, gated UserDetail/UserCard/UsersIndex edit behavior by `USERS_UPDATE`, gated UsersIndex creation by `USERS_CREATE`, gated Users nav visibility by `USERS_READ`, and gated client create/edit UI and routes by `CLIENTS_CREATE`/`CLIENTS_UPDATE_ALL`.

Progress:

- Compatibility resolver maps legacy `public.user_roles.role` values to matching seeded template role names.

Canonical replacement:

None. This is the canonical role table.

Migration action:

- Phase 2 Step 1 created this table.
- Template roles seeded: Owner, Admin, Appraiser, Reviewer, Billing.
- Phase 2 Step 2 reads these roles through a compatibility resolver without changing behavior.
- Phase 2 Step 3 exposes frontend hooks but does not change UI behavior.
- Phase 2 Step 4 partially wires frontend navigation and selected route guard plumbing without changing order action behavior.
- `/users` now uses `USERS_READ`; `/settings` now uses `SETTINGS_VIEW`.
- `/settings/notifications` now uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- CommandPalette gates Orders, Clients, Users, Settings, and Notification Settings commands by permission.
- CommandPalette preserves legacy command visibility during permission loading/errors.
- NewOrderButton uses `ORDERS_CREATE` and preserves legacy admin fallback during permission loading/errors.
- UserDetail edit action uses `USERS_UPDATE` and preserves legacy admin-ish fallback during permission loading/errors.
- UserCard edit/view behavior uses `USERS_UPDATE` and preserves legacy admin fallback during permission loading/errors.
- Users nav visibility uses `USERS_READ` and preserves legacy admin fallback during permission loading/errors.
- Existing self-profile/view behavior remains unchanged.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing.
- `USERS_CREATE` is granted to Admin.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser has read-only Users access.
- Abby/admin has full Users access.
- Client create/edit UI and routes use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions use `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path uses `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser can view scoped clients without client Edit/Delete actions.
- Abby/admin can edit clients and sees admin edit capability.
- Routes, Supabase/RLS, backend, migrations, dashboard behavior, and order workflow/actions remain untouched by client create/edit and panel/card gating.
- User edit form and role management remain otherwise untouched.
- Legacy role arrays remain fallback only when the permission resolver errors on migrated routes.
- Later backfill legacy text roles into normalized assignments.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 2, Phase 6.

### `public.role_permissions`

Disposition: Keep canonical.

Current purpose:

Maps role bundles to permission keys.

Current risk:

Seeded permissions are not yet consumed by RLS or RPC logic.
Frontend helper plumbing exists, `TopNav` clients route selection now consumes `CLIENTS_READ_ALL` with legacy fallback, TopNav Users visibility consumes `USERS_READ`, `/users` consumes `USERS_READ`, `/settings` consumes `SETTINGS_VIEW`, `/settings/notifications` consumes `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`, CommandPalette consumes navigation/settings/notification permissions, NewOrderButton consumes `ORDERS_CREATE`, UserDetail/UserCard/UsersIndex edit behavior consumes `USERS_UPDATE`, UsersIndex creation consumes `USERS_CREATE`, and client create/edit UI/routes consume `CLIENTS_CREATE`/`CLIENTS_UPDATE_ALL`. Most route config and workflow/action behavior have not been switched over.

Progress:

- Phase 2 Step 2 resolver reads this table to expose effective permission keys for the current app user.
- Owner role effectively receives all seeded permissions.
- Phase 2 Step 4 consumes these permissions in `TopNav`, CommandPalette, selected route guards, NewOrderButton, UserDetail edit action, UserCard edit/view behavior, UsersIndex edit/create UI, and client create/edit UI/routes, and adds optional permission gates to `ProtectedRoute`.

Canonical replacement:

None. This is the canonical role-permission join table.

Migration action:

- Phase 2 Step 1 created and seeded this table.
- Owner template role has all seeded permissions.
- Admin/Appraiser/Reviewer/Billing template roles have scoped default permissions.
- Phase 2 Step 2 added read-only compatibility resolution.
- Phase 2 Step 3 added frontend helper plumbing.
- Phase 2 Step 4 partially migrated selected navigation and route guard plumbing from legacy role paths to permission helpers.
- `/users` now uses `USERS_READ`; `/settings` now uses `SETTINGS_VIEW`.
- `/settings/notifications` now uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- CommandPalette gates Orders, Clients, Users, Settings, and Notification Settings commands by permission and preserves legacy behavior during permission loading/errors.
- NewOrderButton uses `ORDERS_CREATE`; Chris/appraiser validated no button, and Abby/admin validated button visible.
- UserDetail edit action uses `USERS_UPDATE`; existing self-profile/view behavior remains unchanged.
- UserCard edit/view behavior uses `USERS_UPDATE`.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing template roles.
- `USERS_CREATE` is granted to Admin.
- Users nav visibility uses `USERS_READ`.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser validated read-only Users access; Abby/admin validated full Users access.
- Client create/edit UI and routes use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions are gated by `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path is gated by `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser validated scoped read-only client access, no client Edit/Delete actions, and read-only card text.
- Abby/admin validated client edit access and admin edit capability.
- Legacy admin fallback remains only during permission loading/errors.
- Existing routes, order creation route/form, dashboard behavior, order workflow/action buttons, Supabase, RLS, backend, and migrations remain untouched.
- User edit form and role management remain otherwise untouched.

Drop/archive condition:

Never drop as part of the current plan.

Roadmap phase:

Phase 2, Phase 6.

### `public.user_roles` with text `role`

Disposition: Migrate/rebuild.

Current purpose:

Maps auth users to text roles like `admin`, `appraiser`, `reviewer`, `owner`.

Current risk:

References auth users in original migration, uses literal role strings, lacks `company_id`, lacks `role_id`, and cannot represent editable permission bundles cleanly.

Canonical replacement:

Normalized `roles`, `permissions`, `role_permissions`, and `user_roles(user_id, role_id, company_id)`.

Migration action:

- Keep current table temporarily.
- Compatibility permission resolver now maps text roles to seeded template roles.
- Normalized permission foundation tables now exist: `public.permissions`, `public.roles`, and `public.role_permissions`.
- Frontend permission hooks now exist.
- `TopNav` clients route selection now uses `CLIENTS_READ_ALL` with legacy admin fallback.
- `ProtectedRoute` supports permission props.
- `/users` now uses `USERS_READ`; `/settings` now uses `SETTINGS_VIEW`.
- `/settings/notifications` now uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- CommandPalette gates Orders, Clients, Users, Settings, and Notification Settings by permission.
- NewOrderButton gates visibility through `ORDERS_CREATE`.
- UserDetail edit action gates visibility through `USERS_UPDATE`.
- UserCard edit/view behavior gates through `USERS_UPDATE`.
- Users nav visibility gates through `USERS_READ`.
- UsersIndex edit/create UI gates through `USERS_UPDATE` and `USERS_CREATE`.
- Client create/edit UI and routes gate through `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions gate through `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- Client drawer direct save/update path gates through `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Migrated route declarations keep legacy role arrays only as permission resolver error fallback.
- Backfill text roles into company-scoped role assignments.
- Decide whether to evolve current table or create new normalized join.

Drop/archive condition:

Safe to remove `role` text only after permission loading, admin checks, RLS policies, and user management use normalized roles.

Roadmap phase:

Phase 2, Phase 6.

### `rpc_set_user_role` / `rpc_admin_set_user_role`

Disposition: Migrate/rebuild.

Current purpose:

Admin-managed role assignment using text role strings.

Current risk:

Tied to text roles and auth IDs; does not support multi-role permission bundles or company context.

Canonical replacement:

Role assignment RPCs that write normalized `user_roles`.

Migration action:

- Keep temporarily.
- Add new RPCs for normalized role assignment.
- Update admin UI.

Drop/archive condition:

Safe after admin UI and policies no longer call text-role RPCs.

Roadmap phase:

Phase 6.

### `current_is_admin()`

Disposition: Keep temporarily.

Current purpose:

Checks whether current auth user has owner/admin text role.

Current risk:

Uses text roles and is a temporary compatibility helper.

Progress:

- Phase 1 Batch 2 Step 1 updated this helper to resolve the signed-in user through `public.current_app_user_id()`.

Canonical replacement:

Permission check helper, such as `current_app_user_has_permission(permission_key)`.

Migration action:

- Keep until permission tables are active.
- Add compatibility wrapper that maps current app user to effective permissions.
- Preserve as fallback while navigation and route guards are migrated incrementally.
- Do not broaden reviewer/admin role behavior into order lifecycle visibility.

Drop/archive condition:

Safe after admin checks use permission helpers.

Roadmap phase:

Phase 1, Phase 2, Phase 6.

### `current_is_appraiser()`

Disposition: Keep temporarily.

Current purpose:

Checks whether the current app user has explicit appraiser capability for legacy appraiser-scoped policies.

Current risk:

If this helper treats reviewer/admin overlap as appraiser access, assigned reviewer users can pass appraiser policies and see orders outside the review lifecycle.

Progress:

- Phase 1 lifecycle visibility patch changed the helper to require an explicit `public.user_roles.role = 'appraiser'` row for `public.current_app_user_id()`.

Canonical replacement:

Permission check helper, such as `current_app_user_has_permission(permission_key)`, combined with order participant responsibility.

Migration action:

- Keep as compatibility wrapper.
- Do not let global reviewer/admin role imply appraiser capability.
- Replace with permission/responsibility helper after normalized permissions and order participants exist.

Drop/archive condition:

Safe after appraiser-scoped policies use permission and responsibility helpers.

Roadmap phase:

Phase 1, Phase 2, Phase 7.

## 3. Orders And Duplicate / Legacy Order Fields

### `public.orders`

Disposition: Keep canonical.

Current purpose:

Core order record.

Current risk:

Contains legacy/duplicate fields, lacks company scoping, and assignment FKs have historically pointed toward auth/profile identity.

Canonical replacement:

None. The table remains canonical but should be cleaned additively.

Migration action:

- Add nullable `company_id`.
- Ensure `appraiser_id` and `reviewer_id` reference `public.users.id`.
- Keep convenience assignment fields.
- Introduce `order_participants` later.

Drop/archive condition:

Never drop.

Roadmap phase:

Phase 1, Phase 5, Phase 7.

### `orders.order_number`

Disposition: Keep canonical.

Current purpose:

Company-facing order identifier.

Current risk:

Uniqueness is currently global; SaaS target may require uniqueness by company.

Canonical replacement:

Same field, eventually unique by `(company_id, order_number)`.

Migration action:

- Ensure all order-related notifications include it.
- Keep current unique index until company scoping is ready.

Drop/archive condition:

Never drop.

Roadmap phase:

Phase 4, Phase 5.

### `orders.appraiser_id` / `orders.reviewer_id`

Disposition: Keep canonical as denormalized convenience fields.

Current purpose:

Current assignment and notification routing.

Current risk:

May be auth/profile IDs in some legacy data or constraints; can conflict with future participant history.

Canonical replacement:

`order_participants` as source of responsibility, with these fields kept as convenience projections.

Migration action:

- Verify/backfill to `public.users.id`.
- Backfill `order_participants`.
- Keep in sync with assignment changes.

Drop/archive condition:

Do not drop for MVP. Revisit only after participant model and views are stable.

Roadmap phase:

Phase 1, Phase 3, Phase 7.

### `orders.assigned_to`

Disposition: Keep temporarily.

Current purpose:

Legacy assignment field used in RLS/activity checks as fallback.

Current risk:

Ambiguous responsibility; may duplicate appraiser assignment.

Canonical replacement:

`orders.appraiser_id`, `orders.reviewer_id`, and `order_participants`.

Migration action:

- Stop adding new dependencies.
- Update RLS/RPCs to use canonical assignment/resolver logic.

Drop/archive condition:

Safe after no policies, functions, or views reference it.

Roadmap phase:

Phase 1, Phase 7.

### Duplicate due/date/address/client/AMC fields

Disposition: Keep temporarily.

Current purpose:

Legacy imports, UI compatibility, and older views.

Current risk:

Data drift and unclear source of truth.

Canonical replacement:

Canonical `orders` columns plus one canonical order read view/RPC.

Migration action:

- Define canonical view fields.
- Backfill or map duplicates.
- Migrate frontend reads.

Drop/archive condition:

Safe after canonical order view/RPC is used everywhere and data is reconciled.

Roadmap phase:

Phase 5, Phase 10 cleanup.

## 4. Order Views / RPCs

### `v_orders_frontend_v4`

Disposition: Keep temporarily.

Current purpose:

Current frontend order read projection.

Current risk:

Another overlapping order view; can drift from canonical model.

Canonical replacement:

Single canonical order view/RPC with company scope, user names, assignment fields, and last activity.

Migration action:

- Keep while app reads it.
- Create canonical replacement later.
- Switch app reads incrementally.

Drop/archive condition:

Safe after no frontend or RPC references remain.

Roadmap phase:

Phase 5, Phase 7.

### Other `v_orders*` views

Disposition: Archive/drop later.

Current purpose:

List/detail/projection compatibility.

Current risk:

View drift and inconsistent joins/RLS behavior.

Canonical replacement:

One canonical order read view/RPC.

Migration action:

- Inventory usage with `rg`.
- Replace with canonical view.

Drop/archive condition:

Safe after dependency checks show unused.

Roadmap phase:

Phase 5, Phase 10 cleanup.

### Order status/assignment RPCs

Disposition: Migrate/rebuild.

Current purpose:

Update status, assign order, and write activity.

Current risk:

May write legacy activity shape and compare assignments to auth IDs.

Progress:

- Phase 1 Batch 2 Step 1 patched authorization comparison logic where scoped.
- Activity actor values and payload shape were intentionally not changed yet.

Canonical replacement:

Workflow transition service/RPC using `current_app_user_id()`, permissions, and resolver.

Migration action:

- Patch identity first.
- Later centralize transition authorization and activity payload creation.
- Next target: update activity actor writes to store `public.users.id` consistently.

Drop/archive condition:

Safe after new workflow RPC/service covers all app calls.

Roadmap phase:

Phase 1, Phase 3, Phase 4.

## 5. Activity Log Fields / RPCs

### `public.activity_log`

Disposition: Keep canonical, migrate shape.

Current purpose:

Order activity/audit feed.

Current risk:

Mixed schema contract: `detail`, `message`, `actor_id`, `created_by`, `created_by_name`, `created_by_email`; actor identity may be auth/profile based.

Progress:

- Phase 1 Batch 2 Step 1 patched activity access checks/RLS where safe.
- Activity actor write paths are still pending and should be the next identity cleanup target.

Canonical replacement:

Same table with canonical fields:

- `company_id`
- `actor_user_id`
- `event_type`
- `category`
- `title`
- `body`
- `visibility`
- `importance`
- `payload`

Migration action:

- Add canonical nullable fields.
- Backfill from existing fields.
- Update RPCs to write canonical payload while keeping legacy fields populated.
- Before payload enrichment, ensure actor IDs are written as `public.users.id`, not auth IDs.

Drop/archive condition:

Legacy columns can be dropped only after feed UI/RPCs no longer depend on them.

Roadmap phase:

Phase 1, Phase 4, Phase 9.

### `activity_log.detail`

Disposition: Keep temporarily.

Current purpose:

Flexible event JSON payload.

Current risk:

Semantics overlap with planned `payload`.

Canonical replacement:

`activity_log.payload`.

Migration action:

- Treat `detail` as compatibility alias.
- Backfill `payload = detail` where needed.

Drop/archive condition:

Safe after all event writes/readers use `payload`.

Roadmap phase:

Phase 4.

### `activity_log.actor_id` / `created_by`

Disposition: Keep temporarily.

Current purpose:

Actor tracking, likely auth/profile identity.

Current risk:

Identity mismatch with canonical `public.users.id`.

Progress:

- Not fully resolved. Activity read/check paths were patched, but actor writes may still use auth/profile identity.

Canonical replacement:

`activity_log.actor_user_id references public.users(id)`.

Migration action:

- Add `actor_user_id`.
- Backfill through `users.auth_id`.
- Update `rpc_log_event`.
- Audit `rpc_log_note`, `rpc_update_order_status`, `rpc_assign_order`, and triggers that write `actor_id` or `created_by`.

Drop/archive condition:

Safe after no RPC/view/UI reads old actor fields.

Roadmap phase:

Phase 1, Phase 4.

### `rpc_log_event` / `rpc_log_note`

Disposition: Migrate/rebuild.

Current purpose:

RPC-only activity writes.

Current risk:

Authorization compares against auth IDs/legacy roles and writes legacy event shape.

Progress:

- Phase 1 Batch 2 Step 1 patched authorization comparison logic to use app identity where scoped.
- Inserted actor values were intentionally left unchanged.

Canonical replacement:

Canonical logging RPC that uses `current_app_user_id()`, permissions/responsibility, and writes canonical fields/payload.

Migration action:

- Patch identity and authorization.
- Then enrich payload contract.
- Next identity step: patch actor writes to use `public.current_app_user_id()` / `public.users.id`.

Drop/archive condition:

Replace only after all callers are migrated.

Roadmap phase:

Phase 1, Phase 4.

## 6. Notifications Fields / RPCs

### `public.notifications`

Disposition: Keep canonical, migrate shape.

Current purpose:

Bell notification delivery records.

Current risk:

`user_id` semantics drifted between auth ID and `public.users.id`; read-state fields overlap; payload may be incomplete.

Progress:

- Notification identity issue resolved in Phase 1 Batch 1.
- `notifications.user_id` is treated as `public.users.id`.
- Notification read/mark-read RPCs and creation fallback now use `public.current_app_user_id()`.

Canonical replacement:

Same table with canonical semantics:

- `user_id references public.users(id)`
- `company_id`
- `activity_event_id`
- `read_at`
- strict `payload`

Migration action:

- Confirm/repair any legacy stored `user_id` rows to public user IDs if production data requires it.
- Add nullable `company_id` and `activity_event_id`.
- Keep `type` and `category`.
- Prefer `read_at`.

Drop/archive condition:

Do not drop table. Drop legacy fields only after compatibility period.

Roadmap phase:

Phase 1, Phase 4, Phase 5.

### `notifications.type` / `notifications.category`

Disposition: Keep canonical for now.

Current purpose:

Event type and category.

Current risk:

Earlier RPC inserted only category/type inconsistently.

Canonical replacement:

Keep both unless a later schema decision consolidates. Treat `type` as event key and `category` as broad grouping.

Migration action:

- Ensure `type = event_key`.
- Ensure `category = communication/workflow/order/etc`.

Drop/archive condition:

Do not drop during MVP.

Roadmap phase:

Phase 4.

### `notifications.read` / `notifications.is_read`

Disposition: Archive/drop later.

Current purpose:

Legacy read-state flags.

Current risk:

Conflicts with `read_at`.

Canonical replacement:

`read_at is not null`.

Migration action:

- Keep populated for compatibility if needed.
- Move all reads to `read_at`.

Drop/archive condition:

Safe after all RPCs/UI use `read_at`.

Roadmap phase:

Phase 4 cleanup.

### `rpc_notification_create`

Disposition: Migrate/rebuild.

Current purpose:

Creates notification from JSON patch.

Current risk:

No strict payload validation yet.

Progress:

- Phase 1 Batch 1 changed fallback identity to `public.current_app_user_id()`.

Canonical replacement:

RPC that expects public user ID and validates required order-related payload fields.

Migration action:

- Keep fallback on `current_app_user_id()`.
- Keep patch API for compatibility.
- Add validation later for `payload.order_number`.

Drop/archive condition:

Replace only after all callers use canonical payload.

Roadmap phase:

Phase 1, Phase 4.

### `rpc_get_notifications` and mark-read RPCs

Disposition: Migrate/rebuild.

Current purpose:

Read and update current user's notifications.

Current risk:

Resolved for Phase 1 Batch 1.

Progress:

- These RPCs now filter/update by `n.user_id = public.current_app_user_id()`.

Canonical replacement:

Filter by `n.user_id = current_app_user_id()`.

Migration action:

- Keep patched Phase 1 behavior.
- Later align payload/read-state cleanup in Phase 4.

Drop/archive condition:

Do not drop; update in place.

Roadmap phase:

Phase 1.

## 7. Notification Preferences / Email Outbox

### `public.notification_preferences`

Disposition: Keep canonical, migrate semantics.

Current purpose:

Per-user email notification preferences.

Current risk:

Resolved for Phase 1 Batch 1.

Progress:

- RLS and preference RPC now compare `user_id` to `public.current_app_user_id()`.

Canonical replacement:

Same table with `user_id = public.users.id` and RLS via `current_app_user_id()`.

Migration action:

- Keep RLS/RPCs on `public.current_app_user_id()`.
- Add `company_id` later if needed.
- Later expand per-event/channel preferences.

Drop/archive condition:

Do not drop.

Roadmap phase:

Phase 1, Phase 5.

### `public.email_outbox`

Disposition: Keep canonical.

Current purpose:

Queued email delivery records.

Current risk:

Email queue contract is still settling, so queue insertion is intentionally non-blocking.

Progress:

- Phase 1 Batch 1 wired notification email lookup to treat `notifications.user_id` as `public.users.id`.
- Trigger catches queue failures so notification creation is not blocked while the live email queue contract stabilizes.

Canonical replacement:

Same table, with `to_user_id references public.users(id)`.

Migration action:

- Keep email trigger treating notification recipient as public user ID.
- Revisit strict failure behavior once the live `public.email_queue` contract is finalized.
- Add company scope later if useful.

Drop/archive condition:

Do not drop.

Roadmap phase:

Phase 1.

### `notification_policies`

Disposition: Keep temporarily / migrate to company settings.

Current purpose:

Event policy registry with roles and email modes.

Current risk:

Role-based rules use literal roles and are global, not company-scoped permission/preferences model.

Canonical replacement:

`company_notification_settings` plus system event defaults.

Migration action:

- Keep as global default registry.
- Later seed company settings from policies.

Drop/archive condition:

Safe only after company-scoped notification settings are live.

Roadmap phase:

Phase 4, Phase 5.

## 8. Order Numbering Tables / Functions

### `order_numbering_rules`

Disposition: Keep temporarily.

Current purpose:

Defines order number format by `company_key`.

Current risk:

Not linked to `companies`; only supports narrow format constraints.

Canonical replacement:

`company_order_numbering`.

Migration action:

- Add company-scoped table or `company_id`.
- Backfill from `falcon_default`.
- Keep `company_key` compatibility during transition.

Drop/archive condition:

Safe after numbering RPC and settings UI use company ID.

Roadmap phase:

Phase 5, Phase 8.

### `order_number_counters`

Disposition: Keep temporarily / migrate.

Current purpose:

Tracks sequence counters by numbering rule/year.

Current risk:

Coupled to old `order_numbering_rules`.

Canonical replacement:

Company-scoped counter under `company_order_numbering`, or adjusted counter with company FK.

Migration action:

- Preserve current counters.
- Add company relation.
- Avoid resetting live order numbering.

Drop/archive condition:

Safe after new counter system has generated numbers in staging without collisions.

Roadmap phase:

Phase 5, Phase 10.

### `rpc_get_next_order_number`

Disposition: Migrate/rebuild.

Current purpose:

Generates next order number using `company_key`.

Current risk:

Not company-id scoped; current format is limited.

Canonical replacement:

Company-scoped numbering RPC.

Migration action:

- Add `company_id` input with `company_key` fallback.
- Preserve current output format.

Drop/archive condition:

Replace only after order creation uses company ID.

Roadmap phase:

Phase 5, Phase 8.

## 9. Clients

### `public.clients`

Disposition: Keep canonical, migrate shape.

Current purpose:

Client/party records.

Current risk:

May have legacy fields and no company scope; AMCs may still exist separately.

Canonical replacement:

Same table with `company_id`, `client_type`, `status`, metadata, and normalized contacts/billing profile.

Migration action:

- Add nullable `company_id`.
- Add `client_type` if missing.
- Merge AMC concepts into clients later.

Drop/archive condition:

Do not drop.

Roadmap phase:

Phase 5, Phase 8.

### `contacts` / future `client_contacts`

Disposition: Keep or migrate/rebuild.

Current purpose:

Structured client contacts.

Current risk:

May not be company-scoped or aligned with future portal users.

Canonical replacement:

`client_contacts`.

Migration action:

- Keep current contacts if usable.
- Add company scope and needed fields.
- Rename/rebuild only if current shape blocks portal/client UX.

Drop/archive condition:

Safe only after client UI uses canonical contact model.

Roadmap phase:

Phase 5, Phase 8.

### `amcs`

Disposition: Archive/drop later.

Current purpose:

Legacy separate AMC party table, if present.

Current risk:

Duplicates client model.

Canonical replacement:

`clients` with `client_type = 'amc'`.

Migration action:

- Migrate AMC rows into clients.
- Keep compatibility view if code still expects `amcs`.

Drop/archive condition:

Safe after orders and UI no longer reference `amcs` or `orders.amc_id`.

Roadmap phase:

Phase 5 cleanup.

## 10. Functions / Triggers / RLS Policies

### Assignment notification triggers

Disposition: Migrate/rebuild.

Current purpose:

Create assignment notifications when appraiser assignment changes.

Current risk:

Some versions convert public user ID to auth ID before inserting `notifications.user_id`, conflicting with canonical model.

Progress:

- Phase 1 Batch 1 aligned assignment notification recipients to `public.users.id`.

Canonical replacement:

Trigger/service that writes recipient `public.users.id` and canonical payload.

Migration action:

- Keep identity behavior patched to `public.users.id`.
- Enrich payload in Phase 4.
- Later route through responsibility resolver.

Drop/archive condition:

Replace only after equivalent assignment notification path is verified.

Roadmap phase:

Phase 1, Phase 4, Phase 7.

### Notification email trigger

Disposition: Migrate/rebuild.

Current purpose:

Queue email from inserted notification.

Current risk:

Queue contract is temporarily non-blocking while live email queue fields stabilize.

Progress:

- Phase 1 Batch 1 treats notification user ID as `public.users.id` and resolves email target from canonical app user identity.

Canonical replacement:

Trigger that treats `notifications.user_id` as `public.users.id`.

Migration action:

- Keep identity lookup patched.
- Use user preferences keyed by public user ID.
- Revisit non-blocking exception handling after the live queue contract is stable.

Drop/archive condition:

Do not drop unless email delivery is replaced by a service.

Roadmap phase:

Phase 1.

### Activity RLS policies

Disposition: Migrate/rebuild.

Current purpose:

Allow admins/reviewers or assigned appraisers to view/write activity.

Current risk:

Partially resolved. Earlier policies used JWT role claims and compared order assignment to `auth.uid()`.

Progress:

- Phase 1 Batch 2 Step 1 patched read/check paths to use `public.current_app_user_id()` where safe.
- Activity actor write paths remain pending.

Canonical replacement:

Policies using `current_app_user_id()`, permissions, and eventually `order_participants`.

Migration action:

- Keep patched read/check paths.
- Patch remaining write/actor paths next.
- Later use permission/responsibility helpers.

Drop/archive condition:

Replace in place; do not drop without replacement.

Roadmap phase:

Phase 1, Phase 3, Phase 7.

### Orders RLS policies

Disposition: Migrate/rebuild.

Current purpose:

Gate order read/write by role and assignment.

Current risk:

Partially resolved. Older role-based policies let reviewer role or helper leakage grant too much order visibility.

Progress:

- Phase 1 Batch 2 Step 1 replaced app-user comparisons with `public.current_app_user_id()`.
- Lifecycle visibility migration dropped broad reviewer/all-order policies.
- Assigned reviewers now see only `in_review`, `needs_revisions`, and `completed` orders.
- `current_is_appraiser()` now requires explicit appraiser role assignment so reviewer/admin overlap does not pass appraiser policies.

Why lifecycle overrides role:

Global role says what a user can do in the system; order lifecycle says whether they are currently responsible for a specific order. Reviewer role alone must not expose `new` or `in_progress` orders, even when `reviewer_id` is pre-assigned.

Canonical replacement:

Policies using app user ID, permissions, company scope, and order participants.

Migration action:

- Keep lifecycle-aware policies as authoritative for order visibility.
- Add company scope after company foundation.
- Add participant checks after `order_participants`.

Drop/archive condition:

Replace in place.

Roadmap phase:

Phase 1, Phase 5, Phase 7.

### Notification RLS policies

Disposition: Migrate/rebuild.

Current purpose:

Allow users to read their own notifications.

Current risk:

Resolved for Phase 1 Batch 1.

Progress:

- Notification RLS now compares `user_id` to `public.current_app_user_id()`.

Canonical replacement:

`user_id = current_app_user_id()`.

Migration action:

- Keep patched Phase 1 behavior.

Drop/archive condition:

Replace in place.

Roadmap phase:

Phase 1.

## Tracker Review Rules

Before changing any tracked item:

1. Identify roadmap phase.
2. Confirm canonical replacement.
3. Confirm whether change is additive.
4. Check app usage with `rg`.
5. Check DB dependencies.
6. Define rollback path.
7. Validate in local/staging.

Before dropping any tracked item:

1. App code no longer reads/writes it.
2. RPCs/functions no longer reference it.
3. Views no longer depend on it.
4. RLS policies no longer depend on it.
5. Data is backed up or migrated.
6. Staging has run without errors.
7. Drop is its own explicit cleanup change.
