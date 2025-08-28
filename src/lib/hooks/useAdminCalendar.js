import { useCallback, useEffect, useMemo, useState } from "react";
import { listAdminEvents } from "@/lib/services/calendarService";

export function useAdminCalendar({ daysBack = 7, daysForward = 7, appraiserId = null } = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const range = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - daysBack);
    const end = new Date();   end.setHours(23,59,59,999); end.setDate(end.getDate() + daysForward);
    return { start, end };
  }, [daysBack, daysForward]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const rows = await listAdminEvents({ startAt: range.start.toISOString(), endAt: range.end.toISOString(), appraiserId });
      setEvents(rows || []);
    } catch (e) {
      setErr(e); setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [range, appraiserId]);

  useEffect(() => { load(); }, [load]);

  return { events, loading, err, refresh: load, range };
}
