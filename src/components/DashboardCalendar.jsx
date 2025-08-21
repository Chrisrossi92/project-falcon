// src/components/DashboardCalendar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import useOrderEvents from '@/lib/hooks/useOrderEvents';
import FullCalendarWrapper from '@/components/ui/FullCalendarWrapper';
import CalendarLegend from '@/components/ui/CalendarLegend';

export default function DashboardCalendar() {
  const { user } = useSession();
  const navigate = useNavigate();
  const calRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lightweight 2-week dashboard scope
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Keep it simple: pull all orders (role-narrowing optional on dashboard)
        const { data, error } = await supabase.from('orders').select('*');
        if (error) throw error;
        if (mounted) setOrders(data || []);
      } catch (e) {
        console.error('DashboardCalendar orders load failed:', e.message);
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // Only show the 3 MVP event types; color by appraiser
  const events = useOrderEvents({
    orders,
    user,
    filters: { site: true, review: true, due: true },
  });

  const handleEventClick = (info) => {
    const orderId = info.event.extendedProps?.orderId;
    if (orderId) navigate(`/orders/${orderId}`);
  };

  // quick helpers for header buttons on the card
  const changeView = (view) => calRef.current?.getApi()?.changeView(view);
  const nav = (dir) => (dir === 'prev'
    ? calRef.current?.getApi()?.prev()
    : dir === 'next'
      ? calRef.current?.getApi()?.next()
      : calRef.current?.getApi()?.today());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium text-gray-700">Legend</div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav('prev')} className="px-3 py-1 rounded border">‹</button>
          <button onClick={() => nav('today')} className="px-3 py-1 rounded border">today</button>
          <button onClick={() => nav('next')} className="px-3 py-1 rounded border">›</button>
          <button onClick={() => changeView('dayGridMonth')} className="px-3 py-1 rounded border">month</button>
          <button onClick={() => changeView('dayGridWeek')} className="px-3 py-1 rounded border">week</button>
          <button onClick={() => changeView('dayGridTwoWeek')} className="px-3 py-1 rounded border">2 weeks</button>
        </div>
      </div>

      <CalendarLegend />

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">Loading…</div>
        ) : (
          <FullCalendarWrapper
            ref={calRef}
            events={events}
            onEventClick={handleEventClick}
            initialView="dayGridTwoWeek"
          />
        )}
      </div>
    </div>
  );
}





