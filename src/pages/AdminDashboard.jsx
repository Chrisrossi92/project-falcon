// src/pages/AdminDashboard.jsx
import React, { useMemo } from "react";
import OrdersTable from "@/features/orders/OrdersTable";
import AdminCalendar from "@/components/admin/AdminCalendar";
import { useOrders } from "@/lib/hooks/useOrders";

export default function AdminDashboard() {
  const { data = [], loading, error } = useOrders();

  const kpis = useMemo(() => {
    const total = data.length;
    const inReview = data.filter((o) =>
      ["in_review", "revisions", "ready_to_send"].includes(String(o.status || "").toLowerCase())
    ).length;
    const complete = data.filter((o) => String(o.status || "").toLowerCase() === "complete").length;
    return { total, inReview, complete };
  }, [data]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">
          {loading ? "Loading…" : error ? `Error loading dashboard: ${error.message}` : "Overview of orders & events"}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">Total Orders</div>
          <div className="text-2xl font-semibold">{kpis.total}</div>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">In Review</div>
          <div className="text-2xl font-semibold">{kpis.inReview}</div>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-2xl font-semibold">{kpis.complete}</div>
        </div>
      </div>

      {/* Calendar (site/review/final due) */}
      <div className="bg-white border rounded-xl p-3">
        <AdminCalendar />
      </div>

      {/* Orders table */}
      <div className="bg-white border rounded-xl p-3">
        <div className="mb-2 text-sm font-medium">All Orders</div>
        <OrdersTable />
      </div>
    </div>
  );
}

































