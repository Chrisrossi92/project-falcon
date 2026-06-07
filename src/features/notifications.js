// src/features/notifications.js
import supabase from '@/lib/supabaseClient';
import { notificationRpcScopeParams } from "@/lib/notifications/notificationWorkspaceScope";

// NotificationRow and UserPref types removed

export async function fetchNotifications(limit = 50, operationsScope = null) {
  const { data, error } = await supabase.rpc("rpc_get_notifications", {
    p_limit: limit,
    ...notificationRpcScopeParams(operationsScope),
  });
  if (error) throw error;
  return data || [];
}

export async function markAsRead(ids) {
  if (!ids?.length) return;
  for (const id of ids) {
    const { error } = await supabase.rpc("rpc_mark_notification_read", { p_notification_id: id });
    if (error) throw error;
  }
}

export async function markAllRead(operationsScope = null) {
  const { error } = await supabase.rpc("rpc_mark_all_notifications_read", notificationRpcScopeParams(operationsScope));
  if (error) throw error;
}

export async function unreadCount(operationsScope = null) {
  const { data, error } = await supabase.rpc("rpc_get_unread_count", notificationRpcScopeParams(operationsScope));
  if (error) throw error;
  return Number(data || 0);
}

// Load current user's notification prefs (in-app + email + meta)
export async function getNotificationPrefs(userId) {
  const params = userId ? { p_user_id: userId } : {};
  // ...existing code...
}
