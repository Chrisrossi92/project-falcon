import supabase from "@/lib/supabaseClient";

const CLIENT_PORTAL_ORDER_LIST_RPC = "rpc_client_portal_orders";
const CLIENT_PORTAL_ORDER_DETAIL_RPC = "rpc_client_portal_order_detail";
const CLIENT_PORTAL_DASHBOARD_RPC = "rpc_client_portal_dashboard";
const CLIENT_PORTAL_ORDER_REQUEST_CREATE_RPC = "rpc_client_portal_order_request_create";
const CLIENT_PORTAL_PENDING_ORDER_REQUESTS_RPC = "rpc_client_portal_pending_order_requests";
const CLIENT_PORTAL_INVITATION_READ_RPC = "rpc_client_portal_invitation_read";
const CLIENT_PORTAL_INVITATION_ACCEPT_RPC = "rpc_client_portal_invitation_accept";
const CLIENT_PORTAL_REPORT_DOWNLOAD_FUNCTION = "client-portal-report-download-url";

const toStringOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const toBoolean = (value) => value === true || value === "true";

const firstPresent = (...values) => values.find((value) => value !== null && value !== undefined);

function composeClientRequestNotes(values = {}) {
  const notes = toStringOrNull(values.notes);
  const intakeDetails = [
    ["Parcel number(s)", toStringOrNull(values.parcelNumbers)],
    ["Interest appraised", toStringOrNull(values.interestAppraised)],
    ["Premise / Condition", toStringOrNull(values.premiseCondition)],
    ["Approaches to Value", toStringOrNull(values.approachesToValue)],
  ].filter(([, value]) => value);

  if (!intakeDetails.length) return notes;

  const intakeNotes = [
    "Additional appraisal request details:",
    ...intakeDetails.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  return [notes, intakeNotes].filter(Boolean).join("\n\n");
}

export function normalizeClientPortalOrder(row = {}) {
  const orderKey = toStringOrNull(row.order_key ?? row.orderKey ?? row.portal_order_key);

  if (!orderKey) return null;

  return {
    orderKey,
    orderNumber: toStringOrNull(row.order_number ?? row.orderNumber) || "Order",
    status: toStringOrNull(row.status_label ?? row.statusLabel ?? row.status) || "In progress",
    propertyAddress: toStringOrNull(row.property_address ?? row.propertyAddress ?? row.address) || "Property address pending",
    city: toStringOrNull(row.city),
    state: toStringOrNull(row.state),
    orderedAt: toStringOrNull(row.ordered_at ?? row.orderedAt ?? row.created_at),
    dueAt: toStringOrNull(row.due_at ?? row.dueAt ?? row.client_due_at),
    inspectionAt: toStringOrNull(row.inspection_at ?? row.inspectionAt ?? row.inspection_date),
    reportReadyAt: toStringOrNull(row.report_ready_at ?? row.reportReadyAt),
    reportAvailable: toBoolean(firstPresent(row.report_available, row.reportAvailable)),
  };
}

export function normalizeClientPortalOrderDetail(row = {}) {
  const order = normalizeClientPortalOrder(row);
  if (!order) return null;

  return {
    ...order,
    loanPurpose: toStringOrNull(row.loan_purpose ?? row.loanPurpose),
    propertyType: toStringOrNull(row.property_type ?? row.propertyType),
    contactName: toStringOrNull(row.contact_name ?? row.contactName),
    reportFileName: toStringOrNull(row.report_file_name ?? row.reportFileName),
    reportDownloadReady: toBoolean(firstPresent(row.report_download_ready, row.reportDownloadReady, row.report_available)),
    milestones: Array.isArray(row.milestones)
      ? row.milestones
          .map((milestone) => ({
            label: toStringOrNull(milestone?.label) || "Progress update",
            date: toStringOrNull(milestone?.date ?? milestone?.at),
            state: toStringOrNull(milestone?.state) || "pending",
          }))
          .filter((milestone) => milestone.label)
      : [],
  };
}

export function normalizeClientPortalDashboard(row = {}) {
  const recentOrders = Array.isArray(row.recent_orders) ? row.recent_orders : [];

  return {
    activeOrderCount: Number(row.active_order_count ?? row.activeOrderCount ?? 0) || 0,
    completedOrderCount: Number(row.completed_order_count ?? row.completedOrderCount ?? 0) || 0,
    reportAvailableCount: Number(row.report_available_count ?? row.reportAvailableCount ?? 0) || 0,
    nextDueAt: toStringOrNull(row.next_due_at ?? row.nextDueAt),
    recentOrders: recentOrders.map(normalizeClientPortalOrder).filter(Boolean),
  };
}

export function normalizeClientPortalOrderRequest(row = {}) {
  const requestKey = toStringOrNull(row.request_key ?? row.requestKey);
  if (!requestKey) return null;

  return {
    requestKey,
    status: toStringOrNull(row.status) || "submitted",
    submittedAt: toStringOrNull(row.submitted_at ?? row.submittedAt),
    propertyAddress: toStringOrNull(row.property_address ?? row.propertyAddress),
    propertyCity: toStringOrNull(row.property_city ?? row.propertyCity),
    propertyState: toStringOrNull(row.property_state ?? row.propertyState),
    propertyPostalCode: toStringOrNull(row.property_postal_code ?? row.propertyPostalCode ?? row.property_zip ?? row.propertyZip),
    propertyCounty: toStringOrNull(row.property_county ?? row.propertyCounty),
    propertyType: toStringOrNull(row.property_type ?? row.propertyType),
    reportType: toStringOrNull(row.report_type ?? row.reportType),
    requestedDueDate: toStringOrNull(row.requested_due_date ?? row.requestedDueDate),
  };
}

export function normalizeClientPortalPendingOrderRequest(row = {}) {
  const requestKey = toStringOrNull(row.request_key ?? row.requestKey);
  if (!requestKey) return null;

  return {
    requestKey,
    status: toStringOrNull(row.status) || "submitted",
    statusLabel: toStringOrNull(row.status_label ?? row.statusLabel) || "Submitted",
    statusCopy:
      toStringOrNull(row.status_copy ?? row.statusCopy) ||
      "Your appraisal team is reviewing this request.",
    propertyAddress: toStringOrNull(row.property_address ?? row.propertyAddress),
    propertyCity: toStringOrNull(row.property_city ?? row.propertyCity),
    propertyState: toStringOrNull(row.property_state ?? row.propertyState),
    propertyPostalCode: toStringOrNull(row.property_postal_code ?? row.propertyPostalCode ?? row.property_zip ?? row.propertyZip),
    propertyCounty: toStringOrNull(row.property_county ?? row.propertyCounty),
    propertyType: toStringOrNull(row.property_type ?? row.propertyType),
    reportType: toStringOrNull(row.report_type ?? row.reportType),
    requestedDueDate: toStringOrNull(row.requested_due_date ?? row.requestedDueDate),
    submittedAt: toStringOrNull(row.submitted_at ?? row.submittedAt),
  };
}

export function normalizeClientPortalInvitation(row = {}) {
  const email = toStringOrNull(row.email);
  const status = toStringOrNull(row.status) || "pending";

  return {
    clientName: toStringOrNull(row.client_name ?? row.clientName),
    companyName: toStringOrNull(row.company_name ?? row.companyName),
    contactName: toStringOrNull(row.contact_name ?? row.contactName),
    email,
    status,
    expiresAt: toStringOrNull(row.expires_at ?? row.expiresAt),
    acceptedAt: toStringOrNull(row.accepted_at ?? row.acceptedAt),
  };
}

export async function getClientPortalDashboard() {
  const { data, error } = await supabase.rpc(CLIENT_PORTAL_DASHBOARD_RPC);
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeClientPortalDashboard(row || {});
}

export async function listClientPortalOrders() {
  const { data, error } = await supabase.rpc(CLIENT_PORTAL_ORDER_LIST_RPC);
  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map(normalizeClientPortalOrder)
    .filter(Boolean);
}

export async function listClientPortalPendingOrderRequests() {
  const { data, error } = await supabase.rpc(CLIENT_PORTAL_PENDING_ORDER_REQUESTS_RPC);
  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map(normalizeClientPortalPendingOrderRequest)
    .filter(Boolean);
}

export async function getClientPortalOrderDetail(orderKey) {
  const safeOrderKey = toStringOrNull(orderKey);
  if (!safeOrderKey) {
    throw new Error("client_portal_order_key_required");
  }

  const { data, error } = await supabase.rpc(CLIENT_PORTAL_ORDER_DETAIL_RPC, {
    p_order_key: safeOrderKey,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientPortalOrderDetail(row) : null;
}

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

export async function createClientPortalReportDownloadUrl(orderKey) {
  const safeOrderKey = toStringOrNull(orderKey);
  if (!safeOrderKey) {
    throw new Error("client_portal_order_key_required");
  }

  const { data, error } = await supabase.functions.invoke(CLIENT_PORTAL_REPORT_DOWNLOAD_FUNCTION, {
    body: {
      order_key: safeOrderKey,
    },
  });

  if (error) {
    const message = await edgeFunctionErrorMessage(error, "The report download could not be prepared.");
    throw new Error(message, { cause: error });
  }

  if (!data?.signed_url) {
    throw new Error("The report download URL was not returned.");
  }

  return {
    signedUrl: data.signed_url,
    expiresIn: Number(data.expires_in ?? data.expiresIn ?? 0) || null,
    fileName: toStringOrNull(data.report?.file_name ?? data.report?.fileName),
  };
}

export async function submitClientPortalOrderRequest(values = {}) {
  const propertyAddress = toStringOrNull(values.propertyAddress);
  const propertyCity = toStringOrNull(values.propertyCity);
  const propertyState = toStringOrNull(values.propertyState);
  const propertyPostalCode = toStringOrNull(values.propertyPostalCode ?? values.propertyZip);
  const propertyType = toStringOrNull(values.propertyType);
  const reportType = toStringOrNull(values.reportType);

  if (!propertyAddress) throw new Error("Property address is required.");
  if (!propertyCity) throw new Error("Property city is required.");
  if (!propertyState) throw new Error("Property state is required.");
  if (!propertyPostalCode) throw new Error("Property ZIP is required.");
  if (!propertyType) throw new Error("Property type is required.");
  if (!reportType) throw new Error("Report type is required.");

  const { data, error } = await supabase.rpc(CLIENT_PORTAL_ORDER_REQUEST_CREATE_RPC, {
    p_property_address: propertyAddress,
    p_property_city: propertyCity,
    p_property_state: propertyState,
    p_property_postal_code: propertyPostalCode,
    p_property_county: toStringOrNull(values.propertyCounty),
    p_property_type: propertyType,
    p_report_type: reportType,
    p_loan_purpose: toStringOrNull(values.loanPurpose),
    p_requested_due_date: toStringOrNull(values.requestedDueDate),
    p_borrower_contact_name: toStringOrNull(values.borrowerContactName),
    p_client_contact_name: toStringOrNull(values.clientContactName),
    p_client_contact_phone: toStringOrNull(values.clientContactPhone),
    p_client_contact_email: toStringOrNull(values.clientContactEmail),
    p_notes: composeClientRequestNotes(values),
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeClientPortalOrderRequest(row || {});
}

export async function readClientPortalInvitation(token) {
  const safeToken = toStringOrNull(token);
  if (!safeToken) {
    throw new Error("client_portal_invitation_token_required");
  }

  const { data, error } = await supabase.rpc(CLIENT_PORTAL_INVITATION_READ_RPC, {
    p_token: safeToken,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientPortalInvitation(row) : null;
}

export async function acceptClientPortalInvitation(token) {
  const safeToken = toStringOrNull(token);
  if (!safeToken) {
    throw new Error("client_portal_invitation_token_required");
  }

  const { data, error } = await supabase.rpc(CLIENT_PORTAL_INVITATION_ACCEPT_RPC, {
    p_token: safeToken,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientPortalInvitation(row) : null;
}

export const clientPortalRpcNames = Object.freeze({
  dashboard: CLIENT_PORTAL_DASHBOARD_RPC,
  listOrders: CLIENT_PORTAL_ORDER_LIST_RPC,
  orderDetail: CLIENT_PORTAL_ORDER_DETAIL_RPC,
  orderRequestCreate: CLIENT_PORTAL_ORDER_REQUEST_CREATE_RPC,
  pendingOrderRequests: CLIENT_PORTAL_PENDING_ORDER_REQUESTS_RPC,
  invitationRead: CLIENT_PORTAL_INVITATION_READ_RPC,
  invitationAccept: CLIENT_PORTAL_INVITATION_ACCEPT_RPC,
  reportDownloadFunction: CLIENT_PORTAL_REPORT_DOWNLOAD_FUNCTION,
});
