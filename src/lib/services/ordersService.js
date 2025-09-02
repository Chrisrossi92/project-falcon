// src/lib/services/ordersService.js
import supabase from "@/lib/supabaseClient";

/* Helpers */
function toISO(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Normalize a row so consumers can always use `row.id` */
function normalizeOrder(row) {
  if (!row) return row;
  const id = row.id ?? row.order_id ?? row.orderid ?? null;
  return id != null && !("id" in row) ? { ...row, id } : row;
}

/* READS (view; RLS governs) */
export async function listOrders({ search, status, since, until, appraiserId } = {}) {
  let q = supabase
    .from("v_orders_list_with_last_activity")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (status) q = q.eq("status", status);
  if (since) q = q.gte("due_date", toISO(since));
  if (until) q = q.lte("due_date", toISO(until));
  if (appraiserId) q = q.eq("appraiser_id", appraiserId);

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`address.ilike.${s},order_number.ilike.${s},client_name.ilike.${s}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(normalizeOrder);
}
export const fetchOrders = listOrders;

// Robust fetch that works with id | order_id | orderid
export async function getOrderById(orderId) {
  if (!orderId) return null;

  const cols = ["id", "order_id", "orderid"]; // try all common keys
  let lastErr = null;

  for (const col of cols) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await supabase
      .from("v_orders_list_with_last_activity")
      .select("*")
      .eq(col, orderId)
      .maybeSingle();

    if (data) {
      // normalize so the rest of the UI can always use row.id
      const id = data.id ?? data.order_id ?? data.orderid ?? null;
      return id != null && !("id" in data) ? { ...data, id } : data;
    }
    if (error) lastErr = error; // keep the last error, but keep trying others
  }

  // If none worked, surface the most recent error (or null → not found)
  if (lastErr) throw lastErr;
  return null;


  // Try by 'id' first
  let res = await supabase
    .from("v_orders_list_with_last_activity")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  // If the view doesn't have 'id', fall back to 'order_id'
  if (res.error && /column .* id .* does not exist/i.test(res.error.message)) {
    res = await supabase
      .from("v_orders_list_with_last_activity")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
  }

  if (res.error) throw res.error;
  return res.data ? normalizeOrder(res.data) : null;
}
export function fetchOrderById(orderId) { return getOrderById(orderId); }

/* WRITES (RPC-only) */
export async function createOrder(payload) {
  const { data, error } = await supabase.rpc("rpc_order_create", { p: payload });
  if (error) throw error;
  return data;
}

export async function updateOrder(orderId, patch) {
  const { data, error } = await supabase.rpc("rpc_order_update", {
    p_order_id: String(orderId),
    p_patch: patch,
  });
  if (error) throw error;
  return data;
}

export async function updateOrderDates(orderId, { siteVisit, reviewDue, finalDue } = {}) {
  const { data, error } = await supabase.rpc("rpc_order_update_dates", {
    p_order_id: String(orderId),
    p_site_visit_at: toISO(siteVisit),
    p_review_due_at: toISO(reviewDue),
    p_final_due_at: toISO(finalDue),
    p_due_date: toISO(finalDue) || toISO(reviewDue) || toISO(siteVisit) || null,
  });
  if (error) throw error;
  return data;
}

export async function assignAppraiser(orderId, appraiserId) {
  const { data, error } = await supabase.rpc("rpc_order_assign_appraiser", {
    p_order_id: String(orderId),
    p_appraiser_id: appraiserId ? String(appraiserId) : null,
  });
  if (error) throw error;
  return data ?? true;
}

export async function isOrderNumberAvailable(orderNumber, { ignoreOrderId } = {}) {
  const { data, error } = await supabase.rpc("rpc_is_order_number_available", {
    p_order_number: orderNumber || null,
    p_ignore_order_id: ignoreOrderId ? String(ignoreOrderId) : null,
  });
  if (error) throw error;
  return !!data;
}

export async function deleteOrder(orderId) {
  const { data, error } = await supabase.rpc("rpc_order_delete", { p_order_id: String(orderId) });
  if (error) throw error;
  return data ?? true;
}

/* REVIEW / WORKFLOW (RPC-only) */
export async function approveReview(orderId, note = null) {
  const { data, error } = await supabase.rpc("rpc_review_approve", { p_order_id: String(orderId), p_note: note });
  if (error) throw error; return data ?? true;
}
export async function requestRevisions(orderId, note = null) {
  const { data, error } = await supabase.rpc("rpc_review_request_revisions", { p_order_id: String(orderId), p_note: note });
  if (error) throw error; return data ?? true;
}
export async function startReview(orderId) {
  const { data, error } = await supabase.rpc("rpc_review_start", { p_order_id: String(orderId) });
  if (error) throw error; return data ?? true;
}
export async function markReadyToSend(orderId) {
  const { data, error } = await supabase.rpc("rpc_order_ready_to_send", { p_order_id: String(orderId) });
  if (error) throw error; return data ?? true;
}
export async function markComplete(orderId, note = null) {
  const { data, error } = await supabase.rpc("rpc_order_mark_complete", { p_order_id: String(orderId), p_note: note });
  if (error) throw error; return data ?? true;
}
export async function sendToClient(orderId, payload = {}) {
  const { data, error } = await supabase.rpc("rpc_order_send_to_client", { p_order_id: String(orderId), p_payload: payload });
  if (error) throw error; return data ?? true;
}
export async function setOrderStatus(orderId, status) {
  const { data, error } = await supabase.rpc("rpc_order_set_status", { p_order_id: String(orderId), p_status: status });
  if (error) throw error; return data ?? true;
}

export default {
  listOrders, fetchOrders,
  getOrderById, fetchOrderById,
  createOrder, updateOrder, updateOrderDates,
  assignAppraiser, isOrderNumberAvailable, deleteOrder,
  startReview, approveReview, requestRevisions, markReadyToSend, markComplete, sendToClient, setOrderStatus,
};





























