// src/lib/hooks/useDashboardSummary.js
import { useMemo } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { getCapabilities } from "../utils/roles";
import { useOrdersSummary } from "./useOrders";

/**
 * Centralized dashboard data:
 * - current user + capabilities
 * - high-level order stats (count, in-progress, due-in-7) from the view
 * - review stats (stubbed for now)
 */
export function useDashboardSummary() {
  const { user, loading: userLoading } = useCurrentUser();
  const caps = getCapabilities(user);
  const { role, isAdmin, isReviewer, isAppraiser } = caps;

  // Build role-aware filters for both summary and table
  const tableFilters = useMemo(() => {
    const f = { activeOnly: false };

    if (isAppraiser) {
      const appraiserId = user?.id || user?.auth_id || null;
      if (appraiserId) {
        f.appraiserId = appraiserId;
        f.assignedAppraiserId = appraiserId;
      }
    }

    if (role === "client") {
      if (user?.client_id) f.clientId = user.client_id;
      else if (user?.managing_amc_id) f.clientId = user.managing_amc_id;
    }

    return f;
  }, [role, isAppraiser, user?.id, user?.auth_id, user?.client_id, user?.managing_amc_id]);

  const hasIdForRole = !isAppraiser || Boolean(tableFilters.appraiserId || tableFilters.assignedAppraiserId);
  const summary = useOrdersSummary(tableFilters, { enabled: hasIdForRole && !userLoading });

  return {
    user,
    ...caps,
    loading: userLoading || summary.loading,
    orders: {
      count: summary.count,
      inProgress: summary.inProgress,
      dueIn7: summary.dueIn7,
    },
    ordersRows: summary.rows,
    tableFilters,
    reviews: {
      count: 0, // placeholder for future reviewer stats
    },
  };
}
