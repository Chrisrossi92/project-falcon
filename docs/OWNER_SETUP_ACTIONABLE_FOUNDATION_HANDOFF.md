# Owner Setup Actionable Foundation Handoff

## Purpose

This document closes Phase 10D: Company Profile / Settings Write Design And Minimal Actionable Owner Setup.

Phase 10D moved Owner Setup from read-only guidance to one narrowly scoped actionable card: Company Profile. It did not complete company onboarding, company settings, branding, order numbering, notification defaults, staff setup, Vendor/Client setup, product-mode activation, or durable readiness/onboarding persistence.

This is a documentation-only handoff lock before deeper order-numbering, notification-default, branding, or broader setup work.

## Completed 10D Slices

### 10D1 Company Profile / Settings Edit Pattern Inspection

Documentation:

- `docs/COMPANY_PROFILE_UPDATE_PATTERN_AUDIT.md`

10D1 inspected company schema, company settings shells, permissions, guarded RPC patterns, frontend edit patterns, and audit conventions. It recommended starting with narrow existing company profile fields rather than broad settings writes.

### 10D2 Company Profile Update RPC Contract

Documentation:

- `docs/COMPANY_PROFILE_UPDATE_RPC_CONTRACT.md`

10D2 defined the guarded `public.rpc_company_profile_update(p_patch jsonb)` contract. It limited the first editable fields to `name`, `timezone`, and `locale`; required current-company membership and `company.update_profile`; rejected unknown keys; and kept the result non-authoritative.

### 10D3 Minimal Company Profile Update RPC Implementation

Backend object:

- `supabase/migrations/20260518059000_company_profile_update_rpc.sql`

10D3 implemented `public.rpc_company_profile_update(p_patch jsonb) returns jsonb` as a current-company scoped, permission-guarded RPC. It validates input, updates only effective changes, writes `company.profile_updated` audit when changed, and grants execution to authenticated/service-role callers while revoking public/anon execution.

### 10D4 Owner Setup Company Profile Card Wiring

Frontend objects:

- `src/features/company-setup/companyProfileApi.js`
- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`

10D4 made only the Company Profile card actionable. The page edits only `name`, `timezone`, and `locale`, submits through `updateCompanyProfile(patch)`, and refetches live setup context after success.

### 10D5 Branding / Settings Shell Design

Documentation:

- `docs/COMPANY_BRANDING_SETTINGS_SHELL_DESIGN.md`

10D5 deferred branding/settings implementation. It found no active company branding table, logo field, branding RPC, company logo bucket, or report branding model. It recommends any future branding write use a narrow guarded contract, not a broad `companies.settings` editor.

### 10D6 Company-Safe Order Numbering Model Design

Documentation:

- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`

10D6 documented the current numbering gap: legacy text `company_key`, `falcon_default` default counter usage, browser-prefetched numbers, and global `orders.order_number` uniqueness. It recommends a company-id-backed, server-side numbering model before any Owner Setup numbering configuration.

### 10D7 Company Notification Defaults Model Design

Documentation:

- `docs/COMPANY_NOTIFICATION_DEFAULTS_MODEL_DESIGN.md`

10D7 documented the current notification model as global/event-scoped plus user-preference scoped, with no confirmed company-id-backed default model. It recommends company-scoped event/channel/role defaults and explicit fallback precedence before any Owner Setup notification-default configuration.

### 10D8 Actionable Foundation Closeout

Documentation:

- `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`

10D8 closes Phase 10D and records the current runtime inventory, safety boundaries, remaining exclusions, and recommended next phase options.

## Current Runtime Inventory

Backend:

- `public.rpc_company_profile_update(p_patch jsonb) returns jsonb`
- `supabase/migrations/20260518059000_company_profile_update_rpc.sql`

Frontend:

- `src/features/company-setup/companyProfileApi.js`
- `updateCompanyProfile(patch)`
- `src/pages/admin/OwnerSetup.jsx`
- Owner Setup actionable Company Profile card
- Existing read-only setup context hook in `src/features/company-setup/useCompanySetupContext.js`
- Existing read-only setup context API in `src/features/company-setup/companySetupContextApi.js`
- Live readiness display through `resolveCompanyReadiness(...)`

Current route/link context:

- `/settings/owner-setup` remains guarded by existing `settings.view`.
- Settings exposes `Owner Setup ->`.
- Dashboard exposes `Review owner setup` as guidance only.

## Current Actionable Fields

Only these company profile fields are writable from Owner Setup:

- `companies.name`
- `companies.timezone`
- `companies.locale`

Writes go through `rpc_company_profile_update(p_patch jsonb)`. The browser does not write `public.companies` directly.

The RPC rejects broad or authority-sensitive fields, including:

- `settings`
- `operating_mode_settings`
- `company_type`
- `status`
- `slug`
- roles and permissions
- onboarding/readiness fields
- product/module/package fields
- order-numbering fields
- notification-default fields
- Vendor/Client activation fields

## Current Safety Boundaries

Current safety boundaries:

- Only `name`, `timezone`, and `locale` are writable.
- No broad `companies.settings` writes exist.
- No `companies.operating_mode_settings` writes exist.
- No order-numbering writes exist.
- No notification-default writes exist.
- No branding uploads or branding settings writes exist.
- No onboarding/readiness authority exists.
- No durable onboarding/checklist persistence exists.
- No product-mode/module authority exists.
- No Vendor/Client shell activation exists.
- No bootstrap wrapper or primitive is callable from browser code.
- Owner Setup is not a blocking gate.
- Dashboard prompt visibility does not depend on readiness.
- Route guards do not depend on readiness.
- `settings.view` controls route visibility; `company.update_profile` controls the profile update RPC.

Canonical runtime authority remains in permissions, RLS/RPCs, route guards, assignment visibility, workflow logic, and guarded operational RPCs.

## Validation Baseline

Phase 10D validation covered:

- `supabase db reset` for the profile RPC migration.
- SQL smoke checks for guarded profile updates, rejected fields, no-op behavior, audit behavior, and setup-context reflection.
- Owner Setup and company setup targeted tests.
- Branding/settings, order-numbering, and notification-default docs-only validation.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.

Known validation warnings from prior runtime slices:

- `npm run lint` passes with existing warning noise, including unused React imports and hook dependency warnings.
- `npm run build` passes with the existing Tailwind ambiguous `ease-[${EASING}]` warning and large chunk warning.

10D8 adds documentation only and validates with `git diff --check`.

## Known Warnings

Known product/architecture warnings:

- Order numbering is not company-safe for SaaS yet because it still depends on legacy text `company_key`, default `falcon_default` behavior, browser prefetch, and global `orders.order_number` uniqueness.
- Notification defaults are not company-safe yet because current defaults are global/event-scoped and user-preference tables are not company-default storage.
- Branding is not actionable yet because no active company branding storage/upload/security model is confirmed.
- Broad `companies.settings` and `companies.operating_mode_settings` writes remain intentionally blocked.
- Owner Setup has read-only guidance for most cards; only Company Profile is actionable.

## Intentional Exclusions

Phase 10D intentionally did not implement:

- Order-numbering configuration.
- Company-safe order-number generation.
- Notification-default configuration.
- Company notification-default storage.
- Branding uploads.
- Branding settings writes.
- Broad company settings writes.
- Operating-mode settings writes.
- Module/package state.
- Product-mode authority.
- Vendor/Client activation.
- Staff invite submission from Owner Setup.
- Role assignment mutation from Owner Setup.
- Onboarding completion persistence.
- Readiness as access authority.
- Bootstrap mutation from browser.
- Owner Setup as a blocking gate.

## Recommended Next Phase Options

### Option A - Order Numbering Refactor Prep

Recommended scope:

- Inspect order creation dependency paths more deeply.
- Design company-id-backed numbering compatibility and migration behavior.
- Plan server-side number generation before Owner Setup configuration.
- Keep Owner Setup numbering card read-only/deferred until the backend is stable.

Phase 10E1 starts this option with a documentation-only dependency audit in `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`. It confirms the current active risks around browser prefetch, legacy `company_key = 'falcon_default'`, global order-number uniqueness, direct table create/update paths, guarded RPC create/update paths that accept submitted `order_number`, and global availability checks.

### Option B - Notification Defaults Refactor Prep

Recommended scope:

- Inspect notification policy resolver and fan-out dependencies more deeply.
- Design company-default storage and guarded update RPCs.
- Define fallback precedence from required system rules to user overrides to company defaults to global defaults.
- Keep Owner Setup notification card read-only/deferred until the backend is stable.

### Option C - Branding Storage Design

Recommended scope:

- Design company logo bucket/storage/security boundaries.
- Decide whether narrow `companies.settings.branding` metadata is enough.
- Design a guarded branding settings RPC only after storage and upload rules are clear.
- Continue avoiding broad settings writes.

### Option D - Polish Owner Setup UX

Recommended scope:

- Improve Owner Setup card layout and copy.
- Make disabled/deferred states clearer.
- Improve guidance around profile save results and readiness.
- Add no new writes.

## Recommended Default Next Step

Recommended default next step: Option A, Order Numbering Refactor Prep.

Reason: 10D6 found a real multi-company safety gap. Active order numbering still includes browser-prefetched order numbers, legacy `company_key = 'falcon_default'`, and global `orders.order_number` uniqueness. A SaaS-ready setup experience should not configure or seed numbering until number generation is company-id-backed, server-side, transaction-safe, and compatible with company-scoped uniqueness.

## Do Not Do Next

Do not use the next phase to:

- Wire order-numbering configuration before the backend refactor.
- Seed numbering from bootstrap before a company-safe model exists.
- Add notification defaults before a company-safe model exists.
- Add logo uploads before storage/security design exists.
- Broaden `companies.settings` writes.
- Write `companies.operating_mode_settings` from setup.
- Make Owner Setup a blocking gate.
- Call bootstrap wrappers from browser code.
- Use readiness as authority.
- Create product-mode/module authority.
- Activate Vendor/Client shells.
- Treat user notification preferences as company defaults.
- Use legacy text `company_key` as tenant authority.
- Rely on legacy `users.role` or `is_admin` as owner-instance authority.

## Handoff Lock

Phase 10D is complete through actionable owner setup foundation only.

Falcon now has one narrow setup write path for company profile basics and multiple design contracts for deferred setup domains. It does not yet have full owner setup, productized onboarding, company-safe order numbering, company notification defaults, branding storage, Vendor/Client setup, or readiness/onboarding authority.
