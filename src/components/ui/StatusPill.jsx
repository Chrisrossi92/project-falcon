// src/components/ui/StatusPill.jsx
import React from "react";

const palette = {
  in_review: "bg-blue-50 text-blue-700 border-blue-200",
  revisions: "bg-amber-50 text-amber-700 border-amber-200",
  needs_revisions: "bg-amber-50 text-amber-700 border-amber-200",
  ready_for_client: "bg-green-50 text-green-700 border-green-200",
  ready_to_send: "bg-green-50 text-green-700 border-green-200",
  complete: "bg-gray-50 text-gray-700 border-gray-200",
  completed: "bg-gray-50 text-gray-700 border-gray-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function StatusPill({ status }) {
  const key = String(status || "").toLowerCase();
  const cls = palette[key] || palette.default;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>
      {key ? key.replaceAll("_", " ") : "—"}
    </span>
  );
}
