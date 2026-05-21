# Company Onboarding State Model

## Purpose

This document locks the Phase 10A4 company onboarding state model contract.

It is documentation only. It does not introduce runtime code, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-specific bootstrap defaults.

Phase 10A1 defined company bootstrap doctrine. Phase 10A2 audited backend dependencies. Phase 10A3 defined the productized bootstrap RPC contract and recommended keeping `public.rpc_company_bootstrap(...)` as an internal service-role primitive behind a future backend/Edge wrapper or versioned JSON-shaped successor.

Phase 10A4 defines how a newly bootstrapped company should progress from created to operationally ready without making onboarding state an authorization source.

## Current Baseline

Known current surfaces:

- `public.rpc_company_bootstrap(...)` creates a company, owner app-user mapping, owner membership, owner role assignment, and company audit events.
- `public.rpc_company_setup_context()` returns a computed current-company setup checklist and readiness projection.
- `public.company_types.onboarding_defaults` exists as advisory future defaults.
- `public.companies.settings` and `public.companies.operating_mode_settings` exist as JSON shells.
- No persistent company onboarding-state table was confirmed in the inspected active migrations.
- No company module/package state table was confirmed in the inspected active migrations.
- Product-mode/module metadata remains diagnostic/composition metadata, not security authority.

The current setup context is useful as a readiness projection. It is not a full onboarding state machine.

Phase 10B4 locks the storage decision in `docs/COMPANY_SETUP_STORAGE_DECISION.md`: onboarding/readiness remains derived-first near term, with persistent onboarding state deferred until owner acknowledgements, skipped tasks, paused/error state, or completion actors are required. Existing company JSON shells may hold low-risk non-authoritative metadata later, but they must not become setup authority.

## Onboarding State Purpose

Company onboarding state should help Falcon answer:

- What setup steps are complete.
- What setup steps are still recommended.
- What setup steps block safe first operational use.
- Which user completed a setup step and when.
- Which setup warnings should be shown to the owner.
- Whether the company can reasonably create its first order or operate in its selected package/mode.

Onboarding state should support owner setup, diagnostics, empty states, and future guided setup flows. It should not become the source of authorization.

## Onboarding Is Not Security Authority

Onboarding may:

- Hide, recommend, or guide setup UX.
- Show progress and completion.
- Warn that setup is incomplete.
- Surface mode-native next steps.
- Feed diagnostics and readiness summaries.
- Block a guided setup screen from saying the company is complete.

Onboarding must not:

- Grant access.
- Bypass permissions.
- Bypass RLS or security-definer RPC checks.
- Make product modes authoritative.
- Make modules authoritative.
- Activate Vendor Portal or Client Portal surfaces by itself.
- Create cross-tenant visibility.
- Grant workflow actions.
- Override order/client/assignment visibility predicates.
- Replace route guards.

Runtime authority remains:

- Company membership.
- Company-scoped role assignments.
- Permission keys.
- RLS policies.
- Security-definer RPC checks.
- Readable order/client predicates.
- Assignment packet visibility.
- Route/action guards.
- Canonical workflow transition rules.

## Recommended State Machine

Recommended company onboarding states:

- `not_started`: No onboarding state exists yet. Used before a persistent model exists or before bootstrap initializes onboarding.
- `bootstrap_created`: Bootstrap created the company and first owner foundation.
- `owner_confirmed`: The owner has signed in under the company context and owner membership/role assignment is valid.
- `company_profile_started`: Company profile/setup has begun but required profile fields are incomplete.
- `company_profile_complete`: Required company identity fields are present.
- `team_setup_started`: Team setup has begun through owner review of role presets or staff invitation.
- `workflow_setup_started`: Workflow/defaults setup has begun, including order defaults, review assumptions, numbering, notification, or calendar defaults where those models exist.
- `ready_for_orders`: Minimum safe operational setup is complete for first order creation.
- `complete`: Required onboarding checklist is complete for the selected package/mode.
- `paused`: Onboarding is intentionally paused by the owner or operator.
- `error`: Onboarding is blocked by inconsistent state requiring operator review.

State transitions should be backend-owned when persisted. Frontend screens may request changes later, but should not infer durable state from local UI alone.

Recommended transition rules:

- `not_started -> bootstrap_created`: after successful bootstrap or idempotent replay with valid owner foundation.
- `bootstrap_created -> owner_confirmed`: after active-company/session context is valid for the owner and owner invariant passes.
- `owner_confirmed -> company_profile_started`: when owner opens setup or edits company profile.
- `company_profile_started -> company_profile_complete`: when required company profile fields are complete.
- `company_profile_complete -> team_setup_started`: when owner reviews role presets or begins invitation setup.
- `team_setup_started -> workflow_setup_started`: when owner begins operational defaults.
- `workflow_setup_started -> ready_for_orders`: when minimum order readiness checks pass.
- `ready_for_orders -> complete`: when required package/mode checklist items pass.
- Any non-terminal state -> `paused`: when an authorized owner/operator pauses setup.
- Any state -> `error`: when consistency checks fail.
- `error -> previous valid state`: only after backend/operator repair and validation.

`complete` should not be terminal. Owners may reopen setup later when packages, modules, settings, team structure, or policy defaults change.

## Recommended Checklist Model

Each onboarding checklist item should have:

- `task_key`: stable machine key.
- `label`: owner-facing label.
- `description`: short owner-facing purpose.
- `required`: boolean.
- `blocking`: boolean.
- `status`: `not_started`, `in_progress`, `complete`, `skipped`, `blocked`, or `warning`.
- `completion_source`: `computed`, `owner_action`, `operator_action`, `bootstrap`, `rpc`, `edge`, or `import`.
- `completed_at`: timestamp, nullable.
- `completed_by_user_id`: app user id, nullable.
- `related_route`: optional route hint.
- `related_permission`: optional permission needed to perform the task.
- `warning_metadata`: structured safe warning details.
- `error_metadata`: structured safe error details.

Checklist state can be computed, persisted, or hybrid. The implementation decision is open. A hybrid model is likely:

- Computed readiness for authority-bearing facts such as membership, role assignment, permissions, and setup context.
- Persisted owner acknowledgements for optional setup choices, skipped tasks, and setup progress.

Phase 10B4 confirms this direction as the recommended future model, but defers the migration until a concrete owner setup persistence slice. Until then, onboarding status should be computed from setup context, audit, membership, role assignment, and other canonical backend facts.

## Initial Checklist Candidates

Recommended base checklist:

| Task key | Required | Blocking | Completion source | Notes |
| --- | --- | --- | --- | --- |
| `owner_context_confirmed` | Yes | Yes | Computed | Owner active-company context is valid and owner invariant passes. |
| `company_profile_complete` | Yes | Yes | Computed or owner action | Company name, type, timezone, and locale are present. |
| `owner_profile_complete` | Yes | No | Computed or owner action | Owner display name/email/profile basics are present. |
| `role_presets_ready` | Yes | Yes | Computed | Required global role templates and setup permissions exist. |
| `team_reviewed` | Yes | No | Owner action | Owner reviewed role presets and team access path. |
| `staff_invite_started` | Package-dependent | No | RPC/Edge | At least one staff invite sent, if package requires team setup. |
| `order_numbering_ready` | Yes | Yes for order creation | Computed | Company-safe numbering default exists when model is locked. |
| `notification_defaults_ready` | Yes | No | Computed | Company/default notification behavior is known. |
| `workflow_defaults_reviewed` | Yes | No | Owner action | Review/delivery/default workflow expectations acknowledged. |
| `client_setup_started` | Package-dependent | No | Owner action or computed | First client/AMC setup is started for Staff/AMC packages. |
| `vendor_setup_started` | No by default | No | Owner action or relationship RPC | Deferred unless package/mode explicitly enables vendor workflows. |
| `package_intent_recorded` | No | No | Bootstrap or owner action | Metadata-only package/product-mode intent. |
| `ready_for_orders` | Yes | Yes for first order | Computed | Minimum checks pass for safe order creation. |

The checklist should be mode-aware in language, but not authority-aware. A checklist item may be irrelevant for a package/mode and hidden from the setup flow without granting or removing permissions.

## Owner Setup Requirements

Owner setup should require:

- Active company membership.
- Active Owner role assignment in company context.
- Valid current-company session context.
- Owner display identity sufficient for audit and activity attribution.
- Ability to view setup context through `company.setup.read` or a future setup permission.

Owner setup should not require:

- Platform/system admin access.
- Direct table access.
- Product-mode metadata authority.
- Continental-specific setup.
- Vendor/client shell activation.

## Company Profile Setup Requirements

Required company profile readiness should include:

- Company display name.
- Company type.
- Company status is active.
- Timezone.
- Locale.

Optional future fields:

- Legal name.
- Business address.
- Public contact email/phone.
- Service area.
- Default terminology profile.
- Default package/product-mode intent metadata.

Unknown:

- Whether these fields remain on `companies.settings`, a normalized company settings table, or a hybrid profile/settings model.

## Branding And Settings Setup Requirements

Branding/settings setup should be optional for first operational readiness unless the selected package/mode requires branded client/vendor communication.

Potential setup fields:

- Logo or brand mark.
- Brand color.
- Public company display name.
- Email/footer defaults.
- Timezone and locale confirmation.
- Calendar defaults.
- Workflow defaults.
- Notification defaults.
- Order-numbering defaults.

Authority boundary:

- Settings tune defaults.
- Settings do not grant permissions or visibility.
- Settings do not bypass workflow governance.

Unknown:

- Final company settings storage model.
- Which defaults should be structured JSON versus normalized domain tables.

## Staff Invite And Team Setup Requirements

Team setup should use the existing RPC/Edge-mediated invitation doctrine.

Requirements:

- Owner reviews role presets.
- Owner can invite staff through Team Access when permissions allow.
- Owner grant/revoke protections remain enforced.
- Invited users remain non-authoritative until authenticated acceptance activates membership and invitation-scoped role assignments.

Recommended onboarding behavior:

- Staff invitation is optional for solo-owner Staff bootstrap unless package policy requires multiple team members.
- Role preset review should be required before setup is complete.
- Invitation acceptance should update readiness through computed state or a future onboarding event.

Authority boundary:

- Invitation state alone grants no operational visibility.
- Onboarding completion does not activate users.

## Client And Vendor Setup Requirements

Client setup:

- Staff and AMC packages should eventually guide the owner to create or import the first client/AMC/lender record.
- Client setup should not be required for company existence.
- Client setup may be required before `ready_for_orders` if the package requires linked clients for order creation.

Vendor setup:

- Vendor setup is deferred by default.
- Vendor relationships and assignment packets should only appear when explicitly enabled by later package/mode/data contracts.
- Vendor setup must not activate Vendor Portal surfaces by onboarding state alone.

Client Portal setup:

- Client Portal setup is deferred by default.
- Client-facing request/status/report surfaces require explicit route/data/permission contracts later.

Continental:

- Continental AMC workflows can become a named setup template later.
- They must not define the default onboarding path.

## Order Workflow Readiness Requirements

Minimum readiness before normal order creation should include:

- Valid company context.
- Active owner/admin or user with `orders.create`.
- Company-safe order numbering strategy, once the model is locked.
- Basic workflow defaults or platform defaults.
- Client/AMC readiness if package requires linked client intake.
- Notification defaults known enough to avoid noisy fan-out.

Onboarding may show warnings before first order creation. It must not bypass `orders.create`, order table policies, order intake RPCs, client attachment checks, or workflow transition RPCs.

## Notification Readiness Requirements

Notification readiness should confirm:

- Global notification policies exist or company-specific defaults are resolved.
- User notification preference defaults can be created/read through existing preference RPCs.
- Bootstrap/onboarding does not send operational notifications by default.

Unknown:

- Whether company notification defaults live in global `notification_policies`, company override rows, company settings JSON, or a new table.

Onboarding should warn when notification defaults are unresolved, but should not mutate notification policies until the storage model is locked.

## Order Numbering Readiness Requirements

Order numbering readiness should confirm:

- A company-safe numbering rule exists.
- The rule is tied to company identity or a documented company key.
- Counters cannot collide across companies.
- Manual override rules are explicit.

Current caveat:

- Existing `order_numbering_rules.company_key` is mixed/legacy and seeded for `falcon_default`.
- The company-safe default model is not locked.

Onboarding should not mark `ready_for_orders` complete for new companies until the numbering model is safe or the order creation path can operate without unsafe shared counters.

## Package, Module, And Product-Mode Setup Requirements

Package/module/product-mode setup is metadata-only until runtime enforcement is explicitly designed.

Onboarding may:

- Record selected package intent when a storage model exists.
- Use product-mode vocabulary to label setup steps.
- Hide irrelevant setup tasks.
- Suggest package-specific next steps.
- Feed diagnostics.

Onboarding must not:

- Grant permissions.
- Enable routes as authority.
- Grant data visibility.
- Activate Vendor/Client shells by itself.
- Treat package state as billing enforcement.
- Treat module state as security authority.

Unknown:

- Whether durable package/module state exists in the database.
- Whether `companies.operating_mode_settings` is sufficient or only a placeholder.

## Completion Criteria For Operationally Ready

`ready_for_orders` should mean the company can safely begin core operational work.

Minimum criteria:

- Company is active.
- Owner context is confirmed.
- At least one active owner remains.
- Required role presets are ready.
- Company profile basics are complete.
- Order numbering is company-safe or explicitly not required by the first order path.
- Workflow/default platform behavior is known.
- Notification defaults are safe enough to avoid noisy or broken fan-out.
- Current user has route/action permissions needed for the next operation.

`complete` should mean required onboarding tasks for the selected package/mode are complete.

For Staff Appraisal, likely required:

- Owner confirmed.
- Company profile complete.
- Role presets ready.
- Team setup reviewed.
- Order numbering ready.
- Workflow defaults reviewed.
- Notification defaults reviewed.
- Client setup started or intentionally skipped if manual client order intake remains allowed.
- Ready-for-orders check passed.

For AMC, Vendor, Client, and Hybrid:

- Completion criteria require later package/mode-specific contracts.
- Vendor/Client/Hybrid steps must stay hidden or deferred until explicitly enabled.

## Onboarding Vs Authority

Onboarding may guide the user to the right screen, show progress, and warn about missing setup.

Onboarding must not decide:

- Who can read an order.
- Who can read a client.
- Who can see assignment packets.
- Who can invite users.
- Who can create orders.
- Who can transition workflow status.
- Which routes are authorized.
- Which cross-company records are visible.

Those decisions remain with permissions, membership, RLS/RPCs, route guards, assignment visibility, and workflow logic.

If onboarding says a task is complete but authority checks fail, authority checks win.

If onboarding says a task is incomplete but authority checks allow an action, the product may show a warning or setup prompt, but should not invent a separate authorization bypass.

## Initial Owner Setup Flow

Future first-login owner setup should conceptually flow as:

1. Confirm company profile.
2. Confirm owner profile.
3. Confirm timezone, locale, and basic settings.
4. Choose or confirm package/product-mode intent as metadata only.
5. Configure order numbering if the company-safe model exists.
6. Review workflow/default operating assumptions.
7. Review notification defaults.
8. Review default roles.
9. Invite staff if desired or required by package policy.
10. Start client setup if relevant to the package.
11. Review readiness checklist.
12. Mark setup complete when required checks pass.

The flow should use business language. It should avoid raw module IDs, permission internals, RLS/RPC concepts, tenant mechanics, or disabled-module catalogs.

Phase 10A5 completes the future owner setup UI shell design in `docs/OWNER_SETUP_UI_SHELL_CONTRACT.md`. That shell consumes onboarding readiness as guidance and diagnostics, not authority; proposed setup routes, cards, prompts, and dashboard entry points remain future implementation details.

Phase 10A6 completes the invite/staff setup bridge contract in `docs/INVITE_STAFF_SETUP_BRIDGE_CONTRACT.md`. Staff setup remains company-scoped readiness guidance: pending invitations and inactive role assignments may inform onboarding progress, but they do not grant operational access before canonical invite acceptance activates membership and role assignments.

## Future Runtime Integration Points

Likely future touchpoints:

- Bootstrap RPC result and warnings.
- Active-company/session refresh.
- `rpc_company_setup_context()` or a successor setup context RPC.
- Company settings shell.
- Role/permission default validation.
- Team Access invitation prepare/finalize/accept flows.
- Dashboard empty states.
- Command palette suggestions.
- Notification policy/default resolution.
- Order creation readiness warnings.
- Client setup screens.
- Relationship/vendor setup screens when explicitly enabled.
- Product Metadata Diagnostics / future setup diagnostics.
- Company audit/readiness audit projection.

These integrations should consume onboarding state as guidance and diagnostics, not authority.

## Open Questions Before Implementation

Implementation requires decisions on:

- Table vs JSON field vs derived view for onboarding state.
- Per-company onboarding versus per-user setup progress.
- Whether checklist state is stored, computed, or hybrid.
- How to recover partial onboarding after failed setup.
- Whether package/module selections are stored yet.
- Whether `companies.operating_mode_settings` is sufficient for package intent.
- How owner invite/first login intersects with onboarding.
- Whether onboarding can be reset or reopened.
- Who can pause/resume onboarding.
- What `complete` means for Staff-only versus AMC versus future Hybrid.
- Whether client setup is required before first order for Staff packages.
- How order-numbering readiness is represented before the company-safe numbering model is implemented.
- How notification defaults are represented before company notification defaults exist.
- Whether setup progress should write company audit events.
- Whether an owner-visible audit/readiness projection is needed.

## Deferred From 10A4

Phase 10A7 completes the bootstrap readiness/checklist contract in `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`. The readiness checklist is the future diagnostic layer that can feed onboarding state and setup prompts, but onboarding remains guidance rather than security authority.

Deferred implementation topics:

- New onboarding tables.
- New onboarding RPCs.
- Company settings writes.
- Package/module state writes.
- Order-numbering migrations.
- Notification default migrations.
- Setup UI routes or components.
- Dashboard/CommandPalette onboarding prompts.
- Vendor/Client live surface activation.
- Billing/package enforcement.
- Continental-specific templates.

## Phase 10A4 Lock

Phase 10A4 is documentation-only.

It defines the onboarding state model contract and keeps onboarding as operational guidance rather than security authority. It adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default bootstrap assumptions.
