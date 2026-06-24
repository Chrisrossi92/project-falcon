import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertAmcStagingSmokeTarget,
  login as loginWithPassword,
  navigateWithinAmc,
  prepareFixtureIfRequested,
  requiredValue,
  signIn as signInWithPassword,
} from "./helpers/stagingSmoke";

const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const SMOKE_LABEL = "AMC DIRECT CREATE SMOKE - DO NOT USE";
const routesSource = readFileSync(resolve(process.cwd(), "src/routes/index.jsx"), "utf8");

let adminClient = null;
let smokeClient = null;
let smokeAddress = "";

async function signIn(email: string) {
  return (await signInWithPassword(email, PASSWORD)).client;
}

async function login(page, email: string) {
  await loginWithPassword(page, email, PASSWORD);
}

async function ensureSmokeClient(ownerCompany) {
  const clientName = `${SMOKE_LABEL} Client`;
  const clientRow = {
    company_id: ownerCompany.id,
    operations_scope: "amc_operations",
    name: clientName,
    status: "active",
    category: "client",
    contact_name_1: `${SMOKE_LABEL} Contact`,
    contact_email_1: "amc.direct.create.client+staging@example.test",
    contact_phone_1: "555-0131",
    notes: `${SMOKE_LABEL}. Disposable AMC direct create browser smoke client.`,
  };

  const { data: existing, error: lookupError } = await adminClient
    .from("clients")
    .select("*")
    .eq("name", clientName)
    .maybeSingle();
  if (lookupError) throw new Error(`lookup direct-create smoke client: ${lookupError.message}`);

  if (!existing) {
    const { data, error } = await adminClient.from("clients").insert(clientRow).select("*").single();
    if (error) throw new Error(`insert direct-create smoke client: ${error.message}`);
    return data;
  }

  const { data, error } = await adminClient.from("clients").update(clientRow).eq("id", existing.id).select("*").single();
  if (error) throw new Error(`update direct-create smoke client: ${error.message}`);
  return data;
}

async function seedDirectCreateFixture() {
  adminClient = createClient(
    requiredValue("AMC_STAGING_SUPABASE_URL"),
    requiredValue("AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: ownerCompany, error: companyError } = await adminClient
    .from("companies")
    .select("*")
    .eq("slug", "falcon_default")
    .single();
  if (companyError) throw new Error(`lookup owner company: ${companyError.message}`);

  smokeClient = await ensureSmokeClient(ownerCompany);
  smokeAddress = `${SMOKE_LABEL} ${Date.now()} Staging Direct Create Lane`;
}

async function readOrderById(orderId: string) {
  const { data, error } = await adminClient
    .from("orders")
    .select("id, order_number, operations_scope, client_id, property_address, city, state, postal_code, property_type, report_type, status")
    .eq("id", orderId)
    .single();
  if (error) throw new Error(`read direct-create order: ${error.message}`);
  return data;
}

async function readDirectCreateDiagnostics(page) {
  return page.evaluate(() => {
    const textFrom = (selector, limit) =>
      Array.from(document.querySelectorAll(selector))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
        })
        .map((element) => (element.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, limit);
    const attrFrom = (selector, attr, limit) =>
      Array.from(document.querySelectorAll(selector))
        .map((element) => element.getAttribute(attr) || "")
        .filter(Boolean)
        .slice(0, limit);
    const main = document.querySelector("main") || document.body;
    const mainText = (main?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 2500);

    return {
      url: window.location.href,
      pathname: window.location.pathname,
      operationsMode: window.localStorage.getItem("falcon.operationsMode"),
      documentTitle: document.title,
      mainText,
      failedToLoadOrderVisible: /Failed to load order\./i.test(mainText),
      headings: textFrom("h1,h2,h3,[role='heading']", 12),
      buttons: textFrom("button", 12),
      links: textFrom("a", 12),
      labels: textFrom("label", 20),
      selectOptions: textFrom("select option", 30),
      scripts: attrFrom("script[src]", "src", 8),
      buildMarkers: {},
      rootHtmlSnippet: document.documentElement.outerHTML.slice(0, 800),
    };
  });
}

async function expectDirectCreateFormVisible(page) {
  try {
    await expect(page.getByRole("heading", { name: /^New Order$/i })).toBeVisible({ timeout: 15000 });
  } catch (error) {
    const diagnostics = await readDirectCreateDiagnostics(page);
    throw new Error(
      `Expected /amc/orders/new to render the AMC New Order form, but it did not. Diagnostics: ${JSON.stringify(
        diagnostics,
        null,
        2,
      )}`,
      { cause: error },
    );
  }
}

function assertLocalRouteComposition() {
  const amcCreateIndex = routesSource.indexOf('path="/amc/orders/new"');
  const amcDetailIndex = routesSource.indexOf('path="/amc/orders/:id"');

  expect(amcCreateIndex).toBeGreaterThan(-1);
  expect(routesSource).toContain("AmcNewOrderPage");
  expect(amcDetailIndex).toBeGreaterThan(-1);
  expect(amcCreateIndex).toBeLessThan(amcDetailIndex);
}

test.describe("AMC staging direct create smoke", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({ ownerEmail: OWNER_EMAIL });
    prepareFixtureIfRequested();
    await signIn(OWNER_EMAIL);
    await seedDirectCreateFixture();
  });

  test("creates an AMC-scoped order from /amc/orders/new with an existing client", async ({ page }) => {
    assertLocalRouteComposition();

    await login(page, OWNER_EMAIL);
    await navigateWithinAmc(page, "/amc/orders/new");

    await expectDirectCreateFormVisible(page);
    await expect(page.getByPlaceholder("Manual client name")).toHaveCount(0);

    const form = page.locator("form").first();
    const clientSelect = form.locator("select").nth(1);
    await expect(clientSelect).toBeVisible();
    await expect(clientSelect.locator("option", { hasText: smokeClient.name })).toHaveCount(1);
    await page.getByRole("button", { name: /^Create Order$/i }).click();
    await expect(page.getByText(/Select an existing client before creating this order/i)).toBeVisible();
    await clientSelect.selectOption({ label: smokeClient.name });
    await page.getByPlaceholder("123 Main St").fill(smokeAddress);
    await form.locator("input").nth(1).fill("Columbus");
    await form.locator("input").nth(2).fill("OH");
    await form.locator("input").nth(3).fill("43215");
    await form.locator("select").nth(2).selectOption("Office");
    await form.locator("select").nth(3).selectOption("Appraisal");
    await page.getByLabel("Final Due").fill(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));

    await Promise.all([
      page.waitForURL(/\/amc\/orders\/[^/?#]+(?:[?#].*)?$/, { timeout: 20000 }),
      page.getByRole("button", { name: /^Create Order$/i }).click(),
    ]);
    await page.waitForLoadState("networkidle").catch(() => {});

    const orderId = new URL(page.url()).pathname.split("/").pop() || "";
    expect(orderId).toBeTruthy();
    const order = await readOrderById(orderId);

    expect(order).toMatchObject({
      operations_scope: "amc_operations",
      client_id: smokeClient.id,
      property_address: smokeAddress,
      city: "Columbus",
      state: "OH",
      postal_code: "43215",
      property_type: "Office",
      report_type: "Appraisal",
      status: "new",
    });
    expect(order.order_number).toBeTruthy();

    await expect(page.getByText(order.order_number).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(smokeAddress).first()).toBeVisible({ timeout: 15000 });
  });

  test("does not render /amc/orders/new while Internal Operations mode is selected", async ({ page }) => {
    assertLocalRouteComposition();

    await login(page, OWNER_EMAIL);
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.evaluate(() => window.localStorage.setItem("falcon.operationsMode", "internal_operations"));
    await page.goto("/amc/orders/new", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/dashboard(?:[?#].*)?$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /^New Order$/i })).toHaveCount(0);
    await expect(page.getByPlaceholder("Manual client name")).toHaveCount(0);
  });
});
