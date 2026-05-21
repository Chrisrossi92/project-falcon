# Company Bootstrap Readiness Resolver

## Purpose

This document locks Phase 10B2: the read-only company readiness resolver design/test scaffold.

Phase 10B2 adds a pure local resolver and tests only:

- `src/lib/companyBootstrap/companyReadinessResolver.js`
- `src/lib/companyBootstrap/__tests__/companyReadinessResolver.test.js`

The resolver is not wired into routes, UI, dashboards, diagnostics pages, registries, Supabase clients, Edge Functions, or backend RPCs. It performs no network calls and no writes.

Readiness remains diagnostic guidance. It is not security authority.

## Input Assumptions

The resolver accepts a setup-context-like object shaped after the inspected `public.rpc_company_setup_context()` output.

Confirmed safe input domains from 10B1:

- Company identity and active status.
- Active-company context validity.
- Profile completion.
- Active owner count and owner invariant.
- Active member count.
- Role preset readiness.
- Owner role readiness.
- Audit/bootstrap event readiness.
- Dashboard readiness projection.
- Relationship and assignment aggregate readiness as advisory context.
- Invitation summaries as advisory context.

The resolver also accepts camelCase aliases for the same concepts so tests and later adapters can stay local without binding to Supabase response casing.

## Result Shape

The resolver returns:

- `companyId`
- `status`
- `severityCounts`
- `checklistItems`
- `blockingItems`
- `warnings`
- `nextRecommendedAction`
- `generatedAt`
- `source`

Current status values:

- `ready_for_orders`
- `not_ready`
- `unknown`

Current severity values:

- `critical`
- `warning`
- `optional`
- `deferred`
- `unknown`

Checklist item fields:

- `key`
- `category`
- `label`
- `severity`
- `status`
- `blocking`
- `message`
- `remediation`
- `evidence`

The result intentionally contains no access grants, permission decisions, route decisions, RLS decisions, product-mode activation flags, or module-authority flags.

## What 10B2 Can Assess

The current resolver can assess:

- Setup context presence.
- Company profile presence and active status signal.
- Owner presence through owner invariant and active owner count.
- Active membership/context signal.
- Role preset readiness.
- Owner role assignment readiness.
- Bootstrap audit signal.
- Dashboard readiness projection.
- Invitation pipeline summary presence.
- Relationship and assignment aggregate summary presence as deferred/advisory context.
- Staff readiness as optional for solo-owner operation.

These checks are readiness checks only. Runtime authority still belongs to membership, role assignments, permission helpers, RLS/RPCs, route/action guards, order/client predicates, assignment packet boundaries, and workflow transition logic.

## Unknowns Preserved

The resolver marks these domains as `unknown` because the current setup context cannot prove them safely:

- Order numbering readiness.
- Notification defaults readiness.
- Persistent onboarding state.
- Durable module/package state.

Unknowns are non-blocking in the 10B2 scaffold so a complete-enough Staff Appraisal setup context can return `ready_for_orders` while still surfacing unresolved implementation work.

Later slices may promote specific unknowns to blocking once the storage model and backend validation contract are locked.

## Non-Authority Boundary

The resolver must not:

- Grant access.
- Deny access.
- Bypass permissions, RLS, RPCs, or route guards.
- Activate product modes or modules.
- Activate Vendor or Client live shells.
- Infer cross-company visibility.
- Make frontend-only readiness truth authoritative.
- Hide critical backend gaps behind optional prompts once those gaps are known.

The resolver may:

- Produce diagnostics.
- Shape future owner setup checklist content.
- Shape future dashboard/setup prompts.
- Support tests around readiness result shape.
- Identify missing inputs or unknown domains.

## Diagnostics Preview

Phase 10B3 adds a read-only diagnostics preview to the existing protected Product Metadata Diagnostics page at `/settings/product-metadata-diagnostics`.

The preview:

- Uses a local static setup-context fixture.
- Calls the pure resolver only in page-local diagnostic code.
- Displays sample status, severity counts, blocking items, warning/unknown items, and next recommended action.
- Clearly labels the output as sample/static and non-authoritative.
- Does not call Supabase.
- Does not call `rpc_company_setup_context()`.
- Does not fetch live company data.
- Does not mutate anything.
- Does not affect dashboard behavior, route guards, permissions, navigation, registries, onboarding, or backend behavior.

Phase 10B3 is the first diagnostic preview integration. It is not live readiness integration.

Future slices must still decide whether live readiness belongs in:

- A diagnostics preview.
- A setup checklist resolver.
- A backend-owned readiness RPC.
- A post-bootstrap validation wrapper.

Live setup-context integration, onboarding storage, and backend readiness RPCs remain deferred.

## Storage Decision

Phase 10B4 locks the setup storage strategy in `docs/COMPANY_SETUP_STORAGE_DECISION.md`.

The resolver should continue to treat these domains as unknown until later migrations or backend contracts make them safely inspectable:

- Company-safe order numbering.
- Company notification defaults.
- Persistent onboarding state.
- Durable module/package state.

Near-term live readiness integration should remain derived from `rpc_company_setup_context()` plus canonical backend objects. It should not invent settings/onboarding truth from frontend state or product-mode metadata.

## Read-Only Setup Context Hook

Phase 10C2 adds a read-only client boundary for the guarded setup context RPC:

- `src/features/company-setup/companySetupContextApi.js`
- `src/features/company-setup/useCompanySetupContext.js`

The API calls only `rpc_company_setup_context` and preserves the snake_case setup-context fields that `resolveCompanyReadiness(...)` already accepts. The hook exposes loading, error, permission-denied, and refetch state. It is not wired into diagnostics, Owner Setup, dashboards, routes, navigation, registries, or authority behavior in 10C2.

The resolver remains pure and local. Live setup-context reads must be adapted into the resolver as diagnostics only; resolver output still must not grant access, deny access, redirect users, activate product modes/modules, or bypass permissions/RLS/RPCs.

## Diagnostics Live Setup Context Integration

Phase 10C3 wires `useCompanySetupContext()` into the protected Product Metadata Diagnostics page only.

The diagnostics page now:

- Calls the read-only hook for `rpc_company_setup_context()`.
- Feeds live setup context into `resolveCompanyReadiness(...)` only when data is available.
- Labels live output as read-only setup context, diagnostic only, and non-authoritative.
- Shows safe loading, permission-denied, and generic error states.
- Preserves the static sample as `Static sample fallback`.

10C3 does not wire live setup context into Owner Setup, dashboards, navigation, registries, route guards, onboarding, bootstrap, or product-mode/module behavior. The resolver remains a pure readiness classifier and remains outside runtime authority.

## Test Coverage

The 10B2 tests cover:

- Empty/null context returns critical and unknown-safe output.
- Complete-enough Staff Appraisal context returns `ready_for_orders`.
- Missing owner creates a critical blocker.
- Missing role presets creates a critical blocker.
- Order numbering remains `unknown`.
- Notification defaults remain `unknown`.
- Result output does not include authority/grant fields.
- Result shape is deterministic when `generatedAt` is supplied.
- Product Metadata Diagnostics renders the static readiness preview without mutating service imports or `.rpc(...)` calls.
- 10C2 setup-context API/hook tests cover setup-context RPC success, empty results, guarded errors, permission-denied state, refetch, and source scans that prevent bootstrap and mutation calls.
- 10C3 diagnostics tests cover live setup-context loading, live setup-context success, permission-denied/error fallback, static fallback visibility, no bootstrap RPC usage, and absence of access-grant authority language.

## 10B2 / 10B3 Lock

Phase 10B2 adds a pure read-only resolver scaffold and documentation.

Phase 10B3 exposes that resolver only through a static internal diagnostics preview.

Together they add no migrations, backend behavior, permission seeds, RLS policies, RPC edits, route guard changes, navigation behavior changes, onboarding enforcement, live Supabase/RPC calls, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental-specific defaults.

Phase 10B4 is documentation-only and changes no resolver behavior.
