import { spawnSync } from "node:child_process";

import {
  AMC_STAGING_REF as STAGING_REF,
  STAGING_FULL_SMOKE_ENV as REQUIRED_ENV,
  invalidStagingEnv,
  loadStagingEnvFile,
  productionRefs,
  projectRefFromUrl,
} from "./lib/amc-staging-env.mjs";

function assertSafeTarget() {
  const missing = invalidStagingEnv(REQUIRED_ENV);
  if (missing.length > 0) {
    console.error(`AMC staging rehearsal prepare requires missing variables:
  ${missing.join("\n  ")}

Setup:
  cp .env.staging.example .env.staging.local
  edit .env.staging.local with approved staging/final-rehearsal secrets

Safety:
  - Never commit service role / secret keys.
  - Supabase sb_secret_ and JWT-style service keys are accepted.
  - Supabase sb_publishable_ and JWT-style anon keys are accepted.
  - Use only the approved staging/final-rehearsal project.
  - This command refuses known production refs before mutation.
`);
    process.exit(2);
  }

  const actualRef = projectRefFromUrl(process.env.AMC_STAGING_SUPABASE_URL || "");
  if (process.env.AMC_STAGING_PROJECT_REF !== STAGING_REF || actualRef !== STAGING_REF) {
    console.error(
      `Refusing staging rehearsal prepare: expected staging ref ${STAGING_REF}, got env ref ${process.env.AMC_STAGING_PROJECT_REF || "(missing)"} and URL ref ${actualRef || "(unknown)"}.`,
    );
    process.exit(2);
  }

  if (productionRefs().has(actualRef)) {
    console.error(`Refusing staging rehearsal prepare: ${actualRef} is listed as a production project ref.`);
    process.exit(2);
  }
}

function runStep(label, scriptPath) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`${label} failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  loadStagingEnvFile({ log: true });
  assertSafeTarget();

  runStep("1. Runtime probe: verifying staging RPCs and Edge Functions", "scripts/check-amc-staging-runtime.mjs");
  runStep("2. Fixture seed/reset: preparing disposable AMC smoke records", "scripts/load-amc-staging-smoke-fixtures.mjs");

  console.log(`
AMC staging rehearsal seed is ready.

Disposable records:
  Order: AMC-STAGING-SMOKE-001
  Owner: amc.smoke.owner+staging@example.test
  Vendor: amc.smoke.vendor+staging@example.test
  Wrong vendor: amc.smoke.wrongvendor+staging@example.test

Next:
  npm run amc:staging:smoke:happy
  npm run amc:staging:smoke:edge
  Then execute docs/amc/AMC_13B9_PRODUCTION_SMOKE_TEST_CHECKLIST.md manually.
`);
}

main();
