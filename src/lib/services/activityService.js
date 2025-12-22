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
    message: row.message ?? statusMsg ?? row.note ?? "",
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
    console.error("[listOrderActivity] RPC failed, attempting fallback", err);
    const { data, error: tblErr } = await supabase
      .from("activity_log")
      .select(`
        id, order_id, event_type, message, created_at, created_by, created_by_name, created_by_email,
        profiles:created_by ( full_name, email )
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (tblErr) throw tblErr;
    return (data || []).map(shape);
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

  const { data, error } = await supabase.rpc("rpc_log_note", {
    p_order_id: orderId,
    p_message: message,
  });

  if (error) {
    // Surface a clearer failure to the UI
    const msg = error?.message || "Failed to log note";
    throw new Error(`${msg} (ensure activity migrations are applied)`);
  }
  return shape(data);
}












