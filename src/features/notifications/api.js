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
  try {
    const rpc = await supabase.rpc("rpc_notification_prefs_get");
    if (!rpc.error) return rpc.data ?? null;
  } catch {
    // Fall back to direct table reads when the RPC is unavailable.
  }
  try {
    const uid = await getUserId();
    if (!uid) return null;
    const { data } = await supabase
      .from("notification_prefs")
      .select("*")
      .or(`user_id.eq.${uid},uid.eq.${uid}`)
      .maybeSingle();
    return data ?? null;
  } catch {
    // Notification preferences are optional; callers handle null.
  }
  return null;
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
