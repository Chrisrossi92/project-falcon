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

export default function DashboardCalendarPanel({ orders = [], onOpenOrder, fixedHeader = true, mode = null, reviewerId = null }) {
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
          const addr = o.address || o.address_line1 || "";
          const pushEvent = (type, ts) => {
            if (!ts) return;
            const when = new Date(ts);
            const ms = when.getTime();
            if (Number.isNaN(ms)) return;
            if (ms < startMs || ms > endMs) return;
            events.push({
              id: `${orderId || "order"}-${type}-${ms}`,
              type,
              title: formatCalendarEventTitle(type, { address: addr, orderId }),
              start: when.toISOString(),
              end: when.toISOString(),
              orderId,
              address: addr,
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border p-1 bg-white">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setViewMode(t.key)}
                className={`px-3 py-1 text-sm rounded ${viewMode === t.key ? "bg-black text-white" : "hover:bg-gray-100"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <CalendarLegend />
            <label className="text-xs inline-flex items-center gap-2">
              <input type="checkbox" checked={monFriOnly} onChange={(e) => setMonFriOnly(e.target.checked)} />
              Mon–Fri
            </label>
            <label className="text-xs inline-flex items-center gap-2">
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
            onEventClick={(ev) => onOpenOrder?.(ev?.orderId)}
          />
        )}
      </div>
    </div>
  );
}
