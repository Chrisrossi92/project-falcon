// src/pages/Calendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";
import { useNavigate } from "react-router-dom";
import { listCalendarEvents } from "@/lib/services/calendarService";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import CalendarLegend from "@/components/calendar/CalendarLegend";

function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function monthEnd(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); }

export default function CalendarPage() {
  const { user } = useSession();
  const { isAdmin, isReviewer } = useRole() || {};
  const mineOnly = !(isAdmin || isReviewer);
  const userId = user?.id || user?.user_id || user?.uid || null;

  const [anchor, setAnchor] = useState(() => new Date());
  const range = useMemo(() => ({ from: monthStart(anchor), to: monthEnd(anchor) }), [anchor]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const rows = await listCalendarEvents({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          mineOnly,
          userId,
        });
        setEvents(rows);
      } catch (e) {
        setErr(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [range.from.getTime(), range.to.getTime(), mineOnly, userId]);

  function onSelectOrder(orderId) {
    if (!orderId) return;
    // Navigate to detail view (or trigger your drawer open pattern)
    navigate(`/orders/${orderId}`);
  }

  return (
    <div className="p-4 space-y-3">
    {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="ml-auto flex items-center gap-4">
          <CalendarLegend />
          <div className="text-sm text-muted-foreground">
            {mineOnly ? "My events" : "All events"}
         </div>
        </div>
      </div>

      {err && (
        <div className="text-red-600 text-sm border rounded p-2">
          Failed to load events: {err.message}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <CalendarGrid
          anchor={anchor}
          events={events}
          onPrev={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          onNext={() => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          onSelectOrder={onSelectOrder}
        />
      )}
    </div>
  );
}










