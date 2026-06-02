// src/lib/hooks/useDashboardSummary.js
import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { useOrdersSummary } from "./useOrders";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import useDashboardKpis from "./useDashboardKpis";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";
import { getOperationsScopeForMode } from "@/lib/operations/operationsMode";

export const REVIEWER_DASHBOARD_STATUSES = Object.freeze([
  ORDER_STATUS.IN_REVIEW,
  ORDER_STATUS.NEEDS_REVISIONS,
  ORDER_STATUS.REVIEW_CLEARED,
]);

export const APPRAISER_DASHBOARD_STATUSES = Object.freeze([
  ORDER_STATUS.NEW,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.NEEDS_REVISIONS,
]);

function deriveLensRole(context) {
  const primaryRole = String(context?.primary_role_key || "").toLowerCase();
  const firstRole = String(context?.role_keys?.[0] || "").toLowerCase();

  if (context?.is_owner) return "owner";
  if (context?.is_admin_role) return "admin";
  if (primaryRole) return primaryRole;
  if (firstRole) return firstRole;
  if (context?.is_reviewer_role) return "reviewer";
  if (context?.is_appraiser_role) return "appraiser";
  return "appraiser";
}

function hasPrimaryRole(context, role) {
  const primaryRole = String(context?.primary_role_key || "").toLowerCase();
  if (primaryRole) return primaryRole === role;

  const firstRole = String(context?.role_keys?.[0] || "").toLowerCase();
  if (firstRole) return firstRole === role;

  return false;
}

function roleFlagForDashboard(context, role, fallbackFlag) {
  const primaryRole = String(context?.primary_role_key || "").toLowerCase();
  const firstRole = String(context?.role_keys?.[0] || "").toLowerCase();
  if (primaryRole || firstRole) return hasPrimaryRole(context, role);

  return Boolean(fallbackFlag);
}

export function deriveDashboardRoleFlags(context) {
  const role = deriveLensRole(context);
  const isOwner = Boolean(context?.is_owner);
  const isAdmin = Boolean(context?.is_owner || context?.is_admin_role);
  const isReviewer = !isAdmin && roleFlagForDashboard(context, "reviewer", context?.is_reviewer_role);
  const isAppraiser = !isAdmin && !isReviewer && roleFlagForDashboard(context, "appraiser", context?.is_appraiser_role);

  return {
    role,
    isOwner,
    isAdmin,
    isReviewer,
    isAppraiser,
  };
}

export function deriveDashboardTableFilters({ appContext, userId, user } = {}) {
  const { role, isReviewer, isAppraiser } = deriveDashboardRoleFlags(appContext);
  const filters = {};

  if (isAppraiser && userId) {
    filters.appraiserId = userId;
    filters.assignedAppraiserId = userId;
    filters.statusIn = [...APPRAISER_DASHBOARD_STATUSES];
  } else if (isReviewer && userId) {
    filters.reviewerId = userId;
    filters.statusIn = [...REVIEWER_DASHBOARD_STATUSES];
  }

  if (role === "client") {
    if (user?.client_id) filters.clientId = user.client_id;
    else if (user?.managing_amc_id) filters.clientId = user.managing_amc_id;
  }

  return filters;
}

export function deriveReviewerHybridAppraisalFilters({ appContext, userId } = {}) {
  const { isReviewer } = deriveDashboardRoleFlags(appContext);
  const hasSecondaryAppraiserRole = Boolean(appContext?.is_appraiser_role);

  if (!isReviewer || !hasSecondaryAppraiserRole || !userId) {
    return null;
  }

  return {
    appraiserId: userId,
    assignedAppraiserId: userId,
    statusIn: [...APPRAISER_DASHBOARD_STATUSES],
  };
}

/**
 * Centralized dashboard data:
 * - current user + capabilities
 * - high-level order stats (count, in-progress, due-in-7) from the view
 * - review stats (stubbed for now)
 */
export function useDashboardSummary({ operationsMode = null, refreshKey = 0 } = {}) {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    context: appContext,
    loading: appContextLoading,
    error: appContextError,
  } = useCurrentUserAppContext();
  const publicUserId = appContext?.user_id || null;
  const { role, isOwner, isAdmin, isReviewer, isAppraiser } = deriveDashboardRoleFlags(appContext);
  const caps = {
    role,
    isOwner,
    isAdmin,
    isReviewer,
    isAppraiser,
  };
  const operationsScope = getOperationsScopeForMode(operationsMode);

  // Build role-aware filters for both summary and table
  const tableFilters = useMemo(() => {
    return deriveDashboardTableFilters({ appContext, userId: publicUserId, user });
  }, [appContext, publicUserId, user]);
  const reviewerHybridAppraisalFilters = useMemo(() => {
    return deriveReviewerHybridAppraisalFilters({ appContext, userId: publicUserId });
  }, [appContext, publicUserId]);

  const hasIdForRole =
    (!isAppraiser || Boolean(tableFilters.appraiserId || tableFilters.assignedAppraiserId)) &&
    (!isReviewer || Boolean(tableFilters.reviewerId));
  const summary = useOrdersSummary(tableFilters, {
    enabled: hasIdForRole && !userLoading && !appContextLoading,
    scope: "dashboard",
    operationsScope,
    refreshKey,
  });
  const reviewerHybridAppraisalSummary = useOrdersSummary(reviewerHybridAppraisalFilters || {}, {
    enabled: Boolean(reviewerHybridAppraisalFilters) && !userLoading && !appContextLoading,
    scope: "dashboard",
    operationsScope,
    refreshKey,
  });
  const kpis = useDashboardKpis(
    {
      reviewerId: isReviewer ? publicUserId || null : null,
      assignedAppraiserId: isAppraiser ? tableFilters.assignedAppraiserId || tableFilters.appraiserId || null : null,
      appraiserId: isAppraiser ? tableFilters.appraiserId || null : null,
      clientId: role === "client" ? (user?.client_id || user?.managing_amc_id || null) : null,
      managingAmcId: role === "client" ? user?.managing_amc_id || null : null,
      statusIn: tableFilters.statusIn || [],
      operationsScope,
    },
    { enabled: hasIdForRole && !userLoading && !appContextLoading }
  );

  return {
    user,
    userId: publicUserId,
    appContext,
    appContextError,
    operationsScope,
    ...caps,
    loading:
      userLoading ||
      appContextLoading ||
      summary.loading ||
      reviewerHybridAppraisalSummary.loading ||
      kpis.loading,
    orders: {
      count: kpis.total_active ?? summary.count,
      inProgress: kpis.in_progress ?? summary.inProgress,
      dueIn7: kpis.due_in_7 ?? summary.dueIn7,
      inReview: kpis.in_review ?? 0,
      needsRevisions: kpis.needs_revisions ?? 0,
      overdue: kpis.overdue ?? 0,
      inspectedAwaitingReport: kpis.inspected_awaiting_report ?? 0,
      dueToClient2: kpis.due_to_client_2 ?? 0,
    },
    ordersRows: summary.rows,
    reviewerHybridAppraisal: {
      count: reviewerHybridAppraisalSummary.count,
      rows: reviewerHybridAppraisalSummary.rows,
      filters: reviewerHybridAppraisalFilters,
    },
    tableFilters,
    reviews: {
      count: 0, // placeholder for future reviewer stats
    },
  };
}
