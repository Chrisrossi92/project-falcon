// src/components/admin/AdminCalendar.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendarWrapper from "@/components/ui/FullCalendarWrapper";
import { useAdminCalendar } from "@/lib/hooks/useAdminCalendar";

/** Add N days to a date */
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * AdminCalendar
 * Optional props:
 *  - appraiserId?: string|null  (filter events to a specific appraiser)
 */
export default function AdminCalendar({ appraiserId = null }) {
  const navigate = useNavigate();

  // Visible range (defaults to next 30 days). FullCalendar can update it via onRangeChange.
  const [range, setRange] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 30);
    return { start, end };
  });

  const { events, loading, err, refresh } = useAdminCalendar({
    start: range.start,
    end: range.end,
    appraiserId,
  });

  const fcEvents = useMemo(() => events, [events]);

  function onRangeChange({ start, end }) {
    // Keep the hook in sync with what FullCalendar is showing
    setRange({ start, end });
  }

  function onEventClick(ext) {
    // Our wrapper forwards either `event.extendedProps` or `event`
    const row = ext || {};
    const oid =
      row.order_id ||
      row.orderId ||
      (typeof row.id === "string" && row.id.includes(":")
        ? row.id.split(":")[0]
        : row.id);
    if (oid) navigate(`/orders/${oid}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          {loading ? "Loading…" : err ? (
            <span className="text-red-600">Failed: {String(err)}</span>
          ) : (
            "Admin Calendar"
          )}
        </div>
        <button
          className="px-2 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <FullCalendarWrapper
        events={fcEvents}
        initialView="timeGridWeek"
        onRangeChange={onRangeChange}
        onEventClick={onEventClick}
      />
    </div>
  );
}




