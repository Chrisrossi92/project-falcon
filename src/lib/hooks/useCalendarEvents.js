// src/lib/hooks/useCalendarEvents.js
import { useCallback, useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * DEFAULT EXPORT (dashboards: Admin/Reviewer)
 * Returns a loader: (start: Date, end: Date) => Promise<Event[]>
 * Source: v_admin_calendar_enriched
 */
export default function useCalendarEventLoader() {
  return useCallback(async (start, end) => {
    if (!start || !end) return [];
    const { data, error } = await supabase
      .from("v_admin_calendar_enriched")
      .select(
        "id, event_type, title, start_at, end_at, order_id, appraiser_name, appraiser_color"
      )
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at", { ascending: true });

    if (error) throw error;

    const TYPE_COLORS = {
      site_visit: "bg-pink-500/90 border-pink-500/90",
      due_for_review: "bg-amber-500/90 border-amber-500/90",
      due_to_client: "bg-blue-500/90 border-blue-500/90",
    };

    return (data || []).map((row) => ({
      id: row.id,
      type: row.event_type,
      title: row.title || row.event_type || "Event",
      start: row.start_at,
      end: row.end_at,
      orderId: row.order_id || null,
      appraiser: row.appraiser_name || "",
      colorClass:
        TYPE_COLORS[row.event_type] || "bg-slate-200 border-slate-200",
    }));
  }, []);
}

/**
 * NAMED EXPORT (for /calendar list page)
 * API: useCalendarEvents({ from, to }) -> { events, loading, error }
 * Source: RPC public.get_calendar_events
 */
export function useCalendarEvents({ from, to }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc("get_calendar_events", {
        p_from: from?.toISOString?.() ?? null,
        p_to: to?.toISOString?.() ?? null,
      });

      if (!alive) return;

      if (error) {
        setError(error);
        setEvents([]);
      } else {
        const mapped = (data ?? []).map((e) => ({
          id: `${e.order_id}-${e.kind}-${e.at}`,
          orderId: e.order_id,
          kind: e.kind,         // 'site_visit' | 'due'
          at: new Date(e.at),
          assigneeId: e.assigned_user_id_any,
        }));
        setEvents(mapped);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [from?.getTime?.(), to?.getTime?.()]);

  return { events, loading, error };
}

