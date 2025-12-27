import React from "react";
import { formatOrderStatusLabel, normalizeStatus, ORDER_STATUS } from "@/lib/constants/orderStatus";

// Tiny, pretty status pill for tables/cards
const TONE = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  in_review: "bg-indigo-50 text-indigo-700 border-indigo-200",
  needs_revisions: "bg-rose-50 text-rose-700 border-rose-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  default: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function OrderStatusBadge({ status = "", className = "" }) {
  const key = normalizeStatus(status);
  const label = formatOrderStatusLabel(key) || "—";
  const tone = TONE[key] || TONE.default;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tone} ${className}`}
      title={label}
    >
      {label}
    </span>
  );
}
