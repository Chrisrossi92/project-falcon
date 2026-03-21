// src/features/notifications/api.js
import supabase from "@/lib/supabaseClient";

/* ---------- prefs ---------- */
export async function getNotificationPrefs() {
  // Canonical path: prefs RPCs only.
  const { data, error } = await supabase.rpc("rpc_notification_prefs_get", { p_user_id: null });
  if (error) throw error;
  return data ?? null;
}

export async function ensureNotificationPrefs() {
  const { data, error } = await supabase.rpc("rpc_notification_prefs_ensure", { p_user_id: null });
  if (error) throw error;
  return data ?? true;
}

export async function updateNotificationPrefs(patch = {}) {
  const { data, error } = await supabase.rpc("rpc_notification_prefs_update", { p_patch: patch, p_user_id: null });
  if (error) throw error;
  return data ?? patch;
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
