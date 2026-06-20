import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import {
  assertOwnerAssignmentPacketLoaded,
  assertAmcWorkspaceActive,
  assertAmcStagingSmokeTarget,
  logAmcWorkspaceDiagnostics,
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
  process.env.AMC_STAGING_SMOKE_BID_COMMENTS || "AMC staging Playwright disposable revision branch bid response.";
const BID_AMOUNT_PATTERN = new RegExp(`\\$${BID_AMOUNT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
const REPORT_FIXTURE_FILE_NAME = "amc-smoke-report.pdf";
const REPORT_FIXTURE_PATH = resolve(process.cwd(), "e2e/fixtures", REPORT_FIXTURE_FILE_NAME);
const REPORT_DELIVERY_NOTE = "AMC staging Playwright disposable report submission for revision branch.";
const REVISION_NOTE = "AMC staging Playwright disposable revision request. Please resubmit the smoke report fixture.";
const RESUBMISSION_NOTE = "AMC staging Playwright disposable revision resubmission.";
const BASE_URL = (process.env.E2E_BASE_URL || "http://127.0.0.1:5173").replace(/\/+$/, "");

let fixtureState = null;
let ownerFixtureClient = null;

async function signIn(email: string) {
  return (await signInWithPassword(email, PASSWORD)).client;
}

async function login(page, email: string) {
  await loginWithPassword(page, email, PASSWORD);
}

async function newIsolatedPage(browser, label) {
  console.log(`[amc revision smoke] opening isolated page for ${label}`);
  const context = await browser.newContext({ baseURL: BASE_URL });
  return context.newPage();
}

async function closeIsolatedPage(page, label) {
  console.log(`[amc revision smoke] closing isolated page for ${label} at ${page.url()}`);
  await page.context().close().catch(() => {});
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
  await openAmcOrderDetail(page, ORDER_NUMBER);
}

async function assertRevisionAmcCheckpoint(page, label) {
  await logAmcWorkspaceDiagnostics(page, label);
  await assertAmcWorkspaceActive(page, label);
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

async function visibleButtonDiagnostics(page, context, scope = null) {
  const diagnosticScope = scope || page.locator("body");
  const buttons = await diagnosticScope.getByRole("button").evaluateAll((nodes) =>
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
  const text = await diagnosticScope.textContent().catch(() => "");
  console.log(`[amc revision smoke] ${context} visible procurement buttons: ${JSON.stringify(buttons)}`);
  console.log(`[amc revision smoke] ${context} procurement text: ${String(text || "").replace(/\s+/g, " ").trim()}`);
  return buttons;
}

async function expectCurrentActionButton(page, locator, context, diagnosticScope = page) {
  if (await locator.isVisible({ timeout: 10000 }).catch(() => false)) {
    return locator;
  }

  const buttons = await visibleButtonDiagnostics(page, context, diagnosticScope);
  throw new Error(`${context} action button was not visible. Current URL: ${page.url()}. Buttons: ${JSON.stringify(buttons)}`);
}

async function progressFixtureToSubmittedReport(browser) {
  let page = await newIsolatedPage(browser, "public bid submission");
  const bidInvitation = await createDisposableBidInvitationToken();
  console.log(`[amc revision smoke] navigating to public bid invitation from ${page.url()}`);
  await page.goto(bidInvitation.path, { waitUntil: "networkidle" });
  await page.getByLabel(/Fee amount/i).fill(BID_AMOUNT);
  await page.getByLabel(/Turn time days/i).fill(BID_TURN_TIME_DAYS);
  await page.getByLabel(/Comments/i).fill(BID_COMMENTS);
  await page.getByLabel(/Contact email/i).fill(VENDOR_EMAIL);
  await page.getByRole("button", { name: /^Submit Bid$/i }).click();
  await expect(page.getByText(/Your bid has been submitted/i)).toBeVisible({ timeout: 15000 });
  await closeIsolatedPage(page, "public bid submission");

  page = await newIsolatedPage(browser, "owner bid selection");
  await logAmcWorkspaceDiagnostics(page, "before owner login for bid selection");
  await login(page, OWNER_EMAIL);
  await logAmcWorkspaceDiagnostics(page, "after owner login before opening smoke order for bid selection");
  await openSmokeOrder(page);
  await assertRevisionAmcCheckpoint(page, "after opening smoke order for bid selection");
  await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bids received|1 contacted \/ 1 responded/i);
  await openProcurementDetails(page);
  await assertRevisionAmcCheckpoint(page, "after opening procurement details for bid selection");
  const procurementSection = page.getByLabel(/^Bid requests$/i);
  await expect(procurementSection).toBeVisible({ timeout: 15000 });

  await visibleButtonDiagnostics(page, "before bid selection", procurementSection);
  const selectBidButton = await expectCurrentActionButton(
    page,
    procurementSection.getByRole("button", {
      name: new RegExp(`^Select bid(?: for ${escapeRegExp(VENDOR_NAME)})?$`, "i"),
    }),
    "Select bid",
    procurementSection,
  );
  await selectBidButton.click();
  await page.getByRole("dialog", { name: /Select bid/i }).getByRole("button", { name: /Confirm selection/i }).click();
  await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bid selected/i);
  await expect(page.getByLabel(/AMC bid status/i)).toContainText(VENDOR_NAME);
  await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Accepted Fee/i);
  await expect(page.getByLabel(/AMC bid status/i)).toContainText(BID_AMOUNT_PATTERN);

  await visibleButtonDiagnostics(page, "before assignment offer creation", procurementSection);
  const createOfferButton = await expectCurrentActionButton(
    page,
    procurementSection.getByRole("button", { name: /Create Assignment Offer/i }),
    "Create Assignment Offer",
    procurementSection,
  );
  await createOfferButton.click();
  await expect(page.getByRole("status").filter({ hasText: /Assignment offer created from the selected bid/i })).toBeVisible({
    timeout: 15000,
  });

  const selectedState = await readOwnerFixtureState(ownerFixtureClient);
  const offeredAssignments = await readVendorAssignmentsForOrder(ownerFixtureClient, selectedState.orderId);
  expect(offeredAssignments).toHaveLength(1);
  const [offeredAssignment] = offeredAssignments;
  const assignmentInvitation = await createDisposableAssignmentInvitationToken(offeredAssignment.id);
  await closeIsolatedPage(page, "owner bid selection");

  page = await newIsolatedPage(browser, "public assignment acceptance");
  console.log(`[amc revision smoke] navigating to public assignment invitation from ${page.url()}`);
  await page.goto(assignmentInvitation.path, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Accept Assignment$/i }).click();
  await expect(page.getByText(/Assignment accepted/i)).toBeVisible({ timeout: 15000 });
  await closeIsolatedPage(page, "public assignment acceptance");

  const vendorClient = await signIn(VENDOR_EMAIL);
  const assignedWork = await readVendorAssignedWork(vendorClient);
  page = await newIsolatedPage(browser, "vendor start work and report submission");
  await logAmcWorkspaceDiagnostics(page, "before vendor login for start work");
  await login(page, VENDOR_EMAIL);
  console.log(`[amc revision smoke] navigating to vendor work item ${assignedWork.assignment_work_key} from ${page.url()}`);
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
  await closeIsolatedPage(page, "vendor start work and report submission");

  return { assignment: submittedAssignment, assignedWork };
}

test.describe("AMC staging revision smoke", () => {
  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({ ownerEmail: OWNER_EMAIL, vendorEmail: VENDOR_EMAIL });
    prepareFixtureIfRequested();
    fixtureState = await assertFixtureExists();
  });

  test("requests a disposable vendor report revision and resubmits", async ({ browser }) => {
    const { assignment, assignedWork } = await progressFixtureToSubmittedReport(browser);

    let page = await newIsolatedPage(browser, "owner revision request");
    await logAmcWorkspaceDiagnostics(page, "before owner login for revision request");
    await login(page, OWNER_EMAIL);
    await logAmcWorkspaceDiagnostics(page, "after owner login before opening smoke order for revision request");
    await openSmokeOrder(page);
    await assertRevisionAmcCheckpoint(page, "after opening smoke order for revision request");
    const submittedOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Submitted/i })
      .first();
    await expect(submittedOwnerAssignment).toBeVisible({ timeout: 15000 });
    await Promise.all([
      page.waitForURL(/\/assignments\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 }),
      submittedOwnerAssignment.getByRole("link", { name: /Open assignment packet/i }).click(),
    ]);

    await assertOwnerAssignmentPacketLoaded(page, "Revision owner assignment packet");
    await assertRevisionAmcCheckpoint(page, "after opening owner assignment packet for revision request");
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
    await closeIsolatedPage(page, "owner revision request");

    page = await newIsolatedPage(browser, "vendor revision resubmission");
    await logAmcWorkspaceDiagnostics(page, "before vendor login for revision resubmission");
    await login(page, VENDOR_EMAIL);
    console.log(`[amc revision smoke] navigating to vendor revision work item ${assignedWork.assignment_work_key} from ${page.url()}`);
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
    await closeIsolatedPage(page, "vendor revision resubmission");

    page = await newIsolatedPage(browser, "owner resubmission review");
    await logAmcWorkspaceDiagnostics(page, "before owner login after revision resubmission");
    await login(page, OWNER_EMAIL);
    await logAmcWorkspaceDiagnostics(page, "after owner login before opening smoke order after revision resubmission");
    await openSmokeOrder(page);
    await assertRevisionAmcCheckpoint(page, "after opening smoke order after revision resubmission");
    const resubmittedOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Submitted/i })
      .first();
    await expect(resubmittedOwnerAssignment).toBeVisible({ timeout: 15000 });
    await Promise.all([
      page.waitForURL(/\/assignments\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 }),
      resubmittedOwnerAssignment.getByRole("link", { name: /Open assignment packet/i }).click(),
    ]);
    await assertOwnerAssignmentPacketLoaded(page, "Resubmitted owner assignment packet");
    await expect(page.getByText(/Resubmitted|resubmission|Revision/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Complete$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Request Revision$/i })).toBeVisible();
    await closeIsolatedPage(page, "owner resubmission review");

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
