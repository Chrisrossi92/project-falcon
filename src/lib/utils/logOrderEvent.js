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
    orderId,
    action,
    event_type = null,
    message = null,
    prev_status = null,
    new_status = null,
    from = null,
    to = null,
    review_due_at = null,
    final_due_at = null,
    site_visit_at = null,
    event_data = null,
    actor: actorIn = null,
    assignee = null, // { field, to_id, to_name, to_email }
  } = payload || {};

  const oid = order_id || orderId;
  if (!oid) throw new Error("[logOrderEvent] order_id is required");
  const evt = event_type || action;
  if (!evt) throw new Error("[logOrderEvent] action is required");

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

  const detail = {
    from: prev_status ?? from ?? null,
    to: new_status ?? to ?? null,
    review_due_at: review_due_at ?? null,
    final_due_at: final_due_at ?? null,
    site_visit_at: site_visit_at ?? null,
    assignee_field: assignee?.field ?? null,
    assignee_to_id: assignee?.to_id ?? null,
    assignee_to_name: assignee?.to_name ?? null,
    assignee_to_email: assignee?.to_email ?? null,
    event_data: event_data ?? null,
  };

  // Remove nulls to avoid {} noise
  Object.keys(detail).forEach((k) => detail[k] == null && delete detail[k]);

  // If nothing to log besides message, keep detail empty
  const hasDetail = Object.keys(detail).length > 0;

  const { data, error: rpcErr } = await supabase.rpc("rpc_log_event", {
    p_order_id: oid,
    p_event_type: evt,
    p_details: hasDetail ? detail : {},
    p_message: message,
  });

  if (rpcErr) throw rpcErr;
  return data || { ok: true };
}










