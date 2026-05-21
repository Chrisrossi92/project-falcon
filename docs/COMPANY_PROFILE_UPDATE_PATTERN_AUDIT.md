# Company Profile Update Pattern Audit

## Purpose

This document records Phase 10D1: Company Profile / Settings Edit Pattern Inspection.

The goal is to inspect existing company, profile, settings, RPC, permission, audit, and frontend edit patterns before designing any company profile update RPC or wiring editable Owner Setup behavior.

This is documentation and read-only inspection only. It does not introduce migrations, runtime code, permission changes, RLS/RPC edits, route changes, registry changes, UI changes, tests, bootstrap mutation, readiness authority, onboarding persistence, product-mode authority, Vendor/Client activation, order-numbering setup, or notification-default setup.

## Sources Inspected

Docs inspected:

- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/COMPANY_SETUP_CONTEXT_CLIENT_INTEGRATION_PLAN.md`
- `docs/COMPANY_BOOTSTRAP_RUNTIME_FOUNDATION_HANDOFF.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema and migration areas inspected:

- `supabase/migrations/20260518003000_company_foundation_default_scope.sql`
- `supabase/migrations/20260518027000_company_relationship_foundation.sql`
- `supabase/migrations/20260518037000_company_bootstrap_operator_rpc.sql`
- `supabase/migrations/20260518038000_company_setup_context_rpc.sql`
- `supabase/migrations/20260518040000_company_member_mutation_rpcs.sql`
- `supabase/migrations/20260518050000_client_management_mutation_rpcs.sql`
- `supabase/migrations/20260518051000_current_user_settings_rpcs.sql`
- Permission seed searches in `supabase/migrations/20260518002000_baseline_static_seed_data.sql` and later company migrations.

Frontend areas inspected:

- `src/features/user-settings/api.js`
- `src/pages/Settings.jsx`
- `src/features/clients/clientManagementApi.js`
- `src/components/clients/ClientForm.jsx`
- `src/pages/clients/EditClient.jsx`
- `src/features/company-members/api.js`
- `src/features/company-invitations/api.js`
- `src/features/company-setup/companySetupContextApi.js`

## Existing Company Schema Support

`public.companies` currently supports the following confirmed company profile fields:

- `id uuid`
- `slug text`
- `name text`
- `status text`
- `timezone text`
- `locale text`
- `settings jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`
- `company_type text`
- `operating_mode_settings jsonb`

`public.company_types` exists as a lookup/config table. Seeded values include `staff_shop`, `amc`, `vendor`, `hybrid`, `review_firm`, and `enterprise`.

`companies.settings` and `companies.operating_mode_settings` exist as JSONB shells. Current 10B/10C doctrine treats them as future company setup/configuration storage, not runtime security authority. They are not a safe target for broad arbitrary frontend writes.

`rpc_company_setup_context()` reads company profile fields and computes `profile_complete` from non-empty company identity fields. It is read-only, guarded by current-company membership, active-company state, and `company.setup.read`.

No current company profile update RPC was found during inspection. No direct browser-safe `companies` table update path was identified. A future company profile write path should therefore be explicit RPC-first rather than direct table mutation.

## Existing RPC / RLS / Permission Patterns

Confirmed permission seeds relevant to future company profile editing include:

- `company.read`
- `company.update_profile`
- `company.manage_branding`
- `company.manage_locations`
- `company.manage_integrations`
- `company.manage_security`
- `company.transfer_ownership`
- `company.delete_or_deactivate`
- `settings.view`
- `navigation.settings.view`
- `company.setup.read`

`company.update_profile` exists as a permission key, but no inspected active company profile update RPC currently uses it.

Existing hardened mutation RPC patterns are consistent:

- Resolve the current app user server-side.
- Resolve company scope server-side through `current_company_id()`.
- Require active current-company membership.
- Check company status where relevant.
- Check a permission helper before mutation.
- Accept JSON payloads but allowlist fields explicitly.
- Ignore or reject unsupported authority fields.
- Return narrow projections.
- Revoke `public` and `anon`.
- Grant only intended app roles such as `authenticated` and `service_role`.

Useful current analogs:

- `rpc_current_user_settings_update(jsonb)` updates only allowlisted current-user display/profile fields and explicitly avoids role/status/permission/company authority.
- `rpc_client_management_update(bigint, jsonb)` scopes the row to `current_company_id()`, validates input, rejects invalid relationships, and returns a narrow compatibility projection.
- `rpc_company_member_role_update(...)` and invite lifecycle RPCs enforce company permissions and write audit events.

## Audit / Event Conventions

`public.company_audit_events` exists and is used by bootstrap and company-member invitation/member lifecycle flows. It is service-role-owned storage with RLS enabled and no general direct app-role table access.

Confirmed audit event patterns include bootstrap events such as:

- `company.bootstrap.started`
- `company.created`
- `company.owner_user_linked`
- `company.membership_created`
- `company.owner_role_assigned`
- `company.bootstrap.completed`

Invitation and member-management flows also write company audit lifecycle events.

Future company profile edits should write a company audit event through the guarded RPC. The event should include safe changed-field metadata and should not store cross-tenant data, secrets, raw settings blobs, or unrelated operational records.

## Existing Frontend Edit Patterns

Frontend mutation patterns are RPC/Edge mediated:

- Feature API modules wrap Supabase RPC or Edge Function calls.
- Page components call feature APIs rather than embedding Supabase calls throughout forms.
- Forms build narrow payloads from known fields.
- Local validation catches simple required-field errors before RPC calls.
- Loading/saving state is local and explicit.
- Toasts use safe user-facing copy.
- Permission-denied and validation errors are mapped to stable messages.
- Hooks and effects use cancellation guards where asynchronous reads can resolve after unmount.

Observed examples:

- `src/features/user-settings/api.js` wraps `rpc_current_user_settings_get` and `rpc_current_user_settings_update`.
- `src/pages/Settings.jsx` uses local save state and safe toast copy for user settings and notification preferences.
- `src/features/clients/clientManagementApi.js` wraps client management RPCs and normalizes results.
- `src/components/clients/ClientForm.jsx` builds a schema-aligned payload and avoids legacy aliases.
- `src/pages/clients/EditClient.jsx` maps backend validation and permission errors into safe messages.
- `src/features/company-members/api.js` and `src/features/company-invitations/api.js` keep member/invite mutations behind RPCs and Edge Functions.
- `src/features/company-setup/companySetupContextApi.js` is read-only and normalizes setup context for readiness guidance.

No frontend pattern supports broad direct writes to `public.companies`.

## Recommended First Editable Fields

The first company profile update slice should stay narrow and table-backed.

Recommended first editable fields:

- Company display name: `companies.name`.
- Company timezone: `companies.timezone`.
- Company locale: `companies.locale`, only if the UI presents a restrained supported set or the RPC validates the format.

Potentially later, after explicit design:

- Legal name: no dedicated `companies.legal_name` column was found. Do not implement it as a first-class profile edit until a storage decision is made. If needed later, it should use a narrow JSON path contract such as `companies.settings.profile.legal_name`, not arbitrary settings writes.
- Public contact email, phone, address, or website: no company-level columns were confirmed. These should wait for a model decision or a narrow JSON path contract.

Do not make `company_type`, `slug`, `status`, `settings`, or `operating_mode_settings` editable in the first profile update RPC.

## Fields to Defer

Defer the following from the first company profile update implementation:

- Order numbering.
- Notification defaults.
- Branding assets.
- Module/package state.
- Product-mode activation.
- Operating mode authority.
- Vendor/Client shell activation.
- Onboarding completion.
- Durable readiness/checklist state.
- Broad arbitrary `companies.settings` writes.
- Broad arbitrary `companies.operating_mode_settings` writes.
- Company `slug` changes.
- Company `status` changes.
- Company `company_type` changes.
- Ownership transfer.
- Security, integration, billing, or deletion/deactivation settings.
- Company legal/contact/address fields until storage is explicitly designed.

These domains either have no company-safe model yet, carry runtime authority risk, or need separate permission/audit/RLS design.

## Recommended 10D2 RPC Design

10D2 should design a guarded company profile update RPC before implementation.

Recommended future RPC shape:

- Name: `public.rpc_company_profile_update(p_patch jsonb)`
- Return: narrow JSON or table projection suitable for `rpc_company_setup_context()` refresh.
- Caller: authenticated current-company members with `company.update_profile`; `service_role` for controlled operator compatibility.
- Grants: revoke `public` and `anon`; grant only intended roles.
- Scope: always update `current_company_id()` only; never trust a frontend-supplied `company_id`.
- Company guard: require active current-company membership and active company status.
- Permission guard: require `current_app_user_has_permission('company.update_profile')`.
- Allowed fields for first implementation: `name`, `timezone`, `locale`.
- Validation: trim `name`, reject blank name, validate timezone against PostgreSQL timezone data if practical, validate locale format or allowlist.
- Unsupported fields: reject or ignore with explicit warnings; do not write broad settings JSON.
- Audit: write `company.profile_updated` or equivalent company audit event with safe changed-field metadata.
- Result: include `company_id`, `name`, `timezone`, `locale`, `profile_complete`, `updated_at`, and audit event id if available.
- Idempotency: no-op patches should return a stable no-change result without extra side effects where practical.
- Error handling: return clear SQL exceptions for missing app user, missing current company, inactive company, missing permission, invalid fields, and no target row.

The frontend implementation after 10D2 should mirror existing patterns: a small feature API wrapper, local form state, safe validation copy, safe toast copy, and no direct table writes.

## 10D2 Boundary

10D2 is complete as the guarded RPC contract in `docs/COMPANY_PROFILE_UPDATE_RPC_CONTRACT.md`.

The contract keeps the first write surface limited to `companies.name`, `companies.timezone`, and `companies.locale`, scoped to `current_company_id()`, guarded by active current-company membership and `company.update_profile`, audited through `company_audit_events`, and designed to return a narrow non-authoritative result. It does not wire Owner Setup edits, create broad settings editors, create onboarding authority, call bootstrap from the browser, activate Vendor/Client surfaces, seed order numbering, seed notification defaults, or use product-mode/module metadata as authority.

## Handoff

Phase 10D1 confirms that Falcon has enough schema support for a narrow company profile update path, but not for broad company settings editing.

The next move is 10D3: implement the contracted guarded RPC for `companies.name`, `companies.timezone`, and `companies.locale`, backed by current-company membership, `company.update_profile`, active-company validation, narrow payload handling, and company audit logging.
