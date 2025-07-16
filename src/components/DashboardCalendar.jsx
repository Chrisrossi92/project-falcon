// src/components/DashboardCalendar.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import useOrderEvents from '@/lib/hooks/useOrderEvents';
import FullCalendarWrapper from '@/components/ui/FullCalendarWrapper';

const DashboardCalendar = ({ onOrderSelect = null, compact = false }) => {
  const navigate = useNavigate();
  const { user } = useSession();
  const calendarRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    site: true,
    review: true,
    due: true,
    holidays: !compact,
  });

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

  const events = useOrderEvents({ orders, user, filters, compact });

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
      <FullCalendarWrapper
        ref={calendarRef}
        events={events}
        onEventClick={handleEventClick}
        compact={compact}
      />

      {/* Hover Legend */}
      <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
        <span className="text-gray-500 cursor-help group relative">
          ℹ️
          <div className="hidden group-hover:block absolute left-6 top-0 z-10 bg-white p-2 shadow-md rounded text-sm w-max">
            <p>📍 Site Visit</p>
            <p>🔍 Review Due</p>
            <p>⏰ Final Due</p>
            <p>🎉 Holiday</p>
          </div>
        </span>
        <span className="hidden sm:inline">Legend</span>
      </div>
    </div>
  );
};

export default DashboardCalendar;



