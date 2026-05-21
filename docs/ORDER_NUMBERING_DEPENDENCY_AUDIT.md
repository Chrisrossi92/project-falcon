# Order Numbering Dependency Audit

## Purpose

Phase 10E1 inspects Falcon's current order creation and order-numbering dependency chain before any company-safe numbering design or implementation.

This is documentation-only plus read-only code/schema inspection. It does not add migrations, backend behavior, runtime code, UI changes, route changes, registry changes, tests, permission seeds, RLS/RPC edits, order-numbering changes, bootstrap seeding, Owner Setup configuration, readiness authority, product-mode authority, module-authoritative security, or Vendor/Client activation.

The goal is to map confirmed dependencies so Phase 10E2 can design a safe migration strategy.

Phase 10E2 completes that strategy in `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`. The strategy keeps implementation deferred and recommends additive compatibility storage, a v2 server-side generator, RPC order-create adoption before frontend migration, company-scoped availability/manual override checks, and a dedicated uniqueness migration only after active write paths are company-aware.

Phase 10E3 adds the read-only compatibility analysis in `docs/ORDER_NUMBERING_COMPATIBILITY_ANALYSIS.md`. That document defines preflight SQL for order/company/rule/counter mapping, duplicate detection, null/blank order-number detection, manual-looking order-number detection, grants inspection, and 10E4 blockers before additive storage is introduced.

Phase 10E6A adds the RPC migration design in `docs/ORDER_CREATION_V2_NUMBERING_RPC_DESIGN.md`. That design selects guarded `public.rpc_create_order(payload jsonb)` as the first create path to adopt `next_order_number_v2(...)`, while keeping direct table creation, browser prefetch, update/manual override paths, global uniqueness, and Owner Setup unchanged until later phases.

Phase 10E6B implements that first guarded RPC step in `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql`. The dependency map remains important because the active `OrderForm` path still uses direct table insert and legacy browser prefetch until 10E7.

Phase 10E7A documents the frontend migration plan in `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md`. It confirms the active create path still flows through `OrderForm` -> `ordersService.createOrder` -> direct `orders` insert, with `OrderForm` prefetching `rpc_get_next_order_number()` and `AssignmentFields` exposing an editable order-number input.

Phase 10E8C wires edit-mode availability checks to the company-scoped v2 RPC. `OrderNumberField` no longer performs a direct/global `orders` lookup for availability, and `ordersService.isOrderNumberAvailableV2(...)` now calls `rpc_is_order_number_available_v2(...)`. Create mode remains server-numbered and excluded from availability checks, while edit/update submit behavior and manual override behavior remain unchanged.

Phase 10E8D adds the backend manual override contract in `docs/ORDER_NUMBER_MANUAL_OVERRIDE_BACKEND_CONTRACT.md`. The contract confirms current generic/direct update paths still treat `order_number` as ordinary patch data, then recommends a dedicated future override RPC with current-company scope, explicit override authority, company-scoped availability validation, and order activity logging before any edit/update behavior changes.

Phase 10E8E implements that backend-only override RPC in `supabase/migrations/20260518064000_order_number_override_rpc.sql`. The active frontend edit/update path still uses the existing direct update service, but a guarded backend override path now exists for later frontend/API wiring.

Phase 10E8J removes `order_number` from the active normal `OrderForm` edit/update payload. The active frontend normal edit path still uses the existing direct update service for ordinary fields, but order-number changes now flow only through the explicit `overrideOrderNumber(...)` UI action added in 10E8I. Backend generic update RPCs/direct helper definitions remain unchanged and still need later hardening.

Phase 10E8K adds the backend hardening design in `docs/ORDER_NUMBER_GENERIC_UPDATE_HARDENING_DESIGN.md`. It confirms remaining backend/direct update risk surfaces after frontend cleanup and recommends hardening generic order update RPCs before broader direct table policy or trigger work.

Phase 10E8L implements the first backend hardening step in `supabase/migrations/20260518065000_generic_order_update_reject_order_number.sql`. Generic UUID order update RPCs now reject `order_number` patches; direct table policy/helper risk remains a later dependency.

Phase 10E9 adds the closeout/risk audit in `docs/ORDER_NUMBERING_REFACTOR_CLOSEOUT_AUDIT.md`. It records the current active create/edit/override state, groups remaining legacy risks by timing, and recommends pausing the current refactor arc unless direct table order writes are confirmed as production-critical `order_number` mutation paths.

## Sources Inspected

Documentation inspected:

- `docs/OWNER_SETUP_ACTIONABLE_FOUNDATION_HANDOFF.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/COMPANY_SETUP_STORAGE_DECISION.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Schema and migrations inspected:

- `supabase/migrations/20260518000000_baseline_extensions_and_schema.sql`
- `supabase/migrations/20260518001000_baseline_rls_policies_triggers_grants.sql`
- `supabase/migrations/20260518002000_baseline_static_seed_data.sql`
- `supabase/migrations/20260518003000_company_foundation_default_scope.sql`
- `supabase/migrations/20260518004000_company_scope_order_projection_preservation.sql`
- `supabase/migrations/20260518017000_company_order_intake_attachment_authorization.sql`
- `supabase/migrations/20260518018000_company_order_legacy_rpc_import_quarantine.sql`
- `supabase/migrations/20260518019000_company_order_write_policy_cleanup.sql`
- `supabase/migrations/20260518026000_company_explicit_authenticated_grants.sql`
- `supabase/migrations/20260518057000_company_bootstrap_v1_wrapper.sql`
- `supabase/migrations/20260518058000_company_bootstrap_v1_post_validation.sql`

Frontend code inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/components/inputs/OrderNumberField.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/features/orders/api.js`
- `src/lib/hooks/useOrders.js`
- `src/lib/hooks/useMyorders.js`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/features/orders/columns/ordersColumns.jsx`
- tests referencing order-numbering readiness in diagnostics/Owner Setup resolver coverage

## Current Backend Numbering Objects

Confirmed legacy/default numbering objects:

- `public.order_counters`
  - primary key `year`
  - `last_seq integer not null default 0`
  - used by legacy `next_order_number(p_year integer)`
- `public.next_order_number(p_year integer) returns text`
  - security definer
  - increments `order_counters.last_seq` for the supplied year
  - returns `YYYY` plus a three-digit sequence
- `public.order_numbering_rules`
  - primary key `id bigint`
  - `company_key text not null unique`
  - `format_kind text not null default 'year_seq_3'`
  - `year_digits integer not null default 4`
  - `sequence_digits integer not null default 3`
  - `reset_period text not null default 'yearly'`
  - `manual_override_allowed boolean not null default true`
  - `is_active boolean not null default true`
  - timestamps
  - check constraints currently restrict format to yearly `year_seq_3`
- `public.order_number_counters`
  - primary key `id bigint`
  - `rule_id bigint not null references order_numbering_rules(id) on delete cascade`
  - `counter_year integer not null`
  - `last_value integer not null default 0`
  - unique `(rule_id, counter_year)`
- `public.rpc_get_next_order_number(p_company_key text default 'falcon_default', p_effective_at timestamptz default now()) returns text`
  - security definer
  - looks up active `order_numbering_rules` by text `company_key`
  - increments `order_number_counters` with `insert ... on conflict ... do update`
  - returns padded year plus sequence
- `public.rpc_is_order_number_available(p_order_number text, p_ignore_order_id text default null) returns boolean`
  - security definer
  - checks `public.orders.order_number` globally

Seeded default:

- `supabase/migrations/20260518002000_baseline_static_seed_data.sql` seeds `order_numbering_rules.company_key = 'falcon_default'`.

Confirmed company scope on orders:

- `public.orders.company_id` exists with a `NOT VALID` FK to `public.companies(id)`.
- `tg_orders_preserve_company_id()` now resolves inserts to `current_company_id()` and preserves existing ownership on update.
- Order RLS/write policies are company-aware, but numbering rules/counters are not company-id-backed.

## Current Order Uniqueness Model

Confirmed global order-number uniqueness:

- `orders_order_number_key` unique constraint on `orders(order_number)`.
- `orders_order_number_unique_idx` unique partial index on `orders(order_number) where order_number is not null`.
- `idx_orders_order_number` non-unique index on `orders(order_number)`.

No `(company_id, order_number)` uniqueness constraint was found.

Implication: two companies cannot safely use the same visible order-number format or sequence value while global uniqueness remains authoritative.

## Current Generation Paths

### Browser Prefetch In Order Form

`src/components/orders/form/OrderForm.jsx` calls:

- `supabase.rpc("rpc_get_next_order_number")`

The call passes no arguments, so it uses the RPC default:

- `p_company_key = 'falcon_default'`

The returned number is stored in local form state as `values.order_number`. If the user has already typed an order number, the prefetch result does not overwrite it.

### Legacy Function

`public.next_order_number(p_year integer)` still exists and mutates `public.order_counters`, but no active frontend call was found in this inspection. It remains part of the backend dependency chain because it is a mutating numbering function over legacy yearly counters.

## Current Validation Paths

### Direct Table Availability Check

`src/components/inputs/OrderNumberField.jsx` checks:

- `supabase.from("orders").select("id").eq("order_number", value).limit(1)`

This is a global order-number lookup. It does not scope by `company_id`.

### Service Availability Helper

`src/lib/services/ordersService.js` exports `isOrderNumberAvailable(orderNo, { excludeId })`, which checks:

- `orders.order_number = orderNo`
- fallback to legacy `order_no`

This helper also performs a global direct table query and does not scope by `company_id`.

### Backend Availability RPC

`public.rpc_is_order_number_available(p_order_number text, p_ignore_order_id text default null)` checks `public.orders.order_number` globally and does not scope by `company_id`.

No active frontend call site for this RPC was found during 10E1 inspection, but it remains a backend dependency.

## Current Order Creation Paths

### Active Form Path Through `ordersService`

`src/components/orders/form/OrderForm.jsx` imports `createOrder` and `updateOrder` from `src/lib/services/ordersService.js`.

On create, `OrderForm` builds a payload that includes:

- 10E8J update: the active `OrderForm` edit payload no longer includes `order_number`.

`ordersService.createOrder(payload)` performs a direct table insert:

- `supabase.from(ORDERS_TABLE).insert(payload).select("*").maybeSingle()`

RLS and triggers enforce current-company order ownership and authorization, but the browser-submitted `order_number` is inserted as supplied.

### Secondary API Helper

`src/lib/api/orders.js` also exports `createOrder(payload = {})`.

It maps:

- `order_number: payload.order_number || payload.order_no || null`

Then inserts directly into `orders`.

No active `OrderForm` import from this helper was found, but it is an available code path and should be treated as a dependency until call-site usage is fully retired or constrained.

### Guarded Order RPC

`public.rpc_create_order(payload jsonb)` exists in the baseline and is replaced by `supabase/migrations/20260518017000_company_order_intake_attachment_authorization.sql`.

The current guarded version:

- requires `current_app_user_can_create_order()`;
- validates linked client and managing AMC attachment safety;
- inserts `order_number` from `nullif(payload->>'order_number','')`;
- does not generate an order number server-side;
- relies on the order company trigger to own `company_id`.

Authenticated execute is explicitly granted in `20260518026000_company_explicit_authenticated_grants.sql`.

### Quarantined Legacy Import/Create Paths

`rpc_order_create(jsonb)` is quarantined and raises a deprecated exception.

`import_orders_from_json(jsonb)` is service-role-only and deprecated for multi-company imports. Baseline import logic used external/order-number fields, but this path is outside active browser order creation.

## Current Order Update / Manual Override Paths

### Active Form Path Through `ordersService`

`OrderForm` uses the same payload builder for edit mode and includes:

- `order_number: values.order_number || null`

`ordersService.updateOrder(orderId, patch)` performs:

- `supabase.from(ORDERS_TABLE).update(patch).eq("id", orderId)`

The active `OrderForm` normal edit submit no longer sends `order_number`, so normal edit submit is no longer a frontend order-number mutation path. The lower-level direct update helper can still update any supplied patch field and should be hardened or narrowed later.

### Assignment Fields Manual Input

`src/components/orders/form/AssignmentFields.jsx` renders an editable `Order #` input:

- 10E8J update: `AssignmentFields` displays the edit-mode order number read-only and uses an explicit override action rather than ordinary field editing.

This confirms a manual order-number editing path in the active order form.

### Guarded Order Update RPCs

The current guarded RPCs:

- `public.rpc_update_order(order_id uuid, patch jsonb)`
- `public.rpc_order_update(p_order_id uuid, p jsonb)`

Both require update authorization and then set:

- `order_number = coalesce(nullif(...), existing order_number)`

They do not validate manual override against a company numbering rule and do not check company-scoped uniqueness beyond the existing global database constraints.

Authenticated execute is explicitly granted in `20260518026000_company_explicit_authenticated_grants.sql`.

### Quarantined Legacy Text Update Path

`public.rpc_order_update(p_order_id text, p_patch jsonb)` is quarantined and raises a deprecated exception for authenticated callers. Service-role compatibility remains granted, but the body still raises.

## Current Display / Search Dependencies

`orders.order_number` is widely used as the visible order label.

Confirmed usage includes:

- `v_orders_frontend_v4`, `v_orders_active_frontend_v4`, `v_orders_list`, and related order views.
- `src/features/orders/api.js` search filters using `order_number.ilike`.
- `src/lib/services/ordersService.js` search filters using `order_number.ilike`.
- `src/lib/hooks/useOrders.js` default `orderBy: "order_number"`.
- `src/lib/hooks/useMyorders.js`.
- `src/features/orders/UnifiedOrdersTable.jsx`.
- `src/features/orders/columns/ordersColumns.jsx`.
- `OrderDetail`, `OrderDrawerContent`, calendar display, notification display, activity note metadata, assignment packet display, and email templates.

These are display/search dependencies, not numbering authorities, but any migration must preserve `orders.order_number` as a stable visible label.

## Current RLS / Grant Observations

Confirmed:

- `orders` has company-aware insert/update/delete policies after Slice 7F1.
- `rpc_create_order(jsonb)`, `rpc_update_order(uuid, jsonb)`, and `rpc_order_update(uuid, jsonb)` are granted to `authenticated`.
- `order_counters` has RLS enabled in the baseline.

Not confirmed from migration text alone:

- Explicit grants/revokes for `rpc_get_next_order_number(...)` and `rpc_is_order_number_available(...)`.
- RLS policies for `order_numbering_rules` or `order_number_counters`.

Because `OrderForm` calls `rpc_get_next_order_number` from browser code today, the function is part of active client behavior. Final grant state should be verified against a replayed database catalog before changing exposure.

## Current Critical Risks

Confirmed critical risks:

- Global uniqueness: `orders.order_number` is globally unique instead of unique by `(company_id, order_number)`.
- Legacy company key: active number generation defaults to text `company_key = 'falcon_default'`, not `current_company_id()`.
- Browser prefetch: `OrderForm` requests the next number before order creation, then submits it later as editable form state.
- Manual override/edit path: create and normal edit payloads no longer include `order_number`, and `AssignmentFields` now uses an explicit override action. Backend generic update RPCs/direct helper definitions still accept order-number changes if called directly and remain future hardening work.
- Direct table writes: active frontend create/update paths insert/update `orders` directly through Supabase table writes.
- RPC create/update paths: guarded order RPCs also accept submitted `order_number` and do not generate or validate against a company-safe rule.
- Global validation: direct availability checks and `rpc_is_order_number_available(...)` check global `orders.order_number`, not current-company scope.
- Multiple create/update paths: both direct table paths and guarded RPC paths can write order numbers.
- Bootstrap gap: bootstrap correctly does not seed numbering because no company-id-backed numbering model exists.

Confirmed concurrency concern:

- `rpc_get_next_order_number(...)` increments counters atomically, but reservation is separated from order creation. A prefetched number can be abandoned or edited before insert, causing gaps and making the browser responsible for carrying a reserved value.
- Global unique constraints protect against duplicate insertion, but they do not solve company-specific sequence ownership or browser reservation drift.

## Migration Risks

Known migration risks:

- Dropping global uniqueness too early could allow duplicates before company-scoped constraints and order creation generation are ready.
- Keeping global uniqueness too long prevents different companies from using the same natural sequence.
- Existing orders may need collision analysis before introducing `(company_id, order_number)` uniqueness.
- Existing frontend create code no longer expects `order_number` before create, and normal edit no longer treats order number as an ordinary editable field.
- Existing direct table create/update paths may bypass future numbering helpers unless migrated or blocked.
- Existing RPC update paths currently accept `order_number`; active frontend normal edit no longer sends it, but backend hardening remains future work.
- Assignment packets, notifications, activity, calendar, search, and email templates depend on `orders.order_number` for display.
- Legacy `order_counters` and `next_order_number(...)` may be dead or operator-only, but should not be dropped until database dependency checks confirm that.
- Function exposure for numbering RPCs needs catalog verification before tightening.

## Open Questions

Open questions for 10E2:

- Should existing `order_numbering_rules` and `order_number_counters` be migrated in place with `company_id`, or should successor v2 tables be created?
- How should the default `falcon_default` rule be mapped to `default_company_id()` during transition?
- Should order creation generate numbers only when `order_number` is absent, or should it always ignore browser-supplied generated values?
- Should manual override remain allowed for users with `orders.update.all`, a new numbering permission, or rule-specific `manual_override_allowed` only?
- Should direct table writes remain supported after server-side generation, or should order create move behind an RPC?
- How should update paths distinguish preserving an existing order number from changing it?
- How should global uniqueness be migrated to `(company_id, order_number)` without downtime?
- Should `rpc_get_next_order_number(...)` be preserved as a compatibility wrapper, quarantined, or replaced by v2?
- What should happen when a company has no active numbering rule at first order creation?
- How should abandoned prefetched numbers be handled during the transition?

## Recommended 10E2 Direction

10E2 should be design-only: Company-Safe Order Numbering Migration Strategy.

Recommended scope:

- Design a compatibility layer that can coexist with current `orders.order_number` display usage.
- Decide whether to add `company_id` to existing numbering tables or create successor v2 tables.
- Design `rpc_get_next_order_number_v2(...)` or an internal helper that resolves the company server-side from `current_company_id()`.
- Design server-side generation during order create, preferably in a guarded order-create RPC or trigger/helper path.
- Design transition behavior for direct table create/update paths.
- Design manual override guard strategy.
- Design migration from global `orders.order_number` uniqueness to `(company_id, order_number)`.
- Design catalog checks for grants and dependencies on legacy numbering functions.
- Keep Owner Setup numbering card read-only/deferred.
- Keep bootstrap numbering seeding disabled until the company-safe model is live.

10E2 result: complete in `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`.

## 10E6A RPC Create Migration Design Result

10E6A confirms `public.rpc_create_order(payload jsonb)` is the first appropriate migration point because it already has backend authorization, current-company attachment validation, and transactional insert control.

The design recommends that 10E6B:

- preserves the existing guarded RPC name and return type;
- generates `orders.order_number` with `next_order_number_v2(current_company_id(), now())`;
- accepts but ignores submitted `payload.order_number` for normal create compatibility;
- defers manual override to a future explicit backend contract;
- keeps direct table create/update paths unchanged until 10E7;
- keeps legacy browser prefetch temporarily but non-authoritative for the RPC path;
- keeps `next_order_number_v2(...)` non-browser-callable;
- handles legacy/null-company counter compatibility before replacing the RPC.

No active behavior changed in 10E6A.

10E6B implementation result:

- `public.rpc_create_order(payload jsonb)` now generates server-side order numbers through `next_order_number_v2(current_company_id(), now())`.
- Submitted `payload.order_number` is ignored for normal RPC create.
- Existing create authorization and linked client/AMC guards are preserved.
- `next_order_number_v2(...)` remains service-role-only and is not exposed to browser roles.
- Direct table create/update paths, browser prefetch, manual override/update paths, legacy numbering RPCs, global uniqueness, Owner Setup, and bootstrap remain unchanged.

10E7A frontend migration design result:

- The next frontend target is a create API wrapper for `rpc_create_order`.
- Active `OrderForm` create submit should move to that wrapper after the API boundary is tested.
- Legacy browser prefetch should be removed only after the RPC submit path is in place.
- Create mode should stop treating `order_number` as authoritative form state.
- Edit/update/manual override behavior remains deferred.

10E7B implementation result:

- `src/lib/services/ordersService.js` now exports `createOrderViaRpc(payload)`.
- The wrapper calls only `rpc_create_order` with `{ payload }`.
- The existing direct `createOrder(payload)` helper remains unchanged.
- Active `OrderForm` create submit still uses the direct helper until 10E7C.
- Browser prefetch, `AssignmentFields`, `OrderNumberField`, update/manual override behavior, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7C implementation result:

- Active `OrderForm` create submit now calls `createOrderViaRpc(payload)`.
- Active `OrderForm` edit submit remains on `updateOrder(order.id, payload)`.
- The direct `createOrder(payload)` helper remains available but is no longer the active `OrderForm` create path.
- Browser prefetch, editable create-mode `AssignmentFields` order-number UI, `OrderNumberField`, update/manual override behavior, availability checks, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7D implementation result:

- Active `OrderForm` create mode no longer calls `rpc_get_next_order_number()`.
- The create header now says `Generated on save`.
- Create submit still calls `createOrderViaRpc(payload)`.
- Blank create-mode order-number state produces `order_number: null`; server-side RPC generation remains the source of truth.
- Editable create-mode `AssignmentFields` order-number UI still exists until 10E7E.
- Edit/update/manual override behavior, legacy function definitions, availability checks, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7E implementation result:

- Active new-order create mode now shows `AssignmentFields` order-number state as generated-later/read-only copy.
- Create mode no longer presents a normal editable `Order #` input.
- Create submit still calls `createOrderViaRpc(payload)` and the current payload builder still sends `order_number: null` when no browser number exists.
- Edit mode still renders the existing editable order-number input.
- Update/manual override behavior, backend/RPCs, legacy function definitions, availability checks, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E7F implementation result:

- Active new-order create payloads now omit `order_number`.
- Active create mode has no order-number availability check and does not require an order number.
- Blank `OrderNumberField` state does not perform the global availability lookup; nonblank `OrderNumberField` behavior remains unchanged outside the active create path.
- Edit mode still includes `order_number` in update payloads.
- Update/manual override behavior, backend/RPCs, legacy function definitions, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E8A design result:

- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_DESIGN.md` defines the future company-scoped availability/manual override strategy.
- Current global/direct availability checks are documented as insufficient for SaaS authority.
- Recommended next slice is `rpc_is_order_number_available_v2(p_order_number text, p_order_id uuid default null)` scoped to current company and returning structured JSON.
- Manual override remains deferred until an explicit guarded RPC/action, permission decision, company-scoped validation, and audit/activity event are implemented.
- Create mode remains excluded from availability checks and manual override.

10E8B implementation result:

- `supabase/migrations/20260518063000_order_number_availability_v2.sql` adds `public.rpc_is_order_number_available_v2(p_order_number text, p_order_id uuid default null) returns jsonb`.
- The RPC is current-company scoped, read-only, rejects blank order numbers, returns safe conflict information within the current company, and excludes `p_order_id` only if it belongs to the current company.
- Grants are limited to `authenticated` and `service_role`; `public` and `anon` are revoked.
- Legacy global availability RPC, frontend calls, edit/update/manual override behavior, create mode, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

10E8C through 10E8J implementation result:

- Edit-mode availability checks use `rpc_is_order_number_available_v2(...)` through `ordersService.isOrderNumberAvailableV2(...)`.
- `rpc_order_number_override(...)` exists as the guarded backend override path, and `ordersService.overrideOrderNumber(...)` is the frontend wrapper.
- `AssignmentFields` displays edit-mode order number read-only and exposes an explicit `Change order number` action.
- The explicit action calls `overrideOrderNumber(...)`; normal edit submit does not call the override service.
- `OrderForm` normal edit payload no longer includes `order_number`.
- Create payloads continue to omit `order_number`.
- Backend generic update RPCs and direct helper definitions still need later hardening so direct/generic callers cannot treat `order_number` as ordinary patch data.

10E8K design result:

- `docs/ORDER_NUMBER_GENERIC_UPDATE_HARDENING_DESIGN.md` maps the remaining generic update surfaces.
- `rpc_update_order(order_id uuid, patch jsonb)` and `rpc_order_update(p_order_id uuid, p jsonb)` still coalesce `order_number` from their JSON patches.
- `ordersService.updateOrder(orderId, patch)` remains a generic direct table update helper; active normal edit payloads no longer include `order_number`, but lower-level callers could still pass it.
- `src/lib/api/orders.js` direct update helpers update non-number fields today, but still rely on direct `orders` table update policy.
- `orders_update_company_authorized` is company/permission scoped but not column-specific.
- Recommended next work is RPC-level rejection of `order_number` keys in generic update RPCs, followed by direct table update policy risk inspection and an optional trigger guard if direct table writes cannot be narrowed enough.

10E8L implementation result:

- `rpc_update_order(order_id uuid, patch jsonb)` rejects patches containing `order_number`.
- `rpc_order_update(p_order_id uuid, p jsonb)` rejects patches containing `order_number`.
- Quarantined `rpc_order_update(p_order_id text, p_patch jsonb)` remains service-role-only and rejects `order_number` before raising its quarantine exception.
- Ordinary generic RPC update fields still work.
- `rpc_order_number_override(...)` remains the explicit backend order-number mutation path.
- Direct table update helpers and the row-scoped `orders_update_company_authorized` policy remain unchanged and require follow-up inspection/hardening.

10E9 closeout result:

- `docs/ORDER_NUMBERING_REFACTOR_CLOSEOUT_AUDIT.md` is the decision-ready pause document for this refactor arc.
- No remaining high-risk active-path issue was identified.
- Medium risks remain around direct table create/update helpers, row-scoped direct update policy, global uniqueness, and legacy/null-company counters.
- Recommended action is to pause Phase 10E here unless direct table writes are confirmed to be active production-critical numbering mutation paths.

## Hard No-Go Rules

- Do not implement numbering changes in 10E1.
- Do not alter order creation behavior in 10E1.
- Do not alter uniqueness constraints in 10E1.
- Do not seed numbering from bootstrap.
- Do not wire numbering configuration into Owner Setup.
- Do not make readiness an order creation authority.
- Do not rely on text `company_key` as tenant authority in the target model.
- Do not add frontend-generated numbering to the future model.
- Do not hide numbering state in broad `companies.settings`.
- Do not activate Vendor/Client surfaces through numbering setup.
