// src/components/calendar/CalendarFiltersBar.jsx

function SegmentedButton({ active, children, onClick, priority = "supporting" }) {
  const activeClassName = priority === "primary"
    ? "bg-slate-900 text-white shadow-sm"
    : "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200";

  return (
    <button
      type="button"
      aria-pressed={active}
      className={`relative rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        active
          ? activeClassName
          : "text-slate-500 hover:bg-white/80 hover:text-slate-900 active:bg-slate-100"
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
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        active
          ? "border-slate-300 bg-slate-100 text-slate-950 shadow-sm"
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

function CommandGroup({ label, summary, children, className = "", priority = "supporting" }) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 rounded-lg ${
        priority === "primary" ? "bg-white/70 p-2 ring-1 ring-slate-200/70" : ""
      } ${className}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>
        {summary ? (
          <span className="truncate text-[11px] font-semibold text-slate-500">
            {summary}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function CalendarFiltersBar({
  view, setView,                // '2w' | 'month'
  weeks, setWeeks,              // 1 | 2 | 4 (only used for 2w view)
  showWeekends, setShowWeekends,
  lens = "all",
  setLens,
}) {
  const selectedLensLabel = LENSES.find((item) => item.id === lens)?.label || "All";
  const selectedViewLabel = view === "month" ? "Month" : "2 weeks";
  const rangeSummary = view === "2w"
    ? `${weeks || 2}w${showWeekends ? " + weekends" : ""}`
    : "Month span";

  return (
    <div
      className="mb-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] lg:grid-cols-[minmax(16rem,auto)_auto_minmax(0,1fr)]"
      aria-label="Calendar command bar"
    >
      <CommandGroup label="View mode" summary={selectedViewLabel} priority="primary">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100/80 p-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <SegmentedButton priority="primary" active={view === "month"} onClick={() => setView("month")}>
            Month
          </SegmentedButton>
          <div className="mx-1 h-7 w-px self-center bg-slate-200" aria-hidden="true" />
          <SegmentedButton priority="primary" active={view === "2w"} onClick={() => setView("2w")}>
            2 weeks
          </SegmentedButton>
        </div>
      </CommandGroup>

      {view === "2w" && (
        <CommandGroup label="Range" summary={rangeSummary}>
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            {[1,2,4].map(n => (
              <FilterToggle key={n} active={weeks === n} onClick={() => setWeeks(n)}>
                {n}w
              </FilterToggle>
            ))}
            <FilterToggle active={showWeekends} onClick={() => setShowWeekends(!showWeekends)}>
              Weekends
            </FilterToggle>
          </div>
        </CommandGroup>
      )}

      <CommandGroup label="Lens" summary={selectedLensLabel} className={view === "2w" ? "" : "lg:col-span-2"}>
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
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
      </CommandGroup>
    </div>
  );
}
