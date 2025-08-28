// src/pages/AdminDashboard.jsx
import React, { useMemo } from "react";
import OrdersTable from "@/features/orders/OrdersTable";
import DashboardCalendar from "@/components/DashboardCalendar";
import { useOrders } from "@/lib/hooks/useOrders";

export default function AdminDashboard() {
  const { data = [], loading, error } = useOrders();

  // KPIs
  const kpis = useMemo(() => {
    const total = data.length;
    const inReview = data.filter((o) =>
      ["in_review", "revisions", "ready_to_send"].includes(
        String(o.status || "").toLowerCase()
      )
    ).length;
    const complete = data.filter(
      (o) => String(o.status || "").toLowerCase() === "complete"
    ).length;
    return { total, inReview, complete };
  }, [data]);

  // Build compact calendar events:
  // Window = past 14 days -> next 30 days
  const events = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 14);

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + 30);

    // utility: pick first present date from a list of field names
    const pickDate = (row, fields) => {
      for (const f of fields) {
        const v = row?.[f];
        if (!v) continue;
        const d = new Date(v);
        if (!isNaN(+d)) return d;
      }
      return null;
    };

    const out = [];
    for (const o of data) {
      // site visit
      const siteVisit = pickDate(o, ["site_visit_at", "site_visit_date", "site_visit"]);
      // reviewer due
      const reviewDue = pickDate(o, ["review_due_at", "review_due_date", "review_due", "review_by"]);
      // final/client due
      const finalDue = pickDate(o, [
        "final_due_at",
        "final_due_date",
        "due_at",
        "due_date",
        "due",
      ]);

      const push = (type, d) => {
        if (!d) return;
        if (d < start || d > end) return;

        const orderNum = o.order_number || "";
        const addr = o.address || "";
        const base = orderNum ? `${orderNum}` : addr;

        let label = base;
        if (type === "site_visit") label = addr || base || "Site visit";
        if (type === "review_due") label = `Review due — ${base}`;
        if (type === "final_due") label = `Due — ${base}`;

        const who =
          type === "site_visit"
            ? o.appraiser_name || ""
            : type === "review_due"
            ? o.current_reviewer_name || "Reviewer"
            : "Client";

        out.push({
          id: `${o.id}-${type}`,
          date: d,
          type, // "site_visit" | "review_due" | "final_due"
          label,
          meta: { client: o.client_name || null, who },
        });
      };

      push("site_visit", siteVisit);
      push("review_due", reviewDue);
      push("final_due", finalDue);
    }

    // Soonest first, dedupe by id just in case
    out.sort((a, b) => a.date - b.date);
    const dedup = [];
    const seen = new Set();
    for (const e of out) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      dedup.push(e);
    }
    return dedup;
  }, [data]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">
          {loading
            ? "Loading…"
            : error
            ? `Error loading dashboard: ${error.message}`
            : "Overview of orders & events"}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">Total Orders</div>
          <div className="text-2xl font-semibold">{kpis.total}</div>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">In Review</div>
          <div className="text-2xl font-semibold">{kpis.inReview}</div>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-2xl font-semibold">{kpis.complete}</div>
        </div>
      </div>

      {/* Calendar — compact list, wider window */}
      <div className="bg-white border rounded-xl p-3">
        <div className="mb-2 text-sm text-gray-600">Showing past 2 weeks → next 30 days</div>
        <DashboardCalendar events={events} />
      </div>

      {/* Orders table (stays visible because calendar is compact) */}
      <div className="bg-white border rounded-xl p-3">
        <div className="mb-2 text-sm font-medium">All Orders</div>
        <OrdersTable />
      </div>
    </div>
  );
}



































