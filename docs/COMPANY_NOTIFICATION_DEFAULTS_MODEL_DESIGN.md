# Company Notification Defaults Model Design

## Purpose

Phase 10D7 designs the future company-safe notification defaults model before implementation.

This is documentation-only plus read-only schema/code inspection. It does not add migrations, backend behavior, runtime code, UI changes, route changes, registry changes, tests, permission seeds, RLS/RPC edits, bootstrap seeding, Owner Setup configuration, readiness authority, product-mode authority, module-authoritative security, Vendor/Client activation, notification-default writes, or broad settings writes.

Notification defaults are delivery policy defaults. They are not the source of operational truth and they are not access authority. Activity remains durable memory; permissions, RLS/RPCs, route guards, assignment visibility, and workflow logic remain canonical authority.

## Sources Inspected

Documentation inspected:

- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`
- `docs/notifications_activity_inventory.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema and code inspected:

- `supabase/migrations/20260518000000_baseline_extensions_and_schema.sql`
- `supabase/migrations/20260518001000_baseline_rls_policies_triggers_grants.sql`
- `supabase/migrations/20260518002000_baseline_static_seed_data.sql`
- `supabase/migrations/20260518013000_company_order_derived_read_safety.sql`
- `supabase/migrations/20260518024000_company_notification_policy_rpc_hardening.sql`
- `supabase/migrations/20260518026000_company_explicit_authenticated_grants.sql`
- `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`
- `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`
- `src/lib/services/notificationsService.js`
- `src/features/notifications/api.js`
- `src/features/notifications/hooks.js`
- `src/lib/services/api.js`
- `src/lib/api/notifications.js`
- `src/lib/hooks/useNotifications.js`
- `src/lib/bootstrap/ensureNotificationPrefs.js`
- `src/components/settings/NotificationPrefsPanel.jsx`
- `src/pages/settings/NotificationSettings.jsx`

## Current Notification / Preference Model Found

Current global/event policy model:

- `public.notification_policies`
  - `id uuid`
  - `key text unique`
  - `rules jsonb`
  - `updated_by uuid`
  - `updated_at timestamptz`
- Static seed rows define event rules such as:
  - `order.new_assigned`
  - `order.sent_to_review`
  - `order.sent_back_to_appraiser`
  - `order.reassigned`
  - `order.ready_for_client`
  - `order.completed`
  - `order.review_cleared`
  - note and reminder event keys
- `src/lib/services/notificationsService.js` reads `notification_policies` by event key and uses role rules such as `roles.appraiser.in_app.default` and `roles.admin.in_app.required` to decide in-app notification fan-out.

Current user preference models:

- `public.notification_prefs`
  - primary key `user_id`
  - `dnd_until`
  - `snooze_until`
  - `email_enabled`
  - `push_enabled`
  - `categories jsonb`
  - `updated_at`
- `public.user_notification_prefs`
  - primary key `(user_id, type, channel)`
  - `enabled`
  - `meta jsonb`
- `public.notification_preferences`
  - older per-user email preference table
  - `email_enabled`, `email_address`, `digest_mode`, `quiet_hours`

Current preference RPCs/helpers:

- `_default_notification_categories()`
- `_ensure_notification_prefs_for(user_uuid uuid)`
- `rpc_notification_prefs_ensure()`
- `rpc_notification_prefs_get(p_user_id uuid default null)`
- `rpc_notification_prefs_update(patch jsonb)`
- `rpc_notification_prefs_update(patch jsonb, p_user_id uuid default null)`
- `rpc_set_notification_pref(...)`
- `rpc_set_notification_pref_v1(...)`
- `rpc_set_notification_preferences(...)`

Current notification creation/reading model:

- `rpc_notification_create(jsonb)` derives `notifications.company_id` from source order company for order-tied notifications.
- Authenticated order-tied notification creation requires current-company membership, readable/updateable source order, and active company membership for the recipient.
- Authenticated non-order notification creation is blocked.
- Service-role non-order notification creation is preserved.
- Notification list/read/dismiss RPCs preserve personal notification UX while filtering unreadable order-tied notifications.

Current frontend behavior:

- `NotificationPrefsPanel` and notification feature APIs are user-preference oriented.
- `NotificationPrefsPanel` has labels such as "Company Defaults (Admin)", but the inspected wrapper names are misleading: `rpcGetNotificationPolicies()` calls `rpc_notification_prefs_get`, and `rpcSetNotificationPolicy(...)` maps to `rpc_set_notification_pref_v1(...)`. That is user preference state, not a confirmed company-default model.
- `Settings` manages current-user DND/snooze and profile color. It does not configure company notification defaults.

## Current Scope Classification

The current model is:

- Global/event-scoped for `notification_policies`.
- User-scoped for `notification_prefs`.
- User/type/channel-scoped for `user_notification_prefs`.
- User email-preference-scoped for `notification_preferences`.
- Company-aware for created notification rows through `notifications.company_id` and order-derived authorization.

The current model is not:

- Company-default scoped.
- Product/package default scoped.
- Owner Setup configurable.
- Bootstrap seeded per company.
- A company policy resolver with fallback precedence.

## Gaps For Multi-Company Notification Defaults

Known gaps:

- No confirmed `company_id`-keyed notification defaults table.
- No guarded current-company RPC for company notification-default reads/updates.
- No clear fallback order among user overrides, company defaults, and global event policies.
- Global `notification_policies` are readable by authenticated users for current frontend compatibility.
- Existing UI labels around "company defaults" do not correspond to a company-default table.
- User preference tables must not be reused as company defaults.
- Bootstrap cannot safely seed notification defaults because no company-specific model exists.
- Readiness cannot truthfully mark company notification defaults complete.
- Vendor/Client notification defaults are not safe to infer from product-mode/module metadata.

## Desired Company-Safe Defaults Model

Future notification defaults should be company-scoped and event/category scoped.

Recommended table model:

- `company_id uuid not null references public.companies(id) on delete restrict`
- `event_key text not null`
- `channel text not null`
- `default_enabled boolean not null`
- `required boolean not null default false`
- `role_key text null` for role-specific defaults when needed
- `category text null`
- `priority text null`
- `settings jsonb not null default '{}'::jsonb` for narrow metadata only if needed
- `is_active boolean not null default true`
- `created_at`, `updated_at`
- `created_by`, `updated_by` if consistent with company audit patterns
- unique `(company_id, event_key, channel, coalesce(role_key, ''))` or an equivalent normalized uniqueness strategy

Alternative model:

- A company notification-defaults table with one row per company and a validated JSON document may be acceptable only if queries, constraints, and audit needs remain small. It should still be updated through a narrow guarded RPC and should not live as arbitrary `companies.settings` JSON.

Recommended channels:

- Start with `in_app`.
- Add `email` only after email delivery semantics, required delivery, and opt-out behavior are explicit.
- Treat push/SMS as future channels unless implemented.

Recommended event vocabulary:

- Reuse existing event keys from `notification_policies`.
- Do not allow arbitrary frontend-created event keys.
- Validate event keys against the global/system event registry or a future notification event lookup.

## Fallback Precedence

Future notification delivery should resolve settings in a clear order:

1. Required system rule.
   - A required platform rule may force delivery where operational safety demands it.
   - Required rules must be rare and documented.
2. User override.
   - User-level preference can disable optional delivery if the event/channel is not required.
3. Company default.
   - Company defaults define default delivery posture for roles/events/channels.
4. Global/system default.
   - `notification_policies` or future system policy registry provides product fallback.

If no company default exists, the resolver should fall back to global/system defaults and readiness should report company defaults as unknown/deferred, not silently complete.

## Relationship To User-Level Preferences

User preferences remain personal delivery choices.

They may cover:

- Do Not Disturb.
- Snooze.
- Email/push opt-in.
- Category preferences.
- Type/channel preferences.

They must not:

- Define company defaults.
- Activate company notification policy.
- Grant operational visibility.
- Make a user eligible for notifications outside their company.
- Override required system notifications unless the required rule allows it.

Future company defaults should seed initial user preference behavior only through an explicit resolver or onboarding path. They should not directly mutate existing user preference rows without user intent or a documented migration.

## Relationship To Notification Policy Engine

Current fan-out reads global `notification_policies` in frontend service code and then calls `rpc_notification_create(...)` for each prepared notification.

Future direction:

- Move default resolution closer to backend/server-side fan-out where possible.
- Keep global `notification_policies` as system event definitions or fallback policy.
- Add a company-default resolver that takes `company_id`, `event_key`, `recipient role`, and `channel`.
- Ensure `rpc_notification_create(...)` continues enforcing company/order/recipient safety.
- Prefer a future server-side fan-out RPC for policy resolution and recipient filtering rather than broadening browser-side policy interpretation.

Company defaults should influence whether to notify. They must not influence whether the recipient is allowed to see the source order or packet.

## Bootstrap Relationship

Bootstrap should not seed notification defaults yet.

Current bootstrap wrapper behavior is correct to return skipped/unknown warnings for notification defaults because the company-safe model is not implemented.

Later bootstrap may seed default notification settings only after:

- company notification-default storage exists;
- event/channel vocabulary is validated;
- guarded read/update RPCs exist;
- fallback precedence is implemented;
- readiness can verify defaults;
- product-safe default bundles are approved for Staff, AMC, Vendor, Client, and Hybrid contexts without activating unavailable surfaces.

Bootstrap should never seed notification defaults through broad `companies.settings`, `operating_mode_settings`, product-mode metadata, module metadata, frontend orchestration, or user preference rows.

## Owner Setup Relationship

Owner Setup can eventually show notification readiness.

Near term:

- Continue showing notification defaults as unknown/deferred.
- Keep personal notification preferences separate under current Settings behavior.
- Do not expose a company notification-default form until backend contracts exist.

Future configuration should:

- use a guarded RPC only;
- require active current-company membership;
- require an explicit permission, likely a future `company.manage_notifications` or equivalent company settings permission;
- validate event keys, channels, role keys, required flags, and default values;
- write company audit events when defaults change;
- return a narrow non-authoritative result;
- refetch setup context/readiness after success.

Owner Setup must not:

- directly write `notification_policies`;
- directly write `notification_prefs`;
- directly write `user_notification_prefs`;
- write company defaults into broad `companies.settings`;
- imply notification readiness grants access;
- activate Vendor/Client notification surfaces.

## Relationship To Readiness

Readiness should remain diagnostic only.

Future readiness can safely check:

- whether company notification-default rows exist for required event categories;
- whether event keys map to supported global/system event definitions;
- whether default channels are supported;
- whether fallback to global defaults is explicit;
- whether the company has no invalid/deprecated notification-default rows.

Readiness must not:

- grant route access;
- deny route access;
- bypass notification creation authorization;
- bypass recipient membership checks;
- mutate defaults from the browser;
- hide missing backend default support as a harmless UX warning once setup depends on it.

## Recommended Future Implementation Slices

1. Deeper notification engine dependency inspection.
   - Confirm all active notification fan-out paths.
   - Confirm direct table fallbacks still used by active code.
   - Confirm which event keys are actually emitted.
   - Confirm whether admin-labeled Settings UI should remain or be retired before company defaults.

2. Define company notification defaults table/RPC.
   - Company-id scoped.
   - Event/channel/role allowlisted.
   - Permission guarded.
   - Audit-backed.
   - No broad settings JSON.

3. Define fallback precedence.
   - Required system rules.
   - User overrides.
   - Company defaults.
   - Global/system defaults.

4. Update notification policy resolver.
   - Prefer backend/server-side resolver.
   - Preserve `rpc_notification_create(...)` tenant safety.
   - Avoid browser-only fan-out truth for company defaults.

5. Add setup-context readiness signal.
   - Read-only check for company defaults.
   - Unknown/deferred until model exists.

6. Add Owner Setup read-only notification card.
   - Show readiness only.
   - Link to personal notification preferences separately.

7. Add Owner Setup configuration only after backend stability.
   - Guarded save path.
   - Safe copy around optional vs required notifications.

8. Add bootstrap default seeding only after model is live.
   - Seed Staff defaults first if product-approved.
   - Keep AMC/Vendor/Client defaults deferred until their surfaces are live.

## Hard No-Go Rules

- No company defaults stored only in broad arbitrary settings JSON.
- No user preference table treated as company defaults.
- No cross-company notification leakage.
- No frontend-only default truth.
- No direct table writes from Owner Setup.
- No bootstrap seeding before the company-safe model exists.
- No readiness authority.
- No Vendor/Client activation.
- No product-mode/module authority.
- No notification defaults that bypass `rpc_notification_create(...)` tenant safety.
- No global `notification_policies` edits from Owner Setup.

## Phase 10D7 Lock

Phase 10D7 is complete as notification-default model design only.

No notification-default implementation was added. The next planned slice is Phase 10D8 closeout/handoff.
