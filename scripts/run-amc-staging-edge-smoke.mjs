import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

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
const WRONG_VENDOR_EMAIL = "amc.smoke.wrongvendor+staging@example.test";
const ORDER_NUMBER = "AMC-STAGING-SMOKE-001";
const VENDOR_COMPANY_SLUG = "amc-staging-smoke-disposable-vendor";
const REPORT_PATH = "/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-report.pdf";
const INVOICE_PATH = "/private/tmp/project-falcon-amc-smoke/amc-staging-smoke-invoice.pdf";

const results = [];
const defects = [];
const vendorPayloads = [];

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

function opaqueKey(...parts) {
  return createHash("sha256").update(parts.join(":")).digest("hex");
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

async function rpc(client, name, args = {}, captureVendorPayload = false) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const wrapped = new Error(`${name}: ${error.message}`);
    wrapped.body = error;
    throw wrapped;
  }
  if (captureVendorPayload) {
    vendorPayloads.push({ name, data });
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

async function createFreshBidRecipient(admin, order) {
  const ownerUser = await tableSingle(
    admin.from("users").select("*").eq("email", OWNER_EMAIL).single(),
    "lookup owner app user",
  );
  const vendorCompany = await tableSingle(
    admin.from("companies").select("*").eq("slug", VENDOR_COMPANY_SLUG).single(),
    "lookup vendor company",
  );
  const relationship = await tableSingle(
    admin
      .from("company_relationships")
      .select("*")
      .eq("source_company_id", order.company_id)
      .eq("target_company_id", vendorCompany.id)
      .eq("relationship_type", "amc_vendor")
      .eq("status", "active")
      .single(),
    "lookup vendor relationship",
  );
  const vendorProfile = await tableSingle(
    admin
      .from("company_vendor_profiles")
      .select("*")
      .eq("owner_company_id", order.company_id)
      .eq("vendor_company_id", vendorCompany.id)
      .single(),
    "lookup vendor profile",
  );

  const bidRequest = await tableSingle(
    admin
      .from("order_vendor_bid_requests")
      .insert({
        company_id: order.company_id,
        order_id: order.id,
        requested_by_user_id: ownerUser.id,
        request_message: "AMC-13G staging rejected invoice edge bid request.",
        response_due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        client_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        desired_vendor_due_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        review_due_at: new Date(Date.now() + 12 * 86400000).toISOString(),
        status: "sent",
        metadata: { demo_seed: "amc_13g_invoice", disposable: true, staging_smoke: true },
      })
      .select("*")
      .single(),
    "insert edge bid request",
  );

  const recipient = await tableSingle(
    admin
      .from("order_vendor_bid_request_recipients")
      .insert({
        bid_request_id: bidRequest.id,
        vendor_profile_id: vendorProfile.id,
        vendor_company_id: vendorCompany.id,
        relationship_id: relationship.id,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { demo_seed: "amc_13g_invoice", disposable: true, staging_smoke: true },
      })
      .select("*")
      .single(),
    "insert edge bid recipient",
  );

  return {
    bidRequest,
    recipient,
    workKey: opaqueKey("vendor_available_work_v1", recipient.id, recipient.vendor_company_id),
  };
}

async function latestResponseForRecipient(admin, recipientId) {
  return tableSingle(
    admin
      .from("order_vendor_bid_responses")
      .select("*")
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "lookup edge bid response",
  );
}

async function assignedWorkKeyForAssignment(admin, assignmentId) {
  const assignment = await tableSingle(
    admin.from("order_company_assignments").select("*").eq("id", assignmentId).single(),
    "lookup assignment",
  );
  return {
    assignment,
    assignmentWorkKey: opaqueKey("vendor_assignment_work_v1", assignment.id, assignment.assigned_company_id),
  };
}

async function uploadPreparedReport(admin, vendorClient, assignmentWorkKey, filePath, fileName) {
  const size = statSync(filePath).size;
  const prepared = assertRpcOk(
    await rpc(vendorClient, "rpc_vendor_workspace_prepare_report_document_upload", {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        file_name: fileName,
        mime_type: "application/pdf",
        file_size: size,
        document_role: "submitted_report",
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
        document_role: "submitted_report",
      },
    }, true),
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
    }, true),
    "register invoice document",
  );

  return registered.document.document_key;
}

async function vendorOrdersIsolationProbe(vendorToken) {
  const response = await fetch(`${supabaseUrl}/rest/v1/orders?select=id,order_number&limit=5`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${vendorToken}` },
  });
  const text = await response.text();
  let json = [];
  try {
    json = text ? JSON.parse(text) : [];
  } catch {
    json = [];
  }
  return { ok: response.ok, status: response.status, json, text };
}

function assertNoVendorPayloadLeakage() {
  const payloadText = JSON.stringify(vendorPayloads);
  const uuidMatches = payloadText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
  const forbiddenTerms = [
    "storage_path",
    "storage_bucket",
    "order-documents",
    "amc-staging-smoke-fixtures/",
    "vendor-report-uploads/",
    "vendor-invoice-uploads/",
    "internal_reviewer_note",
    "internal_note",
    "Internal-only AMC-13G",
    "client_fee",
    "amc_margin",
    "fee_amount_client",
  ];
  const foundTerms = forbiddenTerms.filter((term) => payloadText.includes(term));

  if (uuidMatches.length > 0) {
    throw new Error(`Vendor payload exposed UUID-looking values: ${[...new Set(uuidMatches)].slice(0, 5).join(", ")}`);
  }
  if (foundTerms.length > 0) {
    throw new Error(`Vendor payload exposed forbidden terms: ${foundTerms.join(", ")}`);
  }
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
  mark("Auth: primary vendor login", "PASS", VENDOR_EMAIL);
  const wrongVendor = await signIn(WRONG_VENDOR_EMAIL);
  mark("Auth: wrong-vendor login", "PASS", WRONG_VENDOR_EMAIL);

  try {
    const order = await tableSingle(
      admin.from("orders").select("*").eq("order_number", ORDER_NUMBER).eq("operations_scope", "amc_operations").single(),
      "lookup smoke order",
    );

    const primaryAvailable = assertRpcOk(await rpc(vendor.client, "rpc_vendor_workspace_available_work", {}, true), "primary available work");
    const primaryWork = findByOrderNumber(primaryAvailable.items);
    if (!primaryWork?.work_key) throw new Error(`Primary vendor available work missing: ${JSON.stringify(primaryAvailable)}`);
    const primaryDetail = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_available_work_detail", { p_work_key: primaryWork.work_key }, true),
      "primary work detail",
    );
    const opportunityDoc = primaryDetail.item?.documents?.[0];
    if (!opportunityDoc?.document_key) throw new Error(`Primary work detail missing document key: ${JSON.stringify(primaryDetail)}`);
    mark("Setup: primary vendor opportunity loaded", "PASS", ORDER_NUMBER);

    const wrongAvailable = assertRpcOk(await rpc(wrongVendor.client, "rpc_vendor_workspace_available_work", {}, true), "wrong vendor available work");
    const wrongRows = (wrongAvailable.items || []).filter((item) => item?.order?.order_number === ORDER_NUMBER || item?.order_number === ORDER_NUMBER);
    if (wrongRows.length !== 0) {
      fail("Wrong vendor: cannot see correct vendor available work", new Error(JSON.stringify(wrongRows)));
    }
    mark("Wrong vendor: cannot see correct vendor available work", "PASS");

    const wrongDetail = await rpc(wrongVendor.client, "rpc_vendor_workspace_available_work_detail", {
      p_work_key: primaryWork.work_key,
    }, true);
    if (wrongDetail?.ok !== false) {
      fail("Wrong vendor: cannot open correct vendor work detail", new Error(JSON.stringify(wrongDetail)));
    }
    mark("Wrong vendor: cannot open correct vendor work detail", "PASS", wrongDetail.error || "unavailable");

    const wrongOpportunityDoc = await rpc(wrongVendor.client, "rpc_vendor_workspace_authorize_document_access", {
      p_work_key: primaryWork.work_key,
      p_document_key: opportunityDoc.document_key,
    }, true);
    if (wrongOpportunityDoc?.ok !== false) {
      fail("Wrong vendor: cannot access opportunity document", new Error(JSON.stringify(wrongOpportunityDoc)));
    }
    mark("Wrong vendor: cannot access opportunity document", "PASS", wrongOpportunityDoc.error || "unavailable");

    const decline = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_decline_bid_opportunity", {
        p_work_key: primaryWork.work_key,
        p_payload: {
          reason: "Too busy / capacity",
          comments: "AMC-13G staging disposable decline smoke.",
        },
      }, true),
      "decline opportunity",
    );
    if (decline.status !== "declined") throw new Error(`Decline status mismatch: ${JSON.stringify(decline)}`);
    mark("Declined bid: vendor passes opportunity", "PASS", decline.decline?.reason || "declined");

    const declinedRecipient = await tableSingle(
      admin
        .from("order_vendor_bid_request_recipients")
        .select("id,status,metadata,order_vendor_bid_requests!inner(order_id,status)")
        .eq("order_vendor_bid_requests.order_id", order.id)
        .eq("status", "declined")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "lookup declined recipient",
    );
    mark("Declined bid: owner-side recipient state shows declined", "PASS", declinedRecipient.order_vendor_bid_requests?.status || "");

    const myBids = assertRpcOk(await rpc(vendor.client, "rpc_vendor_workspace_my_bids", {}, true), "vendor my bids");
    const passedBid = myBids.items?.find((item) => item.work_key === primaryWork.work_key);
    if (passedBid?.bid_status !== "passed") {
      fail("Declined bid: Vendor My Bids shows Passed Opportunity", new Error(JSON.stringify(myBids)));
    }
    mark("Declined bid: Vendor My Bids shows Passed Opportunity", "PASS", passedBid.decline?.reason || "passed");

    const declinedDetail = await rpc(vendor.client, "rpc_vendor_workspace_available_work_detail", {
      p_work_key: primaryWork.work_key,
    }, true);
    if (!declinedDetail?.ok || (declinedDetail.item?.bid_status !== "passed" && declinedDetail.item?.status !== "declined")) {
      fail("Declined bid: Work Detail remains safe and read-only", new Error(JSON.stringify(declinedDetail)));
    }
    mark("Declined bid: Work Detail remains safe and read-only", "PASS");

    const freshBid = await createFreshBidRecipient(admin, order);
    mark("Rejected invoice setup: fresh bid request created", "PASS");

    const bid = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_submit_bid_response", {
        p_work_key: freshBid.workKey,
        p_payload: {
          fee_amount: "650",
          currency: "USD",
          turn_time_days: "5",
          proposed_due_at: new Date(Date.now() + 9 * 86400000).toISOString(),
          comments: "AMC-13G staging rejected invoice edge bid.",
        },
      }, true),
      "submit edge bid",
    );
    mark("Rejected invoice setup: vendor submits fresh bid", "PASS", bid.status || "submitted");

    const response = await latestResponseForRecipient(admin, freshBid.recipient.id);
    const selected = await rpc(owner.client, "rpc_order_vendor_bid_response_select", { p_response_id: response.id });
    if (!selected?.ok && selected?.status !== "selected" && !selected?.selected_response_id) {
      throw new Error(`Select bid failed: ${JSON.stringify(selected)}`);
    }

    const offer = await rpc(owner.client, "rpc_order_vendor_bid_response_convert_to_assignment_offer", {
      p_response_id: response.id,
      p_payload: {
        instructions: "AMC-13G staging rejected invoice edge assignment offer.",
        due_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        review_due_at: new Date(Date.now() + 11 * 86400000).toISOString(),
      },
    });
    if (!offer?.assignment_id) throw new Error(`Create assignment offer failed: ${JSON.stringify(offer)}`);
    const invitation = await rpc(owner.client, "rpc_order_company_assignment_invitation_create", {
      p_assignment_id: offer.assignment_id,
      p_payload: { sent_to_email: VENDOR_EMAIL, metadata: { amc_13g_staging_smoke: true } },
    });
    if (!invitation?.token) throw new Error(`Assignment invitation missing token: ${JSON.stringify(invitation)}`);
    const accepted = assertRpcOk(
      await rpc(vendor.client, "rpc_order_company_assignment_invitation_respond", {
        p_token: invitation.token,
        p_action: "accept",
        p_reason: null,
      }, true),
      "accept edge assignment",
    );
    mark("Rejected invoice setup: assignment offer accepted", "PASS", accepted.status || "accepted");

    const { assignment, assignmentWorkKey } = await assignedWorkKeyForAssignment(admin, offer.assignment_id);
    const assignedDetail = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_assigned_order_detail", {
        p_assignment_work_key: assignmentWorkKey,
      }, true),
      "assigned order detail",
    );
    const wrongAssigned = await rpc(wrongVendor.client, "rpc_vendor_workspace_assigned_order_detail", {
      p_assignment_work_key: assignmentWorkKey,
    }, true);
    if (wrongAssigned?.ok !== false) {
      fail("Wrong vendor: cannot open assigned order detail", new Error(JSON.stringify(wrongAssigned)));
    }
    mark("Wrong vendor: cannot open assigned order detail", "PASS", wrongAssigned.error || "unavailable");

    const assignedDoc = assignedDetail.item?.documents?.[0];
    if (!assignedDoc?.document_key) {
      mark("Wrong vendor: cannot access assignment document", "WARN", "assigned detail returned no document key");
    } else {
      const wrongAssignedDoc = await rpc(wrongVendor.client, "rpc_vendor_workspace_authorize_assignment_document_access", {
        p_assignment_work_key: assignmentWorkKey,
        p_document_key: assignedDoc.document_key,
      }, true);
      if (wrongAssignedDoc?.ok !== false) {
        fail("Wrong vendor: cannot access assignment document", new Error(JSON.stringify(wrongAssignedDoc)));
      }
      mark("Wrong vendor: cannot access assignment document", "PASS", wrongAssignedDoc.error || "unavailable");
    }

    const started = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_start_assigned_order", {
        p_assignment_work_key: assignmentWorkKey,
      }, true),
      "start assigned order",
    );
    mark("Rejected invoice setup: vendor starts work", "PASS", started.status || "in_progress");

    const reportKey = await uploadPreparedReport(admin, vendor.client, assignmentWorkKey, REPORT_PATH, "amc-staging-edge-report.pdf");
    const submitted = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_submit_report", {
        p_assignment_work_key: assignmentWorkKey,
        p_payload: {
          comments: "AMC-13G staging rejected invoice edge report.",
          document_keys: [reportKey],
        },
      }, true),
      "submit report",
    );
    mark("Rejected invoice setup: vendor submits report", "PASS", submitted.status || "submitted");

    const completed = await rpc(owner.client, "rpc_order_company_assignment_complete", {
      p_assignment_id: assignment.id,
      p_completion_note: "AMC-13G staging completion before rejected invoice edge.",
    });
    if (!completed?.ok && completed?.status !== "completed" && completed !== assignment.id) {
      throw new Error(`Complete assignment failed: ${JSON.stringify(completed)}`);
    }
    mark("Rejected invoice setup: owner completes assignment", "PASS");

    const invoiceDocKey = await uploadPreparedInvoice(admin, vendor.client, assignmentWorkKey, INVOICE_PATH, "amc-staging-edge-invoice.pdf");
    const invoice = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_submit_invoice", {
        p_assignment_work_key: assignmentWorkKey,
        p_payload: {
          invoice_number: "AMC-STAGING-EDGE-INV-001",
          invoice_amount: "650",
          currency: "USD",
          invoice_date: new Date().toISOString().slice(0, 10),
          vendor_note: "AMC-13G staging invoice to reject.",
          document_keys: [invoiceDocKey],
        },
      }, true),
      "submit invoice",
    );
    mark("Rejected invoice: vendor submits invoice", "PASS", invoice.invoice?.invoice_number || "invoice_received");

    const invoiceQueue = assertRpcOk(
      await rpc(owner.client, "rpc_amc_vendor_invoices", { p_status: "invoice_received" }),
      "invoice review queue",
    );
    const invoiceRow = invoiceQueue.items?.find((item) => item.assignment_work_key === assignmentWorkKey);
    if (!invoiceRow?.invoice_key) throw new Error(`Invoice queue missing edge invoice: ${JSON.stringify(invoiceQueue)}`);

    const rejected = assertRpcOk(
      await rpc(owner.client, "rpc_amc_review_vendor_invoice", {
        p_invoice_key: invoiceRow.invoice_key,
        p_payload: {
          decision: "reject",
          reviewer_note: "Internal-only AMC-13G rejection note.",
          vendor_message: "Please correct the staging smoke invoice and upload a revised PDF.",
        },
      }),
      "reject invoice",
    );
    if (rejected.invoice?.invoice_status !== "rejected" && rejected.invoice_status !== "rejected") {
      throw new Error(`Reject invoice failed: ${JSON.stringify(rejected)}`);
    }
    mark("Rejected invoice: owner rejects with safe vendor-facing message", "PASS");

    const rejectedPayments = assertRpcOk(await rpc(vendor.client, "rpc_vendor_workspace_payments", {}, true), "vendor payments rejected");
    const rejectedPayment = rejectedPayments.items?.find((item) => item.assignment_work_key === assignmentWorkKey);
    const rejectedText = JSON.stringify(rejectedPayment);
    if (rejectedPayment?.payment_status_key !== "rejected" || !rejectedText.includes("Please correct the staging smoke invoice")) {
      fail("Rejected invoice: Vendor Payments shows rejection and correction path", new Error(JSON.stringify(rejectedPayment)));
    }
    mark("Rejected invoice: Vendor Payments shows rejection and correction path", "PASS");

    const correctedDocKey = await uploadPreparedInvoice(admin, vendor.client, assignmentWorkKey, INVOICE_PATH, "amc-staging-edge-invoice-corrected.pdf");
    const corrected = assertRpcOk(
      await rpc(vendor.client, "rpc_vendor_workspace_resubmit_invoice", {
        p_assignment_work_key: assignmentWorkKey,
        p_payload: {
          invoice_number: "AMC-STAGING-EDGE-INV-001-R",
          invoice_amount: "625",
          currency: "USD",
          invoice_date: new Date().toISOString().slice(0, 10),
          vendor_note: "Corrected AMC-13G staging invoice.",
          document_keys: [correctedDocKey],
        },
      }, true),
      "resubmit corrected invoice",
    );
    if (corrected.status !== "invoice_received" && corrected.invoice?.invoice_status !== "invoice_received") {
      throw new Error(`Corrected invoice status mismatch: ${JSON.stringify(corrected)}`);
    }
    mark("Rejected invoice: vendor submits corrected invoice", "PASS");

    const correctedQueue = assertRpcOk(
      await rpc(owner.client, "rpc_amc_vendor_invoices", { p_status: "invoice_received" }),
      "corrected invoice queue",
    );
    const correctedRow = correctedQueue.items?.find((item) => item.assignment_work_key === assignmentWorkKey);
    if (correctedRow?.invoice_status !== "invoice_received" || correctedRow.invoice_number !== "AMC-STAGING-EDGE-INV-001-R") {
      fail("Rejected invoice: owner review queue sees corrected invoice", new Error(JSON.stringify(correctedRow)));
    }
    mark("Rejected invoice: owner review queue sees corrected invoice", "PASS");

    const orderProbe = await vendorOrdersIsolationProbe(vendor.token);
    if (orderProbe.ok && Array.isArray(orderProbe.json) && orderProbe.json.length === 0) {
      mark("Route isolation probe: vendor REST order rows are not exposed", "PASS", "HTTP 200 empty result under RLS");
    } else if (!orderProbe.ok) {
      mark("Route isolation probe: vendor REST order rows are not exposed", "PASS", `HTTP ${orderProbe.status}`);
    } else {
      mark("Route isolation probe: vendor REST order rows are not exposed", "WARN", orderProbe.text);
    }

    assertNoVendorPayloadLeakage();
    mark("Leakage: no raw UUIDs/storage paths/internal notes/client fee/AMC margin in captured Vendor Workspace RPC payloads", "PASS");

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
