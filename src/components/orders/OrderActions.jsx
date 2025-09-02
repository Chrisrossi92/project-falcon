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

export default function OrderActions({ order, onAfterAction }) {
  const { isAdmin, isReviewer } = useRole() || {};
  const [note, setNote] = useState("");

  if (!order) return null;

  const id = order.id;
  const status = String(order.status || "").toLowerCase();
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
  const canStart      = (isReviewer || isAdmin) && status !== "in_review" && status !== "complete";
  const canApprove    = (isReviewer || isAdmin) && status === "in_review";
  const canRequestRev = (isReviewer || isAdmin) && status === "in_review";
  const canReady      = (isReviewer || isAdmin) && (status === "in_review" || status === "revisions");
  const canSend       = (isReviewer || isAdmin) && status === "ready_to_send";
  const canComplete   =  isAdmin && status !== "complete";   // <-- admin override allowed anytime pre-complete

  // Add-note is always allowed for signed-in roles (RPC enforces)
  const canAddNote = Boolean(note.trim());

  // Override check: warn if order does NOT appear reviewed
  const looksReviewed = reviewerAssigned && status === "ready_to_send";
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


