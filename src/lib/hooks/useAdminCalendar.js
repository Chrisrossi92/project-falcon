// src/lib/hooks/useAdminCalendar.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { listAdminEvents } from "@/lib/services/calendarService";

/**
 * Admin calendar loader.
 * Default window = past 14 days → next 30 days (matches RPC defaults).
 */
export function useAdminCalendar({ daysBack = 14, daysForward = 30, appraiserId = null } = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - daysBack);

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + daysForward);

    return { start, end };
  }, [daysBack, daysForward]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const rows = await listAdminEvents({
        startAt: range.start.toISOString(),
        endAt: range.end.toISOString(),
        appraiserId,
      });
      setEvents(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [range, appraiserId]);

  useEffect(() => { load(); }, [load]);

  return { events, loading, err, refresh: load, range };
}

