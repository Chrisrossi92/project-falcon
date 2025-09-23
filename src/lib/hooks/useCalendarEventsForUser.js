import { useCallback } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Returns a loader(start, end) that fetches only events where appraiser_id = usersId
 * Events shape matches useCalendarEvents.
 */
export default function useCalendarEventsForUser(usersId) {
  return useCallback(async (start, end) => {
    if (!usersId) return [];
    const { data, error } = await supabase
      .from("v_admin_calendar_enriched")
      .select("id, event_type, title, start_at, end_at, order_id, appraiser_name, appraiser_color, appraiser_id")
      .eq("appraiser_id", usersId)
      .gte("start_at", start.toISOString())
      .lt("start_at",  end.toISOString())
      .order("start_at", { ascending: true });

    if (error) throw error;

    const TYPE_COLORS = {
      site_visit:     "bg-pink-500/90 border-pink-500/90",
      due_for_review: "bg-amber-500/90 border-amber-500/90",
      due_to_client:  "bg-blue-500/90 border-blue-500/90",
    };

    return (data || []).map(row => ({
      id: row.id,
      type: row.event_type,
      title: row.title || row.event_type || "Event",
      start: row.start_at,
      end: row.end_at,
      orderId: row.order_id || null,
      appraiser: row.appraiser_name || "",
      colorClass: TYPE_COLORS[row.event_type] || "bg-slate-200 border-slate-200",
    }));
  }, [usersId]);
}
