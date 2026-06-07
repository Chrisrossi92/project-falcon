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

async function edgeFunctionErrorMessage(error, fallback) {
  if (!error?.context?.json) return error?.message || fallback;

  try {
    const response =
      typeof error.context.clone === "function" ? error.context.clone() : error.context;
    const body = await response.json();
    return body?.message || body?.error || error?.message || fallback;
  } catch {
    return error?.message || fallback;
  }
}

async function edgeFunction(name, body, fallbackError) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    const message = await edgeFunctionErrorMessage(error, fallbackError);
    throw new Error(message, { cause: error });
  }

  return data;
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
