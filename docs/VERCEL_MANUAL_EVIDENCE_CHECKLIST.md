# Vercel Manual Evidence Checklist

## Purpose

Use this checklist to capture Vercel production evidence before any environment, CSP, domain,
deployment, build, or Supabase setting changes.

This is evidence capture only.

## Strict Rules

- Do not change Vercel settings.
- Do not edit environment variables.
- Do not reveal or paste environment variable values.
- Do not reveal anon key values.
- Do not reveal service-role values.
- Do not take screenshots that show secrets, key previews, token previews, or full env values.
- Do not redeploy.
- Do not promote, rollback, or alias a deployment.
- Do not edit domains.
- Do not edit build settings.
- Do not edit protection/security settings.
- Do not update CSP.
- Do not change Supabase settings.
- Do not link the local repo to Vercel unless a later slice explicitly plans that step.

Safe to record:

- project names;
- repository names;
- branch names;
- deployment commit SHAs;
- deployment dates/times;
- domain names;
- environment variable names only;
- Supabase project refs visible in URLs;
- safe enabled/disabled summaries;
- header names and safe origin hostnames.

## Evidence Status Values

Use one of these statuses for every item:

- `Verified`: observed value matches the expected production-readiness direction.
- `Mismatch`: observed value conflicts with the expected direction or known docs.
- `Needs decision`: observed value is unknown, ambiguous, not visible, or requires owner approval.

## Expected Runtime Assumptions

- Modern staging Supabase project ref: `voompccpkjfcsmehdoqu`.
- Legacy hosted Supabase project ref: `okwqhkrsjgxrhyisaovc`.
- Legacy hosted project is source/archive only, not the target for modern company-scoped runtime
  behavior unless explicitly approved as a temporary compatibility decision.
- Local repo is a Vite React app.
- Local repo build command is `vite build`.
- Local Vite output directory is `dist`.
- Current repo `vercel.json` CSP still references legacy Supabase host
  `https://okwqhkrsjgxrhyisaovc.supabase.co` in `connect-src`.

## Dashboard Walkthrough

### 1. Project Overview

Where to inspect:

- Vercel dashboard;
- select the Falcon frontend project;
- open the project Overview page.

Record:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Vercel project name |  |  |  |
| Vercel project URL/link |  |  |  |
| Framework shown in overview, if visible |  |  |  |
| Latest production deployment shown on overview |  |  |  |
| Production deployment status |  |  |  |

Notes to paste back:

```text
Project Overview notes:

```

### 2. Git Settings

Where to inspect:

- Project Settings;
- Git section.

Record:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Connected Git provider |  |  |  |
| Connected repository |  |  |  |
| Production branch |  |  |  |
| Auto-deploy behavior from production branch |  |  |  |
| Preview deployment behavior for pull requests/branches |  |  |  |

Expected comparison:

- connected repository should be `Chrisrossi92/project-falcon` unless intentionally different;
- production branch should be `main` unless a release branch was intentionally configured.

Notes to paste back:

```text
Git settings notes:

```

### 3. Domains

Where to inspect:

- Project Domains page or Project Settings > Domains.

Record:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Production domain(s) |  |  |  |
| Primary domain |  |  |  |
| Vercel-generated production domain, if visible |  |  |  |
| Preview/deployment domain pattern |  |  |  |
| Domain verification status summary |  |  |  |

Do not change domain assignments or aliases.

Notes to paste back:

```text
Domain notes:

```

### 4. Environment Variables

Where to inspect:

- Project Settings;
- Environment Variables.

Record names only. Do not copy values.

Production:

| Env var name | Target/environment | Status | Required follow-up |
|---|---|---|---|
|  | Production |  |  |
|  | Production |  |  |
|  | Production |  |  |

Preview / Development:

| Env var name | Target/environment | Status | Required follow-up |
|---|---|---|---|
|  | Preview |  |  |
|  | Development |  |  |
|  | Preview/Development |  |  |

Expected frontend names:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`;
- any browser-safe map/app-origin keys currently in use.

Expected function/server-side names, if functions are configured in Vercel or documented there:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- app origin / redirect origin names if present.

Supabase target classification:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Production Supabase target classification | `legacy` / `modern staging` / `future production` / `unknown` |  |  |
| Preview Supabase target classification | `legacy` / `modern staging` / `future production` / `unknown` |  |  |
| Development Supabase target classification | `legacy` / `modern staging` / `future production` / `unknown` |  |  |

Safe target classification rule:

- If `VITE_SUPABASE_URL` visibly contains `voompccpkjfcsmehdoqu`, classify as `modern staging`.
- If it visibly contains `okwqhkrsjgxrhyisaovc`, classify as `legacy`.
- If it points to another Supabase ref, record only the project ref and classify as `future
  production` only if that has already been approved.
- If the value is hidden and the project ref is not visible, classify as `unknown`.

Notes to paste back:

```text
Environment variable notes:

```

### 5. Build And Development Settings

Where to inspect:

- Project Settings;
- Build & Development Settings.

Record:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Framework preset |  |  |  |
| Build command |  |  |  |
| Output directory |  |  |  |
| Install command, if customized |  |  |  |
| Development command, if customized |  |  |  |
| Node/runtime version, if configured |  |  |  |
| Root directory, if configured |  |  |  |

Expected comparison:

- framework should be compatible with Vite;
- build command should be `vite build`, `npm run build`, or an equivalent approved command;
- output directory should be `dist` unless Vercel framework preset derives it automatically;
- install command should be default unless intentionally customized.

Notes to paste back:

```text
Build settings notes:

```

### 6. Deployment History

Where to inspect:

- Project Deployments page;
- filter or identify the latest production deployment.

Record:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Latest production deployment URL/name |  |  |  |
| Latest production deployment commit SHA |  |  |  |
| Latest production deployment commit message/title, if visible |  |  |  |
| Latest production deployment branch |  |  |  |
| Latest production deployment date/time |  |  |  |
| Deployment status |  |  |  |
| Deployment source |  |  |  |
| Deployment history available |  |  |  |
| Rollback/promote controls visible |  |  |  |

Do not click rollback, promote, redeploy, or remove.

Notes to paste back:

```text
Deployment history notes:

```

### 7. Latest Deployment Details

Where to inspect:

- open the latest production deployment details page;
- inspect Summary / Source / Build / Functions / Domains / Runtime Logs if visible.

Record:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Deployment commit SHA |  |  |  |
| Deployment branch |  |  |  |
| Build command used |  |  |  |
| Output directory/build output summary |  |  |  |
| Framework/runtime summary |  |  |  |
| Functions detected, if any |  |  |  |
| Build logs accessible |  |  |  |
| Runtime logs accessible |  |  |  |

Notes to paste back:

```text
Latest deployment details notes:

```

### 8. Protection / Security Settings

Where to inspect:

- Project Settings;
- Deployment Protection / Security / Firewall / Password Protection sections, depending on Vercel
  dashboard naming.

Record safe summaries only:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| Production deployment protection |  |  |  |
| Preview deployment protection |  |  |  |
| Password protection / SSO / team access summary |  |  |  |
| Firewall/WAF/security features summary, if visible |  |  |  |
| Vercel Authentication / trusted IP behavior, if visible |  |  |  |

Do not change protection settings.

Notes to paste back:

```text
Protection/security notes:

```

### 9. Deployed Headers / CSP Evidence

Where to inspect:

- If Vercel dashboard shows deployment headers, record from there.
- If using browser devtools or a terminal from your machine, inspect response headers for the
  production domain only after confirming the correct domain.

Record:

| Checked item | Observed value / safe summary | Status | Required follow-up |
|---|---|---|---|
| `Content-Security-Policy` header present |  |  |  |
| `connect-src` Supabase host(s) |  |  |  |
| `X-Frame-Options` header present |  |  |  |
| `X-Content-Type-Options` header present |  |  |  |
| `Referrer-Policy` header present |  |  |  |
| `Permissions-Policy` header present |  |  |  |
| Header source appears repo `vercel.json` or dashboard override |  |  |  |

Known expected risk:

- repo `vercel.json` currently contains `connect-src 'self'
  https://okwqhkrsjgxrhyisaovc.supabase.co`;
- if deployed production should use modern staging or future production, this CSP is a mismatch.

Notes to paste back:

```text
Headers/CSP notes:

```

## Paste-Back Summary Template

Copy this section into the next planning thread after completing the dashboard review.

```text
Vercel Manual Evidence Summary

Project:
- Project name:
- Project link:
- Connected repo:
- Production branch:

Latest production deployment:
- Commit SHA:
- Date/time:
- Branch:
- Deployment status:
- Deployment URL/name:

Domains:
- Production domain(s):
- Primary domain:
- Preview/deployment domain behavior:

Build settings:
- Framework preset:
- Build command:
- Output directory:
- Install command:
- Node/runtime version:
- Root directory:

Environment variable names only:
- Production:
- Preview:
- Development:

Supabase target classification:
- Production:
- Preview:
- Development:

Protection/security:
- Production:
- Preview:
- Other notes:

Headers/CSP:
- CSP present:
- connect-src host(s):
- Security headers:
- Header source:

Rollback/deployment history:
- History available:
- Rollback/promote controls visible:

Mismatches / needs decision:
-

Screenshots/evidence notes:
- No screenshots include secrets or env values.
-
```

## Next Step After Evidence Capture

After Chris pastes back the completed safe evidence summary, the next implementation slice should
classify findings before making changes:

- verified items;
- mismatches;
- needs-decision items;
- specific CSP/header alignment recommendation;
- whether local Vercel linking is needed later;
- whether production/preview env targets need a separate change plan.

Do not proceed to CSP, env, domain, deployment, or Supabase changes until the evidence summary is
reviewed and a specific implementation slice is approved.
