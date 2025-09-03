// src/components/calendar/DayAccordion.jsx
import React from "react";
import EventChip from "./EventChip";

export default function DayAccordion({ date, events = [], onEventClick, onClose }) {
  return (
    <div className="rounded-md border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">
          {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </div>
        <button className="text-xs px-2 py-1 rounded border" data-no-drawer onClick={onClose}>Close</button>
      </div>
      <div className="grid gap-2">
        {events.map(ev => (
          <EventChip key={ev.id} event={ev} onClick={onEventClick} />
        ))}
      </div>
    </div>
  );
}
