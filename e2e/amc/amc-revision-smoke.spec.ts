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
let vendorFixtureClient = null;

async function signIn(email: string) {
  return (await signInWithPassword(email, PASSWORD)).client;
}

async function getVendorFixtureClient() {
  if (!vendorFixtureClient) {
    vendorFixtureClient = await signIn(VENDOR_EMAIL);
  }
  return vendorFixtureClient;
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

async function visibleHeadingDiagnostics(page) {
  if (!page) return [];
  return page
    .getByRole("heading")
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => {
          const style = window.getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
        })
        .map((node) => node.textContent?.replace(/\s+/g, " ").trim() || "")
        .filter(Boolean),
    )
    .catch((error) => [`<headings unavailable: ${error?.message || error}>`]);
}

async function readRevisionStatusDiagnostics(assignmentWorkKey = null) {
  const diagnostics = {
    assignmentStatus: [] as unknown[],
    vendorStatus: null as unknown,
    revisionRequestStatus: [] as unknown[],
  };

  try {
    if (ownerFixtureClient && fixtureState?.orderId) {
      const assignments = await readVendorAssignmentsForOrder(ownerFixtureClient, fixtureState.orderId);
      diagnostics.assignmentStatus = assignments.map((assignment) => ({
        id: assignment.id,
        status: assignment.status || null,
        assigned_company_name: assignment.assigned_company_name || null,
        accepted_at: assignment.accepted_at || null,
        started_at: assignment.started_at || null,
        submitted_at: assignment.submitted_at || null,
        revision_requested_at: assignment.revision_requested_at || null,
        completed_at: assignment.completed_at || null,
      }));
      diagnostics.revisionRequestStatus = assignments.map((assignment) => ({
        id: assignment.id,
        status: assignment.status || null,
        revision_requested_at: assignment.revision_requested_at || null,
        revision_payload_present: Boolean(assignment.submission_payload?.revision),
        resubmission_payload_present: Boolean(assignment.submission_payload?.resubmission),
        completed_at: assignment.completed_at || null,
      }));
    }
  } catch (error) {
    diagnostics.assignmentStatus = [`<assignment status unavailable: ${error?.message || error}>`];
    diagnostics.revisionRequestStatus = [`<revision status unavailable: ${error?.message || error}>`];
  }

  try {
    const vendorClient = await getVendorFixtureClient();
    const assignedWork = await readVendorAssignedWork(vendorClient);
    diagnostics.vendorStatus = {
      assignment_work_key: assignedWork.assignment_work_key || null,
      matches_expected_key: assignmentWorkKey ? assignedWork.assignment_work_key === assignmentWorkKey : null,
      assignment_status: assignedWork.assignment_status || null,
      status_label: assignedWork.status_label || null,
      next_action_label: assignedWork.next_action_label || null,
      payment_status_key: assignedWork.payment_status_key || null,
    };
  } catch (error) {
    diagnostics.vendorStatus = `<vendor status unavailable: ${error?.message || error}>`;
  }

  return diagnostics;
}

async function logRevisionStep(page, label, { assignmentWorkKey = null } = {}) {
  const diagnostics = await readRevisionStatusDiagnostics(assignmentWorkKey);
  console.log(
    `[amc revision smoke] ${label}: ${JSON.stringify({
      url: page?.url?.() || "(no page)",
      headings: await visibleHeadingDiagnostics(page),
      ...diagnostics,
    })}`,
  );
}

async function expectRevisionVisible(page, locator, label, options = {}) {
  await logRevisionStep(page, `before wait: ${label}`, options);
  try {
    await expect(locator).toBeVisible({ timeout: options.timeout || 15000 });
    await logRevisionStep(page, `after wait: ${label}`, options);
  } catch (error) {
    await logRevisionStep(page, `timeout waiting: ${label}`, options);
    throw error;
  }
}

async function expectRevisionText(page, locator, text, label, options = {}) {
  await logRevisionStep(page, `before wait: ${label}`, options);
  try {
    await expect(locator).toContainText(text, { timeout: options.timeout || 15000 });
    await logRevisionStep(page, `after wait: ${label}`, options);
  } catch (error) {
    await logRevisionStep(page, `timeout waiting: ${label}`, options);
    throw error;
  }
}

async function runRevisionStep(page, label, action, options = {}) {
  const startedAt = new Date().toISOString();
  console.log(`[amc revision smoke] step start ${startedAt}: ${label}`);
  await logRevisionStep(page, `before step: ${label}`, options);
  try {
    const result = await action();
    const endedAt = new Date().toISOString();
    console.log(`[amc revision smoke] step end ${endedAt}: ${label}`);
    await logRevisionStep(page, `after step: ${label}`, options);
    return result;
  } catch (error) {
    const failedAt = new Date().toISOString();
    console.log(`[amc revision smoke] step failed ${failedAt}: ${label}: ${error?.message || error}`);
    await logRevisionStep(page, `failed step: ${label}`, options);
    throw error;
  }
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
  const bidInvitation = await runRevisionStep(page, "create public bid invitation token", () =>
    createDisposableBidInvitationToken(),
  );
  console.log(`[amc revision smoke] navigating to public bid invitation from ${page.url()}`);
  await runRevisionStep(page, "open public bid invitation", () => page.goto(bidInvitation.path, { waitUntil: "networkidle" }));
  await runRevisionStep(page, "fill public bid amount", () => page.getByLabel(/Fee amount/i).fill(BID_AMOUNT));
  await runRevisionStep(page, "fill public bid turn time", () => page.getByLabel(/Turn time days/i).fill(BID_TURN_TIME_DAYS));
  await runRevisionStep(page, "fill public bid comments", () => page.getByLabel(/Comments/i).fill(BID_COMMENTS));
  await runRevisionStep(page, "fill public bid contact email", () => page.getByLabel(/Contact email/i).fill(VENDOR_EMAIL));
  await runRevisionStep(page, "public bid submit", () => page.getByRole("button", { name: /^Submit Bid$/i }).click());
  await runRevisionStep(page, "wait for public bid submission success", () =>
    expect(page.getByText(/Your bid has been submitted/i)).toBeVisible({ timeout: 15000 }),
  );
  await runRevisionStep(page, "close public bid submission page", () => closeIsolatedPage(page, "public bid submission"));

  page = await newIsolatedPage(browser, "owner bid selection");
  await runRevisionStep(page, "owner login for bid selection", () => login(page, OWNER_EMAIL));
  await runRevisionStep(page, "open smoke order for bid selection", () => openSmokeOrder(page));
  await runRevisionStep(page, "assert AMC checkpoint after opening smoke order for bid selection", () =>
    assertRevisionAmcCheckpoint(page, "after opening smoke order for bid selection"),
  );
  await runRevisionStep(page, "wait for received bid before selection", () =>
    expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bids received|1 contacted \/ 1 responded/i, {
      timeout: 15000,
    }),
  );
  await runRevisionStep(page, "open procurement details for bid selection", () => openProcurementDetails(page));
  await runRevisionStep(page, "assert AMC checkpoint after opening procurement details for bid selection", () =>
    assertRevisionAmcCheckpoint(page, "after opening procurement details for bid selection"),
  );
  const procurementSection = page.getByLabel(/^Bid requests$/i);
  await runRevisionStep(page, "wait for bid requests section before bid selection", () =>
    expect(procurementSection).toBeVisible({ timeout: 15000 }),
  );

  await runRevisionStep(page, "log bid selection button diagnostics", () =>
    visibleButtonDiagnostics(page, "before bid selection", procurementSection),
  );
  const selectBidButton = await runRevisionStep(page, "find Select bid action", () =>
    expectCurrentActionButton(
      page,
      procurementSection.getByRole("button", {
        name: new RegExp(`^Select bid(?: for ${escapeRegExp(VENDOR_NAME)})?$`, "i"),
      }),
      "Select bid",
      procurementSection,
    ),
  );
  await runRevisionStep(page, "click Select bid", () => selectBidButton.click());
  await runRevisionStep(page, "confirm selected bid", () =>
    page.getByRole("dialog", { name: /Select bid/i }).getByRole("button", { name: /Confirm selection/i }).click(),
  );
  await runRevisionStep(page, "wait for bid selected status", async () => {
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Bid selected/i, { timeout: 15000 });
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(VENDOR_NAME);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(/Accepted Fee/i);
    await expect(page.getByLabel(/AMC bid status/i)).toContainText(BID_AMOUNT_PATTERN);
  });

  await runRevisionStep(page, "log assignment offer button diagnostics", () =>
    visibleButtonDiagnostics(page, "before assignment offer creation", procurementSection),
  );
  const createOfferButton = await runRevisionStep(page, "find Create Assignment Offer action", () =>
    expectCurrentActionButton(
      page,
      procurementSection.getByRole("button", { name: /Create Assignment Offer/i }),
      "Create Assignment Offer",
      procurementSection,
    ),
  );
  await runRevisionStep(page, "create assignment offer", () => createOfferButton.click());
  await runRevisionStep(page, "wait for assignment offered order state", async () => {
    const bidStatus = page.getByLabel(/AMC bid status/i);
    await expect(bidStatus).toContainText(/Assignment offered/i, { timeout: 15000 });
    await expect(bidStatus).toContainText(/Offered/i);
    await expect(page.getByRole("link", { name: /Open assignment packet|Open Packet/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  const selectedState = await runRevisionStep(page, "read owner fixture state after bid selection", () =>
    readOwnerFixtureState(ownerFixtureClient),
  );
  const offeredAssignments = await runRevisionStep(page, "read offered vendor assignments", () =>
    readVendorAssignmentsForOrder(ownerFixtureClient, selectedState.orderId),
  );
  await runRevisionStep(page, "assert one offered assignment", async () => {
    expect(offeredAssignments).toHaveLength(1);
  });
  const [offeredAssignment] = offeredAssignments;
  const assignmentInvitation = await runRevisionStep(page, "create assignment invitation token", () =>
    createDisposableAssignmentInvitationToken(offeredAssignment.id),
  );
  await runRevisionStep(page, "close owner bid selection page", () => closeIsolatedPage(page, "owner bid selection"));

  page = await newIsolatedPage(browser, "public assignment acceptance");
  console.log(`[amc revision smoke] navigating to public assignment invitation from ${page.url()}`);
  await runRevisionStep(page, "open public assignment invitation", () =>
    page.goto(assignmentInvitation.path, { waitUntil: "networkidle" }),
  );
  await runRevisionStep(page, "accept assignment", () => page.getByRole("button", { name: /^Accept Assignment$/i }).click());
  await runRevisionStep(page, "wait for assignment accepted", () =>
    expect(page.getByText(/Assignment accepted/i)).toBeVisible({ timeout: 15000 }),
  );
  await runRevisionStep(page, "close public assignment acceptance page", () =>
    closeIsolatedPage(page, "public assignment acceptance"),
  );

  const vendorClient = await runRevisionStep(null, "get cached vendor fixture client", () => getVendorFixtureClient());
  const assignedWork = await runRevisionStep(null, "read vendor assigned work", () => readVendorAssignedWork(vendorClient));
  await logRevisionStep(null, "after reading vendor assigned work before start work", {
    assignmentWorkKey: assignedWork.assignment_work_key,
  });
  page = await newIsolatedPage(browser, "vendor start work and report submission");
  await runRevisionStep(page, "vendor login for start work", () => login(page, VENDOR_EMAIL), {
    assignmentWorkKey: assignedWork.assignment_work_key,
  });
  console.log(`[amc revision smoke] navigating to vendor work item ${assignedWork.assignment_work_key} from ${page.url()}`);
  await runRevisionStep(
    page,
    "open assigned work item",
    () =>
      page.goto(`/vendor-workspace/assigned-orders/${encodeURIComponent(assignedWork.assignment_work_key)}`, {
        waitUntil: "domcontentloaded",
      }),
    { assignmentWorkKey: assignedWork.assignment_work_key },
  );
  await runRevisionStep(
    page,
    "wait for assigned-order page signal",
    async () => {
      await expect(page).toHaveURL(/\/vendor-workspace\/assigned-orders\/[^/?#]+(?:[?#].*)?$/, { timeout: 15000 });
      await expect(page.getByText(ORDER_NUMBER).first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: /^Start Work$/i })).toBeVisible({ timeout: 15000 });
    },
    { assignmentWorkKey: assignedWork.assignment_work_key },
  );
  await logRevisionStep(page, "after assigned-order page signal before start work", {
    assignmentWorkKey: assignedWork.assignment_work_key,
  });
  await runRevisionStep(page, "click Start Work", () => page.getByRole("button", { name: /^Start Work$/i }).click(), {
    assignmentWorkKey: assignedWork.assignment_work_key,
  });
  await runRevisionStep(
    page,
    "wait for Work started",
    () => expect(page.getByText(/Work started/i)).toBeVisible({ timeout: 15000 }),
    { assignmentWorkKey: assignedWork.assignment_work_key },
  );
  await runRevisionStep(page, "set Report PDF", () => page.getByLabel(/^Report PDF$/i).setInputFiles(REPORT_FIXTURE_PATH), {
    assignmentWorkKey: assignedWork.assignment_work_key,
  });
  await runRevisionStep(
    page,
    "upload report",
    () => page.getByRole("button", { name: /^Upload Report File$/i }).click(),
    { assignmentWorkKey: assignedWork.assignment_work_key },
  );
  await runRevisionStep(
    page,
    "wait for uploaded report filename",
    () => expect(page.getByText(REPORT_FIXTURE_FILE_NAME).first()).toBeVisible({ timeout: 30000 }),
    { assignmentWorkKey: assignedWork.assignment_work_key },
  );
  await runRevisionStep(page, "fill Delivery Note", () => page.getByLabel(/^Delivery Note$/i).fill(REPORT_DELIVERY_NOTE), {
    assignmentWorkKey: assignedWork.assignment_work_key,
  });
  await runRevisionStep(
    page,
    "submit report",
    () => page.getByRole("button", { name: /^Submit Report$/i }).click(),
    { assignmentWorkKey: assignedWork.assignment_work_key },
  );
  await runRevisionStep(
    page,
    "wait for Submitted Report document visibility",
    () => expect(page.getByText(/Submitted Report/i).first()).toBeVisible({ timeout: 30000 }),
    { assignmentWorkKey: assignedWork.assignment_work_key },
  );

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
    test.setTimeout(120_000);

    await logRevisionStep(null, "before progressFixtureToSubmittedReport");
    const { assignment, assignedWork } = await progressFixtureToSubmittedReport(browser);
    await logRevisionStep(null, "after progressFixtureToSubmittedReport", {
      assignmentWorkKey: assignedWork.assignment_work_key,
    });

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
    await expectRevisionVisible(page, submittedOwnerAssignment, "submitted owner assignment card before revision request", {
      assignmentWorkKey: assignedWork.assignment_work_key,
    });
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
