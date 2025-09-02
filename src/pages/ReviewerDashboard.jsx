// src/pages/ReviewerDashboard.jsx
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
import { isInReview, isReadyToSend } from "@/lib/constants/orderStatus";

export default function ReviewerDashboard() {
  const { data = [], loading, error } = useOrders();

  const kpis = useMemo(() => {
    const mine = data.length; // reviewers see all (RLS allows all for reviewer/admin)
    const inReview = data.filter(o => isInReview(o.status)).length;
    const ready = data.filter(o => isReadyToSend(o.status)).length;
    return [
      <KpiLink key="mine" label="My Orders" value={mine} filter={{}} />,
      <KpiLink key="inreview" label="In Review" value={inReview} filter={{ status: "in_review" }} />,
      <KpiLink key="ready" label="Ready to Send" value={ready} filter={{ status: "ready_to_send" }} />,
    ];
  }, [data]);

  return (
    <DashboardTemplate title="Reviewer Dashboard" subtitle="Your current queue & statuses" kpis={kpis}>
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











