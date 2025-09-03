// src/components/calendar/CalendarLegend.jsx
export default function CalendarLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-pink-500/90"></span> Site Visit
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90"></span> Due for Review
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500/90"></span> Final / Global Due
      </span>
    </div>
  );
}
