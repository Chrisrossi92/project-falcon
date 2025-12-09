// src/features/orders/MyOrdersTable.jsx
import React from "react";
import { useMyOrders } from "@/lib/hooks/useMyOrders";

export default function MyOrdersTable() {
  const {
    data,
    count,
    loading,
    error,
    isAdmin,
    isReviewer,
    isAppraiser,
  } = useMyOrders();

  if (loading) {
    return <div className="mt-4 text-sm text-slate-500">Loading orders…</div>;
  }

  if (error) {
    return (
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        Failed to load orders: {error.message}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="mt-4 rounded-md border bg-white p-4 text-sm text-slate-500">
        No orders found{isAdmin ? "" : " for your queue"}.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-2 text-xs uppercase tracking-wide text-slate-500">
        <span>
          {count} order{count === 1 ? "" : "s"}
          {isAdmin ? "" : " (your assignments)"}
        </span>
      </div>
      <table className="w-full table-auto text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2">Order #</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Address</th>
            <th className="px-4 py-2">City</th>
            <th className="px-4 py-2">State</th>
            <th className="px-4 py-2">Fee</th>
            <th className="px-4 py-2">Final Due</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t last:border-b">
              <td className="px-4 py-2 font-medium">{row.order_number}</td>
              <td className="px-4 py-2">{row.status}</td>
              <td className="px-4 py-2">{row.address || "—"}</td>
              <td className="px-4 py-2">{row.city || "—"}</td>
              <td className="px-4 py-2">{row.state || "—"}</td>
              <td className="px-4 py-2">
                {row.fee_amount != null
                  ? `$${Number(row.fee_amount).toLocaleString()}`
                  : "—"}
              </td>
              <td className="px-4 py-2">
                {row.final_due_at || row.due_date || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

