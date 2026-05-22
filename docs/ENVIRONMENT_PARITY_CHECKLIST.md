# Environment Parity Checklist

## Purpose

Falcon needs a concrete environment parity checklist before production cutover work changes
Supabase projects, Vercel settings, GitHub branch expectations, secrets, Edge Functions, or storage
configuration. This checklist records what must match across local development, modern staging,
future clean production, GitHub, and Vercel.

This is a documentation and planning checklist. It does not change environment variables, Supabase
projects, Vercel configuration, GitHub branches/tags, storage policies, Edge Functions, migrations,
secrets, data, or runtime behavior.

Related doctrine:

- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`
- `docs/STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md`
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Environment Inventory

| Environment | Current Role | Required Parity Direction |
|---|---|---|
| Local development | Developer/runtime validation environment. May point to local Supabase or modern staging depending on task. | Must clearly identify target project and never silently run production-affecting commands. |
| Modern staging Supabase | Project `voompccpkjfcsmehdoqu`; company-scoped validation reference. | Must remain the reference for modern architecture behavior and should not be treated as final production by default. |
| Future clean production Supabase | TBD final project. | Must be intentionally provisioned, migrated, seeded, bootstrapped, and validated before traffic moves. |
| Legacy hosted Supabase | Project `okwqhkrsjgxrhyisaovc`; older non-company production/archive source. | Reference/source only. Do not retrofit modern features into this schema. |
| GitHub main | Source-of-truth branch for reviewed, merge-ready work. | Must align with release tags and deployed Vercel production source. |
| Vercel deployment | Frontend hosting and environment-variable boundary. | Must point production deployments only at the approved production Supabase project after cutover. |

## Supabase Project Refs

- Local:
  - Record whether local uses Docker Supabase or a hosted project.
  - Confirm `.env.local` target before running app or smoke tests.
  - Never assume local points to disposable data.
- Modern staging:
  - Project ref: `voompccpkjfcsmehdoqu`.
  - Verify staging URL and anon key are used only for staging/local validation.
  - Confirm staging is not labeled or promoted as final production without a separate decision.
- Future production:
  - Project ref: TBD.
  - Must be clean, intentionally named, and provisioned for production ownership/region/backup
    expectations.
  - Must not reuse staging service-role secrets.
- Legacy hosted:
  - Project ref: `okwqhkrsjgxrhyisaovc`.
  - Treat as legacy source/archive.
  - Do not deploy modern Order Documents, saved views, company-scoped features, or governance
    migrations into this project as a retrofit.

## Frontend Environment Variables

Required browser-facing variables:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`;
- `VITE_GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_MAPS_KEY` where maps are enabled.

Parity checks:

- Local development points at the intended local/staging project for the task.
- Vercel preview points at staging or an approved preview project, not clean production unless
  explicitly authorized for final cutover smoke.
- Vercel production points at the legacy project until cutover, then final clean production project
  only after go/no-go passes.
- No frontend build uses a service-role key.
- No committed docs or env examples include real service-role secrets.

## Supabase Anon / Service Keys Handling

- Anon keys may be browser-facing, but must match the intended Supabase project.
- Service-role keys are server/function-only and must live in Supabase/Vercel secret stores.
- Service-role keys must not be committed, pasted into docs, or reused from staging to production.
- Rotation plan should exist before final cutover if any staging secret was exposed to local shells.
- GitHub Actions, if used later for deploy checks, must receive secrets through GitHub environment
  secrets and not repository files.

## Edge Function Deployment Status

Track deployment status per environment:

| Function | Local | Modern Staging | Future Production | Legacy Hosted |
|---|---|---|---|---|
| `order-document-upload-url` | Optional local serve | Required for staging validation | Required before cutover | Do not retrofit |
| `order-document-download-url` | Optional local serve | Required for staging validation | Required before cutover | Do not retrofit |
| `invite-company-member` | Optional local serve | Required for Team Access validation | Required before cutover | Legacy behavior only if already deployed |
| `resend-company-member-invite` | Optional local serve | Required for Team Access validation | Required before cutover | Legacy behavior only if already deployed |
| `set-active-company` | Validate if active switching/setup uses it | Verify if current flows depend on it | Verify before cutover | Do not retrofit |
| email functions | Validate only if rollout includes email worker/sender | Verify if enabled | Verify if enabled | Preserve existing behavior only |

Function parity checks:

- Required database RPC contracts exist before deploy validation.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and app-origin secrets are set.
- `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`, or `APP_URL` match intended Vercel domains.
- CORS behavior permits only intended local/staging/preview/production origins.
- Function logs are checked during smoke tests.

## Storage Bucket / Policy Status

Order Documents parity checks:

- `order-documents` bucket exists in staging and future production.
- Bucket is private.
- Direct public object URLs do not work.
- Upload uses signed upload URLs through `order-document-upload-url`.
- Download uses signed download URLs through `order-document-download-url`.
- Document list RPC does not expose `storage_bucket`, `storage_path`, object keys, or signed URLs.
- Archive uses `rpc_order_document_archive(...)` and does not hard-delete storage objects.
- Legacy hosted project must not receive a shortcut public bucket or policy retrofit.

## Migration Head / Version

Checks for each non-legacy modern environment:

- `supabase/migrations` active head is applied through
  `20260522090000_order_saved_views.sql` or the current audited head at cutover time.
- `supabase_migrations.schema_migrations` contains expected versions only.
- Archived migrations are not replayed as active migrations.
- Baseline reconciliation is documented for any project restored from legacy data.
- Fresh project replay evidence is recorded in
  `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md` follow-up notes or cutover runbook.

Legacy hosted:

- Do not try to force active modern migration head onto `okwqhkrsjgxrhyisaovc` without the
  clean-project/dry-run process and explicit cutover approval.

## Seed / Permission Parity

Verify in local reset, staging, and future production:

- permission catalog includes all active frontend/backend permission keys;
- template roles exist;
- owner/admin has management permissions;
- appraiser/reviewer permissions match expected operational scope;
- document permissions support upload/read/archive expectations;
- workflow/lifecycle permissions are intentionally granted or withheld;
- saved-view RPCs are executable by authenticated users through RPC path only;
- direct table access remains revoked where governance requires RPC-only behavior.

## Owner / Admin Bootstrap Parity

Verify in staging and future production:

- canonical company exists;
- owner/admin app user maps to auth user;
- owner/admin has active company membership;
- owner/admin has active role assignment;
- `current_company_id()` resolves;
- `rpc_current_user_app_context()` returns safe context;
- Owner Setup loads;
- Team Access member list loads;
- invite/resend/cancel and role/status flows work through approved RPC/Edge paths.

## Allowed Redirect URLs / Auth Settings

Supabase Auth settings must align with app deployment:

- production app domain is listed as an allowed redirect/site URL where required;
- Vercel preview domains are intentionally allowed or intentionally blocked;
- invite acceptance route `/accept-invite/:invitationId` works from configured app origin;
- local development redirect URLs are allowed only where needed;
- OAuth/provider callback settings, if used, point to the intended environment;
- legacy project auth settings remain stable until traffic cutover.

## Vercel Project / Environment Alignment

Vercel checks:

- Production deployment source branch is `main` unless a deliberate release branch is approved.
- Production env vars point to the approved production Supabase project only after cutover.
- Preview env vars point to staging/preview, not legacy production or final production by accident.
- Vercel production domain is included in Edge Function origin configuration.
- Vercel preview domains are handled consistently by Edge Function CORS policy.
- Rollback can restore previous env vars or redeploy previous build if final cutover fails.
- Deployment logs are reviewed for missing env vars, build errors, or unexpected project refs.

## Branch / Deployment Expectations

- GitHub `main` is the release source-of-truth for production deployment.
- Feature branches may deploy to preview only.
- Production deployment should reference a known release tag or audited commit.
- No production deployment should point at an unreviewed local branch.
- GitHub main, Vercel production deployment, and Supabase migration head must be recorded together
  during cutover.

## Rollback / Tag References

Baseline tags to preserve and verify:

- `governance-baseline-v1`;
- `product-expansion-foundation-v1`;
- `operations-dashboard-foundation-v1`;
- `operational-ux-foundation-v1`;
- `operational-timeline-foundation-v1`;
- `saved-views-foundation-v1`;
- `document-experience-foundation-v1`.

Tag parity checks:

- Confirm each tag exists locally and remotely before final cutover.
- Confirm `document-experience-foundation-v1` exists or create it in a separate approved release
  hygiene slice before relying on it as a rollback marker.
- Record which tag/commit Vercel production currently serves before cutover.
- Record the post-cutover tag/commit after smoke validation.
- Rollback should restore previous Vercel env/deployment and point traffic back to legacy or the
  previously approved project; it should not attempt reverse migration of the final project.

## Explicit Non-Goals For Slice 1C

- No environment variable changes.
- No Supabase project changes.
- No Vercel changes.
- No GitHub branch or tag changes.
- No Edge Function deployment.
- No storage bucket or policy changes.
- No migrations.
- No runtime behavior changes.
