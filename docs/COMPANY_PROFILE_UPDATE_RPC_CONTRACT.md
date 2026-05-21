# Company Profile Update RPC Contract

## Purpose

This document locks Phase 10D2: Company Profile Update RPC Contract, and records the Phase 10D3 implementation result.

The goal is to design the first guarded company profile update RPC before implementation. The contract is intentionally narrow and covers only low-risk company profile fields that already exist on `public.companies`.

10D2 was documentation and read-only inspection only.

10D3 implemented the contracted RPC in `supabase/migrations/20260518059000_company_profile_update_rpc.sql`.

10D4 wires only the Owner Setup Company Profile card to this RPC through `src/features/company-setup/companyProfileApi.js`. The wiring does not add route changes, registry changes, additional setup-card writes, bootstrap mutation from the browser, readiness authority, onboarding persistence, product-mode/module authority, Vendor/Client activation, order-numbering setup, notification-default setup, or broad company settings writes.

## Sources Inspected

Docs inspected:

- `docs/COMPANY_PROFILE_UPDATE_PATTERN_AUDIT.md`
- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema/function areas inspected:

- `public.companies` definition in `supabase/migrations/20260518003000_company_foundation_default_scope.sql`
- `public.company_types` and `companies.operating_mode_settings` in `supabase/migrations/20260518027000_company_relationship_foundation.sql`
- `company.update_profile` permission seed in `supabase/migrations/20260518002000_baseline_static_seed_data.sql`
- `current_company_id()` and `current_app_user_has_current_company()` in `supabase/migrations/20260518011000_company_active_context_contract.sql`
- `current_app_user_has_permission(text)` in `supabase/migrations/20260518010000_company_permission_helper_wrappers.sql`
- `public.company_audit_events` in `supabase/migrations/20260518037000_company_bootstrap_operator_rpc.sql`
- invitation audit target extension in `supabase/migrations/20260518041000_company_member_invitations.sql`
- `rpc_company_setup_context()` in `supabase/migrations/20260518038000_company_setup_context_rpc.sql`
- guarded mutation patterns in member and client management RPC migrations

No existing company profile update RPC was found during 10D2 inspection. 10D3 added `public.rpc_company_profile_update(p_patch jsonb)`.

## Proposed RPC

Recommended name:

- `public.rpc_company_profile_update(p_patch jsonb)`

Implementation:

- Added in `supabase/migrations/20260518059000_company_profile_update_rpc.sql`.

Recommended behavior:

- `volatile`
- `security definer`
- `set search_path = public`
- Updates only the resolved `public.current_company_id()` row.
- Accepts a JSON patch but rejects unknown or unsafe keys.
- Returns a narrow profile projection and setup refresh hints.

This RPC should be browser-callable only through normal authenticated app access and only after backend guards pass. It is not a bootstrap RPC, not a service-role/operator bootstrap wrapper, and not a broad company settings editor.

## Caller Model

Allowed caller model:

- Authenticated users with active membership in the resolved current company.
- The current company must exist and be active.
- The caller must have `company.update_profile` in the resolved current-company permission context.
- `service_role` may retain execute access for controlled operator compatibility if that matches the project grant convention, but the app behavior should be designed around authenticated guarded use.

Not allowed:

- `anon`
- `public`
- Users without active current-company membership
- Users without `company.update_profile`
- Browser code supplying an arbitrary `company_id`
- Product-mode/module metadata as an authorization substitute
- Legacy `users.role`, `user_roles`, `is_admin`, or global role checks as owner-instance authority

## Authorization Boundary

The RPC should enforce, in order:

1. Resolve `v_actor_user_id := public.current_app_user_id()`.
2. Resolve `v_company_id := public.current_company_id()`.
3. Require `v_actor_user_id is not null`.
4. Require `public.current_app_user_has_current_company()`.
5. Load `public.companies` for `v_company_id`.
6. Require the company exists.
7. Require `companies.status = 'active'`.
8. Require `public.current_app_user_has_permission('company.update_profile')`.
9. Update only `public.companies.id = v_company_id`.

The RPC must not accept or trust `company_id` in `p_patch`.

## Allowed Fields

The first implementation should allow only:

- `name`
- `timezone`
- `locale`

### `name`

Rules:

- Optional key.
- If present, trim whitespace.
- Required to be non-empty after trim.
- Should have an implementation-defined maximum length because the current column is `text` and does not enforce one. Recommended maximum: 160 characters unless an existing UI convention suggests a smaller limit during implementation.
- Stored in `companies.name`.

Error examples:

- `company_name_required`
- `company_name_too_long`

### `timezone`

Rules:

- Optional key.
- Current schema has `timezone text not null`, so the RPC should not allow null unless a later migration changes that contract.
- Trim whitespace.
- Required to be non-empty if present.
- Recommended validation: check against PostgreSQL timezone names if practical, for example `pg_timezone_names`, or use an intentionally small allowlist if SQL environment constraints make catalog validation brittle.
- Stored in `companies.timezone`.

Error examples:

- `company_timezone_required`
- `invalid_company_timezone`

### `locale`

Rules:

- Optional key.
- Current schema has `locale text not null`, so the RPC should not allow null unless a later migration changes that contract.
- Trim whitespace.
- Required to be non-empty if present.
- Recommended near-term validation: allow only `en-US` unless a broader product locale list is explicitly designed.
- Stored in `companies.locale`.

Error examples:

- `company_locale_required`
- `invalid_company_locale`

## Rejected Fields

The RPC should reject unknown keys rather than silently writing or ignoring potentially unsafe input.

Explicitly rejected keys include:

- `company_id`
- `slug`
- `status`
- `company_type`
- `settings`
- `operating_mode_settings`
- `legal_name`
- `phone`
- `email`
- `address`
- `branding`
- `modules`
- `package`
- `product_mode`
- `onboarding`
- `setup_complete`
- `order_numbering`
- `notification_defaults`
- `roles`
- `permissions`
- `owner`
- `memberships`
- `relationships`
- `assignments`
- any other unknown key

Recommended error:

- `unsupported_company_profile_field`

## Deferred Fields

The following remain out of scope:

- Order numbering.
- Notification defaults.
- Branding assets.
- Module/package state.
- Product-mode activation.
- Operating-mode authority.
- Vendor/Client shell activation.
- Onboarding completion.
- Durable readiness/checklist state.
- Broad arbitrary `companies.settings` writes.
- Broad arbitrary `companies.operating_mode_settings` writes.
- Company `slug` changes.
- Company `status` changes.
- Company `company_type` changes.
- Legal name and contact fields until storage is explicitly designed.
- Ownership transfer.
- Security, integration, billing, delete, deactivate, and compliance settings.

## Patch Semantics

The RPC should treat absent keys as no change.

If `p_patch` is null, not a JSON object, empty, or contains no allowed keys, implementation should return either:

- a stable no-op result with `changed = false`, or
- a clear validation error such as `company_profile_patch_required`.

Recommendation: return a no-op result only for `{}` and reject non-object/null payloads. This keeps the frontend resilient while still failing closed on ambiguous input.

Unknown keys should be rejected even when valid keys are also present.

## Audit Behavior

The RPC should write one `public.company_audit_events` row when a profile change is actually applied.

Recommended event:

- `event_type`: `company.profile_updated`
- `target_type`: `company`
- `target_id`: current company id
- `company_id`: current company id
- `actor_user_id`: current app user id
- `actor_auth_id`: `auth.uid()`
- `actor_kind`: `operator` or another existing allowed actor kind that accurately represents authenticated app action under the current audit constraint
- `metadata`: safe before/after changed fields only, such as `changed_fields`, `previous`, and `current`

Do not write raw settings blobs, secrets, cross-tenant data, unrelated operational records, permission keys, or role internals into audit metadata.

If no fields changed, the implementation should not write a new audit event unless a future audit convention explicitly requires no-op tracking.

## Result Shape

Recommended return shape:

```json
{
  "company_id": "uuid",
  "name": "Company Name",
  "timezone": "America/New_York",
  "locale": "en-US",
  "profile_complete": true,
  "changed": true,
  "updated_at": "timestamp",
  "audit_event_id": "uuid-or-null",
  "warnings": [],
  "setup_context_refresh_recommended": true,
  "source": {
    "rpc": "rpc_company_profile_update",
    "version": "v1"
  }
}
```

Rules:

- Do not include authority, grant, role, permission, route, RLS, module, package, or entitlement fields.
- `profile_complete` should follow the same basic semantics used by `rpc_company_setup_context()`: non-empty `slug`, `name`, `company_type`, `timezone`, and `locale`.
- `setup_context_refresh_recommended` should tell the frontend to refetch `rpc_company_setup_context()` after success rather than treating this mutation result as the full setup context.
- Warnings should be limited to non-authoritative implementation notes, such as deferred domains.

## Error Behavior

Recommended SQL exception codes/messages:

- `app_user_not_found` with `42501`
- `current_company_membership_required` with `42501`
- `company_not_found` with `42501`
- `company_inactive` with `42501`
- `company_update_profile_permission_required` with `42501`
- `company_profile_patch_required` with `22023`
- `unsupported_company_profile_field` with `22023`
- `company_name_required` with `22023`
- `company_name_too_long` with `22023`
- `company_timezone_required` with `22023`
- `invalid_company_timezone` with `22023`
- `company_locale_required` with `22023`
- `invalid_company_locale` with `22023`

Errors should be stable enough for the frontend to map them to safe copy.

## Relationship To `rpc_company_setup_context()`

`rpc_company_profile_update(p_patch jsonb)` should not replace `rpc_company_setup_context()`.

The profile update RPC should:

- Update the narrow company profile fields.
- Return a narrow mutation result.
- Recommend a setup-context refresh after successful mutation.

`rpc_company_setup_context()` should remain the read projection for Owner Setup and diagnostics because it computes profile completion, owner invariants, role readiness, dashboard readiness, audit readiness, setup blockers, and checklist data.

## Relationship To Owner Setup Profile Card

Phase 10D4 Owner Setup wiring now:

- Use this RPC only for the company profile card.
- Continue reading setup guidance through `useCompanySetupContext()`.
- Refetch setup context after a successful profile update.
- Show safe validation, saving, success, and permission-denied states.
- Avoid redirecting or gating access based on readiness.

Owner Setup profile wiring does not:

- Call bootstrap RPCs.
- Write onboarding completion.
- Write broad settings JSON.
- Edit roles, invitations, order numbering, notification defaults, modules, product modes, Vendor/Client surfaces, or operating-mode authority through this card.

## Recommended 10D3 SQL Implementation

10D3 should implement one migration only unless inspection finds a hard blocker.

Implementation recommendations:

- Create or replace `public.rpc_company_profile_update(p_patch jsonb)`.
- Use `language plpgsql`, `volatile`, `security definer`, and `set search_path = public`, matching existing guarded RPC style.
- Resolve actor and company from backend helpers.
- Require active current-company membership.
- Require active company status.
- Require `company.update_profile`.
- Reject non-object payloads.
- Reject unknown keys.
- Validate `name`, `timezone`, and `locale`.
- Update only `public.companies where id = public.current_company_id()`.
- Update `updated_at = now()` only when a change is actually applied.
- Write `company.profile_updated` audit event when changed.
- Return a narrow JSONB or table projection as defined above.
- Revoke all privileges from `public` and `anon`.
- Grant execute to `authenticated` and `service_role` if consistent with existing guarded app-RPC convention.
- Add an SQL comment stating that this RPC is company-scoped, profile-only, and non-authoritative for readiness, onboarding, product modes, modules, and security.

The implementation should not be service-role-only because this is an authenticated company-admin/owner profile edit surface, not a bootstrap/operator provisioning primitive.

## Tests / Verification Later

10D3 should include SQL verification if a project-local SQL harness exists, or transaction-scoped smoke checks otherwise.

Required checks:

- User without active current-company membership is denied.
- User without `company.update_profile` is denied.
- Inactive company is denied.
- Valid `name` update succeeds.
- Blank `name` is rejected.
- Overlong `name` is rejected based on the chosen implementation limit.
- Valid `timezone` update succeeds.
- Invalid `timezone` is rejected.
- Valid `locale` update succeeds.
- Unsupported `locale` is rejected.
- Unknown key is rejected.
- `settings` and `operating_mode_settings` are not written.
- `slug`, `status`, and `company_type` are not written.
- Audit event is written only when a change occurs.
- Result does not include authority/grant fields.
- `rpc_company_setup_context()` reflects changed profile fields after update.
- Cross-company update by payload spoofing is impossible because no `company_id` input is honored.

Frontend verification belongs to a later Owner Setup card slice, not 10D3 unless explicitly requested.

## Hard No-Go Rules

- No broad company settings writes.
- No arbitrary JSON merge into `companies.settings`.
- No arbitrary JSON merge into `companies.operating_mode_settings`.
- No product-mode/module authority.
- No readiness or onboarding authority.
- No bootstrap mutation from UI.
- No Vendor/Client activation.
- No order-numbering or notification-default writes.
- No company type, slug, status, ownership, role, or permission mutation.
- No legacy global role or `is_admin` authority.
- No frontend-owned company scoping.
- No cross-tenant updates.

## Handoff

Phase 10D2 is complete as an RPC contract.

Phase 10D3 is complete as the minimal SQL implementation of the narrow guarded RPC for `name`, `timezone`, and `locale`, with current-company scope, `company.update_profile`, active membership, active company validation, audit logging, narrow result shape, and no broad settings behavior.

Phase 10D4 is complete as the minimal Owner Setup Company Profile card wiring. The safe next step is 10D5: design the branding/settings shell card without adding broad settings writes, onboarding authority, bootstrap calls, Vendor/Client activation, order numbering, notification defaults, or product-mode/module authority.
