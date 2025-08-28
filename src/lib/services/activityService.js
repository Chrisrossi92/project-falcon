// src/lib/services/activityService.js
import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst.js";

/**
 * Shape we expect for activity rows.
 * If you have an activity_log table, align its columns to these where possible.
 */
export function normalizeActivityRow(r) {
  return {
    id: r.id,
    order_id: r.order_id ?? r.orderId ?? null,
    event_type: r.event_type ?? r.action ?? "event",
    message: r.message ?? r.body ?? null,
    created_at: r.created_at ?? r.createdAt ?? null,
    actor_id: r.actor_id ?? null,
  };
}

/** Fetch an order’s activity (RPC-first, fallback to activity_log). */
export async function fetchOrderActivity(orderId, opts = {}) {
  const limit = Number(opts.limit ?? 50);

  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_activity_list_for_order", { order_id: orderId, page_limit: limit }),
    async () => {
      const { data: rows, error: err } = await supabase
        .from("activity_log")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return { data: rows, error: err };
    }
  );

  if (error) throw error;
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizeActivityRow);
}

/** Log a generic event (RPC-only with safe fallback). */
export async function logOrderEvent(orderId, eventType, message) {
  const { error } = await rpcFirst(
    () => supabase.rpc("rpc_log_event", { order_id: orderId, event_type: eventType, message }),
    async () => {
      const { error: err } = await supabase
        .from("activity_log")
        .insert({ order_id: orderId, event_type: eventType, message });
      return { data: null, error: err };
    }
  );
  if (error) throw error;
}

/** Log a freeform note (RPC-first, fallback insert). */
export async function logNote(orderId, message) {
  const { error } = await rpcFirst(
    () => supabase.rpc("rpc_log_note", { order_id: orderId, message }),
    async () => {
      const { error: err } = await supabase
        .from("activity_log")
        .insert({ order_id: orderId, event_type: "note", message });
      return { data: null, error: err };
    }
  );
  if (error) throw error;
}

/** Realtime subscription for activity on a specific order. */
export function subscribeOrderActivity(orderId, onChange) {
  const channel = supabase
    .channel(`order-activity:${orderId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "activity_log", filter: `order_id=eq.${orderId}` },
      () => onChange?.()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

