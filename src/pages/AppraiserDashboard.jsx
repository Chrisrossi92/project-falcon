import React from 'react';
import DashboardCalendar from '@/components/DashboardCalendar';
import OrdersTable from '@/components/orders/OrdersTable';
import { useSession } from '@/lib/hooks/useSession';
import { useOrders } from '@/lib/hooks/useOrders';

const AppraiserDashboard = () => {
  const { user } = useSession();
  const { orders, loading, error } = useOrders(); // Fetch orders via hook

  if (loading) return <div>Loading your dashboard...</div>;

  if (error) return <div>Error: {error}</div>;

  // Filter for active orders only (exclude Completed; adjust statuses as needed)
  const activeOrders = orders.filter(order => order.status !== 'Completed');

  if (!activeOrders.length) return <div>No active orders assigned to you yet.</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Orders</h1>

      {/* Calendar at top, set to two-week view */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-medium mb-4 text-gray-700">Calendar</h2>
        <DashboardCalendar compact={false} role="appraiser" orders={activeOrders} view="two-weeks" /> {/* Pass orders for events; set view prop if component supports */}
      </div>

      {/* Scrollable, paginated orders table below */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <h2 className="text-xl font-medium p-4 text-gray-700 border-b">Active Orders</h2>
        <div className="overflow-x-auto">
          <OrdersTable orders={activeOrders} loading={loading} hideAppraiserColumn={true} /> {/* Hide appraiser column for self */}
        </div>
      </div>
    </div>
  );
};

export default AppraiserDashboard;













