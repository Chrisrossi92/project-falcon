// src/components/calendar/MonthDayCell.jsx
import React from "react";

export default function MonthDayCell({
  date,
  isOtherMonth = false,
  count = 0,
  onExpand, // open DayAccordion for this date
}) {
  return (
    <div
      className={
        "min-h-[110px] border -m-[0.5px] p-2 " +
        (isOtherMonth ? "bg-gray-50 text-gray-400" : "bg-white")
      }
    >
      <div className="text-xs md:text-[13px] font-medium">{date.getDate()}</div>

      <div className="mt-2">
        {count === 0 ? (
          <div className="text-xs text-muted-foreground">—</div>
        ) : (
          <button
            type="button"
            data-no-drawer
            className="text-[12px] px-2 py-1 rounded border hover:bg-gray-50"
            onClick={onExpand}
            title="Show all events"
          >
            {count} event{count === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </div>
  );
}
