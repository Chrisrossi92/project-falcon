import { useEffect, useMemo, useState } from "react";
import CalendarDayCapacity from "@/components/calendar/CalendarDayCapacity";
import EventChip from "@/components/calendar/EventChip";
import { classifyCalendarDayCapacity } from "@/lib/calendar/calendarCapacity";

function startOfWeek(d) { const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function sameDate(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

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

export default function TwoWeekCalendar({
  getEvents,                 // (start, end) => Promise<events[]>
  onEventClick,
  anchor: controlledAnchor,
  onAnchorChange,
  weeks = 2,
  showWeekdayHeader = true,
  showWeekends = true,
  compact = true,
  role = "appraiser",
  focusToday = false,        // when weeks=1 shows a stacked list for today
  selectedDay,
  onSelectDay,
}) {
  const [internalAnchor, setInternalAnchor] = useState(() => startOfWeek(new Date()));
  const anchor = controlledAnchor || internalAnchor;
  const setAnchor = (nextAnchor) => {
    if (onAnchorChange) onAnchorChange(nextAnchor);
    else setInternalAnchor(nextAnchor);
  };
  const daysPerRow = showWeekends ? 7 : 5;

  // Visible day sequence
  const days = useMemo(() => {
    const seq = [];
    let d = new Date(anchor);
    while (seq.length < weeks * daysPerRow) {
      const w = d.getDay();
      if (showWeekends || (w !== 0 && w !== 6)) seq.push(new Date(d));
      d = addDays(d, 1);
    }
    return seq;
  }, [anchor, weeks, showWeekends, daysPerRow]);

  // Query window
  const range = useMemo(() => ({ start: new Date(anchor), end: addDays(anchor, weeks * 7 - 1) }), [anchor, weeks]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let ok = true;
    (async () => {
      try { const rows = await getEvents?.(range.start, range.end); if (ok) setEvents(rows || []); }
      catch { if (ok) setEvents([]); }
    })();
    return () => { ok = false; };
  }, [range, getEvents]);

  // Bucket events by visible day
  const byDay = useMemo(() => {
    const m = new Map(days.map(d=>[d.toDateString(), []]));
    (events || []).forEach(ev => {
      const dt = new Date(ev.start);
      for (const d of days) { if (sameDate(d, dt)) { m.get(d.toDateString())?.push(ev); break; } }
    });
    return m;
  }, [events, days]);

  // Day focus mode (used for "Day" tab)
  if (focusToday && weeks === 1) {
    const today = new Date();
    const list = byDay.get(today.toDateString()) || [];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Today</div>
          <div className="text-sm">
            {today.toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" })}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          {list.length === 0 ? (
            <div className="text-sm text-slate-500">No calendar pressure today.</div>
          ) : (
            <div className="space-y-1">
              {list.sort((a,b)=>new Date(a.start)-new Date(b.start)).map(ev => (
                <EventChip key={ev.id} event={ev} compact={false} role={role} onClick={() => onEventClick?.(ev)} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* NEW: pager/header ABOVE calendar */}
      <div
        className="sticky top-0 z-[1] flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/95 p-2 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur"
        aria-label="Calendar navigation"
      >
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <button
            type="button"
            className="min-h-9 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            onClick={() => setAnchor(addDays(anchor, -(showWeekends?7:5)))}
            aria-label="Previous period"
          >
            <span aria-hidden="true">{"<-"}</span>
            <span className="sr-only">Previous</span>
          </button>
          <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
          <button
            type="button"
            className="min-h-9 rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:border-slate-800 hover:bg-slate-800 active:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            onClick={() => setAnchor(startOfWeek(new Date()))}
          >
            Today
          </button>
          <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
          <button
            type="button"
            className="min-h-9 rounded-md px-2.5 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            onClick={() => setAnchor(addDays(anchor, (showWeekends?7:5)))}
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
          <div className="truncate text-xl font-semibold leading-7 tracking-tight text-slate-950">
            {days[0]?.toLocaleDateString()} – {days[days.length-1]?.toLocaleDateString()}
          </div>
        </div>

        <div
          className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:block"
          aria-hidden="true"
        >
          {weeks || 2} weeks
        </div>
      </div>

      {/* Weekday header */}
      {showWeekdayHeader && (
        <div className={"grid text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 " + (showWeekends ? "grid-cols-7" : "grid-cols-5")}>
          {WD.filter((_,i)=> showWeekends || (i!==0 && i!==6)).map((d)=>(<div key={d} className="px-2 py-1">{d}</div>))}
        </div>
      )}

      {/* Grid */}
      <div className={"grid rounded-lg border border-slate-200 bg-white " + (showWeekends ? "grid-cols-7" : "grid-cols-5")}>
        {days.map((d, i) => {
          const list = (byDay.get(d.toDateString()) || []).sort((a,b)=>new Date(a.start)-new Date(b.start));
          const isToday = sameDate(d, new Date());
          const isSelected = selectedDay && sameDate(d, selectedDay);
          const capacity = classifyCalendarDayCapacity(list);
          return (
            <div
              key={i}
              data-calendar-cell-capacity={capacity.id}
              role={onSelectDay ? "button" : undefined}
              tabIndex={onSelectDay ? 0 : undefined}
              onClick={() => onSelectDay?.(new Date(d))}
              onKeyDown={(event) => {
                if (!onSelectDay) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDay(new Date(d));
                }
              }}
              className={`relative min-h-[140px] border border-slate-100 -m-[0.5px] p-1 transition before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-[''] hover:z-20 focus-within:z-20 md:p-2 ${capacityCellClasses(capacity.id)} ${onSelectDay ? "cursor-pointer hover:bg-slate-50" : ""} ${isToday ? "bg-amber-50/30 ring-1 ring-inset ring-amber-100" : ""} ${isSelected ? "relative z-[1] bg-blue-50/40 ring-1 ring-inset ring-blue-200" : ""}`}
            >
              <div className={`text-[11px] font-semibold md:text-xs ${isToday ? "text-amber-800" : "text-slate-600"}`}>{d.getDate()}</div>
              <CalendarDayCapacity events={list} />
              <div className="mt-1 space-y-1">
                {list.slice(0, 4).map(ev => (
                  <EventChip key={ev.id} event={ev} compact={compact} role={role} onClick={() => onEventClick?.(ev)} />
                ))}
                {list.length > 4 && (
                  <div className="w-fit rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    +{list.length-4} more events
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
