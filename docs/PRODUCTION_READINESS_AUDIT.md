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
