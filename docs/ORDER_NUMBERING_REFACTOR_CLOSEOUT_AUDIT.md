# Order Numbering Refactor Closeout Audit

## Purpose

Phase 10E9 closes the current order-numbering refactor arc and records remaining legacy risk before any further numbering work.

This is documentation-only plus read-only inspection. It does not add migrations, backend behavior changes, frontend behavior changes, route changes, registry changes, tests, uniqueness/index changes, Owner Setup numbering configuration, bootstrap seeding, or legacy function removal.

The decision goal is to separate what is safe enough to pause from what still needs a later focused backend hardening phase.

## Sources Inspected

Documentation inspected:

- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/ORDER_CREATION_V2_NUMBERING_RPC_DESIGN.md`
- `docs/FRONTEND_ORDER_CREATE_RPC_MIGRATION_DESIGN.md`
- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_DESIGN.md`
- `docs/ORDER_NUMBER_MANUAL_OVERRIDE_BACKEND_CONTRACT.md`
- `docs/ORDER_NUMBER_GENERIC_UPDATE_HARDENING_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Code/schema areas spot-checked:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `supabase/migrations/20260518060000_company_order_numbering_storage.sql`
- `supabase/migrations/20260518061000_company_order_numbering_v2_helper.sql`
- `supabase/migrations/20260518062000_rpc_create_order_v2_numbering.sql`
- `supabase/migrations/20260518063000_order_number_availability_v2.sql`
- `supabase/migrations/20260518064000_order_number_override_rpc.sql`
- `supabase/migrations/20260518065000_generic_order_update_reject_order_number.sql`

## Completed Work Summary

Phase 10E materially changed the active order-numbering path:

- Added and verified nullable `company_id` compatibility storage on `order_numbering_rules` and `order_number_counters`.
- Added `next_order_number_v2(...)` as a service-role-only company-id-backed helper.
- Updated guarded `rpc_create_order(payload jsonb)` to generate order numbers server-side through v2 numbering.
- Added `createOrderViaRpc(payload)` and moved active `OrderForm` create submit to it.
- Removed create-mode browser prefetch from `rpc_get_next_order_number()`.
- Changed create-mode order number UI to generated-on-save/read-only.
- Removed `order_number` from active create payloads.
- Added company-scoped `rpc_is_order_number_available_v2(...)`.
- Wired edit-mode availability to the v2 RPC.
- Added `rpc_order_number_override(...)` as the explicit audited backend order-number override path.
- Added `overrideOrderNumber(...)` and wired the explicit edit-mode override UI.
- Removed `order_number` from normal edit payloads.
- Hardened generic order update RPCs so `order_number` patch keys are rejected.

## Current Active Create Flow

Current active new-order flow:

1. `OrderForm` create mode displays `Generated on save`.
2. `buildOrderPayload(..., { isEdit: false })` omits `order_number`.
3. Create submit calls `createOrderViaRpc(payload)`.
4. `createOrderViaRpc(...)` calls `rpc_create_order`.
5. `rpc_create_order` generates `orders.order_number` with `next_order_number_v2(current_company_id(), now())`.
6. The created order row returned by the RPC is the source of truth.

No active create-mode browser prefetch, availability check, or form-authored order number remains in the primary form path.

## Current Active Edit / Override Flow

Current active edit flow:

- Normal edit submit still calls `ordersService.updateOrder(order.id, payload)` for ordinary fields.
- The normal edit payload no longer includes `order_number`.
- Edit mode displays the current order number read-only.
- `Change order number` opens an explicit override dialog.
- Availability guidance uses `rpc_is_order_number_available_v2(...)`.
- Save calls `overrideOrderNumber(orderId, candidate, reason || null)`.
- `overrideOrderNumber(...)` calls `rpc_order_number_override(...)`.
- The override RPC validates company scope, validates availability, updates only `orders.order_number`, and writes `activity_log.event_type = 'order_number.manual_override'` on effective change.

Normal edit submit is no longer a frontend order-number mutation path.

## Current Backend Protections

Current backend protections:

- `next_order_number_v2(...)` requires a concrete company id and uses company-id-backed rules/counters.
- `next_order_number_v2(...)` is granted to `service_role` only.
- `rpc_create_order(...)` ignores submitted `payload.order_number` and generates server-side.
- `rpc_is_order_number_available_v2(...)` scopes checks to `current_company_id()`.
- `rpc_order_number_override(...)` is explicit, current-company scoped, permission guarded, and audited.
- `rpc_update_order(uuid,jsonb)` rejects `order_number`.
- `rpc_order_update(uuid,jsonb)` rejects `order_number`.
- Quarantined `rpc_order_update(text,jsonb)` remains service-role-only and rejects `order_number` before its quarantine exception.

## Remaining Legacy Objects / Paths

The following are intentionally still present:

- Legacy `rpc_get_next_order_number(...)`.
- Legacy `rpc_is_order_number_available(...)`.
- Legacy `next_order_number(p_year integer)` and `order_counters`.
- Legacy `company_key = 'falcon_default'` compatibility data.
- Possible null-company counter rows produced by the unchanged legacy RPC.
- Direct table create helpers.
- Direct table update helpers.
- Row-scoped direct update RLS policy.
- Global `orders.order_number` uniqueness.

These objects are not all equally urgent. The risk table below separates fix-now candidates from deferred compatibility work.

## Risk Table

| Legacy item/path | Current active? | Risk level | Why it matters | Recommended action | Timing | Notes |
|---|---:|---|---|---|---|---|
| Legacy `rpc_get_next_order_number(...)` | No for active create | Low | Still browser-callable/existing unless grants are later changed; can create null-company legacy counters if called. | Keep for compatibility for now; later inspect call logs/grants and quarantine or replace with non-authoritative preview only. | Defer | Active `OrderForm` no longer calls it. |
| Legacy `rpc_is_order_number_available(...)` | No for active field path | Low | Global availability is wrong for multi-company SaaS if reused. | Keep temporarily; later revoke/browser-quarantine after call-site scan confirms no active dependency. | Defer | Edit-mode field uses v2 RPC. |
| Direct table create helper `ordersService.createOrder(...)` | Not active in `OrderForm`; still exported | Medium | Direct insert can still accept supplied `order_number` if another caller uses it. | Inspect call sites and either deprecate, narrow, or migrate to RPC-only create. | Fix later | Not currently primary form path. |
| Secondary direct create helper `src/lib/api/orders.js#createOrder` | Unknown/available | Medium | Maps `payload.order_number` / `order_no` and direct-inserts. | Call-site audit and deprecate or move behind RPC create if still needed. | Fix later | Treat as compatibility risk until removed. |
| Direct table update helper `ordersService.updateOrder(...)` | Yes for ordinary edit | Medium | Generic patch helper can update any field RLS permits if a caller passes it. | 10E8M should inspect/narrow direct table policy/helper risk. | Fix later | Active form payload no longer includes `order_number`. |
| `src/lib/api/orders.js` direct update helpers | Partial | Low/Medium | Current helpers update status/dates/assignment/client, not order number, but use direct table updates. | Keep in direct-update risk inventory; narrow as broader order mutation RPCs mature. | Monitor | Not currently order-number-specific. |
| Direct update RLS `orders_update_company_authorized` | Yes | Medium | Row-scoped policy cannot prevent column-specific `order_number` changes by authorized direct table callers. | Inspect column privilege/trigger options; consider trigger guard if direct table writes remain broad. | Fix later | This is the main remaining backend hardening candidate. |
| Global `orders.order_number` uniqueness | Yes | Medium | Prevents two companies from using the same visible sequence and can surface cross-company collision behavior. | Keep until all write paths are company-aware; migrate to `(company_id, order_number)` in focused uniqueness phase. | Defer | Dropping too early is riskier than keeping it. |
| `company_key = 'falcon_default'` | Partial compatibility | Low | Text key is not tenant authority in v2, but remains in legacy rule data. | Keep as compatibility/display until legacy RPC is quarantined. | Defer | Mapped to `default_company_id()` for v2 storage. |
| Null-company legacy counters | Possible if legacy RPC called | Low/Medium | Can conflict with v2 helper for same mapped rule/year. | Monitor; avoid calling legacy RPC; clean up only after verifying no active callers. | Monitor | v2 fails closed on legacy/null-company counter conflict. |
| Generic update RPCs | No longer accept number | Low | Previously accepted `order_number` as ordinary patch data. | Done for UUID RPCs and quarantined text overload. | Complete | 10E8L implemented rejection. |
| Frontend create path | Yes | Low | Primary create path is now server-numbered. | Keep tests around RPC create and generated-on-save UI. | Monitor | No create-mode order number payload. |
| Frontend edit path | Yes | Low | Normal edit no longer carries order number; explicit override is separate. | Keep tests around payload omission and override action. | Monitor | Backend direct policy remains separate risk. |
| Manual override path | Yes | Low/Medium | Explicit override exists and is audited, but permission is currently `orders.update.all` rather than a dedicated number permission. | Defer dedicated permission decision until broader permission slice. | Defer | Current model is acceptable for this pause point. |
| Owner Setup numbering config | No | Low | Configuration before backend model/uniqueness is stable would create false authority. | Keep disabled/deferred. | Defer | Readiness may stay unknown/deferred. |
| Bootstrap numbering seeding | No | Low | Seeding defaults before company-safe config is final could create unsafe assumptions. | Continue not seeding. | Defer | Safe current posture. |

## Remaining High / Medium Risks

No remaining high-risk active-path issue was found in this closeout inspection.

Medium risks that should be addressed later:

- Direct table update policy/helper risk: authorized direct table update callers can still mutate `order_number` if they send it, because RLS is row-scoped.
- Direct table create helper risk: exported direct create helpers can still carry supplied order numbers if reused outside the active form path.
- Global uniqueness migration: global uniqueness is safe as a conservative constraint for now but blocks true per-company duplicate visible sequences.
- Null-company legacy counters: legacy RPC calls can create compatibility counters that v2 intentionally refuses to share.

## Recommended Pause Point

Phase 10E is safe enough to pause after 10E9.

Reasoning:

- Active create flow is server-numbered through guarded RPC.
- Active create mode no longer prefetches, validates, or submits browser-authored order numbers.
- Active edit submit no longer carries `order_number`.
- Explicit override is backend-guarded, company-scoped, and audited.
- Generic update RPCs now reject `order_number`.
- Remaining risks are known, documented, and mostly compatibility/direct-table concerns.

Do not continue micro-edits unless direct table order writes are confirmed to be actively used in production-critical paths that can pass `order_number`. If that is confirmed, the next focused backend phase should be direct table/RLS hardening, not UI work.

## Recommended Next Action

Default recommendation:

- Pause the order-numbering refactor arc here.
- Move to a higher-priority product/setup slice or a closeout handoff.
- Schedule a later focused backend hardening phase for direct table create/update and uniqueness migration.

If order-numbering work must continue immediately:

1. Inspect direct table update grants and policy behavior in a replayed database.
2. Audit call sites for `ordersService.createOrder(...)`, `ordersService.updateOrder(...)`, and `src/lib/api/orders.js#createOrder`.
3. Decide between helper narrowing, RPC-only migration, and a database trigger guard.
4. Keep global uniqueness until company-scoped write safety is proven.

10F1 follow-up:

- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md` expands this closeout recommendation beyond numbering and maps all known order mutation paths.
- The known active direct write still needing migration is normal edit submit through `ordersService.updateOrder(...)`.
- The recommended next step is 10F2 update-path consolidation design and test planning, not immediate RLS restriction.
- Direct table/RLS restriction should wait until active create/edit/status/date/assignment callers are migrated or explicitly accounted for.

## Recommended Bigger-Slice Workflow Going Forward

Use smaller slices only where the blast radius demands it:

- RLS, uniqueness, trigger, and security-sensitive database behavior should remain small, isolated slices with SQL smoke tests.
- A single backend RPC plus frontend wrapper plus one UI wiring point can be a medium slice when the contract is already designed and tests are focused.
- Docs, test updates, static cleanup, and closeout audits can be larger slices.
- Avoid full `lint`/`build` after every doc-only micro-change unless the docs are bundled with code changes or the phase explicitly requires it.
- Prefer targeted tests first, then full `npm test`, `npm run lint`, `npm run build`, and `git diff --check` at meaningful checkpoints.
- Pause for decision audits when a phase has accumulated several micro-edits and the remaining work shifts from active-path safety to compatibility cleanup.

## Hard No-Go Rules

- Do not reintroduce frontend-generated authoritative order numbers.
- Do not make normal edit submit an order-number mutation path.
- Do not treat legacy global availability as long-term authority.
- Do not drop global uniqueness before company-scoped write safety is proven.
- Do not add Owner Setup numbering configuration before backend config and uniqueness are stable.
- Do not seed numbering from bootstrap before company-safe defaults exist.
- Do not rely on frontend-only payload omission as the final backend guarantee for direct table writes.
