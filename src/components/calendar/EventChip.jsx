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
    case "review": return "🧪";
    case "final":  return "✅";
    default:       return "•";
  }
}

function labelFor(type) {
  switch (type) {
    case "site":   return "Site Visit";
    case "review": return "Review Due";
    case "final":  return "Final Due";
    default:       return "Event";
  }
}

export default function EventChip({ event, onClick }) {
  const type = normalizeType(event?.type ?? event?.event_type);
  const icon = iconFor(type);
  const base = (event?.title || event?.label || "").trim();

  // Build a sane fallback if loader didn’t provide a title
  let text = base;
  if (!text) {
    const addr = [event?.address, event?.city && event?.state ? `${event.city}, ${event.state}` : null]
      .filter(Boolean)
      .join(" · ");
    const orderRef = event?.order_no || event?.order_number || event?.orderId || event?.order_id;
    const suffix = addr || (orderRef ? `Order ${orderRef}` : "");
    text = suffix ? `${labelFor(type)} — ${suffix}` : labelFor(type);
  }

  return (
    <div
      className="inline-flex items-center gap-1 text-xs px-2 py-[2px] rounded border bg-white cursor-pointer hover:bg-gray-50"
      onClick={() => onClick?.(event)}
      title={text}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}




