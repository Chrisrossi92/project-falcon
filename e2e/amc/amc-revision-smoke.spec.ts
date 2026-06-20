import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import {
  assertAmcWorkspaceActive,
  assertAmcStagingSmokeTarget,
  navigateWithinAmc,
  login as loginWithPassword,
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
  process.env.AMC_STAGING_SMOKE_BID_COMMENTS || "AMC staging Playwright disposable revision branch bid response.";
const BID_AMOUNT_PATTERN = new RegExp(`\\$${BID_AMOUNT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
const REPORT_FIXTURE_FILE_NAME = "amc-smoke-report.pdf";
const REPORT_FIXTURE_PATH = resolve(process.cwd(), "e2e/fixtures", REPORT_FIXTURE_FILE_NAME);
const REPORT_DELIVERY_NOTE = "AMC staging Playwright disposable report submission for revision branch.";
const REVISION_NOTE = "AMC staging Playwright disposable revision request. Please resubmit the smoke report fixture.";
const RESUBMISSION_NOTE = "AMC staging Playwright disposable revision resubmission.";

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
    .select("id, order_number, manual_client_name, manual_client")
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
      "Smoke fixture already has a recorded bid response. Refresh disposable fixture data with E2E_AMC_PREPARE_FIXTURE=1 before running the revision smoke.",
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
        revision_branch: true,
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
        revision_branch: true,
      },
    },
  });
  if (error) throw new Error(`Smoke fixture assignment invitation token creation failed: ${error.message}`);
  if (!data?.token || !data?.path) throw new Error("Smoke fixture assignment invitation did not return a token path.");
  return data;
}

async function openSmokeOrder(page) {
  await navigateWithinAmc(page, `/orders?q=${encodeURIComponent(ORDER_NUMBER)}`);
  await expect(page.getByText(ORDER_NUMBER).first()).toBeVisible({ timeout: 15000 });
  await page.getByText(ORDER_NUMBER).first().click();
  await expect(page.getByText(ORDER_NUMBER).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Orders/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Procurement\s+Falcon AMC/i).first()).toBeVisible({ timeout: 15000 });
  await assertAmcWorkspaceActive(page, "AMC workspace on smoke order detail");
}

async function openProcurementDetails(page) {
  const procurementToggle = page.getByText(/^Show Procurement Details$/i).first();
  if (await procurementToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await procurementToggle.click();
  }
}

async function progressFixtureToSubmittedReport(page) {
  const bidInvitation = await createDisposableBidInvitationToken();
  await page.goto(bidInvitation.path, { waitUntil: "networkidle" });
  await page.getByLabel(/Fee amount/i).fill(BID_AMOUNT);
  await page.getByLabel(/Turn time days/i).fill(BID_TURN_TIME_DAYS);
  await page.getByLabel(/Comments/i).fill(BID_COMMENTS);
  await page.getByLabel(/Contact email/i).fill(VENDOR_EMAIL);
  await page.getByRole("button", { name: /^Submit Bid$/i }).click();
  await expect(page.getByText(/Your bid has been submitted/i)).toBeVisible({ timeout: 15000 });

  await login(page, OWNER_EMAIL);
  await openSmokeOrder(page);
  await openProcurementDetails(page);
  const bidRequest = page
    .getByRole("article")
    .filter({ hasText: /Bid request/i })
    .filter({ hasText: VENDOR_NAME })
    .first();
  await expect(bidRequest.getByText(BID_AMOUNT_PATTERN)).toBeVisible({ timeout: 15000 });
  await bidRequest.getByRole("button", { name: /Select bid/i }).click();
  await page.getByRole("dialog", { name: /Select bid/i }).getByRole("button", { name: /Confirm selection/i }).click();
  await expect(bidRequest.getByText(new RegExp(`Selected response:\\s*${VENDOR_NAME}`, "i"))).toBeVisible({
    timeout: 15000,
  });
  await bidRequest.getByRole("button", { name: /Create Assignment Offer/i }).click();
  await expect(bidRequest.getByText(/Assignment offer created from the selected bid/i)).toBeVisible({
    timeout: 15000,
  });

  const selectedState = await readOwnerFixtureState(ownerFixtureClient);
  const offeredAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, selectedState.orderId);
  expect(offeredAssignments).toHaveLength(1);
  const [offeredAssignment] = offeredAssignments;
  const assignmentInvitation = await createDisposableAssignmentInvitationToken(offeredAssignment.id);

  await page.goto(assignmentInvitation.path, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Accept Assignment$/i }).click();
  await expect(page.getByText(/Assignment accepted/i)).toBeVisible({ timeout: 15000 });

  const vendorClient = await signIn(VENDOR_EMAIL);
  const assignedWork = await readVendorAssignedWork(vendorClient);
  await login(page, VENDOR_EMAIL);
  await page.goto(`/vendor-workspace/assigned-orders/${encodeURIComponent(assignedWork.assignment_work_key)}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: /^Start Work$/i }).click();
  await expect(page.getByText(/Work started/i)).toBeVisible({ timeout: 15000 });

  await page.getByLabel(/^Report PDF$/i).setInputFiles(REPORT_FIXTURE_PATH);
  await page.getByRole("button", { name: /^Upload Report File$/i }).click();
  await expect(page.getByText(REPORT_FIXTURE_FILE_NAME).first()).toBeVisible({ timeout: 30000 });
  await page.getByLabel(/^Delivery Note$/i).fill(REPORT_DELIVERY_NOTE);
  await page.getByRole("button", { name: /^Submit Report$/i }).click();
  await expect(page.getByText(/Submitted \/ Awaiting Review/i).first()).toBeVisible({ timeout: 30000 });

  const submittedAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, selectedState.orderId);
  expect(submittedAssignments).toHaveLength(1);
  const [submittedAssignment] = submittedAssignments;
  expect(submittedAssignment).toMatchObject({
    id: offeredAssignment.id,
    status: "submitted",
    assigned_company_name: VENDOR_NAME,
  });
  expect(submittedAssignment.submitted_at).toBeTruthy();
  expect(submittedAssignment.completed_at || null).toBeNull();

  return { assignment: submittedAssignment, assignedWork };
}

test.describe("AMC staging revision smoke", () => {
  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({ ownerEmail: OWNER_EMAIL, vendorEmail: VENDOR_EMAIL });
    prepareFixtureIfRequested();
    fixtureState = await assertFixtureExists();
  });

  test("requests a disposable vendor report revision and resubmits", async ({ page }) => {
    const { assignment, assignedWork } = await progressFixtureToSubmittedReport(page);

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    const submittedOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Submitted/i })
      .first();
    await expect(submittedOwnerAssignment).toBeVisible({ timeout: 15000 });
    await submittedOwnerAssignment.getByRole("link", { name: /Open assignment packet/i }).click();

    await expect(page.getByText(/^Owner Packet$/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Request Revision$/i })).toBeVisible();
    await page.getByRole("button", { name: /^Request Revision$/i }).click();
    await expect(page.getByRole("heading", { name: /^Request revision$/i })).toBeVisible();
    await page.getByLabel(/Vendor-facing instructions/i).fill(REVISION_NOTE);
    await page.getByRole("button", { name: /^Request Revision$/i }).last().click();

    await expect(page.getByText(/Revision requested/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(REVISION_NOTE)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Complete$/i })).toHaveCount(0);

    await openSmokeOrder(page);
    const revisionOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Revision Requested/i })
      .first();
    await expect(revisionOwnerAssignment).toBeVisible({ timeout: 15000 });

    let assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(assignments).toHaveLength(1);
    let [revisionAssignment] = assignments;
    expect(revisionAssignment).toMatchObject({
      id: assignment.id,
      status: "revision_requested",
      assigned_company_name: VENDOR_NAME,
    });
    expect(revisionAssignment.revision_requested_at).toBeTruthy();
    expect(revisionAssignment.completed_at || null).toBeNull();

    await login(page, VENDOR_EMAIL);
    await page.goto(`/vendor-workspace/assigned-orders/${encodeURIComponent(assignedWork.assignment_work_key)}`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText(/Revision Requested/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(REVISION_NOTE)).toBeVisible();
    await page.getByLabel(/^Revised Report PDF$/i).setInputFiles(REPORT_FIXTURE_PATH);
    await page.getByRole("button", { name: /^Upload Revision File$/i }).click();
    await expect(page.getByText(REPORT_FIXTURE_FILE_NAME).first()).toBeVisible({ timeout: 30000 });
    await page.getByLabel(/^Revision Response Note$/i).fill(RESUBMISSION_NOTE);
    await page.getByRole("button", { name: /^Resubmit Report$/i }).click();
    await expect(page.getByText(/Report resubmitted/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Resubmitted \/ Awaiting Review/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(RESUBMISSION_NOTE)).toBeVisible();

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    const resubmittedOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Submitted/i })
      .first();
    await expect(resubmittedOwnerAssignment).toBeVisible({ timeout: 15000 });
    await resubmittedOwnerAssignment.getByRole("link", { name: /Open assignment packet/i }).click();
    await expect(page.getByText(/Resubmitted|resubmission|Revision/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Complete$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Request Revision$/i })).toBeVisible();

    assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
    expect(assignments).toHaveLength(1);
    const [resubmittedAssignment] = assignments;
    expect(resubmittedAssignment).toMatchObject({
      id: assignment.id,
      status: "submitted",
      assigned_company_name: VENDOR_NAME,
    });
    expect(resubmittedAssignment.submitted_at).toBeTruthy();
    expect(resubmittedAssignment.completed_at || null).toBeNull();
    expect(resubmittedAssignment.submission_payload?.resubmission?.resubmitted_at || null).toBeTruthy();
  });
});
