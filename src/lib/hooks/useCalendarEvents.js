import { useCallback } from "react";
import supabase from "@/lib/supabaseClient";
import { OrderStatus } from "@/lib/services/ordersService";

/**
 * Dashboard calendar loader: (start, end) => Promise<Event[]>
 * - Tries view `v_admin_calendar_enriched`
 * - Falls back to RPC `get_calendar_events`
 * - Always returns { id, type, title, start, end, orderId, colorClass }
 */
export default function useCalendarEventLoader({ mode = null, reviewerId = null } = {}) {
  return useCallback(async (start, end) => {
    if (!start || !end) return [];

    // helpers
    const iso = (d) => d.toISOString();
    const TYPE_ICONS = {
      site_visit: "📍",
      due_for_review: "🧪",
      due_to_client: "✅",
    };
    const TYPE_LABELS = {
      site_visit: "Site Visit",
      due_for_review: "Review Due",
      due_to_client: "Final Due",
      due: "Due",
      event: "Event",
    };
    const TYPE_COLORS = {
      site_visit: "bg-pink-500/90 border-pink-500/90",
      due_for_review: "bg-amber-500/90 border-amber-500/90",
      due_to_client: "bg-blue-500/90 border-blue-500/90",
    };

    const buildTitle = (type, { title, client, address, orderId }) => {
      // Prefer supplied title; otherwise synthesize "🧪 Review Due — <addr/client> / Order ####"
      if (title && title.trim()) {
        const icon = TYPE_ICONS[type] || "•";
        return `${icon} ${title.trim()}`;
      }
      const icon = TYPE_ICONS[type] || "•";
      const label = TYPE_LABELS[type] || TYPE_LABELS.event;
      const suffix = [client, address].filter(Boolean).join(" — ") || (orderId ? `Order ${orderId}` : "");
      return suffix ? `${icon} ${label} — ${suffix}` : `${icon} ${label}`;
    };

    // -------- 1) Try the view -----------
    try {
      let viewQuery = supabase
        .from("v_admin_calendar_enriched")
        .select("id, event_type, title, start_at, end_at, order_id, client, address, appraiser_name, appraiser_color, status")
        .gte("start_at", iso(start))
        .lt("start_at", iso(end))
        .order("start_at", { ascending: true });

      if (mode === "reviewerQueue") {
        const REVIEW_QUEUE_STATUSES = [OrderStatus.IN_REVIEW, OrderStatus.NEEDS_REVISIONS];
        viewQuery = viewQuery.in("status", REVIEW_QUEUE_STATUSES);
      }

      const { data, error } = await viewQuery;

      if (error) throw error;

      return (data || []).map((row) => {
        const type = row.event_type || "event";
        return {
          id: row.id,
          type,
          title: buildTitle(type, {
            title: row.title,
            client: row.client,
            address: row.address,
            orderId: row.order_id,
          }),
          start: row.start_at,
          end: row.end_at,
          orderId: row.order_id || null,
          colorClass: TYPE_COLORS[type] || "bg-slate-200 border-slate-200",
        };
      });
    } catch (e) {
      // fall through to RPC
      // console.warn("Calendar view failed; falling back to RPC:", e?.message);
    }

    // -------- 2) Fallback to RPC ----------
    const { data: rpc, error: rpcErr } = await supabase.rpc("get_calendar_events", {
      p_from: iso(start),
      p_to: iso(end),
    });

    if (rpcErr) {
      // As a last resort, return empty array (avoid crashing)
      // console.error("Calendar RPC failed:", rpcErr?.message);
      return [];
    }

    // RPC returns compact rows: { order_id, kind ('site_visit'|'due'), at, ... }
    return (rpc || []).map((e) => {
      // We can’t distinguish review vs final from `kind === 'due'` in this RPC,
      // so call it "due_for_review" for now; update if your RPC includes more detail.
      const type = e.kind === "site_visit" ? "site_visit" : "due_for_review";
      return {
        id: `${e.order_id}-${type}-${e.at}`,
        type,
        title: buildTitle(type, {
          title: "",         // RPC usually has no title
          client: e.client,  // include these in your RPC if available
          address: e.address,
          orderId: e.order_id,
        }),
        start: e.at,
        end: e.at,
        orderId: e.order_id,
        colorClass: TYPE_COLORS[type] || "bg-slate-200 border-slate-200",
      };
    });
  }, []);
}

/* keep your named export below unchanged */
export function useCalendarEvents({ from, to }) {
  // ... (your existing code)
}
