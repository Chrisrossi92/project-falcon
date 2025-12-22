// src/lib/logactivity.js
import supabase from './supabaseClient';

export async function fetchActivity(orderId) {
  const { data, error } = await supabase.rpc('get_order_activity_flexible_v3', {
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
  action,
  message = null,
  context = null,
  prev_status = null,
  new_status = null,
}) {
  if (!order_id || !action) throw new Error("logActivity requires order_id and action");
  const { error, data } = await supabase.rpc("rpc_log_event", {
    p_order_id: order_id,
    p_action: action,
    p_message: message,
    p_context: context,
    p_prev_status: prev_status,
    p_new_status: new_status,
  });
  if (error) throw error;
  return data ?? null;
}

