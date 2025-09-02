// src/lib/services/calendarService.js
import supabase from "@/lib/supabaseClient";

// Flip to true once you create rpc_list_admin_events in DB
const USE_RPC = false;

/**
 * listAdminEvents({ start: Date, end: Date, appraiserId?: string|null })
 * v_admin_calendar columns used here (from your screenshot):
 *   order_id (uuid), event_type (text), start_at (timestamptz), end_at (timestamptz),
 *   appraiser_id (uuid|nil), address (text)
 */
export async function listAdminEvents({ start, end, appraiserId = null }) {
  if (USE_RPC) {
    const { data, error } = await supabase.rpc("rpc_list_admin_events", {
      p_start: start?.toISOString?.() ?? null,
      p_end: end?.toISOString?.() ?? null,
      p_appraiser_id: appraiserId ?? null,
    });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  let q = supabase
    .from("v_admin_calendar")
    .select(`
      order_id,
      event_type,
      start_at,
      end_at,
      appraiser_id,
      address
    `);

  if (start) q = q.gte("start_at", start.toISOString());
  if (end)   q = q.lte("start_at", end.toISOString());
  if (appraiserId) q = q.eq("appraiser_id", appraiserId);

  const { data, error } = await q;
  if (error) throw error;

  // Normalize for UI
  return (data ?? [])
    .map((r) => ({
      id: `${r.order_id}-${r.event_type}-${r.start_at}`, // fabricate id
      type: r.event_type,                                 // 'site_visit'|'review_due'|'final_due'
      date: new Date(r.start_at),
      end:  r.end_at ? new Date(r.end_at) : null,
      order_id: r.order_id,
      appraiser_id: r.appraiser_id ?? null,
      address: r.address ?? null,
    }))
    .filter((e) => !isNaN(e.date?.getTime?.()));
}




