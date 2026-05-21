# Company Bootstrap Architecture

## Purpose

This document defines Falcon's company bootstrap and owner instance doctrine.

It starts Phase 10A as documentation only. It does not introduce runtime code, migrations, permission seeds, RLS policies, RPCs, routes, registries, UI, company settings enforcement, product-mode authority, module-authoritative security, or Vendor/Client live surfaces.

Phase 10A is complete through implementation readiness as `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`. Runtime implementation remains deferred to a separate Phase 10B runtime plan/slice.

Phase 9H is the locked baseline for this work. Product-mode metadata, module metadata, shadow diagnostics, current-live registries, `TopNav`, `CommandPalette`, and `DashboardGate` registry migrations are complete and non-authoritative. Active runtime authority still comes from permissions, route guards, RLS/RPC boundaries, assignment packet visibility, readable order/client predicates, and workflow transition logic.

## 1. Company Instance Definition

A Falcon company instance is the operational workspace for one company.

It is not a separate product fork. It is a company-scoped operating context over shared Falcon platform doctrine, shared canonical workflow semantics, shared security rules, and company-owned operational records.

A company instance should eventually include:

- A stable `companies.id`.
- Active company membership records.
- Company-scoped role assignments.
- Company-owned orders, clients, notifications, activity, calendar projections, assignments, and settings.
- Company-level policy defaults for workflow, notifications, queue behavior, calendar behavior, numbering, terminology, and branding.
- Module/package enablement state that helps compose UX and onboarding.
- Bootstrap and onboarding state that tracks whether the company is ready to operate.

A company instance does not imply:

- Cross-tenant visibility.
- Product-mode metadata authority.
- Module-authoritative security.
- Automatic Vendor Portal or Client Portal exposure.
- Continental AMC as the default tenant template.
- Frontend-only provisioning authority.

## 2. Owner Instance Definition

An owner instance is the first company-scoped Owner membership and role assignment created during company bootstrap.

The owner instance exists to give one accountable user authority to finish company setup, invite staff, manage role templates, configure company defaults, and administer the company workspace.

Owner is company-scoped authority. Owner is not platform/system admin.

Owner may eventually manage:

- Company profile and branding.
- Company users and invitations.
- Company role assignments and role templates.
- Company workflow, notification, numbering, queue, calendar, and terminology defaults.
- Company package/module selections where permitted by billing and product policy.

Owner must not imply:

- Access to other companies.
- Service-role or platform operator privileges.
- Ability to bypass RLS/RPC visibility boundaries.
- Ability to mutate product-mode metadata or module registry definitions.
- Ability to expose Vendor/Client shells without explicit enabled routes, data contracts, permissions, and portal-safe projections.
- Ability to override canonical workflow governance outside supported transition paths.

At least one active owner should eventually be required for each active company. Removing, demoting, or replacing the last owner must be handled through explicit owner-protection rules, not incidental role edits.

## 3. Bootstrap Lifecycle

The future company bootstrap lifecycle should be backend-owned and auditable.

Recommended conceptual states:

- `requested`: A company instance has been requested, but no operational workspace is active.
- `provisioning`: Backend bootstrap is creating company identity, owner membership, role defaults, policy defaults, and onboarding state.
- `setup_required`: The owner can sign in and complete required setup steps before normal operation.
- `active`: Required setup is complete and the company can operate.
- `suspended`: The company exists but operational access is paused by policy, billing, compliance, or operator action.
- `archived`: The company is no longer operational. Historical records remain subject to retention and audit rules.

Bootstrap should be idempotent where possible. Re-running a bootstrap request should not create duplicate owners, duplicate role presets, duplicate package state, or conflicting settings rows.

Bootstrap should write durable audit records for important lifecycle events:

- Company created.
- Owner membership created.
- Owner role assignment created.
- Default roles and permissions applied.
- Default policy/settings records created.
- Onboarding state initialized.
- Bootstrap completed or failed.

## 4. Global vs Company-Scoped

Falcon should keep a sharp boundary between global platform doctrine and company instance data.

Global platform concepts:

- Product mode IDs and metadata.
- Module registry IDs and metadata.
- Canonical permission key vocabulary.
- Template role definitions.
- Canonical workflow transition keys and protected lifecycle rules.
- Static relationship type vocabulary.
- Shared diagnostics and current-live registry descriptions.
- Safety guardrails for hidden Vendor/Client/Hybrid surfaces.

Company-scoped concepts:

- Company identity and profile.
- Company memberships.
- Company role assignments.
- Company role copies or role preset selections.
- Company workflow, notification, queue, calendar, numbering, terminology, and branding defaults.
- Company package/module enablement state.
- Company onboarding state.
- Company orders, clients, activity, notifications, assignments, relationships, and calendar projections.

Global metadata may seed defaults. It must not become runtime authorization.

Company-scoped records may tune behavior. They must not erase platform doctrine, bypass workflow governance, or widen data access outside explicit permission and visibility boundaries.

## 5. Owner Authority Boundaries

Owner should be the highest authority inside one company instance.

Owner authority should be resolved through:

- Current-company membership.
- Active company-scoped role assignment.
- Permission keys.
- Protected owner-role rules.
- Object-specific visibility predicates for operational records.

Owner authority should not be resolved through:

- Literal legacy role strings alone.
- Product-mode metadata.
- Module enablement state alone.
- Frontend route visibility alone.
- Company relationship existence alone.
- Assignment packet existence outside the packet boundary.

Owner can administer company setup, but operational visibility remains governed by the same boundaries as the rest of Falcon. An owner of Company A must not see Company B orders, clients, notifications, activity, assignments, users, settings, or relationship details unless a specific future cross-company contract grants a safe projection.

## 6. Modules and Product Modes Are Not Security Authority

Product modes and modules help Falcon compose coherent products. They are not security boundaries by themselves.

Product-mode metadata can answer:

- Which kind of product experience a company is using.
- Which modules are expected in that product mode.
- Which labels, dashboard shells, empty states, and upgrade prompts should be considered.
- Which onboarding steps may be relevant.

Module/package state can answer:

- Which capability bundles are enabled or available for a company.
- Which setup steps should appear.
- Which UX surfaces may be considered for composition.
- Which upgrade prompts may be relevant.

Neither product-mode metadata nor module/package state can answer:

- Whether a user can read an order.
- Whether a user can read a client.
- Whether a user can see assignment packet data.
- Whether a user can invite staff.
- Whether a user can transition workflow status.
- Whether a Vendor or Client shell is safe to expose.

Runtime authority remains:

- Company membership.
- Permission keys and role assignments.
- RLS policies.
- Security-definer RPC checks.
- Order/client/assignment visibility predicates.
- Route guards.
- Workflow transition rules.

## 7. Bootstrap Provisioning Requirements

Future bootstrap must eventually provision a complete company operating foundation.

Required bootstrap outputs:

- Company record.
- Owner app-user mapping if the user does not already exist.
- Owner company membership.
- Owner role assignment in company context.
- Default role records or role preset assignments.
- Default permission bundle mappings.
- Default module/package state.
- Onboarding state.
- Company settings shell.
- Notification defaults.
- Order-numbering defaults.
- Branding shell.
- Locale/timezone defaults.
- Default workflow policy reference or settings shell.
- Default queue/calendar policy references or settings shell.
- Audit entries for bootstrap lifecycle events.

The first implementation should not assume every object needs a normalized table immediately. Some settings may start as structured JSON if the backend owns writes, the shape is documented, and future normalization is planned.

Bootstrap should prefer backend-side transactionality where practical. Partial company creation is a high-risk state and must be observable, recoverable, and auditable.

## 8. Bootstrap Must Not Do

Bootstrap must not:

- Create cross-tenant visibility.
- Treat product-mode metadata as runtime authority.
- Treat module state as security authority.
- Rely on frontend-orchestrated provisioning.
- Seed Continental AMC assumptions as the default company template.
- Expose Vendor Portal or Client Portal shells unless those routes, permissions, data contracts, and portal-safe projections are explicitly enabled in a later implementation phase.
- Create assignment packet visibility without explicit assignment records.
- Create relationship-based operational visibility without explicit scoped work grants.
- Bypass existing RLS/RPC/order/client visibility boundaries.
- Bypass canonical workflow transition rules.
- Mutate global product-mode or module registry metadata.
- Grant platform/system admin capability to a company owner.
- Depend on legacy role strings as the long-term authority model.

Bootstrap must not be a pile of browser calls. The browser may collect setup intent, but the server must own company creation, owner membership creation, role assignment, defaults, idempotency, and audit.

## 9. Owner Setup UX Principles

The first owner should eventually see setup as a business process, not a database process.

Recommended setup language:

- Company profile.
- Order numbers.
- Team roles.
- Invite your team.
- Workflow defaults.
- Notification defaults.
- Branding.
- Review and launch.

Avoid exposing:

- Raw module IDs.
- Permission key names.
- Product-mode internals.
- Tenant infrastructure terms.
- RLS/RPC mechanics.
- Hidden Vendor/Client concepts.

Owner setup UI may show module/package selections later, but those selections should be framed as product capabilities and setup steps. They should not suggest that enabling a module directly grants data access.

## 10. Relationship to Current Invite Flow

Falcon already has a company member invitation lifecycle through RPC/Edge-mediated prepare, finalize, accept, resend, cancel, and Team Access invitation management.

Bootstrap should build on that doctrine:

- Invitation state alone grants no operational visibility.
- Membership and role assignments become authoritative only after authenticated acceptance where required.
- Owner grant authority must be protected.
- Role presets should be safe and company-scoped.
- Team setup should remain RPC/Edge-mediated rather than direct frontend table writes.

The first owner bootstrap differs from staff invitation because the company and first owner may not exist yet. That requires a dedicated bootstrap RPC or operator-mediated flow, not reuse of staff invite flows as a frontend workaround.

## 11. Continental AMC Is Not The Default Template

Continental AMC remains the flagship internal deployment and proving ground for AMC, vendor, client, and ecosystem workflows.

Bootstrap defaults for new customer companies should not assume Continental's operational model.

Default bootstrap should likely favor Staff Appraisal Mode unless the explicit selected package/mode says otherwise. AMC Operations, Vendor Portal, Client Portal, and Hybrid/Ecosystem mode setup should be explicit future branches with their own route/data contracts, language, permissions, and onboarding steps.

Continental-specific defaults may exist as a named template later, but they must not leak into the platform default company bootstrap.

## 12. Recommended Future Implementation Slices

### Phase 10A2: Backend Dependency Audit

Phase 10A2 is complete as `docs/COMPANY_BOOTSTRAP_BACKEND_DEPENDENCY_AUDIT.md`.

Map every active backend dependency required for company bootstrap:

- `companies`
- `company_memberships`
- `user_role_assignments`
- template roles and permission bundles
- company settings candidates
- notification defaults
- order-numbering defaults
- onboarding state
- app-user/auth-user mapping
- audit/activity write paths
- service-role/operator boundaries

The audit records that Falcon already has a service-role/operator bootstrap RPC, company audit events, and a setup-context RPC. Those surfaces are partial audited foundations, not a completed productized bootstrap/onboarding contract. Any 10A3 RPC design should decide whether to evolve, wrap, or replace those surfaces before implementation.

Output is documentation and dependency mapping only.

### Phase 10A3: Bootstrap RPC Design

Phase 10A3 is complete as `docs/COMPANY_BOOTSTRAP_RPC_CONTRACT.md`.

Design the backend-owned bootstrap API.

Required design topics:

- Inputs and idempotency keys.
- Authenticated self-serve owner bootstrap versus operator-mediated bootstrap.
- Transaction boundaries.
- Error states and recovery.
- Audit entries.
- Service-role usage.
- Last-owner and duplicate-company protections.
- No frontend-orchestrated provisioning.

The design contract recommends wrapping the existing service-role `rpc_company_bootstrap(...)` primitive behind a future backend/Edge service boundary or versioned JSON-shaped successor rather than exposing the current positional RPC directly to browser-authenticated callers. No implementation is introduced by 10A3.

### Phase 10A4: Onboarding State Model

Phase 10A4 is complete as `docs/COMPANY_ONBOARDING_STATE_MODEL.md`.

Design the company onboarding state contract.

Required design topics:

- Required versus optional setup steps.
- Setup status transitions.
- Owner progress tracking.
- Launch readiness checks.
- Settings shell shape.
- How onboarding state interacts with product/package/module defaults without becoming security authority.

The model defines onboarding as operational guidance, progress, and readiness diagnostics only. It must not grant access, bypass permissions/RLS/RPCs, activate product modes as authority, or expose Vendor/Client shells by itself.

### Phase 10A5: Owner Setup UI Shell

Phase 10A5 is complete as `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`.

Design a UI shell for first owner setup.

The shell should be inert until backend contracts exist. It should use business language and avoid raw module, permission, tenant, or database concepts.

The contract defines the future setup shell as guidance and configuration UX only. Proposed setup routes and setup cards remain future implementation details and must preserve authenticated company-scoped access, existing route guards, permission-backed RPC authority, and the rule that incomplete onboarding is not a blanket authorization denial unless a future explicit guard is designed.

### Phase 10A6: Invite/Staff Setup Bridge

Design how bootstrap hands off to Team Access invitation management.

Required design topics:

- Owner-created first staff invitations.
- Role preset selection.
- Owner-only grant protections.
- Invitation acceptance and active-company context refresh.
- Staff setup completion without direct table writes.

### Phase 10A7: Bootstrap Validation Checklist

Phase 10A7 is complete as `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`.

Create a bootstrap validation checklist before implementation.

Required checks:

- Company is created once.
- Owner membership exists once.
- Owner role assignment exists once.
- At least one active owner remains.
- Default roles/permissions are present.
- Defaults are company-scoped.
- No cross-company visibility is introduced.
- Product-mode/module state is non-authoritative.
- Vendor/Client shells remain hidden unless explicitly enabled by a later safe contract.
- Bootstrap is recoverable after partial failure.
- `git diff --check`, lint/build where relevant, and backend fixture tests pass once implementation begins.

The readiness contract treats validation as diagnostics and guidance only. It defines severity, result shape, operationally-ready criteria, checklist categories, and implementation slices without making readiness state an access authority.

### Phase 10A8: Implementation Readiness Lock

Phase 10A8 is complete as `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`.

Close the Phase 10A documentation/design-contract arc and define the safe entry point for runtime implementation.

The readiness lock summarizes locked doctrine, confirmed existing primitives, why `rpc_company_bootstrap(...)` remains internal for now, the recommended Phase 10B runtime sequence, unresolved implementation blockers, and minimum validation expectations. It does not mark runtime implementation complete.

## 13. Phase 10A1 Lock

Phase 10A1 is documentation and doctrine only.

It creates no runtime behavior, migrations, permissions, RLS policies, RPCs, routes, registries, UI, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default bootstrap assumptions.
