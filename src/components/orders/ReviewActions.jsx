// src/components/orders/ReviewActions.jsx
import React, { useState } from "react";
import {
  approveReview,
  requestChanges,   // alias of requestRevisions
  sendToClient,
  markComplete,
} from "@/lib/services/ordersService";

/**
 * Props:
 *  - orderId: string (required)
 *  - onDone?: () => void     // callback after successful action
 */
export default function ReviewActions({ orderId, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function run(fn) {
    if (!orderId) return;
    setBusy(true);
    setErr(null);
    try {
      await fn(orderId);
      onDone?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        onClick={() => run(approveReview)}
        disabled={busy}
        title="Approve review (→ Ready to Send)"
      >
        Approve
      </button>

      <button
        className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        onClick={() => run(requestChanges)}
        disabled={busy}
        title="Request revisions (→ Revisions)"
      >
        Request Revisions
      </button>

      <button
        className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        onClick={() => run(sendToClient)}
        disabled={busy}
        title="Send to client (→ Sent to Client)"
      >
        Send to Client
      </button>

      <button
        className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        onClick={() => run(markComplete)}
        disabled={busy}
        title="Mark complete (→ Complete)"
      >
        Complete
      </button>

      {err ? <span className="text-sm text-red-600">{err}</span> : null}
    </div>
  );
}



