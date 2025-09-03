// src/components/calendar/CalendarFiltersBar.jsx
import React from "react";

/**
 * CalendarFiltersBar
 * props:
 *  - chips: [{ key, label, active, onClick, color }]
 *  - counts: { site_visit?:number, due_for_review?:number, due_to_client?:number, mine?:number }
 *  - className
 */
export default function CalendarFiltersBar({ chips = [], counts = {}, className = "" }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {chips.map((c) => {
        const count =
          c.key === "site"   ? counts.site_visit :
          c.key === "review" ? counts.due_for_review :
          c.key === "final"  ? counts.due_to_client :
          c.key === "mine"   ? counts.mine : undefined;

        return (
          <button
            key={c.key}
            data-no-drawer
            type="button"
            onClick={(e) => { e.stopPropagation(); c.onClick?.(); }}
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs border shadow-sm transition
                        ${c.active ? "bg-white" : "bg-slate-50"} hover:brightness-[.98]`}
            title={`Toggle ${c.label}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
            <span className="font-medium">{c.label}</span>
            {typeof count === "number" && <span className="text-muted-foreground">({count})</span>}
          </button>
        );
      })}
    </div>
  );
}
