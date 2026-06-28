import { useEffect, useMemo, useState } from "react";
import CalendarDayCapacity from "@/components/calendar/CalendarDayCapacity";
import EventChip from "@/components/calendar/EventChip";

function startOfWeek(d) { const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function sameDate(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function TwoWeekCalendar({
  getEvents,                 // (start, end) => Promise<events[]>
  onEventClick,
  weeks = 2,
  showWeekdayHeader = true,
  showWeekends = true,
  compact = true,
  role = "appraiser",
  focusToday = false,        // when weeks=1 shows a stacked list for today
  selectedDay,
  onSelectDay,
}) {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
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
      <div className="sticky top-0 z-[1] flex items-center justify-between rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur">
        <button className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" onClick={() => setAnchor(addDays(anchor, -(showWeekends?7:5)))}>Prev</button>
        <div className="flex items-center gap-2 text-center">
          <button className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" onClick={() => setAnchor(startOfWeek(new Date()))}>Today</button>
          <div className="text-sm text-slate-500">
            {days[0]?.toLocaleDateString()} – {days[days.length-1]?.toLocaleDateString()}
          </div>
        </div>
        <button className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" onClick={() => setAnchor(addDays(anchor, (showWeekends?7:5)))}>Next</button>
      </div>

      {/* Weekday header */}
      {showWeekdayHeader && (
        <div className={"grid text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 " + (showWeekends ? "grid-cols-7" : "grid-cols-5")}>
          {WD.filter((_,i)=> showWeekends || (i!==0 && i!==6)).map((d)=>(<div key={d} className="px-2 py-1">{d}</div>))}
        </div>
      )}

      {/* Grid */}
      <div className={"grid overflow-hidden rounded-lg border border-slate-200 bg-white " + (showWeekends ? "grid-cols-7" : "grid-cols-5")}>
        {days.map((d, i) => {
          const list = (byDay.get(d.toDateString()) || []).sort((a,b)=>new Date(a.start)-new Date(b.start));
          const isToday = sameDate(d, new Date());
          const isSelected = selectedDay && sameDate(d, selectedDay);
          return (
            <div
              key={i}
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
              className={`min-h-[140px] border border-slate-100 -m-[0.5px] p-1 transition md:p-2 ${onSelectDay ? "cursor-pointer hover:bg-slate-50" : ""} ${isToday ? "bg-amber-50/30 ring-1 ring-inset ring-amber-100" : ""} ${isSelected ? "relative z-[1] bg-blue-50/40 ring-1 ring-inset ring-blue-200" : ""}`}
            >
              <div className={`text-[11px] font-semibold md:text-xs ${isToday ? "text-amber-800" : "text-slate-600"}`}>{d.getDate()}</div>
              <CalendarDayCapacity events={list} />
              <div className="mt-1 space-y-1">
                {list.slice(0, 4).map(ev => (
                  <EventChip key={ev.id} event={ev} compact={compact} role={role} onClick={() => onEventClick?.(ev)} />
                ))}
                {list.length > 4 && <div className="text-[11px] text-slate-500">+{list.length-4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
