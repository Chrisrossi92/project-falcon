# Company Bootstrap Implementation Readiness

## Purpose

This document locks Phase 10A8: the company bootstrap implementation readiness summary.

It closes Phase 10A's documentation/design-contract arc and defines the safe starting point for the next runtime phase.

This is documentation only. It does not introduce runtime code, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, company settings enforcement, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-specific bootstrap defaults.

## Phase 10A Summary

Phase 10A established the doctrine and contracts for turning Falcon from an internal app into a replicable company-instance platform.

Completed contracts:

- 10A1: `docs/COMPANY_BOOTSTRAP_ARCHITECTURE.md`
- 10A2: `docs/COMPANY_BOOTSTRAP_BACKEND_DEPENDENCY_AUDIT.md`
- 10A3: `docs/COMPANY_BOOTSTRAP_RPC_CONTRACT.md`
- 10A4: `docs/COMPANY_ONBOARDING_STATE_MODEL.md`
- 10A5: `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`
- 10A6: `docs/INVITE_STAFF_SETUP_BRIDGE_CONTRACT.md`
- 10A7: `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`
- 10A8: this implementation readiness lock

Phase 10A did not implement productized bootstrap runtime behavior. It created the design boundary for a future runtime phase.

## What Phase 10A Locked

Phase 10A locked:

- Company instance doctrine.
- First-owner instance doctrine.
- Backend dependency map for bootstrap.
- Productized bootstrap RPC contract.
- Onboarding state model.
- Owner setup UI shell contract.
- Invite/staff setup bridge contract.
- Bootstrap validation/readiness checklist contract.
- The rule that bootstrap, onboarding, readiness, product modes, and modules are not security authority.
- The rule that owner authority is company-scoped only.
- The rule that productized bootstrap must be deterministic, backend-owned, auditable, tenant-safe, and not Continental-specific.

## Locked Doctrine

Owner is company-scoped only.

- Owner is the highest authority inside one company instance.
- Owner is not platform/system admin.
- Owner must not receive service-role capability.
- Owner must not gain cross-company visibility.

Bootstrap, onboarding, and readiness are not security authority.

- Bootstrap provisions or validates company setup.
- Onboarding guides owner progress.
- Readiness diagnoses setup completeness.
- None of these grant runtime data access or action authority.

Modules and product modes are composition/default metadata only.

- Product modes may shape UX, language, package intent, and default setup recommendations.
- Modules may compose future navigation, dashboards, settings, and setup cards.
- Product modes and modules must not authorize data visibility, workflow actions, relationship access, assignment access, or portal access.

Permissions, RLS, RPCs, and route guards remain canonical.

- Company membership, company-scoped role assignments, permission helpers, RLS policies, security-definer RPC checks, readable order/client predicates, assignment packet boundaries, route/action guards, and workflow transition rules remain runtime authority.

No Continental hardcoding.

- Continental AMC remains a flagship internal proving ground.
- Continental-specific assumptions must not become the default bootstrap template.

No Vendor/Client shell activation by default.

- Vendor and Client live surfaces require explicit future routes, projections, permissions, portal-safe data contracts, and package/module enablement contracts.
- Checklist completion, product-mode metadata, or onboarding progress must not expose those shells by itself.

## Confirmed Existing Primitives

The following primitives are confirmed by the 10A audit/contract work and are relevant to future implementation:

- `rpc_company_bootstrap(...)`
- `company_audit_events`
- `rpc_company_setup_context()`
- `company_member_invitations`
- `rpc_company_member_invite_prepare(...)`
- `rpc_company_member_invite_finalize(...)`
- `rpc_company_member_invite_accept(...)`
- `rpc_company_member_invitations_list(...)`
- `rpc_company_member_invitation_cancel(...)`
- `rpc_company_member_invitation_resend_prepare(...)`
- `invite-company-member` Edge Function
- `resend-company-member-invite` Edge Function
- `company_memberships`
- `user_role_assignments`
- `rpc_company_member_list(...)`
- `rpc_company_role_preset_list()`

These primitives are foundations, not a complete productized bootstrap/onboarding system.

Phase 10B2 adds `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md` and a pure local readiness resolver/test scaffold over setup-context-like input. It does not add a backend readiness RPC, diagnostics UI, setup route, registry wiring, or provisioning mutation.

Phase 10B3 adds a static sample readiness preview to the existing protected Product Metadata Diagnostics page. The preview imports the pure resolver, uses only a local fixture, and does not call Supabase, `rpc_company_setup_context()`, live company data, or mutating services.

Phase 10B4 adds `docs/COMPANY_SETUP_STORAGE_DECISION.md`. It locks a hybrid, derived-first storage decision: readiness stays mostly derived near term; existing `companies.settings` and `companies.operating_mode_settings` remain non-authoritative JSON shells; durable onboarding, module/package state, company-safe numbering, and company notification defaults are deferred until their domain models are explicitly designed.

Phase 10B5 adds `docs/COMPANY_BOOTSTRAP_WRAPPER_SQL_DESIGN.md`. It designs a future service-role-only JSONB wrapper, `rpc_company_bootstrap_v1(p_payload jsonb)`, around the existing internal positional primitive. The design recommends delegation first, dry-run validation, warning-safe skipped domains, JSON result shaping, and no order-numbering, notification-default, onboarding, module/package, Vendor/Client, or owner setup UI mutation in the minimal wrapper slice.

Phase 10B6 adds `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`. It implements the minimal service-role-only `rpc_company_bootstrap_v1(p_payload jsonb)` wrapper, supports dry-run validation without mutation, delegates non-dry-run bootstrap to existing `rpc_company_bootstrap(...)`, and returns warning-safe JSONB output. It does not broaden browser/client exposure or implement numbering, notification defaults, onboarding persistence, module/package state, Vendor/Client activation, setup UI, dashboard prompts, or live setup-context integration.

Phase 10B7 adds `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`. It rewires the wrapper readiness summary to use SQL-local post-bootstrap validation from the primitive result and `company_audit_events`: company id, owner user id, owner membership id, owner role assignment id, bootstrap status, audit event count/ids, skipped unknown domains, and next recommended action. It intentionally avoids calling `rpc_company_setup_context()` inside service-role bootstrap because that RPC requires authenticated current-company session context.

Phase 10B8 adds `src/pages/admin/OwnerSetup.jsx` and a protected direct route at `/settings/owner-setup`. The shell is static/sample/read-only only, uses a local fixture with the pure readiness resolver, and does not call Supabase, live setup context, bootstrap RPCs, or mutation paths. It does not add a settings navigation link, dashboard prompt, onboarding enforcement, route-guard dependency on readiness, or runtime authority.

Phase 10B9 adds `docs/COMPANY_BOOTSTRAP_RUNTIME_FOUNDATION_HANDOFF.md`. It closes Phase 10B as a runtime foundation handoff, inventories the wrapper, resolver, diagnostics preview, and owner setup shell, locks current safety boundaries, records validation and known warnings, and recommends Phase 10C as live read-only setup-context integration. It does not claim productized bootstrap/onboarding is complete.

## Why `rpc_company_bootstrap(...)` Stays Internal For Now

The existing `rpc_company_bootstrap(...)` should remain internal for now because:

- It is a service-role/operator primitive, not a browser-authenticated product API.
- It uses a positional contract rather than a stable versioned product result shape.
- It does not yet own a complete onboarding/readiness lifecycle.
- It does not resolve all open settings, module/package, order-numbering, notification-default, active-company refresh, and partial-recovery decisions.
- It should not be exposed before wrapper-level authorization, idempotency, result shaping, post-bootstrap validation, and failure recovery are designed and tested.
- It may remain useful as the internal transaction primitive behind a future Edge/backend wrapper or versioned SQL successor.

Recommended posture:

- Do not broaden `rpc_company_bootstrap(...)` grants.
- Do not call it directly from browser UI.
- Do not make frontend code orchestrate the tables it touches.
- Inspect it first in Phase 10B before deciding whether to wrap, evolve, or supersede it.

## What Is Safe To Implement Next

The next runtime phase can safely begin with read-only inspection and diagnostics.

Safe next implementation themes:

- Read-only mapping of current bootstrap primitive behavior.
- Read-only mapping of `rpc_company_setup_context()` output.
- Read-only readiness resolver scaffolding or result-shape tests.
- Diagnostics preview of setup/readiness state.
- Static or fixture validation that existing primitives do not leak tenant data.
- Documentation updates based on actual inspected runtime behavior.

Not safe as a first runtime step:

- Browser-callable bootstrap provisioning.
- New frontend-owned provisioning sequences.
- New app-role table grants for bootstrap tables.
- Product-mode/module-based permission grants.
- Vendor/Client shell activation.
- Company settings or onboarding writes without storage decisions.
- Order-numbering mutation without a company-safe model.
- Notification-default mutation without a company-safe model.

## Recommended Next Runtime Phase

Recommended next phase: Phase 10B, Company Bootstrap Runtime Inspection And Readiness Foundation.

Phase 10B should start read-only:

- Inspect existing `rpc_company_bootstrap(...)` behavior.
- Inspect existing `rpc_company_setup_context()` behavior.
- Build a read-only implementation map from current SQL behavior to the 10A contracts.
- Add tests or fixtures for read-only readiness output where possible.
- Add a minimal diagnostics preview only after the map is clear.
- Only after those slices should Falcon consider a bootstrap wrapper/RPC implementation.

The first Phase 10B slice should not provision a new company.

## Suggested Phase 10B Slices

Recommended sequence:

1. 10B1: Read-only existing bootstrap primitive inspection and docs update.
2. 10B2: Read-only readiness resolver design/test scaffold.
3. 10B3: Diagnostics preview for company setup/readiness.
4. 10B4: Company settings/onboarding storage decision.
5. 10B5: Versioned bootstrap wrapper SQL design.
6. 10B6: Minimal bootstrap wrapper implementation.
7. 10B7: Post-bootstrap validation wiring.
8. 10B8: Owner setup route shell, still non-authoritative.
9. 10B9: Runtime foundation closeout and handoff lock.

The sequence should remain interruptible. If 10B1 finds current primitive drift, fix the contract or implementation plan before adding new runtime behavior.

Phase 10B1 is complete as `docs/COMPANY_BOOTSTRAP_PRIMITIVE_INSPECTION.md`. The inspection confirms `rpc_company_bootstrap(...)` is currently a mutating service-role/operator-only primitive; `rpc_company_setup_context()` is a guarded authenticated read projection; and the existing invitation infrastructure preserves pending/inactive states until authenticated acceptance. The next slice should use those findings to design a read-only readiness resolver/test scaffold without provisioning mutation.

Phase 10B2 is complete as `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`. The slice adds an unwired, pure local resolver and focused tests for the 10A7 result shape, critical owner/role/audit blockers, non-blocking unknowns for order numbering/notification/onboarding/module state, and diagnostic-only output. The next slice should remain read-only and may use the resolver as a diagnostics preview input only after an explicit integration phase.

Phase 10B3 is complete as a diagnostics-only preview on `/settings/product-metadata-diagnostics`. It renders sample/static readiness output for inspection without live setup-context RPC integration, route guard changes, navigation behavior changes, onboarding enforcement, dashboard behavior changes, provisioning mutation, or backend changes. The next slice should decide storage/model boundaries or live read-only setup-context integration before any bootstrap wrapper work.

Phase 10B4 is complete as `docs/COMPANY_SETUP_STORAGE_DECISION.md`. The decision keeps setup/readiness derived-first, allows only low-risk non-authoritative company/default metadata in existing JSON shells later through guarded RPCs, defers durable onboarding and package/module state, and requires later migrations before bootstrap seeds order numbering or company notification defaults.

Phase 10B5 is complete as `docs/COMPANY_BOOTSTRAP_WRAPPER_SQL_DESIGN.md`. The design keeps `rpc_company_bootstrap(...)` internal, proposes a new versioned JSONB wrapper rather than broadening the positional primitive, preserves service-role/operator-only execution for the first implementation, recommends dry-run validation, delegates the sensitive mutation to the existing primitive, and returns skipped/warning-safe readiness output for unresolved storage domains.

Phase 10B6 is complete as `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`. The wrapper preserves the existing primitive, enforces `auth.role() = 'service_role'`, keeps execute grants service-role-only, validates JSON payloads, supports dry-run without writes, delegates non-dry-run mutation to `rpc_company_bootstrap(...)`, returns JSONB with wrapper metadata and warnings, and keeps readiness/onboarding/product-mode/module output diagnostic-only.

Phase 10B7 is complete as `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`. The wrapper signature and service-role-only boundary are preserved. Dry-run now returns a readiness-style validation summary with valid input checks, no created records, skipped unknown domains, and next action to run non-dry-run through the service-role/operator boundary. Non-dry-run now returns SQL-local post-bootstrap readiness checks and audit-derived diagnostics without using unsafe setup-context session mutation.

Phase 10B8 is complete as a non-authoritative owner setup shell at `/settings/owner-setup`. The route is protected by the existing `settings.view` permission, renders future setup steps and a static sample readiness checklist, and remains direct-access only with no settings utility link. It does not load live setup context, call Supabase, call bootstrap RPCs, mutate records, enforce onboarding/readiness, alter route authority, or activate product-mode/module/Vendor/Client behavior.

Phase 10B9 is complete as `docs/COMPANY_BOOTSTRAP_RUNTIME_FOUNDATION_HANDOFF.md`. The handoff confirms Phase 10B is complete through runtime foundation only: the service-role wrapper exists, post-bootstrap diagnostics exist, static/sample previews exist, and `/settings/owner-setup` exists as a direct protected route. Live setup context, onboarding persistence, settings writes, dashboard prompts, owner setup navigation, self-serve bootstrap, and productized onboarding remain deferred.

## Implementation Blockers / Decisions

These decisions remain unresolved before productized bootstrap implementation:

- Owner role source: confirm global Owner template assignment in company context versus company-specific role copies.
- Default role template strategy: keep global system templates or create company-local role bundles.
- Company settings model: use `companies.settings`, `companies.operating_mode_settings`, normalized settings tables, or a hybrid.
- Module/package state model: define durable state and confirm it remains non-authoritative.
- Onboarding storage model: computed-only, persisted table, JSON shell, or hybrid.
- Order numbering fallback/defaults: define company-safe first-order numbering.
- Notification defaults: define company-specific defaults or explicit platform-default fallback.
- Invitation bridge sequencing: decide whether owner setup calls existing invite Edge Functions directly or a setup wrapper.
- Active company refresh behavior: define how bootstrap/acceptance updates app metadata and refreshes sessions.
- Legacy `users.role` / `is_admin` handling: decide whether bootstrap continues compatibility writes and when they are retired.
- Partial-state recovery model: operator-only repair, guarded recovery RPC, or idempotent wrapper repair semantics.

10B4 narrows the next implementation decision: 10B5 may design a bootstrap wrapper that skips unresolved optional defaults with warnings, but 10B6 must not seed order-numbering or notification-default records until those company-safe domain models exist.

10B5 narrows the 10B6 implementation boundary: 10B6 may add a minimal service-role-only versioned wrapper that validates JSON payloads, delegates to `rpc_company_bootstrap(...)`, returns JSONB, and reports skipped unresolved domains. It must not add app-role grants, live UI wiring, order-numbering seeds, notification-default seeds, durable onboarding state, module/package entitlement state, or Vendor/Client activation.

10B6 leaves the next runtime boundary narrow: later slices may validate the wrapper through SQL fixtures and optionally add post-bootstrap validation wiring, but must still avoid browser-callable provisioning, frontend-owned table orchestration, unsafe numbering or notification-default seeds, durable onboarding/module state, and Vendor/Client activation until those contracts exist.

10B7 keeps the next boundary narrow: live authenticated setup context remains a later owner/session phase after active-company refresh. The service-role bootstrap wrapper does not become runtime authority and does not evaluate route, dashboard, RLS, workflow, assignment, or product-mode visibility.

10B8 keeps the next boundary narrow: the owner setup route shell is now available for static inspection, but live setup-context integration, dashboard prompts, navigation exposure, company settings writes, onboarding persistence, and readiness-driven guard behavior remain deferred.

10B9 locks the next phase: Phase 10C should integrate live setup context read-only before any setup mutation, dashboard prompt, onboarding storage, or self-serve bootstrap work. The next phase must not turn readiness, onboarding, product modes, or modules into security authority.

## Recommended Phase 10C Handoff

Recommended sequence:

1. 10C1: Inspect client-side RPC/service/hook patterns for `rpc_company_setup_context()`.
2. 10C2: Add a read-only setup context fetch service/hook with guarded loading/error states.
3. 10C3: Feed live setup context into Product Metadata Diagnostics only.
4. 10C4: Feed live setup context into `/settings/owner-setup` behind safe loading/error/unknown states.
5. 10C5: Add an optional settings utility link only if UX is ready and still non-authoritative.
6. 10C6: Add dashboard setup prompt only as guidance, not a gate.
7. 10C7: Closeout/handoff for live read-only setup integration.

## Minimum Phase 10B Validation Baseline

Phase 10B should validate:

- Existing bootstrap primitive definition and grants.
- Existing setup context result shape.
- Existing audit event writes.
- Owner membership and owner role invariants.
- Company-scoped permission resolution for bootstrapped owners.
- Invitation inactive membership/role behavior remains non-authoritative.
- Readiness diagnostics do not expose cross-company data.
- Product-mode/module metadata does not authorize access.
- `git diff --check`.

Additional lint/build should run only when runtime frontend or Edge/server code changes.

## Phase 10A8 Lock

Phase 10A8 is documentation-only.

Phase 10A is complete through design and implementation readiness. Runtime implementation is not complete and must begin with a separate Phase 10B runtime plan/slice. This lock adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental-specific defaults.
