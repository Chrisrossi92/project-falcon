// src/components/calendar/DayCell.jsx
import React, { useState } from "react";
import EventChip from "./EventChip";
import EventPopover from "./EventPopover";

export default function DayCell({
  date,
  isToday,
  events = [],
  maxVisible = 3,
  onEventClick,
  onExpand,     // () => void (show DayAccordion)
  heat = 0,     // 0..1 tint intensity
}) {
  const [hovered, setHovered] = useState(null);

  const heatClass = heat > 0
    ? `bg-[rgba(59,130,246,${Math.min(0.08, 0.05 + heat*0.08)})]`
    : "";

  return (
    <div className={`relative border-r border-b last:border-r-0 px-2 py-1 ${isToday ? "bg-slate-50" : ""} ${heatClass}`}>
      <div className="text-sm font-medium mb-1">{date.getDate()}</div>

      <div className="flex flex-col gap-[6px]">
        {events.length === 0 ? (
          <div className="text-xs text-muted-foreground">—</div>
        ) : (
          events.slice(0, maxVisible).map(ev => (
            <div
              key={ev.id}
              className="relative"
              onMouseEnter={() => setHovered(ev)}
              onMouseLeave={() => setHovered(null)}
            >
              <EventChip event={ev} onClick={onEventClick} />
              {/* popover on hover */}
              {hovered?.id === ev.id && <EventPopover event={ev} />}
            </div>
          ))
        )}
        {events.length > maxVisible && (
          <button
            data-no-drawer
            className="text-[11px] text-muted-foreground hover:text-slate-900 transition w-fit"
            onClick={onExpand}
            title="Show all events"
          >
            +{events.length - maxVisible} more…
          </button>
        )}
      </div>
    </div>
  );
}
