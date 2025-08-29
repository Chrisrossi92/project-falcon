// src/pages/AppraiserDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import AdminCalendar from "@/components/admin/AdminCalendar";
import OrdersTable from "@/features/orders/OrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import UpcomingList from "@/components/dashboard/UpcomingList";
import KpiLink from "@/components/dashboard/KpiLink";

export default function AppraiserDashboard() {
  const { data = [], loading, error } = useOrders();

  const kpis = useMemo(() => {
    const mine = data.length;
    const due7 = data.filter(o => {
      const d = o.final_due_date || o.due_date;
      if (!d) return false;
      const dt = new Date(d), now = new Date();
      const diff = (dt - now) / (1000*60*60*24);
      return diff >= 0 && diff <= 7;
    }).length;
    const inProgress = data.filter(o => String(o.status || "").toLowerCase() === "in_progress").length;
    return [
      <KpiLink key="mine" label="My Orders" value={mine} filter={{}} />,
      <KpiLink key="due7" label="Due in 7 Days" value={due7} filter={{}} />,
      <KpiLink key="prog" label="In Progress" value={inProgress} filter={{ status: "in_progress" }} />,
    ];
  }, [data]);

  return (
    <DashboardTemplate title="My Dashboard" subtitle="At-a-glance queue & deadlines" kpis={kpis}>
      {error && <ErrorCallout>Failed to load orders: {error.message}</ErrorCallout>}
      {loading ? (
        <LoadingBlock />
      ) : (
        <DashboardSplit
          modes={{
            calendar: { label: "calendar", render: () => <AdminCalendar /> },
            list: { label: "upcoming", render: () => <UpcomingList orders={data} /> },
          }}
          initial="calendar"
          right={() => <OrdersTable />}
        />
      )}
    </DashboardTemplate>
  );
}





















