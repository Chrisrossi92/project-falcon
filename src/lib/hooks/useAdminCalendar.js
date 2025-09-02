// src/lib/hooks/useAdminCalendar.js
import { useEffect, useState } from "react";
import { listAdminEvents } from "@/lib/services/calendarService";

export function useAdminCalendar({ start, end, appraiserId = null }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function refresh() {
    try {
      setLoading(true);
      setErr(null);
      const rows = await listAdminEvents({ start, end, appraiserId });
      // Ensure dates are Date objects and sorted
      const out = rows
        .map((e) => ({ ...e, date: e.date instanceof Date ? e.date : new Date(e.date) }))
        .filter((e) => !isNaN(e.date?.getTime?.()))
        .sort((a, b) => a.date - b.date);
      setEvents(out);
    } catch (e) {
      setErr(e?.message || String(e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.toISOString?.(), end?.toISOString?.(), appraiserId]);

  return { events, loading, err, refresh };
}


