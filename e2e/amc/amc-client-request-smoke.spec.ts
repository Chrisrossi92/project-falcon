import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  assertAmcStagingSmokeTarget,
  login as loginWithPassword,
  prepareFixtureIfRequested,
  requiredValue,
  signIn as signInWithPassword,
} from "./helpers/stagingSmoke";

const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const CLIENT_EMAIL = process.env.AMC_STAGING_SMOKE_CLIENT_EMAIL || "amc.smoke.client+staging@example.test";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const SMOKE_LABEL = "AMC SMOKE - DO NOT USE";
const REQUEST_ADDRESS =
  process.env.AMC_STAGING_SMOKE_CLIENT_REQUEST_ADDRESS ||
  `${SMOKE_LABEL} - Client Portal Request 1919 Staging Conversion Lane`;

let adminClient = null;
let ownerClient = null;
let requestState = null;

async function signIn(email: string) {
  return (await signInWithPassword(email, PASSWORD)).client;
}

async function login(page, email: string) {
  await loginWithPassword(page, email, PASSWORD);
}

async function findAuthUserByEmail(admin, email) {
  const perPage = 1000;
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`list auth users: ${error.message}`);
    const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (!data?.users || data.users.length < perPage) return null;
  }
  throw new Error("Auth user search exceeded safety page limit.");
}

async function ensureAuthUser(admin, { email, fullName, companyId }) {
  const appMetadata = {
    provider: "email",
    providers: ["email"],
    active_company_id: companyId,
    current_company_id: companyId,
    amc_smoke_fixture: true,
    staging_smoke: true,
  };
  const userMetadata = { full_name: fullName, amc_smoke_fixture: true, staging_smoke: true };
  const existing = await findAuthUserByEmail(admin, email);

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { ...(existing.app_metadata || {}), ...appMetadata },
      user_metadata: { ...(existing.user_metadata || {}), ...userMetadata },
    });
    if (error) throw new Error(`update auth user ${email}: ${error.message}`);
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });
  if (error) throw new Error(`create auth user ${email}: ${error.message}`);
  return data.user;
}

async function upsertSingle(client, table, row, onConflict, label) {
  const { data, error } = await client.from(table).upsert(row, { onConflict }).select("*").single();
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function ensureSmokeClient(ownerCompany) {
  const clientName = `${SMOKE_LABEL} Client Portal Demo Lender`;
  const clientRow = {
    company_id: ownerCompany.id,
    operations_scope: "amc_operations",
    name: clientName,
    status: "active",
    category: "client",
    contact_name_1: `${SMOKE_LABEL} Client Contact`,
    contact_email_1: CLIENT_EMAIL,
    notes: `${SMOKE_LABEL}. Disposable AMC staging client request smoke client.`,
  };

  const { data: existing, error: lookupError } = await adminClient
    .from("clients")
    .select("*")
    .eq("company_id", ownerCompany.id)
    .eq("name", clientName)
    .maybeSingle();
  if (lookupError) throw new Error(`lookup smoke client: ${lookupError.message}`);

  if (!existing) {
    const { data, error } = await adminClient.from("clients").insert(clientRow).select("*").single();
    if (error) throw new Error(`insert smoke client: ${error.message}`);
    return data;
  }

  const { data, error } = await adminClient.from("clients").update(clientRow).eq("id", existing.id).select("*").single();
  if (error) throw new Error(`update smoke client: ${error.message}`);
  return data;
}

async function seedDisposableClientRequest() {
  const serviceRoleKey = requiredValue("AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY");
  adminClient = createClient(requiredValue("AMC_STAGING_SUPABASE_URL"), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ownerCompany, error: companyError } = await adminClient
    .from("companies")
    .select("*")
    .eq("slug", "falcon_default")
    .single();
  if (companyError) throw new Error(`lookup owner company: ${companyError.message}`);

  const clientAuth = await ensureAuthUser(adminClient, {
    email: CLIENT_EMAIL,
    fullName: "AMC Staging Smoke Client",
    companyId: ownerCompany.id,
  });

  const clientUser = await upsertSingle(
    adminClient,
    "users",
    {
      name: `${SMOKE_LABEL} Client`,
      email: CLIENT_EMAIL,
      role: "client",
      display_name: `${SMOKE_LABEL} Client`,
      full_name: `${SMOKE_LABEL} Client`,
      status: "active",
      auth_id: clientAuth.id,
      uid: clientAuth.id,
      is_admin: false,
      is_active: true,
    },
    "email",
    "upsert client app user",
  );

  const smokeClient = await ensureSmokeClient(ownerCompany);

  await upsertSingle(
    adminClient,
    "client_portal_members",
    {
      company_id: ownerCompany.id,
      client_id: smokeClient.id,
      user_id: clientUser.id,
      status: "active",
    },
    "company_id,client_id,user_id",
    "upsert client portal member",
  );

  const client = await signIn(CLIENT_EMAIL);
  const { data: createdRows, error: createError } = await client.rpc("rpc_client_portal_order_request_create", {
    p_property_address: REQUEST_ADDRESS,
    p_property_city: "Columbus",
    p_property_state: "OH",
    p_property_postal_code: "43215",
    p_property_county: "Franklin",
    p_property_type: "Commercial",
    p_report_type: "Appraisal",
    p_loan_purpose: "AMC staging disposable client request conversion smoke.",
    p_requested_due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    p_borrower_contact_name: `${SMOKE_LABEL} Borrower Contact`,
    p_client_contact_name: `${SMOKE_LABEL} Client Contact`,
    p_client_contact_phone: "555-0100",
    p_client_contact_email: CLIENT_EMAIL,
    p_notes: `${SMOKE_LABEL}. Disposable client portal request smoke. Stop before procurement.`,
  });
  if (createError) throw new Error(`create client portal request: ${createError.message}`);

  const created = Array.isArray(createdRows) ? createdRows[0] : createdRows;
  if (!created?.request_key) throw new Error("Client portal request create did not return a request key.");
  return {
    requestKey: created.request_key,
    propertyAddress: created.property_address || REQUEST_ADDRESS,
    clientName: smokeClient.name,
  };
}

async function readRequestByKey(requestKey) {
  const { data, error } = await ownerClient.rpc("rpc_client_portal_order_request_review_detail", {
    p_request_key: requestKey,
  });
  if (error) throw new Error(`read client request detail: ${error.message}`);
  return Array.isArray(data) ? data[0] : data;
}

async function assertNoDownstreamWorkflow(orderId) {
  const checks = [
    ["order_vendor_bid_requests", "order_id"],
    ["order_company_assignments", "order_id"],
    ["order_documents", "order_id"],
  ];

  for (const [table, column] of checks) {
    const { count, error } = await adminClient.from(table).select("id", { count: "exact", head: true }).eq(column, orderId);
    if (error) throw new Error(`check ${table}: ${error.message}`);
    expect(count || 0).toBe(0);
  }
}

test.describe("AMC staging client request conversion smoke", () => {
  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({ ownerEmail: OWNER_EMAIL, clientEmail: CLIENT_EMAIL });
    prepareFixtureIfRequested();
    ownerClient = await signIn(OWNER_EMAIL);
    requestState = await seedDisposableClientRequest();
  });

  test("converts a disposable client portal request into an AMC order and stops before procurement", async ({ page }) => {
    await login(page, OWNER_EMAIL);
    await page.goto("/client-requests", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: /Client Order Requests/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(requestState.propertyAddress).first()).toBeVisible({ timeout: 15000 });
    await page.getByText(requestState.propertyAddress).first().click();

    await expect(page.getByLabel(/Client request detail/i)).toContainText(requestState.propertyAddress);
    await expect(page.getByLabel(/Client request detail/i)).toContainText(CLIENT_EMAIL);
    await expect(page.getByText(/^Submitted$/i).first()).toBeVisible();

    await page.getByRole("button", { name: /^Convert to order$/i }).click();
    const dialog = page.getByRole("dialog", { name: /Convert request to order/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/will not create assignments, vendor bidding, invoices, payments, reports, or documents/i)).toBeVisible();
    await dialog.getByRole("button", { name: /^Confirm conversion$/i }).click();

    await expect(page.getByText(/Request converted to order/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Accepted/i).first()).toBeVisible({ timeout: 15000 });

    const converted = await readRequestByKey(requestState.requestKey);
    expect(converted).toMatchObject({
      status: "accepted",
      property_address: requestState.propertyAddress,
    });
    expect(converted.accepted_order_id).toBeTruthy();

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, order_number, operations_scope, property_address, status")
      .eq("id", converted.accepted_order_id)
      .single();
    if (orderError) throw new Error(`read converted order: ${orderError.message}`);

    expect(order).toMatchObject({
      operations_scope: "amc_operations",
      property_address: requestState.propertyAddress,
      status: "new",
    });
    expect(order.order_number).toBeTruthy();

    await expect(page.getByRole("link", { name: order.order_number })).toBeVisible();
    await assertNoDownstreamWorkflow(order.id);
  });
});
