// src/features/notifications/api.js
import supabase from "@/lib/supabaseClient";

/* ---------- small util ---------- */
async function getUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/* ---------- prefs ---------- */
export async function getNotificationPrefs() {
  try {
    const rpc = await supabase.rpc("rpc_notification_prefs_get");
    if (!rpc.error) return rpc.data ?? null;
  } catch {}
  try {
    const uid = await getUserId();
    if (!uid) return null;
    const { data } = await supabase
      .from("notification_prefs")
      .select("*")
      .or(`user_id.eq.${uid},uid.eq.${uid}`)
      .maybeSingle();
    return data ?? null;
  } catch {}
  return null;
}

export async function ensureNotificationPrefs() {
  try {
    const rpc = await supabase.rpc("rpc_notification_prefs_ensure");
    if (!rpc.error) return rpc.data ?? true;
  } catch {}
  try {
    const uid = await getUserId();
    if (!uid) return false;
    await supabase
      .from("notification_prefs")
      .upsert([{ user_id: uid }], { onConflict: "user_id" });
    return true;
  } catch {}
  return false;
}

export async function updateNotificationPrefs(patch = {}) {
  try {
    const rpc = await supabase.rpc("rpc_notification_prefs_update", { p_patch: patch });
    if (!rpc.error) return rpc.data ?? patch;
  } catch {}
  try {
    const uid = await getUserId();
    if (!uid) return patch;
    const { data } = await supabase
      .from("notification_prefs")
      .upsert([{ user_id: uid, ...patch }], { onConflict: "user_id" })
      .select("*")
      .maybeSingle();
    return data ?? patch;
  } catch {}
  return patch;
}

/* ---------- counts & lists ---------- */
export async function getUnreadCount() {
  const { data, error } = await supabase.rpc("rpc_get_unread_count");
  if (error) throw error;
  return Number(data || 0);
}
// back-compat alias expected by hooks.js
export const unreadCount = getUnreadCount;

export async function listNotifications({ limit = 10 } = {}) {
  const { data, error } = await supabase.rpc("rpc_get_notifications", { p_limit: limit });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
// back-compat alias expected by hooks.js
export const fetchNotifications = listNotifications;

/* ---------- mutations on notifications ---------- */
export async function markAllRead() {
  const { error } = await supabase.rpc("rpc_mark_all_notifications_read");
  if (error) throw error;
  return true;
}

export async function markAsRead(notificationId) {
  if (!notificationId) return false;
  const { error } = await supabase.rpc("rpc_mark_notification_read", { p_notification_id: String(notificationId) });
  if (error) throw error;
  return true;
}

/* ---------- convenience flags used by hooks ---------- */
export async function isDndActive() {
  const p = (await getNotificationPrefs()) || {};
  if (p.dnd_until) return new Date(p.dnd_until).getTime() > Date.now();
  return !!p.dnd;
}

export async function isSnoozed() {
  const p = (await getNotificationPrefs()) || {};
  const raw = p.snooze_until ?? p.dnd_until ?? null;
  return raw ? new Date(raw).getTime() > Date.now() : false;
}

/* ---------- default export for convenience ---------- */
export default {
  getNotificationPrefs,
  ensureNotificationPrefs,
  updateNotificationPrefs,
  getUnreadCount,
  unreadCount,
  listNotifications,
  fetchNotifications,
  markAllRead,
  markAsRead,
  isDndActive,
  isSnoozed,
};

export { markRead } from "@/lib/services/notificationsService";

