// src/pages/AdminDashboard.jsx (only calendar part shown)
import React, { useMemo, useState } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import KpiLink from "@/components/dashboard/KpiLink";
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import useCalendarEvents from "@/components/calendar/useCalendarEvents";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import { useOrders } from "@/lib/hooks/useOrders";
import { useUsers } from "@/lib/hooks/useUsers";
import { isInReview, isReadyToSend } from "@/lib/constants/orderStatus";
import CalendarLegend from "@/components/calendar/CalendarLegend";

const HEADER_OFFSET = 260;

export default function AdminDashboard() {
  const { data = [] } = useOrders({});
  const { data: allUsers = [] } = useUsers();
  const [events, setEvents] = useState([]);
  const getEvents = useCalendarEvents();

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
                <CalendarLegend />
                <TwoWeekCalendar
                  className="h-full"
                  getEvents={getEvents}
                  onEventsChange={setEvents}
                  onEventClick={(ev) => { if (ev.orderId) window.open(`/orders/${ev.orderId}`, "_self"); }}
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














































