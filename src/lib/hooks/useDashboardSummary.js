// src/lib/hooks/useDashboardSummary.js
import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { getCapabilities } from "../utils/roles";
import { useOrdersSummary } from "./useOrders";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import useDashboardKpis from "./useDashboardKpis";
import { useRole } from "@/lib/hooks/useRole";

/**
 * Centralized dashboard data:
 * - current user + capabilities
 * - high-level order stats (count, in-progress, due-in-7) from the view
 * - review stats (stubbed for now)
 */
export function useDashboardSummary() {
  const { user, loading: userLoading } = useCurrentUser();
  const roleInfo = useRole() || {};
  const { userId: publicUserId, authUserId, role, isAdmin, isReviewer, appraiserView, loading: roleLoading } = roleInfo;
  const caps = getCapabilities({ ...user, role });
  const isAppraiser = appraiserView;

  // Build role-aware filters for both summary and table
  const tableFilters = useMemo(() => {
    const f = { activeOnly: false };

    if (isAppraiser && publicUserId) {
      f.appraiserId = publicUserId;
      f.assignedAppraiserId = publicUserId;
    } else if (isReviewer && publicUserId) {
      f.reviewerId = publicUserId;
      f.statusIn = [ORDER_STATUS.IN_REVIEW, ORDER_STATUS.NEEDS_REVISIONS];
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
  const summary = useOrdersSummary(tableFilters, { enabled: hasIdForRole && !userLoading && !roleLoading, scope: "dashboard" });
  const kpis = useDashboardKpis(
    {
      reviewerId: isReviewer ? publicUserId || null : null,
      assignedAppraiserId: isAppraiser ? tableFilters.assignedAppraiserId || tableFilters.appraiserId || null : null,
      appraiserId: isAppraiser ? tableFilters.appraiserId || null : null,
      clientId: role === "client" ? (user?.client_id || user?.managing_amc_id || null) : null,
      managingAmcId: role === "client" ? user?.managing_amc_id || null : null,
    },
    { enabled: hasIdForRole && !userLoading && !roleLoading }
  );

  if (import.meta?.env?.DEV) {
    console.debug("[useDashboardSummary]", {
      authUserId,
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
    ...caps,
    loading: userLoading || summary.loading || kpis.loading,
    orders: {
      count: kpis.total_active ?? summary.count,
      inProgress: kpis.in_progress ?? summary.inProgress,
      dueIn7: kpis.due_in_7 ?? summary.dueIn7,
    },
    ordersRows: summary.rows,
    tableFilters,
    reviews: {
      count: 0, // placeholder for future reviewer stats
    },
  };
}
