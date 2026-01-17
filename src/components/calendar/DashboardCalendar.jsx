// src/components/calendar/DashboardCalendar.jsx
import React, { useCallback, useMemo, useState } from "react";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import CalendarFiltersBar from "@/components/calendar/CalendarFiltersBar";
import useCalendarEventLoader from "@/lib/hooks/useCalendarEvents";
import useRole from "@/lib/hooks/useRole";

export default function DashboardCalendar() {
  const [view] = useState("2w"); // dashboard uses the 2-week grid
  const [weeks, setWeeks] = useState(2);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showSite, setShowSite] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showFinal, setShowFinal] = useState(true);
  const roleHook = useRole() || {};
  const isReviewer = roleHook?.isReviewer;
  const loader = useCalendarEventLoader({ mode: isReviewer ? "reviewerQueue" : null, reviewerId: isReviewer ? roleHook.userId : null });

  const getEvents = useCallback(async (start, end) => {
    const rows = await loader(start, end);
    return (rows || []).filter((ev) => {
      const t = (ev.type || "").toLowerCase();
      const isSite = t.includes("site");
      const isReview = t.includes("review");
      const isFinal = t.includes("final") || t.includes("client");
      return (showSite && isSite) || (showReview && isReview) || (showFinal && isFinal);
    });
  }, [loader, showSite, showReview, showFinal]);

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
