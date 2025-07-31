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
    const fetchOrders = async () => {
      let query = supabase
        .from('orders')
        .select(`
          *, 
          clients:client_id ( name ),
          users:appraiser_id ( name )
        `);

      if (!isAdmin && !isReviewer) {
        query = query.eq('appraiser_id', user.id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) {
        console.error('Orders fetch error:', fetchError);
        setError(fetchError.message);
      } else {
        const withNames = (data || []).map(order => ({
          ...order,
          client_name: order.clients?.name || order.manual_client || '—',
          appraiser_name: order.users?.name || order.manual_appraiser || '—',
        }));
        setOrders(withNames);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [isAdmin, isReviewer, user.id]);

  if (error) return <div>Error: {error}</div>;

  const openOrders = orders.filter(order => order.status !== 'Completed');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <DashboardCard title="📅 Upcoming Activity">
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


















