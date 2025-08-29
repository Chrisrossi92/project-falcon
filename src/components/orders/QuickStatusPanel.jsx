// src/components/orders/QuickStatusPanel.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRole } from "@/lib/hooks/useRole";
import { setOrderStatus, markComplete } from "@/lib/services/ordersService";

const RECOMMENDED = [
  "in_review",
  "revisions",
  "ready_to_send",
  "complete",
];

export default function QuickStatusPanel({ order, onAfterChange }) {
  const { isAdmin } = useRole() || {};
  const [status, setStatus] = useState("");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    setStatus(order?.status || "");
  }, [order?.status]);

  if (!isAdmin || !order) return null;

  const reviewerAssigned = !!order.reviewer_id;
  const looksReviewed = reviewerAssigned && String(order.status || "").toLowerCase() === "ready_to_send";

  async function saveStatus(next) {
    const target = next ?? (custom.trim() || status || "");
    if (!target) return;

    if (target === "complete" && !looksReviewed) {
      const ok = window.confirm(
        "Are you sure you want to mark this order COMPLETE?\n\nIt does not appear to be reviewed. This will override the review process."
      );
      if (!ok) return;
      // Use the dedicated complete RPC (still logs override on server)
      await doAction(() => markComplete(order.id, null), "Mark complete");
      return;
    }

    await doAction(
      () => setOrderStatus(order.id, target),
      `Set status to ${target}`
    );
  }

  async function doAction(fn, label) {
    await toast.promise(
      fn().then(() => onAfterChange?.()),
      { loading: `${label}…`, success: `${label}`, error: (e) => e?.message || `${label} failed` }
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="text-sm font-medium">Quick Status (Admin)</div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-500">Recommended:</label>
        {RECOMMENDED.map((s) => (
          <button
            key={s}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
            onClick={() => saveStatus(s)}
          >
            {s.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          <div className="text-xs text-gray-500 mb-1">Current</div>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="current status"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <div className="text-xs text-gray-500 mb-1">Custom status (optional)</div>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={custom}
            onChange={(e) => setCustom(e.target.value.toLowerCase())}
            placeholder="e.g., in_progress, on_hold"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
          onClick={() => saveStatus()}
        >
          Update Status
        </button>
        <button
          className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
          onClick={() => saveStatus("complete")}
        >
          Complete Now
        </button>
      </div>
    </div>
  );
}
