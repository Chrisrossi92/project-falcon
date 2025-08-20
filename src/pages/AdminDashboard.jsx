// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import DashboardCalendar from '@/components/DashboardCalendar';
import DashboardCard from '@/components/DashboardCard';
import OrdersTable from '@/components/orders/OrdersTable';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';

const AdminDashboard = () => {
  const { user, isAdmin, isReviewer } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchOrders = async () => {
      if (!user?.id && !isAdmin && !isReviewer) return;

      setLoading(true);
      setError(null);

      // ✅ Valid PostgREST select with proper embeds:
      // - clients via client_id
      // - appraiser via users (appraiser_id → users.id)
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:client_id ( name ),
          appraiser:appraiser_id ( id, display_name, name, email )
        `)
        .order('created_at', { ascending: false });

      // Non-admin/reviewer: only see your own orders
      if (!isAdmin && !isReviewer && user?.id) {
        query = query.eq('appraiser_id', user.id);
      }

      const { data, error: fetchError } = await query;

      if (!mounted) return;

      if (fetchError) {
        console.error('Orders fetch error:', fetchError);
        setError(fetchError.message);
        setOrders([]);
      } else {
        const withNames = (data || []).map((order) => ({
          ...order,
          client_name: order.client?.name || order.manual_client || '—',
          appraiser_name:
            order.appraiser?.display_name ||
            order.appraiser?.name ||
            order.manual_appraiser ||
            '—',
        }));
        setOrders(withNames);
      }

      setLoading(false);
    };

    fetchOrders();
    return () => {
      mounted = false;
    };
  }, [isAdmin, isReviewer, user?.id]);

  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const openOrders = orders.filter((o) => o.status !== 'Completed');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <DashboardCard title="📅 Upcoming Activity">
        {/* Keep your component exactly as before */}
        <DashboardCalendar compact={false} role="admin" />
      </DashboardCard>

      <Card className="p-6">
        <h2 className="text-xl font-medium mb-4 text-gray-700">📋 Open Orders</h2>
        <OrdersTable orders={openOrders} loading={loading} />
      </Card>
    </div>
  );
};

export default AdminDashboard;





















