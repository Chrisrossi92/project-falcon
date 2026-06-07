import { useEffect, useMemo, useState } from "react";
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

function PortalError() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
      Order tracking is not available yet for this portal session. Your appraisal team can confirm
      status while client portal read access is being enabled.
    </div>
  );
}

export default function ClientPortalDashboard() {
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

  const reportReadyCount = useMemo(
    () => orders.filter((order) => order.reportAvailable).length,
    [orders],
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Client Portal
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Appraisal orders</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Request appraisals, track progress, and download completed reports from one limited
          client-facing workspace.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Client portal summary">
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Order Appraisal
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-950">Request ready</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Intake is staged for the next slice and remains read-only here.
          </p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Track Progress
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-950">
            {loading ? "Loading" : `${orders.length} active`}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">High-level order status only.</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Download Report
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-950">{reportReadyCount} ready</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Final reports appear when released.</p>
        </article>
      </section>

      {error && <PortalError />}

      <section className="rounded-lg border border-stone-200 bg-white p-4" aria-label="Recent orders">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Recent orders</h2>
            <p className="mt-1 text-sm text-slate-500">Client-safe status, due dates, and report availability.</p>
          </div>
          <Link
            to="/client-portal/orders"
            className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            View orders
          </Link>
        </div>

        <div className="mt-4 grid gap-3">
          {loading ? (
            <div className="text-sm text-slate-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="rounded-md border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-slate-500">
              No client portal orders are available yet.
            </div>
          ) : (
            orders.slice(0, 3).map((order) => (
              <Link
                key={order.orderKey}
                to={`/client-portal/orders/${encodeURIComponent(order.orderKey)}`}
                className="rounded-md border border-stone-200 p-3 hover:bg-stone-50"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{order.orderNumber}</div>
                    <div className="text-sm text-slate-600">{order.propertyAddress}</div>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {order.status} - Due {formatDate(order.dueAt)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
