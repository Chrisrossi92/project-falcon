# Company Bootstrap Primitive Inspection

## Purpose

This document locks Phase 10B1: read-only inspection of the current company bootstrap/setup primitives.

It is documentation-only plus read-only code/schema inspection. It does not introduce migrations, runtime code, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, tests, generated files, provisioning mutation, or bootstrap wrapper behavior.

Phase 10A8 recommended Phase 10B begin by inspecting existing bootstrap primitives before any runtime implementation. This document records what currently exists and how it maps to the Phase 10A contracts.

## Sources Inspected

Docs inspected:

- `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`
- `docs/COMPANY_BOOTSTRAP_ARCHITECTURE.md`
- `docs/COMPANY_BOOTSTRAP_BACKEND_DEPENDENCY_AUDIT.md`
- `docs/COMPANY_BOOTSTRAP_RPC_CONTRACT.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`
- `docs/COMPANY_ONBOARDING_STATE_MODEL.md`
- `docs/INVITE_STAFF_SETUP_BRIDGE_CONTRACT.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

SQL migrations inspected:

- `supabase/migrations/20260518008000_company_membership_foundation.sql`
- `supabase/migrations/20260518009000_company_role_assignments_permissions.sql`
- `supabase/migrations/20260518037000_company_bootstrap_operator_rpc.sql`
- `supabase/migrations/20260518038000_company_setup_context_rpc.sql`
- `supabase/migrations/20260518039000_company_member_role_read_projections.sql`
- `supabase/migrations/20260518041000_company_member_invitations.sql`
- `supabase/migrations/20260518042000_company_member_invite_acceptance.sql`
- `supabase/migrations/20260518043000_company_member_invitation_management.sql`
- `supabase/migrations/20260518044000_company_member_invitation_resend.sql`

Edge Functions inspected:

- `supabase/functions/invite-company-member/index.ts`
- `supabase/functions/invite-company-member/config.toml`
- `supabase/functions/resend-company-member-invite/index.ts`
- `supabase/functions/resend-company-member-invite/config.toml`

## Current Tables And Important Constraints

### `company_audit_events`

Defined in `20260518037000_company_bootstrap_operator_rpc.sql`.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `company_id uuid null`
- `actor_user_id uuid null`
- `actor_auth_id uuid null`
- `actor_kind text not null default 'service_role'`
- `event_type text not null`
- `target_type text not null`
- `target_id uuid null`
- `metadata jsonb not null default '{}'::jsonb`
- `idempotency_key text null`
- `created_at timestamptz not null default now()`

Important constraints/indexes:

- `actor_kind` constrained to `service_role`, `operator`, or `system`.
- `event_type` must match dotted event key format.
- Original `target_type` values were `bootstrap`, `company`, `user`, `membership`, `role_assignment`; `20260518041000_company_member_invitations.sql` extends the check to include `invitation`.
- `company_id` references `companies(id)` with `not valid`.
- `actor_user_id` references `users(id)` with `not valid`.
- Indexes exist on `(company_id, created_at desc)`, `idempotency_key` where non-null, and `(event_type, created_at desc)`.

Security/caller model:

- RLS enabled.
- All privileges revoked from `public`, `anon`, and `authenticated`.
- All privileges granted to `service_role`.
- Direct app-role access is intentionally blocked.

Mutation behavior:

- Mutated by bootstrap, invitation prepare/finalize/accept/cancel/resend, and member mutation RPCs.

Inspection finding:

- Safe as an internal audit primitive.
- Unsafe to expose directly to browser/app roles.

### `company_memberships`

Defined in `20260518008000_company_membership_foundation.sql`.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `company_id uuid not null`
- `user_id uuid not null`
- `status text not null default 'active'`
- `membership_type text null`
- `is_primary boolean not null default true`
- `joined_at timestamptz null`
- `invited_by uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Important constraints/indexes:

- `company_id` references `companies(id)` with `not valid`.
- `user_id` references `users(id)` with `not valid`.
- `invited_by` references `users(id)` with `not valid`.
- Unique index on `(company_id, user_id)`.
- Indexes on `(user_id, company_id)` and `(company_id, status)`.
- `trg_company_memberships_touch_updated_at` maintains `updated_at`.

Security/caller model:

- Later `20260518037000_company_bootstrap_operator_rpc.sql` revokes direct table privileges from `anon` and `authenticated`.
- Access is expected through RPCs/helpers.

Mutation behavior:

- Bootstrap creates active first-owner membership.
- Invite finalize creates or updates invited membership.
- Invite acceptance activates membership.
- Resend finalize can recreate invited membership when needed.
- Member mutation RPCs can update roles/status.

Inspection finding:

- Safe as backend-owned company membership storage.
- Direct browser mutation remains unsafe.

### `user_role_assignments`

Defined in `20260518009000_company_role_assignments_permissions.sql`.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `company_id uuid not null`
- `user_id uuid not null`
- `role_id uuid not null`
- `status text not null default 'active'`
- `is_primary boolean not null default false`
- `assigned_by uuid null`
- `assigned_at timestamptz not null default now()`
- `expires_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Important constraints/indexes:

- `company_id` references `companies(id)` with `not valid`.
- `user_id` references `users(id)` with `not valid`.
- `role_id` references `roles(id)` with `not valid`.
- `assigned_by` references `users(id)` with `not valid`.
- Unique index on `(company_id, user_id, role_id)`.
- Indexes on `(user_id, company_id)`, `(company_id, role_id)`, and `(company_id, status)`.
- `trg_user_role_assignments_touch_updated_at` maintains `updated_at`.

Security/caller model:

- Later `20260518037000_company_bootstrap_operator_rpc.sql` revokes direct table privileges from `anon` and `authenticated`.
- Permission resolution uses active assignments through helper functions.

Mutation behavior:

- Bootstrap inserts active Owner assignment.
- Invitation finalize inserts inactive staged assignments.
- Invitation acceptance activates invitation-scoped assignments and inactivates non-invitation assignments for that user/company.
- Cancel/resend can keep staged assignments inactive.
- Member mutation RPCs can update assignments.

Inspection finding:

- Safe as backend-owned role-assignment storage.
- Pending/inactive assignments must not be treated as runtime authority.

### `company_member_invitations`

Defined in `20260518041000_company_member_invitations.sql`.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `company_id uuid not null references companies(id) on delete cascade`
- `email text not null`
- `normalized_email text not null`
- `status text not null default 'prepared'`
- `invited_by_user_id uuid not null references users(id) on delete restrict`
- `invited_auth_id uuid null`
- `invited_user_id uuid null references users(id) on delete set null`
- `membership_id uuid null references company_memberships(id) on delete set null`
- `role_ids uuid[] not null`
- `primary_role_id uuid null references roles(id) on delete restrict`
- `role_snapshot jsonb not null default '[]'::jsonb`
- `reason text null`
- `request_id text null`
- `expires_at timestamptz not null`
- `prepared_at timestamptz not null default now()`
- `finalized_at timestamptz null`
- `auth_invite_sent_at timestamptz null`
- `accepted_at timestamptz null`
- `cancelled_at timestamptz null`
- `auth_error_code text null`
- `auth_error_message text null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Important constraints/indexes:

- `status` constrained to `prepared`, `sent`, `accepted`, `cancelled`, `expired`, `auth_failed`.
- Email check requires `normalized_email = lower(trim(email))` and email-like format.
- `role_ids` must be non-empty.
- Indexes on `(company_id, status)`, `(company_id, normalized_email)`, `invited_auth_id` where present, and `request_id` where present.
- Unique pending invitation index on `(company_id, normalized_email)` where status is `prepared` or `sent`.
- `trg_company_member_invitations_touch_updated_at` maintains `updated_at`.

Security/caller model:

- RLS enabled.
- Direct table privileges revoked from `public`, `anon`, and `authenticated`.
- All privileges granted to `service_role`.
- App interaction is through RPCs/Edge Functions only.

Mutation behavior:

- Prepare creates invitation rows.
- Finalize updates Auth result, membership, staged roles, and status.
- Acceptance updates status to accepted.
- Cancel updates status to cancelled.
- Resend prepare creates replacement prepared rows and may cancel the prior one.
- Resend finalize updates Auth result and staged membership/roles.

Inspection finding:

- Safe as service-role-owned invitation ledger.
- Unsafe to expose directly.

## Current RPC / Function Signatures

### Bootstrap And Owner Invariant Helpers

`public.rpc_company_bootstrap(...)`

```sql
public.rpc_company_bootstrap(
  p_company_slug text,
  p_company_name text,
  p_company_type text default 'staff_shop',
  p_timezone text default 'America/New_York',
  p_locale text default 'en-US',
  p_owner_auth_id uuid default null,
  p_owner_email text default null,
  p_owner_name text default null,
  p_owner_phone text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  company_id uuid,
  company_slug text,
  company_name text,
  company_type text,
  company_status text,
  owner_user_id uuid,
  owner_auth_id uuid,
  owner_email text,
  membership_id uuid,
  owner_role_assignment_id uuid,
  owner_role_id uuid,
  active_company_metadata jsonb,
  bootstrap_status text,
  idempotency_key text
)
```

Caller/security:

- `security definer`.
- Direct execute revoked from `public`, `anon`, and `authenticated`.
- Execute granted to `service_role`.
- Service-role/operator-only internal primitive.

Mutation:

- Yes.

Direct exposure:

- Unsafe to expose directly. It remains internal per Phase 10A.

Related helpers:

- `public.company_active_owner_count(p_company_id uuid) returns integer`
- `public.user_has_owner_role_in_company(p_user_id uuid, p_company_id uuid) returns boolean`
- `public.assert_company_will_have_owner(p_company_id uuid, p_excluding_user_id uuid default null) returns boolean`

Helper grants:

- Execute revoked from `public`, `anon`, and `authenticated`.
- Execute granted to `service_role`.

### Setup Context

`public.rpc_company_setup_context()`

```sql
public.rpc_company_setup_context()
returns table (
  company_id uuid,
  company_slug text,
  company_name text,
  company_type text,
  company_status text,
  timezone text,
  locale text,
  active_company_claim_id uuid,
  active_company_context_valid boolean,
  profile_complete boolean,
  owner_invariant_ok boolean,
  active_owner_count integer,
  active_member_count integer,
  active_role_assignment_count integer,
  role_presets_ready boolean,
  owner_role_ready boolean,
  relationship_readiness jsonb,
  assignment_readiness jsonb,
  dashboard_readiness jsonb,
  audit_readiness jsonb,
  setup_complete boolean,
  setup_blockers jsonb,
  checklist jsonb
)
```

Caller/security:

- `security definer`.
- Requires `current_app_user_id()`.
- Requires `current_app_user_has_current_company()`.
- Requires active company.
- Requires `current_app_user_has_permission('company.setup.read')`.
- Execute revoked from `public` and `anon`.
- Execute granted to `authenticated` and `service_role`.

Mutation:

- No data mutation observed in inspected definition.

Direct exposure:

- Safe as a guarded authenticated read projection.
- It may need a wrapper or successor for productized readiness shape, severity, remediation, package applicability, and source/version metadata.

### Member / Role Read Projections

`public.rpc_company_member_list(p_include_inactive boolean default false)`

Returns safe current-company member projection:

- User/member display fields.
- Membership status/type/primary/joined.
- `auth_linked`.
- `is_owner`.
- Safe role assignment labels/status.
- Action booleans.

Caller/security:

- Requires current app user, current company membership, and `users.read`.
- Execute granted to `authenticated` and `service_role`; revoked from `public` and `anon`.

Mutation:

- No.

`public.rpc_company_role_preset_list()`

Returns safe global system template role summaries:

- Role ID/key/name/description.
- Owner/system/template booleans.
- Active assignment count in current company.
- Permission counts, not raw permission arrays.
- Assignability for current user.

Caller/security:

- Requires current app user, current company membership, and `roles.read`.
- Assignability considers `roles.assign`, `users.manage_company_access`, and `users.grant_owner`.
- Execute granted to `authenticated` and `service_role`; revoked from `public` and `anon`.

Mutation:

- No.

### Invitation RPCs

`public.rpc_company_member_invite_prepare(...)`

```sql
public.rpc_company_member_invite_prepare(
  p_email text,
  p_role_ids uuid[],
  p_primary_role_id uuid default null,
  p_expires_in interval default interval '7 days',
  p_reason text default null,
  p_request_id text default null
)
returns table (
  invitation_id uuid,
  company_id uuid,
  company_slug text,
  company_name text,
  invite_email text,
  invitation_status text,
  expires_at timestamptz,
  role_assignments jsonb,
  requires_auth_invite boolean,
  existing_app_user_id uuid,
  existing_auth_id uuid
)
```

Caller/security:

- Authenticated/service-role callable.
- Requires current app user, current company membership, active company, `users.invite`, `users.manage_company_access`, and `roles.assign`.
- Owner-role grants require `users.grant_owner`.

Mutation:

- Yes. Creates `prepared` invitation row and writes `company.member_invite_prepared` audit.
- Also expires stale prepared/sent invitations for the same company.
- Does not create membership or role assignment rows.

`public.rpc_company_member_invite_finalize(...)`

```sql
public.rpc_company_member_invite_finalize(
  p_invitation_id uuid,
  p_auth_user_id uuid,
  p_auth_email text,
  p_auth_invite_sent boolean default true,
  p_auth_error_code text default null,
  p_auth_error_message text default null,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns table (
  invitation_id uuid,
  company_id uuid,
  invite_email text,
  invitation_status text,
  invited_user_id uuid,
  membership_id uuid,
  expires_at timestamptz
)
```

Caller/security:

- Checks `auth.role() = 'service_role'`.
- Execute granted only to `service_role`; revoked from `public`, `anon`, and `authenticated`.

Mutation:

- Yes. Records Auth success/failure.
- On failure, marks `auth_failed` and writes `company.member_invite_auth_failed`.
- On success, creates/resolves app user, creates or updates invited membership, creates inactive role assignments, marks invitation `sent`, and writes `company.member_invite_sent`.
- Does not activate membership.

`public.rpc_company_member_invite_accept(p_invitation_id uuid, p_request_id text default null)`

Returns:

- Invitation/company/email/status.
- Membership/user IDs.
- Accepted timestamp.
- Active-company-context validity.
- `session_refresh_required`.

Caller/security:

- Authenticated/service-role callable.
- Requires current app user.
- Requires invitation `sent`, not expired.
- Requires invited Auth ID match or JWT email match.
- Requires invitation user/membership match.
- Execute granted to `authenticated` and `service_role`; revoked from `public` and `anon`.

Mutation:

- Yes. Activates invited membership, activates invitation-scoped role assignments, inactivates non-invitation assignments for the user/company, marks invitation `accepted`, and writes `company.member_invite_accepted`.
- Does not switch active-company metadata.

`public.rpc_company_member_invitations_list(p_status text default 'open', p_limit integer default 100)`

Caller/security:

- Requires current app user and current company membership.
- Requires `users.read` or both `users.invite` and `users.manage_company_access`.
- Execute granted to `authenticated` and `service_role`; revoked from `public` and `anon`.

Mutation:

- No.

Projection:

- Current-company invitation lifecycle summaries.
- Safe role labels.
- Action booleans for cancel/resend.
- No auth IDs, provider tokens, raw permissions, or operational data.

`public.rpc_company_member_invitation_cancel(p_invitation_id uuid, p_reason text default null, p_request_id text default null)`

Caller/security:

- Requires current app user, current company membership, `users.invite`, and `users.manage_company_access`.
- Owner-role invitation cancellation requires `users.grant_owner`.
- Execute granted to `authenticated` and `service_role`; revoked from `public` and `anon`.

Mutation:

- Yes. Cancels `prepared`, `sent`, or `auth_failed` invitations, inactivates staged inactive assignments for that invitation, and writes `company.member_invite_cancelled`.
- Does not mutate accepted active memberships.

`public.rpc_company_member_invitation_resend_prepare(...)`

```sql
public.rpc_company_member_invitation_resend_prepare(
  p_invitation_id uuid,
  p_expires_in interval default interval '7 days',
  p_reason text default null,
  p_request_id text default null
)
returns table (
  invitation_id uuid,
  prior_invitation_id uuid,
  company_id uuid,
  company_slug text,
  company_name text,
  invite_email text,
  invitation_status text,
  expires_at timestamptz,
  role_assignments jsonb
)
```

Caller/security:

- Requires current app user, current company membership, active company, `users.invite`, and `users.manage_company_access`.
- Owner-role resend requires `users.grant_owner`.
- Execute granted to `authenticated` and `service_role`; revoked from `public` and `anon`.

Mutation:

- Yes. Creates new `prepared` invitation row, may cancel prior prepared/sent row, reuses invited membership when safe, stages inactive assignments when needed, and writes `company.member_invite_resent_prepared`.

`public.rpc_company_member_invitation_resend_finalize(...)`

```sql
public.rpc_company_member_invitation_resend_finalize(
  p_invitation_id uuid,
  p_auth_invite_sent boolean,
  p_auth_error text default null,
  p_request_id text default null,
  p_auth_user_id uuid default null,
  p_auth_email text default null,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns table (
  invitation_id uuid,
  company_id uuid,
  invite_email text,
  invitation_status text,
  invited_user_id uuid,
  membership_id uuid,
  expires_at timestamptz
)
```

Caller/security:

- Checks `auth.role() = 'service_role'`.
- Execute granted only to `service_role`; revoked from `public`, `anon`, and `authenticated`.

Mutation:

- Yes. Records fresh Auth resend result, creates/resolves app user, creates or updates invited membership, stages inactive role assignments, updates invitation status, and writes resend audit.

## Edge Function Findings

### `invite-company-member`

Files:

- `supabase/functions/invite-company-member/index.ts`
- `supabase/functions/invite-company-member/config.toml`

Config:

- `verify_jwt = true`

Behavior:

- Requires POST.
- Requires bearer token.
- Validates email and role UUID array before RPC call.
- Uses service client to validate caller via `auth.getUser(token)`.
- Creates caller-scoped Supabase client with anon key plus caller bearer token.
- Calls `rpc_company_member_invite_prepare(...)` as caller.
- Uses service-role Auth Admin `inviteUserByEmail`.
- Uses service-role `rpc_company_member_invite_finalize(...)`.
- On Auth invite failure, attempts service-role finalize failure path.
- Returns safe JSON with invitation/company/email/status/expiry and `auth_invite_sent`.
- Does not return provider invite links or tokens.

Inspection finding:

- Edge boundary matches Phase 10A contract: caller authority is checked in prepare, service role is used only for Auth/finalize operations.

### `resend-company-member-invite`

Files:

- `supabase/functions/resend-company-member-invite/index.ts`
- `supabase/functions/resend-company-member-invite/config.toml`

Config:

- `verify_jwt = true`

Behavior:

- Requires POST.
- Requires bearer token.
- Validates invitation UUID and expiry days.
- Generates `request_id` if absent.
- Uses service client to validate caller via `auth.getUser(token)`.
- Creates caller-scoped Supabase client with anon key plus caller bearer token.
- Calls `rpc_company_member_invitation_resend_prepare(...)` as caller.
- Uses service-role Auth Admin `inviteUserByEmail`.
- Uses service-role `rpc_company_member_invitation_resend_finalize(...)`.
- On Auth invite failure, attempts service-role finalize failure path.
- Returns safe JSON with invitation ID and status.
- Does not return provider invite links or tokens.

Inspection finding:

- Edge boundary is consistent with invite flow: caller authority is checked in prepare, service role is used only for Auth/finalize operations.

## Existing Bootstrap Primitive Findings

`rpc_company_bootstrap(...)` currently creates or changes:

- A `company_audit_events` `company.bootstrap.started` event before company creation.
- A new `companies` row with:
  - slug
  - name
  - status `active`
  - timezone
  - locale
  - settings `{}` JSON
  - company type
  - operating mode settings `{}` JSON
- A `company.created` audit event.
- A `users` row or updates an existing `users` row:
  - Links `auth_id`.
  - Ensures name/display/full name/phone/status/is_active.
  - For email-based existing user path and new user path, writes legacy `role = 'owner'` and `is_admin = true`.
  - If user already exists by auth ID, it does not appear to force legacy role/is_admin in that branch.
- A `company.owner_user_linked` audit event.
- One active `company_memberships` row:
  - `status = 'active'`
  - `membership_type = 'bootstrap_owner'`
  - `is_primary = true`
- A `company.membership_created` audit event.
- One active Owner `user_role_assignments` row:
  - Owner role must be a global template role where `company_id is null`, lower name `owner`, and `is_owner_role = true`.
  - `status = 'active'`
  - `is_primary = true`
- A `company.owner_role_assigned` audit event.
- A `company.bootstrap.completed` audit event.

Inputs:

- Positional arguments listed in the signature above.
- Requires non-empty idempotency key.
- Requires valid slug, non-reserved slug, name, owner auth ID, valid owner email, owner name, object metadata, and active company type.

Returns:

- Company identity.
- Owner app/Auth/email identity.
- Membership ID.
- Owner role assignment ID.
- Owner role ID.
- Active-company metadata JSON with `company_id`, `active_company_id`, and `current_company_id`.
- `bootstrap_status` as `created` or `idempotent_replay`.
- Idempotency key.

Idempotency:

- Partially idempotent through completed audit event lookup by `idempotency_key`.
- Replay requires matching company slug, owner auth/user/email state, active membership, active owner role assignment, and exactly one active owner.
- Duplicate slug with completed bootstrap raises `duplicate_company_slug`.
- Slug existing without matching completed event raises `bootstrap_partial_state_requires_operator_review`.
- Completed audit referencing missing or inconsistent state raises `bootstrap_partial_state_requires_operator_review`.

Transaction safety:

- Migration file is wrapped in `begin`/`commit`.
- Function itself does not explicitly open/commit transactions; PostgreSQL function execution occurs inside the caller transaction context.
- Exceptions abort the function call. A future wrapper should verify behavior with SQL fixture tests before relying on recovery semantics.

What it does not currently seed:

- Persistent onboarding state.
- Company-specific order numbering.
- Company-specific notification defaults.
- Durable module/package state.
- Staff invitations.
- Clients, vendors, relationships, assignments, orders, calendar events, notifications, or activity.
- Branding beyond empty settings shells.

Safety as internal primitive:

- Appears safe as an internal service-role/operator primitive because grants are service-role only and it creates a narrow first-owner foundation.
- Unsafe to expose directly because it is mutating, positional, service-role, writes some legacy user fields, and lacks the productized JSON/result/readiness wrapper from Phase 10A.

Relationship to Phase 10A contract:

- Matches the core internal primitive expectation: one company, one first owner membership, one owner role assignment, audit events.
- Gaps remain around wrapper authorization, active-company refresh, versioned result shape, readiness severity result, settings/onboarding storage, order numbering, notification defaults, package/module state, legacy role field posture, and recovery model.

## Existing Setup Context Findings

`rpc_company_setup_context()` currently returns:

- Company identity/profile fields.
- Parsed active-company claim ID.
- Active-company context validity.
- Profile completeness boolean.
- Owner invariant boolean.
- Active owner/member/role-assignment counts.
- Role preset readiness.
- Owner role readiness.
- Relationship readiness JSON.
- Assignment readiness JSON.
- Dashboard readiness JSON.
- Audit readiness JSON.
- `setup_complete`.
- Setup blockers JSON.
- Checklist JSON.

Caller permissions:

- Requires authenticated current app user.
- Requires active current-company membership through `current_app_user_has_current_company()`.
- Requires active company.
- Requires `company.setup.read`.
- Execute granted to `authenticated` and `service_role`.

Cross-company exposure:

- Uses `current_company_id()`.
- Counts/queries are scoped to current company for memberships, role assignments, relationships, audit events, and permission-derived readiness.
- It returns aggregate booleans/counts and readiness JSON, not raw membership rows, relationship rows, assignment rows, audit rows, permission arrays, or operational order/client details.
- No cross-company data exposure was apparent from the inspected definition.

Readiness/owner setup support:

- Can support read-only readiness/owner setup UX as a current foundation.
- It is not yet the full 10A7 readiness result shape.
- It lacks severity counts, critical/warning/optional/deferred/unknown classification, remediation metadata, package applicability, resolver version metadata, and explicit next recommended action.

Wrapping/filtering later:

- A future readiness resolver can either wrap this RPC or supersede it with a versioned read-only resolver.
- Owner-facing UX should avoid exposing backend blocker keys directly without safe copy mapping.

## Existing Invitation Primitive Findings

Prepare/finalize/accept/list/cancel/resend behavior:

- Prepare validates current-company authority and preset roles, creates a prepared invitation, and writes audit.
- Finalize is service-role-only and stages invited membership plus inactive role assignments.
- Accept requires identity match and activates membership plus invitation-scoped role assignments.
- List returns current-company lifecycle summaries and safe role labels.
- Cancel cancels pending/actionable invitations and keeps staged role assignments inactive.
- Resend prepare creates a new prepared invitation, preserving prior invitation history.
- Resend finalize records the fresh Auth result and stages membership/roles when needed.

Pending membership behavior:

- Finalize creates/updates `company_memberships` with `status = 'invited'`, `membership_type = 'invited'`, `is_primary = false`, and `joined_at = null`.
- Invited memberships are not active and should not participate in active-company authority.

Inactive role assignment behavior:

- Finalize/resend stages `user_role_assignments` with `status = 'inactive'`.
- Acceptance activates only invitation-scoped roles and sets non-invitation assignments for that user/company inactive.
- Pending/inactive role assignments should not grant permissions.

Audit behavior:

- Prepare writes `company.member_invite_prepared`.
- Finalize failure writes `company.member_invite_auth_failed`.
- Finalize success writes `company.member_invite_sent`.
- Acceptance writes `company.member_invite_accepted`.
- Cancel writes `company.member_invite_cancelled`.
- Resend prepare writes `company.member_invite_resent_prepared`.
- Resend finalize writes resent sent/auth failed events.

Edge Function boundaries:

- Both invite Edge Functions require JWT verification in config.
- Both validate bearer token through service-role `auth.getUser`.
- Both call prepare RPCs as the caller using an anon client with the caller token.
- Both reserve service-role use for Auth Admin invite work and service-role finalize RPCs.
- Neither returns provider invite links or tokens.

Onboarding connection:

- The invitation flow can safely connect to onboarding later as a readiness signal.
- Onboarding should consume list/status projections and audit/readiness signals, not direct table reads.
- Pending invitations and inactive role assignments must remain non-authoritative.

## 10B2 Readiness Resolver Inputs

Based on inspected primitives, a future read-only readiness resolver can safely check now:

- Current company identity/status/timezone/locale from `rpc_company_setup_context()`.
- Active-company context validity from `rpc_company_setup_context()`.
- Profile completeness from `rpc_company_setup_context()`.
- Active owner count and owner invariant from `rpc_company_setup_context()` and owner helper behavior.
- Active member count.
- Active role assignment count.
- Owner role template readiness.
- Role preset readiness.
- Relationship readiness aggregate from setup context.
- Assignment readiness aggregate from setup context.
- Dashboard readiness aggregate from setup context.
- Audit readiness aggregate from setup context.
- Safe member list through `rpc_company_member_list(false)`, when caller has `users.read`.
- Safe role preset list through `rpc_company_role_preset_list()`, when caller has `roles.read`.
- Safe invitation status summaries through `rpc_company_member_invitations_list(...)`, when caller has invitation read/manage authority.
- Presence of staged invited memberships and inactive role assignments indirectly through invitation/member projections, not direct table reads.

Unknown or not safe to infer yet:

- Company-safe order-numbering readiness beyond known legacy seams.
- Company-specific notification-default readiness beyond existing global/user preference primitives.
- Persistent onboarding state because no table was confirmed.
- Durable module/package state because no table was confirmed.
- Owner setup completion acknowledgements.
- Solo-owner acknowledgement.
- Active-company metadata refresh implementation for bootstrap result consumers.
- Whether `rpc_company_setup_context()` should be wrapped or replaced for severity/result-shape needs.
- Partial bootstrap repair behavior beyond current exceptions and operator review signals.

Phase 10B2 is now complete as `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md` with a pure local resolver scaffold in `src/lib/companyBootstrap/companyReadinessResolver.js` and focused tests. The resolver consumes setup-context-like input, returns the 10A7 readiness result shape, keeps unresolved numbering/notification/onboarding/module state as `unknown`, and remains unwired from UI, routes, registries, Supabase clients, and backend behavior.

## Do Not Implement Yet

Phase 10B1 does not implement:

- Bootstrap wrapper.
- Versioned bootstrap RPC.
- New onboarding storage.
- Company settings storage changes.
- Readiness resolver runtime.
- Diagnostics preview UI.
- Route/UI changes.
- Permission seed changes.
- RLS/RPC changes.
- Registry changes.
- Tests or generated files.
- Frontend-owned provisioning.

## Inspection Conclusions

Current primitives are coherent foundations:

- Bootstrap primitive is narrow, audited, and service-role only.
- Setup context is a guarded read projection suitable for read-only readiness foundations.
- Invitation primitives preserve pending/inactive state before authenticated acceptance.
- Edge Functions preserve caller authority checks and service-role finalization boundaries.

Current primitives are not yet a productized bootstrap system:

- Bootstrap is positional and service-role-only.
- Readiness shape is not the Phase 10A7 versioned result shape.
- Settings/onboarding/package/order-numbering/notification-default decisions remain unresolved.
- Legacy `users.role` / `is_admin` writes in bootstrap remain a compatibility seam.
- No frontend route/UI should call bootstrap directly.

## Phase 10B1 Lock

Phase 10B1 is documentation-only plus read-only inspection.

It adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, tests, generated files, product-mode authority, module-authoritative security, onboarding authority, readiness authority, Vendor/Client live surfaces, global admin escalation, or Continental-specific defaults.
