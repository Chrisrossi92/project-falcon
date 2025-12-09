// DaySection.jsx
import React from "react";
import Row from "./Row";

export default function DaySection({ label, items }) {
  return (
    <div className="space-y-2">
      <div className="sticky top-0 z-10 -mx-3 bg-white/80 px-3 py-1.5 backdrop-blur">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      </div>
      <div className="space-y-2">
        {items.map((r, i) => (
          <Row key={r.id || `${r.event_type}-${r.created_at}-${i}`} item={r} />
        ))}
      </div>
    </div>
  );
}
