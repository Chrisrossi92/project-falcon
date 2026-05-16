// src/components/calendar/CalendarLegend.jsx
import React from "react";

const items = [
  { label: "Site", className: "border-slate-200 bg-slate-50" },
  { label: "Review", className: "border-amber-200 bg-amber-50" },
  { label: "Final", className: "border-blue-200 bg-blue-50" },
];

export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full border ${item.className}`} aria-hidden="true" />
          <span>{item.label}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0 text-[9px] font-semibold uppercase leading-3 tracking-[0.06em] text-rose-700">
          Late
        </span>
        <span>marker</span>
      </span>
    </div>
  );
}
