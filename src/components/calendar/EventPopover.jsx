// src/components/calendar/EventPopover.jsx
import React from "react";

export default function EventPopover({ event }) {
  if (!event) return null;
  const lines = [
    event.title,
    event.appraiser,
    event.start ? new Date(event.start).toLocaleString() : "",
  ].filter(Boolean);

  return (
    <div className="absolute z-40 translate-y-1 left-0 w-[220px] rounded-md border bg-white p-2 text-[12px] shadow-lg">
      {lines.map((l, i) => (
        <div key={i} className={`${i ? "mt-1" : ""} truncate`}>{l}</div>
      ))}
    </div>
  );
}
