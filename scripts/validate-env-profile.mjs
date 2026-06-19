#!/usr/bin/env node

import dotenv from "dotenv";

import {
  AMC_STAGING_REF,
  isUnsetOrPlaceholder,
  productionRefs,
  projectRefFromUrl,
} from "./lib/amc-staging-env.mjs";

export const SUPPORTED_PROFILES = new Set(["local", "staging", "preview", "production-readonly", "production-release"]);
const DEFAULT_LOCAL_APP_URL = "http://127.0.0.1:5173";
const DEFAULT_LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

export function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}

export function loadProfileEnv(profile) {
  if (profile === "local") {
    dotenv.config({ path: ".env.local", override: false, quiet: true });
  }
  if (profile === "staging") {
    dotenv.config({ path: process.env.AMC_STAGING_ENV_FILE || ".env.staging.local", override: false, quiet: true });
  }
}

export function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (!isUnsetOrPlaceholder(value)) return value.trim();
  }
  return "";
}

export function parseUrl(value, label) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${label} is missing or invalid: ${value || "(empty)"}`);
  }
}

export function isLocalHost(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname.toLowerCase());
}

export function isProductionLikeAppUrl(url, refs) {
  const text = url.href.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "continentalres.com" ||
    hostname.endsWith(".continentalres.com") ||
    /\bprod(uction)?\b/.test(hostname) ||
    refs.some((ref) => ref && text.includes(ref.toLowerCase()))
  );
}

export function inferProjectRef({ explicitRef, supabaseUrl }) {
  if (explicitRef) return explicitRef;
  if (isLocalHost(supabaseUrl.hostname)) return "";
  return projectRefFromUrl(supabaseUrl.href);
}

export function classifySupabaseUrl(url) {
  if (isLocalHost(url.hostname)) return "local";
  if (url.hostname.endsWith(".supabase.co")) return "hosted-supabase";
  return "custom-or-unknown";
}

export function validateVercelEnv({ profile, vercelEnv }) {
  if (!vercelEnv) return;
  if (["production-readonly", "production-release"].includes(profile) && vercelEnv !== "production") {
    throw new Error(`FALCON_ENV_PROFILE=${profile} requires VERCEL_ENV=production when VERCEL_ENV is set, got ${vercelEnv}.`);
  }
  if (profile === "preview" && vercelEnv === "production") {
    throw new Error("FALCON_ENV_PROFILE=preview refuses VERCEL_ENV=production.");
  }
  if (["local", "staging"].includes(profile) && vercelEnv === "production") {
    throw new Error(`FALCON_ENV_PROFILE=${profile} refuses VERCEL_ENV=production.`);
  }
}

export function validateProfile({
  profile,
  accessMode,
  appUrl,
  supabaseUrl,
  projectRef,
  vercelEnv,
  knownProductionRefs,
}) {
  validateVercelEnv({ profile, vercelEnv });

  const productionRefHit = knownProductionRefs.includes(projectRef);
  const productionLikeApp = isProductionLikeAppUrl(appUrl, knownProductionRefs);
  const localApp = isLocalHost(appUrl.hostname);
  const localSupabase = isLocalHost(supabaseUrl.hostname);

  if (
    productionRefHit &&
    !(profile === "production-readonly" && accessMode === "readonly") &&
    !(profile === "production-release" && accessMode === "release")
  ) {
    throw new Error(
      `Refusing profile ${profile}: Supabase project ref ${projectRef} is a known production ref and access mode is ${accessMode}.`,
    );
  }

  if (["local", "staging"].includes(profile) && productionLikeApp) {
    throw new Error(`Refusing profile ${profile}: app URL appears production-like (${appUrl.href}).`);
  }

  if (profile === "local") {
    if (!localApp) throw new Error(`Profile local requires a localhost app URL, got ${appUrl.href}.`);
    if (!localSupabase) throw new Error(`Profile local requires a localhost Supabase URL, got ${supabaseUrl.href}.`);
  }

  if (profile === "staging") {
    if (projectRef !== AMC_STAGING_REF) {
      throw new Error(`Profile staging requires Supabase project ref ${AMC_STAGING_REF}, got ${projectRef || "(unknown)"}.`);
    }
    if (localSupabase) throw new Error("Profile staging requires hosted staging Supabase, not local Supabase.");
  }

  if (profile === "preview") {
    if (localApp) throw new Error("Profile preview requires a hosted preview app URL, not localhost.");
    if (productionLikeApp) throw new Error(`Profile preview refuses production-like app URL ${appUrl.href}.`);
  }

  if (profile === "production-readonly") {
    if (accessMode !== "readonly") {
      throw new Error("Profile production-readonly requires FALCON_ENV_ACCESS=readonly.");
    }
    if (!productionRefHit) {
      throw new Error(
        `Profile production-readonly requires Supabase project ref to be listed in AMC_PRODUCTION_PROJECT_REFS, got ${projectRef || "(unknown)"}.`,
      );
    }
  }

  if (profile === "production-release" && accessMode !== "release") {
    throw new Error("Profile production-release requires FALCON_ENV_ACCESS=release.");
  }
}

export function resolveEnvironmentProfile({
  profile = argValue("profile") || process.env.FALCON_ENV_PROFILE || "",
  accessMode: providedAccessMode = argValue("access") || process.env.FALCON_ENV_ACCESS || "",
  loadEnv = true,
} = {}) {
  if (!SUPPORTED_PROFILES.has(profile)) {
    throw new Error(`Set FALCON_ENV_PROFILE to one of: ${[...SUPPORTED_PROFILES].join(", ")}.`);
  }

  if (loadEnv) loadProfileEnv(profile);

  const knownProductionRefs = [...productionRefs()];
  const accessMode =
    providedAccessMode ||
    (profile === "production-readonly" ? "readonly" : profile === "production-release" ? "release" : "non-production");

  const appUrlText =
    envValue("FALCON_APP_BASE_URL", "E2E_BASE_URL", "AMC_STAGING_APP_URL", "APP_URL", "PUBLIC_SITE_URL", "SITE_URL") ||
    (profile === "local" ? DEFAULT_LOCAL_APP_URL : "");
  const supabaseUrlText =
    envValue("FALCON_SUPABASE_URL", "AMC_STAGING_SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_URL") ||
    (profile === "local" ? DEFAULT_LOCAL_SUPABASE_URL : "");
  const explicitProjectRef = envValue("FALCON_SUPABASE_PROJECT_REF", "AMC_STAGING_PROJECT_REF", "SUPABASE_PROJECT_REF");
  const vercelEnv = envValue("VERCEL_ENV");

  const appUrl = parseUrl(appUrlText, "App base URL");
  const supabaseUrl = parseUrl(supabaseUrlText, "Supabase URL");
  const urlProjectRef = projectRefFromUrl(supabaseUrl.href);
  if (explicitProjectRef && urlProjectRef && explicitProjectRef !== urlProjectRef) {
    throw new Error(
      `Supabase project ref mismatch: explicit ref ${explicitProjectRef} does not match URL ref ${urlProjectRef}.`,
    );
  }
  const projectRef = inferProjectRef({ explicitRef: explicitProjectRef, supabaseUrl });

  validateProfile({
    profile,
    accessMode,
    appUrl,
    supabaseUrl,
    projectRef,
    vercelEnv,
    knownProductionRefs,
  });

  return {
    ok: true,
    profile,
    access_mode: accessMode,
    app: {
      origin: appUrl.origin,
      hostname: appUrl.hostname,
      href: appUrl.href,
    },
    supabase: {
      classification: classifySupabaseUrl(supabaseUrl),
      origin: supabaseUrl.origin,
      hostname: supabaseUrl.hostname,
      project_ref: projectRef || null,
      approved_amc_staging_ref: AMC_STAGING_REF,
      production_ref: knownProductionRefs.includes(projectRef),
    },
    vercel: {
      env: vercelEnv || null,
    },
    known_production_refs: knownProductionRefs,
  };
}

function publicResult(result) {
  const { known_production_refs: _knownProductionRefs, ...safeResult } = result;
  return safeResult;
}

function main() {
  const result = resolveEnvironmentProfile();
  console.log(
    JSON.stringify(
      {
        ...publicResult(result),
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
try {
  main();
} catch (error) {
  console.error(error?.message || error);
  process.exit(2);
}
}
