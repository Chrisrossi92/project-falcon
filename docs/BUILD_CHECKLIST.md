# Build Checklist

## Purpose

This is Falcon's master implementation checklist. It turns the roadmap, schema plan, function contracts, UX flows, and deprecation tracker into actionable phase-gated work.

Reference docs:

- `docs/IMPLEMENTATION_ROADMAP.md`
- `docs/CANONICAL_SCHEMA_PLAN.md`
- `docs/SCHEMA_DEPRECATION_TRACKER.md`
- `docs/FUNCTION_CONTRACTS.md`
- `docs/SYSTEM_DATA_MODEL.md`
- `docs/USER_EXPERIENCE_FLOWS.md`
- `docs/ROLE_PERMISSION_MODEL.md`
- `docs/ORDER_LIFECYCLE_MODEL.md`
- `docs/TENANT_SETUP_AND_SEEDING.md`

## Build Rules

- [ ] No coding outside this checklist.
- [ ] Every code change cites a roadmap phase.
- [ ] Every code change cites the relevant function contract when applicable.
- [ ] No destructive schema cleanup until the legacy item is marked safe in `SCHEMA_DEPRECATION_TRACKER.md`.
- [ ] Every order-facing UI uses `order_number`, not internal UUID.
- [ ] Every app user reference uses `public.users.id` unless the code is explicitly auth-level.
- [ ] Additive migrations are preferred.
- [ ] Compatibility paths stay until app/RPC/view usage is verified gone.
- [ ] Activity log remains durable history.
- [ ] Notifications remain delivery records.

## Phase 0: Contract Freeze

### Planning / Docs

- [ ] Confirm `public.users.id` is canonical app identity.
- [ ] Confirm `auth.users.id` is auth-only identity.
- [ ] Confirm `orders.order_number` is visible order identifier.
- [ ] Confirm `orders.id` is internal routing/query identifier.
- [ ] Confirm activity log and notification distinction.
- [ ] Confirm no new ad hoc role/status/notification logic.

### Database Migration

- [ ] No database changes in this phase.

### App / Service Implementation

- [ ] No app changes in this phase.
- [ ] Add review rule that new app work must cite roadmap phase.

### UI Implementation

- [ ] No UI changes in this phase.

### Validation

- [ ] Review open docs for consistency.
- [ ] Search current work for new UUID-visible UI regressions.
- [ ] Search current work for new `auth.uid()` to app-domain comparisons.

### Stop Conditions

- [ ] Architecture docs agree on identity and order identifier contracts.
- [ ] Team agrees to stop ad hoc patching outside phases.

## Phase 1: Identity Alignment

### Planning / Docs

- [x] Review `FUNCTION_CONTRACTS.md` contract `current_app_user_id()`.
- [x] Review tracker entries for notifications, preferences, activity, orders RLS, and assignment triggers.
- [x] Identify every RPC/RLS/trigger using `auth.uid()` for Batch 1 and Batch 2 Step 1 scope.
- [ ] Identify and patch remaining activity actor write-path `auth.uid()` usage.

### Database Migration

- [x] Add `public.current_app_user_id()`.
- [ ] Add temporary `public.current_app_user_role_names()` if needed.
- [x] Update notification read RPCs to use current app user ID.
- [x] Update notification mark-read RPCs.
- [x] Update `rpc_notification_create` fallback.
- [x] Update notification preferences RLS.
- [x] Update notification preferences RPC.
- [x] Update email outbox trigger to treat notification recipient as public user ID.
- [x] Keep email queue insertion non-blocking while the live queue contract is still settling.
- [x] Update assignment notification trigger to insert public user ID.
- [x] Update activity logging authorization to map auth user to app user.
- [x] Update order/activity RLS policies where safe.
- [x] Drop broad reviewer/all-order order visibility policies.
- [x] Add lifecycle-aware reviewer order select/update policies.
- [x] Update `current_is_admin()` to map through `current_app_user_id()`.
- [x] Update `current_is_appraiser()` to require explicit appraiser role assignment.
- [x] Set frontend order views to `security_invoker = true` where supported.
- [x] Add nullable `activity_log.actor_user_id` as canonical `public.users.id` actor field.
- [x] Add `activity_log.actor_user_id` FK to `public.users(id)` with `ON DELETE SET NULL` and `NOT VALID`.
- [x] Keep legacy `created_by` and `actor_id` compatible with auth/profile identity.
- [x] Update both `rpc_log_event` overloads so `actor_user_id = public.current_app_user_id()` while `created_by` and `actor_id` remain `auth.uid()`.

### App / Service Implementation

- [ ] Ensure current-user hook exposes public user ID clearly.
- [ ] Ensure notification service passes public user IDs.
- [ ] Ensure self-notification suppression compares public user IDs.
- [ ] Remove or isolate auth ID use from app-domain behavior.

### UI Implementation

- [ ] No visual redesign required.
- [ ] Confirm notification bell still reads and marks notifications.

### Validation

- [x] User with `public.users.id != auth_id` receives notification.
- [x] Same user can read notifications.
- [x] Same user can mark notification read.
- [x] Notification preferences save.
- [x] Email outbox queues to public user ID.
- [x] Email queue failure does not block notification insert.
- [x] Assignment notification still works.
- [x] Activity notes still log.
- [x] Reviewer/Pam can post activity notes without `activity_log_created_by_fkey` errors.
- [x] No FK conflict on notification insert.
- [x] Reviewer assigned to `new` or `in_progress` order is not granted visibility solely by reviewer assignment.
- [x] Reviewer assigned to `in_review`, `needs_revisions`, or `completed` order keeps review-active/historical visibility.
- [x] Admin/owner keeps all-order visibility.
- [x] Assigned appraiser keeps assigned-order visibility.
- [x] Legacy broad policies `orders_read_all`, `orders_select_policy`, `orders_update_policy`, and `allow_reviewer_update_status` are dropped/replaced.
- [x] `current_is_appraiser()` returns false for reviewer/admin users unless they have an explicit appraiser role row.
- [ ] Confirm live `/orders` view/RPC uses RLS via `security_invoker`; replace with scoped RPC if unsupported.
- [x] Validate activity note write path stores canonical actor in `activity_log.actor_user_id`.

### Stop Conditions

- [ ] All known RPCs avoid direct app-domain comparison to `auth.uid()`.
- [x] Local and live notification user ID semantics match.
- [x] Notification identity mismatch regression is resolved.
- [x] Reviewer role leakage into all-order visibility is resolved.
- [x] Activity note actor identity mismatch is resolved.

## Phase 2: Permission Compatibility Layer

### Planning / Docs

- [x] Review `ROLE_PERMISSION_MODEL.md`.
- [x] Review `getEffectivePermissions` and `canUserPerform` contracts.
- [x] Define initial permission key catalog.
- [x] Define legacy role-to-template-role map for compatibility resolver.

### Database Migration

- [x] Create `public.permissions`.
- [x] Create `public.roles`.
- [x] Create `public.role_permissions`.
- [x] Seed system permissions.
- [x] Seed template roles: Owner, Admin, Appraiser, Reviewer, Billing.
- [x] Seed template role permissions.
- [x] Do not wire permission tables to RLS/helpers/app behavior yet.
- [x] Add `public.current_app_user_permission_keys()`.
- [x] Add `public.current_app_user_has_permission(text)`.
- [x] Add `public.current_app_user_has_any_permission(text[])`.
- [x] Add `public.current_app_user_has_all_permissions(text[])`.

### App / Service Implementation

- [x] Create permission constants.
- [x] Create database legacy role-to-template-role permission mapping.
- [x] Create frontend permission constants.
- [ ] Defer `getEffectivePermissions(userId, companyId)` service contract to later Phase 2/Phase 6 support work.
- [ ] Defer `canUserPerform(userId, permissionKey, context)` service contract to later Phase 2/Phase 6 support work.
- [x] Implement Phase 2 Step 2 compatibility permission resolver.
- [x] Add `useEffectivePermissions()`.
- [x] Add `useCan(permissionKey)`.
- [x] Add `useCanAny(permissionKeys)`.
- [x] Add first low-risk navigation permission integration in `TopNav`.
- [x] Gate TopNav avatar Settings link through `SETTINGS_VIEW`.
- [x] Gate TopNav mobile Settings nav item through `SETTINGS_VIEW`.
- [x] Preserve TopNav Settings visibility during permission loading/error.
- [x] Add optional permission props to `ProtectedRoute`.
- [x] Migrate `/users` route guard to `USERS_READ`.
- [x] Migrate `/users/:userId` route guard to `USERS_UPDATE`.
- [x] Migrate `/users/new` route guard to `USERS_CREATE`.
- [x] Migrate `/users/view/:userId` route guard to `USERS_READ`.
- [x] Migrate `/settings` route guard to `SETTINGS_VIEW`.
- [x] Migrate `/settings/notifications` route guard to `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- [x] Filter `CommandPalette` items by permission.
- [x] Gate NewOrderButton through `ORDERS_CREATE`.
- [x] Gate UserDetail edit action through `USERS_UPDATE`.
- [x] Gate UserCard edit/view behavior through `USERS_UPDATE`.
- [x] Gate Users nav visibility through `USERS_READ`.
- [x] Grant `USERS_READ` to Appraiser, Reviewer, and Billing template roles.
- [x] Grant `USERS_CREATE` to the Admin template role.
- [x] Gate UsersIndex edit/create UI through permissions.
- [x] Gate client create UI and route through `CLIENTS_CREATE`.
- [x] Gate client edit UI and route through `CLIENTS_UPDATE_ALL`.
- [x] Gate remaining client panel Edit/Delete actions through `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- [x] Gate client drawer direct save/update path through `CLIENTS_UPDATE_ALL`.
- [x] Make ClientCard helper text reflect `CLIENTS_UPDATE_ALL`.
- [x] Preserve current role behavior through compatibility.

### UI Implementation

- [x] Gate `TopNav` clients path through `CLIENTS_READ_ALL` with legacy admin fallback during loading/error.
- [x] Add `ProtectedRoute` support for `requiredPermission`, `requiredAnyPermissions`, and `requiredAllPermissions`.
- [x] Migrate first route guards from legacy role arrays to permission props.
- [x] Keep legacy role arrays on migrated routes as resolver-error fallback only.
- [x] Gate `/users/:userId` through `USERS_UPDATE`.
- [x] Gate `/users/new` through `USERS_CREATE`.
- [x] Gate `/users/view/:userId` through `USERS_READ`.
- [x] Gate `/settings/notifications` through `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- [x] Gate CommandPalette Orders through `NAVIGATION_ORDERS_VIEW`.
- [x] Gate CommandPalette Clients through `NAVIGATION_CLIENTS_VIEW`.
- [x] Gate CommandPalette Users through `USERS_READ` or `NAVIGATION_USERS_VIEW`.
- [x] Gate CommandPalette Settings through `SETTINGS_VIEW` or `NAVIGATION_SETTINGS_VIEW`.
- [x] Gate CommandPalette Notification Settings through `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- [x] Preserve legacy CommandPalette behavior during permission loading/error.
- [x] Gate NewOrderButton through `ORDERS_CREATE` with legacy admin fallback during permission loading/error.
- [x] Gate UserDetail edit action through `USERS_UPDATE` with legacy admin-ish fallback during permission loading/error.
- [x] Gate UserCard edit/view behavior through `USERS_UPDATE` with legacy admin fallback during permission loading/error.
- [x] Gate TopNav Users visibility through `USERS_READ` with legacy admin fallback during permission loading/error.
- [x] Gate TopNav avatar Settings link through `SETTINGS_VIEW` with current visibility preserved during permission loading/error.
- [x] Gate TopNav mobile Settings nav item through `SETTINGS_VIEW` with current visibility preserved during permission loading/error.
- [x] Gate UsersIndex Edit buttons, inline edit mode, and Save controls through `USERS_UPDATE`.
- [x] Gate UsersIndex New user button and modal submit through `USERS_CREATE`.
- [x] Gate ClientsIndex New Client button through `CLIENTS_CREATE`.
- [x] Gate ClientDetail Edit Client button and inline edit form through `CLIENTS_UPDATE_ALL`.
- [x] Gate `/clients/new` through `CLIENTS_CREATE`.
- [x] Gate `/clients/edit/:clientId` through `CLIENTS_UPDATE_ALL`.
- [x] Gate ClientDetailPanel Edit button and handler through `CLIENTS_UPDATE_ALL`.
- [x] Gate ClientDetailPanel Delete button and handler through `CLIENTS_DELETE`.
- [x] Gate ClientDrawerContent save/update path through `CLIENTS_UPDATE_ALL`.
- [x] Update ClientCard text to show `Click to see orders & edit` only when `CLIENTS_UPDATE_ALL` is granted.
- [x] Close Phase 2 Step 4 frontend permission plumbing as MVP-complete.
- [ ] Defer order routes/nav/workflow/action buttons to responsibility/lifecycle work.
- [ ] Defer client scoped route/nav behavior to responsibility/scoped visibility work.
- [ ] Defer calendar route/nav gating until a calendar permission model exists.
- [ ] Defer dashboard route/query behavior because it is role/responsibility scoped.
- [ ] Defer backend/RLS permission enforcement to later permission/normalization phases.
- [ ] Gate new actions through permission helpers in later phases where responsibility and scope are defined.
- [ ] Avoid new direct role-string checks.
- [x] Leave order workflow/action buttons untouched during navigation plumbing.
- [x] Leave order creation route and form untouched during NewOrderButton migration.
- [x] Leave user edit form and role management otherwise untouched during UsersIndex permission migration.
- [x] Leave client query/KPI/scoped visibility logic untouched during client create/edit gating.
- [x] Leave `/clients` and `/clients/cards` visibility behavior untouched.
- [x] Leave dashboard behavior, Supabase, and RLS untouched during route guard migration.

### Validation

- [x] Permission seed migration exists.
- [x] Template roles are seeded.
- [x] Template role permissions are seeded.
- [x] Permission wiring remains additive and preserves existing behavior through compatibility fallbacks.
- [x] Compatibility resolver maps legacy `public.user_roles.role` to seeded template roles.
- [x] Owner role effectively receives all seeded permissions.
- [ ] Validate resolver through authenticated app context.
- [ ] Validate resolver with manual user-id join queries when using SQL editor.
- [x] Frontend permission helper plumbing builds.
- [x] Existing UI behavior was not changed.
- [ ] Existing owner/admin/appraiser/reviewer behavior is preserved.
- [x] `TopNav` clients route selection uses `CLIENTS_READ_ALL` with legacy fallback.
- [x] TopNav avatar Settings link uses `SETTINGS_VIEW`.
- [x] TopNav mobile Settings nav item uses `SETTINGS_VIEW`.
- [x] TopNav Settings visibility preserves existing behavior during permission loading/error.
- [x] `/users` route guard uses `USERS_READ`.
- [x] `/users/:userId` route guard uses `USERS_UPDATE`.
- [x] `/users/new` route guard uses `USERS_CREATE`.
- [x] `/users/view/:userId` route guard uses `USERS_READ`.
- [x] `/settings` route guard uses `SETTINGS_VIEW`.
- [x] `/settings/notifications` route guard uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- [x] Migrated route guards keep legacy role arrays as resolver-error fallback only.
- [x] Chris, Pam, and Abby validated access successfully.
- [x] NewOrderButton uses `ORDERS_CREATE`.
- [x] Chris/appraiser validated no New Order button.
- [x] Abby/admin validated New Order button visible.
- [x] UserDetail edit action uses `USERS_UPDATE`.
- [x] Existing self-profile/view behavior remains unchanged.
- [x] UserCard edit/view behavior uses `USERS_UPDATE`.
- [x] Users nav visibility uses `USERS_READ`.
- [x] `USERS_READ` granted to Appraiser, Reviewer, and Billing.
- [x] `USERS_CREATE` added to Admin.
- [x] UsersIndex edit/create UI is fully permission-driven.
- [x] User edit actions are gated by `USERS_UPDATE`.
- [x] User creation is gated by `USERS_CREATE`.
- [x] Chris/appraiser validated read-only Users access.
- [x] Chris/appraiser user view access works.
- [x] Chris/appraiser edit/new user routes are blocked.
- [x] Abby/admin validated full Users access.
- [x] Abby/admin user view/edit/new user routes work.
- [x] Desktop validation passed for the TopNav Settings permission patch where applicable.
- [x] Legacy admin fallback remains only during permission loading/error.
- [x] Client create UI and route use `CLIENTS_CREATE`.
- [x] Client edit UI and route use `CLIENTS_UPDATE_ALL`.
- [x] Remaining client panel Edit/Delete actions are gated by `CLIENTS_UPDATE_ALL` / `CLIENTS_DELETE`.
- [x] Client drawer direct save/update path is gated by `CLIENTS_UPDATE_ALL`.
- [x] ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- [x] Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- [x] `/clients` and `/clients/cards` visibility behavior was not changed.
- [x] Chris/appraiser can view scoped clients.
- [x] Chris/appraiser does not see client Edit/Delete actions.
- [x] Chris/appraiser client cards say `Click to see orders`.
- [x] Abby/admin can edit clients.
- [x] Abby/admin sees admin edit capability.
- [x] CommandPalette filters Orders, Clients, Users, Settings, and Notification Settings by permission.
- [x] CommandPalette permission loading/error preserves legacy behavior.
- [x] Remaining unsafe route/nav migration is explicitly deferred rather than treated as a Phase 2 Step 4 blocker.
- [x] Phase 2 Step 4 is complete enough for MVP and ready to move to Phase 3.
- [x] Order actions still use legacy visibility paths.
- [x] Dashboard behavior is untouched.
- [x] Supabase/RLS is untouched.
- [x] Routes, backend, migrations, and dashboard behavior are untouched by the latest client panel/card permission slice.
- [x] Order, client, calendar, navigation, backend, migrations, dashboard, and workflow/action logic are untouched by the latest Users route permission slice.
- [x] Orders, Clients, Calendar, CommandPalette, routes, layout, styling, backend, migrations, dashboard, and workflow/action logic are untouched by the latest TopNav Settings permission slice.
- [x] Order workflow/actions are untouched.
- [x] Build passes.
- [ ] Mobile login currently shows a blank screen; defer mobile-specific investigation unless it affects desktop or core live app flows.

### Stop Conditions

- [x] New feature code can use permission helpers.
- [x] No new code path should require hardcoded role names when a permission helper can answer the question.
- [x] Compatibility resolver can read seeded permissions without changing existing behavior.
- [x] Risky route config migration is deferred until responsibility, scoped visibility, calendar permissions, or dashboard semantics are defined.
- [ ] Order workflow/action button migration remains separate from navigation work.
- [x] Phase 2 Step 4 replaces the safe MVP navigation plumbing with permission helpers.
- [x] Phase 2 Step 4 migrates the safe MVP route guards to permission props.
- [x] Phase 2 Step 4 filters CommandPalette commands with permission helpers.

## Phase 3: Responsibility Resolver

Status: Resolver MVP complete for current scope. No app-code requirement remains before moving to the next phase.

### Planning / Docs

- [ ] Review `resolveOrderParticipants` contract.
- [ ] Review `getOrderResponsibility` contract.
- [ ] Review lifecycle participant rules.
- [x] Decide not to migrate `markReadyForClient` until reviewer clearance and client release are modeled separately.
- [x] Introduce and validate `review_cleared` for reviewer-to-admin handoff.
- [ ] Plan `pending_final_approval` / `ready_for_client` lifecycle split.
- [ ] Plan configurable final approval policy.
- [ ] Plan ready-for-client notification settings: appraiser generally notified, admins/owners action-aware, reviewer optional/configurable.

### Database Migration

- [ ] No required DB migration.

### App / Service Implementation

- [ ] Implement `getOrderResponsibility(order, userId)`.
- [x] Implement first `resolveOrderParticipants(order, eventContext)` slice for activity note notifications.
- [x] Use current `orders.appraiser_id` in first resolver slice.
- [x] Use current `orders.reviewer_id` in first resolver slice.
- [ ] Include status/lifecycle awareness.
- [x] Reviewer clear-review action moves `in_review` to `review_cleared`; reviewer visibility, admin/owner visibility, activity log, notification copy, and build were validated.
- [x] Include self-notification suppression in first resolver slice.
- [x] Return actor role on order in first resolver slice.
- [x] Return bell recipients in first resolver slice.
- [x] Add explicit `workflow.sent_to_review` behavior returning `reviewer_id`.
- [x] Use resolver in `sendOrderToReview` reviewer recipient assembly with existing fallback.
- [x] Use resolver in `sendOrderBackToAppraiser` appraiser recipient assembly with existing fallback.
- [x] Use resolver in `completeOrder` appraiser recipient assembly with existing fallback.
- [x] Keep admin recipients appended through `fetchAdminRecipients()`.
- [x] Defer `markReadyForClient` resolver migration until default admin/owner client release semantics are implemented or configured.
- [x] Keep `markReadyForClient` resolver migration deferred until workflow statuses and notification settings are modeled.
- [ ] Return visibility candidates.

### UI Implementation

- [x] Replace duplicated note recipient logic in activity note flow.
- [x] Suppress duplicate send-back-to-appraiser workflow note bell notification.
- [x] Suppress duplicate send-to-review workflow note bell notification.
- [x] Send-to-review workflow notification includes optional note snippet.
- [x] Preserve send-back-to-appraiser revision note in activity log via `logNote`.
- [x] Add Activity / Communication History to `/orders/:id` with `ActivityLog`.
- [ ] Replace duplicated workflow note recipient logic where touched.
- [x] Preserve current activity note UI behavior.

### Validation

- [x] Appraiser note routes to reviewer.
- [x] Reviewer note routes to appraiser.
- [x] Admin/other note routes to appraiser.
- [ ] Admin assigned as appraiser routes as appraiser.
- [ ] Missing recipient skips cleanly.
- [ ] Self notification skips cleanly.
- [ ] Reviewer lifecycle cases match docs.
- [x] Notification payload/UI behavior is otherwise unchanged.
- [x] No DB/RLS, order visibility, status lifecycle, or workflow button behavior changed.
- [x] No routing or notification service changes for validated Phase 3 slices.
- [x] Chris/appraiser send-to-review notifies Pam/reviewer and Abby/admin.
- [x] Send-to-review status behavior remains normal.
- [x] Complete order workflow still works and sends notifications.
- [x] Notification click flow lands on order detail where communication history is visible.
- [x] `npm run build` passed.

### Stop Conditions

- [x] Activity note notifications use resolver.
- [x] Workflow notifications use resolver where in current scope and emit one actionable notification per workflow action.
- [ ] No new appraiser/reviewer routing logic is added outside resolver.

### Deferred Follow-Up

- [ ] Admin/Abby note notifications can display a generic actor label such as "User added a note" because the logged-in admin profile/identity hydrates as Demo User instead of Abby Rossi. Treat this as actor display-name/profile hydration cleanup, separate from responsibility resolver routing.
- [ ] Activity / Communication History presentation needs future polish, but is functional and visible.
- [ ] Backfill demo/test orders with null `order_number`, including `ea359d71-4f6f-4a4a-9b26-4035ea3a7947`, so order-facing notifications do not fall back to UUID/short ID labels. This is data cleanup, not a resolver failure.

## Phase 4: Activity / Notification Payload Contract

Status: Notification payload contract MVP complete.

### Planning / Docs

- [ ] Review `createActivityEvent`.
- [ ] Review `createNotification`.
- [ ] Review `emitOrderEvent`.
- [ ] Confirm required `NotificationPayload` fields.

### Database Migration

- [ ] Add activity canonical nullable fields if needed.
- [ ] Add notification `company_id` if Phase 5 has started.
- [ ] Add notification `activity_event_id` if needed.
- [x] Add notification `dismissed_at` for quick-view dismissal without deleting history.
- [ ] Keep legacy fields during transition.
- [ ] Do not drop `detail`, `message`, `is_read`, or `read` yet.

### App / Service Implementation

- [ ] Enforce order notification payload includes `order_id`.
- [x] Enforce order notification payload includes valid user-facing `order_number` when available.
- [x] Prevent UUID and short-id fallbacks from being persisted in `payload.order_number`.
- [x] Fetch `order_number` from `public.orders` when missing from notification caller data.
- [x] Centralize `payload.order_number` normalization in `emitNotification`.
- [ ] Enforce actor object.
- [ ] Enforce recipient object when direct recipient exists.
- [ ] Enforce communication context.
- [x] Include send-back-to-appraiser revision note text in existing workflow notification body when present.
- [x] Pass send-back-to-appraiser note text through `emitNotification` payload as `note_text`.
- [x] Keep duplicate send-back-to-appraiser note notification suppressed.
- [x] Include send-to-review note text in existing workflow notification body when present.
- [x] Keep duplicate send-to-review note notification suppressed.
- [x] Suppress send-to-review/resubmission self-notifications.
- [x] Make resubmission notifications visually/textually distinct from first send-to-review.
- [x] Keep resubmission on `order.sent_to_review` with payload flag instead of new notification policy.
- [x] Seed `order.review_cleared` notification policy.
- [x] Emit `order.review_cleared` to admin/owner recipients from `clearReview`.
- [ ] Make remaining notification title/body display-ready.
- [ ] Ensure RPC errors are checked and surfaced.
- [ ] Implement or align `emitOrderEvent`.

### UI Implementation

- [ ] Bell shows title normally.
- [x] Bell shows send-back-to-appraiser revision note text in the existing workflow notification body when present.
- [x] Bell shows send-to-review note text in the existing workflow notification body when present.
- [x] Bell uses user-facing order numbers when available.
- [x] Bell no longer receives UUID/short-id fallback as `payload.order_number` from new notifications.
- [x] ActivityLog UX polish slice complete: note submission silently refreshes without full loading flash.
- [x] ActivityLog viewport remains fixed-height and scrollable after updates, including `fill` layout.
- [x] Notification Center quick-view polish complete for MVP: unread, seen, and dismissed states are visually distinct.
- [x] Bell badge counts only unread, non-dismissed notifications.
- [x] Seen notifications remain visible as reminders until dismissed.
- [x] Individual dismiss and `Dismiss seen` remove items from quick view without deleting notification history.
- [x] Click-outside close behavior added.
- [x] Notification type color hints restored.
- [x] `/activity` route and Activity page MVP added using existing user-scoped `rpc_get_notifications`.
- [x] Activity page shows unread, seen, and dismissed notifications, including dismissed quick-view items.
- [x] Activity page includes search across title/body/order number/payload, state filters, type/category filtering, badges, order number, date/time, and open action.
- [x] Activity page does not auto-mark seen or dismiss items.
- [ ] Activity log displays enriched actor/context where available.

### Validation

- [ ] Note notification title is `{Actor Name} added a note`.
- [ ] Note body is note text.
- [x] New notification payload normalization keeps `payload.order_number` user-facing or null.
- [x] `npm run build` passed.
- [x] Current workflow actions produce one actionable notification per action.
- [x] ActivityLog polish did not change activity logging, notifications, realtime subscription, or workflow logic.
- [x] `Mark all seen` clears the badge without removing reminders; `Dismiss seen` clears seen reminders from quick view.
- [x] Notification Center dismissal preserves notification history.
- [x] Activity page opens items through `link_path` or `/orders/:order_id`.
- [x] Raw `activity_log` aggregation, pagination, restore dismissed, and team-wide activity are deferred.
- [x] Appraiser dashboard active queue includes only `new`, `in_progress`, and `needs_revisions`.
- [x] Appraiser dashboard excludes `in_review`, `review_cleared`, `pending_final_approval`, `ready_for_client`, and `completed` from active queue while preserving Orders/history visibility.
- [x] Main table workflow actions are permission-gated with legacy fallback during permission loading/errors.
- [x] Reviewer template role no longer receives `workflow.status.ready_for_client`.
- [ ] Redesign row action dropdown/popover as a unified Smart Actions button/panel.
- [ ] Create Smart Actions action model/builder for valid actions by status, role, permissions, and responsibility.
- [ ] Create `SmartActionsButton.jsx` and `SmartActionsPanel.jsx`.
- [ ] First Smart Actions slice should replace main table workflow actions only while keeping existing handlers and `WorkflowNoteModal`.
- [ ] Defer drawer/detail replacement, appointment/date editing, final approval policy settings, backend/RLS enforcement, and bulk actions.
- [ ] Activity event retains context after reassignment.
- [ ] Admin feed prototype can render from payload.

### Stop Conditions

- [ ] All order notifications include `payload.order_number`.
- [ ] All new activity events follow canonical payload shape.
- [ ] Existing activity feed remains readable.
- [x] Phase 4 notification payload contract is MVP-complete.

## Phase 5: Company Foundation

Status: Reviewer/admin workflow separation MVP complete for current single-company workflow.

### Planning / Docs

- [ ] Review `CANONICAL_SCHEMA_PLAN.md` company model.
- [ ] Decide default company seed values.
- [ ] Decide nullable `company_id` backfill scope.

### Database Migration

- [ ] Create `companies`.
- [ ] Create `company_settings`.
- [ ] Add nullable `company_id` to `users`.
- [ ] Add nullable `company_id` to `orders`.
- [ ] Add nullable `company_id` to `clients`.
- [ ] Add nullable `company_id` to `notifications`.
- [ ] Add nullable `company_id` to `activity_log`.
- [ ] Add nullable `company_id` to `notification_preferences`.
- [ ] Add company relation to numbering model or compatibility bridge.
- [ ] Backfill default company.
- [ ] Add indexes for company-scoped reads.

### App / Service Implementation

- [ ] Add active/default company resolution.
- [ ] Keep single-company behavior working.
- [ ] Avoid full account switching for now.

### UI Implementation

- [ ] No full setup UX yet.
- [ ] Optional: surface company name in settings/header if safe.

### Validation

- [ ] Existing users can sign in.
- [ ] Existing orders load.
- [ ] Order creation works.
- [ ] Notifications load.
- [ ] Activity feed loads.
- [ ] Default company is backfilled consistently.

### Stop Conditions

- [ ] Core tables have company IDs populated.
- [ ] No user-facing regression.
- [ ] Company scoping can be used by later phases.

## Phase 6: Normalized Roles / Permissions

### Planning / Docs

- [ ] Confirm permission catalog.
- [ ] Confirm template role definitions.
- [ ] Confirm owner-only permissions.
- [ ] Confirm admin-delegated permissions.

### Database Migration

- [x] Create `roles`.
- [x] Create `permissions`.
- [x] Create `role_permissions`.
- [ ] Extend or replace `user_roles` with normalized shape.
- [x] Seed permissions.
- [x] Seed template roles.
- [ ] Backfill legacy role strings.
- [ ] Add owner guardrail checks.
- [ ] Add indexes.

### App / Service Implementation

- [ ] Update `getEffectivePermissions` to read normalized roles.
- [ ] Keep legacy fallback.
- [ ] Add role assignment service helpers.
- [ ] Add audit event creation for sensitive role changes.

### UI Implementation

- [ ] No full role editor required yet.
- [ ] User management can continue legacy UI with compatibility.

### Validation

- [ ] Existing users retain effective permissions.
- [ ] Owner/admin access remains intact.
- [ ] Multi-role merge works.
- [ ] At least one owner remains.
- [x] Permission seed is deterministic.

### Stop Conditions

- [ ] Permission helpers use normalized roles when available.
- [ ] Legacy role fallback remains.
- [ ] No owner lockout risk.

## Phase 7: Order Participants

### Planning / Docs

- [ ] Review `order_participants` canonical schema.
- [ ] Review assignment/reassignment lifecycle rules.
- [ ] Confirm participant responsibility types.

### Database Migration

- [ ] Create `order_participants`.
- [ ] Backfill appraiser participants from `orders.appraiser_id`.
- [ ] Backfill reviewer participants from `orders.reviewer_id`.
- [ ] Add indexes by order, user, responsibility, active state.
- [ ] Keep existing order assignment fields.

### App / Service Implementation

- [ ] Update resolver to prefer `order_participants`.
- [ ] Keep fallback to order assignment fields.
- [ ] Implement or align `assignOrderParticipant`.
- [ ] Keep `orders.appraiser_id` and `orders.reviewer_id` in sync.
- [ ] Update reassignment activity events.
- [ ] Update reassignment notifications.

### UI Implementation

- [ ] Preserve current assignment UI.
- [ ] Optional: show participant context if safe.

### Validation

- [ ] Existing orders resolve participants.
- [ ] Assignment notifications still work.
- [ ] Reassignment ends old responsibility.
- [ ] Reassignment starts new responsibility.
- [ ] Reviewer lifecycle represented.
- [ ] Appraiser/admin overlap still routes correctly.

### Stop Conditions

- [ ] No current order loses assignment visibility.
- [ ] Resolver works with both new and old models.
- [ ] Activity history attribution remains intact.

## Phase 8: Setup / Onboarding UX

### Planning / Docs

- [ ] Review `TENANT_SETUP_AND_SEEDING.md`.
- [ ] Review `USER_EXPERIENCE_FLOWS.md`.
- [ ] Define MVP setup wizard scope.
- [ ] Define skip/complete rules.

### Database Migration

- [ ] Add invitation tables if needed.
- [ ] Add setup progress settings if missing.
- [ ] Add workflow settings if needed.
- [ ] Add company order numbering settings if needed.

### App / Service Implementation

- [ ] Add setup state service.
- [ ] Add company profile update service.
- [ ] Add order numbering setup service.
- [ ] Add workflow defaults service.
- [ ] Add invite service.
- [ ] Add sample data trigger/service if included.

### UI Implementation

- [ ] Build setup wizard shell.
- [ ] Build company profile step.
- [ ] Build order numbering step.
- [ ] Build workflow defaults step.
- [ ] Build role template selection step.
- [ ] Build role permission review step.
- [ ] Build invite users step.
- [ ] Build add clients step.
- [ ] Build sample data option.
- [ ] Build review and launch step.

### Validation

- [ ] New owner sees setup wizard.
- [ ] Existing configured company sees dashboard.
- [ ] Progress persists.
- [ ] Owner can launch with defaults.
- [ ] Demo data is clearly marked if loaded.

### Stop Conditions

- [ ] Setup completes end to end in local/staging.
- [ ] No manual DB edits required for basic onboarding.

## Phase 9: Admin Communication Feed

### Planning / Docs

- [ ] Confirm feed item payload contract.
- [ ] Confirm admin visibility versus bell notification rules.
- [ ] Confirm filters needed for MVP.

### Database Migration

- [ ] Add/enrich activity fields if not already done.
- [ ] Add company/time index.
- [ ] Add order/time index.
- [ ] Add category/time index.
- [ ] Add importance/time index.
- [ ] Add feed RPC or view.

### App / Service Implementation

- [ ] Implement `getAdminCommunicationFeed(filters)`.
- [ ] Add feed query pagination.
- [ ] Add filters/search.
- [ ] Ensure permission check for feed access.

### UI Implementation

- [ ] Build feed component.
- [ ] Show actor to recipient/context.
- [ ] Show kind label.
- [ ] Show order number.
- [ ] Show body/note.
- [ ] Show timestamp.
- [ ] Show importance.
- [ ] Add filters.

### Validation

- [ ] Admin sees communication feed.
- [ ] Direct participant notes appear in feed.
- [ ] Admin bell does not receive every feed item.
- [ ] Feed uses order numbers, not UUIDs.
- [ ] Feed respects permissions.

### Stop Conditions

- [ ] Admin feed can serve as communication/audit monitoring surface.
- [ ] Bell remains personal/actionable.

## Phase 10: Seed / Reset / Demo Packaging

### Planning / Docs

- [ ] Review seed/reset strategy.
- [ ] Define demo company profile.
- [ ] Define demo users.
- [ ] Define demo roles.
- [ ] Define demo clients.
- [ ] Define demo orders by lifecycle status.
- [ ] Define demo activity and notification samples.

### Database Migration

- [ ] Add `seed_runs` if needed.
- [ ] Add demo markers where needed.
- [ ] Add indexes needed for demo cleanup if needed.

### App / Service Implementation

- [ ] Create reset demo script.
- [ ] Create seed demo company script.
- [ ] Create seed template roles script.
- [ ] Create seed users script.
- [ ] Create seed clients script.
- [ ] Create seed orders script.
- [ ] Create seed activity script.
- [ ] Create sparse seed notifications script.
- [ ] Add production guardrails.

### UI Implementation

- [ ] Optional: setup wizard sample data toggle.
- [ ] Optional: admin remove sample data action.

### Validation

- [ ] Local reset works.
- [ ] Seed is deterministic.
- [ ] Demo users can sign in.
- [ ] Demo orders have visible order numbers.
- [ ] Demo notifications are sparse and realistic.
- [ ] Demo cleanup removes demo records only.
- [ ] Scripts refuse destructive production reset by default.

### Stop Conditions

- [ ] Demo can be rebuilt without manual DB edits.
- [ ] Seed output supports sales/dev testing.

## Phase 11: Legacy Cleanup

### Planning / Docs

- [ ] Review `SCHEMA_DEPRECATION_TRACKER.md`.
- [ ] Mark candidate item safe before cleanup.
- [ ] Create explicit cleanup ticket/change per item or tight group.

### Database Migration

- [ ] Verify canonical replacement exists.
- [ ] Verify data is backfilled.
- [ ] Verify app no longer reads/writes item.
- [ ] Verify RPCs/functions no longer reference item.
- [ ] Verify views no longer depend on item.
- [ ] Verify RLS policies no longer depend on item.
- [ ] Backup/export historical data if needed.
- [ ] Drop/archive in isolated migration.

### App / Service Implementation

- [ ] Remove compatibility code only after DB cleanup is proven safe.
- [ ] Remove unused service paths.
- [ ] Remove unused type definitions.

### UI Implementation

- [ ] Remove UI compatibility fallbacks only after canonical data path is stable.

### Validation

- [ ] `rg` finds no references to dropped item.
- [ ] Dependency checks pass.
- [ ] Build/tests pass.
- [ ] Staging runs cleanly through validation window.
- [ ] Rollback plan exists.

### Stop Conditions

- [ ] Cleanup item is marked complete in tracker.
- [ ] No production errors after staging validation.
- [ ] Legacy path is not reintroduced.

## Final MVP Completion Checklist

- [ ] Identity model is consistent.
- [ ] Permissions are compatibility-layered or normalized.
- [ ] Responsibility resolver controls order routing.
- [ ] Activity payloads are durable and useful.
- [ ] Notifications are display-ready delivery records.
- [ ] Company foundation exists.
- [ ] Setup/onboarding can be completed.
- [ ] Admin feed separates visibility from bell alerts.
- [ ] Demo seed/reset is repeatable.
- [ ] No visible UUIDs in normal order-facing UI.
- [ ] Legacy cleanup is tracked and non-destructive.
