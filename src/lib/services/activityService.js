// src/lib/services/activityService.js
import supabase from "@/lib/supabaseClient";

/**
 * Fetch activity entries for a specific order.
 * Returns newest-first items with lightweight fields.
 */
export async function fetchOrderActivity(orderId, { limit = 100 } = {}) {
  if (!orderId) return [];
  const { data, error } = await supabase
    .from("order_activity")
    .select("id, order_id, action, message, event_type, event_data, created_at, actor")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
