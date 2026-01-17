// src/components/orders/OrderActions.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useRole } from "@/lib/hooks/useRole";
import {
  startReview,
  approveReview,
  requestRevisions,
  markReadyToSend,
  markComplete,
  sendToClient,
} from "@/lib/services/ordersService";
import { logNote } from "@/lib/services/activityService";
import { ORDER_STATUS, normalizeStatus } from "@/lib/constants/orderStatus";

export default function OrderActions({ order, onAfterAction }) {
  const { isAdmin, isReviewer } = useRole() || {};
  const [note, setNote] = useState("");

  if (!order) return null;

  const id = order.id;
  const status = normalizeStatus(order.status);
  const reviewerAssigned = !!order.reviewer_id;

  const doAction = async (fn, label, args = []) => {
    await toast.promise(
      fn(...args).then(() => onAfterAction?.()),
      {
        loading: `${label}…`,
        success: `${label} succeeded`,
        error: (e) => `${label} failed: ${e?.message || "Unknown error"}`,
      }
    );
  };

  // === Gate logic (admins have all reviewer powers) ===
  const canStart      = (isReviewer || isAdmin) && status !== ORDER_STATUS.IN_REVIEW && status !== ORDER_STATUS.COMPLETED;
  const canApprove    = (isReviewer || isAdmin) && status === ORDER_STATUS.IN_REVIEW;
  const canRequestRev = (isReviewer || isAdmin) && status === ORDER_STATUS.IN_REVIEW;
  const canReady      = (isReviewer || isAdmin) && (status === ORDER_STATUS.IN_REVIEW || status === ORDER_STATUS.NEEDS_REVISIONS);

  // IMPORTANT: “Send to Client” is an admin/conductor action
  const canSend       = isAdmin && status === ORDER_STATUS.READY_FOR_CLIENT;

  const canComplete   = isAdmin && status !== ORDER_STATUS.COMPLETED;

  const canAddNote = Boolean(note.trim());

  const looksReviewed = reviewerAssigned && status === ORDER_STATUS.READY_FOR_CLIENT;
  const confirmCompleteText = looksReviewed
    ? "Complete this order?"
    : "Are you sure you want to mark this order COMPLETE?\n\nIt does not appear to be reviewed. This will override the review process.";

  async function onMarkComplete() {
    if (!looksReviewed) {
      const ok = window.confirm(confirmCompleteText);
      if (!ok) return;
    }
    await doAction(markComplete, "Mark complete", [id, note || null]);
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="text-sm font-medium">Actions</div>

      <div className="flex flex-wrap gap-2">
        {canStart && (
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => doAction(startReview, "Start review", [id])}
          >
            Start Review
          </button>
        )}

        {canApprove && (
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => doAction(approveReview, "Approve review", [id, note || null])}
          >
            Approve
          </button>
        )}

        {canRequestRev && (
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => doAction(requestRevisions, "Request revisions", [id, note || null])}
          >
            Request Revisions
          </button>
        )}

        {canReady && (
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => doAction(markReadyToSend, "Mark ready to send", [id])}
          >
            Ready to Send
          </button>
        )}

        {canSend && (
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => doAction(sendToClient, "Send to client", [id, {}])}
          >
            Send to Client
          </button>
        )}

        {canComplete && (
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={onMarkComplete}
          >
            Mark Complete
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 w-24">Note (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a short note…"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
          disabled={!canAddNote}
          onClick={() => doAction(logNote, "Add note", [id, note])}
        >
          Add Note
        </button>
      </div>
    </div>
  );
}


