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

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from('orders').select('*');

      if (user.role === 'appraiser') {
        query = query.eq('appraiser_id', user.id);
      } else if (user.role === 'reviewer') {
        query = query.in('status', ['In Review', 'Needs Review']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Fetch error:', error);
        return;
      }
      setOrders(data || []);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const allEvents = [];
    if (filters.site) {
      orders.forEach(order => {
        if (order.site_visit_date && (user.role === 'admin' || (user.role === 'appraiser' && order.appraiser_id === user.id))) {
          allEvents.push({
            title: `📍 ${order.address}`,
            date: order.site_visit_date,
            backgroundColor: '#6EE7B7',
            borderColor: '#059669',
            textColor: '#065F46',
            extendedProps: { type: 'site', orderId: order.id }
          });
        }
      });
    }
    if (filters.review) {
      orders.forEach(order => {
        if (order.review_due_date && (user.role === 'admin' || user.role === 'reviewer') && ['Needs Review'].includes(order.status)) {
          allEvents.push({
            title: `🔍 ${order.address}`,
            date: order.review_due_date,
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
        if (order.due_date && (user.role === 'admin' || (user.role === 'appraiser' && order.appraiser_id === user.id))) {
          allEvents.push({
            title: `⏰ ${order.address}`,
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
  }, [filters, orders, user, compact]);

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
    <div className="relative">
      {!compact && (
        <>
          <h2>Calendar</h2>
          <h3>{calendarRef.current?.getApi()?.view?.title}</h3>
        </>
      )}
      {compact && (
        <div>
          <span>📍 Site Visit</span>
          <span>🔍 Review</span>
          <span>⏰ Due</span>
        </div>
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridTwoWeek"
        events={events}
        eventClick={handleEventClick}
        height={compact ? 'auto' : '600px'}
        customButtons={{
          twoWeekButton: {
            text: 'Two Weeks',
            click: () => {
              calendarRef.current.getApi().changeView('dayGridTwoWeek');
            }
          }
        }}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,twoWeekButton'
        }}
        views={{
          dayGridTwoWeek: {
            type: 'dayGrid',
            duration: { weeks: 2 },
            buttonText: '2 Weeks'
          }
        }}
      />
      {/* Hover Legend */}
      <div className="absolute top-2 right-2 group">
        <span className="text-gray-500 cursor-help">ℹ️</span>
        <div className="hidden group-hover:block absolute z-10 bg-white p-2 shadow-md rounded text-sm">
          <p>📍 Site Visit</p>
          <p>🔍 Review Due</p>
          <p>⏰ Final Due</p>
          <p>🎉 Holiday</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardCalendar;



