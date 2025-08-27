// src/components/ui/FullCalendarWrapper.jsx
import React, { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

/**
 * Props:
 *  - events: Array of FullCalendar events
 *  - initialView?: 'timeGridWeek' | 'dayGridMonth' | ...
 *  - onRangeChange?: ({ start: Date, end: Date }) => void
 *  - onEventClick?: (event) => void
 */
export default function FullCalendarWrapper({
  events = [],
  initialView = "timeGridWeek",
  onRangeChange,
  onEventClick,
}) {
  const ref = useRef(null);

  const handleDatesSet = (arg) => {
    onRangeChange?.({ start: arg.start, end: arg.end });
  };

  const handleEventClick = (clickInfo) => {
    try {
      onEventClick?.(clickInfo?.event?.extendedProps || clickInfo?.event);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-2">
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        nowIndicator
        events={events}
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        eventDisplay="block"
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
      />
    </div>
  );
}







