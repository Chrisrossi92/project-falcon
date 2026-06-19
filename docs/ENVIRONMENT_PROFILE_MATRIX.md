# Falcon Environment Profile Matrix

## Purpose

This matrix defines the approved environment profiles used by `scripts/validate-env-profile.mjs`.
It is an automation safety reference and does not change application behavior, Supabase projects,
Vercel settings, secrets, migrations, or deployment state.

## Profiles

| Profile | Intended use | App URL requirement | Supabase requirement | Production ref behavior | Vercel label behavior |
|---|---|---|---|---|---|
| `local` | Local development and local E2E smoke | Must be localhost | Must be localhost Supabase | Refused | Refuses `VERCEL_ENV=production` |
| `staging` | Approved AMC staging validation | Must not be production-like | Must be hosted project ref `voompccpkjfcsmehdoqu` | Refused | Refuses `VERCEL_ENV=production` |
| `preview` | Hosted preview validation before promotion | Must be hosted and not production-like | Must not be a known production ref | Refused | Refuses `VERCEL_ENV=production` |
| `production-readonly` | Read-only production evidence only | May be production-like | Must be listed in `AMC_PRODUCTION_PROJECT_REFS` | Allowed only with read-only access | Requires `VERCEL_ENV=production` when set |

## Known Refs

- Approved AMC staging Supabase project ref: `voompccpkjfcsmehdoqu`.
- Known legacy production/archive ref defaults to `okwqhkrsjgxrhyisaovc` through the existing AMC
  staging helper's production-ref deny list.
- Additional production refs must be supplied through `AMC_PRODUCTION_PROJECT_REFS`.

## Inputs

The validator reads safe target metadata from these variables:

- `FALCON_ENV_PROFILE`
- `FALCON_ENV_ACCESS`
- `FALCON_APP_BASE_URL`, `E2E_BASE_URL`, `APP_URL`, `PUBLIC_SITE_URL`, or `SITE_URL`
- `FALCON_SUPABASE_URL`, `AMC_STAGING_SUPABASE_URL`, `SUPABASE_URL`, or `VITE_SUPABASE_URL`
- `FALCON_SUPABASE_PROJECT_REF`, `AMC_STAGING_PROJECT_REF`, or `SUPABASE_PROJECT_REF`
- `VERCEL_ENV`
- `AMC_PRODUCTION_PROJECT_REFS`

Secrets are not required for profile validation and must not be printed in validator output.

## Commands

```bash
npm run env:check:local
npm run env:check:staging
npm run env:check:preview
npm run env:check:production-readonly
```

For explicit examples:

```bash
FALCON_APP_BASE_URL=http://127.0.0.1:5173 \
FALCON_SUPABASE_URL=http://127.0.0.1:54321 \
npm run env:check:local

FALCON_APP_BASE_URL=https://staging.example.test \
FALCON_SUPABASE_URL=https://voompccpkjfcsmehdoqu.supabase.co \
npm run env:check:staging

FALCON_APP_BASE_URL=https://project-falcon-git-feature.vercel.app \
FALCON_SUPABASE_URL=https://voompccpkjfcsmehdoqu.supabase.co \
VERCEL_ENV=preview \
npm run env:check:preview

FALCON_APP_BASE_URL=https://continentalres.com \
FALCON_SUPABASE_URL=https://okwqhkrsjgxrhyisaovc.supabase.co \
VERCEL_ENV=production \
npm run env:check:production-readonly
```

## Safety Rules

- `local`, `staging`, and `preview` never allow known production Supabase refs.
- `local` and `staging` refuse production-like app URLs.
- `production-readonly` is the only profile that can validate a known production ref, and only in
  read-only mode.
- The validator is a preflight guard. It does not prove migrations, RLS, auth, storage, Edge
  Function deployment, data parity, or production readiness by itself.
