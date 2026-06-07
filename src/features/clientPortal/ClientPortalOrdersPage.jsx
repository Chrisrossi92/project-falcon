import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listClientPortalOrders } from "@/features/clientPortal/api";

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function StatusPill({ children }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

export default function ClientPortalOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      try {
        const rows = await listClientPortalOrders();
        if (!active) return;
        setOrders(rows);
      } catch (err) {
        if (!active) return;
        setOrders([]);
        setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Track Progress
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          View appraisal status, property details, due dates, and released report availability.
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Order tracking is not available yet for this portal session.
        </div>
      )}

      <section className="rounded-lg border border-stone-200 bg-white" aria-label="Client orders">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No client portal orders are available yet.</div>
        ) : (
          <div className="divide-y divide-stone-200">
            {orders.map((order) => (
              <Link
                key={order.orderKey}
                to={`/client-portal/orders/${encodeURIComponent(order.orderKey)}`}
                className="grid gap-3 p-4 hover:bg-stone-50 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-950">{order.orderNumber}</div>
                  <div className="mt-1 text-sm text-slate-600">{order.propertyAddress}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Due {formatDate(order.dueAt)}
                    {order.inspectionAt ? ` - Inspection ${formatDate(order.inspectionAt)}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <StatusPill>{order.status}</StatusPill>
                  {order.reportAvailable && <StatusPill>Report ready</StatusPill>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
