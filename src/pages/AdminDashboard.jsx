// src/pages/AdminDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import KpiLink from "@/components/dashboard/KpiLink";
import DashboardCalendarCard from "@/components/dashboard/DashboardCalendarCard";
import { useOrders } from "@/lib/hooks/useOrders";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";


const HEADER_OFFSET = 260;

export default function AdminDashboard() {
  const { data = [], loading, error } = useOrders();

  // KPIs computed from hook data
  const kpis = useMemo(() => {
    const total = data.length;
    const inReview = data.filter((o) => String(o.status || "").toLowerCase() === "in_review").length;
    const ready = data.filter((o) => String(o.status || "").toLowerCase() === "ready_to_send").length;

    return [
      <KpiLink key="total" label="Total Orders" value={total} filter={{}} />,
      <KpiLink key="inReview" label="In Review" value={inReview} filter={{ status: "in_review" }} />,
      <KpiLink key="ready" label="Ready to Send" value={ready} filter={{ status: "ready_to_send" }} />,
    ];
  }, [data]);

  const equalHeightStyle = { height: `calc(100vh - ${HEADER_OFFSET}px)` };

  return (
    <DashboardTemplate title="Admin Dashboard" subtitle="Overview of orders & events" kpis={kpis}>
      {error && <ErrorCallout>Failed to load orders: {error.message}</ErrorCallout>}

      {loading ? (
        <LoadingBlock label="Loading dashboard…" />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Calendar (grid-style or list-style depending on your DashboardCalendarCard) */}
          <div className="col-span-12 lg:col-span-6">
            <DashboardCalendarCard style={equalHeightStyle} />
          </div>

          {/* Right: Orders table card */}
          <div className="col-span-12 lg:col-span-6">
            <UnifiedOrdersTable role="admin" />
          </div>
        </div>
      )}
    </DashboardTemplate>
  );
}











































