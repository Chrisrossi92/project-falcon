// src/components/calendar/CalendarGrid.jsx
import { useMemo } from "react";
import CalendarDayCapacity from "@/components/calendar/CalendarDayCapacity";
import EventChip from "@/components/calendar/EventChip";

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfWeek(d)  { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function startOfWorkWeek(d) { const x = new Date(d); const day = x.getDay(); const offset = day === 0 ? -6 : 1 - day; x.setDate(x.getDate() + offset); x.setHours(0,0,0,0); return x; }
function addDays(d, n)   { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addVisibleDays(d, n, showWeekends) {
  const x = new Date(d);
  let added = 0;
  while (added < n) {
    x.setDate(x.getDate() + 1);
    const day = x.getDay();
    if (showWeekends || (day !== 0 && day !== 6)) added += 1;
  }
  return x;
}

export default function CalendarGrid({
  anchor,               // Date (any day in current month)
  events = [],          // [{orderId, orderNo, type, start, address}]
  onPrev, onNext,       // () => void
  onSelectOrder,        // (orderId) => void
  onSelectEvent,        // (event) => void
  onSelectDay,          // (date) => void
  selectedDay,
  role = "appraiser",
  showWeekends = true,
}) {
  const month = useMemo(() => {
    const first = startOfMonth(anchor);
    const last  = endOfMonth(anchor);
    const gridStart = showWeekends ? startOfWeek(first) : startOfWorkWeek(first);
    const cellCount = (showWeekends ? 7 : 5) * 6;
    const cells = Array.from({ length: cellCount }, (_, i) => showWeekends ? addDays(gridStart, i) : addVisibleDays(gridStart, i, false));
    return { first, last, gridStart, cells };
  }, [anchor, showWeekends]);

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
      <div className={`grid text-xs text-muted-foreground ${showWeekends ? "grid-cols-7" : "grid-cols-5"}`}>
        {(showWeekends ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] : ["Mon","Tue","Wed","Thu","Fri"]).map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>

      {/* 6x7 grid */}
      <div className={`grid grid-rows-6 border rounded overflow-hidden bg-white ${showWeekends ? "grid-cols-7" : "grid-cols-5"}`}>
        {month.cells.map((day, idx) => {
          const isOtherMonth = day.getMonth() !== anchor.getMonth();
          const isSelected = selectedDay &&
            day.getFullYear() === selectedDay.getFullYear() &&
            day.getMonth() === selectedDay.getMonth() &&
            day.getDate() === selectedDay.getDate();
          const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toDateString();
          const dayEvents = eventsByDay.get(key) || [];
          return (
            <div
              key={idx}
              role={onSelectDay ? "button" : undefined}
              tabIndex={onSelectDay ? 0 : undefined}
              onClick={() => onSelectDay?.(new Date(day))}
              onKeyDown={(event) => {
                if (!onSelectDay) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDay(new Date(day));
                }
              }}
              className={
                "min-h-[110px] border -m-[0.5px] p-1 transition md:p-2 " +
                (onSelectDay ? "cursor-pointer hover:bg-slate-50 " : "") +
                (isSelected ? "relative z-[1] bg-blue-50/40 ring-1 ring-inset ring-blue-200 " : "") +
                (isOtherMonth ? "bg-gray-50 text-gray-400" : "bg-white")
              }
            >
              <div className="text-xs md:text-[13px] font-medium">{day.getDate()}</div>
              <CalendarDayCapacity events={dayEvents} />

              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip
                    key={ev.id || `${ev.orderId}:${ev.type}`}
                    event={ev}
                    compact
                    role={role}
                    onClick={() => {
                      if (onSelectEvent) onSelectEvent(ev);
                      else onSelectOrder?.(ev.orderId);
                    }}
                  />
                ))}
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
