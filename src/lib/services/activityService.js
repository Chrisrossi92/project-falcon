// src/lib/services/activityService.js
import supabase from "@/lib/supabaseClient";

/** Normalize DB row → UI shape expected in Activity components */
function toUi(row) {
  if (!row) return null;
  const actor = row.created_by ?? row.user_id ?? null;
  return {
    id: row.id,
    order_id: row.order_id,
    created_at: row.created_at,
    created_by: actor,                 // prefer created_by, fallback user_id
    user_id: actor,                    // keep a unified "actor" under user_id too

    // Friendly fields Activity UIs expect:
    event_type: row.event_type ?? row.event ?? row.action ?? null,
    message: row.message ?? row.note ?? null,

    // Originals kept for other callers:
    action: row.action ?? null,
    note: row.note ?? null,
  };
}

/** Fetch recent activity rows for a given order (default 50). Throws on error. */
export async function listOrderActivity(orderId, { limit = 50 } = {}) {
  if (!orderId) return [];
  const { data, error } = await supabase
    .from("order_activity")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(toUi);
}

/** Back-compat names used elsewhere */
export function fetchOrderActivity(orderId, opts = {}) {
  return listOrderActivity(orderId, opts);
}
export const getOrderActivity = listOrderActivity;

/**
 * Realtime subscription for new activity on an order.
 * Calls onChange() on each INSERT. Returns an unsubscribe function.
 */
export function subscribeOrderActivity(orderId, onChange) {
  if (!orderId) return () => {};
  const channel = supabase
    .channel(`order-activity:${orderId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "order_activity", filter: `order_id=eq.${orderId}` },
      () => { try { onChange?.(); } catch {} }
    )
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

/**
 * Add a free-form note to an order’s activity log.
 * RPC-only (server handles schema differences & RLS).
 */
export async function logNote(orderId, message) {
  if (!orderId) throw new Error("orderId required");
  const text = String(message || "").trim();
  if (!text) return true;

  const { data, error } = await supabase.rpc("rpc_order_log_note", {
    p_order_id: orderId,
    p_note: text,
  });
  if (error) throw error;
  return data ?? true;
}

export default {
  listOrderActivity,
  fetchOrderActivity,
  getOrderActivity,
  subscribeOrderActivity,
  logNote,
};






