// src/pages/ReviewerDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import AdminCalendar from "@/components/admin/AdminCalendar";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import UpcomingList from "@/components/dashboard/UpcomingList";
import KpiLink from "@/components/dashboard/KpiLink";
import { isInReview, isReadyToSend } from "@/lib/constants/orderStatus";
import { useOrders } from "@/lib/hooks/useOrders";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";

const HEADER_OFFSET = 260; // adjusts for your header+KPI height

export default function ReviewerDashboard() {
  const { data = [], loading, error } = useOrders({});

  const kpis = useMemo(() => {
    const mine = data.length;
    const inReview = data.filter(o => isInReview(o.status)).length;
    const ready = data.filter(o => isReadyToSend(o.status)).length;
    return [
      <KpiLink key="mine" label="My Orders" value={mine} />,
      <KpiLink key="inreview" label="In Review" value={inReview} />,
      <KpiLink key="ready" label="Ready to Send" value={ready} />,
    ];
  }, [data]);

  const equalHeightStyle = { height: `calc(100vh - ${HEADER_OFFSET}px)` };

  return (
    <DashboardTemplate title="Reviewer Dashboard" subtitle="Your current queue & statuses" kpis={kpis}>
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
          // Left and Right get the same fixed height
          leftStyle={equalHeightStyle}
          rightStyle={equalHeightStyle}
          right={() => (
            <UnifiedOrdersTable
              role="reviewer"
              pageSize={8}
              className="h-full"
            />
          )}
        />
      )}
    </DashboardTemplate>
  );
}













