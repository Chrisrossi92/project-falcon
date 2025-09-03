import React, { useMemo, useState } from "react";
import DashboardTemplate from "@/templates/DashboardTemplate";
import DashboardSplit from "@/components/dashboard/DashboardSplit";
import KpiLink from "@/components/dashboard/KpiLink";
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import useCalendarEventsForUser from "@/components/calendar/useCalendarEventsForUser";
import useCurrentUserIds from "@/components/calendar/useCurrentUserIds";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";

import { useOrders } from "@/lib/hooks/useOrders";
import { ORDER_STATUS, normalizeStatus } from "@/lib/constants/orderStatus";

const HEADER_OFFSET = 260;

export default function AppraiserDashboard() {
  const { data = [] } = useOrders({});
  const [events, setEvents] = useState([]);
  const { usersId, displayName } = useCurrentUserIds();
  const getEventsMine = useCalendarEventsForUser(usersId); // server-filtered by users.id

  const kpis = useMemo(() => {
    const mine = data.length;
    const due7 = data.filter(o => {
      const d = o.due_date; if (!d) return false;
      const dt = new Date(d), now = new Date();
      const diff = (dt - now) / (1000*60*60*24);
      return diff >= 0 && diff <= 7;
    }).length;
    const inProg = data.filter(o => normalizeStatus(o.status) === ORDER_STATUS.IN_PROGRESS).length;
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
              <TwoWeekCalendar
                className="h-full"
                getEvents={getEventsMine}              // server-side appraiser-only events
                onEventsChange={setEvents}
                onEventClick={(ev) => { if (ev.orderId) window.open(`/orders/${ev.orderId}`, "_self"); }}
                meName={displayName}                  // optional, not required for server filter
                showFilters                            // keep Site/Review/Final chips
                showWeekdayHeader
                hideMineChip                           // hide the “Mine” chip (everything is theirs)
              />
            ),
          },
          upcoming: { label: "upcoming", render: () => <UpcomingEventsList events={events} /> },
        }}
        initial="calendar"
        leftStyle={equalHeightStyle}
        rightStyle={equalHeightStyle}
        right={() => <UnifiedOrdersTable role="appraiser" pageSize={8} className="h-full" />}
      />
    </DashboardTemplate>
  );
}




























