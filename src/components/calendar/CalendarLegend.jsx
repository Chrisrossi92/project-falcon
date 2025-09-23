// src/components/calendar/CalendarLegend.jsx
import React from "react";

export default function CalendarLegend() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span>Legend:</span>
      <span>📍 Site</span>
      <span>📝 Review Due</span>
      <span>✅ Final Due</span>
    </div>
  );
}


