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

  function participantName(roleName) {
    if (roleName === "appraiser") return order?.appraiser_name || "Appraiser";
    if (roleName === "reviewer") return order?.reviewer_name || "Reviewer";
    if (roleName === "owner") return "Owner";
    if (roleName === "admin") return "Admin";
    return "User";
  }

  async function emitNoteNotification(message) {
    const normalizedRole = String(role || "").toLowerCase();
    let eventKey = null;
    let recipient = null;
    let actorRoleOnOrder = null;
    let recipientRoleOnOrder = null;

    if (userId && userId === order?.appraiser_id) {
      eventKey = "note.appraiser_added";
      recipient = order?.reviewer_id ? { userId: order.reviewer_id, role: "reviewer" } : null;
      actorRoleOnOrder = "appraiser";
      recipientRoleOnOrder = "reviewer";
    } else if (userId && userId === order?.reviewer_id) {
      eventKey = "note.reviewer_added";
      recipient = order?.appraiser_id ? { userId: order.appraiser_id, role: "appraiser" } : null;
      actorRoleOnOrder = "reviewer";
      recipientRoleOnOrder = "appraiser";
    } else if (normalizedRole === "reviewer" || normalizedRole === "admin" || normalizedRole === "owner") {
      eventKey = "note.reviewer_added";
      recipient = order?.appraiser_id ? { userId: order.appraiser_id, role: "appraiser" } : null;
      actorRoleOnOrder = normalizedRole;
      recipientRoleOnOrder = "appraiser";
    } else if (normalizedRole === "appraiser") {
      eventKey = "note.appraiser_added";
      recipient = order?.reviewer_id ? { userId: order.reviewer_id, role: "reviewer" } : null;
      actorRoleOnOrder = "appraiser";
      recipientRoleOnOrder = "reviewer";
    }

    if (!eventKey || !recipient?.userId) {
      return;
    }

    if (recipient.userId === userId) {
      return;
    }

    const orderNumber = order?.order_number || order?.order_no || null;
    const actorName = participantName(actorRoleOnOrder);
    const recipientName = participantName(recipientRoleOnOrder);
    const kindLabel =
      actorRoleOnOrder === "appraiser"
        ? "Appraiser note"
        : actorRoleOnOrder === "reviewer"
        ? "Reviewer note"
        : actorRoleOnOrder === "owner"
        ? "Owner note"
        : actorRoleOnOrder === "admin"
        ? "Admin note"
        : "Note";

    try {
      await emitNotification(eventKey, {
        recipients: [recipient],
        order: order || { id: orderId },
        payload: {
          message,
          order_id: order?.id || orderId || null,
          order_number: orderNumber,
          note_text: message,
          actor: {
            user_id: userId || null,
            name: actorName,
            role_on_order: actorRoleOnOrder,
          },
          recipient: {
            user_id: recipient.userId,
            name: recipientName,
            role_on_order: recipientRoleOnOrder,
          },
          order_participants: {
            appraiser_id: order?.appraiser_id || null,
            appraiser_name: order?.appraiser_name || "Appraiser",
            reviewer_id: order?.reviewer_id || null,
            reviewer_name: order?.reviewer_name || "Reviewer",
          },
          communication: {
            direction_label: `${actorName} → ${recipientName}`,
            kind_label: kindLabel,
          },
        },
      });
    } catch (error) {
      throw error;
    }
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
