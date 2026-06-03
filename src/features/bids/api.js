import supabase from "@/lib/supabaseClient";

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
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
  return rpc("rpc_order_vendor_bid_request_create", {
    p_order_id: orderId,
    p_payload: {
      recipients,
      request_message: message || null,
      response_due_at: responseDueAt || null,
      client_due_at: clientDueAt || null,
      desired_vendor_due_at: desiredVendorDueAt || null,
      metadata: metadata || {},
    },
  });
}

export async function listOrderVendorBidRequests(orderId) {
  const data = await rpc("rpc_order_vendor_bid_requests_for_order", {
    p_order_id: orderId,
  });
  return Array.isArray(data) ? data : [];
}

export async function recordOrderVendorBidResponse(recipientId, payload = {}) {
  return rpc("rpc_order_vendor_bid_response_record", {
    p_recipient_id: recipientId,
    p_payload: payload || {},
  });
}

export async function selectOrderVendorBidResponse(responseId) {
  return rpc("rpc_order_vendor_bid_response_select", {
    p_response_id: responseId,
  });
}
