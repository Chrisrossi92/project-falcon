// src/pages/AppraiserDashboard.jsx
import React, { useMemo } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useSession } from "@/lib/hooks/useSession";
import OrdersTable from "@/components/orders/OrdersTable";
import DashboardCard from "@/components/DashboardCard";
import DashboardCalendar from "@/components/DashboardCalendar";
import { useDashboardEvents } from "@/lib/hooks/useDashboardEvents";

export default function AppraiserDashboard() {
  const { data: all = [], loading, error, refetch } = useOrders();
  const { user } = useSession();
  const uid = user?.id ?? null;

  // Only my orders (as appraiser or reviewer)
  const myOrders = useMemo(() => {
    if (!uid) return [];
    return all.filter((o) => {
      const appraiserMatch =
        (o.appraiser_id && o.appraiser_id === uid) ||
        (o.assigned_appraiser_id && o.assigned_appraiser_id === uid);
      const reviewerMatch =
        (o.current_reviewer_id && o.current_reviewer_id === uid) ||
        (o.reviewer_id && o.reviewer_id === uid);
      return appraiserMatch || reviewerMatch;
    });
  }, [all, uid]);

  const stats = useMemo(() => {
    const total = myOrders.length;
    const dueSoon = myOrders.filter((o) => {
      const d = o.due_to_client || o.client_due_date || o.due_date;
      const date = d ? new Date(d) : null;
      if (!date || isNaN(date)) return false;
      const now = new Date();
      const diff = (date - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    const inProgress = myOrders.filter(
      (o) => (o.status || "").toLowerCase() === "in progress"
    ).length;
    return { total, dueSoon, inProgress };
  }, [myOrders]);

  // Build upcoming events from my orders only
  const events = useDashboardEvents(myOrders);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">My Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DashboardCard label="My Orders" value={stats.total} />
        <DashboardCard label="Due in 7 Days" value={stats.dueSoon} />
        <DashboardCard label="In Progress" value={stats.inProgress} />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming list (📍/🧐/🚨) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Upcoming</h2>
          </div>
          <DashboardCalendar events={events} />
        </div>

        {/* My orders table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">My Orders</h2>
            <button className="px-3 py-1 border rounded text-sm" onClick={refetch}>
              Refresh
            </button>
          </div>
          <OrdersTable
            orders={myOrders}
            loading={loading}
            error={error}
            onRefresh={refetch}
          />
        </div>
      </section>
    </div>
  );
}




















