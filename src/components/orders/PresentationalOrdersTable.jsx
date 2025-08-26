// src/components/orders/PresentationalOrdersTable.jsx
import React from "react";

function safe(v, alt = "—") {
  if (v === null || v === undefined || v === "") return alt;
  return v;
}

/**
 * Dumb/presentational table. No fetching, no business logic.
 * Consumers pass in orders + loading + error.
 * Optional:
 *  - renderActions(order) -> ReactNode (adds an "Actions" column)
 *  - onRowClick(order) -> void (makes rows clickable)
 */
export default function PresentationalOrdersTable({
  orders = [],
  loading = false,
  error = null,
  onRefresh,
  renderActions = null,
  onRowClick = null,
}) {
  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading orders…</div>;
  }
  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load orders: {error.message}
        {onRefresh && (
          <button
            className="ml-3 px-3 py-1 rounded border text-xs"
            onClick={onRefresh}
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  if (!orders.length) {
    return (
      <div className="p-4 text-sm text-gray-600">
        No orders found.
        {onRefresh && (
          <button
            className="ml-3 px-3 py-1 rounded border text-xs"
            onClick={onRefresh}
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Client</th>
            <th className="px-3 py-2 text-left">Address</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Due (Client)</th>
            <th className="px-3 py-2 text-left">Appraiser</th>
            {renderActions ? <th className="px-3 py-2 text-left">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((o) => {
            const rowProps = onRowClick
              ? {
                  onClick: () => onRowClick(o),
                  className:
                    "hover:bg-gray-50 cursor-pointer",
                }
              : {};
            return (
              <tr key={o.id} {...rowProps}>
                <td className="px-3 py-2">{safe(o.order_number || o.id)}</td>
                <td className="px-3 py-2">{safe(o.client_name || o.client?.name || o.client_id)}</td>
                <td className="px-3 py-2">
                  {safe(
                    o.property_address ||
                      o.address ||
                      [o.street, o.city, o.state].filter(Boolean).join(", ")
                  )}
                </td>
                <td className="px-3 py-2">{safe(o.status)}</td>
                <td className="px-3 py-2">
                  {safe(o.final_due_at || o.due_to_client || o.client_due_date || o.due_date)}
                </td>
                <td className="px-3 py-2">
                  {safe(o.appraiser_name || o.appraiser?.display_name || o.appraiser_id)}
                </td>
                {renderActions ? (
                  <td className="px-3 py-2">
                    {/* prevent row onClick when clicking action buttons */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {renderActions(o)}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


