// src/features/orders/StatusBadge.jsx
import React from "react";

/** Group statuses into a few visual buckets (not one color per status) */
export function statusGroup(status) {
  const s = String(status || "").toLowerCase().trim();
  if (["on_hold", "hold", "waiting_on_client", "paused", "hold_client"].includes(s)) return "hold";
  if (["in_review", "revisions"].includes(s)) return "review";
  if (["ready_to_send", "ready"].includes(s)) return "ready";
  if (["complete", "completed"].includes(s)) return "complete";
  return "progress"; // new, in_progress, assigned, etc.
}

const GROUPS = {
  progress: { label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  hold:     { label: "On Hold",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  review:   { label: "In Review",   cls: "bg-purple-50 text-purple-700 border-purple-200" },
  ready:    { label: "Ready",       cls: "bg-green-50 text-green-700 border-green-200" },
  complete: { label: "Complete",    cls: "bg-gray-50 text-gray-700 border-gray-200" },
};

export default function StatusBadge({ status, showText = true }) {
  const g = GROUPS[statusGroup(status)];
  const text = showText ? (String(status || "").replaceAll("_", " ") || g.label) : null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${g.cls}`}
      title={g.label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}
