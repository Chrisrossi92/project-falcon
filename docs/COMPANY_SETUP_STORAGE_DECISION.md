# Company Setup Storage Decision

## Purpose

This document locks Phase 10B4: the company settings, onboarding, and setup storage decision before live readiness integration or bootstrap wrapper implementation.

This is documentation-only plus read-only schema inspection. It does not introduce migrations, runtime code, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, tests, product-mode authority, module-authoritative security, Vendor/Client live surfaces, onboarding enforcement, or Continental-specific defaults.

## Decision Summary

Falcon should use a hybrid, derived-first setup storage strategy.

Near term:

- Keep readiness mostly derived from existing backend-owned facts.
- Use `rpc_company_setup_context()` and the pure readiness resolver as read-only inputs.
- Use existing `companies.settings` and `companies.operating_mode_settings` only as non-authoritative JSON shells for low-risk company/profile/default metadata.
- Do not create durable module/package state yet.
- Do not persist onboarding state yet except through future minimal owner acknowledgements when a concrete setup shell requires them.
- Do not seed order-numbering or notification defaults from bootstrap until their company-safe domain models are explicitly designed.
- Use `company_audit_events` for bootstrap/repair traceability, not for mutable onboarding progress.

Future implementation should add normalized tables only where the domain needs querying, ownership, lifecycle, constraints, or auditability beyond a small JSON shell.

## Sources Inspected

Docs inspected:

- `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`
- `docs/COMPANY_ONBOARDING_STATE_MODEL.md`
- `docs/COMPANY_BOOTSTRAP_RPC_CONTRACT.md`
- `docs/COMPANY_BOOTSTRAP_PRIMITIVE_INSPECTION.md`
- `docs/FALCON_PRODUCT_MODE_GUARDRAILS.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema/migrations inspected:

- `supabase/migrations/20260518003000_company_foundation_default_scope.sql`
- `supabase/migrations/20260518027000_company_relationship_foundation.sql`
- `supabase/migrations/20260518037000_company_bootstrap_operator_rpc.sql`
- `supabase/migrations/20260518038000_company_setup_context_rpc.sql`
- `supabase/migrations/20260518011000_company_active_context_contract.sql`
- `supabase/migrations/20260518000000_baseline_extensions_and_schema.sql`
- `supabase/migrations/20260518002000_baseline_static_seed_data.sql`
- `supabase/migrations/20260518026000_company_explicit_authenticated_grants.sql`

## Schema Objects Found

### Company Identity And Settings Shells

Found:

- `public.companies`
  - `id uuid`
  - `slug text`
  - `name text`
  - `status text`
  - `timezone text`
  - `locale text`
  - `settings jsonb not null default '{}'`
  - `created_at`
  - `updated_at`
- `public.companies.company_type`
- `public.companies.operating_mode_settings jsonb not null default '{}'`
- `public.company_types`
  - `key`
  - `label`
  - `description`
  - `default_settings jsonb`
  - `onboarding_defaults jsonb`
  - `is_active`
  - sort/timestamp columns

What they cover:

- Basic company identity.
- Company type vocabulary.
- Advisory JSON shells for future settings and operating-mode metadata.

What they do not cover:

- Persisted onboarding state machine.
- Per-checklist item completion records.
- Durable package/module entitlements.
- Security authority.
- Company-safe order-numbering defaults.
- Company notification-default model.

### Setup / Readiness Projection

Found:

- `public.rpc_company_setup_context()`
- `company.setup.read`
- Owner/Admin template role permission seed for `company.setup.read`

The RPC returns:

- current company identity/status/timezone/locale
- active-company claim and context validity
- profile completion
- owner invariant and active owner count
- active member and role assignment counts
- role preset and owner role readiness
- relationship, assignment, dashboard, and audit readiness JSON
- `setup_complete`
- `setup_blockers`
- computed checklist JSON

What it does not cover:

- Persisted owner acknowledgements.
- Persistent onboarding state transitions.
- Order numbering readiness.
- Notification-default readiness.
- Durable package/module state.
- Partial bootstrap repair status beyond audit/checklist signals.

### Audit / Recovery

Found:

- `public.company_audit_events`
  - event type, target, metadata, idempotency key, company id, actor fields, timestamps
- `public.rpc_company_bootstrap(...)` writes bootstrap audit events.
- Invitation and member lifecycle RPCs write invitation/member audit events.
- `rpc_company_setup_context()` checks for `company.bootstrap.completed` and `company.active_company_changed` audit signals.

What it covers:

- Durable audit history.
- Idempotency anchor for the current internal bootstrap primitive.
- Operator/support diagnostics.

What it does not cover:

- Mutable onboarding progress.
- Setup task completion state.
- User-facing checklist state.

### Active Company Context

Found:

- `public.current_company_id()`
- `public.current_app_user_has_current_company()`
- `public.rpc_current_company_context()`

What it covers:

- JWT/app metadata active-company claim resolution.
- Membership validation for active-company claim.
- Compatibility fallback to `falcon_default`.
- Diagnostic readout for active-company context, membership, permission count, and role assignments.

What it does not cover:

- Session refresh orchestration after bootstrap.
- Browser-owned company switching authority.
- Productized bootstrap wrapper behavior.

### Order Numbering

Found:

- `public.order_numbering_rules`
  - `company_key text unique`
  - format/reset/digits/manual override/is_active fields
- `public.order_number_counters`
  - `rule_id`
  - `counter_year`
  - `last_value`
- legacy `public.order_counters`
- `public.rpc_get_next_order_number(p_company_key text default 'falcon_default', p_effective_at timestamptz default now())`
- global unique constraints/indexes on `orders.order_number`
- seed for `order_numbering_rules.company_key = 'falcon_default'`

What it covers:

- Current single/default-company numbering behavior.
- Rule/counter split by text `company_key`.

What it does not cover:

- FK-backed `company_id` numbering.
- Company-scoped uniqueness.
- Bootstrap seeding for new company IDs.
- A productized default-numbering contract.

### Notifications

Found:

- `public.notification_policies`
  - global `key`
  - global `rules jsonb`
- `public.notification_prefs`
  - per-auth-user preference row
- `public.user_notification_prefs`
  - per-user/type/channel preferences
- `public.notification_preferences`
  - older per-user notification preference table
- preference RPCs including `rpc_notification_prefs_ensure`, `rpc_notification_prefs_get`, `rpc_notification_prefs_update`, and `rpc_set_notification_pref_v1`
- seed rows for current global notification policies

What they cover:

- Global notification event policies.
- User-level notification preferences.
- Current notification behavior compatibility.

What they do not cover:

- Company-specific notification defaults.
- Package/mode-specific notification default state.
- Bootstrap notification-default seeding.
- Company owner setup acknowledgement of defaults.

### Product Modes / Modules / Packages

Found in schema:

- No durable company package table confirmed.
- No durable company module enablement table confirmed.
- `company_types.default_settings` and `company_types.onboarding_defaults` exist as advisory JSON defaults.
- `companies.operating_mode_settings` exists as a non-authoritative JSON shell.

Found in source/docs:

- Product-mode and module metadata exist as source constants/diagnostics.
- Product Metadata Diagnostics displays inert metadata.

What they do not cover:

- Runtime package entitlement.
- Module-authoritative security.
- Vendor/Client shell activation.
- Billing/package state.

## Storage Options Compared

### Dedicated Normalized Tables

Pros:

- Strong constraints and lifecycle semantics.
- Easier querying, auditing, indexing, and recovery.
- Better for multi-row checklist state, numbering rules, notification defaults, package entitlements, and owner acknowledgements.

Cons:

- Requires migrations, RLS/RPC design, grants, tests, and ownership rules.
- Premature tables can fossilize unstable onboarding concepts.

Use when:

- The domain has lifecycle/state transitions.
- The domain must be queried or filtered.
- The domain needs constraints or cross-row invariants.
- The domain is a future product contract rather than loose settings metadata.

### JSONB Column On `companies`

Pros:

- Already exists.
- Low migration cost when no new column is needed.
- Useful for sparse settings shells and advisory metadata.

Cons:

- Weak constraints.
- Easy to overuse as unversioned product state.
- Poor for lifecycle, per-task history, package entitlement, or audit-sensitive records.

Use when:

- The field is low-risk, optional, sparse, company-local, and non-authoritative.
- The value tunes UX/defaults but does not authorize access or operational visibility.

### Hybrid Table + JSONB Detail

Pros:

- Keeps a normalized lifecycle header while allowing flexible detail payloads.
- Useful for onboarding/checklist state once owner acknowledgements are needed.
- Easier to version than a single unstructured settings blob.

Cons:

- Requires careful shape discipline.
- JSON detail still needs validation.

Use when:

- The state has stable keys/statuses but flexible metadata.
- The setup shell needs progress, completion source, completion actor, and safe warnings.

### Derived-Only Readiness

Pros:

- Avoids premature persistence.
- Keeps authority-bearing facts in canonical tables/RPCs.
- Fits current `rpc_company_setup_context()` and 10B2 resolver.

Cons:

- Cannot store owner acknowledgements or "skipped for now" state.
- Cannot represent paused/error/reopened setup state without other signals.

Use when:

- The state can be computed from company, membership, role, audit, dashboard, relationship, assignment, numbering, and notification facts.

### Per-User Versus Per-Company Onboarding

Per-company onboarding should own:

- Company profile readiness.
- Owner invariant.
- Role preset readiness.
- Team setup status.
- Numbering/defaults readiness.
- Package/module setup intent.
- Bootstrap/repair status.

Per-user onboarding should own:

- Personal profile completion.
- Personal notification preferences.
- Personal tour dismissal.
- Personal view preferences.

Decision:

- Company operational readiness is per-company.
- Personal setup is per-user.
- Do not mix personal onboarding completion with company readiness.

## Recommended Near-Term Strategy

Near term, before 10B5/10B6:

- Keep readiness derived.
- Use `rpc_company_setup_context()` as the canonical live read projection when live integration begins.
- Keep the 10B2 resolver as a local result-shape adapter until a backend-owned readiness RPC exists.
- Use `companies.settings` only for future low-risk company profile/branding/default JSON metadata.
- Use `companies.operating_mode_settings` only for future advisory package/mode intent metadata.
- Do not persist onboarding state yet.
- Do not create durable module/package state yet.
- Do not seed order numbering from bootstrap until a company-id-backed numbering model exists.
- Do not seed notification defaults from bootstrap until a company-specific notification-default model exists.
- Use `company_audit_events` for bootstrap and repair events, not as mutable setup progress.
- Keep Vendor/Client activation deferred.

This strategy lets 10B continue with live read-only setup context integration and diagnostics without committing to an unstable storage model.

## Domain Recommendations

### Company Settings Shell

Recommendation:

- Use `companies.settings` for low-risk company profile, branding, terminology, and default metadata only.
- Keep fields versioned/namespaced when added later.
- Do not store authority, role grants, route access, RLS switches, package entitlements, or portal activation here.

Migration needed later:

- Possibly no table migration if the JSON shell is sufficient.
- RPCs are required before browser writes.

### Onboarding State / Checklist Progress

Recommendation:

- Keep readiness derived for now.
- Later add a minimal normalized `company_onboarding_state` or `company_setup_tasks` model only when owner acknowledgements, skipped tasks, paused/error state, or completion actors are required.
- Favor hybrid table + JSON detail when persistent checklist state becomes necessary.

Migration needed later:

- Yes, if persistent onboarding progress is required.
- Not required before a read-only live readiness resolver.

### Module / Package Seed State

Recommendation:

- Defer durable package/module state.
- Use `companies.operating_mode_settings` only for advisory package intent metadata when needed.
- Do not let package/module metadata authorize surfaces.

Migration needed later:

- Yes, before billing, entitlements, package enforcement, or live Vendor/Client shells.
- Not required before a minimal bootstrap wrapper if wrapper returns skipped/deferred warnings.

### Order Numbering Defaults

Recommendation:

- Do not reuse `order_numbering_rules.company_key` as the long-term company-safe model.
- Add a future company-id-backed numbering rule or explicitly migrate `company_key` to a stable company slug/ID contract.
- Keep order numbering unknown/warning in readiness until the company-safe model is implemented.

Migration needed later:

- Yes, before productized bootstrap creates order-numbering defaults for new companies.

### Notification Defaults

Recommendation:

- Keep current global `notification_policies` and user-level preferences as runtime compatibility.
- Add future company notification-default storage only after policy semantics are locked.
- Bootstrap should skip notification-default creation with an explicit warning until then.

Migration needed later:

- Yes, before company-specific notification defaults or onboarding-managed notification policies.

### Branding Shell

Recommendation:

- Store initial branding/profile metadata in `companies.settings` later through a guarded company settings RPC.
- Keep branding optional for Staff-only readiness.
- Treat external-facing branding as warning/required only after portal/package contracts exist.

Migration needed later:

- Probably not for minimal metadata.
- Storage/object handling may need separate design if logos/files are introduced.

### Active-Company Refresh Expectations

Recommendation:

- Keep active-company state in Auth/JWT app metadata and validate through `current_company_id()`.
- Bootstrap wrapper should return `session_refresh_required` and `active_company_metadata`; it should not rely on frontend table writes.
- Any active-company switch remains Edge/backend-mediated.

Migration needed later:

- No table migration confirmed.
- Wrapper/Edge behavior and tests required.

### Partial Bootstrap Recovery Markers

Recommendation:

- Use `company_audit_events` plus derived setup context to detect partial state near term.
- Do not store recovery state inside mutable settings JSON.
- Future repair flows may add explicit operator repair events or a normalized recovery table if partial-state workflow becomes complex.

Migration needed later:

- Not required for read-only diagnostics.
- Possibly required before self-serve recovery flows.

## Decision Matrix

| Domain | Current state | Recommended model | Required before 10B5/10B6? | Migration needed later? | Risk | Authority boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Company settings shell | `companies.settings` JSON exists. | Use for low-risk non-authoritative profile/default metadata. | No for 10B5 design; maybe yes before browser settings UI. | Maybe no table; guarded RPC needed. | Medium. | No access, route, RLS, workflow, package, or portal authority. |
| Branding shell | No dedicated branding table confirmed. | Store sparse branding metadata in `companies.settings` later. | No. | Maybe for file/logo storage. | Low/medium. | Branding changes presentation only. |
| Onboarding state | No persisted onboarding table confirmed; setup context is computed. | Derived now; hybrid normalized table later for acknowledgements/progress. | No for read-only/live diagnostics; yes before owner setup persistence. | Yes if persistent checklist state is required. | Medium. | Onboarding guides only; it does not grant access. |
| Module/package seed state | No durable company module/package table confirmed. | Defer; optional advisory intent in `operating_mode_settings`. | No. | Yes before package enforcement/billing/live portals. | High if rushed. | Product/module metadata is not security authority. |
| Order numbering defaults | Legacy text `company_key` model and global order-number uniqueness. | Future company-id-backed numbering model; keep unknown until then. | Yes before bootstrap seeds numbering in 10B6; not needed for wrapper design if skipped. | Yes. | High. | Numbering affects order identity only, not access. |
| Notification defaults | Global policies and user prefs only. | Future company notification-default model; skip in bootstrap until locked. | No if skipped with warning. | Yes for company defaults. | Medium/high. | Notification defaults do not create visibility. |
| Active-company refresh | JWT/app metadata claim validated by membership. | Backend/Edge-mediated refresh; wrapper returns refresh metadata. | Yes before self-serve bootstrap UX; not for SQL design doc. | No table migration confirmed. | Medium. | Claim is accepted only with active membership. |
| Partial bootstrap recovery | Audit events plus derived setup context. | Audit-driven operator diagnostics now; explicit repair markers only if needed. | No for 10B5 design; yes before self-serve recovery. | Maybe. | Medium/high. | Recovery markers do not authorize access. |
| Per-user setup | `user_settings`, notification prefs, user profile/settings RPCs exist. | Keep personal setup separate from company readiness. | No. | No immediate. | Low. | Personal prefs are not company readiness. |

## Impact On Next Runtime Phases

### Live Readiness Resolver Integration

Live readiness can safely begin by reading `rpc_company_setup_context()` and adapting it through the 10B2 resolver shape.

Do not add writes for onboarding/settings in that slice.

### Bootstrap Wrapper Design

The wrapper should:

- Continue calling internal `rpc_company_bootstrap(...)` or a versioned successor.
- Return warnings for skipped settings/onboarding/module/order-numbering/notification defaults.
- Not create company settings rows beyond the existing company JSON shells until a write contract exists.
- Not seed order numbering or notification defaults until those domain models are safe.

Phase 10B5 completes the wrapper SQL design in `docs/COMPANY_BOOTSTRAP_WRAPPER_SQL_DESIGN.md`. That design uses this storage decision as a hard boundary: the minimal versioned wrapper may validate settings/product/branding intent and return skipped warnings, but it must not persist onboarding progress, durable module/package state, order-numbering defaults, notification defaults, Vendor/Client activation, or owner setup UI state.

Phase 10D6 completes the company-safe order-numbering model design in `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`. The design keeps this storage decision's boundary: existing `order_numbering_rules.company_key`, `order_number_counters(rule_id, counter_year)`, `rpc_get_next_order_number(...)`, global `orders.order_number` uniqueness, and browser prefetch/manual submission behavior are legacy/default-company compatible but not sufficient for productized multi-company SaaS. Future numbering should be company-id-backed, server-generated, current-company scoped, guarded by explicit RPCs, audited on configuration changes, and excluded from bootstrap seeding until the model, generator, order creation flow, and company-scoped uniqueness are implemented.

Phase 10D7 completes the company notification-defaults model design in `docs/COMPANY_NOTIFICATION_DEFAULTS_MODEL_DESIGN.md`. The design keeps this storage decision's boundary: current `notification_policies` are global event policy definitions, `notification_prefs`, `user_notification_prefs`, and `notification_preferences` are user-scoped preference surfaces, and no company-id-backed notification-default model is confirmed. Future company defaults should be company-id scoped, event/channel/role allowlisted, resolved through explicit fallback precedence, guarded by RPC, audited on changes, and excluded from bootstrap seeding until the model and resolver are implemented.

### Owner Setup Shell

Owner setup can initially be read-only or acknowledgement-light.

Persistent owner setup progress should wait for a minimal onboarding storage migration.

### Company Settings UI

Company settings UI requires guarded RPCs around `companies.settings`/`operating_mode_settings` or future normalized settings rows.

Do not let the browser directly update `companies`.

### Diagnostics

Diagnostics can show:

- Derived setup context.
- Readiness resolver output.
- Audit presence.
- Unknown storage domains.

Diagnostics must not expose raw cross-company data or mutable audit/settings internals.

### Future Onboarding Persistence

When persistence is needed, add a minimal normalized model for:

- company onboarding state
- checklist task key/status
- completion source
- completed by
- completed at
- warning/error metadata

Keep authority-bearing facts derived from canonical backend objects.

## Hard No-Go Rules

- No settings/onboarding access authority.
- No product-mode/module security authority.
- No Continental defaults.
- No frontend-only truth for required backend setup.
- No hidden Vendor/Client activation.
- No global owner escalation.
- No storing cross-tenant readable setup data.
- No browser-owned provisioning of company, membership, role assignment, audit, numbering, notification-default, or package state.
- No order-numbering bootstrap seed until company-safe numbering is designed.
- No notification-default bootstrap seed until company-specific notification defaults are designed.

## 10B4 Lock

Phase 10B4 is documentation-only plus read-only schema inspection.

It adds no migrations, runtime code, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, tests, product-mode authority, module-authoritative security, Vendor/Client live surfaces, onboarding enforcement, bootstrap wrapper behavior, or Continental-specific defaults.
