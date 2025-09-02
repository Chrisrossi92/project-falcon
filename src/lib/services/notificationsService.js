// src/lib/services/notificationsService.js
// RPC-first notifications service with safe table fallbacks.
// Plain JavaScript version. Includes back-compat shims for legacy call sites.

import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst";

// ---------- Helpers ----------
const clampRange = (offset, limit) => ({
  from: Math.max(0, offset),
  to: Math.max(0, offset + limit - 1),
});

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ---------- Public API ----------

/** Fetch paginated notifications (newest first). */
export async function fetchNotifications({ limit = 30, offset = 0 } = {}) {
  const { from, to } = clampRange(offset, limit);

  const res = await rpcFirst(
    () => supabase.rpc("rpc_fetch_notifications", { limit, offset }),
    async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      return { data, error };
    }
  );

  if (res.error) throw res.error;
  return res.data || [];
}

/** Get unread notifications count. */
export async function unreadCount() {
  const res = await rpcFirst(
    () => supabase.rpc("rpc_unread_notifications_count"),
    async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { head: true, count: "exact" })
        .eq("is_read", false);
      return { data: { count: count ?? 0 }, error };
    }
  );

  if (res.error) throw res.error;
  return Number(res.data?.count ?? 0);
}

/** Mark a single notification as read. */
export async function markRead(notificationId) {
  const res = await rpcFirst(
    () => supabase.rpc("rpc_mark_notification_read", { notification_id: notificationId }),
    async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      return { data: null, error };
    }
  );
  if (res.error) throw res.error;
}

/** Mark all notifications as read. */
export async function markAllRead() {
  const res = await rpcFirst(
    () => supabase.rpc("rpc_mark_all_notifications_read"),
    async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      return { data: null, error };
    }
  );
  if (res.error) throw res.error;
}

/** Get current user notification preferences. */
export async function getPrefs() {
  const res = await rpcFirst(
    () => supabase.rpc("rpc_get_notification_prefs"),
    async () => {
      const { data, error } = await supabase.from("notification_prefs").select("*").single();
      return { data, error };
    }
  );

  if (res.error) {
    const msg = String(res.error.message || "").toLowerCase();
    if (msg.includes("no rows") || msg.includes("single row")) return null;
    throw res.error;
  }
  return res.data || null;
}

/** Set (upsert) current user notification preferences. */
export async function setPrefs(patch = {}) {
  let payload = { ...patch };
  if (!("user_id" in patch)) {
    const uid = await getCurrentUserId();
    if (uid) payload.user_id = uid;
  }

  const res = await rpcFirst(
    () => supabase.rpc("rpc_set_notification_prefs", { patch: payload }),
    async () => {
      const { data, error } = await supabase
        .from("notification_prefs")
        .upsert(payload, { onConflict: "user_id" })
        .select("*")
        .single();
      return { data, error };
    }
  );

  if (res.error) throw res.error;
  return res.data;
}

/** Create a notification (fallback path; prefer server-generated). */
export async function createNotification(input = {}) {
  const safe = {
    category: "orders",
    title: "",
    body: "",
    is_read: false,
    created_at: new Date().toISOString(),
    ...input,
  };

  const res = await rpcFirst(
    () => supabase.rpc("rpc_create_notification", { payload: safe }),
    async () => {
      const { error } = await supabase.from("notifications").insert(safe);
      return { data: null, error };
    }
  );

  if (res.error) throw res.error;
}

/* ===========================
   Back-compat shims (legacy API)
   =========================== */

// Legacy naming for single-item read
export async function markAsRead(id) { return markRead(id); }

// Legacy prefs naming
export async function getNotificationPrefs() { return getPrefs(); }
export async function setNotificationPrefs(patch = {}) { return setPrefs(patch); }
export async function updateNotificationPrefs(patch = {}) { return setPrefs(patch); }

// DND helpers expected by older code
export async function isDndActive() {
  try {
    const prefs = await getPrefs();
    return !!(prefs && prefs.dnd);
  } catch { return false; }
}

export async function setDndActive(flag) {
  return setPrefs({ dnd: !!flag });
}

export async function toggleDnd() {
  const prefs = (await getPrefs()) || {};
  const next = !prefs.dnd;
  await setPrefs({ ...prefs, dnd: next });
  return next;
}

// DND until a specific ISO datetime; also supports Date/epoch
export async function setDndUntil(until) {
  let iso = null;
  if (until) {
    const d = new Date(until);
    if (!isNaN(+d)) iso = d.toISOString();
  }
  const patch = {
    dnd: iso ? true : false,
    dnd_until: iso,
    snooze_until: iso, // support older schemas that used snooze for DND
  };
  return setPrefs(patch);
}

export async function clearDnd() {
  return setPrefs({ dnd: false, dnd_until: null, snooze_until: null });
}

// Snooze helpers (some legacy code uses these names)
export async function isSnoozed() {
  try {
    const prefs = (await getPrefs()) || {};
    const raw = prefs.snooze_until ?? prefs.dnd_until ?? null;
    if (!raw) return false;
    return new Date(raw).getTime() > Date.now();
  } catch { return false; }
}

export async function setSnoozeUntil(until) {
  let iso = null;
  if (until) {
    const d = new Date(until);
    if (!isNaN(+d)) iso = d.toISOString();
  }
  return setPrefs({ snooze_until: iso });
}

export async function clearSnooze() {
  return setPrefs({ snooze_until: null });
}

// Optional getters if any code expects them
export async function getDndUntil() {
  const prefs = (await getPrefs()) || {};
  return prefs.dnd_until ?? prefs.snooze_until ?? null;
}

export async function clearDndUntil() {
  return setPrefs({ dnd_until: null, snooze_until: null });
}

