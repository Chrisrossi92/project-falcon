// src/components/admin/AdminCalendar.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useOrders } from "@/lib/hooks/useOrders";

/**
 * AdminCalendar
 * - Shows Site Visit, Review Due, Final Due (or global Due)
 * - Click an event → navigates to Order Detail
 * - Reads only; RLS governs visibility via v_orders_list_with_last_activity
 */
export default function AdminCalendar() {
  const { data = [], loading, error } = useOrders();
  const navigate = useNavigate();

  const events = useMemo(() => {
    const evts = [];
    for (const o of data) {
      const address = o.address || "Order";
      const tag = (label) =>
        `${label} • ${address}${o.order_number ? ` (#${o.order_number})` : ""}`;

      // NOTE: These field names match OrderDetail.jsx usage
      if (o.site_visit_date) {
        evts.push({
          id: `${o.id}:site`,
          title: tag("Site Visit"),
          start: o.site_visit_date,
          extendedProps: { orderId: o.id, kind: "site_visit" },
        });
      }
      if (o.review_due_date) {
        evts.push({
          id: `${o.id}:review`,
          title: tag("Review Due"),
          start: o.review_due_date,
          extendedProps: { orderId: o.id, kind: "review_due" },
        });
      }
      if (o.final_due_date) {
        evts.push({
          id: `${o.id}:final`,
          title: tag("Final Due"),
          start: o.final_due_date,
          extendedProps: { orderId: o.id, kind: "final_due" },
        });
      } else if (o.due_date) {
        // global due (fallback if no explicit final date)
        evts.push({
          id: `${o.id}:due`,
          title: tag("Due"),
          start: o.due_date,
          extendedProps: { orderId: o.id, kind: "due" },
        });
      }
    }
    return evts;
  }, [data]);

  function onEventClick(info) {
    const orderId = info?.event?.extendedProps?.orderId;
    if (orderId) navigate(`/orders/${orderId}`);
  }

  if (loading) {
    return (
      <div className="p-3 text-sm text-gray-600">Loading calendar…</div>
    );
  }
  if (error) {
    return (
      <div className="p-3 text-sm text-red-700 bg-red-50 border rounded">
        Failed to load events: {error.message}
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-3">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        events={events}
        eventClick={onEventClick}
      />
    </div>
  );
}








