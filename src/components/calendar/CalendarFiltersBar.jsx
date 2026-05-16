// src/components/calendar/CalendarFiltersBar.jsx
import React from "react";

function SegmentedButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={`rounded-md px-3 py-1 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FilterToggle({ active, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-slate-800 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const LENSES = [
  { id: "all", label: "All" },
  { id: "mine", label: "My Work" },
  { id: "site", label: "Site Visits" },
  { id: "review", label: "Review Handoffs" },
  { id: "final", label: "Client Due" },
];

export default function CalendarFiltersBar({
  view, setView,                // '2w' | 'month'
  weeks, setWeeks,              // 1 | 2 | 4 (only used for 2w view)
  showWeekends, setShowWeekends,
  lens = "all",
  setLens,
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          View
        </span>
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
          <SegmentedButton active={view === "2w"} onClick={() => setView("2w")}>
            2 weeks
          </SegmentedButton>
          <SegmentedButton active={view === "month"} onClick={() => setView("month")}>
            Month
          </SegmentedButton>
        </div>
      </div>

      {view === "2w" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Range
          </span>
          {[1,2,4].map(n => (
            <FilterToggle key={n} active={weeks === n} onClick={() => setWeeks(n)}>
              {n}w
            </FilterToggle>
          ))}
          <FilterToggle active={showWeekends} onClick={() => setShowWeekends(!showWeekends)}>
            Weekends
          </FilterToggle>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Lens
        </span>
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1">
          {LENSES.map((item) => (
            <SegmentedButton
              key={item.id}
              active={lens === item.id}
              onClick={() => setLens?.(item.id)}
            >
              {item.label}
            </SegmentedButton>
          ))}
        </div>
      </div>
    </div>
  );
}
