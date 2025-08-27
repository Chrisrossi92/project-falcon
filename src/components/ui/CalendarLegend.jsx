// src/components/ui/CalendarLegend.jsx
import React from "react";

/**
 * CalendarLegend — shows colored dots with appraiser names.
 * Props:
 *  - appraisers: [{ id, name, color }]
 */
export default function CalendarLegend({ appraisers = [] }) {
  if (!appraisers.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {appraisers.map((a) => (
        <div key={a.id} className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-full border"
            style={{ backgroundColor: a.color }}
          />
          <span className="text-gray-700">{a.name || "—"}</span>
        </div>
      ))}
    </div>
  );
}

