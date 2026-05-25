# Supabase Environment Architecture And Migration Plan

## Purpose

This plan defines Falcon's Supabase environment strategy before any environment variable, CSP,
deployment, project, migration, or production data change. It exists to separate current runtime
facts from future target decisions and to prevent accidental production disruption while Falcon
moves from the legacy hosted project toward a modern company-scoped production architecture.

This is documentation and planning only. It does not change Supabase projects, Vercel settings,
environment variables, CSP headers, deployments, migrations, runtime code, backend behavior, query
behavior, workflow behavior, permissions, RLS, storage, Edge Functions, secrets, or production data.

## Inspected Sources

Supabase Environment Architecture & Migration Planning Phase 1A inspected:

- `supabase/config.toml`;
- active migrations under `supabase/migrations/`;
- archived migrations and dumps under `supabase/migrations_archive/` and `supabase/schema_dumps/`;
- Edge Functions under `supabase/functions/`;
- local environment file presence;
- `src/lib/supabaseClient.js`;
- `src/pages/Dashboard.jsx`;
- `vercel.json`;
- `docs/PRODUCTION_HARDENING_RUNTIME_CONFIDENCE.md`;
- `docs/PRODUCTION_READINESS_AUDIT.md`;
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`;
- `docs/FINAL_PRODUCTION_CUTOVER_PLAN.md`;
- `docs/PRODUCTION_MIGRATION_REPLAY_CHECKLIST.md`;
- `docs/PRODUCTION_BOOTSTRAP_PLAN.md`;
- `docs/PRODUCTION_SMOKE_TEST_CHECKLIST.md`.

Secret-bearing files were not read or copied into this plan.

## Current Known Projects

| Project / Environment | Known Ref | Current Role | Decision Status |
|---|---|---|---|
| Legacy hosted production | `okwqhkrsjgxrhyisaovc` | Likely current deployed production runtime target and legacy production/archive source. Phase 1F production CSP and bundle evidence reference this host. | Keep stable until an approved cutover target is proven. Do not retrofit modern schema/features into it. |
| Modern staging/reference | `voompccpkjfcsmehdoqu` | Modern company-scoped validation target used by local/runtime verification and architecture work. | Reference/staging only until explicitly promoted or cloned into a final target. |
| Future clean production | TBD | Preferred long-term production Supabase project based on the modern architecture. | Not identified/provisioned in current evidence. |
| Local development | Local Docker or hosted target via `.env.local` | Developer validation environment. Current local app assumptions use Vite env vars and previously resolved to modern staging. | Must be checked before each runtime/smoke task. |
| Preview deployments | TBD Vercel preview env | Future validation boundary for target changes before production. | Requires Vercel dashboard evidence and explicit env target classification. |

## Phase 1B Supabase Target Evidence Matrix

Phase 1B converts the known environment strategy into an evidence matrix. The matrix deliberately
separates confirmed evidence from assumptions, preferences, unknowns, and blockers. It does not
invent dashboard, Supabase project, migration, auth, storage, secret, or smoke evidence that has not
been captured.

Status language:

- **Confirmed**: directly supported by inspected repository docs/config or prior recorded runtime
  evidence.
- **Likely**: strongly indicated by recorded evidence, but still missing one or more proof points.
- **Preferred**: architectural direction, not proof that the environment exists or is ready.
- **Unknown**: not proven by current evidence.
- **Blocked**: cannot proceed safely until required evidence is collected.
- **Not applicable**: not expected to apply to that environment in current architecture.

### Target Summary

| Target | Project Ref | Intended Role | Current Evidence Source | Overall Status |
|---|---|---|---|---|
| Legacy production/archive | `okwqhkrsjgxrhyisaovc` | Current production continuity and legacy archive/source until cutover. | Phase 1F deployed CSP/bundle evidence; `vercel.json`; legacy schema dump docs. | Likely current production runtime; blocked for modern feature retrofit. |
| Modern staging/reference | `voompccpkjfcsmehdoqu` | Modern company-scoped validation/reference environment. | Local runtime verification docs; environment parity docs; staging baseline docs. | Confirmed reference role; not confirmed production. |
| Local development | Local Docker or hosted target via `.env.local` | Developer validation and local smoke. | `.env.local` presence; local runtime docs; Vite env-driven client setup. | Confirmed env-driven; exact target must be checked per task. |
| Preview deployment | Unknown Vercel preview target | First hosted validation boundary for future target/CSP/env changes. | Vercel manual checklist only; no dashboard evidence captured. | Unknown / blocked pending Vercel evidence. |
| Future clean production | TBD | Preferred final production project based on modern architecture. | Production readiness and cutover docs. | Preferred but not identified or provisioned. |

### Detailed Evidence Matrix

| Evidence Area | Legacy Production / Archive | Modern Staging / Reference | Local Development | Preview Deployment | Future Clean Production |
|---|---|---|---|---|---|
| Project ref | Confirmed ref: `okwqhkrsjgxrhyisaovc`. | Confirmed ref: `voompccpkjfcsmehdoqu`. | Unknown per task unless local Docker or `.env.local` is inspected. | Unknown. | TBD. |
| Intended role | Legacy production continuity and archive/source until cutover. | Modern company-scoped validation/reference. | Developer validation; may point local or staging. | Future hosted smoke boundary. | Preferred final production target. |
| Evidence source | Production CSP/bundle evidence, `vercel.json`, legacy dump docs. | Local runtime evidence and environment parity docs. | `.env.local` presence, Vite env client setup, local runtime evidence. | Manual Vercel checklist only. | Production readiness and final cutover planning docs. |
| Schema head status | Confirmed older/non-company schema shape from `20260517` remote dumps; not modern head. | Modern architecture reference, but current cloud migration head still needs dashboard/SQL evidence before cutover use. | Local active chain exists through `20260522090000_order_saved_views.sql`; exact local DB head unknown unless queried. | Unknown. | Blocked; project not identified. |
| Migration replay confidence | Not suitable for direct modern replay/retrofit as first move. | Needs evidence if treated as cutover candidate. | Prior full local reset was blocked by storage image pull; targeted checks do not replace full replay. | Unknown. | Blocked pending project and replay/provisioning proof. |
| RLS/RPC confidence | Legacy behavior only; modern company-scoped RLS/RPC confidence not assumed. | Modern RLS/RPC behavior is the reference direction; production-readiness proof still required. | Depends on local target and current reset state. | Unknown. | Blocked pending replay and verification. |
| Auth/user parity | Existing production auth likely lives here, but export/import parity is not captured in this matrix. | Staging auth/user parity with production is unknown. | Depends on local/staging credentials; must be checked per smoke task. | Unknown. | Blocked pending auth migration plan and proof. |
| Storage readiness | Legacy storage/source inventory needs capture; modern `order-documents` must not be retrofitted. | Document storage readiness needs staging evidence before production use. | Local storage health has had tooling/image blockers; exact state unknown per run. | Unknown. | Blocked pending bucket/policy/object migration and smoke. |
| Edge Function readiness | Existing legacy function state unknown; do not deploy modern document functions as retrofit. | Required functions exist in repo, but staging deployment/status evidence is still needed. | Functions exist locally in repo; served/deployed status unknown unless tested. | Unknown. | Blocked pending deployment and secret/CORS setup. |
| Secret-name readiness | Unknown; no secret values recorded. | Unknown; secret values/names require dashboard/project evidence. | `.env.local` exists, but values are not recorded; secret-bearing files were not read. | Unknown. | Blocked pending secret-name inventory in approved stores. |
| CSP/env status | Production CSP and deployed bundle point to/allow legacy host; likely current production runtime target. | Local runtime previously resolved here; production CSP/bundle do not include this host. | Vite env-driven; local Vite does not apply Vercel CSP. | Unknown until Vercel dashboard/deployed preview evidence. | Blocked; no host exists to allow yet. |
| Smoke-test status | Production app appears healthy enough to serve deployed app shell; authenticated data smoke incomplete. | Local/runtime evidence exists; full authenticated staging smoke still required. | Previous local route smoke was unauthenticated for protected routes; authenticated smoke remains task-specific. | Not run. | Not possible until project exists. |
| Rollback readiness | Legacy should remain available as archive/source and rollback target. Exact Vercel env restoration procedure still needs dashboard evidence. | Rollback role depends on whether staging is promoted; not defined. | Not a production rollback target. | Preview rollback uses Vercel deployment/env history, currently unknown. | Blocked pending project, backup, and rollback runbook. |
| Blocking gaps | Cannot receive modern feature retrofit; env/dashboard/authenticated API proof still incomplete. | Not approved as production; needs schema/auth/storage/function/smoke evidence if candidate. | Must inspect target before each task; clean replay confidence still incomplete. | Vercel project/env/domain/header evidence missing. | Project identity, replay, data migration, auth, storage, functions, secrets, smoke, and rollback all missing. |
| Next evidence needed | Vercel production env classification, authenticated production network host proof, backup/archive inventory. | Supabase dashboard/SQL head evidence, auth/user/company parity, storage/function smoke, preview target decision. | Per-task `.env.local` target check, local reset/replay status, authenticated smoke user availability. | Manual Vercel dashboard evidence, preview env target classification, deployed CSP/header check. | Create/identify project, replay/provision schema, migrate data in dry run, configure auth/storage/functions/secrets, run preview smoke. |

### Matrix Conclusions

- Production should not be assumed modern. Current evidence points to legacy runtime alignment.
- Modern staging should not be assumed production. It is a reference target until a promotion or
  clean-production decision is explicitly made.
- Preview deployments are currently the least evidenced runtime layer and need Vercel dashboard
  classification before they can be used for cutover rehearsal.
- Future clean production is still an architectural preference, not an existing verified target.
- CSP cleanup remains blocked because the active production runtime evidence still references the
  legacy Supabase host.
- Changing `VITE_SUPABASE_URL` without schema, auth, storage, function, smoke, and rollback
  evidence would create avoidable production risk.

## Phase 1C Schema Head And Migration Replay Evidence Plan

Phase 1C defines how Falcon should prove schema head and migration replay parity before any future
cutover. This phase inspected migration filenames and existing replay/checklist docs only. It did
not run migrations, connect to any database, execute `supabase db reset`, link a Supabase project,
or inspect secret-bearing values.

### Active Migration Inventory

Current repository evidence:

- active migration directory: `supabase/migrations`;
- expected active SQL migration count: `79`;
- first active migration:
  `20260518000000_baseline_extensions_and_schema.sql`;
- baseline grant/policy migration:
  `20260518001000_baseline_rls_policies_triggers_grants.sql`;
- baseline static seed migration:
  `20260518002000_baseline_static_seed_data.sql`;
- current active migration head:
  `20260522090000_order_saved_views.sql`;
- archived migrations are outside the active chain under `supabase/migrations_archive/`;
- legacy remote schema/data/role dumps are outside the active chain under `supabase/schema_dumps/`.

The active head is file-system evidence only. It does not prove that local, staging, preview, legacy,
or future production databases have applied the same head.

### Migration Ordering And Risk Notes

The active chain is intentionally ordered as:

- curated baseline schema, RLS/policies/triggers/grants, and static seed data;
- company foundation and default-company compatibility;
- company-scoped order/client/calendar/activity/notification read/write hardening;
- membership, roles, permissions, current-company helpers, and explicit grants;
- relationship and cross-company assignment packet foundations;
- bootstrap/setup/team/invitation/member RPC foundations;
- client/order form and management RPCs;
- current-user/app-context and legacy role quarantine;
- order numbering, direct-write restriction, activity identity repair;
- document metadata/private bucket/upload/download/archive foundations;
- archive/cancel/void lifecycle RPCs and permission seeds;
- saved views.

Replay risk categories:

- baseline migrations are large and must run before incremental hardening migrations;
- company/current-user helpers are prerequisites for later RLS/RPC migrations;
- document migrations depend on metadata-authorized storage and Edge Function contracts;
- lifecycle and saved-view migrations depend on prior order governance and permission foundations;
- archived legacy migrations must not be reintroduced into the active replay path.

### Archived Migration Exclusion Rules

Archived migrations are evidence and historical context only.

Rules:

- do not copy archived migrations back into `supabase/migrations`;
- do not replay archived migrations into modern staging or final production as part of the active
  chain;
- do not treat archived migration success/failure as current-head proof;
- use archived migrations and legacy dumps only to understand legacy schema/source data and to
  design data migration/reconciliation steps.

### Schema Dump Comparison Expectations

Legacy dumps under `supabase/schema_dumps/` are source/archive evidence.

Expected comparison:

- compare legacy dump object inventory against the modern target only to identify data mapping and
  compatibility gaps;
- confirm legacy dump shape remains older/non-company and not modern head;
- do not patch modern migrations to fit the legacy dump;
- do not patch legacy production to satisfy modern document/company-scoped features;
- record table counts and object inventories before any data migration dry run.

### `supabase_migrations.schema_migrations` Verification Approach

For any non-legacy modern target, collect read-only evidence that:

- the migration history table exists;
- applied versions match the 79 active migration filenames in timestamp order;
- the first applied version is `20260518000000`;
- the current applied head is `20260522090000`;
- no archived migration versions appear as active applied versions;
- no active migration is missing or out of order.

Safe evidence format:

| Target | Expected count | Observed count | Expected head | Observed head | Status | Notes |
|---|---:|---:|---|---|---|---|
| Local/disposable | 79 | TBD | `20260522090000` | TBD | unknown | Capture after read-only query or replay. |
| Modern staging/reference | 79 | TBD | `20260522090000` | TBD | unknown | Requires Supabase dashboard/SQL evidence. |
| Future clean production | 79 | TBD | `20260522090000` | TBD | blocked | Project not identified. |

Do not run these checks against legacy production as a modernization proof. Legacy production is
expected not to match the modern active head.

### Target-Specific Schema Head Proof

#### Legacy Production / Archive

Expected status:

- legacy schema is older/non-company and should not match the modern active head;
- `supabase/schema_dumps/20260517_remote_public_schema.sql` is the current repo evidence source for
  legacy shape;
- production bundle/CSP evidence indicates production likely still targets this project.

Required proof before cutover:

- capture legacy table/function/view/policy inventory for source mapping;
- capture table counts and auth/storage inventories;
- confirm legacy remains available as rollback/source archive;
- explicitly do not require legacy to apply `20260522090000_order_saved_views.sql`.

Disqualifier for direct retrofit:

- if applying the modern chain to legacy requires skipping migrations, weakening RLS, broadening
  grants, hand-editing current-company helpers, or adapting document security to legacy order
  visibility, direct retrofit is unsafe.

#### Modern Staging / Reference

Expected status:

- modern staging is the reference architecture target;
- current cloud schema head is not proven by Phase 1C;
- production role is not approved.

Required proof:

- read-only migration history evidence;
- read-only object inventory for companies, current-company helpers, canonical order/client views,
  document RPCs, lifecycle RPCs, and saved-view objects;
- representative owner/admin/appraiser/reviewer smoke evidence;
- storage and Edge Function smoke if staging is considered for preview/cutover.

#### Future Clean Production

Expected status:

- project ref is TBD;
- no schema head exists to verify yet.

Required proof:

- create or identify final project only in a later approved phase;
- apply or provision active migration chain through the expected head;
- capture migration history and object inventory;
- run data migration dry run and smoke before production env/CSP change;
- keep rollback path to legacy production available.

#### Local / Disposable Replay Target

Expected status:

- active files are present locally;
- previous full local reset was blocked by storage image pull;
- targeted migration checks do not replace full replay.

Required proof:

- Docker/Supabase CLI versions captured;
- `supabase db reset` or disposable project replay completes without skipping files;
- migration history count/head matches the active file inventory;
- storage/image/tooling failures are logged separately from SQL migration failures;
- local app smoke can run against the replayed target.

### Production-Safe Verification Method

Safe verification should be read-only until a dedicated replay/dry-run target is approved:

- inspect repo migration filenames and docs locally;
- use Supabase dashboard SQL or CLI only for read-only metadata checks where authorized;
- record project refs and migration versions only, not secrets;
- never run migration commands against legacy production;
- never run mutation/replay commands against final production before rehearsal passes;
- use disposable projects for destructive/replay experiments.

### Replay Blockers To Track

Known blocker:

- prior full local `supabase db reset` was blocked by Docker failing to resolve the Supabase storage
  image `public.ecr.aws/supabase/storage-api:optimize-existing-functions-again`.

Potential blockers:

- active migration count/head mismatch;
- archived migration versions applied as active;
- baseline object ownership or default ACL drift;
- missing extensions;
- current-company helper failures;
- direct table grant/RLS mismatch;
- storage bucket or function dependency not provisioned;
- schema cache stale after replay;
- production data requiring repeatable mapping before modern constraints apply.

### Rollback / Non-Destructive Proof Requirements

Before any production cutover:

- capture read-only legacy backup/inventory evidence;
- prove final target replay in disposable/fresh project first;
- keep legacy production untouched during rehearsal;
- define previous Vercel env/deployment restore path without exposing values;
- record write-free validation windows and any write-freeze requirements;
- reject any replay plan that requires modifying legacy production before rollback is proven.

## Phase 1D Auth, App User, And Company Parity Evidence Plan

Phase 1D defines how Falcon should prove identity and company-access parity before any future
cutover. This phase inspected existing auth/user/company membership architecture docs, bootstrap
docs, invitation contracts, and relevant migration/RPC definitions only. It did not export/import
auth users, mutate user data, connect to Supabase, execute migrations, change Vercel settings, or
inspect secret values.

### Authoritative Identity Model

Current doctrine:

- `auth.users.id` is authentication identity.
- `public.users.id` is Falcon's canonical app-user identity for domain records.
- `public.users.auth_id` maps the app user to Supabase Auth.
- Backend helpers such as `public.current_app_user_id()` bridge `auth.uid()` to `public.users.id`.
- Company access requires an active `company_memberships` row for the app user.
- Company-scoped role authority lives in `user_role_assignments`.
- Permission authority resolves from active company membership plus active role assignments and
  permission helpers.
- Legacy role strings and legacy profile/auth compatibility tables are migration/readability seams,
  not the future authority model.

### Identity And Company Objects To Prove

Parity evidence must cover these objects or concepts:

- `auth.users`;
- `public.users`;
- `public.users.auth_id`;
- `public.user_profiles`;
- `public.profiles` view where still relevant for compatibility;
- `public.profiles_legacy` where still relevant for legacy FK/activity compatibility;
- `public.companies`;
- `public.company_memberships`;
- `public.roles`;
- `public.permissions`;
- `public.role_permissions`;
- `public.user_role_assignments`;
- `public.company_member_invitations`;
- `public.company_audit_events`;
- `public.current_app_user_id()`;
- `public.current_company_id()`;
- `public.current_app_user_has_current_company()`;
- `public.rpc_current_user_app_context()`;
- `public.rpc_current_company_context()`;
- `public.rpc_company_setup_context()`;
- `public.rpc_company_bootstrap(...)` or a future service-role wrapper;
- company member invitation prepare/finalize/accept/list/cancel/resend RPCs and Edge Functions.

### Read-Only Verification Evidence

Read-only evidence should prove current state without changing data:

- count `auth.users` and `public.users` by safe aggregate only;
- count `public.users` rows with non-null `auth_id`;
- count duplicate or null `auth_id` mappings where relevant;
- verify representative owner/admin/appraiser/reviewer app users have matching auth identities;
- verify `company_memberships` rows exist for representative users in the intended company;
- verify membership statuses are active where access is expected;
- verify role assignments exist, are active, are not expired, and point to expected template roles;
- verify Owner role assignment exists and `company_active_owner_count(company_id)` is at least one;
- verify permission catalog and template role permission mappings exist;
- verify `rpc_current_user_app_context()` returns safe context for representative users;
- verify `rpc_company_setup_context()` returns setup/readiness context for owner/admin;
- verify pending invitations are not counted as active access;
- verify invitation list rows expose lifecycle status without exposing tokens or Auth internals;
- verify invite acceptance route and RPC contract are present, without accepting a live invite during
  read-only evidence gathering.

Do not record user secrets, auth tokens, password hashes, invite tokens, service-role keys, anon key
values, cookies, authorization headers, or sensitive profile details.

### Migration / Cutover Evidence

Cutover work needs additional evidence beyond read-only verification:

- selected Auth export/import or identity recreation path;
- deterministic mapping from legacy auth users to target `auth.users`;
- deterministic mapping from legacy app users to target `public.users`;
- proof that preserved `public.users.id` values will not break assignments, activity, notifications,
  preferences, clients, or orders;
- proof that `public.users.auth_id` maps to the restored/recreated target auth identities;
- owner/admin account migration rehearsal;
- appraiser/reviewer account migration rehearsal;
- company membership backfill plan;
- role assignment backfill plan;
- invitation lifecycle strategy for pending legacy invites;
- session refresh and active-company metadata behavior after migration;
- rollback/reconciliation approach for users created or invited during cutover.

### Target-Specific Parity Plan

#### Legacy Production / Archive

Evidence needed:

- aggregate inventory of `auth.users`, `public.users`, profiles, role compatibility rows,
  memberships if present, and invitations if present;
- owner/admin account identity and app-user mapping inventory;
- source table counts for activity actors, notification recipients, order participants, profile
  rows, and user documents;
- pending invitation inventory and lifecycle state;
- export/import feasibility for Auth identities using the safest supported Supabase path.

Rules:

- treat legacy as source/archive and rollback target;
- do not force modern company membership or role assignment semantics into legacy as a retrofit;
- do not run acceptance or invite flows merely to prove parity;
- do not modify Auth users or profile rows during evidence gathering.

#### Modern Staging / Reference

Evidence needed:

- representative owner/admin/appraiser/reviewer auth and app-user mappings;
- active company membership for representative users;
- active role assignments and permission resolution;
- current-company helper behavior;
- `rpc_current_user_app_context()` and `rpc_company_setup_context()` responses for safe test users;
- invitation prepare/finalize/accept smoke in a staging-only fixture if staging is a cutover
  candidate.

Rules:

- staging proof does not automatically authorize production promotion;
- staging identities should not be treated as production identities unless explicitly migrated or
  approved.

#### Local / Disposable Validation Target

Evidence needed:

- replayed or fixture-seeded auth/app-user/company dataset;
- owner/admin membership and role assignment fixture;
- appraiser/reviewer fixture users;
- current-company helper smoke;
- invitation lifecycle fixture smoke if the target is used for invite validation.

Rules:

- local/disposable evidence can prove behavior but not production data parity;
- no production service-role keys or real production credentials should be used.

#### Preview Deployment

Evidence needed:

- Vercel preview env target classification;
- preview app login/session smoke against the selected target;
- owner/admin context and Team Access smoke;
- route-level proof that preview does not point at legacy or production unintentionally.

Rules:

- preview should not point at production data unless explicitly approved for final smoke;
- preview evidence should record host/project refs and statuses only.

#### Future Clean Production

Evidence needed:

- production auth identity import/recreation result;
- `public.users` mapping and `auth_id` verification;
- company row, owner/admin membership, role assignments, and permissions;
- active-company context for owner/admin and representative users;
- invitation function and acceptance readiness;
- login/session smoke after env target change in preview first.

Rules:

- final target remains blocked until identity, membership, roles, permissions, invitation, and
  current-company evidence pass;
- any mismatch must be resolved through repeatable migration/bootstrap logic, not manual one-off
  table edits.

### Invitation Lifecycle Evidence

Current invitation doctrine to preserve:

- prepare runs in current-company context and requires invite/company-access/role-assignment
  authority;
- service-role finalize records Auth invite outcomes;
- finalize may create or resolve invited app-user identity;
- finalized invites create invited membership and inactive role assignments;
- acceptance requires matching authenticated user or invited email;
- acceptance activates membership and invitation-scoped role assignments;
- acceptance does not switch active-company metadata by itself;
- pending/prepared/sent/auth-failed/cancelled/expired invitations do not grant operational access.

Evidence to capture:

- required invitation RPCs/functions exist in the target;
- invitation table has expected statuses and constraints;
- role presets referenced by invitations exist;
- pending invitations are visible in safe projections;
- accepted invitations produce active membership and role assignments in staging/disposable smoke;
- failed/cancelled/expired invitations remain non-access-granting.

### Login And Session Smoke Requirements

After any future target change, smoke must cover:

- owner/admin login;
- appraiser login;
- reviewer login;
- insufficient-access user denial;
- `rpc_current_user_app_context()` context resolution;
- `current_company_id()` membership validation;
- route guard behavior for Dashboard, Orders, Clients, Calendar, Assignments, Team Access, and
  Owner Setup;
- session refresh behavior after invite acceptance or active-company metadata changes.

### Rollback And Reconciliation Requirements

Before cutover:

- preserve source legacy Auth/app-user inventories;
- define whether new users/invites are frozen during migration;
- record how post-cutover invited users will be reconciled if rollback occurs;
- keep prior Vercel env/deployment restoration path available without exposing values;
- keep failed target identity rows for forensic review rather than deleting evidence immediately;
- define owner/admin emergency access recovery without bypassing RLS/RPC doctrine.

### Auth / Company Parity Blockers

Block cutover if:

- representative users cannot map from `auth.users` to `public.users.auth_id`;
- owner/admin lacks active company membership;
- company has zero active owners;
- expected role assignments are missing, inactive, expired, or tied to wrong role templates;
- permission catalog/template roles are incomplete;
- `current_company_id()` resolves unexpectedly or falls back in a way that masks missing membership;
- invite acceptance activates the wrong user, wrong membership, or wrong role assignment;
- preview/production login cannot establish a stable session;
- rollback cannot restore prior auth/env behavior.

## Phase 1E Storage, Edge Function, CORS, And Secret-Name Evidence Plan

Phase 1E defines how Falcon should prove document storage, Edge Function deployment, CORS/origin
behavior, and secret-name readiness before preview smoke or production cutover. This phase inspected
repository-visible storage migrations, document RPC definitions, Edge Function folders/configs, and
existing production-readiness docs only. It did not change Supabase, Vercel, env vars, CSP, deployed
functions, storage buckets, policies, migrations, runtime code, backend behavior, query behavior,
workflow behavior, permissions, production data, or secret values.

### Storage And Function Surfaces Inspected

Repository evidence for the current governed scope:

- `20260518070000_order_documents_metadata_list_rpc.sql` creates `public.order_documents`, direct
  table-deny policies, safe list RPC, and metadata read authority.
- `20260518071000_order_documents_private_bucket_download_auth.sql` creates or verifies the private
  `order-documents` bucket and `rpc_order_document_authorize_download(...)`.
- `20260518072000_order_documents_upload_prepare_finalize.sql` creates upload filename
  sanitization, upload authority checks, `rpc_order_document_prepare_upload(...)`, and
  `rpc_order_document_finalize_upload(...)`.
- `20260518074000_order_documents_archive_rpc.sql` creates `rpc_order_document_archive(...)`.
- Edge Functions present under `supabase/functions/`:
  - `order-document-upload-url`;
  - `order-document-download-url`;
  - `invite-company-member`;
  - `resend-company-member-invite`;
  - `set-active-company`;
  - `email-worker`;
  - `email-sender`.
- Function JWT config evidence:
  - `invite-company-member`, `resend-company-member-invite`, and `set-active-company` use
    `verify_jwt = true`;
  - `order-document-upload-url`, `order-document-download-url`, and `email-sender` use
    `verify_jwt = false`;
  - `email-worker` has no per-function config file in the inspected tree.

### Document Storage Authority Model

Current document doctrine:

- `order-documents` must remain a private storage bucket.
- `public.order_documents` metadata is the operational authority for order document access.
- Direct browser writes to `public.order_documents` are denied.
- Document list responses intentionally omit raw `storage_bucket`, `storage_path`, object keys, and
  signed URLs.
- Upload begins through `rpc_order_document_prepare_upload(...)`, then the upload Edge Function uses
  service-role storage access to create the signed upload URL.
- Upload completion is finalized through `rpc_order_document_finalize_upload(...)`, which checks the
  pending metadata row, caller authority, and storage object existence.
- Download begins through `rpc_order_document_authorize_download(...)`, then the download Edge
  Function uses service-role storage access to create a short-lived signed download URL.
- Archive uses `rpc_order_document_archive(...)` to soft-archive metadata and write safe activity.
- Archive does not hard-delete storage objects and must not expose bucket/path/signed URL data.
- Storage paths are operational metadata only, never an authorization token.

### Evidence Categories To Collect

#### Bucket Existence And Privacy

Required evidence:

- `storage.buckets` contains `order-documents`;
- bucket `public` is `false`;
- file-size limit matches the current contract where applicable;
- no public/object URL path grants access without signed URL mediation;
- bucket exists in staging/final targets before document smoke.

#### Bucket Policy Readiness

Required evidence:

- storage object access is compatible with the signed URL model;
- no broad authenticated direct object read/write policy bypasses metadata/RPC authority;
- service-role access remains server/function-only;
- failed direct object access denies safely for unauthorized users.

#### Document Metadata Table And RPC Readiness

Required evidence:

- `public.order_documents` exists with expected indexes, status/category/visibility constraints, and
  RLS enabled;
- authenticated direct insert/update/delete remains denied;
- `rpc_order_documents_list(...)` returns safe metadata only;
- `rpc_order_document_prepare_upload(...)`, `rpc_order_document_finalize_upload(...)`,
  `rpc_order_document_authorize_download(...)`, and `rpc_order_document_archive(...)` exist with
  authenticated execute grants;
- document permission seeds include upload/read/delete permissions expected by the modern role
  model.

#### Upload URL Function Readiness

Required evidence:

- `order-document-upload-url` is deployed to the target;
- function secret names exist for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY`, with `PROJECT_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` recognized as
  compatibility names only where code supports them;
- app-origin names are configured when needed: `APP_ORIGIN`, `SITE_URL`, `PUBLIC_SITE_URL`,
  `APP_URL`, or `VERCEL_URL`;
- prepare RPC succeeds only for authorized current-company users;
- signed upload URL creation fails closed when metadata authorization, storage, or secrets are
  missing;
- success evidence records status/category only, not signed URLs, tokens, paths, or payloads.

#### Download URL Function Readiness

Required evidence:

- `order-document-download-url` is deployed to the target;
- secret names exist for Supabase URL, anon key, service-role key, and optional
  `ORDER_DOCUMENT_SIGNED_URL_TTL_SECONDS`;
- download authorization RPC returns safe metadata for authorized users only;
- signed download URL creation succeeds for active documents and denies archived/deleted/missing
  documents;
- signed URL TTL is short and environment-appropriate;
- logs and evidence do not record signed URL values.

#### Archive / Delete Boundary Readiness

Required evidence:

- archive runs through `rpc_order_document_archive(...)`;
- archive requires current-company access, readable order scope, and `documents.delete`;
- archive transitions only `active` or `pending` documents to `archived`;
- archive writes safe activity without storage path, bucket, or signed URL data;
- no hard-delete storage-object behavior is assumed for the first cutover.

#### Invitation And Resend Function Readiness

Required evidence:

- `invite-company-member` and `resend-company-member-invite` are deployed where Team Access invite
  smoke is in scope;
- `verify_jwt = true` remains configured;
- required Supabase URL/anon/service-role secret names exist;
- app-origin names produce `/accept-invite/:invitationId` redirect URLs for the intended app
  domain;
- prepare/finalize/resend RPCs exist before function smoke;
- Auth invite failures finalize safe invitation state without activating access;
- evidence does not record provider links, invite tokens, auth metadata, or raw provider errors.

#### Active-Company Function Readiness

Required evidence:

- `set-active-company` is deployed if preview/production smoke includes company switching or invite
  acceptance into a different active company;
- `verify_jwt = true` remains configured;
- service-role secret name exists;
- function checks Auth user, app-user mapping, company status, membership, and active membership
  before updating app metadata;
- successful switch requires session refresh and writes audit;
- failure paths deny safely without broadening membership or route access.

#### Email Worker / Sender Readiness

Required evidence when email rollout is in scope:

- decide whether `email-worker`, `email-sender`, both, or neither are part of the first cutover;
- required secret names exist: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional
  `RESEND_API_KEY` / `RESEND_KEY`, `EMAIL_FROM`, `APP_BASE_URL`, and batch-size controls where used;
- email functions process only approved queue/RPC contracts;
- test evidence records counts/statuses only, not message bodies with sensitive payloads;
- provider failures mark queue rows safely without duplicate sends.

#### Function JWT Settings Review

Required evidence:

- JWT-disabled document functions still enforce bearer-token authorization inside the function
  before producing signed URLs;
- JWT-enabled invitation and active-company functions still validate caller context through backend
  RPCs or service-role checks;
- `email-sender` `verify_jwt = false` remains acceptable only if it is scheduled/internal or
  otherwise protected by deployment policy;
- any function without explicit config is classified before production deployment.

#### CORS Origin Allowlist Expectations

Required evidence:

- document functions allow only local dev, configured app origins, and intentional Vercel previews;
- invite/resend/set-active-company wildcard CORS remains reviewed before production because browser
  authorization still depends on bearer tokens but origin policy is broader;
- production domain and preview domain decisions are reflected in function origin configuration;
- CSP `connect-src` permits only the selected Supabase/function hosts for the selected target;
- no wildcard Supabase host or broad production CSP expansion is introduced.

#### Secret-Name Inventory By Environment

Record secret names only. Do not record values.

Required evidence matrix:

| Secret name | Local/disposable | Modern staging/reference | Preview | Future clean production | Notes |
|---|---|---|---|---|---|
| `SUPABASE_URL` / `PROJECT_URL` | TBD | TBD | TBD | blocked | Function target URL. |
| `SUPABASE_ANON_KEY` / `ANON_KEY` | TBD | TBD | TBD | blocked | Browser-safe anon key for caller RPCs. |
| `SUPABASE_SERVICE_ROLE_KEY` / `SERVICE_ROLE_KEY` | TBD | TBD | TBD | blocked | Server/function-only. |
| `APP_ORIGIN` / `SITE_URL` / `PUBLIC_SITE_URL` / `APP_URL` | TBD | TBD | TBD | blocked | App origin and invite redirect base. |
| `VERCEL_URL` | not applicable or automatic | TBD | TBD | TBD | Preview origin helper where supported. |
| `ORDER_DOCUMENT_SIGNED_URL_TTL_SECONDS` | optional | optional | optional | optional | Download TTL override. |
| `RESEND_API_KEY` / `RESEND_KEY` | optional | optional | optional | optional | Email provider. |
| `EMAIL_FROM` | optional | optional | optional | optional | Email sender identity. |
| `APP_BASE_URL` | optional | optional | optional | optional | Email link base. |
| `EMAIL_BATCH_SIZE` | optional | optional | optional | optional | Email processing batch size. |

### Safe Function Log Review Process

Function log review should capture:

- function name;
- environment/target project ref;
- timestamp window;
- invocation count;
- status category such as success, auth denied, CORS denied, missing secret, RPC denied, storage
  denied, provider failed, or unexpected error;
- representative safe error code.

Do not capture request headers, cookies, bearer tokens, signed URLs, upload tokens, request payloads,
response payloads, service-role values, anon key values, provider secrets, invite links, or full
Auth provider metadata.

### Failure-Mode Expectations

Expected safe failures:

- missing bearer token returns unauthenticated/unauthorized;
- missing app-user/current-company context returns denied;
- missing secret prevents function startup or returns controlled failure;
- unauthorized upload/download/archive returns denied without leaking storage metadata;
- missing storage object prevents finalize/download;
- expired or invalid invitation does not activate access;
- CORS mismatch blocks browser invocation without weakening backend authorization.

Unexpected failures that block cutover:

- public bucket/object access succeeds without signed URL mediation;
- document list exposes storage path, bucket, object key, signed URL, or upload token;
- service-role key is available to browser runtime;
- wrong company can list, upload, download, or archive documents;
- archived/deleted documents can be downloaded;
- invite/resend activates membership before acceptance;
- active-company switch succeeds without active membership;
- function logs contain token, signed URL, secret, or raw provider payload evidence.

### Target-Specific Evidence Plan

#### Legacy Production / Archive

Evidence needed:

- storage bucket/object inventory by safe aggregate only;
- legacy document/file source inventory if any retained files exist;
- existing function deployment inventory if legacy uses functions;
- confirmation that modern `order-documents` storage/RPC flows are not retrofitted into legacy.

Rules:

- legacy remains production continuity/source archive until cutover;
- do not deploy modern document functions to legacy merely to prove readiness;
- do not patch legacy storage policies to mimic modern company-scoped behavior.

#### Modern Staging / Reference

Evidence needed:

- private `order-documents` bucket and policy evidence;
- document metadata/RPC object inventory;
- deployed document/invite/active-company function inventory;
- secret-name inventory;
- CORS origin and preview-domain behavior;
- owner/admin and role-specific upload/download/archive smoke.

Rules:

- staging proof validates behavior but does not automatically approve production promotion;
- staging service-role secrets must not be reused in final production.

#### Local / Disposable Validation Target

Evidence needed:

- replayed or fixture-backed `order-documents` bucket and metadata schema;
- local function serve/deploy status where used;
- local app-origin behavior;
- smoke using disposable files and disposable users only.

Rules:

- local evidence proves repeatability, not production parity;
- storage image/tooling blockers must be logged separately from SQL/RPC blockers.

#### Preview Deployment

Evidence needed:

- Vercel preview env target classification;
- deployed preview CSP and function CORS alignment;
- signed upload/download/archive smoke against the selected non-production or final rehearsal target;
- invite/resend/active-company smoke only if preview uses the approved target.

Rules:

- preview must not point at production data accidentally;
- preview evidence records hostnames/statuses only.

#### Future Clean Production

Evidence needed:

- final project identity;
- bucket/policy provisioning;
- function deployment and secret-name inventory;
- production app origins and redirect URLs;
- migrated storage object inventory and reconciliation;
- preview smoke before production env/CSP change;
- rollback procedure for files, metadata, invites, and email sends.

Rules:

- final production remains blocked until all storage/function/CORS/secret evidence passes;
- do not change production `VITE_SUPABASE_URL` or CSP before this evidence is complete.

### Storage / Function Readiness Blockers

Block cutover if:

- `order-documents` is missing or public;
- document RPCs or grants are missing;
- direct metadata writes or direct storage reads bypass backend authority;
- upload/download Edge Functions are not deployed or lack required secret names;
- CORS/app-origin behavior is not aligned with the selected deployed app origins;
- `verify_jwt` settings are unexplained for any function in scope;
- invite/resend/active-company functions are missing where Team Access smoke is required;
- email function participation is undecided but email smoke is required;
- function logs cannot be reviewed safely;
- rollback cannot reconcile metadata rows, storage objects, invitations, or queued/sent emails.

## Phase 1F Preview Deployment Target, CSP, And Smoke Evidence Plan

Phase 1F defines how Vercel preview deployments become Falcon's first hosted validation boundary
before any production Supabase target, environment variable, CSP, deployment, storage, function, or
cutover change. This phase is planning-only. It does not change Vercel settings, Supabase projects,
env vars, CSP, deployments, preview promotions, Edge Functions, storage buckets/policies,
migrations, runtime code, backend behavior, query behavior, workflow behavior, permissions,
production data, or secret values.

### Preview Target Classification

Every preview deployment used for cutover evidence must be classified before smoke starts.

Allowed classifications:

| Classification | Meaning | Production cutover use |
|---|---|---|
| `modern-staging` | Preview points at modern staging/reference `voompccpkjfcsmehdoqu`. | Validates modern behavior, not production data parity. |
| `disposable-rehearsal` | Preview points at a disposable replay/dry-run Supabase target. | Validates replay and migration rehearsal behavior. |
| `final-candidate` | Preview points at the future clean production candidate before production traffic. | Required before production env/CSP cutover. |
| `legacy-production` | Preview points at legacy production/archive `okwqhkrsjgxrhyisaovc`. | Allowed only for compatibility observation, not modern cutover proof. |
| `unknown` | Preview target cannot be safely classified by project ref. | Blocks smoke and production cutover. |

Classification evidence must record:

- Vercel preview deployment URL/domain;
- preview deployment id or safe dashboard identifier if visible;
- Git commit SHA/tag;
- preview environment variable names only;
- preview `VITE_SUPABASE_URL` target by project ref only;
- selected Supabase project role;
- whether the target contains production data, staging data, or disposable fixture data;
- whether the target is approved for authenticated smoke.

Do not record anon key values, service-role values, full env values, cookies, request headers,
request payloads, screenshots containing env values, or secret previews.

### Preview Environment Variable Expectations

Preview env vars should point to the selected non-production or final-candidate target before any
production change.

Rules:

- preview must not point at legacy production unless the task is explicitly legacy compatibility
  observation;
- preview must not point at production data by accident;
- preview `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must belong to the same selected
  Supabase project;
- preview browser runtime must not receive service-role secrets;
- preview Google Maps and other browser-facing keys should be classified by name only;
- preview secret/function names must be inventoried separately from browser env names.

### Preview CSP Expectations

Preview CSP should allow only the intended preview runtime target.

Required evidence:

- deployed preview `Content-Security-Policy` header is captured by safe header text;
- preview `connect-src` includes the selected preview Supabase host;
- preview `connect-src` does not include unrelated legacy, staging, or final hosts unless explicitly
  required for the selected target;
- preview CSP permits required app origins/CDNs already used by the deployed app;
- preview CSP does not use wildcard Supabase hosts;
- preview CSP and Edge Function CORS origin behavior agree on the selected preview deployment URL.

Decision rule:

- if preview CSP does not allow the selected Supabase host, smoke is blocked;
- if preview CSP allows both legacy and modern hosts without a documented reason, production cutover
  is blocked until mixed-host risk is explained;
- if deployed preview headers do not match repo expectations, record the mismatch before any edit.

### Deployed Preview Bundle Evidence

Before authenticated smoke, inspect the deployed preview app shell and JavaScript bundle for
Supabase host references.

Required evidence:

- app shell loads from the preview URL;
- deployed bundle contains the expected Supabase project host or no hardcoded host beyond env-bundled
  build output;
- deployed bundle does not contain unexpected legacy and modern hosts together;
- deployed bundle does not expose secret values;
- Vercel preview build commit matches the intended commit.

Do not copy key-like query values, tokens, full minified bundle snippets, cookies, or request
payloads into docs.

### Preview Smoke Evidence Requirements

Run smoke only after target, env, CSP, and bundle evidence are classified.

#### Unauthenticated App Boot

Evidence needed:

- preview URL returns the app shell;
- static assets load;
- protected routes redirect or show sign-in safely;
- browser console has no runtime config or CSP failures;
- network traffic uses only expected non-secret hostnames.

#### Authenticated Login And Session

Evidence needed:

- approved smoke user can log in;
- logout works;
- session persists through refresh where expected;
- invalid or insufficient-access login fails closed;
- browser network traffic uses only the selected Supabase host.

#### Owner/Admin Context

Evidence needed:

- owner/admin resolves `public.users.auth_id` and active company context;
- `rpc_current_user_app_context()` and setup context behave as expected;
- Dashboard and Owner Setup load against the selected target;
- no cross-company rows appear in normal owner/admin views.

#### Operational Route Smoke

Evidence needed:

- Orders route loads active orders and preserves lifecycle defaults;
- one Order Detail route loads safe metadata;
- Clients route and representative Client Detail route load;
- Calendar route loads scheduling context and order navigation where data exists;
- Assignments received/sent lanes and packet detail load where fixture data exists;
- route failures are classified as auth, RLS/permission, missing fixture data, CSP, CORS, or backend
  error.

#### Team Access / Owner Setup Smoke

Run only when the selected preview target has safe fixture users/invitations.

Evidence needed:

- Team Access member list is company-scoped;
- invite/resend/cancel behavior is tested only in an approved fixture window;
- Owner Setup readiness diagnostics load without hidden mutation;
- active-company switching is tested only if `set-active-company` is deployed and approved.

#### Storage / Function Smoke

Run only when Phase 1E storage/function evidence has passed for the selected target.

Evidence needed:

- document list returns safe metadata only;
- upload prepare/sign/finalize succeeds for an approved disposable file;
- download produces a signed URL only through the approved function path;
- archive soft-archives metadata without exposing storage internals;
- function logs show success/denial categories without tokens, signed URLs, or payload dumps.

### Browser Console And Network Host Review

For every preview smoke pass, record:

- page or route;
- observed Supabase hostnames;
- observed Edge Function hostnames;
- Google/Maps hostnames if exercised;
- request category such as auth, REST/RPC, storage, function, static asset, map, or browser
  background service;
- success/failure status;
- console errors by safe category only.

Block production cutover if:

- preview traffic mixes legacy and modern Supabase hosts unexpectedly;
- preview calls legacy production while classified as modern staging or final candidate;
- preview calls a final production target before approval;
- browser console shows CSP or CORS failures on core routes;
- Supabase requests fail due to missing auth, missing current company, RLS denial, missing RPC,
  missing storage, or missing function and the failure is not explained by fixture scope.

### Rollback / No-Promotion Criteria

Preview evidence does not authorize production promotion by itself.

No promotion or production env/CSP change is allowed if:

- preview target is unknown;
- preview `VITE_SUPABASE_URL` does not match the selected project ref;
- preview CSP does not allow the selected Supabase host;
- deployed bundle contains an unexpected Supabase host;
- preview smoke cannot authenticate an owner/admin user;
- current-company context fails;
- core operational routes fail for reasons other than known fixture gaps;
- storage/function smoke fails where documents are in production scope;
- Team Access/Owner Setup smoke fails where onboarding is in production scope;
- rollback/deployment history and env restoration remain unproven;
- production target remains undecided.

### Next Evidence Needed After Preview Planning

The next safe slice should collect dashboard/runtime evidence without changing settings:

- Vercel preview env target classification;
- preview deployment URL/domain;
- preview deployed CSP/header evidence;
- preview deployed bundle host evidence;
- preview unauthenticated app boot evidence;
- preview authenticated smoke plan readiness.

## Phase 1G Preview Deployment Evidence Capture

Phase 1G captured available preview deployment evidence from the Vercel CLI and read-only HTTP
headers. It made no Vercel setting changes, Supabase changes, env var edits, CSP edits,
deployments, preview promotions, migration executions, runtime code changes, backend behavior,
query behavior, workflow behavior, permission changes, or production data changes. No secret values
were recorded.

During evidence capture, `vercel ls --yes` unexpectedly linked the local workspace and created
repo-local `.vercel` metadata plus a `.gitignore` entry. Those local metadata changes were removed
immediately; no Vercel project setting, deployment, environment variable, domain, or Supabase target
was changed.

### Read-Only Evidence Captured

Commands/surfaces inspected:

- `vercel whoami`;
- `vercel --version`;
- `vercel ls --yes`;
- `vercel ls project-falcon --environment preview --yes`;
- `vercel inspect https://project-falcon-n440jf7ix-chris-projects-e06c973e.vercel.app`;
- `curl -I https://project-falcon-n440jf7ix-chris-projects-e06c973e.vercel.app`;
- `curl -I https://project-falcon-git-runtime-stabi-c53f53-chris-projects-e06c973e.vercel.app`;
- `curl -sL https://project-falcon-n440jf7ix-chris-projects-e06c973e.vercel.app`;
- `curl -I https://continentalres.com` as production contrast only;
- local repository scans for `vercel.app`, Supabase project refs, and Vite Supabase env usage.

### Vercel Preview Deployment Inventory

Confirmed:

- Vercel CLI authenticated as `chrisrossi92`.
- Vercel CLI version is `47.0.6`.
- Vercel project visible through CLI: `chris-projects-e06c973e/project-falcon`.
- Preview deployments exist for `project-falcon`.
- The latest preview deployment returned by `vercel ls project-falcon --environment preview --yes`
  is:
  - URL: `https://project-falcon-n440jf7ix-chris-projects-e06c973e.vercel.app`;
  - status: `Ready`;
  - environment: `Preview`;
  - age in CLI output: `40d`;
  - user: `chrisrossi92`.
- `vercel inspect` for that URL reported:
  - deployment id: `dpl_3DHd33U5jGCWYwzZNr99JiTXwzDh`;
  - name: `project-falcon`;
  - target: `preview`;
  - status: `Ready`;
  - created: `Mon Apr 13 2026 12:31:00 GMT-0400`;
  - alias: `https://project-falcon-git-runtime-stabi-c53f53-chris-projects-e06c973e.vercel.app`.

Unconfirmed:

- preview commit SHA was not shown in the read-only CLI inspect output;
- full source branch name was not proven beyond the visible branch-style alias;
- preview env variable values were not inspected or recorded;
- preview `VITE_SUPABASE_URL` project ref was not visible from the CLI evidence.

### Preview Header And App Boot Evidence

Observed for both the latest preview deployment URL and its branch-style alias:

- HTTP status: `401`;
- response is Vercel Authentication / deployment protection, not the Falcon app shell;
- headers include Vercel protection indicators such as `x-robots-tag: noindex` and Vercel server
  metadata;
- Falcon app `Content-Security-Policy` was not observable on the protected preview response;
- Falcon static assets, app shell, or deployed JavaScript bundle were not reachable without Vercel
  authentication/protection bypass.

Evidence boundaries:

- Vercel protection cookies, nonces, and authentication links were not recorded as evidence in this
  plan;
- no preview request headers, cookies, tokens, payloads, env values, or key values were recorded.

### Preview Supabase Target Evidence

Current status:

- preview `VITE_SUPABASE_URL` target classification is unknown;
- preview CSP `connect-src` for the Falcon app is unknown because Vercel protection returned before
  the app shell;
- preview deployed bundle Supabase host references are unknown because the protected deployment did
  not expose the app bundle unauthenticated;
- preview runtime network behavior is unknown beyond Vercel Authentication responses.

Production contrast:

- read-only production header evidence from `https://continentalres.com` still shows the deployed
  production CSP allowing legacy Supabase host `okwqhkrsjgxrhyisaovc.supabase.co`;
- this confirms the production legacy-host risk remains, but it does not classify preview.

### Preview Smoke Evidence

Unauthenticated preview smoke result:

- blocked by Vercel Authentication before Falcon app boot;
- protected-route handling, app shell, static asset loading, browser console, and Falcon runtime
  network behavior could not be validated.

Authenticated preview smoke result:

- not run;
- no Vercel protection bypass token, authenticated browser session, or approved smoke credentials
  were available in this evidence slice.

Operational route smoke result:

- not run because the preview app shell was protected before Falcon routes loaded.

Storage/function smoke result:

- not run because preview target, app shell, auth session, and storage/function readiness were not
  accessible from the available evidence.

### Preview Classification

Decision: **preview evidence incomplete**.

Reason:

- preview deployments exist and are Ready, but the latest preview is protected by Vercel
  Authentication;
- preview env target could not be classified by Supabase project ref;
- preview app CSP, bundle host references, and runtime network calls could not be inspected;
- authenticated preview smoke was not available;
- current preview deployments are old relative to the current production hardening work, with the
  newest preview listed at 40 days old.

The preview cannot currently be classified as safely isolated, legacy-backed, staging-backed, or
mixed/unsafe. It remains unknown until preview env target, CSP, bundle, and smoke evidence are
captured.

### Production Cutover Decision After Phase 1G

Production env/CSP cutover remains blocked.

No production promotion or env/CSP change is allowed until:

- a current preview deployment for the intended commit exists;
- Vercel preview protection access or approved bypass evidence allows app-shell inspection;
- preview `VITE_SUPABASE_URL` is classified by project ref only;
- preview deployed CSP and bundle host references are captured;
- unauthenticated and authenticated preview smoke pass against the selected target;
- rollback/deployment history and env restoration remain documented.

## Phase 1H Current Preview Access And Target Classification Plan

Phase 1H defines what must be true before a Vercel preview deployment can be used as Falcon's
hosted validation boundary. This is planning and evidence design only. It makes no Vercel changes,
Supabase changes, env var edits, CSP edits, deployments, preview promotions, migration executions,
runtime code changes, backend behavior, query behavior, workflow behavior, permission changes, or
production data changes. No secret values should be recorded.

Phase 1G proved that preview deployments exist, but did not prove a usable validation boundary
because the latest listed preview was old, protected by Vercel Authentication, and not inspectable
for Falcon app runtime evidence.

### Preview Usability Preconditions

A preview can be used for hosted validation only when all of these are true:

- the preview URL is current for the intended `main` commit or candidate branch;
- the preview deployment commit SHA, branch, creation time, target, and status are recorded;
- Vercel Authentication/protection status is understood before smoke begins;
- preview environment variable names are recorded without values;
- preview Supabase target is classified by project ref only;
- preview CSP `connect-src` allows the intended Supabase host and does not allow unrelated
  Supabase hosts;
- deployed preview bundle references the same intended Supabase host;
- preview app shell is reachable through an approved safe access path;
- authenticated smoke credentials and personas are approved for the selected target;
- rollback/no-promotion criteria are recorded before any production decision.

If any of these are unavailable, preview remains blocked as a production-cutover gate.

### Current Preview Acquisition Options

Safe options, in preferred order:

1. Use an existing current preview for the latest intended commit if Vercel dashboard or CLI
   evidence proves the commit, branch, target, and status.
2. Use a manually identified preview deployment from the Vercel dashboard if it matches the intended
   branch or candidate commit and no redeploy is required.
3. Prepare a current preview generation plan for a later approved implementation/deployment slice if
   no current preview exists.
4. Keep the preview path blocked if the team cannot identify a current preview and does not approve
   generating one.

Phase 1H itself does not deploy, redeploy, promote, or change preview settings.

Required current-preview evidence format:

| Evidence item | Required safe value | Status |
|---|---|---|
| Preview URL / alias | Full preview URL and any branch alias. | TBD |
| Deployment id | Vercel deployment id. | TBD |
| Commit SHA | Full Git commit SHA if visible. | TBD |
| Branch / source ref | Branch or candidate ref name. | TBD |
| Created time | Dashboard-safe timestamp and timezone. | TBD |
| Target / environment | Expected `preview`. | TBD |
| Status | Expected `Ready`. | TBD |
| Protection status | Enabled/disabled/needs-auth summary only. | TBD |

### Vercel Authentication Handling Options

Allowed evidence paths:

- use an authenticated browser session owned by an approved reviewer to inspect the preview app
  shell, headers, console, and network traffic;
- use a safe Vercel-provided preview access path if available and explicitly approved for this
  evidence task;
- inspect deployment details, headers, and environment target classification from Vercel dashboard
  or read-only tooling when app-shell access is not available;
- keep preview blocked if no safe authenticated access, bypass path, or dashboard evidence exists.

Not allowed in this phase:

- disabling preview protection;
- changing protection settings;
- creating or sharing long-lived bypass tokens in docs or chat;
- recording cookies, bearer tokens, auth links, nonces, env values, anon keys, service-role keys,
  request payloads, response payloads, or screenshots containing secrets.

Any preview protection change or deployment bypass generation requires a later explicit
implementation slice and approval.

### Preview Target Classification Method

Classify preview by safe Supabase project ref only:

| Classification | Evidence required |
|---|---|
| `preview staging-backed` | Preview env target, preview CSP, deployed bundle host, and runtime network calls all align to modern staging `voompccpkjfcsmehdoqu`. |
| `preview final-candidate-backed` | Preview env target, CSP, bundle, and runtime calls all align to an explicitly identified final candidate project ref. |
| `preview legacy-backed` | Preview env target, CSP, bundle, or runtime calls align only to legacy project `okwqhkrsjgxrhyisaovc`. |
| `preview mixed/unsafe` | More than one Supabase project host appears, or env/CSP/bundle/runtime evidence disagree. |
| `preview evidence incomplete` | Project ref, CSP, bundle, or runtime evidence cannot be inspected safely. |

Do not classify by secret values, anon key values, service-role values, or copied env values.
Project refs visible in Supabase URLs are enough for classification.

### Evidence Required Before Preview Smoke

Before unauthenticated or authenticated preview smoke proceeds, collect:

- current preview URL and branch alias;
- current preview deployment id, commit SHA, branch, status, and creation time;
- protection status and approved access method;
- preview env var names only;
- preview `VITE_SUPABASE_URL` project ref only;
- preview CSP `connect-src` Supabase host;
- deployed preview bundle Supabase host reference;
- browser console baseline with no CSP/runtime config failures;
- network host baseline showing no unexpected mixed Supabase hosts;
- authenticated smoke personas and target data boundaries;
- no-promotion criteria.

### Preview No-Promotion Criteria

Do not use preview evidence to support production env/CSP cutover if:

- the preview is not current for the intended commit or candidate branch;
- preview access is blocked by Vercel Authentication without an approved inspection path;
- preview Supabase project ref is unknown;
- preview env target, CSP, bundle, or runtime network hosts disagree;
- preview points at legacy production unintentionally;
- preview points at production data without explicit approval;
- Falcon app boot cannot be inspected;
- owner/admin login or current-company context cannot be smoked safely;
- document/function smoke is in scope but storage/function evidence is missing;
- rollback, deployment history, or env restoration evidence remains unavailable.

### Phase 1H Decision

Decision: **preview path remains blocked until current preview access and target classification are
available**.

Recommended next safe action:

- manually complete Vercel dashboard evidence for a current preview deployment, including preview
  URL, commit SHA, branch, protection status, env var names only, and preview Supabase target by
  project ref only;
- if no current preview exists, prepare a separate current preview generation plan for explicit
  approval;
- if preview remains protected, choose an approved authenticated browser or safe preview access
  method before runtime inspection.

## Current Local Architecture Findings

- The active frontend Supabase client in `src/lib/supabaseClient.js` reads `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`.
- `src/pages/Dashboard.jsx` still creates a direct Supabase client from the same Vite env vars. This
  is not mixed-target behavior by itself, but it remains a runtime config review surface.
- The only repo-root env file found in the inspected depth is `.env.local`.
- No `.env.example` or `.env.template` was found in the inspected depth.
- `vercel.json` still contains a CSP `connect-src` allowlist for
  `https://okwqhkrsjgxrhyisaovc.supabase.co`.
- The active migration chain is under `supabase/migrations/` and currently includes the curated
  company-scoped baseline through saved views.
- Archived historical migrations and remote legacy schema/data/role dumps are preserved outside the
  active migration chain.
- Edge Functions are present for document upload/download, invitations/resend, active-company
  switching, and email worker/sender support.
- `supabase/config.toml` is minimal in the inspected file and explicitly configures
  `functions.email-sender` with `verify_jwt = false`; other function-level behavior should be
  verified before production deployment.

## Target Environment Architecture

### Production

Production should eventually be a clean, intentionally named Supabase project that is provisioned
for Falcon production ownership, region, backup expectations, storage, Edge Functions, auth, and
company-scoped runtime behavior.

Production requirements:

- active modern migration chain applied intentionally;
- `supabase_migrations.schema_migrations` state understood and recorded;
- company, owner/admin, memberships, role assignments, permissions, and app-user/auth mappings
  bootstrapped;
- private `order-documents` bucket and document RPC/Edge flows validated before document features
  are considered production-ready;
- Edge Function secrets and CORS origins configured for production domains;
- auth site URL and redirect URLs aligned with production and invite routes;
- Vercel production env vars point only at the approved production project after go/no-go;
- rollback path can restore prior Vercel env/deployment and preserve write reconciliation evidence.

### Staging

Staging should remain the modern company-scoped validation environment.

Staging requirements:

- prove migrations, RLS, RPC grants, storage, Edge Functions, and browser smoke before production;
- mirror production-like role and permission coverage without using production service-role secrets;
- receive preview deployment traffic where possible for target smoke;
- remain clearly labeled as staging/reference unless an explicit decision promotes or clones it.

### Local Development

Local development may use local Docker Supabase or an approved hosted staging target depending on
the task.

Local requirements:

- inspect `.env.local` target before smoke testing or data mutation work;
- do not run production-affecting commands from local shells;
- avoid recording env values in docs or terminal summaries;
- use local reset or disposable targets for migration replay proof where possible;
- document when local smoke is unauthenticated versus authenticated.

### Preview Deployments

Preview deployments should be the first hosted browser environment for Supabase target changes.

Preview requirements:

- use staging or an explicitly approved disposable/final target for cutover rehearsal;
- never point preview at production data by accident;
- include the intended Supabase host in CSP only for the preview target being tested;
- validate auth, RLS, storage, Edge Functions, and core routes before any production env change;
- capture hostnames and statuses only, not secret values or request payloads.

## Migration / Cutover Planning Categories

### Schema Parity

Required evidence:

- active migration head applied to the target;
- expected tables, views, functions, triggers, constraints, and extensions exist;
- archived migrations are not accidentally replayed;
- legacy compatibility views/functions are intentionally present or quarantined.

### Migration Replay

Required evidence:

- local or disposable project replay succeeds against the active chain;
- baseline reconciliation is documented for restored legacy data;
- Supabase CLI and Postgres versions are recorded;
- storage-related local tooling blockers are separated from SQL replay blockers.

### RLS And Grant Parity

Required evidence:

- current-company helpers work in authenticated sessions;
- direct table writes remain blocked where RPC-only doctrine requires it;
- canonical order/client/assignment visibility is company-scoped;
- assignment packet access does not imply canonical order/client visibility;
- authenticated execute grants exist only for intended RPCs.

### Auth And User Migration

Required evidence:

- `auth.users` migration/export/import path is selected and tested;
- `public.users.auth_id` maps to restored or recreated auth identities;
- owner/admin/appraiser/reviewer users can log in;
- inactive or external users do not gain unintended access;
- invite acceptance routes and redirect URLs work in the target.

### Storage Buckets And Files

Required evidence:

- private buckets exist;
- storage object inventory and migration plan are documented;
- document metadata rows remain authorization authority;
- signed upload/download flows work only through approved Edge/RPC paths;
- storage paths, bucket names, and signed URLs do not leak into UI or docs.

### Edge Functions

Required evidence:

- required functions are deployed to the target;
- function secret names exist in Supabase/Vercel secret stores as appropriate;
- service-role keys are not exposed to the browser;
- CORS allows only intended app origins;
- function logs are reviewed during smoke tests.

### Secrets

Required evidence:

- browser-facing anon keys match the intended project;
- service-role keys are environment-specific and server/function-only;
- staging service-role keys are not reused in production;
- no secret values are copied into docs, screenshots, or chat;
- rollback env values are restorable through approved secret stores only.

### Realtime / Subscriptions

No current production-cutover dependency on Realtime has been proven in this slice. Before cutover,
verify whether any active route uses Supabase channels/subscriptions and whether Realtime is enabled
or intentionally disabled per environment.

### Seed And Bootstrap Data

Required evidence:

- static seed data applied;
- permission catalog and template roles verified;
- production company row exists;
- owner/admin membership and role assignment exist;
- order numbering settings are initialized;
- notification preferences/defaults are initialized where required;
- setup context/readiness RPCs return safe owner/admin context.

### Production Smoke Tests

Required evidence:

- preview smoke against selected target passes first;
- production smoke plan is approved before production env change;
- smoke covers auth, dashboard, orders, workflow, lifecycle, documents, clients, calendar,
  assignments, Team Access, Owner Setup, activity, notifications, saved views, Historical Orders,
  and Print Packet;
- network evidence confirms no unintended mixed Supabase hosts.

### Rollback Plan

Required evidence:

- previous Vercel env values can be restored without exposing them in docs;
- previous deployment can be promoted or redeployed;
- legacy project remains available as archive/source;
- writes during a failed cutover window are captured and reconciled intentionally;
- rollback owner and communication path are assigned.

## Safe Decision Paths

### 1. Keep Production On Legacy Temporarily

Use this path while production deploys are healthy and the modern/final target is not proven.

Rules:

- do not change production `VITE_SUPABASE_URL`;
- do not remove `okwqhkrsjgxrhyisaovc.supabase.co` from production CSP;
- do not retrofit modern company-scoped features into the legacy schema;
- document production as legacy-backed, not modern-aligned;
- continue evidence gathering and staging validation separately.

### 2. Promote Modern Staging To Production After Proof

Use this path only if the team explicitly decides that modern staging is acceptable as the
production target.

Required proof:

- staging data ownership and cleanup expectations are resolved;
- auth/users/company/roles/storage/functions are production-ready;
- preview smoke passes against the staging target;
- backup and rollback path are explicit;
- CSP and Vercel env updates are sequenced together.

Risk:

- this path can blur staging and production responsibilities and is less clean than a dedicated
  production project unless there is a deliberate operational reason.

### 3. Create Or Identify Separate Clean Production Supabase

This is the preferred long-term direction.

Required proof:

- final project identity and ownership are recorded;
- active migration chain replay/provisioning succeeds;
- data migration dry run is reconciled;
- auth/user/company/permission/storage/function parity is verified;
- preview build points at the final target and passes smoke;
- production cutover and rollback are rehearsed or operationally clear.

### 4. Block Until Parity Evidence Is Gathered

Use this path when the target is unclear or incomplete.

Blocking conditions:

- production env target is not classified;
- final project is not identified;
- migration replay is not proven;
- auth/app-user/company membership mapping is not proven;
- storage/functions/CORS are not verified;
- no preview smoke exists;
- rollback plan is not documented.

## Preferred Direction

The preferred direction remains: keep production stable on legacy temporarily, continue using modern
staging as the reference validation environment, and create or identify a separate clean final
production Supabase project for cutover.

Do not edit Vercel env vars or CSP until the final target path is selected and the required evidence
matrix is complete.

## Safe Ordered Phases

1. Phase 1A: document environment architecture and migration categories. Complete.
2. Phase 1B: build a Supabase target evidence matrix for legacy, modern staging, preview, and final
   production candidates. Complete.
3. Phase 1C: define schema head and migration replay evidence plan. Complete.
4. Phase 1D: define auth, app-user, and company parity evidence plan. Complete.
5. Phase 1E: define storage, Edge Function, CORS, and secret-name evidence plan. Complete.
6. Phase 1F: define preview deployment target, CSP, and smoke evidence plan. Complete.
7. Phase 1G: collect preview deployment target/CSP/runtime evidence. Complete; evidence
   incomplete.
8. Phase 1H: define current preview access and target classification requirements. Complete.
9. Phase 1I: capture current preview access and target classification evidence.
10. Phase 1J: prepare production env/CSP cutover runbook.
11. Phase 1K: perform production cutover only after explicit approval.

## Next Safe Slice

Proceed with **Supabase Environment Architecture & Migration Planning Phase 1I: Current Preview
Access And Target Classification Evidence Capture**.

Phase 1I should capture the manual or read-only tool evidence defined in Phase 1H. It should
establish a current preview deployment for the intended commit, obtain approved access to inspect
the protected preview app shell, classify preview `VITE_SUPABASE_URL` by project ref only, and
capture preview CSP/bundle/runtime evidence.

Phase 1I must make no Supabase changes, Vercel changes, env var edits, CSP edits, deployments,
preview promotions, Edge Function deployments, storage changes, migration executions, runtime code
changes, backend/query/workflow/permission changes, or production data changes unless a later
explicit implementation or deployment slice is approved.
