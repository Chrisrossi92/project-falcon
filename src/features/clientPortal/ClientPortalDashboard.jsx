import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getClientPortalDashboard,
  listClientPortalPendingOrderRequests,
} from "@/features/clientPortal/api";
import ClientPortalPendingRequests from "@/features/clientPortal/ClientPortalPendingRequests";

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

function KpiCard({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
    </article>
  );
}

function StatusPill({ children }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

export default function ClientPortalDashboard() {
  const [dashboard, setDashboard] = useState({
    activeOrderCount: 0,
    reportAvailableCount: 0,
    nextDueAt: null,
    recentOrders: [],
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      try {
        const [row, requestRows] = await Promise.all([
          getClientPortalDashboard(),
          listClientPortalPendingOrderRequests(),
        ]);
        if (!active) return;
        setDashboard(row);
        setPendingRequests(requestRows);
      } catch (err) {
        if (!active) return;
        setDashboard({
          activeOrderCount: 0,
          reportAvailableCount: 0,
          nextDueAt: null,
          recentOrders: [],
        });
        setPendingRequests([]);
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

  const orders = dashboard.recentOrders;
  const reportReadyCount = useMemo(
    () => dashboard.reportAvailableCount,
    [dashboard.reportAvailableCount],
  );
  const completedCount = useMemo(() => {
    if (dashboard.completedOrderCount) return dashboard.completedOrderCount;
    return orders.filter((order) => /^completed$/i.test(order.status || "")).length;
  }, [dashboard.completedOrderCount, orders]);

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Client Portal
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Welcome to your appraisal workspace
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Request appraisals, track active work, and access released reports from a secure
              client-facing workspace.
            </p>
          </div>
          <Link
            to="/client-portal/new-order"
            className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Request New Appraisal
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Client portal summary">
        <KpiCard
          label="Active Appraisals"
          value={loading ? "Loading" : dashboard.activeOrderCount.toLocaleString()}
          helper="Orders currently moving through appraisal production."
        />
        <KpiCard
          label="Completed Appraisals"
          value={loading ? "Loading" : completedCount.toLocaleString()}
          helper="Completed work visible to your account."
        />
        <KpiCard
          label="Reports Ready"
          value={loading ? "Loading" : reportReadyCount.toLocaleString()}
          helper="Released final reports available for download."
        />
        <KpiCard
          label="Next Expected Delivery"
          value={loading ? "Loading" : formatDate(dashboard.nextDueAt)}
          helper="Earliest expected delivery date across active appraisals."
        />
      </section>

      {error && <PortalError />}

      <section className="rounded-lg border border-stone-200 bg-white p-4" aria-label="Pending requests">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Pending requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              Submitted requests your appraisal team is reviewing before they become active orders.
            </p>
          </div>
          <Link
            to="/client-portal/new-order"
            className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Request New Appraisal
          </Link>
        </div>
        <div className="mt-4">
          <ClientPortalPendingRequests requests={pendingRequests} loading={loading} limit={3} />
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4" aria-label="Recent appraisals">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Recent appraisals</h2>
            <p className="mt-1 text-sm text-slate-500">
              Client-safe status, expected delivery, and report availability.
            </p>
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
                className="rounded-md border border-stone-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-stone-50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-950">{order.orderNumber}</div>
                      <StatusPill>{order.status}</StatusPill>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{order.propertyAddress}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Expected delivery {formatDate(order.dueAt)}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {order.reportAvailable ? "Report ready" : "Tracking"}
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
