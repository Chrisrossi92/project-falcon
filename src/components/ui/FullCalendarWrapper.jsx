// src/components/ui/FullCalendarWrapper.jsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// Correct two-week view: use weeks, not days
const twoWeekView = {
  type: 'dayGrid',
  duration: { weeks: 2 },
  buttonText: '2 weeks',
};

const FullCalendarWrapper = forwardRef(function FullCalendarWrapper(
  { events = [], initialView = 'dayGridMonth', onEventClick },
  ref
) {
  const calRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getApi: () => calRef.current?.getApi?.(),
  }));

  return (
    <FullCalendar
      ref={calRef}
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView={initialView}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridTwoWeek',
      }}
      views={{ dayGridTwoWeek: twoWeekView }}
      events={events}
      eventClick={onEventClick}
      displayEventTime={false}
      // Make rows roomy
      expandRows={true}
      dayMaxEvents={3}
      height="auto"
      eventMouseEnter={(info) => {
        const { event } = info;
        info.el.title =
          event.title +
          (event.extendedProps?.orderId ? ` (Order ${event.extendedProps.orderId})` : '');
      }}
    />
  );
});

export default FullCalendarWrapper;




