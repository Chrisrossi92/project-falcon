# Order Mutation RPC-Only Strategy

## Purpose

Phase 10F1 inspects Falcon order mutation paths and designs the safest path toward RPC-only order mutations.

This is documentation-only plus read-only code/schema inspection. It does not add migrations, backend behavior changes, frontend behavior changes, route changes, registry changes, UI changes, tests, RLS changes, RPC changes, permission changes, or direct table restrictions.

The goal is decision readiness: understand active direct writes, existing RPC boundaries, and the least disruptive grouped migration plan.

## Sources Inspected

Docs inspected:

- `docs/ORDER_NUMBERING_REFACTOR_CLOSEOUT_AUDIT.md`
- `docs/ORDER_NUMBERING_DEPENDENCY_AUDIT.md`
- `docs/ORDER_NUMBERING_MIGRATION_STRATEGY.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- order RPC, workflow, assignment, activity, notification, client/AMC relationship, and company-scope migration docs referenced from the roadmap

Frontend/service code inspected:

- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`
- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/pages/orders/EditOrder.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/components/orders/view/QuickActionsDrawerPanel.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/features/orders/OrderActionsPanel.jsx`
- `src/features/orders/actions.js`
- `src/lib/utils/updateOrderStatus.js`

Schema/backend inspected:

- `public.orders` insert/update/delete RLS policies
- `current_app_user_can_create_order()`
- `current_app_user_can_update_order_row(...)`
- `current_app_user_can_attach_order_client(...)`
- `current_app_user_can_attach_order_amc(...)`
- `rpc_create_order(payload jsonb)`
- `rpc_update_order(uuid,jsonb)`
- `rpc_order_update(uuid,jsonb)`
- `rpc_transition_order_status(uuid,text,text)`
- `rpc_assign_order(uuid,uuid,text)`
- `rpc_update_due_dates(uuid,date,date)`
- `rpc_update_order_dates(uuid,timestamptz,timestamptz,timestamptz)`
- quarantined legacy workflow/status RPCs
- order activity/notification triggers and RPCs touched by workflow/assignment slices

## Why RPC-Only Order Mutations Matter

RPC-only order mutations matter because order writes are no longer simple row edits:

- Audit consistency: sensitive mutations should write predictable `activity_log` rows or intentionally rely on one known trigger path.
- Notification consistency: workflow transitions and assignments often need recipient resolution and notifications; direct table writes can skip or duplicate that behavior.
- Workflow integrity: status changes should obey canonical transition rules, required permissions, readable/updateable order checks, and allowed-from status checks.
- Tenant safety: RPCs can validate current-company ownership and related client/AMC attachment safety before mutation.
- Order-number safety: explicit override is now isolated; broad direct writes should not reintroduce order-number mutation.
- Client/AMC relationship guards: client and AMC attachments need same-company/current-company checks and category validation.
- Future SaaS onboarding: predictable mutation surfaces make setup/readiness, audit, support, and onboarding verification tractable.

Direct table RLS remains important as a safety net, but it is not a good long-term place to express every side effect and domain rule.

## Current Authority Model

Current direct table policies:

- `orders_insert_company_authorized`: permits authenticated inserts when `current_app_user_can_create_order()` passes and row company matches `current_company_id()`.
- `orders_update_company_authorized`: permits authenticated updates when `current_app_user_can_update_order_row(...)` passes. It is row-scoped, not column-specific.
- `orders_delete_company_authorized`: permits authenticated deletes/archive-authorized deletes for current-company rows with `orders.delete` or `orders.archive`.

Current RPC protections:

- `rpc_create_order(...)` validates create authority, client/AMC attachment safety, company scope, and server-side v2 order numbering.
- `rpc_update_order(...)` and `rpc_order_update(...)` validate update authority and client/AMC attachment safety; both reject `order_number`.
- `rpc_transition_order_status(...)` validates current company, readability, updateability, transition rules, and workflow permissions.
- `rpc_assign_order(...)` validates current company, readability, updateability, assignment permission, assignable target, and writes assignment activity.
- `rpc_update_due_dates(...)` and `rpc_update_order_dates(...)` validate current company, readability, and updateability.
- `rpc_order_number_override(...)` validates explicit number override authority and writes activity on effective change.

## Mutation Path Risk Table

| Path/helper/RPC | Mutation type | Active caller? | Fields affected | Current authority model | Side effects/audit/notifications | Risk level | Recommended action | Timing |
|---|---|---:|---|---|---|---|---|---|
| `OrderForm` create -> `createOrderViaRpc(...)` -> `rpc_create_order(...)` | Create | Yes | create payload fields; server-generated `order_number` | RPC: current company, `orders.create`, client/AMC attachment guards | Order insert triggers plus server-side numbering; no browser number authority | Low | Keep as canonical create path | Done/monitor |
| `ordersService.createOrder(payload)` | Create | Not active in `OrderForm`; exported | Any supplied insert payload | Direct table insert RLS | May skip RPC create semantics and v2 numbering if reused | Medium | Deprecate or route through RPC after call-site audit | 10F5 or later |
| `src/lib/api/orders.js#createOrder(payload)` | Create | Unknown/available | Broad prepared insert payload, including `order_number` | Direct table insert RLS | May skip RPC create semantics and v2 numbering | Medium | Audit call sites; migrate or quarantine | 10F5 or later |
| `OrderForm` edit -> `ordersService.updateOrder(...)` | Generic update | Yes | ordinary profile/intake fields; no `order_number` from active form | Direct table update RLS | Side effects mostly table triggers; no explicit RPC audit contract | Medium | Migrate active edit update to guarded RPC while preserving behavior | 10F3 |
| `ordersService.updateOrder(orderId, patch)` | Generic update helper | Yes via `OrderForm`; reusable | Any supplied patch | Direct table update RLS | No explicit field contract; can skip RPC guards for client/AMC if caller passes those fields | Medium | Keep until active edit migration; then deprecate/narrow | 10F3/10F5 |
| `rpc_update_order(uuid,jsonb)` | Generic update RPC | Available | client/AMC/manual client/appraiser/property/fees/notes; rejects `order_number` | RPC update authority and client/AMC guards | No explicit activity/notification noted for ordinary fields | Low/Medium | Candidate backend for active edit migration if field coverage matches | 10F2/10F3 |
| `rpc_order_update(uuid,jsonb)` | Generic update RPC | Available | title/address/client/AMC/appraiser/reviewer/dates/fees/archive; rejects `order_number` | RPC update authority and client/AMC guards | No explicit activity/notification noted for ordinary fields | Low/Medium | Compare with `OrderForm` payload; avoid two generic RPCs long-term | 10F2 |
| `ordersService.setOrderStatus(...)` | Status update | Legacy helper | `status` | Direct table update RLS | Bypasses canonical transition RPC and notification path | Medium/High if used | Remove active usage; keep quarantined/deprecated | 10F4/10F5 |
| `ordersService.startReview/requestRevisions/markComplete/...` legacy aliases | Status update | Some aliases exported; several call `setOrderStatus` | `status` | Direct table update RLS for aliases that call `setOrderStatus` | Can bypass canonical transition rules | Medium | Replace call sites with canonical workflow helpers or quarantine exports | 10F4 |
| `sendOrderToReview`, `sendOrderBackToAppraiser`, `clearReview`, `requestFinalApproval`, `markReadyForClient`, `completeOrder` | Workflow transition | Yes | `status`, `updated_at` | RPC `rpc_transition_order_status(...)` plus frontend workflow guard | Emits notifications in service for active flows; RPC relies on status triggers for activity | Low | Keep as canonical status surface; consolidate old aliases around it | Monitor/10F4 |
| `src/features/orders/actions.js#updateOrderStatus` | Status RPC adapter | Active through `OrderActionsPanel` if surface is mounted | status via legacy `rpc_update_order_status` | Quarantined legacy RPC; expected to raise for authenticated | No reliable active side effects | Medium | Treat `OrderActionsPanel` as legacy/debug; remove or replace with canonical workflow if live | 10F4 |
| `src/lib/utils/updateOrderStatus.js` | Status fallback utility | Unknown | `status` direct fallback plus manual log | Tries legacy RPC then direct fallback through `rpcFirst` | Can manually log event, bypassing canonical workflow | Medium/High if used | Call-site audit; deprecate or rewrite to canonical transition | 10F4 |
| `ordersService.updateOrderDates(...)` | Date update | Available | `site_visit_at`, `review_due_at`, `final_due_at`, legacy aliases | Direct table update RLS | May skip date guardrail RPC and activity expectations | Medium | Migrate active usage to `rpc_update_order_dates(...)` if used | 10F4 |
| `src/lib/api/orders.js#updateOrderDates(...)` | Date update | Unknown/available | date fields | Direct table update RLS | Skips date guardrail RPC | Medium | Audit/remove or route through date RPC | 10F4/10F5 |
| `rpc_update_order_dates(...)` | Date update RPC | Available | `site_visit_at`, `review_due_at`, `final_due_at` | RPC current-company/read/update checks | Narrower backend boundary | Low | Preferred date mutation backend | 10F4 |
| `rpc_update_due_dates(...)` | Date update RPC | Available | `due_date`, `review_due_date` | RPC current-company/read/update checks | Narrower backend boundary | Low | Keep compatibility until date model is rationalized | Monitor |
| `ordersService.assignParticipants(...)`, `assignAppraiser`, `assignReviewer` | Assignment/reviewer update | Available | `appraiser_id`, `reviewer_id` | Direct table update RLS | Can skip assignable-target RPC/activity validation | Medium | Migrate appraiser assignment to `rpc_assign_order`; reviewer requires redesign or safe RPC | 10F4 |
| `src/lib/api/orders.js#assignAppraiser/assignClient/bulkAssignAppraiser` | Assignment/client update | Unknown/available | `appraiser_id`, `client_id` | Direct table update RLS | Can skip assignment/client attachment guards and activity | Medium | Audit and replace/narrow | 10F4/10F5 |
| `rpc_assign_order(...)` | Assignment update | Available | `assigned_to` | RPC current-company/read/update/assignment permissions and target eligibility | Inserts assignment activity | Low | Preferred appraiser assignment path if field semantics align | 10F4 |
| `src/lib/api/orders.js#archiveOrder` / `ordersService.archiveOrder` | Archive | Available | `is_archived` | Direct table update RLS | No explicit archive audit contract | Medium | Decide archive RPC vs delete policy before restriction | 10F4/10F5 |
| `ordersService.deleteOrder(orderId)` | Delete | Exported | hard delete | Direct table delete RLS | Deletes row; side effects depend on FK/triggers | High if used | Prefer archive RPC/design; avoid hard delete from UI | 10F2/10F5 |
| `orders_update_company_authorized` RLS | Direct table update policy | Yes | Any column | Row-scoped update predicate | Enforces tenant/update authority but not per-field side effects | Medium | Restrict only after active callers migrated | 10F6/10F7 |
| `orders_insert_company_authorized` RLS | Direct table insert policy | Yes | Any insertable column | Create permission and company check | Allows direct insert path while helpers remain | Medium | Restrict after create helpers migrated/quarantined | 10F6/10F7 |
| `orders_delete_company_authorized` RLS | Direct table delete policy | Yes | hard delete | Current-company plus delete/archive permission | Hard delete behavior preserved | Medium/High | Design archive/delete RPC before restriction | 10F6/10F7 |

## Active vs Legacy Summary

Active and relatively safe:

- New-order create through `rpc_create_order(...)`.
- Explicit order-number override through `rpc_order_number_override(...)`.
- Main workflow smart actions through `rpc_transition_order_status(...)`.

Active and still direct:

- Normal edit save through `ordersService.updateOrder(...)`.

Available/legacy and direct:

- direct create helpers;
- direct date update helpers;
- direct assignment helpers;
- direct archive/delete helpers;
- legacy status helper aliases and utility paths.

Available RPCs needing consolidation decisions:

- two generic update RPCs with overlapping but different field coverage;
- date RPCs with narrower behavior;
- assignment RPCs that may not map one-to-one with current appraiser/reviewer field semantics.

## Recommended Phase 10F Bigger-Slice Plan

### 10F2: Update-Path Consolidation Design And Test Plan

Design the active edit migration in one coherent slice before code changes.

Questions to answer:

- Which backend RPC should become the ordinary edit path: existing `rpc_update_order(...)`, existing `rpc_order_update(...)`, or a new narrow successor?
- Which exact `OrderForm` fields must round-trip?
- Which fields require client/AMC attachment guards?
- Which fields should write activity, and which should remain silent edits?
- Which targeted tests should prove behavior preservation?

Deliverable:

- design doc plus test matrix for active edit migration.

10F2 result: completed as documentation plus read-only inspection in `docs/ORDER_EDIT_RPC_MIGRATION_DESIGN.md`. The design recommends adding `updateOrderViaRpc(orderId, patch)` and wiring active `OrderForm` edit submit to it in 10F3, with `rpc_update_order(order_id uuid, patch jsonb)` as the first target RPC. It also records field coverage gaps: `rpc_update_order(...)` covers client/manual client/AMC, appraiser, fees, property address/city/state/postal code, and notes, but does not currently cover reviewer, `split_pct` as sent, property/report type, entry contact fields, or review/final date fields. 10F3 must either accept/defer uncovered fields explicitly or expand the backend RPC narrowly in the same medium slice with SQL smoke tests.

10F3A result: completed as documentation plus read-only inspection in `docs/ORDER_UPDATE_RPC_FIELD_COVERAGE_DESIGN.md`. The coverage matrix recommends a backend-coverage-first 10F3B slice that expands `rpc_update_order(...)` narrowly for current normal edit payload parity before frontend wiring. Required added fields are `reviewer_id`, `split_pct`, `property_type`, `report_type`, `entry_contact_name`, `entry_contact_phone`, `site_visit_at`, `review_due_at`, and `final_due_at`. The expansion should preserve current authorization/scoping, client/AMC attachment guards, explicit field-by-field updates, and `order_number` rejection. Frontend edit submit migration should wait until this coverage is verified.

10F3B result: implemented in `supabase/migrations/20260518066000_rpc_update_order_edit_field_coverage.sql`. `rpc_update_order(order_id uuid, patch jsonb)` now explicitly covers the missing current normal edit payload fields from 10F3A, preserves the existing covered fields, keeps `order_number` rejected, preserves update authorization and client/AMC attachment guards, and does not add status/workflow or tenant mutation authority. Frontend edit submit remains unwired and still uses the current direct helper until 10F3C.

10F3C result: implemented in `src/lib/services/ordersService.js` and `src/components/orders/form/OrderForm.jsx`. `updateOrderViaRpc(orderId, patch)` now calls `rpc_update_order` with `{ order_id, patch }`, and active normal `OrderForm` edit submit uses that wrapper. Create remains on `createOrderViaRpc(...)`, explicit order-number override remains on `overrideOrderNumber(...)`, `order_number` remains excluded from normal payloads, and the direct `updateOrder(...)` helper remains exported but is no longer the active normal form edit path.

### 10F3: Migrate Active Edit/Update Service To Guarded RPC

Medium implementation slice.

Scope:

- First add/verify missing `rpc_update_order(...)` field coverage if not already complete.
- Move `OrderForm` edit submit or `ordersService.updateOrder(...)` to the selected guarded RPC.
- Preserve current UI behavior.
- Keep direct table helpers exported but no longer primary active edit path.
- Add focused service/form tests.

Do not restrict RLS in this slice.

### 10F4: Status / Smart Action / Assignment / Date Mutation Audit

Larger audit plus targeted cleanup plan.

Scope:

- Confirm active smart action call graph.
- Identify any mounted legacy surfaces such as `OrderActionsPanel`.
- Compare direct assignment/date helpers to existing RPCs.
- Decide which helpers can be rewritten in one medium implementation slice.

10F4 result: completed as documentation plus read-only inspection in `docs/ORDER_MUTATION_REMAINING_PATH_AUDIT.md`. Active create, normal edit, and explicit order-number override paths are now RPC-backed. Active smart workflow actions in `UnifiedOrdersTable` use canonical `ordersService` helpers backed by `rpc_transition_order_status(...)`. The highest confirmed active direct mutations remaining are site-visit/date updates: `UnifiedOrdersTable` calls `src/lib/api/orders.js#updateSiteVisitAt(...)`, and `OrderDetail.saveAppt(...)` direct-updates `orders.site_visit_at`. `OrderActionsPanel`, `ReviewerActionCell`, `features/orders/actions.js`, and `lib/utils/updateOrderStatus.js` appear legacy or unmounted in this inspection, but they remain risky if reintroduced. Recommended next batch is date/site-visit mutation consolidation before direct helper deprecation or RLS restriction.

10F5A result: completed as documentation plus read-only inspection in `docs/SITE_VISIT_DATE_RPC_MIGRATION_DESIGN.md`. The design recommends one medium implementation slice that adds or adjusts a site-visit update wrapper to use `updateOrderViaRpc(orderId, { site_visit_at })`, migrates both `UnifiedOrdersTable` and `OrderDetail.saveAppt(...)`, and preserves the existing best-effort `rpc_create_calendar_event(...)` projection after successful order update. Calendar side effects should remain frontend-orchestrated for the first migration; moving them into one backend transaction is deferred to a separate calendar design.

10F5B result: implemented the active site-visit migration. `updateSiteVisitAtViaRpc(orderId, siteVisitAt)` now uses `updateOrderViaRpc(...)`; `src/lib/api/orders.js#updateSiteVisitAt(...)` no longer direct-updates `orders` and still performs best-effort `rpc_create_calendar_event(...)` after a successful update; `OrderDetail.saveAppt(...)` now uses the RPC-backed wrapper and still only refreshes the detail view. No backend/RPC behavior, status/workflow behavior, RLS policy, route, registry, or broad date mutation behavior changed.

10F6 result: completed as documentation plus read-only inspection in `docs/ORDER_DIRECT_HELPER_DEPRECATION_PLAN.md`. The audit classifies remaining direct helper exports by active path, legacy/unmounted status, risk, replacement availability, and timing. Active primary create/edit/site-visit/order-number/status paths are RPC-backed or canonical. The remaining direct helpers should receive grouped deprecation comments and optional development-only usage warnings before any RLS restriction. Assignment, archive, and delete helpers should not be removed until their semantics are designed.

10F7 result: implemented deprecation annotations and development-only usage guards for high-risk direct order mutation helpers. `ordersService` and `src/lib/api/orders.js` now warn in development when direct create/update/delete/archive/status/date/assignment helpers are called, while canonical RPC wrappers remain quiet. Legacy action adapters in `src/features/orders/actions.js` and the legacy direct status fallback in `src/lib/utils/updateOrderStatus.js` also warn in development. No helpers were removed and no active app behavior, backend/RPC behavior, or RLS policy changed.

10F8 result: completed as documentation plus read-only inspection in `docs/ORDER_RPC_ONLY_MUTATION_CLOSEOUT.md`. The closeout finds active primary create, edit, site-visit, order-number override, and smart workflow mutation paths are RPC-backed or canonical. Remaining risks are exported deprecated direct helpers, row-scoped direct-write RLS policies, assignment/archive/delete semantics that still need dedicated design, frontend-orchestrated calendar projection, and deferred legacy numbering compatibility. Recommended decision: proceed to Phase 10G RLS restriction design and active route/import smoke, not immediate RLS restriction implementation.

10G1 result: completed as documentation plus read-only schema/code inspection in `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_DESIGN.md`. The design inventories current `orders` read/write RLS policies and recommends leaving read/select policies unchanged, running route/import smoke in 10G2, then using a narrow 10G3 direct-write restriction only if active create/edit/site-visit/status/override paths prove RPC-backed. The preferred first implementation shape is a write-policy restriction that blocks authenticated direct insert/update/delete while preserving canonical security-definer RPC mutation paths. Helper removal, assignment/archive/delete semantics changes, uniqueness changes, and status/workflow behavior changes remain out of scope.

10G3 result: implemented in `supabase/migrations/20260518067000_restrict_orders_direct_writes.sql`. Direct authenticated insert/update/delete policies on `public.orders` are now explicit RPC-only false policies, while `orders_select_company_lifecycle_visibility` and order read projections remain unchanged. SQL smoke confirmed canonical create, update, site-visit update, status transition, and order-number override RPCs still succeed; direct authenticated insert is rejected and direct authenticated update/delete affect zero rows. Deprecated direct helper exports remain in code with development warnings, but real authenticated table writes are no longer accepted by RLS. Local `supabase db reset` applied the migration but exited nonzero because the storage container health check was unhealthy; direct DB smoke passed against the reset database.

10G4 result: completed as documentation plus verification review in `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_CLOSEOUT.md`. The closeout locks Phase 10G as complete: direct authenticated order writes are blocked, active RPC mutation flows are preserved, select/read access is preserved, and service-role direct behavior remains available. Deprecated direct helpers remain exported and development-warned; removal is deferred until route/browser smoke and runtime confidence justify it. The local Supabase storage health-check failure is documented separately from the successful order/RLS DB smoke and should be handled only if storage-backed features or clean reset health become current priorities.

### 10F5: Direct Helper Deprecation / Warnings

Implementation slice after active callers are moved.

Scope:

- Mark or remove unused direct create/update helpers.
- Keep compatibility wrappers only where needed.
- Prefer warnings/comments/tests over silent behavior changes when call-site uncertainty remains.

### 10F6: RLS Direct-Write Restriction Design

Design-only backend slice.

Scope:

- Inspect grants and PostgREST behavior.
- Decide whether to revoke direct insert/update/delete from authenticated, split column privileges, or add trigger guards.
- Define service-role/operator compatibility.
- Define rollback.

### 10F7: Backend Restriction Implementation If Safe

Small backend slice.

Scope:

- Apply the chosen direct-write restriction.
- Run SQL smoke for RPC create/edit/status/date/assignment/override.
- Confirm no active frontend mutation path depends on direct table writes.

### 10F8: Closeout

Document the final order mutation authority map and remaining deferred compatibility objects.

## Recommended Immediate Next Step

Proceed to a date/site-visit consolidation batch, not RLS restriction or broad helper removal.

10F2 and 10F3 completed the active normal edit migration. 10F4 found the highest confirmed active direct writes now sit in site-visit/date mutation paths: `UnifiedOrdersTable` via `updateSiteVisitAt(...)` and `OrderDetail.saveAppt(...)`. The next implementation should design and migrate those active date paths in one coherent batch, preserving calendar-event behavior where required.

## Do Not Do Yet

- Do not restrict `orders` RLS before all active direct callers are mapped and migrated.
- Do not remove direct helpers before callers are migrated or proven unused.
- Do not change status workflow behavior casually.
- Do not change assignment permissions casually.
- Do not alter notification/activity behavior without explicit tests.
- Do not collapse all order mutations into one mega-RPC.
- Do not use RPC-only migration as a reason to broaden permissions.
- Do not change order-number override or numbering uniqueness in this phase.

## Validation Guidance

For doc-only strategy slices:

- `git diff --check` is sufficient unless code changes are bundled.

For future implementation checkpoints:

- Use targeted tests for the moved surface first.
- Use SQL smoke for RPC/RLS changes.
- Run full `npm test`, `npm run lint`, and `npm run build` at meaningful checkpoints rather than after every planning doc.
