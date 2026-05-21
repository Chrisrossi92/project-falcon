# Multi-Company Tenant Hardening Checkpoint

## Purpose

This checkpoint captures the current tenant-hardening state after baseline recovery and Multi-Company Foundation work through Slice 7H2A.

Falcon remains in compatibility mode for areas not explicitly hardened. Backend-enforced company isolation now exists for selected operational roots and mutation paths, but frontend organization switching, onboarding UI, and broader RLS cleanup remain deferred.

## 1. Baseline Recovery

Completed:

- A replay-safe Falcon baseline migration chain was created from the authoritative schema state.
- Historical replay-unsafe migrations were archived under `supabase/migrations_archive/pre_baseline_replay_unsafe_20260517/active`.
- Active migrations now start from the curated baseline instead of legacy migrations that assumed an already-evolved database.
- Local `supabase db reset` passes against the active migration chain.

Current doctrine:

- Do not reintroduce archived historical migrations into the active chain.
- New database work should be additive forward migrations after the curated baseline and completed multi-company foundation migrations.
- Baseline recovery preserved current runtime behavior while removing replay-order assumptions.

## 2. Multi-Company Foundation

Completed:

- `public.companies` exists with the default Falcon company seeded.
- Core operational records have `company_id` backfills/projections where needed.
- Company scope is projected through orders, clients, notifications, activity, and calendar compatibility surfaces.
- `public.company_memberships` exists and seeds existing users into the default company during compatibility mode.
- `public.user_role_assignments` exists as the company-aware successor to legacy `user_roles`.
- Permission helper wrappers now resolve through `current_company_id()` and company-aware role assignments:
  - `current_app_user_permission_keys()`
  - `current_app_user_has_permission(text)`
  - `current_app_user_has_any_permission(text[])`
  - `current_app_user_has_all_permissions(text[])`
- The active-company context contract exists:
  - JWT/app metadata active-company claims are membership-validated.
  - Invalid, missing, or unauthorized claims fall back to `default_company_id()` during compatibility mode.
  - `current_app_user_has_current_company()` exposes the resolved-company membership check.
  - `rpc_current_company_context()` provides diagnostic visibility.

Still legacy by design:

- `current_is_admin()` and `current_is_appraiser()` remain legacy compatibility helpers.
- Compatibility mode still preserves single-company behavior for unhardened surfaces.

## 3. Read Isolation Completed

Completed backend-enforced read isolation:

- Orders are the first company read-isolated operational root.
- Order views are recreated with `security_invoker = true` and explicit readable-order predicates:
  - `v_orders_frontend_v4`
  - `v_orders_active_frontend_v4`
  - `v_orders_list`
  - `v_orders_list_with_last_activity`
- `can_read_order(uuid)` delegates to the company-aware order read helper.
- Order-derived calendar reads require readable source orders.
- Order-derived activity reads require readable source orders.
- Direct `activity_log` table reads require readable source orders for authenticated app access.
- Order-tied notifications are hidden and count-excluded when the source order is unreadable.
- Direct notification table reads use `current_app_user_id()` and require readable source orders when `order_id` is present.
- Clients are company-owned operational records for read isolation.
- Client KPI/metrics views are recreated with `security_invoker = true` and explicit readable-client/order predicates:
  - `v_client_kpis`
  - `v_client_metrics`
  - `v_client_kpis_appraiser`
- Client read helpers and patched client lookup functions preserve default-company compatibility while blocking cross-company reads.
- Legacy exposed order/calendar/client/profile/email/staging/preference views that bypassed the hardened path are quarantined for app roles.

No frontend-only tenant filtering is treated as authoritative.

## 4. Write Isolation Completed

Completed backend-enforced write hardening:

- Client direct table writes require company-aware backend authorization.
- Client inserts resolve `company_id` server-side from `current_company_id()`.
- Client updates preserve existing `company_id`; frontend-sent `company_id` is ignored.
- Client mutation RPCs now enforce the same create/update/delete helper layer as direct writes.
- `merge_clients(bigint, bigint, jsonb)` is current-company and permission hardened.
- `merge_clients` only reassigns current-company linked orders and child clients.
- `merge_clients` blocks cross-company drift and already-merged source/target records.
- Order intake now has a backend-enforced client/AMC attachment contract:
  - `orders.company_id` resolves server-side on insert.
  - `orders.company_id` is preserved on update.
  - linked `client_id` must be readable, same-company, and non-merged.
  - linked `managing_amc_id` must be readable, same-company, non-merged, and `category = 'amc'`.
  - manual-only orders remain allowed.
- Active bigint-compatible order RPCs remain working:
  - `rpc_create_order(jsonb)`
  - `rpc_update_order(uuid, jsonb)`
  - `rpc_order_update(uuid, jsonb)`
- Legacy uuid-based order RPC/import paths are quarantined:
  - `rpc_order_create(jsonb)`
  - `rpc_order_update(text, jsonb)`
  - `import_orders_from_json(jsonb)`
- PUBLIC, anon, and authenticated execute access is revoked from the three legacy paths.
- `import_orders_from_json(jsonb)` is service-role-only and marked deprecated/unsafe for multi-company imports.
- Order table writes now use company-aware policies:
  - `orders_insert_company_authorized`
  - `orders_update_company_authorized`
  - `orders_delete_company_authorized`
- Legacy order insert/update/delete policies were removed.
- Order inserts use `current_app_user_can_create_order()`.
- Order updates use `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`.
- Existing trigger-owned order `company_id` behavior is preserved: inserts resolve through `current_company_id()`, updates preserve existing company ownership, and frontend-sent `company_id` remains ignored.
- The canonical workflow transition RPC is now company-aware:
  - `rpc_transition_order_status(uuid, text, text)` requires current-company membership.
  - The target order must match `current_company_id()`.
  - The target order must be readable through `current_app_user_can_read_order(uuid)`.
  - The target order must be updateable through `current_app_user_can_update_order_row(uuid, uuid, uuid, uuid, text)`.
  - Smart Actions semantics, transition validation, lifecycle governance, and trigger-driven status activity behavior are preserved.
- Legacy arbitrary workflow/status RPCs are quarantined:
  - signatures are preserved for compatibility discovery;
  - bodies raise clear deprecated/quarantined exceptions;
  - `PUBLIC`, `anon`, and `authenticated` execute privileges are revoked;
  - `service_role` remains granted but still receives deprecated exceptions.
- `rpc_transition_order_status(uuid, text, text)` remains the only lifecycle authority.
- Assignment/date mutation guardrails are in place:
  - assignment target helpers validate current-company membership and role/capability where practical;
  - trigger-level assignment validation protects `orders.appraiser_id`, `orders.assigned_to`, `orders.reviewer_id`, and `orders.current_reviewer_id`;
  - `rpc_assign_order(uuid, uuid, text)`, `rpc_update_due_dates(uuid, date, date)`, and `rpc_update_order_dates(uuid, timestamptz, timestamptz, timestamptz)` require readable/updateable current-company orders;
  - stale assignment/date RPCs are quarantined and raise deprecated exceptions.
- Activity log table/RPC hardening is in place:
  - `activity_log` table reads and inserts are company/order-aware for authenticated app access;
  - broad `USING true` and `WITH CHECK true` activity policies were removed;
  - authenticated access to `order_id is null` activity is blocked by default;
  - `activity_log` update/delete remain blocked for authenticated users;
  - both active `rpc_log_event` overloads require current-company membership plus readable/updateable source order authorization.
- Notification table/RPC hardening is in place:
  - notification table policies use `current_app_user_id()` as the canonical identity;
  - direct authenticated notification INSERT/UPDATE/DELETE is blocked;
  - `rpc_notification_create(jsonb)` requires current-company membership and readable/updateable source orders for authenticated order-tied notifications;
  - notification company context is derived from the source order rather than frontend-sent `company_id`;
  - recipients must be active members of the source order company;
  - authenticated non-order notification creation is blocked;
  - service-role non-order notification creation is preserved for operator/system paths;
  - read, mark-read, mark-all-read, dismiss, dismiss-seen, and legacy mark-read wrappers only affect current-user readable notifications;
  - legacy manual/debug notification RPCs are quarantined with app-role execute revoked.
- Legacy exposed view/grant quarantine is in place:
  - `anon` and `authenticated` SELECT is revoked from 17 unsafe legacy views;
  - canonical hardened order/calendar/client views remain accessible;
  - `v_order_activity_feed` and `v_order_activity_compat` hide `order_id is null` rows;
  - quarantine/future explicit-grants cleanup comments are present;
  - no objects were moved, renamed, or removed.
- Explicit authenticated grant hardening is in place:
  - broad `PUBLIC`, `anon`, and `authenticated` table/view, sequence, and function privileges are removed;
  - `anon` has no table, view, sequence, or function access in `public`;
  - `authenticated` access is now an explicit allowlist only;
  - canonical hardened views, current direct-table compatibility surfaces, and active hardened RPC/helper functions remain granted;
  - quarantined workflow/order/import/debug/manual notification/email queue paths remain inaccessible to `anon` and `authenticated`;
  - `service_role` broad access is intentionally preserved for operator/backfill compatibility pending a later operator-path cleanup slice.

Preserved behavior:

- Direct frontend writes remain compatible for authorized users.
- Inline New Order client creation remains compatible for authorized users.
- Current hard-delete semantics remain unchanged where still allowed.
- Smart Actions, lifecycle semantics, notification bell/read-count behavior, activity behavior, frontend intake UI, queue/calendar projections, and uniqueness behavior were not changed.

## 5. Still Deferred

Deferred hardening and cleanup:

- `current_reviewer_id` model cleanup.
- Review-route redesign and assignment model consolidation.
- `calendar_events` table policy cleanup.
- Notification preference company semantics.
- Productized manual/system notification path.
- `supabase_admin` future-object default ACL cleanup, which remains a manual/platform-role follow-up because local replay cannot alter that platform role from the migration role.
- Service-role grant reduction after operator/backfill paths are inventoried.
- Users/team directory tenant isolation.
- Contacts/AMC/lender hierarchy isolation.
- Client uniqueness migration.
- Company-scoped order numbering.
- Organization switching and onboarding UI.
- Multi-company-safe importer rewrite.
- Full manual browser/Auth validation for company member invite links and Team Access invitation management.

Known compatibility caveats:

- `clients.name` still has global uniqueness; company-scoped duplicate/canonicalization strategy is deferred.
- `orders.amc_id` remains a legacy uuid AMC relationship; `managing_amc_id` is the current client-table AMC attachment direction.
- Compatibility fallback through the default company remains active until org switching and onboarding are implemented.

## 6. Current Validation Status

Passed:

- `supabase db reset` passes against the active migration chain.
- Generated Supabase TypeScript types were refreshed from the replayed local database.
- Slice 7F1 policy catalog checks, same-company direct write checks, cross-company negative checks, appraiser/reviewer update compatibility checks, no-role negative checks, spoofed `company_id` checks, and direct order update/archive/delete parity checks passed.
- Slice 7F2 same-company appraiser/reviewer/admin transition checks, cross-company transition rejection, stale company claim rejection, no-role rejection, and status activity side-effect checks passed.
- Slice 7F3 catalog grant/comment checks, anon/authenticated execution denial checks, service-role deprecated exception checks, canonical same-company transition checks, cross-company/no-role canonical transition rejection, and canonical status/activity side-effect checks passed.
- Slice 7F4A catalog grant/comment checks, same-company assignment success, cross-company and wrong-role assignment rejection, same-company date update success, unreadable-order mutation rejection, quarantined RPC exception checks, calendar/order projection date parity, and assignment/date activity side-effect parity passed.
- Slice 7G1 activity policy catalog checks, same-company/cross-company/no-role activity visibility checks, direct insert and RPC positive/negative checks, assignment/date side-effect activity checks, and final clean `supabase db reset` passed.
- Slice 7G2A notification policy catalog checks, same-company order-tied create checks, cross-company/unreadable order rejection, outside-company recipient rejection, actor suppression checks, authenticated non-order create rejection, service-role non-order create preservation, read/unread/dismiss parity, notification bell smoke checks, and final clean `supabase db reset` passed.
- Slice 7H1 legacy view catalog checks, canonical view access checks, active frontend smoke checks for orders/dashboard/calendar/clients/notifications/activity, order-id-null activity visibility checks, and final clean `supabase db reset` passed.
- Slice 7H2A grant catalog checks passed: no broad `anon` object/function access remains, authenticated access is limited to the explicit allowlist, canonical hardened views/RPCs remain accessible, and quarantined/import/debug/manual notification/email queue paths remain inaccessible to app roles.
- Phase 8B1/8B2 relationship foundation checks passed: company type and relationship type seed rows exist, `falcon_default` is `staff_shop`, relationship foundation tables have RLS enabled, `anon` and `authenticated` have no access to the new tables, `service_role` has access, and order/client policy checks remain unchanged.
- Phase 8B3 relationship lifecycle checks passed: relationship permissions are seeded, lifecycle RPC/helper grants are correct, direct table access remains blocked, source invite succeeds, target accept/decline succeeds, source accept is denied, unrelated company access is denied, status transitions are enforced, duplicate current relationships are blocked, and order/client policy checks remain unchanged.
- Phase 8C5E3-E5 company member invite checks passed: clean reset, invitation table RLS/service-role table access, prepare/finalize/accept RPC grant checks, caller-scoped prepare, service-role-only finalize, sent invited membership creation, inactive staged role assignments, no pre-accept company permissions, authenticated acceptance activation, invitation-scoped role activation, accept audit creation, wrong-user rejection, double-accept rejection, frontend public accept route, safe login return path, no forbidden frontend table access, lint, build, and `git diff --check`.
- Phase 8C5F1-F3 invitation management checks passed: clean reset, invitation list/cancel RPC grant and behavior checks, open/terminal/all/exact status filtering, current-company scoping, safe projection checks, cancel prepared/sent/auth-failed behavior, accepted/expired cancel blocking, Owner-role cancel permission checks, resend prepare/finalize RPC checks, resend Edge Function checks, new invitation row creation, prior pending invitation cancellation/replacement, invited membership reuse without active membership mutation, no legacy role mutation, no provider link/token exposure, Team Access UI static leakage scans, Deno checks, lint, build, and `git diff --check`.
- Phase 8C5G4A1-A3A assignable-user checks passed: `rpc_company_assignable_users` exists as the assignment picker projection, AssignmentFields appraiser/reviewer pickers use the company-members wrapper, OrdersFilters appraiser filter uses the wrapper, `AppraiserSelect` uses the wrapper, direct assignment-picker `profiles`/`user_roles` split fallback reads are removed, old `listAssignableUsers` is gone, dead singular `userService.listAppraisers` compatibility is deleted, lint, build, and `git diff --check` passed.
- Phase 8C5G4B1-C4 order client intake checks passed: `rpc_order_filter_clients`, `rpc_order_form_client_options`, `rpc_order_form_client_name_search`, and `rpc_order_form_client_create` exist as narrow safe projections/mutations; OrdersFilters client filter uses the filter RPC; ClientFields client/AMC pickers use the order-form options RPC; OrderForm duplicate search and inline client creation use the order-form RPCs; dormant `ClientSelect.jsx` is deleted; active order form paths no longer directly read `clients`, call broad `createClient`, or call broad `searchClientsByName`; lint, build, and `git diff --check` passed.
- Phase 8C5H1-H2E broad client management checks passed: `rpc_client_management_list`, `rpc_client_management_detail`, `rpc_client_management_amc_options`, `rpc_client_management_create`, `rpc_client_management_update`, and `rpc_client_management_archive` exist as guarded client management surfaces; active client list/detail/edit/profile/Form reads use the read RPC wrappers; active NewClient/EditClient/ClientDetail create/update paths use mutation RPC wrappers; hard delete is not wired in the active UI; dormant legacy client components and `useClients` were deleted; `clientsService` now contains only `listClientOrders` and `isClientNameAvailable`; targeted scans found no direct `.from("clients")` in active client management paths; lint, build, and `git diff --check` passed.
- Phase 8C5I checks passed: Settings profile color load/save uses `rpc_current_user_settings_get()` / `rpc_current_user_settings_update(jsonb)`, Settings no longer imports `setUserColor`, and dormant `usersService` / `useUsers` were deleted after import scans.
- Phase 8C5J1-J5 route/context cleanup checks passed: `rpc_current_user_app_context()` exists as a safe current-user app context foundation, route config no longer passes legacy role props, `TopNav` and `ProtectedRoute` no longer import/call `useRole`, route authority is expressed through permission props, dashboard/calendar/order-table lenses, Quick Actions, ClientDetail order-history lensing, and ActivityNote actor metadata use permission hooks plus `useCurrentUserAppContext`, dormant legacy role UI components were deleted, the dead `useRole` / `rolesService` files were deleted, lint, build, and `git diff --check` passed.
- Phase 8C5J6A-K2B backend role-surface containment checks passed: legacy role RPCs were revoked from `anon`/`authenticated` and marked deprecated, direct authenticated `public.user_roles` reads were revoked, `current_app_user_can_read_order_row(...)` now uses `orders.read.all` / `orders.read.assigned` instead of `current_is_admin()`, `order_activity` update/delete policies use `activity.moderate`, the legacy `user_roles`-joining `order_activity` select policy was removed, `review_flow` admin read now delegates to `can_read_order(order_id)`, targeted catalog scans passed, targeted transaction-scoped fixtures passed, lint, build, and `git diff --check` passed.
- 8C5K-PAUSE is now the locked state: further legacy SQL retirement is deferred until product direction and final implementation path are settled.
- `npm run lint` passes with known existing warnings.
- `npm run build` passes with known Tailwind ambiguity and bundle chunk-size warnings.
- `git diff --check` passes.

Manual browser/Auth validation still required:

- Use `docs/MANUAL_E2E_TEST_PLAN.md` as the first-pass execution checklist for login/session/current-company, permission route access, invite lifecycle, Team Access member actions, order assignment/client intake, client management, dashboard/calendar visibility, and Settings profile color.
- Owner/admin sends a company member invite through the invite Edge Function.
- Pending invite appears in Team Access.
- Resend creates/replaces the pending invite and sends a new provider invite email.
- Cancel removes pending invite actionability.
- Recipient opens the email link while logged out.
- Login returns to `/accept-invite/:invitationId`.
- Invite accepts successfully and refreshes the session.
- `set-active-company` succeeds when the accepted company is not the active context.
- Dashboard loads for the accepted company.
- Wrong-user invite shows safe error copy.
- Expired invite shows safe error copy.
- Already accepted invite shows safe error copy.

Validation doctrine:

- Future tenant-hardening slices should continue to run clean replay reset, catalog checks, default-company parity checks, cross-company negative tests where feasible, type generation when schema changes, lint, build, and whitespace checks.

## 7. Final Phase 7H Status

Phase 7H closes the backend tenant-hardening pass for the current operational core.

Current status:

- The tenant-safe operational core is established for orders, order-derived reads, clients, client mutations, workflow transitions, assignment/date mutation paths, activity, notifications, canonical hardened views, and app-role grants.
- Broad app-role grants are removed.
- `authenticated` access is explicit allowlist only.
- `anon` has zero table, view, sequence, or function access in `public`.
- `service_role` broad access remains intentionally deferred for operator/backfill compatibility.
- `supabase_admin` future-object default ACL cleanup remains a manual/platform-role follow-up.

Current major deferred domains:

- Users/team directory isolation.
- Browser/Auth acceptance and Team Access invitation management QA.
- `calendar_events` table policy cleanup.
- Contacts/AMC/lender hierarchy.
- Notification preferences.
- Client uniqueness and company-scoped normalized name strategy.
- ClientProfile order-history compatibility through `listClientOrders` and active ClientForm duplicate checks through `isClientNameAvailable`.
- Company-scoped order numbering.
- Historical audit docs still mention legacy `useRole`, but active source no longer imports or calls it. Remaining role/authority cleanup is intentionally paused after backend role RPC and highest-risk policy containment.
- Deferred legacy SQL cleanup includes users RLS rationalization, remaining helper functions that read `public.user_roles` / `public.users.role`, `public.profiles.role`, default-company fallback removal from company-aware helpers, and eventual `public.user_roles` / `public.users.role` retirement.
- Do not drop old compatibility tables/columns until final repo cleanup revisits stale SQL helpers, overlapping policies, and product direction.
- Service-role/operator allowlist.
- Organization switching and onboarding UI.

## 8. Phase 8B1/8B2 Relationship Foundation Status

Phase 8B1/8B2 establishes the static company relationship model foundation without changing operational behavior.

Current status:

- Company type foundation exists through `company_types`, `companies.company_type`, and `companies.operating_mode_settings`.
- Existing companies, including `falcon_default`, are defaulted/backfilled to `staff_shop`.
- Relationship type foundation exists through `company_relationship_types`.
- `company_relationships` exists with directional `source_company_id` and `target_company_id` semantics, lifecycle status, compliance/settings metadata, audit columns, timestamps, constraints, and indexes.
- Relationship records alone grant no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Future scoped cross-company visibility must be assignment-backed.
- New relationship foundation tables are RLS-enabled and service-role-only for now.
- No order, client, workflow, onboarding, company switching, frontend, or app-role access behavior changed.
- Validation passed with clean reset, seed/catalog checks, RLS/grant checks, unchanged order/client policy checks, regenerated Supabase types, lint, build, and `git diff --check`.

## 9. Phase 8B3 Relationship Lifecycle RPC Status

Phase 8B3 establishes guarded relationship lifecycle RPCs without granting operational visibility.

Current status:

- Relationship lifecycle RPC foundation exists.
- Relationship permissions are seeded.
- Direct app-role table access to `company_types`, `company_relationship_types`, and `company_relationships` remains blocked.
- Lifecycle RPCs control list, detail, invite, accept, decline, suspend, reactivate, and archive operations.
- Relationship source company, target company, and relationship type are immutable after creation.
- Relationship status transition rules are trigger-enforced.
- Relationships and lifecycle status still grant no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- No assignment tables, vendor visibility, onboarding UI, workflow behavior, or order/client read-helper changes were introduced.
- Validation passed with clean reset, permission seed checks, RPC/table grant checks, relationship lifecycle fixture checks, unchanged order/client policy checks, regenerated Supabase types, lint, build, and `git diff --check`.

## 10. Recommended Next Major Phase

Recommended next work:

- Phase 8: Product-facing multi-company enablement inspection.

Phase 8 should inspect before editing and should cover:

- Company switching UX.
- Company provisioning and onboarding.
- Team directory membership model.
- Company-scoped numbering.
- User invitation and role assignment flow.
