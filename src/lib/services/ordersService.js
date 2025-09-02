// src/lib/services/ordersService.js
import supabase from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ *
 * Utilities
 * ------------------------------------------------------------------ */
function isRpcMissing(error) {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("404") || msg.includes("not found") || msg.includes("does not exist");
}

/* ------------------------------------------------------------------ *
 * Reads (views only)
 * ------------------------------------------------------------------ */

/**
 * List orders (filters/pagination). Uses v_orders_frontend.
 * NOTE: Selects only columns that exist in your current view.
 */
export async function listOrders({
  search = "",
  statusIn = [],
  clientId = null,
  appraiserId = null,
  from = "",
  to = "",
  activeOnly = true,
  page = 0,
  pageSize = 50,
  orderBy = "date_ordered",
  ascending = false,
} = {}) {
  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let q = supabase
    .from("v_orders_frontend")
    .select(
      `
        id,
        order_no,
        display_title,
        display_subtitle,
        address,
        client_name,
        appraiser_name,
        status,
        fee_amount,
        date_ordered,
        due_date
      `,
      { count: "exact" }
    );

  if (activeOnly) q = q.neq("status", "Completed");

  if (search) {
    const like = `%${search}%`;
    q = q.or(
      [
        `order_no.ilike.${like}`,
        `display_title.ilike.${like}`,
        `display_subtitle.ilike.${like}`,
        `address.ilike.${like}`,
        `client_name.ilike.${like}`,
      ].join(",")
    );
  }

  if (statusIn?.length) q = q.in("status", statusIn);
  if (clientId) q = q.eq("client_id", clientId);
  if (appraiserId) q = q.eq("appraiser_id", appraiserId);
  if (from) q = q.gte("date_ordered", from);
  if (to) q = q.lte("date_ordered", to);

  q = q.order(orderBy, { ascending }).range(fromIdx, toIdx);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0, page, pageSize };
}

/** Get one order (detail) via v_orders_frontend */
export async function getOrder(orderId) {
  const { data, error } = await supabase
    .from("v_orders_frontend")
    .select(
      `
        id,
        order_no,
        address,
        client_name,
        appraiser_name,
        status,
        fee_amount,
        date_ordered,
        due_date
      `
    )
    .eq("id", orderId)
    .single();

  if (error) throw error;

  // Normalize to fields some UI expects; leave missing ones null
  return {
    ...data,
    order_number: data?.order_no ?? null,
    site_visit_date: null,
    review_due_date: null,
    final_due_date: null,
    last_activity_at: null,
    created_at: null,
  };
}

// Compatibility aliases
export const fetchOrderById = getOrder;
export async function fetchOrders(options = {}) { return listOrders(options); }

/* ------------------------------------------------------------------ *
 * Writes (RPC-only with safe fallbacks)
 * ------------------------------------------------------------------ */

export async function createOrder(payload) {
  const { data, error } = await supabase.rpc("rpc_order_create", { p: payload });
  if (!error && data) return data;

  if (!error || !isRpcMissing(error)) throw error;
  const { data: row, error: e2 } = await supabase.from("orders").insert(payload).select("*").single();
  if (e2) throw e2;
  return row;
}

export async function updateOrder(orderId, patch) {
  const { data, error } = await supabase.rpc("rpc_order_update", { p_order_id: orderId, p: patch });
  if (!error && data) return data;

  if (!error || !isRpcMissing(error)) throw error;
  const { data: row, error: e2 } = await supabase.from("orders").update(patch).eq("id", orderId).select("*").single();
  if (e2) throw e2;
  return row;
}

export async function setOrderStatus(orderId, status, note = null) {
  const { data, error } = await supabase.rpc("rpc_order_set_status", {
    p_order_id: orderId, p_status: status, p_note: note,
  });
  if (error) throw error;
  return data;
}

export async function setOrderDates(orderId, { site_visit_at, review_due_at, final_due_at, due_date }) {
  const { data, error } = await supabase.rpc("rpc_order_set_dates", {
    p_order_id: orderId,
    p_site_visit_at: site_visit_at ?? null,
    p_review_due_at: review_due_at ?? null,
    p_final_due_at: final_due_at ?? null,
    p_due_date: due_date ?? null,
  });
  if (error) throw error;
  return data;
}

export async function assignParticipants(orderId, { appraiser_id = null, reviewer_id = null }) {
  const { data, error } = await supabase.rpc("rpc_order_assign", {
    p_order_id: orderId, p_appraiser_id: appraiser_id, p_reviewer_id: reviewer_id,
  });
  if (!error) return data;

  if (!isRpcMissing(error)) throw error;
  const patch = {};
  if (appraiser_id !== null) patch.appraiser_id = appraiser_id;
  if (reviewer_id !== null) patch.reviewer_id = reviewer_id;
  if (Object.keys(patch).length === 0) return null;

  const { data: row, error: e2 } = await supabase.from("orders").update(patch).eq("id", orderId).select("*").single();
  if (e2) throw e2;
  return row;
}

export async function assignAppraiser(orderId, appraiser_id) { return assignParticipants(orderId, { appraiser_id, reviewer_id: null }); }
export async function assignReviewer(orderId, reviewer_id) { return assignParticipants(orderId, { appraiser_id: null, reviewer_id }); }

export async function archiveOrder(orderId) {
  const { error } = await supabase.rpc("rpc_order_archive", { p_order_id: orderId });
  if (!error) return;
  if (!isRpcMissing(error)) throw error;
  const { error: e2 } = await supabase.from("orders").update({ is_archived: true }).eq("id", orderId);
  if (e2) throw e2;
}

export async function deleteOrder(orderId) {
  const { error } = await supabase.rpc("rpc_order_delete", { p_order_id: orderId });
  if (!error) return;
  if (!isRpcMissing(error)) throw error;
  const { error: e2 } = await supabase.from("orders").delete().eq("id", orderId);
  if (e2) throw e2;
}

/* ------------------------------------------------------------------ *
 * Workflow convenience helpers (what your UI imports)
 * ------------------------------------------------------------------ */
export async function startReview(orderId, note = null)        { return setOrderStatus(orderId, "in_review",     note); }
export async function requestRevisions(orderId, note = null)    { return setOrderStatus(orderId, "revisions",     note); }
export async function approveReview(orderId, note = null)       { return setOrderStatus(orderId, "ready_to_send", note); }
export async function markReadyToSend(orderId, note = null)     { return setOrderStatus(orderId, "ready_to_send", note); }
export async function markComplete(orderId, note = null)        { return setOrderStatus(orderId, "complete",      note); }
export async function putOnHold(orderId, note = null)           { return setOrderStatus(orderId, "on_hold",       note); }
export async function resumeInProgress(orderId, note = null)    { return setOrderStatus(orderId, "in_progress",   note); }
export async function sendToClient(orderId, note = null)        { return setOrderStatus(orderId, "delivered",     note); }
export async function markDelivered(orderId, note = null)       { return sendToClient(orderId, note); }

// Compatibility aliases
export async function updateOrderDates(orderId, patch)          { return setOrderDates(orderId, patch); }
export async function updateOrderStatus(orderId, status, note)  { return setOrderStatus(orderId, status, note); }
export async function updateAssignees(orderId, patch)           { return assignParticipants(orderId, patch); }

/** Check if an order number is available (optionally exclude a specific order id). */
export async function isOrderNumberAvailable(orderNo, { excludeId = null } = {}) {
  const { data, error } = await supabase.rpc("rpc_is_order_number_available", {
    p_order_no: orderNo, p_exclude_id: excludeId,
  });
  if (!error && typeof data === "boolean") return data;

  let q = supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_no", orderNo);
  if (excludeId) q = q.neq("id", excludeId);
  const { count, error: e2 } = await q;
  if (e2) throw e2;
  return (count || 0) === 0;
}




































