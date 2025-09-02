// src/pages/AppraiserDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import AdminCalendar from "@/components/admin/AdminCalendar"; // same calendar; RLS + view filters server-side
import OrdersTableDashboard from "@/features/orders/OrdersTableDashboard";
import { useOrders } from "@/lib/hooks/useOrders";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import UpcomingList from "@/components/dashboard/UpcomingList";
import KpiLink from "@/components/dashboard/KpiLink";
import { ORDER_STATUS, normalizeStatus } from "@/lib/constants/orderStatus";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";

function getUserId(user) {
  return user?.id || user?.user_id || user?.auth_id || user?.uid || null;
}

export default function AppraiserDashboard() {
  const { user } = useSession();
  const { isAdmin, isReviewer } = useRole() || {};
  const me = getUserId(user);

  // Force appraiser scope (admins/reviewers still see all)
  const initialFilters = (!isAdmin && !isReviewer && me)
    ? { appraiserId: me }
    : {};

  // Pull the set we need for both panels (right list & upcoming)
  const { data = [], loading, error } = useOrders(initialFilters);

  const kpis = useMemo(() => {
    const mine = data.length;
    const due7 = data.filter(o => {
      const d = o.due_date;
      if (!d) return false;
      const dt = new Date(d), now = new Date();
      const diff = (dt - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    const inProgress = data.filter(o => normalizeStatus(o.status) === ORDER_STATUS.IN_PROGRESS).length;
    return [
      <KpiLink key="mine" label="My Orders" value={mine} filter={{ ...(initialFilters || {}) }} />,
      <KpiLink key="due7" label="Due in 7 Days" value={due7} filter={{ ...(initialFilters || {}) }} />,
      <KpiLink
        key="prog"
        label="In Progress"
        value={inProgress}
        filter={{ ...(initialFilters || {}), status: "in_progress" }}
      />,
    ];
  }, [data, initialFilters]);

  return (
    <DashboardTemplate title="My Dashboard" subtitle="At-a-glance queue & deadlines" kpis={kpis}>
      {error && <ErrorCallout>Failed to load orders: {error.message}</ErrorCallout>}
      {loading ? (
        <LoadingBlock />
      ) : (
        <DashboardSplit
          modes={{
            // Calendar is fed by v_admin_calendar; RLS should scope server-side.
            calendar: { label: "calendar", render: () => <AdminCalendar /> },
            list: { label: "upcoming", render: () => <UpcomingList orders={data} /> },
          }}
          initial="calendar"
          // Right side: use the compact dashboard table with our already-filtered rows
          right={() => <OrdersTableDashboard rows={data} />}
        />
      )}
    </DashboardTemplate>
  );
}























