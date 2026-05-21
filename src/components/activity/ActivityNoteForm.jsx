// src/components/activity/ActivityNoteForm.jsx
import React, { useState } from "react";
import supabase from "@/lib/supabaseClient";
import { logNote } from "@/lib/services/activityService";
import { emitNotification } from "@/lib/services/notificationsService";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";
import { resolveOrderParticipants } from "@/lib/orders/resolveOrderParticipants";

const GENERIC_USER_NAMES = new Set(["user", "demo user"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deriveActorRole(context) {
  if (context?.is_owner) return "owner";
  if (context?.is_admin_role) return "admin";
  if (context?.is_reviewer_role) return "reviewer";
  if (context?.is_appraiser_role) return "appraiser";
  return String(context?.primary_role_key || context?.role_keys?.[0] || "").toLowerCase() || null;
}

export default function ActivityNoteForm({ orderId, order = null, onSaved }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const { context: appContext } = useCurrentUserAppContext();
  const userId = appContext?.user_id || null;
  const role = deriveActorRole(appContext);

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
    const loadedName = displayNameFromUser(appContext);
    if (loadedName) return loadedName;

    try {
      const { data } = await supabase.auth.getUser();
      const authName = displayNameFromAuthUser(data?.user);
      if (authName) return authName;
    } catch {
      // Best-effort display fallback only; note logging/routing should continue.
    }

    return "User";
  }

  function currentUserEmail() {
    return appContext?.email || null;
  }

  async function resolveActorMetadata() {
    const name = await currentUserDisplayName();
    let email = currentUserEmail();

    if (!email) {
      try {
        const { data } = await supabase.auth.getUser();
        email = data?.user?.email || null;
      } catch {
        // Best-effort actor metadata only; note logging should continue.
      }
    }

    return {
      name,
      email,
      user_id: userId,
      role: role || null,
    };
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
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!msg.trim()) return;
    const message = msg.trim();
    try {
      setBusy(true); setErr(null);
      const actor = await resolveActorMetadata();
      await logNote(orderId, message, { actor });
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
    <form onSubmit={onSubmit} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Add a note</div>
      <div className="flex items-start gap-2">
        <textarea
          className="min-h-20 flex-1 resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
          rows={2}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a quick update for the activity log…"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={busy || !msg.trim()}
        >
          Post
        </button>
      </div>
      {err ? <div className="mt-2 text-xs text-red-600">{err}</div> : null}
    </form>
  );
}
