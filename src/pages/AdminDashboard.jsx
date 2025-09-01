// src/pages/AdminDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import LoadingBlock from "@/components/ui/LoadingBlock";
import ErrorCallout from "@/components/ui/ErrorCallout";
import KpiLink from "@/components/dashboard/KpiLink";

// New cards we added
import DashboardCalendarCard from "@/components/dashboard/DashboardCalendarCard";
import DashboardOrdersCard from "@/components/dashboard/DashboardOrdersCard";

// Reuse your hook for KPI counts
import { useOrders } from "@/lib/hooks/useOrders";

// Height reserved for top nav + KPI band (tweak if needed)
const HEADER_OFFSET = 260;

export default function AdminDashboard() {
  const { data = [], loading, error } = useOrders();

  // KPIs: same logic you had, computed from the hook
  const kpis = useMemo(() => {
    const total = data.length;
    const inReview = data.filter(
      (o) => String(o.status || "").toLowerCase() === "in_review"
    ).length;
    const ready = data.filter(
      (o) => String(o.status || "").toLowerCase() === "ready_to_send"
    ).length;

    return [
      <KpiLink key="total" label="Total Orders" value={total} filter={{}} />,
      <KpiLink
        key="inReview"
        label="In Review"
        value={inReview}
        filter={{ status: "in_review" }}
      />,
      <KpiLink
        key="ready"
        label="Ready to Send"
        value={ready}
        filter={{ status: "ready_to_send" }}
      />,
    ];
  }, [data]);

  // Make both cards the same height and fill the rest of the viewport
  const equalHeightStyle = { height: `calc(100vh - ${HEADER_OFFSET}px)` };

  return (
    <DashboardTemplate
      title="Admin Dashboard"
      subtitle="Overview of orders & events"
      kpis={kpis}
    >
      {error && (
        <ErrorCallout>Failed to load orders: {error.message}</ErrorCallout>
      )}

      {loading ? (
        <LoadingBlock label="Loading dashboard…" />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Calendar */}
          <div className="col-span-12 lg:col-span-6">
            <DashboardCalendarCard style={equalHeightStyle} />
          </div>

          {/* Right: Orders (active only + pagination lives inside the card) */}
          <div className="col-span-12 lg:col-span-6">
            <DashboardOrdersCard style={equalHeightStyle} />
          </div>
        </div>
      )}
    </DashboardTemplate>
  );
}










































