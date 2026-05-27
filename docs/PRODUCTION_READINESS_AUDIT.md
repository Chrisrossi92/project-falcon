# Production Readiness Audit

## Purpose

Falcon should verify production cutover readiness before making infrastructure, runtime, migration,
Supabase, Vercel, secret, or environment changes. This audit records the current environment
posture, readiness risks, blockers, and first recommended production-readiness track.

This is a documentation and planning audit. It does not change runtime behavior, migrations,
Supabase projects, storage policies, Edge Functions, Vercel configuration, environment variables,
secrets, data, permissions, RLS, routes, or application code.

Related doctrine:

- `docs/STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md`
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`
- `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`
- `docs/PRODUCTION_BOOTSTRAP_PLAN.md`
- `docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`
- `docs/PRODUCTION_HARDENING_RUNTIME_CONFIDENCE.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Current Known Environments

| Environment | Project Ref | Current Role | Production Readiness Direction |
|---|---|---|---|
| Modern staging Supabase project | `voompccpkjfcsmehdoqu` | Current modern/company-scoped validation target. Local environment currently points here for modern architecture work. | Use as the proven reference architecture and validation source, not automatically as final production. |
| Legacy hosted project | `okwqhkrsjgxrhyisaovc` | Older hosted production/archive source using the `20260517` non-company schema shape. | Preserve as source/archive until cutover. Do not retrofit modern features into this legacy schema. |
| Future final production project | TBD | Clean production target based on the modern staging architecture. | Preferred final direction: create/provision intentionally, replay/bootstrap modern architecture, migrate data, validate, then cut over traffic. |

Current decision:

- Do not retrofit Order Documents, signed URLs, upload prepare/finalize, archive, company-scoped
  permissions, or other modern features into the legacy hosted schema.
- Do not push the modern governance migration chain directly into the legacy project as a first
  production move.
- Future production should cut over to a clean production project based on the modern staging
  architecture after migration replay, data migration, environment parity, and smoke validation are
  proven.

## Readiness Categories

- **Ready enough**: has a documented design and enough implementation confidence to use as a
  foundation, though it may still require final verification.
- **Needs verification**: likely viable but must be explicitly checked in staging/dry run before
  production cutover.
- **Blocker before production cutover**: must be resolved before production traffic moves.
- **Deferred post-MVP hardening**: not required to launch the first governed production cutover, but
  should be tracked after MVP.

## Falcon V1 Wrap Hardening Decision Lock

The following hardening work is complete for Falcon V1 and should be treated as locked unless
validation finds a production-impacting defect:

- **Access save atomicity**: Users/Edit Access now has a narrow backend RPC wrapper for atomic role
  and V1-visible permission override persistence.
- **Hidden enterprise route suppression**: Assignments and Relationships are suppressed from Staff
  Appraisal navigation/commands and direct route access.
- **Permission override visible scope**: active Users/Edit Access override reads/saves are limited
  to the V1-visible override universe; hidden/deferred rows are preserved outside that flow.
- **TopNav permission RPC cleanup**: TopNav resolves effective permissions once and derives nav
  booleans locally.
- **Native alert/confirm cleanup**: active V1 production surfaces no longer rely on native browser
  alert/confirm dialogs.
- **Saved Views lazy-load**: Orders saved views load only when the panel is opened.
- **Orders `activeOnly` cleanup**: the main Orders API no longer accepts an unused `activeOnly`
  option; active/default visibility remains controlled by archived and retired-lifecycle flags.

These items are not production cutover blockers after their test/lint/build validation has passed.

### Known Warning And Debt Classification

| Item | V1 Classification | Decision |
|---|---|---|
| Tailwind ambiguous class warning | Non-blocking unless low-risk obvious fix | Defer unless the fix is local and cannot alter runtime behavior. |
| Vite large chunk warning | Post-V1 unless real performance issue | Defer until production usage or profiling shows operational impact. |
| Remaining lint warnings | Non-blocking by default | Address only warnings that indicate production-impacting behavior, security risk, or data integrity risk before cutover. |
| Supabase db lint legacy issues | Conditional blocker | Defer legacy/noise findings; treat RLS, grants, exposed secrets, cross-company isolation, direct-write authority, or data-loss findings as blockers. |
| Work eligibility override allowlist | Backend-only/deferred foundation | Keep out of active V1 override UI. It supports future controlled authority and is not a current UX surface. |
| `/clients` vs `/clients/cards` | Current V1 dynamic routing | Full client readers route to `/clients`; assigned-only readers route to `/clients/cards`. `/clients/cards` remains the assigned-client compatibility surface for V1, not a product-mode expansion. |

### Remaining V1 Wrap Gates

The remaining V1 blockers are operational validation gates, not new architecture work:

- final Supabase production target decision and environment parity;
- clean migration replay/bootstrap proof;
- backup/rollback readiness;
- storage bucket, Edge Function, auth, owner/admin, role, order, document, notification, and saved
  view smoke tests;
- representative browser checks for owner/admin, appraiser, reviewer, and hybrid-role users;
- confirmation that hidden enterprise surfaces remain suppressed in Staff Appraisal mode.

## Readiness Audit Matrix

| Area | Status | Current Finding | Required Next Step |
|---|---|---|---|
| Migration replay confidence | Blocker before production cutover | Modern local/staging work depends on the `20260518` company-scoped chain. Legacy hosted production is not migration-history compatible with blindly replaying baselines. | Run a clean-project replay and a production-data dry run. Document baseline repair/reconciliation and stop on catalog mismatch. |
| Supabase project bootstrap requirements | Blocker before production cutover | Final production project does not yet exist as a deliberately named, clean target. Company row, auth/app-user mapping, memberships, role assignments, storage, and functions must be bootstrapped. | Use `docs/PRODUCTION_BOOTSTRAP_PLAN.md` to rehearse bootstrap in a disposable project before final project provisioning. |
| Permission/seed verification | Blocker before production cutover | Permission catalogs, template roles, user role assignments, owner/admin grants, document permissions, lifecycle permissions, and saved-view/document RPC grants exist in migrations but need target verification. | Add SQL verification checklist for permission keys, grants, execute privileges, active memberships, and representative owner/appraiser/reviewer behavior. |
| Storage bucket/policy setup | Blocker before production cutover | Order Documents require a private `order-documents` bucket and approved RPC/Edge-mediated access. Legacy project must not receive a shortcut bucket policy. | Verify bucket privacy, policies, object write/read behavior, metadata listing, upload finalize, signed download, and archive in dry run/final target. |
| Edge Function deployment requirements | Needs verification | Required functions include order document upload/download and company invitation/resend flows; each depends on Supabase URL/key/service-role secrets and app-origin configuration. | Produce deploy checklist for function list, secrets, CORS origins, schema reload needs, and smoke tests per function. |
| Environment variables/secrets | Blocker before production cutover | Frontend needs production `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; functions need `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and app origin values. Secrets must not be copied through docs or shell history. | Inventory required variables by environment and store them only in approved Vercel/Supabase secret stores. Verify no staging secrets are promoted accidentally. |
| Vercel deployment alignment | Needs verification | Production frontend must point at the final production Supabase project and app origins must match Edge Function CORS expectations. | Add Vercel environment parity checklist for production/preview, deployment promotion, rollback env restoration, and post-deploy smoke tests. |
| Rollback strategy | Needs verification | Existing doctrine says rollback should switch traffic back to the legacy project or restore from backups, not reverse migrations. This has not been rehearsed for the final project. | Define rollback owner, exact env restore steps, frontend redeploy/rollback path, and handling of writes created after cutover. |
| Backup/recovery expectations | Blocker before production cutover | Cutover requires legacy public/auth/storage inventories, project backup/PITR where available, migration-history capture, and final-target restore confidence. | Take and verify restorable backups before any final migration. Run at least one restore/dry-run validation. |
| Tenant/company bootstrap | Blocker before production cutover | Modern architecture requires canonical company context, populated `company_id` fields, active memberships, role assignments, current-company helpers, and company-scoped read/write behavior. | Verify company bootstrap and data backfill counts. Validate representative users across owner/admin/appraiser/reviewer scopes. |
| Admin/owner setup | Needs verification | Owner Setup and Team Access flows exist, but production owner/admin state and invite lifecycle need target validation. | Smoke owner setup, member list, invite, resend, cancel, role update, deactivate/reactivate, and owner invariant behavior in the final dry run. |
| Observability/logging gaps | Deferred post-MVP hardening | Function logs, frontend errors, PostgREST/RLS denials, auth failures, and operational smoke checks exist only as manual expectations. Formal alerting/dashboards are not defined. | Track post-MVP hardening for structured monitoring, alert thresholds, log drains, and operational dashboards. Minimum cutover requires manual monitoring checklist. |

## First Recommended Production-Readiness Track

The first track should turn the existing cutover doctrine into concrete, repeatable checklists
before touching production infrastructure.

### 1. Migration Replay / Bootstrap Checklist

Production Readiness Slice 1B creates the concrete checklist in
`docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`.

Required checks:

- clean Supabase project can replay or receive the modern schema intentionally;
- baseline reconciliation strategy is documented and not guessed during cutover;
- `supabase_migrations.schema_migrations` state is understood;
- company-scoped foundation exists after replay;
- current-company helpers execute for authenticated users;
- RLS/grant hardening does not block core app flows;
- saved views, order lifecycle RPCs, documents RPCs, member/invitation RPCs, and notification RPCs
  have expected signatures and grants.

Known validation blocker:

- a prior local full `supabase db reset` was blocked by a Supabase storage image pull issue;
- targeted `psql` replay worked for specific migrations, but targeted replay is not equivalent to
  full reset or fresh-project replay validation;
- production cutover remains blocked until local clean reset or fresh-project replay evidence exists.

### 2. Environment Parity Checklist

Production Readiness Slice 1C creates the concrete checklist in
`docs/ENVIRONMENT_PARITY_CHECKLIST.md`.

Required checks:

- final production frontend uses final production Supabase URL and anon key;
- preview/staging environments remain pointed at non-production projects;
- Edge Function app origins match Vercel production and preview domains intentionally;
- no staging service-role key is reused in production;
- Google Maps and any other browser-facing keys are scoped appropriately;
- secrets are stored in Vercel/Supabase secret stores, not committed or copied into docs.

The checklist covers local development, modern staging project `voompccpkjfcsmehdoqu`, future clean
production Supabase project, legacy hosted project `okwqhkrsjgxrhyisaovc` as non-retrofit
reference only, GitHub `main`, Vercel deployment settings, baseline tags, branch/deployment
expectations, and rollback references.

### Live Production Runtime Evidence Status

Production Hardening & Runtime Confidence Phase 1F inspected `https://continentalres.com` using
read-only HTTP and headless Chrome route checks. The deployed production response headers still
allow only legacy Supabase host `okwqhkrsjgxrhyisaovc.supabase.co` in CSP `connect-src`, and the
deployed JavaScript bundle contains the same legacy Supabase host. The modern staging host
`voompccpkjfcsmehdoqu.supabase.co` was not observed in deployed CSP or deployed bundle evidence.

Authenticated production route data loading was not completed, so API-call evidence remains
incomplete. The safe decision is that CSP cleanup is unsafe as a direct removal of the legacy host
until production Supabase target intent is decided and verified. See
`docs/PRODUCTION_HARDENING_RUNTIME_CONFIDENCE.md` for the Phase 1F evidence and decision.

### Production Supabase Target Decision Status

Production Hardening & Runtime Confidence Phase 1G defines the target decision plan before any
Vercel env, CSP, deployment, or Supabase project change. Current evidence strongly indicates that
deployed production is still legacy-targeted because production CSP allows
`okwqhkrsjgxrhyisaovc.supabase.co` and the deployed bundle contains that same host. This is not yet
complete authenticated API proof, so Vercel env classification and authenticated network evidence
remain required.

Current target posture:

- `okwqhkrsjgxrhyisaovc` is the likely current production runtime Supabase target and should be
  treated as a temporary legacy-backed state unless dashboard/authenticated evidence proves
  otherwise.
- `voompccpkjfcsmehdoqu` remains the modern staging/reference validation project, not automatically
  final production.
- a separate clean final production Supabase project remains the preferred direction unless the
  team explicitly chooses a different target.
- changing `VITE_SUPABASE_URL` requires target approval, schema/data/auth/company/permission/storage
  parity evidence, preview smoke, production smoke plan, and rollback procedure.
- CSP cleanup remains blocked until the selected runtime target is proven and the deployed bundle
  no longer requires the legacy host.

### 3. Seed / Permission Verification Checklist

Required checks:

- permission catalog contains all active keys used by frontend and backend gates;
- template roles and company role assignments resolve expected permissions;
- owner/admin has management permissions;
- appraiser/reviewer users have expected read/update/document scopes only;
- lifecycle permissions remain intentionally granted or withheld;
- `authenticated` execute grants exist for intended RPCs only;
- direct table grants remain revoked where RPC-only doctrine requires it.

### 4. Storage / Function Deployment Checklist

Required checks:

- `order-documents` bucket exists and is private;
- upload prepare/finalize works only for authorized users;
- document list returns safe metadata only;
- signed download works only through the approved Edge Function path;
- archive works only through `rpc_order_document_archive(...)`;
- `invite-company-member` and `resend-company-member-invite` deploy with correct secrets and
  redirect origin behavior;
- function logs are reviewed during smoke tests;
- no public bucket, direct storage URL, or raw storage-path authorization shortcut is introduced.

### 5. Production Bootstrap Plan

Production Readiness Slice 1D creates the future clean-production bootstrap design in
`docs/PRODUCTION_BOOTSTRAP_PLAN.md`.

Required stage order:

- create fresh Supabase project;
- apply migrations;
- verify extensions, enums, and constraints;
- seed permissions and system rows;
- configure private storage buckets and policies;
- deploy Edge Functions;
- configure auth and redirect URLs;
- create first owner/company;
- verify admin bootstrap;
- connect Vercel production environment;
- smoke-test critical flows.

Dependency gates:

- migrations before seed verification;
- storage before uploads;
- auth before login tests;
- owner/company bootstrap before operational testing;
- Vercel production env connection only after database, storage, functions, auth, and admin
  bootstrap pass.

### 6. Production Smoke Test Checklist

Production Readiness Slice 1E creates the manual smoke checklist in
`docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`.

Required smoke areas:

- login/auth;
- current company context;
- owner/admin access;
- Team Access;
- Orders list and Order Detail;
- workflow transitions;
- lifecycle actions: archive, cancel, and void;
- Historical Orders;
- Print Packet;
- secure document upload, download, and archive;
- activity timeline;
- notifications;
- Saved Views;
- dashboard KPIs;
- workload visibility;
- filtering and drill links;
- permission denial checks;
- RLS/company isolation spot checks.

Each checklist section records test goal, basic steps, expected result, and failure
notes/escalation. The checklist is manual for this slice; automated production smoke tests remain
deferred post-MVP hardening.

## Production Verification Status

### Slice 2A: Local Migration Replay Status Check

On 2026-05-22, local-only replay validation was attempted against the current workspace using
Supabase CLI `2.101.0` and Docker `29.4.3` on branch `main`.

Commands run:

- `supabase db reset`;
- `supabase --version`;
- `docker --version`;
- `git rev-parse --abbrev-ref HEAD`;
- `date '+%Y-%m-%d %H:%M:%S %Z'`.

Result:

- The first local reset attempt was blocked by sandbox permissions writing the Supabase CLI
  telemetry file under `~/.supabase`.
- The command was rerun with local filesystem approval for the Supabase CLI.
- The reset reached local database recreation and schema initialization.
- Full local migration replay failed before completion because Docker could not resolve:

```text
public.ecr.aws/supabase/storage-api:optimize-existing-functions-again
```

Exact blocker:

```text
failed to pull docker image: Error response from daemon: failed to resolve reference
"public.ecr.aws/supabase/storage-api:optimize-existing-functions-again":
public.ecr.aws/supabase/storage-api:optimize-existing-functions-again: not found
```

Readiness conclusion:

- Local full reset/replay is still not validated.
- Migration replay confidence remains a blocker before production cutover.
- Targeted `psql` replay remains useful only for specific reviewed migrations and is not equivalent
  to full reset or fresh-project replay validation.
- No staging project, hosted legacy project, future production project, Vercel deployment,
  environment variable, storage policy, Edge Function, or schema edit was changed.

### Slice 2B: Environment Parity Evidence Capture

On 2026-05-22, local repo, GitHub remote, Vercel-local, and tool-version evidence was captured
without changing environments.

Verified locally:

- branch `main`;
- commit `a25a588251093b9c464a95ee41176faef572e80c`;
- `HEAD` tag `admin-invite-flow-polish-v1`;
- local tags through `admin-invite-flow-polish-v1`;
- Node `v22.16.0`;
- npm `10.8.0`;
- Supabase CLI `2.101.0`;
- Docker `29.4.3`;
- Vercel CLI `47.0.6`;
- `vercel.json` exists;
- no local `.vercel` project-link directory is present.

Verified by read-only GitHub remote query:

- `origin/main` matches local `HEAD` at `a25a588251093b9c464a95ee41176faef572e80c`.
- Local release/baseline tags are present on `origin`.
- `admin-invite-flow-polish-v1` resolves to the current `HEAD` commit.

Verified from docs/repo configuration:

- Modern staging project remains `voompccpkjfcsmehdoqu`.
- Legacy hosted project remains `okwqhkrsjgxrhyisaovc`.
- The no-retrofit legacy decision remains current.
- `vercel.json` still includes a Content Security Policy `connect-src` entry for the legacy hosted
  Supabase URL `https://okwqhkrsjgxrhyisaovc.supabase.co`.

Requires GitHub/Vercel UI confirmation:

- Vercel production deployment commit/tag and domain alignment.
- Vercel production/preview environment variables.
- Vercel project dashboard linkage, because no local `.vercel` directory is present.

Requires Supabase dashboard confirmation:

- Staging and legacy project dashboard settings.
- Staging migration head, storage bucket/policy status, auth redirect URLs, and Edge Function
  deployment status.
- Future clean production project remains TBD and not yet verified.

Readiness conclusion:

- Local/GitHub tag evidence is materially stronger after this capture.
- Vercel deployment alignment remains a `Needs verification` item.
- Supabase dashboard parity remains a `Needs verification` / cutover-blocking item depending on
  area.
- No environment variables, Supabase projects, Vercel settings, production project, schema,
  storage, Edge Function, or runtime files were changed.

### Slice 2C: Vercel / Env Config Audit

On 2026-05-22, repository-local Vercel configuration and local env file names were inspected
without changing config or printing secret values.

Files inspected:

- `vercel.json`;
- `.env.local`;
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`;
- `docs/PRODUCTION_READINESS_AUDIT.md`;
- `docs/PRODUCTION_BOOTSTRAP_PLAN.md`.

Verified locally:

- `vercel.json` still references the legacy hosted project `okwqhkrsjgxrhyisaovc`.
- `vercel.json` Content Security Policy `connect-src` currently allows:
  - `'self'`;
  - `https://okwqhkrsjgxrhyisaovc.supabase.co`.
- `vercel.json` does not currently include the modern staging Supabase host or a future clean
  production Supabase host in `connect-src`.
- `vercel.json` represents app/config origins including `'self'` and `https://cdn.jsdelivr.net`.
- The only repo-root env file found is `.env.local`.
- `.env.local` defines `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `.env.local` `VITE_SUPABASE_URL` targets modern staging project ref `voompccpkjfcsmehdoqu`.
- No local `.vercel` project-link directory exists.

Requires Vercel dashboard confirmation:

- Current Vercel project linkage and ownership.
- Production deployment source commit/tag.
- Production/preview/development env var names and target project refs.
- Production and preview domain alignment with Supabase Auth redirect URLs and Edge Function
  CORS/origin settings.
- Any dashboard-level headers, redirects, build settings, or domains not represented in
  repository-local `vercel.json`.

Readiness conclusion:

- Local config evidence confirms a cutover mismatch to resolve later: local `.env.local` targets
  modern staging, while `vercel.json` CSP still allows only the legacy hosted Supabase URL for
  browser `connect-src`.
- This is not changed in Slice 2C by design.
- Vercel deployment alignment remains `Needs verification` and must be resolved before production
  cutover.
- No env vars, `vercel.json`, Vercel dashboard settings, Supabase settings/projects, runtime code,
  schema, storage, Edge Functions, or production project state were changed.

### Slice 2D: Local Runtime Environment Verification

On 2026-05-22, the local Vite runtime was verified against the current local frontend environment
target without changing local env vars, Vercel dashboard settings, Supabase settings/projects, CSP,
runtime code, schema, storage, Edge Functions, or production project state.

Local app URL used:

- `http://127.0.0.1:5173/`.

Expected environment target:

- modern staging Supabase project ref `voompccpkjfcsmehdoqu`.

Files and commands inspected:

- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`;
- `docs/PRODUCTION_READINESS_AUDIT.md`;
- `package.json` scripts;
- `.env.local` variable names and known project ref only;
- served Vite root, `/dashboard`, `/orders`, `src/lib/supabaseClient.js`, and
  `src/pages/Dashboard.jsx`;
- runtime source scan for `voompccpkjfcsmehdoqu` and `okwqhkrsjgxrhyisaovc`;
- headless Chrome DevTools Protocol route/network check for `/dashboard` and `/orders`.

Verified locally:

- `npm run dev -- --host 127.0.0.1` starts the frontend successfully after local server binding is
  allowed. The first attempt was blocked by local sandbox restrictions with `listen EPERM` on
  `127.0.0.1:5173`; the approved rerun started Vite normally.
- The local app shell responds with HTTP 200 for `/`, `/dashboard`, and `/orders`.
- The served Vite Supabase client module resolves `VITE_SUPABASE_URL` to modern staging project ref
  `voompccpkjfcsmehdoqu`.
- The served Dashboard module resolves its direct Supabase client initialization to the same modern
  staging project ref.
- Runtime source scan found no legacy project ref literal in active `src`, `public`, `index.html`,
  `package.json`, or `vite.config.*` files.
- A clean temporary browser profile had no active session; protected `/dashboard` and `/orders`
  routes redirected to `/login` and rendered the Falcon sign-in screen.
- Browser route content was nonblank, and no Vite/React error overlay appeared.
- Browser network/resource capture showed no requests to legacy hosted project
  `okwqhkrsjgxrhyisaovc`.
- No Supabase API requests were made before login in the clean browser profile, so authenticated
  dashboard/order data loading remains an explicit staging-user smoke item.
- No mixed modern/legacy Supabase project behavior was observed in served runtime modules or the
  browser route/resource capture.

Runtime notes:

- Local Vite responses do not apply the repository `vercel.json` CSP header, so this local check
  cannot prove Vercel CSP behavior. The known 2C mismatch remains: repo CSP currently allows only
  the legacy hosted Supabase URL while local `.env.local` targets modern staging.
- Headless Chrome reported React Router v7 future-flag warnings.
- Headless Chrome reported external stylesheet `net::ERR_BLOCKED_BY_ORB` failures; these were not
  Supabase requests and were not evidence of project-target mixing.

Readiness conclusion:

- Local runtime target evidence is stronger: the current local app boots and serves frontend
  Supabase configuration for modern staging rather than the legacy hosted project.
- Authenticated dashboard/orders smoke still needs a known staging session or credentials.
- Vercel deployment/CSP alignment remains `Needs verification` and should not be inferred from
  local Vite behavior.
- No env vars, `vercel.json`, Vercel dashboard settings, Supabase settings/projects, runtime code,
  schema, storage, Edge Functions, or production project state were changed.

### Slice 2E: Vercel Dashboard Verification Checklist

On 2026-05-22, the manual Vercel dashboard verification checklist was defined before any deployed
setting is touched. This slice is documentation-only and creates the evidence format for later
manual dashboard inspection.

Manual checks to perform in Vercel:

- project link / project name;
- production deployment commit SHA;
- production deployment branch;
- production domain;
- preview domain behavior;
- production env vars present by name only;
- preview env vars present by name only;
- whether production currently points to legacy or modern Supabase;
- whether preview currently points to staging;
- custom headers/CSP behavior from the deployed build;
- rollback/deployment history availability.

Evidence format:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Vercel project link / project name | Project name only. | verified / mismatch / needs decision | Confirm intended Falcon frontend project. |
| Production deployment commit SHA | Full SHA if visible. | verified / mismatch / needs decision | Compare with GitHub `main` and release tag expectations. |
| Production deployment branch | Branch name only. | verified / mismatch / needs decision | Confirm `main` unless a release branch was approved. |
| Production domain | Domain names only. | verified / mismatch / needs decision | Compare with Supabase Auth and Edge Function origins later. |
| Preview domain behavior | Preview domain pattern or enabled/disabled summary. | verified / mismatch / needs decision | Decide intended preview Auth/CORS behavior. |
| Production env vars present by name only | Names only, no values. | verified / mismatch / needs decision | Confirm required names exist before target changes. |
| Preview env vars present by name only | Names only, no values. | verified / mismatch / needs decision | Confirm preview/staging naming parity. |
| Production Supabase target classification | `legacy`, `modern staging`, `future production`, or `unknown`; safe project ref only if visible. | verified / mismatch / needs decision | Decide whether target is acceptable before cutover. |
| Preview Supabase target classification | `staging`, `legacy`, `future production`, or `unknown`; safe project ref only if visible. | verified / mismatch / needs decision | Confirm preview does not point at final production by accident. |
| Deployed custom headers/CSP | Header names and safe origin hostnames only. | verified / mismatch / needs decision | Compare deployed CSP with repo `vercel.json`; no CSP edits yet. |
| Rollback/deployment history | Availability summary only. | verified / mismatch / needs decision | Define rollback owner and exact rollback path. |

Do not record:

- secret values;
- anon key values;
- service-role values;
- full env var values;
- screenshots containing secrets, token previews, env values, or sensitive dashboard panes.

Safe next step:

- Manually inspect the Vercel dashboard and capture evidence in the checklist format.
- Do not change Vercel env vars yet.
- Do not update CSP yet.
- Do not change Supabase settings/projects.
- Do not change runtime code.
- Use captured evidence only to plan the later Vercel env/CSP alignment slice.

Readiness conclusion:

- Vercel dashboard verification remains `Needs verification` until the checklist is manually
  completed.
- The known repo-local mismatch remains unresolved by design: local `.env.local` targets modern
  staging while repo `vercel.json` CSP still allows only the legacy hosted Supabase URL.
- No Vercel settings, env vars, Supabase settings/projects, CSP, runtime code, schema, storage,
  Edge Functions, or production project state were changed.

## Go / No-Go Summary

Ready enough:

- governance doctrine for modern company-scoped architecture;
- documented staging-first and clean-final-project cutover direction;
- existing final cutover plan and staging migration plan;
- modern staging project as the reference validation target.

Needs verification:

- Edge Function deployment and secrets in final target;
- Vercel environment alignment;
- rollback mechanics;
- owner/admin setup and Team Access behavior;
- manual observability and smoke-monitoring checklist.

Blockers before production cutover:

- clean final production project or approved target decision;
- migration replay/bootstrap rehearsal;
- production-data dry run and count reconciliation;
- auth/user/company/membership/role mapping verification;
- permission/grant/RLS verification;
- private storage bucket and document function smoke tests;
- restorable backup/PITR or equivalent recovery plan.

Deferred post-MVP hardening:

- formal alerting and dashboards;
- log drains or centralized observability;
- automated production smoke tests;
- deeper backup restore drills beyond the initial cutover requirement;
- long-term retention and legacy project retirement policy.

## Explicit Non-Goals For Slice 1A

- No runtime changes.
- No migrations.
- No Supabase project changes.
- No Vercel changes.
- No environment variable or secret changes.
- No Edge Function deployment.
- No storage bucket or policy changes.
- No production data mutation.
