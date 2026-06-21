# AMC E2E Smoke Suite

This document summarizes the staging-only Playwright AMC smoke suite. The suite is designed for
repeatable release confidence against disposable staging records, not for production validation or
full business-process automation.

Approved staging Supabase project ref: `voompccpkjfcsmehdoqu`.

## Specs

| Spec | Group | What it proves |
| --- | --- | --- |
| `e2e/amc/amc-happy-path-smoke.spec.ts` | Workflow | Opens the AMC dashboard/order, verifies procurement state, submits a disposable vendor bid through a token path, selects the bid, creates an assignment offer, accepts it, starts work, submits a tiny report fixture, and completes the report. Stops before invoice/payment. |
| `e2e/amc/amc-revision-smoke.spec.ts` | Workflow branch | Progresses a disposable assignment to report submission, verifies owner revision request, and verifies vendor resubmission. Stops before completion, invoice, and payment. |
| `e2e/amc/amc-client-request-smoke.spec.ts` | Workflow branch | Seeds a disposable client portal request, verifies it in the owner client request area, converts it into an AMC order, and verifies no procurement/assignment/report/invoice/payment workflow was created. |
| `e2e/amc/amc-invoice-payment-smoke.spec.ts` | Workflow branch | Progresses a disposable completed assignment into invoice-approved and payment-scheduled UI/state. Verifies no live payment config and no external payment-provider browser calls. Stops before paid state. |
| `e2e/amc/amc-isolation-smoke.spec.ts` | Security | Verifies a wrong disposable vendor cannot see or act on another vendor's authenticated available-work or assignment workspace state, and that ownership remains unchanged. |
| `e2e/amc/amc-public-token-smoke.spec.ts` | Security | Verifies invalid and reused public bid/assignment tokens fail safely and do not create duplicate or unauthorized bid/assignment state. |

## Run Commands

List all AMC smoke specs without running browser actions:

```sh
npx playwright test --list e2e/amc
```

Run the consolidated workflow group:

```sh
npm run e2e:amc:workflow:staging
```

Run the consolidated security group:

```sh
npm run e2e:amc:security:staging
```

Run the full AMC staging suite:

```sh
npm run e2e:amc:staging
```

The grouped scripts set `E2E_AMC_PREPARE_FIXTURE=1` and `--workers=1` so each branch refreshes the
guarded disposable staging fixture before it runs. Individual spec scripts are still available when a
single branch needs targeted debugging.

## Debugging Strategy

The full end-to-end AMC smoke suite is for release confidence, staging promotion confidence, and
manual CI dispatch. It should not be the default tool for everyday workflow debugging because it
consumes fixture state across many phases and can obscure the actual failure point.

Prefer targeted smokes for isolated workflow phases. A targeted smoke should declare the fixture
state it requires before it starts and the state it intentionally leaves behind. For example,
`e2e/amc/amc-revision-smoke.spec.ts` includes a targeted revision resubmission branch that starts
from a disposable assignment in `revision_requested` and ends with the owner assignment read model in
`submitted`, `submitted_at` populated, `completed_at` empty, and the vendor workspace read model in
`resubmitted_awaiting_review`.

Assertions must match the surface being tested:

- Owner read model assertions should use fields returned by owner/order RPCs.
- Vendor workspace assertions should use fields returned by vendor workspace RPCs and UI.
- Raw DB or RPC payload assertions should only be used when the test directly reads that raw payload
  through an intentionally exposed diagnostic or service-role path.

Do not assert private or raw payload fields through RPCs that intentionally do not expose them. In
the revision smoke debugging incident, a stale assertion expected
`submission_payload.resubmission.resubmitted_at` on the owner assignment list result. That owner read
model did not expose `submission_payload`; the correct assertion used `submitted_at` from the owner
assignment list plus the vendor workspace status `resubmitted_awaiting_review`, which is derived
from the persisted resubmission metadata.

If a full smoke hangs, do not blindly rerun it. Create or expand a targeted diagnostic smoke for the
phase under investigation, then return to the full smoke only after the isolated phase is understood.

Recommended cadence:

- Use targeted smokes during feature work and debugging.
- Run the full smoke before release, staging promotion, or a major AMC workflow merge.
- Let GitHub Actions run the full smoke through manual dispatch, and only add schedules after
  staging fixture ownership, runtime cost, and secret governance are reviewed.

## GitHub Actions

`.github/workflows/amc-staging-smoke.yml` provides an optional manual-only CI entrypoint. It is
triggered only through `workflow_dispatch` and runs the same consolidated suite after environment
profile validation, staging deployment preflight, and Playwright browser installation.

Required GitHub repository or environment secrets:

```sh
E2E_BASE_URL
FALCON_SUPABASE_URL
FALCON_SUPABASE_SERVICE_ROLE_KEY
FALCON_SUPABASE_ANON_KEY
AMC_STAGING_SMOKE_OWNER_EMAIL
AMC_STAGING_SMOKE_VENDOR_EMAIL
AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL
AMC_STAGING_SMOKE_CLIENT_EMAIL
AMC_STAGING_SMOKE_PASSWORD
```

Optional:

```sh
AMC_PRODUCTION_PROJECT_REFS
```

Use GitHub environment protection for these staging secrets if the repository supports it. The
workflow maps the Falcon secret names into the AMC-specific env names used by the specs and pins
`AMC_STAGING_PROJECT_REF` / `FALCON_SUPABASE_PROJECT_REF` to `voompccpkjfcsmehdoqu`.

To run it manually:

1. Open GitHub Actions.
2. Select **AMC Staging E2E Smoke**.
3. Choose **Run workflow**.
4. Review failure artifacts under `amc-staging-smoke-artifacts` when a run fails.

The workflow does not include live credentials and should not be enabled on schedules until staging
fixture ownership, runtime cost, and secret governance are reviewed.
CI uses Node 22 because Supabase Realtime expects native WebSocket support when initialized in Node.

## Required Environment

Required for staging execution:

```sh
E2E_TARGET=staging
E2E_ALLOW_STAGING=1
E2E_BASE_URL=https://<approved-staging-app-url>
AMC_STAGING_PROJECT_REF=voompccpkjfcsmehdoqu
AMC_STAGING_SUPABASE_URL=https://voompccpkjfcsmehdoqu.supabase.co
AMC_STAGING_SUPABASE_ANON_KEY=<staging-anon-or-publishable-key>
AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-or-secret-key>
```

Optional fixture identity overrides must stay disposable:

```sh
AMC_STAGING_SMOKE_OWNER_EMAIL=amc.smoke.owner+staging@example.test
AMC_STAGING_SMOKE_CLIENT_EMAIL=amc.smoke.client+staging@example.test
AMC_STAGING_SMOKE_VENDOR_EMAIL=amc.smoke.vendor+staging@example.test
AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL=amc.smoke.wrongvendor+staging@example.test
AMC_STAGING_SMOKE_PASSWORD=<smoke-password>
AMC_SMOKE_ARTIFACT_DIR=<optional artifact directory>
```

Only reserved `example.test` or `example.invalid` addresses are accepted by the AMC smoke guards.
If `AMC_SMOKE_ARTIFACT_DIR` is unset, fixture artifacts are written below `RUNNER_TEMP`, `TMPDIR`,
or the OS temp directory, in that order, under `project-falcon-amc-smoke/`.

## Safety Guards

Every AMC staging spec uses the shared helper in `e2e/amc/helpers/stagingSmoke.ts` for common guard
and setup behavior:

- requires `E2E_TARGET=staging`;
- requires `E2E_ALLOW_STAGING=1`;
- requires Supabase ref `voompccpkjfcsmehdoqu` from both explicit env and URL classification;
- refuses known production Supabase refs;
- inherits the Playwright production-like URL guard;
- refuses non-disposable owner, vendor, wrong-vendor, or client emails when used by a spec;
- keeps fixture preparation opt-in through `E2E_AMC_PREPARE_FIXTURE=1`;
- refuses live/production payment processor env values in the invoice/payment branch.

The suite does not include live credentials and does not require production credentials.

## Intentionally Not Tested

The suite intentionally does not test:

- production Supabase, production URLs, or production payment configuration;
- real client/vendor/staff emails;
- real payment processors, bank rails, or paid settlement;
- client invoicing/payment;
- broad destructive cleanup outside disposable fixture refresh;
- concurrency across stateful smoke branches;
- non-AMC/internal workspace workflows;
- long-form exploratory UX testing.

## Interpreting Failures

Guard failures are expected when required safety env vars are missing or unsafe:

- `E2E_TARGET=staging requires E2E_ALLOW_STAGING=1` means staging approval was not explicit.
- `Profile staging requires Supabase project ref voompccpkjfcsmehdoqu` means the configured Supabase
  target is not the approved staging project.
- `Refusing Playwright E2E against production-like URL` means the app URL looks production-like.
- Disposable email failures mean an override used a real or non-reserved email domain.
- Live payment config failures mean a live/production payment key or mode was present.

Fixture-state failures usually mean a prior run left the disposable order in a later lifecycle state.
Run the grouped scripts or rerun the target branch with `E2E_AMC_PREPARE_FIXTURE=1`.

UI assertion failures should be read with the Playwright trace, screenshot, and error context. They
usually indicate one of three things:

- staging schema/RPC drift from the app build;
- a real UI text or accessibility-label change that requires selector maintenance;
- a product regression in the workflow state being asserted.

External payment-provider route failures in the invoice/payment spec should be treated as a release
blocker unless the payment boundary has been explicitly re-scoped.
