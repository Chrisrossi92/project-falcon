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

Canonical replacement:

None. This is the canonical user table.

Migration action:

- Confirm all required profile fields exist or can be added.
- Add `company_id`, `status`, and `settings` when company foundation begins.
- Ensure app-domain records reference `public.users.id`.

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

Canonical replacement:

None.

Migration action:

- Add/use `public.current_app_user_id()`.
- Audit RPCs, triggers, and RLS policies.

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
- Add compatibility permission mapping.
- Create normalized role tables.
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

Uses auth IDs and text roles.

Canonical replacement:

Permission check helper, such as `current_app_user_has_permission(permission_key)`.

Migration action:

- Keep until permission tables are active.
- Add compatibility wrapper that maps current app user to effective permissions.

Drop/archive condition:

Safe after admin checks use permission helpers.

Roadmap phase:

Phase 1, Phase 2, Phase 6.

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

Canonical replacement:

Workflow transition service/RPC using `current_app_user_id()`, permissions, and resolver.

Migration action:

- Patch identity first.
- Later centralize transition authorization and activity payload creation.

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

Canonical replacement:

`activity_log.actor_user_id references public.users(id)`.

Migration action:

- Add `actor_user_id`.
- Backfill through `users.auth_id`.
- Update `rpc_log_event`.

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

Canonical replacement:

Canonical logging RPC that uses `current_app_user_id()`, permissions/responsibility, and writes canonical fields/payload.

Migration action:

- Patch identity and authorization.
- Then enrich payload contract.

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

Canonical replacement:

Same table with canonical semantics:

- `user_id references public.users(id)`
- `company_id`
- `activity_event_id`
- `read_at`
- strict `payload`

Migration action:

- Confirm/repair `user_id` to public user IDs.
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

Fallback to `auth.uid()` can write wrong `user_id` if public user ID differs; no strict payload validation.

Canonical replacement:

RPC that expects public user ID and validates required order-related payload fields.

Migration action:

- Change fallback to `current_app_user_id()`.
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

Local migration filters `n.user_id = auth.uid()`, incompatible with canonical public user ID.

Canonical replacement:

Filter by `n.user_id = current_app_user_id()`.

Migration action:

- Patch in Phase 1.

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

FK references `public.users(id)`, but RLS/RPCs compare `user_id = auth.uid()`.

Canonical replacement:

Same table with `user_id = public.users.id` and RLS via `current_app_user_id()`.

Migration action:

- Patch RLS/RPCs.
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

Email trigger may interpret `notifications.user_id` as auth ID in some versions.

Canonical replacement:

Same table, with `to_user_id references public.users(id)`.

Migration action:

- Patch email trigger to treat notification recipient as public user ID.
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

Canonical replacement:

Trigger/service that writes recipient `public.users.id` and canonical payload.

Migration action:

- Patch identity behavior in Phase 1.
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

Recipient identity handling has changed over time; may assume notification user ID is auth ID.

Canonical replacement:

Trigger that treats `notifications.user_id` as `public.users.id`.

Migration action:

- Patch identity lookup.
- Use user preferences keyed by public user ID.

Drop/archive condition:

Do not drop unless email delivery is replaced by a service.

Roadmap phase:

Phase 1.

### Activity RLS policies

Disposition: Migrate/rebuild.

Current purpose:

Allow admins/reviewers or assigned appraisers to view/write activity.

Current risk:

Use JWT role claims and compare order assignment to `auth.uid()`.

Canonical replacement:

Policies using `current_app_user_id()`, permissions, and eventually `order_participants`.

Migration action:

- Patch identity first.
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

Role claims and auth IDs do not match canonical model.

Canonical replacement:

Policies using app user ID, permissions, company scope, and order participants.

Migration action:

- Patch identity.
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

`user_id = auth.uid()` conflicts with canonical `public.users.id`.

Canonical replacement:

`user_id = current_app_user_id()`.

Migration action:

- Patch in Phase 1.

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
