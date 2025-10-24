// src/pages/admin/AdminDashboard.jsx
import React, { useMemo } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import KpiLink from "@/components/dashboard/KpiLink";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";

const withinNext7Days = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d)) return false;
  const now = new Date();
  const days = (d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000;
  return days >= 0 && days <= 7;
};

export default function AdminDashboard() {
  // Lightweight KPI source: active-only, larger pageSize to cover most rows
  const { data = [] } = useOrders({
    activeOnly: true,
    page: 0,
    pageSize: 500,
    orderBy: "date_ordered",
    ascending: false,
  });

  const kpis = useMemo(() => {
    const nowActive = data; // already active-only
    const inProgress = nowActive.filter(
      (o) => String(o.status || "").toUpperCase() === "IN_PROGRESS"
    ).length;

    const dueSoon = nowActive.filter((o) =>
      withinNext7Days(o.final_due_at || o.due_date || o.review_due_at)
    ).length;

    return [
      <KpiLink key="mine" label="Active Orders" value={nowActive.length} />,
      <KpiLink key="prog" label="In Progress" value={inProgress} />,
      <KpiLink key="due7" label="Due in 7 Days" value={dueSoon} />,
    ];
  }, [data]);

  return (
    <DashboardTemplate title="Admin Dashboard" subtitle="Calendar and queue" kpis={kpis}>
      <div className="space-y-4">
        {/* TOP: Calendar (all) */}
        <section className="rounded-xl border bg-white p-3 h-[520px]">
          <DashboardCalendarPanel />
        </section>

        {/* BOTTOM: Unified table (manager mode) */}
        <section className="rounded-xl border bg-white">
          <UnifiedOrdersTable role="admin" pageSize={15} />
        </section>
      </div>
    </DashboardTemplate>
  );
}
















































