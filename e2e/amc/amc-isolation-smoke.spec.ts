import { expect, test } from "@playwright/test";

import {
  assertAmcStagingSmokeTarget,
  login as loginWithPassword,
  prepareFixtureIfRequested,
  signIn as signInWithPassword,
} from "./helpers/stagingSmoke";

const ORDER_NUMBER = process.env.AMC_STAGING_SMOKE_ORDER_NUMBER || "AMC-STAGING-SMOKE-001";
const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const VENDOR_EMAIL = process.env.AMC_STAGING_SMOKE_VENDOR_EMAIL || "amc.smoke.vendor+staging@example.test";
const WRONG_VENDOR_EMAIL =
  process.env.AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL || "amc.smoke.wrongvendor+staging@example.test";
const VENDOR_NAME = process.env.AMC_STAGING_SMOKE_VENDOR_NAME || "AMC SMOKE - DO NOT USE Vendor";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const BID_AMOUNT = "735";
const BID_TURN_TIME_DAYS = "5";
const BID_COMMENTS = "AMC staging Playwright disposable isolation bid response.";

let fixtureState = null;
let ownerFixtureClient = null;

async function signIn(email: string) {
  return (await signInWithPassword(email, PASSWORD)).client;
}

async function login(page, email: string) {
  await loginWithPassword(page, email, PASSWORD);
}

function readBidFixtureState(order, bidRequests) {
  const requestRows = Array.isArray(bidRequests) ? bidRequests : [];
  const fixtureBidRequest = requestRows.find((request) =>
    (request?.recipients || []).some((recipient) => recipient?.vendor_company_name === VENDOR_NAME),
  );
  if (!fixtureBidRequest) {
    throw new Error(`Smoke fixture bid request for ${VENDOR_NAME} was not found.`);
  }

  const recipients = Array.isArray(fixtureBidRequest.recipients) ? fixtureBidRequest.recipients : [];
  const fixtureRecipient = recipients.find((recipient) => recipient?.vendor_company_name === VENDOR_NAME);
  if (!fixtureRecipient) {
    throw new Error(`Smoke fixture bid recipient for ${VENDOR_NAME} was not found.`);
  }

  return {
    orderId: order.id,
    bidRecipientId: fixtureRecipient.recipient_id || fixtureRecipient.id,
    bidRequestStatus: fixtureBidRequest.status,
    bidRecipientStatus: fixtureRecipient.status,
    response: fixtureRecipient.response || null,
    vendorName: fixtureRecipient.vendor_company_name,
  };
}

async function readOwnerFixtureState(ownerClient) {
  const { data: order, error: orderError } = await ownerClient
    .from("orders")
    .select("id, order_number, client_name, manual_client_name")
    .eq("order_number", ORDER_NUMBER)
    .maybeSingle();

  if (orderError) throw new Error(`Smoke fixture order lookup failed: ${orderError.message}`);
  if (!order?.id) throw new Error(`Smoke fixture order ${ORDER_NUMBER} was not found.`);

  const { data: bidRequests, error: bidRequestError } = await ownerClient.rpc("rpc_order_vendor_bid_requests_for_order", {
    p_order_id: order.id,
  });
  if (bidRequestError) throw new Error(`Smoke fixture bid request lookup failed: ${bidRequestError.message}`);

  return readBidFixtureState(order, bidRequests);
}

async function readVendorAssignmentsForOrder(ownerClient, orderId) {
  const { data, error } = await ownerClient.rpc("rpc_order_company_assignment_list_for_order", {
    p_order_id: orderId,
  });
  if (error) throw new Error(`Smoke fixture assignment lookup failed: ${error.message}`);

  const rows = Array.isArray(data) ? data : [];
  return rows.filter((assignment) => assignment?.assignment_type === "vendor_appraisal");
}

async function readVendorAvailableWork(vendorClient) {
  const { data, error } = await vendorClient.rpc("rpc_vendor_workspace_available_work");
  if (error) throw new Error(`Smoke fixture vendor available work lookup failed: ${error.message}`);

  const rows = Array.isArray(data?.items) ? data.items : [];
  return rows.find((item) => item?.order?.order_number === ORDER_NUMBER || item?.order_number === ORDER_NUMBER) || null;
}

async function readVendorAssignedWork(vendorClient) {
  const { data, error } = await vendorClient.rpc("rpc_vendor_workspace_assigned_orders");
  if (error) throw new Error(`Smoke fixture vendor assigned orders lookup failed: ${error.message}`);

  const rows = Array.isArray(data?.items) ? data.items : [];
  return rows.find((item) => item?.order?.order_number === ORDER_NUMBER || item?.order_number === ORDER_NUMBER) || null;
}

async function assertFixtureExists() {
  const ownerClient = await signIn(OWNER_EMAIL);
  ownerFixtureClient = ownerClient;
  const ownerFixtureState = await readOwnerFixtureState(ownerClient);
  if (ownerFixtureState.bidRequestStatus !== "sent") {
    throw new Error(`Smoke fixture bid request should be sent, got ${ownerFixtureState.bidRequestStatus || "(unknown)"}.`);
  }
  if (ownerFixtureState.bidRecipientStatus !== "sent") {
    throw new Error(`Smoke fixture bid recipient should be sent, got ${ownerFixtureState.bidRecipientStatus || "(unknown)"}.`);
  }
  if (ownerFixtureState.response) {
    throw new Error(
      "Smoke fixture already has a recorded bid response. Refresh disposable fixture data with E2E_AMC_PREPARE_FIXTURE=1 before running the isolation smoke.",
    );
  }

  const vendorClient = await signIn(VENDOR_EMAIL);
  const wrongVendorClient = await signIn(WRONG_VENDOR_EMAIL);
  const vendorWork = await readVendorAvailableWork(vendorClient);
  const wrongVendorWork = await readVendorAvailableWork(wrongVendorClient);

  if (!vendorWork?.work_key) throw new Error(`Vendor A fixture cannot see available work for ${ORDER_NUMBER}.`);
  if (wrongVendorWork) throw new Error(`Vendor B unexpectedly sees Vendor A available work for ${ORDER_NUMBER}.`);

  return { ...ownerFixtureState, vendorWorkKey: vendorWork.work_key };
}

async function createDisposableBidInvitationToken() {
  const { data, error } = await ownerFixtureClient.rpc("rpc_order_vendor_bid_invitation_create", {
    p_recipient_id: fixtureState.bidRecipientId,
    p_payload: {
      sent_to_email: VENDOR_EMAIL,
      metadata: {
        playwright_amc_staging_smoke: true,
        no_email_delivery: true,
        isolation_branch: true,
      },
    },
  });
  if (error) throw new Error(`Smoke fixture bid invitation token creation failed: ${error.message}`);
  if (!data?.token || !data?.path) throw new Error("Smoke fixture bid invitation did not return a token path.");
  return data;
}

async function createDisposableAssignmentInvitationToken(assignmentId) {
  const { data, error } = await ownerFixtureClient.rpc("rpc_order_company_assignment_invitation_create", {
    p_assignment_id: assignmentId,
    p_payload: {
      sent_to_email: VENDOR_EMAIL,
      metadata: {
        playwright_amc_staging_smoke: true,
        no_email_delivery: true,
        isolation_branch: true,
      },
    },
  });
  if (error) throw new Error(`Smoke fixture assignment invitation token creation failed: ${error.message}`);
  if (!data?.token || !data?.path) throw new Error("Smoke fixture assignment invitation did not return a token path.");
  return data;
}

test.describe("AMC staging wrong-vendor isolation smoke", () => {
  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({
      ownerEmail: OWNER_EMAIL,
      vendorEmail: VENDOR_EMAIL,
      wrongVendorEmail: WRONG_VENDOR_EMAIL,
    });
    prepareFixtureIfRequested();
    fixtureState = await assertFixtureExists();
  });

  test("blocks wrong disposable vendor from another vendor bid and assignment workspace", async ({ page }) => {
    const vendorClient = await signIn(VENDOR_EMAIL);
    const wrongVendorClient = await signIn(WRONG_VENDOR_EMAIL);
    const bidInvitation = await createDisposableBidInvitationToken();

    await login(page, WRONG_VENDOR_EMAIL);
    await page.goto(bidInvitation.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Vendor Bid Invitation/i })).toBeVisible();
    await expect(page.getByText(VENDOR_EMAIL)).toBeVisible();
    await expect(page.getByText(WRONG_VENDOR_EMAIL)).toHaveCount(0);

    const wrongWorkDetail = await wrongVendorClient.rpc("rpc_vendor_workspace_available_work_detail", {
      p_work_key: fixtureState.vendorWorkKey,
    });
    expect(wrongWorkDetail.error || wrongWorkDetail.data?.ok === false).toBeTruthy();

    const wrongBidAttempt = await wrongVendorClient.rpc("rpc_vendor_workspace_submit_bid_response", {
      p_work_key: fixtureState.vendorWorkKey,
      p_payload: {
        fee_amount: "1",
        currency: "USD",
        turn_time_days: "1",
        comments: "Wrong vendor isolation attempt should be blocked.",
      },
    });
    expect(wrongBidAttempt.error || wrongBidAttempt.data?.ok === false).toBeTruthy();

    const afterWrongBidAttempt = await readOwnerFixtureState(ownerFixtureClient);
    expect(afterWrongBidAttempt.response || null).toBeNull();

    await page.goto(bidInvitation.path, { waitUntil: "networkidle" });
    await page.getByLabel(/Fee amount/i).fill(BID_AMOUNT);
    await page.getByLabel(/Turn time days/i).fill(BID_TURN_TIME_DAYS);
    await page.getByLabel(/Comments/i).fill(BID_COMMENTS);
    await page.getByLabel(/Contact email/i).fill(VENDOR_EMAIL);
    await page.getByRole("button", { name: /^Submit Bid$/i }).click();
    await expect(page.getByText(/Your bid has been submitted/i)).toBeVisible({ timeout: 15000 });

    const bidState = await readOwnerFixtureState(ownerFixtureClient);
    expect(bidState.response).toBeTruthy();
    expect(String(bidState.response?.fee_amount)).toBe(BID_AMOUNT);
    expect(bidState.response?.contact_email || VENDOR_EMAIL).toBe(VENDOR_EMAIL);

    const selectResult = await ownerFixtureClient.rpc("rpc_order_vendor_bid_response_select", {
      p_response_id: bidState.response.response_id,
    });
    if (selectResult.error) throw new Error(`Smoke bid selection failed: ${selectResult.error.message}`);

    const offerResult = await ownerFixtureClient.rpc("rpc_order_vendor_bid_response_convert_to_assignment_offer", {
      p_response_id: bidState.response.response_id,
      p_payload: {
        instructions: "AMC staging Playwright disposable isolation assignment offer.",
      },
    });
    if (offerResult.error) throw new Error(`Smoke assignment offer failed: ${offerResult.error.message}`);
    const assignmentId = offerResult.data?.assignment_id;
    if (!assignmentId) throw new Error("Smoke assignment offer did not return an assignment id.");

    const assignmentInvitation = await createDisposableAssignmentInvitationToken(assignmentId);

    await login(page, WRONG_VENDOR_EMAIL);
    await page.goto(assignmentInvitation.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Assignment Offer/i })).toBeVisible();
    await expect(page.getByText(VENDOR_EMAIL)).toBeVisible();
    await expect(page.getByText(WRONG_VENDOR_EMAIL)).toHaveCount(0);

    await login(page, VENDOR_EMAIL);
    await page.goto(assignmentInvitation.path, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Accept Assignment$/i }).click();
    await expect(page.getByText(/Assignment accepted/i)).toBeVisible({ timeout: 15000 });

    let assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(assignments).toHaveLength(1);
    let [assignment] = assignments;
    expect(assignment).toMatchObject({
      id: assignmentId,
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "accepted",
    });
    expect(assignment.accepted_at).toBeTruthy();
    expect(assignment.started_at || null).toBeNull();
    expect(assignment.submitted_at || null).toBeNull();
    expect(assignment.completed_at || null).toBeNull();

    const assignedWork = await readVendorAssignedWork(vendorClient);
    expect(assignedWork?.assignment_work_key).toBeTruthy();
    const wrongAssignedWork = await readVendorAssignedWork(wrongVendorClient);
    expect(wrongAssignedWork || null).toBeNull();

    const wrongAssignedDetail = await wrongVendorClient.rpc("rpc_vendor_workspace_assigned_order_detail", {
      p_assignment_work_key: assignedWork.assignment_work_key,
    });
    expect(wrongAssignedDetail.error || wrongAssignedDetail.data?.ok === false).toBeTruthy();

    const wrongStartAttempt = await wrongVendorClient.rpc("rpc_vendor_workspace_start_assigned_order", {
      p_assignment_work_key: assignedWork.assignment_work_key,
    });
    expect(wrongStartAttempt.error || wrongStartAttempt.data?.ok === false).toBeTruthy();

    await login(page, WRONG_VENDOR_EMAIL);
    await page.goto(`/vendor-workspace/assigned-orders/${encodeURIComponent(assignedWork.assignment_work_key)}`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText(/Assigned order detail unavailable/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Start Work$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Submit Report$/i })).toHaveCount(0);

    assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(assignments).toHaveLength(1);
    [assignment] = assignments;
    expect(assignment).toMatchObject({
      id: assignmentId,
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "accepted",
    });
    expect(assignment.started_at || null).toBeNull();
    expect(assignment.submitted_at || null).toBeNull();
    expect(assignment.completed_at || null).toBeNull();
  });
});
