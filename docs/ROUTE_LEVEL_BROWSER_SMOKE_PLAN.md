# Route-Level Browser Smoke Plan

## Purpose

Phase 10I1 defines the browser smoke checklist to run after the Phase 10G direct authenticated `orders` write restriction and Phase 10H Owner Setup polish.

This is documentation-only plus read-only inspection. It does not add runtime code, migrations, backend behavior, route changes, registry changes, UI changes, tests, RLS/RPC changes, or helper removal.

## Sources Inspected

Docs inspected:

- `docs/ORDER_DIRECT_WRITE_RLS_RESTRICTION_CLOSEOUT.md`
- `docs/OWNER_SETUP_PRODUCT_POLISH_HANDOFF.md`
- `docs/ORDER_RPC_ONLY_MUTATION_CLOSEOUT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Runtime inspected:

- `src/routes/index.jsx`
- `src/pages/admin/OwnerSetup.jsx`
- `src/pages/NewOrder.jsx`
- `src/pages/orders/EditOrder.jsx`
- `src/pages/orders/OrderDetail.jsx`
- `src/pages/orders/Orders.jsx`
- `src/components/orders/form/OrderForm.jsx`
- `src/components/orders/form/AssignmentFields.jsx`
- `src/features/orders/UnifiedOrdersTable.jsx`
- `src/features/orders/columns/ordersColumns.jsx`
- `src/features/orders/smartActions.js`
- `src/lib/services/ordersService.js`
- `src/lib/api/orders.js`

## Current Route / Mutation Map

| Flow | Route / surface | Expected mutation path |
|---|---|---|
| Owner Setup | `/settings/owner-setup` | `rpc_company_setup_context()` read through setup context hook; Company Profile save through guarded profile update wrapper |
| Order Create | `/orders/new` | `createOrderViaRpc(...)` -> `rpc_create_order(...)` |
| Order Edit | `/orders/:id/edit` | `updateOrderViaRpc(...)` -> `rpc_update_order(...)` |
| Order Detail | `/orders/:id` | detail read plus detail site visit save through `updateSiteVisitAtViaRpc(...)` |
| Orders Table | `/orders` and dashboard worklists | table site visit save through `updateSiteVisitAt(...)`, which delegates to the RPC site-visit wrapper and preserves best-effort calendar projection |
| Status / Smart Actions | `/orders`, `/dashboard`, drawer/table action surfaces | canonical workflow helpers -> `rpc_transition_order_status(...)` |
| Order Number Override | `/orders/:id/edit` | explicit dialog -> `overrideOrderNumber(...)` -> `rpc_order_number_override(...)` |

## Recommended Order Of Execution

1. Sign in as an Owner/Admin user with active current-company context.
2. Confirm smoke data requirements are met.
3. Run Owner Setup smoke first because it verifies current-company context and the profile write path.
4. Run Order Create next to generate a fresh order through the post-RLS create RPC path.
5. Use that created order for Order Edit and Order Number Override smoke where practical.
6. Run table and detail Site Visit smoke on a safe editable order.
7. Run Status / Smart Actions last, using an order whose current status supports a visible transition.
8. Re-open `/orders` and the relevant `/orders/:id` detail page after mutations to confirm final read state.

## Smoke Data Requirements

- At least one existing order visible to the smoke user.
- One order in a status that supports a smart action transition, such as `new`, `in_progress`, `needs_revisions`, `in_review`, `review_cleared`, `pending_final_approval`, or `ready_for_client`, depending on the role and permissions used for the smoke.
- User with Owner/Admin permissions for Owner Setup, create, edit, normal table actions, and order-number override checks.
- User/session with active current company context so guarded current-company RPCs can resolve membership and permissions.
- Optional test company/profile data that can safely tolerate a temporary company name/timezone/locale update and then restoration.
- Optional appraiser/reviewer/client records available for order create/edit form selectors.

## Route / Flow Checklist

| Step | Route / flow | Action | Expected result | Failure signs | Blocker? | Notes |
|---:|---|---|---|---|---|---|
| 1 | Owner Setup | Open `/settings/owner-setup`. | Page loads behind `settings.view`; setup guidance, context status, grouped cards, authority boundary, and sample fallback render. | Redirect for authorized Owner/Admin, blank page, crash, missing grouped cards, console render error. | Blocker | Confirms route guard and shell after 10H polish. |
| 2 | Owner Setup | Wait for live setup context. | Either live setup context loads with live readiness status, or a safe permission/error/fallback message appears while static sample fallback remains visible. | Unsafe crash, indefinite spinner, raw sensitive error, readiness copy implying access grant/denial. | Blocker if crash or unsafe error; non-blocker if expected permission fallback for the test user. | Capture whether live context or fallback was used. |
| 3 | Owner Setup | Edit Company Profile name/timezone/locale and save. | Save uses guarded profile path, shows success, refetches context, and displays updated values. | Permission error for Owner/Admin, `42501`, direct table-write error, no refetch, stale values after reload. | Blocker for expected-authorized Owner/Admin; non-blocker if intentionally underprivileged session shows safe error. | Restore original profile values after smoke if needed. |
| 4 | Owner Setup | Inspect deferred and diagnostic cards. | Deferred cards remain non-actionable; no fake disabled controls, setup completion buttons, module activation, Vendor/Client shell links, or order-numbering configuration controls. | New actionable controls outside Company Profile, language implying setup grants access, route links to live Vendor/Client shells. | Blocker | Validates 10H no-go boundary. |
| 5 | Order Create | Open `/orders/new`. | New Order form loads; order number display says generated on save; no order-number input or manual availability prefetch is visible. | Browser calls `rpc_get_next_order_number`, order number field is editable, page errors before input. | Blocker | Network panel should not show order-number prefetch on route load. |
| 6 | Order Create | Create a valid order and save. | Save succeeds through `rpc_create_order(...)`; toast indicates creation; navigation goes to `/orders/:id` when an id is returned. | Direct `orders` insert blocked by `42501`, RLS write error, missing order id, duplicate/client validation unexpectedly blocks valid data. | Blocker | Capture returned order id and order number. |
| 7 | Order Create | Confirm created order display. | Order detail/header or list shows server-generated order number after save/navigation. | Order number missing, UUID-only visible identity, stale generated-on-save label after save. | Blocker | Re-open `/orders` and search if needed. |
| 8 | Order Edit | Open `/orders/:id/edit` for an existing order. | Edit form loads; order number is display-only; `Change order number` is the only order-number mutation affordance. | Editable ordinary order-number input, missing current order number, load failure for readable order. | Blocker | Prefer the order created in this smoke if safe. |
| 9 | Order Edit | Change ordinary editable fields and click `Save Changes`. | Save succeeds through `rpc_update_order(...)`; navigates back to order detail; changed ordinary fields persist. | Direct `orders` update blocked by RLS, `42501`, RPC rejects normal allowed field, save silently fails. | Blocker | Use a low-risk field such as notes or dates. |
| 10 | Order Edit | Confirm order number after normal edit. | Order number remains unchanged after normal edit save and after page reload. | Normal edit changes order number, normal edit payload/RPC error references `order_number`. | Blocker | Confirms explicit override remains separate. |
| 11 | Site Visit - table path | Open `/orders` or `/dashboard` worklist with an appraiser-visible order lacking a site visit, then set site visit from the table date control. | Site visit updates through RPC-backed table helper; table refreshes; success toast appears. Calendar side effect may succeed or fail without causing the order update to fail. | Direct `orders` update RLS error, site visit remains unchanged, calendar RPC failure blocks order update, crash in date picker. | Blocker if order date update fails; non-blocker if only best-effort calendar projection fails safely. | Capture both `rpc_update_order` and optional `rpc_create_calendar_event` network results. |
| 12 | Site Visit - detail path | Open `/orders/:id`, update Site Visit from the detail page date control. | Site visit saves through `updateSiteVisitAtViaRpc(...)`; detail refreshes and displays the new date/time. | Alert with RLS/direct-write error, stale date after refresh, direct table update call. | Blocker | Detail path does not add calendar projection today. |
| 13 | Status / Smart Actions | Use `/orders` or `/dashboard` to run one visible normal smart action, such as Send to Review, Clear Review, Request Final Approval, Mark Ready for Client, or Mark Complete. | Action succeeds through `rpc_transition_order_status(...)`; status changes in the table/detail; no direct-write RLS errors appear. | `42501`, direct `orders` update failure, action visible but disabled despite correct permissions/status, status unchanged after refresh. | Blocker | Pick the action that matches the available order status and current role permissions. |
| 14 | Status / Smart Actions | If the action opens a note modal, submit with a short smoke note or blank note as allowed. | Modal closes, status transition completes, optional note behavior does not block canonical transition unexpectedly. | Note logging failure blocks a transition that should be allowed, modal stuck busy, unsafe raw error. | Blocker if transition is blocked; non-blocker if optional note creation fails but transition behavior is clearly reported and recoverable. | Capture whether `logNote` ran before the transition. |
| 15 | Order Number Override | Open `/orders/:id/edit`, click `Change order number`, enter a unique candidate, and save. | Override succeeds through `rpc_order_number_override(...)`, dialog closes, displayed order number updates, and detail/list reads show the new number. | Direct update RLS error, unsafe raw permission error, dialog claims success without persisted readback. | Blocker for expected-authorized Owner/Admin; non-blocker if safe permission error is expected for the smoke user. | Use a reversible test number and restore if needed. |
| 16 | Order Number Override | Try an unavailable or unauthorized override scenario if safe. | UI shows safe permission/conflict guidance; normal edit save remains available and separate. | Normal edit blocked after failed override, raw SQL leakage, override error changes unrelated form state. | Blocker if normal edit separation breaks; otherwise non-blocker. | Do not use production-critical order numbers. |
| 17 | Final readback | Re-open `/orders`, `/orders/:id`, and `/orders/:id/edit` for the smoke order. | Created/edited/site-visit/status/order-number states read consistently across list, detail, and edit surfaces. | Mismatched order number/status/site visit, list cannot read rows after RLS restriction, UUID-only user-facing identity. | Blocker | This is the final confidence check before new product work. |

## Expected Network Signals

Expected successful RPC names during smoke:

- `rpc_company_setup_context`
- `rpc_company_profile_update`
- `rpc_create_order`
- `rpc_update_order`
- `rpc_transition_order_status`
- `rpc_order_number_override`
- optional `rpc_create_calendar_event` after table site-visit update

Unexpected blocker signals:

- direct authenticated `orders` insert/update/delete from browser code;
- `orders_insert_rpc_only`, `orders_update_rpc_only`, or `orders_delete_rpc_only` RLS failures during normal user flows;
- `42501` on an action the current Owner/Admin should be allowed to perform;
- calls to legacy order-number prefetch/generation during `/orders/new` route load;
- status changes through any non-canonical direct update path.

## What To Capture If Something Fails

For each failure, capture:

- Route.
- Action attempted.
- Visible UI message.
- Browser console error.
- Network RPC name and HTTP/status result.
- Supabase/Postgres error code and message.
- Whether the issue appears to be RLS, RPC, UI, permission, or unknown.
- Current user role/permission context, including whether active current-company context was loaded.
- Order id, visible order number, starting status, and attempted target status when order-related.
- Whether the failure is reproducible after a hard refresh.

## Blocker Classification Guide

Blockers:

- Any route crash or authorized route becoming inaccessible.
- Normal create/edit/site-visit/status/override flows using direct table writes and failing under the new RLS restriction.
- Canonical RPC failures for an Owner/Admin user with expected permissions.
- Normal edit changing order number.
- Owner Setup exposing setup authority, module authority, Vendor/Client activation, or broad settings writes.

Non-blockers:

- Safe fallback on Owner Setup when the smoke session intentionally lacks live setup context access.
- Safe permission error when testing order-number override with a user that should not have override permission.
- Best-effort calendar projection failure after table site-visit update when the order `site_visit_at` update itself succeeds and the failure is captured.
- Cosmetic spacing/copy issues that do not change route access, mutation path, authority language, or persisted state.

## 10I1 Result

Phase 10I1 is complete as a smoke plan only.

Next step is to execute this checklist in a browser session before adding more product features or removing deprecated order mutation helpers.

## 10I2 Execution Note

Phase 10I2 executed this checklist against a local app and local Supabase smoke fixture. Results are recorded in `docs/ROUTE_LEVEL_BROWSER_SMOKE_RESULTS.md`.

The smoke did not fully pass. Owner Setup and order creation through `rpc_create_order(...)` passed, but browser execution is blocked after create by `rpc_company_assignable_users` failing on `u.split_pct`, order edit failing with `permission denied for table amcs`, order detail failing to load the smoke order, and table smart-action/site-visit surfaces not exposing the smoke order as actionable.

Recommended next step is a narrow 10I3 blocker repair for the assignable-users RPC and authorized order read projection/grant issues, followed by a rerun of this smoke plan from Order Create onward.
