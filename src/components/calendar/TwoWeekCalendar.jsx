import React, { useMemo, useState, useEffect, useRef } from "react";
import DayCell from "./DayCell";
import DayAccordion from "./DayAccordion";
import CalendarFiltersBar from "./CalendarFiltersBar";
import useCalendarEvents from "./useCalendarEvents";
import useCalendarFilters from "./useCalendarFilters";

// date helpers
function startOfWeek(date, firstDay = 0) {
  const d = new Date(date);
  const diff = (d.getDay() - firstDay + 7) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function sameDay(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

/**
 * TwoWeekCalendar
 *  - two-week grid, current week on top
 *  - reusable; accepts a custom getEvents loader
 *  - filters (+mine), heat-tint, keyboard nav, inline day accordion
 *
 * props:
 *  - className, style
 *  - firstDay (0=Sun, 1=Mon)
 *  - weeks (default 2)
 *  - dense (tighter cell height)
 *  - getEvents(start:Date, end:Date) -> Promise<events[]>
 *  - onEventsChange(filteredEvents)
 *  - onEventClick(event)
 *  - meName (string used when "Mine" is toggled; we can move to id-based later)
 *  - defaultMine (bool; default off)
 *  - hideMineChip (bool; hide the “Mine” chip entirely)
 *  - showFilters (default true)
 *  - showWeekdayHeader (default true)
 */
export default function TwoWeekCalendar({
  className = "",
  style = {},
  firstDay = 0,
  weeks = 2,
  dense = false,
  getEvents,
  onEventsChange,
  onEventClick,
  meName = "",
  defaultMine = false,
  hideMineChip = false,
  showFilters = true,
  showWeekdayHeader = true,
}) {
  // anchor dates & visible range
  const [anchor, setAnchor] = useState(() => new Date());
  const start = useMemo(() => startOfWeek(anchor, firstDay), [anchor, firstDay]);
  const end   = useMemo(() => addDays(start, 7 * weeks), [start, weeks]);

  // events
  const defaultLoader = useCalendarEvents();
  const [rawEvents, setRawEvents] = useState([]);
  const [expandedKey, setExpandedKey] = useState(null);
  const gridRef = useRef(null);

  // filters
  const { chips, predicate } = useCalendarFilters({ defaultMine });
  const displayChips = hideMineChip ? chips.filter((c) => c.key !== "mine") : chips;

  // fetch events for visible range
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const list = await (getEvents ? getEvents(start, end) : defaultLoader(start, end));
        if (!ok) return;
        setRawEvents(list || []);
      } catch (e) {
        console.warn("calendar events error:", e?.message || e);
        setRawEvents([]);
      }
    })();
    return () => { ok = false; };
  }, [start, end, getEvents, defaultLoader]);

  // filter & counts
  const filteredEvents = useMemo(
    () => (rawEvents || []).filter((ev) => predicate(ev, meName)),
    [rawEvents, predicate, meName]
  );

  useEffect(() => { onEventsChange?.(filteredEvents); }, [filteredEvents, onEventsChange]);

  const typeCounts = useMemo(() => {
    const acc = { site_visit: 0, due_for_review: 0, due_to_client: 0, mine: 0 };
    for (const ev of rawEvents) {
      if (ev.type && acc.hasOwnProperty(ev.type)) acc[ev.type]++;
      if (meName && ev.appraiser && String(ev.appraiser).toLowerCase().includes(meName.toLowerCase())) acc.mine++;
    }
    return acc;
  }, [rawEvents, meName]);

  // visible days
  const days = useMemo(() => Array.from({ length: 7 * weeks }, (_, i) => addDays(start, i)), [start, weeks]);

  // map day -> events
  const eventsByDay = useMemo(() => {
    const map = new Map(days.map((d) => [d.toDateString(), []]));
    (filteredEvents || []).forEach((ev) => {
      const d = new Date(ev.start);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      if (map.has(key)) map.get(key).push(ev);
    });
    for (const [, list] of map) list.sort((a, b) => new Date(a.start) - new Date(b.start));
    return map;
  }, [days, filteredEvents]);

  // heat tint per day (based on filtered count)
  const heatByDay = useMemo(() => {
    const counts = new Map();
    let max = 0;
    for (const d of days) {
      const key = d.toDateString();
      const count = (eventsByDay.get(key) || []).length;
      counts.set(key, count);
      if (count > max) max = count;
    }
    // normalize 0..1
    const map = new Map();
    for (const [k, c] of counts.entries()) {
      map.set(k, max ? Math.min(1, c / Math.max(3, max)) : 0);
    }
    return map;
  }, [days, eventsByDay]);

  // keyboard nav (on container focus)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    function onKeyDown(e) {
      if (e.key === "ArrowLeft")  { e.preventDefault(); setAnchor((a) => addDays(a, -1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); setAnchor((a) => addDays(a, +1)); }
      if (e.key === "PageUp")     { e.preventDefault(); setAnchor((a) => addDays(a, -7)); }
      if (e.key === "PageDown")   { e.preventDefault(); setAnchor((a) => addDays(a, +7)); }
      if (e.key.toLowerCase() === "t") { e.preventDefault(); setAnchor(new Date()); }
      if (e.key === "Escape")     { setExpandedKey(null); }
    }
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, []);

  const weekdayLabels = firstDay === 1
    ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const rowClass = dense ? "min-h-[104px]" : "min-h-[140px]";
  const today = new Date();

  return (
    <div className={`h-full flex flex-col ${className}`} style={style}>
      {/* Filters row */}
      {showFilters && (
        <CalendarFiltersBar
          chips={displayChips}
          counts={typeCounts}
          className="mb-2"
        />
      )}

      <div
        ref={gridRef}
        tabIndex={0}
        className="flex-1 min-h-0 rounded-lg border bg-white overflow-hidden shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {/* Weekday header */}
        {showWeekdayHeader && (
          <div className="grid grid-cols-7 border-b text-[12px] font-medium text-muted-foreground bg-slate-50/40">
            {weekdayLabels.map((w, i) => (
              <div key={i} className="px-3 py-2">{w}</div>
            ))}
          </div>
        )}

        {/* Grid rows */}
        <div className={`grid ${weeks === 2 ? "grid-rows-2" : `grid-rows-${weeks}`} h-[calc(100%-32px)]`}>
          {Array.from({ length: weeks }).map((_, r) => (
            <div key={r} className="grid grid-cols-7">
              {days.slice(r * 7, r * 7 + 7).map((d, i) => {
                const key = d.toDateString();
                const list = eventsByDay.get(key) || [];
                const heat = heatByDay.get(key) || 0;

                return (
                  <DayCell
                    key={i}
                    date={d}
                    isToday={sameDay(d, today)}
                    events={list}
                    heat={heat}
                    onEventClick={(ev) => onEventClick?.(ev)}
                    onExpand={() => setExpandedKey(expandedKey === key ? null : key)}
                    className={rowClass}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Inline day accordion */}
      {expandedKey && (
        <div className="mt-2">
          <DayAccordion
            date={new Date(expandedKey)}
            events={eventsByDay.get(expandedKey) || []}
            onEventClick={(ev) => onEventClick?.(ev)}
            onClose={() => setExpandedKey(null)}
          />
        </div>
      )}
    </div>
  );
}




