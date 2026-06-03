import supabase from "@/lib/supabaseClient";

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

function normalizeBidRequestRecipient(recipient = {}) {
  return {
    vendor_profile_id: recipient.vendor_profile_id || recipient.vendorProfileId || null,
    vendor_company_id: recipient.vendor_company_id || recipient.vendorCompanyId || null,
    relationship_id: recipient.relationship_id || recipient.relationshipId || null,
    candidate_snapshot: recipient.candidate_snapshot || recipient.candidateSnapshot || {},
  };
}

function logBidRequestPayloadDiagnostics(payload) {
  if (import.meta.env?.DEV !== true) return;
  if (import.meta.env?.MODE === "test") return;

  const recipients = Array.isArray(payload?.recipients) ? payload.recipients : [];
  const sampleRecipient = recipients[0] || null;

  console.debug("[bids] rpc_order_vendor_bid_request_create payload diagnostics", {
    payloadKeys: Object.keys(payload || {}),
    recipientCount: recipients.length,
    sampleRecipient,
    sampleRecipientKeys: sampleRecipient ? Object.keys(sampleRecipient) : [],
    responseDueAt: payload?.response_due_at || null,
    desiredVendorDueAt: payload?.desired_vendor_due_at || null,
    clientDueAt: payload?.client_due_at || null,
  });
}

export async function createOrderVendorBidRequest({
  orderId,
  recipients = [],
  message = "",
  responseDueAt = null,
  clientDueAt = null,
  desiredVendorDueAt = null,
  metadata = {},
} = {}) {
  const payload = {
    recipients: recipients.map(normalizeBidRequestRecipient),
    request_message: message || null,
    response_due_at: responseDueAt || null,
    client_due_at: clientDueAt || null,
    desired_vendor_due_at: desiredVendorDueAt || null,
    candidate_snapshot: metadata?.candidate_snapshot || {},
    metadata: metadata || {},
  };

  logBidRequestPayloadDiagnostics(payload);

  return rpc("rpc_order_vendor_bid_request_create", {
    p_order_id: orderId,
    p_payload: payload,
  });
}

export async function listOrderVendorBidRequests(orderId) {
  const data = await rpc("rpc_order_vendor_bid_requests_for_order", {
    p_order_id: orderId,
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchAmcOrderProcurementSummaries(orderIds = []) {
  const normalizedOrderIds = Array.isArray(orderIds) ? orderIds.filter(Boolean) : [];
  if (normalizedOrderIds.length === 0) return [];

  const data = await rpc("rpc_amc_order_procurement_summaries", {
    p_order_ids: normalizedOrderIds,
  });
  return Array.isArray(data) ? data : [];
}

export async function recordOrderVendorBidResponse(recipientId, payload = {}) {
  return rpc("rpc_order_vendor_bid_response_record", {
    p_recipient_id: recipientId,
    p_payload: payload || {},
  });
}

export async function createOrderVendorBidInvitation(recipientId, payload = {}) {
  return rpc("rpc_order_vendor_bid_invitation_create", {
    p_recipient_id: recipientId,
    p_payload: payload || {},
  });
}

export async function readOrderVendorBidInvitation(token) {
  return rpc("rpc_order_vendor_bid_invitation_read", {
    p_token: String(token || "").trim(),
  });
}

export async function selectOrderVendorBidResponse(responseId) {
  return rpc("rpc_order_vendor_bid_response_select", {
    p_response_id: responseId,
  });
}

export async function convertSelectedBidToAssignmentOffer(responseId, payload = {}) {
  return rpc("rpc_order_vendor_bid_response_convert_to_assignment_offer", {
    p_response_id: responseId,
    p_payload: payload || {},
  });
}
