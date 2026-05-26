import { useCallback, useEffect, useMemo, useState } from "react";
import useSession from "@/lib/hooks/useSession";
import { useOrders } from "@/lib/hooks/useOrders";
import { normalizeOrderStatus, ORDER_STATUS } from "@/lib/constants/orderStatus";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

import OrdersTableRow from "@/components/orders/table/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/table/OrdersTablePagination";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import OrderDrawerContent from "@/components/orders/drawer/OrderDrawerContent";
import { workspaceSurfaceClassNames } from "@/components/workspace/WorkspaceSurface";
import { updateSiteVisitAt } from "@/lib/api/orders";
import {
  sendOrderToReview,
  sendOrderBackToAppraiser,
  completeOrder,
  clearReview,
  requestFinalApproval,
  markReadyForClient,
} from "@/lib/services/ordersService";
import { logNote } from "@/lib/services/activityService";
import WorkflowNoteModal from "@/components/orders/WorkflowNoteModal";

import useColumnsConfig from "@/features/orders/columns/useColumnsConfig";
import { useToast } from "@/lib/hooks/useToast";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";

/* helpers */
const feeOf = (r) => [r?.base_fee, r?.appraiser_fee].find((v) => v != null);
const fmtMoney = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const mapsHref = (street, cityline) => {
  const full = [street || "", cityline || ""].filter(Boolean).join(", ");
  return full ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}` : null;
};
const fmtDate = (d) => (!d ? "-" : isNaN(new Date(d)) ? "-" : new Date(d).toLocaleDateString());
const orderNumberOf = (row) => {
  const fallbackId = row?.id || row?.order_id;
  return row?.order_number || (fallbackId ? String(fallbackId).slice(0, 8) : "");
};

function orderPkOf(o) {
  return o?.id || o?.order_id || null;
}

function withSiteVisit(order, siteVisitAt, serverPatch = {}) {
  return {
    ...order,
    ...serverPatch,
    site_visit_at: serverPatch.site_visit_at ?? siteVisitAt,
    site_visit_date: serverPatch.site_visit_date ?? serverPatch.site_visit_at ?? siteVisitAt,
  };
}

function withWorkflowStatus(order, updatedOrder, fallbackStatus) {
  const normalizedStatus = normalizeOrderStatus(updatedOrder?.status ?? fallbackStatus);
  return {
    ...order,
    ...(updatedOrder || {}),
    ...(normalizedStatus
      ? {
          status: normalizedStatus,
          status_normalized: normalizedStatus,
        }
      : {}),
  };
}

function matchesStatusFilters(order, statusFilters = []) {
  if (!Array.isArray(statusFilters) || statusFilters.length === 0) return true;
  const normalizedStatus = normalizeOrderStatus(order?.status_normalized || order?.status);
  return statusFilters.map(normalizeOrderStatus).includes(normalizedStatus);
}

const APPRAISER_DASHBOARD_STATUSES = [
  ORDER_STATUS.NEW,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.NEEDS_REVISIONS,
];

function isReviewResubmission(order) {
  return normalizeOrderStatus(order?.status) === ORDER_STATUS.NEEDS_REVISIONS;
}

export default function UnifiedOrdersTable({
  role: roleProp,
  filters: appliedFilters = {},
  pageSize = 15,
  className = "",
  style = {},
  mode = null,
  reviewerId = null,
  rowsOverride = null,
  activeQueue = null,
  activeQueueAction = null,
  scope = null,
  onOrderDatesChanged,
  tableEyebrow = "Orders Table",
  tableLabel: tableLabelOverride = null,
  tableSummary: tableSummaryOverride = null,
  emptyTitle = null,
  emptyDescription = null,
  onOrderChanged,
}) {
  const { user: sessionUser } = useSession() || {};
  const { toast } = useToast();
  const workflowPermissions = useEffectivePermissions();

  const { context: appContext, loading: appContextLoading } = useCurrentUserAppContext();
  const contextRole = appContext?.is_owner
    ? "owner"
    : appContext?.is_admin_role
    ? "admin"
    : appContext?.is_reviewer_role
    ? "reviewer"
    : appContext?.is_appraiser_role
    ? "appraiser"
    : String(appContext?.primary_role_key || appContext?.role_keys?.[0] || "appraiser").toLowerCase();
  const internalUserId = appContext?.user_id || null;
  const normalizedRole = (roleProp || contextRole || "appraiser").toString().toLowerCase();
  const isAdminLike = normalizedRole === "owner" || normalizedRole === "admin";
  const isReviewer = normalizedRole === "reviewer";
  const isAppraiser = normalizedRole === "appraiser";
  const role = normalizedRole;

  /* seed built from the **live** filters prop */
  const seed = useMemo(() => {
    const base = {
      activeOnly: appliedFilters.activeOnly ?? false,
      page: appliedFilters.page || 0,
      pageSize: appliedFilters.pageSize || pageSize,
      orderBy: appliedFilters.orderBy || "order_number",
      ascending: appliedFilters.ascending ?? false,
      search: appliedFilters.search || "",
      statusIn: appliedFilters.statusIn || [],
      clientId: appliedFilters.clientId || null,
      appraiserId: appliedFilters.appraiserId || null,
      reviewerId: appliedFilters.reviewerId || null,
      assignedAppraiserId: appliedFilters.assignedAppraiserId || null,
      inspectedAwaitingReport: appliedFilters.inspectedAwaitingReport || false,
      finalDueWithinDays: appliedFilters.finalDueWithinDays ?? null,
      priority: appliedFilters.priority || "",
      dueWindow: appliedFilters.dueWindow || "",
      from: appliedFilters.from || "",
      to: appliedFilters.to || "",
    };
    if (role === "reviewer" && reviewerId && !base.reviewerId) base.reviewerId = reviewerId;
    return base;
  }, [appliedFilters, pageSize, role, reviewerId]);

  const seedFinal = useMemo(() => {
    const enforced = { ...seed };
    if (isAppraiser) {
      enforced.appraiserId = internalUserId || null;
      enforced.assignedAppraiserId = null;
      if (scope === "dashboard") {
        enforced.statusIn = APPRAISER_DASHBOARD_STATUSES;
      }
    }
    if (process.env.NODE_ENV === "development" && isAppraiser) {
      console.debug("[UnifiedOrdersTable] seedFinal (appraiser)", enforced);
    }
    return enforced;
  }, [seed, isAppraiser, internalUserId, scope]);

  const [refreshTick, setRefreshTick] = useState(0);
  const [workflowModal, setWorkflowModal] = useState(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [optimisticOrderPatches, setOptimisticOrderPatches] = useState({});
  const hasRowsOverride = Array.isArray(rowsOverride);

  const {
    data = [],
    count = 0,
    loading,
    error,
    filters: tableFilters,
    setFilters: setTableFilters,
  } = useOrders(
    useMemo(() => ({ ...seedFinal, _tick: refreshTick }), [seedFinal, refreshTick]),
    {
      mode,
      reviewerId,
      scope,
      enabled: !hasRowsOverride && !appContextLoading && (isAdminLike || isReviewer || (isAppraiser && Boolean(internalUserId))),
    }
  );

  useEffect(() => {
    setOptimisticOrderPatches({});
  }, [data, rowsOverride]);

  const sourceData = hasRowsOverride ? rowsOverride : data;
  const tableData = useMemo(
    () =>
      (sourceData || []).map((row) => {
        const orderPk = orderPkOf(row);
        return orderPk && optimisticOrderPatches[orderPk]
          ? { ...row, ...optimisticOrderPatches[orderPk] }
          : row;
      }),
    [optimisticOrderPatches, sourceData],
  );
  const effectiveStatusFilters = useMemo(
    () => seedFinal.statusIn || [],
    [seedFinal.statusIn],
  );
  const filteredTableData = useMemo(
    () => tableData.filter((row) => matchesStatusFilters(row, effectiveStatusFilters)),
    [effectiveStatusFilters, tableData],
  );
  const tableCount = hasRowsOverride ? filteredTableData.length : count;
  const tableLoading = hasRowsOverride ? false : loading;
  const tableError = hasRowsOverride ? null : error;
  const pageStart = hasRowsOverride ? (tableFilters.page || 0) * (tableFilters.pageSize || pageSize) : 0;
  const pageEnd = pageStart + (tableFilters.pageSize || pageSize);
  const displayData = hasRowsOverride ? filteredTableData.slice(pageStart, pageEnd) : filteredTableData;
  const totalPages = Math.max(1, Math.ceil((tableCount || 0) / (tableFilters.pageSize || pageSize)));
  const [expandedId, setExpandedId] = useState(null);

  const refresh = useCallback(() => setRefreshTick((x) => x + 1), []);
  const go = (p) => setTableFilters((f) => ({ ...f, page: Math.min(Math.max(0, p), totalPages - 1) }));

  const applyWorkflowOrderUpdate = useCallback(
    (order, updatedOrder, fallbackStatus) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) return order;

      const nextOrder = withWorkflowStatus(order, updatedOrder, fallbackStatus);
      const patch = { ...(updatedOrder || {}) };
      if (nextOrder.status) {
        patch.status = nextOrder.status;
        patch.status_normalized = nextOrder.status_normalized || nextOrder.status;
      }

      setOptimisticOrderPatches((current) => ({
        ...current,
        [orderPk]: {
          ...(current[orderPk] || {}),
          ...patch,
        },
      }));
      onOrderChanged?.(nextOrder, {
        status: "success",
        previousOrder: order,
      });
      return nextOrder;
    },
    [onOrderChanged],
  );

  const closeWorkflowModal = useCallback(() => {
    if (workflowBusy) return;
    setWorkflowModal(null);
  }, [workflowBusy]);

  const handleSendToReview = useCallback(
    async (order, noteText = "") => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        let formattedNote = "";
        const isResubmission = isReviewResubmission(order);
        if (noteText.trim()) {
          formattedNote = `${isResubmission ? "Resubmission" : "Submission"} note:\n${noteText.trim()}`;
          await logNote(orderPk, formattedNote);
        }
        const updatedOrder = await sendOrderToReview(orderPk, internalUserId || sessionUser?.id, {
          noteText: formattedNote || null,
        });
        applyWorkflowOrderUpdate(order, updatedOrder, ORDER_STATUS.IN_REVIEW);
        refresh();
        toast({
          title: isResubmission ? "Resubmitted to review" : "Sent to review",
          description: isResubmission
            ? `Order ${order.order_number || orderPk} was resubmitted for review.`
            : `Order ${order.order_number || orderPk} was sent to review.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to send to review", err);
        toast({
          title: "Error",
          description: err?.message ? `Failed to send to review: ${err.message}` : "Failed to send order to review.",
          tone: "error",
        });
      }
    },
    [internalUserId, sessionUser?.id, refresh, toast, applyWorkflowOrderUpdate]
  );

  const handleSendBackToAppraiser = useCallback(
    async (order, noteText = "") => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        let formattedNote = "";
        if (noteText.trim()) {
          formattedNote = `Revision note:\n${noteText.trim()}`;
          await logNote(orderPk, formattedNote);
        }
        const updatedOrder = await sendOrderBackToAppraiser(orderPk, sessionUser?.id, {
          noteText: formattedNote || null,
        });
        applyWorkflowOrderUpdate(order, updatedOrder, ORDER_STATUS.NEEDS_REVISIONS);
        refresh();
        toast({
          title: "Revisions requested",
          description: `Revisions requested for order ${order.order_number || orderPk}.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to send back to appraiser", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not request revisions: ${err.message}` : "Could not request revisions.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast, applyWorkflowOrderUpdate]
  );

  const openWorkflowModal = useCallback((action, order) => {
    setWorkflowModal({ action, order });
  }, []);

  const confirmWorkflowModal = useCallback(
    async (noteText) => {
      if (!workflowModal?.order) return;

      setWorkflowBusy(true);
      try {
        if (workflowModal.action === "send_back_to_appraiser") {
          await handleSendBackToAppraiser(workflowModal.order, noteText);
        } else if (workflowModal.action === "send_to_review") {
          await handleSendToReview(workflowModal.order, noteText);
        }
        setWorkflowModal(null);
      } finally {
        setWorkflowBusy(false);
      }
    },
    [workflowModal, handleSendBackToAppraiser, handleSendToReview]
  );

  const handleCompleteOrder = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        const updatedOrder = await completeOrder(orderPk, sessionUser?.id);
        applyWorkflowOrderUpdate(order, updatedOrder, ORDER_STATUS.COMPLETED);
        refresh();
        toast({
          title: "Order completed",
          description: `Order ${order.order_number || orderPk} was marked complete.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to complete order", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not complete: ${err.message}` : "Could not mark order complete.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast, applyWorkflowOrderUpdate]
  );

  const handleClearReview = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        const updatedOrder = await clearReview(orderPk, sessionUser?.id);
        applyWorkflowOrderUpdate(order, updatedOrder, ORDER_STATUS.REVIEW_CLEARED);
        refresh();
        toast({
          title: "Review cleared",
          description: `Order ${order.order_number || orderPk} was cleared for admin release.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to clear review", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not clear review: ${err.message}` : "Could not clear review.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast, applyWorkflowOrderUpdate]
  );

  const handleRequestFinalApproval = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        const updatedOrder = await requestFinalApproval(orderPk, sessionUser?.id);
        applyWorkflowOrderUpdate(order, updatedOrder, ORDER_STATUS.PENDING_FINAL_APPROVAL);
        refresh();
        toast({
          title: "Final approval requested",
          description: `Order ${order.order_number || orderPk} is pending final approval.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to request final approval", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not request final approval: ${err.message}` : "Could not request final approval.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast, applyWorkflowOrderUpdate]
  );

  const handleReadyForClient = useCallback(
    async (order) => {
      const orderPk = orderPkOf(order);
      if (!orderPk) {
        toast({ title: "Error", description: "Missing order id.", tone: "error" });
        return;
      }

      try {
        const updatedOrder = await markReadyForClient(orderPk, sessionUser?.id);
        applyWorkflowOrderUpdate(order, updatedOrder, ORDER_STATUS.READY_FOR_CLIENT);
        refresh();
        toast({
          title: "Marked ready for client",
          description: `Order ${order.order_number || orderPk} moved to client release.`,
          tone: "success",
        });
      } catch (err) {
        console.error("Failed to mark ready for client", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not mark ready for client: ${err.message}` : "Could not mark ready for client.",
          tone: "error",
        });
      }
    },
    [sessionUser?.id, refresh, toast, applyWorkflowOrderUpdate]
  );

  const handleSetSiteVisit = useCallback(
    async (order, iso) => {
      const orderPk = orderPkOf(order);
      if (!orderPk || !iso) return;

      const optimisticOrder = withSiteVisit(order, iso);
      setOptimisticOrderPatches((current) => ({
        ...current,
        [orderPk]: {
          site_visit_at: optimisticOrder.site_visit_at,
          site_visit_date: optimisticOrder.site_visit_date,
        },
      }));
      onOrderDatesChanged?.(optimisticOrder, {
        status: "optimistic",
        previousOrder: order,
      });

      try {
        const updated = await updateSiteVisitAt(orderPk, iso, {
          address: order?.address || order?.address_line1 || "",
          appraiserId: order?.appraiser_id || order?.assigned_to || null,
        });
        if (!updated) throw new Error("Site visit was not updated.");
        const savedOrder = withSiteVisit(optimisticOrder, updated.site_visit_at ?? iso, updated);
        setOptimisticOrderPatches((current) => ({
          ...current,
          [orderPk]: {
            site_visit_at: savedOrder.site_visit_at,
            site_visit_date: savedOrder.site_visit_date,
          },
        }));
        refresh();
        onOrderDatesChanged?.(savedOrder, {
          status: "success",
          previousOrder: order,
        });
        toast({
          title: "Site visit set",
          description: `Order ${order.order_number || orderPk} site visit was updated.`,
          tone: "success",
        });
      } catch (err) {
        setOptimisticOrderPatches((current) => {
          const next = { ...current };
          delete next[orderPk];
          return next;
        });
        onOrderDatesChanged?.(order, {
          status: "error",
          previousOrder: order,
          attemptedSiteVisitAt: iso,
        });
        console.error("Failed to set site visit", err);
        toast({
          title: "Error",
          description: err?.message ? `Could not set site visit: ${err.message}` : "Could not set site visit.",
          tone: "error",
        });
      }
    },
    [onOrderDatesChanged, refresh, toast]
  );

  const columnActions = useMemo(
    () => ({
      onSendToReview: (order) => openWorkflowModal("send_to_review", order),
      onSendBackToAppraiser: (order) => openWorkflowModal("send_back_to_appraiser", order),
      onComplete: handleCompleteOrder,
      onClearReview: handleClearReview,
      onRequestFinalApproval: handleRequestFinalApproval,
      onReadyForClient: handleReadyForClient,
      onSetSiteVisit: handleSetSiteVisit,
      permissions: {
        loading: workflowPermissions.loading,
        error: workflowPermissions.error,
        canSubmitToReview: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_SUBMIT_TO_REVIEW),
        canResubmit: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_RESUBMIT),
        canRequestRevisions: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS),
        canApproveReview: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_APPROVE_REVIEW),
        canReadyForClient: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_READY_FOR_CLIENT),
        canComplete: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_COMPLETE),
      },
    }),
    [
      openWorkflowModal,
      handleCompleteOrder,
      handleClearReview,
      handleRequestFinalApproval,
      handleReadyForClient,
      handleSetSiteVisit,
      workflowPermissions.loading,
      workflowPermissions.error,
      workflowPermissions.hasPermission,
    ]
  );

  const isDashboardWorklist = scope === "dashboard";
  const columns = useColumnsConfig(normalizedRole, columnActions, {
    variant: isDashboardWorklist ? "dashboard" : "default",
  });
  const template = columns.map((c) => c.width).join(" ");
  const tableMinWidth = "0";
  const tableWidth = "100%";

  const stickyHeader = "bg-slate-50/95 sticky left-0 z-20 pr-4 border-r border-slate-200/70";
  const stickyCell = "bg-white sticky left-0 z-10 pr-4 border-slate-200/70 group-hover:bg-slate-50/80";
  const tableLabel = activeQueue ? "Queue worklist" : tableLabelOverride || "Active orders";
  const tableSummary = activeQueue
    ? "Derived from the current active order set."
    : tableSummaryOverride || "Order records in this view.";
  const emptyStateTitle = activeQueue
    ? "No orders match this operational queue."
    : emptyTitle || "No active orders to show.";
  const emptyStateDescription = activeQueue
    ? "Clear the queue filter to return to the full active worklist."
    : emptyDescription || "The current filters do not have any active work.";
  const workflowModalIsRequestingRevisions = workflowModal?.action === "send_back_to_appraiser";
  const workflowModalIsResubmission =
    workflowModal?.action === "send_to_review" && isReviewResubmission(workflowModal?.order);
  const workflowModalTitle = workflowModalIsRequestingRevisions
    ? "Request Revisions"
    : workflowModalIsResubmission
      ? "Resubmit to Review"
      : "Send to Review";
  const workflowModalDescription = workflowModalIsRequestingRevisions
    ? "Add an optional revision note before requesting changes from the appraiser."
    : workflowModalIsResubmission
      ? "Add an optional resubmission note before sending the revised order back to review."
      : "Add an optional submission note before sending the order to review.";

  return (
    <>
      <div
        aria-label="Orders table"
        className={workspaceSurfaceClassNames(
          "table",
          `rounded-2xl border-slate-200/80 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ring-1 ring-white ${className}`,
        )}
        style={style}
      >
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              {tableEyebrow ? (
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{tableEyebrow}</div>
              ) : null}
              <div className={`${tableEyebrow ? "mt-1" : ""} flex flex-wrap items-center gap-2`}>
                <span className="text-sm font-semibold text-slate-950">{tableLabel}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {tableCount || 0} total
                </span>
                {tableLoading ? (
                  <span
                    role="status"
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500"
                  >
                    Loading
                  </span>
                ) : null}
              </div>
              {tableSummary ? <p className="mt-1 text-xs text-slate-500">{tableSummary}</p> : null}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Page {tableFilters.page + 1} of {totalPages}
            </div>
          </div>
        </div>

      {tableError && (
        <div role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-4">
          <div className="text-sm font-semibold text-rose-800">Orders could not load.</div>
          <div className="mt-1 text-sm text-rose-700">{tableError.message}</div>
        </div>
      )}

      {activeQueue && (
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filtered Worklist</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-950">{activeQueue.label}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {activeQueue.urgency || "unknown"}
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{activeQueue.description}</p>
              {activeQueue.explanation ? (
                <p className="mt-0.5 max-w-3xl text-xs leading-5 text-slate-400">{activeQueue.explanation}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
                <div className="text-xl font-semibold leading-none tracking-tight text-slate-950">{activeQueue.count ?? tableCount ?? 0}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  active match{(activeQueue.count ?? tableCount ?? 0) === 1 ? "" : "es"}
                </div>
              </div>
              {activeQueueAction ? (
                <button
                  type="button"
                  onClick={activeQueueAction.onClick}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  {activeQueueAction.label || "View in Orders"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <div className="overflow-hidden">
        <div
          className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/95 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur"
          style={{ display: "grid", gridTemplateColumns: template, columnGap: ".25rem", minWidth: tableMinWidth, width: tableWidth }}
        >
          {columns.map((c, idx) => (
            <div key={c.key} className={`px-2 py-1 ${idx === 0 ? stickyHeader : ""} ${c.align === "center" ? "text-center" : ""}`}>
              <div className="truncate">{c.header()}</div>
            </div>
          ))}
        </div>

        {/* rows */}
        <div className="bg-white" style={{ minWidth: tableMinWidth, width: tableWidth }}>
          {tableLoading ? (
            [...Array(tableFilters.pageSize || pageSize)].map((_, i) => (
              <div key={i} className="border-b border-slate-100/80 px-4 py-3 sm:px-5">
                <div className="flex animate-pulse items-center gap-3">
                  <div className="h-8 w-28 rounded-lg bg-slate-100" />
                  <div className="h-8 min-w-0 flex-1 rounded-lg bg-slate-100" />
                  <div className="hidden h-8 w-32 rounded-lg bg-slate-100 sm:block" />
                </div>
              </div>
            ))
          ) : !displayData?.length ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                0
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-800">
                {emptyStateTitle}
              </div>
              <div className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {emptyStateDescription}
              </div>
            </div>
          ) : (
            displayData.map((o, idx) => {
              const rowKey = o.order_id || o.id || o.order_number || `row-${tableFilters?.page ?? 0}-${idx}`;
              const orderPk = orderPkOf(o);

              const drawerNode = (
                <div data-no-drawer>
                  <OrderDrawerContent orderId={orderPk} order={o} onRefresh={refresh} />
                </div>
              );

              return (
                <OrdersTableRow
                  key={rowKey}
                  order={o}
                  isOpen={expandedId === rowKey}
                  onToggle={() => setExpandedId((x) => (x === rowKey ? null : rowKey))}
                  className="py-3.5"
                  renderCells={() => (
                    <div
                      className="items-start text-sm leading-5 text-slate-800"
                      style={{ display: "grid", gridTemplateColumns: template, columnGap: isDashboardWorklist ? ".5rem" : ".25rem" }}
                    >
                      {columns.map((c, cIdx) => {
                        // Status column special rendering
                        if (c.key === "status") {
                          const rawStatus = normalizeOrderStatus(o.status_normalized || o.status);
                          const dueDates = [
                            o.review_due_at ? `Review: ${fmtDate(o.review_due_at)}` : "",
                            o.final_due_at ? `Final: ${fmtDate(o.final_due_at)}` : "",
                          ].filter(Boolean);
                          return (
                            <div key={c.key} className="flex flex-col gap-1">
                              <OrderStatusBadge status={rawStatus} />
                              {dueDates.length > 0 && (
                                <div className="text-[11px] leading-4 text-slate-500">
                                  {dueDates.join(" · ")}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Default cell
                        return (
                          <div key={c.key} className={`${cIdx === 0 ? stickyCell : ""} ${c.align === "center" ? "text-center" : ""}`}>
                            {c.cell(o)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  drawer={drawerNode}
                />
              );
            })
          )}
        </div>
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
        <div className="font-medium">
          Page {tableFilters.page + 1} / {totalPages} — {tableCount || 0} total
        </div>
        <OrdersTablePagination currentPage={tableFilters.page + 1} totalPages={totalPages} goToPage={(p) => go(p - 1)} />
      </div>
      </div>

      <WorkflowNoteModal
        open={Boolean(workflowModal)}
        busy={workflowBusy}
        title={workflowModalTitle}
        description={workflowModalDescription}
        confirmLabel={workflowModalTitle}
        onCancel={closeWorkflowModal}
        onConfirm={confirmWorkflowModal}
      />
    </>
  );
}
