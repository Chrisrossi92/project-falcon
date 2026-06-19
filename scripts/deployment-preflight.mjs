#!/usr/bin/env node

import {
  AMC_STAGING_REF,
} from "./lib/amc-staging-env.mjs";
import {
  argValue,
  envValue,
  resolveEnvironmentProfile,
} from "./validate-env-profile.mjs";

const SUPPORTED_TARGETS = new Set(["preview", "staging", "production-readonly", "production-release"]);

const TARGETS = Object.freeze({
  preview: {
    profile: "preview",
    accessMode: "non-production",
    allowedMigrationStates: ["preview", "staging-compatible", "non-production"],
    allowedE2ETargets: ["preview"],
    vercelEnv: "preview",
  },
  staging: {
    profile: "staging",
    accessMode: "non-production",
    allowedMigrationStates: ["staging", "staging-compatible"],
    allowedE2ETargets: ["staging"],
    vercelEnv: null,
  },
  "production-readonly": {
    profile: "production-readonly",
    accessMode: "readonly",
    allowedMigrationStates: ["production-readonly", "read-only-evidence"],
    allowedE2ETargets: ["production-readonly"],
    vercelEnv: "production",
  },
  "production-release": {
    profile: "production-release",
    accessMode: "release",
    allowedMigrationStates: ["production-release-approved"],
    allowedE2ETargets: ["production-release"],
    vercelEnv: "production",
  },
});

function normalize(value) {
  return String(value || "").trim();
}

function requireOneOf({ label, value, allowed }) {
  const normalized = normalize(value);
  if (!allowed.includes(normalized)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}. Got ${normalized || "(missing)"}.`);
  }
  return normalized;
}

function deploymentTarget() {
  const target = argValue("target") || process.env.FALCON_DEPLOY_TARGET || "";
  if (!SUPPORTED_TARGETS.has(target)) {
    throw new Error(`Set FALCON_DEPLOY_TARGET to one of: ${[...SUPPORTED_TARGETS].join(", ")}.`);
  }
  return target;
}

function validateDeploymentSpecificRules({ target, envResult }) {
  const targetConfig = TARGETS[target];
  const migrationState = requireOneOf({
    label: "FALCON_MIGRATION_STATE",
    value: envValue("FALCON_MIGRATION_STATE"),
    allowed: targetConfig.allowedMigrationStates,
  });
  const e2eTarget = requireOneOf({
    label: "FALCON_E2E_TARGET_PROFILE",
    value: envValue("FALCON_E2E_TARGET_PROFILE", "E2E_TARGET"),
    allowed: targetConfig.allowedE2ETargets,
  });

  if (targetConfig.vercelEnv && envResult.vercel.env !== targetConfig.vercelEnv) {
    throw new Error(`FALCON_DEPLOY_TARGET=${target} requires VERCEL_ENV=${targetConfig.vercelEnv}.`);
  }

  if (target === "production-release") {
    if (process.env.FALCON_DEPLOY_APPROVED !== "1") {
      throw new Error("production-release preflight requires FALCON_DEPLOY_APPROVED=1.");
    }
    if (envResult.supabase.project_ref === AMC_STAGING_REF) {
      throw new Error(`production-release refuses staging Supabase ref ${AMC_STAGING_REF}.`);
    }
    if (!envResult.supabase.production_ref) {
      throw new Error(
        `production-release requires a known production Supabase ref from AMC_PRODUCTION_PROJECT_REFS, got ${envResult.supabase.project_ref || "(unknown)"}.`,
      );
    }
  }

  return { migrationState, e2eTarget };
}

function publicResult({ target, envResult, deployment }) {
  return {
    ok: true,
    target,
    app: envResult.app,
    supabase: envResult.supabase,
    vercel: envResult.vercel,
    deployment: {
      migration_state: deployment.migrationState,
      e2e_target_profile: deployment.e2eTarget,
      deploy_approved: process.env.FALCON_DEPLOY_APPROVED === "1",
    },
  };
}

function main() {
  const target = deploymentTarget();
  const targetConfig = TARGETS[target];
  const envResult = resolveEnvironmentProfile({
    profile: targetConfig.profile,
    accessMode: targetConfig.accessMode,
  });
  const deployment = validateDeploymentSpecificRules({ target, envResult });

  console.log(JSON.stringify(publicResult({ target, envResult, deployment }), null, 2));
}

try {
  main();
} catch (error) {
  console.error(error?.message || error);
  process.exit(2);
}
