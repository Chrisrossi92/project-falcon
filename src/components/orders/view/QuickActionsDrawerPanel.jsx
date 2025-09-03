// src/components/orders/view/QuickActionsDrawerPanel.jsx
import React, { useState } from "react";
import { useRole } from "@/lib/hooks/useRole";
import { updateOrderStatus } from "@/lib/services/ordersService";

export default function QuickActionsDrawerPanel({ orderId, onAfterChange }) {
  const { isAdmin, isReviewer } = useRole() || {};
  const [busy, setBusy] = useState(false);

  if (!orderId) return null;

  async function setStatus(next, label) {
    const ok = window.confirm(`Set status to "${label}"?`);
    if (!ok) return;
    try {
      setBusy(true);
      await updateOrderStatus(orderId, next);
      onAfterChange?.();
    } finally {
      setBusy(false);
    }
  }

  const showReviewerActions = isAdmin || isReviewer;
  const showAppraiserAction = !isAdmin && !isReviewer; // appraiser

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Actions</div>

      {showAppraiserAction && (
        <button
          type="button"
          data-no-drawer
          className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={() => setStatus("in_review", "In Review")}
          disabled={busy}
          title="Send this order to review"
        >
          Send to Review
        </button>
      )}

      {showReviewerActions && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-no-drawer
            className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setStatus("ready_to_send", "Ready to Send")}
            disabled={busy}
            title="Approve review → Ready to Send"
          >
            Approve
          </button>
          <button
            type="button"
            data-no-drawer
            className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setStatus("revisions", "Revisions")}
            disabled={busy}
            title="Request revisions"
          >
            Request Revisions
          </button>
        </div>
      )}
    </div>
  );
}
