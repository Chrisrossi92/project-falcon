// components/ui/calendar/FullCalendarWrapper.jsx
import React, { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

const FullCalendarWrapper = forwardRef((
  { events = [], onEventClick, initialView = 'dayGridTwoWeek', compact = false },
  ref
) => {
  return (
    <FullCalendar
      ref={ref}
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
      initialView={initialView}
      events={events}
      eventClick={onEventClick}
      height={compact ? 'auto' : '600px'}
      dayMaxEventRows={3}
      dayMaxEvents={true}
      fixedWeekCount={false}
      contentHeight="auto"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridTwoWeek'
      }}
      views={{
        dayGridTwoWeek: {
          type: 'dayGrid',
          duration: { weeks: 2 },
          buttonText: 'Two Weeks'
        }
      }}
      buttonText={{
        today: 'Today',
        month: 'Month',
        week: 'Week',
        day: 'Day'
      }}
    />
  );
});

FullCalendarWrapper.displayName = 'FullCalendarWrapper';
export default FullCalendarWrapper;


