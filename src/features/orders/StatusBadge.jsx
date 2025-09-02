// src/features/orders/StatusBadge.jsx
import React from "react";
import { statusGroup, BADGE_GROUPS, normalizeStatus } from "@/lib/constants/orderStatus";

export default function StatusBadge({ status, showText = true }) {
  const g = BADGE_GROUPS[statusGroup(status)];
  const text = showText ? (normalizeStatus(status).replaceAll("_", " ") || g.label) : null;
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

