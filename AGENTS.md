# Project Falcon Agent Operating Rules

## Purpose

This file defines how AI agents must operate in Project Falcon. It is repo-level guidance for
planning, editing, testing, and reporting work without weakening Falcon's environment, governance,
or production safety posture.

Agents must treat this file as authoritative unless the user explicitly gives a narrower
instruction for the current task. When instructions conflict, preserve production safety,
environment separation, and Falcon's RPC-first governance model.

## Required Orientation Before Work

Before proposing or implementing non-trivial work, read the relevant current governance docs:

- `docs/ROADMAP.md`
- `docs/CONTRIBUTING.md`
- `docs/OPERATIONAL_GOVERNANCE_SNAPSHOT.md`
- `docs/SUPABASE_ENVIRONMENT_ARCHITECTURE_AND_MIGRATION_PLAN.md`
- `docs/ENVIRONMENT_PARITY_CHECKLIST.md`
- `docs/PRODUCTION_READINESS_AUDIT.md`
- `docs/amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md` for AMC work

For small mechanical tasks, read only the docs needed to avoid violating these rules. For work that
changes milestones, environment behavior, deployment posture, database authority, or AMC workflows,
read the full relevant governance set first.

## Operating Principles

- Keep changes small and shippable.
- Follow conventional commit and branch expectations from `docs/CONTRIBUTING.md`.
- Preserve RLS-first and RPC-only write doctrine.
- Prefer backend-owned authoritative mutations through guarded RPCs, triggers, or Edge-mediated
  paths.
- Do not add new direct frontend domain writes for orders, workflow status, lifecycle fields,
  participant assignment columns, activity, notifications, documents, assignments, team access, or
  relationship lifecycle state.
- Do not introduce hidden lifecycle destruction such as hard delete, reopen, restore, unarchive,
  bulk lifecycle actions, or table-menu lifecycle actions without an explicit design slice.
- Keep activity and notification payloads safe. Do not expose signed URLs, storage paths, bucket
  names, internal notes, hidden packet data, or unrelated account details.
- Treat source scans and tests as governance enforcement, not optional cleanup.

## Environment Safety

Falcon has separate environment roles:

- Local development may use local Supabase or a hosted target. Verify the target before scripts,
  smoke tests, migrations, resets, or data-affecting work.
- The approved AMC staging target is Supabase project ref `voompccpkjfcsmehdoqu`.
- Legacy hosted production/archive is project ref `okwqhkrsjgxrhyisaovc`.
- Future clean production is not assumed to exist until explicitly identified and validated.

Before running any environment-dependent script, record or verify:

- the Supabase URL and project ref;
- whether the target is local, approved AMC staging, preview, legacy production/archive, or future
  production;
- whether the script can mutate data, deploy functions, change secrets, reset state, or alter
  storage;
- whether the script has built-in production-ref refusal checks.

Never assume `.env.local` or `.env.staging.local` points to disposable data. Never print, copy,
commit, or summarize secret values.

## Production Restrictions

Agents must not mutate production Supabase projects.

Forbidden without explicit human-run production cutover authorization:

- production database migrations;
- production data writes, deletes, resets, imports, fixture loads, or smoke mutations;
- production storage bucket/object changes;
- production Edge Function deploys or secret changes;
- production Vercel environment variable changes;
- direct patches to legacy production to make modern company-scoped features work.

Legacy production/archive must remain stable until an approved cutover path proves migration replay,
bootstrap, smoke validation, backup, rollback, storage, Edge Functions, secrets, and environment
parity.

## Staging And AMC Smoke Rules

AMC staging automation must target only `voompccpkjfcsmehdoqu`.

Use existing staging safety conventions:

- require explicit `AMC_STAGING_PROJECT_REF`;
- require the staging Supabase URL to match the approved staging ref;
- require staging anon/service credentials from approved local or secret stores;
- honor `AMC_PRODUCTION_PROJECT_REFS` deny lists;
- refuse production-like app URLs;
- use disposable smoke accounts, orders, documents, and artifacts only.

AMC workflow checks should follow `docs/amc/AMC_FULL_MVP_SMOKE_TEST_PLAN.md` and cover the happy
path plus edge cases where relevant: wrong-vendor denial, raw id/storage-path leakage, internal note
leakage, workspace separation, document access, rejected invoice correction, and vendor isolation.

## Code Change Expectations

Before editing:

- inspect the current worktree and relevant files;
- avoid reverting user changes;
- identify whether the change is docs-only, frontend-only, backend/Supabase, environment, or
  deployment-related;
- state the intended scope when the work is more than trivial.

When editing:

- do not change application code for documentation-only tasks;
- keep app changes aligned with existing patterns;
- update tests near the changed behavior;
- avoid unrelated refactors;
- keep generated or mechanical churn out of commits unless required.

## Tests And Smoke Checks

After code changes, run the narrowest meaningful checks first, then broaden based on risk.

Expected checks:

- docs-only: `git diff --check`; run any available docs or inventory check if the task changes doc
  structure or audit artifacts.
- frontend/runtime code: focused Vitest tests, then `npm run lint` and broader `npm run test` when
  risk warrants.
- Supabase/RPC/migration work: focused migration/source-scan tests, local replay or targeted SQL
  verification where safe, and environment target verification before any database command.
- AMC workflow work: relevant AMC fixture, happy-path, edge, browser, or manual smoke checks against
  local or approved staging only.
- deployment/environment work: environment classification, project-ref verification, CSP/env
  review, rollback notes, and preflight evidence.

If checks cannot be run, report the reason and the residual risk.

## Roadmap And Documentation Updates

Update roadmap or governance docs when a change alters:

- milestone status;
- environment posture;
- production readiness;
- deployment or cutover assumptions;
- database authority or RPC ownership;
- smoke-test expectations or results;
- AMC workflow coverage;
- deferred governance debt.

Do not silently let implementation and governance docs diverge. If the work completes a milestone,
records a blocker, or changes a go/no-go decision, update the appropriate roadmap, audit, smoke, or
readiness document in the same task.

## Standard Final Report

Every agent final report should use this format when work was performed:

```text
Summary
- What changed.
- What did not change, especially if production/runtime behavior was intentionally untouched.

Files Changed
- path: short purpose.

Validation
- Checks run and results.
- Checks not run and why.

Risks
- Remaining risks, blockers, or follow-up constraints.

Next Steps
- Only concrete next actions that follow from this work.
```

For review-only or audit-only tasks, replace `Files Changed` with `Evidence Reviewed`.

