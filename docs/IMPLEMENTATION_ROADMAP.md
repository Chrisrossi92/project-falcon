# Implementation Roadmap

## Purpose

This roadmap translates Falcon's architecture docs and current schema audit into a disciplined implementation sequence. It exists to prevent ad hoc patching and to keep source changes tied to a clear phase.

Primary rule:

No source code changes should be made unless they map to a specific roadmap phase.

Core architectural decision:

`public.users.id` is Falcon's canonical application user identity.

Implications:

- Domain tables should reference `public.users.id`.
- `auth.users.id` is authentication identity only.
- Any database function using `auth.uid()` must map it through `public.users.auth_id` before comparing to domain records.
- Order assignment, activity actors, notification recipients, preferences, and responsibility records should use `public.users.id`.

## Phase 0: Contract Freeze

### Goal

Freeze the core system contracts before adding more behavior.

Contracts:

- App identity: `public.users.id`.
- Visible order identity: `orders.order_number`.
- Internal routing identity: `orders.id`.
- Activity log is durable history.
- Notifications are delivery records.
- Order responsibility beats global role for workflow and notification routing.
- Permission checks should move away from literal role names.

### Why It Matters

Falcon currently has several transitional paths: auth IDs, public user IDs, profile IDs, role strings, overlapping order views, and evolving notification payloads. Freezing contracts prevents new work from deepening those conflicts.

### Files / Areas Likely Affected

- Architecture docs only.
- Code review checklist.
- Future PR descriptions.

### Database Changes

None.

### App Changes

None.

### Validation Checklist

- New work references a roadmap phase.
- No new full UUIDs appear in user-facing notification/order labels.
- No new global-role-only notification routing is introduced.
- No new `auth.uid()` comparison to app-domain IDs is introduced.

### Stop Conditions Before Moving On

- Team agrees `public.users.id` is canonical.
- Team agrees not to add ad hoc role/status/notification logic.
- Existing docs reflect the contract.

## Phase 1: Identity Alignment Helpers And RPC Cleanup

Status: In progress.

Completed:

- Batch 1 notification identity alignment.
- Batch 2 Step 1 access/RLS identity fixes.
- Lifecycle-based reviewer order visibility.

Still pending:

- Activity actor write-path cleanup.
- Canonical activity payload enrichment.

### Goal

Make current auth-to-app-user behavior explicit and consistent.

Add helper functions and update RPCs/triggers so database logic maps `auth.uid()` to `public.users.id` before comparing or writing app-domain user references.

Implementation decisions now locked in:

- `public.users.id` is the canonical app identity.
- `public.current_app_user_id()` is the required bridge from Supabase auth identity to app identity.
- RLS and RPC authorization must compare app-domain user columns to `public.current_app_user_id()`.
- Reviewer visibility is lifecycle-based, not global-role-based.
- Global reviewer role must not grant all-order visibility.

### Why It Matters

Current schema paths mix:

- `auth.uid()`
- `public.users.id`
- `public.users.auth_id`
- `public.user_profiles.user_id`

This has already caused notification delivery bugs. It is the highest-risk foundation issue.

Role leakage also caused order visibility bugs: users with broad or overlapping roles could satisfy helper checks that were intended for appraiser assignment visibility. Lifecycle visibility must override global role visibility because order responsibility changes by status. A reviewer assigned to an order is not active for every lifecycle state, so reviewer access is limited to review-active or historical review statuses.

### Files / Areas Likely Affected

Database:

- Supabase migrations for helper functions.
- Notification RPCs.
- Notification preference RPCs/RLS.
- Email outbox trigger.
- Activity logging RPCs.
- Assignment notification triggers.

App:

- `src/lib/services/notificationsService.js`
- Any code passing recipient user IDs.
- Hooks that expose current user ID.

### Database Changes

Add helpers:

```sql
public.current_app_user_id()
public.current_app_user_role_names()
```

Update:

- `rpc_get_notifications`
- `rpc_get_unread_count`
- `rpc_mark_notification_read`
- `rpc_mark_all_notifications_read`
- `rpc_notification_create`
- `rpc_set_notification_preferences`
- notification preference RLS
- notification email trigger
- activity logging RPC authorization
- assignment notification trigger
- orders, clients, and activity RLS read/check paths where safe
- order lifecycle visibility policies for assigned reviewers

Completed Batch 1:

- Added `public.current_app_user_id()`.
- Updated notification read and mark-read RPCs.
- Updated notification creation fallback.
- Updated notification preference RLS and RPC.
- Updated assignment notification recipient semantics to `public.users.id`.
- Wired notification email queue lookup to app user identity.

Completed Batch 2 Step 1:

- Updated `current_is_admin()` to use `public.current_app_user_id()`.
- Updated `current_is_appraiser()` to require explicit appraiser role assignment.
- Patched orders, clients, and activity RLS read/check paths to use app identity.
- Dropped broad reviewer/all-order order policies.
- Added lifecycle-aware order select/update policy for assigned reviewers.
- Set frontend order views to `security_invoker = true` where supported.

### App Changes

- Ensure app code sends `public.users.id` for notification recipients.
- Ensure self-notification suppression compares against `public.users.id`.
- Ensure current-user hooks expose both auth id and public user id clearly when needed.

### Validation Checklist

- User where `public.users.id != auth_id` can receive bell notifications.
- Same user can read and mark notifications.
- Notification preferences work for same user.
- Assignment notifications still work.
- Activity notes still log correctly.
- No FK conflict when creating notifications.
- Reviewer assigned to a `new` or `in_progress` order cannot see it solely because `reviewer_id` matches.
- Reviewer assigned to `in_review`, `needs_revisions`, or `completed` orders can see review-active/historical work.
- Admin/owner still sees all orders.
- Assigned appraiser still sees assigned orders.
- Order views used by the frontend apply base-table RLS through `security_invoker` when supported.

### Stop Conditions Before Moving On

- All notification paths work with mismatched public user id/auth id.
- Local migrations and live DB behavior agree on notification user ID semantics.
- No known read/check RPC or RLS path compares domain `user_id` directly to `auth.uid()` without mapping.
- Remaining `auth.uid()` activity actor writes are isolated for the next Phase 1 batch.

## Phase 2: Permission Compatibility Layer

Status: In progress.

Completed:

- Step 1 permission foundation.
- `public.permissions`, `public.roles`, and `public.role_permissions` now exist.
- System permissions are seeded.
- Template roles `Owner`, `Admin`, `Appraiser`, `Reviewer`, and `Billing` are seeded.
- Template `role_permissions` are seeded.
- Step 2 compatibility permission resolver.
- `public.current_app_user_permission_keys()` returns effective permission keys for the current app user.
- `public.current_app_user_has_permission(text)` checks one permission.
- `public.current_app_user_has_any_permission(text[])` checks any requested permission.
- `public.current_app_user_has_all_permissions(text[])` checks all requested permissions.
- Resolver maps legacy `public.user_roles.role` rows to seeded template roles.
- Step 3 frontend permission helper plumbing.
- Added `PERMISSIONS` / `ALL_PERMISSION_KEYS`.
- Added `useEffectivePermissions()`, `useCan()`, and `useCanAny()`.
- Step 4 navigation permission plumbing is partially complete.
- `TopNav` now uses `CLIENTS_READ_ALL` to choose the full clients route, with the legacy admin fallback during permission loading/errors.
- TopNav avatar Settings link and mobile Settings nav item now use `SETTINGS_VIEW`.
- TopNav Settings visibility preserves existing behavior while permission loading/errors occur.
- `ProtectedRoute` now supports optional `requiredPermission`, `requiredAnyPermissions`, and `requiredAllPermissions` props.
- Step 4 route guard migration is partially complete.
- `/users` now uses `USERS_READ`.
- `/users/:userId` now uses `USERS_UPDATE`.
- `/users/new` now uses `USERS_CREATE`.
- `/users/view/:userId` now uses `USERS_READ`.
- `/settings` now uses `SETTINGS_VIEW`.
- `/settings/notifications` now uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- Migrated routes keep legacy role arrays as fallback only when the permission resolver errors.
- Step 4 CommandPalette filtering is complete.
- Orders, Clients, Users, Settings, and Notification Settings commands now have permission gates.
- CommandPalette preserves legacy command visibility during permission loading/errors.
- NewOrderButton now uses `ORDERS_CREATE`.
- Chris/appraiser validated: no New Order button.
- Abby/admin validated: New Order button visible.
- UserDetail edit action now uses `USERS_UPDATE`.
- UserCard edit/view behavior now uses `USERS_UPDATE`.
- Users nav visibility now uses `USERS_READ`.
- Users directory access model is finalized: `USERS_READ` grants read-only directory access, `USERS_UPDATE` grants edit actions, and `USERS_CREATE` grants user creation.
- `USERS_READ` is granted to Appraiser, Reviewer, and Billing template roles.
- `USERS_CREATE` is granted to the Admin template role.
- UsersIndex edit/create UI is fully permission-driven.
- Chris/appraiser validated read-only Users access.
- Chris/appraiser validated user view access works and edit/new user routes are blocked.
- Abby/admin validated full Users access.
- Abby/admin validated user view, edit, and new user routes work.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- Client create/edit UI and routes now use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions are gated by `CLIENTS_UPDATE_ALL` and `CLIENTS_DELETE`.
- Client drawer direct save/update path is gated by `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Chris/appraiser validated scoped read-only client access with no client Edit/Delete actions.
- Chris/appraiser client cards now say `Click to see orders`.
- Abby/admin validated client edit access and admin edit capability.

Still pending:

- Most route config and legacy role guards are not migrated yet.
- Remaining top-level navigation visibility outside Users/Settings still uses legacy paths where not yet migrated.
- Order creation route/form and workflow/action buttons are untouched and still use legacy route/form/action paths.
- Mobile login currently shows a blank screen; defer mobile-specific investigation unless it affects desktop or core live app flows.
- User edit form and role management are still legacy where not explicitly permission-gated.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Orders, Clients, Calendar, CommandPalette, routes, layout, styling, dashboard behavior, Supabase, RLS, backend, migrations, and workflow/action logic were untouched by the latest TopNav Settings permission slice.
- RLS/helper migration to permission checks.

### Goal

Introduce permission-based app checks without immediately changing the database role model.

### Why It Matters

Falcon's future role system uses configurable permission bundles. The app should stop adding new behavior tied directly to literal role names like `admin`, `reviewer`, or `appraiser`.

### Files / Areas Likely Affected

App:

- `src/lib/permissions/*`
- `src/lib/hooks/useRole*`
- Navigation components.
- Order action components.
- Admin/user management components.
- Activity/notification code touched by future work.

Docs:

- `docs/ROLE_PERMISSION_MODEL.md`

### Database Changes

Completed Step 1:

```txt
permissions
roles
role_permissions
```

Seeded:

- System permission catalog.
- Template roles: Owner, Admin, Appraiser, Reviewer, Billing.
- Template role permissions.

Completed Step 2:

- Added read-only compatibility resolver functions.
- Resolver reads legacy `public.user_roles.role` and maps role names to seeded template roles.
- Owner role effectively receives all seeded permissions.
- No RLS, frontend, or legacy helper behavior changed.

Validation note:

- Supabase SQL editor has no app auth context, so `public.current_app_user_id()` returns null there.
- Validate resolver behavior through an authenticated app request, or with manual user-id queries that simulate the same joins.

### App Changes

Completed Step 3:

```ts
PERMISSIONS
ALL_PERMISSION_KEYS
useEffectivePermissions()
useCan(permissionKey)
useCanAny(permissionKeys)
```

The new hooks fetch permission keys from `current_app_user_permission_keys()`. Existing navigation, order actions, and role checks are intentionally unchanged until Phase 2 Step 4.

Completed Step 4 partial navigation plumbing:

- `TopNav` uses `useCan(PERMISSIONS.CLIENTS_READ_ALL)` to choose `/clients` versus `/clients/cards`.
- `TopNav` preserves the legacy `isAdmin` fallback while permission loading is pending or the resolver errors.
- TopNav avatar Settings link and mobile Settings nav item use `useCan(PERMISSIONS.SETTINGS_VIEW)`.
- TopNav Settings visibility remains unchanged while the permission check is loading or errors.
- `ProtectedRoute` accepts optional permission gate props without changing existing route declarations.
- `/users` uses `requiredPermission={PERMISSIONS.USERS_READ}`.
- `/users/:userId` uses `requiredPermission={PERMISSIONS.USERS_UPDATE}`.
- `/users/new` uses `requiredPermission={PERMISSIONS.USERS_CREATE}`.
- `/users/view/:userId` uses `requiredPermission={PERMISSIONS.USERS_READ}`.
- `/settings` uses `requiredPermission={PERMISSIONS.SETTINGS_VIEW}`.
- `/settings/notifications` uses `requiredPermission={PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN}`.
- Migrated routes retain legacy role arrays as resolver-error fallback only.
- Other route config still uses legacy `roles`, `requireAdmin`, and `requireReviewer` guards.
- CommandPalette filters commands by permission:
  - Orders: `NAVIGATION_ORDERS_VIEW`
  - Clients: `NAVIGATION_CLIENTS_VIEW`
  - Users: `USERS_READ` or `NAVIGATION_USERS_VIEW`
  - Settings: `SETTINGS_VIEW` or `NAVIGATION_SETTINGS_VIEW`
  - Notification Settings: `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`
- CommandPalette shows the legacy full command list while permissions are loading or the resolver errors.
- NewOrderButton uses `useCan(PERMISSIONS.ORDERS_CREATE)` for visibility.
- NewOrderButton preserves the legacy `isAdmin` fallback while permission loading is pending or the resolver errors.
- UserDetail Edit action uses `useCan(PERMISSIONS.USERS_UPDATE)` for visibility.
- UserDetail preserves the legacy admin-ish fallback while permission loading is pending or the resolver errors.
- Existing self-profile/view behavior was not changed.
- UserCard edit/view behavior uses `useCan(PERMISSIONS.USERS_UPDATE)`.
- UserCard preserves the legacy admin fallback while permission loading is pending or the resolver errors.
- TopNav Users nav visibility uses `useCan(PERMISSIONS.USERS_READ)`.
- TopNav Users nav preserves the legacy admin fallback while permission loading is pending or the resolver errors.
- UsersIndex edit buttons, inline edit mode, Save controls, and user creation UI are permission-driven.
- UsersIndex gates edit behavior with `USERS_UPDATE`.
- UsersIndex gates New user behavior with `USERS_CREATE`.
- Chris/appraiser has read-only directory access.
- Chris/appraiser can access user view routes and is blocked from edit/new user routes.
- Abby/admin has full Users access.
- Abby/admin can access user view, edit, and new user routes.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- ClientsIndex gates New Client with `CLIENTS_CREATE`.
- ClientDetail gates Edit Client and inline edit form with `CLIENTS_UPDATE_ALL`.
- `/clients/new` uses `requiredPermission={PERMISSIONS.CLIENTS_CREATE}`.
- `/clients/edit/:clientId` uses `requiredPermission={PERMISSIONS.CLIENTS_UPDATE_ALL}`.
- ClientDetailPanel gates Edit with `CLIENTS_UPDATE_ALL` and Delete with `CLIENTS_DELETE`.
- ClientDrawerContent gates the direct save/update path with `CLIENTS_UPDATE_ALL`.
- ClientCard text now uses `CLIENTS_UPDATE_ALL`: users with edit permission see `Click to see orders & edit`; read-only users see `Click to see orders`.
- Client query/KPI/scoped visibility logic was not changed.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser can view scoped clients, does not see client Edit/Delete actions, and sees client cards that say `Click to see orders`.
- Abby/admin can edit clients and sees admin edit capability.
- User edit form and role management were not otherwise changed.
- Order creation route, order form, and workflow/action buttons were not changed.
- Order workflow/action buttons were not changed.
- Orders, Clients, Calendar, CommandPalette, routes, layout, styling, dashboard behavior, Supabase, RLS, backend, migrations, and workflow/action logic were not changed by the latest TopNav Settings permission slice.

Still needed:

```ts
getEffectivePermissions(user)
canUserPerform(userId, permissionKey, context)
```

### Validation Checklist

- Existing admin/appraiser/reviewer behavior remains unchanged.
- New checks use permission helpers.
- Navigation can be gated by permission helpers.
- `TopNav` clients path respects `CLIENTS_READ_ALL` and falls back to legacy admin behavior while permissions load.
- TopNav avatar Settings link and mobile Settings nav item use `SETTINGS_VIEW`.
- TopNav Settings visibility remains unchanged during permission loading/errors.
- `/users` route guard uses `USERS_READ`.
- `/users/:userId` route guard uses `USERS_UPDATE`.
- `/users/new` route guard uses `USERS_CREATE`.
- `/users/view/:userId` route guard uses `USERS_READ`.
- `/settings` route guard uses `SETTINGS_VIEW`.
- `/settings/notifications` route guard uses `NOTIFICATIONS_PREFERENCES_MANAGE_OWN`.
- Legacy role arrays on migrated routes are fallback only when the permission resolver errors.
- Chris, Pam, and Abby validated access successfully.
- Chris/appraiser validated no New Order button.
- Abby/admin validated New Order button visible.
- UserDetail edit action uses `USERS_UPDATE`.
- Existing self-profile/view behavior remains unchanged.
- UserCard edit/view behavior uses `USERS_UPDATE`.
- TopNav Users nav visibility uses `USERS_READ`.
- Appraiser, Reviewer, and Billing template roles include `USERS_READ`.
- Admin template role includes `USERS_CREATE`.
- UsersIndex edit/create UI is permission-driven.
- Chris/appraiser validated read-only Users access.
- Chris/appraiser validated user view access works and edit/new user routes are blocked.
- Abby/admin validated full Users access.
- Abby/admin validated user view, edit, and new user routes work.
- Desktop validation passed for the TopNav Settings permission patch where applicable.
- Client create/edit UI and routes use `CLIENTS_CREATE` and `CLIENTS_UPDATE_ALL`.
- Remaining client panel Edit/Delete actions use `CLIENTS_UPDATE_ALL` and `CLIENTS_DELETE`.
- Client drawer direct save/update path uses `CLIENTS_UPDATE_ALL`.
- ClientCard text reflects `CLIENTS_UPDATE_ALL`.
- Client query/KPI/scoped visibility logic remains legacy and responsibility-dependent.
- `/clients` and `/clients/cards` visibility behavior was not changed.
- Chris/appraiser validated scoped read-only client access, no client Edit/Delete actions, and read-only card text.
- Abby/admin validated client edit access and admin edit capability.
- CommandPalette only shows Orders, Clients, Users, Settings, and Notification Settings commands when the user has the corresponding permission.
- CommandPalette preserves legacy behavior during permission loading/errors.
- Order workflow/action buttons remain untouched.
- Order creation route and order form remain untouched.
- Orders, Clients, Calendar, CommandPalette, routes, layout, styling, Supabase/RLS, backend, migrations, dashboard behavior, and workflow/action logic remain untouched by the latest TopNav Settings permission slice.
- User edit form and role management remain otherwise untouched.
- Dashboard behavior, Supabase, and RLS remain untouched.
- Mobile login currently shows a blank screen; mobile-specific investigation is deferred unless it affects desktop or core live app flows.
- Existing tests/build pass.

### Stop Conditions Before Moving On

- No new feature code uses role strings directly when a permission helper could answer the question.
- Current role behavior is preserved through compatibility mapping.
- Route config migration to permission props is planned before broader UI gate replacement.

## Phase 3: Responsibility Resolver

### Goal

Implement a central responsibility resolver using current order fields first.

Function:

```ts
resolveOrderParticipants(order, eventContext)
```

### Why It Matters

Notification and workflow behavior should be based on order responsibility, not global role. This prevents cases like a global admin assigned as appraiser being treated as admin for note routing.

### Files / Areas Likely Affected

App:

- `src/lib/orders/resolveOrderParticipants.*`
- `src/lib/services/notificationsService.js`
- `src/components/activity/ActivityNoteForm.jsx`
- Workflow modal components.
- Status transition utilities.

Docs:

- `docs/SYSTEM_DATA_MODEL.md`
- `docs/ORDER_LIFECYCLE_MODEL.md`

### Database Changes

None required in this phase.

### App Changes

Resolver should initially use:

- `order.appraiser_id`
- `order.reviewer_id`
- `order.status`
- current public user id
- event context

It should return:

- active participants
- visible user ids
- bell recipient ids
- passive participant ids
- actor role on order
- recipient contexts

### Validation Checklist

- Appraiser note routes to reviewer.
- Reviewer note routes to appraiser.
- Admin assigned as appraiser routes as appraiser.
- Self-notification suppression still works.
- Missing recipient skip still works.
- Reviewer lifecycle cases behave as documented.

### Stop Conditions Before Moving On

- Activity note notifications and workflow note notifications both use the resolver or are ready to be migrated to it.
- No duplicated appraiser/reviewer recipient logic remains in newly touched code.

## Phase 4: Activity / Notification Payload Contract Enforcement

### Goal

Make activity events and notifications consistently carry actor, recipient, order number, event type, importance, and communication context.

### Why It Matters

UI should render from explicit payload contracts, not inferred UUIDs, role strings, or generic fallback titles.

### Files / Areas Likely Affected

App:

- `src/lib/services/notificationsService.js`
- `src/components/notifications/NotificationBell.jsx`
- Activity logging helpers.
- Activity log components.
- Workflow modal emit paths.

Database:

- `rpc_notification_create`
- `rpc_log_event`
- activity feed view/RPCs

### Database Changes

Optional additive changes:

- Add nullable `payload` column to activity table if not already effectively represented by `detail`.
- Add nullable `company_id`, `category`, `title`, `body`, `visibility`, `importance`, `actor_user_id` later if needed.
- Do not drop legacy `detail`/`message` fields yet.

### App Changes

Enforce notification payload:

- `order_id`
- `order_number`
- `event_key`
- `importance`
- `actor.user_id`
- `actor.name`
- `actor.role_on_order`
- `recipient.user_id`
- `recipient.name`
- `recipient.role_on_order`
- `communication.kind`
- `communication.kind_label`
- `communication.direction_label`

### Validation Checklist

- Bell displays human title, body, and visible order number.
- No full UUID is visible in normal notification UI.
- Admin feed prototypes can use payload without extra queries.
- Activity events keep enough context after reassignment/name changes.

### Stop Conditions Before Moving On

- All order-related notifications include `payload.order_number`.
- All note notification titles are actor/action based.
- Existing activity log remains readable.

## Phase 5: Company Foundation

### Goal

Add company/tenant foundation without breaking the current single-company app.

### Why It Matters

Falcon should become sellable to other appraisal firms. Company scoping must be introduced before normalized roles, setup UX, company settings, or SaaS account switching.

### Files / Areas Likely Affected

Database:

- New company/settings migrations.
- Backfill scripts.
- RLS policies later.

App:

- Company context provider later.
- Setup/checklist later.
- Settings screens later.

### Database Changes

Add:

```txt
companies
company_settings
```

Add nullable `company_id` to:

- `users`
- `orders`
- `clients`
- `notifications`
- `activity_log`
- `notification_preferences`
- order numbering tables

Backfill a single default company.

### App Changes

Minimal in this phase:

- Read active/default company where needed.
- Do not require full account switching yet.

### Validation Checklist

- Existing app works with all current data backfilled to default company.
- Order creation still works.
- Notification reads still work.
- Activity reads still work.
- Existing users can still sign in.

### Stop Conditions Before Moving On

- Default company exists in all environments.
- Nullable company columns are populated for core data.
- No user-facing behavior regressed.

## Phase 6: Normalized Roles / Permissions

Status: Not started as a full phase.

Foundation already completed in Phase 2 Step 1:

- `public.permissions`
- `public.roles`
- `public.role_permissions`
- Template roles Owner/Admin/Appraiser/Reviewer/Billing
- Template role-permission seeds

Still pending for Phase 6:

- Normalized user role assignment model.
- Backfill from legacy text `public.user_roles`.
- Owner guardrails.
- Role editor/admin UI.
- Wiring app/RLS/RPC behavior to permission checks.

### Goal

Introduce database-backed configurable roles and permissions.

### Why It Matters

This is the foundation for Discord-like editable role bundles, custom company roles, owner delegation, and SaaS-friendly setup.

### Files / Areas Likely Affected

Database:

- `roles`
- `permissions`
- `role_permissions`
- normalized `user_roles`
- seed migrations/scripts

App:

- Role editor later.
- User invitation/management.
- Permission hooks.

### Database Changes

Already added in Phase 2 Step 1:

```txt
roles
permissions
role_permissions
```

Still needed: either create a new normalized join table or extend `user_roles` with:

- `role_id`
- `company_id`
- `assigned_by`
- `assigned_at`
- `expires_at`
- `is_active`

Seed template roles:

- Owner
- Admin
- Appraiser
- Reviewer
- Trainee
- Inspector / Field Rep
- Billing
- Client Portal User

Backfill existing text roles into normalized rows.

### App Changes

- Update effective permission loading to use normalized roles when available.
- Keep legacy text role fallback.
- Do not remove compatibility paths yet.

### Validation Checklist

- Existing users retain effective permissions.
- Owner/admin checks still work.
- Multi-role users resolve additive permissions.
- At least one owner exists.
- Role permission seeds are deterministic.

### Stop Conditions Before Moving On

- Permission compatibility layer reads normalized roles successfully.
- Legacy role fallback remains in place.
- No owner lockout risk.

## Phase 7: Order Participants

### Goal

Add `order_participants` as the central order responsibility model.

### Why It Matters

This unlocks lifecycle-aware responsibility, reviewer activation windows, inspector/task participation, watchers, tagged participants, billing responsibility, and clean notification routing.

### Files / Areas Likely Affected

Database:

- `order_participants`
- backfill migration from `orders.appraiser_id` and `orders.reviewer_id`

App:

- Responsibility resolver.
- Assignment UI.
- Notification routing.
- Workflow transitions.
- Activity payload creation.

### Database Changes

Add:

```txt
order_participants
- order_id
- user_id
- responsibility_type
- task_id
- active_from_status
- active_until_status
- is_active
- assigned_by
- assigned_at
- ended_at
- metadata
```

Backfill:

- appraiser participant from `orders.appraiser_id`
- reviewer participant from `orders.reviewer_id`

### App Changes

- Resolver prefers `order_participants`.
- Fallback to `orders.appraiser_id` / `orders.reviewer_id`.
- Assignment changes update participants and order convenience fields.

### Validation Checklist

- Existing orders resolve participants correctly.
- Assignment notifications still work.
- Reassignment ends old responsibility and starts new responsibility.
- Reviewer lifecycle can be represented.
- Appraiser/admin overlap still routes correctly.

### Stop Conditions Before Moving On

- Resolver works with both participant table and legacy order fields.
- No current order loses assignment visibility.
- Activity history remains attributed correctly.

## Phase 8: Setup / Onboarding UX

### Goal

Build first-run company setup and onboarding experience.

### Why It Matters

Falcon must be repeatable and sellable to new appraisal firms. Owners should configure company settings, numbering, workflow, roles, users, clients, and sample data without developer help.

### Files / Areas Likely Affected

App:

- Setup wizard routes/components.
- Company settings pages.
- Role selection UI.
- Invitation UI.
- Client setup UI.

Database:

- `company_settings`
- invitation tables if implemented in this phase
- seed/demo markers

### Database Changes

Potential additions:

```txt
company_invitations
invitation_roles
company_order_numbering or settings JSON
company_workflow_settings or settings JSON
```

### App Changes

Build wizard:

1. Company profile
2. Order numbering
3. Workflow defaults
4. Template role selection
5. Role permission review
6. Invite users
7. Add clients
8. Sample data
9. Review and launch

### Validation Checklist

- New owner sees setup wizard.
- Existing configured company sees dashboard.
- Setup progress persists.
- Demo data option is clearly labeled.
- Owner can launch with recommended defaults.

### Stop Conditions Before Moving On

- Setup can be completed end to end in local/staging.
- No manual Supabase dashboard edits required for basic onboarding.

## Phase 9: Admin Communication Feed

### Goal

Build admin/owner communication feed from activity events, separate from bell notifications.

### Why It Matters

Admins need visibility into all communication without receiving every item as an urgent alert.

### Files / Areas Likely Affected

App:

- Admin dashboard.
- Communication feed component.
- Activity feed service/RPC.
- Filters/search.

Database:

- Activity feed RPC/view enrichment.
- Indexes on activity fields.

### Database Changes

Add/enrich activity fields if not already done:

- `company_id`
- `category`
- `importance`
- `visibility`
- `payload`

Add indexes for:

- company/time
- order/time
- category/time
- importance/time

### App Changes

Feed item format:

```txt
Chris Rossi → Pam Casper · Appraiser note · ORD-26001
Any revisions yet?
10:42 AM · normal
```

Filters:

- person
- order
- client
- category
- status
- importance

### Validation Checklist

- Admin sees feed without bell noise.
- Direct participant notifications still go to bell.
- Feed never shows internal UUID as visible order label.
- Feed respects admin visibility permissions.

### Stop Conditions Before Moving On

- Admin feed can replace ad hoc monitoring views for communication.
- Bell notifications remain personal/actionable.

## Phase 10: Seed / Reset / Demo Company Packaging

### Goal

Make Falcon resettable, seedable, and demo-ready for repeatable sales/dev environments.

### Why It Matters

Falcon should be sellable to other appraisal firms and easy to test. A reset/seed system prevents brittle manual setup and makes demos consistent.

### Files / Areas Likely Affected

Scripts:

- `scripts/db/reset-demo.*`
- `scripts/db/seed-demo-company.*`
- `scripts/db/seed-template-roles.*`
- `scripts/db/seed-users.*`
- `scripts/db/seed-clients.*`
- `scripts/db/seed-orders.*`
- `scripts/db/seed-activity.*`

Database:

- `seed_runs`
- demo metadata columns/JSON where needed

Docs:

- `docs/TENANT_SETUP_AND_SEEDING.md`

### Database Changes

Optional:

```txt
seed_runs
metadata.is_demo
metadata.seed_key
```

### App Changes

None required unless adding UI for loading/removing sample data.

### Validation Checklist

- Local reset creates clean demo company.
- Seed creates users, roles, clients, orders, activity, and sparse notifications.
- Seeded orders have readable order numbers.
- Demo records can be removed safely.
- Scripts refuse production destructive reset by default.

### Stop Conditions Before Moving On

- Demo can be rebuilt from scratch without manual DB edits.
- Seed output is deterministic enough for tests and demos.

## Cross-Phase Rules

- Prefer additive database changes before destructive cleanup.
- Keep compatibility views/functions until app code is fully migrated.
- Do not remove legacy columns until reads/writes are proven unused.
- Do not widen lifecycle statuses until UI and transition logic support them.
- Do not build inspector/client portal workflows before identity, permissions, and responsibility resolver are stable.
- Every order-related notification must include visible `order_number`.
- Every source change should cite the roadmap phase it belongs to.

## Suggested Phase Order

1. Phase 0: Contract freeze.
2. Phase 1: Identity alignment helpers and RPC cleanup.
3. Phase 2: Permission compatibility layer.
4. Phase 3: Responsibility resolver.
5. Phase 4: Activity/notification payload enforcement.
6. Phase 5: Company foundation.
7. Phase 6: Normalized roles/permissions.
8. Phase 7: Order participants.
9. Phase 8: Setup/onboarding UX.
10. Phase 9: Admin communication feed.
11. Phase 10: Seed/reset/demo packaging.

Some phases can overlap in design, but implementation should avoid crossing phase boundaries in a single change unless the dependency is explicit and small.
