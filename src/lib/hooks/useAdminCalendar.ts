// src/lib/hooks/useAdminCalendar.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { listAdminEvents, AdminCalendarRow } from "@/lib/services/calendarService";
import colorForId from "@/lib/utils/colorForId";

export type FCEvent = {
  id: string;
  title: string;
  start: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: any;
};

function labelFor(row: AdminCalendarRow): string {
  const addr = [row.address, row.city, row.state].filter(Boolean).join(", ");
  if (row.event_type === "site_visit") return `📍 ${addr || "Site visit"}`;
  if (row.event_type === "review_due") return `🕵️ Review due — ${addr || ""}`.trim();
  if (row.event_type === "final_due")  return `🚨 Due — ${addr || ""}`.trim();
  return addr || "Event";
}

export function useAdminCalendar(opts: {
  start: Date;
  end: Date;
  appraiserId?: string | null;
}) {
  const [rows, setRows] = useState<AdminCalendarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const startIso = useMemo(() => opts.start.toISOString(), [opts.start]);
  const endIso   = useMemo(() => opts.end.toISOString(), [opts.end]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const data = await listAdminEvents({
        start: startIso,
        end: endIso,
        appraiserId: opts.appraiserId ?? null,
      });
      setRows(data || []);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startIso, endIso, opts.appraiserId]);

  useEffect(() => { load(); }, [load]);

  const events: FCEvent[] = useMemo(() => {
    return rows.map((r) => ({
      id: `${r.order_id}:${r.event_type}`,
      title: labelFor(r),
      start: r.event_at, // FullCalendar will render in local tz by default
      allDay: false,
      backgroundColor: r.appraiser_id ? colorForId(r.appraiser_id) : undefined,
      borderColor: r.appraiser_id ? colorForId(r.appraiser_id) : undefined,
      extendedProps: { ...r },
    }));
  }, [rows]);

  return { events, loading, err, refresh: load, raw: rows };
}
