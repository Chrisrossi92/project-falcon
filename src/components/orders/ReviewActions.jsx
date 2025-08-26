// src/components/orders/ReviewActions.jsx
import React, { useState } from "react";
import { approveReview, requestChanges } from "@/lib/services/ordersService";

export default function ReviewActions({ order }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function runApprove() {
    setBusy(true);
    setErr(null);
    try {
      await approveReview(order.id);
      // useOrders realtime will refresh listings
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runRequestChanges() {
    const msg = window.prompt(
      "Enter change request note (required):",
      "Emailed full notes"
    );
    if (!msg || !msg.trim()) return; // require a non-empty note
    setBusy(true);
    setErr(null);
    try {
      await requestChanges(order.id, msg.trim());
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
        disabled={busy}
        onClick={runApprove}
        title="Approve and move to Ready for Client"
      >
        Approve
      </button>
      <button
        className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
        disabled={busy}
        onClick={runRequestChanges}
        title="Request revisions (requires a note)"
      >
        Request changes
      </button>
      {err ? <span className="text-[10px] text-red-600 ml-2">{err}</span> : null}
    </div>
  );
}


