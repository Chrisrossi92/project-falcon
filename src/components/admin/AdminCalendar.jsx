// src/components/admin/AdminCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchOrdersInRange } from "@/lib/services/ordersService";
import { fetchUsersMapByIds } from "@/lib/services/usersService";
import colorForId from "@/lib/utils/colorForId";
import CalendarLegend from "@/components/ui/CalendarLegend";
import { useNavigate } from "react-router-dom";

// Date helpers
function atMidnight(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfMonth(d){ const x = atMidnight(d); x.setDate(1); return x; }
function endOfMonth(d){ const x = startOfMonth(d); x.setMonth(x.getMonth()+1); x.setDate(0); x.setHours(23,59,59,999); return x; }
function addMonths(d, m){ const x = new Date(d); x.setMonth(x.getMonth()+m); return x; }
function getMonthMatrix(d){
  const start = startOfMonth(d);
  const firstDow = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - firstDow);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    days.push(day);
  }
  return days;
}
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function iso(d){ return new Date(d).toISOString(); }

function addressOf(order){
  const a = order.property_address || order.address || "";
  const city = order.city ? `, ${order.city}` : "";
  const st = order.state ? `, ${order.state}` : "";
  const z = order.postal_code ? ` ${order.postal_code}` : "";
  return (a+city+st+z) || (order.order_number ? `Order ${order.order_number}` : `Order ${String(order.id).slice(0,8)}`);
}
function within(day, startISO, endISO){ const t = day.getTime(); return t >= Date.parse(startISO) && t < Date.parse(endISO); }

export default function AdminCalendar(){
  const [cursor, setCursor] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState(null);
  const [appraiserNames, setAppraiserNames] = useState(new Map());
  const navigate = useNavigate();

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd   = useMemo(() => endOfMonth(cursor), [cursor]);

  // 1) Load orders in range (NO embeds)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const sISO = iso(monthStart);
        const eISO = iso(new Date(monthEnd.getTime() + 1)); // exclusive
        const rows = await fetchOrdersInRange(sISO, eISO);
        if (!cancelled) setOrders(rows || []);
      } catch (e) {
        if (!cancelled) { setErr(e?.message || String(e)); setOrders([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [monthStart, monthEnd]);

  // 2) Hydrate appraiser names for legend (separate scalar query; still no embeds)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Array.from(new Set((orders || []).map(o => o.appraiser_id).filter(Boolean)));
      if (!ids.length) { if (!cancelled) setAppraiserNames(new Map()); return; }
      const map = await fetchUsersMapByIds(ids);
      if (!cancelled) setAppraiserNames(map);
    })();
    return () => { cancelled = true; };
  }, [orders]);

  // Map orders -> events (three types only)
  const eventsByDay = useMemo(() => {
    const res = {};
    const sISO = iso(monthStart);
    const eISO = iso(new Date(monthEnd.getTime()+1));
    const add = (day, evt) => {
      const key = day.toDateString();
      if (!res[key]) res[key] = [];
      res[key].push(evt);
    };
    for (const o of orders){
      const color = colorForId(o.appraiser_id);
      const base = { orderId: o.id, addr: addressOf(o), color, appraiserId: o.appraiser_id };

      if (o.site_visit_at){
        const d = new Date(o.site_visit_at);
        if (within(d, sISO, eISO)) add(atMidnight(d), { ...base, type: "site",   icon: "📍", when: d });
      }
      if (o.review_due_at){
        const d = new Date(o.review_due_at);
        if (within(d, sISO, eISO)) add(atMidnight(d), { ...base, type: "review", icon: "🧐", when: d });
      }
      if (o.final_due_at){
        const d = new Date(o.final_due_at);
        if (within(d, sISO, eISO)) add(atMidnight(d), { ...base, type: "client", icon: "🚨", when: d });
      }
    }
    const rank = { client: 0, review: 1, site: 2 };
    Object.keys(res).forEach(k => {
      res[k].sort((a,b) => (rank[a.type]-rank[b.type]) || (a.when?.getTime()||0)-(b.when?.getTime()||0));
    });
    return res;
  }, [orders, monthStart, monthEnd]);

  // Legend (names hydrated from usersService; falls back to “—”)
  const legendAppraisers = useMemo(() => {
    const seen = new Map();
    Object.values(eventsByDay).flat().forEach(e => {
      const key = e.appraiserId || e.color || "unknown";
      if (!seen.has(key)) {
        seen.set(key, { id: key, name: appraiserNames.get(e.appraiserId) || "—", color: e.color });
      }
    });
    return Array.from(seen.values()).slice(0, 12);
  }, [eventsByDay, appraiserNames]);

  const monthName = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const onEventClick = (evt) => { if (evt.orderId) navigate(`/orders/${evt.orderId}`); };

  return (
    <div className="bg-white rounded-2xl shadow border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded-lg" onClick={() => setCursor(addMonths(cursor, -1))}>←</button>
          <div className="text-lg font-semibold">{monthName}</div>
          <button className="px-2 py-1 border rounded-lg" onClick={() => setCursor(addMonths(cursor, +1))}>→</button>
          <button className="px-2 py-1 border rounded-lg ml-2" onClick={() => setCursor(new Date())}>Today</button>
        </div>
        <CalendarLegend appraisers={legendAppraisers} />
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-6 text-sm text-gray-500">Loading calendar…</div>
      ) : err ? (
        <div className="p-6 text-sm text-red-600">{String(err)}</div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {getMonthMatrix(cursor).map((d, idx) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const key = d.toDateString();
            const evts = eventsByDay[key] || [];
            return (
              <div key={key + idx} className={`min-h-[110px] bg-white p-2 ${inMonth ? "" : "bg-gray-50 text-gray-400"}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-xs ${sameDay(d, new Date()) ? "px-1 rounded bg-black text-white" : "text-gray-600"}`}>
                    {d.getDate()}
                  </div>
                  {evts.length > 3 && <div className="text-[10px] text-gray-400">+{evts.length-3} more</div>}
                </div>
                <div className="mt-1 space-y-1">
                  {evts.slice(0,3).map((e,i) => (
                    <button
                      key={e.type + e.orderId + i}
                      title={`${e.icon} ${e.addr}`}
                      onClick={() => onEventClick(e)}
                      className="w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded-md hover:bg-gray-50 border"
                      style={{ borderColor: e.color }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{e.icon}</span>
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: e.color }} />
                        <span className="truncate">{e.addr}</span>
                      </div>
                      {e.when && (
                        <div className="text-[10px] text-gray-500 ml-5">
                          {new Date(e.when).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



