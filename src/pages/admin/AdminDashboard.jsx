// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import KpiLink from "@/components/dashboard/KpiLink";
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";
import { useUsers } from "@/lib/hooks/useUsers";
import { isInReview, isReadyToSend } from "@/lib/constants/orderStatus";
import { listCalendarEvents } from "@/lib/services/calendarService";

const HEADER_OFFSET = 260;

export default function AdminDashboard() {
  const { data = [] } = useOrders({});
  const { data: allUsers = [] } = useUsers();

  // upcoming list on second tab
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Fetch upcoming 14 days for everyone (admin scope)
    const from = new Date();
    const to = new Date(); to.setDate(to.getDate() + 14);
    listCalendarEvents({ from: from.toISOString(), to: to.toISOString(), mineOnly: false, userId: null })
      .then((rows) => setEvents(rows || []))
      .catch(() => setEvents([]));
  }, []);

  const kpis = useMemo(() => {
    const total = data.length;
    const inReview = data.filter((o) => isInReview(o.status)).length;
    const ready = data.filter((o) => isReadyToSend(o.status)).length;
    return [
      <KpiLink key="total" label="Total Orders" value={total} />,
      <KpiLink key="review" label="In Review" value={inReview} />,
      <KpiLink key="ready" label="Ready to Send" value={ready} />,
    ];
  }, [data]);

  const equalHeightStyle = { height: `calc(100vh - ${HEADER_OFFSET}px)` };

  return (
    <DashboardTemplate title="Admin Dashboard" subtitle="Overview of orders & events" kpis={kpis}>
      <DashboardSplit
        modes={{
          calendar: {
            label: "calendar",
            render: () => (
              <div className="h-full flex flex-col gap-2">
                <DashboardCalendarPanel
                  onOpenOrder={(orderId) => {
                    if (orderId) window.open(`/orders/${orderId}`, "_self");
                  }}
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
          <UnifiedOrdersTable role="admin" usersList={allUsers} pageSize={8} className="h-full" />
        )}
      />
    </DashboardTemplate>
  );
}















































