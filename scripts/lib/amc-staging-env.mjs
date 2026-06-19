import { existsSync } from "node:fs";
import { resolve } from "node:path";

import dotenv from "dotenv";

export const AMC_STAGING_REF = "voompccpkjfcsmehdoqu";
export const DEFAULT_STAGING_ENV_FILE = ".env.staging.local";

export const STAGING_RUNTIME_ENV = Object.freeze([
  "AMC_STAGING_PROJECT_REF",
  "AMC_STAGING_SUPABASE_URL",
  "AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY",
]);

export const STAGING_FULL_SMOKE_ENV = Object.freeze([
  ...STAGING_RUNTIME_ENV,
  "AMC_STAGING_SUPABASE_ANON_KEY",
]);

export function loadStagingEnvFile({
  envFile = process.env.AMC_STAGING_ENV_FILE || DEFAULT_STAGING_ENV_FILE,
  log = false,
} = {}) {
  const envPath = resolve(process.cwd(), envFile);
  if (!existsSync(envPath)) {
    if (log) {
      console.warn(
        `AMC staging env file not found at ${envFile}. Export variables manually or copy .env.staging.example to ${envFile}.`,
      );
    }
    return { loaded: false, envFile };
  }

  dotenv.config({ path: envPath, override: false, quiet: true });
  if (log) {
    console.log(`Loaded staging smoke environment from ${envFile}.`);
  }
  return { loaded: true, envFile };
}

export function projectRefFromUrl(url) {
  try {
    return new URL(url).host.split(".")[0] || "";
  } catch {
    return "";
  }
}

export function productionRefs() {
  return new Set(
    (process.env.AMC_PRODUCTION_PROJECT_REFS || "okwqhkrsjgxrhyisaovc")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isUnsetOrPlaceholder(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  if (/^<.*>$/.test(normalized)) return true;
  return [
    "placeholder",
    "changeme",
    "change-me",
    "replace-me",
    "todo",
    "staging-service-role-key",
    "staging-anon-key",
    "service-role-key",
    "anon-key",
    "publishable-key",
  ].some((token) => normalized.toLowerCase().includes(token));
}

export function isJwtLikeKey(value) {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || "").trim());
}

export function isServiceRoleOrSecretKey(value) {
  const normalized = String(value || "").trim();
  if (isUnsetOrPlaceholder(normalized)) return false;
  return normalized.startsWith("sb_secret_") || isJwtLikeKey(normalized);
}

export function isAnonOrPublishableKey(value) {
  const normalized = String(value || "").trim();
  if (isUnsetOrPlaceholder(normalized)) return false;
  return normalized.startsWith("sb_publishable_") || isJwtLikeKey(normalized);
}

export function invalidStagingEnv(names = STAGING_FULL_SMOKE_ENV) {
  return names.filter((name) => {
    if (name === "AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY") {
      return !isServiceRoleOrSecretKey(process.env[name] || process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    if (name === "AMC_STAGING_SUPABASE_ANON_KEY") {
      return !isAnonOrPublishableKey(process.env[name]);
    }
    return isUnsetOrPlaceholder(process.env[name]);
  });
}
