// src/components/calendar/EventChip.jsx
import React from "react";

function normalizeType(t) {
  const s = (t || "").toString().toLowerCase();
  if (s.includes("site")) return "site";
  if (s.includes("review")) return "review";
  if (s.includes("final") || s.includes("client")) return "final";
  return "other";
}

function labelFor(type) {
  switch (type) {
    case "site":   return "Site";
    case "review": return "Review";
    case "final":  return "Final";
    default:       return "Event";
  }
}

function startOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function pressureFor(type, start) {
  if (type === "site") return "scheduled";

  const eventDay = startOfDay(start);
  const today = startOfDay(new Date());
  if (!eventDay || !today) return "normal";

  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 2) return "soon";
  return "normal";
}

function chipClasses(type, pressure) {
  switch (type) {
    case "site":
      return "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50";
    case "review":
      return "border-amber-100 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/40";
    case "final":
      return "border-blue-100 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40";
    default:
      return "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";
  }
}

function labelClasses(type, pressure) {
  if (type === "review") return "text-amber-700";
  if (type === "final") return "text-blue-700";
  return "text-slate-500";
}

function urgencyMarker(pressure) {
  if (pressure === "overdue") {
    return {
      label: "Late",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (pressure === "today") {
    return {
      label: "Today",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return null;
}

function compactName(value = "") {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "";
  return `${parts[0]} ${parts[parts.length - 1]?.[0] || ""}.`;
}

function eventTime(event) {
  if (event?.eventTime) return event.eventTime;
  const date = new Date(event?.start);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function eventPlace(event) {
  return (
    event?.street ||
    event?.address_line1 ||
    event?.address ||
    event?.title ||
    event?.label ||
    ""
  ).trim();
}

function roleNeedsOwnerContext(role) {
  return ["admin", "owner", "reviewer"].includes(String(role || "").toLowerCase());
}

function displayParts({ event, type, pressure, role, compact }) {
  const ownerContext = roleNeedsOwnerContext(role);
  const place = eventPlace(event);
  const appraiser = compact ? compactName(event?.appraiserName || event?.appraiser_name || "") : (event?.appraiserName || event?.appraiser_name || "");
  const owner = appraiser || (ownerContext ? "Unassigned" : "");
  const lateKind = type === "review" ? "Review" : type === "final" ? "Final" : labelFor(type);

  if (pressure === "overdue") {
    return ownerContext
      ? [lateKind, owner, place].filter(Boolean)
      : [`${lateKind} due`, place].filter(Boolean);
  }

  if (type === "site") {
    return ownerContext
      ? [eventTime(event), owner, place].filter(Boolean)
      : [eventTime(event), place].filter(Boolean);
  }

  if (ownerContext) {
    return [owner, place].filter(Boolean);
  }

  return ["due", place].filter(Boolean);
}

export default function EventChip({ event, compact = true, role = "appraiser", onClick }) {
  const type = normalizeType(event?.type ?? event?.event_type);
  const label = labelFor(type);
  const pressure = pressureFor(type, event?.start);
  const marker = urgencyMarker(pressure);
  const orderRef = event?.orderNumber || event?.order_number || event?.order_no || event?.orderId || event?.order_id;
  const parts = displayParts({ event, type, pressure, role, compact });
  const text = parts.length ? parts.join(" · ") : (orderRef ? `Order ${orderRef}` : "Event");
  const titleText = [
    event?.orderNumber || event?.order_number || event?.order_no ? `Order ${event.orderNumber || event.order_number || event.order_no}` : "",
    event?.clientName || event?.client_name || "",
    event?.appraiserName || event?.appraiser_name ? `Appraiser: ${event.appraiserName || event.appraiser_name}` : "",
    event?.address && event.address !== text ? event.address : "",
  ].filter(Boolean).join(" · ") || text;

  return (
    <span className="group relative block max-w-full">
      <button
        type="button"
        className={`flex max-w-full min-w-0 items-center overflow-hidden rounded-md border text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition ${chipClasses(type, pressure)} ${
          compact ? "gap-1 px-1.5 py-[2px] text-[11px] leading-4" : "gap-2 px-2 py-1 text-xs leading-5"
        }`}
        onClick={() => onClick?.(event)}
        title={titleText}
      >
        <span className={`shrink-0 font-semibold uppercase tracking-[0.08em] ${compact ? "text-[9px]" : "text-[10px]"} ${labelClasses(type, pressure)}`}>
          {label}
        </span>
        {marker && (
          <span className={`shrink-0 rounded-full border px-1 py-0 text-[9px] font-semibold uppercase tracking-[0.06em] leading-3 ${marker.className}`}>
            {marker.label}
          </span>
        )}
        <span className="min-w-0 truncate">{text}</span>
      </button>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-50 hidden max-w-[18rem] items-center rounded-lg border px-2.5 py-1.5 text-left shadow-[0_14px_32px_rgba(15,23,42,0.18)] opacity-0 ring-1 ring-white/90 transition duration-150 group-hover:flex group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-within:flex group-focus-within:-translate-y-0.5 group-focus-within:opacity-100 ${chipClasses(type, pressure)} ${
          compact ? "gap-1.5 text-[11px] leading-4" : "gap-2 text-xs leading-5"
        }`}
      >
        <span className={`shrink-0 font-semibold uppercase tracking-[0.08em] ${compact ? "text-[9px]" : "text-[10px]"} ${labelClasses(type, pressure)}`}>
          {label}
        </span>
        {marker && (
          <span className={`shrink-0 rounded-full border px-1 py-0 text-[9px] font-semibold uppercase tracking-[0.06em] leading-3 ${marker.className}`}>
            {marker.label}
          </span>
        )}
        <span className="min-w-0 whitespace-nowrap">{text}</span>
      </span>
    </span>
  );
}
