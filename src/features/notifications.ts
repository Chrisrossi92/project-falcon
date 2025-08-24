// src/features/notifications.ts
import supabase from '@/lib/supabaseClient';

export type NotificationRow = {
  id: string;
  order_id: string | null;
  action: string | null;
  priority: 'critical' | 'standard' | 'quiet' | null;
  link_path: string | null;
  payload: any | null; // { by?, assignee_id?, when?, review_due?, final_due? }
  is_read: boolean;
  created_at: string;
};

export type UserPref = {
  type: string;            // e.g. 'site_visit_set', 'status_changed', 'self_actions', 'dnd', 'snooze'
  channel: 'in_app' | 'email';
  enabled: boolean;
  meta?: any | null;       // e.g. { start: '22:00', end: '07:00' } or { until: ISOString }
};

export async function fetchNotifications(limit = 50): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, order_id, action, priority, link_path, payload, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markAsRead(ids: string[]): Promise<void> {
  if (!ids?.length) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw error;
}

export async function unreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

/** Load current user's notification prefs (in-app + email + meta) */
export async function getNotificationPrefs(userId?: string): Promise<UserPref[]> {
  const params = userId ? { p_user_id: userId } : {};
  const { data, error } = await supabase.rpc('rpc_get_notification_prefs_v1', params);
  if (error) throw error;
  return (data ?? []) as UserPref[];
}

/** Set Snooze for N hours from now (in-app) */
export async function setSnooze(userId: string, hours = 1): Promise<string> {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.rpc('rpc_set_notification_pref_v1', {
    p_user_id: userId,
    p_type: 'snooze',
    p_channel: 'in_app',
    p_enabled: true,
    p_meta: { until },
  });
  if (error) throw error;
  return until;
}

/** Clear Snooze (in-app) */
export async function clearSnooze(userId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_set_notification_pref_v1', {
    p_user_id: userId,
    p_type: 'snooze',
    p_channel: 'in_app',
    p_enabled: false,
    p_meta: null,
  });
  if (error) throw error;
}

/** Helpers to interpret DND + Snooze from prefs */
export function getDndWindow(prefs: UserPref[]): { start?: string; end?: string; enabled: boolean } {
  const dnd = prefs.find(p => p.type === 'dnd' && p.channel === 'in_app');
  return {
    enabled: !!dnd?.enabled && !!dnd?.meta,
    start: dnd?.meta?.start,
    end: dnd?.meta?.end,
  };
}

export function getSnoozeUntil(prefs: UserPref[]): Date | null {
  const s = prefs.find(p => p.type === 'snooze' && p.channel === 'in_app' && p.enabled && p.meta?.until);
  if (!s) return null;
  const d = new Date(s.meta.until);
  return isNaN(d.getTime()) ? null : d;
}

/** True if now is inside the DND window (local time HH:MM) */
export function isDndActive(prefs: UserPref[], now: Date = new Date()): boolean {
  const dnd = getDndWindow(prefs);
  if (!dnd.enabled || !dnd.start || !dnd.end) return false;
  const [sh, sm] = dnd.start.split(':').map(Number);
  const [eh, em] = dnd.end.split(':').map(Number);
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return false;

  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  // Handles windows that cross midnight (e.g., 22:00–07:00)
  if (startMinutes <= endMinutes) {
    return curMinutes >= startMinutes && curMinutes < endMinutes;
  } else {
    return curMinutes >= startMinutes || curMinutes < endMinutes;
  }
}

/** True if the Snooze 'until' time is in the future */
export function isSnoozed(prefs: UserPref[], now: Date = new Date()): boolean {
  const until = getSnoozeUntil(prefs);
  return !!(until && until.getTime() > now.getTime());
}







