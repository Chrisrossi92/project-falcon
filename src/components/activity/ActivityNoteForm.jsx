// src/components/activity/ActivityNoteForm.jsx
import React, { useState } from "react";
import supabase from "@/lib/supabaseClient";
import { logNote } from "@/lib/services/activityService";
import { emitNotification } from "@/lib/services/notificationsService";
import { getCurrentUserProfile } from "@/lib/services/api";
import useRole from "@/lib/hooks/useRole";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { resolveOrderParticipants } from "@/lib/orders/resolveOrderParticipants";

const GENERIC_USER_NAMES = new Set(["user", "demo user"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ActivityNoteForm({ orderId, order = null, onSaved }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const { role, userId } = useRole() || {};
  const { user: currentUser } = useCurrentUser();

  function displayNameFromUser(user) {
    const fields = [user?.display_name, user?.full_name, user?.name, user?.email];
    return fields
      .map((value) => String(value || "").trim())
      .find((value) => value && !GENERIC_USER_NAMES.has(value.toLowerCase()));
  }

  function displayNameFromAuthUser(authUser) {
    const meta = authUser?.user_metadata || {};
    return displayNameFromUser({
      display_name: meta.display_name,
      full_name: meta.full_name,
      name: meta.name,
      email: authUser?.email,
    });
  }

  function isUuidLike(value) {
    return UUID_RE.test(String(value || ""));
  }

  function isShortIdLike(value) {
    const raw = String(value || "").trim();
    const id = String(order?.id || orderId || "").trim();
    return !!raw && !!id && raw === id.slice(0, 8);
  }

  function usableOrderNumber(value) {
    const raw = String(value || "").trim();
    if (!raw || isUuidLike(raw) || isShortIdLike(raw)) return null;
    return raw;
  }

  async function currentUserDisplayName() {
    const loadedName = displayNameFromUser(currentUser);
    if (loadedName) return loadedName;

    try {
      const profile = await getCurrentUserProfile();
      const profileName = displayNameFromUser(profile);
      if (profileName) return profileName;
    } catch {
      // Best-effort display fallback only; note logging/routing should continue.
    }

    try {
      const { data } = await supabase.auth.getUser();
      const authName = displayNameFromAuthUser(data?.user);
      if (authName) return authName;
    } catch {
      // Best-effort display fallback only; note logging/routing should continue.
    }

    return "User";
  }

  async function resolveOrderNumber() {
    const localOrderNumber = usableOrderNumber(order?.order_number || order?.order_no || order?.orderNumber);
    if (localOrderNumber) return localOrderNumber;

    const id = order?.id || orderId;
    if (!id) return null;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return usableOrderNumber(data?.order_number);
    } catch {
      return null;
    }
  }

  async function actorParticipantName(roleName) {
    if (roleName === "appraiser") return order?.appraiser_name || "Appraiser";
    if (roleName === "reviewer") return order?.reviewer_name || "Reviewer";
    return currentUserDisplayName();
  }

  function participantName(roleName) {
    if (roleName === "appraiser") return order?.appraiser_name || "Appraiser";
    if (roleName === "reviewer") return order?.reviewer_name || "Reviewer";
    if (roleName === "owner") return "Owner";
    if (roleName === "admin") return "Admin";
    return "User";
  }

  async function emitNoteNotification(message) {
    const resolved = resolveOrderParticipants(order, {
      actorUserId: userId,
      actorRole: role,
      event: "activity_note",
    });
    const actorRoleOnOrder = resolved.actor.roleOnOrder;
    const recipientUserId = resolved.recipients[0] || null;
    const recipientRoleOnOrder =
      recipientUserId && recipientUserId === order?.reviewer_id ? "reviewer" : "appraiser";
    const eventKey = actorRoleOnOrder === "appraiser" ? "note.appraiser_added" : "note.reviewer_added";
    const recipient = recipientUserId ? { userId: recipientUserId, role: recipientRoleOnOrder } : null;

    if (!eventKey || !recipient?.userId) {
      return;
    }

    if (resolved.suppressUserIds.includes(recipient.userId)) {
      return;
    }

    const orderNumber = await resolveOrderNumber();
    const actorName = await actorParticipantName(actorRoleOnOrder);
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
