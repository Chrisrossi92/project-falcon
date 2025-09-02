import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card.jsx";
import { listAdminEvents } from "@/lib/services/calendarService";
import FullCalendarWrapper from "@/components/ui/FullCalendarWrapper";

/**
 * Grid calendar for the dashboard (month/week/day).
 * Uses the same listAdminEvents() service as the Calendar page.
 */
export default function DashboardCalendarCard({ className = "", style }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // 60-day window centered around today
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await listAdminEvents({ start, end });
        // FullCalendar expects { id, title, start, end? }
        const fc = rows.map((e) => ({
          id: e.id,
          title: labelFor(e.type),
          start: e.date.toISOString(),
          end: e.end ? e.end.toISOString() : undefined,
          // store extra metadata if you want click-to-detail later
          extendedProps: {
            order_id: e.order_id,
            type: e.type,
            address: e.address,
          },
        }));
        setEvents(fc);
      } catch (err) {
        console.error("Dashboard calendar load error:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className={`p-4 h-full overflow-hidden flex flex-col ${className}`} style={style}>
      <div className="pb-2 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Calendar</h3>
          <div className="text-xs text-muted-foreground">Site visits, review due, final due</div>
        </div>
        <Legend />
      </div>

      <div className="flex-1 min-h-0">
        <FullCalendarWrapper events={events} />
      </div>

      {loading && <div className="text-xs text-muted-foreground mt-2">Loading…</div>}
    </Card>
  );
}

function labelFor(type) {
  if (type === "site_visit") return "📍 Site Visit";
  if (type === "review_due") return "🧠 Due for Review";
  if (type === "final_due")  return "📦 Due to Client";
  return "Event";
}

function Legend() {
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-3">
      <span><span className="mr-1">📍</span>Site Visit</span>
      <span><span className="mr-1">🧠</span>Due for Review</span>
      <span><span className="mr-1">📦</span>Due to Client</span>
    </div>
  );
}





