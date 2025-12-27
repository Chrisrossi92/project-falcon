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
        "id, event_type, title, start_at, end_at, order_id, order_number, client_name, street_address, address, city, state, zip, appraiser_name, appraiser_color"
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

    const mapped = (data || []).map((row) => {
      const address = row.address || row.street_address || "";
      const city = row.city || "";
      const state = row.state || "";
      const zip = row.zip || "";

      return {
        id: row.id,
        title: "",
        start: row.start_at,
        end: row.end_at,
        backgroundColor: TYPE_COLORS[row.event_type] || row.appraiser_color || undefined,
        borderColor: TYPE_COLORS[row.event_type] || row.appraiser_color || undefined,
        textColor: "#111827",
        extendedProps: {
          type: row.event_type,
          orderId: row.order_id || null,
          orderNumber: row.order_number || "",
          client: row.client_name || "",
          address,
          city,
          state,
          zip,
        },
      };
    });

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

  const EventContent = ({ event }) => {
    const [hovered, setHovered] = useState(false);
    const type = event.extendedProps?.type || "";
    const icon =
      type === "site_visit" ? "📍" :
      type === "due_for_review" ? "📝" :
      type === "due_to_client" ? "✅" :
      "•";

    const shortAddress = event.extendedProps?.address || "";
    const client = event.extendedProps?.client || "";
    const orderNumber = event.extendedProps?.orderNumber || "";
    const city = event.extendedProps?.city || "";
    const state = event.extendedProps?.state || "";
    const zip = event.extendedProps?.zip || "";
    const orderId = event.extendedProps?.orderId || null;

    const typeLabel =
      type === "site_visit" ? "Site Visit" :
      type === "due_for_review" ? "Review Due" :
      type === "due_to_client" ? "Final Due" :
      "Event";

    const fullAddress = [shortAddress, [city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" • ");

    return (
      <div
        className="relative flex items-center gap-1 text-[11px] leading-tight cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setHovered((v) => !v)}
      >
        <span>{icon}</span>
        <span>-</span>
        <span className="truncate">{shortAddress}</span>

        {hovered && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-xl bg-white shadow-lg border p-3 text-xs z-20">
            <div className="font-semibold mb-1">{orderNumber || client || "Order"}</div>
            {client && <div className="text-slate-700 mb-1">{client}</div>}
            {fullAddress && <div className="text-slate-600 mb-1">{fullAddress}</div>}
            <div className="text-slate-600 mb-2">
              <span className="font-medium">{typeLabel}</span>
              {event.start && (
                <span className="ml-1">
                  {new Date(event.start).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </div>
            {orderId && (
              <button
                className="px-2 py-1 text-[11px] rounded border bg-slate-50 hover:bg-slate-100"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/orders/${orderId}`, "_self");
                }}
              >
                Open order
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

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
        eventContent={(args) => <EventContent {...args} />}
        eventClick={onEventClick}
        views={views}
      />
    </div>
  );
}
