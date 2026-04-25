// src/components/activity/ActivityNoteForm.jsx
import React, { useState } from "react";
import { logNote } from "@/lib/services/activityService";
import { emitNotification } from "@/lib/services/notificationsService";
import useRole from "@/lib/hooks/useRole";

export default function ActivityNoteForm({ orderId, order = null, onSaved }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const { role, userId } = useRole() || {};

  async function emitNoteNotification(message) {
    const normalizedRole = String(role || "").toLowerCase();
    let eventKey = null;
    let recipient = null;

    if (normalizedRole === "appraiser") {
      eventKey = "note.appraiser_added";
      recipient = order?.reviewer_id ? { userId: order.reviewer_id, role: "reviewer" } : null;
    } else if (normalizedRole === "reviewer" || normalizedRole === "admin" || normalizedRole === "owner") {
      eventKey = "note.reviewer_added";
      recipient = order?.appraiser_id ? { userId: order.appraiser_id, role: "appraiser" } : null;
    }

    if (!eventKey || !recipient?.userId || recipient.userId === userId) return;

    await emitNotification(eventKey, {
      recipients: [recipient],
      order: order || { id: orderId },
      payload: { message },
    });
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!msg.trim()) return;
    const message = msg.trim();
    try {
      setBusy(true); setErr(null);
      await logNote(orderId, message);
      try {
        await emitNoteNotification(message);
      } catch (notifyErr) {
        console.error("[ActivityNoteForm] note notification failed", notifyErr);
      }
      setMsg("");
      onSaved?.();
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 border-t pt-3">
      <div className="text-xs text-gray-600 mb-1">Add a note</div>
      <div className="flex items-start gap-2">
        <textarea
          className="flex-1 border rounded px-2 py-1 text-sm"
          rows={2}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a quick update for the activity log…"
        />
        <button
          type="submit"
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || !msg.trim()}
        >
          Post
        </button>
      </div>
      {err ? <div className="text-xs text-red-600 mt-1">{err}</div> : null}
    </form>
  );
}
