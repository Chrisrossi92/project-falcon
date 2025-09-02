// src/features/orders/OrdersTableDashboard.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";
import StatusBadge from "./StatusBadge";
import { statusGroup } from "@/lib/constants/orderStatus";

// helpers
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const isOverdue = (d, status) => {
  if (!d) return false;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return false;
  return dt < new Date() && statusGroup(status) !== "complete";
};

/**
 * Dashboard Orders table:
 *  - Columns: Order #, Address, Status, Due
 *  - Filters to "active" orders (excludes complete)
 *  - Expands inline to show more info (client, appraiser, times, link)
 *  - Accepts optional `rows` (else fetches)
 */
export default function OrdersTableDashboard({ rows }) {
  const needFetch = !Array.isArray(rows);
  const { data = [], loading, error } = needFetch ? useOrders() : { data: rows, loading: false, error: null };
  const [openId, setOpenId] = useState(null);

  const active = useMemo(() => {
    const src = needFetch ? data : rows;
    return (src || []).filter((o) => {
      const s = String(o.status || "").toLowerCase();
      return s !== "complete";
    });
  }, [needFetch, data, rows]);

  if (error) {
    return (
      <div className="p-3 text-sm text-red-700 bg-red-50 border rounded">
        Failed to load orders: {error.message}
      </div>
    );
  }
  if (loading) return <div className="p-3 text-sm text-gray-600">Loading orders…</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs text-gray-500 border-b">
            <th className="px-3 py-2 w-8"></th>
            <th className="px-3 py-2">Order #</th>
            <th className="px-3 py-2">Address</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Due</th>
          </tr>
        </thead>
        <tbody>
          {active.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-sm text-gray-500">
                No active orders.
              </td>
            </tr>
          ) : (
            active.map((o) => {
              const clientDue = o.due_date ?? null; // single due date is safest cross-view
              const clientOver = isOverdue(clientDue, o.status);
              const open = openId === o.id;

              return (
                <React.Fragment key={o.id}>
                  <tr className="border-t hover:bg-gray-50/40">
                    <td className="px-3 py-2 text-sm">
                      <button
                        className="h-5 w-5 grid place-items-center rounded border text-gray-600 hover:bg-gray-100"
                        onClick={() => setOpenId(open ? null : o.id)}
                        title={open ? "Collapse" : "Expand"}
                      >
                        {open ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <Link to={`/orders/${o.id}`} className="text-indigo-600 hover:underline">
                        {o.order_no ?? o.order_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-sm">{o.address ?? o.display_subtitle ?? "—"}</td>
                    <td className="px-3 py-2 text-sm">
                      {o.status ? <StatusBadge status={o.status} /> : "—"}
                    </td>
                    <td className={`px-3 py-2 text-sm ${clientOver ? "text-red-700 font-medium" : ""}`}>
                      {fmtDate(clientDue)}
                    </td>
                  </tr>

                  {open && (
                    <tr className="bg-white/60">
                      <td colSpan={5} className="px-3 pb-3">
                        <div className="mt-2 rounded-lg border p-3 text-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4">
                            <Info label="Client" value={o.client_name} />
                            <Info label="Appraiser" value={o.appraiser_name} />
                            <Info label="Ordered" value={fmtDate(o.date_ordered)} />
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Link
                              to={`/orders/${o.id}`}
                              className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                            >
                              Go to details
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-xs text-gray-500 w-28">{label}</div>
      <div className="text-sm text-gray-900">{value ?? "—"}</div>
    </div>
  );
}

