# Company Bootstrap Runtime Foundation Handoff

## Purpose

This document closes Phase 10B: Company Bootstrap Runtime Inspection And Readiness Foundation.

Phase 10B moved Falcon from design-only bootstrap contracts into a narrow runtime foundation:

- Existing bootstrap/setup primitives were inspected.
- A pure local readiness resolver was added.
- Static diagnostics and setup shell previews were added.
- A minimal service-role-only versioned bootstrap wrapper was implemented.
- Post-bootstrap validation was wired into the wrapper result as diagnostics only.

This is a handoff lock. It does not claim productized bootstrap, self-serve onboarding, live owner setup, company settings persistence, dashboard setup prompts, or full tenant onboarding are complete.

## Completed 10B Slices

### 10B1 Read-Only Bootstrap Primitive Inspection

`docs/COMPANY_BOOTSTRAP_PRIMITIVE_INSPECTION.md` documents the current SQL and Edge primitives for company bootstrap, setup context, audit events, memberships, role assignments, member projections, role presets, and company member invitation lifecycle.

Key lock:

- `rpc_company_bootstrap(...)` is a mutating service-role/operator-only internal primitive.
- `rpc_company_setup_context()` is a guarded authenticated/service-role read projection that requires current-company membership and `company.setup.read`.
- Invitation prepare/list/cancel/resend-prepare are current-company authenticated RPCs.
- Invitation finalize/resend-finalize are service-role-only paths.
- Invitation acceptance activates membership and staged role assignments only after identity checks.

### 10B2 Read-Only Readiness Resolver Design/Test Scaffold

Runtime/test objects added:

- `src/lib/companyBootstrap/companyReadinessResolver.js`
- `src/lib/companyBootstrap/__tests__/companyReadinessResolver.test.js`
- `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`

Key lock:

- `resolveCompanyReadiness(...)` is pure/local.
- It accepts setup-context-like input.
- It performs no network calls and no writes.
- It returns diagnostic readiness shape only.
- It does not grant, deny, or bypass access.

### 10B3 Static Diagnostics Readiness Preview

Runtime/test objects changed:

- `src/pages/admin/ProductMetadataDiagnostics.jsx`
- `src/pages/admin/__tests__/ProductMetadataDiagnostics.test.jsx`

Key lock:

- The Product Metadata Diagnostics page shows sample/static readiness output only.
- It does not call Supabase.
- It does not call `rpc_company_setup_context()`.
- It does not fetch live company data.
- It does not mutate anything.

### 10B4 Company Setup Storage Decision

Documentation added:

- `docs/COMPANY_SETUP_STORAGE_DECISION.md`

Key lock:

- Near-term readiness remains mostly derived.
- Existing `companies.settings` and `companies.operating_mode_settings` are non-authoritative JSON shells only.
- Durable onboarding state is deferred.
- Durable module/package state is deferred.
- Bootstrap must not seed order numbering or notification defaults until company-safe domain models exist.

### 10B5 Versioned Bootstrap Wrapper SQL Design

Documentation added:

- `docs/COMPANY_BOOTSTRAP_WRAPPER_SQL_DESIGN.md`

Key lock:

- A versioned JSONB wrapper is preferred over broadening the existing positional primitive.
- The first wrapper should remain service-role/operator-bound.
- The wrapper should delegate to `rpc_company_bootstrap(...)` rather than duplicate sensitive mutation logic.
- Dry-run validation should avoid mutation.
- Result shape should return skipped/unknown domains rather than inventing readiness.

### 10B6 Minimal Bootstrap Wrapper Implementation

Migration added:

- `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`

Runtime object added:

- `public.rpc_company_bootstrap_v1(p_payload jsonb) returns jsonb`

Key lock:

- Wrapper is service-role-only.
- Wrapper supports `dry_run`.
- Dry-run validates payload and returns warning-safe output without calling the mutating primitive.
- Non-dry-run delegates to existing `rpc_company_bootstrap(...)`.
- No app-role/browser grants were added.

### 10B7 Post-Bootstrap Validation Wiring

Migration added:

- `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`

Key lock:

- Wrapper signature and service-role-only boundary are preserved.
- Dry-run returns a readiness-style diagnostic summary.
- Non-dry-run returns SQL-local post-bootstrap checks from the primitive result and `company_audit_events`.
- `rpc_company_setup_context()` is intentionally not called inside service-role bootstrap because it requires authenticated current-company user/session context.

### 10B8 Owner Setup Route Shell

Frontend objects added:

- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`

Route added:

- `/settings/owner-setup`

Key lock:

- Route is guarded by existing `settings.view`.
- Page is static/sample/read-only only.
- Page uses the pure readiness resolver with a local fixture only.
- No Supabase, setup-context, bootstrap, or mutation calls exist in the shell.
- No settings utility link, dashboard prompt, command entry, or navigation link was added.

## Current Runtime Inventory

### Backend

- `public.rpc_company_bootstrap_v1(p_payload jsonb) returns jsonb`
- `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`
- `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`

Current backend behavior:

- Service-role-only wrapper.
- `dry_run` support.
- Non-dry-run delegation to internal `rpc_company_bootstrap(...)`.
- Diagnostic readiness summary in wrapper output.
- SQL-local post-bootstrap validation over returned bootstrap identifiers and `company_audit_events`.

### Frontend / Local Resolver

- `resolveCompanyReadiness(...)`
- `src/lib/companyBootstrap/companyReadinessResolver.js`
- `src/lib/companyBootstrap/__tests__/companyReadinessResolver.test.js`

Current resolver behavior:

- Pure/local.
- Setup-context-like input only.
- No Supabase imports.
- No network calls.
- No route, permission, RLS, product-mode, or module authority.

### Diagnostics Preview

- Existing route: `/settings/product-metadata-diagnostics`
- Existing page: `src/pages/admin/ProductMetadataDiagnostics.jsx`

Current diagnostics behavior:

- Static/sample readiness preview only.
- Local fixture only.
- Non-authoritative display of status, severity counts, blocking items, warnings, unknown domains, and next action.

### Owner Setup Shell

- Route: `/settings/owner-setup`
- Page: `src/pages/admin/OwnerSetup.jsx`

Current shell behavior:

- Static/sample/read-only only.
- Guarded by existing `settings.view`.
- No navigation link.
- No live setup context.
- No bootstrap call.
- No Supabase call.
- No mutation.

## Current Safety Boundaries

The following boundaries are locked at 10B closeout:

- Bootstrap wrapper remains service-role-only.
- Existing `rpc_company_bootstrap(...)` remains internal.
- No browser/self-serve bootstrap exists.
- No UI calls `rpc_company_bootstrap(...)` or `rpc_company_bootstrap_v1(...)`.
- Readiness is diagnostic only, not access authority.
- Onboarding state is diagnostic/guidance only, not access authority.
- Product-mode and module metadata are composition/default metadata only, not security authority.
- Permissions, RLS/RPCs, route guards, assignment visibility, and workflow logic remain canonical runtime authority.
- No Vendor Portal or Client Portal live shell activation occurs through bootstrap, readiness, modules, or setup.
- No order-numbering defaults are seeded by bootstrap.
- No notification defaults are seeded by bootstrap.
- No durable onboarding table/state is implemented.
- No durable module/package entitlement state is implemented.
- No company settings editor/write behavior is implemented.
- No owner setup nav/settings link exists yet.
- No dashboard setup prompt exists yet.
- No readiness-based route guard exists.

## Static / Sample Only Surfaces

These surfaces remain static/sample only:

- Product Metadata Diagnostics readiness preview.
- Owner Setup shell readiness checklist.
- Owner Setup future setup cards.

They must not be interpreted as live company state until a later phase explicitly wires guarded read-only setup context.

## Internal / Service-Role Only Surfaces

These surfaces remain internal/service-role only:

- `rpc_company_bootstrap(...)`
- `rpc_company_bootstrap_v1(p_payload jsonb)`
- Direct bootstrap mutation path.
- Company audit ledger writes used by bootstrap.

Future browser flows must go through a trusted backend/Edge boundary if self-serve bootstrap is ever introduced.

## Validation Baseline

Phase 10B validation covered:

- `supabase db reset` during SQL wrapper/post-validation slices.
- SQL dry-run smoke validation for the wrapper.
- SQL non-dry-run smoke validation inside rollback transaction.
- SQL service-role guard checks for the wrapper.
- Focused resolver tests.
- Focused diagnostics preview tests.
- Focused owner setup page/route tests.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.

Current known warnings:

- `npm run lint` passes with existing warning noise, including unused React imports and hook dependency warnings.
- `npm run build` passes with the existing Tailwind ambiguous `ease-[${EASING}]` warning and large chunk warning.

## Intentionally Excluded

Phase 10B intentionally did not implement:

- Browser-callable bootstrap.
- Self-serve company creation.
- Owner setup live data loading.
- Live `rpc_company_setup_context()` integration.
- Dashboard setup prompts.
- Settings utility link for owner setup.
- Company profile/settings editor.
- Durable onboarding state.
- Durable package/module state.
- Company-safe order-numbering model or seed.
- Company notification-default model or seed.
- Vendor/Client shell activation.
- Product-mode/module-authoritative permissions.
- Readiness-based route guards.
- Frontend-owned multi-table provisioning.
- Legacy `users.role` / `is_admin` expansion as owner-instance authority.

## Recommended Next Phase

Recommended next phase: Phase 10C, Live Read-Only Setup Context Integration.

Phase 10C should remain read-only at first. It should connect existing guarded setup context to diagnostics and owner setup displays without making setup/readiness authoritative.

Suggested 10C sequence:

1. 10C1: Inspect client-side RPC/service/hook patterns for `rpc_company_setup_context()`.
2. 10C2: Add a read-only setup context fetch service/hook with guarded loading/error states.
3. 10C3: Feed live setup context into Product Metadata Diagnostics readiness preview only.
4. 10C4: Feed live setup context into `/settings/owner-setup` behind safe loading/error/unknown states.
5. 10C5: Add optional settings utility link only if UX is ready and still non-authoritative.
6. 10C6: Add dashboard setup prompt only as guidance, not a gate.
7. 10C7: Closeout/handoff for live read-only setup integration.

Phase 10C1 is complete as `docs/COMPANY_SETUP_CONTEXT_CLIENT_INTEGRATION_PLAN.md`. The inspection recommends a read-only `src/features/company-setup/companySetupContextApi.js` plus `src/features/company-setup/useCompanySetupContext.js` pair for 10C2, with no UI wiring until the API/hook boundary is tested. The plan maps `rpc_company_setup_context()` output to `resolveCompanyReadiness(...)`, keeps unknown domains explicit, and preserves the no-bootstrap/no-mutation/no-authority boundary.

Phase 10C2 is complete as the read-only setup context API/hook boundary:

- `src/features/company-setup/companySetupContextApi.js`
- `src/features/company-setup/useCompanySetupContext.js`
- `src/features/company-setup/__tests__/companySetupContextApi.test.js`
- `src/features/company-setup/__tests__/useCompanySetupContext.test.jsx`

The API calls only `rpc_company_setup_context`, preserves resolver-compatible setup context fields, and does not call bootstrap or mutation paths. The hook exposes loading/error/permission-denied/refetch state and is not wired into diagnostics, Owner Setup, routes, dashboards, navigation, registries, or authority behavior.

Phase 10C3 is complete as diagnostics-only live setup context integration:

- `src/pages/admin/ProductMetadataDiagnostics.jsx`
- `src/pages/admin/__tests__/ProductMetadataDiagnostics.test.jsx`

The protected Product Metadata Diagnostics page now consumes `useCompanySetupContext()`, feeds live setup context into `resolveCompanyReadiness(...)` when available, and labels the output as live read-only setup context, diagnostic only, and non-authoritative. Loading, permission-denied, and error states are safe display states only. The static sample fallback remains visible. Owner Setup, dashboards, navigation, routes, registries, bootstrap calls, mutations, readiness authority, product-mode/module authority, and Vendor/Client activation remain unchanged.

Phase 10C4 is complete as Owner Setup live read-only setup context integration:

- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`

The `/settings/owner-setup` page now consumes `useCompanySetupContext()`, feeds live setup context into `resolveCompanyReadiness(...)` when available, and labels the output as read-only guidance, diagnostic only, and non-authoritative. Loading, permission-denied, and error states are safe display states only. The static sample fallback remains visible. Route protection remains the existing `settings.view` guard. Dashboards, navigation, registries, bootstrap calls, mutations, onboarding persistence, settings writes, invite submission, order-numbering setup, notification-default writes, readiness authority, product-mode/module authority, and Vendor/Client activation remain unchanged.

Phase 10C5 is complete as a Settings page utility link:

- `src/lib/navigation/currentNavigationRegistry.js`
- `src/lib/navigation/currentSettingsUtilityLinks.js`
- `src/pages/Settings.jsx`
- `src/lib/navigation/__tests__/currentNavigationRegistry.test.js`
- `src/lib/navigation/__tests__/currentSettingsUtilityLinks.test.js`

The link label is `Owner Setup ->`, the path is `/settings/owner-setup`, and the route/visibility metadata uses `settings.view`. This is navigation convenience only. It does not add a new permission, change route protection, add readiness-based visibility, call bootstrap, mutate setup data, or affect dashboards/onboarding.

Phase 10C6 is complete as a dashboard guidance prompt:

- `src/features/dashboard/DashboardPage.jsx`
- `src/features/dashboard/__tests__/OwnerSetupDashboardPrompt.test.jsx`

The order dashboard now renders a small `Review owner setup` prompt only for users with existing `settings.view`. The prompt links to `/settings/owner-setup` and is labeled `Diagnostic guidance only`. It does not fetch readiness, call setup context, call bootstrap, mutate data, redirect users, alter `DashboardGate`, change dashboard resolution, or make readiness authoritative.

Phase 10C7 is complete as the live read-only setup integration handoff:

- `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`

The handoff locks the current frontend inventory, route/link/prompt inventory, safety boundaries, validation baseline, intentional exclusions, and recommended Phase 10D sequence. It does not claim setup/onboarding write implementation is complete.

## Do Not Do Next

Do not use Phase 10C to:

- Make owner setup a blocking gate.
- Add self-serve bootstrap from the browser.
- Wire bootstrap mutation into UI.
- Call service-role bootstrap from client code.
- Create product-mode/module authority.
- Activate Vendor or Client surfaces.
- Seed order numbering before a company-safe numbering model exists.
- Seed notification defaults before a company-safe notification-default model exists.
- Persist onboarding state without a storage implementation slice.
- Treat readiness as permission, route, RLS, assignment, workflow, or visibility authority.
- Rely on legacy `users.role` / `is_admin` as owner-instance authority.
- Hide tenant-safety gaps behind frontend-only checks.

## Handoff Lock

Phase 10B is complete through runtime foundation only. Phase 10C is complete through live read-only setup integration only.

Bootstrap/onboarding productization is not complete. The next phase must preserve the current doctrine: setup and readiness may guide users, but canonical authority remains in permissions, RLS/RPCs, route guards, assignment visibility, and workflow logic.
