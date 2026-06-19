import { expect, test } from "@playwright/test";

import {
  assertAmcStagingSmokeTarget,
  prepareFixtureIfRequested,
  signIn as signInWithPassword,
} from "./helpers/stagingSmoke";

const ORDER_NUMBER = process.env.AMC_STAGING_SMOKE_ORDER_NUMBER || "AMC-STAGING-SMOKE-001";
const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const VENDOR_EMAIL = process.env.AMC_STAGING_SMOKE_VENDOR_EMAIL || "amc.smoke.vendor+staging@example.test";
const VENDOR_NAME = process.env.AMC_STAGING_SMOKE_VENDOR_NAME || "AMC SMOKE - DO NOT USE Vendor";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const BID_AMOUNT = "745";
const BID_TURN_TIME_DAYS = "4";
const BID_COMMENTS = "AMC staging Playwright disposable public token bid response.";

let fixtureState = null;
let ownerFixtureClient = null;

async function signIn(email: string) {
  return (await signInWithPassword(email, PASSWORD)).client;
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
    respondedCount: recipients.filter((recipient) => recipient?.response).length,
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
      "Smoke fixture already has a recorded bid response. Refresh disposable fixture data with E2E_AMC_PREPARE_FIXTURE=1 before running the public-token smoke.",
    );
  }
  return ownerFixtureState;
}

async function createDisposableBidInvitationToken() {
  const { data, error } = await ownerFixtureClient.rpc("rpc_order_vendor_bid_invitation_create", {
    p_recipient_id: fixtureState.bidRecipientId,
    p_payload: {
      sent_to_email: VENDOR_EMAIL,
      metadata: {
        playwright_amc_staging_smoke: true,
        no_email_delivery: true,
        public_token_branch: true,
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
        public_token_branch: true,
      },
    },
  });
  if (error) throw new Error(`Smoke fixture assignment invitation token creation failed: ${error.message}`);
  if (!data?.token || !data?.path) throw new Error("Smoke fixture assignment invitation did not return a token path.");
  return data;
}

test.describe("AMC staging public-token security smoke", () => {
  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({ ownerEmail: OWNER_EMAIL, vendorEmail: VENDOR_EMAIL });
    prepareFixtureIfRequested();
    fixtureState = await assertFixtureExists();
  });

  test("fails safely for invalid and reused public bid and assignment tokens", async ({ page }) => {
    await page.goto("/vendor/bid-invitations/not-a-real-amc-bid-token", { waitUntil: "networkidle" });
    await expect(page.getByText("This bid invitation is unavailable.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Submit Bid$/i })).toHaveCount(0);

    let ownerState = await readOwnerFixtureState(ownerFixtureClient);
    expect(ownerState.response || null).toBeNull();
    expect(ownerState.respondedCount).toBe(0);

    const bidInvitation = await createDisposableBidInvitationToken();
    await page.goto(bidInvitation.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Vendor Bid Invitation/i })).toBeVisible();
    await page.getByLabel(/Fee amount/i).fill(BID_AMOUNT);
    await page.getByLabel(/Turn time days/i).fill(BID_TURN_TIME_DAYS);
    await page.getByLabel(/Comments/i).fill(BID_COMMENTS);
    await page.getByLabel(/Contact email/i).fill(VENDOR_EMAIL);
    await page.getByRole("button", { name: /^Submit Bid$/i }).click();
    await expect(page.getByText(/Your bid has been submitted/i)).toBeVisible({ timeout: 15000 });

    ownerState = await readOwnerFixtureState(ownerFixtureClient);
    expect(ownerState.respondedCount).toBe(1);
    expect(ownerState.response).toBeTruthy();
    expect(String(ownerState.response?.fee_amount)).toBe(BID_AMOUNT);

    await page.goto(bidInvitation.path, { waitUntil: "networkidle" });
    await expect(page.getByText("This bid invitation is unavailable.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Submit Bid$/i })).toHaveCount(0);

    const duplicateAttempt = await ownerFixtureClient.rpc("rpc_order_vendor_bid_invitation_submit", {
      p_token: bidInvitation.token,
      p_payload: {
        fee_amount: "999",
        currency: "USD",
        turn_time_days: "1",
        comments: "Duplicate public-token attempt should be blocked.",
        contact_email: VENDOR_EMAIL,
      },
    });
    expect(duplicateAttempt.error || duplicateAttempt.data?.ok === false).toBeTruthy();

    ownerState = await readOwnerFixtureState(ownerFixtureClient);
    expect(ownerState.respondedCount).toBe(1);
    expect(String(ownerState.response?.fee_amount)).toBe(BID_AMOUNT);

    await page.goto("/vendor/assignment-offers/not-a-real-amc-assignment-token", { waitUntil: "networkidle" });
    await expect(page.getByText("This assignment offer is unavailable.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Accept Assignment$/i })).toHaveCount(0);

    let assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(assignments).toHaveLength(0);

    const selectResult = await ownerFixtureClient.rpc("rpc_order_vendor_bid_response_select", {
      p_response_id: ownerState.response.response_id,
    });
    if (selectResult.error) throw new Error(`Smoke bid selection failed: ${selectResult.error.message}`);

    const offerResult = await ownerFixtureClient.rpc("rpc_order_vendor_bid_response_convert_to_assignment_offer", {
      p_response_id: ownerState.response.response_id,
      p_payload: {
        instructions: "AMC staging Playwright disposable public token assignment offer.",
      },
    });
    if (offerResult.error) throw new Error(`Smoke assignment offer failed: ${offerResult.error.message}`);
    const assignmentId = offerResult.data?.assignment_id;
    if (!assignmentId) throw new Error("Smoke assignment offer did not return an assignment id.");

    const assignmentInvitation = await createDisposableAssignmentInvitationToken(assignmentId);
    await page.goto(assignmentInvitation.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Assignment Offer/i })).toBeVisible();
    await page.getByRole("button", { name: /^Accept Assignment$/i }).click();
    await expect(page.getByText(/Assignment accepted/i)).toBeVisible({ timeout: 15000 });

    assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
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

    await page.goto(assignmentInvitation.path, { waitUntil: "networkidle" });
    await expect(page.getByText("This assignment offer is unavailable.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Accept Assignment$/i })).toHaveCount(0);

    const secondAccept = await ownerFixtureClient.rpc("rpc_order_company_assignment_invitation_respond", {
      p_token: assignmentInvitation.token,
      p_action: "accept",
      p_reason: null,
    });
    expect(secondAccept.error || secondAccept.data?.ok === false).toBeTruthy();

    assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(assignments).toHaveLength(1);
    [assignment] = assignments;
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
  });
});
