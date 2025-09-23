// src/components/calendar/CalendarFiltersBar.jsx
import React from "react";

export default function CalendarFiltersBar({
  view, setView,                // '2w' | 'month'
  weeks, setWeeks,              // 1 | 2 | 4 (only used for 2w view)
  showWeekends, setShowWeekends,
  showSite, setShowSite,
  showReview, setShowReview,
  showFinal, setShowFinal,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      {/* View */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">View</span>
        <div className="inline-flex border rounded overflow-hidden">
          <button
            className={`px-2 py-1 text-sm ${view === "2w" ? "bg-black text-white" : "bg-white"}`}
            onClick={() => setView("2w")}
          >
            2 weeks
          </button>
          <button
            className={`px-2 py-1 text-sm ${view === "month" ? "bg-black text-white" : "bg-white"}`}
            onClick={() => setView("month")}
          >
            Month
          </button>
        </div>
      </div>

      {/* 2w Options */}
      {view === "2w" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Weeks</span>
          {[1,2,4].map(n => (
            <button
              key={n}
              className={`px-2 py-1 text-sm border rounded ${weeks === n ? "bg-slate-900 text-white" : "bg-white"}`}
              onClick={() => setWeeks(n)}
            >
              {n}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm ml-2">
            <input type="checkbox" checked={showWeekends} onChange={e => setShowWeekends(e.target.checked)} />
            Weekends
          </label>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 ml-auto">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showSite} onChange={e => setShowSite(e.target.checked)} />
          📍 Site
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showReview} onChange={e => setShowReview(e.target.checked)} />
          📝 Review
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showFinal} onChange={e => setShowFinal(e.target.checked)} />
          ✅ Final
        </label>
      </div>
    </div>
  );
}

