// src/components/calendar/CalendarGrid.jsx
import React, { useMemo } from "react";

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfWeek(d)  { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function addDays(d, n)   { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

const TYPE_EMOJI = {
  site:   "📍",  // Site Visit
  review: "📝",  // Review Due
  final:  "✅",  // Final / Global Due
};

export default function CalendarGrid({
  anchor,               // Date (any day in current month)
  events = [],          // [{orderId, orderNo, type, start, client, address}]
  onPrev, onNext,       // () => void
  onSelectOrder,        // (orderId) => void
}) {
  const month = useMemo(() => {
    const first = startOfMonth(anchor);
    const last  = endOfMonth(anchor);
    const gridStart = startOfWeek(first);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    return { first, last, gridStart, cells };
  }, [anchor]);

  const eventsByDay = useMemo(() => {
    const m = new Map();
    for (const ev of events) {
      if (!ev?.start) continue;
      const key = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()).toDateString();
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(ev);
    }
    return m;
  }, [events]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button className="border rounded px-2 py-1 text-sm" onClick={onPrev}>Prev</button>
        <div className="text-lg font-semibold">
          {anchor.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button className="border rounded px-2 py-1 text-sm" onClick={onNext}>Next</button>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 text-xs text-muted-foreground">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>

      {/* 6x7 grid */}
      <div className="grid grid-cols-7 grid-rows-6 border rounded overflow-hidden bg-white">
        {month.cells.map((day, idx) => {
          const isOtherMonth = day.getMonth() !== anchor.getMonth();
          const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toDateString();
          const dayEvents = eventsByDay.get(key) || [];
          return (
            <div
              key={idx}
              className={
                "min-h-[110px] border -m-[0.5px] p-1 md:p-2 " +
                (isOtherMonth ? "bg-gray-50 text-gray-400" : "bg-white")
              }
            >
              <div className="text-xs md:text-[13px] font-medium">{day.getDate()}</div>

              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((ev) => {
                  const emoji = TYPE_EMOJI[ev.type] || "•";
                  const orderLabel = ev.orderNo ?? ev.orderId?.slice(0, 8) ?? "—";
                  const client = ev.client && ev.client !== "—" ? ev.client : "";
                  const address = ev.address && ev.address !== "—" ? ev.address : "";

                  return (
                    <button
                      key={ev.id || `${ev.orderId}:${ev.type}`}
                      className="w-full text-left text-[11px] md:text-xs px-1 py-0.5 rounded hover:bg-gray-100 border"
                      title={[orderLabel, client, address].filter(Boolean).join(" • ")}
                      onClick={() => onSelectOrder?.(ev.orderId)}
                    >
                      <div className="truncate">
                        <span className="mr-1">{emoji}</span>
                        <span className="font-medium">{orderLabel}</span>
                        {client && <span className="ml-1 text-muted-foreground">– {client}</span>}
                      </div>
                      {address && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
                          {address}
                        </div>
                      )}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[11px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

