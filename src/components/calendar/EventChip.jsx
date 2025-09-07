// src/components/calendar/EventChip.jsx
import React from "react";

const EMOJI = {
  site_visit: "📍",       // Appointment
  due_for_review: "📝",   // Review due
  due_to_client: "✅",    // Final due
};

function fmtTime(dt) {
  try {
    return new Date(dt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Renders a calendar chip.
 * RULE (per spec): Display only "Icon · Street Address".
 * - We still include time (for appointments) and full address in the tooltip.
 */
export default function EventChip({ event, compact = true, onClick }) {
  const type   = event?.type;
  const emoji  = EMOJI[type] || "•";

  // Street-only line (trim everything after first comma)
  const fullAddress = event?.address || "";
  const street      = fullAddress.split(",")[0]?.trim() || "—";

  // Time matters only for appointments; shown in tooltip, not on the chip
  const time = type === "site_visit" ? fmtTime(event?.start) : "";

  // Build tooltip with helpful context, but keep chip minimal
  const tipParts = [street];
  if (event?.client) tipParts.push(event.client);
  if (time) tipParts.push(time);
  const tooltip = tipParts.join(" • ");

  // Compact or full mode both show the same single-line text now
  return (
    <button
      type="button"
      title={tooltip}
      className={
        "w-full text-left " +
        (compact
          ? "text-[11px] px-1 py-0.5"
          : "text-xs px-2 py-1") +
        " rounded border hover:bg-gray-50 truncate"
      }
      onClick={onClick}
    >
      <span className="mr-1">{emoji}</span>
      <span className="truncate">{street}</span>
    </button>
  );
}



