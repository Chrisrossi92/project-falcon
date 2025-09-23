// src/components/admin/AdminCalendar.jsx
import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

import supabase from "@/lib/supabaseClient";

const TYPE_COLORS = {
  site_visit: "#ec4899",
  due_for_review: "#f59e0b",
  due_to_client: "#3b82f6",
};

function startOfWeek(date, firstDay = 0) {
  const d = new Date(date);
  const diff = (d.getDay() - firstDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export default function AdminCalendar({ className = "", style = {}, onEventsChange }) {
  const calRef = useRef(null);
  const lastRangeRef = useRef({ startMs: null, endMs: null });
  const [range, setRange] = useState({ start: null, end: null });
  const [events, setEvents] = useState([]);

  const fetchEvents = useCallback(async (start, end) => {
    if (!start || !end) return;

    const { data, error } = await supabase
      .from("v_admin_calendar_enriched")
      .select(
        "id, event_type, title, start_at, end_at, order_id, appraiser_name, appraiser_color"
      )
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at", { ascending: true });

    if (error) {
      console.warn("calendar events error:", error.message);
      setEvents([]);
      onEventsChange?.([]);
      return;
    }

    const mapped = (data || []).map((row) => ({
      id: row.id,
      title: row.title || row.event_type || "Event",
      start: row.start_at,
      end: row.end_at,
      backgroundColor: TYPE_COLORS[row.event_type] || row.appraiser_color || undefined,
      borderColor: TYPE_COLORS[row.event_type] || row.appraiser_color || undefined,
      textColor: "#111827",
      extendedProps: {
        type: row.event_type,
        appraiser: row.appraiser_name || null,
        orderId: row.order_id || null,
      },
    }));

    setEvents(mapped);
    onEventsChange?.(mapped);
  }, [onEventsChange]);

  useEffect(() => {
    if (range.start && range.end) fetchEvents(range.start, range.end);
  }, [range.start, range.end, fetchEvents]);

  function handleDatesSet(info) {
    const sMs = info?.start?.getTime() ?? null;
    const eMs = info?.end?.getTime() ?? null;
    const { startMs: lastS, endMs: lastE } = lastRangeRef.current;
    if (sMs !== lastS || eMs !== lastE) {
      lastRangeRef.current = { startMs: sMs, endMs: eMs };
      setRange({ start: info.start, end: info.end });
    }
  }

  function onEventClick(info) {
    const orderId = info.event.extendedProps?.orderId;
    if (orderId) window.open(`/orders/${orderId}`, "_self");
  }

  const views = useMemo(
    () => ({
      twoWeeks: {
        type: "dayGrid",
        buttonText: "2 weeks",
        visibleRange: (currentDate) => {
          const start = startOfWeek(currentDate, 0);
          const end = addDays(start, 14);
          return { start, end };
        },
      },
      dayGridMonth: { type: "dayGrid", buttonText: "month" },
      timeGridWeek: { type: "timeGrid", buttonText: "week" },
      timeGridDay: { type: "timeGrid", buttonText: "day" },
    }),
    []
  );

  return (
    <div className={`min-h-[360px] ${className}`} style={style}>
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="twoWeeks"
        firstDay={0}
        height={420}
        contentHeight={360}
        expandRows
        stickyHeaderDates
        headerToolbar={false}
        dayMaxEventRows={3}
        eventDisplay="block"
        events={events}
        datesSet={handleDatesSet}
        eventClick={onEventClick}
        views={views}
      />
    </div>
  );
}

















