// src/pages/appraisers/AppraiserDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import KpiLink from "@/components/dashboard/KpiLink";
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";
import { listCalendarEvents } from "@/lib/services/calendarService";
import { useSession } from "@/lib/hooks/useSession";

const HEADER_OFFSET = 260;

export default function AppraiserDashboard() {
  const { data = [] } = useOrders({});
  const { user } = useSession();

  // upcoming list (mine only)
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const from = new Date();
    const to = new Date(); to.setDate(to.getDate() + 14);
    const userId = user?.id || user?.user_id || user?.uid || null;
    listCalendarEvents({ from: from.toISOString(), to: to.toISOString(), mineOnly: true, userId })
      .then((rows) => setEvents(rows || []))
      .catch(() => setEvents([]));
  }, [user?.id]);

  const kpis = useMemo(() => {
    const mine = data.length;
    const due7 = data.filter((o) => {
      const d = o.due_date; if (!d) return false;
      const dt = new Date(d), now = new Date();
      const diff = (dt - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;
    const inProg = data.filter((o) => String(o.status || "").toLowerCase() === "in_progress").length;
    return [
      <KpiLink key="mine" label="My Orders" value={mine} />,
      <KpiLink key="due7" label="Due in 7 Days" value={due7} />,
      <KpiLink key="prog" label="In Progress" value={inProg} />,
    ];
  }, [data]);

  const equalHeightStyle = { height: `calc(100vh - ${HEADER_OFFSET}px)` };

  return (
    <DashboardTemplate title="My Dashboard" subtitle="At-a-glance queue & deadlines" kpis={kpis}>
      <DashboardSplit
        modes={{
          calendar: {
            label: "calendar",
            render: () => (
              <div className="h-full flex flex-col gap-2">
                <DashboardCalendarPanel
                  onOpenOrder={(orderId) => { if (orderId) window.open(`/orders/${orderId}`, "_self"); }}
                />
              </div>
            ),
          },
          upcoming: {
            label: "upcoming",
            render: () => <UpcomingEventsList events={events} />,
          },
        }}
        initial="calendar"
        leftStyle={equalHeightStyle}
        rightStyle={equalHeightStyle}
        right={() => (
          <UnifiedOrdersTable
            role="appraiser"
            pageSize={8}
            className="h-full"
            initialFilters={{ appraiserId: user?.id || null }}
          />
        )}
      />
    </DashboardTemplate>
  );
}






























