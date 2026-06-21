# AMC-13C Staging Runtime Catch-Up Plan

## Purpose

Prepare hosted staging to run the same AMC-13 smoke coverage that now passes locally.

This plan is staging-only. Do not run it against production data, production Supabase projects, or
real vendor/client/payment records.

## Target

Current reference staging project:

- Project ref: `voompccpkjfcsmehdoqu`
- Role: modern company-scoped staging/reference validation target

Before executing any command, confirm the target is still the approved staging project and not a
production project.

## Required Deployment Checklist

### 1. Migration Catch-Up

Apply pending AMC migrations through the current repository head.

Required migration areas:

- AMC-9 Vendor Workspace bidding, My Bids, work detail, and vendor document access.
- AMC-10 assigned-order execution, report upload, revision request/resubmission, and assignment
  document access.
- AMC-11 internal-only coordinator notes, report upload cleanup, vendor profile read/update request,
  and internal review.
- AMC-12 payments, invoice submission, invoice review, corrected invoice resubmission, and payment
  ledger scheduling/paid tracking.
- AMC-13 local reset/storage bootstrap, revision guard, payment-ledger actor FK fix, and smoke
  fixture/readiness support.

Recommended command for Supabase CLI 2.41.x, after confirming `supabase/.temp/project-ref` is
`voompccpkjfcsmehdoqu`:

```bash
supabase db push --linked --include-all --yes
```

Stop if Supabase reports drift, destructive changes, or a target project mismatch.

Note: this repository's installed Supabase CLI does not support `db push --project-ref`. Use the
linked-project command only when the link metadata points at staging.

Migration history safety checklist:

- Every file in `supabase/migrations/` must have a unique 14-digit version prefix.
- Supabase records only the migration version in `supabase_migrations.schema_migrations`, not the
  full filename. Two local files with the same version cannot be distinguished remotely.
- Duplicate local versions block `supabase db push` with a `schema_migrations_pkey` duplicate-key
  failure once the first file records that version.
- If a duplicate existed in a prior branch or staging attempt, inspect the staging catalog for the
  SQL effects before using `supabase migration repair`; do not mark a renamed migration as applied
  unless its tables, functions, grants, policies, and comments already exist on the target.
- Repair staging history only after confirming `supabase/.temp/project-ref` is
  `voompccpkjfcsmehdoqu` and after taking any required staging backup/snapshot.

### 2. Edge Function Deployment

Deploy the Vendor Workspace document/upload functions after database migrations are present.

Required functions:

```bash
supabase functions deploy vendor-workspace-document-download-url --project-ref voompccpkjfcsmehdoqu
supabase functions deploy vendor-workspace-report-upload-url --project-ref voompccpkjfcsmehdoqu
supabase functions deploy vendor-workspace-invoice-upload-url --project-ref voompccpkjfcsmehdoqu
```

Confirm required function secrets are configured in staging only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- any app-origin/CORS setting used by the deployed function runtime

Do not reuse staging service-role secrets in production.

### 3. Permission And Frontend Alignment

Confirm the deployed frontend and staging database agree on permission keys:

- `vendor_workspace.view`
- `vendor_bids.respond`
- `vendor_documents.read`
- `vendor_documents.upload`
- `vendor_assignments.read`
- `vendor_assignments.progress`
- `vendor_profile.read`
- `vendor_profile.update`
- `vendor_payments.read`
- `vendor_invoices.submit`
- owner/admin AMC permissions for bid requests, assignment offers, vendor invoice review, payment
  ledger scheduling, and vendor profile update review

Run the permission/static test set locally before deploying frontend changes:

```bash
npm test -- --run \
  src/lib/permissions/__tests__/permissionConstants.test.js \
  src/features/vendorWorkspace/__tests__/vendorWorkspaceApi.test.js \
  src/features/vendorWorkspace/__tests__/VendorWorkspaceShell.test.jsx
```

### 4. PostgREST Schema Cache Refresh

After migrations deploy, refresh PostgREST schema cache before probing RPC availability.

Run from staging SQL editor or a staging-only `psql` session:

```sql
select pg_notify('pgrst', 'reload schema');
```

If probes still report schema-cache misses, restart/reload the hosted API from Supabase dashboard
or wait for the schema cache to refresh, then rerun the probes.

## Runtime Availability Probes

### RPC Probe

Use the repo probe after staging migrations deploy and schema cache is refreshed.

Required environment variables:

```bash
export AMC_STAGING_PROJECT_REF=voompccpkjfcsmehdoqu
export AMC_STAGING_SUPABASE_URL=https://voompccpkjfcsmehdoqu.supabase.co
export AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
```

Run:

```bash
npm run amc:staging:runtime:check
```

The probe refuses known production refs, checks the URL ref matches `AMC_STAGING_PROJECT_REF`, and
reports missing RPCs or missing Edge Functions. It intentionally treats permission/argument/business
validation failures as proof that the RPC exists in the PostgREST schema cache. Parameterized RPCs
are probed with harmless invalid keys or nil UUIDs so PostgREST resolves the deployed signature
without mutating real smoke data.

Required RPC families:

- Vendor Workspace dashboard, available work, detail, submit bid, decline/pass, My Bids.
- Vendor document authorization for opportunities and assigned orders.
- Assigned Orders queue/detail/start work/submit report/resubmit report.
- Coordinator revision request and internal-only assignment notes.
- Vendor report upload prepare/register and abandoned-upload cleanup.
- Vendor profile read, profile update request, and internal request review.
- Vendor payments, invoice upload/register/submit, corrected invoice resubmission.
- Internal invoice review and payment ledger scheduling/paid tracking.

Minimum required RPC names:

```text
rpc_vendor_workspace_dashboard_summary
rpc_vendor_workspace_available_work
rpc_vendor_workspace_available_work_detail
rpc_vendor_workspace_submit_bid_response
rpc_vendor_workspace_decline_bid_opportunity
rpc_vendor_workspace_my_bids
rpc_vendor_workspace_authorize_document_access
rpc_vendor_workspace_assigned_orders
rpc_vendor_workspace_assigned_order_detail
rpc_vendor_workspace_start_assigned_order
rpc_vendor_workspace_submit_report
rpc_vendor_workspace_authorize_assignment_document_access
rpc_vendor_workspace_prepare_report_document_upload
rpc_vendor_workspace_register_report_document
rpc_vendor_workspace_resubmit_report
rpc_amc_request_vendor_assignment_revision
rpc_amc_add_vendor_assignment_internal_note
rpc_amc_vendor_assignment_internal_notes
rpc_amc_cleanup_abandoned_vendor_report_uploads
rpc_vendor_workspace_profile
rpc_vendor_workspace_submit_profile_update_request
rpc_vendor_workspace_profile_update_requests
rpc_amc_vendor_profile_update_requests
rpc_amc_review_vendor_profile_update_request
rpc_vendor_workspace_payments
rpc_vendor_workspace_prepare_invoice_upload
rpc_vendor_workspace_register_invoice_document
rpc_vendor_workspace_submit_invoice
rpc_amc_vendor_invoices
rpc_amc_review_vendor_invoice
rpc_vendor_workspace_resubmit_invoice
rpc_amc_vendor_payment_ledger
rpc_amc_schedule_vendor_payment
rpc_amc_mark_vendor_payment_paid
```

### Edge Function Probe

The same command probes these functions by `OPTIONS`:

- `vendor-workspace-document-download-url`
- `vendor-workspace-report-upload-url`
- `vendor-workspace-invoice-upload-url`

If a function returns `404`, deploy/redeploy it. Other guarded responses can be acceptable for
availability because the probe is not submitting valid business payloads.

## Disposable Staging Smoke Fixture Plan

Use staging-only disposable records. Do not clone local fixture SQL blindly into staging without
reviewing company/user ownership and cleanup expectations.

Required disposable records:

- Owner/admin login: `amc.smoke.owner+staging@example.test`
- Vendor login: `amc.smoke.vendor+staging@example.test`
- Wrong-vendor login: `amc.smoke.wrongvendor+staging@example.test`
- Temporary password controlled through staging Auth admin tooling only.
- AMC owner company clearly marked as staging smoke, or an approved existing staging owner company.
- Primary disposable vendor company with active `amc_vendor` relationship/profile.
- Wrong-vendor disposable company with active relationship/profile but no recipient on the primary
  opportunity.
- AMC-scoped smoke order, e.g. `AMC-STAGING-SMOKE-001`.
- One vendor-visible source document and one internal-only document.
- Disposable report PDF and invoice PDF uploaded only through staging smoke flows.

Fixture loading options:

1. Preferred: create a reviewed staging-specific fixture SQL derived from
   `supabase/manual/20260606_amc_full_mvp_smoke_fixture.sql` with staging email addresses and
   staging-specific labels.
2. Alternative: create the records manually through owner/admin UI and staging Auth dashboard, then
   record the resulting order number and smoke users in the smoke results doc.

Fixture cleanup expectations:

- Tag all rows with `staging_smoke` / `amc_13c` metadata where the table supports metadata.
- Delete disposable staging users, companies, orders, bid requests, assignments, documents, invoices,
  and payment ledger rows after smoke if the staging environment must remain clean.
- Never run staging fixture cleanup by broad date ranges or against untagged records.

## Staging Smoke Execution Sequence

After runtime probes pass:

```bash
npm test -- --run \
  src/features/vendorWorkspace/__tests__/VendorWorkspaceShell.test.jsx \
  src/features/vendorWorkspace/__tests__/vendorWorkspaceApi.test.js \
  src/lib/routes/__tests__/routeCompositionDiagnostics.test.js \
  src/lib/permissions/__tests__/amcSmokeFixtureLoad.test.js \
  src/lib/permissions/__tests__/amcEdgeSmokeRegression.test.js
```

Then run the AMC-13 smoke plan manually against staging using the disposable staging users:

- happy path through Vendor Payments `Paid`;
- wrong-vendor denial;
- declined/pass opportunity;
- rejected/corrected invoice;
- direct vendor `/orders`, `/orders/:id`, and `/dashboard` route isolation;
- raw ID/storage path/internal note/client fee/AMC margin leakage checks.

## Readiness Checklist

Staging is ready for AMC-13 smoke only when all items are true:

- [ ] Target project ref is confirmed as staging, not production.
- [ ] Pending AMC migrations have been applied successfully.
- [ ] Vendor Workspace Edge Functions are deployed to staging.
- [ ] Required function secrets are present in staging.
- [ ] PostgREST schema cache has been refreshed.
- [ ] `npm run amc:staging:runtime:check` passes.
- [ ] Disposable owner/vendor/wrong-vendor staging logins can be created.
- [ ] Disposable AMC order and vendor records are clearly staging-only.
- [ ] No production data or production secrets are used.

## Current Blockers Before Staging AMC-13 Smoke

- Hosted staging must be migrated from the previously observed state where AMC-9 through AMC-12
  runtime RPCs were missing from the PostgREST schema cache.
- Required Vendor Workspace Edge Functions must be deployed and probed on staging.
- A reviewed staging-specific fixture load or manual fixture setup must be created before smoke.
