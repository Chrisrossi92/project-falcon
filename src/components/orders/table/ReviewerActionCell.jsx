// src/components/orders/table/ReviewerActionCell.jsx
import React, { useState } from "react";
import {
  clearReview,
  sendOrderBackToAppraiser,
} from "@/lib/services/ordersService";

/**
 * Reviewer actions:
 *  - Revisions -> status = REVISIONS (back to appraiser queue)
 *  - Clear Review -> status = REVIEW_CLEARED (admin release queue)
 */
export default function ReviewerActionCell({ order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function runAction(action) {
    if (!order?.id) return;
    try {
      setBusy(true);
      setErr("");
      await action();
      onChanged?.();
    } catch (e) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2" data-interactive>
      <button
        className="px-2 py-1 text-xs rounded border hover:bg-gray-50 disabled:opacity-50"
        disabled={busy}
        onClick={() => runAction(() => sendOrderBackToAppraiser(order.id))}
        title="Send back to appraiser with revisions"
      >
        {busy ? "Working…" : "Revisions"}
      </button>
      <button
        className="px-2 py-1 text-xs rounded border hover:bg-gray-50 disabled:opacity-50"
        disabled={busy}
        onClick={() => runAction(() => clearReview(order.id))}
        title="Clear review for admin release"
      >
        {busy ? "Working…" : "Clear Review"}
      </button>
      {err && <span className="text-[11px] text-rose-600">{err}</span>}
    </div>
  );
}
