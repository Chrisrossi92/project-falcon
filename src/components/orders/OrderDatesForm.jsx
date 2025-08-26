// src/components/orders/OrderDatesForm.jsx
import React, { useMemo, useState } from "react";
import { updateOrderDates } from "@/lib/services/ordersService";

function toLocalInput(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  // yyyy-MM-ddThh:mm (no seconds)
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function OrderDatesForm({ order, onSaved }) {
  const [siteVisit, setSiteVisit] = useState(toLocalInput(order?.site_visit_at));
  const [reviewDue, setReviewDue] = useState(toLocalInput(order?.review_due_at));
  const [finalDue, setFinalDue] = useState(toLocalInput(order?.final_due_at));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const changed = useMemo(() => {
    return (
      siteVisit !== toLocalInput(order?.site_visit_at) ||
      reviewDue !== toLocalInput(order?.review_due_at) ||
      finalDue !== toLocalInput(order?.final_due_at)
    );
  }, [order, siteVisit, reviewDue, finalDue]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setBusy(true); setErr(null);
      await updateOrderDates(order.id, {
        siteVisit: siteVisit ? new Date(siteVisit) : null,
        reviewDue: reviewDue ? new Date(reviewDue) : null,
        finalDue: finalDue ? new Date(finalDue) : null,
      });
      if (typeof onSaved === "function") onSaved();
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">📍 Site Visit</label>
          <input
            type="datetime-local"
            className="w-full border rounded px-2 py-1 text-sm"
            value={siteVisit}
            onChange={(e) => setSiteVisit(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">🧐 Due for Review</label>
          <input
            type="datetime-local"
            className="w-full border rounded px-2 py-1 text-sm"
            value={reviewDue}
            onChange={(e) => setReviewDue(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">🚨 Due to Client</label>
          <input
            type="datetime-local"
            className="w-full border rounded px-2 py-1 text-sm"
            value={finalDue}
            onChange={(e) => setFinalDue(e.target.value)}
          />
        </div>
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !changed}
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Save dates
        </button>
      </div>
    </form>
  );
}
