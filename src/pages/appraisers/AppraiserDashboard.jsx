// src/pages/appraisers/AppraiserDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import KpiLink from "@/components/dashboard/KpiLink";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";
import useSession from "@/lib/hooks/useSession";

const withinNext7Days = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d)) return false;
  const now = new Date();
  const days = (d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000;
  return days >= 0 && days <= 7;
};

export default function AppraiserDashboard() {
  const { userId } = useSession();

  // KPI source: my active orders
  const { data = [] } = useOrders({
    appraiserId: userId || null,
    activeOnly: true,
    page: 0,
    pageSize: 500,
    orderBy: "date_ordered",
    ascending: false,
  });

  const kpis = useMemo(() => {
    const myActive = data; // already scoped + active-only
    const inProgress = myActive.filter(
      (o) => String(o.status || "").toUpperCase() === "IN_PROGRESS"
    ).length;

    const dueSoon = myActive.filter((o) =>
      withinNext7Days(o.final_due_at || o.due_date || o.review_due_at)
    ).length;

    return [
      <KpiLink key="mine" label="My Orders" value={myActive.length} />,
      <KpiLink key="prog" label="In Progress" value={inProgress} />,
      <KpiLink key="due7" label="Due in 7 Days" value={dueSoon} />,
    ];
  }, [data]);

  return (
    <DashboardTemplate title="My Dashboard" subtitle="Calendar and queue" kpis={kpis}>
      <div className="space-y-4">
        {/* TOP: Calendar (mine only) */}
        <section className="rounded-xl border bg-white p-3 h-[520px]">
          <DashboardCalendarPanel mineOnly userId={userId || null} />
        </section>

        {/* BOTTOM: Unified table (appraiser mode) */}
        <section className="rounded-xl border bg-white">
          <UnifiedOrdersTable role="appraiser" pageSize={15} />
        </section>
      </div>
    </DashboardTemplate>
  );
}































