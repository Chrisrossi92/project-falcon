import React, { useMemo, useState } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import KpiLink from "@/components/dashboard/KpiLink";
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import useCalendarEvents from "@/lib/hooks/useCalendarEvents";
import useCurrentUserIds from "@/components/calendar/useCurrentUserIds";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";

import { useOrders } from "@/lib/hooks/useOrders";
import { isInReview, isReadyToSend } from "@/lib/constants/orderStatus";

const HEADER_OFFSET = 260;

export default function ReviewerDashboard() {
  const { data = [] } = useOrders({});
  const [events, setEvents] = useState([]);
  const getEvents = useCalendarEvents();        // wide view: all events in range
  const { displayName } = useCurrentUserIds();  // used for "Mine" chip (client-side)

  const kpis = useMemo(() => {
    const mine = data.length;
    const inReview = data.filter(o => isInReview(o.status)).length;
    const ready = data.filter(o => isReadyToSend(o.status)).length;
    return [
      <KpiLink key="mine"  label="My Orders"    value={mine}  />,
      <KpiLink key="rev"   label="In Review"    value={inReview} />,
      <KpiLink key="ready" label="Ready to Send" value={ready} />,
    ];
  }, [data]);

  const equalHeightStyle = { height: `calc(100vh - ${HEADER_OFFSET}px)` };

  return (
    <DashboardTemplate title="Reviewer Dashboard" subtitle="Your current queue & statuses" kpis={kpis}>
      <DashboardSplit
        modes={{
          calendar: {
            label: "calendar",
            render: () => (
              <TwoWeekCalendar
                className="h-full"
                getEvents={getEvents}
                onEventsChange={setEvents}
                onEventClick={(ev) => { if (ev.orderId) window.open(`/orders/${ev.orderId}`, "_self"); }}
                meName={displayName}
                showFilters
                showWeekdayHeader
              />
            ),
          },
          upcoming: { label: "upcoming", render: () => <UpcomingEventsList events={events} /> },
        }}
        initial="calendar"
        leftStyle={equalHeightStyle}
        rightStyle={equalHeightStyle}
        right={() => <UnifiedOrdersTable role="reviewer" pageSize={8} className="h-full" />}
      />
    </DashboardTemplate>
  );
}














