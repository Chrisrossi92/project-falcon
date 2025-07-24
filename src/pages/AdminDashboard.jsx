import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import DashboardCalendar from '@/components/DashboardCalendar';
import DashboardCard from '@/components/DashboardCard';
import OrdersTable from '@/components/orders/OrdersTable';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession'; // Import useSession for role and user

const AdminDashboard = () => {
  const { user, isAdmin, isReviewer } = useSession(); // Get session details
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch orders based on role
  useEffect(() => {
    const fetchOrders = async () => {
      let query = supabase.from('orders').select('*'); // Add joins if needed: .select('*, users!appraiser_id(*), clients!client_id(*)')

      if (!isAdmin && !isReviewer) { // For non-admins (e.g., appraisers), filter by their ID; adjust field if not 'appraiser_id'
        query = query.eq('appraiser_id', user.id);
      }

      const { data, error: fetchError } = await query;
      console.log('Fetching as admin?', isAdmin); // Debug
      console.log('User ID:', user?.id); // Debug
      console.log('Fetched raw data:', data); // Debug
      if (fetchError) {
        console.error('Orders fetch error:', fetchError);
        setError(fetchError.message);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };
    fetchOrders();
  }, [isAdmin, isReviewer, user.id]);

  if (error) return <div>Error: {error}</div>; // Optional error handling

  // Filter to show all orders except completed
  const openOrders = orders.filter(order => order.status !== 'Completed');

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
        <OrdersTable orders={openOrders} loading={loading} />
      </Card>
    </div>
  );
};

export default AdminDashboard;

















