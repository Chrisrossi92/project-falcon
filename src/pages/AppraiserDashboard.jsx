// src/pages/AppraiserDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import AdminCalendar from "@/components/admin/AdminCalendar";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import UpcomingList from "@/components/dashboard/UpcomingList";
import KpiLink from "@/components/dashboard/KpiLink";
import { ORDER_STATUS, normalizeStatus } from "@/lib/constants/orderStatus";
import { useOrders } from "@/lib/hooks/useOrders";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";

const HEADER_OFFSET = 260;

export default function AppraiserDashboard() {
  // RLS scopes to the appraiser automatically
  const { data = [], loading, error } = useOrders({});

  const kpis = useMemo(() => {
    const mine = data.length;
    const due7 = data.filter(o => {
      const d = o.due_date; if (!d) return false;
      const dt = new Date(d), now = new Date();
      const diff = (dt - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    const inProgress = data.filter(o => normalizeStatus(o.status) === ORDER_STATUS.IN_PROGRESS).length;
    return [
      <KpiLink key="mine" label="My Orders" value={mine} />,
      <KpiLink key="due7" label="Due in 7 Days" value={due7} />,
      <KpiLink key="prog" label="In Progress" value={inProgress} />,
    ];
  }, [data]);

  const equalHeightStyle = { height: `calc(100vh - ${HEADER_OFFSET}px)` };

  return (
    <DashboardTemplate title="My Dashboard" subtitle="At-a-glance queue & deadlines" kpis={kpis}>
      {error && <ErrorCallout>Failed to load orders: {error.message}</ErrorCallout>}
      {loading ? (
        <LoadingBlock />
      ) : (
        <DashboardSplit
          modes={{
            calendar: { label: "calendar", render: () => <div className="h-full"><AdminCalendar /></div> },
            list:     { label: "upcoming", render: () => <UpcomingList orders={data} /> },
          }}
          initial="calendar"
          leftStyle={equalHeightStyle}
          rightStyle={equalHeightStyle}
          right={() => (
            <UnifiedOrdersTable
              role="appraiser"
              pageSize={8}
              className="h-full"
            />
          )}
        />
      )}
    </DashboardTemplate>
  );
}

























