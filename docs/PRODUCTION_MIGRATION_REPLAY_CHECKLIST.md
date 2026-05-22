# Production Migration Replay Checklist

## Purpose

Falcon needs a repeatable migration replay and bootstrap validation path before clean production
cutover. This checklist is intended to prove the modern company-scoped schema can be replayed into
a fresh Supabase project, identify migration/order/storage/function blockers before production
cutover, and document manual verification steps.

This is a documentation and planning checklist. It does not run migrations, change Supabase
projects, alter storage policies, deploy Edge Functions, change Vercel configuration, change
environment variables, mutate production data, or modify runtime behavior.

Related doctrine:

- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md`
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Known Replay Blocker

Prior local full `supabase db reset` validation was blocked by a Supabase storage image pull
failure for:

```text
public.ecr.aws/supabase/storage-api:optimize-existing-functions-again
```

Targeted `psql` replay was used successfully for specific migrations during stabilization work, but
that does not replace full reset/replay validation. Before production cutover, Falcon must pass a
true clean replay path in local Docker or a disposable Supabase project, including storage/function
dependencies where applicable.

## Prerequisites

- Confirm the intended validation target:
  - local Supabase reset;
  - disposable fresh Supabase project;
  - dry-run project restored from production-like data;
  - future final production project only after rehearsal passes.
- Confirm no validation command points at the legacy hosted project `okwqhkrsjgxrhyisaovc`.
- Confirm modern staging project `voompccpkjfcsmehdoqu` is used only as reference/validation, not
  as an accidental production target.
- Capture current branch, migration list, Supabase CLI version, Docker version, and local env target.
- Verify backups exist before any project with real data is touched.
- Confirm service-role secrets are available only in approved secret stores and are not pasted into
  docs, terminal history, or commit output.
- Confirm the active migration directory is `supabase/migrations` and archived migrations are not
  included in replay.

Manual evidence to capture:

- `supabase migration list` or equivalent migration inventory;
- target project ref;
- target project creation timestamp;
- validation operator and date;
- any skipped step with reason.

## Local Reset / Replay Checklist

Use local reset as the first clean replay confidence gate.

- Docker is running and can pull required Supabase service images.
- `supabase db reset` completes without image pull, migration, seed, or storage service errors.
- All files in `supabase/migrations` replay in timestamp order.
- Baseline migrations apply cleanly:
  - `20260518000000_baseline_extensions_and_schema.sql`;
  - `20260518001000_baseline_rls_policies_triggers_grants.sql`;
  - `20260518002000_baseline_static_seed_data.sql`.
- Company-scoped foundation migrations apply cleanly from `20260518003000` through
  `20260518011000`.
- Hardening migrations apply cleanly through `20260518026000`.
- Relationship, assignment, setup, team, client, current-user, numbering, document, lifecycle, and
  saved-view migrations apply cleanly through `20260522090000_order_saved_views.sql`.
- Post-reset schema cache is refreshed or confirmed current.
- Local app can run against the reset project for representative smoke tests.

Failure handling:

- If Docker image pull fails again, record the image, CLI version, timestamp, and network context.
- Do not treat targeted `psql` migration success as equivalent to local full reset success.
- Do not proceed to final production readiness until either local reset passes or a fresh project
  replay passes with equivalent evidence.

## Fresh Project Replay Checklist

Use a disposable Supabase project to prove clean cloud replay.

- Create a new disposable project with the intended production-compatible Postgres/Supabase version.
- Link the CLI to the disposable project only.
- Confirm the disposable project has no production traffic and no valuable data.
- Apply the active migration chain using the approved Supabase CLI path.
- Confirm the migration history table contains the expected applied versions.
- Run a schema cache reload if needed:

```sql
select pg_notify('pgrst', 'reload schema');
```

- Confirm replay does not require weakening RLS, skipping migrations, hand-editing baseline
  objects, or manually patching object ownership.
- Tear down or label the disposable project after evidence is captured.

## Migration Order Verification

Verify the chain order and dependency boundaries:

- Baseline schema/grants/seeds are first.
- Company foundation precedes company-scoped read/write hardening.
- Permission wrappers and current-company helpers exist before RPCs depend on them.
- Relationship and assignment foundations precede assignment lifecycle RPCs.
- Company member/invitation tables precede invitation management/resend RPCs.
- Current user settings/context RPCs exist before frontend-context validation.
- Order numbering storage/helper migrations precede RPC create numbering migration.
- Order Documents metadata/list migration precedes private bucket/download/upload/finalize/archive
  migrations.
- Order archive/cancel/void permission/RPC migrations follow core order governance.
- Saved views migration follows company/user context and permission hardening.

Stop if any migration depends on a function, type, extension, table, view, role, or policy that does
not exist at the point it runs.

## Extension Assumptions

Verify required extensions are present after replay:

- UUID generation support used by `gen_random_uuid()`;
- cryptographic/random helpers if required by invite/token flows;
- any text/search/date helper extensions seeded by the baseline;
- extensions are installed in expected schemas and callable by functions that depend on them.

Manual checks:

- inspect `pg_extension`;
- smoke insert rows that rely on UUID defaults;
- confirm no migration silently depends on an extension installed only in local/dev.

## Enum / Check Constraint Verification

Verify schema constraints match application expectations:

- order status values include active workflow states and terminal lifecycle states such as
  `cancelled` and `voided` where implemented;
- document status values support active and archived behavior;
- invitation/member status constraints support pending/sent/cancelled/accepted/failure paths used by
  RPCs;
- saved-view filters use JSON validation and are not constrained in a way that prevents the approved
  allowlist;
- check constraints do not allow hidden historical/admin saved-view flags in saved view payloads.

Manual checks:

- inspect `pg_constraint` for relevant tables;
- execute representative inserts/updates through RPCs, not direct table writes;
- confirm invalid status/filter inputs fail closed.

## Permission Seed Verification

Verify permission and role seed state:

- permission catalog contains all active frontend/backend permission keys;
- order lifecycle permissions `orders.archive`, `orders.cancel`, and `orders.void` exist;
- document permissions for read/upload/archive/delete expectations exist;
- workflow status permissions exist for canonical Smart Actions;
- notification preference/read/mark/dismiss permissions exist where used;
- company member, invitation, relationship, and assignment permissions exist;
- saved-view RPC access does not require a new permission key unless product explicitly adds one;
- template roles and role assignments resolve expected permissions for owner/admin/appraiser/reviewer
  users;
- `authenticated` execute grants exist only for approved browser-callable RPCs;
- app roles do not have direct table grants where doctrine requires RPC-owned access.

## Owner / Admin Bootstrap Verification

Verify bootstrap can establish a usable first company and owner/admin state:

- canonical company row exists.
- owner/admin app user exists and maps to an auth user.
- owner/admin has active company membership.
- owner/admin has active role assignment with expected management permissions.
- `current_company_id()` resolves for owner/admin.
- `rpc_current_user_app_context()` returns safe app context.
- Owner Setup route can load company setup context.
- Team Access can list active members.
- Invitation prepare/finalize/resend/cancel flows have required database objects and Edge Function
  support.

Blocker examples:

- active owner cannot read orders;
- owner cannot invite/manage members;
- owner cannot create/edit an order through RPCs;
- current company helper returns null for valid signed-in owner.

## RLS Verification

Verify RLS and grants are production-safe:

- broad `anon` access remains blocked.
- authenticated direct writes to `orders` remain blocked where RPC-only doctrine requires it.
- direct frontend table access to `order_saved_views` remains blocked.
- document metadata direct table writes remain blocked.
- order read scope respects current company and assigned/all-order permissions.
- archived/cancelled/voided active-list exclusions remain application/query behavior and do not
  weaken preserved-history detail readback.
- cross-company reads and mutations fail closed.
- service-role-only compatibility/quarantine functions remain service-role-only.

Manual checks:

- test as owner/admin;
- test as assigned appraiser;
- test as reviewer;
- test as authenticated user without active membership;
- test cross-company rows in a dry-run fixture if multi-company data exists.

## RPC Signature Verification

Verify required RPCs exist with expected signatures and grants:

- order create/update/read helpers:
  - `rpc_create_order(payload jsonb)`;
  - `rpc_update_order(...)`;
  - `rpc_transition_order_status(...)`;
  - `rpc_order_archive(...)`;
  - `rpc_order_cancel(...)`;
  - `rpc_order_void(...)`;
  - `rpc_order_number_override(...)`.
- document RPCs:
  - `rpc_order_documents_list(...)`;
  - `rpc_order_document_prepare_upload(...)`;
  - `rpc_order_document_finalize_upload(...)`;
  - `rpc_order_document_authorize_download(...)`;
  - `rpc_order_document_archive(...)`.
- team/member/invitation RPCs:
  - company member list/role/status RPCs;
  - invitation prepare/finalize/list/cancel/resend RPCs.
- assignment and relationship RPCs:
  - `rpc_order_company_assignment_*`;
  - relationship lifecycle/list/detail RPCs.
- notification/current-user/saved-view RPCs:
  - notification read/mark/dismiss/preference RPCs;
  - `rpc_current_user_app_context(...)`;
  - `rpc_current_user_settings_*`;
  - `rpc_order_saved_views_list()`;
  - `rpc_order_saved_view_create(p_name text, p_filters jsonb)`;
  - `rpc_order_saved_view_update(p_view_id uuid, p_name text, p_filters jsonb)`;
  - `rpc_order_saved_view_delete(p_view_id uuid)`.

Manual checks:

- inspect `pg_proc` signatures;
- inspect `information_schema.routine_privileges`;
- call representative RPCs as authenticated users with expected roles;
- verify invalid/cross-company calls fail closed.

## Storage Bucket / Policy Verification

Verify Order Documents storage posture:

- `order-documents` bucket exists.
- Bucket is private.
- Direct public object URLs are not available.
- Upload object writes happen only through signed upload URLs produced by the approved Edge path.
- Download happens only through signed download URLs produced by the approved Edge path.
- List RPC returns safe metadata only and excludes `storage_bucket`, `storage_path`, object keys,
  and signed URLs.
- Archive updates metadata through RPC and does not hard-delete storage objects.
- Document activity rows do not include storage paths, bucket names, or signed URL internals.

Blocker examples:

- bucket is public;
- browser can read or write objects without approved authorization;
- document list exposes storage paths;
- archive requires service-role manual intervention.

## Edge Function Deployment Verification

Verify functions required for current product scope:

- `order-document-upload-url`;
- `order-document-download-url`;
- `invite-company-member`;
- `resend-company-member-invite`;
- `set-active-company` if required by active company switching/setup flows;
- email worker/sender functions only if email outbox is part of the target rollout.

Verify function secrets:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- accepted compatibility names only where intentionally supported;
- `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`, or `APP_URL` for redirect/CORS behavior.

Manual checks:

- deploy functions only after database RPC contracts exist;
- invoke each function through the frontend/API path where practical;
- review function logs for authorization, CORS, missing secret, and RPC errors;
- confirm Vercel preview domains are intentionally allowed or denied.

## Smoke-Test Data Setup

Prepare minimal dry-run data:

- one canonical company;
- owner/admin user with active membership and role assignment;
- appraiser user with assigned-order access;
- reviewer user with review access;
- client and AMC records;
- at least one active order for create/edit/detail/list smoke tests;
- at least one archived, cancelled, and voided order for preserved-history readback;
- at least one assigned order for appraiser/reviewer scope tests;
- at least one order document metadata row and one real private bucket object in dry-run tests;
- pending invitation rows for invite/resend/cancel tests;
- notification rows and preferences for bell/read/mark/dismiss tests;
- saved views for list/create/update/delete validation.

Do not use production customer data in a disposable project unless backup, access, and retention
controls are approved for that dry run.

## Rollback / Failure Handling Notes

Rollback for replay validation should be discard/restore based:

- local reset failure: capture logs, fix replay issue, reset again;
- disposable fresh project failure: capture logs, keep project for forensic review if needed, then
  discard/recreate;
- production-data dry run failure: restore dry-run project from snapshot or recreate from source
  backup;
- final production cutover failure: switch traffic back to the legacy project or previous frontend
  environment, not reverse-migrate the final project.

Stop immediately if:

- migration replay requires weakening RLS or broad grants;
- company backfills create unexpected null `company_id` rows;
- owner/admin cannot resolve current company;
- order create/edit/list/detail core smoke tests fail;
- document upload/download/archive requires public storage or direct storage-path authorization;
- auth/user mapping cannot be reconciled;
- table counts cannot be reconciled or explained.

Evidence to retain:

- migration logs;
- schema and migration-history snapshots;
- row-count reconciliation;
- failed SQL/function logs;
- smoke-test results;
- rollback or recreate decision notes.
