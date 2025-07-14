// components/ui/calendar.jsx
import React, { forwardRef } from 'react';
import CalendarLib from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Optional default styles

const Calendar = forwardRef((props, ref) => {
  return <CalendarLib ref={ref} {...props} />;
});

Calendar.displayName = 'Calendar';

export { Calendar };

