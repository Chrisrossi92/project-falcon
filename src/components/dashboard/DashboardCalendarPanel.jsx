// src/components/dashboard/DashboardCalendarPanel.jsx
import React, { useCallback, useMemo, useState } from "react";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import { listCalendarEvents } from "@/lib/services/calendarService";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";

/* Map API rows to EventChip-friendly objects */
function mapEvents(rows) {
  return (rows || []).map((r) => ({
    id: `${r.orderId}:${r.type}:${r.start}`,
    orderId: r.orderId,
    type:
      r.type === "site"   ? "site_visit" :
      r.type === "review" ? "due_for_review" :
      r.type === "final"  ? "due_to_client" : r.type,
    title: `${r.orderNo ?? r.orderId?.slice(0,8) ?? ""} — ${r.client ?? ""}`.trim(),
    start: r.start,
    client: r.client || "",
    address: r.address || "",
    appraiser: r.appraiser || "",
  }));
}

export default function DashboardCalendarPanel({ onOpenOrder }) {
  const { user } = useSession();
  const { isAdmin, isReviewer } = useRole() || {};
  const mineOnly = !(isAdmin || isReviewer);
  const userId = user?.id || null;

  const [mode, setMode] = useState("twoWeek");     // twoWeek | month | week | day
  const [monFriOnly, setMonFriOnly] = useState(true);
  const [compact, setCompact] = useState(true);

  const getEvents = useCallback(async (start, end) => {
    const rows = await listCalendarEvents({
      from: start?.toISOString(),
      to: end?.toISOString(),
      mineOnly,
      userId,
    });
    return mapEvents(rows);
  }, [mineOnly, userId]);

  const tabs = useMemo(() => ([
    { key: "twoWeek", label: "2 weeks" },
    { key: "month",   label: "Month" },
    { key: "week",    label: "Week" },
    { key: "day",     label: "Day" },
  ]), []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex items-center gap-1 rounded-md border p-1 bg-white">
          {tabs.map(t => (
            <button
              key={t.key}
              data-no-drawer
              onClick={() => setMode(t.key)}
              className={
                "px-3 py-1 text-sm rounded " +
                (mode === t.key ? "bg-black text-white" : "hover:bg-gray-100")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <CalendarLegend />
          <label className="text-xs inline-flex items-center gap-2">
            <input type="checkbox" checked={monFriOnly} onChange={(e)=>setMonFriOnly(e.target.checked)} />
            Mon–Fri
          </label>
          <label className="text-xs inline-flex items-center gap-2">
            <input type="checkbox" checked={compact} onChange={(e)=>setCompact(e.target.checked)} />
            Compact
          </label>
        </div>
      </div>

      {/* Body */}
      {mode === "month" && (
        <MonthCalendar
          getEvents={getEvents}
          onEventClick={(ev) => onOpenOrder?.(ev.orderId)}
          showWeekends={!monFriOnly}          // opt-in weekend columns for month
        />
      )}

      {mode === "twoWeek" && (
        <TwoWeekCalendar
          getEvents={getEvents}
          onEventClick={(ev) => onOpenOrder?.(ev.orderId)}
          weeks={2}
          showWeekdayHeader
          showWeekends={!monFriOnly}          // hide weekends → wider columns
          compact={compact}                   // emoji + order# + time
        />
      )}

      {mode === "week" && (
        <TwoWeekCalendar
          getEvents={getEvents}
          onEventClick={(ev) => onOpenOrder?.(ev.orderId)}
          weeks={1}
          showWeekdayHeader
          showWeekends={!monFriOnly}
          compact={compact}
        />
      )}

      {mode === "day" && (
        <TwoWeekCalendar
          getEvents={getEvents}
          onEventClick={(ev) => onOpenOrder?.(ev.orderId)}
          weeks={1}
          showWeekdayHeader
          showWeekends={!monFriOnly}
          compact={false}                     // show fuller row for the focused day
          focusToday                          // focus today’s column; shows list-like
        />
      )}
    </div>
  );
}

