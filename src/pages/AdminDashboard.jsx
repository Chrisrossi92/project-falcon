// src/pages/AdminDashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";
import DashboardCalendar from "@/components/DashboardCalendar";
import OrdersTable from "@/components/orders/OrdersTable";
import AdminCalendar from '@/components/admin/AdminCalendar';


export default function AdminDashboard() {
  const { data: orders = [], loading, error, refetch } = useOrders();

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
        {/* Calendar Section */}
        <section className="w-full bg-white rounded-2xl shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Calendar</h2>
            {/* optional: add quick nav to full calendar page later */}
          </div>
          <AdminCalendar orders={orders} loading={loading} />
        </section>

        {/* Orders Table Section */}
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

          {/* Pass refetch so row actions can refresh the list */}
          <OrdersTable orders={orders} loading={loading} onRefresh={refetch} />
        </section>
      </div>
    </div>
  );
}

























