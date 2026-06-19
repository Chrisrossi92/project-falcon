import {
  AMC_STAGING_REF as STAGING_REF,
  invalidStagingEnv,
  loadStagingEnvFile,
  productionRefs,
  projectRefFromUrl,
} from "./lib/amc-staging-env.mjs";

const DEFAULT_ORDER_NUMBER = "AMC-STAGING-SMOKE-001";
const DEFAULT_OWNER_EMAIL = "amc.smoke.owner+staging@example.test";
const DEFAULT_VENDOR_EMAIL = "amc.smoke.vendor+staging@example.test";
const DEFAULT_PASSWORD = "FalconSmoke123!";

function orderNumber() {
  return process.env.AMC_STAGING_SMOKE_ORDER_NUMBER || DEFAULT_ORDER_NUMBER;
}

function ownerEmail() {
  return process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
}

function vendorEmail() {
  return process.env.AMC_STAGING_SMOKE_VENDOR_EMAIL || DEFAULT_VENDOR_EMAIL;
}

function smokePassword() {
  return process.env.AMC_STAGING_SMOKE_PASSWORD || DEFAULT_PASSWORD;
}

function appUrl() {
  return String(process.env.AMC_STAGING_APP_URL || "").replace(/\/+$/, "");
}

function usage() {
  console.error(`AMC staging browser smoke is opt-in and requires explicit staging env:

Required:
  AMC_STAGING_BROWSER_SMOKE=1
  AMC_STAGING_APP_URL=https://<staging-or-local-app-url>
  AMC_STAGING_PROJECT_REF=${STAGING_REF}
  AMC_STAGING_SUPABASE_URL=https://${STAGING_REF}.supabase.co
  AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-or-secret-key>
  AMC_STAGING_SUPABASE_ANON_KEY=<staging-anon-or-publishable-key>

Optional:
  AMC_STAGING_SMOKE_OWNER_EMAIL=${DEFAULT_OWNER_EMAIL}
  AMC_STAGING_SMOKE_VENDOR_EMAIL=${DEFAULT_VENDOR_EMAIL}
  AMC_STAGING_SMOKE_PASSWORD=<smoke-password>
  AMC_STAGING_SMOKE_ORDER_NUMBER=${DEFAULT_ORDER_NUMBER}

Safety:
  - This script is not part of normal unit tests or CI.
  - Do not run against production app URLs or production Supabase refs.
  - The script performs UI navigation/assertions only; it does not mutate workflow state.
`);
}

function assertSafeBrowserTarget() {
  const missing = invalidStagingEnv();
  if (process.env.AMC_STAGING_BROWSER_SMOKE !== "1") missing.unshift("AMC_STAGING_BROWSER_SMOKE");
  const targetAppUrl = appUrl();
  if (!targetAppUrl) missing.unshift("AMC_STAGING_APP_URL");

  if (missing.length > 0) {
    usage();
    console.error(`Missing or invalid variables:\n  ${missing.join("\n  ")}`);
    process.exit(2);
  }

  const actualRef = projectRefFromUrl(process.env.AMC_STAGING_SUPABASE_URL || "");
  if (process.env.AMC_STAGING_PROJECT_REF !== STAGING_REF || actualRef !== STAGING_REF) {
    console.error(
      `Refusing browser smoke: expected staging ref ${STAGING_REF}, got env ref ${process.env.AMC_STAGING_PROJECT_REF || "(missing)"} and URL ref ${actualRef || "(unknown)"}.`,
    );
    process.exit(2);
  }

  if (productionRefs().has(actualRef)) {
    console.error(`Refusing browser smoke: ${actualRef} is listed as a production Supabase ref.`);
    process.exit(2);
  }

  const appUrlText = targetAppUrl.toLowerCase();
  const productionRefHits = [...productionRefs()].filter((ref) => ref && appUrlText.includes(ref.toLowerCase()));
  if (productionRefHits.length > 0 || /\bprod(uction)?\b/.test(appUrlText)) {
    console.error("Refusing browser smoke: AMC_STAGING_APP_URL appears production-like.");
    process.exit(2);
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error(`Playwright is required for AMC staging browser smoke.

Install it locally when you are ready to run the opt-in browser smoke:
  npm install -D playwright
  npx playwright install chromium
`);
    process.exit(2);
  }
}

async function login(page, email) {
  await page.goto(`${appUrl()}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(smokePassword());
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle");
}

async function ensureFalconAmcWorkspace(page) {
  const workspaceLabel = page.getByTestId("persistent-workspace-label");
  try {
    await workspaceLabel.filter({ hasText: /Workspace:\s*Falcon AMC/i }).waitFor({ timeout: 5000 });
    return;
  } catch {
    const falconAmcControl = page.getByText(/^Falcon AMC$/i).first();
    await falconAmcControl.click();
    await page.waitForURL(/\/dashboard(?:$|\?)/, { timeout: 10000 });
    await workspaceLabel.filter({ hasText: /Workspace:\s*Falcon AMC/i }).waitFor({ timeout: 10000 });
  }
}

async function ownerSmoke(page) {
  await login(page, ownerEmail());
  await page.goto(`${appUrl()}/dashboard`, { waitUntil: "networkidle" });
  await ensureFalconAmcWorkspace(page);
  await page.getByText(/Dashboard/i).first().waitFor({ timeout: 10000 });

  await page.goto(`${appUrl()}/orders?q=${encodeURIComponent(orderNumber())}`, { waitUntil: "networkidle" });
  await page.getByText(orderNumber()).first().waitFor({ timeout: 15000 });
  await page.getByText(orderNumber()).first().click();
  await page.getByTestId("order-workspace-context").filter({ hasText: /Order workspace:\s*Falcon AMC/i }).waitFor({
    timeout: 15000,
  });
}

async function vendorSmoke(page) {
  await login(page, vendorEmail());
  await page.goto(`${appUrl()}/vendor-workspace/dashboard`, { waitUntil: "networkidle" });
  await page.getByText(/Vendor Workspace/i).first().waitFor({ timeout: 15000 });
  await page.goto(`${appUrl()}/vendor-workspace/assigned-orders`, { waitUntil: "networkidle" });
  await page.getByText(/Assigned Orders|Available Work|No assigned orders|No available work/i).first().waitFor({
    timeout: 15000,
  });
}

async function main() {
  loadStagingEnvFile({ log: true });
  assertSafeBrowserTarget();

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    headless: process.env.AMC_STAGING_BROWSER_HEADLESS !== "0",
  });

  try {
    const ownerContext = await browser.newContext();
    await ownerSmoke(await ownerContext.newPage());
    await ownerContext.close();

    const vendorContext = await browser.newContext();
    await vendorSmoke(await vendorContext.newPage());
    await vendorContext.close();

    console.log(
      JSON.stringify(
        {
          ok: true,
          project_ref: STAGING_REF,
          app_url: appUrl(),
          order_number: orderNumber(),
          checks: [
            "owner_login",
            "falcon_amc_workspace_label",
            "amc_dashboard",
            "order_search_open",
            "order_workspace_label",
            "vendor_login",
            "vendor_workspace",
            "vendor_assigned_orders_or_available_work",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
