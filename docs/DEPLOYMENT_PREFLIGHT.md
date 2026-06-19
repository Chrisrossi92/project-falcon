# Falcon Deployment Preflight

## Purpose

`scripts/deployment-preflight.mjs` is a non-deploying gate for preview, staging, production
read-only evidence, and production release checks. It blocks unsafe deployment intent before any
Vercel promotion, Supabase target switch, production evidence pass, or release workflow.

The preflight reuses `scripts/validate-env-profile.mjs` for environment classification, then adds
deployment-specific checks for migration-state assumptions, E2E target classification, and
production-release approval.

## Commands

```bash
npm run deploy:preflight:preview
npm run deploy:preflight:staging
npm run deploy:preflight:production-readonly
npm run deploy:preflight:production-release
```

## Required Inputs

Common variables:

- `FALCON_APP_BASE_URL`
- `FALCON_SUPABASE_URL`
- `FALCON_MIGRATION_STATE`
- `FALCON_E2E_TARGET_PROFILE`
- `VERCEL_ENV` where available
- `AMC_PRODUCTION_PROJECT_REFS` for production ref classification

Production release also requires:

- `FALCON_DEPLOY_APPROVED=1`

No secrets are required. The preflight prints only safe target metadata.

## Approved Targets

| Target | App URL | Supabase ref | Vercel env | Migration state | E2E target | Release approval |
|---|---|---|---|---|---|---|
| `preview` | Hosted preview, not production-like | Not a known production ref | `preview` | `preview`, `staging-compatible`, or `non-production` | `preview` | Not used |
| `staging` | Not production-like | `voompccpkjfcsmehdoqu` | Not `production` | `staging` or `staging-compatible` | `staging` | Not used |
| `production-readonly` | Production URL allowed | Known production ref | `production` | `production-readonly` or `read-only-evidence` | `production-readonly` | Not used |
| `production-release` | Production URL allowed | Known production ref only | `production` | `production-release-approved` | `production-release` | Required |

## Examples

Preview:

```bash
FALCON_APP_BASE_URL=https://project-falcon-git-feature.vercel.app \
FALCON_SUPABASE_URL=https://voompccpkjfcsmehdoqu.supabase.co \
VERCEL_ENV=preview \
FALCON_MIGRATION_STATE=preview \
FALCON_E2E_TARGET_PROFILE=preview \
npm run deploy:preflight:preview
```

Staging:

```bash
FALCON_APP_BASE_URL=https://staging.example.test \
FALCON_SUPABASE_URL=https://voompccpkjfcsmehdoqu.supabase.co \
FALCON_MIGRATION_STATE=staging \
FALCON_E2E_TARGET_PROFILE=staging \
npm run deploy:preflight:staging
```

Production read-only:

```bash
FALCON_APP_BASE_URL=https://continentalres.com \
FALCON_SUPABASE_URL=https://okwqhkrsjgxrhyisaovc.supabase.co \
VERCEL_ENV=production \
FALCON_MIGRATION_STATE=production-readonly \
FALCON_E2E_TARGET_PROFILE=production-readonly \
npm run deploy:preflight:production-readonly
```

Production release:

```bash
FALCON_APP_BASE_URL=https://continentalres.com \
FALCON_SUPABASE_URL=https://okwqhkrsjgxrhyisaovc.supabase.co \
VERCEL_ENV=production \
FALCON_MIGRATION_STATE=production-release-approved \
FALCON_E2E_TARGET_PROFILE=production-release \
FALCON_DEPLOY_APPROVED=1 \
npm run deploy:preflight:production-release
```

## Failure Behavior

The preflight exits with code `2` when a target is unsafe or incomplete.

It fails closed when:

- `FALCON_DEPLOY_TARGET` is missing or unsupported;
- a preview target uses a known production Supabase ref;
- a staging target does not use `voompccpkjfcsmehdoqu`;
- a local/staging/preview app URL appears production-like;
- production read-only does not use read-only access assumptions;
- production release lacks `FALCON_DEPLOY_APPROVED=1`;
- production release uses the staging Supabase ref;
- production release uses an unknown Supabase ref;
- migration-state or E2E target assumptions do not match the selected deployment target.

## Non-Goals

This preflight does not deploy, mutate data, run migrations, prove migration replay, inspect live
RLS, verify storage, deploy Edge Functions, or replace smoke-test evidence. It is a target
classification and release-intent gate.
