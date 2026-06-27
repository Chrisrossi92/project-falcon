// src/pages/Orders.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OrdersFilters from "@/features/orders/OrdersFilters";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import NewOrderButton from "@/components/orders/NewOrderButton";
import { FalconPageMotion } from "@/components/motion";
import {
  FalconEmptyState,
  FalconErrorState,
  FalconLoadingState,
  FalconUpdatingIndicator,
} from "@/components/state";
import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";
import { labelForStatus } from "@/lib/constants/orderStatus";
import {
  falconInteractionClassNames,
  falconInteractionStyles,
} from "@/lib/ui/falconInteractions";
import { OPERATIONAL_QUEUE_DEFINITIONS } from "@/features/queues/queueDefinitions";
import { orderHasQueue } from "@/features/queues/queueEvaluator";
import { getQueueSummaryById, summarizeOperationalQueues } from "@/features/queues/queueSummary";
import { useOrdersSummary } from "@/lib/hooks/useOrders";
import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import { getOperationsScopeForMode } from "@/lib/operations/operationsMode";
import { useShellProfile } from "@/lib/shell/useShellProfile";
import { getShellWorkModeCue } from "@/lib/shell/shellWorkMode";
import { getWorkspaceIdentity } from "@/lib/workspace/workspaceIdentity";
import { buildOrderDetailPath } from "@/features/orders/orderRoutePaths";
import {
  createOrderSavedView,
  deleteOrderSavedView,
  listOrderSavedViews,
} from "@/lib/api/orderSavedViews";

const ACTIVE_CURRENT_STATUSES = Object.freeze([
  "new",
  "in_progress",
  "in_review",
  "needs_revisions",
  "review_cleared",
  "pending_final_approval",
  "ready_for_client",
]);

function defaultOrderStatusFilter() {
  return [...ACTIVE_CURRENT_STATUSES];
}

function isDefaultActiveStatusFilter(statusIn = []) {
  return (
    Array.isArray(statusIn) &&
    statusIn.length === ACTIVE_CURRENT_STATUSES.length &&
    ACTIVE_CURRENT_STATUSES.every((status) => statusIn.includes(status))
  );
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function readFilters(qs) {
  const status = qs.get("status") || "";
  const statusIn = status ? [status] : defaultOrderStatusFilter();
  return {
    search: qs.get("q") || "",
    clientId: qs.get("clientId") || "",
    appraiserId: qs.get("appraiserId") || "",
    reviewerId: qs.get("reviewerId") || "",
    assignedToMe: qs.get("myWork") === "1",
    priority: qs.get("priority") || "",
    dueWindow: qs.get("due") || "",
    queueId: qs.get("queue") || "",
    statusIn,
    page: Math.max(0, parseInt(qs.get("page") || "0", 10)),
    pageSize: Math.max(10, parseInt(qs.get("pageSize") || "15", 10)),
    orderBy: "created_at",
    ascending: false,
  };
}

function writeFilters(navigate, next) {
  const qs = new URLSearchParams();
  if (next.statusIn?.length === 1 && !isDefaultActiveStatusFilter(next.statusIn)) {
    qs.set("status", next.statusIn[0]);
  }
  if (next.appraiserId) qs.set("appraiserId", next.appraiserId);
  if (next.reviewerId) qs.set("reviewerId", next.reviewerId);
  if (next.assignedToMe) qs.set("myWork", "1");
  if (next.clientId) qs.set("clientId", next.clientId);
  if (next.priority) qs.set("priority", next.priority);
  if (next.dueWindow) qs.set("due", next.dueWindow);
  if (next.queueId) qs.set("queue", next.queueId);
  if (next.search) qs.set("q", next.search);
  qs.set("page", String(Math.max(0, next.page || 0)));
  qs.set("pageSize", String(Math.max(10, next.pageSize || 15)));
  navigate({ search: `?${qs.toString()}` }, { replace: true });
}

const SAVED_VIEW_FILTER_KEYS = new Set([
  "status",
  "q",
  "clientId",
  "appraiserId",
  "reviewerId",
  "myWork",
  "due",
  "queue",
  "pageSize",
]);

const QUEUE_LABELS = new Map(OPERATIONAL_QUEUE_DEFINITIONS.map((queue) => [queue.id, queue.label]));
const filterActionStyle = falconInteractionStyles();
const savedViewRowStyle = falconInteractionStyles();

function formatIdLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > 24 ? `${text.slice(0, 8)}...${text.slice(-6)}` : text;
}

function formatDueLabel(value) {
  const due = String(value || "").trim();
  if (!due) return "";
  if (due === "overdue") return "Overdue";
  if (due === "this_week") return "This week (transitional)";
  if (due === "next_week") return "Next week (transitional)";
  if (/^\d+$/.test(due)) {
    return due === "1" ? "Due in 1 day" : `Due in ${due} days`;
  }
  return `${due.replace(/_/g, " ")} (transitional)`;
}

function buildActiveFilterChips(filters) {
  const chips = [];
  const status = filters.statusIn?.length === 1 ? filters.statusIn[0] : "";

  if (status) {
    chips.push({
      key: "status",
      label: `Status: ${labelForStatus(status)}`,
      clearPatch: { statusIn: defaultOrderStatusFilter() },
    });
  }

  if (filters.search) {
    chips.push({
      key: "search",
      label: `Search: "${filters.search}"`,
      clearPatch: { search: "" },
    });
  }

  if (filters.clientId) {
    chips.push({
      key: "clientId",
      label: `Client: ${formatIdLabel(filters.clientId)}`,
      clearPatch: { clientId: "" },
    });
  }

  if (filters.appraiserId) {
    chips.push({
      key: "appraiserId",
      label: `Appraiser: ${formatIdLabel(filters.appraiserId)}`,
      clearPatch: { appraiserId: "" },
    });
  }

  if (filters.reviewerId) {
    chips.push({
      key: "reviewerId",
      label: `Reviewer: ${formatIdLabel(filters.reviewerId)}`,
      clearPatch: { reviewerId: "" },
    });
  }

  if (filters.assignedToMe) {
    chips.push({
      key: "assignedToMe",
      label: "My Work",
      clearPatch: { assignedToMe: false },
    });
  }

  if (filters.dueWindow) {
    chips.push({
      key: "dueWindow",
      label: `Due: ${formatDueLabel(filters.dueWindow)}`,
      clearPatch: { dueWindow: "" },
    });
  }

  if (filters.queueId) {
    const queueLabel = QUEUE_LABELS.get(filters.queueId) || formatIdLabel(filters.queueId);
    chips.push({
      key: "queueId",
      label: `Queue: ${queueLabel} (derived)`,
      clearPatch: { queueId: "" },
    });
  }

  return chips;
}

function isAppraiserOrdersProfile(shellProfilePresentation) {
  const role = String(shellProfilePresentation?.role || "").toLowerCase();
  const profileId = String(shellProfilePresentation?.profileId || shellProfilePresentation?.id || "").toLowerCase();
  const navMode = String(shellProfilePresentation?.navMode || "").toLowerCase();

  return role === "appraiser" || profileId === "appraiser" || profileId === "my_work" || navMode === "my_work";
}

function isReviewerOrdersProfile(shellProfilePresentation) {
  const context = shellProfilePresentation?.appContext || {};
  const role = String(shellProfilePresentation?.role || context?.primary_role_key || "").toLowerCase();
  const profileId = String(shellProfilePresentation?.profileId || shellProfilePresentation?.id || "").toLowerCase();
  const navMode = String(shellProfilePresentation?.navMode || "").toLowerCase();
  const isOwnerAdmin = Boolean(context?.is_owner || context?.is_admin_role);

  return !isOwnerAdmin && (role === "reviewer" || profileId === "review_queue" || navMode === "review_queue");
}

function firstNameFromIdentity(shellProfilePresentation) {
  const context = shellProfilePresentation?.appContext || {};
  const candidate = [
    context?.display_name,
    context?.full_name,
    context?.name,
    context?.email,
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean);

  if (!candidate) return "";
  return candidate.split(/\s+/)[0]?.replace(/['’]s$/i, "") || "";
}

function reviewerOrdersTitle(shellProfilePresentation) {
  const firstName = firstNameFromIdentity(shellProfilePresentation);
  return firstName ? `${firstName}'s Orders` : "My Orders";
}

function ActiveFilterChips({ filters, onChange }) {
  const chips = buildActiveFilterChips(filters || {});
  if (!chips.length) return null;

  const clearAll = () =>
    onChange?.({
      statusIn: [],
      search: "",
      clientId: "",
      appraiserId: "",
      reviewerId: "",
      assignedToMe: false,
      dueWindow: "",
      queueId: "",
    });

  return (
    <WorkspaceSurface
      as="div"
      variant="evidence"
      aria-label="Order filters"
      className="flex flex-wrap items-start gap-2 bg-white px-3 py-2 sm:items-center"
    >
      <span className="mr-1 w-full shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 sm:w-auto">
        Filters
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange?.(chip.clearPatch)}
          aria-label={`Remove ${chip.label} filter`}
          style={filterActionStyle}
          className={falconInteractionClassNames("quietSecondaryAction", {
            className: "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
          })}
        >
          <span className="truncate">{chip.label}</span>
          <span aria-hidden="true" className="text-slate-400">
            x
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        style={filterActionStyle}
        className={falconInteractionClassNames("quietSecondaryAction", {
          className: "ml-0 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm sm:ml-auto",
        })}
      >
        Clear Filters
      </button>
    </WorkspaceSurface>
  );
}

function buildSavedViewFilters(filters) {
  const payload = {};
  const status = filters?.statusIn?.[0] || "";

  if (status) payload.status = status;
  if (filters?.search) payload.q = filters.search;
  if (filters?.clientId) payload.clientId = filters.clientId;
  if (filters?.appraiserId) payload.appraiserId = filters.appraiserId;
  if (filters?.reviewerId) payload.reviewerId = filters.reviewerId;
  if (filters?.assignedToMe) payload.myWork = "1";
  if (filters?.dueWindow) payload.due = filters.dueWindow;
  if (filters?.queueId) payload.queue = filters.queueId;
  if (filters?.pageSize) payload.pageSize = filters.pageSize;

  return payload;
}

function savedViewFiltersToOrdersFilters(savedFilters, currentFilters) {
  const filters = savedFilters && typeof savedFilters === "object" && !Array.isArray(savedFilters)
    ? savedFilters
    : null;

  if (!filters) {
    throw new Error("Saved view filters are unavailable.");
  }

  const unsupportedKeys = Object.keys(filters).filter((key) => !SAVED_VIEW_FILTER_KEYS.has(key));
  if (unsupportedKeys.length) {
    throw new Error("Saved view contains unsupported filters.");
  }

  return {
    ...currentFilters,
    statusIn: filters.status ? [filters.status] : defaultOrderStatusFilter(),
    search: filters.q || "",
    clientId: filters.clientId || "",
    appraiserId: filters.appraiserId || "",
    reviewerId: filters.reviewerId || "",
    assignedToMe: filters.myWork === "1" || filters.myWork === true,
    dueWindow: filters.due || "",
    queueId: filters.queue || "",
    priority: "",
    page: 0,
    pageSize: Math.max(10, parseInt(filters.pageSize || currentFilters?.pageSize || 15, 10)),
  };
}

function SavedViewsPanel({ filters, onApply }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || loaded) return undefined;

    let mounted = true;

    async function loadSavedViews() {
      setLoading(true);
      setError("");
      try {
        const data = await listOrderSavedViews();
        if (mounted) {
          setViews(Array.isArray(data) ? data : []);
          setLoaded(true);
        }
      } catch (err) {
        if (mounted) setError(err?.message || "Saved views could not be loaded.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSavedViews();

    return () => {
      mounted = false;
    };
  }, [loaded, open]);

  async function handleSave(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter a saved view name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const created = await createOrderSavedView(trimmedName, buildSavedViewFilters(filters));
      setViews((current) => (created ? [...current, created] : current));
      setName("");
    } catch (err) {
      setError(err?.message || "Saved view could not be created.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(viewId) {
    setDeletingId(viewId);
    setError("");
    try {
      await deleteOrderSavedView(viewId);
      setViews((current) => current.filter((view) => view.id !== viewId));
    } catch (err) {
      setError(err?.message || "Saved view could not be deleted.");
    } finally {
      setDeletingId("");
    }
  }

  function handleApply(view) {
    setError("");
    try {
      onApply?.(savedViewFiltersToOrdersFilters(view.filters, filters));
      setOpen(false);
    } catch (err) {
      setError(err?.message || "Saved view could not be applied.");
    }
  }

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={filterActionStyle}
        className={falconInteractionClassNames("quietSecondaryAction", {
          className: "w-full rounded-md px-3 py-1.5 text-sm font-medium sm:w-auto",
        })}
        aria-expanded={open}
        aria-controls="orders-saved-views-panel"
      >
        Saved Views
      </button>

      {open ? (
        <div
          id="orders-saved-views-panel"
          className="absolute left-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg sm:left-auto sm:right-0"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Saved Views
              </div>
              <p className="mt-1 text-xs text-slate-500">Personal URL presets for this Orders queue.</p>
            </div>
          </div>

          {error ? (
            <FalconErrorState
              className="mb-2 rounded-lg px-2.5 py-2 text-left shadow-none"
              title="Saved views need attention"
              description={error}
            />
          ) : null}

          <div className="max-h-44 space-y-1 overflow-auto border-y border-slate-100 py-2">
            {loading ? (
              <FalconLoadingState
                className="rounded-lg px-2.5 py-2 text-left shadow-none"
                title="Loading saved views"
                description="Loading saved views..."
              />
            ) : null}
            {!loading && !views.length ? (
              <FalconEmptyState
                className="rounded-lg px-2.5 py-3 text-left shadow-none"
                title="No saved views yet."
                description="Save the current filters when this view is useful again."
              />
            ) : null}
            {views.map((view) => (
              <div
                key={view.id}
                style={savedViewRowStyle}
                className={falconInteractionClassNames("row", {
                  className: "flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 sm:flex-nowrap",
                })}
              >
                <button
                  type="button"
                  onClick={() => handleApply(view)}
                  style={savedViewRowStyle}
                  className={falconInteractionClassNames("quietSecondaryAction", {
                    className: "min-w-0 flex-1 truncate rounded-md border-transparent bg-transparent px-1.5 py-1 text-left text-sm font-semibold text-slate-700 shadow-none",
                  })}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(view.id)}
                  disabled={deletingId === view.id}
                  style={savedViewRowStyle}
                  className={falconInteractionClassNames("destructiveAction", {
                    disabled: deletingId === view.id,
                    className: "rounded-md px-2 py-1 text-xs font-semibold shadow-none",
                  })}
                >
                  {deletingId === view.id ? "Deleting" : "Delete"}
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleSave} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name current view"
              style={savedViewRowStyle}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 shadow-sm transition-[background-color,border-color,box-shadow,color,opacity,transform] focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
            />
            <button
              type="submit"
              disabled={saving}
              style={savedViewRowStyle}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-[background-color,border-color,box-shadow,color,opacity,transform] hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              {saving ? <FalconUpdatingIndicator className="border-white/20 bg-white/10 px-0 py-0 text-white shadow-none" label="Saving" /> : "Save"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const qs = useQuery();
  const { operationsMode } = useOperationsMode();
  const operationsScope = getOperationsScopeForMode(operationsMode);
  const workspaceIdentity = getWorkspaceIdentity(operationsMode);
  const shellProfilePresentation = useShellProfile();
  const shellWorkMode = getShellWorkModeCue(shellProfilePresentation);
  const currentUserId = shellProfilePresentation?.appContext?.user_id || "";
  const appraiserOrdersView = isAppraiserOrdersProfile(shellProfilePresentation);
  const reviewerOrdersView = isReviewerOrdersProfile(shellProfilePresentation);
  const roleFocusedOrdersView = appraiserOrdersView || reviewerOrdersView;
  const [filters, setFilters] = useState(() => readFilters(qs));
  const previousOperationsModeRef = useRef(operationsMode);

  useEffect(() => setFilters(readFilters(qs)), [qs]);

  useEffect(() => {
    if (previousOperationsModeRef.current === operationsMode) return;

    previousOperationsModeRef.current = operationsMode;
    setFilters(readFilters(new URLSearchParams()));
    navigate({ search: "" }, { replace: true });
  }, [navigate, operationsMode]);

  const queueId = filters.queueId || "";
  const queueSourceFilters = useMemo(() => {
    const { queueId: _queueId, page: _page, pageSize: _pageSize, ...rest } = filters;
    return {
      ...rest,
      ...(rest.assignedToMe
        ? {
            appraiserId: "",
            reviewerId: "",
            assignedToMeUserId: currentUserId,
          }
        : {}),
      page: 0,
      pageSize: 1000,
    };
  }, [currentUserId, filters]);
  const queueSource = useOrdersSummary(queueSourceFilters, {
    enabled: Boolean(queueId),
    scope: "orders",
    operationsScope,
  });
  const queueRows = useMemo(() => {
    if (!queueId) return null;
    return (queueSource.rows || []).filter((order) => orderHasQueue(order, queueId));
  }, [queueId, queueSource.rows]);
  const activeQueue = useMemo(() => {
    if (!queueId) return null;
    const summaries = summarizeOperationalQueues(queueSource.rows || []);
    const summary = getQueueSummaryById(summaries, queueId);
    return summary ? { ...summary, count: queueRows?.length || 0 } : null;
  }, [queueId, queueRows, queueSource.rows]);

  function onChange(patch) {
    const next = { ...filters, ...patch, page: 0 };
    if (patch.statusIn && Array.isArray(patch.statusIn) && patch.statusIn.length === 0) {
      next.statusIn = defaultOrderStatusFilter();
    }
    if (next.assignedToMe) {
      next.appraiserId = "";
      next.reviewerId = "";
    }
    setFilters(next);
    writeFilters(navigate, next);
  }

  function applySavedView(next) {
    const normalized = next.assignedToMe
      ? { ...next, appraiserId: "", reviewerId: "" }
      : next;
    setFilters(normalized);
    writeFilters(navigate, normalized);
  }

  const visibleFilters = appraiserOrdersView
    ? {
        ...filters,
        appraiserId: "",
        reviewerId: "",
      }
    : filters;
  const tableFilters = filters.assignedToMe
    ? {
        ...filters,
        appraiserId: "",
        reviewerId: "",
        assignedToMeUserId: currentUserId,
      }
    : filters;
  const pageTitle = appraiserOrdersView
    ? "Orders"
    : reviewerOrdersView
      ? reviewerOrdersTitle(shellProfilePresentation)
      : "Orders";
  const pageDescription = appraiserOrdersView
    ? "Orders assigned to you."
    : reviewerOrdersView
      ? "Review and track orders assigned to your queue."
      : workspaceIdentity.ordersDescription || "Manage company orders, workflow handoffs, and order records.";
  const ordersEyebrow = workspaceIdentity.ordersEyebrow || "Operations";
  const ordersWorkMode = workspaceIdentity.ordersWorkMode || shellWorkMode.label;
  const ordersWorkModeClass =
    workspaceIdentity.accentClasses.eyebrow || "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <FalconPageMotion className="space-y-4" aria-label="Orders page">
      <WorkspaceSurface
        as="header"
        variant="primary"
        className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:items-end sm:px-5"
      >
        <div className="min-w-0 flex-1">
          {roleFocusedOrdersView ? null : (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
              <span className="text-slate-400">{ordersEyebrow}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] tracking-[0.12em] ${ordersWorkModeClass}`}>
                {ordersWorkMode}
              </span>
            </div>
          )}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {pageTitle}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {pageDescription}
          </p>
        </div>
        {roleFocusedOrdersView ? null : (
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            <NewOrderButton show className="shrink-0" />
          </div>
        )}
      </WorkspaceSurface>

      <OrdersFilters
        value={visibleFilters}
        onChange={onChange}
        title={roleFocusedOrdersView ? (reviewerOrdersView ? "Filter Orders" : "Filters") : undefined}
        description={roleFocusedOrdersView ? null : undefined}
        searchLabel={roleFocusedOrdersView ? (reviewerOrdersView ? "Search orders" : "Search assigned orders") : undefined}
        showAppraiserFilter={!appraiserOrdersView}
        showMyWorkFilter={Boolean(currentUserId)}
        density={roleFocusedOrdersView ? "compact" : undefined}
        actions={
          roleFocusedOrdersView ? null : (
            <>
              <SavedViewsPanel filters={filters} onApply={applySavedView} />
            </>
          )
        }
      />
      <ActiveFilterChips filters={visibleFilters} onChange={onChange} />

      <UnifiedOrdersTable
        key={JSON.stringify({
          q: filters.search,
          s: filters.statusIn?.[0] || "",
          c: filters.clientId || "",
          a: filters.appraiserId || "",
          r: filters.reviewerId || "",
          mw: filters.assignedToMe ? "1" : "",
          d: filters.dueWindow || "",
          queue: filters.queueId || "",
          p: filters.page,
          ps: filters.pageSize,
        })}
        filters={tableFilters}
        operationsScope={operationsScope}
        pageSize={filters.pageSize || 15}
        rowsOverride={queueId ? queueRows || [] : null}
        activeQueue={activeQueue}
        tableEyebrow={null}
        tableLabel={appraiserOrdersView ? "Assigned Orders" : "Orders"}
        tableSummary={roleFocusedOrdersView ? null : "Company order records."}
        orderDetailPathForOrder={(_order, orderId) => buildOrderDetailPath(orderId, pathname)}
      />
    </FalconPageMotion>
  );
}
