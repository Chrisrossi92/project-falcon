// src/pages/appraisers/AppraiserDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import KpiLink from "@/components/dashboard/KpiLink";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";
import { useSession } from "@/lib/hooks/useSession";

export default function AppraiserDashboard() {
  const { user } = useSession();
  const me = user?.id || user?.user_id || user?.uid || null;

  // Pull "my" orders for KPIs (hook should already memoize/cache)
  const { data = [] } = useOrders({ appraiserId: me });

  const kpis = useMemo(() => {
    const now = new Date();
    const active = data.filter((o) => {
      const s = String(o.status || "").toUpperCase();
      return s !== "COMPLETE" && s !== "CANCELLED";
    });

    const due7 = active.filter((o) => {
      const d = o.due_date || o.final_due_at || o.review_due_at;
      if (!d) return false;
      const days = (new Date(d) - now) / 86400000;
      return days >= 0 && days <= 7;
    }).length;

    const inProg = active.filter(
      (o) => String(o.status || "").toUpperCase() === "IN_PROGRESS"
    ).length;

    const overdue = active.filter((o) => {
      const d = o.final_due_at || o.due_date || o.review_due_at;
      return d && new Date(d) < now;
    }).length;

    return [
      <KpiLink key="mine" label="My Orders" value={active.length} />,
      <KpiLink key="due7" label="Due in 7 Days" value={due7} />,
      <KpiLink key="prog" label="In Progress" value={inProg} />,
      <KpiLink key="od" label="Overdue" value={overdue} tone="rose" />,
    ];
  }, [data]);

  return (
    <DashboardTemplate
      title="My Dashboard"
      subtitle="Calendar and queue"
      kpis={kpis}
    >
      <div className="space-y-4">
        {/* TOP: Calendar (same look/feel as admin; mine only) */}
        <section className="rounded-xl border bg-white p-3 h-[520px]">
          <DashboardCalendarPanel
            mineOnly
            userId={me}
            onOpenOrder={(orderId) => orderId && (window.location.href = `/orders/${orderId}`)}
          />
        </section>

        {/* BOTTOM: Orders (mine only, active only) */}
        <section className="rounded-xl border bg-white">
          <UnifiedOrdersTable
            role="appraiser"
            className="w-full"
            pageSize={15}
            hideActions
            initialFilters={{
              appraiserId: me,
              activeOnly: true,
              orderBy: "date_ordered",
              ascending: false,
            }}
          />
        </section>
      </div>
    </DashboardTemplate>
  );
}

































