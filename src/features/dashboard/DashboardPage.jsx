// src/features/dashboard/DashboardPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import { useCan, useCanAny } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";
import { OPERATIONAL_QUEUE_IDS } from "@/features/queues/queueDefinitions";
import { useCompanySetupContext } from "@/features/company-setup/useCompanySetupContext";
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

const APPRAISER_WORKLOAD_STATUSES = new Set([
  ORDER_STATUS.NEW,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.NEEDS_REVISIONS,
]);

const RETIRED_WORKLOAD_STATUSES = new Set([
  ORDER_STATUS.COMPLETED,
  "cancelled",
  "canceled",
  "voided",
]);

function normalizeWorkloadStatus(order) {
  return normalizeOrderStatus(order?.status_normalized || order?.status);
}

function rawWorkloadStatus(order) {
  return String(order?.status || order?.status_normalized || "").toLowerCase().trim();
}

function isActiveWorkloadOrder(order) {
  if (!order || order.is_archived === true) return false;
  const normalized = normalizeWorkloadStatus(order);
  const raw = rawWorkloadStatus(order);
  return !RETIRED_WORKLOAD_STATUSES.has(normalized) && !RETIRED_WORKLOAD_STATUSES.has(raw);
}

function displayName(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function roleContextLabel({ isAdmin, isReviewer, role }) {
  if (isAdmin) return "Owner / Admin";
  if (isReviewer) return "Reviewer";
  if (role === "appraiser") return "Appraiser";
  return displayName(role, "Operational");
}

const OPERATIONS_DASHBOARD_SUBTITLE =
  "Track active work, review handoffs, due pressure, and operational readiness.";

function resolveDashboardPresentation({
  shellProfilePresentation,
  isAdmin,
  isReviewer,
}) {
  const profileId =
    shellProfilePresentation?.profileId ??
    shellProfilePresentation?.profile?.id ??
    shellProfilePresentation?.shellMetadata?.id;
  const isOperations = profileId === "operations";

  if (isOperations) {
    return {
      title:
        shellProfilePresentation?.profile?.dashboardTitle ??
        shellProfilePresentation?.shellMetadata?.dashboardTitle ??
        "Operations Dashboard",
      subtitle: OPERATIONS_DASHBOARD_SUBTITLE,
    };
  }

  return {
    title: "Operations Dashboard",
    subtitle: isAdmin
      ? "Calendar, active orders, and workflow handoffs for the current company."
      : isReviewer
      ? "Calendar context and review work assigned to your queue."
      : "Calendar context, assigned orders, and revision follow-up.",
  };
}

function addGroupedCount(map, id, label, fallback) {
  if (!id) return;
  const key = String(id);
  const current = map.get(key) || {
    id: key,
    label: displayName(label, fallback),
    count: 0,
  };
  current.count += 1;
  if (!current.label || current.label === fallback) {
    current.label = displayName(label, fallback);
  }
  map.set(key, current);
}

function groupedCounts(map, limit = 3) {
  return [...map.values()]
    .sort((a, b) => {
      const countDelta = b.count - a.count;
      if (countDelta) return countDelta;
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}

function ordersPath(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  const query = qs.toString();
  return query ? `/orders?${query}` : "/orders";
}

function readinessState(label, tone = "neutral") {
  const styles = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
    attention: "border-amber-200 bg-amber-50 text-amber-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    loading: "border-slate-200 bg-white text-slate-500",
  };

  return {
    label,
    className: styles[tone] || styles.neutral,
  };
}

function buildOperationalReadinessItems({
  appContext,
  isAdmin,
  setupContext,
  setupLoading,
  teamAccess,
  orderRead,
  dashboardLoading,
  ordersRows,
}) {
  const companyLoaded = Boolean(
    appContext?.current_company_id && appContext?.has_current_company_membership,
  );
  const setupAvailable = Boolean(setupContext);
  const memberCount = Number(setupContext?.active_member_count ?? 0);
  const hasAdditionalMember = setupAvailable && memberCount > 1;
  const hasAnyOrder = Array.isArray(ordersRows) && ordersRows.length > 0;

  return [
    {
      key: "company",
      label: "Current company",
      description: companyLoaded
        ? appContext?.company_name || "Company context is loaded"
        : "Company context has not resolved yet",
      state: companyLoaded
        ? readinessState("Loaded", "ready")
        : readinessState("Not verified", "neutral"),
    },
    {
      key: "admin",
      label: "Owner/admin access",
      description: isAdmin
        ? "Management dashboard access is active"
        : "Visible only for owner/admin users",
      state: isAdmin
        ? readinessState("Confirmed", "ready")
        : readinessState("Not shown", "neutral"),
    },
    {
      key: "team",
      label: "Team Access",
      description: teamAccess.loading
        ? "Checking Team Access permission"
        : teamAccess.allowed
        ? "Member management route is available"
        : "Team Access requires users.read",
      state: teamAccess.loading
        ? readinessState("Checking", "loading")
        : teamAccess.allowed
        ? readinessState("Reachable", "ready")
        : readinessState("Needs permission", "attention"),
      to: teamAccess.allowed ? "/users" : null,
    },
    {
      key: "staff",
      label: "Additional team member",
      description: setupLoading
        ? "Checking active member count"
        : !setupAvailable
        ? "Member count is not verified"
        : hasAdditionalMember
        ? `${memberCount} active members`
        : "Solo-owner operation is allowed",
      state: setupLoading
        ? readinessState("Checking", "loading")
        : hasAdditionalMember
        ? readinessState("Present", "ready")
        : readinessState("Optional", "neutral"),
    },
    {
      key: "dashboard",
      label: "Dashboard KPIs",
      description: dashboardLoading
        ? "Loading active operational metrics"
        : "Active metrics read path is available",
      state: dashboardLoading
        ? readinessState("Checking", "loading")
        : readinessState("Operational", "ready"),
    },
    {
      key: "history",
      label: "Historical Orders",
      description: orderRead.allowed
        ? "Preserved-history route is available"
        : "Requires order read permission",
      state: orderRead.loading
        ? readinessState("Checking", "loading")
        : orderRead.allowed
        ? readinessState("Reachable", "ready")
        : readinessState("Needs permission", "attention"),
      to: orderRead.allowed ? "/orders/historical" : null,
    },
    {
      key: "savedViews",
      label: "Saved Views",
      description: orderRead.allowed
        ? "Available from Orders filters"
        : "Requires order read permission",
      state: orderRead.loading
        ? readinessState("Checking", "loading")
        : orderRead.allowed
        ? readinessState("Available", "ready")
        : readinessState("Needs permission", "attention"),
      to: orderRead.allowed ? "/orders" : null,
    },
    {
      key: "printPacket",
      label: "Print Packet",
      description: hasAnyOrder
        ? "Available from authorized Order Detail"
        : "Available after an order exists",
      state: hasAnyOrder
        ? readinessState("Available", "ready")
        : readinessState("Neutral", "neutral"),
      to: hasAnyOrder && ordersRows[0]?.id ? `/orders/${ordersRows[0].id}` : null,
    },
  ];
}

function summarizeWorkloadVisibility(orders = []) {
  const appraisers = new Map();
  const reviewers = new Map();
  const revisions = new Map();
  let unassigned = 0;

  for (const order of orders || []) {
    if (!isActiveWorkloadOrder(order)) continue;

    const status = normalizeWorkloadStatus(order);
    const appraiserId = order?.appraiser_id || order?.assigned_to || null;
    const reviewerId = order?.reviewer_id || null;

    if (APPRAISER_WORKLOAD_STATUSES.has(status)) {
      addGroupedCount(appraisers, appraiserId, order?.appraiser_name, "Assigned appraiser");
    }

    if (status === ORDER_STATUS.IN_REVIEW) {
      addGroupedCount(reviewers, reviewerId, order?.reviewer_name, "Assigned reviewer");
    }

    if (status === ORDER_STATUS.NEEDS_REVISIONS) {
      addGroupedCount(revisions, appraiserId, order?.appraiser_name, "Assigned appraiser");
    }

    const missingAppraiser = APPRAISER_WORKLOAD_STATUSES.has(status) && !appraiserId;
    const missingReviewer = status === ORDER_STATUS.IN_REVIEW && !reviewerId;
    if (missingAppraiser || missingReviewer) {
      unassigned += 1;
    }
  }

  return {
    appraisers: groupedCounts(appraisers),
    reviewers: groupedCounts(reviewers),
    revisions: groupedCounts(revisions),
    unassigned,
  };
}

export default function DashboardPage({ shellProfilePresentation } = {}) {
  const nav = useNavigate();
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const setupContextState = useCompanySetupContext();
  const teamAccessPermission = useCan(PERMISSIONS.USERS_READ);
  const orderReadPermission = useCanAny([
    PERMISSIONS.ORDERS_READ_ALL,
    PERMISSIONS.ORDERS_READ_ASSIGNED,
  ]);
  const summary = useDashboardSummary({ refreshKey: dashboardRefreshKey });
  const {
    role: summaryRole,
    isAdmin: summaryIsAdmin,
    isReviewer: summaryIsReviewer,
    loading: summaryLoading,
    tableFilters,
    ordersRows,
    userId,
    appContext,
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

  const { title, subtitle } = resolveDashboardPresentation({
    shellProfilePresentation,
    isAdmin,
    isReviewer,
  });
  const companyLabel = displayName(appContext?.company_name, "Current company");
  const roleLabel = roleContextLabel({ isAdmin, isReviewer, role: normalizedRole });
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
  const workloadSummary = useMemo(
    () => summarizeWorkloadVisibility(ordersRows || []),
    [ordersRows],
  );
  const readinessItems = useMemo(
    () =>
      buildOperationalReadinessItems({
        appContext,
        isAdmin,
        setupContext: setupContextState.context,
        setupLoading: setupContextState.loading,
        teamAccess: teamAccessPermission,
        orderRead: orderReadPermission,
        dashboardLoading: loading,
        ordersRows: ordersRows || [],
      }),
    [
      appContext,
      isAdmin,
      loading,
      orderReadPermission,
      ordersRows,
      setupContextState.context,
      setupContextState.loading,
      teamAccessPermission,
    ],
  );

  const handleOpenOrder = (orderId) => {
    if (!orderId) return;
    nav(`/orders/${orderId}`);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm ring-1 ring-slate-100 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Falcon Operations
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Company
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-950">
                {companyLabel}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Work View
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-950">
                {roleLabel}
              </div>
            </div>
            <div className="rounded-xl border border-slate-900 bg-slate-950 px-3 py-2 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Active
              </div>
              <div className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums">
                {loading ? "-" : ordersCount}
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem]">
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

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
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

      <section
        aria-labelledby="dashboard-support-heading"
        className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm ring-1 ring-slate-100 sm:p-4"
      >
        <div>
          <h2
            id="dashboard-support-heading"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Operational Support
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Secondary context from existing dashboard reads.
          </p>
        </div>
        <OperationalKpiCards loading={loading} values={kpiValues} />
        <WorkloadVisibilitySection loading={loading} summary={workloadSummary} />
        {isAdmin && <OperationalReadinessCard items={readinessItems} />}
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

function OperationalReadinessCard({ items }) {
  return (
    <section
      aria-labelledby="operational-readiness-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="operational-readiness-heading"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Operational Readiness
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Advisory setup signals from existing governed reads. Runtime permissions and backend
            checks remain authoritative.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          Read-only
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 text-sm font-semibold text-slate-950">{item.label}</div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${item.state.className}`}
                >
                  {item.state.label}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
            </>
          );

          if (item.to) {
            return (
              <Link
                key={item.key}
                to={item.to}
                className="block min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {body}
              </Link>
            );
          }

          return (
            <div
              key={item.key}
              className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
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

function WorkloadVisibilitySection({ loading, summary }) {
  const cards = [
    {
      key: "appraisers",
      label: "Assigned Work",
      caption: "Active appraiser-owned orders",
      items: summary.appraisers,
      itemTo: (item) => ordersPath({ appraiserId: item.id }),
      empty: "No assigned appraiser work",
    },
    {
      key: "reviewers",
      label: "Review Queue",
      caption: "Active orders in review",
      to: ordersPath({ status: ORDER_STATUS.IN_REVIEW }),
      items: summary.reviewers,
      itemTo: (item) => ordersPath({ status: ORDER_STATUS.IN_REVIEW, reviewerId: item.id }),
      empty: "No assigned review work",
    },
    {
      key: "unassigned",
      label: "Unassigned Active",
      caption: "Active orders needing ownership",
      to: ordersPath({ queue: OPERATIONAL_QUEUE_IDS.UNASSIGNED_ORDERS }),
      count: summary.unassigned,
      empty: "No unassigned active orders",
    },
    {
      key: "revisions",
      label: "Revision Follow-Up",
      caption: "Needs-revisions ownership",
      to: ordersPath({ status: ORDER_STATUS.NEEDS_REVISIONS }),
      items: summary.revisions,
      itemTo: (item) => ordersPath({ status: ORDER_STATUS.NEEDS_REVISIONS, appraiserId: item.id }),
      empty: "No revision follow-up",
    },
  ];

  return (
    <section
      aria-label="Workload visibility"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Workload Visibility
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Current active order ownership for coordination.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className="min-h-32 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            {card.to ? (
              <Link
                to={card.to}
                className="inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
              >
                {card.label}
              </Link>
            ) : (
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {card.label}
              </div>
            )}
            <div className="mt-1 text-xs text-slate-500">{card.caption}</div>
            {loading ? (
              <div className="mt-4 text-2xl font-semibold text-slate-950">-</div>
            ) : card.key === "unassigned" ? (
              <>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">
                  {card.count || 0}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {card.count ? "Needs assignment review" : card.empty}
                </div>
              </>
            ) : (
              <WorkloadList items={card.items} itemTo={card.itemTo} empty={card.empty} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkloadList({ items, itemTo, empty }) {
  if (!items?.length) {
    return <div className="mt-4 text-sm text-slate-500">{empty}</div>;
  }

  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
          {itemTo ? (
            <Link
              to={itemTo(item)}
              className="min-w-0 truncate text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-slate-700">{item.label}</span>
          )}
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-900 ring-1 ring-slate-200">
            {item.count}
          </span>
        </div>
      ))}
    </div>
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
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Owner Setup Guidance
          </div>
          <h2 className="mt-0.5 text-sm font-semibold text-slate-950">
            Review operational setup readiness
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-amber-900">
            Diagnostic guidance only. This does not change permissions, workflow, route access, or
            operational visibility.
          </p>
        </div>
        <Link
          to="/settings/owner-setup"
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
        >
          Review Owner Setup
        </Link>
      </div>
    </section>
  );
}
