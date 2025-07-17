import React, { useEffect, useState } from 'react';
import supabase from '/src/lib/supabaseClient.js';
import { useSession } from '@/lib/hooks/useSession';
import OrdersTable from '../components/orders/OrdersTable';
import DashboardCalendar from '../components/DashboardCalendar';
import DashboardCard from '../components/DashboardCard';  // Ensure this path is correct

const AppraiserDashboard = () => {
  const { user, loading } = useSession();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setError(null);

      if (!user?.id) {
        setError('User ID is not available.');
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:client_id (*),
          appraiser:appraiser_id (*)
        `)
        .eq('appraiser_id', user.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching orders:', error.message);
        setError(error.message);
      } else {
        setOrders(data);
      }
    };

    fetchOrders();
  }, [user]);

  if (loading) return <div>Loading your dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!orders.length) return <div>No orders assigned to you yet.</div>;

  return (
    <div className="p-6 space-y-6">
      <DashboardCard title="Calendar">
        <DashboardCalendar orders={orders} />
      </DashboardCard>
      <div>
        <h2 className="text-xl font-semibold mb-4">My Orders</h2>
        <OrdersTable orders={orders} hideAppraiserColumn role="appraiser" />
      </div>
    </div>
  );
};

export default AppraiserDashboard;













