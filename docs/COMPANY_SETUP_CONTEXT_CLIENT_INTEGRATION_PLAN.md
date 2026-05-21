# Company Setup Context Client Integration Plan

## Purpose

This document locks Phase 10C1 through 10C3: read-only client pattern inspection, the minimal read-only API/hook boundary for `rpc_company_setup_context()`, and diagnostics-only live setup context integration.

Phase 10C1 was documentation-only plus read-only code inspection. Phase 10C2 adds read-only frontend API/hook code and focused tests only. Phase 10C3 wires that hook into the protected Product Metadata Diagnostics page only. It does not introduce migrations, backend behavior, permission seeds, RLS policies, RPC edits, route changes, registry changes, Owner Setup integration, dashboard changes, navigation changes, bootstrap mutation, product-mode authority, module-authoritative security, Vendor/Client activation, or onboarding enforcement.

Phase 10B ended with:

- `public.rpc_company_bootstrap_v1(p_payload jsonb)` as a service-role-only wrapper.
- `resolveCompanyReadiness(...)` as a pure local resolver.
- Static/sample readiness preview in Product Metadata Diagnostics.
- Static/sample owner setup shell at `/settings/owner-setup`.

Phase 10C should connect live setup context only through guarded read-only client patterns.

## Sources Inspected

Docs inspected:

- `docs/COMPANY_BOOTSTRAP_RUNTIME_FOUNDATION_HANDOFF.md`
- `docs/COMPANY_BOOTSTRAP_PRIMITIVE_INSPECTION.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`
- `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend/client files inspected:

- `src/lib/supabaseClient.js`
- `src/features/auth/currentUserAppContextApi.js`
- `src/features/auth/useCurrentUserAppContext.js`
- `src/features/company-invitations/api.js`
- `src/features/company-members/api.js`
- `src/features/clients/clientManagementApi.js`
- `src/features/relationships/api.js`
- `src/features/assignments/api.js`
- `src/features/user-settings/api.js`
- `src/lib/hooks/usePermissions.js`
- `src/lib/hooks/useSession.js`
- `src/pages/admin/ProductMetadataDiagnostics.jsx`
- `src/pages/admin/__tests__/ProductMetadataDiagnostics.test.jsx`
- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/admin/__tests__/OwnerSetup.test.jsx`
- `src/components/shell/__tests__/TopNav.test.jsx`

Backend definition inspected for shape only:

- `supabase/migrations/20260518038000_company_setup_context_rpc.sql`

## Current Client RPC Patterns Found

### Supabase Client

`src/lib/supabaseClient.js` creates one Supabase client from Vite env values and exports it as both default and named `supabase`.

Current feature modules generally import the default client:

```js
import supabase from "@/lib/supabaseClient";
```

### Feature API Modules

Current active feature API modules use small function wrappers around RPC calls:

- `src/features/auth/currentUserAppContextApi.js`
- `src/features/company-invitations/api.js`
- `src/features/company-members/api.js`
- `src/features/clients/clientManagementApi.js`
- `src/features/relationships/api.js`
- `src/features/assignments/api.js`
- `src/features/user-settings/api.js`

Common conventions:

- Call `supabase.rpc(...)` directly inside a feature API module.
- Throw `error` if Supabase returns one.
- Normalize row shape in the API module when the UI needs stable field names.
- Use helper `firstRow(data)` for table-returning RPCs that may return one row.
- Return arrays as `[]` when RPC output is not an array.
- Keep mutation functions separate from read functions by naming and payload shape.

### Hook Patterns

`src/features/auth/useCurrentUserAppContext.js` is the closest match for a future setup-context hook.

Observed pattern:

- Uses `useSession()` to wait for authenticated session state.
- Does not call the RPC until session loading finishes and an auth user exists.
- Keeps local `context`, `loading`, `error`.
- Exposes `refetch`.
- Uses an `active` flag in `useEffect` to avoid setting state after unmount.
- Returns both `context` and `data` aliases.

`src/lib/hooks/usePermissions.js` is another relevant pattern:

- Waits on `useSession()`.
- Calls a guarded permission RPC.
- Returns loading/error plus normalized data.
- Does not redirect or mutate on permission errors.

### Diagnostics Page Pattern

`src/pages/admin/ProductMetadataDiagnostics.jsx` currently uses static metadata and local resolver fixtures only.

Current diagnostics tests use `renderToStaticMarkup(...)` and source scanning to ensure no Supabase/API/service imports or `.rpc(...)` calls exist in the static preview.

Live setup-context wiring will need different tests from the current static diagnostics tests if the page itself imports a hook. A safer intermediate step is to test the setup-context API/hook separately before wiring it into the diagnostics page.

### Owner Setup Shell Pattern

`src/pages/admin/OwnerSetup.jsx` currently uses the pure readiness resolver with a local fixture only.

Current owner setup tests source-scan the page to confirm:

- static fixture use,
- no service/Supabase/API imports,
- no `.rpc(...)`, insert, update, upsert, or delete calls.

Live setup-context wiring should preserve no mutation checks, but the page will eventually need to import only a read-only setup-context hook.

### Test Pattern

Existing tests use Vitest.

Observed styles:

- Server/static rendering with `renderToStaticMarkup(...)` for pure pages.
- `@testing-library/react` plus `MemoryRouter` and `vi.mock(...)` for components using hooks/route context.
- `vi.mock("@/lib/supabaseClient", ...)` for Supabase-dependent components when needed.
- Hoisted test state for permissions in `TopNav.test.jsx`.

No dedicated service-test pattern for new feature API modules was found in the inspected files. 10C2 should add focused tests only if the existing test environment can mock `@/lib/supabaseClient` cleanly.

## Existing Setup Context RPC Shape

`public.rpc_company_setup_context()` returns one active-company setup row with:

- `company_id`
- `company_slug`
- `company_name`
- `company_type`
- `company_status`
- `timezone`
- `locale`
- `active_company_claim_id`
- `active_company_context_valid`
- `profile_complete`
- `owner_invariant_ok`
- `active_owner_count`
- `active_member_count`
- `active_role_assignment_count`
- `role_presets_ready`
- `owner_role_ready`
- `relationship_readiness`
- `assignment_readiness`
- `dashboard_readiness`
- `audit_readiness`
- `setup_complete`
- `setup_blockers`
- `checklist`

Caller/security from inspected SQL:

- `security definer`.
- Requires current app user.
- Requires active current-company membership.
- Requires active company.
- Requires `company.setup.read`.
- Execute is granted to `authenticated` and `service_role`; revoked from `public` and `anon`.
- It is read-only in the inspected definition.

The RPC is safe as a guarded read projection, but it is not authority. Permission/RLS/RPC/route/action checks still decide runtime access.

## Safest Client Location

Recommended new feature folder:

- `src/features/company-setup/`

Recommended API module:

- `src/features/company-setup/companySetupContextApi.js`

Recommended hook:

- `src/features/company-setup/useCompanySetupContext.js`

Phase 10C2 implements this location exactly:

- `src/features/company-setup/companySetupContextApi.js`
- `src/features/company-setup/useCompanySetupContext.js`
- `src/features/company-setup/__tests__/companySetupContextApi.test.js`
- `src/features/company-setup/__tests__/useCompanySetupContext.test.jsx`

Why this location:

- Matches current feature-level API organization for invitations, members, clients, relationships, assignments, auth, and user settings.
- Keeps setup/onboarding logic out of generic `src/lib`.
- Makes later Owner Setup and diagnostics imports explicit.
- Avoids modifying route, navigation, dashboard, or settings registries in 10C2.

## Proposed API / Hook Contract

### API Function

Proposed function:

```js
getCompanySetupContext()
```

Expected behavior:

- Calls `supabase.rpc("rpc_company_setup_context")`.
- Throws Supabase error unchanged or with minimal safe normalization.
- Accepts no arguments.
- Returns one normalized row or `null`.
- Does not call `rpc_company_bootstrap(...)`.
- Does not call `rpc_company_bootstrap_v1(...)`.
- Does not mutate.

10C2 implementation notes:

- `getCompanySetupContext()` calls only `rpc_company_setup_context`.
- It returns the first row or `null`.
- It preserves snake_case setup-context fields for direct resolver compatibility.
- It normalizes booleans, counts, JSON object fields, and JSON array fields to stable safe defaults.
- It exports `isCompanySetupPermissionDeniedError(error)` so the hook can identify guarded-denial states without redirecting.

Expected normalized return shape should preserve resolver-compatible keys:

- `company_id`
- `company_slug`
- `company_name`
- `company_type`
- `company_status`
- `timezone`
- `locale`
- `active_company_claim_id`
- `active_company_context_valid`
- `profile_complete`
- `owner_invariant_ok`
- `active_owner_count`
- `active_member_count`
- `active_role_assignment_count`
- `role_presets_ready`
- `owner_role_ready`
- `relationship_readiness`
- `assignment_readiness`
- `dashboard_readiness`
- `audit_readiness`
- `setup_complete`
- `setup_blockers`
- `checklist`

Optional later adapter:

- `toCompanyReadinessInput(setupContext)`

This adapter should be pure and shallow. It should not invent unknown domains. Because `resolveCompanyReadiness(...)` already accepts snake_case keys from `rpc_company_setup_context()`, 10C2 may not need an adapter beyond null/array handling.

### Hook

Proposed hook:

```js
useCompanySetupContext()
```

Expected return shape:

- `context`
- `data`
- `loading`
- `error`
- `permissionDenied`
- `refetch`

Expected behavior:

- Use `useSession()` before calling the RPC.
- If no auth user exists, return `context: null`, `loading: false`, `error: null`.
- On `42501` or known setup-read errors, set `permissionDenied: true` and preserve the error object.
- Do not redirect.
- Do not mutate.
- Do not call bootstrap.
- Do not compute access grants.

10C2 implementation notes:

- `useCompanySetupContext()` follows the `useCurrentUserAppContext()` pattern.
- It waits for `useSession()`.
- It does not call the API when there is no authenticated user.
- It exposes `context`, `data`, `loading`, `error`, `permissionDenied`, and `refetch`.
- It ignores stale async results on unmount.
- It does not redirect or mutate.

Permission-denied handling should be display-friendly:

- `setup_read_permission_missing`
- `current_company_membership_required`
- `company_inactive`
- `app_user_not_found`
- generic `42501`

The hook should not treat permission denied as a tenant leak. UI should show a stable unavailable/read-only diagnostic state without listing hidden company data.

## Potential Data Shape Mapping

| Setup context output | Resolver category | Notes |
| --- | --- | --- |
| `company_id` / `company_slug` / `company_name` | Company/profile | Display and identity context only. |
| `company_type` | Company/profile | Metadata only; not product-mode authority. |
| `company_status` | Company/profile | Active status is part of readiness; RLS/RPCs remain authority. |
| `timezone` / `locale` | Company/profile | Profile completion inputs. |
| `active_company_claim_id` | Active-company context | Diagnostic only. |
| `active_company_context_valid` | Active-company context | Resolver can use as readiness signal, not route authority. |
| `profile_complete` | Company/profile | Maps directly to resolver `profile_complete`. |
| `owner_invariant_ok` | Owner | Maps directly to resolver `owner_invariant_ok`. |
| `active_owner_count` | Owner | Maps directly to resolver `active_owner_count`. |
| `active_member_count` | Staff/team | Maps to active membership/staff readiness. |
| `active_role_assignment_count` | Roles | Useful detail for diagnostics; resolver does not require it today. |
| `role_presets_ready` | Role presets | Maps directly to resolver `role_presets_ready`. |
| `owner_role_ready` | Owner role | Maps directly to resolver `owner_role_ready`. |
| `relationship_readiness` | Relationships | Advisory/deferred unless package state later enables relationship setup. |
| `assignment_readiness` | Assignments | Advisory/deferred unless package state later enables assignment setup. |
| `dashboard_readiness` | Dashboard | Maps to resolver dashboard readiness. |
| `audit_readiness` | Audit | Maps to resolver audit readiness. |
| `setup_complete` | Setup summary | Display-only; should not override resolver severity or authority checks. |
| `setup_blockers` | Setup summary | Display-only; useful for diagnostics/remediation copy. |
| `checklist` | Setup checklist | Display-only until checklist semantics are versioned. |

Unknown domains retained by resolver:

- Order numbering readiness.
- Notification defaults readiness.
- Persistent onboarding state.
- Durable module/package state.

## Recommended 10C2 Implementation

Recommended next slice from 10C1 was to add read-only setup context API/hook and tests only. Phase 10C2 completed that slice.

Scope:

- Add `src/features/company-setup/companySetupContextApi.js`.
- Add `src/features/company-setup/useCompanySetupContext.js`.
- Add focused tests if Supabase/hook mocking stays simple.
- Do not wire the hook into Product Metadata Diagnostics yet unless the implementation stays small and testable. Preferred sequencing is hook/service first.
- Do not wire the hook into Owner Setup yet.
- Do not add settings utility links.
- Do not add dashboard prompts.
- Do not modify routes or guards.

Implementation expectations:

- Use existing `supabase.rpc(...)` wrapper style.
- Normalize only enough for stable setup-context/result consumption.
- Preserve snake_case fields so `resolveCompanyReadiness(...)` can consume the result directly.
- Return `permissionDenied` from the hook for guarded-denial states.
- Keep all readiness results diagnostic only.
- Add source-scan or unit assertions that the new module does not reference `rpc_company_bootstrap`, `rpc_company_bootstrap_v1`, insert, update, upsert, or delete.

Testing strategy:

- API test with mocked `@/lib/supabaseClient`:
  - successful RPC returns normalized single row.
  - array result returns first row.
  - null/empty result returns `null`.
  - RPC error throws.
  - no bootstrap RPC names are present in source.
- Hook test with mocked `useSession()` and mocked API:
  - waits while session loading.
  - does not call API without auth user.
  - loads setup context for authenticated user.
  - exposes error and `permissionDenied` for `42501` / setup-read errors.
  - exposes `refetch`.

## Later 10C Wiring

10C3 is now complete as diagnostics-only live setup context integration.

The protected Product Metadata Diagnostics page now imports `useCompanySetupContext()`, feeds live setup context into `resolveCompanyReadiness(...)` when available, and labels the result as live read-only setup context, diagnostic only, and non-authoritative. Loading, permission-denied, and generic error states are display-only and do not redirect, mutate, or expose hidden company data. The static sample remains available as `Static sample fallback`.

10C3 does not call bootstrap RPCs, does not mutate setup state, does not change route protection, and does not wire readiness into Owner Setup, dashboards, navigation, registries, route guards, permissions, product-mode/module authority, Vendor/Client activation, or onboarding enforcement.

10C4 is now complete as Owner Setup live read-only setup context integration.

The `/settings/owner-setup` page now imports `useCompanySetupContext()`, feeds live setup context into `resolveCompanyReadiness(...)` when available, and labels the output as live read-only guidance, diagnostic only, and non-authoritative. Loading, permission-denied, and generic error states are display-only. The static sample remains available as `Static sample fallback`.

10C4 does not call bootstrap RPCs, does not mutate setup state, does not persist onboarding, does not save company settings, does not submit invitations, does not configure order numbering, does not write notification defaults, does not change route protection, and does not wire readiness into dashboards, navigation, registries, route guards, permissions, product-mode/module authority, Vendor/Client activation, or onboarding enforcement.

10C5 is now complete as a settings utility link exposure.

The Settings page utility link registry now includes `Owner Setup ->`, backed by `settings.ownerSetup` current-live navigation metadata. The link points to `/settings/owner-setup`, uses the existing `settings.view` route/visibility metadata, and is navigation convenience only. It does not add a new permission, change route protection, add readiness-based visibility, or affect dashboards/onboarding.

10C6 is now complete as a dashboard guidance prompt.

The order dashboard now includes a small `Review owner setup` prompt for users who already have `settings.view`. The prompt links to `/settings/owner-setup`, is labeled `Diagnostic guidance only`, and does not fetch readiness, call setup context, mutate data, call bootstrap, or change dashboard resolution.

Recommended after 10C6:

- 10C7: Closeout/handoff for live read-only setup integration.

10C7 is complete as `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`. That handoff is now the canonical closeout for Phase 10C current state, safety boundaries, validation baseline, intentional exclusions, and recommended Phase 10D sequence.

## Safety Rules

10C implementation must not:

- Call `rpc_company_bootstrap(...)` from browser code.
- Call `rpc_company_bootstrap_v1(...)` from browser code.
- Mutate setup context.
- Insert, update, upsert, or delete setup/onboarding/company records.
- Make route guards depend on setup readiness.
- Redirect based on readiness.
- Treat `setup_complete` as access authority.
- Treat `resolveCompanyReadiness(...)` output as access authority.
- Expose cross-company data in loading/error states.
- Add Vendor or Client activation.
- Create new permissions.
- Use product-mode/module metadata as security authority.
- Use legacy `users.role` or `is_admin` as owner-instance authority.
- Hide backend tenant-safety gaps behind frontend-only checks.

10C implementation may:

- Read guarded setup context for the current authenticated current-company user.
- Show unavailable states for permission errors.
- Derive diagnostic readiness from setup context.
- Display unknown domains honestly.
- Link to existing permitted surfaces later without bypassing their guards.

## Handoff

Phase 10C1 is complete as read-only inspection and planning only.

Phase 10C2 is complete as a read-only API/hook/test boundary.

Phase 10C3 is complete as diagnostics-only live setup context integration. Product Metadata Diagnostics consumes live read-only setup context, the static sample fallback remains visible, and readiness remains diagnostic only.

Phase 10C4 is complete as Owner Setup live read-only setup context integration. `/settings/owner-setup` consumes the same read-only hook, keeps static fallback, and remains guidance-only.

Phase 10C5 is complete as a Settings page utility link. Link visibility is convenience only; route guard authority remains unchanged.

Phase 10C6 is complete as a dashboard guidance prompt. Prompt visibility is convenience only; dashboard authority and resolution remain unchanged.

Phase 10C7 is complete as the live read-only setup integration handoff in `docs/COMPANY_SETUP_LIVE_READONLY_HANDOFF.md`.

Route guard, permission, redirect, bootstrap, mutation, product-mode/module authority, Vendor/Client activation, and legacy role authority behavior remain unchanged. The next implementation phase should move into guarded company profile/settings write design one slice at a time.
