// src/components/calendar/CalendarLegend.jsx
export default function CalendarLegend({ className = "" }) {
  return (
    <div
      className={
        "flex items-center gap-4 text-xs text-muted-foreground opacity-80 hover:opacity-100 " +
        className
      }
      aria-label="Calendar legend"
    >
      <span className="inline-flex items-center gap-1">
        <span role="img" aria-label="Site visit">📍</span>
        <span className="hidden sm:inline">Site Visit</span>
        <span className="sm:hidden">Site</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span role="img" aria-label="Review due">📝</span>
        <span className="hidden sm:inline">Review Due</span>
        <span className="sm:hidden">Review</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span role="img" aria-label="Final due">✅</span>
        <span className="hidden sm:inline">Final Due</span>
        <span className="sm:hidden">Final</span>
      </span>
    </div>
  );
}

