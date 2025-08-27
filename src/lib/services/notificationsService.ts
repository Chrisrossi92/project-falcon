// src/lib/services/notificationsService.ts
import supabase from "@/lib/supabaseClient";
import rpcFirst, { RpcResult } from "@/lib/utils/rpcFirst";

/**
 * Types — extend if you add columns later
 */
export type Notification = {
  id: string;
  user_id: string;
  category?: string | null;
  title?: string | null;
  body?: string | null;
  order_id?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
};

export type NotificationPrefs = {
  user_id: string;
  dnd_until?: string | null;
  snooze_until?: string | null;
  email_enabled?: boolean | null;
  push_enabled?: boolean | null;
  categories?: Record<string, boolean> | null;
  updated_at?: string | null;
};

const nowIso = () => new Date().toISOString();

/** Normalize Supabase responses into RpcResult<T> for TS */
function asResult<T>(data: T | null, error: any | null): RpcResult<T> {
  return { data, error };
}

/**
 * Fetch notifications for the current user.
 * Optional filters (category, is_read, limit, before/after).
 * RPC preferred: rpc_notifications_list(category, is_read, page_limit, before, after)
 */
export async function fetchNotifications(opts?: {
  category?: string;
  is_read?: boolean;
  limit?: number;
  before?: string; // ISO
  after?: string;  // ISO
}): Promise<Notification[]> {
  const category = opts?.category ?? null;
  const is_read = typeof opts?.is_read === "boolean" ? opts?.is_read : null;
  const page_limit = opts?.limit ?? 50;
  const before = opts?.before ?? null;
  const after = opts?.after ?? null;

  const { data, error } = await rpcFirst<Notification[]>(
    () =>
      supabase.rpc("rpc_notifications_list", {
        category,
        is_read,
        page_limit,
        before,
        after,
      }) as unknown as Promise<RpcResult<Notification[]>>,
    async () => {
      let q = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(page_limit);

      if (category) q = q.eq("category", category);
      if (is_read !== null) q = q.eq("is_read", is_read);
      if (before) q = q.lt("created_at", before);
      if (after) q = q.gt("created_at", after);

      const { data: rows, error: err } = await q;
      return asResult((rows || []) as Notification[], err);
    }
  );

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Unread count for current user.
 * RPC preferred: rpc_notifications_unread_count()
 */
export async function unreadCount(): Promise<number> {
  const { data, error } = await rpcFirst<number>(
    () =>
      supabase.rpc("rpc_notifications_unread_count") as unknown as Promise<RpcResult<number>>,
    async () => {
      const { count, error: err } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return asResult((count ?? 0) as number, err);
    }
  );
  if (error) throw error;
  return (data ?? 0) as number;
}

/**
 * Mark one or more notifications as read.
 * RPC preferred: rpc_notifications_mark_read(ids uuid[])
 */
export async function markAsRead(ids: string | string[]): Promise<void> {
  const arr = Array.isArray(ids) ? ids : [ids];
  if (arr.length === 0) return;

  const { error } = await rpcFirst<void>(
    () =>
      supabase.rpc("rpc_notifications_mark_read", { ids: arr }) as unknown as Promise<RpcResult<void>>,
    async () => {
      const { error: err } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: nowIso() })
        .in("id", arr);
      return asResult<void>(null, err);
    }
  );
  if (error) throw error;
}

/**
 * Mark all notifications as read for current user.
 * RPC preferred: rpc_notifications_mark_all_read()
 */
export async function markAllRead(): Promise<void> {
  const { error } = await rpcFirst<void>(
    () =>
      supabase.rpc("rpc_notifications_mark_all_read") as unknown as Promise<RpcResult<void>>,
    async () => {
      const { error: err } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: nowIso() })
        .eq("is_read", false);
      return asResult<void>(null, err);
    }
  );
  if (error) throw error;
}

/**
 * Get notification preferences for current user.
 * RPC preferred: rpc_notification_prefs_get()
 */
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const { data, error } = await rpcFirst<NotificationPrefs>(
    () =>
      supabase.rpc("rpc_notification_prefs_get") as unknown as Promise<RpcResult<NotificationPrefs>>,
    async () => {
      const { data: row, error: err } = await supabase
        .from("notification_prefs")
        .select("*")
        .single();
      return asResult((row || null) as NotificationPrefs | null, err);
    }
  );
  if (error) throw error;
  return (data as NotificationPrefs) ?? ({} as NotificationPrefs);
}

/**
 * Upsert notification preferences (partial patch).
 * RPC preferred: rpc_notification_prefs_update(patch jsonb)
 */
export async function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>
): Promise<NotificationPrefs> {
  const safePatch = { ...patch, updated_at: nowIso() };

  const { data, error } = await rpcFirst<NotificationPrefs>(
    () =>
      supabase.rpc("rpc_notification_prefs_update", { patch: safePatch }) as unknown as Promise<RpcResult<NotificationPrefs>>,
    async () => {
      const { data: row, error: err } = await supabase
        .from("notification_prefs")
        .upsert(safePatch as Record<string, unknown>, { onConflict: "user_id" })
        .select("*")
        .single();
      return asResult((row || null) as NotificationPrefs | null, err);
    }
  );

  if (error) throw error;
  return (data as NotificationPrefs) ?? ({} as NotificationPrefs);
}

/** DND helpers */
export async function isDndActive(): Promise<boolean> {
  const prefs = await getNotificationPrefs();
  const until = prefs?.dnd_until ? new Date(prefs.dnd_until).getTime() : 0;
  return until > Date.now();
}

export async function setDndUntil(dndUntilIso: string): Promise<NotificationPrefs> {
  return updateNotificationPrefs({ dnd_until: dndUntilIso });
}

export async function clearDnd(): Promise<NotificationPrefs> {
  return updateNotificationPrefs({ dnd_until: null });
}

/** Snooze helpers */
export async function isSnoozed(): Promise<boolean> {
  const prefs = await getNotificationPrefs();
  const until = prefs?.snooze_until ? new Date(prefs.snooze_until).getTime() : 0;
  return until > Date.now();
}

export async function setSnoozeUntil(snoozeUntilIso: string): Promise<NotificationPrefs> {
  return updateNotificationPrefs({ snooze_until: snoozeUntilIso });
}

export async function clearSnooze(): Promise<NotificationPrefs> {
  return updateNotificationPrefs({ snooze_until: null });
}

/**
 * Convenience creator for system notifications (client fallback).
 * RPC preferred: rpc_notification_create(patch jsonb)
 */
export async function createNotification(
  patch: Partial<Notification>
): Promise<Notification> {
  const safePatch: Partial<Notification> = {
    is_read: false,
    created_at: nowIso(),
    ...patch,
  };

  // inside updateNotificationPrefs fallback:
async () => {
  // 🔧 fetch uid for fallback upsert
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id ?? null;

  const upsertPatch: any = { ...safePatch };
  if (uid) upsertPatch.user_id = uid;   // ensure NOT NULL

  const { data: row, error: err } = await supabase
    .from("notification_prefs")
    .upsert(upsertPatch, { onConflict: "user_id" })
    .select("*")
    .single();
  return { data: row, error: err };
}


  const { data, error } = await rpcFirst<Notification>(
    () =>
      supabase.rpc("rpc_notification_create", { patch: safePatch }) as unknown as Promise<RpcResult<Notification>>,
    async () => {
      const { data: rows, error: err } = await supabase
        .from("notifications")
        .insert(safePatch as Record<string, unknown>)
        .select("*");
      const row = Array.isArray(rows) ? rows[0] : rows;
      return asResult((row || null) as Notification | null, err);
    }
  );

  if (error) throw error;
  return data as Notification;
}

