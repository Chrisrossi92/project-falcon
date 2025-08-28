// src/components/admin/AdminCalendar.jsx
import React from "react";
import { Calendar, dateFnsLocalizer, Navigate } from "react-big-calendar";
import TimeGrid from "react-big-calendar/lib/TimeGrid";
import { format, parse, startOfWeek, getDay, addMinutes, startOfDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { useAdminCalendar } from "@/lib/hooks/useAdminCalendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), getDay,
  locales: { "en-US": enUS },
});

// 2-week custom view
function range14(date, { localizer }) {
  const start = localizer.startOf(date, "week");
  return Array.from({ length: 14 }, (_, i) => localizer.add(start, i, "day"));
}
function title14(date, { localizer }) {
  const start = localizer.startOf(date, "week");
  const end = localizer.add(start, 13, "day");
  return `${localizer.format(start, "MMM d")} – ${localizer.format(end, "MMM d, yyyy")}`;
}
function navigate14(date, action, { localizer }) {
  switch (action) {
    case Navigate.PREVIOUS: return localizer.add(date, -14, "day");
    case Navigate.NEXT:     return localizer.add(date, 14, "day");
    default:                return date;
  }
}
function TwoWeekView(props) {
  const { date, localizer: lz } = props;
  const range = range14(date, { localizer: lz });
  return <TimeGrid {...props} range={range} eventOffset={15} />;
}
TwoWeekView.range = range14;
TwoWeekView.navigate = navigate14;
TwoWeekView.title = title14;

export default function AdminCalendar() {
  const { events } = useAdminCalendar({ daysBack: 7, daysForward: 7 });

  const eventPropGetter = (event) => {
    const t = event?.resource?.type;
    let bg = "#10b981"; // site → green
    if (t === "review") bg = "#0284c7"; // review → blue
    if (t === "final")  bg = "#a855f7"; // final  → purple
    return { style: { backgroundColor: bg, borderColor: bg, color: "white" } };
  };

  // Ensure date-only events show at reasonable hours
  const onRangeChange = () => {}; // noop; rbc requires a handler sometimes

  return (
    <div className="rounded-xl overflow-hidden">
      <Calendar
        localizer={localizer}
        events={events.map((e) => {
          const start = e.start?.getHours?.() === 0 && e.start?.getMinutes?.() === 0
            ? addMinutes(startOfDay(e.start), e.resource?.type === "site" ? 540 : 1020)
            : e.start;
          const end = e.end || addMinutes(start, 30);
          return { ...e, start, end };
        })}
        defaultView="twoWeek"
        views={{ month: true, week: true, day: true, twoWeek: TwoWeekView }}
        toolbar
        popup
        step={30}
        timeslots={2}
        style={{ height: 520 }}
        min={new Date(1970, 0, 1, 7, 0)}
        max={new Date(1970, 0, 1, 19, 0)}
        eventPropGetter={eventPropGetter}
        onRangeChange={onRangeChange}
      />
    </div>
  );
}






