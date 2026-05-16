import React, { useMemo, useCallback, useState } from "react";
import useCalendarEventLoader, { formatCalendarEventTitle } from "@/lib/hooks/useCalendarEvents"; // fallback to backend view/RPC
import CalendarLegend from "@/components/calendar/CalendarLegend";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import MonthCalendar from "@/components/calendar/MonthsCalendar";

/* Normalize type coming from the backend */
function normalizeType(t) {
  const s = (t || "").toString().toLowerCase();
  if (s.includes("site")) return "site";
  if (s.includes("review")) return "review";
  if (s.includes("final") || s.includes("client")) return "final";
  return "other";
}

function streetAddress(order = {}) {
  return order.address_line1 || order.address || "";
}

function fullAddress(order = {}) {
  const street = streetAddress(order);
  const cityState = [order.city, order.state].filter(Boolean).join(", ");
  return [street, cityState].filter(Boolean).join(", ");
}

function formatEventTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function DashboardCalendarPanel({ orders = [], role = "appraiser", onOpenOrder, fixedHeader = true, mode = null, reviewerId = null }) {
  const hasOrders = Array.isArray(orders) && orders.length > 0;
  const baseLoader = useCalendarEventLoader({ mode, reviewerId }); // fallback when no orders provided

  // Loader that prefers local orders list; falls back to backend loader
  const loader = useCallback(
    async (start, end) => {
      if (hasOrders) {
        const startMs = start.getTime();
        const endMs = end.getTime();
        const events = [];

        orders.forEach((o) => {
          const orderId = o.id || o.order_id || null;
          const street = streetAddress(o);
          const fullAddr = fullAddress(o);
          const pushEvent = (type, ts) => {
            if (!ts) return;
            const when = new Date(ts);
            const ms = when.getTime();
            if (Number.isNaN(ms)) return;
            if (ms < startMs || ms > endMs) return;
            events.push({
              id: `${orderId || "order"}-${type}-${ms}`,
              type,
              title: type === "site" && street
                ? `${street} · ${formatEventTime(ts)}`
                : formatCalendarEventTitle(type, { address: street, orderId }),
              start: when.toISOString(),
              end: when.toISOString(),
              orderId,
              orderNumber: o.order_number || o.order_no || null,
              clientName: o.client_name || null,
              appraiserId: o.appraiser_id || o.assigned_to || null,
              appraiserName: o.appraiser_name || null,
              reviewerId: o.reviewer_id || null,
              reviewerName: o.reviewer_name || null,
              status: o.status || null,
              street,
              address: fullAddr || street,
              eventTime: type === "site" ? formatEventTime(ts) : "",
            });
          };

          pushEvent("site", o.site_visit_at);
          pushEvent("review", o.review_due_at);
          pushEvent("final", o.final_due_at || o.due_date);
        });

        return events;
      }

      // fallback to backend loader if no orders supplied
      const rows = await baseLoader(start, end);
      return (rows || []).map((r) => {
        const type = normalizeType(r.type || r.event_type);
        return {
          ...r,
          type,
          title: formatCalendarEventTitle(type, { address: r.address, orderId: r.orderId || r.order_id || r.id }),
          orderId: r.orderId || r.order_id || r.id || null,
          orderNumber: r.orderNumber || r.order_number || r.order_no || null,
          clientName: r.clientName || r.client_name || null,
          appraiserId: r.appraiserId || r.appraiser_id || null,
          appraiserName: r.appraiserName || r.appraiser_name || null,
          reviewerId: r.reviewerId || r.reviewer_id || null,
          reviewerName: r.reviewerName || r.reviewer_name || null,
          status: r.status || null,
          street: r.street || r.address_line1 || r.address || "",
          eventTime: type === "site" ? formatEventTime(r.start || r.start_at) : "",
        };
      });
    },
    [baseLoader, hasOrders, orders]
  );

  const tabs = useMemo(
    () => [
      { key: "twoWeek", label: "2 weeks" },
      { key: "month",   label: "Month"   },
      { key: "week",    label: "Week"    },
      { key: "day",     label: "Day"     },
    ],
    []
  );

  const [viewMode, setViewMode] = useState("twoWeek");
  const [monFriOnly, setMonFriOnly] = useState(true);
  const [compact, setCompact] = useState(true);

  return (
    <div className="space-y-3">
      {fixedHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Schedule pressure</div>
            <div className="text-xs text-slate-500">Site visits, review handoffs, and final due dates</div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setViewMode(t.key)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  viewMode === t.key
                    ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CalendarLegend />
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <input type="checkbox" checked={monFriOnly} onChange={(e) => setMonFriOnly(e.target.checked)} />
              Mon–Fri
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
              Compact
            </label>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        {viewMode === "month" && (
          <MonthCalendar
            getEvents={loader}
            showWeekends={!monFriOnly}
            onEventClick={(ev) => onOpenOrder?.(ev?.orderId)}
          />
        )}
        {viewMode === "twoWeek" && (
          <TwoWeekCalendar
            getEvents={loader}
            weeks={2}
            showWeekdayHeader
            showWeekends={!monFriOnly}
            compact={compact}
            role={role}
            onEventClick={(ev) => onOpenOrder?.(ev?.orderId)}
          />
        )}
        {viewMode === "week" && (
          <TwoWeekCalendar
            getEvents={loader}
            weeks={1}
            showWeekdayHeader
            showWeekends={!monFriOnly}
            compact={compact}
            role={role}
            onEventClick={(ev) => onOpenOrder?.(ev?.orderId)}
          />
        )}
        {viewMode === "day" && (
          <TwoWeekCalendar
            getEvents={loader}
            weeks={1}
            showWeekdayHeader
            showWeekends={!monFriOnly}
            compact={false}
            focusToday
            role={role}
            onEventClick={(ev) => onOpenOrder?.(ev?.orderId)}
          />
        )}
      </div>
    </div>
  );
}
