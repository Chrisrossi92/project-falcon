import React, { useMemo } from "react";

function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(d) ? "—" : d.toLocaleString();
}

function groupByDate(events = []) {
  const map = new Map();
  events.forEach((e) => {
    const key = new Date(e.start).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  });
  return Array.from(map.entries())
    .map(([k, v]) => ({ label: k, events: v.sort((a, b) => new Date(a.start) - new Date(b.start)) }))
    .sort((a, b) => new Date(a.events[0].start) - new Date(b.events[0].start));
}

/**
 * UpcomingEventsList — shows exactly the same events the calendar uses
 * props: events (array from AdminCalendar onEventsChange)
 */
export default function UpcomingEventsList({ events = [], max = 15 }) {
  const upcoming = useMemo(() => {
    const now = new Date();
    return (events || [])
      .filter((e) => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, max);
  }, [events, max]);

  const groups = useMemo(() => groupByDate(upcoming), [upcoming]);

  return (
    <div className="h-full overflow-auto rounded border bg-white">
      {groups.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">No upcoming events.</div>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="border-b last:border-0">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">{g.label}</div>
            <ul>
              {g.events.map((e) => (
                <li key={`${e.id}-${e.start}`} className="px-3 py-2 flex items-center justify-between text-sm hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.title}</div>
                    {e.extendedProps?.appraiser && (
                      <div className="text-xs text-muted-foreground truncate">
                        {e.extendedProps.appraiser}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(e.start)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
