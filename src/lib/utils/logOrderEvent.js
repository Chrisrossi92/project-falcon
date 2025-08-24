// src/lib/utils/logOrderEvent.js
import supabase from "@/lib/supabaseClient";

/** RPC-only logger (RLS-safe).
 * Accepts legacy keys: event_type, event_data, environment, actor.
 */
export default async function logOrderEvent(params) {
  const {
    order_id,
    action,
    event_type,   // legacy
    message,
    prev_status,
    new_status,
    context,      // canonical
    event_data,   // legacy
    environment,  // legacy
    actor,        // legacy
  } = params || {};

  const act = action || event_type;
  const baseCtx = context !== undefined ? context : (event_data !== undefined ? event_data : {});
  const ctx = {
    ...baseCtx,
    ...(environment ? { environment } : {}),
    ...(actor ? { actor } : {}),
  };

  if (!order_id || !act) throw new Error("logOrderEvent: require order_id and action/event_type");

  const { data, error } = await supabase.rpc("rpc_log_event", {
    p_order_id:   order_id,
    p_action:     act,
    p_message:    message ?? null,
    p_prev_status:prev_status ?? null,
    p_new_status: new_status ?? null,
    p_context:    ctx,
  });

  if (error) throw error;
  return data;
}







