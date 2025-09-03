// src/components/calendar/EventChip.jsx
import React from "react";

const ICON = {
  site_visit: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
      <path d="M12 21s-7-7.33-7-11a7 7 0 1 1 14 0c0 3.67-7 11-7 11z" fill="currentColor" />
      <circle cx="12" cy="10" r="2.5" fill="#fff" />
    </svg>
  ),
  due_for_review: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
      <path d="M12 2a10 10 0 1 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6v6l4 2" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  due_to_client: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="currentColor" />
    </svg>
  ),
};

function fmtShort(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return isNaN(d) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function EventChip({ event, onClick }) {
  const { type, title, start, appraiser, colorClass } = event || {};
  // urgency ring: add border-top color via utility classes outside
  return (
    <button
      type="button"
      data-no-drawer
      className={`group w-full text-left rounded border px-2 py-[6px] text-[12px] leading-tight transition
                  hover:shadow-sm active:scale-[0.995] ${colorClass} text-slate-900`}
      onClick={() => onClick?.(event)}
      title={`${title || ""}${start ? " • " + new Date(start).toLocaleString() : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 text-white opacity-95">{ICON[type] || <div className="w-3.5 h-3.5 rounded bg-slate-500" />}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{title || "Event"}</div>
          <div className="flex items-center justify-between">
            <div className="truncate text-[11px] opacity-80">{appraiser || ""}</div>
            <div className="text-[11px] opacity-80 pl-2">{fmtShort(start)}</div>
          </div>
        </div>
      </div>
    </button>
  );
}
