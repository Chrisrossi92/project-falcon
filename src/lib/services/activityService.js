// src/lib/services/activityService.js
import supabase from "@/lib/supabaseClient";

// normalize row for UI
function shape(row) {
  return {
    id: row.id,
    order_id: row.order_id,
    event_type: row.event_type,
    message: row.message ?? row.note ?? "",
    created_at: row.created_at,
    created_by: row.created_by,
    // try server value, joined profile name/email, then cached email
    created_by_name:
      row.created_by_name ||
      row.profiles?.full_name ||
      null,
    created_by_email:
      row.profiles?.email || row.created_by_email || null,
  };
}

// Read feed (include joined name+email when profiles exists)
export async function listOrderActivity(orderId) {
  const { data, error } = await supabase
    .from("activity_log")
    .select(`
      id, order_id, event_type, message, created_at, created_by, created_by_name, created_by_email,
      profiles:created_by ( full_name, email )
    `)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(shape);
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
  const { data: userRes, error: uerr } = await supabase.auth.getUser();
  if (uerr) throw uerr;
  const user = userRes?.user;

  const authorName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    null;

  const authorEmail = user?.email || null;

  const { data, error } = await supabase
    .from("activity_log")
    .insert([{
      order_id: orderId,
      event_type: "note_added",
      message,
      created_by: user?.id ?? null,
      created_by_name: authorName,  // cache so UI has a name even if join fails
      created_by_email: authorEmail // cache email as fallback
    }])
    .select()
    .single();

  if (error) throw error;
  return shape(data);
}















