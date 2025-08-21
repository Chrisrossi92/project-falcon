// pages/Calendar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import useOrderEvents from '@/lib/hooks/useOrderEvents';
import FullCalendarWrapper from '@/components/ui/FullCalendarWrapper';
import holidays from '@/data/usHolidays2025.json';

// Simple chip UI
function ToggleChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm ${
        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const calendarRef = useRef(null);

  // Admin MVP: only three event types + optional holidays
  const [filters, setFilters] = useState({
    site: true,
    review: true,
    due: true,
    holidays: false,
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pull orders; narrow by role for relevance
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        let query = supabase.from('orders').select('*');

        const role = (user?.role || '').toLowerCase();
        if (role === 'appraiser') {
          query = query.eq('appraiser_id', user.id);
        } else if (role === 'reviewer') {
          // Show items that are in or nearing review
          query = query.in('status', ['Review', 'In Progress']);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!mounted) return;
        setOrders(data || []);
      } catch (e) {
        console.error('Error fetching orders for calendar:', e.message);
        if (!mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.role]);

  // Convert orders -> events with our hook (adds appraiser color)
  const orderEvents = useOrderEvents({ orders, user, filters });

  // Optional: holiday events
  const holidayEvents = useMemo(() => {
    if (!filters.holidays) return [];
    // holidays JSON is [{date:'YYYY-MM-DD', name:'…'}]
    return (holidays || []).map((h) => ({
      title: `🎉 ${h.name}`,
      start: h.date,
      type: 'holiday',
      backgroundColor: '#6b7280',
      textColor: 'white',
    }));
  }, [filters.holidays]);

  const events = useMemo(() => [...orderEvents, ...holidayEvents], [orderEvents, holidayEvents]);

  const handleEventClick = (info) => {
    const orderId = info.event.extendedProps?.orderId;
    if (orderId) navigate(`/orders/${orderId}`);
  };

  // View switch helpers
  const changeView = (viewName) => calendarRef.current?.getApi()?.changeView(viewName);

  return (
    <div className="p-6 space-y-4">
      {/* Title & view buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Admin Calendar</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border" onClick={() => changeView('dayGridMonth')}>
            Month
          </button>
          <button className="px-3 py-1 rounded border" onClick={() => changeView('dayGridWeek')}>
            Week
          </button>
          <button className="px-3 py-1 rounded border" onClick={() => changeView('dayGridTwoWeek')}>
            Two Weeks
          </button>
        </div>
      </div>

      {/* Toggle chips per MVP spec */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleChip
          active={filters.site}
          onClick={() => setFilters((f) => ({ ...f, site: !f.site }))}
        >
          📍 Site Visits
        </ToggleChip>
        <ToggleChip
          active={filters.review}
          onClick={() => setFilters((f) => ({ ...f, review: !f.review }))}
        >
          🔍 Due for Review
        </ToggleChip>
        <ToggleChip
          active={filters.due}
          onClick={() => setFilters((f) => ({ ...f, due: !f.due }))}
        >
          ⏰ Due to Client
        </ToggleChip>
        <ToggleChip
          active={filters.holidays}
          onClick={() => setFilters((f) => ({ ...f, holidays: !f.holidays }))}
        >
          🎉 Holidays
        </ToggleChip>
      </div>

      <div className="bg-white shadow-2xl rounded-2xl p-4 border">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">Loading events…</div>
        ) : (
          <FullCalendarWrapper
            ref={calendarRef}
            events={events}
            onEventClick={handleEventClick}
            initialView="dayGridMonth"
          />
        )}
      </div>
    </div>
  );
}





