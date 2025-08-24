// src/lib/utils/logOrderEvent.js
import supabase from '@/lib/supabaseClient';

/**
 * Canonical event logger (RPC-only, RLS-safe).
 * Works even if there is no events table; fans out notifications via (order_id, action).
 */
export default async function logOrderEvent(params) {
  const {
    order_id,
    action,
    event_type,
    message,
    prev_status,
    new_status,
    context,
    event_data,
    environment,
    actor,
  } = params || {};

  if (!order_id) throw new Error('logOrderEvent: order_id is required');

  const act = action || event_type || null;
  const baseCtx = context !== undefined ? context : (event_data !== undefined ? event_data : {});
  const ctx = {
    ...(baseCtx || {}),
    ...(environment ? { environment } : {}),
    ...(actor ? { actor } : {}),
  };

  // 1) Write the event via your existing RPC (adjust name if yours differs)
  const { error } = await supabase.rpc('rpc_log_event', {
    p_order_id: order_id,
    p_action: act,
    p_message: message ?? null,
    p_prev_status: prev_status ?? null,
    p_new_status: new_status ?? null,
    p_context: ctx,
  });
  if (error) throw error;

  // 2) IMPORTANT: correct fan-out RPC name + param keys
  const { error: fanoutErr } = await supabase.rpc('rpc_create_notifications_for_order_event', {
    p_order_id: order_id,
    p_action: act,
  });
  if (fanoutErr) throw fanoutErr;

  return { id: null };
}











