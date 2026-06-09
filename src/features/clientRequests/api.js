import supabase from "@/lib/supabaseClient";

const CLIENT_REQUEST_LIST_RPC = "rpc_client_portal_order_requests_for_review";
const CLIENT_REQUEST_DETAIL_RPC = "rpc_client_portal_order_request_review_detail";
const CLIENT_REQUEST_UPDATE_STATUS_RPC = "rpc_client_portal_order_request_review_update_status";
const CLIENT_REQUEST_CONVERT_RPC = "rpc_client_portal_order_request_convert_to_order";

const toStringOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

function normalizeClientRequest(row = {}) {
  const requestKey = toStringOrNull(row.request_key ?? row.requestKey);
  if (!requestKey) return null;

  return {
    requestKey,
    status: toStringOrNull(row.status) || "submitted",
    clientName: toStringOrNull(row.client_name ?? row.clientName) || "Client",
    propertyAddress: toStringOrNull(row.property_address ?? row.propertyAddress) || "Property address pending",
    propertyCity: toStringOrNull(row.property_city ?? row.propertyCity),
    propertyState: toStringOrNull(row.property_state ?? row.propertyState),
    propertyPostalCode: toStringOrNull(row.property_postal_code ?? row.propertyPostalCode ?? row.property_zip ?? row.propertyZip),
    propertyCounty: toStringOrNull(row.property_county ?? row.propertyCounty),
    propertyType: toStringOrNull(row.property_type ?? row.propertyType),
    reportType: toStringOrNull(row.report_type ?? row.reportType),
    loanPurpose: toStringOrNull(row.loan_purpose ?? row.loanPurpose),
    requestedDueDate: toStringOrNull(row.requested_due_date ?? row.requestedDueDate),
    borrowerContactName: toStringOrNull(row.borrower_contact_name ?? row.borrowerContactName),
    clientContactName: toStringOrNull(row.client_contact_name ?? row.clientContactName),
    clientContactPhone: toStringOrNull(row.client_contact_phone ?? row.clientContactPhone),
    clientContactEmail: toStringOrNull(row.client_contact_email ?? row.clientContactEmail),
    notes: toStringOrNull(row.notes),
    submittedAt: toStringOrNull(row.submitted_at ?? row.submittedAt),
    reviewedAt: toStringOrNull(row.reviewed_at ?? row.reviewedAt),
    requestedByName: toStringOrNull(row.requested_by_name ?? row.requestedByName),
    requestedByEmail: toStringOrNull(row.requested_by_email ?? row.requestedByEmail),
    reviewedByName: toStringOrNull(row.reviewed_by_name ?? row.reviewedByName),
    reviewedByEmail: toStringOrNull(row.reviewed_by_email ?? row.reviewedByEmail),
    acceptedOrderId: toStringOrNull(row.accepted_order_id ?? row.acceptedOrderId),
    acceptedOrderNumber: toStringOrNull(row.accepted_order_number ?? row.acceptedOrderNumber),
  };
}

export async function listClientOrderRequestsForReview() {
  const { data, error } = await supabase.rpc(CLIENT_REQUEST_LIST_RPC);
  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map(normalizeClientRequest)
    .filter(Boolean);
}

export async function getClientOrderRequestReviewDetail(requestKey) {
  const safeRequestKey = toStringOrNull(requestKey);
  if (!safeRequestKey) {
    throw new Error("client_portal_order_request_key_required");
  }

  const { data, error } = await supabase.rpc(CLIENT_REQUEST_DETAIL_RPC, {
    p_request_key: safeRequestKey,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientRequest(row) : null;
}

export async function updateClientOrderRequestReviewStatus(requestKey, status) {
  const safeRequestKey = toStringOrNull(requestKey);
  const safeStatus = toStringOrNull(status);
  if (!safeRequestKey) {
    throw new Error("client_portal_order_request_key_required");
  }
  if (!safeStatus) {
    throw new Error("client_portal_order_request_status_required");
  }

  const { data, error } = await supabase.rpc(CLIENT_REQUEST_UPDATE_STATUS_RPC, {
    p_request_key: safeRequestKey,
    p_status: safeStatus,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientRequest(row) : null;
}

export async function convertClientOrderRequestToOrder(requestKey) {
  const safeRequestKey = toStringOrNull(requestKey);
  if (!safeRequestKey) {
    throw new Error("client_portal_order_request_key_required");
  }

  const { data, error } = await supabase.rpc(CLIENT_REQUEST_CONVERT_RPC, {
    p_request_key: safeRequestKey,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    requestKey: toStringOrNull(row.request_key ?? row.requestKey),
    status: toStringOrNull(row.status) || "accepted",
    orderId: toStringOrNull(row.order_id ?? row.orderId),
    orderNumber: toStringOrNull(row.order_number ?? row.orderNumber),
    propertyAddress: toStringOrNull(row.property_address ?? row.propertyAddress),
    clientName: toStringOrNull(row.client_name ?? row.clientName),
  };
}

export const clientRequestReviewRpcNames = Object.freeze({
  list: CLIENT_REQUEST_LIST_RPC,
  detail: CLIENT_REQUEST_DETAIL_RPC,
  updateStatus: CLIENT_REQUEST_UPDATE_STATUS_RPC,
  convert: CLIENT_REQUEST_CONVERT_RPC,
});
