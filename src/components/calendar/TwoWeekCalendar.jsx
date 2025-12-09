import React, { useEffect, useMemo, useState } from "react";
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
  focusToday = false,        // when weeks=1 shows a stacked list for today
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
  }, [range.start.getTime(), range.end.getTime(), getEvents]);

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
          <div className="text-sm text-muted-foreground">Today</div>
          <div className="text-sm">
            {today.toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" })}
          </div>
        </div>
        <div className="border rounded p-2 bg-white">
          {list.length === 0 ? (
            <div className="text-sm text-muted-foreground">No events today.</div>
          ) : (
            <div className="space-y-1">
              {list.sort((a,b)=>new Date(a.start)-new Date(b.start)).map(ev => (
                <EventChip key={ev.id} event={ev} compact={false} onClick={() => onEventClick?.(ev)} />
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
      <div className="flex items-center justify-between sticky top-0 z-[1] bg-white/90 backdrop-blur px-1 py-1 border rounded">
        <button className="border rounded px-2 py-1 text-sm" onClick={() => setAnchor(addDays(anchor, -(showWeekends?7:5)))}>Prev</button>
        <div className="flex items-center gap-2">
          <button className="border rounded px-2 py-1 text-sm" onClick={() => setAnchor(startOfWeek(new Date()))}>Today</button>
          <div className="text-sm text-muted-foreground">
            {days[0]?.toLocaleDateString()} – {days[days.length-1]?.toLocaleDateString()}
          </div>
        </div>
        <button className="border rounded px-2 py-1 text-sm" onClick={() => setAnchor(addDays(anchor, (showWeekends?7:5)))}>Next</button>
      </div>

      {/* Weekday header */}
      {showWeekdayHeader && (
        <div className={"grid text-xs text-muted-foreground " + (showWeekends ? "grid-cols-7" : "grid-cols-5")}>
          {WD.filter((_,i)=> showWeekends || (i!==0 && i!==6)).map((d)=>(<div key={d} className="px-2 py-1">{d}</div>))}
        </div>
      )}

      {/* Grid */}
      <div className={"grid border rounded overflow-hidden bg-white " + (showWeekends ? "grid-cols-7" : "grid-cols-5")}>
        {days.map((d, i) => {
          const list = (byDay.get(d.toDateString()) || []).sort((a,b)=>new Date(a.start)-new Date(b.start));
          return (
            <div key={i} className="min-h-[140px] border -m-[0.5px] p-1 md:p-2">
              <div className="text-[11px] md:text-xs font-medium">{d.getDate()}</div>
              <div className="mt-1 space-y-1">
                {list.slice(0, 4).map(ev => (
                  <EventChip key={ev.id} event={ev} compact={compact} onClick={() => onEventClick?.(ev)} />
                ))}
                {list.length > 4 && <div className="text-[11px] text-muted-foreground">+{list.length-4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



