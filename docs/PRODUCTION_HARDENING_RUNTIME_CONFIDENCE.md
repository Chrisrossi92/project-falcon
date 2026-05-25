# Production Hardening Runtime Confidence

## Purpose

This plan consolidates Falcon's production-readiness evidence into a runtime confidence sequence
before any deployed settings are changed. It exists to prevent blind production edits, especially
around Vercel environment variables, Supabase project targets, CSP headers, and cutover smoke
testing.

This is a documentation and verification plan. It does not change runtime code, migrations,
Supabase projects, Vercel settings, environment variables, CSP headers, backend behavior, query
behavior, workflow behavior, permissions, RLS, or production data.

## Inspected Sources

Phase 1A inspected these local sources:

- `docs/PRODUCTION_READINESS_AUDIT.md`;
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`;
- `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`;
- `docs/PRODUCTION_BOOTSTRAP_PLAN.md`;
- `docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`;
- `docs/NEXT_PHASE_EXECUTION_PLAN.md`;
- `docs/IMPLEMENTATION_ROADMAP.md`;
- `vercel.json`;
- `src/lib/supabaseClient.js`;
- `src/pages/Dashboard.jsx`;
- repository references to the modern staging and legacy hosted Supabase project refs.

## Current Known-Good Evidence

- Modern staging Supabase project ref is `voompccpkjfcsmehdoqu`.
- Legacy hosted Supabase project ref is `okwqhkrsjgxrhyisaovc`.
- The legacy hosted project remains a source/archive reference only. Modern company-scoped
  features should not be retrofitted into that schema.
- Previous local runtime verification resolved the served Vite app to modern staging project
  `voompccpkjfcsmehdoqu`.
- Previous local browser network verification found no runtime calls to legacy project
  `okwqhkrsjgxrhyisaovc`.
- Local source scans found no legacy project ref literals in active runtime source files.
- `src/lib/supabaseClient.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `vercel.json` exists and defines SPA rewrites plus security headers.
- Recent governed checkpoints exist for the operational workspace polish, design-system foundation,
  and interaction/motion foundation:
  - `operational-dashboard-polish-v1`;
  - `orders-workspace-polish-v1`;
  - `calendar-workspace-polish-v1`;
  - `clients-workspace-polish-v1`;
  - `assignments-workspace-polish-v1`;
  - `falcon-design-system-foundation-v1`;
  - `falcon-interaction-motion-foundation-v1`.

## Current Known Risks

### Vercel CSP Mismatch

`vercel.json` currently allows only this Supabase host in `connect-src`:

- `https://okwqhkrsjgxrhyisaovc.supabase.co`.

That is the legacy hosted project. The CSP does not currently include the modern staging host
`https://voompccpkjfcsmehdoqu.supabase.co` or a future clean production Supabase host.

Do not edit CSP until Vercel dashboard evidence confirms the intended production and preview
Supabase targets.

### Vercel Dashboard Evidence Gap

The repository cannot prove the current deployed Vercel project state by itself. Manual dashboard
evidence is still required for:

- Vercel project name/link;
- production deployment commit SHA;
- production deployment branch;
- production domain;
- preview domain behavior;
- production env var names only;
- preview env var names only;
- production Supabase target classification;
- preview Supabase target classification;
- deployed custom headers/CSP behavior;
- rollback/deployment history availability.

No secret values, anon key values, service-role values, full env values, or screenshots containing
secrets should be recorded.

### Supabase Production Target Gap

The final production Supabase project remains TBD. Modern staging is the current validation target,
not automatically the final production target.

The future production target still needs:

- clean migration replay or intentional schema provisioning evidence;
- permission and role seed verification;
- company/bootstrap verification;
- storage bucket and policy verification;
- Edge Function deployment and CORS verification;
- auth redirect URL verification;
- backup/rollback proof.

### Migration Replay Gap

A previous local `supabase db reset` reached database recreation and schema initialization but was
blocked before full replay by the Supabase storage image pull failure for
`public.ecr.aws/supabase/storage-api:optimize-existing-functions-again`.

Targeted migration checks remain useful for specific reviewed migrations, but they do not replace
full local reset or clean-project replay evidence.

### Runtime Config Surface Gap

Most active code should use the shared Supabase client, but `src/pages/Dashboard.jsx` still creates
a Supabase client directly from `import.meta.env.VITE_SUPABASE_URL` and
`import.meta.env.VITE_SUPABASE_ANON_KEY`. This does not currently indicate mixed-project behavior,
because it reads the same Vite env vars, but it should remain part of runtime config review.

No code change is recommended in this slice.

### Smoke Coverage Gap

Previous local runtime verification used a clean temporary browser profile and confirmed protected
routes redirect to `/login`. It did not prove authenticated dashboard/orders/client/calendar/
assignment data loading against a staging user.

Authenticated staging and deployed-preview smoke tests remain required.

### Observability Gap

Production monitoring is not yet defined for:

- frontend runtime errors;
- Vercel function and deployment logs;
- Supabase Auth failures;
- PostgREST/RLS denials;
- Edge Function failures;
- storage upload/download/archive failures;
- workflow/lifecycle RPC errors;
- smoke-test failure capture.

Minimum cutover confidence can remain manual, but the monitoring plan should be documented before
production traffic moves.

## Hardening Categories

### 1. Vercel Linkage And Config

Goal: prove which Vercel project and deployment are active before changing anything.

Required evidence:

- project name/link;
- production branch;
- production deployment commit SHA;
- production and preview domains;
- production/preview env var names only;
- deployed headers and CSP behavior;
- rollback/deployment history availability.

### 2. Supabase Environment Parity

Goal: prove each runtime environment points at the intended Supabase project.

Required evidence:

- local target remains modern staging unless intentionally changed;
- preview target is staging or another approved non-production target;
- production target is classified as legacy, modern staging, future production, or unknown;
- final production target is not assumed until explicitly provisioned and verified.

### 3. CSP And Security Headers

Goal: align browser network policy with the intended Supabase target without weakening security.

Required evidence before edits:

- deployed CSP header observed from production/preview responses;
- repo `vercel.json` compared against deployed header behavior;
- intended Supabase hostnames confirmed from Vercel env evidence;
- any external script/style/image/font/connect origins inventoried.

### 4. Migration Replay And Bootstrap

Goal: prove the modern schema and bootstrap path can be reproduced before cutover.

Required evidence:

- full local reset or clean-project replay succeeds;
- permission and role seed verification succeeds;
- first owner/company bootstrap works;
- app user/auth mapping is correct;
- company membership, roles, and current-company helpers work.

### 5. Storage, Edge Functions, And CORS

Goal: prove document and invitation functions work with intended origins and secrets.

Required evidence:

- required functions are deployed in the target project;
- required secret names exist in the correct environment;
- `order-documents` bucket is private and policy-backed;
- upload/download/archive flows work through approved RPC/Edge paths;
- invitation/resend flows work with intended redirect origins;
- CORS allows intended app origins and does not broadly allow unreviewed origins.

### 6. Production Smoke Testing

Goal: prove critical authenticated workflows against the deployed frontend and intended backend.

Required smoke areas:

- auth/login/session;
- current company context;
- owner/admin dashboard;
- Orders list/detail/edit;
- workflow transitions;
- lifecycle archive/cancel/void;
- Historical Orders;
- documents upload/download/archive;
- activity timeline;
- notifications;
- Saved Views;
- Calendar;
- Clients;
- Assignments;
- Team Access;
- Owner Setup;
- Print Packet.

### 7. Role And Permission Visibility

Goal: prove production users see only intended surfaces and actions.

Required personas:

- owner/admin;
- appraiser;
- reviewer;
- assignment-only vendor/recipient where applicable;
- user with insufficient permission for management surfaces.

Required checks:

- route guards;
- navigation visibility;
- action visibility;
- RPC/RLS denial behavior;
- assignment packet access not implying canonical order/client access.

### 8. Runtime Diagnostics

Goal: catch mixed target behavior, CSP failures, and config drift early.

Required checks:

- browser network traffic does not mix legacy and modern Supabase hosts;
- deployed app does not silently call legacy `okwqhkrsjgxrhyisaovc` unless explicitly approved;
- console has no CSP/runtime config errors;
- failed requests are categorized by auth, permission, CORS, CSP, or backend error.

### 9. Mobile And Responsive Production Checks

Goal: confirm the polished workspaces remain usable in deployed production/preview.

Required checks:

- Dashboard;
- Orders;
- Calendar;
- Clients;
- Assignments;
- Order Detail;
- Client Detail;
- Assignment packet detail;
- Owner Setup;
- Team Access.

### 10. Build Warning Cleanup

Goal: reduce deployment uncertainty from known build warnings after environment safety is proven.

Current known warning categories:

- Tailwind ambiguous `ease-[${EASING}]` class warning;
- large bundle chunk warning.

These are not Phase 1A changes.

### 11. Monitoring And Instrumentation Planning

Goal: define minimum production visibility before real traffic cutover.

Required planning:

- Vercel deployment/runtime log review path;
- Supabase Edge Function log review path;
- Supabase Auth/PostgREST error review path;
- smoke-test evidence capture format;
- post-deploy watch window owner;
- rollback decision triggers.

### 12. Rollback And Recovery

Goal: prove the rollback path before cutover.

Required evidence:

- Vercel rollback/promote controls are available;
- env restoration approach is documented;
- Supabase backup/restore/PITR expectations are documented;
- writes after cutover have an owner-reviewed handling plan.

## Evidence Already Confirmed

| Area | Confirmed Evidence | Remaining Limit |
|---|---|---|
| Local runtime target | Local Vite runtime previously resolved to modern staging `voompccpkjfcsmehdoqu`. | Does not prove deployed Vercel env vars. |
| Legacy runtime calls | Previous local browser network check found no calls to `okwqhkrsjgxrhyisaovc`. | Does not prove deployed CSP or production network behavior. |
| Repo CSP config | `vercel.json` contains CSP with legacy Supabase connect host. | Needs deployed header comparison before edits. |
| Shared Supabase client | `src/lib/supabaseClient.js` reads Vite env vars. | Direct Dashboard client initialization also reads Vite env vars and should stay on the review list. |
| Production docs | Readiness, parity, bootstrap, replay, and smoke checklists exist. | Manual dashboard and authenticated runtime evidence remain incomplete. |

## Risks Requiring Verification

| Risk | Verification Needed | Change Allowed Now |
|---|---|---|
| Production Vercel points to legacy Supabase | Manual Vercel dashboard env target classification by safe project ref only. | No. Capture evidence only. |
| Preview points to final production by accident | Manual Vercel preview env target classification. | No. Capture evidence only. |
| Deployed CSP blocks modern staging/future production | Fetch deployed headers and compare to intended target. | No. Design edit only after target is confirmed. |
| Migration replay remains blocked | Re-run local/fresh-project replay when storage image/tooling blocker is resolved. | No schema/migration edits in this phase. |
| Authenticated workflows fail in deployed environment | Run staged authenticated smoke after env/CSP evidence. | No workflow/backend edits until failure is reproduced and scoped. |
| Edge Function origins/secrets drift | Dashboard/function evidence and smoke tests. | No function or secret edits in this phase. |

## Deferred Until Confirmed

- CSP edits.
- Vercel env var changes.
- Vercel domain or deployment promotion changes.
- Supabase project/settings changes.
- Edge Function redeploys.
- Storage policy changes.
- Migration repair work.
- Runtime config refactors.
- Monitoring/vendor instrumentation.
- Production cutover.

## Safe Ordered Implementation Path

### Phase 1B: Vercel Dashboard Evidence Capture

Capture dashboard evidence only using the Slice 2E checklist:

- project name/link;
- production commit and branch;
- production domain;
- preview domain behavior;
- production/preview env var names only;
- production/preview Supabase target classification;
- deployed custom headers/CSP behavior;
- rollback/deployment history availability.

Do not change env vars, CSP, domains, deployments, Supabase settings, or code.

### Phase 1C: CSP/Header Alignment Design

Design the exact `connect-src` and security-header update only after Vercel evidence confirms the
intended production and preview Supabase targets.

No CSP edit should happen in the design slice unless explicitly promoted to an implementation slice.

### Phase 1D: Deployed Runtime Network Smoke

Run browser/network verification against deployed preview/production:

- unauthenticated app boot;
- login route;
- authenticated session;
- dashboard route;
- orders route;
- no mixed legacy/modern Supabase traffic;
- no CSP console failures.

### Phase 1E: Authenticated Operational Smoke Pack

Run the production smoke checklist for owner/admin and representative operational roles after
environment and CSP evidence are clear.

### Phase 1F: Storage, Edge Function, And CORS Smoke

Verify secure document upload/download/archive and invitation/resend flows with intended deployed
origins.

### Phase 1G: Role And Permission Runtime Validation

Verify route/action visibility and denial behavior for owner/admin, appraiser, reviewer, and
assignment-only access boundaries.

### Phase 1H: Build Warning And Monitoring Plan

Triage nonblocking build warnings and define the minimum production monitoring/watch procedure.

## Recommended Next Slice

Proceed with **Production Hardening & Runtime Confidence Phase 1B: Vercel Dashboard Evidence
Capture**.

Phase 1B should be manual evidence capture only. It should not change environment variables, CSP,
domains, deployments, Supabase settings, Edge Functions, runtime code, or production data.

## Phase 1B Vercel Evidence Capture

Phase 1B attempted Vercel evidence capture from local metadata and read-only Vercel CLI commands.
No Vercel settings, env vars, domains, deployments, Supabase settings, CSP headers, runtime code,
migrations, backend behavior, query behavior, workflow behavior, permissions, or production data
were changed.

Commands and local files inspected:

- `vercel whoami`;
- `vercel ls`;
- `vercel ls --yes`;
- `vercel env ls`;
- `vercel project --help`;
- `vercel project list`;
- `vercel project inspect project-falcon`;
- `vercel projects ls`;
- `vercel projects inspect project-falcon`;
- `vercel --version`;
- `find . -maxdepth 2 -path './.vercel/*' -type f -print`;
- `find /Users/christopherrossi/.vercel -maxdepth 2 -type f -print`;
- `git remote -v`;
- `git rev-parse HEAD`;
- `package.json`;
- `vite.config.js`;
- `vercel.json`;
- `dist/`.

### Confirmed Local Evidence

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Local Vercel CLI version | `47.0.6`. | Verified | None for this evidence item. |
| Local project link metadata | No repo-local `.vercel` directory or project-link file exists. No `/Users/christopherrossi/.vercel` directory was present. | Mismatch | Dashboard/project-specific evidence cannot be trusted from local link context until the intended project is manually confirmed. |
| Git remote | `origin` points to `https://github.com/Chrisrossi92/project-falcon.git`. | Verified | Compare manually with the Vercel project's connected Git repository. |
| Current local commit | `a0508b3115a41138bbee0e90463c5360e0f64a73`. | Verified | Compare manually with the latest production deployment commit. |
| Framework/build assumption from repo | Vite React app. `package.json` build command is `vite build`; Vite default output directory is `dist`; `dist/index.html` exists locally from a prior build. | Verified locally | Confirm Vercel dashboard framework/build/output settings match this assumption. |
| Repo deployment config | `vercel.json` contains SPA rewrite to `/index.html` and security headers. | Verified locally | Confirm deployed headers match repo config or identify dashboard-level overrides. |
| CSP Supabase host in repo config | `vercel.json` `connect-src` still allows legacy hosted Supabase `https://okwqhkrsjgxrhyisaovc.supabase.co`. | Mismatch | Do not edit yet. Confirm Vercel env targets and deployed headers first. |

### Unconfirmed Dashboard Evidence

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Vercel project name/link | Not available from local metadata. Read-only CLI project commands returned no usable project details from this unlinked workspace. | Needs decision | Manually inspect Vercel dashboard and record project name/link only. |
| Linked GitHub repo/branch | Local Git remote is known, but Vercel dashboard linkage was not visible from CLI evidence. | Needs decision | Confirm connected Git repository and production branch in Vercel. |
| Production deployment commit/tag | Not visible from CLI evidence. | Needs decision | Record production deployment SHA/tag from Vercel dashboard. |
| Production domain(s) | Not visible from CLI evidence. | Needs decision | Record safe domain names only. |
| Preview domain behavior | Not visible from CLI evidence. | Needs decision | Record whether previews exist and their safe domain pattern. |
| Production env var names | `vercel env ls` cannot run because the codebase is not linked to a Vercel project. No names were captured. | Needs decision | Record names only from dashboard. Do not record values. |
| Preview env var names | Not available from local metadata. | Needs decision | Record names only from dashboard. Do not record values. |
| Production Supabase target classification | Not available from local metadata. | Needs decision | Classify as `legacy`, `modern staging`, `future production`, or `unknown` by safe project ref only if visible. |
| Preview Supabase target classification | Not available from local metadata. | Needs decision | Classify as `staging`, `legacy`, `future production`, or `unknown` by safe project ref only if visible. |
| Deployment protection/settings | Not visible from CLI evidence. | Needs decision | Record safe summary only, such as enabled/disabled or requires-login if visible. |
| Deployed custom headers/CSP behavior | Not visible from CLI evidence because production/preview domains were not confirmed. | Needs decision | Fetch deployed response headers only after the correct domain is confirmed. |
| Rollback/deployment history availability | Not visible from CLI evidence. | Needs decision | Record whether rollback/promote/history controls are available. |

### Comparison To Expected Runtime Assumptions

- Expected modern validation target remains Supabase project `voompccpkjfcsmehdoqu`.
- Legacy hosted project `okwqhkrsjgxrhyisaovc` remains source/archive only and should not be the
  target for modern runtime behavior unless an explicit temporary compatibility decision is made.
- Local repo config is consistent with a Vite static frontend using `npm run build` / `vite build`
  and `dist` output.
- Local repo CSP is not aligned with the modern staging target because it still references the
  legacy Supabase host.
- Vercel dashboard production/preview env targets remain unknown because the workspace is not
  linked and CLI project/env commands did not expose project-specific evidence.

### Evidence Rules Reconfirmed

- Do not record secret values.
- Do not record anon key values.
- Do not record service-role values.
- Do not paste full env values into docs, terminal logs, screenshots, or chat.
- Do not attach screenshots containing env values or token previews.
- Project refs visible from Supabase URLs are safe to record only as target classification evidence.

### Phase 1B Conclusion

Phase 1B confirms repo-local Vercel assumptions and the CSP mismatch, but it does not complete
dashboard verification. The main result is an evidence gap: the local workspace is not linked to a
Vercel project, so project name, connected Git branch, deployment SHA, domains, env var names,
target Supabase refs, protection settings, deployed headers, and rollback history still require
manual dashboard inspection.

## Recommended Next Slice After Phase 1B

Proceed with **Production Hardening & Runtime Confidence Phase 1C: Manual Vercel Dashboard Evidence
Completion**.

Phase 1C should use the Vercel dashboard directly, or an explicitly linked/authorized read-only
Vercel tool, to fill the unresolved evidence table above. It should still make no Vercel changes,
env var edits, CSP edits, Supabase changes, runtime code changes, deployment promotions, or
production data changes.

## Phase 1C Manual Vercel Dashboard Evidence Attempt

Phase 1C attempted to complete manual Vercel dashboard evidence capture from the current agent
session. No Vercel settings, env vars, domains, branches, build settings, deployments, Supabase
settings, CSP headers, runtime code, migrations, backend behavior, query behavior, workflow
behavior, permissions, or production data were changed.

Access result:

- The current workspace still has no repo-local `.vercel` project-link metadata.
- The local Vercel CLI evidence from Phase 1B remains insufficient for dashboard-only proof.
- Browser dashboard automation was not available in this agent session because the `agent-browser`
  command is not installed.
- No authenticated Vercel dashboard session or Vercel dashboard connector was available to inspect
  private project settings.
- Therefore, Phase 1C could not truthfully complete dashboard evidence capture.

### Evidence Captured In Phase 1C

No new Vercel dashboard evidence was captured.

The following items remain unverified and must not be inferred from local repo files:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Vercel project name | Not accessible from current agent session. | Needs decision | Manually inspect Vercel dashboard or provide read-only dashboard evidence. |
| Connected GitHub repository | Not accessible from current agent session. | Needs decision | Confirm Vercel connected repo matches `Chrisrossi92/project-falcon`. |
| Production branch | Not accessible from current agent session. | Needs decision | Confirm production branch, expected to be `main` unless intentionally configured otherwise. |
| Latest production deployment commit SHA | Not accessible from current agent session. | Needs decision | Record full SHA from Vercel dashboard. |
| Latest production deployment date/time | Not accessible from current agent session. | Needs decision | Record dashboard-safe timestamp and timezone if visible. |
| Production domain(s) | Not accessible from current agent session. | Needs decision | Record domain names only. |
| Preview/deployment domain behavior | Not accessible from current agent session. | Needs decision | Record preview domain pattern or enabled/disabled summary. |
| Framework preset | Not accessible from current agent session. | Needs decision | Confirm Vercel framework preset; local repo indicates Vite. |
| Build command | Not accessible from current agent session. | Needs decision | Confirm dashboard setting; local repo build script is `vite build`. |
| Output directory | Not accessible from current agent session. | Needs decision | Confirm dashboard setting; local Vite default output is `dist`. |
| Install command | Not accessible from current agent session. | Needs decision | Record only if customized; do not change. |
| Node/runtime version | Not accessible from current agent session. | Needs decision | Record only if configured. |
| Production env var names | Not accessible from current agent session. | Needs decision | Record names only; do not record values. |
| Preview/development env var names | Not accessible from current agent session. | Needs decision | Record names only; do not record values. |
| Deployment protection/auth settings | Not accessible from current agent session. | Needs decision | Record safe enabled/disabled/summary only. |
| Rollback/deployment history availability | Not accessible from current agent session. | Needs decision | Record whether rollback/history controls are available. |

### Phase 1C Comparison To Expected Assumptions

- The local repo still supports the expected Vite static app assumption.
- The local `vercel.json` CSP risk remains unchanged: `connect-src` references legacy Supabase
  project `okwqhkrsjgxrhyisaovc`.
- Production and preview Supabase targets remain unknown because dashboard env evidence was not
  available.
- Production deployment commit, branch, domain, framework/build settings, protection settings, and
  rollback availability remain unknown.

### Phase 1C Safety Decision

Because dashboard evidence could not be captured, no CSP, env, domain, deployment, Supabase,
runtime, or production-readiness conclusion should be promoted from Phase 1C.

The correct next step is to provide dashboard access/evidence before implementation work. The
evidence can be supplied manually by a human reviewer using the table above, or captured by an
explicitly authorized read-only Vercel connector/browser session that can access the dashboard.

## Recommended Next Slice After Phase 1C

Proceed with **Production Hardening & Runtime Confidence Phase 1D: Vercel Dashboard Evidence
Handoff**.

Phase 1D should fill the unresolved table above from a human dashboard review or an explicitly
authorized read-only Vercel tool. It must still make no Vercel changes, env var edits, CSP edits,
Supabase changes, runtime code changes, deployment promotions, build setting changes, domain
changes, migrations, or production data changes.

## Phase 1D Vercel Dashboard Evidence Handoff Checklist

Phase 1D creates a user-executable manual dashboard checklist in
`docs/VERCEL_MANUAL_EVIDENCE_CHECKLIST.md`. This is a docs-only handoff for Chris to complete
inside the Vercel dashboard without changing deployed settings.

The checklist covers exact dashboard areas to inspect:

- Project Overview;
- Git settings;
- Domains;
- Environment Variables;
- Build & Development Settings;
- Deployment history;
- latest production deployment details;
- Protection / Security settings;
- deployed headers and CSP evidence.

The checklist records only safe evidence:

- Vercel project name;
- connected repository;
- production branch;
- latest production deployment SHA and date/time;
- production domains;
- preview/deployment domain behavior;
- framework preset;
- build command;
- output directory;
- install command if customized;
- Node/runtime version if configured;
- production env var names only;
- preview/development env var names only;
- deployment protection/auth settings summary;
- deployed header/CSP summary;
- rollback/deployment history availability.

Strict rules remain:

- do not reveal env values;
- do not reveal anon key values;
- do not reveal service-role values;
- do not change settings;
- do not redeploy;
- do not link the local repo to Vercel yet;
- do not edit CSP, env vars, Supabase settings, domains, branches, build settings, or deployment
  settings.

Known risk still tracked:

- repo `vercel.json` still contains legacy Supabase project `okwqhkrsjgxrhyisaovc` in CSP
  `connect-src`.

## Recommended Next Slice After Phase 1D

Proceed with **Production Hardening & Runtime Confidence Phase 1E: Vercel Evidence Review And CSP
Decision Plan** after Chris pastes back the completed safe dashboard evidence summary.

Phase 1E should classify the evidence into verified items, mismatches, and needs-decision items,
then recommend the exact next implementation slice. It should still make no Vercel changes, env var
edits, CSP edits, Supabase changes, runtime code changes, deployment promotions, build setting
changes, domain changes, migrations, or production data changes unless a later implementation slice
is explicitly approved.

## Phase 1F Live Production Runtime Network Check

Phase 1F inspected the deployed production app at `https://continentalres.com` using read-only
HTTP and headless Chrome runtime checks. No Vercel settings, Supabase settings, environment
variables, CSP headers, runtime code, deployments, backend behavior, query behavior, workflow
behavior, permissions, or production data were changed.

Evidence capture rules followed:

- hostnames and request categories only were recorded;
- no authorization headers, cookies, request payloads, response payloads, env values, anon keys, or
  service-role values were recorded in docs;
- no screenshots containing secrets were captured;
- production was not redeployed or modified.

### Commands / Surfaces Inspected

- `https://continentalres.com`;
- `https://continentalres.com/orders`;
- production response headers;
- deployed app shell HTML;
- deployed JavaScript asset host references;
- headless Chrome netlog for an unauthenticated `/orders` route load;
- clean headless Chrome netlog with background networking disabled for an unauthenticated `/orders`
  route load.

Authenticated Dashboard, Assignments, Calendar, and Clients route data loading was not completed in
this agent session because no production credentials were provided and no authenticated DevTools
session was available.

### Production Header Evidence

| Observed host / header area | Request category | Page where seen | Result |
|---|---|---|---|
| `continentalres.com` | App shell / static assets | `/`, `/orders` | HTTP 200 for app shell and assets. |
| `cdn.jsdelivr.net` | Public FullCalendar CSS CDN | App shell | Requested by deployed HTML; observed in netlog. Some stylesheet requests returned CDN 404 for the referenced FullCalendar CSS paths. |
| `okwqhkrsjgxrhyisaovc.supabase.co` | CSP `connect-src` allowlist host | Production response headers | Present in deployed CSP. |
| `voompccpkjfcsmehdoqu.supabase.co` | CSP / runtime host | Production response headers and unauthenticated netlog | Not observed. |

Deployed production CSP still has this Supabase network policy shape:

- `connect-src 'self' https://okwqhkrsjgxrhyisaovc.supabase.co`.

The modern staging Supabase host is not present in the deployed CSP.

### Supabase Runtime Host Evidence

| Supabase project host | Evidence type | Page where seen | Result |
|---|---|---|---|
| `okwqhkrsjgxrhyisaovc.supabase.co` | Deployed CSP response header | `/`, `/orders`, static assets | Observed. |
| `okwqhkrsjgxrhyisaovc.supabase.co` | Deployed JavaScript asset host reference | app bundle | Observed as the bundled Supabase URL host. |
| `okwqhkrsjgxrhyisaovc.supabase.co` | Actual unauthenticated API request | `/orders` headless route load | Not conclusively observed as an API call in the sanitized netlog; route resolved to sign-in/session-checking behavior without authenticated data loading. |
| `voompccpkjfcsmehdoqu.supabase.co` | Deployed CSP / deployed asset / unauthenticated netlog | `/`, `/orders` | Not observed. |

Interpretation:

- Production is not currently aligned with the expected modern staging runtime target
  `voompccpkjfcsmehdoqu`.
- The deployed production bundle and deployed CSP still point at / allow the legacy hosted project
  `okwqhkrsjgxrhyisaovc`.
- Removing the legacy Supabase host from CSP before changing production environment/runtime target
  would be unsafe because the current deployed bundle still references that legacy host.

### Google / Maps Evidence

| Hostname/domain | Request category | Page where seen | Result |
|---|---|---|---|
| `www.google.com` | Google Maps URL reference in deployed bundle; browser Google background traffic in netlog | App bundle / headless browser | Observed. |
| `accounts.google.com`, `clients2.google.com`, `clientservices.googleapis.com`, `safebrowsingohttpgateway.googleapis.com` | Chrome/browser background services during headless load | Headless browser | Observed, but not app-specific Google Maps usage. |
| Google Maps API route usage | Map-specific runtime feature | Not exercised | Not verified; unauthenticated Orders/login load did not exercise map views. |

Only hostnames and categories are recorded. Key-like query values from deployed bundle references
must not be copied into docs or chat.

### Phase 1F Limitations

- Browser DevTools with an authenticated production user was not available.
- Dashboard, Assignments, Calendar, and Clients authenticated data routes were not exercised.
- The clean headless route load confirmed deployed headers and app shell behavior, but did not prove
  authenticated Supabase API behavior.
- Netlog output includes some Chrome background Google service hosts even with reduced/background
  networking flags; those are recorded separately from app-specific Google Maps behavior.

### Phase 1F CSP Decision

Decision: **CSP cleanup is unsafe as a direct removal of the legacy Supabase host right now.**

Reason:

- deployed production CSP allows legacy Supabase project `okwqhkrsjgxrhyisaovc`;
- deployed production JavaScript bundle contains the legacy Supabase host;
- modern staging host `voompccpkjfcsmehdoqu` was not observed in deployed CSP or deployed asset
  evidence;
- authenticated route-level calls to the modern project were not observed.

Safe conclusion:

- Prepare a CSP cleanup plan only after production environment target evidence is corrected and
  verified.
- Do not remove `okwqhkrsjgxrhyisaovc.supabase.co` from production CSP until production
  `VITE_SUPABASE_URL` / deployed bundle no longer references the legacy project and authenticated
  route smoke confirms the intended Supabase host.
- If production is intentionally still legacy-backed, that should be documented as a temporary
  compatibility state rather than treated as modern staging alignment.

## Recommended Next Slice After Phase 1F

Proceed with **Production Hardening & Runtime Confidence Phase 1G: Production Supabase Target
Decision Plan**.

Phase 1G should decide whether production should remain temporarily legacy-backed or move toward
modern staging/future production. It should produce an ordered env/CSP/deployment verification plan
before any changes. It must still make no Vercel changes, env var edits, CSP edits, Supabase
changes, runtime code changes, deployment promotions, migrations, or production data changes unless
an explicit implementation slice is approved.

## Phase 1G Production Supabase Target Decision Plan

Phase 1G creates the decision plan for Falcon's production Supabase target before any environment,
CSP, deployment, or Supabase project change. This phase inspected local runtime configuration,
environment file availability, Supabase client setup, Vercel env-var names captured in the
checklist, and Phase 1F deployed production evidence.

No Vercel settings, environment variables, CSP headers, Supabase projects, migrations, deployments,
runtime code, backend behavior, query behavior, workflow behavior, permissions, or production data
were changed.

### Runtime Config Evidence

Local runtime configuration remains environment-driven:

- `src/lib/supabaseClient.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/pages/Dashboard.jsx` also creates a Supabase client directly from
  `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`; this is a
  review surface, but it does not hardcode a separate project target.
- `.env.local` exists locally; no `.env.example` or `.env.template` file was found in the inspected
  repo depth.
- Browser-facing map configuration uses `VITE_GOOGLE_MAPS_API_KEY`, with some components also
  tolerating `VITE_GOOGLE_MAPS_KEY` as a fallback name.
- The manual Vercel evidence checklist tracks these production/preview variable names only:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GOOGLE_MAPS_API_KEY`.

Phase 1F deployed evidence remains the current production signal:

- production CSP allows `okwqhkrsjgxrhyisaovc.supabase.co`;
- the deployed JavaScript bundle contains `okwqhkrsjgxrhyisaovc.supabase.co`;
- `voompccpkjfcsmehdoqu.supabase.co` was not observed in deployed CSP or deployed bundle evidence;
- authenticated production Supabase API calls were not captured, so dashboard/env proof is still
  required before final classification.

### Current Target Answers

| Question | Phase 1G answer | Confidence / required follow-up |
|---|---|---|
| Is `okwqhkrsjgxrhyisaovc` actually the current production Supabase project? | It is strongly indicated as the current deployed production runtime target because production CSP allows it and the deployed bundle contains it. | High for deployed bundle/header evidence; not final until Vercel env values are classified by safe project ref and authenticated API traffic is observed. |
| Is `voompccpkjfcsmehdoqu` intended to be staging only, or the future production target? | Current docs classify it as the modern/company-scoped staging validation target and reference architecture, not automatically final production. | Needs product/infrastructure decision before any production env change. |
| Is production supposed to point to a separate production Supabase project not yet identified? | Existing readiness doctrine prefers a deliberately created or identified clean final production project based on the modern architecture. That project remains TBD. | Blocked until project identity, schema replay, bootstrap, auth, storage, functions, and smoke evidence are captured. |
| Are recent polished deploys going live against legacy production data? | Current deployed evidence indicates the production bundle is legacy-targeted, so production UI changes are likely served against the legacy Supabase target when authenticated calls occur. | Needs authenticated production network capture and Vercel env classification before treating this as fully proven. |
| What evidence is required before changing `VITE_SUPABASE_URL` in Vercel? | See the cutover evidence list below. | Required before any env/CSP/deployment edit. |
| What smoke tests are required after any future env target change? | See the post-change smoke list below. | Required in preview first, then production if approved. |
| What rollback path exists if Supabase target change breaks production? | Restore previous Vercel env target and CSP allowlist, or promote/rollback to the last known-good deployment, while preserving data written during the attempted cutover for reconciliation. | Must be rehearsed and assigned before production change. |

### Decision Tree

#### 1. Keep Production On Legacy Temporarily

Choose this when production continuity is the priority and modern/final production target readiness
is not proven.

Allowed actions:

- leave production `VITE_SUPABASE_URL` and CSP unchanged;
- explicitly document production as temporarily legacy-backed;
- avoid deploying modern-only features that require the company-scoped schema unless they are
  hidden or unavailable in production;
- continue staging validation and target readiness work separately.

Stop conditions:

- do not remove `okwqhkrsjgxrhyisaovc.supabase.co` from production CSP;
- do not claim production is modern/company-scoped;
- do not retrofit modern features into the legacy schema.

#### 2. Prepare Migration To Modern Supabase

Choose this only if the team decides that the modern staging project, or a staging clone promoted
from it, is the intended next runtime target.

Required before production:

- prove the selected target has the required schema, permissions, grants, RLS, RPCs, storage,
  Edge Functions, auth settings, app users, company memberships, roles, and operational data;
- run preview deployment against that target first;
- update CSP in the same planned rollout to allow the selected target and remove legacy only after
  runtime calls no longer require it;
- complete smoke tests and rollback rehearsal before production promotion.

Risk:

- using the staging project as production can blur data ownership and operational confidence. A
  separate final production project remains cleaner unless explicitly rejected.

#### 3. Create Or Identify Separate Production Supabase

This remains the preferred clean production direction from the readiness docs.

Required steps:

- identify or create the final production Supabase project;
- replay/provision the modern migration chain intentionally;
- configure private storage, Edge Functions, function secrets, auth redirect URLs, and CORS origins;
- migrate/backfill production data from the legacy source through a reviewed process;
- bootstrap company, owner/admin app user mapping, memberships, role assignments, and permissions;
- connect Vercel production env vars only after preview or staging smoke has passed;
- update CSP to the final production host as part of the controlled deployment plan.

#### 4. Block Until Data / Parity Evidence Is Collected

Choose this when the team cannot prove which Supabase project should receive production traffic.

Blocking evidence gaps include:

- unknown or unapproved Vercel production `VITE_SUPABASE_URL` target classification;
- no confirmed final production project identity;
- no clean migration replay or production-like data migration evidence;
- no auth/app-user/company membership parity;
- no storage, Edge Function, CORS, or document-flow evidence;
- no preview smoke against the intended target;
- no rollback path.

### Evidence Required Before Changing `VITE_SUPABASE_URL`

Capture these items without recording secret values:

- Vercel production and preview env variable names and target classifications by safe project ref;
- final selected Supabase project ref and role: `legacy temporary`, `modern staging`, or
  `final production`;
- schema/migration replay evidence for the selected target;
- data migration/backfill counts and reconciliation from legacy to selected target;
- auth users, `public.users`, company membership, current-company helper, and role assignment
  verification;
- permission seed and RPC grant verification;
- private storage bucket, document RPC/Edge Function, and CORS verification;
- Edge Function secret-name presence and deploy status;
- Supabase Auth redirect URL and site URL confirmation;
- backup/restore or rollback evidence;
- preview deployment smoke against the selected target;
- production rollback owner and exact restore procedure.

### Required Smoke After Any Future Target Change

Run these smoke checks first in preview, then in production only after approval:

- app boot, login, logout, session persistence, and route guard behavior;
- owner/admin Dashboard load;
- Orders list, detail, create, edit, workflow transition, archive, cancel, void, Historical Orders,
  and Print Packet;
- Assignments received lane, sent lane, packet detail, and packet lifecycle actions;
- Calendar route and order navigation from calendar events;
- Clients list, detail, create/edit link behavior, and related orders;
- Team Access member list, invite, resend, cancel, role update, deactivate/reactivate where allowed;
- Owner Setup company profile save and readiness diagnostics;
- document list, upload, signed download, and archive if enabled for the target;
- activity and notification surfaces;
- Saved Views behavior;
- role-denial and company-scope/RLS spot checks;
- browser console/CSP checks;
- browser network host check confirming no unexpected mixed legacy/modern Supabase traffic.

### Rollback Path

Before a production env target change, define the rollback owner and exact sequence:

- restore prior Vercel `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values inside Vercel only,
  without copying values into docs;
- restore or preserve the previous CSP allowlist if CSP was changed;
- promote or redeploy the last known-good Vercel deployment if env restoration alone is
  insufficient;
- freeze or reconcile writes made during the attempted cutover window;
- keep the legacy project available as source/archive until retention and reconciliation policy is
  explicit;
- document the incident evidence without exposing tokens, cookies, keys, headers, or payloads.

### CSP Cleanup Decision After Phase 1G

CSP cleanup remains blocked as a direct legacy-host removal.

Safe CSP work depends on the selected target:

- if production remains legacy-backed temporarily, keep the legacy Supabase host in CSP;
- if production moves to modern staging or a final production project, add/verify the selected host
  during preview smoke and remove legacy only after the deployed bundle and authenticated network
  traffic no longer require it;
- do not broaden CSP with unreviewed wildcard origins.

## Recommended Next Slice After Phase 1G

Proceed with **Production Hardening & Runtime Confidence Phase 1H: Supabase Target Evidence Matrix
And Cutover Preconditions**.

Phase 1H should be docs/evidence-only. It should turn the Phase 1G decision tree into a filled
matrix for each candidate target: legacy temporary, modern staging, and final production. The matrix
should capture Vercel env classification, schema readiness, data parity, auth/user/company parity,
storage/function/CORS readiness, smoke status, and rollback readiness.

Phase 1H must still make no Vercel changes, env var edits, CSP edits, Supabase project changes,
deployments, migration changes, runtime code changes, backend/query/workflow/permission changes, or
production data changes unless a later explicit implementation slice is approved.

## Supabase Environment Architecture Plan

Supabase Environment Architecture & Migration Planning Phase 1A is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`.

The plan formalizes the environment architecture implied by the production hardening evidence:

- production is likely still legacy-backed by `okwqhkrsjgxrhyisaovc`;
- modern staging/reference remains `voompccpkjfcsmehdoqu`;
- final production remains TBD and should preferably be a clean, intentionally provisioned
  Supabase project;
- local development is env-driven and must be checked before any smoke or mutation task;
- preview deployments should become the first hosted validation boundary for future target changes.

It also defines the migration/cutover evidence categories that must be satisfied before any future
`VITE_SUPABASE_URL`, CSP, Vercel deployment, Supabase project, migration, storage, or Edge Function
change:

- schema parity;
- migration replay;
- RLS and grant parity;
- auth and user migration;
- storage buckets and files;
- Edge Functions;
- secrets;
- Realtime/subscription dependency review;
- seed and bootstrap data;
- production smoke tests;
- rollback plan.

The preferred direction remains: keep production stable on legacy temporarily, continue validating
the modern architecture in staging, and create or identify a separate clean final production
Supabase project before cutover.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1B: Supabase Target Evidence
  Matrix**.

That slice should be docs/evidence-only and should not change Supabase projects, Vercel settings,
env vars, CSP, deployments, migrations, runtime code, backend/query/workflow/permission behavior, or
production data.

## Supabase Target Evidence Matrix

Supabase Environment Architecture & Migration Planning Phase 1B is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`.

The evidence matrix covers these targets:

- legacy production/archive: `okwqhkrsjgxrhyisaovc`;
- modern staging/reference: `voompccpkjfcsmehdoqu`;
- local development: env-driven local Docker or hosted target;
- preview deployment: Vercel preview target unknown;
- future clean production: TBD.

Key conclusions:

- production is likely legacy-backed, but Vercel env classification and authenticated API-call
  evidence remain required;
- modern staging is confirmed as a reference/staging role, not production;
- local development must be checked per task because `.env.local` controls the target;
- preview deployment target behavior is unknown until Vercel dashboard evidence is captured;
- future clean production remains preferred but not identified, provisioned, replayed, or smoked;
- CSP cleanup and `VITE_SUPABASE_URL` changes remain blocked until target, schema, auth, storage,
  function, smoke, and rollback evidence are complete.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1C: Schema Head And Migration
  Replay Evidence Plan**.

That slice should define the exact safe evidence needed for schema head and migration replay status
without running migrations or changing any environment.

## Schema Head And Migration Replay Evidence Plan

Supabase Environment Architecture & Migration Planning Phase 1C is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md` with supporting checklist updates in
`docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`.

Current repository migration-head evidence:

- active migration directory: `supabase/migrations`;
- active SQL migration count: `79`;
- first active migration: `20260518000000_baseline_extensions_and_schema.sql`;
- current active migration head: `20260522090000_order_saved_views.sql`;
- archived migrations remain excluded from active replay;
- legacy schema/data/role dumps remain evidence/source material only.

Key decisions:

- file-system head evidence does not prove any Supabase project has applied the same head;
- legacy production is not expected to match the modern active head and must not be used as a
  direct retrofit target;
- modern staging/reference needs read-only migration-history and object-inventory evidence before
  it can be treated as cutover-ready;
- future clean production remains blocked until the project is identified and replay/provisioning
  proof exists;
- local/disposable replay remains the correct place to prove the chain, but prior full local reset
  remains blocked by the recorded storage image pull issue.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1D: Auth, App User, And Company
  Parity Evidence Plan**.

## Auth, App User, And Company Parity Evidence Plan

Supabase Environment Architecture & Migration Planning Phase 1D is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`, with owner/bootstrap evidence gates
added to `docs/PRODUCTION_BOOTSTRAP_PLAN.md`.

The plan locks the identity authority chain:

- `auth.users.id` is authentication identity;
- `public.users.id` is Falcon's canonical app-user identity;
- `public.users.auth_id` bridges app users to Supabase Auth users;
- `company_memberships` grants company membership state;
- `user_role_assignments` grants company-scoped role state;
- permission helpers, RLS, and security-definer RPCs remain runtime authority.

Required parity evidence now covers:

- auth user identity presence;
- `public.users.auth_id` mapping;
- owner/admin account mapping;
- active company membership;
- active role assignments and owner invariant;
- permission catalog and template role readiness;
- active company resolution;
- `rpc_current_user_app_context()` and `rpc_company_setup_context()` behavior;
- invitation prepare/finalize/accept lifecycle readiness;
- login/session smoke;
- rollback and reconciliation requirements for new users/invites.

Cutover remains blocked if representative users cannot map from Auth to app users, owner/admin lacks
active company membership, a company has no active owner, expected roles/permissions are missing,
current-company resolution masks missing membership, invitation acceptance activates the wrong
identity or role state, login/session smoke fails, or rollback cannot restore prior auth behavior.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1E: Storage, Edge Function, CORS,
  And Secret-Name Evidence Plan**.

## Storage, Edge Function, CORS, And Secret-Name Evidence Plan

Supabase Environment Architecture & Migration Planning Phase 1E is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`, with a production bootstrap evidence
gate added to `docs/PRODUCTION_BOOTSTRAP_PLAN.md`.

The plan locks the document storage authority model:

- `order-documents` must remain private;
- `public.order_documents` metadata and document RPCs remain the authorization authority;
- direct browser metadata writes remain denied;
- document list responses must not expose storage buckets, paths, object keys, upload tokens, or
  signed URLs;
- upload/download signed URLs are created only through Edge Functions after caller bearer-token and
  backend RPC authorization;
- archive remains soft metadata archive behavior, not hard storage-object deletion.

Required evidence now covers:

- bucket existence and privacy;
- storage policy readiness;
- document metadata table/RPC readiness;
- upload/download Edge Function deployment and secret-name readiness;
- archive/delete behavior boundaries;
- invitation/resend and active-company function readiness;
- optional email worker/sender readiness if email rollout is in scope;
- function `verify_jwt` settings review;
- CORS/app-origin and preview-domain expectations;
- safe function log review;
- expected failure modes;
- storage/function smoke requirements;
- rollback and reconciliation requirements for metadata rows, storage objects, invitations, and
  queued/sent emails.

Cutover remains blocked if the bucket is missing or public, document RPCs/grants are missing, direct
storage or metadata access bypasses backend authority, functions are undeployed or missing required
secret names, CORS/origin behavior is not aligned with selected app origins, function JWT settings
are unexplained, function logs cannot be reviewed safely, or rollback cannot reconcile files,
metadata, invitations, and emails.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1F: Preview Deployment Target,
  CSP, And Smoke Evidence Plan**.

## Preview Deployment Target, CSP, And Smoke Evidence Plan

Supabase Environment Architecture & Migration Planning Phase 1F is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`, with preview smoke gates added to
`docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`.

The plan defines preview deployments as the first hosted validation boundary before any production
Supabase target, env var, CSP, deployment, storage, function, or cutover change.

Required preview evidence now covers:

- Vercel preview env target classification;
- preview deployment URL/domain and commit;
- preview `VITE_SUPABASE_URL` target by project ref only;
- selected target role: modern staging, disposable rehearsal, final candidate, legacy production, or
  unknown;
- preview CSP `connect-src` expected host;
- deployed preview bundle Supabase host evidence;
- unauthenticated app boot smoke;
- authenticated login/session smoke;
- owner/admin current-company context smoke;
- Orders, Clients, Calendar, Assignments, and representative detail route smoke;
- Team Access / Owner Setup smoke where safe fixture data exists;
- storage/function smoke where the target supports document flows;
- browser console and CSP/CORS failure review;
- network host review for mixed legacy/modern calls;
- rollback/no-promotion criteria.

Production env/CSP cutover remains blocked if the preview target is unknown, preview env target and
CSP do not match the selected project, the deployed bundle contains an unexpected Supabase host,
owner/admin login/current-company smoke fails, core operational routes fail outside known fixture
gaps, document/function smoke fails where documents are in scope, or rollback/deployment history and
env restoration remain unproven.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1G: Preview Deployment Evidence
  Capture**.

## Preview Deployment Evidence Capture

Supabase Environment Architecture & Migration Planning Phase 1G is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`.

Read-only evidence captured:

- Vercel CLI is authenticated as `chrisrossi92`;
- Vercel project visible through CLI is `chris-projects-e06c973e/project-falcon`;
- preview deployments exist for `project-falcon`;
- latest listed preview deployment:
  - URL: `https://project-falcon-n440jf7ix-chris-projects-e06c973e.vercel.app`;
  - deployment id: `dpl_3DHd33U5jGCWYwzZNr99JiTXwzDh`;
  - target: `preview`;
  - status: Ready;
  - created: `Mon Apr 13 2026 12:31:00 GMT-0400`;
  - branch-style alias:
    `https://project-falcon-git-runtime-stabi-c53f53-chris-projects-e06c973e.vercel.app`.

Preview evidence limitations:

- preview commit SHA was not shown in CLI inspect output;
- preview env target was not visible, so preview `VITE_SUPABASE_URL` remains unclassified;
- preview app shell, app CSP, static assets, and deployed bundle were blocked by Vercel
  Authentication;
- unauthenticated preview app boot could not reach Falcon runtime;
- authenticated preview smoke was not available;
- the newest preview deployment listed is 40 days old relative to this evidence capture.

Preview classification: **preview evidence incomplete**.

The preview cannot currently be classified as safely isolated, legacy-backed, staging-backed, or
mixed/unsafe because Supabase target, CSP, bundle, and runtime network evidence remain unavailable.

Production env/CSP cutover remains blocked until a current preview deployment for the intended
commit is inspectable, preview target is classified by project ref, preview CSP and bundle host
references are captured, and unauthenticated/authenticated preview smoke passes.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1H: Current Preview Access And
  Target Classification**.

## Current Preview Access And Target Classification Plan

Supabase Environment Architecture & Migration Planning Phase 1H is complete in
`docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`.

Phase 1H keeps preview blocked as a production-cutover gate until Falcon has a current, inspectable
preview deployment for the intended `main` commit or candidate branch.

Preview access decision path:

1. Use an existing current preview only if Vercel evidence proves URL, deployment id, commit SHA,
   branch, created time, target, and Ready status.
2. Use a manually identified dashboard preview if it matches the intended commit or branch and does
   not require redeploying.
3. Prepare a current preview generation plan for a later approved slice if no current preview
   exists.
4. Keep preview blocked if there is no safe current preview or no approved access path through
   Vercel Authentication.

Required evidence before preview smoke:

- current preview URL and branch alias;
- current preview deployment id, commit SHA, branch, status, and creation time;
- Vercel Authentication/protection status;
- approved access method for app-shell inspection;
- preview env var names only;
- preview `VITE_SUPABASE_URL` project ref only;
- preview CSP `connect-src` Supabase host;
- deployed preview bundle Supabase host reference;
- unauthenticated app boot evidence;
- authenticated smoke availability and personas;
- browser console/CSP/CORS baseline;
- mixed-host network review;
- no-promotion criteria.

Allowed ways to handle preview protection:

- inspect with an authenticated browser session owned by an approved reviewer;
- use a safe Vercel-provided preview access path if available and explicitly approved;
- inspect dashboard/deployment details if app-shell access is unavailable;
- keep preview blocked if no safe access exists.

Disallowed in this phase:

- disabling preview protection;
- changing protection settings;
- generating or sharing long-lived bypass tokens in docs or chat;
- recording cookies, bearer tokens, auth links, nonces, env values, anon keys, service-role keys,
  request payloads, response payloads, or secret-bearing screenshots.

Preview classification remains **preview evidence incomplete** until current preview access and
target classification evidence are captured.

Recommended next Supabase-specific slice:

- **Supabase Environment Architecture & Migration Planning Phase 1I: Current Preview Access And
  Target Classification Evidence Capture**.
