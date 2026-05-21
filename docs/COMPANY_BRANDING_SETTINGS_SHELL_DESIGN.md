# Company Branding / Settings Shell Design

## Purpose

Phase 10D5 defines the future branding/basic settings area for Owner Setup before implementation.

This is a design contract only. It does not add migrations, backend behavior, runtime code, route changes, registry changes, UI changes, tests, permission seeds, RLS edits, RPC edits, product-mode authority, module-authoritative security, Vendor/Client activation, onboarding authority, bootstrap mutation, order-numbering defaults, or notification-default writes.

The goal is to decide what can safely belong in a future branding/settings shell and what must remain deferred until storage, upload, and security contracts are explicit.

## Sources Inspected

Documentation inspected:

- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/COMPANY_PROFILE_UPDATE_RPC_CONTRACT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema and code inspected:

- `supabase/migrations/20260518003000_company_foundation_default_scope.sql`
- `supabase/migrations/20260518027000_company_relationship_foundation.sql`
- `supabase/migrations/20260518002000_baseline_static_seed_data.sql`
- `supabase/migrations/20260518051000_current_user_settings_rpcs.sql`
- `supabase/migrations/20260518059000_company_profile_update_rpc.sql`
- `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`
- `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`
- `src/pages/admin/OwnerSetup.jsx`
- `src/features/company-setup/companyProfileApi.js`
- `src/pages/Settings.jsx`
- `src/features/user-settings/api.js`
- Archived storage usage under `src/archive/components/users/UserDocuments.jsx`

## Existing Schema Support

Confirmed company setup storage surfaces:

- `public.companies.settings jsonb not null default '{}'::jsonb`
- `public.companies.operating_mode_settings jsonb not null default '{}'::jsonb`
- `public.company_types.default_settings jsonb not null default '{}'::jsonb`
- `public.company_types.onboarding_defaults jsonb not null default '{}'::jsonb`

Confirmed related permissions and patterns:

- `company.manage_branding` is seeded as a permission key.
- `company.update_profile` is used by `rpc_company_profile_update(p_patch jsonb)` for `name`, `timezone`, and `locale`.
- `rpc_current_user_settings_update(jsonb)` is a user-scoped profile/settings update pattern. It validates allowlisted fields and rejects authority changes by omission, but it is not a company branding path.

Not confirmed:

- No dedicated company branding table was found.
- No company logo column was found.
- No company branding RPC was found.
- No active company branding storage bucket or upload policy was found.
- No active company report header/footer settings model was found.
- No company public contact/profile table was found beyond the current `companies` profile columns.

An archived user document upload path references the `user-docs` storage bucket, but that is not an active company branding model and should not be reused as proof that company logo uploads are designed.

## Branding / Settings Shell Definition

The branding/settings shell is a future Owner Setup card area for low-risk company presentation metadata and basic configuration hints.

It may eventually help a company owner review or configure:

- Presentation color or accent metadata.
- Optional public display copy.
- Optional logo reference, after storage is designed.
- Optional report/display wording, after report template scope is designed.
- Basic company-facing settings that do not affect permissions, tenant visibility, workflow authority, assignments, product modes, modules, or onboarding completion.

The shell is not:

- A product-mode selector.
- A module entitlement editor.
- A tenant security boundary.
- An onboarding completion source of truth.
- A broad JSON settings editor.
- A replacement for company profile fields already covered by `rpc_company_profile_update(...)`.

## Relationship To Owner Setup

Owner Setup currently has one actionable card: Company Profile. That card updates only:

- `companies.name`
- `companies.timezone`
- `companies.locale`

The Branding step in `OwnerSetup` should remain non-actionable until a narrow branding/settings backend contract exists.

Future branding/settings UI may show:

- Deferred branding status.
- A warning that logo/file upload is not configured.
- A future-readiness item for external-facing branding.
- Links to a future company settings surface when implemented.

It must not:

- Mark setup complete.
- Gate access.
- Grant permissions.
- Activate product modes or modules.
- Activate Vendor/Client shells.
- Write arbitrary `companies.settings`.
- Write `companies.operating_mode_settings`.

## Relationship To `companies.settings`

`companies.settings` is the only currently confirmed company-level JSON shell that could plausibly hold sparse, non-authoritative branding metadata later.

If used, it should be updated only through a guarded RPC that:

- Requires active current-company membership.
- Requires a branding-specific permission such as `company.manage_branding`, or another explicitly selected company-settings permission.
- Rejects unknown keys.
- Writes only a narrow subkey such as `settings.branding`.
- Validates each field.
- Writes a company audit event on effective change.
- Returns a narrow result shape with no authority or grant fields.

`companies.settings` should not become an arbitrary frontend-owned document. Broad JSON merge/update behavior would make future authority boundaries ambiguous and should remain blocked.

## Relationship To `operating_mode_settings`

`companies.operating_mode_settings` exists for future operating-mode configuration, but it should remain non-authoritative and unwritten by the branding/settings shell.

Reasons:

- Operating mode metadata can be confused with product-mode/module authority.
- Current operational visibility is controlled by permissions, RLS/RPCs, route guards, assignments, and workflow logic.
- Product modes and modules may compose defaults and UX, but cannot authorize access.
- Vendor/Client live surfaces must not activate through setup metadata.

Any future write to `operating_mode_settings` needs a separate product/package contract and must explicitly preserve the non-authority boundary.

## Safe Near-Term Metadata

Conservative near-term candidates, if a future RPC is designed:

- `accent_color`: optional display-only hex color, validated as `^#[0-9A-Fa-f]{6}$`.
- `display_theme`: optional display-only enum, if a small product-approved allowlist exists.
- `brand_label`: optional short display label only if it does not conflict with `companies.name`.

These fields are safe only as presentation metadata. They must not affect route availability, permissions, module activation, workflow behavior, dashboards, portal availability, or tenant visibility.

Fields that are not currently safe as near-term metadata:

- Logo uploads or logo URLs, because no company logo storage model or upload policy is confirmed.
- Public email, phone, address, or website, because no dedicated company contact schema was confirmed.
- Report header/footer text, because report template/content scope is not designed.
- Client/vendor portal branding, because portal shell activation remains deferred.
- Product/package flags and module flags, because they can be mistaken for authority.

## Do Not Implement Yet

Do not implement the following in the branding/settings shell:

- Logo/file upload.
- Arbitrary settings JSON editor.
- Arbitrary `companies.settings` merge/write.
- `companies.operating_mode_settings` writes.
- Product/package flags.
- Module entitlement flags.
- Order numbering.
- Notification defaults.
- Onboarding completion.
- Vendor/Client activation.
- Report template or report content settings unless separately scoped.
- Client/vendor portal branding.
- Storage bucket creation or upload policy changes.
- Direct frontend table writes.

## Recommended Storage Strategy

Recommendation: defer implementation for now.

Falcon has enough schema for a future narrow metadata write to `companies.settings`, but not enough active product need or storage/upload design to justify implementing the Branding card immediately.

If branding becomes the next required setup action, use this strategy:

1. Add a narrow guarded RPC, likely `rpc_company_branding_settings_update(p_patch jsonb)`.
2. Require active current-company membership and `company.manage_branding`.
3. Allow only validated display metadata, initially `accent_color` and perhaps one small enum field.
4. Store under a dedicated `companies.settings.branding` subkey.
5. Preserve unrelated `companies.settings` keys.
6. Reject all unknown keys.
7. Write `company.branding_settings_updated` audit only on effective change.
8. Return a narrow non-authoritative JSON result.

Use a normalized table later if branding grows to:

- Logo/file assets.
- Multiple brand profiles.
- External portal branding.
- Report/template branding.
- Brand history/versioning.
- Organization/location-specific branding.

Logo and file support should receive a separate storage design before implementation. That design must cover buckets, object path ownership, signed URL behavior, file type/size validation, delete behavior, CDN/public access choices, audit events, and tenant isolation.

## Recommended 10D6 Direction

Proceed to 10D6: Order Numbering Model Design, not implementation.

Rationale:

- Branding currently has no dedicated active storage/upload model.
- The only plausible near-term branding write is a low-value display metadata subkey.
- Order numbering is a more operationally critical readiness domain and has existing baseline objects that need company-safe design before first-order readiness can be productized.

If product direction requires branding before order numbering, insert a separate storage/upload inspection slice before any branding RPC implementation.

## Hard No-Go Rules

- No settings or branding access authority.
- No product-mode or module security authority.
- No broad arbitrary settings JSON writes.
- No `operating_mode_settings` writes from branding/setup UI.
- No Continental defaults.
- No frontend-only truth for required backend setup.
- No hidden Vendor/Client activation.
- No global owner escalation.
- No storage of cross-tenant readable setup data.
- No logo/upload behavior without a dedicated storage contract.

## Phase 10D5 Lock

Phase 10D5 is complete as branding/settings shell design only.

The Branding step remains a future Owner Setup card. The recommended next implementation work is not a branding write; it is the 10D6 order-numbering model design.
