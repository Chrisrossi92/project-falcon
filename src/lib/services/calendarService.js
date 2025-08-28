import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst";
import { fetchOrders as fetchOrdersFallback } from "@/lib/services/ordersService";

// Normalize DB rows → react-big-calendar events
function mapRowsToEvents(rows = []) {
  return rows.map((r) => {
    const titleBase = r.order_number || r.address || "Order";
    const prefix =
      r.event_type === "site_visit" ? "📍"
      : r.event_type === "review_due" ? "🧐"
      : "🚨";
    return {
      id: `${r.order_id}-${r.event_type}-${r.start_at}`,
      title:
        r.event_type === "site_visit"
          ? `${prefix} ${r.address || titleBase}`
          : `${prefix} ${r.event_type === "review_due" ? "Review due — " : "Due — "}${titleBase}`,
      start: new Date(r.start_at),
      end: new Date(r.end_at || r.start_at),
      resource: { type: r.event_type, orderId: r.order_id, appraiserId: r.appraiser_id },
    };
  });
}

function computeFromOrders(orders = []) {
  const out = [];
  const add = (o, when, type, minutes = 60) => {
    if (!when) return;
    const d = new Date(when);
    if (isNaN(+d)) return;
    const base = o.order_number || o.address || "Order";
    const prefix = type === "site" ? "📍" : type === "review" ? "🧐" : "🚨";
    const title =
      type === "site" ? `${prefix} ${o.address || base}` :
      type === "review" ? `${prefix} Review due — ${base}` :
      `${prefix} Due — ${base}`;
    out.push({
      id: `${o.id}-${type}`,
      title,
      start: d,
      end: new Date(d.getTime() + minutes * 60000),
      resource: { type, orderId: o.id, appraiserId: o.appraiser_id },
    });
  };
  for (const o of orders) {
    add(o, o.site_visit_at || o.site_visit_date || o.site_visit, "site");
    add(o, o.review_due_at || o.review_due_date || o.review_by, "review", 30);
    add(o, o.final_due_at || o.final_due_date || o.due_at || o.due_date || o.due, "final", 30);
  }
  return out;
}

export async function listAdminEvents({ startAt, endAt, appraiserId } = {}) {
  // RPC-first
  const res = await rpcFirst(
    () =>
      supabase.rpc("rpc_list_admin_events", {
        p_start_at: startAt ?? null,
        p_end_at: endAt ?? null,
        p_appraiser_id: appraiserId ?? null,
      }),
    async () => {
      // fallback: compute from orders already loaded by RLS
      const orders = await fetchOrdersFallback({ appraiserId: null });
      return { data: computeFromOrders(orders), error: null };
    }
  );

  if (res.error) throw res.error;

  // If fallback returned mapped events already, pass through
  if (Array.isArray(res.data) && res.data.length && res.data[0]?.start && res.data[0]?.end) {
    return res.data;
  }
  return mapRowsToEvents(res.data || []);
}

