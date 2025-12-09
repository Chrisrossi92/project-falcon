// src/features/orders/OrdersTable.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";

function isOverdue(o) {
  const due = o?.final_due_date || o?.due_date || null;
  if (!due) return false;
  const d = new Date(due);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d < now && String(o?.status || "").toLowerCase() !== "complete";
}

function PriorityBadge({ order }) {
  const overdue = isOverdue(order);
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${overdue ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-700"}`}>
      {overdue ? "overdue" : "normal"}
    </span>
  );
}

function Row({ o }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-sm">
        <Link to={`/orders/${o.id}`} className="text-indigo-600 hover:underline">
          {o.order_number || "—"}
        </Link>
      </td>
      <td className="px-3 py-2 text-sm">{o.title || "—"}</td>
      <td className="px-3 py-2 text-sm">{o.address || "—"}</td>
      <td className="px-3 py-2 text-sm">{o.status || "—"}</td>
      <td className="px-3 py-2 text-sm">
        {o.final_due_date
          ? new Date(o.final_due_date).toLocaleDateString()
          : o.due_date
          ? new Date(o.due_date).toLocaleDateString()
          : "—"}
      </td>
      <td className="px-3 py-2 text-sm"><PriorityBadge order={o} /></td>
      <td className="px-3 py-2 text-sm">
        {o.last_activity_at ? new Date(o.last_activity_at).toLocaleString() : "—"}
      </td>
    </tr>
  );
}

export default function OrdersTable() {
  const [search, setSearch] = useState("");
  const { data = [], loading, error } = useOrders({ search });

  const rows = useMemo(() => data || [], [data]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders"
          className="border rounded px-3 py-2 text-sm"
        />
        {loading && <div className="text-xs text-gray-500">Loading…</div>}
        {error && <div className="text-xs text-rose-600">Failed: {error.message}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Order #</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => <Row key={o.id} o={o} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
