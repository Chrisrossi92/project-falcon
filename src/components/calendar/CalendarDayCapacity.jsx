import { classifyCalendarDayCapacity } from "@/lib/calendar/calendarCapacity";

export default function CalendarDayCapacity({ events = [] }) {
  const capacity = classifyCalendarDayCapacity(events);

  return (
    <div
      className="mt-1.5"
      data-calendar-capacity={capacity.id}
      aria-label={`Day capacity: ${capacity.label}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-[10px] font-semibold uppercase tracking-[0.08em] ${capacity.textClassName}`}>
          {capacity.label}
        </span>
        {events.length > 0 ? (
          <span className="shrink-0 text-[10px] font-medium text-slate-400">
            {events.length}
          </span>
        ) : null}
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${capacity.widthClassName} ${capacity.trackClassName}`} />
      </div>
    </div>
  );
}
