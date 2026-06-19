# Falcon E2E Smoke Tests

This folder contains the Playwright foundation for Falcon browser checks. It is intentionally
minimal: the first smoke only proves the app can load a known public route and handles the
unauthenticated state without using real credentials.

## Commands

Run the local smoke against a local Vite server:

```bash
npm run e2e:local
```

Run the staging smoke only with an explicit non-production app URL:

```bash
E2E_BASE_URL=https://<approved-staging-app-url> npm run e2e:staging
```

## Safety Rules

- Production URLs are refused by `playwright.config.ts`.
- `E2E_TARGET=local` only accepts localhost URLs.
- `E2E_TARGET=staging` requires `E2E_ALLOW_STAGING=1` and an explicit `E2E_BASE_URL`.
- The approved AMC staging Supabase project ref remains `voompccpkjfcsmehdoqu`.
- The known legacy production/archive ref is denied through `AMC_PRODUCTION_PROJECT_REFS`, defaulting
  to `okwqhkrsjgxrhyisaovc`.
- These tests do not require real production credentials and must not mutate production data.

## Artifacts

Playwright retains trace, screenshot, and video artifacts only on failure. The HTML report is
generated locally and should not be committed.

## Scope

Current scope:

- app loads;
- `/login` renders;
- unauthenticated sign-in UI is visible;
- no credentials are submitted.

Out of scope for this foundation:

- full AMC workflow automation;
- production smoke mutations;
- real user credential handling;
- data setup, fixture loading, or document upload/download checks.

