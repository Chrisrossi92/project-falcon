# AMC Full MVP Manual Smoke Test Results - 2026-06-06

## Latest Run Update - 2026-06-06 19:04 EDT

Smoke run: AMC-13B.4 Local Full AMC MVP Smoke Test

Environment:

- Local Supabase at `http://127.0.0.1:54321`.
- Reset command: `npm run supabase:reset:local`.
- Fixture command: `npm run amc:smoke:fixtures:load`.
- Disposable owner: `amc.smoke.owner@example.test`.
- Disposable vendor: `amc.smoke.vendor@example.test`.
- Disposable order: `AMC-SMOKE-001`.
- Disposable report PDF: `/private/tmp/project-falcon-amc-smoke/amc-smoke-report.pdf`.
- Disposable invoice PDF: `/private/tmp/project-falcon-amc-smoke/amc-smoke-invoice.pdf`.

Decision:

- Local reset and fixture load now succeed.
- Product smoke progressed through bid, assignment offer, tokenized vendor acceptance, assigned
  order detail, start work, assignment document authorization, report upload, and report submission.
- The run is blocked at coordinator revision request.

Happy path checklist from the latest run:

| Step | Result | Notes |
| --- | --- | --- |
| Owner confirms AMC order `AMC-SMOKE-001` | Pass | AMC-scoped disposable order exists. |
| Candidate matching | Pass | One smoke vendor candidate returned after fixture coverage taxonomy fix. |
| Vendor sees Available Work | Pass | Authenticated Vendor Workspace RPC returned the fixture opportunity. |
| Vendor opens Work Detail | Pass | Unified work detail loaded. |
| Vendor submits bid | Pass | Submitted `650 USD` bid through authenticated Vendor Workspace RPC. |
| Owner selects bid | Pass | Selected submitted response. |
| Owner creates assignment offer | Pass | Selected bid converted to `vendor_appraisal` assignment offer. |
| Vendor accepts assignment | Pass | Accepted through tokenized assignment-offer lifecycle. |
| Vendor sees Assigned Orders | Pass | Assigned Orders queue returned `assignment_work_key`. |
| Vendor opens Assigned Order Detail | Pass | Detail loaded with accepted/not-started state. |
| Vendor starts work | Pass | Authenticated Vendor Workspace start action moved assignment to `in_progress`. |
| Vendor opens/downloads assignment documents | Pass | Assignment document authorization RPC allowed vendor-visible document access. |
| Vendor uploads report PDF and submits report | Pass | Report upload prepare/register and submit lifecycle completed. |
| Owner requests revision | Fail | `rpc_amc_request_vendor_assignment_revision` was rejected by assignment status guard. |
| Vendor uploads revision and resubmits | Not run | Blocked by revision request failure. |
| Vendor submits invoice PDF | Not run | Blocked before assignment completion/payment eligibility. |
| Owner approves invoice | Not run | Blocked before invoice submission. |
| Owner schedules payment | Not run | Blocked before invoice approval. |
| Owner marks payment paid | Not run | Blocked before payment scheduling. |
| Vendor Payments shows Paid | Not run | Blocked before paid status. |

Latest defects found:

### DEF-13B-003: Assignment status guard blocks coordinator revision request

Severity: blocking for AMC-10G/10H revision smoke and downstream invoice/payment smoke.

Evidence:

- `rpc_amc_request_vendor_assignment_revision(...)` requires a submitted `vendor_appraisal`
  assignment and attempts to move it to `revision_requested`.
- The `trg_order_company_assignments_guard` trigger still rejects `submitted -> revision_requested`.
- Error:

```text
Invalid order-company assignment status transition: submitted -> revision_requested
```

Impact:

- Coordinator cannot request vendor revisions after report submission.
- Vendor revision visibility/resubmission cannot be smoke-tested from the real coordinator action.
- Invoice/payment smoke cannot continue because the assignment cannot complete after the revision
  cycle.

Recommended fix:

- Add an additive migration that updates `public.tg_order_company_assignments_guard()` to allow:
  - `submitted -> revision_requested`;
  - `revision_requested -> submitted`;
  - appropriate terminal transitions from `revision_requested` if required by existing lifecycle.
- Add regression coverage for `rpc_amc_request_vendor_assignment_revision(...)` and
  `rpc_vendor_workspace_resubmit_report(...)` across the full submitted/revision/submitted loop.

Latest edge checks:

| Case | Result | Notes |
| --- | --- | --- |
| Expired bid | Not run | Blocked before edge-case branch execution. |
| Declined bid | Not run | Blocked before edge-case branch execution. |
| Rejected invoice/corrected invoice | Not run | Blocked before invoice flow. |
| Wrong vendor denial | Not run | Current fixture has one vendor company only. |
| Internal vs AMC workspace separation | Not run | Browser route diagnostics deferred because API smoke blocked first. |
| Vendor Workspace cannot access shared `/orders` | Not run | Browser route diagnostics deferred because API smoke blocked first. |
| No raw ID/storage path leakage | Partial | Vendor-facing RPC flow used opaque keys; upload storage paths were only observed inside the local smoke harness. |
| No internal note leakage | Not run | Blocked before invoice/review/internal-note checks. |

## AMC-13B.5 Verification Update - 2026-06-06

Smoke run: revision status guard verification after `20260606130000_amc_revision_assignment_status_guard.sql`.

Result:

- Local reset replayed through the new migration.
- Disposable smoke fixture load succeeded.
- The full local smoke runner continued past the previous revision blocker.

Revision workflow checklist:

| Step | Result | Notes |
| --- | --- | --- |
| Vendor uploads report PDF and submits report | Pass | Assignment reached submitted state. |
| Owner requests revision | Pass | `rpc_amc_request_vendor_assignment_revision(...)` moved assignment to `revision_requested` and logged/notified `assignment.revision_requested`. |
| Vendor uploads revision and resubmits | Pass | `rpc_vendor_workspace_resubmit_report(...)` moved assignment back to `submitted` and logged/notified `assignment.resubmitted`. |
| Coordinator completes assignment | Pass | Assignment completion succeeded after resubmission. |
| Vendor submits invoice PDF | Pass | Invoice upload/register/submission succeeded. |
| Owner approves invoice | Pass | Invoice review moved invoice to `approved`. |
| Owner schedules payment | Fail | Blocked by a payment-ledger user FK mismatch, separate from the revision lifecycle guard. |

### DEF-13B-004: Payment ledger scheduling writes auth user id into app-user FK

Severity: blocking for AMC-12E payment scheduling smoke, not blocking for AMC-13B.5 revision workflow.

Evidence:

```text
insert or update on table "amc_vendor_payment_ledger" violates foreign key constraint "amc_vendor_payment_ledger_scheduled_by_user_id_fkey"
Key (scheduled_by_user_id) is not present in table "users".
```

Impact:

- Full AMC-13B.4 can now continue past revision request/resubmission.
- Full paid-state smoke remains blocked at payment scheduling.

Recommended fix:

- Align `rpc_amc_schedule_vendor_payment(...)` and `rpc_amc_mark_vendor_payment_paid(...)` actor ids
  with the `amc_vendor_payment_ledger` FK target, or change the ledger FK if the intended actor
  identity is auth-user scoped.

## Run Summary

Smoke run: AMC-13B Full AMC MVP Manual Smoke Test

Environment attempted:

- Local Supabase at `http://127.0.0.1:54321`.
- Hosted staging/reference Supabase project ref `voompccpkjfcsmehdoqu`.

Date/time:

- Started: 2026-06-06 14:27 EDT.

Build/ref:

- Local working tree with AMC-9 through AMC-13A changes present.

Decision:

- Blocked before product smoke execution.
- No disposable smoke order, vendor company, vendor login, report PDF, or invoice PDF was created.
- No happy-path or edge-case product assertions can be marked pass/fail from this run.

## Environment Findings

### Local Supabase

Initial Docker status showed the local Postgres container in a restart loop. Postgres logs showed:

- missing `/etc/postgresql-custom/conf.d`;
- fatal Postgres configuration load failure.

A narrow local Docker-volume repair restored the missing `conf.d` directory. After DB restart,
container health recovered, but the database catalog was not a complete Supabase bootstrap:

- only `supabase_admin` existed as a database role;
- `_supabase` database was missing;
- normal Supabase roles such as `postgres`, `authenticator`, and `supabase_storage_admin` were
  missing.

`supabase db reset` was then run for a clean disposable local reset. Migration replay failed at:

```text
20260518071000_order_documents_private_bucket_download_auth.sql
ERROR: relation "storage.buckets" does not exist
```

The local reset did not create the expected Supabase Storage schema before Falcon's document
migration attempted to seed `storage.buckets`.

### Hosted Staging

Hosted staging was reachable with the configured staging service-role environment, but AMC-9 through
AMC-12 runtime RPCs were not present in the PostgREST schema cache.

Representative missing RPC probes:

- `rpc_vendor_workspace_available_work`
- `rpc_vendor_workspace_available_work_detail`
- `rpc_vendor_workspace_submit_bid_response`
- `rpc_vendor_workspace_assigned_orders`
- `rpc_vendor_workspace_assigned_order_detail`
- `rpc_vendor_workspace_submit_report`
- `rpc_vendor_workspace_payments`
- `rpc_amc_vendor_invoices`
- `rpc_amc_vendor_payment_ledger`

Result:

- Staging is behind the local AMC implementation and cannot execute AMC-13B without deploying the
  pending AMC migrations and Edge Functions first.

## Demo Records Used

None.

Smoke data was not created because neither local nor hosted staging had a usable AMC-9 through
AMC-12 runtime environment.

Planned disposable records, not created:

- AMC order: `AMC-SMOKE-HAPPY-001`.
- Expired bid fixture: `AMC-SMOKE-EXPIRED-001`.
- Declined bid fixture: `AMC-SMOKE-DECLINED-001`.
- Rejected invoice fixture: `AMC-SMOKE-INVOICE-REJECT-001`.
- Wrong-vendor fixture: `AMC-SMOKE-WRONG-VENDOR-001`.
- Internal separation fixture: `INT-SMOKE-SEPARATION-001`.
- Disposable report PDF.
- Disposable invoice PDF.

## Happy Path Checklist

| Step | Result | Notes |
| --- | --- | --- |
| AMC order creation | Blocked | Local reset failed before fixture creation; staging missing AMC RPCs. |
| Candidate matching | Not run | Requires AMC-scoped order and candidate RPCs. |
| Bid request | Not run | Requires AMC-scoped order and vendor candidates. |
| Vendor bid | Not run | Requires authenticated Vendor Workspace and bid recipient. |
| Bid selection | Not run | Requires submitted bid. |
| Assignment offer | Not run | Requires selected bid. |
| Vendor acceptance | Not run | Requires assignment offer. |
| Start work | Not run | Requires accepted assignment. |
| Document access | Not run | Requires storage schema, Edge Function, and vendor-visible document. |
| Report upload/submission | Not run | Requires storage schema and report upload function. |
| Coordinator review | Not run | Requires submitted report. |
| Revision request | Not run | Requires submitted assignment. |
| Vendor resubmission | Not run | Requires revision-requested assignment. |
| Invoice submission | Not run | Requires payment-eligible assignment and invoice upload function. |
| Invoice approval | Not run | Requires submitted invoice. |
| Payment scheduling | Not run | Requires approved invoice. |
| Mark paid | Not run | Requires scheduled payment ledger entry. |

## Edge Case Checklist

| Case | Result | Notes |
| --- | --- | --- |
| Expired bid | Not run | Fixture could not be created. |
| Declined bid | Not run | Fixture could not be created. |
| Rejected invoice/corrected invoice | Not run | Fixture could not be created. |
| Wrong vendor denial | Not run | Disposable wrong-vendor account/fixture could not be created. |
| Internal vs AMC workspace separation | Not run | Fixture could not be created. |
| Vendor Workspace cannot access shared `/orders` | Not run | Requires authenticated vendor login. |
| No raw ID/storage path leakage | Not run | Requires Vendor Workspace runtime and document payloads. |
| No internal note leakage | Not run | Requires assignment/payment/profile review data. |

## Defects Found

### ENV-13B-001: Local Supabase reset does not bootstrap Storage before document migration

Severity: blocking for local AMC manual smoke.

Evidence:

- `supabase db reset` failed at `20260518071000_order_documents_private_bucket_download_auth.sql`.
- Error: `relation "storage.buckets" does not exist`.

Impact:

- Local disposable smoke data cannot be created.
- Document, report upload, invoice upload, and signed URL flows cannot be manually exercised.

Recommended fix:

- Repair local Supabase reset/replay so the Storage schema and `storage.buckets` exist before
  Falcon document migrations run.
- Re-run `supabase db reset` from a clean local stack and verify migration replay reaches the latest
  AMC migration.

### ENV-13B-002: Hosted staging is behind AMC-9 through AMC-12

Severity: blocking for staged AMC manual smoke.

Evidence:

- Staging RPC probes returned missing-function schema-cache errors for Vendor Workspace, assignment
  execution, payments, invoice review, and payment ledger RPCs.

Impact:

- Hosted staging cannot execute AMC-13B against the current local implementation.

Recommended fix:

- Deploy/apply pending AMC-9 through AMC-12 migrations and Edge Functions to an approved staging
  target.
- Refresh PostgREST schema cache.
- Re-run RPC availability probes before manual smoke.

## Follow-Up Regression Tests Needed

- Add a local reset readiness check that verifies `storage.buckets` exists before document migration
  assertions run.
- Add an AMC smoke environment preflight script that checks required RPC availability for AMC-9
  through AMC-12 before manual QA starts.
- Add Edge Function availability probes for:
  - `vendor-workspace-document-download-url`;
  - `vendor-workspace-report-upload-url`;
  - `vendor-workspace-invoice-upload-url`.
- Add a smoke fixture readiness test for disposable AMC owner, vendor, wrong-vendor, and internal
  separation records once local/staging reset is healthy.
- Investigate targeted UI test timing/order sensitivity observed after the blocked smoke attempt:
  the broad targeted suite once failed with Available Work and Vendor Profile update request pages
  stuck in loading state, while focused reruns of both tests passed.

## Recommended Fix Order

1. Fix local Supabase reset/storage bootstrap so `supabase db reset` reaches the latest migration.
2. Re-run the automated AMC critical test set after clean reset.
3. Load disposable AMC smoke fixtures locally.
4. Execute AMC-13B locally end-to-end.
5. Deploy the same migration/function set to approved staging only after local smoke passes.
6. Re-run AMC-13B in staging with disposable staging data.
7. Convert any product smoke failures into targeted SQL/RPC/UI regression tests before external
   integrations.

## AMC-13B.6 Payment Ledger Actor FK Fix Result

Run date: 2026-06-06.

Environment: local Supabase after `npm run supabase:reset:local` and
`npm run amc:smoke:fixtures:load`.

Root cause:

- `rpc_amc_schedule_vendor_payment(...)` and `rpc_amc_mark_vendor_payment_paid(...)` write
  `public.current_app_user_id()` into payment ledger actor columns.
- `public.current_app_user_id()` returns `public.users.id`.
- `amc_vendor_payment_ledger.scheduled_by_user_id` and `paid_by_user_id` were constrained to
  `auth.users(id)`, unlike assignment lifecycle actor fields.

Fix:

- `20260606131000_amc_payment_ledger_actor_fk_fix.sql` aligns payment ledger actor FKs to
  `public.users(id)`.
- Resolvable legacy auth-user actor values are converted to app-user ids before constraints are
  replaced.
- Unresolvable legacy actor values are nulled because the columns are nullable actor attribution
  fields with `on delete set null`.

Validation:

- Focused payment ledger migration tests passed.
- Clean local reset passed and applied the FK correction.
- Disposable smoke fixture load passed.
- Local full happy-path smoke passed through:
  - owner payment scheduling;
  - owner mark paid;
  - Vendor Payments showing `Paid`.

Smoke result:

- AMC-13B.4 happy path now completes through Vendor Payments `Paid`.

Remaining smoke warnings:

- Browser route guard verification is still recommended for Vendor Workspace access to shared
  `/orders`; the REST probe returned HTTP 200 and is not a route-level browser assertion.
- Wrong-vendor denial requires a second disposable vendor fixture.
- Rejected invoice / corrected invoice remains an edge-case smoke path to execute separately.

## AMC-13B.7 Local Edge-Case Smoke Result

Run date: 2026-06-06.

Environment:

- Local Supabase reset with `npm run supabase:reset:local`.
- Base disposable fixtures loaded with `npm run amc:smoke:fixtures:load`.
- Temporary edge harness added a second disposable vendor:
  `amc.smoke.wrongvendor@example.test`.

Checklist:

| Edge case | Result | Notes |
| --- | --- | --- |
| Vendor REST order row isolation | Pass | Vendor-authenticated REST `orders` query returned HTTP 200 with an empty RLS result. |
| Vendor Workspace route/source isolation tests | Pass | `VendorWorkspaceShell`, `vendorWorkspaceApi`, and route composition diagnostics passed. |
| Wrong vendor cannot see first vendor available work | Pass | Second vendor Available Work returned no rows. |
| Wrong vendor cannot open first vendor work detail | Pass | Returned `available_work_unavailable`. |
| Wrong vendor cannot access first vendor opportunity document | Pass | Returned `vendor_document_unavailable`. |
| Wrong vendor cannot open first vendor assigned order detail | Pass | Returned `assigned_order_unavailable`. |
| Wrong vendor cannot access first vendor assignment document | Pass | Returned `vendor_document_unavailable`. |
| Vendor declines opportunity | Pass | Decline reason `Too busy / capacity` persisted. |
| Owner-side bid state reflects pass | Pass | Recipient status became `declined`; request closed. |
| Vendor My Bids shows Passed Opportunity | Pass | Passed row appeared with decline reason/comments. |
| Declined work detail remains safe/read-only | Pass | Detail returned declined state and safe vendor fields. |
| Vendor submits invoice for completed assignment | Pass | Invoice `AMC-EDGE-INV-001` submitted. |
| Owner rejects invoice with vendor-facing message | Pass | Vendor-safe rejection message persisted. |
| Vendor Payments shows rejection/correction path | Pass | Rejected status and correction copy were visible. |
| Vendor submits corrected invoice | Pass | Corrected invoice returned to `invoice_received`. |
| Owner review queue sees corrected invoice | Pass | Corrected invoice `AMC-EDGE-INV-001-R` appeared in internal queue. |
| Vendor payload leakage scan | Pass | Captured Vendor Workspace RPC payloads had no raw UUIDs, storage paths, internal notes, client fee, or AMC margin. |
| Internal note separation | Pass | Internal reviewer note existed only in internal assignment payload; Vendor Workspace RPC payload scan did not expose it. |

Defects found:

- None in the executed local edge-case smoke.

Fixture changes used:

- The edge harness created one additional local-only disposable vendor company/user for wrong-vendor
  denial checks.
- The edge harness created one additional bid request/recipient after the decline path so the
  rejected/corrected invoice path could run without resetting between edge cases.

Follow-up regression tests recommended:

- Persist the second disposable vendor fixture in the local smoke fixture loader so wrong-vendor
  denial can run without harness-only setup.
- Add a dedicated route-level browser smoke once a browser runner is standardized for local smoke.
- Add an explicit rejected/corrected invoice RPC integration test around Vendor Payments and
  `rpc_amc_vendor_invoices(...)`.

## AMC-13B.8 Edge Fixture and Regression Hardening

Run date: 2026-06-06.

Purpose:

- Promote the successful AMC-13B.7 temporary edge harness into repeatable local fixtures and tests.

Implemented:

- The local smoke fixture now creates the second disposable vendor:
  `amc.smoke.wrongvendor@example.test`.
- The fixture summary now verifies the wrong-vendor profile exists alongside the owner, primary
  vendor, and AMC smoke order.
- A repeatable edge smoke command is available:
  `npm run amc:smoke:edge`.
- The checked-in edge runner covers:
  - wrong-vendor available-work/detail/document/assignment denial;
  - declined opportunity / Passed Opportunity history;
  - rejected invoice / corrected invoice return to internal review;
  - Vendor Workspace payload leakage checks for raw UUIDs, storage paths, internal notes, client
    fee, and AMC margin.
- Static regression tests now lock the fixture/runner coverage so future changes do not silently
  remove the edge smoke paths.

Repeatable local sequence:

```text
npm run supabase:reset:local
npm run amc:smoke:fixtures:load
npm run amc:smoke:edge
```

Remaining follow-up:

- Add a dedicated route-level browser smoke once the local browser runner is standardized. The
  current edge runner still verifies REST/RLS order-row isolation and Vendor Workspace source/route
  diagnostics, but it is not a browser navigation assertion for direct `/orders`.

## AMC-13B.9 Vendor Browser Route Isolation Smoke

Run date: 2026-06-06.

Purpose:

- Close the direct-navigation route gap for authenticated Vendor Workspace users after AMC-13B.8
  proved API/RPC isolation.

Implemented:

- Added jsdom browser-route smoke coverage for vendor direct navigation to:
  - `/orders`;
  - `/orders/:id`;
  - `/dashboard`.
- The route smoke uses vendor-only permissions and the same `ProtectedRoute`,
  `VendorWorkspaceRouteGuard`, `VendorWorkspaceLayout`, and `DashboardGate` components used by
  runtime routes.
- Assertions confirm:
  - shared/internal orders list content does not mount;
  - shared/internal order detail content does not mount;
  - vendor direct `/orders` and `/orders/:id` land on safe `Dashboard unavailable` behavior;
  - vendor direct `/dashboard` renders the same safe unavailable state;
  - Vendor Workspace dashboard remains usable after the direct-navigation isolation checks;
  - Vendor Workspace output still contains no `/orders` links.

Result:

- Browser-route isolation coverage is now part of the targeted Vendor Workspace test suite.
- API/RPC edge smoke remains repeatable through `npm run amc:smoke:edge`.

Remaining follow-up:

- A full external-browser runner can still be added later for visual QA, but AMC-13 local
  smoke/edge/route-isolation coverage now has repeatable automated coverage in the repo.

## AMC-13C Staging Runtime Catch-Up Plan

Run date: 2026-06-06.

Purpose:

- Prepare hosted staging to run the same AMC-13 smoke suite that now passes locally.

Implemented:

- Added a staging-only catch-up plan at `docs/amc/AMC_STAGING_RUNTIME_CATCH_UP_PLAN.md`.
- Added a read-only staging runtime probe command:
  `npm run amc:staging:runtime:check`.
- The probe requires staging-only environment variables, refuses known production refs, checks
  required AMC RPC availability through PostgREST, and probes required Vendor Workspace Edge
  Functions.
- The plan documents:
  - pending AMC migration deployment;
  - Vendor Workspace Edge Function deployment;
  - permission/frontend alignment;
  - PostgREST schema cache refresh;
  - disposable staging fixture setup;
  - readiness checklist and blockers before staging AMC-13 smoke.

Decision:

- Staging AMC-13 smoke remains blocked until the staging project is migrated, the three Vendor
  Workspace Edge Functions are deployed, schema cache is refreshed, and disposable staging smoke
  records are created.

## AMC-13D Staging Deployment Execution

Run date: 2026-06-06.

Target:

- Hosted staging Supabase project ref: `voompccpkjfcsmehdoqu`.
- Confirmed local Supabase link metadata points at `voompccpkjfcsmehdoqu`.
- Confirmed `.env.local` points at `https://voompccpkjfcsmehdoqu.supabase.co`.

Executed:

- Database catch-up through `supabase db push --linked --include-all --yes`.
- Edge Function deployments:
  - `vendor-workspace-document-download-url`;
  - `vendor-workspace-report-upload-url`;
  - `vendor-workspace-invoice-upload-url`.
- Runtime availability probe:
  `npm run amc:staging:runtime:check`.

Deployment notes:

- Supabase CLI 2.41.3 does not support `supabase db push --project-ref`; the staging deployment
  used the linked-project command after verifying the link target.
- The first database push stopped at
  `20260605112000_amc_vendor_workspace_profile_update_requests.sql` because staging did not resolve
  unqualified `gen_random_bytes(integer)` in the `request_key` default.
- The migration was narrowed to use `extensions.gen_random_bytes(16)`, matching the hardened token
  generation pattern already used by other AMC invitation migrations.
- The database push then completed through `20260606131000_amc_payment_ledger_actor_fk_fix.sql`.
- The first runtime probe showed no Edge Function failures but exposed that the probe needed
  signature-aware payloads for parameterized RPCs.
- The probe was updated to call parameterized RPCs with harmless invalid keys or nil UUIDs.

Runtime probe result:

```json
{
  "project_ref": "voompccpkjfcsmehdoqu",
  "rpc_count": 34,
  "edge_function_count": 3,
  "rpc_failures": [],
  "edge_function_failures": []
}
```

Decision:

- Staging runtime is now caught up for AMC-9 through AMC-12 RPC and Edge Function availability.
- AMC-13 staging smoke is unblocked at the runtime layer.
- Remaining blocker before product smoke: load disposable staging smoke fixtures and create/verify
  disposable owner/vendor/wrong-vendor staging logins.

## AMC-13E Staging Disposable Fixture Load

Run date: 2026-06-06.

Target:

- Hosted staging Supabase project ref: `voompccpkjfcsmehdoqu`.
- Fixture loader requires explicit staging env vars and refuses known production refs.

Implemented:

- Added staging-only fixture loader command:
  `npm run amc:staging:fixtures:load`.
- The loader creates/updates disposable staging Auth users, app users, company memberships, role
  assignments, vendor relationships, vendor profiles, coverage, one AMC order, one bid request, one
  bid recipient, and a vendor-visible source document.
- The loader sets Auth app metadata for:
  - `active_company_id`;
  - `current_company_id`;
  - `amc_smoke_fixture`;
  - `staging_smoke`.
- The loader writes local disposable report/invoice PDFs for the staging smoke runner and uploads a
  disposable engagement PDF to the private `order-documents` bucket for vendor document-open smoke.

Disposable staging records:

- Owner login: `amc.smoke.owner+staging@example.test`.
- Vendor login: `amc.smoke.vendor+staging@example.test`.
- Wrong-vendor login: `amc.smoke.wrongvendor+staging@example.test`.
- Temporary password: `FalconSmoke123!`.
- Owner company: `falcon_default`.
- Vendor company: `amc-staging-smoke-disposable-vendor`.
- Wrong-vendor company: `amc-staging-smoke-wrong-vendor`.
- AMC order: `AMC-STAGING-SMOKE-001`.
- Report PDF: `/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-report.pdf`.
- Invoice PDF: `/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-invoice.pdf`.

Validation:

```json
{
  "project_ref": "voompccpkjfcsmehdoqu",
  "owner_login": "amc.smoke.owner+staging@example.test",
  "vendor_login": "amc.smoke.vendor+staging@example.test",
  "wrong_vendor_login": "amc.smoke.wrongvendor+staging@example.test",
  "owner_company_slug": "falcon_default",
  "vendor_company_slug": "amc-staging-smoke-disposable-vendor",
  "wrong_vendor_company_slug": "amc-staging-smoke-wrong-vendor",
  "order_number": "AMC-STAGING-SMOKE-001",
  "vendor_available_work_rows": 1,
  "wrong_vendor_available_work_rows": 0
}
```

Additional document check:

- Vendor Work Detail returned one vendor-visible document metadata row.
- `rpc_vendor_workspace_authorize_document_access(...)` returned `ok: true` for that document key.

Decision:

- Staging disposable fixture load succeeded.
- Owner, vendor, and wrong-vendor sessions resolve to the intended company contexts.
- Correct vendor can see one Available Work row for `AMC-STAGING-SMOKE-001`.
- Wrong vendor sees zero rows for `AMC-STAGING-SMOKE-001`.
- Staging AMC smoke can now start.

## AMC-13F Staging Full AMC Happy Path Smoke

Run date: 2026-06-06.

Environment:

- Hosted staging Supabase project ref: `voompccpkjfcsmehdoqu`.
- Fixture reset command: `npm run amc:staging:fixtures:load`.
- Smoke command: `npm run amc:staging:smoke:happy`.
- Owner: `amc.smoke.owner+staging@example.test`.
- Vendor: `amc.smoke.vendor+staging@example.test`.
- Order: `AMC-STAGING-SMOKE-001`.
- Report PDF: `/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-report.pdf`.
- Invoice PDF: `/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-invoice.pdf`.

Implemented:

- Added repeatable staging happy-path smoke command:
  `npm run amc:staging:smoke:happy`.
- The runner requires explicit staging env vars, refuses known production refs, uses authenticated
  owner/vendor sessions for product RPCs, uses the Vendor Workspace document Edge Function for
  document-open validation, and uses service-role storage only to place disposable report/invoice
  file objects behind server-generated upload metadata.

Checklist:

| Step | Result | Notes |
| --- | --- | --- |
| Owner confirms AMC order | Pass | `AMC-STAGING-SMOKE-001`. |
| Candidate matching returns smoke vendor | Pass | 4 staging candidates returned. |
| Vendor sees Available Work | Pass | Vendor received one fixture opportunity. |
| Vendor opens Work Detail | Pass | Detail returned vendor-safe order and document metadata. |
| Vendor opens authorized document | Pass | `vendor-workspace-document-download-url` returned a signed URL. |
| Vendor submits bid | Pass | Bid submitted through authenticated Vendor Workspace RPC. |
| Owner selects bid | Pass | Owner selection RPC completed. |
| Owner creates assignment offer | Pass | Selected bid converted to `vendor_appraisal` assignment offer. |
| Vendor accepts assignment | Pass | Assignment accepted through invitation response flow. |
| Vendor sees Assigned Orders | Pass | Assigned Orders returned `assignment_work_key`. |
| Vendor opens Assigned Order Detail | Pass | Detail loaded `accepted_not_started`. |
| Vendor starts work | Pass | Assignment moved to `in_progress`. |
| Vendor uploads report PDF and submits report | Pass | Report metadata registered and assignment moved to `submitted`. |
| Owner requests revision | Pass | Assignment moved to `revision_requested`. |
| Vendor uploads revision and resubmits | Pass | Assignment moved back to `submitted`. |
| Owner completes assignment | Pass | Assignment completed after resubmission. |
| Vendor submits invoice PDF | Pass | Invoice `AMC-STAGING-INV-001` submitted. |
| Owner approves invoice | Pass | Invoice moved to `approved`. |
| Owner schedules payment | Pass | Payment moved to `scheduled`. |
| Owner marks paid | Pass | Payment moved to `paid`. |
| Vendor Payments shows Paid | Pass | Vendor Payments returned paid status for the assignment. |

Defects found:

- None in the executed staging happy-path smoke.

Decision:

- Staging AMC happy path is green through Vendor Payments `Paid`.
- Staging is ready for AMC-13G edge/isolation smoke using the disposable staging records.

## AMC-13G Staging Edge-Case Smoke

Run date: 2026-06-06.

Environment:

- Hosted staging Supabase project ref: `voompccpkjfcsmehdoqu`.
- Fixture reset command: `npm run amc:staging:fixtures:load`.
- Edge smoke command: `npm run amc:staging:smoke:edge`.
- Runtime probe command: `npm run amc:staging:runtime:check`.
- Owner: `amc.smoke.owner+staging@example.test`.
- Vendor: `amc.smoke.vendor+staging@example.test`.
- Wrong vendor: `amc.smoke.wrongvendor+staging@example.test`.
- Order: `AMC-STAGING-SMOKE-001`.

Implemented:

- Added repeatable staging edge-case smoke command:
  `npm run amc:staging:smoke:edge`.
- The runner uses explicit staging env guards, refuses known production refs, resets disposable
  staging fixtures before execution, drives product actions through authenticated owner/vendor
  sessions, and uses service-role only for setup lookups and storage object placement.

Checklist:

| Edge case | Result | Notes |
| --- | --- | --- |
| Wrong vendor sees zero available work | Pass | Wrong-vendor Available Work returned no rows for `AMC-STAGING-SMOKE-001`. |
| Wrong vendor cannot open correct vendor work detail | Pass | Returned `available_work_unavailable`. |
| Wrong vendor cannot access opportunity document | Pass | Returned `vendor_document_unavailable`. |
| Wrong vendor cannot open assigned order detail | Pass | Returned `assigned_order_unavailable`. |
| Wrong vendor cannot access assignment document | Pass | Returned `vendor_document_unavailable`. |
| Vendor passes opportunity | Pass | Decline reason `Too busy / capacity` persisted. |
| Owner-side recipient state shows declined | Pass | Recipient status became `declined`; request closed. |
| Vendor My Bids shows Passed Opportunity | Pass | Passed row appeared with the decline reason. |
| Declined Work Detail is safe/read-only | Pass | Detail returned a passed/declined state. |
| Vendor submits invoice | Pass | Invoice `AMC-STAGING-EDGE-INV-001` submitted. |
| Owner rejects invoice with safe vendor-facing message | Pass | Vendor-safe correction message persisted. |
| Vendor Payments shows rejected/correction path | Pass | Rejected status and correction copy were visible. |
| Vendor submits corrected invoice | Pass | Corrected invoice `AMC-STAGING-EDGE-INV-001-R` submitted. |
| Owner review queue sees corrected invoice received | Pass | Corrected invoice returned to `invoice_received`. |
| Vendor REST order row isolation | Pass | Vendor-authenticated REST `orders` query returned HTTP 200 with an empty RLS result. |
| Vendor payload leakage scan | Pass | Captured Vendor Workspace read/action payloads had no raw UUIDs, storage paths, internal notes, client fee, or AMC margin. |

Runtime probe after smoke:

```json
{
  "project_ref": "voompccpkjfcsmehdoqu",
  "rpc_count": 34,
  "edge_function_count": 3,
  "rpc_failures": [],
  "edge_function_failures": []
}
```

Defects found:

- None in the executed staging edge-case smoke.

Decision:

- Staging edge/security smoke is green.
- Staging AMC happy path, edge paths, runtime availability, and local browser route-isolation
  coverage are complete for AMC-13 pilot readiness.
