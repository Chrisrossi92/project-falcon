// src/components/calendar/useCalendarEvents.js
import { useCallback } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Returns an async loader(start: Date, end: Date) -> Promise<events[]>
 * Events shape:
 *   { id, type, title, start, end, orderId, appraiser, colorClass }
 */
export default function useCalendarEvents() {
  return useCallback(async (start, end) => {
    const { data, error } = await supabase
      .from("v_admin_calendar_enriched")
      .select("id, event_type, title, start_at, end_at, order_id, appraiser_name, appraiser_color")
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
  }, []);
}

