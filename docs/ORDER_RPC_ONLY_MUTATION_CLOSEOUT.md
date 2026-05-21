# Order RPC-Only Mutation Closeout

## Purpose

Phase 10F8 closes the current RPC-only order mutation migration arc and determines readiness for direct-write RLS restriction design.

This is documentation-only plus read-only inspection. It does not add runtime code changes, migrations, backend behavior changes, frontend behavior changes, tests, RLS/RPC changes, routes, registries, UI changes, or helper removal.

## Sources Inspected

Docs inspected:

- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md`
- `docs/ORDER_MUTATION_REMAINING_PATH_AUDIT.md`
- `docs/ORDER_DIRECT_HELPER_DEPRECATION_PLAN.md`
- `docs/SITE_VISIT_DATE_RPC_MIGRATION_DESIGN.md`
- `docs/ORDER_EDIT_RPC_MIGRATION_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Code/schema inspected:

- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/features/orders/actions.js`
- `src/lib/utils/updateOrderStatus.js`
- direct-helper call sites from source and tests
- `orders_insert_company_authorized`
- `orders_update_company_authorized`
- `orders_delete_company_authorized`

## Completed 10F Work

- 10F1 mapped direct table order writes and defined the RPC-only order mutation strategy.
- 10F2 designed normal edit migration from direct update to guarded RPC.
- 10F3A designed `rpc_update_order(...)` field coverage.
- 10F3B expanded `rpc_update_order(...)` to cover current normal edit payload fields.
- 10F3C migrated active normal `OrderForm` edit submit to `updateOrderViaRpc(...)`.
- 10F4 audited remaining order mutation paths and grouped future work.
- 10F5A designed site-visit/date migration.
- 10F5B migrated active site-visit updates to the RPC-backed `updateSiteVisitAtViaRpc(...)` path while preserving best-effort calendar projection.
- 10F6 classified remaining direct helper exports and planned deprecation/guards.
- 10F7 added deprecation annotations and development-only warnings for high-risk direct mutation helpers.

No RLS restriction has been applied yet.

## Active Mutation Inventory

| Mutation category | Current active path | Direct helper still exists? | Dev warning? | RPC/canonical replacement | Risk level | Recommended next action |
|---|---|---:|---:|---|---|---|
| New order create | `OrderForm` -> `createOrderViaRpc(...)` -> `rpc_create_order(...)` | Yes, direct `ordersService.createOrder(...)` and `src/lib/api/orders.js#createOrder(...)` | Yes | `createOrderViaRpc(...)` | Low active path; medium if legacy helper reused | Keep active path; include create route in 10G smoke before RLS restriction |
| Normal order edit | `OrderForm` -> `updateOrderViaRpc(...)` -> `rpc_update_order(...)` | Yes, direct `ordersService.updateOrder(...)` | Yes | `updateOrderViaRpc(...)` | Low active path; medium if helper reused | Keep active path; verify edit route under production-like smoke |
| Site visit update | `OrderDetail` -> `updateSiteVisitAtViaRpc(...)`; `UnifiedOrdersTable` -> `updateSiteVisitAt(...)` -> `updateSiteVisitAtViaRpc(...)` | Yes, old date helpers remain; `updateSiteVisitAt(...)` remains as RPC-backed calendar compatibility helper | Direct date helpers warn; RPC-backed `updateSiteVisitAt(...)` does not warn | `updateSiteVisitAtViaRpc(...)` / `updateOrderViaRpc(...)` | Low active path | Keep active path; verify calendar projection behavior before RLS restriction |
| Calendar event projection for site visits | `updateSiteVisitAt(...)` best-effort calls `rpc_create_calendar_event(...)` after successful order update | n/a | n/a | `rpc_create_calendar_event(...)` | Low/medium because side effect is frontend-orchestrated | Keep as-is until separate calendar transactional design |
| Order-number override | `AssignmentFields` explicit override shell -> `overrideOrderNumber(...)` -> `rpc_order_number_override(...)` | No supported direct active path; generic update RPC rejects `order_number` | Direct update helpers warn | `overrideOrderNumber(...)` | Low active path | Keep; future RLS/trigger design can harden direct table column mutation |
| Edit-mode order-number availability | `OrderNumberField` / `AssignmentFields` -> `isOrderNumberAvailableV2(...)` | Legacy `isOrderNumberAvailable(...)` remains | Not currently warned; no active caller found | `isOrderNumberAvailableV2(...)` | Low active path | Optionally deprecate legacy availability helper in cleanup |
| Smart workflow/status actions | `UnifiedOrdersTable` and drawer/panel surfaces -> canonical workflow helpers -> `rpc_transition_order_status(...)` | Direct status helpers and legacy aliases remain | Yes | `sendOrderToReview(...)`, `sendOrderBackToAppraiser(...)`, `clearReview(...)`, `requestFinalApproval(...)`, `markReadyForClient(...)`, `completeOrder(...)` | Low active path; high if legacy fallback reused | Keep canonical path; smoke active smart actions before RLS restriction |
| Legacy `OrderActionsPanel` actions | `OrderActionsPanel` -> `features/orders/actions.js` if mounted | No direct table write in adapter, but stale/quarantined RPC names remain | Yes | Canonical workflow/date/assignment helpers | Medium if reintroduced | Keep unmounted/quarantined or remove in cleanup before RLS restriction |
| Assignment helper exports | Direct `assignParticipants(...)`, `assignAppraiser(...)`, `assignReviewer(...)`, API assignment helpers | Yes | Yes | Partial: `rpc_assign_order(...)` for appraiser assignment; reviewer path needs design | Medium if reused | Defer replacement to assignment semantics design; do not use as RLS readiness blocker if no active caller |
| Archive/delete helpers | Direct `archiveOrder(...)`, `deleteOrder(...)`, API archive helper | Yes | Yes | Baseline archive/delete RPCs need semantics review | Medium/high if reused | Defer to archive/delete design; include route/import smoke to prove inactive before restriction |
| Direct table RLS policies | Browser can still insert/update/delete authorized current-company rows through row-scoped policies | n/a | n/a | Canonical RPCs now cover active primary paths | Medium | Proceed to RLS restriction design, not immediate implementation |

## Deprecated / Direct Helper Inventory

Development warnings now exist for high-risk direct mutation helpers in:

- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/features/orders/actions.js`
- `src/lib/utils/updateOrderStatus.js`

No helpers were removed. This is intentional: direct helper removal should wait until route/import smoke and caller proof are complete.

Remaining direct helper categories:

- direct create/update helpers;
- direct status/date/assignment helpers;
- direct archive/delete helpers;
- legacy status fallback utility;
- stale/legacy action adapter surface;
- legacy direct availability helper.

## Remaining Direct-Write Risks

Known risks that still justify caution:

- `orders_insert_company_authorized` still allows direct authenticated inserts for authorized current-company users.
- `orders_update_company_authorized` still allows row-scoped direct updates and is not column-specific.
- `orders_delete_company_authorized` still allows hard delete for users with delete/archive authority.
- Direct helper exports still exist, even though active callers are migrated and warned.
- Assignment, archive, and delete semantics are not fully redesigned.
- Calendar projection remains frontend-orchestrated and best-effort, not transactional with site-visit update.
- Legacy order numbering compatibility, global uniqueness, and legacy numbering functions remain deferred from the 10E closeout.

## RLS Restriction Readiness

Readiness decision: **ready for RLS restriction design, not immediate RLS restriction implementation**.

Reasons Falcon is closer to ready:

- Active new-order create is RPC-backed.
- Active normal edit is RPC-backed.
- Active site-visit updates are RPC-backed.
- Explicit order-number override is RPC-backed and audited.
- Generic update RPCs reject `order_number`.
- Active smart workflow actions use canonical transition helpers.
- High-risk direct helpers now warn in development.

Reasons to defer immediate restriction:

- Direct helpers remain exported.
- Route/import smoke has not yet proven every user-facing order route avoids direct writes.
- Assignment/archive/delete semantics still need explicit design.
- RLS changes are backend-security-sensitive and should be isolated in a design-plus-smoke phase.
- Direct table policies may still be needed as a compatibility safety net until active route coverage is verified.

Before any RLS restriction implementation, run:

- production-like route smoke for create, edit, detail site visit, table site visit, smart workflow actions, explicit order-number override, and order list/detail reads;
- import/caller scan for direct helper usage;
- SQL smoke proving canonical RPCs still pass after proposed restrictions;
- negative SQL smoke proving browser direct insert/update/delete behavior is blocked where intended.

## Recommended Next Phase

Recommended Phase 10G:

- **10G1: Direct-Write RLS Restriction Design**
  - Decide whether to restrict through grants, RLS policy changes, column privileges, triggers, or a combination.
  - Define service-role/operator compatibility.
  - Define rollback.

- **10G2: Route/Import Smoke And Active-Caller Verification**
  - Run active route smoke before backend restriction.
  - Confirm direct helpers are not used by active routes.
  - Add targeted checks if needed.

- **10G3: Implement Narrow RLS Restriction If Safe**
  - Restrict direct browser insert/update/delete only after smoke passes.
  - Keep canonical RPCs working.
  - Run SQL and frontend targeted validation.

- **10G4: Closeout**
  - Document final order mutation authority map.
  - List any intentionally retained compatibility paths.

Alternative:

- If current product priority is not backend hardening, it is reasonable to pause before 10G. Active primary order mutation paths are materially safer than before 10F. The remaining RLS restriction is important, but it should be handled as a focused backend-security phase.

## Do Not Do Yet

- Do not remove helpers until import/caller proof and route smoke are complete.
- Do not restrict RLS without route smoke.
- Do not drop legacy numbering uniqueness/functions yet.
- Do not collapse all order mutations into a mega-RPC.
- Do not redesign assignment/archive/delete semantics inside the RLS restriction implementation.
- Do not make calendar projection transactional without separate calendar-side-effect design.
- Do not broaden permissions to make RPC-only migration easier.

## 10F8 Result

Phase 10F8 is complete as closeout/readiness audit.

Current decision:

- Active primary order mutations are RPC-backed/canonical.
- Remaining direct helper and RLS risks are known and documented.
- Proceed next to 10G1 RLS restriction design if backend hardening remains the priority.
- Do not implement RLS restriction without 10G2 route/import smoke.

## 10G1 Design Result

Phase 10G1 is complete as documentation plus read-only schema/code inspection in `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_DESIGN.md`.

The design recommends a cautious staged path:

- keep order select/read policies and read projections unchanged;
- run 10G2 route/import smoke before any backend restriction;
- if smoke passes, use a narrow 10G3 migration to block authenticated direct `orders` insert/update/delete through write-policy restriction while preserving canonical security-definer RPC mutation paths;
- keep direct helper removal, assignment/archive/delete redesign, uniqueness migration, and status/workflow behavior changes out of the RLS restriction slice.

No RLS, RPC, grant, frontend, backend, route, registry, UI, test, or helper behavior changed in 10G1.

## 10G2 Preflight Result

Phase 10G2 completed read-only import/call-site verification and targeted tests. The preflight found no active user-facing direct `orders` insert/update/delete path in primary routed create, edit, site-visit, order-number override, or smart workflow flows.

Preflight evidence:

- `OrderForm` create uses `createOrderViaRpc(...)`.
- `OrderForm` edit uses `updateOrderViaRpc(...)`.
- `OrderDetail` site visit save uses `updateSiteVisitAtViaRpc(...)`.
- `UnifiedOrdersTable` site visit save uses `updateSiteVisitAt(...)`, which delegates to `updateSiteVisitAtViaRpc(...)` and preserves best-effort calendar projection.
- `AssignmentFields` explicit override uses `overrideOrderNumber(...)`.
- Active table/drawer/reviewer smart workflow surfaces import canonical `ordersService` workflow helpers backed by `rpc_transition_order_status(...)`.
- Remaining direct mutation helpers are exported/deprecated, test-only, or legacy/unmounted by the route/import scan.
- Direct `.from("orders")` usages outside deprecated helpers are read/select/count paths and should remain unaffected by write-policy restriction.

Targeted tests passed:

- `src/lib/services/__tests__/ordersServiceCreateOrderViaRpc.test.js`
- `src/components/orders/form/__tests__/OrderForm.test.jsx`
- `src/components/orders/form/__tests__/AssignmentFields.test.jsx`
- `src/lib/api/__tests__/ordersApiSiteVisit.test.js`
- `src/pages/orders/__tests__/OrderDetail.test.jsx`

Decision: proceed to 10G3 narrow RLS direct-write restriction implementation if backend hardening remains the priority. 10G3 validation should include explicit status/smart workflow route or browser smoke because no dedicated status workflow test file was found in 10G2.

## 10G3 Implementation Result

Phase 10G3 implemented the narrow direct-write restriction in `supabase/migrations/20260518067000_restrict_orders_direct_writes.sql`.

The migration blocks direct authenticated browser/table insert, update, and delete against `public.orders` by replacing the previous row-scoped write policies with explicit RPC-only false policies. It preserves the existing order select/read policy and does not change view grants, RPC grants, RPC definitions, helper exports, frontend behavior, numbering, uniqueness, routes, registries, or UI.

SQL smoke confirmed:

- canonical `rpc_create_order(...)` succeeds;
- canonical `rpc_update_order(...)` succeeds;
- site visit through `rpc_update_order(...)` succeeds;
- `rpc_order_number_override(...)` succeeds;
- `rpc_transition_order_status(...)` succeeds;
- direct authenticated insert is rejected with `42501`;
- direct authenticated update/delete affect zero rows;
- authenticated select/read still succeeds for an authorized user;
- service-role direct insert remains available.

Validation caveat: local `supabase db reset` applied the migration but exited nonzero after the final storage container health check reported `supabase_storage_project-falcon` unhealthy. Direct DB smoke passed against the reset database.

## 10G4 Closeout Result

Phase 10G4 is complete in `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_CLOSEOUT.md`.

The closeout records the final 10G state:

- direct authenticated browser/table writes to `public.orders` are blocked;
- active RPC mutation paths are preserved;
- order select/read access is preserved;
- service-role direct insert remains available;
- deprecated direct helpers remain exported and development-warned, but real authenticated table writes now fail or affect zero rows under RLS;
- the local Supabase storage health-check failure is a separate environment/storage caveat, not an order/RLS smoke failure.

Recommended default next step: pause order mutation/RLS work here unless active route smoke fails, deprecated helper warnings reveal an active caller, or storage health becomes necessary for storage-backed feature work.
