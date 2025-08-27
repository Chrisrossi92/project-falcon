// src/components/orders/PresentationalOrdersTable.jsx
import React from "react";
import { Link } from "react-router-dom";
import OrdersTableHeader from "@/components/orders/OrdersTableHeader";

export default function PresentationalOrdersTable({
  orders = [],
  loading = false,
  onRefresh,
  renderActions = null,
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <OrdersTableHeader hideAppraiserColumn={false} />
        <tbody>
          {loading ? (
            <tr><td colSpan={8} className="px-4 py-6 text-gray-600">Loading…</td></tr>
          ) : orders.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-6 text-gray-600">No orders found.</td></tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="px-4 py-2">{o.order_number ?? o.id.slice(0,8)}</td>
                <td className="px-4 py-2">—</td>
                <td className="px-4 py-2">
                  {(o.property_address || o.address || "—")}{o.city ? `, ${o.city}` : ""} {o.state || ""} {o.postal_code || ""}
                </td>
                <td className="px-4 py-2">{o.appraiser_name || "—"}</td>
                <td className="px-4 py-2">{String(o.status || "").replace(/_/g, " ") || "—"}</td>
                <td className="px-4 py-2">—{/* site visit shown per your other row */}</td>
                <td className="px-4 py-2">—{/* final due shown per your other row */}</td>
                <td className="px-2 py-2 text-center w-[120px]">
                  {renderActions ? renderActions(o) : (
                    <Link className="text-blue-600 hover:underline" to={`/orders/${o.id}`}>
                      Details
                    </Link>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-2">
        <button
          className="px-2 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}



