import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  assertDisposableEmail,
  assertAmcStagingSmokeTarget,
  login,
  openAmcOrderDetail,
  prepareFixtureIfRequested,
  requiredValue,
  signIn,
} from "./helpers/stagingSmoke";

const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const ORDER_NUMBER = process.env.AMC_STAGING_VENDOR_COVERAGE_ORDER_NUMBER || "AMC-STAGING-COVERAGE-MATCH-001";
const SMOKE_LABEL = "AMC VENDOR COVERAGE SMOKE - DO NOT USE";
const MATCHING_VENDOR_NAME = `${SMOKE_LABEL} Matching Vendor`;
const NON_MATCHING_VENDOR_NAME = `${SMOKE_LABEL} Non Matching Vendor`;
const INACTIVE_VENDOR_NAME = `${SMOKE_LABEL} Inactive Vendor`;
const SUSPENDED_VENDOR_NAME = `${SMOKE_LABEL} Suspended Vendor`;
const BID_REQUEST_MESSAGE = `${SMOKE_LABEL}. Targeted V2C request-bids smoke. Do not respond.`;
const VENDOR_BID_EMAIL =
  process.env.AMC_STAGING_VENDOR_COVERAGE_BID_EMAIL || "amc.vendor.coverage.bidder+staging@example.test";
const VENDOR_BID_AMOUNT = process.env.AMC_STAGING_VENDOR_COVERAGE_BID_AMOUNT || "710";
const VENDOR_BID_TURN_TIME_DAYS = process.env.AMC_STAGING_VENDOR_COVERAGE_BID_TURN_TIME_DAYS || "5";
const VENDOR_BID_COMMENTS =
  process.env.AMC_STAGING_VENDOR_COVERAGE_BID_COMMENTS ||
  "AMC vendor coverage V2D/V2E disposable public token bid response.";
const VENDOR_BID_AMOUNT_PATTERN = new RegExp(`\\$${VENDOR_BID_AMOUNT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

let adminClient = null;
let ownerClient = null;
let fixtureState = null;

test.describe.configure({ mode: "serial" });

function assertOk(response, label) {
  if (response.error) {
    throw new Error(`${label}: ${response.error.message || JSON.stringify(response.error)}`);
  }
  return response.data;
}

async function upsertSingle(client, table, row, onConflict, label) {
  return assertOk(await client.from(table).upsert(row, { onConflict }).select("*").single(), label);
}

async function replaceCoverage(vendorProfileId, vendorCompanyId, coverage) {
  for (const table of [
    "vendor_coverage_states",
    "vendor_coverage_counties",
    "vendor_property_types",
    "vendor_assignment_types",
  ]) {
    assertOk(await adminClient.from(table).delete().eq("vendor_profile_id", vendorProfileId), `clear ${table}`);
  }

  if (coverage.states?.length) {
    assertOk(
      await adminClient.from("vendor_coverage_states").insert(
        coverage.states.map((stateCode) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          state_code: stateCode,
        })),
      ),
      "insert coverage states",
    );
  }

  if (coverage.counties?.length) {
    assertOk(
      await adminClient.from("vendor_coverage_counties").insert(
        coverage.counties.map((county) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          state_code: county.state_code,
          county_name: county.county_name,
        })),
      ),
      "insert coverage counties",
    );
  }

  if (coverage.propertyTypes?.length) {
    assertOk(
      await adminClient.from("vendor_property_types").insert(
        coverage.propertyTypes.map((propertyType) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          property_type: propertyType,
        })),
      ),
      "insert property types",
    );
  }

  if (coverage.assignmentTypes?.length) {
    assertOk(
      await adminClient.from("vendor_assignment_types").insert(
        coverage.assignmentTypes.map((assignmentType) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          assignment_type: assignmentType,
        })),
      ),
      "insert assignment types",
    );
  }
}

async function ensureActiveVendorRelationship(vendorCompanyId, name) {
  const existing = assertOk(
    await adminClient
      .from("company_relationships")
      .select("*")
      .eq("source_company_id", fixtureState.ownerCompany.id)
      .eq("target_company_id", vendorCompanyId)
      .eq("relationship_type", "amc_vendor")
      .in("status", ["active", "invited", "suspended"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    `lookup ${name} relationship`,
  );

  const relationshipPayload = {
    status: "active",
    invited_by_user_id: fixtureState.ownerUser.id,
    approved_by_user_id: fixtureState.ownerUser.id,
    invited_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    suspended_by_user_id: null,
    suspended_at: null,
    settings: { disposable: true, staging_smoke: true, vendor_coverage_smoke: true },
    compliance: {},
    notes: `${SMOKE_LABEL}. Disposable targeted coverage matching relationship.`,
  };

  if (existing?.id) {
    return assertOk(
      await adminClient
        .from("company_relationships")
        .update(relationshipPayload)
        .eq("id", existing.id)
        .select("*")
        .single(),
      `activate ${name} relationship`,
    );
  }

  return assertOk(
    await adminClient
      .from("company_relationships")
      .insert({
        source_company_id: fixtureState.ownerCompany.id,
        target_company_id: vendorCompanyId,
        relationship_type: "amc_vendor",
        ...relationshipPayload,
      })
      .select("*")
      .single(),
    `insert ${name} relationship`,
  );
}

async function seedVendorProfile({ slug, name, status, coverage }) {
  const company = await upsertSingle(
    adminClient,
    "companies",
    {
      slug,
      name,
      status: "active",
      timezone: "America/New_York",
      locale: "en-US",
      settings: { disposable: true, staging_smoke: true, vendor_coverage_smoke: true },
      company_type: "vendor",
      operating_mode_settings: {},
    },
    "slug",
    `upsert ${name} company`,
  );

  const relationship = await ensureActiveVendorRelationship(company.id, name);

  const profile = await upsertSingle(
    adminClient,
    "company_vendor_profiles",
    {
      owner_company_id: fixtureState.ownerCompany.id,
      vendor_company_id: company.id,
      relationship_id: relationship.id,
      vendor_status: status,
      public_phone: "555-1720",
      default_assignment_instructions: "Disposable vendor coverage matching smoke fixture.",
      capabilities: { commercial: true, vendor_coverage_smoke: true },
      product_eligibility: { commercial: true, appraisal: true },
      internal_notes: `${SMOKE_LABEL}. Disposable targeted coverage matching fixture.`,
      tags: ["vendor-coverage-smoke", "staging-smoke", "disposable"],
    },
    "owner_company_id,vendor_company_id",
    `upsert ${name} vendor profile`,
  );

  await replaceCoverage(profile.id, company.id, coverage);
  return { company, profile, relationship };
}

async function bidRequestRowsForOrder() {
  return assertOk(
    await adminClient.from("order_vendor_bid_requests").select("id, status, metadata").eq("order_id", fixtureState.order.id),
    "lookup coverage bid requests",
  );
}

async function recipientRowsForBidRequests(bidRequestIds) {
  if (!bidRequestIds.length) return [];

  return assertOk(
    await adminClient
      .from("order_vendor_bid_request_recipients")
      .select("id, bid_request_id, vendor_profile_id, vendor_company_id, relationship_id, status, metadata")
      .in("bid_request_id", bidRequestIds),
    "lookup coverage bid request recipients",
  );
}

async function cleanupCoverageBidRequests() {
  const bidRequests = await bidRequestRowsForOrder();
  const bidRequestIds = bidRequests.map((row) => row.id);
  const recipients = await recipientRowsForBidRequests(bidRequestIds);
  const recipientIds = recipients.map((row) => row.id);

  if (recipientIds.length) {
    assertOk(
      await adminClient.from("order_vendor_bid_responses").delete().in("recipient_id", recipientIds),
      "clear coverage bid responses",
    );
  }

  if (bidRequestIds.length) {
    assertOk(
      await adminClient.from("order_vendor_bid_request_recipient_invitations").delete().in("bid_request_id", bidRequestIds),
      "clear coverage bid recipient invitations",
    );
    assertOk(
      await adminClient.from("order_vendor_bid_request_recipients").delete().in("bid_request_id", bidRequestIds),
      "clear coverage bid request recipients",
    );
    assertOk(
      await adminClient.from("order_vendor_bid_requests").delete().in("id", bidRequestIds),
      "clear coverage bid requests",
    );
  }

  assertOk(
    await adminClient.from("order_company_assignments").delete().eq("order_id", fixtureState.order.id),
    "clear coverage smoke assignments",
  );
}

async function openProcurementDetails(page) {
  const procurementToggle = page.getByText(/^Show Procurement Details$/i).first();
  if (await procurementToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await procurementToggle.click();
  }
}

function futureDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
}

async function seedCoverageFixture() {
  adminClient = createClient(requiredValue("AMC_STAGING_SUPABASE_URL"), requiredValue("AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ownerCompany = assertOk(
    await adminClient.from("companies").select("*").eq("slug", "falcon_default").single(),
    "lookup owner company",
  );
  const ownerUser = assertOk(
    await adminClient.from("users").select("*").eq("email", OWNER_EMAIL).maybeSingle(),
    "lookup owner user",
  );
  if (!ownerUser?.id) {
    throw new Error(
      `Disposable owner ${OWNER_EMAIL} was not found. Run with E2E_AMC_PREPARE_FIXTURE=1 once to create the staging owner fixture.`,
    );
  }

  fixtureState = { ownerCompany, ownerUser };

  const order = await upsertSingle(
    adminClient,
    "orders",
    {
      company_id: ownerCompany.id,
      owner_id: ownerUser.id,
      order_number: ORDER_NUMBER,
      external_order_no: ORDER_NUMBER,
      title: `${SMOKE_LABEL} Order`,
      status: "new",
      manual_client: `${SMOKE_LABEL} Demo Lender`,
      manual_client_name: `${SMOKE_LABEL} Demo Lender`,
      property_address: `${SMOKE_LABEL} - 1717 Coverage Match Lane`,
      address: `${SMOKE_LABEL} - 1717 Coverage Match Lane`,
      city: "Toledo",
      state: "OH",
      county: "Lucas",
      postal_code: "43604",
      zip: "43604",
      property_type: "commercial",
      report_type: "Appraisal",
      date_ordered: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      client_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      final_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      review_due_at: new Date(Date.now() + 12 * 86400000).toISOString(),
      special_instructions: `${SMOKE_LABEL}. Disposable targeted coverage matching order. Do not use outside staging/local smoke testing.`,
      notes: `${SMOKE_LABEL}. Targeted V1C coverage matching fixture.`,
      operations_scope: "amc_operations",
      fee_amount: 1200,
      appraiser_fee: 650,
    },
    "order_number",
    "upsert coverage matching order",
  );

  const matchingVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-matching",
    name: MATCHING_VENDOR_NAME,
    status: "active",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Lucas" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  const nonMatchingVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-non-matching",
    name: NON_MATCHING_VENDOR_NAME,
    status: "active",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Cuyahoga" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  const inactiveVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-inactive",
    name: INACTIVE_VENDOR_NAME,
    status: "inactive",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Lucas" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  const suspendedVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-suspended",
    name: SUSPENDED_VENDOR_NAME,
    status: "suspended",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Lucas" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  fixtureState = {
    ...fixtureState,
    order,
    matchingVendor,
    nonMatchingVendor,
    inactiveVendor,
    suspendedVendor,
  };
}

async function runMatchingRpc() {
  const { client } = await signIn(OWNER_EMAIL, PASSWORD);
  ownerClient = client;

  return assertOk(
    await ownerClient.rpc("rpc_get_matching_vendors_for_order", {
      p_order_id: fixtureState.order.id,
    }),
    "rpc_get_matching_vendors_for_order",
  );
}

async function ensureOwnerClient() {
  if (ownerClient) return ownerClient;
  const { client } = await signIn(OWNER_EMAIL, PASSWORD);
  ownerClient = client;
  return ownerClient;
}

async function timedSmokeStep(label, action) {
  const startedAt = Date.now();
  console.log(`[vendor coverage V2D] START ${label}`);
  return test.step(label, async () => {
    try {
      return await action();
    } finally {
      console.log(`[vendor coverage V2D] END ${label} (${Date.now() - startedAt}ms)`);
    }
  });
}

async function requestBidFromVisibleMatchingVendor(page) {
  const eligibleVendors = page.getByLabel("Eligible vendors");
  await expect(eligibleVendors).toBeVisible({ timeout: 15000 });
  await expect(eligibleVendors.getByText(MATCHING_VENDOR_NAME)).toBeVisible({ timeout: 15000 });
  await expect(eligibleVendors.getByText(NON_MATCHING_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText(INACTIVE_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText(SUSPENDED_VENDOR_NAME)).toHaveCount(0);

  const requestBidsButton = eligibleVendors.getByRole("button", { name: /^Request bids$/i });
  await expect(requestBidsButton).toBeVisible({ timeout: 15000 });
  await requestBidsButton.click();

  const dialog = page.getByRole("dialog", { name: /Request bids from eligible vendors/i });
  await expect(dialog).toBeVisible();
  const matchingVendorCheckbox = dialog.getByLabel(new RegExp(MATCHING_VENDOR_NAME));
  await expect(matchingVendorCheckbox).toBeChecked();
  await expect(dialog.getByText(NON_MATCHING_VENDOR_NAME)).toHaveCount(0);
  await expect(dialog.getByText(INACTIVE_VENDOR_NAME)).toHaveCount(0);
  await expect(dialog.getByText(SUSPENDED_VENDOR_NAME)).toHaveCount(0);

  await dialog.getByLabel(/Message\/instructions/i).fill(BID_REQUEST_MESSAGE);
  await dialog.getByLabel(/Response due date/i).fill(futureDate(7));
  await dialog.getByRole("button", { name: /^Send bid requests$/i }).click();

  await expect(page.getByText("Bid requests sent to selected eligible vendors.")).toBeVisible({ timeout: 15000 });

  const bidRequests = await bidRequestRowsForOrder();
  expect(bidRequests).toHaveLength(1);
  expect(bidRequests[0]).toMatchObject({ status: "sent" });

  const recipients = await recipientRowsForBidRequests(bidRequests.map((row) => row.id));
  expect(recipients).toHaveLength(1);
  expect(recipients[0]).toMatchObject({
    vendor_profile_id: fixtureState.matchingVendor.profile.id,
    vendor_company_id: fixtureState.matchingVendor.company.id,
    relationship_id: fixtureState.matchingVendor.relationship.id,
    status: "sent",
  });

  const recipientProfileIds = recipients.map((row) => row.vendor_profile_id);
  expect(recipientProfileIds).not.toContain(fixtureState.nonMatchingVendor.profile.id);
  expect(recipientProfileIds).not.toContain(fixtureState.inactiveVendor.profile.id);
  expect(recipientProfileIds).not.toContain(fixtureState.suspendedVendor.profile.id);

  return { bidRequests, recipients };
}

async function requestBidFromMatchingVendor(page) {
  await cleanupCoverageBidRequests();
  await login(page, OWNER_EMAIL, PASSWORD);
  await openAmcOrderDetail(page, ORDER_NUMBER);
  return requestBidFromVisibleMatchingVendor(page);
}

async function createCoverageBidInvitationToken(recipientId) {
  const owner = await ensureOwnerClient();
  const { data, error } = await owner.rpc("rpc_order_vendor_bid_invitation_create", {
    p_recipient_id: recipientId,
    p_payload: {
      sent_to_email: VENDOR_BID_EMAIL,
      metadata: {
        playwright_amc_staging_smoke: true,
        vendor_coverage_v2d_smoke: true,
        no_email_delivery: true,
      },
    },
  });

  if (error) throw new Error(`Coverage smoke bid invitation token creation failed: ${error.message}`);
  if (!data?.token || !data?.path) throw new Error("Coverage smoke bid invitation did not return a token path.");
  if (data.sent_to_email !== VENDOR_BID_EMAIL.toLowerCase()) {
    throw new Error(`Coverage smoke bid invitation email mismatch: ${data.sent_to_email || "(missing)"}.`);
  }
  return data;
}

async function submitCoverageBidResponse(page, invitation) {
  await page.goto(invitation.path, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Vendor Bid Invitation/i })).toBeVisible();
  await expect(page.getByText(ORDER_NUMBER)).toBeVisible();
  await expect(page.getByRole("main")).toContainText(MATCHING_VENDOR_NAME);

  await page.getByLabel(/Fee amount/i).fill(VENDOR_BID_AMOUNT);
  await page.getByLabel(/Turn time days/i).fill(VENDOR_BID_TURN_TIME_DAYS);
  await page.getByLabel(/Comments/i).fill(VENDOR_BID_COMMENTS);
  await page.getByLabel(/Contact email/i).fill(VENDOR_BID_EMAIL);
  await page.getByRole("button", { name: /^Submit Bid$/i }).click();

  await expect(page.getByText(/Your bid has been submitted/i)).toBeVisible({ timeout: 15000 });
}

test.beforeAll(async () => {
  assertAmcStagingSmokeTarget({
    ownerEmail: OWNER_EMAIL,
    smokeLabel: "AMC vendor coverage targeted smoke",
  });
  assertDisposableEmail("AMC_STAGING_VENDOR_COVERAGE_BID_EMAIL", VENDOR_BID_EMAIL);
  prepareFixtureIfRequested();
  await seedCoverageFixture();
});

test("matches only active vendors with exact normalized coverage", async () => {
  const matches = await runMatchingRpc();
  const names = matches.map((row) => row.company_name);
  const matchingRow = matches.find((row) => row.company_name === MATCHING_VENDOR_NAME);

  expect(names).toContain(MATCHING_VENDOR_NAME);
  expect(names).not.toContain(NON_MATCHING_VENDOR_NAME);
  expect(names).not.toContain(INACTIVE_VENDOR_NAME);
  expect(names).not.toContain(SUSPENDED_VENDOR_NAME);
  expect(matchingRow).toMatchObject({
    vendor_profile_id: fixtureState.matchingVendor.profile.id,
    company_id: fixtureState.matchingVendor.company.id,
    company_name: MATCHING_VENDOR_NAME,
    matched_state: "OH",
    matched_county: "Lucas",
    matched_property_type: "commercial",
    matched_assignment_type: "appraisal",
  });
});

test("shows eligible vendors on Order Detail without sending bid requests before confirmation", async ({ page }) => {
  await cleanupCoverageBidRequests();
  await login(page, OWNER_EMAIL, PASSWORD);
  await openAmcOrderDetail(page, ORDER_NUMBER);

  const eligibleVendors = page.getByLabel("Eligible vendors");
  await expect(eligibleVendors).toBeVisible({ timeout: 15000 });
  await expect(eligibleVendors.getByText(MATCHING_VENDOR_NAME)).toBeVisible({ timeout: 15000 });
  await expect(eligibleVendors.getByText(NON_MATCHING_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText(INACTIVE_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText(SUSPENDED_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText("OH")).toBeVisible();
  await expect(eligibleVendors.getByText("Lucas")).toBeVisible();
  await expect(eligibleVendors.getByText("Commercial")).toBeVisible();
  await expect(eligibleVendors.getByText("Appraisal")).toBeVisible();
  await expect(eligibleVendors.getByText(/not a recommendation, score, ranking, or bid request/i)).toBeVisible();

  const bidRequests = await bidRequestRowsForOrder();
  expect(bidRequests).toHaveLength(0);
});

test("manually requests bids from one eligible vendor and stops before vendor response", async ({ page }) => {
  const { recipients } = await requestBidFromMatchingVendor(page);

  const recipientProfileIds = recipients.map((row) => row.vendor_profile_id);
  expect(recipientProfileIds).not.toContain(fixtureState.nonMatchingVendor.profile.id);
  expect(recipientProfileIds).not.toContain(fixtureState.inactiveVendor.profile.id);
  expect(recipientProfileIds).not.toContain(fixtureState.suspendedVendor.profile.id);

  const responses = assertOk(
    await adminClient.from("order_vendor_bid_responses").select("id").in("recipient_id", recipients.map((row) => row.id)),
    "lookup coverage bid responses after request",
  );
  expect(responses).toHaveLength(0);

  const assignments = assertOk(
    await adminClient.from("order_company_assignments").select("id").eq("order_id", fixtureState.order.id),
    "lookup coverage assignments after request",
  );
  expect(assignments).toHaveLength(0);
});

test("submits one eligible vendor bid response and shows it to the owner without selection or assignment", async ({ page }) => {
  test.setTimeout(90_000);

  await timedSmokeStep("seed/request setup", async () => {
    await cleanupCoverageBidRequests();
  });

  await timedSmokeStep("owner opens order detail", async () => {
    await login(page, OWNER_EMAIL, PASSWORD);
    await openAmcOrderDetail(page, ORDER_NUMBER);
  });

  const { bidRequests, recipients } = await timedSmokeStep("request bid from eligible vendor", async () =>
    requestBidFromVisibleMatchingVendor(page),
  );
  const matchingRecipient = recipients[0];

  const invitation = await timedSmokeStep("find token/recipient", async () => {
    expect(matchingRecipient).toMatchObject({
      vendor_profile_id: fixtureState.matchingVendor.profile.id,
      vendor_company_id: fixtureState.matchingVendor.company.id,
      relationship_id: fixtureState.matchingVendor.relationship.id,
      status: "sent",
    });
    return createCoverageBidInvitationToken(matchingRecipient.id);
  });

  await timedSmokeStep("submit public/vendor bid response", async () => {
    await submitCoverageBidResponse(page, invitation);
  });

  let refreshedRecipients = [];
  let responses = [];

  await timedSmokeStep("owner reopens order detail", async () => {
    await login(page, OWNER_EMAIL, PASSWORD);
    await openAmcOrderDetail(page, ORDER_NUMBER);
  });

  await timedSmokeStep("assert owner sees response", async () => {
    const refreshedBidRequests = await bidRequestRowsForOrder();
    expect(refreshedBidRequests).toHaveLength(1);
    expect(refreshedBidRequests[0]).toMatchObject({ status: "closed" });

    refreshedRecipients = await recipientRowsForBidRequests(bidRequests.map((row) => row.id));
    expect(refreshedRecipients).toHaveLength(1);
    expect(refreshedRecipients[0]).toMatchObject({
      id: matchingRecipient.id,
      vendor_profile_id: fixtureState.matchingVendor.profile.id,
      vendor_company_id: fixtureState.matchingVendor.company.id,
      relationship_id: fixtureState.matchingVendor.relationship.id,
      status: "responded",
    });

    responses = assertOk(
      await adminClient
        .from("order_vendor_bid_responses")
        .select("id, recipient_id, fee_amount, turn_time_days, comments, submitted_at, selected_at")
        .eq("recipient_id", matchingRecipient.id),
      "lookup coverage submitted bid response",
    );
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      recipient_id: matchingRecipient.id,
      turn_time_days: Number(VENDOR_BID_TURN_TIME_DAYS),
      comments: VENDOR_BID_COMMENTS,
    });
    expect(String(responses[0].fee_amount)).toBe(VENDOR_BID_AMOUNT);
    expect(responses[0].submitted_at).toBeTruthy();

    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bids received|1 contacted \/ 1 responded/i);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(VENDOR_BID_AMOUNT_PATTERN);

    await openProcurementDetails(page);
    const bidRequestsSection = page.getByLabel(/^Bid requests$/i);
    await expect(bidRequestsSection).toBeVisible({ timeout: 15000 });
    await expect(bidRequestsSection).toContainText(MATCHING_VENDOR_NAME);
    await expect(bidRequestsSection).toContainText(VENDOR_BID_AMOUNT_PATTERN);
    await expect(bidRequestsSection).toContainText(new RegExp(`${VENDOR_BID_TURN_TIME_DAYS} days?`, "i"));
    await expect(bidRequestsSection).toContainText(VENDOR_BID_COMMENTS);
  });

  await timedSmokeStep("assert no bid selected / no assignment", async () => {
    expect(responses[0].selected_at || null).toBeNull();

    const recipientProfileIds = refreshedRecipients.map((row) => row.vendor_profile_id);
    expect(recipientProfileIds).not.toContain(fixtureState.nonMatchingVendor.profile.id);
    expect(recipientProfileIds).not.toContain(fixtureState.inactiveVendor.profile.id);
    expect(recipientProfileIds).not.toContain(fixtureState.suspendedVendor.profile.id);

    const assignments = assertOk(
      await adminClient.from("order_company_assignments").select("id").eq("order_id", fixtureState.order.id),
      "lookup coverage assignments after bid response",
    );
    expect(assignments).toHaveLength(0);

    const bidRequestsSection = page.getByLabel(/^Bid requests$/i);
    await expect(bidRequestsSection.getByRole("button", { name: /Create Assignment Offer/i })).toHaveCount(0);
  });
});

test("selects one eligible vendor bid response and stops before assignment offer", async ({ page }) => {
  test.setTimeout(90_000);

  await timedSmokeStep("seed/request setup", async () => {
    await cleanupCoverageBidRequests();
  });

  await timedSmokeStep("owner opens order detail", async () => {
    await login(page, OWNER_EMAIL, PASSWORD);
    await openAmcOrderDetail(page, ORDER_NUMBER);
  });

  const { bidRequests, recipients } = await timedSmokeStep("request bid from eligible vendor", async () =>
    requestBidFromVisibleMatchingVendor(page),
  );
  const matchingRecipient = recipients[0];

  const invitation = await timedSmokeStep("find token/recipient", async () => {
    expect(matchingRecipient).toMatchObject({
      vendor_profile_id: fixtureState.matchingVendor.profile.id,
      vendor_company_id: fixtureState.matchingVendor.company.id,
      relationship_id: fixtureState.matchingVendor.relationship.id,
      status: "sent",
    });
    return createCoverageBidInvitationToken(matchingRecipient.id);
  });

  await timedSmokeStep("submit public/vendor bid response", async () => {
    await submitCoverageBidResponse(page, invitation);
  });

  await timedSmokeStep("owner selects bid", async () => {
    await login(page, OWNER_EMAIL, PASSWORD);
    await openAmcOrderDetail(page, ORDER_NUMBER);
    await openProcurementDetails(page);

    const bidRequestsSection = page.getByLabel(/^Bid requests$/i);
    await expect(bidRequestsSection).toBeVisible({ timeout: 15000 });
    await expect(bidRequestsSection).toContainText(MATCHING_VENDOR_NAME);
    await expect(bidRequestsSection).toContainText(VENDOR_BID_AMOUNT_PATTERN);
    await expect(bidRequestsSection).toContainText(new RegExp(`${VENDOR_BID_TURN_TIME_DAYS} days?`, "i"));
    await expect(bidRequestsSection).toContainText(VENDOR_BID_COMMENTS);

    await bidRequestsSection.getByRole("button", { name: new RegExp(`Select bid for ${MATCHING_VENDOR_NAME}`) }).click();
    const dialog = page.getByRole("dialog", { name: /^Select bid$/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(MATCHING_VENDOR_NAME);
    await expect(dialog).toContainText("Selecting this bid does not create an assignment yet.");
    await dialog.getByRole("button", { name: /^Confirm selection$/i }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bid selected/i, { timeout: 15000 });
    await expect(bidRequestsSection).toContainText(`Selected response: ${MATCHING_VENDOR_NAME}`);
  });

  await timedSmokeStep("assert selected bid state without assignment", async () => {
    const refreshedBidRequests = await bidRequestRowsForOrder();
    expect(refreshedBidRequests).toHaveLength(1);
    expect(refreshedBidRequests[0]).toMatchObject({ id: bidRequests[0].id, status: "closed" });

    const refreshedRecipients = await recipientRowsForBidRequests(bidRequests.map((row) => row.id));
    expect(refreshedRecipients).toHaveLength(1);
    expect(refreshedRecipients[0]).toMatchObject({
      id: matchingRecipient.id,
      vendor_profile_id: fixtureState.matchingVendor.profile.id,
      vendor_company_id: fixtureState.matchingVendor.company.id,
      relationship_id: fixtureState.matchingVendor.relationship.id,
      status: "selected",
    });

    const recipientProfileIds = refreshedRecipients.map((row) => row.vendor_profile_id);
    expect(recipientProfileIds).not.toContain(fixtureState.nonMatchingVendor.profile.id);
    expect(recipientProfileIds).not.toContain(fixtureState.inactiveVendor.profile.id);
    expect(recipientProfileIds).not.toContain(fixtureState.suspendedVendor.profile.id);

    const responses = assertOk(
      await adminClient
        .from("order_vendor_bid_responses")
        .select("id, recipient_id, fee_amount, turn_time_days, comments, submitted_at, selected_at")
        .eq("recipient_id", matchingRecipient.id),
      "lookup coverage selected bid response",
    );
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({
      recipient_id: matchingRecipient.id,
      turn_time_days: Number(VENDOR_BID_TURN_TIME_DAYS),
      comments: VENDOR_BID_COMMENTS,
    });
    expect(String(responses[0].fee_amount)).toBe(VENDOR_BID_AMOUNT);
    expect(responses[0].submitted_at).toBeTruthy();
    expect(responses[0].selected_at).toBeTruthy();

    const assignments = assertOk(
      await adminClient.from("order_company_assignments").select("id").eq("order_id", fixtureState.order.id),
      "lookup coverage assignments after bid selection",
    );
    expect(assignments).toHaveLength(0);
  });
});
