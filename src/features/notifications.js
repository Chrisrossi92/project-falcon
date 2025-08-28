// src/features/notifications.js
import supabase from '@/lib/supabaseClient';

// NotificationRow and UserPref types removed

export async function fetchNotifications(limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, order_id, action, priority, link_path, payload, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markAsRead(ids) {
  if (!ids?.length) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids);
  if (error) throw error;
}

export async function markAllRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw error;
}

export async function unreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

// Load current user's notification prefs (in-app + email + meta)
export async function getNotificationPrefs(userId) {
  const params = userId ? { p_user_id: userId } : {};
  // ...existing code...
}
