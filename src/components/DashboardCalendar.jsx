// src/components/DashboardCalendar.jsx
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';
import useOrderEvents from '@/lib/hooks/useOrderEvents';
import FullCalendarWrapper from '@/components/ui/FullCalendarWrapper';
import { useOrders } from '@/lib/hooks/useOrders';
import { useRole } from '@/lib/hooks/useRole';

const DashboardCalendar = ({ onOrderSelect = null, compact = false }) => {
  const navigate = useNavigate();
  const { user } = useSession();
  const { role } = useRole();
  const calendarRef = useRef(null);
  const { orders } = useOrders();

  const [filters, setFilters] = useState({
    site: true,
    review: true,
    due: true,
    holidays: !compact,
  });

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
    <div className="dashboard-calendar relative">
      {!compact && (
        <div className="calendar-legend mb-4 group">
          <h3 className="text-lg font-medium mb-2 cursor-pointer">Legend</h3>
          <div className="legend-items space-y-2 absolute z-10 bg-white p-4 shadow-lg rounded-md hidden group-hover:block">
            <div className="legend-item flex items-center">
              <span className="legend-icon mr-2">📍</span> Site Visit
            </div>
            <div className="legend-item flex items-center">
              <span className="legend-icon mr-2">🔍</span> Review Due
            </div>
            <div className="legend-item flex items-center">
              <span className="legend-icon mr-2">⏰</span> Final Due
            </div>
            <div className="legend-item flex items-center">
              <span className="legend-icon mr-2">🎉</span> Holiday
            </div>
          </div>
        </div>
      )}

      <FullCalendarWrapper
        ref={calendarRef}
        events={events}
        onEventClick={handleEventClick}
        initialView={compact ? 'listWeek' : 'dayGridTwoWeek'}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: compact ? '' : 'dayGridMonth,timeGridWeek,dayGridTwoWeek,listWeek',
        }}
      />
    </div>
  );
};

export default DashboardCalendar;




