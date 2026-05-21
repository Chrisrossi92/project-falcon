# Company Bootstrap Wrapper SQL Design

## Purpose

This document locks Phase 10B5: the versioned bootstrap wrapper SQL design before implementation.

This is documentation-only plus read-only schema/function inspection. It does not introduce migrations, runtime code, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, tests, product-mode authority, module-authoritative security, Vendor/Client live surfaces, onboarding enforcement, bootstrap provisioning mutation, or Continental-specific defaults.

Phase 10B5 designs a future JSON-shaped wrapper or successor around the existing internal bootstrap primitive. It does not implement that wrapper.

## Sources Inspected

Docs inspected:

- `docs/COMPANY_BOOTSTRAP_RPC_CONTRACT.md`
- `docs/COMPANY_BOOTSTRAP_PRIMITIVE_INSPECTION.md`
- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/COMPANY_BOOTSTRAP_IMPLEMENTATION_READINESS.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_CHECKLIST.md`
- `docs/COMPANY_BOOTSTRAP_READINESS_RESOLVER.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

SQL files inspected:

- `supabase/migrations/20260518037000_company_bootstrap_operator_rpc.sql`
- `supabase/migrations/20260518003000_company_foundation_default_scope.sql`
- `supabase/migrations/20260518027000_company_relationship_foundation.sql`
- `supabase/migrations/20260518008000_company_membership_foundation.sql`
- `supabase/migrations/20260518009000_company_role_assignments_permissions.sql`
- `supabase/migrations/20260518038000_company_setup_context_rpc.sql`

## Existing Primitive Summary

`public.rpc_company_bootstrap(...)` exists as a mutating service-role/operator-only primitive.

Current signature:

```sql
public.rpc_company_bootstrap(
  p_company_slug text,
  p_company_name text,
  p_company_type text default 'staff_shop',
  p_timezone text default 'America/New_York',
  p_locale text default 'en-US',
  p_owner_auth_id uuid default null,
  p_owner_email text default null,
  p_owner_name text default null,
  p_owner_phone text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
```

Current result columns:

- `company_id`
- `company_slug`
- `company_name`
- `company_type`
- `company_status`
- `owner_user_id`
- `owner_auth_id`
- `owner_email`
- `membership_id`
- `owner_role_assignment_id`
- `owner_role_id`
- `active_company_metadata`
- `bootstrap_status`
- `idempotency_key`

Confirmed behavior:

- Requires a non-empty idempotency key.
- Validates company slug, company name, company type, owner Auth id, owner email, owner name, and metadata object shape.
- Rejects `falcon_default` as a reserved company slug.
- Creates one `companies` row with empty `settings` and `operating_mode_settings`.
- Creates or links one `public.users` app user for the owner.
- Creates one active `company_memberships` row with `membership_type = 'bootstrap_owner'`.
- Assigns the global template Owner role in company context through `user_role_assignments`.
- Enforces exactly one active owner after bootstrap.
- Writes `company_audit_events` for started, company created, owner linked, membership created, owner role assigned, and completed.
- Returns `created` or `idempotent_replay`.
- Performs partial-state detection for duplicate slug and completed idempotency audit drift.
- Has service-role-only execute grants and app-role grants revoked.

Known limits:

- It is positional rather than JSON-shaped.
- It is internal/operator oriented, not browser-safe.
- It does not return a structured warning list, created/updated/skipped arrays, readiness summary, or audit event ids as a first-class result.
- It does not seed durable onboarding state, module/package state, company-safe order numbering, or company notification defaults.
- It writes legacy `public.users.role = 'owner'` and `public.users.is_admin = true` in create/link branches for compatibility. This remains a known seam, not a model to expand.

## Why A Wrapper Is Preferred

A new versioned wrapper is preferred over broadening the current positional RPC because:

- The existing primitive already owns the sensitive company/owner/membership/role/audit mutation sequence.
- Its service-role-only posture is correct and should not be weakened.
- Its positional signature is not a stable product contract for future setup UX, idempotency diagnostics, warnings, dry-run validation, or readiness summaries.
- Changing its signature would risk breaking operator/backfill compatibility.
- A wrapper can preserve the primitive while adding a safer JSON request/result boundary.
- A wrapper can explicitly skip unresolved domains with warnings instead of silently creating unsafe defaults.
- A wrapper can later be called only by a trusted Edge/server boundary without exposing service-role credentials or direct table writes to the browser.

## Proposed Future RPC

Recommended SQL surface:

```sql
public.rpc_company_bootstrap_v1(p_payload jsonb)
returns jsonb
```

`v1` means version one of the productized JSON wrapper. It does not imply the existing unversioned primitive is version zero of a public API.

The existing `public.rpc_company_bootstrap(...)` should remain unchanged and internal. The wrapper should be added as a separate function in a future implementation slice.

## Caller Model

Initial caller model:

- Service-role/operator backend only.
- No direct browser call.
- No `authenticated` grant in the minimal implementation.
- No `anon` or `PUBLIC` grant.

Future caller model, if self-serve bootstrap is introduced:

- Browser submits intent to an Edge/server boundary.
- Edge/server validates eligibility and request ownership.
- Edge/server calls `rpc_company_bootstrap_v1(...)` with service-role credentials.
- Browser receives a safe response shaped by the Edge/server layer.

The wrapper must not become a generic app-role provisioning API.

## Authorization Requirements

The wrapper should fail closed unless the caller is a trusted service/operator boundary.

Minimum SQL boundary for 10B6:

- Revoke execute from `PUBLIC`, `anon`, and `authenticated`.
- Grant execute only to `service_role`.
- Treat `operator` as metadata/audit context unless a concrete operator identity model is implemented.

Future Edge/server boundary should validate:

- Requester eligibility to create a company, if self-serve is allowed.
- Owner Auth identity matches or is safely controlled by the requesting flow.
- Request idempotency key is stable and not reused for different normalized input.
- Company slug is allowed and not reserved.
- Company type is active.
- Product/package/module intent is metadata-only.

The wrapper must not grant platform/system admin authority, cross-company visibility, product-mode security authority, module-authoritative permissions, Vendor/Client shell access, or operational record access.

## Proposed Payload Shape

The wrapper should accept one JSON object.

Recommended shape:

```json
{
  "request_id": "bootstrap_2026_05_19_example",
  "idempotency_key": "bootstrap_2026_05_19_example",
  "dry_run": false,
  "company": {
    "slug": "acme-appraisal",
    "display_name": "Acme Appraisal",
    "legal_name": "Acme Appraisal LLC",
    "company_type": "staff_shop",
    "timezone": "America/New_York",
    "locale": "en-US"
  },
  "owner": {
    "auth_user_id": "00000000-0000-0000-0000-000000000000",
    "app_user_id": null,
    "email": "owner@example.com",
    "display_name": "Owner Name",
    "phone": null
  },
  "product_intent": {
    "product_mode": "staff_appraisal",
    "package_key": null,
    "module_keys": []
  },
  "branding_seed": {},
  "settings_seed": {},
  "source": {
    "kind": "operator",
    "requested_by": null,
    "metadata": {}
  }
}
```

Required fields for mutation:

- `idempotency_key` or `request_id`, normalized to one durable idempotency key.
- `company.display_name`
- `owner.auth_user_id`
- `owner.email`
- `owner.display_name`

Recommended optional fields:

- `company.slug`, otherwise the wrapper may generate a slug only if a deterministic slugging contract is implemented.
- `company.legal_name`, stored only when a safe company profile/settings contract exists.
- `company.company_type`, defaulting to `staff_shop`.
- `company.timezone`, defaulting to `America/New_York`.
- `company.locale`, defaulting to `en-US`.
- `owner.phone`
- `product_intent`, metadata-only.
- `branding_seed`, non-authoritative and skipped until a branding write contract exists.
- `settings_seed`, non-authoritative and skipped until guarded settings writes exist.
- `source.kind` and `source.metadata` for audit diagnostics.
- `dry_run`, defaulting to `false`.

Inputs that should not be accepted:

- Raw permission keys to grant.
- RLS policy choices.
- Module entitlement flags as authority.
- Product-mode authority flags.
- Cross-tenant grants.
- Vendor/Client live activation flags.
- Operational order/client/assignment records.
- Continental-specific template switches.
- Browser-owned active-company claim mutation instructions.

## Proposed Result Shape

The wrapper should return JSONB with deterministic top-level fields.

Recommended shape:

```json
{
  "status": "created",
  "company_id": "00000000-0000-0000-0000-000000000000",
  "company_slug": "acme-appraisal",
  "company_name": "Acme Appraisal",
  "company_type": "staff_shop",
  "owner_user_id": "00000000-0000-0000-0000-000000000000",
  "owner_auth_id": "00000000-0000-0000-0000-000000000000",
  "owner_membership_id": "00000000-0000-0000-0000-000000000000",
  "owner_role_assignment_id": "00000000-0000-0000-0000-000000000000",
  "owner_role_id": "00000000-0000-0000-0000-000000000000",
  "active_company_context": {
    "company_id": "00000000-0000-0000-0000-000000000000",
    "active_company_id": "00000000-0000-0000-0000-000000000000",
    "current_company_id": "00000000-0000-0000-0000-000000000000"
  },
  "readiness_summary": {
    "status": "ready_for_orders",
    "severity_counts": {
      "critical": 0,
      "warning": 0,
      "optional": 1,
      "deferred": 0,
      "unknown": 4
    },
    "blocking_items": [],
    "warnings": [],
    "unknowns": [
      "order_numbering",
      "notification_defaults",
      "onboarding_persistence",
      "module_package_state"
    ]
  },
  "created": ["company", "owner_membership", "owner_role_assignment"],
  "updated": ["owner_user"],
  "skipped": [
    "order_numbering_defaults",
    "notification_defaults",
    "onboarding_persistence",
    "module_package_state",
    "vendor_client_activation"
  ],
  "warnings": [
    {
      "code": "order_numbering_defaults_skipped",
      "severity": "unknown",
      "message": "Company-safe order-numbering defaults are not implemented yet."
    }
  ],
  "audit_event_ids": [],
  "idempotency_key": "bootstrap_2026_05_19_example",
  "generated_at": "2026-05-19T00:00:00Z"
}
```

Recommended statuses:

- `dry_run_valid`
- `created`
- `idempotent_replay`
- `blocked`
- `partial_state_requires_operator_review`

Do not return provider tokens, service-role details, raw permission internals, cross-company private identifiers, or operational record payloads.

## Validation Order

The wrapper should validate in this order:

1. Validate the SQL caller boundary.
2. Validate `p_payload` is a JSON object.
3. Normalize `request_id` and `idempotency_key`.
4. Validate `dry_run` type.
5. Validate company display name and optional slug.
6. Normalize or reject company slug according to the slug contract.
7. Validate company type against active `company_types`.
8. Validate timezone and locale as bounded strings. Timezone catalog validation may be added later if the project standardizes it.
9. Validate owner Auth id, email, and display name.
10. Validate optional product/package/module intent as metadata only.
11. Validate optional settings and branding seeds are JSON objects.
12. Check required platform seeds, especially active company type and Owner template role availability.
13. Check idempotency replay state through existing audit/object state.
14. If `dry_run = true`, return a validation result without mutation.
15. If mutating, delegate to the internal primitive.
16. Build wrapper result JSON from primitive output, object summaries, audit lookups, and warning-safe readiness facts.

## Transaction Behavior

PostgreSQL function execution runs within the caller transaction. The future wrapper should treat bootstrap as one backend-owned mutation boundary.

Recommended behavior:

- Do all required validation before calling the mutating primitive.
- Let hard validation failures raise exceptions so no partial mutation commits.
- Delegate the sensitive mutation to `rpc_company_bootstrap(...)` inside the same statement/transaction.
- Do not catch an internal primitive exception and continue with partial state.
- Query safe audit/result facts after successful delegation.
- Return warnings for skipped optional domains rather than mutating unresolved models.

Optional post-bootstrap diagnostics should be warning-safe. A diagnostics failure should not silently commit an incomplete bootstrap as successful. If a future implementation wants to tolerate diagnostic failure, the result status should make that explicit.

## Idempotency Behavior

The wrapper should require one durable idempotency key.

Recommended rules:

- If both `request_id` and `idempotency_key` are present, they must match after normalization or the wrapper must reject the request.
- Same idempotency key plus same normalized company/owner identity should return `idempotent_replay` without duplicate records.
- Same idempotency key plus different normalized company or owner identity should fail with an idempotency mismatch.
- Same company slug without matching completed bootstrap audit should return `partial_state_requires_operator_review`.
- Wrapper-level payload hash storage is not currently modeled. If payload hash comparison is needed, a later migration should add it to audit metadata or a dedicated idempotency ledger.

Current internal primitive idempotency is anchored to `company.bootstrap.completed` audit events and object checks. The wrapper should initially reuse that behavior and document any mismatch that cannot be verified without a new ledger.

## Audit Behavior

The internal primitive already writes bootstrap audit events:

- `company.bootstrap.started`
- `company.created`
- `company.owner_user_linked`
- `company.membership_created`
- `company.owner_role_assigned`
- `company.bootstrap.completed`

The wrapper should initially relay or summarize those audit facts rather than duplicating the lifecycle.

Recommended 10B6 minimal behavior:

- Query `company_audit_events` by company id and idempotency key after successful delegation.
- Return `audit_event_ids` when safely available.
- Preserve the existing audit event sequence.
- Do not write wrapper-specific audit events unless there is a concrete need and tests cover it.

Future wrapper-specific audit events may be useful:

- `company.bootstrap_wrapper.validated`
- `company.bootstrap_wrapper.completed`
- `company.bootstrap_wrapper.dry_run_validated`
- `company.bootstrap_wrapper.blocked`

If added later, they must remain service-role-only and must not expose secrets or raw permission internals.

## Error And Warning Behavior

Errors should be fail-closed for caller ambiguity, malformed input, missing required owner/company identity, invalid company type, idempotency mismatch, duplicate slug, missing Owner role template, and partial bootstrap state.

Warnings should be explicit for skipped optional domains:

- `settings_seed_skipped`
- `branding_seed_skipped`
- `product_intent_metadata_only`
- `module_package_state_not_persisted`
- `onboarding_persistence_not_configured`
- `order_numbering_defaults_skipped`
- `notification_defaults_skipped`
- `vendor_client_activation_not_supported`
- `active_company_refresh_required`
- `legacy_user_role_compatibility_write_possible`

Warnings must not imply access has been granted or denied. Runtime authority remains permissions, RLS policies, security-definer RPC checks, route/action guards, assignment packet boundaries, and workflow transition logic.

## Post-Bootstrap Readiness Validation

The wrapper should return a warning-safe readiness summary, but 10B6 should not depend on a live authenticated setup-context call.

Reason:

- `rpc_company_setup_context()` is an active-company authenticated read projection.
- It requires current app user resolution, current-company membership, active company, and `company.setup.read`.
- A service-role bootstrap function does not automatically represent the future owner's refreshed active-company session.

Recommended 10B6 posture:

- Build minimal readiness from the primitive result and directly confirmed facts:
  - company created or replayed
  - owner user id present
  - owner membership id present
  - owner role assignment id present
  - owner role id present
  - completed bootstrap audit present
- Mark unresolved domains as `unknown` or skipped:
  - order numbering
  - notification defaults
  - onboarding persistence
  - module/package state
  - live owner session active-company refresh

Future posture:

- Add a company-id-aware read-only readiness helper if post-bootstrap validation needs to run inside service-role bootstrap.
- Or run `rpc_company_setup_context()` after the owner session has an active-company claim and can call it as an authenticated current-company user.

Readiness remains diagnostic only.

## Delegation Strategy

Recommendation: delegate first.

The future wrapper should call existing `public.rpc_company_bootstrap(...)` initially because that primitive already owns:

- company creation
- owner app-user creation/linking
- active owner membership creation
- Owner role assignment
- owner invariant checks
- bootstrap audit events
- idempotent replay checks

Do not duplicate this logic in the wrapper for 10B6.

Do not replace or broaden the existing primitive in 10B6.

Possible later evolution:

- Extract a lower-level internal helper if wrapper needs better object summaries, audit ids, or payload hash semantics.
- Supersede the positional primitive only after the JSON wrapper has tests and operator usage proves stable.
- Retire legacy `users.role` / `is_admin` compatibility writes only in a separate legacy cleanup phase.

## Dry Run / Validation Mode

Recommendation: support `dry_run`.

Dry run should perform only read-only validation and return `dry_run_valid` or `blocked`.

Dry run may validate:

- Payload is an object.
- Required fields are present.
- Company slug format and reserved-slug checks.
- Company name normalization.
- Company type exists and is active.
- Owner Auth id format.
- Owner email format.
- Owner display name presence.
- Metadata objects are JSON objects.
- Owner template role exists.
- Existing company slug/idempotency state, where safe.
- Skipped optional domains and warning list.

Dry run must not:

- Insert or update `companies`.
- Insert or update `users`.
- Insert memberships or role assignments.
- Write `company_audit_events`.
- Set active-company metadata.
- Send invitations.
- Seed settings, numbering, notification defaults, modules, packages, clients, vendors, orders, or assignments.

Dry run cannot fully prove Auth-provider ownership, session refresh behavior, or future self-serve eligibility until an Edge/server boundary exists.

## Not Included In 10B6 Minimal Implementation

The minimal wrapper implementation should intentionally exclude:

- Order-numbering default seeding.
- Notification-default seeding.
- Durable onboarding persistence.
- Module/package entitlement state.
- Vendor/Client shell activation.
- Company settings editor.
- Branding asset/file handling.
- Owner setup UI wiring.
- Dashboard prompts.
- Live setup-context integration.
- Self-serve browser-callable bootstrap.
- Direct app-role grants.
- Cross-company relationships, assignments, clients, vendors, orders, or operational records.

Skipped domains should be returned as warnings or `skipped` result entries.

## SQL Implementation Notes For 10B6

When implementation begins:

- Create a new function such as `public.rpc_company_bootstrap_v1(p_payload jsonb)`.
- Preserve `public.rpc_company_bootstrap(...)` unchanged.
- Return JSONB.
- Keep execute grants service-role-only.
- Revoke execute from `PUBLIC`, `anon`, and `authenticated`.
- Validate payload shape before mutation.
- Normalize `request_id` and `idempotency_key` before delegation.
- Map payload fields into the existing positional primitive.
- Wrap the mutation in normal PostgreSQL function transaction semantics.
- Do not catch and suppress primitive exceptions.
- Query or relay audit event ids after successful delegation if possible.
- Return stable replay results for idempotent replays.
- Fail closed on authorization or input ambiguity.
- Add SQL comments documenting service-role-only wrapper posture.
- Add warning entries for every skipped optional setup domain.
- Do not add frontend, route, registry, dashboard, or diagnostics wiring in the same slice.

## Tests / Verification Later

Future implementation should verify:

- `PUBLIC`, `anon`, and `authenticated` callers are rejected.
- Service-role caller can dry-run valid payload without mutation.
- Missing required payload fields are rejected.
- Invalid company type is rejected.
- Reserved slug is rejected.
- First call creates expected company, owner user mapping, owner membership, owner role assignment, and audit events.
- Replay with the same idempotency key and same normalized identity returns a stable `idempotent_replay`.
- Replay with the same idempotency key and different normalized company/owner identity is rejected.
- Duplicate company slug behavior is explicit.
- No Vendor/Client live surface is activated.
- No product-mode/module authority is created.
- No order-numbering defaults are created.
- No notification defaults are created.
- No durable onboarding rows are created.
- Company audit event ids can be returned or safely omitted with a documented warning.
- Readiness summary is warning/unknown-safe.
- The wrapper does not expose provider tokens, raw permission internals, cross-company private data, or operational payloads.
- `git diff --check`.

## Hard No-Go Rules

- No direct browser exposure of `rpc_company_bootstrap(...)`.
- No direct browser exposure of the wrapper unless a future Edge/server eligibility layer is explicitly designed.
- No product-mode authority.
- No module-authoritative security.
- No global admin escalation for company owners.
- No Continental hardcoding.
- No Vendor/Client shell activation.
- No cross-tenant grants.
- No bypassing canonical permissions, RLS policies, security-definer RPC checks, route/action guards, assignment packet boundaries, readable order/client predicates, or workflow logic.
- No frontend-owned provisioning sequence.
- No bootstrap-seeded order numbering until company-safe numbering exists.
- No bootstrap-seeded notification defaults until company notification-default storage exists.
- No hidden setup/onboarding/readiness state as access authority.

## 10B5 Lock

Phase 10B5 is documentation-only plus read-only schema/function inspection.

It designs the future versioned JSON bootstrap wrapper and recommends delegating to the existing internal primitive first. It adds no migrations, runtime code, permission seeds, RLS policies, RPC edits, route changes, registry changes, UI changes, tests, product-mode authority, module-authoritative security, Vendor/Client live surfaces, onboarding enforcement, bootstrap provisioning mutation, or Continental-specific defaults.

## 10B6 Implementation Note

Phase 10B6 implements the minimal wrapper in `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`.

Implemented surface:

- `public.rpc_company_bootstrap_v1(p_payload jsonb) returns jsonb`
- `security definer`
- `search_path = public, auth`
- explicit `auth.role() = 'service_role'` guard
- execute revoked from `PUBLIC`, `anon`, and `authenticated`
- execute granted only to `service_role`

Implemented behavior:

- Validates payload, company, owner, source, metadata, product intent, branding seed, settings seed, dry-run flag, idempotency key, company identity, company type, owner Auth id, owner email, owner name, and Owner template presence.
- Supports `dry_run` without calling the mutating primitive or writing records.
- Delegates non-dry-run mutation to existing `public.rpc_company_bootstrap(...)`.
- Returns JSONB with status, company/owner/membership/role identifiers, active-company context, warning-safe readiness summary, created/updated/skipped arrays, warnings, audit event ids when derivable, idempotency key, generated timestamp, and wrapper source metadata.
- Keeps readiness/onboarding/settings/product-mode/module output diagnostic and non-authoritative.

Still intentionally excluded:

- Order-numbering default seeding.
- Notification-default seeding.
- Durable onboarding persistence.
- Module/package entitlement state.
- Vendor/Client shell activation.
- Settings editor/write behavior.
- Owner setup UI wiring.
- Dashboard prompts.
- Live setup-context integration.
- Self-serve browser-callable bootstrap.
- Direct app-role/global-admin grants.

## 10B7 Post-Validation Note

Phase 10B7 implements post-bootstrap validation wiring in `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`.

The wrapper still preserves:

- `public.rpc_company_bootstrap_v1(p_payload jsonb) returns jsonb`
- service-role-only guard
- dry-run no-write behavior
- non-dry-run delegation to `public.rpc_company_bootstrap(...)`
- skipped-domain warnings
- no browser/client exposure

Setup context decision:

- `rpc_company_setup_context()` is intentionally not called inside the service-role wrapper.
- It depends on an authenticated current app user, current-company claim resolution, active company membership, and `company.setup.read`.
- Forcing that context inside bootstrap would require unsafe session/active-company manipulation.
- The wrapper instead returns SQL-local diagnostic readiness derived from validated input, primitive result fields, and `company_audit_events`.

Post-bootstrap readiness now includes diagnostic checks for:

- company id present
- owner app user id present
- owner membership id present
- owner role assignment id present
- bootstrap status
- bootstrap audit event count and ids
- intentionally skipped/unknown domains
- next recommended action

Readiness remains diagnostic only and does not grant or deny access.
