// src/lib/logactivity.js
import supabase from './supabaseClient';

export async function fetchActivity(orderId) {
  const { data, error } = await supabase.rpc("rpc_get_activity_feed", {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Log an activity event via RPC (fallback for review flow).
 */
export async function logActivity({
  order_id,
  orderId,
  action,
  message = null,
  context = null,
  prev_status = null,
  new_status = null,
}) {
  const oid = order_id || orderId;
  if (!oid || !action) throw new Error("logActivity requires order_id and action");
  const detail = {
    context,
    from: prev_status,
    to: new_status,
  };
  Object.keys(detail).forEach((k) => detail[k] == null && delete detail[k]);
  const hasDetail = Object.keys(detail).length > 0;
  const { error, data } = await supabase.rpc("rpc_log_event", {
    p_order_id: oid,
    p_event_type: action,
    p_details: hasDetail ? detail : {},
    p_message: message,
  });
  if (error) throw new Error(error.message || "Failed to log activity");
  return data ?? null;
}
