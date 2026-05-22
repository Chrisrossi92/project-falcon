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
- `document-experience-foundation-v1`;
- `production-readiness-foundation-v1`;
- `admin-onboarding-foundation-v1`;
- `admin-onboarding-team-access-v1`;
- `admin-invite-flow-polish-v1`.

Tag parity checks:

- Confirm each tag exists locally and remotely before final cutover.
- Record which tag/commit Vercel production currently serves before cutover.
- Record the post-cutover tag/commit after smoke validation.
- Rollback should restore previous Vercel env/deployment and point traffic back to legacy or the
  previously approved project; it should not attempt reverse migration of the final project.

## Evidence Capture Log

### 2026-05-22 Local / GitHub / Vercel Evidence

Commands run:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git tag --sort=creatordate
git tag --points-at HEAD
git remote -v
git ls-remote --tags origin
git ls-remote --heads origin main
node --version
npm --version
supabase --version
docker --version
vercel --version
cat vercel.json
test -d .vercel
date '+%Y-%m-%d %H:%M:%S %Z'
```

Verified locally:

- Branch: `main`.
- Commit: `a25a588251093b9c464a95ee41176faef572e80c`.
- Tag at `HEAD`: `admin-invite-flow-polish-v1`.
- Local tags:
  - `governance-baseline-v1`;
  - `product-expansion-foundation-v1`;
  - `operations-dashboard-foundation-v1`;
  - `operational-ux-foundation-v1`;
  - `operational-timeline-foundation-v1`;
  - `saved-views-foundation-v1`;
  - `document-experience-foundation-v1`;
  - `production-readiness-foundation-v1`;
  - `admin-onboarding-foundation-v1`;
  - `admin-onboarding-team-access-v1`;
  - `admin-invite-flow-polish-v1`.
- Git remote: `origin` points to `https://github.com/Chrisrossi92/project-falcon.git`.
- Node: `v22.16.0`.
- npm: `10.8.0`.
- Supabase CLI: `2.101.0`.
- Docker: `29.4.3`.
- Vercel CLI: `47.0.6`.
- Local `vercel.json` exists.
- Local `.vercel` project-link directory is not present.
- Evidence timestamp: `2026-05-22 17:02:27 EDT`.

Verified by read-only GitHub remote query:

- `origin/main` points to `a25a588251093b9c464a95ee41176faef572e80c`, matching local `HEAD` at
  capture time.
- The local tags listed above are present on `origin`.
- `admin-invite-flow-polish-v1` resolves to `a25a588251093b9c464a95ee41176faef572e80c`.

Verified from docs/repo configuration:

- Modern staging Supabase project ref remains `voompccpkjfcsmehdoqu`.
- Legacy hosted Supabase project ref remains `okwqhkrsjgxrhyisaovc`.
- The no-retrofit legacy decision remains documented: modern company-scoped features should not be
  pushed into the legacy hosted schema as a retrofit.
- `vercel.json` currently includes a `connect-src` Content Security Policy entry for
  `https://okwqhkrsjgxrhyisaovc.supabase.co`.

Requires GitHub / Vercel UI confirmation:

- The currently deployed Vercel production commit and deployment tag.
- Vercel production and preview environment-variable values.
- Vercel production domain and preview-domain behavior.
- Whether the Vercel project is linked in the dashboard even though no local `.vercel` directory is
  present.

Requires Supabase dashboard confirmation:

- Modern staging project settings, auth redirect URLs, Edge Function deployment status, storage
  bucket/policy status, and migration head.
- Legacy hosted project settings and production/archive state.
- Future clean production project remains not created / not yet verified.

Not yet verified:

- Remote GitHub tag protection or release metadata beyond read-only tag presence.
- Vercel deployment alignment with the current `main` commit.
- Supabase dashboard migration history for staging/future production.
- Final production Supabase project ref, secrets, storage, functions, redirects, and bootstrap
  state.

### 2026-05-22 Vercel / Env Config Audit

Production Verification Slice 2C inspected repository-local deployment configuration and local env
file names only. No env values, secrets, Vercel dashboard settings, Supabase settings, runtime
files, or `vercel.json` contents were changed.

Commands/files inspected:

```bash
cat vercel.json
find . -maxdepth 1 -name '.env*' -type f -print
awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{print FILENAME ":" $1}' .env.local
awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{...known project ref detection only...}' .env.local
test -d .vercel
```

Verified locally:

- `vercel.json` exists and still references the legacy hosted Supabase project ref
  `okwqhkrsjgxrhyisaovc`.
- The `Content-Security-Policy` in `vercel.json` has this `connect-src` shape:
  - `'self'`;
  - `https://okwqhkrsjgxrhyisaovc.supabase.co`.
- `vercel.json` also represents these non-Supabase app/config origins:
  - `'self'`;
  - `https://cdn.jsdelivr.net` for script/style loading.
- No modern staging Supabase host and no future clean production Supabase host are currently present
  in the `vercel.json` `connect-src` allowlist.
- The only local env file found at repo root is `.env.local`.
- `.env.local` defines these frontend Vite env var names:
  - `VITE_SUPABASE_URL`;
  - `VITE_SUPABASE_ANON_KEY`.
- `.env.local` `VITE_SUPABASE_URL` targets project ref `voompccpkjfcsmehdoqu`.
- No env secret values were printed or recorded.
- No local `.vercel` project-link directory exists.

Expected frontend Vite env var names:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`;
- `VITE_GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_MAPS_KEY` where maps are enabled.

Requires Vercel dashboard confirmation:

- Current Vercel project link/ownership, because no local `.vercel` project-link directory exists.
- Production deployment source commit/tag.
- Production, preview, and development env var names and target project refs.
- Whether production currently points at the legacy hosted project, staging, or another target.
- Whether the production domain, preview domains, and any custom domains match Supabase Auth and
  Edge Function CORS/origin configuration.
- Whether Vercel has additional headers, redirects, domains, or build settings not represented in
  repo-local `vercel.json`.
- Future cutover requirement: before production points at a clean modern Supabase project,
  `vercel.json` CSP `connect-src` and Vercel env vars must be reviewed together so frontend network
  policy and Supabase target agree.

### 2026-05-22 Local Runtime Environment Verification

Production Verification Slice 2D verified the local Vite runtime against the current local env
target without changing env vars, Vercel settings, Supabase settings/projects, CSP, runtime code, or
dashboard configuration.

Commands/files inspected:

```bash
sed -n '1,260p' docs/ENVIRONMENT_PARITY_CHECKLIST.md
sed -n '1,260p' docs/PRODUCTION_READINESS_AUDIT.md
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))"
ls -la .env.local
awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{...variable name and known project ref detection only...}' .env.local
npm run dev -- --host 127.0.0.1
curl -sS -D - http://127.0.0.1:5173/
curl -sS -D - http://127.0.0.1:5173/dashboard
curl -sS -D - http://127.0.0.1:5173/orders
curl -sS http://127.0.0.1:5173/src/lib/supabaseClient.js
curl -sS http://127.0.0.1:5173/src/pages/Dashboard.jsx
rg -n "okwqhkrsjgxrhyisaovc|voompccpkjfcsmehdoqu" src public index.html package.json vite.config.*
headless Chrome DevTools Protocol route/network check for /dashboard and /orders
```

Verified locally:

- Local app URL used: `http://127.0.0.1:5173/`.
- Expected environment target: modern staging project ref `voompccpkjfcsmehdoqu`.
- The first dev-server start attempt was blocked by local sandbox network binding restrictions
  (`listen EPERM` on `127.0.0.1:5173`); rerunning the same local dev command with local server
  approval started Vite successfully.
- Root, `/dashboard`, and `/orders` returned the Vite app shell with HTTP 200 responses.
- The served Vite Supabase client module resolves `VITE_SUPABASE_URL` to modern staging project ref
  `voompccpkjfcsmehdoqu`.
- The served Dashboard module also resolves its direct Supabase client initialization to modern
  staging project ref `voompccpkjfcsmehdoqu`.
- Runtime source scan across `src`, `public`, `index.html`, `package.json`, and `vite.config.*`
  found no direct legacy or modern project ref literals in runtime source files.
- Headless Chrome route checks loaded `/dashboard` and `/orders`; both protected routes redirected
  to `/login` in the clean temporary browser profile.
- Auth/session behavior observed: no existing session was present in the temporary browser profile,
  so the app rendered the Falcon sign-in screen instead of authenticated dashboard/orders content.
- Browser route content was nonblank, and no Vite/React error overlay appeared.
- Browser network/resource capture saw no requests to legacy hosted project
  `okwqhkrsjgxrhyisaovc`.
- Browser network/resource capture saw no Supabase API requests before login because the clean
  browser profile had no active session and no credentials were submitted.
- No mixed modern/legacy Supabase project behavior was observed in served runtime modules or browser
  route/resource capture.
- Local Vite responses did not include the repo `vercel.json` Content Security Policy header, so
  this local check cannot prove Vercel CSP behavior. The 2C CSP mismatch remains a Vercel
  configuration item to confirm later.

Observed nonblocking local runtime notes:

- Headless Chrome reported React Router v7 future-flag warnings.
- Headless Chrome reported stylesheet `net::ERR_BLOCKED_BY_ORB` failures for external stylesheet
  resources; these were not Supabase requests and were not evidence of legacy/modern project
  mixing.

Still requires authenticated/browser confirmation:

- Dashboard and Orders authenticated data loading with a known staging user.
- Auth login success against modern staging.
- Vercel preview/production CSP behavior after `connect-src` is aligned with the intended Supabase
  target.
- Vercel dashboard environment-variable target refs and deployed-domain behavior.

### 2026-05-22 Vercel Dashboard Verification Checklist

Production Verification Slice 2E defines the exact manual Vercel dashboard verification checklist
to run before touching deployed settings. This is evidence capture only. Do not change Vercel env
vars, project settings, domains, deployment aliases, custom headers, build settings, Supabase
settings, Supabase projects, local env files, `vercel.json`, CSP, runtime code, or production data
while completing this checklist.

Safe evidence rules:

- Record env var names only.
- Record Supabase project refs only when visible from a URL or safe project identifier.
- Record deployment commit SHA, branch, domain names, and dashboard-safe project names.
- Record whether each finding is verified, a mismatch, or needs a decision.
- Do not record secret values.
- Do not record anon key values.
- Do not record service-role values.
- Do not paste full env var values into docs, tickets, chat, screenshots, or terminal logs.
- Do not attach screenshots containing env values, tokens, secret previews, or sensitive dashboard
  panes.
- If a screenshot is needed later, crop or redact it before storage and prefer text evidence.

Manual dashboard checks:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Vercel project link / project name | TBD manual dashboard capture. Record project name only. | Needs decision | Confirm this is the intended Falcon frontend project before env or domain work. |
| Production deployment commit SHA | TBD manual dashboard capture. Record full SHA if visible. | Needs decision | Compare against GitHub `main` and release tag expectations. |
| Production deployment branch | TBD manual dashboard capture. Record branch name only. | Needs decision | Confirm production deploys from `main` unless a release branch was intentionally approved. |
| Production domain | TBD manual dashboard capture. Record domain names only. | Needs decision | Compare with Supabase Auth redirect URLs and Edge Function CORS/origin settings later. |
| Preview domain behavior | TBD manual dashboard capture. Record preview domain pattern or enabled/disabled summary. | Needs decision | Decide whether previews should be allowed in Supabase Auth/CORS before cutover. |
| Production env vars present by name only | TBD manual dashboard capture. Expected names include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and any app-origin/map keys in use. | Needs decision | Do not record values. Confirm required names exist before any target change. |
| Preview env vars present by name only | TBD manual dashboard capture. Expected names include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and any app-origin/map keys in use. | Needs decision | Do not record values. Confirm preview names match intended staging/preview behavior. |
| Production Supabase target classification | TBD manual dashboard capture. Record only `legacy`, `modern staging`, `future production`, or `unknown`; include safe project ref if visible. | Needs decision | Determine whether production currently points to legacy `okwqhkrsjgxrhyisaovc`, modern staging `voompccpkjfcsmehdoqu`, or another project. |
| Preview Supabase target classification | TBD manual dashboard capture. Record only `staging`, `legacy`, `future production`, or `unknown`; include safe project ref if visible. | Needs decision | Confirm preview currently points to staging/preview, not final production by accident. |
| Custom headers / CSP behavior from deployed build | TBD manual deployed-response capture. Record header names and safe origin hostnames only. | Needs decision | Compare deployed CSP with repo `vercel.json`; do not update CSP yet. |
| Rollback / deployment history availability | TBD manual dashboard capture. Record whether prior deployments and rollback/promote controls are available. | Needs decision | Define rollback owner and exact rollback path before cutover. |

Status values:

- `Verified`: observed value matches the expected production-readiness direction.
- `Mismatch`: observed value conflicts with the expected direction or known docs.
- `Needs decision`: observed value is unknown, ambiguous, not yet checked, or requires product/release
  owner approval before changes.

Proposed safe next step:

1. Manually inspect the Vercel dashboard using this checklist.
2. Capture only safe evidence in the table above or in a follow-up evidence section.
3. Do not change env vars yet.
4. Do not update CSP yet.
5. Do not change domains, aliases, build settings, redirects, headers, or deployment promotions yet.
6. Use the captured evidence to decide the later Vercel env/CSP alignment slice.

## Explicit Non-Goals For Slice 1C

- No environment variable changes.
- No Supabase project changes.
- No Vercel changes.
- No GitHub branch or tag changes.
- No Edge Function deployment.
- No storage bucket or policy changes.
- No migrations.
- No runtime behavior changes.
