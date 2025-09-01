// src/lib/api/orders.js
import supabase from "@/lib/supabaseClient";

/**
 * Orders list for the Orders page.
 * Pulls UI-friendly fields from the v_orders_frontend view.
 */
export async function fetchOrdersForList({ limit = 500, ascending = false } = {}) {
  const { data, error } = await supabase
    .from("v_orders_frontend")
    .select(`
      id,
      order_no,
      display_title,
      display_subtitle,
      client_name,
      appraiser_name,
      status,
      due_date,
      fee_amount,
      date_ordered
    `)
    .order("date_ordered", { ascending })
    .limit(limit);

  if (error) {
    console.error("fetchOrdersForList error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Back-compat aliases in case other parts of the app import different names.
 * These all return the same list as fetchOrdersForList.
 */
export const fetchOrders = (opts) => fetchOrdersForList(opts);
export const getOrders = (opts) => fetchOrdersForList(opts);
export const listOrders = (opts) => fetchOrdersForList(opts);

/**
 * Single order (UI-friendly) by id — handy for detail drawers/cards.
 */
export async function fetchOrderForView(orderId) {
  const { data, error } = await supabase
    .from("v_orders_frontend")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("fetchOrderForView error:", error);
    return null;
  }
  return data;
}

/**
 * Update site visit datetime on the order,
 * and mirror to calendar via RPC when possible.
 */
export const updateSiteVisitAt = async (orderId, newDateTime, extras) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ site_visit_at: newDateTime })
    .eq("id", orderId)
    .select();

  if (error) {
    console.error("Error updating site visit:", error);
    return null;
  }

  // Best-effort calendar event mirror (non-blocking)
  try {
    await supabase.rpc("rpc_create_calendar_event", {
      p_event_type: "site_visit",
      p_title: `Site Visit – ${extras?.address || "Subject"}`,
      p_start_at: newDateTime,
      p_end_at: newDateTime,
      p_order_id: orderId,
      p_appraiser_id: extras?.appraiserId ?? null,
      p_location: extras?.address ?? null,
      p_notes: null,
    });
  } catch (e) {
    console.warn("rpc_create_calendar_event (site_visit) failed:", e?.message);
  }

  return data?.[0] || null;
};

export const fetchSiteVisitAt = async (orderId) => {
  const { data, error } = await supabase
    .from("orders")
    .select("site_visit_at")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching site visit:", error);
    return null;
  }

  return data;
};
