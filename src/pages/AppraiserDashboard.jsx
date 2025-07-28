import React from "react";
import DashboardCalendar from "@/components/DashboardCalendar";
import OrdersTable from "@/components/orders/OrdersTable";
import { useSession } from "@/lib/hooks/useSession";
import { useOrders } from "@/lib/hooks/useOrders";
import DashboardCard from "@/components/DashboardCard";

const AppraiserDashboard = () => {
  const { user } = useSession();
  const { orders, loading, error } = useOrders(); // Fetch orders via hook

  if (loading) return <div>Loading your dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  const activeOrders = orders.filter(order => order.status !== "Completed");

  if (!activeOrders.length) return <div>No active orders assigned to you yet.</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">My Orders</h1>

      {/* Calendar */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-xl font-medium mb-2">Calendar</h2>
        <DashboardCalendar user={user} />
      </div>

      {/* Orders Table with admin-style layout */}
      <DashboardCard title="Active Orders">
        <OrdersTable orders={activeOrders} role="appraiser" />
      </DashboardCard>
    </div>
  );
};

export default AppraiserDashboard;














