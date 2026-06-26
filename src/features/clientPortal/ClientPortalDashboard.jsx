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
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
    <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function isWaitingOnClient(order) {
  const status = `${order?.status || ""}`.toLowerCase();
  return /(waiting|client|borrower|information|revision|hold)/.test(status);
}

function sortByDate(rows, key) {
  return [...rows]
    .filter((row) => row[key])
    .sort((left, right) => new Date(left[key]).getTime() - new Date(right[key]).getTime());
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
        setPendingRequests(Array.isArray(requestRows) ? requestRows : []);
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
  const waitingOnClientCount = useMemo(
    () => orders.filter(isWaitingOnClient).length,
    [orders],
  );
  const upcomingOrders = useMemo(() => sortByDate(orders, "dueAt").slice(0, 4), [orders]);
  const readyReports = useMemo(
    () => orders.filter((order) => order.reportAvailable).slice(0, 4),
    [orders],
  );
  const recentUpdates = useMemo(() => orders.slice(0, 3), [orders]);

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Client Portal / Falcon Workspace
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-slate-950">What needs attention today</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Track active appraisals, due dates, released reports, and requests your appraisal team
              is reviewing.
            </p>
          </div>
          <div className="px-6 pb-6 lg:p-6">
            <Link
              to="/client-portal/new-order"
              className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Request Appraisal
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Client portal summary">
        <KpiCard
          label="Active Orders"
          value={loading ? "Loading" : dashboard.activeOrderCount.toLocaleString()}
          helper="Appraisals currently moving through production."
        />
        <KpiCard
          label="Waiting on You"
          value={loading ? "Loading" : waitingOnClientCount.toLocaleString()}
          helper="Orders with client-facing action or information signals."
        />
        <KpiCard
          label="Reports Ready"
          value={loading ? "Loading" : reportReadyCount.toLocaleString()}
          helper="Released final reports available for download."
        />
        <KpiCard
          label="Recent Updates"
          value={loading ? "Loading" : (orders.length + pendingRequests.length).toLocaleString()}
          helper="Recent orders and submitted appraisal requests."
        />
      </section>

      {error && <PortalError />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.8fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Current orders">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Current Orders</h2>
              <p className="mt-1 text-sm text-slate-500">
                Client-safe status, expected delivery, and report availability.
              </p>
            </div>
            <Link
              to="/client-portal/orders"
              className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              View Orders
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No client portal orders are available yet.
              </div>
            ) : (
              orders.slice(0, 4).map((order) => (
                <Link
                  key={order.orderKey}
                  to={`/client-portal/orders/${encodeURIComponent(order.orderKey)}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
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

        <div className="grid gap-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Upcoming due dates">
            <h2 className="text-base font-semibold text-slate-950">Upcoming Due Dates</h2>
            <p className="mt-1 text-sm text-slate-500">
              Earliest visible delivery dates from your current appraisal list.
            </p>
            <div className="mt-4 grid gap-2">
              {loading ? (
                <div className="text-sm text-slate-500">Loading due dates...</div>
              ) : upcomingOrders.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No upcoming due dates are available yet.
                </div>
              ) : (
                upcomingOrders.map((order) => (
                  <Link
                    key={order.orderKey}
                    to={`/client-portal/orders/${encodeURIComponent(order.orderKey)}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-950">{order.orderNumber}</span>
                      <span className="mt-1 block truncate text-slate-500">{order.propertyAddress}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-slate-700">{formatDate(order.dueAt)}</span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Quick actions">
            <h2 className="text-base font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-4 grid gap-3">
              <Link
                to="/client-portal/new-order"
                className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Request Appraisal
              </Link>
              <Link
                to="/client-portal/orders"
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              >
                Review Current Orders
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Submitted requests">
          <h2 className="text-base font-semibold text-slate-950">Submitted Requests</h2>
          <p className="mt-1 text-sm text-slate-500">
            Requests your appraisal team is reviewing before they become active orders.
          </p>
          <div className="mt-4">
            <ClientPortalPendingRequests requests={pendingRequests} loading={loading} limit={3} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Recent documents">
          <h2 className="text-base font-semibold text-slate-950">Recent Documents</h2>
          <p className="mt-1 text-sm text-slate-500">
            Released reports appear here when they are available for download.
          </p>
          <div className="mt-4 grid gap-2">
            {loading ? (
              <div className="text-sm text-slate-500">Loading documents...</div>
            ) : readyReports.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No released reports are available yet.
              </div>
            ) : (
              readyReports.map((order) => (
                <Link
                  key={order.orderKey}
                  to={`/client-portal/orders/${encodeURIComponent(order.orderKey)}`}
                  className="rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
                >
                  <span className="block font-semibold text-slate-950">{order.orderNumber}</span>
                  <span className="mt-1 block text-slate-500">Final report ready</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Recent activity">
          <h2 className="text-base font-semibold text-slate-950">Recent Activity</h2>
          <p className="mt-1 text-sm text-slate-500">
            Client-safe order movement from the current portal read model.
          </p>
          <div className="mt-4 grid gap-2">
            {loading ? (
              <div className="text-sm text-slate-500">Loading activity...</div>
            ) : recentUpdates.length === 0 && pendingRequests.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No recent activity is available yet.
              </div>
            ) : (
              <>
                {recentUpdates.map((order) => (
                  <div key={order.orderKey} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="font-semibold text-slate-950">{order.orderNumber}</div>
                    <div className="mt-1 text-slate-500">{order.status}</div>
                  </div>
                ))}
                {pendingRequests.slice(0, 2).map((request) => (
                  <div key={request.requestKey} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="font-semibold text-slate-950">Request submitted</div>
                    <div className="mt-1 text-slate-500">
                      {request.propertyAddress || "Property address pending"}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
