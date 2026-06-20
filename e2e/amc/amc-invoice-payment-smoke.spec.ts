import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  assertAmcStagingSmokeTarget,
  ensureAmcWorkspace,
  login as loginWithPassword,
  prepareFixtureIfRequested,
  requiredValue,
  signIn as signInWithPassword,
} from "./helpers/stagingSmoke";

const ORDER_NUMBER = process.env.AMC_STAGING_SMOKE_ORDER_NUMBER || "AMC-STAGING-SMOKE-001";
const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const VENDOR_EMAIL = process.env.AMC_STAGING_SMOKE_VENDOR_EMAIL || "amc.smoke.vendor+staging@example.test";
const VENDOR_NAME = process.env.AMC_STAGING_SMOKE_VENDOR_NAME || "AMC SMOKE - DO NOT USE Vendor";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const REPORT_FIXTURE_FILE_NAME = "amc-smoke-report.pdf";
const REPORT_FIXTURE_PATH = resolve(process.cwd(), "e2e/fixtures", REPORT_FIXTURE_FILE_NAME);
const INVOICE_FIXTURE_FILE_NAME = "amc-smoke-invoice.pdf";
const INVOICE_NUMBER = process.env.AMC_STAGING_SMOKE_INVOICE_NUMBER || "AMC-STAGING-E2E-INV-001";
const INVOICE_AMOUNT = process.env.AMC_STAGING_SMOKE_INVOICE_AMOUNT || "650";
const PAYMENT_REFERENCE = process.env.AMC_STAGING_SMOKE_PAYMENT_REFERENCE || "AMC-STAGING-E2E-SCHEDULED";
const PAYMENT_METHOD = "Staging ACH";

let adminClient = null;
let ownerSession = null;
let vendorSession = null;
let smokeState = null;

async function signIn(email: string) {
  const session = await signInWithPassword(email, PASSWORD);
  if (!session.token) throw new Error(`Smoke fixture login failed for ${email}: missing token`);
  return { client: session.client, token: session.token };
}

async function rpc(client, name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

function assertRpcOk(payload, label) {
  if (!payload || payload.ok !== true) {
    throw new Error(`${label}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function tableSingle(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  if (!data) throw new Error(`${label}: no row found`);
  return data;
}

function findByOrderNumber(items = []) {
  return items.find((item) => item?.order?.order_number === ORDER_NUMBER || item?.order_number === ORDER_NUMBER);
}

async function latestBidResponseForOrder(orderId) {
  const recipients = await tableSingle(
    adminClient
      .from("order_vendor_bid_request_recipients")
      .select("id, bid_request_id, order_vendor_bid_requests!inner(order_id)")
      .eq("order_vendor_bid_requests.order_id", orderId)
      .limit(1)
      .single(),
    "lookup smoke bid recipient",
  );

  return tableSingle(
    adminClient
      .from("order_vendor_bid_responses")
      .select("*")
      .eq("recipient_id", recipients.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "lookup latest smoke bid response",
  );
}

async function uploadPreparedDocument(vendorClient, assignmentWorkKey, fileName, role) {
  const size = statSync(REPORT_FIXTURE_PATH).size;
  const prepared = assertRpcOk(
    await rpc(vendorClient, "rpc_vendor_workspace_prepare_report_document_upload", {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        file_name: fileName,
        mime_type: "application/pdf",
        file_size: size,
        document_role: role,
      },
    }),
    "prepare report upload",
  );

  const { error: uploadError } = await adminClient.storage
    .from(prepared.upload.storage_bucket)
    .upload(prepared.upload.storage_path, readFileSync(REPORT_FIXTURE_PATH), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) throw new Error(`upload report object: ${uploadError.message}`);

  const registered = assertRpcOk(
    await rpc(vendorClient, "rpc_vendor_workspace_register_report_document", {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        document_key: prepared.document.document_key,
        file_name: fileName,
        mime_type: "application/pdf",
        file_size: size,
        document_role: role,
      },
    }),
    "register report document",
  );

  return registered.document.document_key;
}

async function uploadPreparedInvoice(vendorClient, assignmentWorkKey) {
  const size = statSync(REPORT_FIXTURE_PATH).size;
  const prepared = assertRpcOk(
    await rpc(vendorClient, "rpc_vendor_workspace_prepare_invoice_upload", {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        file_name: INVOICE_FIXTURE_FILE_NAME,
        mime_type: "application/pdf",
        file_size: size,
        document_role: "vendor_invoice",
      },
    }),
    "prepare invoice upload",
  );

  const { error: uploadError } = await adminClient.storage
    .from(prepared.upload.storage_bucket)
    .upload(prepared.upload.storage_path, readFileSync(REPORT_FIXTURE_PATH), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) throw new Error(`upload invoice object: ${uploadError.message}`);

  const registered = assertRpcOk(
    await rpc(vendorClient, "rpc_vendor_workspace_register_invoice_document", {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        document_key: prepared.document.document_key,
        file_name: INVOICE_FIXTURE_FILE_NAME,
        mime_type: "application/pdf",
        file_size: size,
        document_role: "vendor_invoice",
      },
    }),
    "register invoice document",
  );

  return registered.document.document_key;
}

async function readVendorAssignmentsForOrder(orderId) {
  const rows = await rpc(ownerSession.client, "rpc_order_company_assignment_list_for_order", {
    p_order_id: orderId,
  });
  return (Array.isArray(rows) ? rows : []).filter((assignment) => assignment?.assignment_type === "vendor_appraisal");
}

async function readSmokeOrder() {
  return tableSingle(
    adminClient.from("orders").select("*").eq("order_number", ORDER_NUMBER).eq("operations_scope", "amc_operations").single(),
    "lookup smoke order",
  );
}

async function readVendorAssignedWork() {
  const assignedOrders = assertRpcOk(await rpc(vendorSession.client, "rpc_vendor_workspace_assigned_orders"), "assigned orders");
  const assigned = findByOrderNumber(assignedOrders.items);
  if (!assigned?.assignment_work_key) {
    throw new Error(`Vendor assigned orders missing ${ORDER_NUMBER}: ${JSON.stringify(assignedOrders)}`);
  }
  return assigned;
}

async function ensureCompletedAssignment() {
  const order = await readSmokeOrder();
  const existingAssignments = await readVendorAssignmentsForOrder(order.id);
  const completed = existingAssignments.find(
    (assignment) => assignment.assigned_company_name === VENDOR_NAME && assignment.status === "completed",
  );
  if (completed?.completed_at) {
    const assigned = await readVendorAssignedWork();
    return { order, assignment: completed, assignmentWorkKey: assigned.assignment_work_key };
  }

  const available = assertRpcOk(await rpc(vendorSession.client, "rpc_vendor_workspace_available_work"), "available work");
  const work = findByOrderNumber(available.items);
  if (!work?.work_key) {
    throw new Error(
      `Smoke fixture is not in a clean available-work state. Refresh with E2E_AMC_PREPARE_FIXTURE=1 before running invoice/payment smoke.`,
    );
  }

  assertRpcOk(
    await rpc(vendorSession.client, "rpc_vendor_workspace_submit_bid_response", {
      p_work_key: work.work_key,
      p_payload: {
        fee_amount: INVOICE_AMOUNT,
        currency: "USD",
        turn_time_days: "5",
        proposed_due_at: new Date(Date.now() + 9 * 86400000).toISOString(),
        comments: "AMC staging invoice/payment smoke disposable bid.",
      },
    }),
    "submit bid",
  );

  const response = await latestBidResponseForOrder(order.id);
  const selected = await rpc(ownerSession.client, "rpc_order_vendor_bid_response_select", { p_response_id: response.id });
  if (!selected?.ok && selected?.status !== "selected" && !selected?.selected_response_id) {
    throw new Error(`Select bid failed: ${JSON.stringify(selected)}`);
  }

  const offer = await rpc(ownerSession.client, "rpc_order_vendor_bid_response_convert_to_assignment_offer", {
    p_response_id: response.id,
    p_payload: {
      instructions: "AMC staging invoice/payment smoke assignment offer.",
      due_at: new Date(Date.now() + 10 * 86400000).toISOString(),
      review_due_at: new Date(Date.now() + 11 * 86400000).toISOString(),
    },
  });
  if (!offer?.assignment_id) throw new Error(`Create assignment offer failed: ${JSON.stringify(offer)}`);

  const invitation = await rpc(ownerSession.client, "rpc_order_company_assignment_invitation_create", {
    p_assignment_id: offer.assignment_id,
    p_payload: {
      sent_to_email: VENDOR_EMAIL,
      metadata: { playwright_amc_staging_invoice_payment_smoke: true, no_email_delivery: true },
    },
  });
  if (!invitation?.token) throw new Error(`Assignment invitation missing token: ${JSON.stringify(invitation)}`);

  assertRpcOk(
    await rpc(vendorSession.client, "rpc_order_company_assignment_invitation_respond", {
      p_token: invitation.token,
      p_action: "accept",
      p_reason: null,
    }),
    "accept assignment",
  );

  const assigned = await readVendorAssignedWork();
  assertRpcOk(
    await rpc(vendorSession.client, "rpc_vendor_workspace_start_assigned_order", {
      p_assignment_work_key: assigned.assignment_work_key,
    }),
    "start work",
  );

  const reportKey = await uploadPreparedDocument(vendorSession.client, assigned.assignment_work_key, REPORT_FIXTURE_FILE_NAME, "submitted_report");
  assertRpcOk(
    await rpc(vendorSession.client, "rpc_vendor_workspace_submit_report", {
      p_assignment_work_key: assigned.assignment_work_key,
      p_payload: {
        comments: "AMC staging invoice/payment smoke report submission.",
        document_keys: [reportKey],
      },
    }),
    "submit report",
  );

  const completedResult = await rpc(ownerSession.client, "rpc_order_company_assignment_complete", {
    p_assignment_id: offer.assignment_id,
    p_completion_note: "AMC staging invoice/payment smoke completion.",
  });
  if (!completedResult?.ok && completedResult?.status !== "completed" && completedResult !== offer.assignment_id) {
    throw new Error(`Complete assignment failed: ${JSON.stringify(completedResult)}`);
  }

  const assignments = await readVendorAssignmentsForOrder(order.id);
  const assignment = assignments.find((row) => row.id === offer.assignment_id);
  if (!assignment?.completed_at) throw new Error("Smoke assignment did not reach completed state.");
  return { order, assignment, assignmentWorkKey: assigned.assignment_work_key };
}

async function readVendorPaymentItem(assignmentWorkKey) {
  const payments = assertRpcOk(await rpc(vendorSession.client, "rpc_vendor_workspace_payments"), "vendor payments");
  return (payments.items || []).find((item) => item.assignment_work_key === assignmentWorkKey);
}

async function readOwnerInvoice(invoiceStatus, assignmentWorkKey = smokeState?.assignmentWorkKey) {
  const queue = await readOwnerInvoiceQueue(invoiceStatus);
  return queue.find((item) => item.assignment_work_key === assignmentWorkKey);
}

async function readOwnerInvoiceQueue(invoiceStatus) {
  const queue = assertRpcOk(
    await rpc(ownerSession.client, "rpc_amc_vendor_invoices", { p_status: invoiceStatus }),
    `invoice queue ${invoiceStatus}`,
  );
  return queue.items || [];
}

async function readOwnerPayment(status, assignmentWorkKey = smokeState?.assignmentWorkKey) {
  const ledger = await readOwnerPaymentLedger(status);
  return ledger.find((item) => item.assignment_work_key === assignmentWorkKey);
}

async function readOwnerPaymentLedger(status) {
  const ledger = assertRpcOk(
    await rpc(ownerSession.client, "rpc_amc_vendor_payment_ledger", { p_status: status }),
    `payment ledger ${status}`,
  );
  return ledger.items || [];
}

function logInvoicePaymentDiagnostics(label, details) {
  console.log(`[AMC invoice/payment diagnostics] ${label}: ${JSON.stringify(details)}`);
}

async function readRawInvoicePaymentDiagnostics(assignmentId) {
  if (!assignmentId) return { assignmentId: null, error: "missing_assignment_id" };

  const { data: assignment, error: assignmentError } = await adminClient
    .from("order_company_assignments")
    .select("id, status, submitted_at, completed_at, submission_payload")
    .eq("id", assignmentId)
    .maybeSingle();
  const { data: ledgerRows, error: ledgerError } = await adminClient
    .from("amc_vendor_payment_ledger")
    .select("id, status, invoice_key, scheduled_payment_date, paid_at, payment_method_label, reference_label")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });

  return {
    assignmentId,
    assignmentError: assignmentError?.message || null,
    ledgerError: ledgerError?.message || null,
    assignmentStatus: assignment?.status || null,
    assignmentSubmittedAt: assignment?.submitted_at || null,
    assignmentCompletedAt: assignment?.completed_at || null,
    invoiceStatus: assignment?.submission_payload?.invoice?.status || null,
    paymentStatus: assignment?.submission_payload?.payment?.status || null,
    physicalLedgerRows: (ledgerRows || []).map((row) => ({
      id: row.id,
      status: row.status,
      hasInvoiceKey: Boolean(row.invoice_key),
      scheduledPaymentDate: row.scheduled_payment_date,
      paidAt: row.paid_at,
      paymentMethodLabel: row.payment_method_label,
      referenceLabel: row.reference_label,
    })),
  };
}

async function ensureInvoicePaymentReady(assignmentWorkKey, assignmentId) {
  if (!assignmentWorkKey) throw new Error("Invoice/payment smoke requires an assignment work key.");

  let vendorPayment = await readVendorPaymentItem(assignmentWorkKey);
  if (!vendorPayment) throw new Error("Vendor Payments did not expose the completed assignment.");
  if (vendorPayment.payment_status_key === "paid") {
    throw new Error("Smoke payment is already paid. Refresh disposable staging fixtures before this payment-ready smoke.");
  }

  if (vendorPayment.payment_status_key === "ready_for_invoice") {
    const invoiceDocKey = await uploadPreparedInvoice(vendorSession.client, assignmentWorkKey);
    const submitted = assertRpcOk(
      await rpc(vendorSession.client, "rpc_vendor_workspace_submit_invoice", {
        p_assignment_work_key: assignmentWorkKey,
        p_payload: {
          invoice_number: INVOICE_NUMBER,
          invoice_amount: INVOICE_AMOUNT,
          currency: "USD",
          invoice_date: new Date().toISOString().slice(0, 10),
          vendor_note: "AMC staging invoice/payment smoke disposable invoice.",
          document_keys: [invoiceDocKey],
        },
      }),
      "submit invoice",
    );
    if (submitted.invoice?.invoice_number !== INVOICE_NUMBER) {
      throw new Error(`Submitted invoice number mismatch: ${JSON.stringify(submitted)}`);
    }
    vendorPayment = await readVendorPaymentItem(assignmentWorkKey);
  }

  if (vendorPayment.payment_status_key === "invoice_received") {
    const invoiceRow = await readOwnerInvoice("invoice_received", assignmentWorkKey);
    if (!invoiceRow?.invoice_key) throw new Error("Owner invoice queue missing submitted smoke invoice.");
    const approval = assertRpcOk(
      await rpc(ownerSession.client, "rpc_amc_review_vendor_invoice", {
        p_invoice_key: invoiceRow.invoice_key,
        p_payload: {
          decision: "approve",
          reviewer_note: "AMC staging invoice/payment smoke internal approval.",
          vendor_message: "Invoice approved for staging smoke.",
          approved_amount: INVOICE_AMOUNT,
        },
      }),
      "approve invoice",
    );
    logInvoicePaymentDiagnostics("invoice approval result", {
      assignmentWorkKey,
      invoiceKey: invoiceRow.invoice_key,
      invoiceStatus: approval.invoice?.invoice_status || null,
      approvedAmount: approval.invoice?.approved_amount || null,
    });
    vendorPayment = await readVendorPaymentItem(assignmentWorkKey);
  }

  if (vendorPayment.payment_status_key === "approved") {
    const approvedLedger = await readOwnerPaymentLedger("approved");
    const approvedPayment = approvedLedger.find((item) => item.assignment_work_key === assignmentWorkKey);
    if (!approvedPayment?.invoice_key) {
      const approvedInvoice = await readOwnerInvoice("approved", assignmentWorkKey);
      const latestVendorPayment = await readVendorPaymentItem(assignmentWorkKey);
      logInvoicePaymentDiagnostics("approved ledger missing fixture assignment", {
        assignmentWorkKey,
        rawState: await readRawInvoicePaymentDiagnostics(assignmentId),
        vendorPaymentStatus: latestVendorPayment?.payment_status_key || null,
        approvedInvoicePresent: Boolean(approvedInvoice?.invoice_key),
        approvedInvoiceStatus: approvedInvoice?.invoice_status || null,
        approvedLedgerCount: approvedLedger.length,
        approvedLedgerAssignmentKeys: approvedLedger.map((item) => item.assignment_work_key).slice(0, 10),
      });
      throw new Error("Owner payment ledger missing approved smoke invoice.");
    }
    const scheduled = assertRpcOk(
      await rpc(ownerSession.client, "rpc_amc_schedule_vendor_payment", {
        p_invoice_key: approvedPayment.invoice_key,
        p_payload: {
          scheduled_payment_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          payment_method_label: PAYMENT_METHOD,
          reference_label: PAYMENT_REFERENCE,
          internal_note: "AMC staging invoice/payment smoke scheduled payment. No external processor.",
          vendor_payment_note: "Payment scheduled for staging smoke. No bank transfer is initiated.",
        },
      }),
      "schedule payment",
    );
    if (!scheduled.payment_key) throw new Error(`Scheduled payment missing key: ${JSON.stringify(scheduled)}`);
    vendorPayment = await readVendorPaymentItem(assignmentWorkKey);
  }

  if (vendorPayment.payment_status_key !== "scheduled") {
    throw new Error(`Expected scheduled payment-ready state, got ${vendorPayment.payment_status_key || "(unknown)"}.`);
  }

  const scheduledPayment = await readOwnerPayment("scheduled", assignmentWorkKey);
  if (!scheduledPayment?.payment_key) throw new Error("Owner payment ledger missing scheduled smoke payment.");
  if (scheduledPayment.paid_at || scheduledPayment.payment_status === "paid") {
    throw new Error("Smoke payment unexpectedly reached paid state.");
  }

  return { vendorPayment, scheduledPayment };
}

async function login(page, email: string) {
  await loginWithPassword(page, email, PASSWORD);
}

async function openSmokeOrder(page) {
  await ensureAmcWorkspace(page);
  await page.goto(`/orders?q=${encodeURIComponent(ORDER_NUMBER)}`, { waitUntil: "networkidle" });
  await expect(page.getByText(ORDER_NUMBER).first()).toBeVisible({ timeout: 15000 });
  await page.getByText(ORDER_NUMBER).first().click();

  await expect(page.getByText(/Falcon AMC procurement record scoped/i)).toBeVisible({ timeout: 15000 });
}

async function blockExternalPaymentProviders(page) {
  const blockedCalls = [];
  await page.route(/stripe|paypal|adyen|square|braintree|checkout\.com|authorize\.net/i, async (route) => {
    blockedCalls.push(route.request().url());
    await route.abort("blockedbyclient");
  });
  return blockedCalls;
}

test.describe("AMC staging invoice/payment visibility smoke", () => {
  test.beforeAll(async () => {
    assertAmcStagingSmokeTarget({
      ownerEmail: OWNER_EMAIL,
      vendorEmail: VENDOR_EMAIL,
      paymentSafe: true,
      smokeLabel: "AMC staging invoice/payment smoke",
    });
    statSync(REPORT_FIXTURE_PATH);
    prepareFixtureIfRequested();

    adminClient = createClient(requiredValue("AMC_STAGING_SUPABASE_URL"), requiredValue("AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    ownerSession = await signIn(OWNER_EMAIL);
    vendorSession = await signIn(VENDOR_EMAIL);

    const completed = await ensureCompletedAssignment();
    smokeState = {
      ...completed,
      ...(await ensureInvoicePaymentReady(completed.assignmentWorkKey, completed.assignment?.id)),
    };
  });

  test("shows scheduled disposable invoice/payment state without using payment rails", async ({ page }) => {
    const blockedPaymentCalls = await blockExternalPaymentProviders(page);

    await login(page, OWNER_EMAIL);
    await openSmokeOrder(page);
    const completedOwnerAssignment = page
      .getByRole("article")
      .filter({ hasText: VENDOR_NAME })
      .filter({ hasText: /Completed/i })
      .first();
    await expect(completedOwnerAssignment).toBeVisible({ timeout: 15000 });
    await expect(completedOwnerAssignment.getByText(/Completed/i).first()).toBeVisible();

    await ensureAmcWorkspace(page);
    await page.goto("/vendors", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Vendor Directory/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/Vendor invoice review queue/i)).toContainText(/Vendor Invoice Review/i);
    await expect(page.getByLabel(/Vendor payment ledger queue/i)).toContainText(/No bank transfer is initiated/i);

    await page.getByLabel(/^Payment status$/i).selectOption("scheduled");
    await expect(page.getByLabel(/Vendor payment ledger queue/i)).toContainText(VENDOR_NAME, { timeout: 15000 });
    await expect(page.getByLabel(/Vendor payment ledger queue/i)).toContainText(INVOICE_NUMBER);
    await expect(page.getByLabel(/Vendor payment ledger queue/i)).toContainText(PAYMENT_REFERENCE);
    await expect(page.getByLabel(/Vendor payment ledger queue/i)).toContainText(/Scheduled/i);
    await expect(page.getByRole("button", { name: /^Mark Paid$/i })).toBeVisible();

    await login(page, VENDOR_EMAIL);
    await page.goto("/vendor-workspace/payments", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /^Payments$/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(ORDER_NUMBER)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Scheduled/i).first()).toBeVisible();
    await expect(page.getByText(INVOICE_NUMBER)).toBeVisible();
    await expect(page.getByText(PAYMENT_REFERENCE)).toBeVisible();
    await expect(page.getByText(/No bank transfer is initiated/i)).toBeVisible();

    const assignments = await readVendorAssignmentsForOrder(smokeState.order.id);
    const assignment = assignments.find((row) => row.id === smokeState.assignment.id);
    expect(assignment).toMatchObject({
      status: "completed",
      assigned_company_name: VENDOR_NAME,
    });
    expect(assignment.completed_at).toBeTruthy();
    expect(smokeState.vendorPayment.payment_status_key).toBe("scheduled");
    expect(smokeState.scheduledPayment.payment_status).toBe("scheduled");
    expect(smokeState.scheduledPayment.payment_key).toBeTruthy();
    expect(smokeState.scheduledPayment.paid_at || null).toBeNull();
    expect(blockedPaymentCalls).toEqual([]);
  });
});
