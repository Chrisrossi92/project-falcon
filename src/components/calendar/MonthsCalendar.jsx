// src/components/calendar/MonthsCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import useCalendarEventLoader from "@/lib/hooks/useCalendarEvents";
import useRole from "@/lib/hooks/useRole";

function normalizeType(t) {
  const s = (t || "").toString().toLowerCase();
  if (s.includes("site")) return "site";
  if (s.includes("review")) return "review";
  if (s.includes("final") || s.includes("client")) return "final";
  return "other";
}

export default function MonthsCalendar({
  anchor = new Date(),
  onAnchorChange,                   // (nextDate)
  filters = { site: true, review: true, final: true },
}) {
  const [events, setEvents] = useState([]);
  const roleHook = useRole() || {};
  const isReviewer = roleHook?.isReviewer;
  const loader = useCalendarEventLoader({ mode: isReviewer ? "reviewerQueue" : null, reviewerId: isReviewer ? roleHook.userId : null });

  const monthStart = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    [anchor]
  );
  const monthEnd = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999),
    [anchor]
  );

  const load = useCallback(async () => {
    try {
      const rows = await loader(monthStart, monthEnd);
      const mapped = (rows || []).map((ev) => ({
        id: ev.id,
        type: normalizeType(ev.type),
        start: new Date(ev.start),
        orderId: ev.orderId || ev.order_id,
        address: ev.address || ev.address_line1 || ev.title || "—",
      }));
      setEvents(mapped);
    } catch {
      setEvents([]);
    }
  }, [loader, monthStart, monthEnd]);

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

