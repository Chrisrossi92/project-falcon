import supabase from "@/lib/supabaseClient";

const EMPTY_DASHBOARD_SUMMARY = Object.freeze({
  ok: true,
  counts: {
    available_work: 0,
    pending_bids: 0,
    assignment_offers: 0,
    active_assigned_orders: 0,
    submitted_awaiting_review: 0,
    needs_attention: 0,
  },
  actions: [],
});

const EMPTY_AVAILABLE_WORK = Object.freeze({
  ok: true,
  items: [],
});

const EMPTY_AVAILABLE_WORK_DETAIL = Object.freeze({
  ok: false,
  item: null,
});

const EMPTY_MY_BIDS = Object.freeze({
  ok: true,
  items: [],
});

const EMPTY_ASSIGNED_ORDERS = Object.freeze({
  ok: true,
  items: [],
});

const EMPTY_ASSIGNED_ORDER_DETAIL = Object.freeze({
  ok: false,
  item: null,
});

const EMPTY_PROFILE = Object.freeze({
  ok: false,
  profile: null,
});

const EMPTY_PROFILE_UPDATE_REQUESTS = Object.freeze({
  ok: true,
  requests: [],
});

const EMPTY_PAYMENTS = Object.freeze({
  ok: true,
  items: [],
});

const EMPTY_BOOTSTRAP = Object.freeze({
  ok: false,
  error: "vendor_workspace_bootstrap_unavailable",
});

function authCompanyClaims(session) {
  const appMetadata = session?.user?.app_metadata || {};
  return {
    active_company_id: appMetadata.active_company_id || null,
    current_company_id: appMetadata.current_company_id || null,
    user_email: session?.user?.email || null,
  };
}

async function fetchVendorWorkspacePermissionDiagnostics() {
  const diagnostics = {
    current_company_id: null,
    permission_keys: [],
    has_vendor_workspace_view: false,
    context_error: null,
    permission_error: null,
  };

  const { data: contextData, error: contextError } = await supabase.rpc("rpc_current_company_context");
  if (contextError) {
    diagnostics.context_error = contextError.message || String(contextError);
  } else {
    const contextRow = Array.isArray(contextData) ? contextData[0] : contextData;
    diagnostics.current_company_id = contextRow?.current_company_id || null;
  }

  const { data: permissionsData, error: permissionsError } = await supabase.rpc(
    "current_app_user_permission_keys",
  );
  if (permissionsError) {
    diagnostics.permission_error = permissionsError.message || String(permissionsError);
  } else {
    diagnostics.permission_keys = Array.isArray(permissionsData) ? permissionsData : [];
    diagnostics.has_vendor_workspace_view =
      diagnostics.permission_keys.includes("vendor_workspace.view");
  }

  return diagnostics;
}

function vendorWorkspaceBootstrapError(message, diagnostics, cause) {
  const error = new Error(message, { cause });
  error.vendorWorkspaceDiagnostics = diagnostics;
  return error;
}

async function edgeFunctionErrorBody(error) {
  if (!error?.context?.json) return null;

  try {
    const response =
      typeof error.context.clone === "function" ? error.context.clone() : error.context;
    return await response.json();
  } catch {
    return null;
  }
}

async function edgeFunction(name, body, fallbackError) {
  const diagnostics = {
    function_name: name,
    before_response: false,
    body: {
      assignment_work_key_present: Boolean(body?.assignment_work_key),
      file_name: typeof body?.file_name === "string" ? body.file_name : null,
      mime_type: typeof body?.mime_type === "string" ? body.mime_type : null,
      file_size: Number.isFinite(Number(body?.file_size)) ? Number(body.file_size) : null,
      document_role: typeof body?.document_role === "string" ? body.document_role : null,
      json_serializable: true,
    },
  };

  try {
    JSON.stringify(body);
  } catch {
    diagnostics.body.json_serializable = false;
  }

  console.info("[VendorWorkspaceEdgeFunction] invoking", diagnostics);

  let result;
  try {
    result = await supabase.functions.invoke(name, { body });
  } catch (invokeError) {
    const message =
      name === "vendor-workspace-report-upload-url"
        ? "Report upload request could not reach the Edge Function. Check CORS/preflight or network configuration."
        : invokeError?.message || fallbackError;
    const wrapped = new Error(message, { cause: invokeError });
    wrapped.code = invokeError?.code || "edge_function_invoke_failed";
    wrapped.details = {
      ...diagnostics,
      before_response: true,
      original_message: invokeError?.message || null,
    };
    wrapped.field_errors = {};
    wrapped.response = null;
    console.warn("[VendorWorkspaceEdgeFunction] invoke threw before response", wrapped.details);
    throw wrapped;
  }

  const { data, error } = result;

  if (error) {
    const errorBody = await edgeFunctionErrorBody(error);
    const message = errorBody?.message || errorBody?.error || error?.message || fallbackError;
    const wrapped = new Error(message, { cause: error });
    wrapped.code = errorBody?.code || error?.code || null;
    wrapped.details = errorBody?.details || diagnostics;
    wrapped.field_errors = errorBody?.field_errors || {};
    wrapped.response = errorBody;
    console.warn("[VendorWorkspaceEdgeFunction] response error", {
      ...diagnostics,
      code: wrapped.code,
      message: wrapped.message,
      details: wrapped.details,
    });
    throw wrapped;
  }

  console.info("[VendorWorkspaceEdgeFunction] response ok", {
    function_name: name,
    ok: data?.ok,
    has_data: Boolean(data),
  });

  return data;
}

export async function bootstrapVendorWorkspace() {
  const debug = {
    bootstrap: null,
    set_active_company: null,
    session_after_refresh: null,
    permission_reload: null,
  };
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_bootstrap");
  if (error) {
    debug.bootstrap = {
      ok: false,
      error: error.message || String(error),
    };
    console.warn("[VendorWorkspaceBootstrap] bootstrap RPC failed", debug);
    throw vendorWorkspaceBootstrapError(error.message || "vendor_workspace_bootstrap_failed", debug, error);
  }

  if (!data || typeof data !== "object") {
    debug.bootstrap = EMPTY_BOOTSTRAP;
    console.warn("[VendorWorkspaceBootstrap] bootstrap RPC returned empty response", debug);
    return EMPTY_BOOTSTRAP;
  }

  const result = {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    vendor_company_id: data.vendor_company_id || null,
    vendor_company_name: data.vendor_company_name || null,
    vendor_profile_id: data.vendor_profile_id || null,
    vendor_contact_id: data.vendor_contact_id || null,
    relationship_id: data.relationship_id || null,
    membership_id: data.membership_id || null,
    role_assignment_id: data.role_assignment_id || null,
    role_id: data.role_id || null,
    role_name: data.role_name || null,
    contact_linked: data.contact_linked === true,
    permission_keys: Array.isArray(data.permission_keys) ? data.permission_keys : [],
    has_vendor_workspace_view: data.has_vendor_workspace_view === true,
    diagnostics: data.diagnostics && typeof data.diagnostics === "object" ? data.diagnostics : null,
  };
  debug.bootstrap = result;
  console.info("[VendorWorkspaceBootstrap] bootstrap RPC response", {
    vendor_company_id: result.vendor_company_id,
    vendor_company_name: result.vendor_company_name,
    membership_id: result.membership_id,
    role_assignment_id: result.role_assignment_id,
    role_id: result.role_id,
    role_name: result.role_name,
    has_vendor_workspace_view: result.has_vendor_workspace_view,
    error: result.error,
    diagnostics: result.diagnostics,
  });

  if (result.ok && result.vendor_company_id) {
    const switchPayload = {
      company_id: result.vendor_company_id,
      reason: "vendor_workspace_bootstrap",
      request_id: `vendor-workspace-bootstrap-${result.vendor_company_id}`,
    };
    const { data: switchData, error: switchError } = await supabase.functions.invoke(
      "set-active-company",
      {
        body: switchPayload,
      },
    );
    debug.set_active_company = {
      active_company_id_sent: result.vendor_company_id,
      payload: switchPayload,
      response: switchData || null,
      error: switchError?.message || null,
    };
    console.info("[VendorWorkspaceBootstrap] set-active-company response", debug.set_active_company);

    if (switchError || switchData?.ok === false) {
      throw vendorWorkspaceBootstrapError(
        switchError?.message || switchData?.code || "vendor_workspace_company_switch_failed",
        debug,
        switchError,
      );
    }

    if (switchData?.session_refresh_required) {
      await supabase.auth.refreshSession();
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    debug.session_after_refresh = {
      ...authCompanyClaims(sessionData?.session),
      error: sessionError?.message || null,
    };
    console.info("[VendorWorkspaceBootstrap] session after refresh", debug.session_after_refresh);

    debug.permission_reload = await fetchVendorWorkspacePermissionDiagnostics();
    console.info("[VendorWorkspaceBootstrap] permission context after refresh", debug.permission_reload);
  }

  return {
    ...result,
    debug,
  };
}

export async function fetchVendorWorkspaceDashboardSummary() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_dashboard_summary");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_DASHBOARD_SUMMARY;
  }

  return {
    ok: data.ok === true,
    counts: {
      ...EMPTY_DASHBOARD_SUMMARY.counts,
      ...(data.counts && typeof data.counts === "object" ? data.counts : {}),
    },
    actions: Array.isArray(data.actions) ? data.actions : [],
  };
}

export async function fetchVendorWorkspaceAvailableWork() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_available_work");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_AVAILABLE_WORK;
  }

  return {
    ok: data.ok === true,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export async function fetchVendorWorkspaceAvailableWorkDetail(workKey) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_available_work_detail", {
    p_work_key: workKey,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_AVAILABLE_WORK_DETAIL;
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    item: data.item && typeof data.item === "object" ? data.item : null,
  };
}

export async function fetchVendorWorkspaceMyBids() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_my_bids");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_MY_BIDS;
  }

  return {
    ok: data.ok === true,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export async function fetchVendorWorkspaceAssignedOrders() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_assigned_orders");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_ASSIGNED_ORDERS;
  }

  return {
    ok: data.ok === true,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export async function fetchVendorWorkspaceAssignedOrderDetail(assignmentWorkKey) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_assigned_order_detail", {
    p_assignment_work_key: assignmentWorkKey,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_ASSIGNED_ORDER_DETAIL;
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    item: data.item && typeof data.item === "object" ? data.item : null,
  };
}

export async function fetchVendorWorkspaceProfile() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_profile");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_PROFILE;
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    profile: data.profile && typeof data.profile === "object" ? data.profile : null,
  };
}

export async function fetchVendorWorkspaceProfileUpdateRequests() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_profile_update_requests");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_PROFILE_UPDATE_REQUESTS;
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    requests: Array.isArray(data.requests) ? data.requests : [],
  };
}

export async function submitVendorWorkspaceProfileUpdateRequest(payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_submit_profile_update_request", {
    p_payload: payload,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "profile_update_request_invalid", request: null, field_errors: {} };
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    request: data.request && typeof data.request === "object" ? data.request : null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function fetchVendorWorkspacePayments() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_payments");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_PAYMENTS;
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export async function createVendorWorkspaceInvoiceUploadUrl(assignmentWorkKey, payload = {}) {
  const data = await edgeFunction(
    "vendor-workspace-invoice-upload-url",
    {
      assignment_work_key: assignmentWorkKey,
      file_name: payload.file_name || payload.fileName || null,
      mime_type: payload.mime_type || payload.mimeType || null,
      file_size: payload.file_size ?? payload.fileSize ?? null,
      document_role: payload.document_role || payload.documentRole || "vendor_invoice",
    },
    "Could not prepare this invoice upload.",
  );

  if (!data?.document?.document_key || !data?.upload?.signed_url) {
    throw new Error("Invoice upload URL was not returned.");
  }

  return {
    ok: data.ok === true,
    document: data.document,
    upload: {
      signed_url: data.upload.signed_url,
      token: data.upload.token || null,
    },
  };
}

export async function registerVendorWorkspaceInvoiceDocument(assignmentWorkKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_register_invoice_document", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      document_key: payload.document_key || payload.documentKey || null,
      file_name: payload.file_name || payload.fileName || null,
      mime_type: payload.mime_type || payload.mimeType || null,
      file_size: payload.file_size ?? payload.fileSize ?? null,
      document_role: payload.document_role || payload.documentRole || "vendor_invoice",
    },
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "invoice_upload_invalid", document: null, field_errors: {} };
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    document: data.document && typeof data.document === "object" ? data.document : null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function createVendorWorkspaceCorrectedInvoiceUploadUrl(assignmentWorkKey, payload = {}) {
  return createVendorWorkspaceInvoiceUploadUrl(assignmentWorkKey, payload);
}

export async function registerVendorWorkspaceCorrectedInvoiceDocument(assignmentWorkKey, payload = {}) {
  return registerVendorWorkspaceInvoiceDocument(assignmentWorkKey, payload);
}

export async function submitVendorWorkspaceInvoice(assignmentWorkKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_submit_invoice", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      invoice_number: payload.invoice_number || payload.invoiceNumber || null,
      invoice_amount: payload.invoice_amount ?? payload.invoiceAmount ?? null,
      currency: payload.currency || "USD",
      invoice_date: payload.invoice_date || payload.invoiceDate || null,
      vendor_note: payload.vendor_note || payload.vendorNote || payload.comments || null,
      document_keys: Array.isArray(payload.document_keys)
        ? payload.document_keys
        : Array.isArray(payload.documentKeys) ? payload.documentKeys : [],
    },
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "invoice_submission_invalid", invoice: null, field_errors: {} };
  }

  return {
    ok: data.ok === true,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : null,
    invoice: data.invoice && typeof data.invoice === "object" ? data.invoice : null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function resubmitVendorWorkspaceInvoice(assignmentWorkKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_resubmit_invoice", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      invoice_number: payload.invoice_number || payload.invoiceNumber || null,
      invoice_amount: payload.invoice_amount ?? payload.invoiceAmount ?? null,
      currency: payload.currency || "USD",
      invoice_date: payload.invoice_date || payload.invoiceDate || null,
      vendor_note: payload.vendor_note || payload.vendorNote || payload.comments || null,
      document_keys: Array.isArray(payload.document_keys)
        ? payload.document_keys
        : Array.isArray(payload.documentKeys) ? payload.documentKeys : [],
    },
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "invoice_resubmission_invalid", invoice: null, field_errors: {} };
  }

  return {
    ok: data.ok === true,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : null,
    invoice: data.invoice && typeof data.invoice === "object" ? data.invoice : null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function startVendorWorkspaceAssignedOrder(assignmentWorkKey) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_start_assigned_order", {
    p_assignment_work_key: assignmentWorkKey,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "assigned_order_unavailable", field_errors: {} };
  }

  return {
    ok: data.ok === true,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : null,
    started_at: data.started_at || null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function submitVendorWorkspaceReport(assignmentWorkKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_submit_report", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: payload,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "assigned_order_unavailable", field_errors: {} };
  }

  return {
    ok: data.ok === true,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : null,
    submitted_at: data.submitted_at || null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function resubmitVendorWorkspaceReport(assignmentWorkKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_resubmit_report", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: payload,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "assigned_order_unavailable", field_errors: {} };
  }

  return {
    ok: data.ok === true,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : null,
    resubmitted_at: data.resubmitted_at || null,
    submitted_at: data.submitted_at || null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function createVendorWorkspaceReportUploadUrl(assignmentWorkKey, payload = {}) {
  const data = await edgeFunction(
    "vendor-workspace-report-upload-url",
    {
      assignment_work_key: assignmentWorkKey,
      file_name: payload.file_name || payload.fileName || null,
      mime_type: payload.mime_type || payload.mimeType || null,
      file_size: payload.file_size ?? payload.fileSize ?? null,
      document_role: payload.document_role || payload.documentRole || "submitted_report",
    },
    "Could not prepare this report upload.",
  );

  if (!data?.document?.document_key || !data?.upload?.signed_url) {
    throw new Error("Report upload URL was not returned.");
  }

  return {
    ok: data.ok === true,
    document: data.document,
    upload: {
      signed_url: data.upload.signed_url,
      token: data.upload.token || null,
    },
  };
}

export async function registerVendorWorkspaceReportDocument(assignmentWorkKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_register_report_document", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      document_key: payload.document_key || payload.documentKey || null,
      file_name: payload.file_name || payload.fileName || null,
      mime_type: payload.mime_type || payload.mimeType || null,
      file_size: payload.file_size ?? payload.fileSize ?? null,
      document_role: payload.document_role || payload.documentRole || "submitted_report",
    },
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "report_upload_invalid", document: null, field_errors: {} };
  }

  return {
    ok: data.ok === true,
    error: typeof data.error === "string" ? data.error : null,
    document: data.document && typeof data.document === "object" ? data.document : null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function submitVendorWorkspaceBidResponse(workKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_submit_bid_response", {
    p_work_key: workKey,
    p_payload: payload,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "available_work_unavailable", bid: null, field_errors: {} };
  }

  return {
    ok: data.ok === true,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : null,
    submitted_at: data.submitted_at || data.bid?.submitted_at || null,
    bid: data.bid && typeof data.bid === "object" ? data.bid : null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function declineVendorWorkspaceBidOpportunity(workKey, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_decline_bid_opportunity", {
    p_work_key: workKey,
    p_payload: payload,
  });
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return { ok: false, error: "available_work_unavailable", decline: null, bid: null, field_errors: {} };
  }

  return {
    ok: data.ok === true,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    message: typeof data.message === "string" ? data.message : null,
    declined_at: data.declined_at || data.decline?.declined_at || null,
    decline: data.decline && typeof data.decline === "object" ? data.decline : null,
    bid: data.bid && typeof data.bid === "object" ? data.bid : null,
    field_errors: data.field_errors && typeof data.field_errors === "object" ? data.field_errors : {},
  };
}

export async function createVendorWorkspaceDocumentDownloadUrl(workKey, documentKey) {
  const data = await edgeFunction(
    "vendor-workspace-document-download-url",
    {
      work_key: workKey,
      document_key: documentKey,
    },
    "Could not open this document.",
  );

  if (!data?.signed_url) throw new Error("Document download URL was not returned.");

  return {
    ok: data.ok === true,
    signed_url: data.signed_url,
    expires_in: data.expires_in || null,
    document: data.document && typeof data.document === "object" ? data.document : null,
  };
}

export async function createVendorWorkspaceAssignmentDocumentDownloadUrl(assignmentWorkKey, documentKey) {
  const data = await edgeFunction(
    "vendor-workspace-document-download-url",
    {
      assignment_work_key: assignmentWorkKey,
      document_key: documentKey,
    },
    "Could not open this document.",
  );

  if (!data?.signed_url) throw new Error("Document download URL was not returned.");

  return {
    ok: data.ok === true,
    signed_url: data.signed_url,
    expires_in: data.expires_in || null,
    document: data.document && typeof data.document === "object" ? data.document : null,
  };
}
