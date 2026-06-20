import { spawnSync } from "node:child_process";

import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { AMC_STAGING_REF, productionRefs, projectRefFromUrl } from "../../../scripts/lib/amc-staging-env.mjs";
import { resolveEnvironmentProfile } from "../../../scripts/validate-env-profile.mjs";

const OPERATIONS_MODE_STORAGE_KEY = "falcon.operationsMode";
const AMC_OPERATIONS_MODE = "amc_operations";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

async function authenticatedShellState(page) {
  const emailVisible = await page.getByLabel(/email/i).isVisible({ timeout: 250 }).catch(() => false);
  const shellVisible = !emailVisible
    ? await page
        .locator('[data-testid="operations-mode-switcher"]:visible')
        .first()
        .isVisible({ timeout: 250 })
        .catch(() => false)
    : false;
  const dashboardVisible = !emailVisible
    ? await page
        .getByRole("heading", { name: /dashboard|falcon amc|appraisal production/i })
        .first()
        .isVisible({ timeout: 250 })
        .catch(() => false)
    : false;

  return {
    url: page.url(),
    emailVisible,
    shellVisible,
    dashboardVisible,
  };
}

export async function waitForAuthenticatedShell(page, label = "authenticated shell") {
  try {
    await expect
      .poll(
        async () => {
          const state = await authenticatedShellState(page);
          return !state.emailVisible && (state.shellVisible || state.dashboardVisible);
        },
        { timeout: 15000 },
      )
      .toBe(true);
  } catch (error) {
    throw new Error(`${label} did not become ready. State: ${JSON.stringify(await authenticatedShellState(page))}`, {
      cause: error,
    });
  }
}

export async function login(page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});

  const emailField = page.getByLabel(/email/i);
  if (!(await emailField.isVisible({ timeout: 5000 }).catch(() => false))) {
    await waitForAuthenticatedShell(page, `authenticated shell for ${email}`);
    return;
  }

  await emailField.fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await waitForAuthenticatedShell(page, `authenticated shell after signing in ${email}`);
}

async function visibleWorkspaceSwitcher(page) {
  const workspaceSwitcher = page.locator('[data-testid="operations-mode-switcher"]:visible').first();
  await expect(workspaceSwitcher).toBeVisible({ timeout: 15000 });
  return workspaceSwitcher;
}

export async function readAmcWorkspaceDiagnostics(page) {
  const visibleSwitcher = page.locator('[data-testid="operations-mode-switcher"]:visible').first();
  const switcherVisible = await visibleSwitcher.isVisible({ timeout: 1000 }).catch(() => false);
  const amcWorkspaceButton = visibleSwitcher.getByRole("button", { name: /^Falcon AMC$/i });
  const internalWorkspaceButton = visibleSwitcher.getByRole("button", { name: /^Continental Internal Operations$/i });
  const localStorageMode = await page
    .evaluate((storageKey) => {
      try {
        return window.localStorage.getItem(storageKey) || null;
      } catch {
        return "unavailable";
      }
    }, OPERATIONS_MODE_STORAGE_KEY)
    .catch(() => "unavailable");

  return {
    url: page.url(),
    localStorageMode,
    switcherVisible,
    amcButtonVisible: await amcWorkspaceButton.isVisible({ timeout: 500 }).catch(() => false),
    internalButtonVisible: await internalWorkspaceButton.isVisible({ timeout: 500 }).catch(() => false),
    amcPressed: (await amcWorkspaceButton.getAttribute("aria-pressed").catch(() => null)) || "(missing)",
    internalPressed: (await internalWorkspaceButton.getAttribute("aria-pressed").catch(() => null)) || "(missing)",
  };
}

export async function logAmcWorkspaceDiagnostics(page, label) {
  try {
    console.log(`[AMC workspace diagnostics] ${label}: ${JSON.stringify(await readAmcWorkspaceDiagnostics(page))}`);
  } catch (error) {
    console.log(`[AMC workspace diagnostics] ${label}: unavailable (${error?.message || error})`);
  }
}

export async function assertAmcWorkspaceActive(page, label = "AMC workspace") {
  try {
    await expect
      .poll(() => readAmcWorkspaceDiagnostics(page), { timeout: 15000 })
      .toMatchObject({
        amcPressed: "true",
        internalPressed: "false",
        localStorageMode: AMC_OPERATIONS_MODE,
      });
  } catch (error) {
    const state = await readAmcWorkspaceDiagnostics(page);
    throw new Error(`${label} is not active. State: ${JSON.stringify(state)}`, { cause: error });
  }
}

export async function ensureAmcWorkspace(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  await page.goto("/dashboard", { waitUntil: "networkidle" });

  const workspaceSwitcher = await visibleWorkspaceSwitcher(page);

  const amcWorkspaceButton = workspaceSwitcher.getByRole("button", { name: /^Falcon AMC$/i });
  await expect(amcWorkspaceButton).toBeVisible({ timeout: 15000 });

  if ((await amcWorkspaceButton.getAttribute("aria-pressed")) !== "true") {
    await amcWorkspaceButton.scrollIntoViewIfNeeded();
    await amcWorkspaceButton.click({ timeout: 10000 });
    await page.waitForURL(/\/dashboard(?:[?#].*)?$/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  await assertAmcWorkspaceActive(page, "Falcon AMC workspace switch after clicking Falcon AMC");
}

export async function navigateWithinAmc(page, path: string) {
  await ensureAmcWorkspace(page);
  await logAmcWorkspaceDiagnostics(page, `before ${path} navigation`);

  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  }, path);

  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[#?])`), {
    timeout: 10000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await logAmcWorkspaceDiagnostics(page, `after ${path} navigation`);
  await assertAmcWorkspaceActive(page, `AMC workspace after ${path} navigation`);
}

export async function visibleBodyText(page, limit = 2500) {
  return page.evaluate((maxLength) => document.body?.innerText?.slice(0, maxLength) || "", limit).catch(() => "");
}

export async function openAmcOrderDetail(page, orderNumber: string) {
  await navigateWithinAmc(page, `/orders?q=${encodeURIComponent(orderNumber)}`);
  await expect(page.getByRole("heading", { name: /Orders/i }).first()).toBeVisible({ timeout: 15000 });

  const orderLink = page.getByRole("link", { name: new RegExp(`^${escapeRegExp(orderNumber)}$`) }).first();
  try {
    await expect(orderLink).toBeVisible({ timeout: 15000 });
    await Promise.all([
      page.waitForURL(/\/orders\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 }),
      orderLink.click(),
    ]);
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.getByText(orderNumber).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/AMC bid status/i)).toBeVisible({ timeout: 15000 });
    await assertAmcWorkspaceActive(page, "AMC workspace on smoke order detail");
  } catch (error) {
    const state = await readAmcWorkspaceDiagnostics(page);
    const bodyText = await visibleBodyText(page);
    throw new Error(
      `AMC smoke order detail did not open from Orders list. State: ${JSON.stringify(state)} Body: ${bodyText}`,
      { cause: error },
    );
  }
}

export async function assertOwnerAssignmentPacketLoaded(page, label = "Owner assignment packet") {
  try {
    await expect(page).toHaveURL(/\/assignments\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 });
    await expect(page.getByLabel(/^Owner Packet detail$/i)).toBeVisible({ timeout: 15000 });
  } catch (error) {
    const bodyText = await visibleBodyText(page);
    throw new Error(`${label} did not load. URL: ${page.url()} Body: ${bodyText}`, { cause: error });
  }
}
