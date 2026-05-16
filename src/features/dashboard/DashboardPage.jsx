// src/features/dashboard/DashboardPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import Card from "@/components/ui/Card";
import useSession from "@/lib/hooks/useSession";
import useOrderEvents from "@/lib/hooks/useOrderEvents";
import useRole from "@/lib/hooks/useRole";
import { orderHasQueue } from "@/features/queues/queueEvaluator";
import { getQueueSummaryById, getTopOperationalQueues, summarizeOperationalQueues } from "@/features/queues/queueSummary";
import { useMemo, useState } from "react";
import { ClockAlert, ClipboardCheck, Layers3 } from "lucide-react";

const DASHBOARD_CONFIG = {
  owner:     { showOrdersTable: true, showReviewQueue: false },
  admin:     { showOrdersTable: true, showReviewQueue: false },
  appraiser: { showOrdersTable: true, showReviewQueue: false },
  client:    { showOrdersTable: true, showReviewQueue: false },
  reviewer:  { showOrdersTable: true, showReviewQueue: false }, // show reviewer queue in orders table
};

export default function DashboardPage() {
  const nav = useNavigate();
  const roleHook = useRole() || {};
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const summary = useDashboardSummary({ refreshKey: dashboardRefreshKey });
  const { session } = useSession() || {};
  const {
    role: summaryRole,
    isAdmin: summaryIsAdmin,
    isReviewer: summaryIsReviewer,
    loading: summaryLoading,
    tableFilters,
    ordersRows,
    user,
  } = summary;
  const normalizedRole = roleHook.role || summaryRole || "appraiser";
  const isAdmin = roleHook.isAdmin ?? summaryIsAdmin;
  const isReviewer = roleHook.isReviewer ?? summaryIsReviewer;
  const loading = summaryLoading || roleHook.loading;
  const reviewerId = isReviewer ? roleHook.userId || user?.id || null : null;

  const cfg = DASHBOARD_CONFIG[normalizedRole] || DASHBOARD_CONFIG.appraiser;
  const [statusFilter, setStatusFilter] = useState("");
  const [adminKpiFilter, setAdminKpiFilter] = useState(null);
  const [activeQueueId, setActiveQueueId] = useState(null);

  const chipValue = isAdmin ? statusFilter : "";

  const appliedFilters = useMemo(() => {
    const next = { ...(tableFilters || {}) };
    if (isAdmin) {
      if (adminKpiFilter) {
        next.statusIn = [];
        next.inspectedAwaitingReport = false;
        next.finalDueWithinDays = null;
        Object.assign(next, adminKpiFilter.filter || {});
      } else {
        next.statusIn = statusFilter ? [statusFilter] : [];
        next.inspectedAwaitingReport = false;
        next.finalDueWithinDays = null;
      }
      next.page = 0;
    } else {
      next.page = next.page || 0;
    }
    return next;
  }, [tableFilters, isAdmin, statusFilter, adminKpiFilter]);

  const toggleStatus = (val) => {
    setAdminKpiFilter(null);
    setStatusFilter((curr) => (curr === val ? "" : val));
  };

  const applyAdminKpiFilter = (id, filter = null) => {
    setStatusFilter("");
    setAdminKpiFilter(filter ? { id, filter } : null);
  };

  const statusChips = [
    { label: "All", value: "" },
    { label: "Ready for Client", value: "ready_for_client" },
    { label: "In Review", value: "in_review" },
    { label: "Needs Revisions", value: "needs_revisions" },
    { label: "New", value: "new" },
  ];

  const title = isReviewer
    ? "Reviewer Dashboard"
    : isAdmin
    ? "Admin Dashboard"
    : "My Dashboard";
  const subtitle = isAdmin
    ? "Monitor active queues, delivery pressure, and workflow handoffs."
    : isReviewer
    ? "Review assigned orders and keep technical clearance moving."
    : "Track assigned work, due dates, and revision requests.";
  const ordersCount = summary.orders.count ?? 0;
  const queueSummaries = useMemo(
    () => summarizeOperationalQueues(ordersRows || []),
    [ordersRows]
  );
  const topQueues = useMemo(
    () => getTopOperationalQueues(queueSummaries, 4),
    [queueSummaries]
  );
  const activeQueueSummary = useMemo(
    () => getQueueSummaryById(queueSummaries, activeQueueId),
    [queueSummaries, activeQueueId]
  );
  // Operational queues are derived operational intelligence filters, not workflow statuses.
  const filteredOrdersRows = useMemo(() => {
    if (!activeQueueId) return ordersRows || [];
    return (ordersRows || []).filter((order) => orderHasQueue(order, activeQueueId));
  }, [ordersRows, activeQueueId]);
  const summaryCards = isAdmin
    ? [
        {
          id: "total_active",
          label: "Total Active Orders",
          subtext: "All active workflow orders",
          value: summary.orders.count,
          filter: null,
          icon: Layers3,
          accent: "from-slate-700 to-slate-500",
        },
        {
          id: "inspected_awaiting_report",
          label: "Inspected / Awaiting Report",
          subtext: "Site visit complete, awaiting submission",
          value: summary.orders.inspectedAwaitingReport,
          filter: { inspectedAwaitingReport: true },
          icon: ClipboardCheck,
          accent: "from-amber-600 to-orange-500",
        },
        {
          id: "due_to_client_2",
          label: "Due to Client in 2 Days",
          subtext: "Urgent delivery window",
          value: summary.orders.dueToClient2,
          filter: { finalDueWithinDays: 2 },
          icon: ClockAlert,
          accent: "from-rose-600 to-red-500",
        },
      ]
    : [
        {
          id: "orders",
          label: isReviewer ? "All Orders" : "My Orders",
          value: summary.orders.count,
        },
        {
          id: "in_progress",
          label: "In Progress",
          value: summary.orders.inProgress,
        },
        {
          id: "due_in_7",
          label: "Due in 7 Days",
          value: summary.orders.dueIn7,
        },
      ];

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
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Operational Cockpit</h2>
          <div className="text-xs text-slate-500">Calendar-centered view of due work and attention signals</div>
        </div>

        <OperationalQueuesPanel
          activeQueueId={activeQueueId}
          compact
          onClear={() => setActiveQueueId(null)}
          onSelect={(queueId) => setActiveQueueId((current) => (current === queueId ? null : queueId))}
          queues={topQueues}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <DashboardCalendarPanel
            orders={ordersRows || []}
            role={normalizedRole}
            onOpenOrder={handleOpenOrder}
            fixedHeader={true}
            mode={isReviewer ? "reviewerQueue" : undefined}
            reviewerId={isReviewer ? reviewerId : undefined}
          />
        </div>
      </section>

      {/* Orders section */}
      {cfg.showOrdersTable && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {isAdmin || isReviewer ? "Orders" : "My Orders"}
            </h2>
            <div className="text-sm text-slate-500">
              {ordersCount} order{ordersCount === 1 ? "" : "s"}
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {statusChips.map((chip) => {
                const active = chipValue === chip.value;
                return (
                  <button
                    key={chip.value || "all"}
                    onClick={() => toggleStatus(chip.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                      active
                        ? "border-slate-800 bg-slate-900 text-white ring-1 ring-slate-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}
          <UnifiedOrdersTable
            role={normalizedRole}
            mode={isReviewer ? "reviewerQueue" : undefined}
            reviewerId={isReviewer ? reviewerId : undefined}
            filters={appliedFilters}
            rowsOverride={filteredOrdersRows}
            activeQueue={activeQueueSummary}
            pageSize={10}
            scope="dashboard"
            onOrderDatesChanged={() => setDashboardRefreshKey((key) => key + 1)}
          />
        </section>
      )}

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

function OperationalQueuesPanel({ activeQueueId, compact = false, onClear, onSelect, queues }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-white ${compact ? "p-3" : "p-4"}`}>
      <div className={`${compact ? "mb-3" : "mb-4"} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Operational Attention</h2>
          </div>
          {!compact && (
            <p className="mt-1.5 text-sm text-slate-500">Deterministic queue signals from active dashboard orders.</p>
          )}
        </div>
        {activeQueueId && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition duration-150 hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            Clear Filter
          </button>
        )}
      </div>
      {queues.length === 0 ? (
        <div className={`rounded-xl border border-dashed border-slate-200 bg-white/75 px-4 ${compact ? "py-3" : "py-5"}`}>
          <div className="text-sm font-medium text-slate-700">No operational queue alerts right now.</div>
          {!compact && (
            <div className="mt-1 text-xs text-slate-500">Active work is clear of the current deterministic attention signals.</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {queues.map((queue) => (
            <button
              key={queue.id}
              type="button"
              onClick={() => onSelect(queue.id)}
              className={`group relative overflow-hidden rounded-xl border px-3.5 py-3 text-left transition duration-150 ${
                activeQueueId === queue.id
                  ? "border-slate-900 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-900"
                  : "border-slate-200/80 bg-white/70 shadow-[0_1px_1px_rgba(15,23,42,0.03)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-0.5 ${urgencyAccentClass(queue.urgency)}`} aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${urgencyDotClass(queue.urgency)}`} aria-hidden="true" />
                    <div className="truncate text-sm font-semibold text-slate-950">{queue.label}</div>
                  </div>
                  <div className="mt-1.5 line-clamp-2 text-xs leading-snug text-slate-500">{queue.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-semibold leading-none tracking-tight text-slate-950">{queue.count}</div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    order{queue.count === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <div className={`${compact ? "mt-2" : "mt-3"} flex items-center justify-between gap-3`}>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${urgencyClass(queue.urgency)}`}>
                  {queue.urgency || "unknown"}
                </span>
                <span className={`text-[11px] font-semibold transition ${activeQueueId === queue.id ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {activeQueueId === queue.id ? "Selected" : "Filter"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function urgencyClass(urgency) {
  switch (urgency) {
    case "critical":
      return "border-rose-200 bg-rose-50/80 text-rose-700";
    case "high":
      return "border-amber-200 bg-amber-50/80 text-amber-700";
    case "medium":
    case "medium_high":
      return "border-sky-200 bg-sky-50/80 text-sky-700";
    case "low":
      return "border-emerald-200 bg-emerald-50/80 text-emerald-700";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

function urgencyDotClass(urgency) {
  switch (urgency) {
    case "critical":
      return "bg-rose-500";
    case "high":
      return "bg-amber-500";
    case "medium":
    case "medium_high":
      return "bg-sky-500";
    case "low":
      return "bg-emerald-500";
    default:
      return "bg-slate-400";
  }
}

function urgencyAccentClass(urgency) {
  switch (urgency) {
    case "critical":
      return "bg-rose-400";
    case "high":
      return "bg-amber-400";
    case "medium":
    case "medium_high":
      return "bg-sky-400";
    case "low":
      return "bg-emerald-400";
    default:
      return "bg-slate-300";
  }
}

function SummaryCard({ label, subtext, value, loading, icon: Icon, accent = "from-slate-600 to-slate-400", active = false, onClick }) {
  const interactive = typeof onClick === "function";
  return (
    <Card
      className={`relative h-full overflow-hidden border-slate-200 bg-white/95 shadow-sm transition ${
        interactive ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg" : ""
      } ${active ? "border-slate-700 bg-slate-50 ring-1 ring-slate-700" : ""}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
          {subtext && <div className="mt-1.5 text-xs leading-snug text-slate-500">{subtext}</div>}
        </div>
        {Icon && (
          <div className={`rounded-xl border p-3 shadow-sm ${active ? "border-slate-300 bg-white text-slate-900" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{loading ? "—" : value ?? 0}</div>
    </Card>
  );
}
