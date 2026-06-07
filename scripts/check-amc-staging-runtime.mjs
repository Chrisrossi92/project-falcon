const REQUIRED_RPCS = Object.freeze([
  "rpc_vendor_workspace_dashboard_summary",
  "rpc_vendor_workspace_available_work",
  "rpc_vendor_workspace_available_work_detail",
  "rpc_vendor_workspace_submit_bid_response",
  "rpc_vendor_workspace_decline_bid_opportunity",
  "rpc_vendor_workspace_my_bids",
  "rpc_vendor_workspace_authorize_document_access",
  "rpc_vendor_workspace_assigned_orders",
  "rpc_vendor_workspace_assigned_order_detail",
  "rpc_vendor_workspace_start_assigned_order",
  "rpc_vendor_workspace_submit_report",
  "rpc_vendor_workspace_authorize_assignment_document_access",
  "rpc_vendor_workspace_prepare_report_document_upload",
  "rpc_vendor_workspace_register_report_document",
  "rpc_vendor_workspace_resubmit_report",
  "rpc_amc_request_vendor_assignment_revision",
  "rpc_amc_add_vendor_assignment_internal_note",
  "rpc_amc_vendor_assignment_internal_notes",
  "rpc_amc_cleanup_abandoned_vendor_report_uploads",
  "rpc_vendor_workspace_profile",
  "rpc_vendor_workspace_submit_profile_update_request",
  "rpc_vendor_workspace_profile_update_requests",
  "rpc_amc_vendor_profile_update_requests",
  "rpc_amc_review_vendor_profile_update_request",
  "rpc_vendor_workspace_payments",
  "rpc_vendor_workspace_prepare_invoice_upload",
  "rpc_vendor_workspace_register_invoice_document",
  "rpc_vendor_workspace_submit_invoice",
  "rpc_amc_vendor_invoices",
  "rpc_amc_review_vendor_invoice",
  "rpc_vendor_workspace_resubmit_invoice",
  "rpc_amc_vendor_payment_ledger",
  "rpc_amc_schedule_vendor_payment",
  "rpc_amc_mark_vendor_payment_paid",
]);

const REQUIRED_EDGE_FUNCTIONS = Object.freeze([
  "vendor-workspace-document-download-url",
  "vendor-workspace-report-upload-url",
  "vendor-workspace-invoice-upload-url",
]);

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const INVALID_KEY = "__amc_staging_probe__";

const RPC_PROBE_PAYLOADS = Object.freeze({
  rpc_vendor_workspace_available_work_detail: { p_work_key: INVALID_KEY },
  rpc_vendor_workspace_submit_bid_response: { p_work_key: INVALID_KEY, p_payload: {} },
  rpc_vendor_workspace_decline_bid_opportunity: { p_work_key: INVALID_KEY, p_payload: {} },
  rpc_vendor_workspace_authorize_document_access: {
    p_work_key: INVALID_KEY,
    p_document_key: INVALID_KEY,
  },
  rpc_vendor_workspace_assigned_order_detail: { p_assignment_work_key: INVALID_KEY },
  rpc_vendor_workspace_start_assigned_order: { p_assignment_work_key: INVALID_KEY },
  rpc_vendor_workspace_submit_report: { p_assignment_work_key: INVALID_KEY, p_payload: {} },
  rpc_vendor_workspace_authorize_assignment_document_access: {
    p_assignment_work_key: INVALID_KEY,
    p_document_key: INVALID_KEY,
  },
  rpc_vendor_workspace_prepare_report_document_upload: {
    p_assignment_work_key: INVALID_KEY,
    p_payload: {},
  },
  rpc_vendor_workspace_register_report_document: {
    p_assignment_work_key: INVALID_KEY,
    p_payload: {},
  },
  rpc_vendor_workspace_resubmit_report: { p_assignment_work_key: INVALID_KEY, p_payload: {} },
  rpc_amc_request_vendor_assignment_revision: { p_assignment_id: NIL_UUID, p_payload: {} },
  rpc_amc_vendor_assignment_internal_notes: { p_assignment_id: NIL_UUID },
  rpc_amc_add_vendor_assignment_internal_note: { p_assignment_id: NIL_UUID, p_payload: {} },
  rpc_amc_review_vendor_profile_update_request: { p_request_key: INVALID_KEY, p_payload: {} },
  rpc_vendor_workspace_prepare_invoice_upload: {
    p_assignment_work_key: INVALID_KEY,
    p_payload: {},
  },
  rpc_vendor_workspace_register_invoice_document: {
    p_assignment_work_key: INVALID_KEY,
    p_payload: {},
  },
  rpc_vendor_workspace_submit_invoice: { p_assignment_work_key: INVALID_KEY, p_payload: {} },
  rpc_amc_review_vendor_invoice: { p_invoice_key: INVALID_KEY, p_payload: {} },
  rpc_vendor_workspace_resubmit_invoice: { p_assignment_work_key: INVALID_KEY, p_payload: {} },
  rpc_amc_schedule_vendor_payment: { p_invoice_key: INVALID_KEY, p_payload: {} },
  rpc_amc_mark_vendor_payment_paid: { p_payment_key: INVALID_KEY, p_payload: {} },
});

const PRODUCTION_PROJECT_REFS = new Set(
  (process.env.AMC_PRODUCTION_PROJECT_REFS || "okwqhkrsjgxrhyisaovc")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const stagingUrl = process.env.AMC_STAGING_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey =
  process.env.AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const expectedProjectRef = process.env.AMC_STAGING_PROJECT_REF || "";

function usage() {
  console.error(`AMC staging runtime probe requires staging-only environment variables:

  AMC_STAGING_PROJECT_REF=<staging-project-ref>
  AMC_STAGING_SUPABASE_URL=https://<staging-project-ref>.supabase.co
  AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>

Optional:
  AMC_PRODUCTION_PROJECT_REFS=comma,separated,refs,to,refuse
`);
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).host;
    const [projectRef] = host.split(".");
    return projectRef || "";
  } catch {
    return "";
  }
}

function assertStagingTarget() {
  if (!stagingUrl || !serviceRoleKey || !expectedProjectRef) {
    usage();
    process.exit(2);
  }

  const actualProjectRef = projectRefFromUrl(stagingUrl);
  if (actualProjectRef !== expectedProjectRef) {
    console.error(
      `Refusing probe: URL project ref ${actualProjectRef || "(unknown)"} does not match AMC_STAGING_PROJECT_REF ${expectedProjectRef}.`,
    );
    process.exit(2);
  }

  if (PRODUCTION_PROJECT_REFS.has(actualProjectRef)) {
    console.error(`Refusing probe: ${actualProjectRef} is listed as a production project ref.`);
    process.exit(2);
  }
}

async function probeRpc(name) {
  const response = await fetch(`${stagingUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(RPC_PROBE_PAYLOADS[name] || {}),
  });
  const text = await response.text();

  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  const message = JSON.stringify(body || {});
  const missing =
    response.status === 404 ||
    body?.code === "PGRST202" ||
    /function .* not found|could not find the function|schema cache/i.test(message);

  if (missing) {
    return { name, ok: false, status: response.status, message };
  }

  // Business validation, missing-argument, and permission errors prove PostgREST can resolve the
  // function in the schema cache. This probe intentionally does not attempt valid mutations.
  return { name, ok: true, status: response.status, message: response.ok ? "resolved" : "resolved_with_guard" };
}

async function probeFunction(name) {
  const response = await fetch(`${stagingUrl}/functions/v1/${name}`, {
    method: "OPTIONS",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const text = await response.text();

  return {
    name,
    ok: response.status !== 404,
    status: response.status,
    message: response.status === 404 ? text || "not found" : "reachable",
  };
}

async function main() {
  assertStagingTarget();

  const rpcResults = [];
  for (const name of REQUIRED_RPCS) {
    rpcResults.push(await probeRpc(name));
  }

  const functionResults = [];
  for (const name of REQUIRED_EDGE_FUNCTIONS) {
    functionResults.push(await probeFunction(name));
  }

  const failures = [...rpcResults, ...functionResults].filter((result) => !result.ok);

  console.log(
    JSON.stringify(
      {
        project_ref: expectedProjectRef,
        rpc_count: rpcResults.length,
        edge_function_count: functionResults.length,
        rpc_failures: rpcResults.filter((result) => !result.ok),
        edge_function_failures: functionResults.filter((result) => !result.ok),
      },
      null,
      2,
    ),
  );

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
