# AMC E2E Smoke

This directory contains the Playwright AMC smoke specs for approved staging only.

For the suite-level runbook, grouped scripts, safety matrix, and failure interpretation guidance,
see `docs/amc/AMC_E2E_SMOKE_SUITE.md`.

## Current Smoke

`amc-happy-path-smoke.spec.ts` verifies:

- the run is explicitly targeting staging;
- `E2E_ALLOW_STAGING=1` is present;
- the Supabase project ref is the approved AMC staging ref `voompccpkjfcsmehdoqu`;
- the app URL is not production-like;
- disposable smoke owner and vendor emails use reserved `example.test` or `example.invalid` domains;
- the disposable AMC fixture order exists;
- the disposable vendor fixture can see the expected available-work row;
- the owner can log in, open the AMC dashboard, search/open the smoke order, and see AMC order context.
- the owner can open procurement details for the smoke order;
- the visible bid request panel reflects the fixture's expected state: one sent request, one sent
  disposable vendor recipient, and zero responses.
- the owner can generate a disposable public bid invitation token directly from staging test data;
- the public vendor bid invitation page loads unauthenticated without sending email;
- the disposable vendor can submit one safe test bid response;
- the owner procurement UI reflects one response and shows the submitted fee, turn time, and
  comments without selecting the bid.
- the owner can select the disposable submitted bid;
- the procurement UI reflects the selected response while assignment creation remains untouched.
- the owner can create an assignment offer from the selected disposable bid;
- the order UI reflects the assignment-offered state;
- the owner assignment record exists for the disposable vendor and remains unaccepted.
- the owner can generate a disposable assignment invitation token directly from staging test data;
- the public assignment offer page loads unauthenticated without sending email;
- the disposable vendor can accept the assignment offer;
- the order UI and owner assignment record reflect accepted state while work remains unstarted.
- the disposable vendor can open the authenticated Vendor Workspace assigned-order detail;
- the disposable vendor can start work;
- the vendor UI and owner assignment record reflect in-progress state while report submission remains
  untouched.
- the disposable vendor can upload the tiny committed report fixture
  `e2e/fixtures/amc-smoke-report.pdf`;
- the disposable vendor can submit the report through Vendor Workspace;
- the vendor UI and owner order UI reflect submitted / awaiting-review state;
- the owner assignment record has `submitted_at` set while `completed_at` remains empty.
- the owner can open the submitted assignment packet from the smoke order;
- the owner can complete the submitted disposable vendor report without requesting revision;
- the owner UI and assignment record reflect completed state.

It does not automate invoice handling, payment state, wrong-vendor denial, or destructive cleanup.

`amc-revision-smoke.spec.ts` is a separate staging-only branch. It verifies:

- the same approved staging profile, URL, Supabase ref, and disposable-email guards;
- the disposable fixture can be progressed through report submission;
- the owner can open the submitted assignment packet and request a safe disposable revision;
- the owner order UI and assignment record reflect `revision_requested`;
- the assignment remains uncompleted;
- the disposable vendor can upload the tiny committed report fixture again as a revised report;
- the vendor can resubmit the report from Vendor Workspace;
- the owner UI returns to submitted / awaiting-review state;
- the owner assignment read model shows `submitted_at` while `completed_at` remains empty;
- the vendor workspace read model shows `resubmitted_awaiting_review`.

The revision branch does not complete the assignment, request a second revision, invoice, pay, or
clean up records.

The targeted revision resubmission branch in `amc-revision-smoke.spec.ts` is intended for isolated
debugging. It requires the disposable assignment to start in `revision_requested` and leaves it in
`submitted` / `resubmitted_awaiting_review`. Do not use owner assignment-list assertions for private
payload fields such as `submission_payload.resubmission.resubmitted_at`; assert the owner and vendor
read models actually returned by the workflow.

`amc-isolation-smoke.spec.ts` is a separate staging-only security branch. It verifies:

- the same approved staging profile, URL, Supabase ref, and disposable-email guards;
- the disposable fixture includes Vendor A and Vendor B;
- Vendor B cannot see Vendor A's available-work row;
- Vendor B cannot open Vendor A available-work detail by work key;
- Vendor B cannot submit a bid response through the authenticated Vendor Workspace RPC for Vendor
  A's work key;
- Vendor A public bid and assignment invitation links show they were sent to Vendor A, not Vendor B;
- Vendor A can accept the assignment, after which Vendor B still cannot see or open Vendor A's
  assigned work;
- Vendor B cannot start work or submit report actions for Vendor A's assignment;
- owner-side assignment ownership remains Vendor A and no start/submission/completion fields are
  created by Vendor B.

The isolation branch does not complete the assignment, invoice, pay, or attempt destructive cleanup.
Public invitation URLs are bearer-token routes, so this smoke does not click token actions while
acting as Vendor B; identity-bound denial is verified through Vendor Workspace UI/RPC paths.

`amc-public-token-smoke.spec.ts` is a separate staging-only public-token security branch. It
verifies:

- invalid bid invitation tokens show the safe unavailable UI and expose no submit action;
- invalid bid tokens do not create bid responses;
- a disposable bid token can submit exactly one response;
- revisiting or submitting the same bid token again is blocked and leaves only one response;
- invalid assignment offer tokens show the safe unavailable UI and expose no accept action;
- invalid assignment tokens do not accept assignments;
- a disposable assignment offer token can accept exactly once;
- revisiting or accepting the same assignment token again is blocked and leaves one accepted Vendor A
  assignment with no start, report, completion, invoice, or payment state.

`amc-client-request-smoke.spec.ts` is a separate staging-only client-request conversion branch. It
verifies:

- the same approved staging profile, URL, Supabase ref, and disposable-email guards;
- a disposable client portal member and client request can be seeded with staging service-role test
  credentials;
- the owner can open the Client Order Requests area and see the disposable request;
- the owner can convert the request through the browser confirmation flow;
- the request moves to accepted/converted state and points at the created AMC order;
- the resulting order is in AMC operations scope and starts in `new` status;
- no bid request, assignment, document, report, invoice, or payment workflow is created by
  conversion.

The client-request branch stops before procurement. It does not send client email, create bid
requests, invite vendors, create assignments, upload reports, invoice, pay, or clean up records.

`amc-invoice-payment-smoke.spec.ts` is a separate staging-only invoice/payment visibility branch. It
verifies:

- the same approved staging profile, URL, Supabase ref, and disposable-email guards;
- live/production payment processor environment values are refused;
- the disposable AMC fixture can be progressed to a completed vendor assignment using staging-safe
  smoke workflow helpers;
- the disposable vendor invoice can be submitted and approved through supported staging RPCs;
- the owner can schedule a vendor payment record without marking it paid;
- the owner vendor directory shows the invoice/payment ledger surfaces and states that no bank
  transfer is initiated;
- the vendor payments page shows the scheduled invoice/payment state tied to the disposable
  assignment;
- no Stripe, PayPal, Adyen, Square, Braintree, Checkout.com, or Authorize.net browser request is
  made during the UI verification.

The invoice/payment branch stops at scheduled/payment-ready state. It does not mark payments paid,
call external payment processors, invoice/pay clients, or clean up records.

## Required Environment

Required:

```sh
E2E_TARGET=staging
E2E_ALLOW_STAGING=1
E2E_BASE_URL=https://<approved-staging-app-url>
AMC_STAGING_PROJECT_REF=voompccpkjfcsmehdoqu
AMC_STAGING_SUPABASE_URL=https://voompccpkjfcsmehdoqu.supabase.co
AMC_STAGING_SUPABASE_ANON_KEY=<staging-anon-or-publishable-key>
```

Optional:

```sh
AMC_STAGING_SMOKE_ORDER_NUMBER=AMC-STAGING-SMOKE-001
AMC_STAGING_SMOKE_OWNER_EMAIL=amc.smoke.owner+staging@example.test
AMC_STAGING_SMOKE_CLIENT_EMAIL=amc.smoke.client+staging@example.test
AMC_STAGING_SMOKE_VENDOR_EMAIL=amc.smoke.vendor+staging@example.test
AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL=amc.smoke.wrongvendor+staging@example.test
AMC_STAGING_SMOKE_VENDOR_NAME=AMC SMOKE - DO NOT USE Vendor
AMC_STAGING_SMOKE_PASSWORD=<smoke-password>
AMC_STAGING_SMOKE_BID_AMOUNT=725
AMC_STAGING_SMOKE_BID_TURN_TIME_DAYS=6
AMC_STAGING_SMOKE_BID_COMMENTS=AMC staging Playwright disposable token bid response.
E2E_AMC_PREPARE_FIXTURE=1
AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-or-secret-key>
AMC_SMOKE_ARTIFACT_DIR=<optional artifact directory>
```

Use `E2E_AMC_PREPARE_FIXTURE=1` only when the disposable fixture should be loaded or refreshed.
That path reuses `scripts/load-amc-staging-smoke-fixtures.mjs`, which is staging-guarded and
refuses production refs.

When `AMC_SMOKE_ARTIFACT_DIR` is not set, fixture artifacts are written under the first available
temp root: `RUNNER_TEMP`, `TMPDIR`, then the OS temp directory, in `project-falcon-amc-smoke/`.

The token bid submission, owner bid selection, owner assignment-offer creation, vendor assignment
acceptance, vendor start-work action, report upload, report submission, and owner report completion
mutate only disposable fixture-owned records. Refresh the fixture with `E2E_AMC_PREPARE_FIXTURE=1`
before rerunning the full smoke against the same staging records.

The revision branch uses the same single disposable staging smoke order. Run it separately from the
completion branch and refresh the fixture first so the branch starts from a clean bid-request state.
For revision resubmission debugging, prefer the targeted branch over rerunning the full
bid-to-resubmission chain. If the full revision smoke hangs, add diagnostics to the targeted phase
instead of repeatedly rerunning the full smoke.

The client-request conversion branch requires `AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY` because it
creates or refreshes a disposable client portal member and request directly in approved staging test
data. The seeded client email must remain on a reserved `example.test` or `example.invalid` domain.

## Commands

List the smoke without running browser actions:

```sh
npx playwright test --list e2e/amc/amc-happy-path-smoke.spec.ts
npx playwright test --list e2e/amc/amc-revision-smoke.spec.ts
npx playwright test --list e2e/amc/amc-isolation-smoke.spec.ts
npx playwright test --list e2e/amc/amc-public-token-smoke.spec.ts
npx playwright test --list e2e/amc/amc-client-request-smoke.spec.ts
npx playwright test --list e2e/amc/amc-invoice-payment-smoke.spec.ts
```

Run the staging smoke:

```sh
npm run e2e:amc:staging
npm run e2e:amc:revision:staging
npm run e2e:amc:isolation:staging
npm run e2e:amc:tokens:staging
npm run e2e:amc:client-request:staging
npm run e2e:amc:invoice-payment:staging
```

## Safety Rules

- Do not point this smoke at production URLs.
- Do not point this smoke at production Supabase refs.
- Do not use real client, vendor, or staff email addresses.
- Do not send bid email from this smoke; it uses the token returned by the staging RPC directly.
- Do not send assignment email from this smoke; it uses the token returned by the staging RPC
  directly.
- Do not send client email from the client-request conversion smoke; it seeds disposable staging
  request data directly.
- Do not upload real reports from this smoke; use only `e2e/fixtures/amc-smoke-report.pdf`.
- Do not use real payment processor credentials; live payment keys and live/production payment
  processor modes are refused.
- Do not invoice or pay from this smoke.
- Do not mark vendor payments paid from the invoice/payment visibility smoke; it stops at scheduled
  payment-ready state.
- Do not enable fixture preparation unless disposable staging fixture records are intended.
- Do not add full AMC workflow mutation steps here until Phase 5 explicitly promotes them.

Shared staging guard, disposable identity, fixture refresh, sign-in, and login helpers live in
`e2e/amc/helpers/stagingSmoke.ts`. Keep scenario-specific workflow helpers inside the relevant spec
unless the same behavior is reused by multiple specs without changing fixture state assumptions.
