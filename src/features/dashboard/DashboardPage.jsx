// src/features/dashboard/DashboardPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import AppraiserWorkbenchPreview from "@/features/dashboard/workbenches/AppraiserWorkbenchPreview";
import {
  WorkspaceSurface,
  workspaceSurfaceClassNames,
} from "@/components/workspace/WorkspaceSurface";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { getShellWorkModeCue } from "@/lib/shell/shellWorkMode";
import { getWorkspaceIdentity } from "@/lib/workspace/workspaceIdentity";
import { useCallback, useMemo, useState } from "react";

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
  "Track active work, review handoffs, due pressure, and workflow coordination.";

const AMC_OPERATIONS_DASHBOARD_SUBTITLE =
  "Track procurement queues, vendor response, client orders, and SLA pressure.";

const REVIEWER_DASHBOARD_SUBTITLE =
  "Active review work, revision follow-up, and calendar context for your queue.";

const REVIEWER_STATUS_FILTERS = Object.freeze([
  {
    label: "In Review",
    value: ORDER_STATUS.IN_REVIEW,
    tone: "border-indigo-200 bg-indigo-50 text-indigo-900",
    selectedTone: "border-indigo-500 bg-indigo-100 text-indigo-950 ring-indigo-300",
  },
  {
    label: "Needs Revisions",
    value: ORDER_STATUS.NEEDS_REVISIONS,
    tone: "border-rose-200 bg-rose-50 text-rose-900",
    selectedTone: "border-rose-500 bg-rose-100 text-rose-950 ring-rose-300",
  },
]);

function getShellProfilePresentationId(shellProfilePresentation) {
  return (
    shellProfilePresentation?.profileId ??
    shellProfilePresentation?.profile?.id ??
    shellProfilePresentation?.shellMetadata?.id
  );
}

function firstNameFromIdentity(appContext) {
  const identity = displayName(
    appContext?.display_name || appContext?.name || appContext?.full_name || appContext?.email,
    "",
  );

  if (!identity) return "";

  return identity.split(/\s+/)[0].replace(/@.*$/, "");
}

function reviewerReviewsTitle(appContext) {
  const firstName = firstNameFromIdentity(appContext);
  return firstName ? `${firstName}'s Reviews` : "My Reviews";
}

function resolveDashboardPresentation({
  shellProfilePresentation,
  operationsMode,
  isAdmin,
  isReviewer,
  appContext,
}) {
  const profileId = getShellProfilePresentationId(shellProfilePresentation);
  const isOperations = profileId === "operations";
  const isAmcOperations = operationsMode === OPERATIONS_MODES.AMC_OPERATIONS;

  if (isReviewer && !isAdmin) {
    return {
      title: reviewerReviewsTitle(appContext),
      subtitle: REVIEWER_DASHBOARD_SUBTITLE,
    };
  }

  if (isOperations) {
    if (isAmcOperations) {
      return {
        title: "AMC Operations Dashboard",
        subtitle: AMC_OPERATIONS_DASHBOARD_SUBTITLE,
      };
    }

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
      : "Calendar context, assigned orders, and revision follow-up.",
  };
}

export default function DashboardPage({ shellProfilePresentation, operationsMode } = {}) {
  const nav = useNavigate();
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const summary = useDashboardSummary({ operationsMode, refreshKey: dashboardRefreshKey });
  const {
    role: summaryRole,
    isAdmin: summaryIsAdmin,
    isReviewer: summaryIsReviewer,
    loading: summaryLoading,
    tableFilters,
    ordersRows,
    userId,
    appContext,
    reviewerHybridAppraisal,
  } = summary;
  const normalizedRole = summaryRole || "appraiser";
  const isAdmin = summaryIsAdmin;
  const isReviewer = summaryIsReviewer;
  const loading = summaryLoading;
  const reviewerId = isReviewer ? userId || null : null;
  const isReviewerOnlyDashboard = isReviewer && !isAdmin;

  const cfg = DASHBOARD_CONFIG[normalizedRole] || DASHBOARD_CONFIG.appraiser;
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewerWorkLens, setReviewerWorkLens] = useState("review");
  const [dashboardOrderPatches, setDashboardOrderPatches] = useState({});
  const canSwitchReviewerWork =
    isReviewerOnlyDashboard &&
    Boolean(appContext?.is_appraiser_role) &&
    Boolean(userId);
  const activeReviewerWorkLens = canSwitchReviewerWork ? reviewerWorkLens : "review";
  const reviewerWorkCounts = {
    review: Array.isArray(ordersRows) ? ordersRows.length : 0,
    appraisal: Array.isArray(reviewerHybridAppraisal?.rows) ? reviewerHybridAppraisal.rows.length : 0,
  };
  const selectedDashboardRows = useMemo(
    () =>
      activeReviewerWorkLens === "appraisal"
        ? reviewerHybridAppraisal?.rows || []
        : ordersRows || [],
    [activeReviewerWorkLens, ordersRows, reviewerHybridAppraisal?.rows],
  );
  const selectedDashboardFilters = useMemo(
    () =>
      activeReviewerWorkLens === "appraisal"
        ? reviewerHybridAppraisal?.filters || {}
        : tableFilters || {},
    [activeReviewerWorkLens, reviewerHybridAppraisal?.filters, tableFilters],
  );
  const selectedDashboardRole =
    activeReviewerWorkLens === "appraisal" ? "appraiser" : normalizedRole;
  const selectedDashboardMode =
    activeReviewerWorkLens === "review" && isReviewer ? "reviewerQueue" : undefined;
  const selectedDashboardReviewerId =
    activeReviewerWorkLens === "review" && isReviewer ? reviewerId : undefined;

  const appliedFilters = useMemo(() => {
    const next = { ...(selectedDashboardFilters || {}) };
    if (isAdmin) {
      next.inspectedAwaitingReport = false;
      next.finalDueWithinDays = null;
      next.page = 0;
    } else {
      next.page = next.page || 0;
    }
    return next;
  }, [selectedDashboardFilters, isAdmin]);

  const toggleStatus = (val) => {
    setStatusFilter((curr) => (curr === val ? "" : val));
  };

  const { title, subtitle } = resolveDashboardPresentation({
    shellProfilePresentation,
    operationsMode,
    isAdmin,
    isReviewer,
    appContext,
  });
  const workspaceIdentity = getWorkspaceIdentity(operationsMode);
  const shellWorkMode = getShellWorkModeCue(shellProfilePresentation);
  const shellProfileId = getShellProfilePresentationId(shellProfilePresentation);
  const showAppraiserWorkbenchPreview = shellProfileId === "my_work" && !isAdmin;
  const companyLabel = displayName(appContext?.company_name, "Current company");
  const roleLabel = roleContextLabel({ isAdmin, isReviewer, role: normalizedRole });
  const dashboardStatLabel = workspaceIdentity.dashboardStatLabel || "Work View";
  const dashboardStatValue = workspaceIdentity.dashboardStatValue || roleLabel;
  const ordersCount = summary.orders.count ?? 0;
  const patchedOrdersRows = useMemo(
    () =>
      (selectedDashboardRows || []).map((order) => {
        const orderId = order?.id || order?.order_id;
        return orderId && dashboardOrderPatches[orderId]
          ? { ...order, ...dashboardOrderPatches[orderId] }
          : order;
      }),
    [dashboardOrderPatches, selectedDashboardRows],
  );
  const patchedCalendarRows = useMemo(
    () =>
      (ordersRows || []).map((order) => {
        const orderId = order?.id || order?.order_id;
        return orderId && dashboardOrderPatches[orderId]
          ? { ...order, ...dashboardOrderPatches[orderId] }
          : order;
      }),
    [dashboardOrderPatches, ordersRows],
  );
  const dashboardTableTitle = isAdmin
    ? "Active Worklist"
    : isReviewer
      ? activeReviewerWorkLens === "appraisal"
        ? "My Appraisal Work"
        : "My Review Work"
      : "My Assignments";
  const handleDashboardOrderChanged = useCallback((updatedOrder) => {
    const orderId = updatedOrder?.id || updatedOrder?.order_id;
    if (!orderId) return;

    setDashboardOrderPatches((current) => ({
      ...current,
      [orderId]: updatedOrder,
    }));
    setDashboardRefreshKey((key) => key + 1);
  }, []);
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_TIMELINE.map((status) => [status.value, 0]));
    (patchedOrdersRows || []).forEach((order) => {
      const status = normalizeOrderStatus(order?.status_normalized || order?.status);
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      }
    });
    return counts;
  }, [patchedOrdersRows]);
  const filteredOrdersRows = useMemo(() => {
    if (!statusFilter) return patchedOrdersRows || [];
    return (patchedOrdersRows || []).filter(
      (order) => normalizeOrderStatus(order?.status_normalized || order?.status) === statusFilter,
    );
  }, [patchedOrdersRows, statusFilter]);
  const handleOpenOrder = (orderId) => {
    if (!orderId) return;
    nav(`/orders/${orderId}`);
  };

  return (
    <div className="space-y-5">
      <WorkspaceSurface
        variant="primary"
        className="bg-white/95 px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.07)] sm:px-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              title={shellWorkMode.context}
            >
              {shellWorkMode.label}
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
                {dashboardStatLabel}
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-950">
                {dashboardStatValue}
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
      </WorkspaceSurface>

      <OwnerSetupDashboardPrompt appContext={appContext} />

      {isReviewerOnlyDashboard && activeReviewerWorkLens === "review" && (
        <ReviewerStatusFilterChips
          counts={statusCounts}
          selectedStatus={statusFilter}
          onClear={() => setStatusFilter("")}
          onSelect={toggleStatus}
        />
      )}

      <WorkspaceSurface
        variant="secondary"
        className="bg-white p-3"
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
          orders={patchedCalendarRows || []}
          role={normalizedRole}
          onOpenOrder={handleOpenOrder}
          fixedHeader={true}
          mode={selectedDashboardMode}
          reviewerId={selectedDashboardReviewerId}
        />
      </WorkspaceSurface>

      {isAdmin && (
        <StatusTimelineBar
          counts={statusCounts}
          selectedStatus={statusFilter}
          onClear={() => setStatusFilter("")}
          onSelect={toggleStatus}
        />
      )}

      <section className={!isReviewerOnlyDashboard && !isAdmin ? "grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem]" : "grid gap-3"}>
        {/* Orders section */}
        {cfg.showOrdersTable && (
          <WorkspaceSurface variant="primary" className="space-y-3 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {dashboardTableTitle}
                </h2>
                {canSwitchReviewerWork ? (
                  <div
                    role="group"
                    aria-label="Dashboard work filter"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
                  >
                    {[
                      ["review", "Review Work"],
                      ["appraisal", "Appraisal Work"],
                    ].map(([value, label]) => {
                      const active = activeReviewerWorkLens === value;
                      const inactiveCount = active ? 0 : reviewerWorkCounts[value] || 0;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setReviewerWorkLens(value);
                            setStatusFilter("");
                          }}
                          className={
                            "h-7 rounded-md px-2.5 text-xs font-semibold transition " +
                            (active
                              ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-500 hover:bg-white/70 hover:text-slate-800")
                          }
                        >
                          <span>{label}</span>
                          {inactiveCount > 0 ? (
                            <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-700">
                              {inactiveCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div className="text-sm text-slate-500">
                {filteredOrdersRows.length} order{filteredOrdersRows.length === 1 ? "" : "s"}
              </div>
            </div>
            <UnifiedOrdersTable
              role={selectedDashboardRole}
              mode={selectedDashboardMode}
              reviewerId={selectedDashboardReviewerId}
              filters={appliedFilters}
              operationsScope={summary.operationsScope}
              rowsOverride={filteredOrdersRows}
              pageSize={10}
              scope="dashboard"
              onOrderDatesChanged={() => setDashboardRefreshKey((key) => key + 1)}
              onOrderChanged={handleDashboardOrderChanged}
            />
          </WorkspaceSurface>
        )}

        {!isReviewerOnlyDashboard && !isAdmin && (
          <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <WorkspaceSurface variant="secondary" className="space-y-3 p-3">
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
          </WorkspaceSurface>
          </aside>
        )}
      </section>

      {showAppraiserWorkbenchPreview && (
        <AppraiserWorkbenchPreview
          rows={patchedOrdersRows || []}
          loading={loading}
          appraiserLabel={roleLabel}
          compact
        />
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

function StatusTimelineBar({ counts, onClear, onSelect, selectedStatus }) {
  return (
    <WorkspaceSurface variant="secondary" className="bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Status
          </h2>
        </div>
        {selectedStatus ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Clear Filter
          </button>
        ) : null}
      </div>
      <div role="group" aria-label="Status filters" className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {STATUS_TIMELINE.map((status) => {
          const selected = selectedStatus === status.value;
          return (
            <button
              key={status.value}
              type="button"
              onClick={() => onSelect(status.value)}
              aria-pressed={selected}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-200 motion-reduce:transition-none ${
                selected
                  ? `${status.selectedTone} shadow-sm ring-2`
                  : `${status.tone} hover:brightness-95`
              }`}
            >
              <span className="text-xs font-semibold leading-tight">{status.label}</span>
              <span className="text-lg font-semibold leading-none tracking-tight tabular-nums">
                {counts[status.value] || 0}
              </span>
            </button>
          );
        })}
      </div>
    </WorkspaceSurface>
  );
}

function ReviewerStatusFilterChips({ counts, onClear, onSelect, selectedStatus }) {
  const hasSelection = Boolean(selectedStatus);
  // TODO: Add a Resubmitted chip when resubmission is represented by a canonical status or
  // derived activity/order field. Do not infer it from unrelated review states.
  return (
    <WorkspaceSurface variant="secondary" className="bg-white p-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Review status filters">
        {REVIEWER_STATUS_FILTERS.map((filter) => {
          const selected = selectedStatus === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onSelect(filter.value)}
              aria-pressed={selected}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                selected
                  ? `${filter.selectedTone} shadow-sm ring-2`
                  : `${filter.tone} hover:brightness-95`
              }`}
            >
              <span>{filter.label}</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold tabular-nums">
                {counts[filter.value] || 0}
              </span>
            </button>
          );
        })}
        {hasSelection && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>
    </WorkspaceSurface>
  );
}

function StatusTimelineRail({ counts, onClear, onSelect, selectedStatus }) {
  return (
    <div className={workspaceSurfaceClassNames("evidence", "bg-white p-3")}>
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

export function OwnerSetupDashboardPrompt({ appContext } = {}) {
  const canViewSettings = useCan(PERMISSIONS.SETTINGS_VIEW);

  if (!canViewSettings.allowed) return null;

  const isOwner = appContext?.is_owner === true;

  if (!isOwner) return null;

  const description =
    "Diagnostic guidance only. This does not change permissions, workflow, route access, or operational visibility.";

  return (
    <WorkspaceSurface variant="priority" className="px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
            Owner Setup Guidance
          </div>
          <h2 className="mt-0.5 text-sm font-semibold text-slate-950">
            Review operational setup readiness
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-amber-900">
            {description}
          </p>
        </div>
        <Link
          to="/settings/owner-setup"
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
        >
          Review Owner Setup
        </Link>
      </div>
    </WorkspaceSurface>
  );
}
