// src/features/notifications/hooks.ts
import { useCallback, useEffect, useState } from "react";
import {
  fetchNotifications,
  unreadCount as unreadCountApi,
  markAsRead,
  markAllRead,
  getNotificationPrefs,
  updateNotificationPrefs,
  isDndActive as isDndActiveApi,
  isSnoozed as isSnoozedApi,
} from "./api";
import type { Notification, NotificationPrefs } from "./api";

export function useUnreadCount(pollMs = 30000) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const n = await unreadCountApi();
      setCount(Number(n || 0));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (pollMs > 0) {
      const t = setInterval(load, pollMs);
      return () => clearInterval(t);
    }
  }, [load, pollMs]);

  return { count, loading, err, refresh: load };
}

export function useNotificationsList(opts?: {
  category?: string;
  is_read?: boolean;
  limit?: number;
}) {
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const list = await fetchNotifications(opts);
      setRows(list);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [opts?.category, opts?.is_read, opts?.limit]);

  useEffect(() => {
    load();
  }, [load]);

  const markOneRead = useCallback(async (id: string) => {
    await markAsRead(id);
    await load();
  }, [load]);

  const markAll = useCallback(async () => {
    await markAllRead();
    await load();
  }, [load]);

  return { rows, loading, err, refresh: load, markOneRead, markAll };
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const p = await getNotificationPrefs();
      setPrefs(p);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (patch: Partial<NotificationPrefs>) => {
    const updated = await updateNotificationPrefs(patch);
    setPrefs(updated);
    return updated;
  }, []);

  const isDndActive = useCallback(async () => {
    try {
      return await isDndActiveApi();
    } catch {
      return false;
    }
  }, []);

  const isSnoozed = useCallback(async () => {
    try {
      return await isSnoozedApi();
    } catch {
      return false;
    }
  }, []);

  return { prefs, loading, err, refresh: load, save, isDndActive, isSnoozed };
}
