# Staging Company-Scope Migration Plan

## Current Problem

The hosted Supabase target `okwqhkrsjgxrhyisaovc` reflects the older/non-company schema captured in
`supabase/schema_dumps/20260517_remote_public_schema.sql`.

Current hosted baseline characteristics:

- `public.orders`, `public.clients`, `public.users`, `public.amcs`, `public.activity_log`, and
  `public.notifications` exist.
- `public.companies` does not exist.
- `orders.company_id` does not exist.
- `company_memberships` and company role assignment tables do not exist.
- Current-company helpers such as `default_company_id()`, `current_company_id()`,
  `current_app_user_has_current_company()`, and `current_app_user_can_read_order(uuid)` do not
  exist.
- `roles.company_id` exists, but that alone is not the company-scoped architecture.

Current local Falcon assumes the newer company-scoped `20260518` migration chain. Order Documents,
OrderDetail Files, signed document URLs, upload prepare/finalize, archive, and document activity
logging all depend on that chain.

## Why Direct Production Migration Is No-Go

Directly applying the order document migrations to hosted production is blocked because
`20260518070000_order_documents_metadata_list_rpc.sql` references `public.companies`,
`orders.company_id`, current-company helpers, and order read helper functions that are not present
in the hosted schema.

Directly pushing the whole active migration chain to production is also not safe as a first move:

- The first three active migrations are curated replay baselines from the `20260517` schema dump,
  not production patch migrations for an already-live database.
- Some baseline objects and policies likely already exist in hosted production and may conflict if
  replayed.
- Later migrations intentionally change RLS, replace policies, revoke broad grants, and block direct
  authenticated table writes.
- `20260518026000_company_explicit_authenticated_grants.sql` is especially sensitive because it
  replaces broad grants with an explicit allowlist.
- `20260518067000_restrict_orders_direct_writes.sql` makes `orders` RPC-only for authenticated
  browser writes.

Do not manually adapt Order Documents to the legacy hosted schema. That would create a second,
weaker authorization model around document metadata, storage paths, signed URLs, and activity.

## Recommended Staging-First Path

Create or clone into a staging Supabase project first. Upgrade staging to the company-scoped
architecture, validate the app and database behavior there, then decide whether to migrate
production or cut over to the upgraded staging project.

The staging project should start from current hosted data, not from local seed data, so migration
behavior is tested against the real legacy schema and real production-like rows.

## Required Backups

Before any staging or production migration, capture:

- Full public schema and data dump.
- `auth.users` backup or Supabase project backup/PITR snapshot where available.
- `storage.buckets` and `storage.objects` inventory.
- Current `supabase_migrations.schema_migrations` rows.
- Current RLS policy, grant, function, view, and trigger catalog snapshots.
- Current environment variables for the target project.
- Current deployed Edge Function bundle state if functions are already deployed.

Recommended backup commands:

```bash
supabase link --project-ref <source-project-ref>
supabase db dump --linked --file backups/source-pre-company-scope.sql
supabase db dump --linked --schema auth --file backups/source-auth-pre-company-scope.sql
```

If Supabase project-level PITR or dashboard backups are available, take one before any production
attempt.

## New Staging Supabase Project Setup

1. Create a new Supabase staging project.
2. Restore the hosted production dump into staging, or use a database branch/clone if available.
3. Confirm staging has the same legacy baseline characteristics as the `20260517` dump.
4. Point a local staging env file to the staging project only.
5. Do not point production frontend traffic at staging during migration validation.

Suggested local env separation:

```text
.env.local          -> current local/default target
.env.staging.local  -> staging Supabase URL and anon key
```

Do not reuse production service-role secrets in local shell history or docs.

## Baseline Reconciliation Strategy

The active migration chain starts with:

- `20260518000000_baseline_extensions_and_schema.sql`
- `20260518001000_baseline_rls_policies_triggers_grants.sql`
- `20260518002000_baseline_static_seed_data.sql`

These represent the curated baseline used for clean local replay. If staging was restored from the
`20260517` hosted schema, these baseline migrations should usually be marked as already applied
after a catalog comparison, not blindly replayed.

Recommended reconciliation:

1. Compare staging catalog against the `20260517` dump and the curated baseline.
2. If staging matches the baseline closely enough, mark baseline migrations as applied:

```bash
supabase migration repair --linked --status applied 20260518000000
supabase migration repair --linked --status applied 20260518001000
supabase migration repair --linked --status applied 20260518002000
```

3. Apply forward migrations starting with `20260518003000`.
4. If staging does not match the baseline closely, stop and create a one-off reconciliation report
   before applying any forward migrations.

## Migration Sequence

Apply the active `20260518` chain after baseline reconciliation.

Core company-scope foundation:

- `20260518003000_company_foundation_default_scope.sql`
- `20260518004000_company_scope_order_projection_preservation.sql`
- `20260518005000_company_scope_client_intake_consistency.sql`
- `20260518006000_company_scope_notification_activity_writes.sql`
- `20260518007000_company_scope_calendar_projection.sql`
- `20260518008000_company_membership_foundation.sql`
- `20260518009000_company_role_assignments_permissions.sql`
- `20260518010000_company_permission_helper_wrappers.sql`
- `20260518011000_company_active_context_contract.sql`

Read/write hardening and compatibility:

- `20260518012000` through `20260518026000`

Relationship, assignment, setup, members, clients, and current-user foundations:

- `20260518027000` through `20260518059000`

Order numbering and order mutation hardening:

- `20260518060000` through `20260518069000`

Order Documents:

- `20260518070000_order_documents_metadata_list_rpc.sql`
- `20260518071000_order_documents_private_bucket_download_auth.sql`
- `20260518072000_order_documents_upload_prepare_finalize.sql`
- `20260518073000_order_documents_finalize_activity.sql`
- `20260518074000_order_documents_archive_rpc.sql`

Suggested command after baseline repair:

```bash
supabase migration list --linked
supabase db push --linked
```

If PostgREST does not see new RPCs immediately:

```sql
select pg_notify('pgrst', 'reload schema');
```

## Edge Function Deploy Sequence

Deploy Edge Functions after database migrations exist on staging.

```bash
supabase functions deploy order-document-upload-url --project-ref <staging-project-ref>
supabase functions deploy order-document-download-url --project-ref <staging-project-ref>
```

Edge Functions may deploy before database sync, but upload/download will fail until the required
RPCs exist. For validation, deploy after DB migration so failures are meaningful.

Required function environment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- app origin values used by the CORS helper, such as `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`,
  or `APP_URL`

## Smoke Test Checklist

Database/catalog:

- `public.companies` exists.
- `falcon_default` exists.
- `orders.company_id`, `clients.company_id`, `notifications.company_id`, and
  `activity_log.company_id` exist and are populated.
- `company_memberships` exists and contains active rows for existing app users.
- `user_role_assignments` exists and resolves legacy role permissions.
- `current_company_id()`, `current_app_user_has_current_company()`, and
  `current_app_user_can_read_order(uuid)` execute for authenticated users.
- Broad `anon` access remains blocked after explicit grant cleanup.

App flows:

- Login works.
- Dashboard loads.
- Orders list loads.
- Order detail loads.
- Order creation works through `rpc_create_order(...)`.
- Order edit works through guarded RPCs.
- Site visit save works.
- Client list/detail/create flows work.
- Activity/notes load and write correctly.
- Notifications load and unread counts are sane.
- Owner Setup loads live company context.
- Team/assignable user selectors load.

Order Documents:

- `rpc_order_documents_list(uuid)` exists and returns safe metadata only.
- `order-documents` storage bucket exists and is private.
- Upload prepare succeeds for an authorized owner/admin/appraiser on a readable/updateable order.
- Upload prepare denies unauthorized and cross-company users.
- Signed upload URL is returned only through `order-document-upload-url`.
- Finalize succeeds only after the object exists.
- Finalize writes `order_document.uploaded` activity without storage bucket/path or signed URL.
- Download URL is returned only through `order-document-download-url`.
- Archive updates metadata status and writes `order_document.archived` activity.
- List does not expose `storage_path` or signed URLs.

Frontend validation:

```bash
npm test -- --run src/pages/orders/__tests__/OrderDetail.test.jsx
npm run lint
npm run build
git diff --check
```

Manual browser validation:

- Upload a small PDF through OrderDetail Files.
- Confirm Files refreshes without page reload.
- Confirm Activity shows upload event.
- Open/download the file.
- Archive the file and confirm Files refreshes.
- Confirm archived file no longer appears in the active list if active-only behavior is expected.

## Rollback Strategy

Rollback should be restore-based, not reverse-migration-based.

Staging rollback:

- Discard the staging project or restore it from the pre-migration staging backup.

Production rollback:

- Restore from Supabase PITR or the pre-migration SQL/project backup.
- Redeploy the previous Edge Function bundle only if function deployment introduced a production
  issue.
- Do not manually undo RLS/grant migrations piecemeal.

Stop immediately and restore/recreate staging if:

- company backfills produce unexpected null `company_id` rows;
- membership backfill misses active users;
- explicit grant cleanup blocks core app routes;
- order create/edit routes fail after `orders` direct-write restrictions;
- document upload requires weakening company/order/document authorization.

## Production Cutover Options

Option A: In-place production upgrade.

- Use only after staging has passed all smoke tests.
- Requires maintenance window, fresh backup, migration history repair, DB push, function deploy,
  schema reload, and immediate smoke validation.
- Fastest path but highest operational risk.

Option B: Staging promotion / project cutover.

- Upgrade staging fully.
- Validate with production-like data.
- Point app environment to the upgraded staging project after final data sync.
- Safer for long validation, but requires careful final data cutover and secret/env management.

Option C: Pause remote attachment rollout.

- Keep production on legacy schema.
- Do not deploy Order Documents to production.
- Continue local/staging validation until the company-scope upgrade is scheduled.

## Go / No-Go Gates

Go for staging migration when:

- A current hosted backup exists.
- Staging project or branch is available.
- Baseline reconciliation has been reviewed.
- The team accepts that migrations after `20260518012000` alter RLS/grants/read/write behavior.
- There is time to run the full smoke checklist.

No-go for production migration when:

- No tested staging upgrade exists.
- No restorable backup/PITR exists.
- Baseline migration history is unresolved.
- Any core app smoke fails in staging.
- Any fix would require weakening attachment, order, company, or document authorization.

Current recommendation:

Proceed with a new staging Supabase project or branch first. Do not upgrade
`okwqhkrsjgxrhyisaovc` directly and do not adapt Order Documents to the hosted legacy schema.
