import React from "react";
import { formatOrderStatusLabel, normalizeStatus } from "@/lib/constants/orderStatus";

// Tiny, pretty status pill for tables/cards
const TONE = {
  new: "bg-blue-50 text-blue-800 border-blue-300",
  in_progress: "bg-amber-50 text-amber-800 border-amber-300",
  in_review: "bg-indigo-50 text-indigo-800 border-indigo-300",
  needs_revisions: "bg-rose-50 text-rose-800 border-rose-300",
  review_cleared: "bg-violet-50 text-violet-800 border-violet-300",
  pending_final_approval: "bg-cyan-50 text-cyan-800 border-cyan-300",
  ready_for_client: "bg-emerald-50 text-emerald-800 border-emerald-300",
  completed: "bg-gray-100 text-gray-800 border-gray-300",
  default: "bg-slate-100 text-slate-800 border-slate-300",
};

export default function OrderStatusBadge({ status = "", className = "" }) {
  const key = normalizeStatus(status);
  const label = formatOrderStatusLabel(key) || "—";
  const tone = TONE[key] || TONE.default;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm ${tone} ${className}`}
      title={label}
    >
      {label}
    </span>
  );
}
