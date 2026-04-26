// src/components/calendar/EventChip.jsx
import React from "react";

function normalizeType(t) {
  const s = (t || "").toString().toLowerCase();
  if (s.includes("site")) return "site";
  if (s.includes("review")) return "review";
  if (s.includes("final") || s.includes("client")) return "final";
  return "other";
}

function iconFor(type) {
  switch (type) {
    case "site":   return "📍";
    case "review": return "📝";
    case "final":  return "✅";
    default:       return "•";
  }
}

export default function EventChip({ event, onClick }) {
  const type = normalizeType(event?.type ?? event?.event_type);
  const icon = iconFor(type);
  const base = (event?.title || event?.label || "").trim();

  // Build a sane fallback if loader didn’t provide a title
  let text = base;
  if (!text) {
    const addr = (event?.address || event?.address_line1 || "").trim();
    const orderRef = event?.order_no || event?.order_number || event?.orderId || event?.order_id;
    text = addr || (orderRef ? `Order ${orderRef}` : "Event");
  }

  return (
    <div
      className="flex max-w-full min-w-0 items-center gap-1 overflow-hidden rounded border bg-white px-2 py-[2px] text-xs cursor-pointer hover:bg-gray-50"
      onClick={() => onClick?.(event)}
      title={event?.address && event.address !== text ? `${text} (${event.address})` : text}
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <span className="min-w-0 truncate">{text}</span>
    </div>
  );
}


