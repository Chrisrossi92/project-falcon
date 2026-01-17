// src/pages/Calendar.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CalendarFiltersBar from "@/components/calendar/CalendarFiltersBar";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import supabase from "@/lib/supabaseClient";
import useRole from "@/lib/hooks/useRole";
import { formatCalendarEventTitle } from "@/lib/hooks/useCalendarEvents";

export default function CalendarPage() {
  const [view, setView] = useState("month"); // 'month' | '2w'
  const [weeks, setWeeks] = useState(2);
  const [showWeekends, setShowWeekends] = useState(true);

  const [showSite, setShowSite] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showFinal, setShowFinal] = useState(true);

  const [anchor, setAnchor] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const roleHook = useRole() || {};
  const { isAdmin, isReviewer, userId } = roleHook;

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let q = supabase
          .from("v_orders_active_frontend_v4")
          .select(
            "id, order_id, address, address_line1, client_name, appraiser_id, reviewer_id, status, site_visit_at, review_due_at, final_due_at, due_date"
          );

        if (isReviewer) {
          q = q.eq("reviewer_id", userId || null).eq("status", "in_review");
        } else if (!isAdmin) {
          q = q.eq("appraiser_id", userId || null);
        }

        const { data, error } = await q;
        if (error) throw error;
        if (ok) setOrders(data || []);
      } catch (e) {
        if (ok) setError(e?.message || "Failed to load calendar");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [isAdmin, isReviewer, userId]);

  const monthFilters = useMemo(() => ({
    site: showSite, review: showReview, final: showFinal
  }), [showSite, showReview, showFinal]);

  const deriveEvents = useCallback(
    (start, end) => {
      if (!start || !end) return [];
      const startMs = start.getTime();
      const endMs = end.getTime();
      const events = [];

      orders.forEach((o) => {
        const orderId = o.id || o.order_id || null;
        const address = o.address || o.address_line1 || "";
        const push = (type, ts) => {
          if (!ts) return;
          const when = new Date(ts);
          const ms = when.getTime();
          if (Number.isNaN(ms)) return;
          if (ms < startMs || ms > endMs) return;
          events.push({
            id: `${orderId || "order"}-${type}-${ms}`,
            type,
            title: formatCalendarEventTitle(type, { address, orderId }),
            start: when.toISOString(),
            end: when.toISOString(),
            orderId,
            address,
          });
        };

        push("site", o.site_visit_at);
        push("review", o.review_due_at);
        push("final", o.final_due_at || o.due_date);
      });

      return events;
    },
    [orders]
  );

  const filterByType = useCallback(
    (list) =>
      (list || []).filter((ev) => {
        const t = (ev.type || "").toLowerCase();
        const isSite = t.includes("site");
        const isReview = t.includes("review");
        const isFinal = t.includes("final") || t.includes("client");
        return (showSite && isSite) || (showReview && isReview) || (showFinal && isFinal);
      }),
    [showSite, showReview, showFinal]
  );

  const monthEvents = useMemo(() => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
    return filterByType(deriveEvents(start, end)).map((ev) => ({
      ...ev,
      start: new Date(ev.start),
    }));
  }, [anchor, deriveEvents, filterByType]);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Calendar</h1>

      <CalendarFiltersBar
        view={view} setView={setView}
        weeks={weeks} setWeeks={setWeeks}
        showWeekends={showWeekends} setShowWeekends={setShowWeekends}
        showSite={showSite} setShowSite={setShowSite}
        showReview={showReview} setShowReview={setShowReview}
        showFinal={showFinal} setShowFinal={setShowFinal}
      />

      <CalendarLegend />

      {error && <div className="text-sm text-red-600">{error}</div>}
      {view === "month" ? (
        <CalendarGrid
          anchor={anchor}
          events={monthEvents}
          onPrev={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
          onNext={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
          onSelectOrder={(orderId) => { if (orderId) window.open(`/orders/${orderId}`, "_self"); }}
        />
      ) : (
        <TwoWeekCalendar
          getEvents={async (start, end) => filterByType(deriveEvents(start, end))}
          weeks={weeks}
          showWeekends={showWeekends}
          showWeekdayHeader
          compact
          onEventClick={(ev) => { if (ev?.orderId) window.open(`/orders/${ev.orderId}`, "_self"); }}
        />
      )}
    </div>
  );
}













