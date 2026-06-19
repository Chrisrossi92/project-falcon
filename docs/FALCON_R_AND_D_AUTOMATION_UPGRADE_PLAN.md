# Falcon R&D Automation Upgrade Plan

## Purpose

This plan turns the environment audit findings into a phased automation roadmap. It is
documentation-only and does not change application code, Supabase configuration, Vercel settings,
secrets, migrations, CI, tests, or runtime behavior.

## Current Baseline

Falcon already has strong governance documentation, local/staging AMC smoke scripts, environment
parity doctrine, production readiness audits, and clear RPC-first operating rules. The remaining
automation gap is that many controls are procedural or script-specific rather than enforced through
a standard agent contract, formal E2E suite, environment validation layer, deployment preflight, and
CI-grade AMC smoke pipeline.

## Phase 1: Agent Operating Rules

Goal: make repo-level agent behavior explicit and repeatable.

Deliverables:

- Add repo-level `AGENTS.md`.
- Require agents to read relevant vision, roadmap, environment, and governance docs before
  proposing material work.
- Forbid production Supabase mutations by default.
- Require environment target verification before scripts, smoke tests, migrations, resets, or
  deploy-adjacent actions.
- Require tests or smoke checks after code changes.
- Require roadmap and governance doc updates when milestones, readiness, or workflow assumptions
  change.
- Standardize final reports so each agent reports changed files, validation, skipped checks, risks,
  and next steps.

Acceptance criteria:

- `AGENTS.md` exists at repo root.
- The approved AMC staging ref `voompccpkjfcsmehdoqu` is documented.
- Existing production safety rules are preserved.
- The file is docs-only and does not alter application behavior.

## Phase 2: Playwright E2E Foundation

Goal: convert browser smoke from ad hoc/manual execution into a maintained E2E layer.

Status: foundation added. Falcon now has a committed Playwright config, local/staging E2E scripts,
an `e2e/README.md`, and a first public-route smoke that verifies `/login` loads and exposes the
unauthenticated sign-in UI without submitting credentials or mutating data. Full AMC workflow
automation remains intentionally deferred to Phase 5.

Deliverables:

- Add `@playwright/test` and a committed `playwright.config`.
- Create separate projects for local and approved staging-safe runs.
- Add login/session helpers that never embed real credentials in source.
- Start with a small critical-path suite:
  - login and workspace label;
  - owner/admin dashboard load;
  - orders list/detail read;
  - vendor workspace dashboard;
  - AMC order search/open against disposable smoke data.
- Store traces/screenshots/videos only as local or CI artifacts.

Acceptance criteria:

- E2E tests refuse unknown or production-like targets.
- Tests can run locally against disposable/local data.
- Staging runs require explicit opt-in and project-ref verification.
- No production mutations are possible from the default E2E command.

Completion notes:

- `playwright.config.ts` refuses production-like URLs, known production refs, unsupported targets,
  non-local URLs for `E2E_TARGET=local`, and staging runs without explicit `E2E_BASE_URL`.
- `npm run e2e:local` starts or reuses a local Vite server on `127.0.0.1:5173`.
- `npm run e2e:staging` requires an explicit non-production app URL and keeps staging opt-in through
  `E2E_ALLOW_STAGING=1`.
- Traces, screenshots, and videos are retained on failure.
- No real production credentials are required.

## Phase 3: Environment Profile Validation

Goal: centralize target classification before any environment-dependent command runs.

Status: foundation added. Falcon now has `scripts/validate-env-profile.mjs`, npm profile checks,
and `docs/ENVIRONMENT_PROFILE_MATRIX.md` documenting the approved local, staging, preview, and
production-readonly matrix. The validator reuses the existing AMC staging helper for the approved
staging ref and production-ref deny list.

Deliverables:

- Add a reusable environment profile validator for local, AMC staging, preview, legacy
  production/archive, and future clean production.
- Validate Supabase URL, project ref, key type, app URL, and mutation permissions.
- Standardize allowed command classes:
  - read-only inspection;
  - local disposable mutation;
  - AMC staging disposable smoke;
  - preview validation;
  - production read-only evidence;
  - production mutation forbidden by default.
- Make staging scripts consume the shared validator instead of duplicating all target checks.

Acceptance criteria:

- `voompccpkjfcsmehdoqu` is the only approved AMC staging ref.
- `okwqhkrsjgxrhyisaovc` is recognized as legacy production/archive and denied for modern mutation
  tooling.
- Missing or placeholder secrets fail before any network or database mutation.
- Validation output redacts secrets and records only safe evidence.

Completion notes:

- `local` requires localhost app and localhost Supabase URLs.
- `staging` requires hosted Supabase project ref `voompccpkjfcsmehdoqu`.
- `preview` refuses production-like app URLs and known production Supabase refs.
- `production-readonly` is the only profile that allows known production refs, and only with
  read-only access mode.
- The validator is a preflight classifier only; it does not mutate data or replace migration,
  storage, Edge Function, auth, or smoke-test evidence.

## Phase 4: Deployment Preflight Gate

Goal: prevent accidental production changes before deployment, cutover, or environment promotion.

Status: foundation added. Falcon now has `scripts/deployment-preflight.mjs`, deployment preflight
npm scripts, and `docs/DEPLOYMENT_PREFLIGHT.md`. The preflight reuses the central environment
profile validator and adds deployment-specific checks for migration-state assumptions, E2E target
classification, Vercel environment labels, and production-release approval.

Deliverables:

- Add a preflight command that checks:
  - intended environment;
  - Supabase project ref;
  - Vercel environment classification;
  - CSP Supabase hosts;
  - migration head expectations;
  - required Edge Functions and secrets by name;
  - rollback notes;
  - smoke-test evidence freshness.
- Add a CI workflow or protected manual gate for deployment-adjacent pull requests.
- Block changes that point production at staging or unknown Supabase projects.
- Require human-readable evidence before any production cutover step.

Acceptance criteria:

- Production deploy preflight fails closed on unknown project refs.
- Modern features cannot be deployed as a retrofit to legacy production by accident.
- The gate reports actionable failures without exposing secrets.
- The gate distinguishes preview, staging, legacy production/archive, and future clean production.

Completion notes:

- `preview` refuses known production Supabase refs and requires preview-compatible migration and E2E
  assumptions.
- `staging` requires Supabase project ref `voompccpkjfcsmehdoqu`.
- `production-readonly` allows known production refs only for read-only evidence mode.
- `production-release` fails closed unless `FALCON_DEPLOY_APPROVED=1` is present, refuses staging
  refs, refuses unknown refs, and requires production-release migration/E2E assumptions.
- The gate does not deploy anything and does not replace migration replay, backup, rollback,
  storage, Edge Function, auth, or smoke-test evidence.

## Phase 5: CI-Grade AMC Smoke Tests

Goal: make AMC validation repeatable enough for release confidence.

Status: first narrow staging browser smoke foundation added. Falcon now has an AMC-specific
Playwright smoke that verifies the approved staging profile, confirms the disposable AMC smoke
fixture exists, and opens the browser-visible AMC dashboard/order-detail path. It intentionally does
not automate bid, assignment, vendor execution, report, revision, invoice, payment, or wrong-vendor
edge flows yet.

Deliverables:

- Promote AMC fixture, happy-path, edge, and browser smoke flows into CI-ready jobs.
- Use disposable smoke identities, orders, documents, and artifact paths only.
- Run against local disposable Supabase first; allow staging only through explicit approval and
  project-ref verification.
- Capture structured results for:
  - candidate matching;
  - bid request and bid submission;
  - assignment offer and acceptance;
  - document access;
  - report upload, revision, and resubmission;
  - invoice approval, correction, scheduling, and paid state;
  - wrong-vendor denial;
  - raw id, storage path, internal note, and financial leakage checks;
  - Internal-vs-AMC workspace separation.

Acceptance criteria:

- CI jobs are deterministic, idempotent, and safe to rerun.
- Staging jobs refuse production refs and production-like app URLs.
- Failures produce clear step-level evidence.
- Smoke results can be linked from release or readiness docs.

Completion notes:

- `e2e/amc/amc-happy-path-smoke.spec.ts` is staging-only and requires `E2E_ALLOW_STAGING=1`.
- The smoke requires Supabase project ref `voompccpkjfcsmehdoqu` and refuses production-like app
  URLs through the Playwright target guard.
- Fixture preparation is opt-in through `E2E_AMC_PREPARE_FIXTURE=1` and reuses
  `scripts/load-amc-staging-smoke-fixtures.mjs`.
- The smoke uses reserved `example.test` disposable identities and does not send real client/vendor
  email.
- The smoke now verifies the browser-visible procurement details for the disposable order, including
  the sent bid request, sent disposable vendor recipient, and zero-response fixture state.
- The smoke also covers the staging-safe public vendor bid invitation path by generating a
  disposable token directly from test data, submitting one safe bid response, and verifying the owner
  procurement UI shows one response with the submitted values.
- The smoke now verifies the owner can select the disposable submitted bid and that no vendor
  assignment row has been created.
- The smoke now verifies the owner can create an assignment offer from the selected bid and that the
  resulting vendor appraisal assignment remains in `offered` state.
- The smoke now verifies a disposable vendor can accept the offered assignment through the public
  assignment invitation token path without sending email.
- The smoke now verifies the disposable vendor can start accepted assignment work from Vendor
  Workspace and that the assignment reaches `in_progress` without report submission.
- The smoke now verifies the disposable vendor can upload the tiny committed
  `e2e/fixtures/amc-smoke-report.pdf` fixture, submit the report from Vendor Workspace, and leave the
  assignment in `submitted` state with `submitted_at` set and `completed_at` empty.
- The smoke now verifies the owner can open the submitted assignment packet from the order, complete
  the submitted disposable vendor report, and leave the assignment in `completed` state without a
  revision request.
- A separate `e2e/amc/amc-revision-smoke.spec.ts` branch now verifies owner revision request and
  disposable vendor report resubmission from a refreshed staging fixture, while leaving the
  assignment uncompleted.
- A separate `e2e/amc/amc-isolation-smoke.spec.ts` branch now verifies Vendor B cannot see, open, bid
  against, start, or report against Vendor A's available work or accepted assignment through
  identity-bound Vendor Workspace UI/RPC paths. It also verifies owner-side ownership remains Vendor
  A.
- A separate `e2e/amc/amc-public-token-smoke.spec.ts` branch now verifies invalid and reused public
  bid/assignment tokens fail closed in UI and data, leaving only one bid response and one accepted
  assignment.
- A separate `e2e/amc/amc-client-request-smoke.spec.ts` branch now verifies a disposable client
  portal request can be seeded, opened in the Client Order Requests area, and converted into a new
  AMC operations order while leaving procurement and all downstream workflows untouched.
- A separate `e2e/amc/amc-invoice-payment-smoke.spec.ts` branch now verifies a completed disposable
  vendor assignment can reach invoice-approved and payment-scheduled UI/state without live payment
  processor credentials, external payment calls, or marking the payment paid.
- The completion, revision, isolation, public-token, and client-request flows deliberately stop
  before invoice and payment automation. The invoice/payment branch deliberately stops before paid
  state or external payment rails. The client-request flow also stops before bid request and vendor
  procurement.
- `npm run e2e:amc:staging` runs only the narrow AMC browser smoke.
- `npm run e2e:amc:revision:staging` runs the separate revision branch against the same disposable
  staging fixture and should be run after fixture refresh, not concurrently with the completion
  branch.
- `npm run e2e:amc:isolation:staging` runs the separate wrong-vendor security branch against the
  same disposable staging fixture and should also be run after fixture refresh.
- `npm run e2e:amc:tokens:staging` runs the separate public-token security branch against the same
  disposable staging fixture and should also be run after fixture refresh.
- `npm run e2e:amc:client-request:staging` runs the separate client portal request conversion branch
  against disposable staging request data.
- `npm run e2e:amc:invoice-payment:staging` runs the separate invoice/payment visibility branch
  against a disposable completed vendor assignment and stops at scheduled payment state.
- AMC E2E staging guard/setup duplication has been consolidated into
  `e2e/amc/helpers/stagingSmoke.ts` for target validation, disposable identity checks, optional
  fixture refresh, sign-in, and login form setup.
- `docs/amc/AMC_E2E_SMOKE_SUITE.md` now documents the AMC smoke suite, required environment,
  grouped scripts, safety guards, out-of-scope areas, and failure interpretation.
- Grouped package scripts now distinguish workflow and security branches:
  `e2e:amc:workflow:staging`, `e2e:amc:security:staging`, and the umbrella
  `e2e:amc:staging`.
- `.github/workflows/amc-staging-smoke.yml` now provides an optional manual-only GitHub Actions
  entrypoint for the AMC staging suite. It requires staging secrets, runs environment profile
  validation and staging deployment preflight, installs Playwright, runs `npm run e2e:amc:staging`,
  and uploads Playwright artifacts on failure.

## Recommended Order

1. Land `AGENTS.md` and this plan.
2. Add Playwright with one read-only local smoke.
3. Extract shared environment target validation.
4. Add deployment preflight as a non-blocking report, then make it blocking after a burn-in period.
5. Promote AMC smoke automation into CI once environment validation is proven.

## Open Risks

- Existing smoke scripts include useful safety checks, but the checks are duplicated and should be
  centralized before broad CI usage.
- Production readiness remains blocked until a final production target, migration replay, backup,
  rollback, storage, Edge Function, auth, and smoke plan are proven.
- Playwright browser smoke needs dedicated test data ownership to avoid depending on real users or
  mutable production-like data.
- CI secrets must use environment-scoped secret stores and never committed env files.
