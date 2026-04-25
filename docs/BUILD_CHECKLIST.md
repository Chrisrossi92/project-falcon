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
- [ ] Activity notes still log.
- [x] No FK conflict on notification insert.
- [x] Reviewer assigned to `new` or `in_progress` order is not granted visibility solely by reviewer assignment.
- [x] Reviewer assigned to `in_review`, `needs_revisions`, or `completed` order keeps review-active/historical visibility.
- [x] Admin/owner keeps all-order visibility.
- [x] Assigned appraiser keeps assigned-order visibility.
- [x] Legacy broad policies `orders_read_all`, `orders_select_policy`, `orders_update_policy`, and `allow_reviewer_update_status` are dropped/replaced.
- [x] `current_is_appraiser()` returns false for reviewer/admin users unless they have an explicit appraiser role row.
- [ ] Confirm live `/orders` view/RPC uses RLS via `security_invoker`; replace with scoped RPC if unsupported.
- [ ] Validate remaining activity write paths store actors as `public.users.id`.

### Stop Conditions

- [ ] All known RPCs avoid direct app-domain comparison to `auth.uid()`.
- [x] Local and live notification user ID semantics match.
- [x] Notification identity mismatch regression is resolved.
- [x] Reviewer role leakage into all-order visibility is resolved.
- [ ] Activity actor identity mismatch is resolved.

## Phase 2: Permission Compatibility Layer

### Planning / Docs

- [x] Review `ROLE_PERMISSION_MODEL.md`.
- [x] Review `getEffectivePermissions` and `canUserPerform` contracts.
- [x] Define initial permission key catalog.
- [ ] Define legacy role-to-permission map for compatibility resolver.

### Database Migration

- [x] Create `public.permissions`.
- [x] Create `public.roles`.
- [x] Create `public.role_permissions`.
- [x] Seed system permissions.
- [x] Seed template roles: Owner, Admin, Appraiser, Reviewer, Billing.
- [x] Seed template role permissions.
- [x] Do not wire permission tables to RLS/helpers/app behavior yet.

### App / Service Implementation

- [ ] Create permission constants.
- [ ] Create legacy role-to-permission mapping.
- [ ] Implement `getEffectivePermissions(userId, companyId)`.
- [ ] Implement `canUserPerform(userId, permissionKey, context)`.
- [ ] Implement Phase 2 Step 2 compatibility permission resolver.
- [ ] Add `useEffectivePermissions()`.
- [ ] Add `useCan(permissionKey)`.
- [ ] Preserve current role behavior through compatibility.

### UI Implementation

- [ ] Gate new navigation logic through permission helpers.
- [ ] Gate new actions through permission helpers.
- [ ] Avoid new direct role-string checks.

### Validation

- [x] Permission seed migration exists.
- [x] Template roles are seeded.
- [x] Template role permissions are seeded.
- [x] No existing behavior is wired to permissions yet.
- [ ] Existing owner/admin/appraiser/reviewer behavior is preserved.
- [ ] Navigation still appears for expected users.
- [ ] Order actions still appear for expected users.
- [ ] Build/tests pass.

### Stop Conditions

- [ ] New feature code can use permission helpers.
- [ ] No new code path requires hardcoded role names.
- [ ] Compatibility resolver can read seeded permissions without changing existing behavior.

## Phase 3: Responsibility Resolver

### Planning / Docs

- [ ] Review `resolveOrderParticipants` contract.
- [ ] Review `getOrderResponsibility` contract.
- [ ] Review lifecycle participant rules.

### Database Migration

- [ ] No required DB migration.

### App / Service Implementation

- [ ] Implement `getOrderResponsibility(order, userId)`.
- [ ] Implement `resolveOrderParticipants(order, eventContext)`.
- [ ] Use current `orders.appraiser_id`.
- [ ] Use current `orders.reviewer_id`.
- [ ] Include status/lifecycle awareness.
- [ ] Include self-notification suppression.
- [ ] Return actor role on order.
- [ ] Return bell recipients.
- [ ] Return visibility candidates.

### UI Implementation

- [ ] Replace duplicated note recipient logic in activity note flow.
- [ ] Replace duplicated workflow note recipient logic where touched.
- [ ] Preserve current UI behavior.

### Validation

- [ ] Appraiser note routes to reviewer.
- [ ] Reviewer note routes to appraiser.
- [ ] Admin assigned as appraiser routes as appraiser.
- [ ] Missing recipient skips cleanly.
- [ ] Self notification skips cleanly.
- [ ] Reviewer lifecycle cases match docs.

### Stop Conditions

- [ ] Activity note notifications use resolver.
- [ ] Workflow note notifications use resolver or have migration ticket.
- [ ] No new appraiser/reviewer routing logic is added outside resolver.

## Phase 4: Activity / Notification Payload Contract

### Planning / Docs

- [ ] Review `createActivityEvent`.
- [ ] Review `createNotification`.
- [ ] Review `emitOrderEvent`.
- [ ] Confirm required `NotificationPayload` fields.

### Database Migration

- [ ] Add activity canonical nullable fields if needed.
- [ ] Add notification `company_id` if Phase 5 has started.
- [ ] Add notification `activity_event_id` if needed.
- [ ] Keep legacy fields during transition.
- [ ] Do not drop `detail`, `message`, `is_read`, or `read` yet.

### App / Service Implementation

- [ ] Enforce order notification payload includes `order_id`.
- [ ] Enforce order notification payload includes `order_number`.
- [ ] Enforce actor object.
- [ ] Enforce recipient object when direct recipient exists.
- [ ] Enforce communication context.
- [ ] Make notification title/body display-ready.
- [ ] Ensure RPC errors are checked and surfaced.
- [ ] Implement or align `emitOrderEvent`.

### UI Implementation

- [ ] Bell shows title normally.
- [ ] Bell shows body normally.
- [ ] Bell shows separate clickable order number.
- [ ] Bell never shows full UUID as normal visible label.
- [ ] Activity log displays enriched actor/context where available.

### Validation

- [ ] Note notification title is `{Actor Name} added a note`.
- [ ] Note body is note text.
- [ ] Order line shows `order_number`.
- [ ] No UUID leaks in normal notification UI.
- [ ] Activity event retains context after reassignment.
- [ ] Admin feed prototype can render from payload.

### Stop Conditions

- [ ] All order notifications include `payload.order_number`.
- [ ] All new activity events follow canonical payload shape.
- [ ] Existing activity feed remains readable.

## Phase 5: Company Foundation

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
