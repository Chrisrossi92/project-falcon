// src/components/DashboardCalendar.jsx
import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import holidays from '../data/usHolidays2025.json';

const DashboardCalendar = ({ onOrderSelect = null, compact = false }) => {
  const navigate = useNavigate();
  const { user } = useSession();
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({
    site: true,
    review: true,
    due: true,
    holidays: !compact,
  });
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [ordersRes, appointmentsRes] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('appointments').select('*')
      ]);

      if (ordersRes.error || appointmentsRes.error) {
        console.error('Fetch error:', ordersRes.error || appointmentsRes.error);
        return;
      }

      setOrders(ordersRes.data);
      setAppointments(appointmentsRes.data);
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const allEvents = [];

    if (filters.site) {
      appointments.forEach(app => {
        if (user.role === 'admin' || (user.role === 'appraiser' && app.user_id === user.id)) {
          const order = orders.find(o => o.id === app.order_id);
          if (order) {
            allEvents.push({
              title: compact ? '📍' : `📍 ${order.address}`,
              date: app.date,
              backgroundColor: '#6EE7B7',
              borderColor: '#059669',
              textColor: '#065F46',
              extendedProps: { type: 'site', orderId: order.id }
            });
          }
        }
      });
    }

    if (filters.review) {
      orders.forEach(order => {
        if ((user.role === 'admin' || user.role === 'reviewer') && ['Review', 'Needs Review'].includes(order.status)) {
          allEvents.push({
            title: compact ? '🔍' : `🔍 ${order.address}`,
            date: order.updated_at || order.created_at,
            backgroundColor: '#FDE68A',
            borderColor: '#F59E0B',
            textColor: '#92400E',
            extendedProps: { type: 'review', orderId: order.id }
          });
        }
      });
    }

    if (filters.due) {
      orders.forEach(order => {
        if (user.role === 'admin' || (user.role === 'appraiser' && order.appraiser_id === user.id)) {
          allEvents.push({
            title: compact ? '⏰' : `⏰ ${order.address}`,
            date: order.due_date,
            backgroundColor: '#BFDBFE',
            borderColor: '#2563EB',
            textColor: '#1E3A8A',
            extendedProps: { type: 'due', orderId: order.id }
          });
        }
      });
    }

    if (filters.holidays && !compact) {
      holidays.forEach(holiday => {
        allEvents.push({
          title: `🎉 ${holiday.name}`,
          date: holiday.date,
          display: 'background',
          backgroundColor: '#F3F4F6',
          textColor: '#6B7280'
        });
      });
    }

    setEvents(allEvents);
  }, [filters, orders, appointments, user, compact]);

  const handleEventClick = (info) => {
    const orderId = info.event.extendedProps.orderId;
    if (!orderId) return;

    if (onOrderSelect) {
      onOrderSelect(orderId);
    } else {
      navigate(`/orders/${orderId}`);
    }
  };

  return (
    <div className={`${compact ? 'bg-transparent shadow-none p-0 mt-0' : 'bg-white shadow-lg p-4 mt-4'} rounded-xl`}>
      {!compact && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
          <span className="text-sm text-gray-500">
            {calendarRef.current?.getApi()?.view?.title}
          </span>
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView={compact ? 'dayGridTwoWeek' : 'dayGridTwoWeek'}
        views={{
          dayGridTwoWeek: {
            type: 'dayGrid',
            duration: { weeks: 2 },
            buttonText: '2 week'
          }
        }}
        headerToolbar={
          compact
            ? false
            : {
                start: 'dayGridDay,dayGridWeek,dayGridTwoWeek,dayGridMonth',
                center: '',
                end: '',
              }
        }
        events={events}
        eventClick={handleEventClick}
        height={compact ? 250 : 'auto'}
        eventDisplay={compact ? 'auto' : 'block'}
      />

      {compact && (
        <div className="mt-2 text-sm text-gray-600 space-x-4 flex flex-wrap justify-center">
          <span>📍 Site Visit</span>
          <span>🔍 Review</span>
          <span>⏰ Due</span>
        </div>
      )}
    </div>
  );
};

export default DashboardCalendar;



