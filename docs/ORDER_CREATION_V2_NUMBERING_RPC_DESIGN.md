# Order Creation V2 Numbering RPC Design

## Purpose

Phase 10E6A designs the safe migration of guarded RPC order creation to use `public.next_order_number_v2(...)` before implementation.

This is documentation-only plus read-only code/schema inspection. It does not add migrations, backend behavior, runtime code, frontend changes, routes, registries, UI changes, tests, uniqueness/index changes, bootstrap seeding, Owner Setup numbering configuration, permission seed changes, RLS/RPC edits, or active order creation changes.

The target for the next implementation slice is the guarded RPC order creation path only. Direct table creation, browser prefetch, manual order-number editing, and global uniqueness remain unchanged until later phases.

Phase 10E6B implements this design in `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql`. The migration replaces only `public.rpc_create_order(payload jsonb)`, preserves the existing signature, return type, authorization behavior, current-company client/AMC attachment guards, and authenticated execute grant, and inserts a server-generated `orders.order_number` from `next_order_number_v2(current_company_id(), now())`. Submitted `payload.order_number` is accepted for payload compatibility but ignored by the guarded RPC path. Direct table creation, browser prefetch, order update/manual override behavior, legacy numbering RPCs, uniqueness constraints, Owner Setup, and bootstrap remain unchanged.

Phase 10E7A designs the frontend migration in `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md`. The design keeps implementation deferred and recommends adding a frontend RPC create wrapper first, then moving `OrderForm` create submit to the guarded RPC path, then removing legacy browser prefetch and create-mode global availability checks. Edit/update/manual override behavior remains separate.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/COMPANY_ORDER_NUMBERING_MODEL_DESIGN.md`
- `docs/ORDER_NUMBERING_COMPATIBILITY_ANALYSIS.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

SQL inspected:

- `supabase/migrations/20260518017000_company_order_intake_attachment_authorization.sql`
- `supabase/migrations/20260518019000_company_order_write_policy_cleanup.sql`
- `supabase/migrations/20260518026000_company_explicit_authenticated_grants.sql`
- `supabase/migrations/20260518060000_company_order_numbering_storage.sql`
- `supabase/migrations/20260518061000_company_order_numbering_v2_helper.sql`
- Baseline definitions for `rpc_get_next_order_number(...)` and `rpc_is_order_number_available(...)`

Frontend inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`

## Current Create Path Findings

### Guarded RPC Create Path

`public.rpc_create_order(payload jsonb)` is the first safe candidate for v2 numbering adoption because it already has the correct backend-control shape:

- It is `security definer`.
- It requires `current_app_user_can_create_order()`.
- It validates current-company client and managing-AMC attachment safety.
- It inserts through the backend, allowing server-side number generation in the same transaction as order creation.
- It is granted to `authenticated` through the explicit grant migration.

Current gap:

- It inserts `order_number` from `nullif(payload->>'order_number','')`.
- It does not call `next_order_number_v2(...)`.
- It does not distinguish browser-prefetched values from manual override intent.

### Active Frontend Create Path

The active `OrderForm` path still imports `createOrder` from `src/lib/services/ordersService.js`.

That service performs a direct table insert:

- `supabase.from("orders").insert(payload)`

`OrderForm` also calls:

- `supabase.rpc("rpc_get_next_order_number")`

The prefetched number is stored in local form state and then submitted as `payload.order_number`.

Implication: migrating `rpc_create_order(...)` alone will not change the current active browser create path. That is intentional for 10E6B, but it means 10E7 must migrate the frontend create path before Falcon can rely on v2 numbering for active order creation.

### Secondary Direct Create Path

`src/lib/api/orders.js` also exposes `createOrder(payload = {})` and maps:

- `order_number: payload.order_number || payload.order_no || null`

It then performs a direct table insert. This path should remain unchanged in 10E6B but must be accounted for before direct table creation is retired or constrained.

## RPC Migration Design

10E6B should migrate `public.rpc_create_order(payload jsonb)` first.

Recommended behavior:

1. Preserve the existing function name and return type: `public.rpc_create_order(payload jsonb) returns public.orders`.
2. Preserve existing authorization through `current_app_user_can_create_order()`.
3. Preserve existing client/AMC attachment validation.
4. Resolve the current company through `public.current_company_id()`.
5. Generate the order number with `public.next_order_number_v2(v_company_id, now())`.
6. Insert the generated value into `orders.order_number`.
7. Return the created `public.orders` row, including the server-generated `order_number`.

The migration should not:

- change direct table create behavior;
- change frontend prefetch;
- change update/manual override paths;
- change `rpc_get_next_order_number(...)`;
- expose `next_order_number_v2(...)` to browser roles;
- alter `orders.order_number` uniqueness.

## Submitted `order_number` Handling

For 10E6B, submitted `payload.order_number` should not be treated as authority.

Recommended compatibility rule:

- Accept payloads that still contain `order_number`.
- Ignore that value during normal RPC create.
- Generate the authoritative number server-side with `next_order_number_v2(...)`.
- Return the server-generated number in the created row.

Reasoning:

- Existing form payload builders include `order_number`.
- Rejecting any payload containing `order_number` would make later frontend migration noisier.
- Ignoring the submitted value removes browser authority without requiring same-slice frontend changes.
- Manual override is not safe until it has an explicit backend contract.

10E6B should not implement manual override through `payload.order_number`.

## Counter Compatibility Concern

`next_order_number_v2(...)` intentionally fails closed when a legacy/null-company counter already owns the same `(rule_id, counter_year)` as the mapped company rule.

That behavior is safe for 10E5, but it creates an implementation concern for 10E6B:

- the active browser prefetch still calls legacy `rpc_get_next_order_number()`;
- the legacy RPC can create a null-company row in `order_number_counters`;
- a later v2 RPC create for the same rule/year would fail closed unless the counter is mapped or adopted safely.

Recommended 10E6B precondition:

- Before replacing `rpc_create_order(...)`, deterministically map any existing null-company counters to the mapped rule company when the rule has exactly one known `company_id`.
- If mapping is ambiguous, fail the migration or leave `rpc_create_order(...)` unchanged.

Recommended longer mixed-mode mitigation:

- 10E7 should remove browser prefetch quickly after 10E6B.
- If 10E6B must operate for an extended period while legacy prefetch remains active, update the v2 helper only with a narrowly scoped adoption rule for null-company counters whose rule maps to the requested company. Do not silently fall back to `company_key`.

## Manual Override Strategy

Manual override should not be casual form state.

Future manual override should require:

- an explicit override flag;
- an explicit proposed manual order number;
- an operator reason or audit note;
- a backend permission selected during implementation;
- company-scoped uniqueness validation;
- format/length validation;
- audit logging.

Manual override should not:

- use `payload.order_number` implicitly;
- depend on frontend-only validation;
- leak cross-company order-number existence;
- bypass order create/update authorization;
- use global availability checks as final authority.

10E6B should not implement manual override.

10E6B implementation result:

- `payload.order_number` is ignored during guarded RPC create.
- The created row returns the server-generated v2 number.
- Manual override remains deferred.

## Direct Table Path Compatibility

10E6B should leave direct table creation unchanged.

Known consequences:

- The active `OrderForm` path will still insert the browser-prefetched number directly until 10E7.
- `src/lib/api/orders.js` remains a secondary direct insert dependency.
- Direct table writes continue to rely on current RLS/triggers/global uniqueness.

This is acceptable only as a short transition because 10E6B is proving the guarded RPC path before frontend migration.

10E6B verification confirms a direct table insert can still persist a supplied `order_number`; this is intentionally unchanged until 10E7.

10E7A frontend migration design recommends preserving the direct helper until call-site coverage is clear, adding a dedicated RPC create wrapper first if needed, and only then moving active `OrderForm` create submit away from the direct table path.

## V2 Helper Exposure

`next_order_number_v2(...)` should remain service-role-only.

The order creation RPC can call it internally as a `security definer` function owned by a privileged role. Browser callers should not receive direct execute grants for the v2 helper.

Do not add a browser-callable `rpc_get_next_order_number_v2(...)` in 10E6B. The target architecture is server-side generation during order creation, not browser reservation.

## SQL Smoke Tests for 10E6B

10E6B should prove:

- authorized `rpc_create_order(payload)` creates an order with a server-generated number;
- submitted `payload.order_number` is ignored for normal create;
- the created order has current-company ownership;
- the v2 company-backed counter increments;
- the legacy/null-company counter mapping or adoption precondition is handled explicitly;
- unauthenticated or unauthorized create is rejected;
- client/AMC attachment guards still work;
- direct table create behavior is unchanged;
- legacy `rpc_get_next_order_number()` is unchanged;
- `next_order_number_v2(...)` is not granted to `anon` or `authenticated`;
- no uniqueness/index changes are introduced.

## Recommended 10E6B Implementation

Recommended 10E6B scope:

- One migration.
- Deterministic preflight/backfill for null-company counters on mapped rules if needed.
- `create or replace function public.rpc_create_order(payload jsonb)` only.
- Preserve current guards and linked-record validation.
- Generate with `public.next_order_number_v2(public.current_company_id(), now())`.
- Ignore submitted `order_number` for normal create.
- Return the created `public.orders` row.
- Preserve existing grants/revokes.

10E6B result: complete. The migration follows the recommended scope and leaves active frontend/direct-table behavior untouched.

Do not modify:

- frontend create code;
- direct table insert/update paths;
- order update/manual override paths;
- `rpc_get_next_order_number(...)`;
- `rpc_is_order_number_available(...)`;
- uniqueness/indexes;
- Owner Setup.

## 10E6B No-Go Rules

- No frontend changes.
- No direct table create path changes.
- No order update/manual override changes.
- No uniqueness/index changes.
- No browser access to `next_order_number_v2(...)`.
- No browser-callable v2 prefetch RPC.
- No Owner Setup numbering configuration.
- No bootstrap seeding.
- No manual override unless explicitly guarded in a later contract.
- No fallback to text `company_key` as tenant authority.

## Open Questions Before Implementation

- Should 10E6B update `next_order_number_v2(...)` with controlled null-counter adoption, or should it only backfill null counters before replacing `rpc_create_order(...)`?
- Is any production client already calling `rpc_create_order(...)` with a meaningful manual `order_number` that would be ignored after 10E6B?
- Should 10E7 immediately follow 10E6B to remove the legacy browser prefetch window?
- Should a future manual override permission be new, or should it reuse an existing order admin/update permission?
- Should direct table order insert be blocked after RPC migration, or preserved temporarily with warnings until all callers move?
