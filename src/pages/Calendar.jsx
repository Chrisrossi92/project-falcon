// pages/Calendar.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import useOrderEvents from '@/lib/hooks/useOrderEvents';
import FullCalendarWrapper from '@/components/ui/FullCalendarWrapper';

const CalendarPage = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const calendarRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [filters] = useState({ site: true, review: true, due: true, holidays: true });

  useEffect(() => {
    const fetchOrders = async () => {
      let query = supabase.from('orders').select('*');

      if (user.role === 'appraiser') {
        query = query.eq('appraiser_id', user.id);
      } else if (user.role === 'reviewer') {
        query = query.in('status', ['In Review', 'Needs Review']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error.message);
        return;
      }
      setOrders(data);
    };

    fetchOrders();
  }, [user]);

  const events = useOrderEvents({ orders, user, filters });

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


