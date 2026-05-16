// src/components/calendar/MonthsCalendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import useCalendarEventLoader from "@/lib/hooks/useCalendarEvents";
import useRole from "@/lib/hooks/useRole";
import { normalizeCalendarEvent } from "@/lib/calendar/normalizeCalendarEvent";

export default function MonthsCalendar({
  anchor,
  onAnchorChange,                   // (nextDate)
  getEvents,
  showWeekends = true,
  onEventClick,
  role,
  filters = { site: true, review: true, final: true },
}) {
  const [events, setEvents] = useState([]);
  const [internalAnchor, setInternalAnchor] = useState(() => new Date());
  const activeAnchor = anchor || internalAnchor;
  const roleHook = useRole() || {};
  const isReviewer = roleHook?.isReviewer;
  const calendarRole = role || roleHook.role || (roleHook.isAdmin ? "admin" : isReviewer ? "reviewer" : "appraiser");
  const fallbackLoader = useCalendarEventLoader({ mode: isReviewer ? "reviewerQueue" : null, reviewerId: isReviewer ? roleHook.userId : null });
  const loader = getEvents || fallbackLoader;

  const monthStart = useMemo(
    () => new Date(activeAnchor.getFullYear(), activeAnchor.getMonth(), 1),
    [activeAnchor]
  );
  const monthEnd = useMemo(
    () => new Date(activeAnchor.getFullYear(), activeAnchor.getMonth() + 1, 0, 23, 59, 59, 999),
    [activeAnchor]
  );

  const load = useCallback(async () => {
    try {
      const rows = await loader(monthStart, monthEnd);
      const mapped = (rows || []).map((ev) => {
        const normalized = normalizeCalendarEvent(ev);
        return {
          ...normalized,
          start: new Date(normalized.start),
          address: normalized.address || normalized.address_line1 || normalized.title || "—",
        };
      });
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

  const changeAnchor = useCallback((next) => {
    if (onAnchorChange) onAnchorChange(next);
    else setInternalAnchor(next);
  }, [onAnchorChange]);

  return (
    <CalendarGrid
      anchor={activeAnchor}
      events={filtered}
      onPrev={() => changeAnchor(new Date(activeAnchor.getFullYear(), activeAnchor.getMonth() - 1, 1))}
      onNext={() => changeAnchor(new Date(activeAnchor.getFullYear(), activeAnchor.getMonth() + 1, 1))}
      onSelectOrder={(orderId) => { if (orderId) window.open(`/orders/${orderId}`, "_self"); }}
      onSelectEvent={(event) => {
        if (onEventClick) onEventClick(event);
        else if (event?.orderId) window.open(`/orders/${event.orderId}`, "_self");
      }}
      role={calendarRole}
      showWeekends={showWeekends}
    />
  );
}
