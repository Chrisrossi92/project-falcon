import React, { useMemo } from "react";
import OrdersTableRow from "./OrdersTableRow";

export default function OrdersTable({ orders = [], loading, onRefresh }) {
  const hasRows = orders && orders.length > 0;

  const rows = useMemo(() => orders, [orders]);

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Order #</th>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">Appraiser</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Site Visit</th>
              <th className="px-3 py-2 text-left">Due Date</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading && hasRows
              ? rows.map((o) => (
                  <OrdersTableRow key={o.id} order={o} onRefresh={onRefresh} />
                ))
              : null}
          </tbody>
        </table>
        {!loading && !hasRows ? (
          <div className="p-6 text-sm text-gray-500">No orders found.</div>
        ) : null}
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : null}
      </div>
    </div>
  );
}









