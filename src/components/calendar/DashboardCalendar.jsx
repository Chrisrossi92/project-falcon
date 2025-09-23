// src/components/calendar/DashboardCalendar.jsx
import React, { useCallback, useMemo, useState } from "react";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import CalendarFiltersBar from "@/components/calendar/CalendarFiltersBar";
import supabase from "@/lib/supabaseClient";

// Map DB row → TwoWeekCalendar event shape (used by EventChip)
function toTwoWeekEvent(row) {
  const t = (row.title || "").toLowerCase();
  const type =
    row.event_type === "site_visit" || row.event_type === "appointment"
      ? "site_visit"
      : t.includes("review")
      ? "due_for_review"
      : "due_to_client";
  return {
    id: row.id,
    type,                                        // 'site_visit' | 'due_for_review' | 'due_to_client'
    start: row.start_at,
    end: row.end_at,
    orderId: row.order_id,
    address: row.address || "",
    client: row.client_name || "",
    appraiser: row.appraiser_name || "",
    title: row.title || "",
  };
}

export default function DashboardCalendar() {
  const [view] = useState("2w"); // dashboard uses the 2-week grid
  const [weeks, setWeeks] = useState(2);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showSite, setShowSite] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showFinal, setShowFinal] = useState(true);

  const getEvents = useCallback(async (start, end) => {
    const { data, error } = await supabase
      .from("v_admin_calendar")
      .select("id, event_type, title, start_at, end_at, order_id, appraiser_name, order_no, address, client_name")
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at", { ascending: true });

    if (error) { console.warn(error.message); return []; }

    const rows = (data || []).map(toTwoWeekEvent);
    return rows.filter(ev =>
      (showSite && ev.type === "site_visit") ||
      (showReview && ev.type === "due_for_review") ||
      (showFinal && ev.type === "due_to_client")
    );
  }, [showSite, showReview, showFinal]);

  return (
    <div className="w-full">
      <CalendarFiltersBar
        view={view} setView={() => {}}
        weeks={weeks} setWeeks={setWeeks}
        showWeekends={showWeekends} setShowWeekends={setShowWeekends}
        showSite={showSite} setShowSite={setShowSite}
        showReview={showReview} setShowReview={setShowReview}
        showFinal={showFinal} setShowFinal={setShowFinal}
      />
      <TwoWeekCalendar
        getEvents={getEvents}
        weeks={weeks}
        showWeekends={showWeekends}
        showWeekdayHeader
        compact
        onEventClick={(ev) => { if (ev?.orderId) window.open(`/orders/${ev.orderId}`, "_self"); }}
      />
    </div>
  );
}
