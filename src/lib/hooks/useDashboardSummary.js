// src/lib/hooks/useDashboardSummary.js
import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { useOrdersSummary } from "./useOrders";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import useDashboardKpis from "./useDashboardKpis";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";

function deriveLensRole(context) {
  const primaryRole = String(context?.primary_role_key || "").toLowerCase();
  const firstRole = String(context?.role_keys?.[0] || "").toLowerCase();

  if (context?.is_owner) return "owner";
  if (context?.is_admin_role) return "admin";
  if (context?.is_reviewer_role) return "reviewer";
  if (context?.is_appraiser_role) return "appraiser";
  return primaryRole || firstRole || "appraiser";
}

/**
 * Centralized dashboard data:
 * - current user + capabilities
 * - high-level order stats (count, in-progress, due-in-7) from the view
 * - review stats (stubbed for now)
 */
export function useDashboardSummary({ refreshKey = 0 } = {}) {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    context: appContext,
    loading: appContextLoading,
    error: appContextError,
  } = useCurrentUserAppContext();
  const publicUserId = appContext?.user_id || null;
  const role = deriveLensRole(appContext);
  const isOwner = Boolean(appContext?.is_owner);
  const isAdmin = Boolean(appContext?.is_owner || appContext?.is_admin_role);
  const isReviewer = !isAdmin && Boolean(appContext?.is_reviewer_role);
  const isAppraiser = !isAdmin && !isReviewer && Boolean(appContext?.is_appraiser_role);
  const caps = {
    role,
    isOwner,
    isAdmin,
    isReviewer,
    isAppraiser,
  };

  // Build role-aware filters for both summary and table
  const tableFilters = useMemo(() => {
    const f = { activeOnly: false };

    if (isAppraiser && publicUserId) {
      f.appraiserId = publicUserId;
      f.assignedAppraiserId = publicUserId;
      f.statusIn = [ORDER_STATUS.NEW, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.NEEDS_REVISIONS];
    } else if (isReviewer && publicUserId) {
      f.reviewerId = publicUserId;
      f.statusIn = [ORDER_STATUS.IN_REVIEW];
    }

    if (role === "client") {
      if (user?.client_id) f.clientId = user.client_id;
      else if (user?.managing_amc_id) f.clientId = user.managing_amc_id;
    }

    return f;
  }, [role, isAppraiser, isReviewer, publicUserId, user?.client_id, user?.managing_amc_id]);

  const hasIdForRole =
    (!isAppraiser || Boolean(tableFilters.appraiserId || tableFilters.assignedAppraiserId)) &&
    (!isReviewer || Boolean(tableFilters.reviewerId));
  const summary = useOrdersSummary(tableFilters, { enabled: hasIdForRole && !userLoading && !appContextLoading, scope: "dashboard", refreshKey });
  const kpis = useDashboardKpis(
    {
      reviewerId: isReviewer ? publicUserId || null : null,
      assignedAppraiserId: isAppraiser ? tableFilters.assignedAppraiserId || tableFilters.appraiserId || null : null,
      appraiserId: isAppraiser ? tableFilters.appraiserId || null : null,
      clientId: role === "client" ? (user?.client_id || user?.managing_amc_id || null) : null,
      managingAmcId: role === "client" ? user?.managing_amc_id || null : null,
      statusIn: tableFilters.statusIn || [],
    },
    { enabled: hasIdForRole && !userLoading && !appContextLoading }
  );

  if (import.meta?.env?.DEV) {
    console.debug("[useDashboardSummary]", {
      publicUserId,
      role,
      appliedFilterIds: {
        appraiserId: tableFilters.appraiserId,
        reviewerId: tableFilters.reviewerId,
      },
    });
  }

  return {
    user,
    userId: publicUserId,
    appContext,
    appContextError,
    ...caps,
    loading: userLoading || appContextLoading || summary.loading || kpis.loading,
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
    tableFilters,
    reviews: {
      count: 0, // placeholder for future reviewer stats
    },
  };
}
