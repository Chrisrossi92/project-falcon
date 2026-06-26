import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  WorkspaceDashboardHeader,
  WorkspaceEmptyState,
  WorkspaceQuickActions,
  WorkspaceSection,
  WorkspaceSummaryCard,
  WorkspaceSummaryCards,
} from "@/components/dashboard/WorkspaceDashboard";
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
      <WorkspaceDashboardHeader
        label="Client Portal / Falcon Workspace"
        title="What needs attention today"
        subtitle="Track active appraisals, due dates, released reports, and requests your appraisal team is reviewing."
        action={(
          <Link
            to="/client-portal/new-order"
            className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Request Appraisal
          </Link>
        )}
      />

      <WorkspaceSummaryCards label="Client portal summary">
        <WorkspaceSummaryCard
          label="Active Orders"
          value={loading ? "Loading" : dashboard.activeOrderCount.toLocaleString()}
          helper="Appraisals currently moving through production."
        />
        <WorkspaceSummaryCard
          label="Waiting on You"
          value={loading ? "Loading" : waitingOnClientCount.toLocaleString()}
          helper="Orders with client-facing action or information signals."
        />
        <WorkspaceSummaryCard
          label="Reports Ready"
          value={loading ? "Loading" : reportReadyCount.toLocaleString()}
          helper="Released final reports available for download."
        />
        <WorkspaceSummaryCard
          label="Recent Updates"
          value={loading ? "Loading" : (orders.length + pendingRequests.length).toLocaleString()}
          helper="Recent orders and submitted appraisal requests."
        />
      </WorkspaceSummaryCards>

      {error && <PortalError />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.8fr)]">
        <WorkspaceSection
          title="Current Orders"
          subtitle="Client-safe status, expected delivery, and report availability."
          label="Current orders"
          action={(
            <Link
              to="/client-portal/orders"
              className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              View Orders
            </Link>
          )}
        >
          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <WorkspaceEmptyState>No client portal orders are available yet.</WorkspaceEmptyState>
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
        </WorkspaceSection>

        <div className="grid gap-6">
          <WorkspaceSection
            title="Upcoming Due Dates"
            subtitle="Earliest visible delivery dates from your current appraisal list."
            label="Upcoming due dates"
          >
            <div className="mt-4 grid gap-2">
              {loading ? (
                <div className="text-sm text-slate-500">Loading due dates...</div>
              ) : upcomingOrders.length === 0 ? (
                <WorkspaceEmptyState>No upcoming due dates are available yet.</WorkspaceEmptyState>
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
          </WorkspaceSection>

          <WorkspaceSection title="Quick Actions" label="Quick actions">
            <WorkspaceQuickActions
              actions={[
                { label: "Request Appraisal", to: "/client-portal/new-order", variant: "primary" },
                { label: "Review Current Orders", to: "/client-portal/orders" },
              ]}
            />
          </WorkspaceSection>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <WorkspaceSection
          title="Submitted Requests"
          subtitle="Requests your appraisal team is reviewing before they become active orders."
          label="Submitted requests"
        >
          <div className="mt-4">
            <ClientPortalPendingRequests requests={pendingRequests} loading={loading} limit={3} />
          </div>
        </WorkspaceSection>

        <WorkspaceSection
          title="Recent Documents"
          subtitle="Released reports appear here when they are available for download."
          label="Recent documents"
        >
          <div className="mt-4 grid gap-2">
            {loading ? (
              <div className="text-sm text-slate-500">Loading documents...</div>
            ) : readyReports.length === 0 ? (
              <WorkspaceEmptyState>No released reports are available yet.</WorkspaceEmptyState>
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
        </WorkspaceSection>

        <WorkspaceSection
          title="Recent Activity"
          subtitle="Client-safe order movement from the current portal read model."
          label="Recent activity"
        >
          <div className="mt-4 grid gap-2">
            {loading ? (
              <div className="text-sm text-slate-500">Loading activity...</div>
            ) : recentUpdates.length === 0 && pendingRequests.length === 0 ? (
              <WorkspaceEmptyState>No recent activity is available yet.</WorkspaceEmptyState>
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
        </WorkspaceSection>
      </div>
    </div>
  );
}
