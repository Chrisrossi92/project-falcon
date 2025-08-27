// src/pages/Calendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import FullCalendarWrapper from "@/components/ui/FullCalendarWrapper";
import { useAdminCalendar } from "@/lib/hooks/useAdminCalendar";
import { listAppraisers } from "@/lib/services/userService";

/** Helpers to compute a sensible default 30-day window */
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function CalendarPage() {
  const [range] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 30);
    return { start, end };
  });

  // Appraiser filter state
  const [appraiserId, setAppraiserId] = useState(null);
  const [appraisers, setAppraisers] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsErr, setAppsErr] = useState(null);

  // Load appraisers once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAppsLoading(true);
        setAppsErr(null);
        const rows = await listAppraisers({ includeInactive: false });
        if (!mounted) return;
        setAppraisers(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!mounted) return;
        setAppsErr(e?.message || String(e));
        setAppraisers([]);
      } finally {
        if (mounted) setAppsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { events, loading, err, refresh } = useAdminCalendar({
    start: range.start,
    end: range.end,
    appraiserId,
  });

  const fcEvents = useMemo(() => events, [events]);

  function onAppraiserChange(e) {
    const v = e.target.value;
    setAppraiserId(v === "__ALL__" ? null : v);
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          {/* Appraiser Filter */}
          <label className="text-sm text-gray-700 flex items-center gap-2">
            <span>Appraiser:</span>
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={appraiserId ?? "__ALL__"}
              onChange={onAppraiserChange}
              disabled={appsLoading}
            >
              <option value="__ALL__">All appraisers</option>
              {appraisers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name || u.name || u.email || "Unnamed"}
                </option>
              ))}
            </select>
          </label>

          <button
            className="px-2 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Errors */}
      {appsErr ? (
        <div className="text-sm text-red-600 mb-2">
          Failed to load appraisers: {appsErr}
        </div>
      ) : null}
      {err ? (
        <div className="text-sm text-red-600 mb-2">
          Failed to load events: {String(err)}
        </div>
      ) : null}

      <FullCalendarWrapper events={fcEvents} />
    </div>
  );
}








