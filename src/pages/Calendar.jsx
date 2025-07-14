import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import supabase from '../lib/supabaseClient';

const CalendarPage = ({ compactMode = false }) => {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const [view, setView] = useState('dayGridMonth');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) {
        console.error('Error fetching orders:', error.message);
        return;
      }
      setOrders(data);
    };

    fetchOrders();
  }, []);

  const buildEvents = () => {
    return orders.map((order) => ({
      id: order.id,
      title: `${order.address || 'Order'} (${order.status})`,
      date: order.due_date,
      extendedProps: { ...order },
    }));
  };

  const handleEventClick = (info) => {
    const orderId = info.event.id;
    navigate(`/orders/${orderId}`);
  };

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(view);
    }
  }, [view]);

  const changeView = (newView) => setView(newView);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">
          Shared Calendar
        </h1>
        <div className="flex space-x-2">
          {[
            { label: 'Month', value: 'dayGridMonth' },
            { label: 'Week', value: 'timeGridWeek' },
            { label: 'Day', value: 'timeGridDay' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => changeView(value)}
              className={`px-4 py-2 rounded-xl shadow-md transition transform hover:scale-105 hover:shadow-xl ${
                view === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white shadow-2xl rounded-2xl p-6 transition-all duration-300 transform hover:shadow-3xl hover:scale-[1.01]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          events={buildEvents()}
          eventClick={handleEventClick}
          height="auto"
          headerToolbar={false}
        />
      </div>
    </div>
  );
};

export default CalendarPage;


