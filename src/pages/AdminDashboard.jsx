// src/pages/AdminDashboard.jsx
import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";
import AdminCalendar from "@/components/admin/AdminCalendar";
import DashboardCard from "@/components/DashboardCard";
import OrdersTable from "@/features/orders/OrdersTable";
import AssignAppraiser from "@/components/orders/AssignAppraiser";

export default function AdminDashboard() {
  const { data: orders = [], loading, error } = useOrders();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = orders.length;
    const byStatus = orders.reduce((acc, o) => {
      const s = (o.status || "unknown").toString().toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const dueSoon = orders.filter((o) => {
      const d = o.final_due_at || o.due_to_client || o.client_due_date || o.due_date;
      const date = d ? new Date(d) : null;
      if (!date || isNaN(date)) return false;
      const now = new Date();
      const diff = (date - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    const inReview =
      (byStatus["in_review"] || 0) +
      (byStatus["revisions"] || 0) +
      (byStatus["ready_to_send"] || 0);
    return { total, dueSoon, inReview };
  }, [orders]);

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <h2 className="font-semibold">Error loading dashboard</h2>
        <pre className="text-sm">{error.message}</pre>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col gap-8">
        {/* Stat cards */}
        <section className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashboardCard label="Total Orders" value={stats.total} />
            <DashboardCard label="Due in 7 Days" value={stats.dueSoon} />
            <DashboardCard label="In Review" value={stats.inReview} />
          </div>
        </section>

        {/* Calendar */}
        <section className="w-full">
          <AdminCalendar />
        </section>

        {/* Orders table (row-click + Assign action) */}
        <section className="w-full bg-white rounded-2xl shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Orders</h2>
            <Link
              to="/orders/new"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <span className="text-xl leading-none">＋</span>
              New Order
            </Link>
          </div>
          <OrdersTable
            onRowClick={(o) => navigate(`/orders/${o.id}`)}
            renderActions={(order) => <AssignAppraiser order={order} />}
          />
        </section>
      </div>
    </div>
  );
}
































