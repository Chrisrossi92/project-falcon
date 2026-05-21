# Company Bootstrap RPC Contract

## Purpose

This document locks the Phase 10A3 productized company bootstrap RPC design contract.

It is documentation only. It does not introduce runtime code, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-specific bootstrap defaults.

Phase 10A1 defined company bootstrap doctrine. Phase 10A2 audited the backend dependency map and found that Falcon already has partial bootstrap primitives:

- `public.rpc_company_bootstrap(...)`
- `public.company_audit_events`
- `public.rpc_company_setup_context()`
- owner invariant helpers such as `company_active_owner_count(...)`, `user_has_owner_role_in_company(...)`, and `assert_company_will_have_owner(...)`

Those primitives are valuable foundations. They are not yet a complete productized bootstrap/onboarding contract.

## Contract Recommendation

Recommended strategy: wrap first, evolve deliberately.

The existing `public.rpc_company_bootstrap(...)` should remain a service-role/operator-only internal primitive for now. A future productized bootstrap entrypoint should be a backend-owned wrapper or service boundary that validates product inputs, normalizes defaults, calls the internal bootstrap primitive or a future versioned successor, and then returns a stable result contract.

Do not expose the existing SQL RPC directly to browser-authenticated users. Do not expand it into a broad public onboarding API without first resolving the open design decisions in this document.

Recommended future surface:

- External/backend service boundary: `bootstrap-company-instance`
- Internal SQL contract candidate: `public.rpc_company_bootstrap_v2(p_request jsonb)`
- Existing primitive: keep `public.rpc_company_bootstrap(...)` as an internal service-role function until a versioned successor is implemented and validated.

Why wrap instead of directly evolve immediately:

- The existing RPC already handles company creation, first-owner app-user mapping, first-owner membership, owner role assignment, idempotency replay, and audit events.
- The existing RPC is positional and narrower than the productized contract needed for package defaults, settings, onboarding, order numbering, and notification defaults.
- The existing RPC sets legacy `public.users.role` and `public.users.is_admin` for compatibility in some paths, which should be treated as a known seam rather than expanded.
- A wrapper can preserve service-role isolation while giving the product a stable request/result shape.
- A wrapper can defer unsafe or unresolved domains without weakening the current tenant boundary.

## Intended Caller Model

Supported caller models:

- Operator-mediated bootstrap: a trusted operator or admin backend process invokes the wrapper with service-role credentials.
- Self-serve bootstrap through Edge/server mediation: an authenticated user submits intent to an Edge/server function, which validates eligibility and calls the service-role bootstrap boundary.

Unsupported caller models:

- Browser calls directly invoking `public.rpc_company_bootstrap(...)`.
- Browser-orchestrated multi-table provisioning.
- App-role direct inserts into `companies`, `company_memberships`, `user_role_assignments`, `company_audit_events`, or setup ledger tables.
- Product-mode/module metadata deciding authorization.

The first implementation should preserve service-role/operator-only SQL execution. Self-serve eligibility can be designed later as an Edge/server layer that never exposes service-role credentials or direct table writes.

## Authorization Boundary

The productized bootstrap boundary must validate:

- The caller is an authorized operator, trusted backend service, or eligible authenticated self-serve requester.
- The request carries a stable idempotency key.
- The owner Auth identity is known and matches the supplied owner email when owner data is provided.
- The target company slug/display name is valid and not reserved.
- The requested company type/package/product seed is recognized but non-authoritative.
- Required platform seeds exist before writes depend on them.
- The Owner role source is canonical and protected.

The boundary must not grant:

- Platform/system admin authority.
- Access to another company.
- Operational order/client/assignment visibility.
- Vendor/Client portal live surfaces.
- Permissions from module/package metadata alone.

## Proposed Inputs

The productized contract should accept a single structured request object rather than a long positional signature.

Required inputs:

- `idempotency_key`: stable request key.
- `company_display_name`: user-facing company name.
- `owner`: owner identity object.

Recommended `owner` fields:

- `auth_user_id`: required for Auth-backed bootstrap.
- `app_user_id`: optional when an app user already exists and has been safely resolved.
- `email`: required when creating or linking app-user identity.
- `display_name`: required when creating or repairing display identity.
- `phone`: optional.

Optional company inputs:

- `company_slug`: optional if backend-generated from display name; required if operator supplies a fixed slug.
- `company_legal_name`: optional, only if a company profile/settings field exists.
- `company_type`: optional, defaulting to `staff_shop` unless product/package selection says otherwise.
- `timezone`: optional, defaulting to platform default when absent.
- `locale`: optional, defaulting to platform default when absent.
- `branding_seed`: optional structured metadata; only stored if a company settings/branding shell exists.

Optional product/setup inputs:

- `initial_package_key`: metadata-only package seed.
- `initial_product_mode_key`: metadata-only product-mode seed.
- `module_seed`: metadata-only requested module defaults.
- `onboarding_source`: optional source marker such as `operator`, `self_serve`, `invite_conversion`, or `import`.
- `onboarding_context`: optional metadata object for diagnostics and audit.

Optional defaults:

- `order_numbering_seed`: optional only after the company-safe numbering model is locked.
- `notification_default_seed`: optional only after company notification-default storage is locked.

Inputs that should not be accepted:

- Raw permission keys to grant directly from the request.
- Raw RLS policy choices.
- Direct module-authority flags.
- Cross-company visibility grants.
- Vendor/client shell activation flags.
- Operational order/client/assignment records.
- Continental-specific template flags unless a named future template contract exists.

## Proposed Outputs

The productized contract should return a deterministic result object.

Required output fields:

- `bootstrap_status`: `created`, `idempotent_replay`, `partial_state_requires_operator_review`, or `blocked`.
- `company_id`
- `company_slug`
- `company_name`
- `company_type`
- `company_status`
- `owner_user_id`
- `owner_auth_id`
- `owner_email`
- `owner_membership_id`
- `owner_role_assignment_ids`
- `owner_role_id`
- `onboarding_status`
- `warnings`
- `created`
- `updated`
- `skipped`
- `audit_event_ids`
- `active_company_metadata`
- `session_refresh_required`

Recommended object summaries:

- `created.company`
- `created.owner_user`
- `created.owner_membership`
- `created.owner_role_assignments`
- `created.settings_shell`
- `created.onboarding_state`
- `created.order_numbering`
- `created.notification_defaults`
- `updated.owner_user`
- `skipped.role_templates`
- `skipped.module_state`
- `skipped.order_numbering`
- `skipped.notification_defaults`

Warnings should be explicit and machine-readable:

- `settings_shell_not_configured`
- `module_state_model_missing`
- `onboarding_state_model_missing`
- `order_numbering_model_not_company_safe`
- `notification_defaults_model_missing`
- `legacy_user_role_fields_touched`
- `active_company_claim_refresh_required`

## Idempotency Expectations

Bootstrap must require an idempotency key.

Same key plus same normalized company/owner identity should return a deterministic replay result and must not create duplicate companies, memberships, role assignments, settings rows, numbering rows, notification defaults, onboarding state, or audit-completion records.

Same key plus different company or owner identity should fail with a mismatch error.

Same slug without matching completed bootstrap audit should return a partial-state/operator-review error rather than guessing.

Idempotency should be anchored to durable audit and object state, not browser memory.

## Transaction Expectations

Bootstrap should run inside one backend-owned transactional boundary where practical.

Minimum atomic group:

- company record
- owner app-user mapping or safe link
- owner company membership
- owner role assignment
- company audit events for started/created/owner linked/membership/role/completed

Optional defaults should only join the same transaction after their models are locked:

- company settings shell
- onboarding state
- module/package state
- order-numbering defaults
- notification defaults

If optional defaults are not safe, the contract should skip them with warnings rather than performing partial unsafe writes.

## Audit Expectations

Bootstrap must write durable audit records through `company_audit_events` or its future successor.

Required event categories:

- `company.bootstrap.started`
- `company.created`
- `company.owner_user_linked`
- `company.membership_created`
- `company.owner_role_assigned`
- `company.bootstrap.completed`

Future optional event categories:

- `company.settings_initialized`
- `company.onboarding_initialized`
- `company.package_seeded`
- `company.order_numbering_initialized`
- `company.notification_defaults_initialized`
- `company.bootstrap.blocked`
- `company.bootstrap.partial_state_detected`

Audit metadata must not include provider tokens, service-role secrets, raw permission internals, cross-company private identifiers, or operational record payloads.

## Error Shape

Errors should be stable, machine-readable, and safe to show after mapping to user copy.

Recommended error fields:

- `code`
- `message_key`
- `safe_message`
- `retryable`
- `operator_review_required`
- `field_errors`
- `details_ref`

Expected error codes:

- `idempotency_key_required`
- `invalid_company_slug`
- `reserved_company_slug`
- `company_name_required`
- `owner_auth_id_required`
- `invalid_owner_email`
- `owner_name_required`
- `invalid_company_type`
- `owner_template_role_missing`
- `role_presets_incomplete`
- `duplicate_company_slug`
- `idempotency_key_company_slug_mismatch`
- `idempotency_key_owner_mismatch`
- `owner_auth_id_email_mismatch`
- `owner_email_already_linked_to_different_auth_user`
- `bootstrap_partial_state_requires_operator_review`
- `settings_shell_model_missing`
- `order_numbering_model_not_company_safe`
- `notification_defaults_model_missing`
- `active_company_claim_refresh_failed`

The existing primitive already raises several of these codes. A productized wrapper should normalize them into the stable result/error contract.

## Rollback And Recovery Expectations

If the transactional bootstrap fails before completion, database writes should roll back where possible.

If durable partial state exists, the next call must not silently continue. It should return `partial_state_requires_operator_review` with enough safe diagnostic context for an operator or future recovery RPC.

Recovery should distinguish:

- company row exists without completed audit
- completed audit references missing company
- owner user exists but membership missing
- membership exists but owner role assignment missing
- owner role assignment exists but owner invariant fails
- idempotency key replay with mismatched owner/company
- active-company metadata/session refresh failed after SQL bootstrap succeeded

Session or active-company metadata refresh failure should not roll back a successful company bootstrap after commit. It should return `session_refresh_required` plus a warning or a separate failure state that the Edge/server layer can repair.

## Post-Bootstrap Validation Expectations

After bootstrap, the backend or wrapper should validate:

- Company exists exactly once for the normalized slug.
- Company status is expected.
- Owner app user exists and maps to the expected Auth user.
- Owner membership exists and is active.
- Owner role assignment exists and is active.
- `company_active_owner_count(company_id) >= 1`.
- Owner permission resolution includes expected setup/admin permissions.
- `rpc_company_setup_context()` can run for the owner after active-company context is refreshed.
- No operational orders, clients, assignments, relationships, notifications, or activity records were created by default.
- Product/package/module state, if created later, is non-authoritative.
- Audit contains a completed bootstrap event for the idempotency key.

## Bootstrap Operation Sequence

The productized sequence should be:

1. Validate caller authority.
2. Validate and normalize inputs.
3. Validate idempotency key and replay state.
4. Validate platform seed readiness.
5. Validate canonical Owner role source.
6. Create or resolve company.
7. Create or link owner app-user mapping.
8. Create owner membership.
9. Assign Owner role in company context.
10. Seed default role/permission strategy if the model is locked.
11. Seed company settings shell if the model exists.
12. Seed package/module/product-mode metadata if the model exists.
13. Seed onboarding state if the model exists.
14. Seed order-numbering defaults if the model is company-safe.
15. Seed notification defaults if the model is company-safe.
16. Write company audit events.
17. Validate post-bootstrap invariants.
18. Return deterministic result.
19. Let the Edge/server layer refresh active-company/session context.

The browser may collect intent and display results. The browser must not own the provisioning sequence.

## Existing Primitive Mapping

Existing `public.rpc_company_bootstrap(...)` currently covers:

- input validation for slug/name/type/timezone/locale/owner identity/idempotency/metadata
- idempotent replay through `company.bootstrap.completed`
- duplicate slug and partial-state detection
- global template Owner role lookup
- company creation
- owner app-user creation/linking
- owner membership creation
- owner role assignment
- active owner invariant check
- company audit events
- active-company metadata payload

Existing gaps for productized bootstrap:

- structured JSON request/result contract
- explicit warning list
- created/updated/skipped object summary
- audit event IDs in result
- product/package/module durable state
- company settings shell beyond empty JSON
- onboarding state model
- company-safe order-numbering default
- company notification-default model
- self-serve eligibility boundary
- session/active-company metadata refresh implementation contract
- legacy user-role-field retirement plan

## Open Design Decisions Before SQL Implementation

These decisions must be resolved before SQL implementation changes:

- Canonical owner role source: continue assigning global template Owner roles in company context, or create company-specific role copies during bootstrap.
- Default role template source: confirm global templates remain authoritative presets, or define company-local role preset creation.
- Company settings model: define whether bootstrap writes `companies.settings`, `companies.operating_mode_settings`, normalized settings rows, or a hybrid shell.
- Module/package state model: define if durable package/module state exists and how it stays non-authoritative.
- Onboarding state model: define computed-only setup context versus persisted onboarding state.
- Order numbering default model: define company-safe numbering based on `company_id`, slug/company key, or a replacement for `order_numbering_rules.company_key`.
- Notification default model: define company overrides versus global `notification_policies` plus user preferences.
- Invitation bridge: define whether invitation finalization can follow bootstrap, call setup context, or reuse parts of bootstrap for invited owner conversion.
- Existing RPC posture: decide whether `rpc_company_bootstrap(...)` remains internal forever, is evolved in place, or is superseded by `rpc_company_bootstrap_v2(p_request jsonb)`.
- Active-company refresh: define Edge/server behavior for setting app metadata and refreshing the user session.
- Legacy compatibility: decide how long bootstrap may write `public.users.role` and `public.users.is_admin`.
- Recovery model: define whether partial-state repair is manual operator-only or gets a later guarded recovery RPC.

Phase 10A4 completed the onboarding-state design as `docs/COMPANY_ONBOARDING_STATE_MODEL.md`. The model recommends treating onboarding as operational guidance and readiness diagnostics, not security authority, and leaves the storage choice open as table, JSON field, derived view, or hybrid until implementation.

Phase 10A6 completed the invite/staff setup bridge design as `docs/INVITE_STAFF_SETUP_BRIDGE_CONTRACT.md`. The bridge recommends preserving the existing invitation prepare/finalize/accept authority model for staff setup, treating `rpc_company_bootstrap(...)` as separate first-owner provisioning, and preventing pending invitations or inactive role assignments from becoming runtime authority.

Phase 10B5 completes the versioned wrapper SQL design as `docs/COMPANY_BOOTSTRAP_WRAPPER_SQL_DESIGN.md`. The design keeps this contract's wrap-first recommendation, chooses `rpc_company_bootstrap_v1(p_payload jsonb)` as the future JSONB wrapper candidate, preserves `rpc_company_bootstrap(...)` as the internal positional primitive, and excludes unresolved settings, onboarding, module/package, order-numbering, notification-default, Vendor/Client, and owner setup UI behavior from the minimal implementation.

Phase 10B6 implements the minimal wrapper in `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`. The implemented wrapper is service-role-only, supports dry-run validation, delegates non-dry-run mutation to existing `rpc_company_bootstrap(...)`, returns JSONB with warning-safe skipped domains, and does not create order-numbering defaults, notification defaults, durable onboarding state, module/package entitlement state, Vendor/Client live surfaces, owner setup UI wiring, dashboard prompts, or app-role/global-admin grants.

## Hard No-Go Rules

Bootstrap design and future implementation must not introduce:

- Product-mode authority.
- Module-authoritative security.
- Global admin escalation for company owners.
- Continental hardcoding.
- Vendor/Client shell activation by default.
- Cross-tenant grants.
- Bypasses around canonical permissions, RLS policies, security-definer RPC checks, readable order/client predicates, assignment packet boundaries, route guards, or workflow transition rules.
- Frontend-owned provisioning sequence.
- Direct app-role writes to bootstrap-owned tables.
- Operational records as default bootstrap side effects.
- Permission seed mutation from a bootstrap request.

## Validation Baseline For Future Implementation

Phase 10A7 completes the bootstrap readiness/checklist contract in `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`. Future bootstrap wrappers should run or return that readiness shape after bootstrap so callers receive deterministic critical blockers, warnings, and next actions without making readiness state runtime authority.

When implementation begins, validation should include:

- SQL fixture tests for create, idempotent replay, duplicate slug, mismatched idempotency owner/company, missing Owner template, and partial-state detection.
- Owner invariant checks.
- Permission resolver checks for the bootstrapped owner.
- Setup context checks after active-company refresh.
- Cross-company negative checks.
- Static scans proving no browser code directly writes bootstrap-owned tables.
- `git diff --check`.
- Lint/build if frontend or Edge/server code changes.

## Phase 10A3 Lock

Phase 10A3 is documentation-only.

It defines the productized bootstrap RPC contract and recommends wrapping the existing service-role primitive before broadening it. It adds no runtime behavior, migrations, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, product-mode authority, module-authoritative security, Vendor/Client live surfaces, or Continental-default bootstrap assumptions.
