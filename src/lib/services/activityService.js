// src/lib/services/activityService.js
import supabase from "@/lib/supabaseClient";

// normalize row for UI
function shape(row) {
  const from =
    row?.detail?.from_status ||
    row?.detail?.from ||
    row?.prev_status ||
    null;
  const to =
    row?.detail?.to_status ||
    row?.detail?.to ||
    row?.new_status ||
    null;
  const statusMsg =
    row?.event_type === "status_changed" && from && to
      ? `Status changed: ${from} → ${to}`
      : null;

  return {
    id: row.id,
    order_id: row.order_id,
    event_type: row.event_type,
    message: row.message ?? statusMsg ?? row.note ?? row.body ?? "",
    body: row.body ?? row.message ?? statusMsg ?? row.note ?? "",
    title: row.title ?? null,
    created_at: row.created_at,
    created_by: row.created_by,
    created_by_name: row.created_by_name || null,
    created_by_email: row.created_by_email || null,
    detail: row.detail || null,
  };
}

// Read feed (include joined name+email when profiles exists)
export async function listOrderActivity(orderId) {
  try {
    const { data, error } = await supabase.rpc("rpc_get_activity_feed", {
      p_order_id: orderId,
    });
    if (error) throw error;
    return (data || []).map(shape);
  } catch (err) {
    console.error("[listOrderActivity] RPC failed", err);
    throw err;
  }
}

// Realtime inserts (hydrate name/email if needed)
export function subscribeOrderActivity(orderId, cb) {
  const channel = supabase
    .channel(`activity:${orderId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_log", filter: `order_id=eq.${orderId}` },
      async ({ new: row }) => {
        // if missing display fields, try enrich from profiles
        if ((!row.created_by_name || !row.created_by_email) && row.created_by) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", row.created_by)
            .maybeSingle();
          if (data) {
            row.created_by_name ||= data.full_name || null;
            row.created_by_email ||= data.email || null;
          }
        }
        cb(shape(row));
      }
    )
    .subscribe();

  return () => { try { supabase.removeChannel(channel); } catch {} };
}

// Insert a note with cached author info for robustness
export async function logNote(orderId, message) {
  if (!orderId) throw new Error("Missing orderId");

  const { data: newId, error } = await supabase.rpc("rpc_log_event", {
    p_order_id: orderId,
    p_event_type: "note",
    p_details: { note: message },
  });

  if (error) {
    // Surface a clearer failure to the UI
    const msg = error?.message || "Failed to log note";
    throw new Error(`${msg} (ensure activity migrations are applied)`);
  }
  // Best-effort fetch of the new row via feed
  const feed = await listOrderActivity(orderId);
  const found = feed.find((r) => r.id === newId) || null;
  return found || { id: newId, order_id: orderId, event_type: "note", message, created_at: new Date().toISOString() };
}








