# AMC-18 Local Pilot Simulation Runbook

Run date: 2026-06-07.

## Purpose

This runbook prepares a hands-on local pilot simulation for Chris to click through the current
Client Portal, AMC Operations, Vendor Workspace, and client-safe report delivery loop.

This is not a feature phase. Do not use production data. Do not push or deploy from this runbook.

## Candidate

Local automated gate:

- Latest green validation commit: `3c17a30 Stabilize AMC-18 pilot smoke validation`.
- Local tag: `falcon-amc-pilot-local-green-1`.
- `npm test`: 214 files / 1,836 tests passed.
- Focused AMC-18 pilot smoke: 31 files / 403 tests passed.
- `npm run build`: passed.
- `npm run lint`: passed with warnings only.
- Whitespace checks passed.

## Local Environment Assumptions

Required:

- Local Supabase can be reset safely.
- Local data is disposable.
- Browser testing happens against local app and local Supabase only.
- No production Supabase project, production database, production storage bucket, production user,
  or real customer/vendor/client record is used.

Recommended local setup:

```bash
npm run supabase:reset:local
npm run amc:smoke:fixtures:load
npm run dev
```

Optional automated API/edge smoke after fixture load:

```bash
npm run amc:smoke:edge
```

If local reset is not acceptable for the day, stop and schedule the run against a disposable staging
fixture instead.

## Demo Data Strategy

Use the checked-in local AMC smoke fixture for the AMC/vendor side:

- Fixture command: `npm run amc:smoke:fixtures:load`.
- AMC coordinator login: `amc.smoke.owner@example.test`.
- Vendor login: `amc.smoke.vendor@example.test`.
- Wrong-vendor login: `amc.smoke.wrongvendor@example.test`.
- Temporary password: `FalconSmoke123!`.
- Owner company: `falcon_default`.
- Vendor company: `AMC Smoke Disposable Vendor`.
- Wrong-vendor company: `AMC Smoke Wrong Vendor`.
- Existing AMC order: `AMC-SMOKE-001`.
- Disposable report PDF: `/private/tmp/project-falcon-amc-smoke/amc-smoke-report.pdf`.
- Disposable invoice PDF: `/private/tmp/project-falcon-amc-smoke/amc-smoke-invoice.pdf`.

Client Portal needs one mapped lender user. There is no dedicated client invite/onboarding flow or
checked-in client demo fixture yet, so do not add ad hoc production-like seed data in this slice.
For local simulation, create the client persona only in the local reset database using a clearly
marked disposable account and a `client_portal_members` mapping.

Planned client persona:

- Lender/client: `First Buckeye Bank`.
- Contact: `Dana Miller`.
- Demo email: `client.demo.dana+local@example.test`.
- Temporary password: `FalconSmoke123!`.
- Workspace: Client Portal.
- Scope: mapped only to the local First Buckeye Bank client record in `falcon_default`.

If a reusable client demo fixture is added later, it should follow the existing AMC local fixture
guardrails:

- refuse non-local database targets;
- use `.example.test` emails;
- tag all records as disposable demo/smoke where metadata exists;
- create only required client, user, membership, role, permission, and mapping rows;
- avoid operational orders unless the simulation explicitly creates them through the product flow;
- be safe to discard through `npm run supabase:reset:local`.

## Personas

| Persona | Login | Workspace | Purpose |
| --- | --- | --- | --- |
| Dana Miller | `client.demo.dana+local@example.test` | Client Portal | Submit request, track order, download final report |
| Falcon AMC Coordinator | `amc.smoke.owner@example.test` | Falcon AMC | Review request, convert order, run procurement/completion |
| Demo Vendor Appraisal Co. | `amc.smoke.vendor@example.test` | Vendor Workspace | Bid, accept/start work, submit report/invoice |
| Continental Internal Operations | Existing local internal user if available | Internal | Spot-check Internal/AMC workspace separation |

## Preflight Checklist

Before clicking through:

1. Confirm repo state:

   ```bash
   git status
   git log --oneline -5
   git tag --points-at HEAD
   ```

2. Reset local data and load AMC fixture:

   ```bash
   npm run supabase:reset:local
   npm run amc:smoke:fixtures:load
   ```

3. Start the local app:

   ```bash
   npm run dev
   ```

4. Confirm the app opens locally and login works for the AMC smoke owner.

5. Create or verify the local-only Client Portal demo user/mapping for Dana Miller.

6. Confirm Dana can reach `/client-portal` and cannot reach Internal/AMC/Vendor routes.

## Client Portal Demo Account Setup

The current product has Client Portal permissions and `client_portal_members` mapping, but no
dedicated invite/onboarding flow. For this hands-on local pilot, prepare Dana Miller manually in the
local database.

AMC-19 gap:

- There is no first-class client invite/onboarding flow yet. This is not a Client Portal request
  workflow blocker once the account exists, but it is an important pilot setup gap because staff
  cannot invite Dana through a supported UI.

Required local-only records:

- `auth.users` row for `client.demo.dana+local@example.test`.
- `public.users` row linked to that auth user.
- active `company_memberships` row in `falcon_default`.
- role/permission assignment granting:
  - `client_portal.dashboard.view`;
  - `client_portal.orders.read`;
  - `client_portal.orders.create`;
  - `client_portal.reports.read`.
- `clients` row for `First Buckeye Bank` if one does not already exist.
- active `client_portal_members` row mapping Dana to First Buckeye Bank.
- auth app metadata setting active/current company to `falcon_default`.

Suggested local setup sequence:

1. Create Dana's Auth user in local Supabase Auth/Studio or with a local service-role helper only.
   Use `client.demo.dana+local@example.test` and `FalconSmoke123!`.
2. In SQL, resolve:
   - `v_company_id`: the `falcon_default` company id.
   - `v_auth_user_id`: Dana's `auth.users.id`.
   - `v_client_id`: the First Buckeye Bank client id.
3. Upsert Dana's `public.users` row with `auth_id = v_auth_user_id`, email, name, and active
   status.
4. Upsert `company_memberships(company_id, user_id, status, membership_type, is_primary)` as active
   with a local/demo membership marker.
5. Create or reuse a local-only role named `Client Portal Demo` and grant:
   - `client_portal.dashboard.view`;
   - `client_portal.orders.read`;
   - `client_portal.orders.create`;
   - `client_portal.reports.read`.
6. Upsert `user_role_assignments(company_id, user_id, role_id, status, is_primary)` for the demo
   role.
7. Upsert `client_portal_members(company_id, client_id, user_id, status)` as active.
8. Set Dana's Auth app metadata for `active_company_id` and `current_company_id` to `falcon_default`.
9. Confirm `rpc_client_portal_dashboard()`, `rpc_client_portal_orders()`, and
   `rpc_client_portal_order_request_create(...)` work as Dana.

Do not grant Dana:

- `orders.*` operational permissions;
- `vendors.*`;
- `amc.*`;
- `client_portal.order_requests.read`;
- `client_portal.order_requests.manage`;
- `users.*`;
- Permission Center/admin access.

Expected result:

- Dana can use `/client-portal`, `/client-portal/orders`, and `/client-portal/new-order`.
- Dana sees only client-safe fields.
- Dana cannot access `/orders`, `/client-requests`, `/vendors`, `/users`, or `/vendor-workspace`.

## Simulation Path

### A. Client Portal Request

Actor: Dana Miller.

1. Log in as `client.demo.dana+local@example.test`.
2. Open `/client-portal`.
3. Confirm dashboard renders First Buckeye Bank context.
4. Open `/client-portal/new-order`.
5. Submit a request:
   - Property address: `100 Demo Market Street, Columbus, OH 43215`.
   - Property type: `Commercial`.
   - Report/appraisal type: `Commercial Appraisal`.
   - Intended use / loan purpose: `Acquisition financing`.
   - Requested due date: a future business date.
   - Borrower/contact name: `Taylor Borrower`.
   - Client contact name: `Dana Miller`.
   - Client contact phone: `614-555-0188`.
   - Client contact email: `client.demo.dana+local@example.test`.
   - Notes: `AMC-18 local pilot simulation request. Disposable local data only.`
6. Confirm the success state says `Request submitted`.

Expected result:

- No operational order is created directly by the client.
- Request is visible to staff review.
- The returned request payload includes an opaque `request_key` and `submitted` status.
- Client sees no vendor, fee, procurement, assignment, admin, or internal-note controls.

UX notes:

```text
Client request UX notes:
-
```

### B. Staff Request Review

Actor: Falcon AMC Coordinator.

1. Log out or switch session.
2. Log in as `amc.smoke.owner@example.test`.
3. Confirm the workspace is Falcon AMC.
4. Open `/client-requests`.
5. Select Dana Miller's First Buckeye Bank request.
6. Review property, contact, due date, report type, and notes.
7. Mark the request `under_review`.
8. Confirm status changes and no operational order link exists yet.

Expected result:

- Staff can see intake details.
- Client Portal users cannot open `/client-requests`.
- Marking under review does not create an operational order.

UX notes:

```text
Staff review UX notes:
-
```

### C. Staff-Confirmed Conversion

Actor: Falcon AMC Coordinator.

1. In `/client-requests`, click `Convert to order`.
2. Read the confirmation modal.
3. Confirm mapped fields:
   - client;
   - property address;
   - property type;
   - report type;
   - loan purpose;
   - requested due date;
   - borrower/contact;
   - client contact;
   - notes/instructions.
4. Confirm conversion.
5. Confirm request status becomes accepted/converted and a created order number/link appears.
6. Open the created order link.

Expected result:

- Exactly one operational order is created.
- Request-to-order linkage is visible to staff.
- The converted request status becomes `accepted`.
- Conversion requires both `client_portal.order_requests.manage` and `orders.create`.
- No assignment, vendor bid, invoice, payment, report, or document is created during conversion.
- Duplicate conversion is blocked.

UX notes:

```text
Conversion UX notes:
-
```

### D. AMC Procurement

Actor: Falcon AMC Coordinator.

1. Open the converted order in Falcon AMC.
2. Confirm the order appears in AMC Operations, not Internal Operations.
3. Use the candidate/vendor workflow if matching coverage is available.
4. If candidate matching does not include Demo Vendor Appraisal Co. for the converted order, use the
   existing `AMC-SMOKE-001` fixture for the procurement/vendor portion and record the gap.
5. Send bid/request to Demo Vendor Appraisal Co. when available.
6. Return to Bid Requests history and confirm the recipient/request state.

Expected result:

- Client request conversion does not expose procurement to Dana.
- AMC coordinator can continue from the operational order using current AMC workflow.
- If converted-order vendor matching needs more demo coverage, this is a fixture gap, not a Client
  Portal product blocker.

UX notes:

```text
AMC procurement UX notes:
-
```

### E. Vendor Workspace

Actor: Demo Vendor Appraisal Co.

Use the converted order if procurement created a vendor opportunity. Otherwise use the existing
`AMC-SMOKE-001` fixture path.

1. Log in as `amc.smoke.vendor@example.test`.
2. Open `/vendor-workspace`.
3. Open Available Work.
4. Open Work Detail.
5. Submit a bid.
6. Return as AMC Coordinator and select the bid.
7. Create assignment offer.
8. Accept the assignment through the supported offer flow.
9. Open Assigned Orders.
10. Start work.
11. Open seeded vendor-visible document if present.
12. Upload/submit report using `/private/tmp/project-falcon-amc-smoke/amc-smoke-report.pdf`.
13. Complete revision flow if desired.
14. Submit invoice using `/private/tmp/project-falcon-amc-smoke/amc-smoke-invoice.pdf`.

Expected result:

- Vendor Workspace never exposes shared `/orders`.
- Vendor sees only safe work, document, report, invoice, and payment fields.
- No raw IDs, storage paths, internal notes, client fee, or AMC margin are visible.

UX notes:

```text
Vendor Workspace UX notes:
-
```

### F. AMC Completion

Actor: Falcon AMC Coordinator.

1. Review submitted report.
2. Request revision if desired.
3. Complete the assignment after final report is acceptable.
4. Approve invoice.
5. Schedule payment if desired.
6. Mark paid if desired.
7. Ensure the final client-deliverable report is represented as:
   - `order_documents.category = 'final_report'`;
   - `visibility_scope = 'client'`;
   - `status = 'active'`.

Expected result:

- Vendor payment flow can reach paid state.
- Internal/vendor/private documents remain unavailable to client.
- Only final client-visible report metadata becomes available to Client Portal.

UX notes:

```text
AMC completion UX notes:
-
```

### G. Client Tracking And Download

Actor: Dana Miller.

1. Log back in as Dana.
2. Open `/client-portal/orders`.
3. Confirm the converted order appears.
4. Open order detail.
5. Confirm high-level status, property, key dates, and report availability.
6. If the final report is available, click `Download report`.
7. Confirm the browser receives a signed URL/download without exposing storage bucket/path.

Expected result:

- Dana sees the order through the client-safe read model.
- Dana sees no vendor, bid, assignment, invoice, payment, margin, raw order id, storage path,
  internal note, or admin surface.
- Download is available only for the final client-visible report.

UX notes:

```text
Client tracking/download UX notes:
-
```

## Isolation Checks

Run these during the manual simulation:

| Check | Expected result |
| --- | --- |
| Dana opens `/orders` | Redirect/unavailable; no Internal/AMC orders mount |
| Dana opens `/client-requests` | Access denied/unavailable |
| Dana opens `/vendor-workspace` | Access denied/unavailable |
| AMC coordinator opens `/client-portal` without client mapping | Client Portal unavailable unless explicitly mapped |
| Vendor opens `/orders` | Shared internal order UI does not mount |
| Wrong vendor opens another vendor work/detail key | Unavailable/denied |
| Client Portal payload inspection | No raw order ids, storage paths, vendor/procurement/internal fields |
| Vendor payload inspection | No internal notes, client fee, AMC margin, competing bids, storage paths |

## Known Placeholders And Deferred Items

- Dedicated client invite/onboarding flow.
- Dedicated local client demo fixture.
- Client account management.
- File upload with new order request.
- Client messaging/comment thread.
- Configurable lender-specific order forms.
- Deeper backend operation-entitlement model.
- External email/payment/accounting integrations.
- Full visual browser QA with screenshots across personas.

## Pilot Clickthrough Findings - 2026-06-07

These issues were found during the hands-on pilot simulation after the automated AMC-18 gate passed.
They are recorded here so the local run can distinguish fixed blockers from deferred product work.

| Finding | Severity | Status | Notes |
| --- | --- | --- | --- |
| Permission Center save failed with `membership_id` ambiguity | Blocking | Fixed | `rpc_company_member_access_save(...)` and the child permission override save function now resolve PL/pgSQL name conflicts explicitly so Appraiser/template changes fail only for legitimate permission or business-rule reasons. |
| Setting Dana Miller as default contact failed | Blocking | Fixed | `rpc_client_contact_set_default(...)` now uses qualified contact columns and current-company authorization before updating the selected default contact. |
| Client Relationships mixed Internal and AMC relationship views | High | Fixed | Client relationship list/detail reads now accept the active operations scope so Internal mode excludes AMC-only clients and AMC mode excludes Internal-only clients. |
| Permission Center categories opened too expanded | UX | Fixed | Permission groups now start collapsed by default while keeping the member summary, role/template summary, draft review, and save confirmation visible. |
| Users directory mixed Internal, AMC, Vendor, and Client Portal members | High | Fixed | Users list reads now pass active operation scope and the backend filters members plus returned role assignments from role permission metadata, preserving no-scope fallback only for callers without operation context. |
| Permission Center save succeeded but saved Appraiser template did not reappear | Blocking | Fixed | The open dialog now follows the refreshed member row after save, and Appraiser/Reviewer work-eligibility templates remain visible in AMC-scoped member reloads. |
| Falcon AMC client creation failed or created zero-order clients without AMC visibility | Blocking | Fixed | New Client now sends active workspace scope, and the client create RPC persists `clients.operations_scope` so new AMC/Internal relationships appear only in the creating workspace before orders exist. |
| Legacy Edit roles modal opened with a long effective-permission list | UX | Fixed | Edit Access now keeps role presets visible, shows granted/category/override counts first, and leaves detailed effective permissions collapsed until staff expands them. |
| Client Portal has no client invite/onboarding flow | Important before pilot | AMC-19 gap | Dana can validate request intake after a manual local account/mapping setup, but staff cannot invite or onboard a lender through the product yet. |

Client Portal request workflow checkpoint:

- Intake path is ready to test after manual Dana setup.
- Client request submit uses `rpc_client_portal_order_request_create(...)`; it creates only
  `client_portal_order_requests` and does not create an operational order.
- Staff review uses `/client-requests` and the dedicated staff review RPCs.
- Status handling supports `submitted`, `under_review`, `accepted`, `declined`, and `cancelled`;
  the current UI can mark `under_review` or reject and can convert submitted/under-review requests.
- Conversion uses `rpc_client_portal_order_request_convert_to_order(...)`; it requires
  `client_portal.order_requests.manage` plus `orders.create`, sets request status to `accepted`,
  stores `accepted_order_id`, and creates no vendor/procurement/payment/report records.
- The remaining blocker for an unaided clickthrough is onboarding, not request/review/conversion
  wiring.

Deferred after these fixes:

- Rerun the full manual clickthrough after deployment.
- Add a reusable local Client Portal demo fixture instead of manual Dana Miller setup.
- Add production/staging smoke evidence for the Client Portal once the pilot deployment target is
  confirmed.

## AMC-18B Production Schema Alignment - 2026-06-07

Production clickthrough confirmed the deployed frontend was ahead of the production Supabase schema.
The production database still exposed only the older RPC signatures:

- `rpc_client_management_list(p_search text, p_category text, p_sort text)`;
- `rpc_company_member_list(p_include_inactive boolean)`.

The deployed frontend now calls operation-scoped signatures:

- `rpc_client_management_list(p_search, p_category, p_sort, p_operations_scope)`;
- `rpc_company_member_list(p_include_inactive, p_operations_scope)`.

Prepared alignment migration:

- `supabase/migrations/20260607130000_production_schema_alignment.sql`.

Objects included:

- `rpc_company_member_access_save(...)` with qualified Permission Center save output conflicts.
- `rpc_company_member_permission_overrides_save(...)` with qualified membership writes.
- `rpc_client_contact_set_default(bigint)` with qualified current-company contact updates.
- `client_relationship_has_operations_scope(bigint, uuid, text)`.
- `rpc_client_management_list(text, text, text, text)`.
- `rpc_client_management_detail(bigint, text)`.
- `company_role_matches_operations_scope(uuid, text)`.
- `rpc_company_member_list(boolean, text)`.

Manual Supabase SQL Editor deployment steps:

1. Confirm the production Supabase project ref from the live production environment.
2. Take or confirm a production database backup/snapshot.
3. Open the production Supabase SQL Editor.
4. Paste and run the full contents of:

   ```text
   supabase/migrations/20260607130000_production_schema_alignment.sql
   ```

5. Refresh the PostgREST schema cache:

   ```sql
   notify pgrst, 'reload schema';
   ```

6. Smoke the production screens:
   - `/clients` loads without schema-cache function errors.
   - `/users` loads scoped company members.
   - Permission Center saves Abby/Appraiser template changes or returns a legitimate permission
     or business-rule error, not SQL ambiguity.
   - Setting Dana Miller as default contact succeeds or returns a legitimate permission
     or business-rule error.

Follow-up production retest fixes:

- Apply `supabase/migrations/20260608100000_amc18_production_persistence_fixes.sql` after the
  alignment migration if production still shows saved secondary templates as missing or cannot
  create a new AMC-scoped client.
- Refresh schema cache again:

  ```sql
  notify pgrst, 'reload schema';
  ```

- Re-smoke:
  - Add Appraiser template to Abby, save, close/reopen Permission Center, and confirm Appraiser is
    listed as a secondary template and checked in edit mode.
  - Create First American Bank in Falcon AMC mode with Dana Miller as primary contact.
  - Confirm the client appears in AMC Client Services and does not appear in Internal Client
    Relationships.

Production retest note:

- Permission persistence confirmed: Abby showed Admin plus Appraiser after save and reopen.
- Client operation scoping confirmed: the AMC-created First American Bank relationship did not
  appear in Internal Client Relationships.
- Edit roles cleanup applied: the legacy Edit Access modal now defaults to a summary-first
  effective-permission preview with details available on demand.

Do not run broad `supabase db push --include-all` for this hotfix path until duplicate local
migration versions are resolved or proven safe for the target project.

## Cleanup And Reset

Preferred cleanup:

```bash
npm run supabase:reset:local
```

This discards the local demo state and returns to a clean local database before loading fixtures
again.

If the local database must be preserved temporarily:

- clearly label any demo records with `AMC-18 local pilot`;
- avoid adding real emails or real customer/vendor/client data;
- capture request keys/order numbers in the UX notes;
- reset before any staging or production deployment work.

## Manual Evidence Template

```text
Run date/time:
Git ref:
Local tag:
Local Supabase reset:
Fixture load:
Dev server URL:

Personas:
- Client:
- AMC coordinator:
- Vendor:
- Internal:

Client request:
- Submitted:
- Request key/status:
- UX notes:

Staff review:
- Under review:
- Converted:
- Created order number:
- UX notes:

AMC procurement:
- Candidate matching:
- Bid request:
- Bid selected:
- Assignment offer:
- UX notes:

Vendor workspace:
- Available work:
- Bid submitted:
- Assignment accepted:
- Started:
- Document access:
- Report submitted:
- Invoice submitted:
- UX notes:

AMC completion:
- Report reviewed:
- Revision:
- Assignment completed:
- Invoice approved:
- Payment scheduled/paid:
- Final report client-visible:
- UX notes:

Client tracking/download:
- Order visible:
- Report available:
- Download authorized:
- Storage path/raw id hidden:
- UX notes:

Defects:
Follow-up tasks:
Decision:
```
