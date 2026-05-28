// src/components/activity/ActivityNoteForm.jsx
import React, { useState } from "react";
import supabase from "@/lib/supabaseClient";
import { logNote } from "@/lib/services/activityService";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";

const GENERIC_USER_NAMES = new Set(["user", "demo user"]);

function deriveActorRole(context) {
  if (context?.is_owner) return "owner";
  if (context?.is_admin_role) return "admin";
  if (context?.is_reviewer_role) return "reviewer";
  if (context?.is_appraiser_role) return "appraiser";
  return String(context?.primary_role_key || context?.role_keys?.[0] || "").toLowerCase() || null;
}

export default function ActivityNoteForm({ orderId, onSaved }) {
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

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!msg.trim()) return;
    const message = msg.trim();
    try {
      setBusy(true); setErr(null);
      const actor = await resolveActorMetadata();
      await logNote(orderId, message, { actor });
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
