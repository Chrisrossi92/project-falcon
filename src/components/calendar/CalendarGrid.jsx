// src/components/calendar/CalendarGrid.jsx
import { useMemo } from "react";
import CalendarDayCapacity from "@/components/calendar/CalendarDayCapacity";
import EventChip from "@/components/calendar/EventChip";
import { classifyCalendarDayCapacity } from "@/lib/calendar/calendarCapacity";

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

function capacityCellClasses(capacityId) {
  switch (capacityId) {
    case "light":
      return "bg-emerald-50/20 before:bg-emerald-300/60";
    case "steady":
      return "bg-sky-50/30 before:bg-sky-300/70";
    case "heavy":
      return "bg-amber-50/40 shadow-[inset_0_1px_0_rgba(251,191,36,0.18)] before:bg-amber-300";
    case "overloaded":
      return "bg-rose-50/45 shadow-[inset_0_1px_0_rgba(251,113,133,0.2)] before:bg-rose-300";
    default:
      return "bg-white before:bg-transparent";
  }
}

export default function CalendarGrid({
  anchor,               // Date (any day in current month)
  events = [],          // [{orderId, orderNo, type, start, address}]
  onPrev, onNext,       // () => void
  onToday,              // () => void
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
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
        aria-label="Calendar navigation"
      >
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <button
            type="button"
            className="min-h-9 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            onClick={onPrev}
            aria-label="Previous period"
          >
            <span aria-hidden="true">{"<-"}</span>
            <span className="sr-only">Previous</span>
          </button>
          <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
          <button
            type="button"
            className="min-h-9 rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:border-slate-800 hover:bg-slate-800 active:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            onClick={onToday}
          >
            Today
          </button>
          <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
          <button
            type="button"
            className="min-h-9 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            onClick={onNext}
            aria-label="Next period"
          >
            <span aria-hidden="true">{"->"}</span>
            <span className="sr-only">Next</span>
          </button>
        </div>

        <div className="min-w-0 flex-1 px-1 text-center sm:px-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            You are viewing
          </div>
          <div className="truncate text-2xl font-semibold leading-7 tracking-tight text-slate-950">
            {anchor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
        </div>

        <div
          className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:block"
          aria-hidden="true"
        >
          Month
        </div>
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
          const capacity = classifyCalendarDayCapacity(dayEvents);
          return (
            <div
              key={idx}
              data-calendar-cell-capacity={capacity.id}
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
                "relative min-h-[110px] border -m-[0.5px] overflow-hidden p-1 transition before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] md:p-2 " +
                capacityCellClasses(capacity.id) + " " +
                (onSelectDay ? "cursor-pointer hover:bg-slate-50 " : "") +
                (isSelected ? "relative z-[1] bg-blue-50/40 ring-1 ring-inset ring-blue-200 " : "") +
                (isOtherMonth ? "bg-gray-50 text-gray-400 before:bg-slate-200/70" : "")
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
                  <div className="w-fit rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    +{dayEvents.length - 3} more events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
