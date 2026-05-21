# Order Numbering Migration Strategy

## Purpose

Phase 10E2 designs the migration strategy for moving Falcon from legacy/browser-prefetched/global order numbering to company-safe server-side order numbering.

This is documentation-only plus read-only schema/code inspection. It does not add migrations, backend behavior, runtime code, UI changes, route changes, registry changes, tests, permission seeds, RLS/RPC edits, order creation changes, uniqueness changes, bootstrap seeding, Owner Setup numbering configuration, readiness authority, product-mode authority, module-authoritative security, or Vendor/Client activation.

The goal is to lock a staged migration path before implementation begins.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema/code areas re-checked through 10E1 findings:

- `order_numbering_rules`
- `order_number_counters`
- `order_counters`
- `next_order_number(...)`
- `rpc_get_next_order_number(...)`
- `rpc_is_order_number_available(...)`
- `orders.order_number` constraints/indexes
- `rpc_create_order(jsonb)`
- `rpc_update_order(uuid, jsonb)`
- `rpc_order_update(uuid, jsonb)`
- direct frontend order create/update paths

## Target Architecture

The target architecture is:

- Company-id-backed numbering rules.
- Company-id-backed counters.
- Server-side number generation during order creation.
- Company-scoped uniqueness for visible order numbers.
- Guarded manual override behavior.
- Compatibility with existing `orders.order_number` display/search usage.
- No frontend-generated authoritative order numbers.
- No `company_key` as tenant authority.
- No Owner Setup numbering configuration until the backend model is stable.

`orders.order_number` remains the visible operational label. It is not access authority.

## Target Numbering Rules

Recommended rule model:

- Key rules by `company_id uuid not null references public.companies(id)`.
- Preserve one active default rule per company.
- Keep a legacy `company_key` only as a compatibility/display field if migrated in place.
- Support an initial allowlisted `format_kind`, currently compatible with `year_seq_3`.
- Support validated `year_digits`, `sequence_digits`, and `reset_period`.
- Keep `manual_override_allowed` explicit.
- Include timestamps and optional actor columns if aligned with company settings conventions.

Implementation decision for 10E3/10E4:

- Prefer adding `company_id` compatibility columns to existing `order_numbering_rules` and `order_number_counters` first if that allows safer replay/backfill and avoids duplicating logic.
- Use successor v2 tables only if in-place compatibility creates constraint or dependency risk.

## Target Counters

Recommended counter model:

- Key counters by `company_id`, rule, and period.
- Continue yearly period first because current behavior is yearly.
- Increment counters server-side using an atomic `insert ... on conflict ... do update ... returning last_value` pattern.
- Accept gaps as normal operational numbering behavior unless a future accounting requirement demands gapless numbering.
- Do not reserve numbers in browser state.

## Target Generation Flow

Server-side order creation should become the numbering authority.

Target create behavior:

1. Caller requests order creation through a guarded order creation path.
2. Backend resolves `current_company_id()`.
3. Backend validates create permission and company-owned linked records.
4. Backend generates the next order number for the resolved company when no valid manual override is supplied.
5. Backend inserts the order with generated or validated manual order number.
6. Backend relies on company-scoped uniqueness to prevent collisions.
7. Backend returns the created order with `order_number`.

The browser should not prefetch or reserve authoritative order numbers in the target model.

## Guarded Manual Override Behavior

Manual overrides should remain separate from generated numbering.

Recommended guard model:

- Preserve existing order numbers by default on update.
- Treat a changed `order_number` as a manual override.
- Allow manual override only when:
  - the active company numbering rule allows manual override;
  - the caller has an explicit permission selected during implementation, likely an order/admin or numbering-management permission;
  - the candidate number is valid for length/characters;
  - the candidate number is unique within the current company.
- Write an audit event when an order number is manually changed.

Manual override should not:

- bypass order update authorization;
- use global uniqueness checks as final authority;
- leak cross-company order-number existence;
- be controlled by frontend-only validation.

## Proposed Phase Sequence

### 10E3 Compatibility / Read-Only Company-ID Mapping Analysis

Inspect the live replay-safe schema/catalog and design exact compatibility changes.

Scope:

- Verify grants on `rpc_get_next_order_number(...)` and `rpc_is_order_number_available(...)`.
- Verify dependencies on `order_numbering_rules`, `order_number_counters`, `order_counters`, and `next_order_number(...)`.
- Check current data for order-number nulls, duplicates, and company distribution.
- Confirm whether adding `company_id` to existing numbering tables is safer than successor tables.
- Document catalog queries and expected migration preconditions.

No behavior changes.

10E3 result: completed in `docs/ORDER_NUMBERING_COMPATIBILITY_ANALYSIS.md`. The analysis recommends docs-only preflight SQL, no helper view yet, and 10E4 additive storage only after company/order/rule/counter mapping checks pass.

### 10E4 Company-ID-Backed Tables / Compatibility Columns

Add company-id-backed numbering storage without changing active order creation behavior.

Likely scope:

- Add `company_id` to numbering rules/counters or create v2 successor tables.
- Backfill `falcon_default` rule to `default_company_id()`.
- Preserve existing `company_key` behavior.
- Add read-only diagnostics helper or view if useful.
- Do not change `rpc_get_next_order_number(...)`.
- Do not change OrderForm.
- Do not change order creation.

10E4 result: implemented additively in `supabase/migrations/20260518060000_company_order_numbering_storage.sql`. The migration adds nullable `company_id` columns to `order_numbering_rules` and `order_number_counters`, `NOT VALID` company FKs, company lookup indexes, future-safe partial unique indexes for mapped rows, and deterministic backfill from `company_key = 'falcon_default'` to `public.default_company_id()`. It does not change active legacy generation functions, order create/update behavior, frontend behavior, uniqueness on `orders.order_number`, bootstrap seeding, or Owner Setup.

10E4V verification note: verified after local Docker Desktop repair. The reset blocker was a stuck Docker Desktop/backend state, not Falcon SQL. A clean `supabase db reset` replayed through `20260518060000_company_order_numbering_storage.sql`; smoke checks confirmed both `company_id` columns exist, both company FKs exist and remain `NOT VALID`, all four 10E4 indexes exist, the seeded `falcon_default` rule maps to `public.default_company_id()`, and legacy `rpc_get_next_order_number()` still returns the expected legacy format. No seed counter rows existed at migration time; a counter created later by the unchanged legacy RPC remains legacy-shaped with `company_id = null`, which is expected until the 10E5 v2 generation helper owns company-id-backed counter writes.

### 10E5 V2 Server-Side Generation Helper

Add a new generation helper/RPC without active create-path adoption.

Likely scope:

- Add `rpc_get_next_order_number_v2(...)` or an internal helper.
- Resolve company from `current_company_id()` for authenticated callers.
- Allow explicit company id only for service/operator contexts if needed.
- Increment company-backed counters atomically.
- Return generated number plus metadata.
- Keep old `rpc_get_next_order_number(...)` intact for compatibility.

10E5 result: implemented additively in `supabase/migrations/20260518061000_company_order_numbering_v2_helper.sql`. The new `public.next_order_number_v2(p_company_id uuid default public.current_company_id(), p_effective_at timestamptz default now())` helper resolves a concrete company id, requires an active `order_numbering_rules.company_id` rule, writes only company-id-backed `order_number_counters` rows, increments atomically through the existing `(rule_id, counter_year)` conflict target, and fails closed if a legacy/null-company counter already owns that rule/year. It is granted to `service_role` only and is not wired into order creation, order update, frontend prefetch, Owner Setup, bootstrap, or uniqueness changes. Legacy `rpc_get_next_order_number(...)` remains unchanged.

### 10E6 RPC Order Creation Uses V2

Update guarded RPC order creation first.

Likely scope:

- Update `rpc_create_order(jsonb)` to generate server-side with `next_order_number_v2(current_company_id(), now())`.
- Accept but ignore submitted `order_number` during normal RPC create for transition compatibility.
- Keep manual override deferred until an explicit flag, permission, reason, validation, and audit contract exists.
- Keep linked client/AMC authorization unchanged.
- Keep direct table creation unchanged during this slice.
- Preserve legacy browser prefetch temporarily, but do not let it become authority for the RPC path.
- Handle or preflight legacy/null-company counter rows before v2 generation is wired into RPC create.
- Add SQL smoke tests for generated create, submitted-number ignore behavior, authorization, counter increment, legacy function preservation, and no-rule/counter-conflict behavior.

10E6A result: completed as design-only in `docs/ORDER_CREATION_V2_NUMBERING_RPC_DESIGN.md`. The design recommends migrating `public.rpc_create_order(payload jsonb)` first, preserving existing authorization and attachment guards, generating the visible number server-side through `next_order_number_v2(...)`, ignoring submitted `payload.order_number` in the normal RPC path, keeping direct table creation unchanged until 10E7, keeping the v2 helper non-browser-callable, and explicitly addressing legacy/null-company counter compatibility before implementation.

10E6B result: implemented in `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql`. The guarded RPC create path now generates `orders.order_number` server-side with `next_order_number_v2(current_company_id(), now())`, ignores submitted `payload.order_number`, and returns the created row with the generated value. Existing authorization, current-company client/AMC attachment guards, function signature, return type, and authenticated execute grant are preserved. Direct table creation, browser prefetch, order update/manual override paths, legacy numbering RPCs, availability checks, uniqueness constraints, Owner Setup, and bootstrap remain unchanged. The v2 helper remains non-browser-callable. If a legacy/null-company counter already owns the same mapped rule/year, the RPC surfaces the v2 helper's fail-closed error instead of falling back to legacy numbering.

### 10E7 Frontend Create Path Migration

Move active frontend creation away from browser-prefetched numbers.

Likely scope:

- Add or update a frontend create API wrapper for `rpc_create_order`.
- Move `OrderForm` create submit to the RPC-backed create service.
- Remove `OrderForm` prefetch from `rpc_get_next_order_number(...)` after the RPC submit path is in place.
- Treat generated number as returned data after create.
- Make create-mode order-number UI display-only/generated-later.
- Remove global availability checks from create mode.
- Keep display/search stable.
- Preserve edit mode until manual override rules are implemented.

10E7A result: completed as design-only in `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md`. The design maps the active `OrderForm` state flow, legacy prefetch, direct table create service, secondary direct create API, editable `AssignmentFields` order-number input, and dormant/global `OrderNumberField` availability check. It recommends 10E7B add a focused RPC create wrapper first, followed by `OrderForm` submit migration, browser prefetch removal, create-mode generated-later display, create-mode global availability cleanup, and later manual override design.

10E7B result: implemented as an unwired frontend API wrapper. `src/lib/services/ordersService.js` now exports `createOrderViaRpc(payload)`, which calls only `supabase.rpc("rpc_create_order", { payload })`, returns the created order row, and propagates RPC errors. Focused tests in `src/lib/services/__tests__/ordersServiceCreateOrderViaRpc.test.js` verify the wrapper does not direct insert into `orders`, does not call legacy numbering or availability RPCs, passes payload through, and returns the server result including `order_number`. `OrderForm` submit, browser prefetch, direct table create helpers, edit/update behavior, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7C result: implemented in `src/components/orders/form/OrderForm.jsx`. The active new-order submit branch now calls `createOrderViaRpc(payload)`, so guarded RPC create/server-side v2 numbering is the active form create path. The edit branch remains on `updateOrder(order.id, payload)`. Browser prefetch with `rpc_get_next_order_number()`, create-mode order-number UI, `OrderNumberField`, direct table helper definitions, update/manual override behavior, availability checks, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7D result: implemented in `src/components/orders/form/OrderForm.jsx`. New-order create mode no longer calls legacy `rpc_get_next_order_number()` and no longer populates form state with a browser-prefetched order number. The create preview now reads `Generated on save`, and a blank create payload sends `order_number: null`; the guarded RPC/server-side v2 generation remains authoritative. Edit mode, update/manual override behavior, legacy numbering function definitions, `OrderNumberField`, direct table helper definitions, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7E result: implemented in `src/components/orders/form/AssignmentFields.jsx`. New-order create mode now shows a read-only/generated-later order-number state (`Generated on save` / `Assigned automatically when saved.`) instead of an editable `Order #` input. The create payload still sends `order_number: null` through the current payload builder when no number exists, and the guarded RPC remains the authoritative generator. Edit mode keeps the existing editable order-number input; update/manual override behavior, backend/RPCs, legacy functions, `OrderNumberField`, direct table helper definitions, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7F result: implemented in `src/components/orders/form/OrderForm.jsx`. New-order create payloads now omit `order_number` entirely, and active create mode has no order-number availability check. `OrderNumberField` is not used in the active create path and remains unchanged for nonblank/manual-style values outside that path. Edit mode still includes `order_number` in update payloads; update/manual override behavior, backend/RPCs, legacy functions, direct table helper definitions, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

### 10E8 Availability / Manual Override Checks

Replace global availability checks with company-scoped guarded checks.

Likely scope:

- Add company-scoped availability RPC.
- Update or retire `OrderNumberField` global direct table lookup.
- Update `ordersService.isOrderNumberAvailable(...)`.
- Validate manual override through backend authority.
- Avoid exposing cross-company existence.

10E8A result: completed as design-only in `docs/ORDER_NUMBER_MANUAL_OVERRIDE_DESIGN.md`. The design recommends a guarded `rpc_is_order_number_available_v2(p_order_number text, p_order_id uuid default null)` scoped to `current_company_id()`, returning structured JSON and safe warnings while global uniqueness remains. Manual override remains deferred and should become an explicit backend RPC/action with order update authority, a selected override permission strategy, company-scoped availability validation, reason support if chosen, and order activity/audit logging. Create mode remains excluded from manual override and availability checks.

10E8B result: implemented additively in `supabase/migrations/20260518063000_order_number_availability_v2.sql`. The new `public.rpc_is_order_number_available_v2(p_order_number text, p_order_id uuid default null) returns jsonb` is read-only, current-company scoped, rejects blank order numbers, ignores the supplied current order only when it belongs to the current company, and returns `available`, normalized `order_number`, `company_id`, `conflicting_order_id`, and `scope: company`. It is granted to `authenticated` and `service_role` only, with `public`/`anon` revoked. It does not change legacy `rpc_is_order_number_available(...)`, frontend calls, edit/update behavior, manual override behavior, create mode, uniqueness constraints, Owner Setup, or bootstrap.

10E8C result: implemented in `src/lib/services/ordersService.js`, `src/components/inputs/OrderNumberField.jsx`, and `src/components/orders/form/AssignmentFields.jsx`. Edit-mode order-number availability now calls `rpc_is_order_number_available_v2(...)` through `ordersService.isOrderNumberAvailableV2(orderNo, { orderId })`, and `AssignmentFields` passes the current order id so the current order can be excluded by the RPC. Create mode still does not call availability checks, edit/update submit behavior remains unchanged, manual override remains deferred, the legacy global availability RPC remains in place, and uniqueness/backend behavior was not changed.

10E8D result: completed as design-only in `docs/ORDER_NUMBER_MANUAL_OVERRIDE_BACKEND_CONTRACT.md`. The backend contract recommends a dedicated `rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb` as the future manual override path. The RPC should require current-company membership, company-owned order scope, explicit override authority, nonblank/format validation, company-scoped availability validation, an order-level `activity_log` event with old/new number and reason, and a narrow non-authoritative result shape. Generic order update should later reject or ignore `order_number`; no runtime behavior changed in 10E8D.

10E8E result: implemented in `supabase/migrations/20260518064000_order_number_override_rpc.sql`. The new `public.rpc_order_number_override(p_order_id uuid, p_order_number text, p_reason text default null) returns jsonb` is an explicit backend override path only. Authenticated callers require active current-company context and `orders.update.all`; `service_role` is allowed. The RPC validates format/length, checks same-company availability, updates only `orders.order_number`, writes `activity_log.event_type = 'order_number.manual_override'` on effective changes, returns `updated` or `unchanged`, and carries a warning that global uniqueness remains enforced. No frontend API/UI wiring, generic update cleanup, create-mode override, uniqueness/index change, Owner Setup configuration, bootstrap seeding, or legacy function removal was added.

10E8F result: implemented as an unwired service wrapper in `src/lib/services/ordersService.js`. `overrideOrderNumber(orderId, orderNumber, reason = null)` calls only `rpc_order_number_override(...)`, returns the backend JSON result, and propagates RPC errors. Focused tests verify the wrapper does not direct-update `orders`, does not call `updateOrder`, and does not call legacy or v2 availability RPCs. Normal edit submit, UI behavior, create mode, backend/RPC definitions, uniqueness constraints, Owner Setup, bootstrap, and legacy functions remain unchanged.

10E8G result: completed as design-only in `docs/ORDER_NUMBER_OVERRIDE_UI_DESIGN.md`. The recommended UI makes edit-mode order number read-only by default, adds an explicit `Change order number` action/dialog, collects a candidate number and optional reason, uses company-scoped v2 availability as guidance only, submits later through `overrideOrderNumber(...)`, and then updates local order state or refetches. The design keeps create mode excluded, normal edit submit separate, generic edit payload cleanup deferred to 10E8J, and uniqueness/index changes out of the UI slice. No runtime UI, backend/RPC behavior, tests, Owner Setup, bootstrap, or legacy functions changed.

10E8H result: implemented the edit-mode UI shell in `src/components/orders/form/AssignmentFields.jsx`. The current order number is read-only by default, `Change order number` opens a local dialog shell with candidate number and optional reason fields, and `Save order number` remains disabled until API wiring. The shell does not call `overrideOrderNumber(...)`, does not call availability RPCs, does not mutate order/form state, and does not change normal edit submit behavior. Create mode remains generated on save and unchanged.

10E8I result: implemented explicit override action wiring in `src/components/orders/form/AssignmentFields.jsx`. The shell now calls `overrideOrderNumber(orderId, candidate, reason || null)` only from the dedicated `Save order number` action, shows loading/safe errors, uses `isOrderNumberAvailableV2(...)` only for company-scoped guidance, and updates the displayed form order number on success. Create mode remains generated on save with no override action. Normal edit submit remains on the existing update path and still needs the planned 10E8J cleanup to stop carrying `order_number`.

10E8J result: implemented normal edit payload cleanup in `src/components/orders/form/OrderForm.jsx`. `buildOrderPayload(..., { isEdit: true })` no longer includes `order_number`, while create payloads continue to omit it. The order number remains in local form state for read-only display and explicit override updates, and `overrideOrderNumber(...)` is now the only frontend mutation path for order-number changes. Backend generic update RPCs/direct helper definitions, uniqueness constraints, create mode, Owner Setup, bootstrap, and legacy functions remain unchanged.

10E8K result: completed as design-only in `docs/ORDER_NUMBER_GENERIC_UPDATE_HARDENING_DESIGN.md`. The design maps remaining backend/direct update risk after frontend payload cleanup: `rpc_update_order(order_id uuid, patch jsonb)` and `rpc_order_update(p_order_id uuid, p jsonb)` still accept `order_number` patch keys, `ordersService.updateOrder(orderId, patch)` is still a generic direct update helper, `src/lib/api/orders.js` contains direct order update helpers for non-number fields, and the `orders_update_company_authorized` RLS policy is row-scoped rather than column-specific. The recommended next slices are 10E8L RPC-level rejection of `order_number` in generic update RPCs, 10E8M direct table update policy risk inspection/limiting, and 10E8N an optional database trigger guard if direct table risk remains. No backend/runtime behavior changed in 10E8K.

10E8L result: implemented in `supabase/migrations/20260518065000_generic_order_update_reject_order_number.sql`. Generic UUID update RPCs now reject `order_number` patch keys with an error directing callers to `rpc_order_number_override(...)`; the quarantined text-id overload remains service-role-only and rejects `order_number` before raising its quarantine exception. Existing function signatures, return types, grants, update authorization/scoping, client/AMC attachment guards, and ordinary-field updates are preserved. Direct table update policy/helper risk, uniqueness/index changes, frontend behavior, create mode, Owner Setup, bootstrap, and legacy function removal remain unchanged and deferred.

### 10E9 Refactor Closeout / Remaining Risk Audit

Close the current order-numbering refactor arc before continuing deeper compatibility cleanup.

10E9 result: completed as documentation plus read-only inspection in `docs/ORDER_NUMBERING_REFACTOR_CLOSEOUT_AUDIT.md`. The closeout confirms the active create/edit/order-number mutation paths are materially safer: create is server-numbered through guarded RPC, create mode no longer prefetches or submits `order_number`, normal edit submit no longer carries `order_number`, explicit override is backend-guarded/audited, and generic update RPCs reject `order_number`. Remaining medium risks are direct table create/update helper exposure, row-scoped direct update RLS, global uniqueness, and legacy/null-company counter compatibility. The recommended pause point is to stop Phase 10E here unless direct table order writes are confirmed to be actively used in production-critical paths that can pass `order_number`.

### Later: Uniqueness / Index Migration Plan

Migrate uniqueness only after all active writes are company-aware.

Likely scope:

- Add `(company_id, order_number)` unique index where `order_number is not null`.
- Run duplicate/collision checks.
- Keep global uniqueness temporarily during validation if needed.
- Drop or relax global uniqueness only after company-scoped safety is proven.
- Document rollback behavior.

### 10E10 Owner Setup Read-Only Numbering Card

Add read-only setup visibility only after backend readiness signals exist.

Likely scope:

- Show whether the current company has an active numbering rule.
- Show whether order creation uses company-safe generation.
- Keep configuration disabled/deferred.
- Do not seed rules from Owner Setup.

### Later: Configurable Numbering Rules

Only after backend generation, uniqueness, and manual override authority are stable:

- Add guarded numbering configuration RPC.
- Add audit-backed rule changes.
- Add Owner Setup configuration.
- Consider bootstrap default seeding.

## Compatibility Strategy

### Existing Orders

Existing `orders.order_number` values should remain the visible labels.

Migration should:

- preserve existing order numbers unchanged;
- backfill or verify `orders.company_id`;
- check duplicates by `(company_id, order_number)`;
- check global duplicate assumptions before changing indexes;
- avoid rewriting visible order labels unless a collision repair plan is explicitly approved.

### Existing `falcon_default` Rule And Counters

The current `falcon_default` rule should map to `public.default_company_id()` during compatibility.

Recommended approach:

- Treat `company_key = 'falcon_default'` as a legacy compatibility key only.
- Backfill `company_id = default_company_id()` on that rule if using in-place migration.
- Backfill counters with the same company context.
- Keep existing counters intact until v2 generation has proven parity for the default company.

### Existing Direct Table Create Paths

Direct table inserts currently submit `order_number` from frontend payloads.

Recommended transition:

- Do not break direct table writes in the first compatibility slice.
- Move active UI creation to RPC/server-generated numbering before tightening direct table behavior.
- Later consider triggers or policy changes only after RPC creation is the active path.
- Treat direct insert with supplied `order_number` as a manual override risk until guarded.

### Existing RPC Create Paths

`rpc_create_order(jsonb)` is the safest first active backend adoption point because it already gates create authorization and client/AMC attachment.

Recommended transition:

- Update RPC creation before direct table creation.
- Generate server-side when `order_number` is absent.
- Temporarily tolerate submitted numbers only through explicit manual override validation.
- Keep update RPC behavior separate from create generation.

### Existing Manual Overrides

Manual override behavior currently exists through editable form state and order update paths.

Recommended transition:

- Preserve existing values.
- Stop treating browser-prefetched values as manual intent once server generation exists.
- Require explicit backend validation for any changed order number.
- Add audit events for changed order numbers.

### Collision Avoidance During Transition

Avoid duplicate/collision risk by sequencing:

1. Add company-backed storage.
2. Add v2 generation helper.
3. Adopt v2 in RPC create path.
4. Move frontend create to RPC.
5. Replace availability/manual override checks.
6. Add company-scoped uniqueness.
7. Only then relax global uniqueness if required.

## Uniqueness Strategy

Current state:

- `orders.order_number` has global uniqueness through both a unique constraint and a unique partial index.

Target state:

- `orders.order_number` should be unique per company for non-null values.
- Target uniqueness should be `(company_id, order_number) where order_number is not null`.

Recommended migration posture:

- Keep global uniqueness temporarily while v2 generation and frontend/RPC migration are in progress.
- Add company-scoped uniqueness only after checking existing `company_id` coverage and duplicate state.
- Do not drop global uniqueness until:
  - all active create paths are company-aware;
  - all manual override checks are company-scoped;
  - all direct table create/update risks are addressed;
  - company-scoped unique index exists and is validated;
  - collision repair process is documented.

Risks of dropping global uniqueness too early:

- duplicate visible numbers across the same company if company-scoped uniqueness is not active;
- direct table writes bypassing v2 generation;
- manual override collisions;
- difficult rollback if duplicates are created before constraints are stable.

Risks of keeping global uniqueness too long:

- different companies cannot use the same natural sequence;
- new companies may be blocked by default numbering collisions once server-side company generation starts producing overlapping formats.

Recommendation: keep global uniqueness during initial compatibility and v2 adoption; plan the global-to-company uniqueness change as a dedicated slice after active write paths are under server-side authority.

## Frontend Transition Strategy

### Remove Browser Prefetch

Target frontend create flow:

- Do not call `rpc_get_next_order_number(...)` on form load.
- Show a pending label such as "Assigned on create" if a number is not yet available.
- Submit create request without `order_number` unless the user is intentionally performing a validated manual override.
- Display the returned `order_number` after create.

### Keep Display And Search Stable

Display/search behavior should continue using `orders.order_number`.

Do not rename or remove the visible order-number field during migration. Views, tables, notifications, activity, calendar rows, assignment packets, and email templates should keep receiving the same label field.

### Manual Input

Manual order-number input should not remain a casual field in standard create flow.

Recommended transition:

- Hide or disable manual input for normal users after server generation is live.
- Expose manual override only through an explicit advanced/admin action if product requires it.
- Validate override through a backend RPC, not direct table lookup.
- Make safe copy clear that manual override changes the visible reference only and does not grant access.

### Availability Checks

Replace global availability checks with a company-scoped backend check.

The target check should:

- resolve current company server-side;
- ignore the current order id when editing;
- return only available/unavailable for the current company;
- not reveal cross-company order-number existence.

### Avoid User-Facing Disruption

During transition:

- Keep existing order labels and search stable.
- Avoid forcing users to understand numbering rules before creating orders.
- Prefer server-side default generation over Owner Setup configuration.
- Keep Owner Setup numbering read-only until setup configuration is safe.

## Bootstrap Relationship

Bootstrap should not seed numbering rules until the company-safe model is live.

Later bootstrap seeding may be considered only after:

- company-id-backed numbering rules exist;
- company-id-backed counters exist;
- order creation uses server-side company generation;
- uniqueness is company-scoped and validated;
- readiness can verify numbering state;
- default rule behavior is product-approved.

## Owner Setup Relationship

Owner Setup should remain read-only/deferred for numbering until the backend is stable.

Near-term Owner Setup may eventually show:

- numbering status;
- active rule presence;
- whether order creation uses company-safe generation;
- warnings if numbering is not ready.

Owner Setup must not:

- configure numbering before guarded backend RPCs exist;
- seed numbering rules;
- write broad settings JSON;
- treat numbering readiness as route/access authority.

## Rollback And Safety Considerations

Use additive slices and preserve compatibility until each write path is migrated.

Rollback posture:

- Adding company-id storage is low-risk if nullable/backfilled and not active authority yet.
- V2 helper can be introduced without changing callers.
- RPC create adoption can be rolled back to prior behavior if frontend still tolerates returned order rows.
- Frontend prefetch removal should happen after RPC create is stable.
- Uniqueness changes are highest risk and should be isolated in their own phase with preflight checks.

Operational safety checks before uniqueness migration:

- count orders with null `company_id`;
- count duplicate `(company_id, order_number)` pairs;
- count duplicate global `order_number` values, if any;
- verify active create paths;
- verify manual override paths;
- verify catalog grants for old and new functions.

## Hard No-Go Rules

- No frontend-generated authoritative numbers.
- No direct table writes that bypass server-side generation in the target model.
- No `company_key` as tenant authority.
- No dropping global uniqueness before company-scoped safety is proven.
- No bootstrap seeding until the model is live.
- No Owner Setup config before backend stability.
- No broad `companies.settings` numbering state.
- No readiness authority.
- No Vendor/Client activation through numbering setup.
- No product-mode/module authority through numbering setup.

## Recommended 10E3 Direction

10E3 should be documentation plus read-only database/catalog analysis or a narrow migration-readiness design slice.

Recommended output:

- exact catalog queries for current grants and dependencies;
- current data shape checks for `orders.company_id` and order-number duplicates;
- decision on in-place compatibility columns vs successor v2 tables;
- implementation preconditions for 10E4;
- rollback notes for additive numbering storage.

No runtime behavior should change in 10E3.

10E3 completion note: `docs/ORDER_NUMBERING_COMPATIBILITY_ANALYSIS.md` defines the preflight queries, compatibility assumptions, 10E4 blockers, and recommended additive storage direction.
