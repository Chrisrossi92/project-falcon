// src/components/calendar/MonthsCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import supabase from "@/lib/supabaseClient";

// Normalize DB event rows → Month grid shape
function mapRow(row) {
  const t = (row.title || "").toLowerCase();
  const eventType =
    row.event_type === "site_visit" || row.event_type === "appointment"
      ? "site"
      : t.includes("review")
      ? "review"
      : "final";

  return {
    id: row.id,
    type: eventType,                // 'site' | 'review' | 'final'  (CalendarGrid expects this)
    start: new Date(row.start_at),
    orderId: row.order_id,
    orderNo: row.order_no || row.order_id?.slice(0, 8),
    client: row.client_name || "—",
    address: row.address || "—",
  };
}

export default function MonthsCalendar({
  anchor = new Date(),
  onAnchorChange,                   // (nextDate)
  filters = { site: true, review: true, final: true },
}) {
  const [events, setEvents] = useState([]);

  const monthStart = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    [anchor]
  );
  const monthEnd = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999),
    [anchor]
  );

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("v_admin_calendar")
      .select("id, event_type, title, start_at, end_at, order_id, appraiser_name, order_no, address, client_name")
      .gte("start_at", monthStart.toISOString())
      .lte("start_at", monthEnd.toISOString())
      .order("start_at", { ascending: true });

    if (error) { console.warn(error.message); setEvents([]); return; }
    setEvents((data || []).map(mapRow));
  }, [monthStart, monthEnd]);

  useEffect(() => { load(); }, [load]);

  // Filter by type
  const filtered = useMemo(() => {
    return events.filter(ev =>
      (filters.site && ev.type === "site") ||
      (filters.review && ev.type === "review") ||
      (filters.final && ev.type === "final")
    );
  }, [events, filters]);

  return (
    <CalendarGrid
      anchor={anchor}
      events={filtered}
      onPrev={() => onAnchorChange?.(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
      onNext={() => onAnchorChange?.(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
      onSelectOrder={(orderId) => { if (orderId) window.open(`/orders/${orderId}`, "_self"); }}
    />
  );
}


