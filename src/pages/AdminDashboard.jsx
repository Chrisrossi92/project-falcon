import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import { Card } from '@/components/ui/card';
import DashboardCalendar from '@/components/DashboardCalendar';
import DashboardCard from '@/components/DashboardCard';
import OrdersTable from '@/components/orders/OrdersTable';

const AdminDashboard = () => {
  const { user } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:client_id ( name ),
          appraiser:appraiser_id ( name )
        `)
        .order('id', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } else {
        const transformed = data.map(order => ({
          ...order,
          client_name: order.client?.name || order.manual_client || '—',
          appraiser_name: order.appraiser?.name || order.manual_appraiser || '—',
        }));
        setOrders(transformed);
      }

      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {/* Calendar Section */}
      <DashboardCard title="📅 Upcoming Activity">
        <DashboardCalendar compact={false} role="admin" />
      </DashboardCard>

      {/* Orders Table Section */}
      <Card className="p-6">
        <h2 className="text-xl font-medium mb-4 text-gray-700">📋 Open Orders</h2>
        <OrdersTable orders={orders} loading={loading} />
      </Card>
    </div>
  );
};

export default AdminDashboard;

















