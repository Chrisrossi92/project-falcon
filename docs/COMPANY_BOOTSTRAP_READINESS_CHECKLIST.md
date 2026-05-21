# Company Bootstrap Readiness Checklist

## Purpose

This document locks the Phase 10A7 bootstrap validation and readiness checklist contract.

It is documentation only. It does not introduce runtime code, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-specific bootstrap defaults.

Phase 10A7 defines how Falcon should eventually validate that a bootstrapped company is complete enough to operate safely.

Readiness validation is diagnostic and guidance-oriented. It is not security authority.

Readiness may:

- Warn owners about incomplete setup.
- Guide owner setup and dashboard prompts.
- Block a guided setup flow from marking itself complete.
- Recommend next setup actions.
- Feed diagnostics and operator/support review.
- Identify partial bootstrap recovery needs.

Readiness must not:

- Grant access.
- Bypass permissions.
- Bypass RLS or security-definer RPC checks.
- Replace route guards.
- Activate product modes or modules as authority.
- Activate Vendor or Client shells by checklist completion alone.
- Hide critical backend tenant-safety gaps as optional UX warnings.

Runtime authority remains with company membership, company-scoped role assignments, permission helpers, RLS/RPC checks, route/action guards, readable order/client predicates, assignment packet visibility, and canonical workflow transition logic.

## Current Baseline

Confirmed current readiness-adjacent surfaces:

- `public.rpc_company_setup_context()` returns a safe active-company setup checklist and readiness projection.
- `company.setup.read` exists and is granted to Owner/Admin template roles.
- `public.company_audit_events` records bootstrap, active-company, invitation, membership, and role-assignment lifecycle events.
- `public.rpc_company_bootstrap(...)` exists as a service-role/operator bootstrap primitive.
- `public.companies.settings` and `public.companies.operating_mode_settings` exist as JSON shells.
- `public.company_types.onboarding_defaults` exists as advisory future defaults.
- Product-mode/module metadata and the Product Metadata Diagnostics page are diagnostic/non-authoritative.
- Current-live navigation, command, and dashboard registries describe existing live behavior only; route and permission checks remain authority.

Current gaps:

- No full productized readiness resolver was confirmed.
- No persistent company onboarding-state table was confirmed.
- No company module/package state table was confirmed.
- No company-safe order-numbering model is locked; legacy `order_numbering_rules.company_key` remains a known seam.
- No company-specific notification-default model is locked; current notification policies/preferences are global/user-scoped or transitional.

`rpc_company_setup_context()` is a useful foundation, but the future readiness contract should return a richer, versioned result shape with severity, remediation, package applicability, and source metadata.

## Readiness Diagnostics Versus Authority

Readiness diagnostics answer:

- Is the company setup coherent enough to operate?
- Which setup items are missing?
- Which missing items are critical versus advisory?
- What should the owner do next?
- What should support/operator tooling inspect after partial bootstrap?

Readiness authority does not exist.

If readiness says a company is ready but permission/RLS/RPC checks fail, the authority checks win.

If readiness says a company is incomplete but permission/RLS/RPC checks allow an action, Falcon may show warnings or setup prompts, but it must not invent a separate access grant or bypass.

Future implementation may decide that a specific guided setup screen cannot be completed until critical readiness items pass. That is setup UX, not runtime security authority.

## Readiness Severity Model

Recommended severity values:

- `critical`: A backend or tenant-safety dependency is missing or inconsistent. The company should not be marked ready. This may block specific setup completion or first-order readiness, but it still does not grant or revoke runtime permissions by itself.
- `warning`: Setup can continue, but the owner or operator should address the issue soon. Warnings may appear in dashboard/setup prompts.
- `optional`: Nice-to-have setup that improves the workspace but is not required for first safe operation.
- `deferred`: Not applicable until a package, product mode, module, or later contract explicitly enables the domain.
- `unknown`: The resolver cannot determine the state safely. Unknown should default to conservative display and operator-inspectable diagnostics.

Recommended blocking semantics:

- `blocking = true`: Blocks readiness status such as `ready_for_orders` or `complete`.
- `blocking = false`: Advisory or deferred. It may show prompts but does not block readiness.

Blocking semantics are readiness semantics, not security semantics.

## Recommended Readiness Categories

| Category | Why it matters | Likely validation signal | Severity | Blocking | Staff-only required | AMC/Vendor/Client/Hybrid |
| --- | --- | --- | --- | --- | --- | --- |
| Company record/profile | Establishes company identity and current-company context. | Company exists, status active, slug/name/type/timezone/locale present. | `critical` if missing core fields; `warning` for optional profile details. | Yes for core fields. | Yes. | Yes, with mode-specific optional fields later. |
| Owner membership | Ensures the first owner participates in the company. | Active `company_memberships` row for owner. | `critical`. | Yes. | Yes. | Yes. |
| Owner role assignment | Ensures company-scoped owner authority resolves through permissions. | Active Owner role assignment in `user_role_assignments`; owner invariant passes. | `critical`. | Yes. | Yes. | Yes. |
| Default roles/permissions | Ensures permission resolver can authorize setup and operations. | Required template roles and role-permission seeds exist; `company.setup.read` available. | `critical`. | Yes. | Yes. | Yes; extra role bundles may be deferred. |
| Company settings shell | Provides a place for company defaults. | `companies.settings`/`operating_mode_settings` present or future settings rows exist. | `warning` until settings model is locked. | No by default. | Recommended. | Required only after package-specific settings contract exists. |
| Onboarding state | Tracks owner progress and guidance. | Computed setup context or future stored onboarding state. | `warning` if missing, `critical` only if bootstrap cannot be diagnosed. | No initially. | Recommended. | Recommended. |
| Order numbering readiness | Prevents unsafe duplicate or global order numbering. | Company-safe numbering model exists or safe fallback is explicitly documented. | `critical` for order creation when unsafe; `warning` while fallback is known. | Yes for ready-for-orders once model is locked. | Yes. | Yes for order-producing modes; deferred for portal-only modes. |
| Notification policy/default readiness | Ensures minimum notification behavior is known and quiet. | Required notification policy rows exist; user prefs can be ensured; future company defaults resolved. | `warning` now; `critical` only if notification creation/read paths fail. | No by default. | Recommended. | Recommended; portal notification defaults deferred. |
| Team/staff readiness | Ensures owner reviewed staffing and roles. | Role review complete; solo-owner acknowledgement or active invited staff depending package. | `warning` or package-dependent `critical`. | No for solo Staff by default. | Optional unless package requires staff. | Package-specific. |
| Invitation pipeline readiness | Ensures staff invites can be sent and accepted safely. | Invite prepare/finalize/accept/list paths exist; pending/inactive states behave correctly. | `warning`; `critical` only if staff-required package cannot invite. | Package-dependent. | Optional. | Required for staff/team-heavy packages. |
| Order workflow readiness | Ensures first order can follow canonical workflow. | Order create/update/read permissions, canonical workflow transition RPC, assignment/date guardrails, status seeds. | `critical` for order-producing packages. | Yes for Staff ready-for-orders. | Yes. | AMC/Hybrid required; Vendor/Client portal-only deferred. |
| Client/vendor readiness | Prevents premature portal/network assumptions. | Client management RPCs available; vendor/relationship/assignment foundations enabled only when explicitly configured. | `deferred` unless enabled. | No by default. | Client setup may be advisory. | AMC/Hybrid package-specific; Vendor/Client shells deferred. |
| Branding/profile readiness | Improves external-facing trust and UX. | Branding/settings values present when model exists. | `optional` for Staff; `warning` for external-facing packages. | No by default. | Optional. | Warning/required only after portal/package contract. |
| Audit event readiness | Supports deterministic support and recovery. | `company_audit_events` exists; bootstrap completion event present; key setup events recorded. | `critical` for bootstrap audit; `warning` for optional setup audit. | Yes for bootstrap validation. | Yes. | Yes. |
| Diagnostics/parity readiness | Supports safe rollout without metadata authority. | Setup context available; product metadata diagnostics remain non-authoritative; no hidden surface leakage. | `warning` or `unknown`. | No by default. | Recommended. | Recommended before mode-specific rollout. |

## Category Details

### Company Record / Profile

Why it matters:

- Every company-scoped system depends on stable company identity.
- Active-company context and diagnostics need a valid company record.

Likely validation signal:

- `companies.id` exists.
- Company status is active.
- Slug/name/company type/timezone/locale are non-empty.
- `current_company_id()` resolves to the target company for the current user when session context is active.

Recommended handling:

- `critical` if company is missing, inactive, or lacks required identity fields.
- Remediation route/action: future company profile setup card or operator repair.
- Staff-only operation requires this.
- AMC/Vendor/Client/Hybrid may add mode-specific profile fields later.

### Owner Membership

Why it matters:

- Bootstrap must create an active company-scoped owner participant.
- Owner setup cannot proceed without active membership.

Likely validation signal:

- Active `company_memberships` row for the owner app user and company.
- `current_app_user_has_company(company_id)` is true for the owner.

Recommended handling:

- `critical` and blocking.
- Remediation route/action: bootstrap repair or operator review.
- Required for every company type.

### Owner Role Assignment

Why it matters:

- Owner authority must resolve through company-scoped role assignment and permission helpers.
- Owner is not platform/system admin.

Likely validation signal:

- Active `user_role_assignments` row for owner and canonical Owner role.
- `company_active_owner_count(company_id) >= 1`.
- Owner role template exists and is marked as owner role.

Recommended handling:

- `critical` and blocking.
- Remediation route/action: bootstrap repair, owner-role repair, or controlled role management.
- Required for every company type.

### Default Roles / Permissions

Why it matters:

- Setup, routing, order operations, Team Access, and workflow actions need seeded permission doctrine.

Likely validation signal:

- Required global system template roles exist.
- Required role-permission seeds exist.
- `company.setup.read` and baseline route/order/team permissions exist.

Recommended handling:

- `critical` if required seeds are missing.
- Remediation route/action: operator migration/seed repair, not browser mutation.
- Required for Staff-only operation.
- Package-specific role bundles may be deferred for AMC/Vendor/Client/Hybrid.

### Company Settings Shell

Why it matters:

- Future company defaults need a stable storage contract.
- Settings should tune behavior without granting access.

Likely validation signal:

- `companies.settings` and `companies.operating_mode_settings` exist and are non-null, or future normalized settings rows exist.

Recommended handling:

- `warning` until the settings model is locked.
- Remediation route/action: future settings/company profile setup card.
- Staff-only operation can proceed with platform defaults if documented.
- External portal settings are deferred until enabled.

### Onboarding State

Why it matters:

- Owner setup and dashboard prompts need progress and next-action context.

Likely validation signal:

- `rpc_company_setup_context()` returns successfully.
- Future stored onboarding state or derived resolver returns a coherent state.

Recommended handling:

- `warning` if only derived readiness exists.
- `critical` only when no safe diagnostic context can be produced.
- Remediation route/action: owner setup route or diagnostics page.

### Order Numbering Readiness

Why it matters:

- Order creation must not rely on unsafe global numbering assumptions.

Current known seam:

- `order_numbering_rules.company_key` and `rpc_get_next_order_number(...)` exist, but a company-safe numbering contract is not locked.

Likely validation signal:

- Future company-safe numbering rule exists for the company, or an explicit safe fallback is configured.

Recommended handling:

- `warning` while current single-company fallback is explicitly understood.
- `critical` for `ready_for_orders` once multi-company order creation uses productized bootstrap.
- Remediation route/action: future order-numbering setup card or backend default seed.
- Required for Staff-only order creation.
- Deferred for portal-only modes that do not create owner-company orders.

### Notification Policy / Default Readiness

Why it matters:

- Notifications should remain quiet, personal, and tenant-safe.
- Missing notification defaults should not create noisy or unsafe delivery.

Current known seam:

- `notification_policies`, `notification_prefs`, and `user_notification_prefs` exist, but company-specific notification-default storage is not locked.

Likely validation signal:

- Required event policy rows exist.
- User prefs can be ensured/read/updated.
- Future company notification defaults resolve safely.

Recommended handling:

- `warning` for missing company override model.
- `critical` only if active notification RPCs cannot create/read safely.
- Remediation route/action: notification settings or future company notification defaults card.
- Staff-only operation can proceed with known platform defaults when safe.

### Team / Staff Readiness

Why it matters:

- Owners need a deliberate staffing decision.
- Solo-owner operation should be explicit when allowed.

Likely validation signal:

- Role review complete.
- At least one active non-owner member exists when package policy requires staff.
- Or solo-owner acknowledgement exists when staff is optional.

Recommended handling:

- `warning` for Staff-only solo-owner setup unless package policy says staff required.
- `critical` for packages requiring multiple staff.
- Remediation route/action: owner setup team card or Team Access.

### Invitation Pipeline Readiness

Why it matters:

- Staff setup depends on secure invite prepare/finalize/accept behavior.

Likely validation signal:

- Invitation prepare/finalize/accept/list/cancel/resend primitives are present.
- Pending invitations do not count as active staff.
- Inactive staged role assignments do not grant permissions.

Recommended handling:

- `warning` if no invites sent.
- `critical` only when staff-required package cannot invite safely.
- Remediation route/action: Team Access invite flow.

### Order Workflow Readiness

Why it matters:

- First order creation must use guarded order, assignment, date, and workflow paths.

Likely validation signal:

- Order create/read/update permission paths are seeded.
- Canonical workflow transition RPC exists and is company-aware.
- Legacy arbitrary status mutation paths remain quarantined.
- Assignment/date guardrails are active.

Recommended handling:

- `critical` for Staff-ready-for-orders.
- Remediation route/action: operator migration check, diagnostics, or setup blocker.

### Client / Vendor Readiness

Why it matters:

- Staff and AMC operations may need clients.
- Vendor/Client shells should not activate by accident.

Likely validation signal:

- Client management RPCs are available for current-company client work.
- Relationship and assignment foundations exist for future vendor workflows.
- Product/package explicitly enables vendor or client setup before showing live portal steps.

Recommended handling:

- Staff client setup can be `warning` or `optional`.
- Vendor/Client portal readiness is `deferred` until explicitly enabled.
- Remediation route/action: client setup card, relationship setup, or future portal setup route.

### Branding / Profile Readiness

Why it matters:

- Branding matters for external-facing communication and trust.

Likely validation signal:

- Future branding/settings fields exist.
- Required external-facing fields exist when package requires them.

Recommended handling:

- `optional` for Staff-only internal operation.
- `warning` for AMC/Hybrid external workflows.
- `deferred` for Vendor/Client portal shells until enabled.

### Audit Event Readiness

Why it matters:

- Bootstrap and setup need deterministic support/recovery traces.

Likely validation signal:

- `company_audit_events` exists.
- Bootstrap completed event exists.
- Key invitation/setup events are recorded when actions occur.

Recommended handling:

- `critical` if bootstrap audit event is missing after bootstrap.
- `warning` for missing optional setup lifecycle events.
- Remediation route/action: operator diagnostics or bootstrap validation wrapper.

### Diagnostics / Parity Readiness

Why it matters:

- Product metadata and live registry diagnostics help avoid surface leakage during rollout.

Likely validation signal:

- Product Metadata Diagnostics remains protected and non-authoritative.
- Current-live registries remain descriptive.
- Shadow metadata is not imported into active authority surfaces.

Recommended handling:

- `warning` or `unknown`, not a runtime blocker by default.
- Remediation route/action: diagnostics page or implementation validation.

## Readiness Result Shape

Future readiness resolver should return a deterministic, versioned shape such as:

```json
{
  "company_id": "uuid",
  "status": "not_ready | ready_for_orders | complete | degraded | unknown",
  "severity_counts": {
    "critical": 0,
    "warning": 0,
    "optional": 0,
    "deferred": 0,
    "unknown": 0
  },
  "checklist_items": [
    {
      "key": "owner_membership",
      "category": "owner_membership",
      "label": "Owner membership",
      "description": "The company has an active owner membership.",
      "severity": "critical",
      "status": "pass | fail | warning | skipped | deferred | unknown",
      "blocking": true,
      "required_for_staff": true,
      "applicability": ["staff_appraisal"],
      "source": "computed",
      "evidence": {
        "safe_count": 1
      },
      "remediation": {
        "route": null,
        "action": "operator_bootstrap_repair"
      }
    }
  ],
  "blocking_items": ["owner_membership"],
  "warnings": ["notification_defaults_company_model_deferred"],
  "next_recommended_action": {
    "key": "complete_company_profile",
    "label": "Confirm company profile",
    "route": "/setup/company"
  },
  "generated_at": "timestamp",
  "source": {
    "resolver": "company_bootstrap_readiness",
    "version": "10A7-contract",
    "inputs": {
      "product_mode_intent": "staff_appraisal"
    }
  }
}
```

The resolver should expose safe evidence only:

- Counts.
- Boolean readiness.
- Safe status labels.
- Safe route/action hints.

It should not expose raw permission arrays, Auth provider internals, cross-company identifiers, unreadable object counts, or tenant-safety internals to normal owner UX.

## Operationally Ready Definition

For a Staff Appraisal company, `ready_for_orders` should mean:

- Company record exists.
- Company is active.
- Company profile has required identity fields.
- Owner has active company membership.
- Owner has canonical company-scoped Owner role assignment.
- Required role templates and permission seeds exist.
- Owner can resolve setup context safely.
- Order creation and order read/write dependencies are present.
- Canonical workflow transition path is present and company-aware.
- Assignment/date guardrails are present.
- Order numbering is company-safe or an explicit safe fallback is documented.
- Minimum notification behavior is safe or explicitly deferred without unsafe delivery.
- Bootstrap audit event exists.
- No critical tenant-safety gaps are detected.
- Team setup is reviewed or solo-owner operation is acknowledged when staff is optional.

`ready_for_orders` does not mean:

- Vendor Portal is live.
- Client Portal is live.
- Product/package/module metadata grants access.
- The company owner has platform/system admin authority.
- Every optional setting is complete.
- Every warning is resolved.

## Stored Versus Derived Readiness

Recommended model:

- Derive authority-bearing facts from backend state every time.
- Store only owner acknowledgements, skip decisions, setup progress, and package-specific choices when a storage model exists.
- Keep result generation backend-owned.
- Include resolver version metadata for future migration/debugging.

Derived facts should include:

- Company status.
- Active owner count.
- Active membership.
- Active role assignments.
- Permission seed availability.
- Invitation lifecycle counts.
- Audit event existence.
- Order/workflow dependency presence.

Stored or future persisted facts may include:

- Solo-owner acknowledgement.
- Company profile setup completion acknowledgement.
- Workflow defaults reviewed.
- Branding skipped for now.
- Package/product-mode intent.
- Owner setup completion timestamp.

## Company-Level Versus User-Level Readiness

Company-level readiness:

- Company profile.
- Owner invariant.
- Role/permission seed availability.
- Order numbering.
- Notification defaults.
- Workflow dependencies.
- Team setup policy.
- Audit trail.

User-level readiness:

- Owner profile completeness.
- Current-company context/session validity.
- User notification preferences.
- User-specific route access.
- Invitee acceptance state.

Company-level readiness may say a company is ready while a specific user still lacks permissions for a surface. User-level authority still comes from membership, role assignments, permissions, and route/RPC checks.

## Product / Package / Module Influence

Product modes, packages, and modules may influence:

- Which checklist items are shown.
- Which checklist items are required for `complete`.
- Which checklist items are `deferred`.
- Which remediation route is suggested.
- Which business language appears in owner setup.

They must not influence:

- Data visibility.
- Permission grants.
- RLS/RPC authority.
- Workflow authority.
- Assignment packet visibility.
- Vendor/Client shell activation.

Until durable company package/module state exists, package influence should be treated as input metadata or setup intent, not runtime authority.

## Owner Setup And Dashboard Integration

Readiness should feed:

- Owner setup checklist rail.
- Setup step cards.
- Dashboard empty-state prompts.
- Missing order-numbering warnings.
- Missing notification-default warnings.
- Missing team/staff warnings.
- Diagnostics/readiness preview.
- Operator recovery views.

Readiness prompts should be:

- Specific.
- Actionable.
- Safe.
- Company-scoped.
- Business-language first.

Readiness prompts should not reveal:

- Hidden modules.
- Cross-company counts.
- Raw permission keys.
- RLS/RPC/helper names.
- Auth provider internals.

## Testing Expectations

Future implementation should test:

- Result shape stability.
- Severity counts.
- Critical blocker detection.
- Ready-for-orders positive path.
- Missing owner membership negative path.
- Missing owner role assignment negative path.
- Missing role/permission seed negative path.
- Incomplete company profile warning/blocker behavior.
- Order numbering safe fallback behavior.
- Notification defaults safe fallback behavior.
- Pending invite does not count as active staff when staff is required.
- Solo-owner acknowledgement path.
- Cross-company leakage negative cases.
- Unknown/degraded partial bootstrap recovery cases.
- Product/package metadata cannot grant authority.
- Vendor/Client shell remains deferred unless explicitly enabled.

## Hard No-Go Rules

Future implementation must not introduce:

- Readiness state as access authority.
- Product-mode or module-authoritative security.
- Owner global-admin escalation.
- Cross-tenant checks that leak data.
- Continental defaults.
- Frontend-only readiness truth.
- Vendor/Client activation by checklist completion alone.
- Hidden critical backend gaps downgraded to optional UX warnings.
- Browser-owned repair of bootstrap-owned records.
- Direct frontend reads of service-role-only audit tables.
- Permission seed mutation from readiness requests.
- Raw permission/RLS/RPC internals in owner-facing setup copy.

## Implementation Slice Recommendations

Recommended later slices:

1. Read-only readiness resolver: 10B2 adds the pure local scaffold in `src/lib/companyBootstrap/companyReadinessResolver.js` and documents it in `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`; a backend-owned versioned resolver remains future work.
2. Diagnostics page readiness preview: expose safe readiness output in a protected diagnostics/settings surface.
3. Owner setup checklist resolver: feed setup cards and checklist rail from the readiness result.
4. Dashboard readiness prompt: show incomplete setup prompts without changing dashboard authority.
5. Bootstrap post-validation wrapper: run readiness immediately after bootstrap and include warnings in bootstrap result.
6. Result-shape tests: lock severity counts, checklist item keys, status values, and safe evidence shape.
7. Tenant isolation validation tests: prove no cross-company counts, object IDs, or hidden records leak.
8. Degraded/partial bootstrap recovery tests: cover missing owner, missing role assignment, missing audit, duplicate/idempotent replay, and failed invite states.
9. Order-numbering readiness tests: cover safe fallback and missing rule behavior once the company-safe model is locked.
10. Notification readiness tests: cover minimum policy/prefs availability and company-default deferral.

## Open Questions Before Implementation

- Should readiness be its own RPC or an extension of `rpc_company_setup_context()`?
- Should readiness results be stored, cached, or generated on demand?
- What is the canonical package/product-mode input before durable company package state exists?
- What exact order-numbering fallback is acceptable for first Staff Appraisal operation?
- What notification default state is acceptable before company notification policy exists?
- Should bootstrap fail if post-validation has critical blockers, or return degraded status for operator repair?
- How should owner acknowledgement tasks be stored?
- Should diagnostics expose more detail to support/operator roles than to company owners?
- What does `complete` mean for AMC, Vendor, Client, and Hybrid packages after those shells are productized?

## Phase 10A7 Lock

Phase 10A7 is documentation-only.

It defines the bootstrap validation/readiness checklist contract and keeps readiness diagnostic rather than authoritative. It adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, global admin escalation, or Continental-specific defaults.

## Phase 10B7 Runtime Use

Phase 10B7 wires a minimal form of this checklist into the service-role bootstrap wrapper result through `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`.

The runtime wrapper readiness is intentionally limited to SQL-local diagnostics:

- company id returned by bootstrap
- owner app user id returned by bootstrap
- owner membership id returned by bootstrap
- owner role assignment id returned by bootstrap
- bootstrap status
- bootstrap audit event ids/count
- skipped or unknown domains for order numbering, notification defaults, onboarding persistence, module/package state, setup context, and Vendor/Client activation

`rpc_company_setup_context()` is intentionally not called from the service-role wrapper because it requires authenticated current-company user/session state. Full setup-context readiness remains a later authenticated owner/session step after active-company refresh.

This runtime use remains diagnostic only. It does not grant access, deny access, bypass permissions/RLS/RPCs, activate product modes/modules, or expose Vendor/Client shells.
