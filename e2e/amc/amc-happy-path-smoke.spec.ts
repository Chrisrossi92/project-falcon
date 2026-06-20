import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import {
  assertOwnerAssignmentPacketLoaded,
  assertAmcStagingSmokeTarget,
  ensureAmcWorkspace,
  login as loginWithPassword,
  openAmcOrderDetail,
  prepareFixtureIfRequested,
  signIn as signInWithPassword,
} from "./helpers/stagingSmoke";

const ORDER_NUMBER = process.env.AMC_STAGING_SMOKE_ORDER_NUMBER || "AMC-STAGING-SMOKE-001";
const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const VENDOR_EMAIL = process.env.AMC_STAGING_SMOKE_VENDOR_EMAIL || "amc.smoke.vendor+staging@example.test";
const VENDOR_NAME = process.env.AMC_STAGING_SMOKE_VENDOR_NAME || "AMC SMOKE - DO NOT USE Vendor";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const BID_AMOUNT = process.env.AMC_STAGING_SMOKE_BID_AMOUNT || "725";
const BID_TURN_TIME_DAYS = process.env.AMC_STAGING_SMOKE_BID_TURN_TIME_DAYS || "6";
const BID_COMMENTS =
  process.env.AMC_STAGING_SMOKE_BID_COMMENTS || "AMC staging Playwright disposable token bid response.";
const BID_AMOUNT_PATTERN = new RegExp(`\\$${BID_AMOUNT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
const REPORT_FIXTURE_FILE_NAME = "amc-smoke-report.pdf";
const REPORT_FIXTURE_PATH = resolve(process.cwd(), "e2e/fixtures", REPORT_FIXTURE_FILE_NAME);
const REPORT_DELIVERY_NOTE = "AMC staging Playwright disposable report submission.";

let fixtureState = null;
let ownerFixtureClient = null;

async function signIn(email: string) {
  return (await signInWithPassword(email, PASSWORD)).client;
}

async function readVendorAssignedWork(vendorClient) {
  const { data, error } = await vendorClient.rpc("rpc_vendor_workspace_assigned_orders");
  if (error) throw new Error(`Smoke fixture vendor assigned orders lookup failed: ${error.message}`);

  const rows = Array.isArray(data?.items) ? data.items : [];
  const assigned = rows.find((item) => item?.order?.order_number === ORDER_NUMBER);
  if (!assigned?.assignment_work_key) {
    throw new Error(`Vendor fixture cannot see assigned work for ${ORDER_NUMBER}.`);
  }
  return assigned;
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
    bidRequestId: fixtureBidRequest.bid_request_id || fixtureBidRequest.id,
    bidRecipientId: fixtureRecipient.recipient_id || fixtureRecipient.id,
    bidRequestStatus: fixtureBidRequest.status,
    bidRecipientStatus: fixtureRecipient.status,
    bidRecipientCount: recipients.length,
    respondedCount: recipients.filter((recipient) => recipient?.response).length,
    response: fixtureRecipient.response || null,
    vendorName: fixtureRecipient.vendor_company_name,
  };
}

async function assertNoVendorAssignmentStarted(ownerClient, orderId) {
  const vendorAssignments = await readVendorAssignmentsForOrder(ownerClient, orderId);
  if (vendorAssignments.length > 0) {
    throw new Error(`Expected no vendor appraisal assignments for smoke order, found ${vendorAssignments.length}.`);
  }
}

async function readVendorAssignmentsForOrder(ownerClient, orderId) {
  const { data, error } = await ownerClient.rpc("rpc_order_company_assignment_list_for_order", {
    p_order_id: orderId,
  });
  if (error) throw new Error(`Smoke fixture assignment lookup failed: ${error.message}`);

  const rows = Array.isArray(data) ? data : [];
  return rows.filter((assignment) => assignment?.assignment_type === "vendor_appraisal");
}

async function readOwnerFixtureState(ownerClient) {
  const { data: order, error: orderError } = await ownerClient
    .from("orders")
    .select("id, order_number, manual_client_name, manual_client")
    .eq("order_number", ORDER_NUMBER)
    .maybeSingle();

  if (orderError) throw new Error(`Smoke fixture order lookup failed: ${orderError.message}`);
  if (!order?.id) throw new Error(`Smoke fixture order ${ORDER_NUMBER} was not found.`);
  if (!order.manual_client_name && !order.manual_client) {
    throw new Error(`Smoke fixture order ${ORDER_NUMBER} is missing client fixture labeling.`);
  }

  const { data: bidRequests, error: bidRequestError } = await ownerClient.rpc("rpc_order_vendor_bid_requests_for_order", {
    p_order_id: order.id,
  });
  if (bidRequestError) throw new Error(`Smoke fixture bid request lookup failed: ${bidRequestError.message}`);

  return readBidFixtureState(order, bidRequests);
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
      "Smoke fixture bid recipient already has a recorded response. Refresh disposable fixture data with E2E_AMC_PREPARE_FIXTURE=1 before rerunning the token submission smoke.",
    );
  }

  const vendorClient = await signIn(VENDOR_EMAIL);
  const { data: availableWork, error: availableWorkError } = await vendorClient.rpc("rpc_vendor_workspace_available_work");
  if (availableWorkError) throw new Error(`Smoke fixture vendor lookup failed: ${availableWorkError.message}`);

  const rows = Array.isArray(availableWork?.items) ? availableWork.items : [];
  const hasVendorFixture = rows.some((item) => item?.order?.order_number === ORDER_NUMBER);
  if (!hasVendorFixture) throw new Error(`Vendor fixture cannot see available work for ${ORDER_NUMBER}.`);

  return ownerFixtureState;
}

async function login(page, email: string) {
  await loginWithPassword(page, email, PASSWORD);
}

async function openSmokeOrder(page) {
  await openAmcOrderDetail(page, ORDER_NUMBER);
}

async function openProcurementDetails(page) {
  const procurementToggle = page.getByText(/^Show Procurement Details$/i).first();
  if (await procurementToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await procurementToggle.click();
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function currentBidRequestsSection(page) {
  await openProcurementDetails(page);
  const bidRequests = page.getByLabel(/^Bid requests$/i);
  await expect(bidRequests).toBeVisible({ timeout: 15000 });
  return bidRequests;
}

async function visibleBidSectionButtons(section, label) {
  const buttons = await section.getByRole("button").evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const style = window.getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
      })
      .map((node) => ({
        text: node.textContent?.replace(/\s+/g, " ").trim() || "",
        ariaLabel: node.getAttribute("aria-label") || "",
        disabled: node.hasAttribute("disabled"),
      })),
  );
  console.log(`[amc happy smoke] ${label} visible bid section buttons: ${JSON.stringify(buttons)}`);
  return buttons;
}

async function currentBidActionButton(section, actionName, label) {
  const vendorSpecific = section
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(actionName)} for ${escapeRegExp(VENDOR_NAME)}$`, "i") })
    .first();
  if (await vendorSpecific.isVisible({ timeout: 5000 }).catch(() => false)) return vendorSpecific;

  const generic = section.getByRole("button", { name: new RegExp(`^${escapeRegExp(actionName)}$`, "i") }).first();
  if (await generic.isVisible({ timeout: 5000 }).catch(() => false)) return generic;

  const buttons = await visibleBidSectionButtons(section, label);
  throw new Error(`${label} was not visible in current Bid requests UI. Buttons: ${JSON.stringify(buttons)}`);
}

async function createDisposableBidInvitationToken() {
  if (!ownerFixtureClient) throw new Error("Owner fixture client was not initialized.");
  if (!fixtureState?.bidRecipientId) throw new Error("Smoke fixture bid recipient id was not found.");

  const { data, error } = await ownerFixtureClient.rpc("rpc_order_vendor_bid_invitation_create", {
    p_recipient_id: fixtureState.bidRecipientId,
    p_payload: {
      sent_to_email: VENDOR_EMAIL,
      metadata: {
        playwright_amc_staging_smoke: true,
        no_email_delivery: true,
      },
    },
  });
  if (error) throw new Error(`Smoke fixture bid invitation token creation failed: ${error.message}`);
  if (!data?.token || !data?.path) throw new Error(`Smoke fixture bid invitation did not return a token path.`);
  if (data.sent_to_email !== VENDOR_EMAIL.toLowerCase()) {
    throw new Error(`Smoke fixture bid invitation email mismatch: ${data.sent_to_email || "(missing)"}.`);
  }
  return data;
}

async function createDisposableAssignmentInvitationToken(assignmentId) {
  if (!ownerFixtureClient) throw new Error("Owner fixture client was not initialized.");
  if (!assignmentId) throw new Error("Smoke fixture assignment id was not found.");

  const { data, error } = await ownerFixtureClient.rpc("rpc_order_company_assignment_invitation_create", {
    p_assignment_id: assignmentId,
    p_payload: {
      sent_to_email: VENDOR_EMAIL,
      metadata: {
        playwright_amc_staging_smoke: true,
        no_email_delivery: true,
      },
    },
  });
  if (error) throw new Error(`Smoke fixture assignment invitation token creation failed: ${error.message}`);
  if (!data?.token || !data?.path) throw new Error("Smoke fixture assignment invitation did not return a token path.");
  if (data.sent_to_email !== VENDOR_EMAIL.toLowerCase()) {
    throw new Error(`Smoke fixture assignment invitation email mismatch: ${data.sent_to_email || "(missing)"}.`);
  }
  return data;
}

test.describe("AMC staging happy-path smoke", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({ ownerEmail: OWNER_EMAIL, vendorEmail: VENDOR_EMAIL });
    prepareFixtureIfRequested();
    fixtureState = await assertFixtureExists();
  });

  test("opens the AMC dashboard and disposable smoke order", async ({ page }) => {
    await login(page, OWNER_EMAIL);

    await ensureAmcWorkspace(page);
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Falcon AMC Dashboard|Dashboard/i }).first()).toBeVisible();

    await openSmokeOrder(page);
    await expect(page.getByText(/vendor|assignment|client/i).first()).toBeVisible();
  });

  test("shows the expected procurement bid request state", async ({ page }) => {
    expect(fixtureState).toMatchObject({
      bidRequestStatus: "sent",
      bidRecipientStatus: "sent",
      bidRecipientCount: 1,
      respondedCount: 0,
      vendorName: VENDOR_NAME,
    });

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    const bidStatus = page.getByLabel(/AMC bid status/i);
    await expect(bidStatus).toContainText(/Out for bid/i);
    await expect(bidStatus).toContainText(/1 contacted \/ 0 responded/i);

    await openProcurementDetails(page);
    const bidRequests = page.getByLabel(/^Bid requests$/i);
    await expect(bidRequests).toBeVisible({ timeout: 15000 });
    await expect(bidRequests).toContainText(VENDOR_NAME);
    await expect(bidRequests).toContainText(/Recipients/i);
    await expect(bidRequests).toContainText(/Responded/i);
  });

  test("submits a disposable vendor bid through the public token path", async ({ page }) => {
    const invitation = await createDisposableBidInvitationToken();

    await page.goto(invitation.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Vendor Bid Invitation/i })).toBeVisible();
    await expect(page.getByText(ORDER_NUMBER)).toBeVisible();
    await expect(page.getByRole("main")).toContainText(VENDOR_NAME);

    await page.getByLabel(/Fee amount/i).fill(BID_AMOUNT);
    await page.getByLabel(/Turn time days/i).fill(BID_TURN_TIME_DAYS);
    await page.getByLabel(/Comments/i).fill(BID_COMMENTS);
    await page.getByLabel(/Contact email/i).fill(VENDOR_EMAIL);
    await page.getByRole("button", { name: /^Submit Bid$/i }).click();

    await expect(page.getByText(/Your bid has been submitted/i)).toBeVisible({ timeout: 15000 });

    const nextFixtureState = await readOwnerFixtureState(ownerFixtureClient);
    expect(nextFixtureState).toMatchObject({
      bidRecipientStatus: "responded",
      respondedCount: 1,
      vendorName: VENDOR_NAME,
    });
    expect(String(nextFixtureState.response?.fee_amount)).toBe(BID_AMOUNT);
    expect(String(nextFixtureState.response?.turn_time_days)).toBe(BID_TURN_TIME_DAYS);
    expect(nextFixtureState.response?.comments).toBe(BID_COMMENTS);
    expect(nextFixtureState.response?.selected_at || null).toBeNull();

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    const bidStatus = page.getByLabel(/AMC bid status/i);
    await expect(bidStatus).toContainText(/Bids received/i);
    await expect(bidStatus).toContainText(/1 contacted \/ 1 responded/i);
    await expect(bidStatus).toContainText(/Lowest Fee/i);
    await expect(bidStatus).toContainText(BID_AMOUNT_PATTERN);
  });

  test("selects the disposable vendor bid and stops before assignment", async ({ page }) => {
    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bids received|1 contacted \/ 1 responded/i);
    const bidRequests = await currentBidRequestsSection(page);
    await expect(bidRequests).toContainText(VENDOR_NAME);
    await expect(bidRequests).toContainText(BID_AMOUNT_PATTERN);
    await (await currentBidActionButton(bidRequests, "Select bid", "Select bid action")).click();

    const dialog = page.getByRole("dialog", { name: /Select bid/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(VENDOR_NAME);
    await expect(dialog.getByText(BID_AMOUNT_PATTERN)).toBeVisible();
    await expect(dialog.getByText(new RegExp(`${BID_TURN_TIME_DAYS} days?`, "i"))).toBeVisible();
    await dialog.getByRole("button", { name: /Confirm selection/i }).click();

    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bid selected/i);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(VENDOR_NAME);

    const selectedFixtureState = await readOwnerFixtureState(ownerFixtureClient);
    expect(selectedFixtureState).toMatchObject({
      bidRequestStatus: "closed",
      bidRecipientStatus: "selected",
      respondedCount: 1,
      vendorName: VENDOR_NAME,
    });
    expect(selectedFixtureState.response?.selected_at).toBeTruthy();
    expect(String(selectedFixtureState.response?.fee_amount)).toBe(BID_AMOUNT);
    expect(String(selectedFixtureState.response?.turn_time_days)).toBe(BID_TURN_TIME_DAYS);
    expect(selectedFixtureState.response?.comments).toBe(BID_COMMENTS);

    await expect(await currentBidActionButton(bidRequests, "Create Assignment Offer", "Create assignment offer action")).toBeVisible();
    await assertNoVendorAssignmentStarted(ownerFixtureClient, selectedFixtureState.orderId);
  });

  test("creates an owner assignment offer from the selected bid and stops before acceptance", async ({ page }) => {
    const selectedFixtureState = await readOwnerFixtureState(ownerFixtureClient);
    expect(selectedFixtureState).toMatchObject({
      bidRequestStatus: "closed",
      bidRecipientStatus: "selected",
      respondedCount: 1,
      vendorName: VENDOR_NAME,
    });
    expect(selectedFixtureState.response?.selected_at).toBeTruthy();

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bid selected/i);
    const bidRequests = await currentBidRequestsSection(page);
    await expect(bidRequests).toContainText(VENDOR_NAME);
    await (await currentBidActionButton(bidRequests, "Create Assignment Offer", "Create assignment offer action")).click();
    await expect(page.getByRole("status").filter({ hasText: /Assignment offer created from the selected bid/i })).toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Assignment offered/i);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(VENDOR_NAME);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Offered/i);

    const assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, selectedFixtureState.orderId);
    expect(assignments).toHaveLength(1);
    const [assignment] = assignments;
    expect(assignment).toMatchObject({
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "offered",
      selected_bid_response_id: selectedFixtureState.response.response_id,
    });
    expect(Number(assignment.accepted_fee_amount)).toBe(Number(BID_AMOUNT));
    expect(Number(assignment.accepted_turn_time_days)).toBe(Number(BID_TURN_TIME_DAYS));
    expect(assignment.offered_at).toBeTruthy();
    expect(assignment.accepted_at || null).toBeNull();
    expect(assignment.started_at || null).toBeNull();
    expect(assignment.submitted_at || null).toBeNull();
    expect(assignment.completed_at || null).toBeNull();

    await expect(bidRequests.getByRole("button", { name: /Create Assignment Offer/i })).toHaveCount(0);
  });

  test("accepts the disposable assignment offer and stops before vendor execution", async ({ page }) => {
    const offeredFixtureState = await readOwnerFixtureState(ownerFixtureClient);
    const offeredAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, offeredFixtureState.orderId);
    expect(offeredAssignments).toHaveLength(1);
    const [offeredAssignment] = offeredAssignments;
    expect(offeredAssignment).toMatchObject({
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "offered",
      selected_bid_response_id: offeredFixtureState.response.response_id,
    });
    expect(offeredAssignment.accepted_at || null).toBeNull();
    expect(offeredAssignment.started_at || null).toBeNull();
    expect(offeredAssignment.submitted_at || null).toBeNull();
    expect(offeredAssignment.completed_at || null).toBeNull();

    const invitation = await createDisposableAssignmentInvitationToken(offeredAssignment.id);

    await page.goto(invitation.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Assignment Offer/i })).toBeVisible();
    await expect(page.getByText(ORDER_NUMBER)).toBeVisible();
    await expect(page.getByRole("main")).toContainText(VENDOR_NAME);
    await expect(page.getByRole("main")).toContainText(BID_AMOUNT_PATTERN);
    await page.getByRole("button", { name: /^Accept Assignment$/i }).click();

    await expect(page.getByText(/Assignment accepted/i)).toBeVisible({ timeout: 15000 });

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Assigned/i);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Accepted/i);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(VENDOR_NAME);

    const acceptedAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, offeredFixtureState.orderId);
    expect(acceptedAssignments).toHaveLength(1);
    const [acceptedAssignment] = acceptedAssignments;
    expect(acceptedAssignment).toMatchObject({
      id: offeredAssignment.id,
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "accepted",
      selected_bid_response_id: offeredFixtureState.response.response_id,
    });
    expect(acceptedAssignment.accepted_at).toBeTruthy();
    expect(acceptedAssignment.started_at || null).toBeNull();
    expect(acceptedAssignment.submitted_at || null).toBeNull();
    expect(acceptedAssignment.completed_at || null).toBeNull();
  });

  test("starts the disposable vendor assignment and stops before report submission", async ({ page }) => {
    const vendorClient = await signIn(VENDOR_EMAIL);
    const assignedWork = await readVendorAssignedWork(vendorClient);
    expect(assignedWork).toMatchObject({
      assignment_status: "accepted_not_started",
      next_action_label: "Start Work",
    });

    await login(page, VENDOR_EMAIL);
    await page.goto(`/vendor-workspace/assigned-orders/${encodeURIComponent(assignedWork.assignment_work_key)}`, {
      waitUntil: "networkidle",
    });

    await expect(page).toHaveURL(/\/vendor-workspace\/assigned-orders\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 });
    await expect(page.getByText(ORDER_NUMBER).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Start Work$/i })).toBeVisible();
    await page.getByRole("button", { name: /^Start Work$/i }).click();

    await expect(page.getByText(/Work started/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/In Progress/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/^Report PDF$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Submit Report$/i })).toBeVisible();

    const inProgressAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(inProgressAssignments).toHaveLength(1);
    const [assignment] = inProgressAssignments;
    expect(assignment).toMatchObject({
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "in_progress",
    });
    expect(assignment.accepted_at).toBeTruthy();
    expect(assignment.started_at).toBeTruthy();
    expect(assignment.submitted_at || null).toBeNull();
    expect(assignment.completed_at || null).toBeNull();
  });

  test("submits a disposable vendor report and stops before owner review", async ({ page }) => {
    const vendorClient = await signIn(VENDOR_EMAIL);
    const assignedWork = await readVendorAssignedWork(vendorClient);
    expect(assignedWork).toMatchObject({
      assignment_status: "in_progress",
      next_action_label: "Submit Report",
    });

    await login(page, VENDOR_EMAIL);
    await page.goto(`/vendor-workspace/assigned-orders/${encodeURIComponent(assignedWork.assignment_work_key)}`, {
      waitUntil: "networkidle",
    });

    await expect(page).toHaveURL(/\/vendor-workspace\/assigned-orders\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 });
    await expect(page.getByText(ORDER_NUMBER).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/In Progress/i).first()).toBeVisible({ timeout: 15000 });

    await page.getByLabel(/^Report PDF$/i).setInputFiles(REPORT_FIXTURE_PATH);
    await expect(page.getByText(`Selected: ${REPORT_FIXTURE_FILE_NAME}`)).toBeVisible();
    await page.getByRole("button", { name: /^Upload Report File$/i }).click();
    await expect(page.getByText(REPORT_FIXTURE_FILE_NAME).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("button", { name: /^Submit Report$/i })).toBeEnabled();

    await page.getByLabel(/^Delivery Note$/i).fill(REPORT_DELIVERY_NOTE);
    await page.getByRole("button", { name: /^Submit Report$/i }).click();

    await expect(page.getByText(/Submitted Report/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Submitted \/ Awaiting Review/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(REPORT_DELIVERY_NOTE)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Submit Report$/i })).toHaveCount(0);

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);

    const ownerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Submitted/i })
      .first();
    await expect(ownerAssignment).toBeVisible({ timeout: 15000 });
    await expect(ownerAssignment).toContainText(VENDOR_NAME);
    await expect(ownerAssignment.getByText(/Submitted/i).first()).toBeVisible();
    await expect(ownerAssignment.getByRole("link", { name: /Open assignment packet/i })).toBeVisible();

    const submittedAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(submittedAssignments).toHaveLength(1);
    const [assignment] = submittedAssignments;
    expect(assignment).toMatchObject({
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "submitted",
    });
    expect(assignment.accepted_at).toBeTruthy();
    expect(assignment.started_at).toBeTruthy();
    expect(assignment.submitted_at).toBeTruthy();
    expect(assignment.completed_at || null).toBeNull();
  });

  test("completes the disposable submitted vendor report and stops before invoice", async ({ page }) => {
    const submittedAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(submittedAssignments).toHaveLength(1);
    const [submittedAssignment] = submittedAssignments;
    expect(submittedAssignment).toMatchObject({
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "submitted",
    });
    expect(submittedAssignment.submitted_at).toBeTruthy();
    expect(submittedAssignment.completed_at || null).toBeNull();
    expect(submittedAssignment.revision_requested_at || null).toBeNull();
    expect(submittedAssignment.submission_payload?.revision || null).toBeNull();

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);

    const submittedOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Submitted/i })
      .first();
    await expect(submittedOwnerAssignment).toBeVisible({ timeout: 15000 });
    await expect(submittedOwnerAssignment.getByText(/Submitted/i).first()).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/assignments\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 }),
      submittedOwnerAssignment.getByRole("link", { name: /Open assignment packet/i }).click(),
    ]);

    await assertOwnerAssignmentPacketLoaded(page, "Submitted owner assignment packet");
    await expect(page.getByLabel(/^Owner Packet detail$/i)).toContainText(VENDOR_NAME);
    await expect(page.getByText(/Submitted/i).first()).toBeVisible();
    await expect(page.getByText(/Submission/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Complete$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Request Revision$/i })).toBeVisible();

    await page.getByRole("button", { name: /^Complete$/i }).click();
    await expect(page.getByText(/^Complete assignment$/i)).toBeVisible();
    await page.getByRole("button", { name: /^Complete$/i }).last().click();

    await expect(page.getByText(/Completed/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Complete$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Request Revision$/i })).toHaveCount(0);
    await expect(page.getByText(/Revision requested/i)).toHaveCount(0);

    await openSmokeOrder(page);
    const completedOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Completed/i })
      .first();
    await expect(completedOwnerAssignment).toBeVisible({ timeout: 15000 });
    await expect(completedOwnerAssignment).toContainText(VENDOR_NAME);
    await expect(completedOwnerAssignment.getByText(/Completed/i).first()).toBeVisible();

    const completedAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(completedAssignments).toHaveLength(1);
    const [assignment] = completedAssignments;
    expect(assignment).toMatchObject({
      id: submittedAssignment.id,
      assigned_company_name: VENDOR_NAME,
      assignment_type: "vendor_appraisal",
      status: "completed",
    });
    expect(assignment.accepted_at).toBeTruthy();
    expect(assignment.started_at).toBeTruthy();
    expect(assignment.submitted_at).toBeTruthy();
    expect(assignment.completed_at).toBeTruthy();
    expect(assignment.revision_requested_at || null).toBeNull();
    expect(assignment.submission_payload?.revision || null).toBeNull();
  });
});
