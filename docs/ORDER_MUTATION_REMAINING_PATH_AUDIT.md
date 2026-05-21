# Order Mutation Remaining Path Audit

## Purpose

Phase 10F4 audits remaining Falcon order mutation surfaces after active create and normal edit submit moved to guarded RPC paths.

This is documentation-only plus read-only inspection. It does not add migrations, backend behavior changes, frontend behavior changes, tests, RLS/RPC changes, route changes, registry changes, UI changes, or helper removal.

## Current Baseline

Completed RPC-safe active paths:

- New-order submit uses `createOrderViaRpc(payload)` -> `rpc_create_order(payload jsonb)`.
- Normal `OrderForm` edit submit uses `updateOrderViaRpc(orderId, patch)` -> `rpc_update_order(order_id uuid, patch jsonb)`.
- Explicit order-number override uses `overrideOrderNumber(orderId, orderNumber, reason)` -> `rpc_order_number_override(...)`.
- Normal create/edit payloads exclude `order_number`.
- Generic update RPCs reject `order_number`.

Remaining work is no longer one active form path. It is a set of smaller mutation surfaces: status/smart actions, date/site-visit updates, assignment helpers, archive/delete helpers, and legacy direct helpers that are still exported.

## Sources Inspected

Docs inspected:

- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md`
- `docs/ORDER_EDIT_RPC_MIGRATION_DESIGN.md`
- `docs/ORDER_UPDATE_RPC_FIELD_COVERAGE_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Frontend/service code inspected:

- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/features/orders/api.js`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/features/orders/OrderActionsPanel.jsx`
- `src/features/orders/actions.js`
- `src/components/orders/table/ReviewerActionCell.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/lib/utils/updateOrderStatus.js`

Backend/schema inspected:

- `rpc_transition_order_status(uuid, text, text)`
- quarantined legacy workflow/status RPCs
- `rpc_assign_order(uuid, uuid, text)`
- quarantined legacy assignment overload
- `rpc_update_order_dates(uuid, timestamptz, timestamptz, timestamptz)`
- legacy date RPC quarantine comments
- `rpc_order_archive(uuid)`
- `orders_insert_company_authorized`
- `orders_update_company_authorized`
- `orders_delete_company_authorized`

## Risk / Action Table

| Path/helper/component | Mutation type | Active caller? | Current implementation | RPC equivalent exists? | Side effects/audit/notifications | Risk level | Recommended action | Suggested batch |
|---|---|---:|---|---:|---|---|---|---|
| `UnifiedOrdersTable` -> `updateSiteVisitAt(...)` | Site visit date | Yes | `src/lib/api/orders.js` direct `orders.update({ site_visit_at })`, then best-effort `rpc_create_calendar_event` | Yes, `rpc_update_order_dates(...)` for date fields; calendar event behavior needs review | Direct table write plus best-effort calendar RPC; no single backend transaction | High | Migrate active site-visit update to a guarded date RPC or a dedicated site-visit RPC that preserves calendar behavior | Batch C |
| `OrderDetail.saveAppt(...)` | Site visit date | Yes | Direct `supabase.from("orders").update({ site_visit_at, updated_at })` | Yes, `rpc_update_order_dates(...)` exists, but current detail page has no calendar-event mirror | Direct table write, no explicit audit/calendar handling | High | Migrate with `UnifiedOrdersTable` site-visit path in one date batch | Batch C |
| `src/lib/api/orders.js#updateSiteVisitAt(...)` | Site visit date helper | Yes through `UnifiedOrdersTable` | Direct table update plus best-effort calendar RPC | Partial | Calendar side effect is frontend-orchestrated and non-transactional | High | Replace with RPC-backed wrapper after date RPC/calendar requirements are designed | Batch C |
| `src/lib/api/orders.js#updateOrderDates(...)` | Date update | No active caller found in this inspection | Direct table update of date fields | Yes, `rpc_update_order_dates(...)` | Skips date RPC guardrails if reused | Medium | Quarantine or rewrite after active date path migration | Batch C/E |
| `ordersService.updateOrderDates(...)` | Date update | No active caller found in this inspection | Direct table update of date fields plus legacy aliases | Yes, `rpc_update_order_dates(...)` | Skips date RPC guardrails if reused | Medium | Quarantine or rewrite after active date path migration | Batch C/E |
| `OrderForm` normal edit submit | Generic edit | Yes | `updateOrderViaRpc(...)` -> `rpc_update_order(...)` | Yes | RPC update guards; no order-number authority | Low | Keep as canonical normal edit path | Monitor |
| `ordersService.updateOrder(...)` | Generic update helper | Exported; no active `OrderForm` caller after 10F3C | Direct table update | Yes, `updateOrderViaRpc(...)` | Can bypass RPC field allowlist if reused | Medium | Deprecate or make internal only after remaining callers are proven migrated | Batch E |
| `ordersService.createOrder(...)` | Create helper | Exported; no active `OrderForm` caller after 10E7C | Direct table insert | Yes, `createOrderViaRpc(...)` | Would bypass server-side v2 numbering if reused | Medium | Deprecate/quarantine after call-site audit confirms no active callers | Batch E |
| `src/lib/api/orders.js#createOrder(...)` | Create helper | No active caller found in this inspection | Direct table insert and includes `order_number` from payload | Yes, `createOrderViaRpc(...)` | Would bypass server-side v2 numbering if reused | Medium/High | Quarantine or route through RPC; add tests if kept | Batch E |
| `UnifiedOrdersTable` smart workflow handlers | Status transitions | Yes | `sendOrderToReview`, `sendOrderBackToAppraiser`, `completeOrder`, `clearReview`, `requestFinalApproval`, `markReadyForClient` in `ordersService` | Yes, `rpc_transition_order_status(...)` | Service emits/coordinates notifications for active flows; RPC enforces transition guards | Low | Keep as canonical active smart-action surface | Batch A monitor |
| `ReviewerActionCell` | Reviewer workflow actions | No mounted caller found in this inspection | Calls `sendOrderBackToAppraiser(...)` and `clearReview(...)` | Yes | Uses canonical service helpers if mounted | Low/Medium | Leave or remove as legacy UI cleanup; not urgent | Batch A/E |
| `OrderActionsPanel` | Status, assignment, due date debug/legacy panel | No mounted caller found in this inspection | Calls `features/orders/actions.js` legacy adapters | Partial; calls quarantined or mismatched RPC names | Likely fails for authenticated status/date paths; no reliable production side effects | Medium if mounted | Keep quarantined; remove or replace if any route imports it later | Batch A/E |
| `src/features/orders/actions.js#updateOrderStatus(...)` | Status adapter | Only through unmounted `OrderActionsPanel` found | Calls quarantined `rpc_update_order_status` | Yes, canonical `rpc_transition_order_status(...)` | Quarantined RPC expected to reject app-role callers | Medium if mounted | Do not revive; replace with canonical transition helper if needed | Batch A/E |
| `src/features/orders/actions.js#assignOrder(...)` | Assignment adapter | Only through unmounted `OrderActionsPanel` found | Calls `rpc_assign_order` with `p_assigned_to` arg name | Yes, `rpc_assign_order(uuid, uuid, text)` | Backend assignment activity if argument mapping works | Medium | Prefer canonical assignment wrapper if UI is restored | Batch B/E |
| `src/features/orders/actions.js#updateDueDates(...)` | Due date adapter | Only through unmounted `OrderActionsPanel` found | Calls `rpc_update_due_dates`; current canonical inspected RPC is `rpc_update_order_dates(...)` | Existing date RPC uses different name/signature | May be dead or failing depending DB compatibility | Medium if mounted | Quarantine; align to date RPC during date batch if retained | Batch C/E |
| `src/lib/utils/updateOrderStatus.js` | Status fallback utility | No active caller found in this inspection | Tries quarantined `rpc_update_order_status`, then direct `orders.update({ status })` and manual `logOrderEvent` | Yes, canonical transition helper exists | Fallback can bypass workflow guards and duplicate/diverge activity | Medium/High if reused | Deprecate or rewrite to canonical transition helper; remove direct fallback before RLS restriction | Batch A/E |
| `ordersService.setOrderStatus(...)` and legacy aliases | Status helper aliases | No active caller found in this inspection | Some direct status updates, some canonical helper wrappers | Yes | Direct aliases bypass transition rules if reused | Medium | Quarantine exports or rewrite aliases to canonical transition helpers only | Batch A/E |
| `ordersService.assignParticipants(...)`, `assignAppraiser`, `assignReviewer`, `updateAssignees` | Assignment/reviewer update | Exported; no active caller found in this inspection | Direct `orders.update({ appraiser_id, reviewer_id })` | Appraiser assignment RPC exists; reviewer-specific safe path is unclear | Skips target eligibility/activity if reused | Medium | Split appraiser assignment from reviewer assignment design; migrate active callers only | Batch B |
| `src/lib/api/orders.js#assignAppraiser(...)`, `assignClient(...)`, `bulkAssignAppraiser(...)` | Assignment/client bulk helpers | No active caller found in this inspection | Direct table updates | Partial | Skips assignment/client attachment guardrails and activity | Medium | Quarantine or replace with guarded RPCs if needed | Batch B/E |
| `ordersService.archiveOrder(...)` | Archive | Exported; no active caller found in this inspection | Direct `is_archived = true` update | Baseline `rpc_order_archive(uuid)` exists | Direct archive has no explicit archive audit contract | Medium | Design archive RPC semantics before RLS restriction | Batch D |
| `src/lib/api/orders.js#archiveOrder(...)` | Archive | No active caller found in this inspection | Direct `is_archived = true` update | Baseline `rpc_order_archive(uuid)` exists | Direct archive has no explicit archive audit contract | Medium | Consolidate with archive/delete batch | Batch D |
| `ordersService.deleteOrder(...)` | Hard delete | Exported; no active caller found in this inspection | Direct table delete | Delete RPC not confirmed as canonical; baseline text-id delete exists | Hard delete side effects depend on FK/triggers | Medium/High | Prefer archive-first design; do not expose hard delete casually | Batch D |
| `src/lib/api/orders.js#bulkUpdateStatus(...)` | Bulk status | No active caller found in this inspection | Direct table bulk status update | No safe bulk transition equivalent confirmed | Skips workflow transition guards | High if reused | Keep quarantined; require explicit bulk workflow design before use | Batch A/E |
| `src/features/orders/api.js` | Order list/read API | Active through `useOrders` for reads | Read-only view/base-table list/count fallback | n/a | No mutation found in inspected file | Low | Keep out of mutation migration except import cleanup | Monitor |
| `orders_update_company_authorized` RLS | Direct table update policy | Yes as backend safety net | Row-scoped update policy, not column-specific | n/a | Allows direct updates where row authority passes | Medium | Restrict only after active date/archive/assignment callers are migrated or quarantined | Batch F |
| `orders_insert_company_authorized` RLS | Direct table insert policy | Yes as backend safety net | Row-scoped insert policy | n/a | Allows direct inserts if helper is reused | Medium | Restrict after direct create helpers are quarantined | Batch F |
| `orders_delete_company_authorized` RLS | Direct table delete policy | Yes as backend safety net | Row-scoped delete policy | n/a | Hard delete remains possible with delete/archive permission | Medium/High | Design archive/delete RPC and direct delete restriction before tightening | Batch D/F |

## Highest-Risk Active Paths Found

Confirmed active direct mutation paths:

- `UnifiedOrdersTable` site-visit action calls `src/lib/api/orders.js#updateSiteVisitAt(...)`, which direct-updates `orders.site_visit_at` and then best-effort creates a calendar event.
- `OrderDetail.saveAppt(...)` direct-updates `orders.site_visit_at`.

No active mounted caller was found for `OrderActionsPanel`, `features/orders/actions.js`, or `lib/utils/updateOrderStatus.js` in this inspection, but those legacy utilities remain risky if reintroduced because they can call quarantined workflow RPCs or direct status fallbacks.

Active smart workflow actions in `UnifiedOrdersTable` use canonical `ordersService` workflow helpers backed by `rpc_transition_order_status(...)`; they are not the next highest-risk target.

## Grouped Migration Plan

### Batch A: Status / Smart Action Paths

Goal:

- Keep active smart actions on `rpc_transition_order_status(...)`.
- Confirm no mounted legacy status panel remains.
- Quarantine or remove `OrderActionsPanel`, `features/orders/actions.js#updateOrderStatus`, `lib/utils/updateOrderStatus.js`, direct `setOrderStatus(...)`, and bulk status helpers only after call-site certainty.

Recommended validation:

- Targeted smart-action tests for `send_to_review`, `send_back_to_appraiser`, review clear, final approval, ready-for-client, and complete.
- Explicit tests that legacy global/direct status helpers are not used by current table actions.

### Batch B: Assignment / Reviewer / Appraiser Paths

Goal:

- Separate ordinary edit assignment fields from assignment workflow actions.
- Prefer `rpc_assign_order(...)` for appraiser assignment where semantics match.
- Design reviewer assignment separately; do not assume appraiser and reviewer have identical authority or activity semantics.
- Quarantine direct assignment helpers in `ordersService` and `src/lib/api/orders.js` after active callers are migrated or proven unused.

Recommended validation:

- Assignment permission tests.
- Target eligibility tests.
- Activity-log expectations for assignment actions.

### Batch C: Date / Due-Date Mutation Paths

Goal:

- Migrate confirmed active site-visit mutation paths to a guarded RPC-backed service.
- Preserve or redesign the current calendar-event side effect in `updateSiteVisitAt(...)`.
- Decide whether `rpc_update_order_dates(...)` is sufficient or whether a dedicated site-visit RPC should combine order date update plus calendar event.
- Quarantine direct date helpers after active paths are migrated.

Recommended validation:

- `UnifiedOrdersTable` site-visit action test.
- `OrderDetail` site-visit save test.
- SQL smoke for date RPC current-company/read/update guards.
- Calendar-event behavior test if the current mirror remains required.

### Batch D: Archive / Delete Paths

Goal:

- Decide archive semantics before direct delete restriction.
- Prefer soft archive through a guarded RPC if UI needs archive.
- Treat hard delete as exceptional/admin-only behavior with explicit tests.
- Do not restrict delete RLS until current archive/delete callers are known.

Recommended validation:

- Archive permission tests.
- Delete permission tests if hard delete remains.
- Activity/audit expectation tests.

### Batch E: Legacy API / Utility Cleanup And Deprecation

Goal:

- Quarantine or remove unused direct helpers from `src/lib/api/orders.js`, `src/lib/services/ordersService.js`, `src/features/orders/actions.js`, and `src/lib/utils/updateOrderStatus.js`.
- Add compatibility wrappers only when a live caller still needs the function name.
- Avoid silent behavior changes for unknown exports; pair cleanup with import/call-site tests.

Recommended validation:

- Import graph checks.
- Targeted tests for canonical create/edit/override/status/date paths.

### Batch F: RLS Direct-Write Restriction Design

Goal:

- Design direct insert/update/delete restriction only after active direct callers are migrated or intentionally preserved behind RPCs.
- Decide whether to use grants, RLS, column-level privileges, triggers, or a combination.
- Preserve service-role/operator paths explicitly.

Recommended validation:

- SQL smoke proving RPC create/edit/status/date/assignment/archive/override still work.
- SQL smoke proving direct browser table mutation is blocked where intended.

## Recommended Immediate Next Batch

Recommended next implementation batch: **Batch C, date / due-date mutation paths**.

Reason:

- 10F3C already removed the active normal edit direct update.
- The highest confirmed active direct mutations now are site-visit updates in `UnifiedOrdersTable` and `OrderDetail`.
- A date batch can be meaningfully sized: design the correct date/site-visit RPC boundary, preserve calendar-event behavior, migrate both active callers, update focused tests, and document the remaining legacy direct date helpers.

Do not start with RLS restriction. Direct write policies should remain as a safety net until active site-visit/date, archive/delete, and any confirmed assignment direct callers are migrated or quarantined.

10F5A design result: completed as documentation plus read-only inspection in `docs/SITE_VISIT_DATE_RPC_MIGRATION_DESIGN.md`. The recommended first implementation is to migrate active site-visit writes through existing `updateOrderViaRpc(orderId, { site_visit_at })`, preserving current best-effort `rpc_create_calendar_event(...)` behavior in the frontend flow. A new backend calendar-side-effect RPC is intentionally deferred because it would change transaction and failure semantics.

10F5B implementation result: active site-visit writes were migrated to the guarded RPC-backed update path. `updateSiteVisitAtViaRpc(orderId, siteVisitAt)` now wraps `updateOrderViaRpc(orderId, { site_visit_at })`; `UnifiedOrdersTable` continues using `updateSiteVisitAt(...)`, which now delegates to the RPC-backed wrapper and preserves the best-effort calendar event RPC after successful update; `OrderDetail.saveAppt(...)` now uses the RPC-backed wrapper directly and preserves its previous no-calendar-event behavior. The direct `orders.site_visit_at` writes from these active paths are removed.

10F6 planning result: completed as documentation plus read-only inspection in `docs/ORDER_DIRECT_HELPER_DEPRECATION_PLAN.md`. Active primary create/edit/site-visit/order-number/status paths are now RPC-backed or canonical. The remaining direct helpers in `ordersService`, `src/lib/api/orders.js`, and legacy utility modules are mostly exported compatibility surfaces with no active user-facing caller found in this inspection. Recommended next batch is deprecation annotations and usage guards, not RLS restriction.

## Bigger-Slice Workflow

For each future batch:

1. Map active callers and inactive exports.
2. Choose one canonical RPC/backend contract.
3. Migrate active caller(s).
4. Add or update focused tests for the caller and service wrapper.
5. Update docs.
6. Run targeted tests first.
7. Run full lint/build at the batch checkpoint, not after every docs-only or import-only micro-change.

Use small slices only for security-sensitive DB behavior such as RLS restriction, grants, trigger guards, or uniqueness/index changes. Use medium slices for one backend RPC plus one frontend wrapper plus one UI/caller migration when the behavior is already designed.

## Do Not Do Yet

- Do not restrict `orders` RLS before active direct callers are migrated or quarantined.
- Do not remove direct helpers before call sites are migrated or proven inactive.
- Do not change status workflow behavior casually.
- Do not change assignment permissions casually.
- Do not alter calendar/activity/notification behavior without explicit tests.
- Do not collapse all order mutations into one broad mega-RPC.
- Do not reintroduce `order_number` into normal create/edit payloads.
- Do not treat direct helper cleanup as permission hardening; backend RLS/grant restriction remains a separate batch.

## 10F4 Result

Phase 10F4 is complete as documentation plus read-only inspection.

Current decision:

- Active create, normal edit, and explicit order-number override paths are RPC-backed.
- Active smart workflow actions are already on canonical transition helpers.
- The next highest-value migration is date/site-visit mutation consolidation because confirmed active direct writes remain there.
- Direct helper deprecation and RLS restriction should wait until active date/archive/assignment surfaces are handled or explicitly quarantined.
