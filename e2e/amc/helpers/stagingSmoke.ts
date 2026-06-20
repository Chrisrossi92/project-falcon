import { spawnSync } from "node:child_process";

import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { AMC_STAGING_REF, productionRefs, projectRefFromUrl } from "../../../scripts/lib/amc-staging-env.mjs";
import { resolveEnvironmentProfile } from "../../../scripts/validate-env-profile.mjs";

const OPERATIONS_MODE_STORAGE_KEY = "falcon.operationsMode";
const AMC_OPERATIONS_MODE = "amc_operations";

export function requiredValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`AMC staging smoke requires ${name}.`);
  return value;
}

export function assertDisposableEmail(name: string, value: string) {
  if (!/@example\.(test|invalid)$/i.test(value)) {
    throw new Error(`${name} must use a reserved disposable example.test or example.invalid email address.`);
  }
}

export function assertNoProductionPaymentConfig() {
  const liveKeyNames = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PUBLIC_KEY",
    "PAYMENT_PROVIDER_SECRET_KEY",
  ];

  for (const name of liveKeyNames) {
    const value = process.env[name] || "";
    if (/\b[ps]k_live_/i.test(value) || /\blive_/i.test(value)) {
      throw new Error(`AMC staging invoice/payment smoke refuses live payment config in ${name}.`);
    }
  }

  const paymentMode = [
    process.env.PAYMENT_PROCESSOR_MODE,
    process.env.PAYMENT_PROVIDER_MODE,
    process.env.STRIPE_ENV,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\b(live|production)\b/.test(paymentMode)) {
    throw new Error("AMC staging invoice/payment smoke refuses live/production payment processor mode.");
  }
}

export function assertAmcStagingSmokeTarget({
  ownerEmail,
  vendorEmail,
  wrongVendorEmail,
  clientEmail,
  paymentSafe = false,
  smokeLabel = "AMC staging smoke",
} = {}) {
  if (process.env.E2E_TARGET !== "staging") {
    throw new Error(`${smokeLabel} must run with E2E_TARGET=staging.`);
  }
  if (process.env.E2E_ALLOW_STAGING !== "1") {
    throw new Error(`${smokeLabel} requires E2E_ALLOW_STAGING=1.`);
  }

  const env = resolveEnvironmentProfile({
    profile: "staging",
    accessMode: "non-production",
    loadEnv: true,
  });

  const explicitRef = requiredValue("AMC_STAGING_PROJECT_REF");
  const supabaseUrl = requiredValue("AMC_STAGING_SUPABASE_URL");
  const actualRef = projectRefFromUrl(supabaseUrl);

  if (explicitRef !== AMC_STAGING_REF || actualRef !== AMC_STAGING_REF || env.supabase.project_ref !== AMC_STAGING_REF) {
    throw new Error(
      `${smokeLabel} requires approved Supabase ref ${AMC_STAGING_REF}; got env ref ${explicitRef}, URL ref ${actualRef || "(unknown)"}, and profile ref ${env.supabase.project_ref || "(unknown)"}.`,
    );
  }
  if (productionRefs().has(actualRef)) {
    throw new Error(`${smokeLabel} refuses production Supabase ref ${actualRef}.`);
  }

  if (ownerEmail) assertDisposableEmail("AMC_STAGING_SMOKE_OWNER_EMAIL", ownerEmail);
  if (vendorEmail) assertDisposableEmail("AMC_STAGING_SMOKE_VENDOR_EMAIL", vendorEmail);
  if (wrongVendorEmail) assertDisposableEmail("AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL", wrongVendorEmail);
  if (clientEmail) assertDisposableEmail("AMC_STAGING_SMOKE_CLIENT_EMAIL", clientEmail);
  if (paymentSafe) assertNoProductionPaymentConfig();

  return env;
}

export function prepareFixtureIfRequested() {
  if (process.env.E2E_AMC_PREPARE_FIXTURE !== "1") return;

  const result = spawnSync(process.execPath, ["scripts/load-amc-staging-smoke-fixtures.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) throw new Error(`AMC staging fixture prepare failed: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`AMC staging fixture prepare failed with exit code ${result.status ?? 1}.`);
  }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient(requiredValue("AMC_STAGING_SUPABASE_URL"), requiredValue("AMC_STAGING_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Smoke fixture login failed for ${email}: ${error.message}`);
  return { client: supabase, session: data.session || null, token: data.session?.access_token || null };
}

export async function login(page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForLoadState("networkidle");
}

export async function ensureAmcWorkspace(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  await page.evaluate(
    ({ storageKey, mode }) => window.localStorage.setItem(storageKey, mode),
    { storageKey: OPERATIONS_MODE_STORAGE_KEY, mode: AMC_OPERATIONS_MODE },
  );
  await page.goto("/dashboard", { waitUntil: "networkidle" });

  await expect
    .poll(
      () => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), OPERATIONS_MODE_STORAGE_KEY),
      { timeout: 10000 },
    )
    .toBe(AMC_OPERATIONS_MODE);

  const amcWorkspaceButton = page.getByRole("button", { name: /^Falcon AMC$/i }).first();
  if (await amcWorkspaceButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    const pressed = await amcWorkspaceButton.getAttribute("aria-pressed");
    if (pressed !== "true") {
      await amcWorkspaceButton.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    await expect(amcWorkspaceButton).toHaveAttribute("aria-pressed", "true", { timeout: 10000 });
  }

  await expect
    .poll(
      () => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), OPERATIONS_MODE_STORAGE_KEY),
      { timeout: 10000 },
    )
    .toBe(AMC_OPERATIONS_MODE);

  const amcSignals = [
    page.getByRole("heading", { name: /Falcon AMC Dashboard/i }).first(),
    page.getByText(/Procurement Command/i).first(),
    page.getByText(/Falcon AMC Environment/i).first(),
    page.getByTestId("workspace-identity-title").filter({ hasText: /Falcon AMC Environment/i }).first(),
    page.getByTestId("operations-mode-current").filter({ hasText: /Falcon AMC/i }).first(),
    page.getByTestId("operations-mode-selected-label").filter({ hasText: /Falcon AMC/i }).first(),
  ];

  for (const signal of amcSignals) {
    if (await signal.isVisible({ timeout: 1000 }).catch(() => false)) {
      return;
    }
  }

  await expect(page.getByText(/Falcon AMC|Procurement Command|Falcon AMC Environment/i).first()).toBeVisible({
    timeout: 15000,
  });
}
