// src/components/dashboard/UpcomingList.jsx
import React, { useMemo } from "react";

function toDate(v) { if (!v) return null; const d = typeof v === "string" ? new Date(v) : v; return isNaN(d?.getTime?.()) ? null : d; }
function fmtTime(d) { try { return d ? d.toLocaleString() : ""; } catch { return ""; } }

export default function UpcomingList({ orders = [], windowDaysPast = 14, windowDaysFuture = 30 }) {
  const items = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - windowDaysPast);
    const end = new Date(now);   end.setDate(end.getDate() + windowDaysFuture);
    const rows = [];
    for (const o of orders) {
      const orderNum = o.order_number ? `#${o.order_number}` : "";
      const addr = o.address || "Order";
      const mk = (label, at) => at && rows.push({ id: `${o.id}:${label}`, when: at, title: `${label} — ${orderNum || "Order"}`, sub: `${o.client_name || "—"} • ${addr}` });
      mk("📍 Site Visit", toDate(o.site_visit_date));
      mk("🧠 Due for Review", toDate(o.review_due_date));
      if (o.final_due_date) mk("📦 Final Due", toDate(o.final_due_date)); else mk("📦 Due", toDate(o.due_date));
    }
    return rows.filter(r => r.when >= start && r.when <= end).sort((a, b) => a.when - b.when);
  }, [orders, windowDaysPast, windowDaysFuture]);

  if (items.length === 0) return <div className="text-sm text-gray-500">No upcoming events in this window.</div>;

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="rounded border p-2 hover:border-gray-300">
          <div className="flex items-center justify-between">
            <div className="font-medium truncate">{it.title}</div>
            <div className="text-xs text-gray-500">{fmtTime(it.when)}</div>
          </div>
          <div className="text-xs text-gray-500 truncate">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

