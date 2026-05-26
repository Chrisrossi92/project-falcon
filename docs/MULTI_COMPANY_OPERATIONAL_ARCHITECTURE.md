# Multi-Company Operational Architecture

## Purpose

This document defines Falcon's multi-company operational architecture.

It describes how Falcon should evolve from a coherent single-company operations platform into a scalable SaaS system without losing workflow clarity, notification discipline, activity memory, or deterministic operational intelligence.

This is not an implementation plan. It does not introduce tenant infrastructure, onboarding UI, billing, organization switching, company settings UI, or schema changes.

## 1. Core SaaS Philosophy

Falcon is an operational platform first.

Multi-company support should preserve the product's core operating model:

- Multiple companies can run their own operational workspace.
- Platform doctrine remains shared across companies.
- Company policy can configure local workflow and communication behavior.
- Workflow governance remains deterministic and auditable.
- Operational intelligence remains explainable from known business data.
- Flexibility should not create ambiguous lifecycle behavior or notification noise.

Falcon should distinguish four levels of behavior:

- Platform-level behavior: canonical product doctrine, safety constraints, base workflow vocabulary, deterministic signal semantics, and protected lifecycle governance.
- Company-level policy: workflow choices, notification defaults, queue thresholds, terminology, calendar defaults, numbering rules, and team role bundles.
- User-level preference: personal notification delivery choices, view preferences, and non-authoritative UI settings.
- Order-level operational context: assignment, due dates, workflow status, activity history, schedule data, and current operational signals.

Company configuration should tune Falcon. It should not turn every company into a separate product with incompatible concepts.

Phase 9 product-mode architecture is now the planning layer above this multi-company foundation. The detailed product-mode plan lives in `docs/FALCON_PRODUCT_MODE_ARCHITECTURE.md`.
The canonical module registry lives in `docs/FALCON_MODULE_REGISTRY.md`.
The product-mode composition matrix lives in `docs/FALCON_PRODUCT_MODE_COMPOSITION.md`.
The Continental AMC operational blueprint lives in `docs/FALCON_CONTINENTAL_AMC_BLUEPRINT.md`.
The v1 AMC operational surface suppression doctrine lives in `docs/FALCON_V1_AMC_OPERATIONAL_SURFACE_SUPPRESSION_DOCTRINE.md`.
Phase 10A company bootstrap doctrine lives in `docs/COMPANY_BOOTSTRAP_ARCHITECTURE.md`.

Falcon should support complete, purpose-built modes:

- Staff Appraisal Mode for internal staff appraisal operations.
- AMC Operations Mode for Continental AMC and future AMC operators.
- Vendor Portal Mode for external appraisers/vendors who only need assigned packet work.
- Client Portal Mode for lenders/clients who need order request/status/report visibility.
- Hybrid / Ecosystem Mode for companies that intentionally combine internal operations with network participation.

Product modes should be implemented through capability/module bundles, permission domains, relationship types, and mode-specific UX. They should not be implemented as one cluttered universal UI with disabled or irrelevant features. Staff Appraisal Mode remains the likely primary SaaS product, while Continental AMC should be the flagship internal deployment for validating AMC, vendor, client, and ecosystem workflows.

## 1A. V1 Operational Surface Suppression

Multi-company and AMC architecture may exist before it is exposed in runtime UX.

Falcon v1 should keep Staff Appraisal Mode as the active operational experience unless another
operational domain is explicitly enabled. Company relationships, relationship types, assignment
packet foundations, vendor capability, and AMC workflow foundations are architectural capacity, not
active UI commitments.

Rules:

- Staff Appraisal users should not routinely see AMC command-center, vendor panel, assignment
  marketplace, external packet, multi-company abstraction, or network dashboard language.
- Admin is not AMC Admin. Admin authority in the internal staff operational domain does not expose
  AMC Operations unless AMC module scope and AMC permissions are both granted.
- Owner controls future operational-domain exposure. Owners may later enable AMC domains
  selectively for a company, user, or role preset without making AMC visibility inherent to every
  admin.
- Operational-domain visibility is separate from action authority. Permissions can authorize an
  action inside a visible domain, but they should not expose unrelated dormant domains.
- Hidden foundations should remain hidden rather than rendered as locked or disabled modules.

Examples:

- A client record categorized as `AMC` may remain visible where the v1 client/order model already
  uses that relationship.
- `Vendor Panel`, `AMC Command Center`, `Network Work`, `Sent Assignments`, `Received Packets`,
  and `Assignment Marketplace` should stay hidden until an AMC or Hybrid operational domain is
  intentionally live.

Suppression is not removal. Future AMC, Vendor Portal, Client Portal, and Hybrid/Ecosystem modes
should continue to build on the multi-company foundation, but each must surface as a complete,
domain-native workspace rather than hidden architecture leaking into Staff Appraisal Mode.

## 2. Company Identity Model

Future Falcon companies should have a stable `company_id` that scopes operational data and policy.

Company-scoped concepts should include:

- Company identity and profile.
- Branding.
- Timezone.
- Locale.
- Terminology profile.
- Working days and weekend behavior.
- Order numbering rules.
- Default workflow policy.
- Default notification policy.
- Default queue and scheduling policy.

Current Falcon behavior remains the single-company default until company infrastructure exists.

During the transition, current global defaults should be treated as platform defaults for the existing workspace, not as proof that the system is already multi-company.

Multi-Company Readiness Slice 1 is complete. Falcon now has frontend default platform policy modules for workflow, queue, calendar, and notification behavior:

- `defaultWorkflowPolicy`
- `defaultQueuePolicy`
- `defaultCalendarPolicy`
- `defaultNotificationPolicy`

These modules represent current single-company platform defaults only. They make existing assumptions explicit without adding tenant lookup, backend policy storage, settings UI, `company_id`, permission changes, or runtime policy resolution.

Current constants abstracted into defaults include due-soon at 48 hours, active appraiser statuses, the completed status set, review compression at 2 days, and default weekend calendar visibility. Future company policy should override these through company-aware policy resolution.

Multi-Company Foundation Slice 1 is complete. Falcon now has an additive default-company backend foundation:

- `public.companies`
- Seeded `falcon_default` company record.
- Nullable `company_id` on `orders`, `clients`, `notifications`, and `activity_log`.
- `NOT VALID` foreign keys to preserve compatibility during transition.
- Backfills to the default company, deriving notification and activity company from related orders where possible.

This slice does not add tenant enforcement, organization switching, frontend company filters, settings UI, onboarding, workflow changes, notification behavior changes, RLS changes, or order-numbering uniqueness changes. Orders are now structurally company-aware, but company scoping is not yet an authorization boundary.

The next required phase is company-aware backend projection/RPC hardening: order views, workflow RPCs, activity writes, notification creation, client metrics, and calendar sources must carry company context before any enforcement or tenant UI is introduced.

Multi-Company Foundation Slice 2 is complete. Order company scope is now backend-owned and preserved:

- `public.default_company_id()` resolves the current single-company default.
- Order inserts default to `falcon_default` when `company_id` is absent.
- Order updates preserve existing company ownership.
- `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity` expose `company_id`.
- Order-generated activity and assignment notifications inherit order company context.

Tenant enforcement remains intentionally deferred. No RLS, organization switching, frontend company filtering, onboarding, numbering, workflow semantics, or membership logic changed.

Multi-Company Foundation Slice 3 is complete. Client company scope is now backend-owned and client metrics are company-aware:

- Client inserts default to `falcon_default` when `company_id` is absent.
- Client updates preserve existing company ownership.
- `v_client_kpis` and `v_client_metrics` expose `company_id`, aggregate by company and client, and filter through readable-client/readable-order predicates.
- `v_client_kpis_appraiser` is recreated after `v_client_kpis` during baseline replay to preserve the appraiser KPI compatibility projection, and now uses readable-client predicates.
- `client_name_taken` checks duplicates through `current_company_id()` and readable-client logic.
- `merge_clients` rejects cross-company merges and updates only same-company linked orders and client references.
- The migration reports order/client company mismatch counts for `client_id` and `managing_amc_id`. Legacy `orders.amc_id` remains a separate UUID relationship to `public.amcs` and is not treated as a `public.clients` relationship.

The same-company order/client guard is intentionally deferred until mismatch verification can be reviewed in the target database. No RLS, organization switching, frontend company filtering, onboarding, numbering, workflow semantics, `NOT NULL` enforcement, FK validation, or tenant membership logic changed.

Multi-Company Foundation Slice 4 is complete. Notification and activity write paths now derive company context server-side:

- `rpc_notification_create` derives `notifications.company_id` from `patch.order_id -> orders.company_id`.
- `rpc_log_event` derives `activity_log.company_id` from `p_order_id -> orders.company_id`.
- Existing null notification and activity company values are backfilled from related orders before falling back to `falcon_default`.
- Frontend callers continue to send order context, not trusted company context.

Notification read RPCs remain user-scoped, and activity reads remain order-scoped until active-company membership exists. Tenant enforcement remains intentionally deferred. No RLS, organization switching, frontend company filtering, notification doctrine, activity doctrine, or membership logic changed.

Multi-Company Foundation Slice 5 is complete. Calendar projection events now preserve company context when `public.calendar_events` exists:

- `calendar_events.company_id` is added additively with a `NOT VALID` company FK.
- Stored calendar event company context is backfilled from linked orders before falling back to `falcon_default`.
- `v_admin_calendar` and `v_admin_calendar_enriched` expose company context while preserving legacy calendar columns.
- `rpc_create_calendar_event` derives company context server-side from `p_order_id -> orders.company_id`.

Order-derived scheduling remains canonical. Calendar events remain a projection/compatibility layer, and calendar tenant filtering remains intentionally deferred. No RLS, organization switching, frontend company filtering, queue behavior, workflow semantics, `NOT NULL` enforcement, or FK validation changed.

Multi-Company Foundation Slice 6A is complete. Falcon now has an additive company membership foundation:

- `public.company_memberships` separates company membership from auth identity, role capability, and order assignment.
- Existing app users are seeded into `falcon_default` as active primary memberships.
- `current_company_id()` returns `falcon_default` during compatibility mode.
- `current_app_user_company_ids()` and `current_app_user_has_company(company_id)` expose membership context for future authorization work.

Authorization remains compatibility/global-mode. Existing permission helpers, RLS policies, role strings, frontend route guards, and workflow semantics were not changed. Company-aware permission enforcement and active-company organization switching remain intentionally deferred.

Multi-Company Foundation Slice 6B is complete. Falcon now has an additive normalized role-assignment layer for future company-aware authorization:

- `public.user_role_assignments` maps canonical app users to role bundles in company context.
- Existing legacy `public.user_roles` rows are backfilled into `falcon_default` assignments where they can be resolved to `public.users` and template roles.
- Company-aware permission resolver successors now exist in parallel:
  - `current_app_user_permission_keys_for_company(company_id)`
  - `current_app_user_has_permission_for_company(company_id, permission_key)`
  - `current_app_user_has_any_permission_for_company(company_id, permission_keys)`
  - `current_app_user_has_all_permissions_for_company(company_id, permission_keys)`

Multi-Company Foundation Slice 6C is complete. Permission parity was verified before edits against the replay-safe local baseline:

- Legacy helper outputs matched company-aware successor helper outputs for `public.current_company_id()`.
- Owner semantics remained equivalent.
- Legacy `public.user_roles` mappings resolved into default-company `public.user_role_assignments` where applicable.
- No active reset-data users had missing roles or multiple role assignments requiring drift remediation.

The wrapper migration `20260518010000_company_permission_helper_wrappers.sql` now routes these active permission helpers through `current_company_id()` and the company-aware resolver layer:

- `current_app_user_permission_keys()`
- `current_app_user_has_permission(text)`
- `current_app_user_has_any_permission(text[])`
- `current_app_user_has_all_permissions(text[])`

`current_is_admin()` and `current_is_appraiser()` remain legacy compatibility helpers until responsibility-aware RLS and workflow authorization are migrated. Slice 6C did not modify RLS, frontend hooks, `ProtectedRoute`, organization switching, workflow semantics, route guards, or role-management RPCs.

Baseline recovery and Slice 6C validation are locked: historical replay-unsafe migrations are archived, the curated Falcon baseline is replay-safe, local `supabase db reset` passed after the wrapper migration, generated Supabase TypeScript types were refreshed, and the Supabase Storage startup issue encountered during validation was local temp-state/tooling rather than Falcon SQL.

Multi-Company Foundation Slice 7A is complete. Falcon now has an active-company context contract without tenant enforcement:

- `current_company_id()` reads a JWT/app metadata active-company claim when present.
- The active-company claim is accepted only when the current app user has active `company_memberships` membership in that company.
- Missing, invalid, or non-member claims fall back to `falcon_default` through `default_company_id()` while compatibility mode remains active.
- `current_app_user_has_current_company()` exposes the membership check for the resolved company.
- `rpc_current_company_context()` exposes auth user id, app user id, active-company claim id, resolved current company id, current-company membership state, permission count, and current-company role assignments for diagnostics.

Slice 7A did not enforce tenant isolation. Existing RLS policies, security-definer RPC behavior, frontend flows, org switching, workflow semantics, Smart Actions, queues, calendar behavior, activity behavior, and notification behavior remain unchanged. Future enforcement must clean up permissive RLS policies and add explicit active-company filtering inside security-definer RPCs before tenant isolation can be considered real.

Multi-Company Foundation Slice 7B is complete. Orders are now the first backend-enforced company read-isolated operational root:

- `current_app_user_can_read_order_row(...)` is the reusable order read predicate.
- `current_app_user_can_read_order(uuid)` resolves order-by-id reads through that predicate.
- `can_read_order(uuid)` remains as a compatibility wrapper and delegates to the company-aware helper.
- The old order SELECT policies and the global admin `orders_owner_admin_full_access` ALL read bypass were removed.
- The active order SELECT policy now requires current-company membership, order company match, and existing lifecycle/responsibility visibility.
- `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, and `v_orders_list_with_last_activity` were recreated with `security_invoker = true` and explicit order read predicates.
- `rpc_get_activity_feed(uuid)` and `rpc_list_orders(...)` now enforce order-derived read safety.

Slice 7B did not change writes, workflow transitions, frontend behavior, organization switching, Smart Actions, client policies, calendar policies, notification policies, user policies, or tenant UI. Local validation passed with clean `supabase db reset`, policy/view catalog checks, default-company compatibility parity checks, cross-company negative tests, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7C is complete. Order-derived read bypasses now route through the Slice 7B order read boundary:

- Order-derived calendar reads require a readable source order.
- `v_admin_calendar` and `v_admin_calendar_enriched` keep frontend-compatible output while filtering order-tied rows through `current_app_user_can_read_order(order_id)`.
- `get_calendar_events(timestamptz, timestamptz)`, `get_calendar_events()`, and `get_admin_calendar_events(...)` no longer expose order-tied rows when the source order is unreadable.
- Order-derived activity reads require a readable source order.
- `get_order_activity_flexible(uuid)`, `get_order_activity_flexible_v3(uuid)`, `v_order_activity_feed`, and `v_order_activity_compat` now derive authorization from `current_app_user_can_read_order(...)`.
- Order-tied notifications are hidden from list RPCs and excluded from unread counts when the underlying order is not readable.
- `rpc_get_notifications`, `rpc_get_unread_count`, `rpc_notifications_list`, and `rpc_notifications_unread_count` now preserve personal notification behavior while filtering unreadable order-tied rows.

Slice 7C patched order-derived `SECURITY DEFINER` read bypasses only. It did not change writes, workflow transitions, frontend code, organization switching, client isolation, user/team isolation, Smart Actions, or `calendar_events` table policies. Calendar table policy tightening remains deferred. Validation passed with clean reset, catalog checks, default-company parity, cross-company negative tests, notification unread-count checks, calendar and activity visibility checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7D is complete. Clients are now company-owned operational records for read isolation:

- `current_app_user_can_read_client_row(uuid, bigint)` is the reusable client read predicate.
- Client reads require current-company membership, client company match, and either `clients.read.all` or `clients.read.assigned` through at least one readable source order tied by `orders.client_id` or `orders.managing_amc_id`.
- Broad client SELECT bypasses were removed and replaced with `clients_select_company_visibility`.
- Legacy client `ALL` policies were converted into command-specific write policies so write compatibility no longer implies SELECT bypass.
- `v_client_kpis`, `v_client_metrics`, and `v_client_kpis_appraiser` were recreated with `security_invoker = true` and explicit readable-client/readable-order predicates.
- `get_clients_for_user()` now returns an explicit compatibility shape from readable clients.
- `client_name_taken(text, bigint)` now scopes duplicate checks through `current_company_id()` and readable-client logic.

Slice 7D did not change client write behavior, `merge_clients`, order intake writes, frontend code, contacts, AMC/lender hierarchy behavior, workflow semantics, or Smart Actions. Validation passed with clean reset, policy/view catalog checks, default-company parity, assigned-client appraiser visibility checks, cross-company negative tests, client search/autocomplete visibility coverage through direct client reads and client views, `client_name_taken` checks, `get_clients_for_user` shape checks, regenerated Supabase types, lint, build, and `git diff --check`. Caveat: `clients.name` still has a global uniqueness constraint, so company-scoped duplicate/canonicalization strategy remains deferred.

Multi-Company Foundation Slice 7E1 is complete. Client table writes now require company-aware backend authorization:

- `current_app_user_can_create_client()` gates client creation through current-company membership and `clients.create`.
- `current_app_user_can_update_client_row(uuid, bigint)` gates updates through current-company membership, client company match, and either `clients.update.all` or assigned-client visibility through a readable source order.
- `current_app_user_can_delete_client_row(uuid, bigint)` gates hard deletes through current-company membership, client company match, and `clients.delete`.
- `tg_clients_preserve_company_id()` now resolves inserts to `current_company_id()` and preserves existing `company_id` on updates; frontend-sent `company_id` is ignored.
- Broad/global client write policies were removed and replaced with `clients_insert_company_authorized`, `clients_update_company_authorized`, and `clients_delete_company_authorized`.

Slice 7E1 preserved direct frontend writes and inline New Order client creation for authorized users. Hard delete remains the current delete behavior but now requires `clients.delete`. It did not change uniqueness, `merge_clients`, order intake RPCs, frontend code, workflow semantics, or Smart Actions. Validation passed with clean reset, catalog checks, admin/appraiser/no-role write tests, cross-company mutation tests, spoofed `company_id` tests, direct write and inline intake compatibility checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7E2 is complete. Client mutation `SECURITY DEFINER` RPCs now respect the client write authorization boundary:

- `merge_clients(bigint, bigint, jsonb)` now requires current-company membership, readable source and target clients, `clients.update.all`, and `clients.archive`.
- `merge_clients` blocks cross-company source/target merges, cross-company linked order or child-client drift, and already-merged source or target clients.
- Merge reassignment is limited to current-company linked `orders.client_id`, `orders.managing_amc_id`, and child `clients.amc_id` rows.
- Legacy client mutation RPC signatures were preserved as compatibility wrappers while enforcing the 7E1 helpers:
  - `rpc_client_create(jsonb)`
  - `rpc_client_update(text, jsonb)`
  - `rpc_client_delete(text)`
  - `rpc_create_client(jsonb)`
  - `rpc_update_client(bigint, jsonb)`
  - `rpc_delete_client(bigint)`
- `PUBLIC` and `anon` execute privileges were revoked for the seven client mutation RPCs; `authenticated` and `service_role` execute grants remain.

Slice 7E2 did not change frontend code, uniqueness or indexes, order-write RPCs, workflow semantics, or Smart Actions. Validation passed with clean reset, catalog checks for definitions/grants/comments, anon/no-role/appraiser negative checks, owner/admin-style mutation checks, spoofed company checks, cross-company update/delete/merge negatives, merge drift and already-merged guards, direct frontend write compatibility, inline New Order client creation compatibility, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7E3A is complete. Order intake company/client/AMC attachment is now backend-enforced:

- `current_app_user_can_create_order()` gates order creation through current-company membership and `orders.create`.
- `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)` gates compatible order update RPCs through current-company membership, company match, and `orders.update.all` or assigned-order responsibility.
- `current_app_user_can_attach_order_client(bigint)` requires linked `client_id` rows to be readable, current-company, and non-merged.
- `current_app_user_can_attach_order_amc(bigint)` requires linked `managing_amc_id` rows to be readable, current-company, non-merged, and `category = 'amc'`.
- `tg_orders_preserve_company_id()` now resolves order inserts to `current_company_id()`, preserves `OLD.company_id` on updates, and ignores frontend-sent `company_id`.
- `tg_orders_validate_company_client_attachments()` enforces linked client and managing AMC attachment safety for direct `orders` table writes.
- Manual-only orders remain allowed when `client_id` is null; invalid linked clients are rejected instead of silently downgraded to manual mode.
- Bigint-compatible order RPCs were patched: `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)`.

Slice 7E3A did not change frontend code, workflow semantics, Smart Actions, uniqueness behavior, legacy uuid order RPCs, `import_orders_from_json`, or `orders.amc_id`. Validation passed with clean reset, same-company attach success, cross-company attach failure, spoofed `company_id` protection, manual-only order success, merged-client rejection, same-company AMC attach success, cross-company/non-AMC attach failure, inline order creation compatibility, patched RPC same-company/cross-company tests, role validation, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7E3B is complete. Legacy uuid-based order RPC/import paths are quarantined:

- `rpc_order_create(jsonb)` is preserved by signature but now raises a clear deprecated/quarantined exception.
- `rpc_order_update(text, jsonb)` is preserved by signature but now raises a clear deprecated/quarantined exception.
- `import_orders_from_json(jsonb)` is service-role-only and marked deprecated/unsafe for multi-company imports.
- `PUBLIC`, `anon`, and `authenticated` execute privileges were revoked from all three legacy paths.
- `scripts/backfill/import_orders.cjs` remains the only known repo caller for `import_orders_from_json(jsonb)` and must stay operator-controlled until the importer is rewritten.

Slice 7E3B did not change active bigint-compatible order RPCs, direct order create/update, frontend code, workflow semantics, uniqueness behavior, order intake UI, `managing_amc_id`, or `orders.amc_id`. Validation passed with clean reset, catalog grant/comment checks, anon/authenticated execution denial, service-role importer compatibility, deprecated exception checks, active bigint-compatible RPC checks, direct order create/update checks, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7F1 is complete. Order table writes now use company-aware policies:

- Legacy order insert/update/delete policies were removed:
  - `allow_admin_update_orders`
  - `orders_appraiser_update_own`
  - `orders_delete_admin`
  - `orders_insert_admin`
  - `orders_update_admin`
  - `orders_update_lifecycle_visibility`
  - `orders_update_my_assigned`
- New order write policies were added:
  - `orders_insert_company_authorized`
  - `orders_update_company_authorized`
  - `orders_delete_company_authorized`
- Inserts use `current_app_user_can_create_order()`.
- Updates use `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`.
- Delete remains company-scoped and preserves current hard-delete compatibility for users with order delete/archive authority.
- Trigger-owned order `company_id` behavior remains authoritative: inserts resolve company from `current_company_id()`, updates preserve existing ownership, and frontend-sent `company_id` is ignored.

Slice 7F1 did not patch workflow/status/date/assignment RPCs, change Smart Actions, change lifecycle semantics, alter notification/activity behavior, or modify frontend code. Direct frontend order writes remain compatible for authorized users. Validation passed with clean reset, policy catalog checks, same-company admin/owner direct write checks, cross-company mutation blocking, appraiser/reviewer update compatibility checks, no-role negative checks, spoofed `company_id` checks, direct order update/archive/delete parity checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7F2 is complete. The canonical workflow transition RPC is now company-aware:

- `rpc_transition_order_status(uuid, text, text)` requires current-company membership before transition.
- The target order must match `current_company_id()`.
- The target order must be readable through `current_app_user_can_read_order(uuid)`.
- The target order must be updateable through `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`.
- Existing Smart Actions semantics, transition validation, required workflow permission checks, and lifecycle governance rules are preserved.
- Existing status/activity side effects remain trigger-driven; the RPC still does not duplicate status activity logging.

Slice 7F2 did not patch legacy workflow/status/date/assignment RPCs, change arbitrary status mutation paths, alter frontend code, change Smart Actions UI, or change notification/activity generation. Validation passed with clean reset, same-company appraiser/reviewer/admin transition checks, cross-company transition rejection, stale company claim rejection, no-role rejection, status activity side-effect checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7F3 is complete. Legacy arbitrary workflow/status RPCs are quarantined so they cannot bypass the canonical lifecycle authority:

- Deprecated arbitrary status/workflow RPC signatures are preserved for compatibility discovery:
  - `rpc_update_order_status(uuid, text)`
  - `rpc_update_order_status_with_note(uuid, text, text)`
  - `rpc_order_set_status(text, text)`
  - `rpc_order_set_status(uuid, text, text)`
  - `rpc_order_mark_complete(text, text)`
  - `rpc_order_ready_to_send(text)`
  - `rpc_order_send_to_client(text, jsonb)`
  - `rpc_review_approve(text, text)`
  - `rpc_review_request_revisions(text, text)`
  - `rpc_review_start(text)`
  - `rpc_update_order_v1(uuid, text, uuid, timestamptz, timestamptz, timestamptz, jsonb)`
  - `set_order_status(uuid, text)`
- Each quarantined body raises a clear deprecated/quarantined exception instead of mutating lifecycle state.
- `PUBLIC`, `anon`, and `authenticated` execute privileges were revoked from the quarantined RPCs.
- `service_role` remains granted for compatibility discovery, but the function bodies still raise deprecated exceptions to prevent accidental lifecycle mutation.
- `rpc_transition_order_status(uuid, text, text)` remains the only lifecycle authority.

Slice 7F3 did not patch assignment/date RPCs, change frontend code, change Smart Actions UI, alter canonical transition semantics, or change notification/activity generation. Validation passed with clean reset, catalog grant/comment checks, anon/authenticated execution denial, service-role deprecated exception checks, canonical same-company transition success, cross-company/no-role transition rejection, canonical status/activity side-effect checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7F4A is complete. Assignment and date mutation guardrails now protect remaining legacy compatibility paths without changing frontend behavior:

- Assignment target helpers were added:
  - `app_user_has_company_role(uuid, uuid, text[])`
  - `current_app_user_can_assign_order_target(uuid, uuid, text)`
- Trigger-level assignment validation now protects direct writes to:
  - `orders.appraiser_id`
  - `orders.assigned_to`
  - `orders.reviewer_id`
  - `orders.current_reviewer_id`
- Assignment target users must have active membership in the current company and the appropriate appraiser/reviewer role capability where practical.
- Guarded assignment/date RPCs now require current-company membership, readable order, updateable order, and order company matching `current_company_id()`:
  - `rpc_assign_order(uuid, uuid, text)`
  - `rpc_update_due_dates(uuid, date, date)`
  - `rpc_update_order_dates(uuid, timestamptz, timestamptz, timestamptz)`
- Stale assignment/date RPCs were quarantined with preserved signatures and deprecated exceptions:
  - `rpc_assign_order(uuid, uuid)`
  - `rpc_assign_reviewer(uuid, uuid)`
  - `rpc_assign_next_reviewer(uuid)`
  - both `rpc_order_set_dates(...)` overloads
  - `rpc_order_update_dates(text, ...)`
  - `set_order_appointment(uuid, timestamptz, text)`

Slice 7F4A preserved direct table update compatibility, Smart Actions, queue/calendar projections, frontend behavior, and existing assignment/date activity side effects. `current_reviewer_id` model cleanup, review-route redesign, and `calendar_events` table policy cleanup remain deferred. Validation passed with clean reset, catalog grant/comment checks, same-company assignment success, cross-company and wrong-role assignment rejection, same-company date update success, unreadable-order mutation rejection, quarantined RPC exception checks, calendar/order projection date parity, assignment/date activity side-effect parity, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7G1 is complete. Activity log table and RPC access now honor the same company/order boundary as the operational core:

- `activity_log` table reads are company/order-aware through readable source orders.
- Authenticated `activity_log` inserts require a non-null source order plus readable/updateable current-company authorization.
- Broad `USING true` and `WITH CHECK true` activity policies were removed.
- Authenticated access to `order_id is null` activity rows is blocked by default.
- `activity_log` update/delete remain blocked for authenticated users.
- Both active `rpc_log_event` overloads now require current-company membership, readable source order, updateable source order, and company match:
  - `rpc_log_event(uuid, text, text, jsonb)`
  - `rpc_log_event(uuid, text, jsonb)`
- Activity side effects, Smart Actions activity, assignment/date activity behavior, and frontend activity feed shapes were preserved.

Slice 7G1 did not change notifications, users/team directory, `calendar_events`, workflow semantics, activity schema, frontend code, or org switching. Validation passed with clean reset, activity policy catalog checks, same-company/cross-company/no-role activity visibility checks, direct insert and RPC positive/negative checks, assignment/date side-effect checks, regenerated Supabase types, lint, build, `git diff --check`, and final clean `supabase db reset`.

Multi-Company Foundation Slice 7G2A is complete. Notification table policies and active notification RPCs now preserve personal notification UX while enforcing tenant-safe order-derived boundaries:

- Notification table SELECT now uses canonical `current_app_user_id()` identity through `current_app_user_can_access_notification_row(uuid, uuid)`.
- Direct authenticated notification INSERT, UPDATE, and DELETE are blocked.
- `rpc_notification_create(jsonb)` requires current-company membership and a readable/updateable source order for authenticated order-tied notifications.
- Notification recipients for order-tied records must be active members of the source order's company.
- Authenticated non-order notification creation is blocked.
- Service-role non-order notification creation is preserved for controlled system/operator paths.
- Read, mark-read, mark-all-read, dismiss, and dismiss-seen RPCs only affect current-user notifications that are personal or tied to readable source orders.
- Legacy manual/debug notification RPCs are quarantined with preserved signatures, app-role execute revoked, and deprecated exceptions:
  - `rpc_notify_admins(text, text, text)`
  - `rpc_notify_user(uuid, text, text, text)`
  - `notify_admins(text, text, text)`
  - `notify_safe(uuid, text, text, text)`
  - `rpc_debug_notifications_access()`
- Notification bell/read-count compatibility, actor suppression behavior, and current frontend service shapes were preserved.

Slice 7G2A deferred notification preference table/RPC changes, company-specific notification preferences, and a productized manual/system notification path. Validation passed with clean reset, catalog policy/grant/comment checks, same-company order-tied notification creation, cross-company/unreadable-order and outside-recipient rejection, authenticated non-order creation rejection, service-role non-order creation, hidden cross-company mark/dismiss rejection, bell/read-count RPC compatibility checks, regenerated Supabase types, lint, build, `git diff --check`, and final clean `supabase db reset`.

Multi-Company Foundation Slice 7H1 is complete. Legacy exposed views and stale public read surfaces are now quarantined without moving, renaming, or removing objects:

- `anon` and `authenticated` SELECT was revoked from 17 unsafe legacy views:
  - `v_orders_unified`
  - `v_orders_frontend`
  - `v_orders_list_v2`
  - `v_orders_list_with_last_activity_v2`
  - `v_orders_unified_list`
  - `v_orders_dashboard_active`
  - `v_admin_dashboard_counts`
  - `v_calendar_events`
  - `v_calendar_unified`
  - `v_admin_calendar_v2`
  - `v_calendar_events_admin`
  - `v_calendar_events_appraiser`
  - `v_amcs`
  - `profiles`
  - `v_email_queue`
  - `v_staging_raw_orders_2025_ord`
  - `v_user_notification_prefs`
- Canonical hardened views remain accessible to app roles:
  - `v_orders_frontend_v4`
  - `v_orders_active_frontend_v4`
  - `v_orders_list`
  - `v_orders_list_with_last_activity`
  - `v_admin_calendar`
  - `v_admin_calendar_enriched`
  - `v_client_kpis`
  - `v_client_metrics`
  - `v_client_kpis_appraiser`
- `v_order_activity_feed` and `v_order_activity_compat` now hide `order_id is null` rows and require `current_app_user_can_read_order(order_id)` for visible rows.
- Comments were added to quarantined views and activity compatibility views documenting the quarantine boundary and future explicit-grants cleanup intent.

Slice 7H1 preserved active frontend canonical views and did not alter frontend code, workflow semantics, notification behavior, activity generation, table schemas, or object names. Validation passed with clean reset, catalog checks for quarantined/canonical view access, active frontend smoke checks for orders, dashboard, calendar, clients, notifications/activity, order-id-null activity visibility checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Foundation Slice 7H2A is complete. Broad app-role grants from the baseline have been replaced by an explicit authenticated allowlist:

- Broad `PUBLIC`, `anon`, and `authenticated` table/view, sequence, and function privileges were revoked.
- `anon` now has no table, view, sequence, or function access in `public`.
- `authenticated` access is explicit allowlist only.
- Canonical hardened views remain granted:
  - `v_orders_frontend_v4`
  - `v_orders_active_frontend_v4`
  - `v_orders_list`
  - `v_orders_list_with_last_activity`
  - `v_admin_calendar`
  - `v_admin_calendar_enriched`
  - `v_client_kpis`
  - `v_client_metrics`
  - `v_client_kpis_appraiser`
  - `v_order_activity_feed`
  - `v_order_activity_compat`
- Current direct-table compatibility grants remain only for active frontend paths protected by RLS/triggers:
  - `orders`
  - `clients`
  - `users`
  - `user_profiles`
  - `user_roles`
  - `notification_policies`
  - `notification_prefs`
- Active hardened RPCs and helper functions required by policies/views remain executable by `authenticated`.
- Quarantined workflow/status RPCs, legacy uuid order RPCs, importers, debug/manual notification helpers, and email queue worker paths remain inaccessible to `PUBLIC`, `anon`, and `authenticated`.
- `service_role` broad access is intentionally preserved for operator/backfill compatibility until a later service-role/operator allowlist cleanup.
- `supabase_admin` future-object default ACL cleanup remains a manual/platform-role follow-up because local migration replay cannot alter that platform role.

Slice 7H2A did not change RLS logic, frontend code, workflow semantics, notification behavior, activity generation, table schemas, or object names. Validation passed with clean reset, catalog checks for anon/authenticated object and function grants, canonical surface accessibility checks, quarantined/import/debug path denial checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Phase 8B1/8B2 is complete. Falcon now has a static relationship-model foundation without operational visibility or workflow behavior changes:

- `public.company_types` exists as a lookup/config table rather than a PostgreSQL enum.
- Seeded company types include `staff_shop`, `amc`, `vendor`, `hybrid`, `review_firm`, and `enterprise`.
- `public.companies.company_type` now defaults existing companies to `staff_shop`.
- `public.companies.operating_mode_settings` exists for future operating-mode configuration.
- `public.company_relationship_types` exists as the static directional relationship vocabulary.
- Seeded relationship types include `amc_vendor`, `staff_overflow_vendor`, `review_provider`, `enterprise_child`, `billing_managed`, and `support_managed`.
- `public.company_relationships` exists with directional `source_company_id` and `target_company_id` semantics, lifecycle status, compliance/settings metadata, audit user columns, timestamps, constraints, and indexes.
- Relationship records alone grant no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Future scoped cross-company visibility must be granted by explicit assignment records, not by relationship existence.
- New relationship foundation tables have RLS enabled and are service-role-only for now; app roles receive no direct grants.

Phase 8B1/8B2 did not change order visibility, client visibility, workflow semantics, onboarding UI, app grants, assignment behavior, company switching, or frontend behavior. Validation passed with clean reset, seed/catalog checks, `falcon_default` company type verification, RLS/grant checks, unchanged order/client policy checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Phase 8B3 is complete. Falcon now has an RPC-only company relationship lifecycle foundation:

- Relationship permissions are seeded:
  - `relationships.read`
  - `relationships.invite`
  - `relationships.approve`
  - `relationships.suspend`
  - `relationships.archive`
  - `relationships.manage_compliance`
  - `relationships.assign_work`
- Relationship lifecycle helper predicates exist for read, invite, approve, suspend, archive, and compliance authority.
- Direct app-role table access to `company_types`, `company_relationship_types`, and `company_relationships` remains blocked.
- Lifecycle RPCs control relationship list/detail, invite, accept, decline, suspend, reactivate, and archive behavior.
- `company_relationships.source_company_id`, `target_company_id`, and `relationship_type` are immutable after creation.
- Status transition rules are enforced by trigger:
  - `invited -> active/declined/archived`
  - `active -> suspended/archived`
  - `suspended -> active/archived`
  - `declined -> archived`
  - `expired -> archived`
  - `archived` is terminal
- Relationship records and relationship lifecycle state still grant no order, client, activity, notification, calendar, queue, workflow, or team visibility.

Phase 8B3 did not add assignment tables, vendor visibility, onboarding UI, workflow behavior, or order/client read-helper changes. Validation passed with clean reset, permission seed checks, RPC/table grant checks, relationship lifecycle fixture tests, duplicate current-relationship blocking, unchanged order/client policy checks, regenerated Supabase types, lint, build, and `git diff --check`.

Multi-Company Phase 8B4 is complete. Falcon now has an assignment-backed cross-company work foundation and assignment-native frontend UX:

- Phase 8B4A added `public.order_company_assignments` as the explicit work-grant record between an owner company and an assigned company.
- Phase 8B4B added guarded assignment lifecycle RPCs for offer, accept, decline, start, submit, complete, cancel, and revoke actions.
- Phase 8B4D added assigned-company work packet RPCs so assigned companies operate from assignment packets rather than canonical order records.
- Phase 8B4E added assignment-scoped activity and notifications. Assignment notifications deep-link to `/assignments/:assignmentId`; assigned-company notifications do not route to `/orders/:orderId`.
- Phase 8B4G added the assigned offer packet RPC for offered assignments before acceptance.
- Phase 8B4H added assignment-native frontend routes, inbox, owner management, packet resolver, offer/work/owner packet views, lifecycle actions, timeline-lite, and permission-gated nav/command-palette entries.
- Phase 8B4I hardened assignment routing, command-palette behavior, payload allowlist rendering, packet states, lifecycle confirmation UX, and resolver diagnostics without order fallback.
- Phase 8B4J added owner-side Offer Assignment UX from canonical `OrderDetail` only, using active outgoing relationships and the assignment offer RPC.
- Phase 8B4K hardened the offer modal accessibility, safe error copy, responsive order-detail action layout, success feedback, relationship picker copy, and curated handoff rendering.

Relationship records and relationship lifecycle state still grant no order, client, activity, notification, calendar, queue, workflow, or team visibility. Assignment packet access is not canonical order access. Assigned-company UI remains packet-only and does not call orders, clients, canonical order views, `OrderDetail`, `OrderDrawerContent`, `UnifiedOrdersTable`, or `ActivityLog`. Vendors are not written into owner-company core order assignment columns such as `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, or `orders.current_reviewer_id`.

Phase 8B4 did not change order/client visibility helpers, policies, backend RLS, canonical workflow semantics, company switching, onboarding UI, company settings, or tenant enforcement. Frontend validation passed with lint, build, `git diff --check`, and static scans for positive allowlist payload rendering, curated handoff rendering, no direct assignment inserts, no core order assignment column writes, no direct order/client/relationship/assignment table reads in assignment feature code, no assigned-company `/orders` links, and owner-only order links limited to the owner packet context.

Multi-Company Phase 8C1 is complete. Falcon now has safe target-company discovery and an RPC-only Relationship Management UI:

- Phase 8C1A added `rpc_company_relationship_target_search(text, text, integer)` for invite target discovery.
- Target discovery returns only minimal company identity, relationship type labels, eligibility, current source-to-target relationship status hints, and safe blocked reasons.
- Phase 8C1B added `/relationships` and `/relationships/:relationshipId` relationship management routes.
- Relationship list, detail, invite, accept, decline, suspend, reactivate, archive, and target-company search use RPCs only.
- Phase 8C1C hardened lifecycle confirmation UX, optional notes, per-action submitting state, safe error copy, direction/status callouts, terminal-state copy, invite modal focus behavior, and target-picker accessibility.
- Relationship route, nav, mobile nav, and command-palette visibility require `relationships.read` without legacy role fallback.
- Invite requires `relationships.invite`; accept/decline requires `relationships.approve`; suspend/reactivate requires `relationships.suspend`; archive requires `relationships.archive`.
- Static relationship type constants in the frontend are a temporary vocabulary mirror of backend seeded relationship types until a safe lookup/config RPC exists.

Direct frontend reads from `companies`, `company_relationships`, and `company_relationship_types` remain blocked and unused. Relationship existence and relationship lifecycle state still grant no order, client, assignment, activity, notification, calendar, queue, workflow, or team visibility. Phase 8C1 did not change backend operational visibility, order/client helpers, assignment packet access, RLS policy semantics, company switching, onboarding UI, or company settings.

Multi-Company Phase 8C2 is complete. Falcon now exposes owner-side assignment state inside canonical `OrderDetail` without expanding assigned-company visibility:

- Phase 8C2A added `rpc_order_company_assignment_list_for_order(uuid)` as a narrow owner-scoped, order-scoped assignment summary RPC.
- The order-scoped RPC requires current-company membership, owner assignment read permission, owner-company order ownership, and `current_app_user_can_read_order(order_id)`.
- The RPC returns assignment lifecycle summary fields only and excludes payload JSONs, client/AMC data, fees, splits, internal notes, and owner assignment user columns.
- Phase 8C2B added the owner-only `Company Assignments` panel inside `OrderDetail`.
- The panel calls only `rpc_order_company_assignment_list_for_order` through `listOwnerAssignmentsForOrder(orderId)`.
- The panel links assignment rows to `/assignments/:assignmentId`, not `/orders/:orderId`.
- Phase 8C2C hardened panel copy and accessibility, including explicit no-canonical-order-access wording and assignment-packet link labels.
- Lifecycle actions are intentionally deferred from the `OrderDetail` panel; owners continue to manage assignment lifecycle from assignment packet surfaces.

Assigned-company users gain no canonical order, client, owner workflow, or owner activity visibility from Phase 8C2. No backend visibility helpers, order/client policies, assignment packet semantics, company switching, onboarding UI, or settings UI changed.

Multi-Company Phase 8C3 is complete. Assignment packets now show real assignment-scoped activity without exposing canonical order activity:

- Phase 8C3 added `rpc_order_company_assignment_activity(uuid)` as the assignment timeline read RPC.
- The RPC reads `order_company_assignment_activity` only and returns allowlisted display fields: event id, assignment id, event type, actor side, actor company, message, safe event note, and timestamp.
- The RPC does not return `order_id`, raw payload JSON, actor user IDs, client/AMC/order activity fields, fees, splits, internal notes, or canonical order activity.
- Owner access follows assignment packet integrity, `order_company_assignments.read_owner`, owner-company scope, and `current_app_user_can_read_order(order_id)`.
- Assigned-company access follows assignment packet integrity, `order_company_assignments.read_assigned`, active relationship status, and offered/work/completed assignment statuses without calling order read authorization.
- Owner, offer, and work packet pages now use `rpc_order_company_assignment_activity` through the assignment API wrapper instead of timestamp-lite packet timelines.

Phase 8C3 does not reuse `activity_log`, call `rpc_get_activity_feed`, add direct assignment activity table reads, broaden order/client visibility, expose owner order activity to assigned companies, add assigned-company `/orders` links, or solve cancelled/revoked historical packet routing.

Multi-Company Phase 8C4 is complete. Falcon now has assignment-native dashboard surfaces without reusing canonical order dashboard infrastructure for assigned-company users:

- Phase 8C4 added pure frontend assignment dashboard metrics over assignment RPC rows only.
- Assigned-company dashboard work queues call only `listAssignedAssignments`, backed by assignment packet/list RPC access.
- Owner sent-assignment attention queues call only `listOwnerAssignments`, backed by owner assignment RPC access.
- Assignment dashboard rows expose only safe assignment display fields: company name, assignment type, assignment status, due/review/expires dates, safe instruction preview, and an Open Packet action.
- Assignment dashboard rows link only to `/assignments/:assignmentId`.
- `/dashboard` now uses an auth-only route wrapper and lets `DashboardGate` decide whether the user receives the existing order dashboard, the assignment dashboard, or a stable unavailable state.
- Order-capable and mixed users keep the existing order dashboard. Assignment-only users can reach `/dashboard` without order dashboard permission or legacy role fallback.
- Authenticated users with no dashboard capability receive a stable unavailable state instead of a same-route redirect loop.

Phase 8C4 did not add backend, schema, RLS, calendar projection, order/client visibility, order dashboard widgets, order list reuse, order KPI reuse, activity reuse, direct assignment table reads, assigned-company `/orders` links, or mixed-user assignment widgets.

Multi-Company Phase 8C5E3 through 8C5E5 is complete. Falcon now has an RPC/Edge-mediated company member invitation lifecycle through acceptance:

- Phase 8C5E3 added `public.company_member_invitations`, service-role-only invitation storage, guarded `rpc_company_member_invite_prepare(...)`, service-role-only `rpc_company_member_invite_finalize(...)`, and the `invite-company-member` Edge Function.
- Invite prepare validates current-company membership, company status, invite/role permissions, role preset safety, duplicate pending invites, active/inactive member conflicts, and Owner grant authority.
- The Edge Function uses the caller JWT for prepare, uses the service role only for Supabase Auth Admin invite/finalize work, and never exposes the service role or provider internals to the browser.
- Finalize creates invited memberships and inactive invitation-scoped role assignments only. It does not activate membership, mutate `public.user_roles`, rely on `public.users.role`, or grant operational visibility before acceptance.
- Phase 8C5E4 added `rpc_company_member_invite_accept(uuid, text)` for authenticated invite acceptance.
- Acceptance requires the authenticated user to match the invited auth identity or invited email, activates the invited membership, activates only invitation-scoped preset role assignments, writes `company.member_invite_accepted` audit, returns `session_refresh_required = true`, and does not switch active-company metadata.
- Phase 8C5E5 added the public `/accept-invite/:invitationId` frontend route. The page handles auth state internally, preserves a safe login return path, calls the acceptance RPC only after auth, refreshes the session after acceptance, calls the existing `set-active-company` function only when the accepted company is not already the active context, refreshes again after a successful switch, and routes to `/dashboard`.
- The accept page shows safe user-facing states for expired, wrong-account, inactive-company, stale-role, invalid/already-used, switch-failed, and generic failures.

The member invite flow remains intentionally narrow. It adds no onboarding UI, direct frontend invitation/membership/role-assignment table access, direct company/member table grants, legacy `public.user_roles` sync, `public.users.role` authority, or order/client/relationship/assignment visibility changes. Manual browser validation remains required for the real email/Auth link path: owner/admin invite, logged-out recipient login, acceptance, session refresh, active-company switch, accepted-company dashboard load, wrong-user error, expired invite error, and already-accepted invite error.

Multi-Company Phase 8C5F1 through 8C5F3 is complete. Falcon now has RPC/Edge-mediated Team Access invitation management without exposing the invitation ledger or role internals directly to the browser:

- Phase 8C5F1 added `rpc_company_member_invitations_list(text, integer)` and `rpc_company_member_invitation_cancel(uuid, text, text)` for current-company invitation list and cancel operations.
- Invitation list output is a safe projection: invite email, status, safe role labels, invited-by display name, lifecycle timestamps, and action booleans. It does not return auth IDs, provider tokens, raw permission keys, operational record IDs, or cross-company invitations.
- Cancel is limited to `prepared`, `sent`, and `auth_failed` invitations, preserves history, writes `company.member_invite_cancelled` audit, and requires Owner grant authority when the cancelled invitation includes the Owner role.
- Phase 8C5F2 added resend prepare/finalize RPCs and the `resend-company-member-invite` Edge Function. Resend creates a new invitation row, cancels/replaces the prior pending row when needed, reuses an existing invited membership safely, sends a fresh Auth invite from Edge/service-role code only, and never returns provider invite links or tokens.
- Phase 8C5F3 added Team Access invitation UI on the Users page. The UI lists pending/past/all invitations through RPCs, sends invites through `invite-company-member`, cancels through the cancel RPC, and resends through `resend-company-member-invite`.
- The invite Edge redirect now derives `/accept-invite/:invitationId` from `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`, or `APP_URL` when no explicit redirect is supplied.

Invitation management preserves the same doctrine as invite acceptance. Invitation state alone grants no operational visibility; `prepared`, `sent`, and `auth_failed` remain non-authoritative until authenticated acceptance activates the membership and invitation-scoped role assignments. Accepted invitations are terminal. Resend creates a new invitation row rather than mutating accepted history. The existing Users page still contains legacy team-profile role behavior outside the new Team Access invitation path; future cleanup should move remaining member/role management behind the company-member RPC surfaces.

Multi-Company Phase 8C5G4A1 through 8C5G4A3A is complete. Assignment-facing user picker surfaces now use the company-scoped assignable-user projection:

- `rpc_company_assignable_users(text)` returns active current-company members with Appraiser/Reviewer eligibility derived from active normalized template role assignments.
- Assignment appraiser and reviewer pickers, the Orders appraiser filter, and `AppraiserSelect` now load through the assignable-user RPC wrapper.
- Split defaults are preserved through the safe `default_split_pct` projection rather than profile or legacy role fallback reads.
- The old `listAssignableUsers` path and the dead `userService.listAppraisers` compatibility path have been removed.

Assignable-user migration did not change assignment mutation RPCs, order assignment storage, Settings/profile behavior, Team Access invitation management, or client filters.

Multi-Company Phase 8C5G4B1 through 8C5G4C4 is complete. Active order filter and order-form client intake surfaces now use narrow client projections instead of direct client table reads or broad client creation:

- `rpc_order_filter_clients()` returns only client IDs/names attached to readable orders for the Orders client filter.
- `rpc_order_form_client_options()` returns limited current-company client/AMC picker fields for order intake.
- `rpc_order_form_client_name_search(text, integer)` supports duplicate-name checks with safe fields only.
- `rpc_order_form_client_create(jsonb)` creates inline order-form clients only, forcing `category = client` and `status = active`, validating optional same-company active non-merged AMC attachment, rejecting blank/duplicate names, and ignoring unsupported/private fields.
- `OrdersFilters`, `ClientFields`, and `OrderForm` now use those RPC wrappers for filter options, client/AMC picker options, duplicate search, and inline client creation.
- Dormant `ClientSelect.jsx` was deleted after import scans confirmed it was unused and still depended on broad client listing.

Multi-Company Phase 8C5H1 through 8C5H2E is complete. Active broad client management now uses company-scoped RPC read and mutation surfaces instead of direct client table access:

- Phase 8C5H1A added `rpc_client_management_list(...)`, `rpc_client_management_detail(bigint)`, and `rpc_client_management_amc_options()` as safe current-company client management read projections.
- Phase 8C5H1B moved active client list, detail, edit preload, profile preload, and ClientForm AMC option reads to those RPC wrappers.
- Phase 8C5H2B added `rpc_client_management_create(jsonb)`, `rpc_client_management_update(bigint, jsonb)`, and `rpc_client_management_archive(bigint, text, text)` for guarded broad client management mutations.
- Phase 8C5H2C moved active NewClient, EditClient, and ClientDetail create/update paths to the management mutation RPC wrappers.
- Phase 8C5H2D1 through 8C5H2D3A deleted dormant legacy client drawer/detail/sidebar/form components, deleted the dormant `useClients` hook, and shrank `clientsService` to active compatibility methods only.

Active client management no longer directly reads or writes `clients` from the browser. Hard delete is not wired in the active UI; the archive RPC exists for future archive UI. Remaining compatibility seams are limited to `ClientProfile` using `listClientOrders` over `v_orders_frontend_v4` and active `ClientForm` using `isClientNameAvailable` through `client_name_taken`.

Multi-Company Phase 8C5I through 8C5J5 is complete. Settings/profile, route authority, and legacy role-string UI context have company-aware replacements:

- Phase 8C5I added `rpc_current_user_settings_get()` and `rpc_current_user_settings_update(jsonb)` and moved Settings profile color load/save to those RPCs. The legacy `usersService` and `useUsers` paths were deleted after import scans confirmed they were dormant.
- Phase 8C5J1 added `rpc_current_user_app_context()` plus a frontend wrapper/hook as the stable current-user app context foundation. It returns safe current app-user profile fields and display-only active current-company role labels without exposing auth IDs, raw permission keys, `public.users.role`, or `public.user_roles`.
- Phase 8C5J2A converted route guards in `src/routes/index.jsx` from legacy `roles` props to explicit `requiredPermission` / `requiredAnyPermissions` gates.
- Phase 8C5J2B removed legacy `useRole` fallback behavior from `TopNav`; navigation visibility now uses permission hooks only.
- Phase 8C5J2C removed legacy role fallback behavior from `ProtectedRoute`; route authority is now permission-only, while permissionless routes remain authenticated-only.
- Phase 8C5J3 through 8C5J4 moved simple action visibility, dashboard/calendar/order-table lens behavior, Quick Actions, ClientDetail order-history lensing, and ActivityNote actor metadata from legacy `useRole` to permission hooks plus `useCurrentUserAppContext`.
- Phase 8C5J5 deleted the legacy `useRole` hook and `rolesService` after import scans confirmed no UI call sites remained.

Route authority is permission-based. Display and lens context now resolves through `rpc_current_user_app_context()` and the frontend `useCurrentUserAppContext` hook, not `public.users.role`, `public.user_roles`, or legacy profile role strings.

Multi-Company Phase 8C5J6 through 8C5K2B is complete and then intentionally paused. The active frontend no longer uses legacy role-string authority, and the highest-risk backend role-string app surfaces are contained:

- Legacy role RPCs (`rpc_get_my_role()`, `rpc_list_users_with_roles()`, `rpc_set_user_role(...)`, and `rpc_admin_set_user_role(...)`) are revoked from `anon` and `authenticated` and marked deprecated. `service_role` compatibility remains for operator/backfill scenarios.
- Direct `anon`/`authenticated` reads from legacy `public.user_roles` are revoked. The table remains for backend compatibility only.
- `order_activity` read/update/delete policy paths now use company-aware order read permissions and `activity.moderate` instead of `current_user_role()` or direct `user_roles` joins.
- `review_flow` admin read policy now delegates to `can_read_order(order_id)` instead of checking `public.users.role = 'admin'`.

Further legacy SQL retirement is paused until product direction and the final implementation path are locked. The following objects and compatibility paths must not be dropped yet: `public.user_roles`, `public.users.role`, legacy role helper functions, default-company fallback in company-aware helper functions, and `public.profiles.role`. Final repo cleanup should revisit these after core product flows are stable.

## 3. Operational Policy Domains

Company policy should be organized by operational domain. These domains should share platform doctrine but allow restrained company-specific defaults.

### Workflow Policy

Workflow policy defines how a company moves work through the governed lifecycle.

Examples:

- Whether review is required.
- Whether final approval is required.
- Who has release authority.
- Whether reviewer clearance can release directly to client.
- Whether completed orders can be reopened.
- How revision handling works.
- Whether resubmission requires notes or supporting context.

Workflow policy should configure allowed behavior around canonical transitions. It should not permit arbitrary lifecycle status mutation outside governed transition paths.

### Queue Policy

Queue policy defines how operational attention is derived.

Examples:

- Due-soon thresholds.
- Enabled operational queues.
- Active-work definitions by role.
- Which statuses count as appraiser production work.
- Which statuses count as reviewer work.
- Admin/owner attention defaults.
- Workload thresholds in future capacity models.

Queues remain deterministic attention systems. Company configuration can adjust thresholds and enabled lenses later, but queue membership must remain explainable.

### Notification Policy

Notification policy defines when Falcon interrupts a person.

Examples:

- Recipient defaults by event.
- Admin versus owner delivery behavior.
- Actor self-suppression rules.
- Required versus optional delivery.
- Default channel preferences.
- Escalation rules later.

Notifications are personal delivery prompts. They are not the source of truth. Activity remains the durable operational record.

Not every workflow event, queue signal, or scheduling signal should become a notification.

### Calendar / Scheduling Policy

Calendar policy defines how a company interprets operational time.

Examples:

- Company timezone.
- Working days.
- Weekend visibility and scheduling behavior.
- Site visit expectations.
- Review due date expectations.
- Client due date expectations.
- Review/final compression thresholds.
- Calendar event source rules.

Calendar intelligence should remain contextual and restrained. Calendar grids should not become dense alert surfaces.

### Terminology Policy

Terminology policy defines company-facing language without changing platform semantics.

Examples:

- Appraiser naming.
- Reviewer naming.
- Assignment naming.
- Ready-for-client wording.
- Client delivery wording.
- AMC/client naming.
- Report/order naming.

Terminology can make Falcon feel native to a company, but it should not obscure canonical workflow meaning.

## 4. Role + Permission Evolution

Current Falcon still contains legacy role strings such as:

- `owner`
- `admin`
- `appraiser`
- `reviewer`
- `billing`

These roles remain useful as template roles and compatibility labels, but they should not be the long-term behavior engine.

The future model should use:

- Company-scoped role assignments.
- Role bundles backed by permission keys.
- Effective permissions resolved in company context.
- Responsibility checks based on order assignment and lifecycle state.
- Owner/admin distinction where delivery, policy, and escalation behavior require it.
- A membership/invitation model that separates auth identity from company participation.

Permission-driven behavior should answer what a user can do. Operational responsibility should answer whether the user should act on a specific order now.

Global role alone should not imply ownership of every order in that role's domain.

## 5. Company Data Scoping

Future company-scoped entities should include:

- Users and company memberships.
- Role assignments.
- Orders.
- Clients and AMCs.
- Notifications.
- Activity.
- Queue assessments.
- Calendar/scheduling events.
- Order numbering.
- Company settings and policy records.

Current frontend behavior relies heavily on RLS, views, and single-company assumptions. That is acceptable for the current MVP, but it is not the final SaaS architecture.

Company scoping should be introduced gradually and additively. Existing single-company behavior should continue to work while canonical company-aware views, RPCs, and policies are introduced.

## 6. Workflow Governance

Canonical workflow transitions remain platform-governed.

Company policy may configure workflow behavior, but it should not bypass operational integrity.

Falcon should preserve:

- Stable transition keys.
- Canonical workflow vocabulary.
- Permission checks.
- Assignment-aware responsibility.
- Activity logging.
- Notification discipline.
- Protected status-write paths.

Company policy should answer questions such as "Is final approval required?" or "Who can release to client?" It should not reintroduce direct lifecycle status editing from generic forms, tables, or legacy helpers.

## 7. Operational Intelligence + SaaS

Operational intelligence must remain deterministic across companies.

Signals should remain:

- Derived from known data.
- Explainable in plain language.
- Source-attributed.
- Role-aware.
- Quiet by default.

Queues should remain explainable attention systems, not hidden workflow states.

Notifications should remain restrained delivery prompts, not a mirror of every operational signal.

Calendar intelligence should remain contextual, especially in dense grid views.

Company configuration can later tune thresholds, enabled queues, and terminology without breaking the underlying doctrine.

## 8. Migration Philosophy

Multi-company migration must be additive.

Falcon should avoid destructive schema rewrites before canonical replacements exist and are proven.

Migration principles:

- Add company-aware fields and tables before removing legacy paths.
- Preserve compatibility layers during transition.
- Migrate semantics before infrastructure where possible.
- Keep current single-company defaults stable while introducing company policy.
- Prefer canonical views/RPCs over scattered frontend filtering.
- Introduce `company_id` gradually.
- Backfill data before enforcing constraints.
- Do not drop legacy columns, views, functions, or policies until app usage and database dependencies are verified gone.
- Backend canonicalization should follow clear product semantics, not patch around UI-specific behavior.

The goal is to move from single-company defaults to company-scoped policy without disrupting operational coherence.

## 9. Deferred Systems

The following systems are intentionally deferred:

- Billing.
- Organization switching UI.
- Company onboarding UI.
- Company settings UI.
- AI operational automation.
- Predictive scoring.
- Capacity modeling.
- Advanced tenant analytics.
- External client portals.
- Multi-region complexity.
- Tenant-specific workflow scripting.
- Broad custom lifecycle builders.

These systems should build on stable company identity, permission, workflow, notification, activity, queue, and calendar foundations.

## 10. SaaS Readiness Principles

Falcon should become multi-company without becoming operationally vague.

Principles:

- Platform doctrine should stay clear and shared.
- Company policy should tune behavior, not erase meaning.
- Workflow flexibility must not permit arbitrary status drift.
- Notification flexibility must not create inbox fatigue.
- Queue flexibility must not hide why work needs attention.
- Calendar flexibility must not overload scheduling surfaces.
- Role flexibility must be permission-backed and company-scoped.
- Activity remains durable memory across all companies.
- Operational intelligence remains deterministic before predictive.

Multi-company support is successful when each company feels configured for its operations while Falcon still feels like one coherent operational system.
