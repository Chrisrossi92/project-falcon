// src/components/admin/AdminCalendar.jsx
import React, { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list"; // css via <link> in index.html
import { useOrders } from "@/lib/hooks/useOrders";

/**
 * Compact dashboard calendar:
 *  - Month: chip-only counts per day; click day -> 2-week.
 *  - 2-week (default): mini pills; overflow uses popover.
 *  - Day: list view.
 */

const COLORS = {
  site_visit: "#ec4899", // pink-500
  review_due: "#f59e0b", // amber-500
  due: "#3b82f6",        // blue-500
};

export default function AdminCalendar() {
  const { data = [] } = useOrders();
  const nav = useNavigate();
  const calRef = useRef(null);

  const { events, countsByDate } = useMemo(() => {
    const evts = [];
    const counts = {}; // yyyy-mm-dd -> {site_visit, review_due, due}

    const ymd = (v) => {
      if (!v) return null;
      const d = typeof v === "string" ? new Date(v) : v;
      if (Number.isNaN(d?.getTime?.())) return null;
      const m = `${d.getMonth() + 1}`.padStart(2, "0");
      const day = `${d.getDate()}`.padStart(2, "0");
      return `${d.getFullYear()}-${m}-${day}`;
    };
    const inc = (k, key) => {
      if (!k) return;
      if (!counts[k]) counts[k] = { site_visit: 0, review_due: 0, due: 0 };
      counts[k][key] += 1;
    };

    for (const o of data) {
      const id = o.id;
      const num = o.order_number ? `#${o.order_number}` : "";

      if (o.site_visit_date) {
        const k = ymd(o.site_visit_date);
        inc(k, "site_visit");
        evts.push({
          id: `${id}:site`,
          title: `📍 Site ${num}`,
          start: o.site_visit_date,
          color: COLORS.site_visit,
          textColor: "#fff",
          extendedProps: { orderId: id, short: `📍 Site ${num}` },
        });
      }
      if (o.review_due_date) {
        const k = ymd(o.review_due_date);
        inc(k, "review_due");
        evts.push({
          id: `${id}:review`,
          title: `🧠 Review ${num}`,
          start: o.review_due_date,
          color: COLORS.review_due,
          textColor: "#fff",
          extendedProps: { orderId: id, short: `🧠 Review ${num}` },
        });
      }
      const due = o.final_due_date || o.due_date;
      if (due) {
        const k = ymd(due);
        inc(k, "due");
        evts.push({
          id: `${id}:due`,
          title: `${o.final_due_date ? "📦 Final" : "📦 Due"} ${num}`,
          start: due,
          color: COLORS.due,
          textColor: "#fff",
          extendedProps: { orderId: id, short: `${o.final_due_date ? "📦 Final" : "📦 Due"} ${num}` },
        });
      }
    }
    return { events: evts, countsByDate: counts };
  }, [data]);

  // Month: inject tiny count chips under day number
  function dayCellDidMount(info) {
    if (!countsByDate) return;
    const d = info.date;
    const k = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
    const c = countsByDate[k];
    if (!c) return;

    const row = document.createElement("div");
    row.className = "mt-1 flex gap-1 px-1";

    const chip = (n, color, title) => {
      if (!n) return null;
      const el = document.createElement("span");
      el.className = "inline-flex items-center rounded-full border px-1.5 py-[1px] text-[10px]";
      el.style.borderColor = color;
      el.style.color = color;
      el.title = title;
      el.textContent = n;
      return el;
    };
    [chip(c.site_visit, COLORS.site_visit, "Site Visits"),
     chip(c.review_due, COLORS.review_due, "Due for Review"),
     chip(c.due, COLORS.due, "Final/Global Due")]
     .forEach((el) => el && row.appendChild(el));

    const top = info.el.querySelector(".fc-daygrid-day-top");
    if (top) top.appendChild(row);
  }

  // Replace day number label with just the number (prevents “September 1” spill)
  function dayCellContent(arg) {
    // number text only
    return { html: `<span class="fc-daynum">${arg.date.getDate()}</span>` };
  }

  // 2-week/day: render mini pills
  function eventContent(arg) {
    if (arg.view.type === "dayGridMonth") return { html: "" };
    const short = arg.event.extendedProps?.short || arg.event.title || "";
    return { html: `<span class="fc-mini-pill">${short}</span>` };
  }

  function onDateClick(arg) {
    const api = calRef.current?.getApi();
    api?.changeView("twoWeek", arg.date);
  }
  function onEventClick(info) {
    const orderId = info?.event?.extendedProps?.orderId;
    if (orderId) nav(`/orders/${orderId}`);
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.site_visit }} />Site Visit</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.review_due }} />Due for Review</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.due }} />Final / Global Due</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">Default view: 2 weeks</span>
      </div>

      {/* inline tweaks to compact the toolbar + cells */}
      <style>{`
        .fc .fc-toolbar-title { font-size: 1.1rem; line-height: 1.5rem; }
        /* Shorter titles with no year by view; rest via titleFormat below */
        .fc .fc-button { border-radius: 10px; padding: 0.28rem 0.5rem; font-size: 0.8rem; }
        .fc .fc-daygrid-day-frame { padding: 2px 2px 4px; }
        .fc .fc-daygrid-day-number, .fc-daynum { font-weight: 600; font-size: 0.85rem; }
        .fc .fc-daygrid-event { margin: 2px 0; }
        .fc .fc-popover { border-radius: 10px; }
        .fc-mini-pill {
          display: inline-flex; align-items: center;
          font-size: 11px; line-height: 1; padding: 3px 6px;
          border-radius: 999px; background: #111827; color: #fff;
          box-shadow: 0 1px 0 rgba(0,0,0,0.06);
        }
      `}</style>

      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="twoWeek"
        headerToolbar={{ left: "prev,next today", center: "title", right: "twoWeek,dayGridMonth,timeGridWeek,listDay" }}
        views={{
          twoWeek: {
            type: "dayGrid",
            duration: { weeks: 2 },
            buttonText: "2 weeks",
            dateAlignment: "week",
            titleFormat: { month: "short", day: "numeric" },   // e.g., "Aug 24 – Sep 6"
            dayHeaderFormat: { weekday: "short" },
          },
          dayGridMonth: {
            eventDisplay: "none",
            titleFormat: { month: "long" },                    // e.g., "August"
            dayHeaderFormat: { weekday: "short" },
          },
          timeGridWeek: {
            titleFormat: { month: "short", day: "numeric" },
            dayHeaderFormat: { weekday: "short" },
          },
          listDay: {
            buttonText: "day",
            titleFormat: { month: "short", day: "numeric" },
          },
        }}
        height="auto"
        dayMaxEvents={3}
        moreLinkClick="popover"
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        events={events}
        eventContent={eventContent}
        dayCellContent={dayCellContent}
        dayCellDidMount={dayCellDidMount}
        dateClick={onDateClick}
        eventClick={onEventClick}
      />
    </div>
  );
}











