// src/components/orders/ReadyForReviewButton.jsx
import React, { useState } from "react";
import { startReview } from "@/lib/services/ordersService";

export default function ReadyForReviewButton({ orderId, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onClick() {
    if (!orderId) return;
    setBusy(true);
    setErr(null);
    try {
      // Moves order to "in_review" and logs an event (RPC-first)
      await startReview(orderId, "Ready for Review");
      if (typeof onDone === "function") onDone();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow border p-4">
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          onClick={onClick}
          disabled={busy}
          title="Send to reviewer (moves order to In Review)"
        >
          Ready for Review
        </button>
        {err ? <span className="text-sm text-red-600">{err}</span> : null}
      </div>
    </div>
  );
}

