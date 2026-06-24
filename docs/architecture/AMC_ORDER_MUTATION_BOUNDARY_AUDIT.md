# AMC Order Mutation Boundary Audit

## Purpose

This audit documents current order creation, edit, and mutation surfaces before Falcon adds AMC
product-local mutation aliases such as `/amc/orders/new` or `/amc/orders/:id/edit`.

This document is an architecture audit only. It does not change routes, links, auth, workspace
switching, schema, RLS, runtime behavior, email, notifications, or Edge Functions.

Related documents:

- `docs/architecture/AMC_PRODUCT_ROUTE_ALIAS_PLAN.md`
- `docs/architecture/AMC_PRODUCT_SEPARATION_AUDIT.md`
- `docs/architecture/ADR_AMC_SEPARATE_PRODUCT_CONTEXT.md`
- `docs/amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md`

## Summary Recommendation

Do not register broad AMC mutation aliases yet. The narrow `/amc/orders/new` create alias is now
registered for guarded validation only.

The read aliases `/amc/dashboard`, `/amc/orders`, `/amc/orders/:id`, `/amc/vendors`,
`/amc/vendors/:vendorProfileId`, and `/amc/client-requests` are acceptable as render-only
aliases because they preserve existing route guards and do not introduce new mutation entry
points.

The mutation aliases below remain deferred:

- `/amc/orders/:id/edit`
- `/amc/orders/:id/edit/*`, if ever introduced

The existing compatibility mutation routes may remain available while Falcon reviews and tests the
mutation boundary. Product-local AMC mutation routes should be introduced only after RPC payloads,
operations-scope preservation, permission checks, activity, documents, notifications, client
visibility, and vendor visibility are proven together. The new create alias must remain unlinked
from global navigation, email, and notifications until staging smoke evidence is current.

## Classification Key

- **Internal-only:** mutation should remain tied to Internal Operations unless a later doctrine
  explicitly allows AMC ownership.
- **AMC-only:** mutation is already AMC procurement/client-services owned and should not imply
  Internal behavior.
- **Shared operations-scope-sensitive:** mutation may be valid in both Internal and AMC contexts,
  but only if the backend preserves or validates `operations_scope` and company ownership.
- **Unsafe/ambiguous:** current behavior is too broad, cross-product, or insufficiently audited for
  AMC product-local mutation routes.

Risk levels:

- **Low:** additive or read-adjacent mutation with existing RPC ownership and clear product scope.
- **Medium:** mutation is backend-owned but needs product-specific smoke coverage before alias use.
- **High:** mutation affects workflow, assignment, documents, or cross-party visibility.
- **Dangerous:** mutation can create/retire/change legal/workflow records or trigger external
  delivery/visibility effects.

## Mutation Surface Inventory

| Surface | Current route/component/RPC | Permissions observed | Operations-scope assumptions | Classification | Risk | AMC alias recommendation | Tests/smokes needed before aliases |
| --- | --- | --- | --- | --- | --- | --- | --- |
| New order form | `/orders/new`; `NewOrderPage`; `OrderForm`; `createOrderViaRpc`; RPC `rpc_create_order` | Route requires `orders.create`; form can create/find client through `createOrderFormClient` and client option APIs | Payload does not visibly pass product route context; backend must derive company/current context and assign/preserve `operations_scope` correctly | Shared operations-scope-sensitive | Dangerous | Defer `/amc/orders/new` | RPC payload tests proving AMC mode creates `operations_scope = amc_operations`; wrong-company denial; client creation/attachment rules; activity/notification review; staging create smoke for Internal and AMC. |
| Edit order form | `/orders/:id/edit`; `EditOrder`; `OrderForm`; `updateOrderViaRpc`; RPC `rpc_update_order` | Route requires `orders.update.all`; form edits client, AMC, contact, appraiser, reviewer, fees, property, dates, notes | Fetches from `v_orders_frontend_v4` and `orders`; update payload does not visibly include product route context; backend must reject wrong scope and preserve scope | Shared operations-scope-sensitive | Dangerous | Defer `/amc/orders/:id/edit` | RPC update tests for scope preservation; wrong-scope denial; Internal-vs-AMC field matrix; assignment/reviewer/appraiser updates; fee and due-date update smoke; activity audit. |
| Inline site visit update | `OrderDetail`; `SiteVisitPicker`; `updateSiteVisitAtViaRpc`; RPC `rpc_update_order` | Visible based on detail surface permissions and workspace shell; ultimately backend-owned by `rpc_update_order` | Mutates a date field on the order; should preserve existing order scope and reject wrong workspace/company | Shared operations-scope-sensitive | Medium | Allow existing detail route behavior; do not create edit alias based on this alone | Focused site-visit RPC tests for AMC order; wrong-scope denial; calendar event side-effect review through `updateSiteVisitAt` compatibility helper if used elsewhere. |
| Smart workflow actions | `OrderDetail`; `getSmartOrderActions`; `sendOrderToReview`, `sendOrderBackToAppraiser`, `markReadyForClient`, `completeOrder`; RPC `rpc_transition_order_status` | Workflow permissions such as `workflow.status.submit_to_review`, `workflow.status.request_revisions`, `workflow.status.ready_for_client`, `workflow.status.complete` | Status transition must validate current order visibility, actor authority, workflow state, and order scope | Shared operations-scope-sensitive | High | Keep on existing detail compatibility and read alias only; do not use mutation alias until tested | Internal and AMC workflow transition tests; assignment/client visibility effects; notification/activity payload tests; wrong-scope denial. |
| Lifecycle retirement | `OrderDetail`; archive/cancel/void buttons; `archiveOrderViaRpc`, `cancelOrderViaRpc`, `voidOrderViaRpc`; RPCs `rpc_order_archive`, `rpc_order_cancel`, `rpc_order_void` | Governed by `canArchiveOrder`, `canCancelOrder`, `canVoidOrder` and permissions such as `orders.archive`, `orders.cancel`, `orders.void` | Retires or hides records and affects lifecycle visibility; must be scope-safe and product-approved | Shared operations-scope-sensitive | Dangerous | Block product-local AMC lifecycle aliases until lifecycle doctrine is explicit | Archive/cancel/void denial tests; product-specific lifecycle policy; activity payload review; historical order visibility smoke. |
| Owner/admin status override | `OrderDetail`; More Actions override; `overrideOrderStatusViaRpc`; RPC `rpc_order_status_override` | Requires owner/admin Staff Appraisal shell and `workflow.override_status`; explicitly tied to staff/internal owner/admin shell | Current UI intentionally scopes override to Staff Appraisal owner/admin shell; AMC product-local access would be ambiguous | Internal-only for now | Dangerous | Block from AMC product-local mutation route | Source/route tests proving override is not exposed in AMC shell; backend denial for AMC-only actors; activity payload review. |
| Document upload | `OrderDetail`; `FilesCard`; `uploadOrderDocument`; Edge Function `order-document-upload-url`; RPC `rpc_order_document_finalize_upload`; storage signed upload | `documents.upload.assigned` or `documents.upload.all` | Upload visibility defaults to `internal`; document category and visibility must not leak between AMC, client, vendor, and internal contexts | Shared operations-scope-sensitive | High | Defer mutation aliases until document visibility matrix is reviewed | Upload smoke for AMC detail; signed URL leak checks; visibility-scope tests; vendor/client document access tests; storage bucket/path redaction checks. |
| Document archive | `OrderDetail`; `FilesCard`; `archiveOrderDocument`; RPC `rpc_order_document_archive` | `documents.delete` | Archives a document and affects active lists; must preserve audit and scope | Shared operations-scope-sensitive | High | Defer mutation aliases until document lifecycle coverage is current | Archive document RPC tests; wrong-scope denial; activity/logging review; storage access smoke. |
| Document download URL | `OrderDetail`; `createOrderDocumentDownloadUrl`; Edge Function `order-document-download-url` | Read access implied by detail/document visibility | Creates signed URLs; not a mutation of order data, but high sensitivity for visibility and leakage | Shared operations-scope-sensitive | High | Read alias acceptable only with smoke coverage; not a reason to add mutation aliases | Signed URL leak checks; raw storage path denial; client/vendor/internal visibility matrix. |
| Operational input create/clear | `OperationalInputsCreateClearControls`; `createOrderOperationalInput`, `clearOrderOperationalInput`; RPCs `rpc_order_operational_input_create`, `rpc_order_operational_input_clear` | Shown under detail management surfaces; permission expectations are backend-owned | Adds temporary operational context without lifecycle status changes; still affects dashboard/readiness | Shared operations-scope-sensitive | Medium | Defer mutation aliases; can remain on existing detail behavior | RPC denial tests; AMC operational-input smoke; activity/notification review if any. |
| Internal/owner assignment offer | `OrderDetail`; `OfferAssignmentModal`; `offerAssignment`; RPC `rpc_order_company_assignment_offer`; redirects to `/assignments/:id` | Requires `order_company_assignments.offer`, `order_company_assignments.read_owner`, `relationships.assign_work`, `relationships.read` | Broad company-to-company assignment model; current routes are hidden/suppressed in several shells | Unsafe/ambiguous | Dangerous | Block AMC mutation alias until assignment-surface doctrine is settled | Assignment route visibility tests; wrong-company denial; notification/link review; Vendor Workspace smoke. |
| AMC vendor candidate direct offer | `VendorAssignmentCandidatesPanel`; `offerOrderToVendor`; RPC `rpc_order_company_assignment_offer` with `assignment_type = vendor_appraisal` | Requires assignment offer/read owner and relationship assignment permissions; panel also requires AMC mode, `operations_scope = amc_operations`, and vendor permissions | Explicitly AMC procurement-owned; order must be AMC scoped | AMC-only | High | Keep available on `/amc/orders/:id` read alias; do not add edit alias for it | Vendor offer smoke; wrong-vendor/wrong-scope denial; email/token link review; assignment packet isolation. |
| AMC vendor bid request | `EligibleVendorsPanel` and `VendorAssignmentCandidatesPanel`; `createBidRequestFromEligibleVendors`, `createOrderVendorBidRequest`; RPC `rpc_order_vendor_bid_request_create` | Requires `bid_requests.create` and `vendors.read`; panel gated to AMC mode and `operations_scope = amc_operations` | Explicitly AMC procurement-owned; triggers bid recipients and potential email queue behavior | AMC-only | High | Keep available on `/amc/orders/:id` read alias; do not add edit alias for it | Bid request happy path; duplicate/open bid denial; email dry-run/link review; wrong-scope denial; public token smoke. |
| Bid response record/select/convert | `BidRequestsPanel`; `recordOrderVendorBidResponse`, `selectOrderVendorBidResponse`, `convertSelectedBidToAssignmentOffer`; RPCs `rpc_order_vendor_bid_response_record`, `rpc_order_vendor_bid_response_select`, `rpc_order_vendor_bid_response_convert_to_assignment_offer` | Requires `bid_requests.update`, `bid_requests.select`, and assignment offer permissions for conversion | Explicitly AMC procurement workflow; selected bid can create assignment offer side effects | AMC-only | High | Keep on read alias only; do not add edit alias until procurement smoke is current | Record/select/convert RPC tests; assignment offer creation smoke; notification/link review; wrong-vendor denial. |
| Vendor assignment revision/internal notes | Assignment components/API; RPCs `rpc_amc_request_vendor_assignment_revision`, `rpc_amc_add_vendor_assignment_internal_note` | AMC assignment permissions; usually not route-local to order edit | AMC-owned assignment execution/review workflow | AMC-only | High | Not part of order edit alias; keep in assignment/workspace flows | Revision/resubmit smoke; internal note leak tests; vendor isolation. |
| Client request status review | `/client-requests` and `/amc/client-requests`; `updateClientOrderRequestReviewStatus`; RPC `rpc_client_portal_order_request_review_update_status` | Client portal request read/manage permissions | AMC-native intake review; not an order edit route | AMC-only | Medium | Already acceptable on `/amc/client-requests`; unrelated to order edit alias | Client request inbox smoke; wrong-client denial; status transition tests. |
| Client request conversion to order | `/client-requests` and `/amc/client-requests`; `convertClientOrderRequestToOrder`; RPC `rpc_client_portal_order_request_convert_to_order` | Requires manage/create capabilities in page-level checks and backend | Creates an order from client portal intake; must create AMC-scoped order and safe client relationship | AMC-only but creates order | Dangerous | Keep on `/amc/client-requests`; do not infer `/amc/orders/new` readiness from this | Conversion creates `operations_scope = amc_operations`; duplicate conversion denial; notification/activity review; portal-to-AMC isolation smoke. |
| Order number override | `AssignmentFields`; `overrideOrderNumber`; RPC `rpc_order_number_override` | Exposed from form assignment fields in edit mode; exact UI permission needs separate form audit | Overrides canonical order number; high audit/legal sensitivity | Unsafe/ambiguous | Dangerous | Block from AMC product-local mutation alias until explicitly approved | Source test for visibility; backend permission test; audit activity review. |

## OrderForm / RPC Field And Action Matrix

This matrix is based on the current `OrderForm` payload, the `/orders/new` and
`/orders/:id/edit` routes, `createOrderViaRpc`, `updateOrderViaRpc`, `rpc_create_order`, and
`rpc_update_order`. It is intentionally conservative: "Safe now" means safe in the existing
compatibility route context, not safe to expose through new AMC product-local mutation aliases.

| Field/action | Current form/RPC behavior | Product classification | Alias readiness | Why | Required guard/test/RPC change before AMC mutation aliases |
| --- | --- | --- | --- | --- | --- |
| Client selection (`client_id`) | `OrderForm` submits `client_id`; `rpc_create_order` and `rpc_update_order` validate attachability through current-company client guards | Shared but scope-sensitive | Deferred | Valid in both products only if the selected client belongs to the active company/product context and cannot cross from Internal to AMC | Add create/update tests for AMC-scoped client attach, Internal-scoped client attach, wrong-company denial, and unchanged `operations_scope`. |
| Manual client creation (`manual_client_name`) | Create mode searches by name and may call `createOrderFormClient` before `rpc_create_order`; edit mode can submit manual client name to `rpc_update_order` | Shared but scope-sensitive | Deferred | The pre-RPC client creation side effect must be proven product-safe before `/amc/orders/new` points users at it | Add tests proving manual client creation uses the current AMC company, rejects invalid AMC/client relationships, and never creates Internal client records from AMC context. |
| Managing AMC (`managing_amc_id`) | Form labels this as "AMC (if applicable)"; RPCs validate it with `current_app_user_can_attach_order_amc` | Unsafe/ambiguous | Deferred | In the separated product model, an AMC product context should not casually reuse an Internal "managing AMC" selector without ownership doctrine | Decide whether this remains an Internal-originated managed-client field or becomes AMC-owned context. Add tests for valid/invalid values and hide or constrain the field before aliasing if needed. |
| Client contact (`client_contact_id`) | Form can submit `client_contact_id`; current `rpc_create_order`/`rpc_update_order` snapshot server-managed contact fields and reject invalid contacts | Shared but scope-sensitive | Deferred | Contact snapshot behavior is backend-owned, but must prove contacts cannot leak between Internal and AMC client relationships | Add contact attach/snapshot tests for AMC orders, wrong-client denial, inactive contact denial, and client-change contact clearing. |
| Property address (`property_address`, `city`, `state`, `postal_code`) | Form submits address fields; RPCs persist explicit allowlisted fields | Shared but scope-sensitive | Safe now on compatibility routes; deferred for AMC mutation aliases | Low inherent product risk, but it still writes to an order whose product scope must be preserved by backend guards | Add focused create/update tests proving address edits preserve `operations_scope` and reject wrong-company order ids. |
| Property type | Form submits a selected property type; RPCs persist the allowlisted `property_type` | Shared but scope-sensitive | Safe now on compatibility routes; deferred for AMC mutation aliases | Product-neutral intake data, but still depends on scope-safe order mutation | Add create/update tests for AMC and Internal orders plus no scope mutation. |
| Report type/product | Form submits `report_type`; RPCs persist the allowlisted field | Shared but scope-sensitive | Deferred | Product/report taxonomy may diverge between Internal Operations and Falcon AMC; route aliasing before taxonomy review could encode the wrong business meaning | Confirm AMC report/product vocabulary, then add create/update tests and UI copy review for AMC mode. |
| Base fee | Form submits `base_fee`; RPCs persist it | Shared but scope-sensitive | Deferred | Fee meaning can differ between client charge, AMC fee, vendor fee, and internal billing | Define fee ownership per product. Add tests proving AMC edits cannot mutate Internal billing/payroll-only amounts. |
| Split percent (`split_pct`, `appraiser_split`) | Form submits `split_pct`; RPCs mirror it to `split_pct`/`appraiser_split` | Internal-only for now | Blocked for AMC mutation aliases | Split percentage appears tied to internal appraiser compensation, not AMC vendor procurement | Remove or hide for AMC mutation routes, or replace with explicit AMC vendor fee fields. Add source tests proving AMC alias routes do not expose internal split editing. |
| Appraiser fee | Form submits `appraiser_fee`; form auto-calculates it from base fee and split | Internal-only for now | Blocked for AMC mutation aliases | Current field is internal appraiser compensation-like data; AMC vendor fees belong to procurement/assignment flows | Keep out of AMC order edit aliases until vendor assignment fee model is mapped. Add tests that AMC users cannot edit internal appraiser fee through product-local routes. |
| Site visit date/time | Form submits `site_visit_at`; detail also uses `updateSiteVisitAtViaRpc`; RPC update allowlist includes it | Shared but scope-sensitive | Safe now on compatibility/detail routes; deferred for edit alias | Scheduling is shared, but calendar/activity side effects and vendor/client visibility need smoke coverage | Add AMC create/update/site-visit tests, calendar visibility checks, and wrong-scope denial. |
| Reviewer due date | Form submits `review_due_at`; RPCs persist it | Shared but scope-sensitive | Deferred | Reviewer due dates are likely internal review workflow dates unless AMC review ownership is explicit | Decide AMC reviewer workflow ownership. Add tests for AMC review due edits and visibility to vendor/client users. |
| Final due date | Form submits `final_due_at`; RPCs persist it | Shared but scope-sensitive | Deferred | Client-facing due dates can affect notifications and client portal expectations | Add create/update tests plus client portal visibility smoke before aliasing. |
| Appraiser assignment (`appraiser_id`) | Form loads assignable company appraisers and submits `appraiser_id`; RPCs persist it | Internal-only for now | Blocked for AMC mutation aliases | Falcon AMC vendor assignment should use vendor company/assignment flows, not internal staff appraiser assignment | Hide or replace on AMC mutation routes. Add source tests and RPC denial/allowlist review so AMC product-local edit cannot assign internal appraisers unless explicitly approved. |
| Reviewer assignment (`reviewer_id`) | Form loads assignable company reviewers, defaults a reviewer fallback, and submits `reviewer_id`; RPCs persist it | Shared but scope-sensitive, leaning Internal-only | Deferred | Review responsibility may exist in AMC, but the current implementation selects internal company users and even has a hard-coded fallback email preference | Remove hard-coded product assumption or provide AMC-specific reviewer rules. Add tests for reviewer options by product context and no Internal fallback in AMC context. |
| Status on create | Form sends `status: "new"` for create; `rpc_create_order` accepts payload status with default `"new"` | Shared but scope-sensitive | Deferred | Create status is benign only if the RPC restricts values and sets the correct product scope | Restrict/verify create status to approved initial states. Add tests that arbitrary submitted status is rejected or ignored and AMC orders start in the expected state. |
| Status on edit | Form displays status but `buildOrderPayload` does not include status on edit; status changes use workflow RPCs elsewhere | Shared but scope-sensitive | Safe now on compatibility routes; blocked as generic edit field | Generic edit should not become a status mutation channel | Keep status out of `rpc_update_order` payloads. Add tests proving edit submit never sends status and `rpc_update_order` rejects workflow/status fields if submitted. |
| `operations_scope` | Not submitted by `OrderForm`; visible in order list/detail projections; backend derives scope from company/current context or existing order | Shared but scope-sensitive | Deferred | This is the core separation risk. Product-local routes cannot be a legal/data boundary if create/update can infer the wrong scope or mutate existing scope | Add RPC-level tests proving create derives the intended scope for AMC/Internal and update cannot change, null, or lose `operations_scope`. |
| Order number | Generated server-side on create; edit form has separate override UI calling `rpc_order_number_override`; `rpc_update_order` rejects `order_number` | Internal-only for now | Blocked for AMC mutation aliases | Numbering is audit/legal-sensitive and currently has a separate override path | Keep override out of AMC mutation aliases until policy is explicit. Add source and backend tests for visibility, permissions, activity, and no generic update path. |
| Property/access contact | Form submits entry/property contact name and phone; RPCs persist current allowlisted fields and snapshot selected client contacts separately | Shared but scope-sensitive | Deferred | Operational access contacts may be visible to vendor/client workflows and must not leak relationship contact snapshots incorrectly | Add create/update tests for access contact persistence plus vendor/client visibility smoke. |
| Special instructions / notes | Form labels `notes` as "Special Instructions" and submits both `notes` and, through create RPC coalescing, `special_instructions` | Unsafe/ambiguous | Deferred | Existing copy says public "Special Instructions", but notes may feed internal instructions, activity, vendor context, or client-visible surfaces depending on downstream use | Split internal notes, access instructions, vendor instructions, and client-visible instructions before AMC mutation aliasing. Add leakage tests for notifications/activity/vendor/client portals. |
| Access notes | `buildOrderPayload` includes `access_notes`, but current form surface primarily collects entry contact data; RPC create/update allowlist can persist `access_notes` | Shared but scope-sensitive | Deferred | Access notes may be vendor-visible and need explicit visibility doctrine | Add UI/source audit for where `access_notes` is edited and shown, then add vendor/client leakage tests. |
| Documents | Not part of `OrderForm`; detail uses document upload/download/archive Edge/RPC paths | Shared but scope-sensitive | Deferred | Document mutations have signed URL and storage-path leakage risk | Complete document visibility matrix and smoke tests before any broader AMC mutation entry point is considered safe. |
| Engagement/source documents | Not part of `OrderForm`; tied to document upload, source packet, client portal, or assignment packet flows depending on surface | Shared but scope-sensitive | Deferred | Source documents can cross client, vendor, AMC, and internal audiences | Define source-document categories and visibility. Add tests for source document upload/download and no raw storage path leakage. |
| AMC procurement/vendor assignment fields | Not part of `OrderForm`; live on order detail procurement panels and assignment/bid RPCs | AMC-only | Safe on existing AMC detail/read alias with current guards; deferred for edit/new aliases | Procurement actions are AMC-owned but high side-effect: bids, offers, vendor token links, vendor assignment state | Keep in procurement panels. Add bid/offer/assignment smoke and product-aware link delivery review before expanding route aliases. |
| Internal payment/payroll fields | `split_pct`, `appraiser_fee`, and internal assignment are present in form; explicit payroll/payment fields are not directly audited in `OrderForm` | Internal-only | Blocked for AMC mutation aliases | AMC should not expose internal compensation/payroll mutation through product-local order edit | Identify all payroll/payment columns and UI surfaces, then add source scans/tests blocking AMC access. |
| Activity side effects | Create/update RPCs return order rows; workflow, override, document, procurement, and client conversion paths can create activity elsewhere | Shared but scope-sensitive | Deferred | Activity payloads may reveal internal notes, storage paths, or cross-company context | Add activity payload tests for each mutation class before aliasing. |
| Notification/email side effects | Basic `rpc_create_order`/`rpc_update_order` wrapper does not send directly; workflow/procurement/document/client conversion paths may queue/send notifications | Shared but scope-sensitive | Deferred | Live delivery links and recipients are one of the dangerous product separation areas | Keep product message planning dry-run only. Add sender-level tests after product-aware links are intentionally wired. |

### Deferred And Blocked Item Notes

- **Deferred shared fields** are not known-bad; they need RPC-level proof that company,
  `operations_scope`, product context, and visibility are preserved before AMC mutation aliases are
  registered.
- **Blocked Internal-only fields** should not appear on AMC mutation routes until Falcon has an
  explicit product doctrine and tests for them. Current blockers are internal appraiser assignment,
  split percentage, appraiser fee, order-number override, and internal payment/payroll fields.
- **Deferred unsafe/ambiguous fields** need business semantics first. Current ambiguous fields are
  `managing_amc_id`, notes/special instructions, access notes visibility, and report/product
  taxonomy.

## Field Matrix Recommendation

`/amc/orders/new` should not be registered in the immediate next slice. It may be allowed soon only
after a small create-order proof slice verifies:

1. `rpc_create_order` creates AMC orders with the intended `operations_scope`.
2. `client_id`, `client_contact_id`, `manual_client_name`, and `managing_amc_id` behavior is
   product-safe.
3. Submitted `status`, assignment, fee, split, and note fields are either constrained or removed
   from the AMC create surface.
4. Create-side activity and notification behavior is documented and tested.

`/amc/orders/:id/edit` should not be allowed soon. The current edit form is too broad for a first
AMC mutation alias because it combines internal staffing, compensation-like fields, client/contact
changes, due dates, notes, and an order-number override shell. Before this alias is registered,
Falcon should either split the form into product-specific edit surfaces or add explicit field-level
guards that make the AMC edit route incapable of touching Internal-only fields.

## Create Order RPC Contract Test Findings

Focused source-level contract tests now cover `rpc_create_order` in
`src/lib/permissions/__tests__/amcCreateOrderRpcContract.test.js`. These tests do not execute a
database or change RPC behavior; they scan the canonical migration SQL and document what the current
contract does and does not guarantee.

Current guarantees proven by the source contract:

1. Create authority is backend-owned through `current_app_user_can_create_order()`.
2. Company context is backend-derived through `current_company_id()`; `company_id` is not accepted
   from the browser payload.
3. Server-side order numbering remains backend-owned through `next_order_number_v2(...)`.
4. Client, managing AMC, and client contact attachments have current-company guard paths.
5. Client contact snapshots require an active contact for the selected client and current company.
6. `rpc_create_order` itself does not insert activity, notifications, or email fanout rows.

Current gaps proven by the source contract:

1. `rpc_create_order` does not insert or derive `operations_scope` explicitly.
2. The later `operations_scope` foundation sets the order column default to
   `internal_operations`, so generic create cannot currently prove AMC order creation from route
   context alone.
3. The RPC has no `operationsMode`, product context, route context, or explicit
   `amc_operations` branch.
4. Create status input is not allowlisted in the RPC; it currently persists
   `coalesce(payload.status, 'new')`.
5. Activity and notification side effects for create remain a deferred contract rather than an
   audited backend-owned fanout.

Result: `/amc/orders/new` remains deferred. The next implementation slice should make AMC create
scope explicit before any route alias is registered.

Implementation status: `supabase/migrations/20260624100000_amc_create_order_scope_contract.sql`
updates `rpc_create_order` to the intended
`rpc_create_order(payload jsonb, p_operations_scope text default null)` contract. The backend now
defaults null scope to `internal_operations`, accepts explicit `amc_operations`, rejects invalid
scope values, explicitly inserts `operations_scope`, restricts create status to `new`, preserves
current-company client/AMC/contact guards, and does not add create-side notification or email
fanout. The focused contract tests are active and now assert that `/amc/orders/new` is registered
only through `AmcNewOrderPage`.

Attachment-scope guard status:
`supabase/migrations/20260624102000_rpc_create_order_attachment_scope_guards.sql` keeps the
additive `rpc_create_order(payload jsonb, p_operations_scope text default null)` contract and adds
backend authority checks for submitted attachments. Before insert, the RPC now rejects selected
`client_id` values and `managing_amc_id` values that fail
`client_relationship_has_operations_scope(..., v_operations_scope)`, while keeping the existing
current-company attachability guards. `client_contact_id` remains constrained to the selected
client, current company, and active status; because `client_contacts` do not carry their own
operations-scope column, the selected client's scope compatibility is the current boundary. The
source contract tests now assert these guards.

Frontend service status: `createOrderViaRpc(payload, { operationsScope })` now supports an explicit
scope opt-in. Existing callers that omit the option still call `rpc_create_order` with only the
payload, preserving the current Internal-compatible default. Passing `amc_operations` sends
`p_operations_scope = 'amc_operations'`; invalid frontend scope values are rejected before the RPC
call. The compatibility `/orders/new` path still calls `createOrderViaRpc(payload)` without scope.
The AMC create route uses `AmcNewOrderPage`, which passes explicit AMC scope.

Form status: `OrderForm` now accepts an optional `operationsScope` prop. When omitted, it preserves
the existing create path and calls `createOrderViaRpc(payload)` with one argument. When an explicit
caller passes `operationsScope="amc_operations"`, create submit forwards
`{ operationsScope: 'amc_operations' }` to the service. No registered route currently passes this
prop. `/orders/new` continues not to pass this prop.

Existing-client-only status: `OrderForm` now also accepts `allowInlineClientCreation`, defaulting
to `true` for existing Internal create behavior. A future AMC create wrapper can pass
`allowInlineClientCreation={false}` with `operationsScope="amc_operations"` so the form requires an
existing selected client, suppresses the manual/new-client input, and does not call the inline
client creation RPC. `/amc/orders/new` now uses this mode through `AmcNewOrderPage`.

AMC create wrapper status: `src/pages/orders/AmcNewOrderPage.jsx` is now registered at
`/amc/orders/new`. It renders `OrderForm` with `operationsScope="amc_operations"` and
`allowInlineClientCreation={false}`. Its post-save targets are AMC-local paths. Global navigation,
email links, notification links, and workspace switcher behavior remain unchanged.

## AMC Client Picker Scope Boundary

The future AMC create wrapper is existing-client-only, so the next safety boundary is the client
picker itself. The picker is populated through:

- `listOrderFormClientOptions()` -> `rpc_order_form_client_options()`
- `searchOrderFormClientsByName(...)` -> `rpc_order_form_client_name_search(...)`

Current behavior:

- Both RPCs require a current app user, current company, active company, current-company
  membership, and order/client permissions.
- `rpc_order_form_client_options` returns active, non-merged current-company clients and AMCs with
  limited contact preview fields only.
- Returned contact preview fields are read from the same selected client row; the RPC does not join
  arbitrary contacts across companies.
- `rpc_order_form_client_name_search` is current-company scoped and clamps result limits.
- `supabase/migrations/20260624101000_order_form_client_options_operations_scope.sql` adds optional
  `p_operations_scope text default null` to both RPCs.
- Null/default scope preserves existing shared `/orders/new` behavior.
- Explicit `amc_operations` or `internal_operations` filters through
  `client_relationship_has_operations_scope(...)`.
- Invalid scope values are rejected with `invalid_order_form_client_operations_scope`.
- The option/search payload now includes `operations_scope` for diagnostics, but backend filtering
  remains the authority.
- Client request conversion is a separate path and explicitly inserts `operations_scope =
  'amc_operations'`; it does not prove the direct OrderForm picker is AMC-safe.

Answer to the audit questions:

- **Are client options filtered by current company?** Yes.
- **Are client options filtered by `operations_scope`?** Yes, when an explicit operations scope is
  passed. The compatibility path remains unfiltered by design.
- **Can AMC create see Internal-only clients today?** The future AMC wrapper passes
  `operationsScope="amc_operations"` through `OrderForm` into the picker helpers, so the intended
  wrapper path is scope-filtered. The route remains unregistered until migration replay and route
  smoke prove that behavior in an environment.
- **Can contacts bleed across clients/companies?** The option payload itself appears limited to
  contact fields on the returned current-company client row; it does not perform a broad contact
  join. Separate client contact selection still needs its own scope review before route exposure.
- **Does the option payload include enough metadata to filter AMC-visible clients client-side?** It
  now includes `operations_scope` for diagnostics. Client-side filtering should still not be the
  authority.
- **Does the RPC need a new optional `p_operations_scope` parameter?** Implemented.

Risk level: **Medium** for registering `/amc/orders/new` next. The picker contract is now
product-scope aware, but the migration has not been replayed in this slice and the route remains
unregistered.

Required contract before AMC direct create:

1. Replay the create-order and picker migrations locally/staging before route exposure.
2. Add route-level tests/smokes proving `AmcNewOrderPage` uses scoped picker options and creates
   `amc_operations` orders with an existing selected client.
3. Keep inline manual client creation disabled for AMC direct create.
4. Keep `/amc/orders/new` unregistered until migration replay and route tests pass.

## Manual Client Creation Scope Boundary

OrderForm create has a separate inline manual-client seam before it calls `rpc_create_order`.
When create mode has a manual client name and no selected existing client, `OrderForm`:

1. Searches existing clients through `searchOrderFormClientsByName(...)`.
2. Reuses an exact normalized match when found.
3. Otherwise calls `createOrderFormClient({ name, amcId })`.
4. Replaces `manual_client_name` with the created `client_id`.
5. Calls `createOrderViaRpc(...)`.

Current behavior:

- `createOrderFormClient` calls `rpc_order_form_client_create` with `p_client.name` and
  `p_client.amc_id` only.
- `rpc_order_form_client_create` is current-company guarded and permission guarded, but it does
  not read, validate, or write `operations_scope`.
- The inline duplicate-name search and client option RPCs are current-company scoped, not
  operations-scope scoped.
- The newer general client-management path, `rpc_client_management_create`, does support
  `operations_scope` and validates `invalid_client_operations_scope`, but OrderForm inline create
  does not use that path.
- Client request conversion uses dedicated client-request conversion RPCs and is not evidence that
  direct OrderForm manual client creation is AMC-safe.

If `OrderForm operationsScope="amc_operations"` created a new manual client today, the order create
could be AMC-scoped, but the newly created client relationship would not be explicitly AMC-scoped.
Depending on client read filters, that client could behave as company-wide or default/legacy
relationship data rather than an AMC-specific client relationship. That is not acceptable for
registering `/amc/orders/new`.

Risk level: **High** for AMC direct create. The risk is not a raw cross-company write; the current
RPC uses current-company guards. The risk is product-scope bleed between Internal Operations and
Falcon AMC because the inline client creation seam does not carry `operations_scope`.

Required contract before AMC direct create:

1. Manual client creation must either be disabled for AMC direct create, or must pass
   `operationsScope="amc_operations"` into a scope-aware backend create path.
2. Duplicate search/reuse must be scope-aware so AMC create does not reuse an Internal-only client
   relationship by name.
3. AMC create must either require selecting an existing AMC-visible client or create a new
   AMC-scoped client relationship explicitly.
4. Any `managing_amc_id` attachment must be validated against the requested operations scope.
5. Tests must prove `/amc/orders/new` remains unregistered until this seam is resolved.

Recommended next implementation: make `createOrderFormClient` explicitly scope-aware by adding an
optional `operationsScope` argument and updating the narrow order-form client-create RPC to persist
`operations_scope`. In the same slice, update the duplicate search helper to accept
`operationsScope` or temporarily disable manual client creation for AMC direct-create wrappers and
require selecting an existing AMC-visible client.

Implementation preparation: the first AMC direct-create route should use the existing-client-only
path, not the manual client-create path. That means rendering `OrderForm` with
`operationsScope="amc_operations"` and `allowInlineClientCreation={false}` after route guards and
client picker scope are verified. Inline manual client creation can be reintroduced later only after
the order-form client create/search RPCs become operations-scope aware.

## AMC Create Order Required Contract

Before `/amc/orders/new` can be registered, order create needs an explicit backend/frontend
contract that makes product scope intentional instead of inferred from a shared route or workspace
mode.

### Operations Scope Source

`operations_scope` should be supplied explicitly by the create caller and validated by the backend.
The frontend may infer the intended product from the route, product context diagnostics, or
operations mode, but the backend must not treat the route as authority. The authoritative create
RPC should receive an explicit requested scope and decide whether the current user/current company
may create in that scope.

Required behavior:

- Existing Internal create callers that do not pass a scope continue to create
  `internal_operations` orders.
- AMC create callers must pass `amc_operations` explicitly.
- Unknown, blank, or unsupported scopes are rejected before insert.
- The inserted order row names `operations_scope` explicitly; it must not rely on the table default
  for AMC creates.
- The browser cannot submit or override `company_id`.

### RPC Shape Options

Two backend shapes are possible:

1. **Preferred: extend `rpc_create_order` additively.**
   Add an optional parameter such as `p_operations_scope text default null`, or an equivalent
   typed options object, while preserving the existing `payload jsonb` parameter and default
   behavior. This keeps Internal create compatible and avoids a duplicate order-create
   implementation.

2. **Alternative: add `rpc_create_amc_order`.**
   A narrower AMC-only RPC could enforce `amc_operations` by construction. This is safer from a
   product-contract perspective but risks duplicating create-numbering, client/contact validation,
   field mapping, and future bug fixes unless it delegates to the canonical create implementation.

Recommended approach: use the additive `rpc_create_order(payload jsonb, p_operations_scope text
default null)` path first. Default `null` to `internal_operations` for compatibility, require AMC
callers to pass `amc_operations`, and keep all existing current-company/client/contact guards.

### Status Contract

Create status must be allowlisted or normalized by the RPC. The browser should not be able to
create an arbitrary lifecycle state.

Required behavior:

- Default status remains `new`.
- If a status is accepted at all, only approved initial statuses are allowed. For the first AMC
  create slice, that should likely be `new` only.
- Invalid statuses are rejected with a stable error such as `invalid_order_create_status`, or are
  ignored/normalized to `new` by explicit design. Rejecting is safer because it surfaces bad
  callers early.
- Internal and AMC creates use the same initial lifecycle unless a later AMC workflow design
  introduces an AMC-specific initial state.

### Client And Contact Validation

The existing current-company client, managing AMC, and client-contact guards should remain the base
contract, but AMC create needs scope-aware validation before route aliasing.

Required behavior:

- `client_id` must be attachable to the current company and compatible with the requested
  `operations_scope`.
- `client_contact_id` must belong to the selected client, current company, active status, and
  requested scope.
- `managing_amc_id` semantics must be clarified before AMC aliasing. If it remains an Internal
  managed-client field, AMC create should reject it or hide it. If it becomes valid in AMC create,
  it must be scope-compatible.
- Manual client creation from `OrderForm` must pass the same requested operation scope into the
  client create path before the order is created.
- Cross-company client/contact/AMC identifiers must be rejected by the backend, not just omitted
  from frontend options.

### Initial AMC Lifecycle

The first AMC direct-create contract should create an AMC-scoped order in `new` status. Procurement
state, bid requests, vendor assignments, and client request conversion state should remain separate
actions. Direct AMC create should not automatically create bid requests, assignment offers, vendor
packets, client portal rows, or payment records.

### Activity And Notification Behavior

For the first contract, create-side activity and notifications should remain explicit and minimal:

- `rpc_create_order` may continue to create no activity/notification rows, if that is the current
  product behavior.
- If create activity is added, it should be backend-owned, product-scoped, and use a safe payload
  without signed URLs, storage paths, internal notes, hidden packet data, or unrelated account
  details.
- No live email or notification delivery link should be changed in the same slice as create-scope
  support.
- Product-aware message/link helpers remain dry-run until a dedicated delivery wiring slice.

### Rollback And Compatibility

The implementation must preserve existing Internal create behavior:

- Existing `createOrderViaRpc(payload)` callers continue to work without passing the new optional
  scope.
- Existing `/orders/new` behavior continues to create Internal-scoped orders unless and until a
  caller intentionally passes `amc_operations`.
- Direct table defaults remain compatible for older data, but the RPC should explicitly insert the
  selected scope once updated.
- If AMC create support needs rollback, callers can stop passing `amc_operations`; the route alias
  should remain unregistered until this contract is proven.

### Required Tests Before `/amc/orders/new`

Add focused source or integration tests proving:

1. Internal create with no explicit scope still creates `internal_operations`.
2. AMC create with explicit `amc_operations` creates an AMC-scoped order.
3. Invalid `operations_scope` is rejected before insert.
4. Invalid or non-initial status input is rejected or explicitly normalized.
5. Cross-company `client_id`, `client_contact_id`, and `managing_amc_id` are rejected.
6. AMC client/contact attachment is scope-compatible.
7. Manual client creation from the create form carries the requested AMC scope.
8. `company_id` cannot be supplied by the browser payload.
9. Create does not emit unsafe activity, notification, or email payloads.
10. `/amc/orders/new` remains guarded by AMC route tests and stays unlinked from navigation until
    smoke evidence passes.

## Alias Decision Matrix

| Candidate alias | Decision | Reason |
| --- | --- | --- |
| `/amc/orders/new` | Registered for guarded validation | Backend scope support, attachment-scope guards, service opt-in, explicit `OrderForm` scope prop, existing-client-only form mode, AMC wrapper, and scope-aware client picker support now exist. Navigation/email/notification links remain unwired until staging smoke evidence proves the path. |
| `/amc/orders/:id/edit` | Deferred | `OrderForm` updates many fields through `rpc_update_order`, including internal staffing, compensation-like fields, contacts, dates, notes, and the adjacent order-number override shell. Field-level guards or product-specific edit surfaces are required first. |
| `/amc/orders/:id` | Already registered as read alias with local navigation | Detail page contains mutations, but alias was added as a render/read entry point using existing guards. Before expanding mutation routes, each detail mutation needs smoke coverage. |
| `/amc/client-requests` | Already registered | AMC-native intake review route. Conversion remains high-risk but belongs to client request flow, not order edit alias readiness. |

## Required Test And Smoke Coverage Before AMC Mutation Aliases

Before registering `/amc/orders/new` or `/amc/orders/:id/edit`, add or confirm:

1. `rpc_create_order` tests proving AMC mode creates AMC-scoped orders and rejects wrong-company
   or wrong-product attempts.
2. `rpc_update_order` tests proving `operations_scope` cannot be changed or lost through edit
   payloads.
3. Field-level tests for appraiser, reviewer, managing AMC, client, contact, fee, due date, site
   visit, property, notes, and order-number behavior.
4. Activity and notification payload tests proving no internal notes, storage paths, signed URLs,
   hidden packet data, or unrelated account details leak.
5. Document upload/archive/download smoke tests for AMC orders, including signed URL and storage
   path leakage checks.
6. AMC procurement smoke tests for eligible vendor matching, bid request creation, bid response
   selection, selected-bid offer creation, direct vendor offer, wrong-vendor denial, and duplicate
   active assignment denial.
7. Client request conversion smoke proving converted orders are AMC-scoped and isolated from
   client portal and Internal Operations users.
8. Browser smoke for compatibility routes and any future product-local mutation aliases before
   navigation or email links point at them.

## Open Questions

- Should AMC users be allowed to create arbitrary orders directly, or should AMC order creation
  primarily flow through client request intake and conversion?
- Which order edit fields are AMC-owned versus Internal-only?
- Should order-number override remain Internal-only, or can AMC owners ever perform it?
- Which document visibility scopes are valid for AMC order uploads?
- Should AMC procurement actions remain on order detail, or move to a dedicated procurement route
  before product-local mutation aliases are introduced?
- What notifications/emails fire from create, update, assignment, bid, document, and lifecycle
  mutations, and which product base URL should each use after delivery links become product-aware?
