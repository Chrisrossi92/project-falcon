# Owner Setup V2 Persistence Contract

Status: V2D contract. This document is planning-only. It does not add migrations, RPCs, RLS
policies, frontend writes, banner behavior, modal UI, tutorial UI, route changes, product-mode
authority, workflow authority, or production data mutation.

## Goal

Define the smallest safe persistence model needed for owner setup completion and future dashboard
banner hiding before implementing writes.

Owner Setup persistence should store owner/company onboarding decisions. It should not store or
replace backend-derived authority facts such as company status, active membership, permissions,
role readiness, route access, workflow readiness, assignment visibility, product-mode authority, or
module access.

## Existing Persistence Inventory

### `public.companies`

Confirmed fields:

- `id`
- `slug`
- `name`
- `status`
- `timezone`
- `locale`
- `settings`
- `created_at`
- `updated_at`
- `company_type`
- `operating_mode_settings`

Safe current use:

- `name`, `timezone`, and `locale` are editable only through
  `public.rpc_company_profile_update(p_patch jsonb)`.
- `company_type` and `operating_mode_settings` exist, but current doctrine treats them as
  metadata/advisory. They do not grant access or activate modules.
- `settings` is a JSONB shell, but prior handoff docs explicitly avoid broad settings writes.

Do not use `companies.settings` as the first Owner Setup completion store. Setup completion needs
versioning, actor metadata, section-level state, and audit-friendly semantics. Hiding that inside a
general settings blob would make governance and future migrations harder.

### `public.rpc_company_setup_context()`

Current behavior:

- Read-only, guarded by current-company membership, active company state, and `company.setup.read`.
- Returns company profile fields, owner/member/role readiness, relationship/assignment/dashboard
  readiness, audit readiness, `setup_complete`, `setup_blockers`, and a diagnostic checklist.
- Computes `setup_complete` from backend-derived readiness signals.

Safe current use:

- Owner Setup diagnostics.
- Owner-facing mapper input.
- Refetch target after the Company Profile RPC.

Not safe as persistence:

- `setup_complete` is derived, not durable owner acknowledgement.
- `setup_blockers` and checklist keys are diagnostic signals, not owner-facing completion state.
- The RPC should remain a read projection; future writes should use separate guarded RPCs.

### `public.rpc_company_profile_update(p_patch jsonb)`

Current behavior:

- Updates only `companies.name`, `companies.timezone`, and `companies.locale`.
- Requires current-company membership, active company, and `company.update_profile`.
- Rejects unsupported fields.
- Writes `company.profile_updated` audit events.
- Returns a narrow non-authoritative result and recommends setup-context refresh.

Safe current use:

- Company Profile setup section.

Not safe as setup completion:

- It should not be expanded to store setup completion, section acknowledgements, banner dismissal,
  tutorials, product modes, workflow defaults, notification defaults, branding, or numbering.

### `public.company_audit_events`

Current behavior:

- Service-role-owned audit storage with RLS enabled and no general app-role table access.
- Used by bootstrap, company profile, Team Access, and invitation lifecycle paths.

Safe future use:

- Setup completion and section-review RPCs should write audit events with safe metadata.

Not sufficient alone:

- Audit events are an immutable evidence trail, not the current setup state read model. A current
  state table is still needed for efficient banner hiding and section completion.

### Permissions

Confirmed implemented permissions:

- `company.setup.read`
- `company.update_profile`
- `settings.view`

Planning-only permission matrix entries:

- `onboarding.view`
- `onboarding.complete_step`
- `onboarding.skip_step`
- `onboarding.manage_setup`

Recommendation:

- Do not depend on planning-only onboarding permissions until a migration seeds and grants them.
- V2E can start with `company.setup.read` for reading setup state and `company.update_profile` only
  for profile edits.
- For completion writes, prefer a new explicit permission such as `company.setup.complete` or seed
  the planned `onboarding.complete_step` only if Falcon is ready to make `onboarding.*` runtime
  permissions real.

## What Is Already Persisted

Already persisted safely:

- Company display name.
- Company timezone.
- Company locale.
- Company type metadata.
- Operating-mode metadata shell.
- Company settings shell.
- Company memberships and owner/admin role assignments.
- Company member invitation lifecycle state.
- Company audit events.

Already derived safely:

- Profile completeness.
- Active owner count.
- Active member count.
- Role preset readiness.
- Owner role readiness.
- Relationship/assignment/dashboard/audit readiness.
- Diagnostic `setup_complete`.

Not yet persisted:

- Owner-facing setup section completion.
- Explicit owner/admin launch readiness acknowledgement.
- Minimum readiness reached timestamp.
- Dashboard setup banner hiding/dismissal state.
- Solo-owner acknowledgement.
- Optional/deferred section skip/review state.
- Setup version applied to a company.
- User tutorial acknowledgements.

## Smallest Recommended Persistence Model

Use a new company-scoped current-state table plus RPCs. Do not overload `companies.settings`.

### Table: `public.company_setup_states`

Recommended columns:

```sql
company_id uuid primary key references public.companies(id) on delete cascade,
setup_version text not null default 'owner_setup_v2',
status text not null default 'in_progress',
minimum_ready boolean not null default false,
minimum_ready_at timestamptz,
completed_at timestamptz,
completed_by uuid references public.users(id),
banner_hidden_at timestamptz,
banner_hidden_by uuid references public.users(id),
required_sections jsonb not null default '{}'::jsonb,
optional_sections jsonb not null default '{}'::jsonb,
last_summary jsonb not null default '{}'::jsonb,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Status values:

- `in_progress`
- `minimum_ready`
- `completed`
- `reopened`

`required_sections` should store owner-facing section state, not diagnostic keys. Suggested shape:

```json
{
  "company_profile": {
    "status": "complete",
    "completed_at": "2026-06-22T00:00:00Z",
    "completed_by": "user uuid",
    "source": "derived"
  },
  "owner_profile": {
    "status": "complete",
    "completed_at": "2026-06-22T00:00:00Z",
    "completed_by": "user uuid",
    "source": "acknowledged"
  },
  "team_access": {
    "status": "complete",
    "completed_at": "2026-06-22T00:00:00Z",
    "completed_by": "user uuid",
    "source": "acknowledged",
    "acknowledgement": "solo_owner_ok"
  }
}
```

Allowed section keys for the first contract:

- `company_profile`
- `owner_profile`
- `team_access`

Do not store the optional/deferred sections as required blockers in V2E.

### Why Not A Row Per Section First?

A normalized `company_setup_section_states` table may be useful later, but the smallest safe first
contract is one company row with allowlisted JSON section state. The initial required section set
is small, versioned, and company-level. If setup becomes complex, a later migration can split
section state into a child table.

## Proposed Completion Fields

Minimum field semantics:

- `minimum_ready`: true only when backend-derived minimum readiness is true and required
  owner-facing acknowledgements are complete.
- `minimum_ready_at`: first time the current setup version reached minimum readiness.
- `completed_at`: owner/admin explicitly marked setup complete for the current setup version.
- `completed_by`: user who marked setup complete.
- `banner_hidden_at`: when the dashboard setup banner may be hidden for this company/version.
- `banner_hidden_by`: user whose completion action caused banner hiding.
- `setup_version`: version key used to decide whether future required setup changes re-open the
  banner.
- `last_summary`: safe cached snapshot of owner-facing summary, such as required count,
  completed-required count, percent complete, and next action. This is convenience metadata only.

`banner_hidden_at` should be tied to completion, not standalone dismissal, for V2E. A pure dismiss
button can be considered later, but first-run setup should not disappear without minimum readiness.

## Proposed RPC Contract

### `public.rpc_owner_setup_state_get()`

Purpose:

- Read current setup persistence state for the active company.
- Return stored state plus backend-derived owner-facing setup summary.

Authorization:

- Require authenticated app user.
- Require active current-company membership.
- Require active company.
- Require `company.setup.read` or future `onboarding.view`.

Behavior:

- Resolve current company server-side.
- Read `company_setup_states` row if present.
- Derive current owner-facing readiness from backend facts, matching the V2B mapper semantics.
- Return a narrow JSONB result.
- Do not create rows as a read side effect.
- Do not expose raw diagnostic keys unless `include_diagnostics` is explicitly added in a later
  contract.

Suggested result shape:

```json
{
  "company_id": "uuid",
  "setup_version": "owner_setup_v2",
  "status": "in_progress",
  "minimum_ready": false,
  "completed_at": null,
  "banner_should_show": true,
  "sections": [],
  "summary": {
    "required_sections": 3,
    "completed_required_sections": 2,
    "percent_complete": 67,
    "next_recommended_action": "Next: Team Access"
  }
}
```

### `public.rpc_owner_setup_section_acknowledge(p_section_key text, p_payload jsonb default '{}'::jsonb)`

Purpose:

- Persist owner/admin acknowledgement for setup sections that cannot be completed purely from
  existing backend facts.

Initial allowed section keys:

- `owner_profile`
- `team_access`

Do not allow:

- `workflow_defaults`
- `notification_defaults`
- `order_numbering`
- `branding`
- `product_modes`
- arbitrary section keys

Authorization:

- Require active current-company membership.
- Require active company.
- Require `company.setup.read` plus future write permission.
- Recommended write permission: `company.setup.complete` or runtime-seeded
  `onboarding.complete_step`.

Behavior:

- Upsert `company_setup_states` for current company/version.
- Validate section key against an allowlist.
- Store safe acknowledgement payload only.
- Reject payload keys that look like authority or settings writes.
- Write `company.setup_section_acknowledged` audit event.
- Return refreshed setup state.

### `public.rpc_owner_setup_complete(p_payload jsonb default '{}'::jsonb)`

Purpose:

- Mark setup complete and make future banner hiding possible.

Authorization:

- Same as section acknowledgement.

Preconditions:

- Current-company context is valid.
- Company is active.
- Owner-facing minimum readiness is true.
- Required sections are complete from derived facts plus acknowledgements.
- No critical backend blocker prevents ordinary owner/admin access.

Behavior:

- Upsert or update `company_setup_states`.
- Set `minimum_ready = true`.
- Set `minimum_ready_at` if null.
- Set `status = 'completed'`.
- Set `completed_at`, `completed_by`, `banner_hidden_at`, and `banner_hidden_by`.
- Store safe `last_summary`.
- Write `company.setup_completed` audit event.
- Return refreshed setup state.

Do not:

- Grant access.
- Activate product modes.
- Change routes.
- Change workflow statuses.
- Change assignments.
- Configure order numbering.
- Configure notification defaults.
- Change branding.
- Hide banners for other companies.

### Optional Future RPC: `public.rpc_owner_setup_reopen(p_reason text)`

Purpose:

- Support future setup-version changes or owner/admin re-review.

Do not implement in the first persistence slice unless needed.

## Authorization Rules

Read:

- `settings.view` should continue to control route visibility.
- `company.setup.read` should control backend setup-state reads.

Write:

- Do not use `settings.view` for setup completion writes.
- Do not use `company.update_profile` for setup completion writes.
- Add a dedicated runtime permission before implementing writes. Recommended:
  `company.setup.complete`, or promote the planned `onboarding.complete_step` to a real seeded
  runtime permission.
- Grant the write permission to Owner/Admin template roles only.
- `service_role` may execute for controlled operations.
- Revoke from `public` and `anon`.

RLS/table access:

- Enable RLS on `company_setup_states`.
- Revoke direct table access from `anon` and `authenticated`.
- Prefer RPC-only app access.
- Grant table access only to `service_role`.

## Banner Hiding Rules

Future dashboard banner behavior should use persisted setup state, not frontend-only mapper output.

Hide the dashboard setup banner when all are true:

- A `company_setup_states` row exists for the active company.
- `setup_version` matches the current required setup version.
- `status = 'completed'`.
- `completed_at is not null`.
- `banner_hidden_at is not null`.
- Backend-derived minimum readiness still has no critical blocker.

Show the banner when any are true:

- No setup-state row exists.
- The active setup version is newer than the completed row.
- Required setup was reopened.
- Backend-derived critical readiness has regressed.
- The current user cannot read setup state and is an owner/admin who can view settings.

Do not show the setup banner for:

- Optional or deferred sections.
- Tutorial acknowledgements.
- Raw diagnostic warnings that do not map to an owner-actionable required setup section.

## Tutorial Acknowledgement Future Extension

Tutorial state should not live in `company_setup_states`.

Recommended future table:

```sql
public.user_tutorial_acknowledgements (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  tutorial_key text not null,
  tutorial_version text not null,
  workspace_key text,
  role_key text,
  acknowledged_at timestamptz,
  dismissed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id, tutorial_key, tutorial_version)
)
```

Future tutorial RPCs:

- `rpc_user_tutorial_acknowledge(p_tutorial_key text, p_tutorial_version text, p_payload jsonb)`
- `rpc_user_tutorial_reset(p_tutorial_key text, p_tutorial_version text)`

Tutorial acknowledgements must not affect setup completion, permissions, route access, or banner
hiding for required company setup.

## Migration Plan

Migrations are needed. Existing schema does not fully support V2D/V2E persistence safely.

Recommended V2E migration:

1. Seed a dedicated setup write permission.
2. Create `public.company_setup_states`.
3. Enable RLS and revoke direct app-role access.
4. Add indexes for `(company_id, setup_version)` if not using a primary key only.
5. Add comments documenting non-authority semantics.
6. Implement `rpc_owner_setup_state_get()`.
7. Implement `rpc_owner_setup_section_acknowledge(...)`.
8. Implement `rpc_owner_setup_complete(...)`.
9. Add audit events for section acknowledgement and completion.
10. Extend `rpc_company_setup_context()` only if the frontend needs setup persistence reflected in
    the existing context. Prefer a separate RPC first to avoid mixing diagnostics and onboarding
    state.

Do not migrate tutorial acknowledgement storage in V2E unless the slice explicitly expands to
tutorials.

V2E implementation decision:

- Migration: `supabase/migrations/20260622090000_owner_setup_v2e_sql_foundation.sql`.
- Permission seed: `company.setup.manage`, granted to Owner/Admin template roles.
- Table: `public.company_setup_states`.
- Read RPC: `public.rpc_owner_setup_state_get()`.
- Read authorization: active current-company membership, active company, and either
  `company.setup.read` or `company.setup.manage`.
- Direct table access: revoked from `public`, `anon`, and `authenticated`; service-role only.
- RLS: enabled on `company_setup_states`.
- Write-on-read: intentionally false. The read RPC returns a safe default `not_started` state when
  no row exists instead of creating a row.
- Tutorial acknowledgements: included only as a reserved JSON shell because the requested V2E table
  shape includes it. The long-term recommendation remains a separate user-level tutorial
  acknowledgement table before tutorial UX ships.
- No write RPCs, banner behavior, UI wiring, setup completion action, modal, tutorial UI,
  product-mode authority, workflow authority, route changes, or company profile behavior changes
  were added in V2E.

## Suggested Implementation Slices

### V2E: SQL Contract And Read RPC

Add `company_setup_states`, seed the setup write permission, and implement
`rpc_owner_setup_state_get()` as read-only for the frontend.

### V2F: Section Acknowledgement RPC

Implement `rpc_owner_setup_section_acknowledge(...)` for `owner_profile` and `team_access` only.

V2F implementation decision: add `public.rpc_owner_setup_section_complete(p_section_id text,
p_completed boolean default true)` as the first guarded write RPC. It requires active
current-company context, an active company, and `company.setup.manage`; allows only the V2B/V2C
owner-facing section ids; upserts `company_setup_states` when missing; writes only
`completed_sections`; stores completion as an object with `completed`, `completed_at`, and
`completed_by`; removes the section key when `p_completed=false`; and returns the safe
`rpc_owner_setup_state_get()` shape. V2F does not write `setup_banner_dismissed_at`, tutorial
acknowledgements, product-mode state, workflow state, routes, permissions, or company profile
fields.

### V2G: Readiness Evaluation RPC

Implement `rpc_owner_setup_readiness()` as the setup readiness source of truth before completion,
banner hiding, or dashboard consumers depend on persisted setup state.

V2G implementation decision: add `public.rpc_owner_setup_readiness()` before any setup-complete or
banner-hiding mutation. The RPC is guarded by active current-company context plus
`company.setup.read` or `company.setup.manage`, reads `company_setup_states.completed_sections`,
evaluates only the required setup sections (`company_profile`, `owner_profile`, `team_access`),
ignores optional/deferred sections, returns the centralized readiness summary, and performs no
writes. It does not update timestamps, create rows, hide banners, dismiss setup prompts, write
tutorial acknowledgements, or mutate setup state.

### V2H: Setup Complete RPC

Implement a guarded setup completion RPC that marks setup complete only after centralized readiness
passes.

V2H implementation decision: add `public.rpc_owner_setup_mark_complete()` as the first setup
completion mutation. The RPC requires active current-company context, an active company, and
`company.setup.manage`; calls `rpc_owner_setup_readiness()`; rejects with
`owner_setup_minimum_readiness_required` unless `minimum_ready=true`; upserts
`company_setup_states` when missing; sets `minimum_ready_at` and `setup_banner_dismissed_at` only
when they are null; updates `updated_at`; and returns both the safe setup-state read shape and the
fresh readiness summary. It is idempotent and does not write tutorial acknowledgements, change
company profile behavior, add dashboard banner wiring, add UI buttons, change routes, activate
product modes, or alter workflow authority.

### V2I: Frontend Completion UI

Add the owner-facing completion action/modal. Continue to leave dashboard banner behavior unchanged
until the completion flow is validated.

### V2J: Dashboard Banner Hiding

Read persisted setup state from the dashboard and hide the setup banner only when the persisted
completion and backend-derived readiness rules pass.

### V2K: Tutorial Acknowledgement Foundation

Add separate user-level tutorial acknowledgement persistence and role/workspace-aware tutorial
state.

## Non-Goals

V2D/V2E persistence must not:

- Store raw diagnostic blockers as owner-facing completion state.
- Treat setup completion as authorization.
- Grant routes, permissions, assignments, workflow actions, product modes, modules, Vendor shells,
  or Client Portal access.
- Configure order numbering, notification defaults, branding, workflow defaults, or product modes.
- Use broad `companies.settings` writes.
- Replace `rpc_company_setup_context()`.
- Hide dashboard banners without explicit persisted completion.
