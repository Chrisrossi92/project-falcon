import { readFileSync, statSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { amcSmokeArtifactPath } from "./lib/amc-smoke-artifacts.mjs";

const STAGING_REF = "voompccpkjfcsmehdoqu";
const PRODUCTION_PROJECT_REFS = new Set(
  (process.env.AMC_PRODUCTION_PROJECT_REFS || "okwqhkrsjgxrhyisaovc")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const stagingRef = process.env.AMC_STAGING_PROJECT_REF || "";
const supabaseUrl = process.env.AMC_STAGING_SUPABASE_URL || "";
const serviceRoleKey = process.env.AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.AMC_STAGING_SUPABASE_ANON_KEY || "";

const PASSWORD = "FalconSmoke123!";
const OWNER_EMAIL = "amc.smoke.owner+staging@example.test";
const VENDOR_EMAIL = "amc.smoke.vendor+staging@example.test";
const ORDER_NUMBER = "AMC-STAGING-SMOKE-001";
const REPORT_PATH = amcSmokeArtifactPath("amc-staging-smoke-report.pdf");
const INVOICE_PATH = amcSmokeArtifactPath("amc-staging-smoke-invoice.pdf");

const results = [];
const defects = [];

function projectRefFromUrl(url) {
  try {
    return new URL(url).host.split(".")[0] || "";
  } catch {
    return "";
  }
}

function assertStagingTarget() {
  const actualRef = projectRefFromUrl(supabaseUrl);
  if (!stagingRef || !supabaseUrl || !serviceRoleKey || !anonKey) {
    throw new Error("Missing AMC_STAGING_PROJECT_REF, AMC_STAGING_SUPABASE_URL, AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY, or AMC_STAGING_SUPABASE_ANON_KEY.");
  }
  if (stagingRef !== STAGING_REF || actualRef !== STAGING_REF) {
    throw new Error(`Refusing smoke: expected staging ref ${STAGING_REF}, got env ref ${stagingRef} and URL ref ${actualRef}.`);
  }
  if (PRODUCTION_PROJECT_REFS.has(actualRef)) {
    throw new Error(`Refusing smoke: ${actualRef} is listed as a production project ref.`);
  }
}

function mark(step, status, notes = "") {
  results.push({ step, status, notes });
  console.log(`${status} ${step}${notes ? ` - ${notes}` : ""}`);
}

function fail(step, error) {
  const message = error?.message || String(error);
  mark(step, "FAIL", message);
  defects.push({ step, message, body: error?.body || null });
  throw error;
}

function assertRpcOk(payload, label) {
  if (!payload || payload.ok !== true) {
    throw new Error(`${label}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function signIn(email) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session?.access_token) {
    throw new Error(`Sign in failed for ${email}: ${error?.message || "missing token"}`);
  }
  return { client, token: data.session.access_token };
}

async function rpc(client, name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const wrapped = new Error(`${name}: ${error.message}`);
    wrapped.body = error;
    throw wrapped;
  }
  return data;
}

async function tableSingle(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  if (!data) throw new Error(`${label}: no row found`);
  return data;
}

async function tableMaybe(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

function findByOrderNumber(items = []) {
  return items.find((item) => item?.order?.order_number === ORDER_NUMBER || item?.order_number === ORDER_NUMBER);
}

async function edgeFunction(name, token, body) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const error = new Error(`${name}: ${json?.message || json?.error || text || `HTTP ${response.status}`}`);
    error.body = json;
    throw error;
  }
  return json;
}

async function uploadPreparedDocument(admin, vendorClient, assignmentWorkKey, filePath, fileName, role) {
  const size = statSync(filePath).size;
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

  const { error: uploadError } = await admin.storage
    .from(prepared.upload.storage_bucket)
    .upload(prepared.upload.storage_path, readFileSync(filePath), {
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

async function uploadPreparedInvoice(admin, vendorClient, assignmentWorkKey, filePath, fileName) {
  const size = statSync(filePath).size;
  const prepared = assertRpcOk(
    await rpc(vendorClient, "rpc_vendor_workspace_prepare_invoice_upload", {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        file_name: fileName,
        mime_type: "application/pdf",
        file_size: size,
        document_role: "vendor_invoice",
      },
    }),
    "prepare invoice upload",
  );

  const { error: uploadError } = await admin.storage
    .from(prepared.upload.storage_bucket)
    .upload(prepared.upload.storage_path, readFileSync(filePath), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) throw new Error(`upload invoice object: ${uploadError.message}`);

  const registered = assertRpcOk(
    await rpc(vendorClient, "rpc_vendor_workspace_register_invoice_document", {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        document_key: prepared.document.document_key,
        file_name: fileName,
        mime_type: "application/pdf",
        file_size: size,
        document_role: "vendor_invoice",
      },
    }),
    "register invoice document",
  );

  return registered.document.document_key;
}

async function latestBidResponseForOrder(admin, orderId) {
  const recipients = await tableMaybe(
    admin
      .from("order_vendor_bid_request_recipients")
      .select("id, bid_request_id, order_vendor_bid_requests!inner(order_id)")
      .eq("order_vendor_bid_requests.order_id", orderId),
    "lookup bid recipients",
  );
  const recipientIds = (recipients || []).map((row) => row.id);
  if (recipientIds.length === 0) throw new Error("No bid recipients found for smoke order.");

  return tableSingle(
    admin
      .from("order_vendor_bid_responses")
      .select("*")
      .in("recipient_id", recipientIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "lookup latest bid response",
  );
}

async function main() {
  assertStagingTarget();
  statSync(REPORT_PATH);
  statSync(INVOICE_PATH);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const owner = await signIn(OWNER_EMAIL);
  mark("Auth: owner login", "PASS", OWNER_EMAIL);
  const vendor = await signIn(VENDOR_EMAIL);
  mark("Auth: vendor login", "PASS", VENDOR_EMAIL);

  try {
    const order = await tableSingle(
      admin.from("orders").select("*").eq("order_number", ORDER_NUMBER).eq("operations_scope", "amc_operations").single(),
      "lookup smoke order",
    );
    mark("1. Owner confirms AMC order", "PASS", ORDER_NUMBER);

    const candidates = await rpc(owner.client, "rpc_vendor_assignment_candidates", { p_order_id: order.id });
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error(`Candidate matching returned no rows: ${JSON.stringify(candidates)}`);
    }
    mark("2. Candidate matching returns smoke vendor", "PASS", `${candidates.length} candidate(s)`);

    const available = assertRpcOk(await rpc(vendor.client, "rpc_vendor_workspace_available_work"), "available work");
    const work = findByOrderNumber(available.items);
    if (!work?.work_key) throw new Error(`Available Work missing ${ORDER_NUMBER}: ${JSON.stringify(available)}`);
    mark("3. Vendor sees Available Work", "PASS", work.work_key);

    const detail = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_available_work_detail", { p_work_key: work.work_key }),
      "work detail",
    );
    const document = detail.item?.documents?.[0];
    if (!document?.document_key) throw new Error(`Work Detail missing vendor document: ${JSON.stringify(detail)}`);
    mark("4. Vendor opens Work Detail", "PASS", `${detail.item?.documents?.length || 0} document(s)`);

    const docOpen = assertRpcOk(
      await edgeFunction("vendor-workspace-document-download-url", vendor.token, {
        work_key: work.work_key,
        document_key: document.document_key,
      }),
      "document open",
    );
    if (!docOpen.signed_url) throw new Error(`Document open returned no signed URL: ${JSON.stringify(docOpen)}`);
    mark("5. Vendor opens authorized document", "PASS");

    const bid = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_submit_bid_response", {
        p_work_key: work.work_key,
        p_payload: {
          fee_amount: "650",
          currency: "USD",
          turn_time_days: "5",
          proposed_due_at: new Date(Date.now() + 9 * 86400000).toISOString(),
          comments: "AMC-13F staging happy path bid.",
        },
      }),
      "submit bid",
    );
    mark("6. Vendor submits bid", "PASS", bid.status || "submitted");

    const response = await latestBidResponseForOrder(admin, order.id);
    const selected = await rpc(owner.client, "rpc_order_vendor_bid_response_select", { p_response_id: response.id });
    if (!selected?.ok && selected?.status !== "selected" && !selected?.selected_response_id) {
      throw new Error(`Select bid failed: ${JSON.stringify(selected)}`);
    }
    mark("7. Owner selects bid", "PASS", response.id);

    const offer = await rpc(owner.client, "rpc_order_vendor_bid_response_convert_to_assignment_offer", {
      p_response_id: response.id,
      p_payload: {
        instructions: "AMC-13F staging happy path assignment offer.",
        due_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        review_due_at: new Date(Date.now() + 11 * 86400000).toISOString(),
      },
    });
    if (!offer?.assignment_id) throw new Error(`Create assignment offer failed: ${JSON.stringify(offer)}`);
    mark("8. Owner creates assignment offer", "PASS", offer.assignment_id);

    const invitation = await rpc(owner.client, "rpc_order_company_assignment_invitation_create", {
      p_assignment_id: offer.assignment_id,
      p_payload: { sent_to_email: VENDOR_EMAIL, metadata: { amc_13f_staging_smoke: true } },
    });
    if (!invitation?.token) throw new Error(`Assignment invitation missing token: ${JSON.stringify(invitation)}`);
    const accepted = assertRpcOk(
      await rpc(vendor.client, "rpc_order_company_assignment_invitation_respond", {
        p_token: invitation.token,
        p_action: "accept",
        p_reason: null,
      }),
      "accept assignment",
    );
    mark("9. Vendor accepts assignment", "PASS", accepted.status || "accepted");

    const assignedOrders = assertRpcOk(await rpc(vendor.client, "rpc_vendor_workspace_assigned_orders"), "assigned orders");
    const assigned = findByOrderNumber(assignedOrders.items);
    if (!assigned?.assignment_work_key) throw new Error(`Assigned Orders missing ${ORDER_NUMBER}: ${JSON.stringify(assignedOrders)}`);
    mark("10. Vendor sees Assigned Orders", "PASS", assigned.assignment_work_key);

    const assignedDetail = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_assigned_order_detail", {
        p_assignment_work_key: assigned.assignment_work_key,
      }),
      "assigned detail",
    );
    mark("11. Vendor opens Assigned Order Detail", "PASS", assignedDetail.item?.assignment_status || "");

    const started = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_start_assigned_order", {
        p_assignment_work_key: assigned.assignment_work_key,
      }),
      "start work",
    );
    mark("12. Vendor starts work", "PASS", started.status || "in_progress");

    const reportKey = await uploadPreparedDocument(
      admin,
      vendor.client,
      assigned.assignment_work_key,
      REPORT_PATH,
      "amc-staging-smoke-report.pdf",
      "submitted_report",
    );
    const submitted = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_submit_report", {
        p_assignment_work_key: assigned.assignment_work_key,
        p_payload: {
          comments: "AMC-13F staging happy path report submission.",
          document_keys: [reportKey],
        },
      }),
      "submit report",
    );
    mark("13. Vendor uploads report PDF and submits report", "PASS", submitted.status || "submitted");

    const revision = assertRpcOk(
      await rpc(owner.client, "rpc_amc_request_vendor_assignment_revision", {
        p_assignment_id: offer.assignment_id,
        p_payload: {
          revision_instructions: "AMC-13F staging smoke revision request. Please upload corrected report.",
          revision_due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        },
      }),
      "request revision",
    );
    mark("14. Owner requests revision", "PASS", revision.status || "revision_requested");

    const revisionKey = await uploadPreparedDocument(
      admin,
      vendor.client,
      assigned.assignment_work_key,
      REPORT_PATH,
      "amc-staging-smoke-report-revision.pdf",
      "submitted_report",
    );
    const resubmitted = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_resubmit_report", {
        p_assignment_work_key: assigned.assignment_work_key,
        p_payload: {
          comments: "AMC-13F staging happy path revision resubmission.",
          document_keys: [revisionKey],
        },
      }),
      "resubmit report",
    );
    mark("15. Vendor uploads revision and resubmits", "PASS", resubmitted.status || "submitted");

    const completed = await rpc(owner.client, "rpc_order_company_assignment_complete", {
      p_assignment_id: offer.assignment_id,
      p_completion_note: "AMC-13F staging happy path completion.",
    });
    if (!completed?.ok && completed?.status !== "completed" && completed !== offer.assignment_id) {
      throw new Error(`Complete assignment failed: ${JSON.stringify(completed)}`);
    }
    mark("16. Owner completes assignment", "PASS", completed.status || "completed");

    const invoiceDocKey = await uploadPreparedInvoice(
      admin,
      vendor.client,
      assigned.assignment_work_key,
      INVOICE_PATH,
      "amc-staging-smoke-invoice.pdf",
    );
    const invoice = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_submit_invoice", {
        p_assignment_work_key: assigned.assignment_work_key,
        p_payload: {
          invoice_number: "AMC-STAGING-INV-001",
          invoice_amount: "650",
          currency: "USD",
          invoice_date: new Date().toISOString().slice(0, 10),
          vendor_note: "AMC-13F staging happy path invoice.",
          document_keys: [invoiceDocKey],
        },
      }),
      "submit invoice",
    );
    mark("17. Vendor submits invoice PDF", "PASS", invoice.invoice?.invoice_number || "invoice_received");

    const invoiceQueue = assertRpcOk(
      await rpc(owner.client, "rpc_amc_vendor_invoices", { p_status: "invoice_received" }),
      "invoice queue",
    );
    const invoiceRow = invoiceQueue.items?.find((item) => item.assignment_work_key === assigned.assignment_work_key);
    if (!invoiceRow?.invoice_key) throw new Error(`Invoice queue missing assignment invoice: ${JSON.stringify(invoiceQueue)}`);
    const approved = assertRpcOk(
      await rpc(owner.client, "rpc_amc_review_vendor_invoice", {
        p_invoice_key: invoiceRow.invoice_key,
        p_payload: {
          decision: "approve",
          reviewer_note: "AMC-13F staging internal approval note.",
          vendor_message: "Invoice approved for staging smoke.",
          approved_amount: "650",
        },
      }),
      "approve invoice",
    );
    mark("18. Owner approves invoice", "PASS", approved.invoice_status || "approved");

    const scheduled = assertRpcOk(
      await rpc(owner.client, "rpc_amc_schedule_vendor_payment", {
        p_invoice_key: invoiceRow.invoice_key,
        p_payload: {
          scheduled_payment_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          payment_method_label: "Staging ACH",
          reference_label: "AMC-13F-SCHEDULED",
          internal_note: "AMC-13F staging internal schedule note.",
          vendor_payment_note: "Payment scheduled for staging smoke.",
        },
      }),
      "schedule payment",
    );
    if (!scheduled.payment_key) throw new Error(`Scheduled payment missing payment key: ${JSON.stringify(scheduled)}`);
    mark("19. Owner schedules payment", "PASS", scheduled.payment_status || "scheduled");

    const paid = assertRpcOk(
      await rpc(owner.client, "rpc_amc_mark_vendor_payment_paid", {
        p_payment_key: scheduled.payment_key,
        p_payload: {
          paid_date: new Date().toISOString().slice(0, 10),
          payment_method_label: "Staging ACH",
          reference_label: "AMC-13F-PAID",
          internal_note: "AMC-13F staging internal paid note.",
          vendor_payment_note: "Payment marked paid for staging smoke.",
        },
      }),
      "mark paid",
    );
    mark("20. Owner marks paid", "PASS", paid.payment_status || "paid");

    const payments = assertRpcOk(await rpc(vendor.client, "rpc_vendor_workspace_payments"), "vendor payments");
    const paymentRow = payments.items?.find((item) => item.assignment_work_key === assigned.assignment_work_key);
    if (paymentRow?.payment_status_key !== "paid" && paymentRow?.payment_status !== "paid") {
      throw new Error(`Vendor Payments did not show paid: ${JSON.stringify(paymentRow)}`);
    }
    mark("21. Vendor Payments shows Paid", "PASS");

    console.log(JSON.stringify({ ok: true, results, defects }, null, 2));
  } catch (error) {
    if (defects.length === 0) {
      defects.push({ step: "unclassified", message: error?.message || String(error), body: error?.body || null });
    }
    console.error(JSON.stringify({ ok: false, results, defects }, null, 2));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
