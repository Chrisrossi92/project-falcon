// src/lib/services/activityService.js
import supabase from "@/lib/supabaseClient";

function normalize(row = {}) {
  return {
    id: row.id,
    order_id: row.order_id,
    event_type: row.event_type,
    created_at: row.created_at,
    actor_id: row.actor_id ?? null,
    actor_name: row.actor_name ?? null,
    detail: row.detail ?? row.details ?? row.data ?? row.payload ?? {},
  };
}

export async function listOrderActivity(orderId) {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function logNote(orderId, text) {
  const payload = { text: String(text || "").trim() };
  if (!payload.text) return false;
  const { error } = await supabase.rpc("rpc_log_event", {
    p_order_id: orderId,
    p_type: "note_added",
    p_detail: payload,
  });
  if (error) throw error;
  return true;
}

/** Realtime: listen to both INSERT and UPDATE for this order_id */
export function subscribeOrderActivity(orderId, onChange) {
  if (!orderId || typeof onChange !== "function") return () => {};
  const channel = supabase
    .channel(`activity:order:${orderId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_log", filter: `order_id=eq.${orderId}` },
      (payload) => onChange(normalize(payload.new || {}))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "activity_log", filter: `order_id=eq.${orderId}` },
      (payload) => onChange(normalize(payload.new || {}))
    )
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch {} };
}











