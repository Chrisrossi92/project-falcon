# Production Bootstrap Plan

## Purpose

Falcon should design the clean-production bootstrap sequence before implementation. The bootstrap
must create a fresh production Supabase target, apply the modern company-scoped architecture,
configure storage/functions/auth, establish first-owner/company access, connect Vercel only after
validation, and smoke-test critical governed flows before traffic moves.

This is a planning document. It does not create a live production project, run migrations, change
Supabase or Vercel settings, deploy Edge Functions, change storage policies, change environment
variables, modify Git tags, mutate data, or change runtime behavior.

Related doctrine:

- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`
- `docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`
- `docs/STAGING_COMPANY_SCOPE_MIGRATION_PLAN.md`
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

## Bootstrap Principles

- Build production from the modern company-scoped architecture, not from legacy-schema retrofits.
- Use a clean, intentionally named production Supabase project after replay confidence exists.
- Keep the legacy hosted project `okwqhkrsjgxrhyisaovc` available as source/archive until cutover is
  complete and retention policy is explicit.
- Treat modern staging project `voompccpkjfcsmehdoqu` as the reference validation target, not the
  automatic final production project.
- Require migration replay confidence before bootstrapping production.
- Roll back by environment recreation or traffic/env restoration, not by partial mutation or reverse
  migration.

## Bootstrap Stage Sequence

### 1. Create Fresh Supabase Project

Goal: provision an intentionally named clean production project.

Checklist:

- choose region, project name, organization ownership, billing owner, and backup/PITR posture;
- record production project ref;
- store production URL, anon key, and service-role key only in approved secret stores;
- confirm no user traffic points at the project;
- confirm the project is not the legacy hosted project and not temporary staging.

Exit gate:

- project exists, is empty/clean, and has backup/recovery posture documented.

### 2. Apply Migrations

Goal: install the modern schema and governance foundation through the validated migration path.

Checklist:

- use the process from `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`;
- apply active migrations from `supabase/migrations` only;
- confirm baseline/migration-history handling is intentional;
- confirm current migration head is applied;
- reload PostgREST schema cache if needed;
- capture migration logs and applied-version inventory.

Exit gate:

- migrations complete without skipped files, weakened grants, manual schema patches, or unresolved
  dependency errors.

### 3. Verify Extensions / Enums / Constraints

Goal: prove database assumptions match the application and RPC contracts.

Checklist:

- verify required extensions for UUID and token/random helper behavior;
- verify order, document, invitation/member, and saved-view constraints;
- verify status values support active workflow and terminal lifecycle states;
- verify invalid enum/check/filter inputs fail closed;
- verify constraint names and behavior are consistent with migration replay evidence.

Exit gate:

- representative constraint and invalid-input checks pass without direct table shortcuts.

### 4. Seed Permissions / System Rows

Goal: establish permission, role, company, and system-reference data needed by the app.

Checklist:

- verify permission catalog rows exist;
- verify template roles exist;
- verify lifecycle permissions `orders.archive`, `orders.cancel`, and `orders.void`;
- verify workflow/document/notification/member/relationship/assignment permissions;
- verify system rows needed by current-company and setup flows;
- verify authenticated execute grants for browser-callable RPCs only.

Exit gate:

- owner/admin, appraiser, and reviewer role expectations can be satisfied through seeded data and
  role assignments.

### 5. Configure Storage Buckets / Policies

Goal: prepare private document storage without weakening document governance.

Checklist:

- create/verify private `order-documents` bucket;
- verify no public bucket access;
- verify storage policies align with signed upload/download model;
- verify document metadata remains the authorization authority;
- confirm storage paths are never the access-control model.

Exit gate:

- bucket privacy and policy behavior pass before upload/download testing.

### 6. Deploy Edge Functions

Goal: deploy service-role mediated functions after database contracts exist.

Required functions for current governed scope:

- `order-document-upload-url`;
- `order-document-download-url`;
- `invite-company-member`;
- `resend-company-member-invite`;
- `set-active-company` if active setup/switching flows require it;
- email worker/sender functions only if the rollout includes those flows.

Checklist:

- configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`;
- configure app-origin values such as `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`, or `APP_URL`;
- deploy functions after dependent RPCs exist;
- review function logs during smoke tests;
- confirm missing-secret and authorization failures fail closed.

Exit gate:

- required functions deploy and invoke against the production target without CORS, secret, or RPC
  errors.

### 7. Configure Auth / Redirects

Goal: make login and invite acceptance work only for intended production/preview/local origins.

Checklist:

- set production site URL and allowed redirect URLs;
- include invite acceptance route support for `/accept-invite/:invitationId`;
- intentionally allow or deny Vercel preview domains;
- configure OAuth/provider callbacks if applicable;
- keep legacy auth settings stable until traffic cutover.

Exit gate:

- owner/admin login and invitation redirect flows work in the intended production preview.

### 8. Create First Owner / Company

Goal: establish initial company ownership and runtime current-company context.

Checklist:

- create or verify canonical production company row;
- create or import owner/admin auth user;
- create or verify app-user row and auth mapping;
- create active company membership;
- create active owner/admin role assignment;
- verify `current_company_id()` resolves for owner/admin;
- verify `rpc_current_user_app_context()` returns safe context.

Exit gate:

- owner/admin can sign in, resolve current company, and load Owner Setup/Team Access context.

### 9. Verify Admin Bootstrap

Goal: prove the first owner/admin can manage the production tenant.

Checklist:

- Owner Setup loads;
- Team Access member list loads;
- invite, resend, cancel, role update, and deactivate/reactivate paths work where enabled;
- owner/admin can create and edit orders through RPC paths;
- owner/admin can read dashboard, Orders, clients, activity, notifications, and files;
- owner/admin cannot bypass documented lifecycle/document governance.

Exit gate:

- admin bootstrap is usable without direct table writes or service-role manual repairs.

### 10. Connect Vercel Production Env

Goal: connect the frontend only after the database, auth, storage, function, and owner bootstrap
stages pass.

Checklist:

- set production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the final production project;
- ensure no service-role key is browser-exposed;
- set required browser-facing keys such as maps keys;
- confirm Vercel production domain is included in function origin configuration;
- verify GitHub `main`, release tag/commit, and Vercel production deployment source are recorded;
- keep rollback env values for legacy/project fallback available.

Exit gate:

- a production preview or controlled production deployment can load against the final project and
  run smoke tests.

### 11. Smoke-Test Critical Flows

Goal: prove core governed surfaces work before traffic is treated as cut over.

Use `docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md` as the manual execution checklist for this stage.
Production Readiness Slice 1E keeps smoke validation manual and does not add automated tests.

Required smoke areas:

- login and current-user app context;
- dashboard KPIs;
- Orders list/detail/create/edit;
- workflow transitions through canonical RPCs;
- lifecycle actions archive/cancel/void where permissioned;
- saved views list/apply/save/delete;
- Historical Orders readback;
- Order Detail print packets;
- Order Detail Files upload/download/archive;
- document metadata privacy checks;
- activity timeline and note behavior;
- notifications read/mark/dismiss;
- clients and AMC flows;
- Team Access and invitation flows;
- owner/admin plus representative appraiser/reviewer scopes.

Exit gate:

- critical flows pass without weakening RLS, exposing storage internals, adding direct table writes,
  or manually mutating rows outside approved bootstrap steps.

## Bootstrap Order Dependencies

- Migrations must run before seed/permission verification.
- Permission and system rows must exist before owner/admin operational testing.
- Current-company helpers and memberships must exist before order/client/document smoke tests.
- Storage bucket and policies must exist before upload/download testing.
- Document RPCs and storage must exist before document Edge Function smoke tests.
- Edge Functions must be deployed before upload/download/invite browser smoke tests.
- Auth/redirect settings must be configured before login and invitation acceptance testing.
- Owner/company bootstrap must pass before operational testing.
- Vercel production env must not point at the final project until database, storage, functions,
  auth, and owner/admin bootstrap have passed.

## Required Manual Verification Points

RPC access:

- intended browser-callable RPCs are executable by `authenticated`;
- service-role-only/quarantine functions are not executable by normal app roles;
- invalid/cross-company calls fail closed.

RLS behavior:

- broad `anon` access remains blocked;
- direct table writes remain blocked where RPC-only governance requires it;
- current-company visibility works;
- cross-company visibility and mutation attempts fail.

File upload/download:

- upload prepare/finalize succeeds only for authorized users;
- signed download succeeds only through the approved Edge Function path;
- list responses do not expose storage paths, bucket names, object keys, or signed URLs;
- archive uses backend RPC and preserves document history.

Workflow transitions:

- canonical Smart Actions use `rpc_transition_order_status(...)`;
- unauthorized transitions fail;
- activity/notification behavior matches current doctrine.

Lifecycle actions:

- archive/cancel/void require matching permissions;
- actions preserve history and do not delete documents/activity/order numbers;
- active lists exclude retired lifecycle rows as designed.

Saved views:

- saved views are user/company scoped;
- filters match allowlist;
- direct table access is blocked;
- applying views changes URL/query state only.

Dashboard KPIs:

- active metrics exclude archived/cancelled/voided rows;
- dashboard links preserve governed active filters;
- no hidden historical leakage.

Historical Orders:

- read-only route loads archived/cancelled/voided rows intentionally;
- no restore/reopen/unarchive/hard-delete actions exist;
- links preserve-history Order Detail readback.

Print packets:

- print preview is read-only;
- no mutation controls, document downloads, signed URLs, or file contents appear;
- lifecycle notices and document category counts render.

## Rollback Expectations

- Rollback is by environment recreation, project restore, or frontend env/deployment restoration.
- Do not partially mutate production to undo failed bootstrap.
- Do not reverse-migrate the final production project as the primary rollback plan.
- Keep the legacy hosted project available as archive/source until cutover is complete and retention
  policy is explicit.
- Keep failed bootstrap targets intact long enough for forensic review before disposal.
- Capture writes created during a failed cutover and decide explicitly whether to discard, replay,
  or reconcile them.

Required rollback references:

- pre-cutover Git tag/commit;
- post-bootstrap Git tag/commit;
- Vercel deployment id;
- Supabase project ref;
- migration head/version;
- backup/PITR snapshot id or dump path;
- environment variable snapshot location.

Baseline/release tags to preserve or verify:

- `governance-baseline-v1`;
- `product-expansion-foundation-v1`;
- `operations-dashboard-foundation-v1`;
- `operational-ux-foundation-v1`;
- `operational-timeline-foundation-v1`;
- `saved-views-foundation-v1`;
- `document-experience-foundation-v1`.

Migration replay confidence is required before production bootstrap. If clean replay validation is
missing, production bootstrap remains a no-go.

## Explicit Non-Goals For Slice 1D

- No live production project creation.
- No Supabase project changes.
- No Vercel changes.
- No runtime changes.
- No migrations.
- No Edge Function deployment.
- No storage bucket or policy changes.
- No environment variable or secret changes.
- No Git branch or tag changes.
- No production data mutation.
