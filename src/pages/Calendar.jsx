// src/pages/Calendar.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';
import FullCalendarWrapper from '@/components/ui/FullCalendarWrapper';
import { listAdminEvents } from '@/lib/api/calendar';

const CalendarPage = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [filters] = useState({ site_visit: true, due_for_review: true, due_to_client: true });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await listAdminEvents();
        if (!mounted) return;
        const mapped = rows
          .filter(ev => filters[ev.event_type] !== false)
          .map(ev => ({
            title: ev.title,
            start: ev.start_at,
            end: ev.end_at || ev.start_at,
            extendedProps: { orderId: ev.order_id, type: ev.event_type, appraiserId: ev.appraiser_id },
          }));
        setEvents(mapped);
      } catch (e) {
        console.error("Calendar load failed:", e?.message);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id, filters]);

  const handleEventClick = (info) => {
    const orderId = info.event.extendedProps.orderId;
    if (orderId) navigate(`/orders/${orderId}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
          Shared Calendar
        </h1>
        <div className="flex space-x-2">
          {[
            { label: 'Month', value: 'dayGridMonth' },
            { label: 'Week', value: 'dayGridWeek' },
            { label: 'Two Weeks', value: 'dayGridTwoWeek' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => calendarRef.current?.getApi().changeView(value)}
              className="px-4 py-2 rounded-xl shadow-md transition transform hover:scale-105 hover:shadow-xl bg-white text-gray-800 border"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-2xl rounded-2xl p-6">
        <FullCalendarWrapper
          ref={calendarRef}
          events={events}
          onEventClick={handleEventClick}
          initialView="dayGridMonth"
        />
      </div>
    </div>
  );
};

export default CalendarPage;



