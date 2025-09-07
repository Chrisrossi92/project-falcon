// src/components/calendar/MonthCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import CalendarFiltersBar from "./CalendarFiltersBar";
import DayAccordion from "./DayAccordion";
import MonthDayCell from "./MonthDayCell";

function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function startOfWeek(d){ const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

export default function MonthCalendar({
  getEvents, onEventClick, showWeekends = true,
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [rawEvents, setRawEvents] = useState([]);
  const [expandedDate, setExpandedDate] = useState(null);

  const month = useMemo(() => {
    const first = startOfMonth(anchor);
    const last  = endOfMonth(anchor);
    const gridStart = startOfWeek(first);

    // Build 6 weeks of either 7 or 5 columns
    const weeks = [];
    let d = new Date(gridStart);
    for (let w=0; w<6; w++) {
      const row = [];
      for (let i=0; i<7; i++) {
        const day = new Date(d);
        if (showWeekends || (day.getDay() !== 0 && day.getDay() !== 6)) row.push(day);
        d = addDays(d, 1);
      }
      weeks.push(row);
    }
    const cells = weeks.flat();
    return { first, last, gridStart, weeks, cells, cols: showWeekends ? 7 : 5 };
  }, [anchor, showWeekends]);

  // Filters (use your existing filter bar)
  const [chipState, setChipState] = useState({ mine: false, site: true, review: true, final: true });
  const predicate = (e) =>
    (chipState.site && e.type === "site_visit") ||
    (chipState.review && e.type === "due_for_review") ||
    (chipState.final && e.type === "due_to_client") ||
    false; // when all are off

  // fetch events for the visible grid window (full 6 weeks)
  useEffect(() => {
    let ok = true;
    const start = month.weeks[0][0];
    const lastRow = month.weeks[month.weeks.length-1];
    const end = lastRow[lastRow.length-1];
    (async () => {
      try { const list = await getEvents?.(start, end); if (ok) setRawEvents(list || []); }
      catch { if (ok) setRawEvents([]); }
    })();
    return () => { ok = false; };
  }, [month.gridStart.getTime(), month.cols, getEvents]);

  const eventsByDay = useMemo(() => {
    const m = new Map(month.cells.map((d)=>[d.toDateString(), []]));
    (rawEvents || []).forEach((ev) => {
      const d = new Date(ev.start);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      if (m.has(key)) m.get(key).push(ev);
    });
    // filter by chips
    for (const [k, list] of m) m.set(k, list.filter((e) => predicate(e)));
    return m;
  }, [rawEvents, predicate, month.cells]);

  return (
    <div className="space-y-3">
      {/* Header with Today */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <button className="border rounded px-2 py-1 text-sm" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth()-1, 1))}>Prev</button>
          <button className="border rounded px-2 py-1 text-sm" onClick={() => setAnchor(new Date())}>Today</button>
          <button className="border rounded px-2 py-1 text-sm" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth()+1, 1))}>Next</button>
        </div>
        <div className="text-lg font-semibold">{anchor.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <div className="w-[120px]" />
      </div>

      <CalendarFiltersBar
        chips={[
          { key:"site",   label:"Site",   value:chipState.site,   onChange:(v)=>setChipState(s=>({...s,site:v})) },
          { key:"review", label:"Review", value:chipState.review, onChange:(v)=>setChipState(s=>({...s,review:v})) },
          { key:"final",  label:"Final",  value:chipState.final,  onChange:(v)=>setChipState(s=>({...s,final:v})) },
        ]}
        className="mt-1"
      />

      {/* Grid of counts (Mon–Fri collapse supported) */}
      <div className={`grid border rounded overflow-hidden bg-white ${month.cols === 7 ? "grid-cols-7" : "grid-cols-5"}`}>
        {month.cells.map((day, i) => (
          <MonthDayCell
            key={i}
            date={day}
            isOtherMonth={day.getMonth() !== anchor.getMonth()}
            count={(eventsByDay.get(day.toDateString()) || []).length}
            onExpand={() => setExpandedDate(day)}
          />
        ))}
      </div>

      {/* Accordion with details for a selected day */}
      {expandedDate && (
        <div className="mt-2">
          <DayAccordion
            date={expandedDate}
            events={(eventsByDay.get(expandedDate.toDateString()) || []).sort((a,b)=>new Date(a.start)-new Date(b.start))}
            onEventClick={(ev) => onEventClick?.(ev)}
            onClose={() => setExpandedDate(null)}
          />
        </div>
      )}
    </div>
  );
}

