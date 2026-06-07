# AMC Pilot Readiness Checklist

## Status

AMC is ready for controlled pilot validation after AMC-13 local/staging smoke closeout and the
AMC-14B workspace isolation checkpoint.

Current readiness evidence:

- Local AMC happy path completes through Vendor Payments `Paid`.
- Local AMC edge smoke is repeatable and green.
- Local vendor browser route-isolation coverage is in the targeted Vendor Workspace test suite.
- Hosted staging runtime is deployed to project ref `voompccpkjfcsmehdoqu`.
- Staging runtime probe is clean: 34 RPCs, 3 Edge Functions, 0 failures.
- Staging disposable fixture load succeeds with owner, vendor, and wrong-vendor smoke accounts.
- Staging happy path is green through Vendor Payments `Paid`.
- Staging edge/security smoke is green.
- AMC-14B workspace isolation hardening is complete for route ownership, workspace switch reset,
  secondary surfaces, data/RLS/view boundaries, and operation role-scope audit.

Related closeout evidence:

- [AMC-14B Workspace Isolation Checkpoint](./AMC_14B_WORKSPACE_ISOLATION_CHECKPOINT.md)
- [AMC-14B Workspace Data Isolation Audit](./AMC_14B_WORKSPACE_DATA_ISOLATION_AUDIT.md)
- [AMC-14B Operation Role Scope Audit](./AMC_14B_OPERATION_ROLE_SCOPE_AUDIT.md)

## Environment Readiness

Required before each pilot rehearsal or pilot run:

- Confirm target environment and project ref before any command runs.
- Confirm staging or production pilot environment is not using production data for disposable smoke.
- Confirm Supabase service-role, anon key, and URL values are environment-specific.
- Confirm local `.env.local` and Supabase link metadata do not point at an unintended project.
- Confirm PostgREST schema cache is fresh after migrations.
- Confirm Storage private buckets and Vendor Workspace Edge Functions are available.
- Confirm no smoke command is run without explicit staging or local guardrails.

Readiness commands:

```bash
npm run amc:staging:runtime:check
npm run amc:staging:fixtures:load
npm run amc:staging:smoke:happy
npm run amc:staging:smoke:edge
```

Local repeatability commands:

```bash
npm run supabase:reset:local
npm run amc:smoke:fixtures:load
npm run amc:smoke:edge
```

## Deployment Readiness

Database and function requirements:

- AMC-9 through AMC-12 migrations are applied to the pilot target.
- AMC-13 hardening migrations are applied to the pilot target.
- Vendor Workspace document download Edge Function is deployed:
  `vendor-workspace-document-download-url`.
- Vendor Workspace report upload Edge Function is deployed:
  `vendor-workspace-report-upload-url`.
- Vendor Workspace invoice upload Edge Function is deployed:
  `vendor-workspace-invoice-upload-url`.
- Permission constants and seeded role grants match the deployed frontend.
- PostgREST schema cache is refreshed after deployment.
- Storage buckets remain private and signed access remains authorization-gated.

## Disposable Data

Staging smoke data is disposable and may be reset.

Current disposable staging accounts:

- Owner: `amc.smoke.owner+staging@example.test`.
- Vendor: `amc.smoke.vendor+staging@example.test`.
- Wrong vendor: `amc.smoke.wrongvendor+staging@example.test`.
- Temporary password: `FalconSmoke123!`.

Current disposable staging records:

- Owner company: `falcon_default`.
- Vendor company: `amc-staging-smoke-disposable-vendor`.
- Wrong-vendor company: `amc-staging-smoke-wrong-vendor`.
- AMC order: `AMC-STAGING-SMOKE-001`.
- Report PDF: `/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-report.pdf`.
- Invoice PDF: `/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-invoice.pdf`.

Reset expectations:

- Use `npm run amc:staging:fixtures:load` to restore the staging smoke baseline.
- Smoke fixture records must remain clearly marked as disposable/test-only.
- Do not create pilot fixtures in production unless a production pilot window has been approved.
- Do not reuse real vendor, client, order, invoice, or payment records for smoke validation.

## Owner/Admin Checklist

Before pilot:

- Owner/admin can enter AMC Operations mode.
- Wrong-workspace direct links redirect safely before stale Internal or AMC pages render.
- Switching between Internal and AMC redirects to `/dashboard` with replace navigation and clears
  workspace-scoped filters/search/cache without signing the user out.
- Owner/admin can view AMC order queues and Vendor Directory.
- Owner/admin can create or confirm one AMC-scoped order.
- Candidate matching returns expected vendor candidates.
- Owner/admin can request bids, select a bid, create an assignment offer, request revision,
  complete assignment, review invoice, schedule payment, and mark paid.
- Owner/admin sees internal notes only in internal/AMC surfaces.
- Owner/admin financial visibility follows permission expectations.
- Notification bell, activity links, command palette/search, and dashboard links reflect only the
  selected workspace.

## Vendor Checklist

Before pilot:

- Vendor login resolves to the intended vendor company.
- Vendor Workspace loads without Internal Operations navigation.
- Vendor can see Available Work only for its company.
- Vendor can open work detail and authorized documents only through opaque keys.
- Vendor can submit bid, accept assignment, start work, upload report, resubmit revision, submit
  invoice, correct rejected invoice, and view payment status.
- Vendor cannot access shared `/orders`, internal order detail, wrong-vendor work, wrong-vendor
  assignments, private storage paths, internal notes, client fee, or AMC margin.

## AMC-14B Workspace Isolation Boundary

AMC-14B certifies the current shared-shell isolation controls needed for a controlled pilot:

- protected route ownership checks fail closed for wrong-workspace links;
- Internal/AMC workspace switches reset unsafe page and cache state;
- notifications, unread counts, activity, command palette/search, and recent/dashboard links are
  selected-workspace scoped;
- shared order views and audited RPC families preserve current-company and `operations_scope`
  boundaries;
- explicit operation access metadata is honored by the shell when present.

AMC-14B does not certify full legal/business separation between Internal Operations and AMC
Operations inside one company record. Backend authority is company-scoped today. A dedicated
operation-entitlement model for separate Internal/AMC owners, admins, invitations, and onboarding is
future backend/onboarding/permissions work and must not be assumed complete for pilot launch.

## Known Warnings

- Lint currently passes with existing warnings in unrelated legacy files.
- Build currently passes with the existing Vite large-chunk warning.
- Build currently emits the existing Tailwind ambiguous `ease-[${EASING}]` warning.
- Staging candidate matching may include non-smoke candidates if staging contains other active
  vendor profiles; smoke assertions only require the disposable smoke vendor path to work.
- Service-role storage placement in smoke runners is a test harness convenience for disposable
  PDFs; runtime upload authorization remains handled by Vendor Workspace upload flows.
- Backend operation entitlements do not yet exist as a dedicated server-side model; current
  operation-mode access relies on current-company authority plus shell-level explicit metadata
  support when such metadata is available.

## Deferred Items

The following are intentionally out of AMC pilot MVP scope:

- External payment processor or bank reconciliation.
- Accounting export.
- External email deliverability hardening if production email sending is not yet wired.
- Full visual browser QA outside the current jsdom route-isolation coverage.
- Production data migration.
- Real vendor onboarding at scale.
- Dedicated backend operation-membership/operation-role entitlement model.
- Operation-specific onboarding and invitation workflows for separate Internal/AMC owners.
- Automated vendor selection or first-to-accept routing.
- Client-facing bid approval portal.
- Storage-aware cleanup worker for abandoned test or upload objects.

## Launch Criteria

Launch a controlled AMC pilot only when all are true:

- Target project ref and environment are explicitly confirmed.
- Latest migrations and required Edge Functions are deployed.
- `npm run amc:staging:runtime:check` or the approved target equivalent passes.
- Owner/admin walkthrough passes without blocker defects.
- Vendor Workspace walkthrough passes without blocker defects.
- One controlled AMC order completes through invoice/payment dry run.
- Wrong-vendor and route-isolation checks pass.
- Wrong-workspace Internal/AMC direct-link checks pass.
- Workspace switch reset clears stale filters/search/cache and uses replace navigation.
- No raw ids, private storage paths, internal notes, client fee, or AMC margin are exposed to Vendor
  Workspace.
- Pilot owner explicitly accepts that backend operation entitlement separation is not yet complete.
- Pilot participants and rollback contacts are identified.
- Known warnings and deferred scope are accepted by the pilot owner.

## No-Launch Criteria

Do not launch the pilot if any are true:

- The target environment cannot be confirmed.
- Runtime probe reports missing required RPCs or Edge Functions.
- Any smoke command would touch production data without an approved production pilot window.
- Owner/admin cannot complete bid, assignment, revision, invoice, or payment dry-run workflows.
- Vendor cannot complete bid, assignment, report, invoice, or payment visibility workflows.
- Wrong-vendor denial fails.
- Wrong-workspace direct links render stale Internal or AMC pages.
- Workspace switching preserves unsafe deep-link history or stale workspace data.
- Vendor Workspace exposes raw ids, private storage paths, internal notes, client fee, or AMC
  margin.
- Pilot requires separate legal/business ownership between Internal and AMC inside one company
  before the dedicated backend operation-entitlement model exists.
- Payment or invoice state transitions produce inconsistent ledger or vendor-facing payment status.
- The team cannot identify rollback, support, and defect triage ownership.

## Recommended Pilot Sequence

1. Internal owner/admin walkthrough.
2. Vendor Workspace walkthrough.
3. One controlled AMC order.
4. Payment/invoice dry run.
5. Post-pilot defect review.

## Post-Pilot Review

Capture after the first controlled order:

- Workflow steps completed and timestamps.
- Owner/admin friction points.
- Vendor friction points.
- Any unexpected notifications, missing notifications, or email delivery gaps.
- Invoice/payment state accuracy.
- Document access and upload behavior.
- Any security, route, or data leakage concerns.
- Defects with severity, owner, and recommended fix order.
