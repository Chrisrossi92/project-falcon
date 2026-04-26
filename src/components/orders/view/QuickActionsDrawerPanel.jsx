import React, { useState } from "react";
import { useRole } from "@/lib/hooks/useRole";
import { updateOrderStatus } from "@/lib/services/ordersService";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";

export default function QuickActionsDrawerPanel({ orderId, onAfterChange, layout = "stack" }) {
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

  // role gating
  const showReviewerActions = !isAdmin && isReviewer;
  const showAppraiserAction = !isAdmin && !isReviewer;

  const Wrap = ({ children }) =>
    layout === "bar" ? (
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    ) : (
      <div className="space-y-2">{children}</div>
    );

  const btn = "px-4 py-2 rounded-md border text-sm hover:bg-slate-50 disabled:opacity-50";

  return (
    <Wrap>
      {showAppraiserAction && (
        <button
          type="button"
          data-no-drawer
          className={btn}
          onClick={() => setStatus(ORDER_STATUS.IN_REVIEW, "In Review")}
          disabled={busy}
          title="Send this order to review"
        >
          Send to Review
        </button>
      )}

      {showReviewerActions && (
        <>
          <button
            type="button"
            data-no-drawer
            className={btn}
            onClick={() => setStatus(ORDER_STATUS.REVIEW_CLEARED, "Review Cleared")}
            disabled={busy}
            title="Clear review for admin release"
          >
            Clear Review
          </button>
          <button
            type="button"
            data-no-drawer
            className={btn}
            onClick={() => setStatus(ORDER_STATUS.NEEDS_REVISIONS, "Revisions")}
            disabled={busy}
            title="Request revisions"
          >
            Request Revisions
          </button>
        </>
      )}
    </Wrap>
  );
}



