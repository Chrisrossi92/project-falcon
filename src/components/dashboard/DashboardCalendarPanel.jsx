import React, { useMemo, useCallback, useState } from "react";
import useCalendarEventLoader from "@/lib/hooks/useCalendarEvents"; // fallback to backend view/RPC
import CalendarLegend from "@/components/calendar/CalendarLegend";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import MonthCalendar from "@/components/calendar/MonthsCalendar";
import {
  calendarEventsFromOrder,
  filterCalendarEventsByRange,
  normalizeCalendarEvent,
} from "@/lib/calendar/normalizeCalendarEvent";

export default function DashboardCalendarPanel({
  orders = [],
  role = "appraiser",
  onOpenOrder,
  fixedHeader = true,
  mode = null,
  reviewerId = null,
  useFallbackLoader = true,
}) {
  const hasOrders = Array.isArray(orders) && orders.length > 0;
  const baseLoader = useCalendarEventLoader({ mode, reviewerId }); // fallback when no orders provided

  // Loader that prefers local orders list; falls back to backend loader
  const loader = useCallback(
    async (start, end) => {
      if (hasOrders) {
        const events = [];

        orders.forEach((o) => {
          events.push(...calendarEventsFromOrder(o, { includePostal: false }));
        });

        return filterCalendarEventsByRange(events, start, end);
      }

      if (!useFallbackLoader) {
        return [];
      }

      // fallback to backend loader if no orders supplied
      const rows = await baseLoader(start, end);
      return (rows || []).map((r) => normalizeCalendarEvent(r, { includePostal: false }));
    },
    [baseLoader, hasOrders, orders, useFallbackLoader]
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
            role={role}
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
