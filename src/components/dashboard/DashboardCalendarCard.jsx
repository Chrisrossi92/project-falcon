import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import supabase from "@/lib/supabaseClient";
import DashboardCalendar from "@/components/DashboardCalendar";    // list-style calendar
// If you want the big FullCalendar grid later, you also have this: 
// import FullCalendarWrapper from "@/components/ui/FullCalendarWrapper";   // :contentReference[oaicite:1]{index=1}
import CalendarLegend from "@/components/ui/CalendarLegend";       // colored dots by appraiser if you pass them  :contentReference[oaicite:2]{index=2}

export default function DashboardCalendarCard({ className = "", style }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // date window: today ± 30 days
  const now = new Date();
  const startISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().slice(0, 10);
  const endISO   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Pull the fields we need from the same v_orders_frontend view
      const { data, error } = await supabase
        .from("v_orders_frontend")
        .select("id, order_no, client_name, appraiser_name, site_visit_at, due_for_review, due_to_client, due_date")
        // Optional: only upcoming-ish rows (client-side filtering is fine too)
        // .or(`site_visit_at.gte.${startISO},due_for_review.gte.${startISO},due_to_client.gte.${startISO}`)
        .limit(1000);

      if (error) {
        console.error("Calendar load error:", error);
        setOrders([]);
      } else {
        setOrders(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const events = useMemo(() => {
    const out = [];
    for (const o of orders) {
      // Site visit (datetime)
      if (o.site_visit_at) {
        const dt = new Date(o.site_visit_at);
        if (isFinite(dt)) {
          out.push({
            id: `${o.id}-sv`,
            type: "site_visit",
            date: dt,
            label: `${o.order_no || "Order"} — Site Visit`,
            meta: { client: o.client_name, who: o.appraiser_name },
          });
        }
      }
      // Due for review (date)
      if (o.due_for_review) {
        const dt = new Date(`${o.due_for_review}T09:00:00`);
        if (isFinite(dt)) {
          out.push({
            id: `${o.id}-rv`,
            type: "review_due",
            date: dt,
            label: `${o.order_no || "Order"} — Review Due`,
            meta: { client: o.client_name, who: o.appraiser_name },
          });
        }
      }
      // Due to client / final due (date)
      const finalDate = o.due_date || o.due_to_client;
      if (finalDate) {
        const dt = new Date(`${finalDate}T17:00:00`);
        if (isFinite(dt)) {
          out.push({
            id: `${o.id}-fc`,
            type: "due_to_client",
            date: dt,
            label: `${o.order_no || "Order"} — Final Due`,
            meta: { client: o.client_name, who: o.appraiser_name },
          });
        }
      }
    }

    // window filter
    const start = new Date(`${startISO}T00:00:00`);
    const end   = new Date(`${endISO}T23:59:59`);
    return out
      .filter(e => e.date >= start && e.date <= end)
      .sort((a, b) => a.date - b.date);
  }, [orders, startISO, endISO]);

  return (
    <Card className={`p-4 h-full overflow-hidden flex flex-col ${className}`} style={style}>
      <div className="pb-2">
        <h3 className="font-semibold">Calendar</h3>
        <div className="text-xs text-muted-foreground">Site visits, review due, final due</div>
      </div>

      {/* Optional legend if you pass appraiser colors later */}
      {/* <div className="mb-2"><CalendarLegend appraisers={[{id:1,name:'Chris Rossi',color:'#3b82f6'}]} /></div> */}

      <div className="flex-1 min-h-0 overflow-auto">
        <DashboardCalendar events={events} />
      </div>

      {loading && <div className="text-xs text-muted-foreground mt-2">Loading…</div>}
    </Card>
  );
}


