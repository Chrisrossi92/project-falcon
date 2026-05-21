# Company Setup Live Read-Only Handoff

## Purpose

This document closes Phase 10C: Live Read-Only Setup Context Integration.

Phase 10C connected the guarded `rpc_company_setup_context()` read projection to frontend diagnostics and setup guidance surfaces without introducing setup writes, onboarding persistence, readiness authority, bootstrap mutation from the browser, route guard changes, dashboard resolution changes, product-mode/module authority, Vendor/Client activation, or company settings editors.

This is a handoff lock before any future write/edit/onboarding persistence work.

## Completed 10C Slices

### 10C1 Read-Only Client Pattern Inspection

Documentation:

- `docs/COMPANY_SETUP_CONTEXT_CLIENT_INTEGRATION_PLAN.md`

10C1 inspected existing Supabase client, feature API, hook, diagnostics, Owner Setup, route, and test patterns before any live setup-context wiring.

### 10C2 Read-Only Setup Context API/Hook

Frontend/test objects:

- `src/features/company-setup/companySetupContextApi.js`
- `src/features/company-setup/useCompanySetupContext.js`
- `src/features/company-setup/__tests__/companySetupContextApi.test.js`
- `src/features/company-setup/__tests__/useCompanySetupContext.test.jsx`

`getCompanySetupContext()` calls only `rpc_company_setup_context`. `useCompanySetupContext()` exposes guarded loading, error, permission-denied, and refetch state. Neither path calls bootstrap RPCs or mutations.

### 10C3 Diagnostics Live Read-Only Integration

Frontend/test objects:

- `src/pages/admin/ProductMetadataDiagnostics.jsx`
- `src/pages/admin/__tests__/ProductMetadataDiagnostics.test.jsx`

Product Metadata Diagnostics consumes live setup context when available, feeds it into `resolveCompanyReadiness(...)`, and preserves a static sample fallback. The surface remains diagnostic-only.

### 10C4 Owner Setup Live Read-Only Integration

Frontend/test objects:

- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`

Owner Setup consumes live setup context when available, feeds it into `resolveCompanyReadiness(...)`, and preserves a static sample fallback. The route remains guarded by existing `settings.view`.

### 10C5 Owner Setup Settings Utility Link

Frontend/test objects:

- `src/lib/navigation/currentNavigationRegistry.js`
- `src/lib/navigation/currentSettingsUtilityLinks.js`
- `src/pages/Settings.jsx`
- `src/lib/navigation/__tests__/currentNavigationRegistry.test.js`
- `src/lib/navigation/__tests__/currentSettingsUtilityLinks.test.js`

The Settings page now exposes `Owner Setup ->` as a settings utility link to `/settings/owner-setup`, backed by existing `settings.view` metadata.

### 10C6 Dashboard Owner Setup Prompt

Frontend/test objects:

- `src/features/dashboard/DashboardPage.jsx`
- `src/features/dashboard/__tests__/OwnerSetupDashboardPrompt.test.jsx`

The order dashboard includes a small `Review owner setup` prompt for users with existing `settings.view`. It links to `/settings/owner-setup` and is guidance only.

## Current Frontend Inventory

Read-only setup context boundary:

- `src/features/company-setup/companySetupContextApi.js`
- `src/features/company-setup/useCompanySetupContext.js`

Live readiness consumers:

- `ProductMetadataDiagnostics` live readiness integration.
- `OwnerSetup` live readiness integration.

Route/link/prompt inventory:

- `/settings/owner-setup`, guarded by existing `settings.view`.
- Settings utility link: `Owner Setup ->` to `/settings/owner-setup`.
- Dashboard prompt: `Review owner setup` to `/settings/owner-setup`.

Supporting local resolver:

- `src/lib/companyBootstrap/companyReadinessResolver.js`

## Current Safety Boundaries

The current implementation is limited to read-only setup context and diagnostic guidance:

- `rpc_company_setup_context()` is consumed only through the read-only setup context API/hook.
- No browser code calls `rpc_company_bootstrap(...)`.
- No browser code calls `rpc_company_bootstrap_v1(...)`.
- No setup/onboarding/company mutations were added.
- The later Phase 10D Company Profile card is the only current setup write path, and it updates only `name`, `timezone`, and `locale` through `rpc_company_profile_update(...)`.
- Readiness does not grant access.
- Readiness does not deny access.
- Onboarding state is not persisted.
- No route guard or redirect depends on readiness.
- Dashboard prompt visibility does not depend on readiness.
- Owner Setup is not a blocking gate.
- Product-mode/module metadata is not authority.
- Vendor/Client live shells are not activated.
- Order numbering setup is not implemented.
- Notification-default setup is not implemented.
- Staff invite submission from Owner Setup is not implemented.
- Broad company settings writes are not implemented.

Canonical authority remains in permissions, RLS/RPCs, route guards, assignment visibility, workflow logic, and the existing guarded operational RPC surfaces.

## Validation Baseline

Phase 10C validation covered:

- Setup-context API/hook tests.
- Product Metadata Diagnostics tests.
- Owner Setup tests.
- Settings utility link registry tests.
- Dashboard prompt tests.
- DashboardGate tests to preserve dashboard resolution behavior.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.

Known validation warnings:

- `npm run lint` passes with existing warning noise, including unused React imports and hook dependency warnings.
- `npm run build` passes with the existing Tailwind ambiguous `ease-[${EASING}]` warning and large chunk warning.

## Intentionally Excluded

Phase 10C intentionally did not implement:

- Browser-callable bootstrap.
- Bootstrap mutation from UI.
- Company profile/settings writes beyond the later narrow Phase 10D profile card.
- Branding/settings writes.
- Durable onboarding state.
- Durable setup checklist persistence.
- Order-numbering model or setup UI.
- Notification-default model or setup UI.
- Team/staff invite submission from Owner Setup.
- Role assignment mutation from Owner Setup.
- Dashboard readiness-dependent prompt visibility.
- Readiness-based route guards or redirects.
- Product-mode/module authority.
- Vendor/Client shell activation.
- Broad company settings writes.

## Recommended Next Phase

Recommended next phase: Phase 10D, Company Profile / Settings Write Design And Minimal Actionable Owner Setup.

10D should move from read-only setup guidance to one narrowly scoped, guarded write surface at a time. It should start with company profile/settings write design before wiring any editable Owner Setup cards.

Suggested 10D sequence:

1. 10D1: Inspect existing company settings/profile edit patterns. Completed as documentation/read-only inspection in `docs/COMPANY_PROFILE_UPDATE_PATTERN_AUDIT.md`.
2. 10D2: Design guarded company settings/profile update RPC. Completed as documentation/read-only inspection in `docs/COMPANY_PROFILE_UPDATE_RPC_CONTRACT.md`.
3. 10D3: Implement minimal company profile update RPC. Completed in `supabase/migrations/20260518059000_company_profile_update_rpc.sql`.
4. 10D4: Wire company profile card only. Completed in `src/pages/admin/OwnerSetup.jsx` with `src/features/company-setup/companyProfileApi.js`.
5. 10D5: Branding/settings shell card design. Completed in `docs/COMPANY_BRANDING_SETTINGS_SHELL_DESIGN.md`.
6. 10D6: Order numbering model design, not implementation. Completed in `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`.
7. 10D7: Notification defaults model design, not implementation. Completed in `docs/COMPANY_NOTIFICATION_DEFAULTS_MODEL_DESIGN.md`.
8. 10D8: Actionable Owner Setup Foundation Closeout / Handoff Lock. Completed in `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`.

10D1 confirmed that the existing `public.companies` table supports a narrow first profile edit surface for company display name, timezone, and possibly locale, while legal name, contact fields, branding, broad settings JSON, operating-mode settings, order numbering, notification defaults, module/package state, Vendor/Client activation, and onboarding completion require separate design. The next slice should design a guarded `rpc_company_profile_update(p_patch jsonb)`-style RPC before any Owner Setup write behavior is added.

10D2 locked the guarded profile update RPC contract. The first implementation should add `public.rpc_company_profile_update(p_patch jsonb)` for `name`, `timezone`, and `locale` only, require active current-company membership and `company.update_profile`, reject unknown or unsafe keys, write a company audit event when changed, return a narrow non-authoritative result, and recommend refreshing `rpc_company_setup_context()` after success. It remains explicitly separate from broad settings writes, onboarding completion, order numbering, notification defaults, product-mode/module authority, Vendor/Client activation, and bootstrap mutation.

10D3 implemented `public.rpc_company_profile_update(p_patch jsonb)` as a guarded current-company RPC. The function rejects null/non-object patches, rejects keys outside `name`, `timezone`, and `locale`, validates non-empty names up to 160 characters, validates timezones against PostgreSQL timezone names, allows only `en-US` locale for now, writes `company.profile_updated` audit only on effective changes, returns a narrow JSONB result, and grants execute to `authenticated` and `service_role` while revoking `public` and `anon`. No Owner Setup writes, frontend API, route changes, registry changes, broad settings writes, product-mode/module authority, Vendor/Client activation, bootstrap calls, order-numbering changes, or notification-default changes were added.

10D4 wired only the Owner Setup Company Profile card to the guarded profile RPC. `src/features/company-setup/companyProfileApi.js` calls only `rpc_company_profile_update`; `OwnerSetup` edits only company name, timezone, and locale; successful saves refetch setup context; and the static sample fallback remains available when live context is unavailable. No route changes, registry/nav/dashboard changes, other setup-card writes, broad settings writes, bootstrap calls, onboarding persistence, readiness authority, product-mode/module authority, Vendor/Client activation, order-numbering writes, or notification-default writes were added.

10D5 completed the branding/settings shell design in `docs/COMPANY_BRANDING_SETTINGS_SHELL_DESIGN.md`. The design confirms that `companies.settings` is the only plausible near-term company-level JSON shell for sparse non-authoritative branding metadata, while no active company branding table, logo field, branding RPC, company logo storage bucket, or report branding model is confirmed. Branding implementation is deferred; if needed later, it should use a narrow guarded `companies.settings.branding` subkey RPC with `company.manage_branding`, field allowlisting, audit events, and no product-mode/module authority. The recommended next slice remains 10D6 order-numbering model design.

10D6 completed the company-safe order-numbering model design in `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`. The design confirms that the current model uses legacy text `company_key`, `order_number_counters(rule_id, counter_year)`, `rpc_get_next_order_number(...)`, global `orders.order_number` uniqueness, and browser-side prefetch/manual submission. It recommends a future company-id-backed rule/counter model, current-company server-side generation, company-scoped uniqueness, guarded configuration RPCs, audit events for rule changes, and no bootstrap seeding until the model and order creation path are company-safe. No order-numbering implementation was added.

10D7 completed the company notification-defaults model design in `docs/COMPANY_NOTIFICATION_DEFAULTS_MODEL_DESIGN.md`. The design confirms that current notification policy data is global/event-scoped through `notification_policies`, while `notification_prefs`, `user_notification_prefs`, and `notification_preferences` are user-scoped preference models. No company-specific notification-default table or guarded update RPC is confirmed. The future model should use company-id-scoped event/channel/role defaults, clear fallback precedence from required system rules to user overrides to company defaults to global defaults, guarded update RPCs, audit events, and no bootstrap seeding until the company-safe model is live. No notification-default implementation was added.

10D8 completed the actionable owner setup foundation closeout in `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`. The handoff confirms that only the Company Profile card is actionable, only `name`, `timezone`, and `locale` are writable through `rpc_company_profile_update(p_patch jsonb)`, and all broader setup domains remain deferred. It recommends order-numbering refactor prep as the default next step because the current numbering path still depends on browser prefetch, legacy text `company_key = 'falcon_default'`, and global `orders.order_number` uniqueness.

## Do Not Do Next

Do not use the next phase to:

- Wire bootstrap mutation into UI.
- Make Owner Setup a blocking gate.
- Create onboarding authority.
- Create product-mode/module authority.
- Activate Vendor/Client shells.
- Seed order numbering before a company-safe numbering model exists.
- Use legacy text `company_key` as tenant authority.
- Seed notification defaults before a company-safe notification-default model exists.
- Treat user notification preferences as company defaults.
- Make dashboard prompt conditional on readiness yet.
- Create broad company settings writes without RPC/RLS review.
- Implement branding writes before a narrow guarded storage/upload contract exists.
- Use frontend-only readiness as truth for required backend setup.
- Rely on legacy `users.role` or `is_admin` as owner-instance authority.

## Handoff Lock

Phase 10C is complete through live read-only setup integration only. Phase 10D is complete through the narrow actionable Owner Setup foundation in `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`.

Falcon now has discoverable setup guidance from diagnostics, Owner Setup, Settings, and the dashboard, plus one guarded Company Profile write path for `name`, `timezone`, and `locale`. Falcon does not yet have productized onboarding, broad company settings editing, persistent onboarding, order-numbering setup, notification-default setup, branding setup, Vendor/Client activation, or setup completion authority.

## 10H1 Layout Polish Design

Phase 10H1 adds `docs/OWNER_SETUP_LAYOUT_POLISH_DESIGN.md` as documentation-only layout/card/copy design.

The design keeps the existing live read-only setup context, Company Profile guarded write card, Settings link, Dashboard prompt, and non-authoritative readiness boundary. It recommends grouping future Owner Setup cards into Core Setup, Operations Setup, Communication / Branding, and Readiness; normalizing card badges to `Ready`, `Needs attention`, `Available`, `Coming later`, `Diagnostic only`, and `Deferred`; and implementing 10H2 as visual layout/copy polish only.

10H1 does not add runtime code, migrations, backend behavior, route changes, registry changes, UI changes, tests, setup writes, onboarding persistence, readiness authority, product-mode/module authority, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, or broad settings writes.

## 10H2 Layout Polish Implementation

Phase 10H2 updates the Owner Setup page layout and copy while preserving the live read-only setup context boundary.

Implemented changes:

- Owner Setup now groups cards into Core Setup, Operations Setup, Communication / Branding, and Readiness.
- Cards use the fixed labels `Ready`, `Needs attention`, `Available`, `Coming later`, `Diagnostic only`, and `Deferred`.
- Company Profile remains the only actionable setup card and still edits only `name`, `timezone`, and `locale`.
- Live readiness remains diagnostic-only guidance.
- The static sample fallback remains available and secondary.
- Authority boundary copy remains visible.

10H2 does not add migrations, backend behavior, route changes, registry changes, permission changes, RLS/RPC changes, setup authority, onboarding persistence, Vendor/Client activation, order-numbering configuration, notification-default configuration, branding configuration, bootstrap mutation, or broad settings writes.
