// src/pages/AdminDashboard.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";
import AdminCalendar from '@/components/admin/AdminCalendar';
import OrdersTable from "@/components/orders/OrdersTable";

export default function AdminDashboard() {
  const { data: orders = [], loading, error, refetch } = useOrders();

  // Quick stats for review states
  const reviewStates = new Set(["in_review","revisions","ready_to_send"]);
  const reviewOrders = (orders || []).filter(o => reviewStates.has(String(o.status || "").toLowerCase()));

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
        {/* Review Queue Card */}
        <section className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">Review queue</div>
              <div className="text-2xl font-semibold">{reviewOrders.length}</div>
              <div className="mt-3">
                <Link
                  to="/orders?review=1"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Open review orders
                </Link>
              </div>
            </div>
            {/* you can add more quick cards here if useful */}
          </div>
        </section>

        {/* Calendar Section */}
        <section className="w-full bg-white rounded-2xl shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Calendar</h2>
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
          <OrdersTable orders={orders} loading={loading} onRefresh={refetch} />
        </section>
      </div>
    </div>
  );
}


























