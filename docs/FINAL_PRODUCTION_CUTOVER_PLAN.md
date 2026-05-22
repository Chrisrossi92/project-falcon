# Final Production Cutover Plan

## Current State

The legacy hosted Supabase project remains the current production/archive source. It reflects the
older `20260517` non-company schema and should be treated as the source of record until a final
cutover is completed and verified.

The staging project has proven the modern company-scoped architecture and the Order Documents
workflow against the newer `20260518` migration chain. That staging project is a validation
environment, not the intended permanent production project.

Final production should eventually move to a clean, legitimately named Supabase project that is
created for production use, upgraded through the company-scoped foundation, loaded with migrated
production data, and validated before traffic moves.

Modern features must not be adapted to the legacy schema. Order Documents, signed URLs, upload
prepare/finalize, archive, activity integration, and `OrderDetail` Files depend on the
company-scoped authorization model.

## Why A Clean Final Project Is Preferred

A clean final production project is preferred over upgrading the legacy project in place because:

- the legacy project contains an older schema and migration history that does not match current
  local assumptions;
- the modern chain includes RLS, grant, direct-write, RPC, company-membership, and order-document
  security changes that are high risk to apply directly to live production;
- a clean project gives Falcon a correctly named, intentionally provisioned production target
  instead of promoting a temporary staging project;
- data migration can be rehearsed repeatedly before cutover;
- rollback is simpler because the legacy project can remain untouched as the archive/source during
  validation;
- final production secrets, Edge Functions, storage buckets, and environment names can be set
  deliberately rather than inheriting staging labels.

Do not manually patch the legacy schema to make modern attachment features work. That creates a
second authorization model and weakens the security design.

## Target Final Project Setup

Create a new Supabase project for final production with a clear production name and region choice.
The project should be provisioned with:

- current Supabase Postgres version compatible with local/staging validation;
- production URL, anon key, and service-role key stored only in approved secret stores;
- private storage bucket support;
- deployed Edge Functions after database contracts exist;
- production app origins configured for Edge Function CORS;
- PITR or backup settings enabled before import where available;
- no direct production user traffic until all smoke tests pass.

The target project should receive the company-scoped schema through the same validated migration
sequence used in staging, with baseline reconciliation handled intentionally.

## Required Data Domains To Migrate

Migrate and verify these domains:

- `auth.users`: identities, emails, confirmation state, provider identities where export/import
  support allows.
- `public.users` and `public.user_profiles`: app-user identities, `auth_id` mappings, display
  names, status, colors, fee splits, and role-facing profile fields.
- `clients`, `amcs`, and `contacts`: operational relationship records and contact information.
- `orders`, order status, and activity: order records, assignment fields, due dates, site visit
  fields, operational statuses, notes/activity log, and order-number continuity.
- notifications and preferences: notifications, unread state, notification preferences, and
  company-scoped notification rows.
- roles, permissions, company memberships, and role assignments: template roles, role permissions,
  `falcon_default` or final company row, active memberships, and owner/admin/appraiser/reviewer
  assignments.
- calendar and events: calendar projections, event records, and assignment/scheduling references.
- `user_documents` legacy handling: preserve profile/account documents as legacy user documents;
  do not merge them into order-level documents.
- future `order_documents` and storage: migrate only once the metadata/storage contract exists in
  the final project; preserve private bucket paths and metadata authorization semantics.

## Data Mapping Strategy

Use a deterministic mapping from legacy data into the company-scoped schema:

- Create or confirm one canonical production company row for existing Continental/Falcon data.
- Backfill `company_id` on company-owned records from the canonical company.
- Preserve existing `public.users.id` values where possible to avoid breaking order assignments,
  activity actors, notifications, and profile references.
- Map `public.users.auth_id` to restored or recreated `auth.users.id`.
- Preserve legacy `user_roles` for compatibility, but make `user_role_assignments` the current
  runtime authority.
- Convert owner/admin users into active company memberships and active role assignments.
- Keep appraiser/reviewer users active only where they should have runtime access.
- Preserve order IDs, client IDs, AMC IDs, and contact IDs where feasible.
- Backfill activity and notifications with `company_id` while preserving timestamps and actor
  references.
- Keep `user_documents` separate from `order_documents`; only intentionally classified
  order/workfile files should become order documents later.
- For order documents, use metadata rows as the authorization authority and private storage bucket
  objects as backing data. Storage paths must not become access control.

Before final cutover, produce counts by table in source, staging rehearsal, and final target. Any
count mismatch must be explained before traffic moves.

## Backup Requirements

Before any final production migration or cutover:

- Take a full legacy project backup or PITR snapshot.
- Dump the legacy public schema and data.
- Dump or export `auth.users` and identities using the safest supported Supabase path.
- Capture `storage.buckets` and `storage.objects` inventories.
- Export legacy storage objects needed for retained user documents.
- Capture current RLS policy, grant, function, view, trigger, and migration-history snapshots.
- Save current Edge Function deployment state.
- Save production app environment variables and Vercel/Supabase project settings.
- Record DNS/domain and app configuration currently pointing at the legacy project.

The legacy project must remain available as an archive/source after cutover until retention and
audit requirements are explicitly satisfied.

## Dry-Run Process

Run at least one complete dry run before final cutover:

1. Create a disposable dry-run Supabase project or database branch.
2. Restore the latest legacy production backup.
3. Apply the validated company-scoped migration sequence.
4. Run the data mapping/import scripts or SQL.
5. Deploy required Edge Functions against the dry-run project.
6. Point a local or preview app environment at the dry-run project.
7. Execute the full smoke checklist.
8. Compare source and target record counts.
9. Validate representative orders, clients, users, assignments, activities, and files.
10. Document every manual correction and convert it into a repeatable step.

A dry run that requires weakening RLS, bypassing document authorization, or hand-editing core
records without a repeatable script is not acceptable for final cutover.

## Smoke Test Checklist

Database and auth:

- Auth login works for owner/admin and representative appraiser/reviewer users.
- `public.companies` exists with the final production company row.
- `orders.company_id`, `clients.company_id`, `notifications.company_id`, and
  `activity_log.company_id` are populated.
- `company_memberships` and `user_role_assignments` are active for expected users.
- `current_company_id()`, `current_app_user_has_current_company()`, and
  `current_app_user_can_read_order(uuid)` work for authenticated sessions.
- Broad direct table writes remain blocked where RPC-only behavior is expected.

Core app:

- Dashboard loads.
- Orders list loads with expected records.
- Order detail loads.
- Order create works through the guarded RPC.
- Order edit works through guarded RPCs.
- Site Visit save works.
- Activity and notes load and write correctly.
- Client list/detail/create/update flows work.
- Notifications load and unread counts are correct.
- Owner Setup loads live company context.
- Team Access and assignable user selectors load.

Order Documents:

- `order-documents` bucket exists and is private.
- `rpc_order_documents_list(uuid)` returns safe metadata only.
- Upload prepare/finalize works for permitted users.
- Upload/finalize creates `order_document.uploaded` activity without storage paths or signed URLs.
- Signed download works only through the Edge Function.
- Archive works through RPC and writes `order_document.archived` activity.
- Unauthorized and cross-company document access is denied.

Frontend/build:

```bash
npm test -- --run src/pages/orders/__tests__/OrderDetail.test.jsx
npm run lint
npm run build
git diff --check
```

Manual browser:

- Sign in as owner/admin.
- Open several migrated orders.
- Upload, download, and archive a small test file on a test order.
- Confirm Activity reflects document events.
- Confirm no storage paths appear in UI.
- Sign in as a lower-permission user and confirm denied flows are denied.

## Final Cutover Sequence

1. Announce maintenance window.
2. Freeze writes in the legacy app where practical.
3. Take final pre-cutover backups and storage inventories.
4. Create or reset the final production Supabase project.
5. Apply the validated company-scoped schema and migration history.
6. Restore/import auth users and public data.
7. Run data mapping/backfill scripts.
8. Import required legacy storage objects.
9. Deploy Edge Functions to the final production project.
10. Configure production function secrets and CORS origins.
11. Run database smoke tests.
12. Point a production preview build at the final project.
13. Run app and browser smoke tests.
14. Update production app environment variables to the final project.
15. Deploy/promote the production frontend.
16. Run immediate post-deploy smoke tests.
17. Keep the legacy project read-only/archived.

Do not delete the legacy project during cutover.

## Rollback Plan

Rollback should switch traffic back to the legacy production project, not attempt to reverse the
final project's migration chain.

Rollback steps:

- Restore the previous frontend environment variables pointing to the legacy project.
- Redeploy or roll back the frontend.
- Confirm login, dashboard, orders, clients, and activity work against the legacy project.
- Keep the failed final project intact for forensic review.
- Do not copy partial post-cutover writes back into legacy without a separate reconciliation plan.

If final cutover created new writes before rollback, capture them before switching traffic and
decide explicitly whether they are discarded, replayed, or manually reconciled.

## Post-Cutover Monitoring

Monitor closely after cutover:

- auth login failures;
- PostgREST RPC errors;
- RLS permission-denied rates;
- Edge Function errors for upload/download;
- order create/edit failures;
- activity and notification write failures;
- storage signed URL failures;
- unexpected cross-company denial or visibility;
- frontend error logs and user reports;
- record counts for newly created orders, clients, activity rows, and documents.

Keep the legacy project available for comparison until the final production project has completed a
defined stabilization period.

## Go / No-Go Gates

Go when:

- final backups exist and restore procedure is understood;
- at least one dry run passed;
- source-to-target counts are reconciled;
- auth and app-user mappings are verified;
- company memberships and role assignments are correct;
- core app smoke tests pass;
- Order Documents smoke tests pass without weakening security;
- rollback path has been rehearsed or is operationally clear;
- production secrets and origins are configured for the final project.

No-go when:

- auth user migration is unresolved;
- baseline migration history is unclear;
- any core app flow fails in dry run;
- data counts cannot be reconciled;
- Order Documents require legacy-schema shortcuts;
- any fix requires weakening RLS, grants, storage privacy, or RPC authorization;
- no restorable backup exists;
- there is not enough time to validate immediately after cutover.

## Explicit Anti-Patterns

- No direct production mutation without a current backup.
- No weakening RLS to make migrated data fit.
- No legacy-compatible attachment shortcut.
- No public storage bucket for order files.
- No storage-path-based authorization.
- No direct browser writes to order document metadata.
- No deleting the legacy project immediately after cutover.
- No promoting the temporary staging project as final production without an explicit project naming,
  secrets, backup, and ownership decision.
- No adapting modern company-scoped features back to the legacy schema.
