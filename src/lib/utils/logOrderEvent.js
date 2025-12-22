// src/lib/utils/logOrderEvent.js
import supabase from "@/lib/supabaseClient";

/**
 * Log a normalized activity entry for an order via RPC (no direct inserts).
 *
 * @param {Object} payload
 * @param {string} payload.order_id            - REQUIRED
 * @param {string} payload.action              - e.g., "order_created", "status_changed"
 * @param {string} [payload.message]           - human-readable message
 * @param {string} [payload.event_type]        - optional machine tag, e.g., "appointment"
 * @param {Object} [payload.event_data]        - optional JSON payload
 * @param {Object} [payload.actor]             - { user_id, email, source }
 */
export default async function logOrderEvent(payload = {}) {
  const {
    order_id,
    action,
    message = null,
    event_type = null,
    event_data = null,
    actor: actorIn = null,
  } = payload || {};

  if (!order_id) throw new Error("[logOrderEvent] order_id is required");
  if (!action) throw new Error("[logOrderEvent] action is required");

  // Build actor if not provided
  let actor = actorIn || { source: "ui" };
  try {
    if (!actor.user_id || !actor.email) {
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;
      actor = {
        user_id: actor.user_id || u?.id || null,
        email: actor.email || u?.email || null,
        source: actor.source || "ui",
      };
    }
  } catch {
    // non-fatal; leave actor as-is
  }

  const { data, error: rpcErr } = await supabase.rpc("rpc_log_event", {
    p_order_id: order_id,
    p_event_type: event_type || action,
    p_message: message,
    p_payload: {
      event_data: event_data ?? null,
      actor,
    },
  });

  if (rpcErr) throw rpcErr;
  return data || { ok: true };
}











