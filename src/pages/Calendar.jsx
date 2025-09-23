// src/pages/Calendar.jsx
import React, { useMemo, useState } from "react";
import DashboardCalendar from "@/components/calendar/DashboardCalendar";
import MonthsCalendar from "@/components/calendar/MonthsCalendar";
import CalendarFiltersBar from "@/components/calendar/CalendarFiltersBar";
import CalendarLegend from "@/components/calendar/CalendarLegend";

export default function CalendarPage() {
  const [view, setView] = useState("month"); // 'month' | '2w'
  const [weeks, setWeeks] = useState(2);
  const [showWeekends, setShowWeekends] = useState(true);

  const [showSite, setShowSite] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showFinal, setShowFinal] = useState(true);

  const [anchor, setAnchor] = useState(new Date());

  const monthFilters = useMemo(() => ({
    site: showSite, review: showReview, final: showFinal
  }), [showSite, showReview, showFinal]);

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

      {view === "month" ? (
        <MonthsCalendar
          anchor={anchor}
          onAnchorChange={setAnchor}
          filters={monthFilters}
        />
      ) : (
        <DashboardCalendar />
      )}
    </div>
  );
}














