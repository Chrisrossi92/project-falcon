import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

/** Stable color per appraiser (keeps calendar readable) */
function hashColor(input = "") {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

/** Convert orders → calendar events */
function mapOrderToEvents(orders = []) {
  const events = [];

  for (const o of orders) {
    const appraiserColor = o.appraiser?.id ? hashColor(o.appraiser.id) : "#3b82f6";
    const address = o.property_address || o.address || o.client_name || "Order";

    // 📍 Site Visit
    if (o.site_visit_at) {
      events.push({
        id: `sv_${o.id}`,
        title: `📍 ${address}`,
        start: o.site_visit_at,
        allDay: false,
        extendedProps: { type: "site_visit", orderId: o.id },
        color: appraiserColor,
      });
    }

    // 🔵 Due for Review
    if (o.review_due_at) {
      events.push({
        id: `rev_${o.id}`,
        title: `🔵 Review: ${address}`,
        start: o.review_due_at,
        allDay: true,
        extendedProps: { type: "review_due", orderId: o.id },
        color: appraiserColor,
      });
    }

    // 🟣 Due to Client (Final Due)
    if (o.final_due_at) {
      events.push({
        id: `cli_${o.id}`,
        title: `🟣 Due: ${address}`,
        start: o.final_due_at,
        allDay: true,
        extendedProps: { type: "client_due", orderId: o.id },
        color: appraiserColor,
      });
    }
  }

  return events;
}

export default function DashboardCalendar({ orders = [], loading }) {
  const navigate = useNavigate();
  const events = useMemo(() => mapOrderToEvents(orders), [orders]);

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-3 text-sm flex items-center gap-6">
        <span className="flex items-center gap-2"><span>📍</span><span>Site Visit</span></span>
        <span className="flex items-center gap-2"><span>🔵</span><span>Due for Review</span></span>
        <span className="flex items-center gap-2"><span>🟣</span><span>Due to Client</span></span>
        {loading ? <span className="text-gray-500">Loading…</span> : null}
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridTwoWeek"
        headerToolbar={{ left: "prev today next", center: "title", right: "dayGridMonth,timeGridWeek,dayGridTwoWeek" }}
        views={{ dayGridTwoWeek: { type: "dayGrid", duration: { weeks: 2 }, buttonText: "2 weeks" } }}
        height="auto"
        events={events}
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        eventDisplay="block"
        eventClick={(info) => {
          const orderId = info.event.extendedProps?.orderId;
          if (orderId) navigate(`/orders/${orderId}`);
        }}
      />
    </div>
  );
}







