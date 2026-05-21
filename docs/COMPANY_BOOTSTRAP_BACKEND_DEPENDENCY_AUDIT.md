# Company Bootstrap Backend Dependency Audit

## Purpose

This document locks the Phase 10A2 backend dependency audit for Falcon company bootstrap.

It is documentation only. It does not introduce migrations, runtime code, permission seeds, RLS policies, RPC changes, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-specific bootstrap defaults.

Phase 10A1 defined the company bootstrap doctrine in `docs/COMPANY_BOOTSTRAP_ARCHITECTURE.md`. Phase 10A2 maps the active backend objects and open decisions that must be understood before any Phase 10A3 bootstrap RPC design work.

## Audit Finding

Falcon already has a partial backend-owned bootstrap foundation in the active migration chain:

- `public.rpc_company_bootstrap(...)`
- `public.company_audit_events`
- `public.rpc_company_setup_context()`
- owner/membership/role invariant helpers used by bootstrap and setup diagnostics

These surfaces are service-role/operator or authenticated diagnostic surfaces. They do not make bootstrap productized onboarding. They do not provision all required future defaults, and they do not make product-mode or module metadata authoritative.

Phase 10A3 should decide whether the existing operator RPC is evolved, wrapped by an Edge/server flow, or replaced by a stricter bootstrap API. Frontend-orchestrated multi-table provisioning remains disallowed.

## Current Bootstrap-Relevant Surfaces

Known active backend surfaces:

- `public.companies`
- `public.company_types`
- `public.company_memberships`
- `public.roles`
- `public.permissions`
- `public.role_permissions`
- `public.user_role_assignments`
- `public.users`
- `public.user_profiles`
- `public.company_audit_events`
- `public.company_member_invitations`
- `public.company_relationship_types`
- `public.company_relationships`
- `public.order_company_assignments`
- `public.notification_policies`
- `public.notification_prefs`
- `public.user_notification_prefs`
- `public.order_numbering_rules`
- `public.order_number_counters`
- `public.activity_log`
- `public.notifications`
- `public.orders`
- `public.clients`

Known bootstrap-adjacent RPCs/functions:

- `public.rpc_company_bootstrap(...)`
- `public.rpc_company_setup_context()`
- `public.rpc_current_company_context()`
- `public.default_company_id()`
- `public.current_company_id()`
- `public.current_app_user_id()`
- `public.current_app_user_has_current_company()`
- `public.current_app_user_permission_keys()`
- `public.current_app_user_has_permission(text)`
- `public.current_app_user_has_permission_for_company(uuid, text)`
- `public.company_active_owner_count(uuid)`
- `public.user_has_owner_role_in_company(uuid, uuid)`
- `public.assert_company_will_have_owner(uuid, uuid)`
- company member invitation prepare/finalize/accept/list/cancel/resend RPCs
- relationship lifecycle/list/detail/search RPCs
- assignment packet/list/lifecycle/activity RPCs
- notification create/list/read-state/preference RPCs
- client and order management/read/write RPCs

## Domain Audit

### Companies

Current objects:

- `public.companies`
- `public.company_types`
- `public.default_company_id()`
- `public.current_company_id()`
- `public.rpc_company_bootstrap(...)`
- `public.rpc_company_setup_context()`
- `public.rpc_current_company_context()`

Policy/trigger notes:

- Company identity is created by backend/operator paths today; bootstrap must not add frontend table writes.
- Current-company helper behavior is part of the authorization boundary for later RLS/RPC checks.

Scope:

- `companies` is company-scoped identity.
- `company_types` is a global lookup/config table.
- Active-company resolution is mixed because compatibility fallback still resolves to `falcon_default`.

Bootstrap handling:

- Create exactly one company record per bootstrap attempt.
- Set slug, display name, status, timezone, locale, `company_type`, `settings`, and `operating_mode_settings` through backend-owned logic.
- Avoid creating operational records, relationships, assignments, clients, or orders by default.

Tenant-safety concerns:

- Duplicate slugs and partial bootstrap state must be recoverable and auditable.
- `current_company_id()` compatibility fallback must not mask failed active-company setup.
- Company type or operating-mode metadata must not grant visibility.

Continental assumptions:

- None should be used. Continental AMC can be a named future template, not the default bootstrap path.

Unknowns:

- Canonical company status lifecycle after bootstrap.
- Final company settings schema.
- Whether company type is enough for package selection or only a coarse classification.

10A3 recommendation:

- Keep company creation in one backend transaction with idempotency and audit events.
- Treat `company_type` and package/mode fields as defaults/metadata only.

### Company Memberships

Current objects:

- `public.company_memberships`
- `public.current_app_user_company_ids()`
- `public.current_app_user_has_company(uuid)`
- `public.current_app_user_has_current_company()`

Policy/trigger notes:

- Membership checks feed company-aware permission helpers and hardened operational RLS/RPCs.
- First-owner membership creation should stay inside a backend bootstrap transaction.

Scope:

- Company-scoped membership rows tied to global app-user identity.

Bootstrap handling:

- Create the first active owner membership once.
- Mark first-owner membership as primary where appropriate.
- Preserve the invariant that each active company must retain at least one active owner.

Tenant-safety concerns:

- Membership creation must happen server-side.
- First-owner setup must not allow a user to create membership in another company without the bootstrap transaction.
- Last-owner protections must remain enforced by backend helpers.

Continental assumptions:

- None.

Unknowns:

- Whether future self-serve bootstrap creates a pending company before activating first owner.
- Whether multiple owners can be created during initial bootstrap or only after bootstrap through invite/member management.

10A3 recommendation:

- Bootstrap should create only the first owner membership. Staff setup should hand off to Team Access invitation management.

### Roles And Role Assignments

Current objects:

- `public.roles`
- `public.user_role_assignments`
- `public.user_roles` legacy compatibility table
- `public.users.role` legacy compatibility column
- `public.user_profiles.role` legacy compatibility column
- company-aware permission resolver functions

Policy/trigger notes:

- Active route/action behavior resolves through permission helpers, not legacy role strings.
- Last-owner protections are enforced by owner-invariant helpers and must remain backend-owned.

Scope:

- `roles.company_id is null` rows act as global template/system roles.
- `user_role_assignments` is company-scoped.
- Legacy role fields are global/mixed compatibility surfaces and should not become new authority.

Bootstrap handling:

- Assign the first owner a company-scoped role assignment.
- Use the canonical Owner template only after confirming it exists and is marked as the protected owner role.
- Avoid mutating global role templates or legacy role tables from frontend flows.

Tenant-safety concerns:

- Owner authority must be company-scoped.
- Owner role assignment must not imply platform/system admin.
- The current operator bootstrap RPC sets some legacy `public.users` owner/admin fields for compatibility; that is a known seam requiring explicit future handling.

Continental assumptions:

- None.

Unknowns:

- Whether each company should get copied role bundles or continue assigning global template roles in company context.
- Whether default role customizations require company-specific role rows before productized bootstrap.

10A3 recommendation:

- Decide the canonical owner role source before implementation.
- Keep permission checks as authority; do not infer authority from package/module metadata.

### Permissions And Seeded Permission Sets

Current objects:

- `public.permissions`
- `public.role_permissions`
- seeded template role permissions in `20260518002000_baseline_static_seed_data.sql`
- relationship, assignment, setup, route, navigation, dashboard, and operational permission keys

Policy/trigger notes:

- RLS/RPC policies consume effective permissions; bootstrap should validate seed readiness rather than alter policy logic.

Scope:

- Permission keys and role-permission seeds are global platform doctrine.
- Effective permissions are resolved in company context through role assignments.

Bootstrap handling:

- Verify required permission seeds exist.
- Do not create or modify permission keys during company bootstrap.
- Do not let selected package/module state grant permissions directly.

Tenant-safety concerns:

- Owner can have broad company authority without becoming platform admin.
- Missing role-permission seeds should block bootstrap or setup readiness, not be silently repaired by the browser.

Continental assumptions:

- None.

Unknowns:

- Whether role presets are complete enough for all package types.
- Whether productized packages will require additional permission bundles.

10A3 recommendation:

- Bootstrap should validate permission readiness and fail with operator-actionable errors if required seeds are missing.

### Invitations

Current objects:

- `public.company_member_invitations`
- `public.rpc_company_member_invite_prepare(...)`
- `public.rpc_company_member_invite_finalize(...)`
- `public.rpc_company_member_invite_accept(uuid, text)`
- invitation list/cancel/resend RPCs
- `invite-company-member` and `resend-company-member-invite` Edge functions

Policy/trigger notes:

- Invitation table access is service-role-only; browser behavior is RPC/Edge mediated.
- Invitation acceptance activates membership/role assignment state through RPCs, not direct table writes.

Scope:

- Company-scoped invitation ledger.
- Table access is service-role-only; browser access is RPC/Edge mediated.

Bootstrap handling:

- First owner bootstrap should not be modeled as a regular staff invitation because the company and owner membership may not exist yet.
- After first owner exists, staff setup should use existing invitation flows.

Tenant-safety concerns:

- Invite acceptance activates membership and invitation-scoped roles only after authenticated identity match.
- Owner grants require protected Owner grant authority.
- Finalization uses service-role work and must not expose provider invite links or tokens.

Continental assumptions:

- None.

Unknowns:

- Whether self-serve bootstrap should start from an Auth signup event or operator-created owner auth identity.
- Whether pending bootstrap invitations need a separate ledger from staff invitations.

10A3 recommendation:

- Keep first-owner bootstrap separate from staff invitation. Define a handoff point into Team Access after setup context reports an active owner.

### Company Relationships

Current objects:

- `public.company_relationship_types`
- `public.company_relationships`
- relationship lifecycle RPCs
- target discovery RPC

Policy/trigger notes:

- Direct app-role table access to relationship foundation tables remains blocked.
- Relationship lifecycle RPCs do not grant operational visibility.

Scope:

- Relationship type lookup is global.
- Relationship records are company-to-company state.

Bootstrap handling:

- Do not create relationships by default.
- Vendor/client/network participation should be explicit later setup, not implicit company creation.

Tenant-safety concerns:

- Relationship existence grants no order, client, activity, notification, calendar, queue, workflow, or team visibility.
- Cross-company work visibility must remain assignment-backed.

Continental assumptions:

- Continental-style AMC/vendor relationships must not be default.

Unknowns:

- Whether packages will suggest relationship setup steps.
- Whether relationship setup needs onboarding state.

10A3 recommendation:

- Treat relationship setup as a post-bootstrap optional flow.

### Users And Profiles

Current objects:

- `public.users`
- `public.user_profiles`
- `public.user_settings`
- quarantined legacy `public.profiles` view
- `public.rpc_current_user_app_context()`
- `public.rpc_current_user_settings_get()`
- `public.rpc_current_user_settings_update(jsonb)`

Policy/trigger notes:

- User/profile compatibility surfaces are still distinct from company membership and role-assignment authority.
- Profile/settings RPCs are user-scoped and should not become company bootstrap provisioning shortcuts.

Scope:

- App user identity is global.
- Membership and role assignment provide company participation.
- Profile/settings are user-scoped.

Bootstrap handling:

- Create or link the owner app user to the Auth user.
- Create enough owner profile identity for display and setup context.
- Avoid treating legacy role columns as bootstrap authority.

Tenant-safety concerns:

- Same Auth user may belong to multiple companies later.
- App-user creation/linking must not overwrite unrelated company context.

Continental assumptions:

- None.

Unknowns:

- Canonical app-user creation source for self-serve signups.
- Whether bootstrap should require profile completion before company activation.

10A3 recommendation:

- Require explicit owner Auth/app-user mapping inputs and return a session/active-company refresh contract rather than relying on frontend table writes.

### Activity And Audit

Current objects:

- `public.activity_log`
- `public.company_audit_events`
- `public.rpc_log_event(...)`
- assignment activity tables/RPCs

Policy/trigger notes:

- `activity_log` table/RPC access is order-derived and company-aware.
- `company_audit_events` is service-role-only and separate from operational activity.

Scope:

- `activity_log` is order-derived operational activity.
- `company_audit_events` is company-scoped bootstrap/member/system audit.
- Assignment activity is assignment-scoped.

Bootstrap handling:

- Write company audit events for bootstrap lifecycle.
- Do not write order activity during company bootstrap.

Tenant-safety concerns:

- Company audit table is service-role-only and should remain non-browsable unless a safe projection is designed.
- Bootstrap idempotency depends on audit events in the existing operator RPC.

Continental assumptions:

- None.

Unknowns:

- Whether owner setup UI needs a safe company audit projection.
- Final audit event taxonomy for onboarding.

10A3 recommendation:

- Keep bootstrap audit separate from operational activity and define stable event types before implementation.

### Notifications And Notification Policies

Current objects:

- `public.notifications`
- `public.notification_policies`
- `public.notification_prefs`
- `public.user_notification_prefs`
- notification create/list/unread/read-state/preference RPCs

Policy/trigger notes:

- Direct authenticated notification table writes are blocked in hardened paths.
- Notification read/state RPCs preserve personal notification behavior while filtering unreadable order-tied rows.
- Preference RLS/RPC behavior is user-scoped.

Scope:

- Notifications are user-scoped and may be order/company-derived.
- Notification policies are currently global/platform defaults.
- Notification preferences are user-scoped.

Bootstrap handling:

- Future bootstrap may need to initialize company notification defaults, but no confirmed company-specific notification-default table was found in the inspected active migrations.
- Bootstrap should not create personal notification rows.

Tenant-safety concerns:

- Order-tied notifications must remain hidden unless the source order is readable.
- Authenticated non-order notification creation is blocked in current hardened paths.
- Global notification policies should not be mutated per company.

Continental assumptions:

- None.

Unknowns:

- Whether company notification defaults will live in a new table, `companies.settings`, or policy override JSON.
- How package/module defaults influence notification defaults without becoming authority.

10A3 recommendation:

- Leave notification-default provisioning out of first bootstrap implementation unless a company-scoped settings contract is locked.

### Clients

Current objects:

- `public.clients`
- client read/write predicates
- client management read/mutation RPCs
- order-form client option/search/create RPCs
- `public.v_client_kpis`
- `public.v_client_metrics`

Policy/trigger notes:

- Client reads and writes are company-aware through hardened policies, triggers, and management RPCs.
- Client `company_id` is backend-owned and preserved by trigger behavior.

Scope:

- Company-scoped operational records after multi-company hardening.

Bootstrap handling:

- Do not create clients by default.
- Optional sample/client setup must be a later explicit onboarding step.

Tenant-safety concerns:

- Global client name uniqueness still exists as a deferred caveat in prior docs.
- Client reads/writes must remain company-aware and permission/RPC mediated.

Continental assumptions:

- No default AMC/lender/client hierarchy should be created.

Unknowns:

- Whether onboarding will include guided client creation.
- Final company-scoped duplicate-name strategy.

10A3 recommendation:

- Bootstrap should avoid client creation and only set up prerequisites that client management already expects.

### Vendors And Vendor Panel Concepts

Current objects:

- `public.company_types` includes `vendor`.
- `public.company_relationships` can model vendor relationships.
- `public.order_company_assignments` models cross-company work packets.
- Product-mode/vendor portal metadata exists in frontend planning/diagnostics only.

Policy/trigger notes:

- Vendor access is assignment-packet/RPC scoped, not direct order/client/table access.
- Relationship state alone has no RLS authority for operational records.

Scope:

- Vendor capability is relationship/assignment-scoped, not canonical order visibility.

Bootstrap handling:

- Do not expose Vendor Portal or vendor panel live surfaces by default.
- Do not create vendor relationships or assignment visibility during company bootstrap.

Tenant-safety concerns:

- Vendor users must remain packet-only unless explicitly granted by assignment RPCs.
- Vendor/client product-mode metadata is not security authority.

Continental assumptions:

- Continental vendor workflows must not define default bootstrap.

Unknowns:

- Whether future vendor-only companies need a distinct bootstrap branch.
- Whether vendor onboarding requires different role presets.

10A3 recommendation:

- Keep vendor setup outside first company bootstrap and require explicit later enablement.

### Orders And Assignment Visibility

Current objects:

- `public.orders`
- order read/write helpers and policies
- `public.rpc_transition_order_status(uuid, text, text)`
- assignment/date guardrail RPCs
- `public.order_company_assignments`
- assignment packet/list/lifecycle/activity RPCs

Policy/trigger notes:

- Order read/write policies and workflow/assignment/date RPCs are company-aware.
- Assignment packet RPCs enforce packet-scoped visibility without canonical order access for assigned companies.

Scope:

- Orders are company-scoped operational roots.
- Cross-company work access is assignment-scoped and packet-only.

Bootstrap handling:

- Do not create orders or assignments by default.
- Do not grant canonical order visibility to related companies.

Tenant-safety concerns:

- Assignment packets are not canonical order access.
- Workflow authority remains the canonical transition RPC plus permissions/responsibility checks.

Continental assumptions:

- No AMC order workflow should be default.

Unknowns:

- Whether onboarding will offer optional first-order creation.
- Whether starter packages need different order intake defaults.

10A3 recommendation:

- Bootstrap should provision company identity/access only, leaving operational records to post-bootstrap workflows.

### Order Numbering

Current objects:

- `public.order_numbering_rules`
- `public.order_number_counters`
- legacy `public.order_counters`
- order-number generation functions in the baseline

Policy/trigger notes:

- Number generation relies on existing rule/counter tables; no company-bootstrap RLS or trigger contract is locked for new companies.
- Existing order-number availability helpers should not be assumed company-safe without further inspection.

Scope:

- Mixed/legacy. The active seeded rule uses `company_key = 'falcon_default'`, not a direct `company_id`.

Bootstrap handling:

- Future bootstrap must provision a company-safe order-numbering default before new companies create orders.
- Existing operator bootstrap does not appear to create a per-company numbering rule.

Tenant-safety concerns:

- Company-safe uniqueness and counters must not collide across companies.
- `company_key` strategy must be reconciled with `companies.id` and `companies.slug`.

Continental assumptions:

- No Continental-specific numbering format should be default.

Unknowns:

- Whether `company_key` should be replaced, bridged to slug, or superseded by a `company_id` FK.
- Whether manual overrides stay allowed by default for all packages.

10A3 recommendation:

- Treat order-numbering defaults as a required pre-RPC decision. Do not let first order creation rely on `falcon_default` numbering for non-default companies.

### Settings And Company Settings Shells

Current objects:

- `public.companies.settings`
- `public.companies.operating_mode_settings`
- `public.company_types.default_settings`
- `public.company_types.onboarding_defaults`
- `public.user_settings`
- current-user settings RPCs

Policy/trigger notes:

- User settings RPCs are not company settings.
- Company settings currently appear as JSON shells; no settings-policy enforcement contract is locked.

Scope:

- Company settings are currently JSON shells on company/company type records.
- User settings are user-scoped.

Bootstrap handling:

- Future bootstrap should seed a minimal company settings shell only after its schema is locked.
- Do not confuse user settings with company settings.

Tenant-safety concerns:

- Settings can configure defaults but must not bypass RLS, permissions, route guards, workflow, or assignment visibility.

Continental assumptions:

- None.

Unknowns:

- Whether company settings should remain JSON or move to normalized tables.
- Whether timezone/locale/branding/order numbering/notification defaults live in one settings shell or separate domain tables.

10A3 recommendation:

- Use explicit input fields for timezone/locale and defer broader settings until a settings contract is documented.

### Modules And Product-Mode Defaults

Current objects:

- Frontend product-mode constants/metadata.
- Frontend module registry and diagnostics.
- Current-live navigation, command, and dashboard registries/helpers.
- `public.companies.operating_mode_settings` as a backend JSON placeholder.

Policy/trigger notes:

- Route/action permissions, RLS, RPCs, and assignment/order/client predicates remain authority.
- Product-mode/module registries do not participate in database policy enforcement.

Scope:

- Product-mode/module metadata is diagnostic/composition metadata.
- It is not runtime authority.

Bootstrap handling:

- A selected package/product mode may seed default settings or onboarding copy later.
- It must not grant permissions, visibility, or route access directly.

Tenant-safety concerns:

- Module-enabled state must not become security authority.
- Vendor/Client future shells must remain hidden unless explicitly enabled by later safe contracts.

Continental assumptions:

- No Continental package hardcoding.

Unknowns:

- Whether durable module/package state will exist in the database.
- Whether packages map to role presets or only setup defaults.

10A3 recommendation:

- Accept only metadata-level package/mode input, and resolve authority from permissions/memberships/RLS/RPCs.

### Onboarding State

Current objects:

- `public.rpc_company_setup_context()`
- `public.company_types.onboarding_defaults`
- `public.company_audit_events`

Policy/trigger notes:

- Setup context is a safe projection RPC, not a write state machine.
- No persistent onboarding-state policy/trigger contract was confirmed in inspected active migrations.

Scope:

- Setup context is computed, authenticated, and company-scoped.
- No persistent onboarding-state table was confirmed in the inspected active migrations.

Bootstrap handling:

- Bootstrap should eventually create or initialize onboarding state only after a model is locked.
- Current setup context can report readiness but is not a full onboarding workflow state machine.

Tenant-safety concerns:

- Onboarding progress must not imply authorization.
- Setup completion must not expose data from another company.

Continental assumptions:

- None.

Unknowns:

- Whether onboarding state is computed, persisted, or hybrid.
- What steps are required by package/type.

10A3 recommendation:

- Do not add onboarding writes in bootstrap until Phase 10A4 locks the model.

### Dashboard, Navigation, And Command Registry Assumptions

Current objects:

- Current-live frontend registries/helpers for TopNav, settings/admin utility links, CommandPalette, and DashboardGate resolution.
- Product-mode/shadow metadata diagnostics.
- Route/action permission checks.

Policy/trigger notes:

- Registry helpers do not grant authority; route/action permission checks still gate live surfaces.
- DashboardGate resolution remains frontend composition over current permissions/capabilities.

Scope:

- Frontend current-live registries are behavior-preserving composition helpers.
- Route/action permissions remain authority.

Bootstrap handling:

- No dashboard/nav/command backend provisioning is required for first company creation beyond correct permissions and memberships.

Tenant-safety concerns:

- Product-mode metadata must not route users into live surfaces without route permissions.
- Assignment-only dashboard access remains packet/RPC based.

Continental assumptions:

- None.

Unknowns:

- Whether future packages will customize nav defaults.

10A3 recommendation:

- Keep registry behavior outside bootstrap. Bootstrap should only create authority-bearing backend records.

### Audit And Diagnostics

Current objects:

- `public.company_audit_events`
- `public.rpc_company_setup_context()`
- `public.rpc_current_company_context()`
- Product Metadata Diagnostics page
- shadow parity/metadata diagnostics

Policy/trigger notes:

- Diagnostics should remain safe projections and static checks.
- Raw audit tables and backend ledgers should not be browsable without explicit projection RPCs.

Scope:

- Company audit is company-scoped and service-role-only at table level.
- Diagnostics expose safe projections.

Bootstrap handling:

- Bootstrap must write deterministic audit events.
- Future owner setup should use safe diagnostic/setup projections, not raw tables.

Tenant-safety concerns:

- Audit metadata must not leak provider tokens, cross-company identifiers, raw permission internals, or private operational payloads.

Continental assumptions:

- None.

Unknowns:

- Final owner-visible audit projection.
- Final bootstrap recovery checklist for partial state.

10A3 recommendation:

- Define audit event names and recovery behavior before implementation changes.

## Bootstrap Blockers / Required Pre-RPC Decisions

Before Phase 10A3 implementation design can be locked, Falcon needs decisions on:

- Canonical owner role source: continue using global template Owner roles in company context, or create company-specific role copies during bootstrap.
- Default role templates: confirm required global templates exist for Owner, Admin, Appraiser, Reviewer, and Billing, or define how missing templates block bootstrap.
- Company settings shell: decide whether `companies.settings`, `companies.operating_mode_settings`, normalized settings tables, or a hybrid model owns bootstrap defaults.
- Module/package state: decide whether durable package/module state exists at all, and keep it non-authoritative if it does.
- Onboarding state: decide whether onboarding progress is computed from setup context, persisted in a table, or hybrid.
- Order numbering: define company-safe numbering defaults and how `order_numbering_rules.company_key` relates to new company identity.
- Notification defaults: decide whether company notification defaults live in global policies, company overrides, settings JSON, or a new table.
- Invitation bridge: define how first-owner bootstrap hands off to Team Access invitation management without reusing staff invitation as first-owner provisioning.
- Existing bootstrap RPC posture: decide whether to evolve, wrap, or replace `rpc_company_bootstrap(...)`.
- Legacy user role fields: decide how long bootstrap may set `public.users.role` and `public.users.is_admin` for compatibility.
- Active-company claim refresh: define the safe server/Edge contract for putting the new company into session metadata.
- Continental templates: confirm Continental remains a named future template only, not the default bootstrap path.

## Safe 10A3 Inputs

A future bootstrap RPC or backend bootstrap service should likely require:

- Idempotency key.
- Company slug or backend-derived slug.
- Company display name.
- Optional company legal name.
- Owner Auth user id and/or existing owner app user id.
- Owner email and display name when creating/linking the app user.
- Initial company type.
- Initial package or product-mode key as metadata only.
- Optional timezone.
- Optional locale.
- Optional branding seed.
- Optional starting order-number format or prefix, only after numbering contract is locked.
- Optional setup intent metadata for audit and diagnostics.
- Operator/request context for service-role mediated flows.

These inputs should be validated server-side. The browser should not orchestrate the resulting table writes.

## Things 10A3 Must Not Do

Phase 10A3 must not design or introduce:

- Direct product-mode authority.
- Module-authoritative security.
- Cross-tenant grants.
- Global admin escalation from company Owner status.
- Frontend-orchestrated multi-table provisioning.
- Automatic Vendor/Client live shell activation.
- Continental template hardcoding.
- Direct app-role writes to bootstrap ledger tables.
- Operational order/client/assignment creation as part of default company bootstrap.
- Permission seed mutation during company bootstrap.

## Recommended 10A3 Handling

Phase 10A3 should produce a design lock before implementation:

- Treat existing `rpc_company_bootstrap(...)` as an audited partial foundation, not a completed product bootstrap.
- Preserve service-role/operator safety unless a self-serve Edge-mediated flow is explicitly designed.
- Keep company creation, first-owner membership, first-owner role assignment, and audit writes in one deterministic backend transaction.
- Return a safe active-company/session-refresh contract.
- Validate role/permission/template readiness before writes that depend on them.
- Defer onboarding state writes, module/package state writes, notification defaults, and order-numbering provisioning unless their contracts are locked.
- Document recovery behavior for duplicate slug, duplicate owner, partial audit state, missing template role, and failed active-company claim refresh.

Phase 10A3 is complete as `docs/COMPANY_BOOTSTRAP_RPC_CONTRACT.md`. The contract recommends wrapping the existing service-role bootstrap primitive behind a future backend/Edge service boundary or versioned JSON-shaped successor, while keeping product-mode/module metadata non-authoritative and leaving unresolved settings, onboarding, order-numbering, and notification-default models out of SQL implementation until their contracts are locked.

## Phase 10A2 Lock

Phase 10A2 is documentation-only.

It adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default bootstrap assumptions.
