// src/features/dashboard/DashboardPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";
import { useMemo, useState } from "react";

const DASHBOARD_CONFIG = {
  owner:     { showOrdersTable: true, showReviewQueue: false },
  admin:     { showOrdersTable: true, showReviewQueue: false },
  appraiser: { showOrdersTable: true, showReviewQueue: false },
  client:    { showOrdersTable: true, showReviewQueue: false },
  reviewer:  { showOrdersTable: true, showReviewQueue: false }, // show reviewer queue in orders table
};

const STATUS_TIMELINE = Object.freeze([
  {
    label: "New",
    value: ORDER_STATUS.NEW,
    tone: "border-blue-300 bg-blue-50 text-blue-800",
    selectedTone: "border-blue-500 bg-blue-100 text-blue-950 ring-blue-300",
  },
  {
    label: "In Progress",
    value: ORDER_STATUS.IN_PROGRESS,
    tone: "border-amber-300 bg-amber-50 text-amber-800",
    selectedTone: "border-amber-500 bg-amber-100 text-amber-950 ring-amber-300",
  },
  {
    label: "In Review",
    value: ORDER_STATUS.IN_REVIEW,
    tone: "border-indigo-300 bg-indigo-50 text-indigo-800",
    selectedTone: "border-indigo-500 bg-indigo-100 text-indigo-950 ring-indigo-300",
  },
  {
    label: "Needs Revisions",
    value: ORDER_STATUS.NEEDS_REVISIONS,
    tone: "border-rose-300 bg-rose-50 text-rose-800",
    selectedTone: "border-rose-500 bg-rose-100 text-rose-950 ring-rose-300",
  },
  {
    label: "Ready for Client",
    value: ORDER_STATUS.READY_FOR_CLIENT,
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800",
    selectedTone: "border-emerald-500 bg-emerald-100 text-emerald-950 ring-emerald-300",
  },
]);

const OPERATIONAL_KPI_CARDS = Object.freeze([
  {
    key: "activeOrders",
    label: "Active Orders",
    caption: "Current operational queue",
    to: "/orders",
    tone: "border-slate-200 bg-slate-50 text-slate-900",
    valueClassName: "text-slate-950",
  },
  {
    key: "inReview",
    label: "In Review",
    caption: "Orders awaiting review clearance",
    to: "/orders?status=in_review",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-900",
    valueClassName: "text-indigo-950",
  },
  {
    key: "needsRevisions",
    label: "Needs Revisions",
    caption: "Returned for report updates",
    to: "/orders?status=needs_revisions",
    tone: "border-rose-200 bg-rose-50 text-rose-900",
    valueClassName: "text-rose-950",
  },
  {
    key: "overdue",
    label: "Overdue Orders",
    caption: "Active orders past final due date",
    to: "/orders?due=overdue",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    valueClassName: "text-amber-950",
  },
]);

export default function DashboardPage() {
  const nav = useNavigate();
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const summary = useDashboardSummary({ refreshKey: dashboardRefreshKey });
  const {
    role: summaryRole,
    isAdmin: summaryIsAdmin,
    isReviewer: summaryIsReviewer,
    loading: summaryLoading,
    tableFilters,
    ordersRows,
    userId,
  } = summary;
  const normalizedRole = summaryRole || "appraiser";
  const isAdmin = summaryIsAdmin;
  const isReviewer = summaryIsReviewer;
  const loading = summaryLoading;
  const reviewerId = isReviewer ? userId || null : null;

  const cfg = DASHBOARD_CONFIG[normalizedRole] || DASHBOARD_CONFIG.appraiser;
  const [statusFilter, setStatusFilter] = useState("");

  const appliedFilters = useMemo(() => {
    const next = { ...(tableFilters || {}) };
    if (isAdmin) {
      next.inspectedAwaitingReport = false;
      next.finalDueWithinDays = null;
      next.page = 0;
    } else {
      next.page = next.page || 0;
    }
    return next;
  }, [tableFilters, isAdmin]);

  const toggleStatus = (val) => {
    setStatusFilter((curr) => (curr === val ? "" : val));
  };

  const title = isReviewer
    ? "Reviewer Dashboard"
    : isAdmin
    ? "Admin Dashboard"
    : "My Dashboard";
  const subtitle = isAdmin
    ? "Monitor the schedule, active orders, and workflow handoffs."
    : isReviewer
    ? "Review assigned orders and keep technical clearance moving."
    : "Track assigned work, due dates, and revision requests.";
  const ordersCount = summary.orders.count ?? 0;
  const kpiValues = useMemo(
    () => ({
      activeOrders: ordersCount,
      inReview: summary.orders.inReview ?? 0,
      needsRevisions: summary.orders.needsRevisions ?? 0,
      overdue: summary.orders.overdue ?? 0,
    }),
    [ordersCount, summary.orders.inReview, summary.orders.needsRevisions, summary.orders.overdue],
  );
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TIMELINE.map((status) => [status.value, 0]));
    (ordersRows || []).forEach((order) => {
      const status = normalizeOrderStatus(order?.status_normalized || order?.status);
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      }
    });
    return counts;
  }, [ordersRows]);
  const filteredOrdersRows = useMemo(() => {
    if (!statusFilter) return ordersRows || [];
    return (ordersRows || []).filter(
      (order) => normalizeOrderStatus(order?.status_normalized || order?.status) === statusFilter,
    );
  }, [ordersRows, statusFilter]);

  const handleOpenOrder = (orderId) => {
    if (!orderId) return;
    nav(`/orders/${orderId}`);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-3 text-white">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Falcon Operations</div>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">{subtitle}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-right shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                Active Orders
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {loading ? "-" : ordersCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      <OperationalKpiCards loading={loading} values={kpiValues} />

      <OwnerSetupDashboardPrompt />

      <section
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-100"
        aria-labelledby="dashboard-calendar-heading"
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
          <div>
            <h2
              id="dashboard-calendar-heading"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Calendar
            </h2>
          </div>
        </div>
        <DashboardCalendarPanel
          orders={ordersRows || []}
          role={normalizedRole}
          onOpenOrder={handleOpenOrder}
          fixedHeader={true}
          mode={isReviewer ? "reviewerQueue" : undefined}
          reviewerId={isReviewer ? reviewerId : undefined}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_13rem]">
        {/* Orders section */}
        {cfg.showOrdersTable && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {isAdmin ? "Active Worklist" : isReviewer ? "My Review Work" : "My Assignments"}
              </h2>
              <div className="text-sm text-slate-500">
                {ordersCount} order{ordersCount === 1 ? "" : "s"}
              </div>
            </div>
            <UnifiedOrdersTable
              role={normalizedRole}
              mode={isReviewer ? "reviewerQueue" : undefined}
              reviewerId={isReviewer ? reviewerId : undefined}
              filters={appliedFilters}
              rowsOverride={filteredOrdersRows}
              pageSize={10}
              scope="dashboard"
              onOrderDatesChanged={() => setDashboardRefreshKey((key) => key + 1)}
            />
          </div>
        )}

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Status
                </h2>
              </div>
            </div>

            <StatusTimelineRail
              counts={statusCounts}
              selectedStatus={statusFilter}
              onClear={() => setStatusFilter("")}
              onSelect={toggleStatus}
            />
          </section>
        </aside>
      </section>

      {/* Placeholder for future review queue */}
      {cfg.showReviewQueue && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">
            Review Queue
          </h2>
          <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
            Review queue will be wired once reviewer RLS is added.
          </div>
        </section>
      )}
    </div>
  );
}

function OperationalKpiCards({ loading, values }) {
  return (
    <section
      aria-label="Operational KPI cards"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {OPERATIONAL_KPI_CARDS.map((card) => {
        const content = (
          <>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
              {card.label}
            </div>
            <div className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${card.valueClassName}`}>
              {loading ? "-" : values[card.key] ?? 0}
            </div>
            <div className="mt-1 text-xs leading-snug opacity-80">{card.caption}</div>
          </>
        );
        const className = `block min-h-28 rounded-xl border px-4 py-3 shadow-sm ${card.tone}`;

        if (card.to) {
          return (
            <Link
              key={card.key}
              to={card.to}
              className={`${className} transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 motion-reduce:hover:translate-y-0`}
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={card.key} className={className}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

function StatusTimelineRail({ counts, onClear, onSelect, selectedStatus }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div role="group" aria-label="Status filters" className="grid grid-cols-1 gap-2">
        {STATUS_TIMELINE.map((status) => {
          const selected = selectedStatus === status.value;
          return (
            <button
              key={status.value}
              type="button"
              onClick={() => onSelect(status.value)}
              aria-pressed={selected}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 motion-reduce:transition-none ${
                selected
                  ? `${status.selectedTone} translate-x-0.5 shadow-sm ring-2 motion-reduce:translate-x-0`
                  : `${status.tone} hover:brightness-95`
              }`}
            >
              <span className="text-xs font-semibold leading-tight">{status.label}</span>
              <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums">
                {counts[status.value] || 0}
              </span>
            </button>
          );
        })}
      </div>
      {selectedStatus ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          Clear Filter
        </button>
      ) : null}
    </div>
  );
}

export function OwnerSetupDashboardPrompt() {
  const canViewSettings = useCan(PERMISSIONS.SETTINGS_VIEW);

  if (!canViewSettings.allowed) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Diagnostic guidance only
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">Review owner setup</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-900">
            Review company setup readiness without changing permissions, workflow, route access, or operational visibility.
          </p>
        </div>
        <Link
          to="/settings/owner-setup"
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
        >
          Review setup readiness
        </Link>
      </div>
    </section>
  );
}
