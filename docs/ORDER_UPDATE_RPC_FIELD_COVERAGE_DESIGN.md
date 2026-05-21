# Order Update RPC Field Coverage Design

## Purpose

Phase 10F3A designs the minimal field coverage expansion needed before normal `OrderForm` edit submit can move from direct `orders` table update to a guarded RPC update path.

This is documentation-only plus read-only inspection. It does not add migrations, backend behavior changes, frontend behavior changes, tests, RLS changes, RPC changes, routes, registries, UI changes, or direct helper removal.

## Sources Inspected

Docs inspected:

- `docs/ORDER_EDIT_RPC_MIGRATION_DESIGN.md`
- `docs/ORDER_MUTATION_RPC_ONLY_STRATEGY.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Backend inspected:

- `public.rpc_update_order(order_id uuid, patch jsonb)`
- `public.rpc_order_update(p_order_id uuid, p jsonb)`
- quarantined `public.rpc_order_update(p_order_id text, p_patch jsonb)`
- `public.orders` columns in the baseline schema
- `current_app_user_can_update_order_row(...)`
- client/AMC attachment helpers
- dedicated date RPC references
- Phase 10E8L `order_number` rejection migration

Frontend inspected:

- `src/components/orders/form/OrderForm.jsx`
- `buildOrderPayload(...)`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/lib/services/ordersService.js`
- `src/components/orders/form/__tests__/OrderForm.test.jsx`

## Current Finding

Active edit submit still builds a full normal edit payload and sends it through `ordersService.updateOrder(...)`, which direct-updates `public.orders`.

The preferred migration target remains `rpc_update_order(order_id uuid, patch jsonb)`, but current field coverage is incomplete for behavior parity:

- it covers client/manual client/AMC, appraiser, base/appraiser fee, property address/city/state/postal code, and notes;
- it rejects `order_number`, which must be preserved;
- it does not currently cover reviewer, `split_pct` as sent by the form, property/report type, entry contact fields, or review/final date fields;
- it updates `appraiser_split`, but the active form sends `split_pct`.

`rpc_order_update(p_order_id uuid, p jsonb)` is not a better direct migration target because it covers reviewer and `site_visit_at`, but misses or renames several active form fields: `property_address`, `postal_code`, `base_fee`, `appraiser_fee`, `split_pct`, contact fields, property/report type, and notes.

## Field Coverage Matrix

| Form payload key | DB column / target | Current direct update supports? | Current `rpc_update_order` supports? | Should RPC support for edit migration? | Risk level | Notes |
|---|---|---:|---:|---:|---|---|
| `client_id` | `orders.client_id` | Yes | Yes | Yes | Medium | Relationship field; keep existing client attach guard. |
| `manual_client_name` | `orders.manual_client_name`, compatibility `manual_client` | Yes | Yes | Yes | Low | Current RPC coalesces manual client values; confirm null-clearing behavior in implementation. |
| `managing_amc_id` | `orders.managing_amc_id` | Yes | Yes | Yes | Medium | Relationship field; keep existing AMC attach guard. |
| `appraiser_id` | `orders.appraiser_id` | Yes | Yes | Yes, if preserving current edit behavior | Medium | Assignment semantics should be revisited later, but current edit form legitimately sends it. |
| `reviewer_id` | `orders.reviewer_id` | Yes | No | Yes, if preserving current edit behavior | Medium | Add narrow support using the same update guard. Avoid touching `current_reviewer_id` or review-route state. |
| `base_fee` | `orders.base_fee` | Yes | Yes | Yes | Low | Existing coverage. |
| `split_pct` | `orders.split_pct`; possibly compatibility `orders.appraiser_split` | Yes | No, only `appraiser_split` | Yes | Medium | Normalize explicitly. Recommended: support `split_pct` and optionally mirror to `appraiser_split` only if existing read/model compatibility requires it. |
| `appraiser_fee` | `orders.appraiser_fee` | Yes | Yes | Yes | Low | Existing coverage. |
| `property_address` | `orders.property_address`; possibly compatibility `orders.address` | Yes | Yes | Yes | Low | Existing coverage for `property_address`. Do not overwrite `address` unless compatibility is explicitly desired. |
| `city` | `orders.city` | Yes | Yes | Yes | Low | Existing coverage. |
| `state` | `orders.state` | Yes | Yes | Yes | Low | Existing coverage. |
| `postal_code` | `orders.postal_code`; legacy `orders.zip` | Yes | Yes | Yes | Low | Existing coverage for `postal_code`. Avoid implicit `zip` writes unless compatibility is intentional. |
| `property_type` | `orders.property_type` | Yes | No | Yes | Low | Safe scalar metadata; preserve current edit behavior. |
| `report_type` | `orders.report_type` | Yes | No | Yes | Low | Safe scalar metadata; preserve current edit behavior. |
| `entry_contact_name` | `orders.entry_contact_name` | Yes | No | Yes | Low | Safe contact metadata. |
| `entry_contact_phone` | `orders.entry_contact_phone` | Yes | No | Yes | Low | Safe contact metadata. |
| `site_visit_at` | `orders.site_visit_at` | Yes | No | Yes, or route through date RPC later | Medium | Scheduling field; current edit form sends it. Preserve now, audit dedicated date RPC consolidation later. |
| `review_due_at` | `orders.review_due_at` | Yes | No | Yes, or route through date RPC later | Medium | Scheduling/workflow-sensitive; preserve current behavior without status transition side effects. |
| `final_due_at` | `orders.final_due_at` | Yes | No | Yes, or route through date RPC later | Medium | Scheduling/workflow-sensitive; preserve current behavior without status transition side effects. |
| `notes` | `orders.notes` | Yes | Yes | Yes | Low | Existing coverage. |
| `status` | `orders.status` | No for edit payload | No | No | High if added | Status transitions stay on workflow RPCs. |
| `order_number` | `orders.order_number` | No longer sent | Rejected | No | High | Must remain excluded and rejected; override RPC is the only supported path. |
| `company_id` | `orders.company_id` | Not sent | No | No | High | Tenant scope must never be editable through normal order edit. |
| `owner_id`, role, permission, package/module fields | n/a | Not sent | No | No | High | Not part of order edit authority. |

## Field Categories

### Safe Scalar Edit Fields

These are reasonable for `rpc_update_order(...)` to support directly for the 10F3B backend expansion:

- `base_fee`
- `split_pct`
- `appraiser_fee`
- `property_address`
- `city`
- `state`
- `postal_code`
- `property_type`
- `report_type`
- `entry_contact_name`
- `entry_contact_phone`
- `notes`

The implementation should continue to avoid broad JSON-to-column patching. Each field should be listed explicitly.

### Relationship / Client / AMC Fields

These are already within the current edit form and should remain guarded:

- `client_id`
- `manual_client_name`
- `managing_amc_id`

`rpc_update_order(...)` already has client and AMC attachment guards. 10F3B should preserve those guards and avoid weakening same-company attachment checks.

### Assignment Fields

Current normal edit sends:

- `appraiser_id`
- `reviewer_id`

`rpc_update_order(...)` supports `appraiser_id` but not `reviewer_id`. To preserve current edit behavior, 10F3B should add explicit `reviewer_id` support. This should not touch `assigned_to`, `current_reviewer_id`, review-route JSON, assignment packet state, vendor/client assignment state, or workflow status.

Assignment semantics deserve a later 10F4 audit, but blocking the edit migration on a full assignment redesign would keep the active direct table write in place longer than needed.

### Date Fields

Current normal edit sends:

- `site_visit_at`
- `review_due_at`
- `final_due_at`

Dedicated date RPCs exist, but the active edit form currently treats these as ordinary edit fields. For behavior parity, 10F3B should either:

- add these fields explicitly to `rpc_update_order(...)`, or
- intentionally split edit submit into a generic update RPC plus date RPC.

The safer first implementation is one narrow expansion of `rpc_update_order(...)` so the active edit submit has one backend boundary. A later 10F4 audit can decide whether date-only mutation surfaces should be consolidated.

### Report / Property / Contact Fields

Current normal edit sends:

- `property_type`
- `report_type`
- `entry_contact_name`
- `entry_contact_phone`

These are low-risk scalar metadata fields and should be included in the narrow RPC expansion for behavior parity.

### Workflow / Status Fields

`status` is not sent by edit payload and must stay out of generic edit updates. Workflow status transitions remain separate through canonical workflow RPCs.

Do not add:

- `status`
- `review_stage`
- `review_route`
- `review_claimed_by`
- `review_claimed_at`
- assignment lifecycle or packet status fields

### Excluded / Dangerous Fields

Do not support through generic edit RPC:

- `order_number`
- `company_id`
- `owner_id`
- `id`
- created/updated ownership fields other than server-managed `updated_at`
- product-mode/module fields
- package/entitlement fields
- Vendor/Client activation fields
- broad JSON patching into unknown columns

## Recommended 10F3B Backend Expansion

Add one backend migration that replaces `public.rpc_update_order(order_id uuid, patch jsonb)` only if the implementation slice is backend-coverage-first.

Required behavior:

- preserve function signature and return type;
- preserve `security definer` and stable `search_path`;
- preserve authorization/scoping through `current_app_user_can_update_order_row(...)`;
- preserve client/AMC attachment guards;
- preserve `order_number` rejection;
- keep explicit field-by-field updates;
- add support for current form fields that are missing:
  - `reviewer_id`
  - `split_pct`
  - `property_type`
  - `report_type`
  - `entry_contact_name`
  - `entry_contact_phone`
  - `site_visit_at`
  - `review_due_at`
  - `final_due_at`
- normalize `split_pct` / split naming explicitly:
  - prefer writing `orders.split_pct` because that is the active form payload and schema column;
  - consider mirroring `appraiser_split` only if current reads still require it, and document the compatibility reason;
- return the updated `public.orders` row for compatibility with the current edit flow.

Recommended SQL smoke tests for 10F3B:

- normal scalar update succeeds;
- client attachment still enforces attachability;
- AMC attachment still enforces attachability;
- reviewer update succeeds when caller is authorized;
- `split_pct` updates the intended column;
- property/report/contact fields update;
- date fields update;
- `order_number` patch is still rejected;
- `status` remains unsupported by the generic update path;
- unauthorized/no current-company caller is rejected.

## Recommended 10F3C Frontend Migration

After backend coverage is verified:

1. Add `updateOrderViaRpc(orderId, patch)` to `src/lib/services/ordersService.js`.
2. Call `supabase.rpc("rpc_update_order", { order_id: orderId, patch })`.
3. Wire `OrderForm` edit submit to `updateOrderViaRpc(...)`.
4. Keep `ordersService.updateOrder(...)` exported for compatibility but no longer used by active normal edit submit.
5. Preserve create path on `createOrderViaRpc(...)`.
6. Preserve explicit override path on `overrideOrderNumber(...)`.
7. Add parity tests in one pass.

## No-Go Rules

- No `order_number` in normal edit payload or generic update RPC.
- No broad arbitrary JSON-to-column update.
- No status transition bypass.
- No tenant/company change.
- No create behavior changes.
- No direct helper removal yet.
- No RLS restriction yet.
- No Owner Setup numbering or order mutation changes.
- No Vendor/Client activation or product-mode/module authority changes.

## Open Questions For Implementation

- Should `split_pct` update only `orders.split_pct`, or also mirror `orders.appraiser_split` for compatibility?
- Should null/blank patch values clear fields or preserve existing values? Current RPC mostly preserves existing values through `coalesce`; current direct table update can write nulls.
- Should `reviewer_id` values be normalized through `fn_to_users_id(...)` like `rpc_order_update(...)`, or accepted as the app user UUID currently stored by active form state?
- Should date fields remain in generic edit RPC long term, or move to dedicated date RPCs after the active direct write is retired?
- Should scalar edit updates write activity entries? Current direct edit path does not appear to guarantee field-level activity.

## Phase 10F3B Implementation Result

Phase 10F3B implemented the backend-coverage-first slice in `supabase/migrations/20260518066000_rpc_update_order_edit_field_coverage.sql`.

`public.rpc_update_order(order_id uuid, patch jsonb)` now supports the current normal `OrderForm` edit payload through explicit field coverage:

- `reviewer_id`
- `split_pct`
- `property_type`
- `report_type`
- `entry_contact_name`
- `entry_contact_phone`
- `site_visit_at`
- `review_due_at`
- `final_due_at`

Existing supported fields remain covered:

- `client_id`
- `manual_client_name` / `manual_client`
- `managing_amc_id`
- `appraiser_id`
- `base_fee`
- `appraiser_fee`
- `property_address`
- `city`
- `state`
- `postal_code`
- `notes`

Behavior preserved:

- function signature remains `public.rpc_update_order(order_id uuid, patch jsonb) returns public.orders`;
- `security definer` and `search_path = public` remain;
- authenticated execute grant is preserved;
- `order_number` patches remain rejected with the existing message directing callers to `rpc_order_number_override(...)`;
- client/AMC attachment guards are preserved;
- existing update authorization through `current_app_user_can_update_order_row(...)` is preserved;
- status/workflow fields are not updated by this RPC;
- company/tenant fields are not updated by this RPC;
- frontend edit submit is still not wired to the RPC in this slice.

Compatibility note:

- `split_pct` updates both `orders.split_pct` and `orders.appraiser_split` in this migration. This preserves the active form payload column while keeping existing compatibility/read surfaces that still reference `appraiser_split` aligned.

Validation notes:

- Local `supabase db reset` passed with this migration in the replay chain.
- Transaction-scoped SQL smoke verified new field updates, null clearing for the new fields, existing covered field updates, and `order_number` rejection.
- A first reviewer smoke attempt without a Reviewer role assignment failed on `tg_orders_validate_assignment_targets()`, confirming existing assignment guardrails remain active. The final smoke used an assignable reviewer fixture and passed.

Next:

- 10F3C should add `updateOrderViaRpc(orderId, patch)` and wire normal `OrderForm` edit submit to it while preserving create and explicit order-number override paths.

## Phase 10F3C Wiring Result

Phase 10F3C completed the frontend wiring that this backend coverage enabled.

- `updateOrderViaRpc(orderId, patch)` was added to `src/lib/services/ordersService.js`.
- Normal `OrderForm` edit submit now calls `updateOrderViaRpc(...)`.
- The direct `updateOrder(...)` helper remains available but is no longer used by active normal `OrderForm` edit submit.
- Create submit remains on `createOrderViaRpc(...)`.
- Explicit order-number override remains on `overrideOrderNumber(...)`.
- `order_number` remains excluded from normal create/edit payloads.

Recommended next grouped work:

- 10F4 should audit status, date, assignment, and smart-action mutation helpers as a batch before any direct helper deprecation or RLS restriction.
