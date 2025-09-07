// src/lib/services/calendarService.js
import supabase from "@/lib/supabaseClient";

/**
 * List calendar events (Site / Review / Final) within a date range.
 * If mineOnly is true, additionally filter by appraiser_id = userId (UI role-gate).
 */
export async function listCalendarEvents({
  from,           // ISO string (inclusive)
  to,             // ISO string (inclusive)
  mineOnly = false,
  userId = null,
} = {}) {
  let q = supabase.from("v_admin_calendar").select("*");

  if (from) q = q.gte("start_at", from);
  if (to)   q = q.lte("start_at", to);
  if (mineOnly && userId) q = q.eq("appraiser_id", userId);

  const { data, error } = await q.order("start_at", { ascending: true });
  if (error) throw error;

  return (data || []).map((e) => ({
    id: `${e.order_id}:${e.event_type}`,
    orderId: e.order_id,
    orderNo: e.order_no ?? null,
    type: e.event_type, // 'site' | 'review' | 'final'
    start: e.start_at ? new Date(e.start_at) : null,
    end: e.end_at ? new Date(e.end_at) : null,
    client: e.client_name ?? "",
    address: e.address ?? "",
    appraiserId: e.appraiser_id ?? null,
    appraiser: e.appraiser_name ?? "",
  }));
}





