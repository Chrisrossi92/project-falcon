import React, { useCallback, useEffect, useState } from "react";
import DashboardOrdersTable from "@/components/dashboard/DashboardOrdersTable";
import DashboardCalendarPanel from "@/components/dashboard/DashboardCalendarPanel"; // tabs + legend + compact/wknd toggles
import UpcomingEventsList from "@/components/dashboard/UpcomingEventsList";       // optional second mode
import useCalendarEvents from "@/components/calendar/useCalendarEvents";          // pulls from v_admin_calendar_enriched
import { Card } from "@/components/ui/Card.jsx";

export default function AdminDashboard() {
  // optional: wire “Upcoming” to the same data source the calendar uses
  const loadEvents = useCalendarEvents(); // returns async (start,end)=>events[]
  const [upcoming, setUpcoming] = useState([]);

  // keep an “upcoming” cache for the list
  const refreshUpcoming = useCallback(async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()); // ~1 month
    try {
      const evts = await loadEvents(start, end);
      setUpcoming(evts);
    } catch { setUpcoming([]); }
  }, [loadEvents]);

  useEffect(() => { refreshUpcoming(); }, [refreshUpcoming]);

  return (
    <div className="space-y-5 px-4 pb-6">
      {/* KPI row (you already have SummaryCard/KpiLink; keep your existing block here) */}

      {/* CALENDAR (top, full width) */}
      <Card className="p-4">
        <DashboardCalendarPanel onOpenOrder={(id)=>window.open(`/orders/${id}`, "_self")} />
      </Card>

      {/* OPTIONAL: Upcoming list directly under calendar (uses same data) */}
      {/* <Card className="p-3"><UpcomingEventsList events={upcoming} /></Card> */}

      {/* ORDERS (bottom) — dashboard-specific table using our row component */}
      <DashboardOrdersTable />
    </div>
  );
}

















































