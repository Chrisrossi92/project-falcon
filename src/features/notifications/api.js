// src/features/notifications/api.js
import supabase from "@/lib/supabaseClient";

function notificationPrefsRpcError(action, error) {
  const details = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  const rpcUnavailable = error?.code === "42883"
    || error?.code === "PGRST202"
    || /rpc_notification_prefs|schema cache|does not exist|could not find/i.test(details);
  const message = rpcUnavailable
    ? `Notification preference ${action} is unavailable because the required RPC is not deployed.`
    : `Unable to ${action} notification preferences${details ? `: ${details}` : "."}`;
  const wrapped = new Error(message);
  wrapped.cause = error;
  return wrapped;
}

/* ---------- prefs ---------- */
export async function getNotificationPrefs() {
  const rpc = await supabase.rpc("rpc_notification_prefs_get");
  if (rpc.error) throw notificationPrefsRpcError("load", rpc.error);
  return rpc.data ?? null;
}

export async function ensureNotificationPrefs() {
  const rpc = await supabase.rpc("rpc_notification_prefs_ensure");
  if (rpc.error) throw notificationPrefsRpcError("initialization", rpc.error);
  return rpc.data ?? true;
}

export async function updateNotificationPrefs(patch = {}) {
  const rpc = await supabase.rpc("rpc_notification_prefs_update", { patch });
  if (rpc.error) throw notificationPrefsRpcError("update", rpc.error);
  return rpc.data ?? patch;
}

export async function getEffectiveNotificationPrefs() {
  const rpc = await supabase.rpc("rpc_current_user_notification_preferences_get");
  if (rpc.error) throw notificationPrefsRpcError("load", rpc.error);
  return Array.isArray(rpc.data) ? rpc.data : [];
}

export async function updateCurrentUserNotificationPreference({
  eventKey,
  channel,
  enabled,
  meta = null,
}) {
  const rpc = await supabase.rpc("rpc_current_user_notification_preference_update", {
    p_event_key: eventKey,
    p_channel: channel,
    p_enabled: !!enabled,
    p_meta: meta,
  });
  if (rpc.error) throw notificationPrefsRpcError("update", rpc.error);
  return Array.isArray(rpc.data) ? rpc.data[0] ?? null : rpc.data ?? null;
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
  getEffectiveNotificationPrefs,
  updateCurrentUserNotificationPreference,
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
