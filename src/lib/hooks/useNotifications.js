// src/lib/hooks/useNotifications.js
import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from "@/lib/services/notificationsService";

export function useNotifications({ unreadOnly = false, pageSize = 25 } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [before, setBefore] = useState(null); // for "load more"

  const refreshCounts = useCallback(async () => {
    try {
      const n = await getUnreadCount();
      setUnreadCount(n || 0);
    } catch (e) {
      // swallow; bell can still render
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const rows = await listNotifications({ unreadOnly, limit: pageSize });
      setItems(rows);
      await refreshCounts();
    } catch (e) {
      setErr(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, pageSize, refreshCounts]);

  const loadMore = useCallback(async () => {
    try {
      const last = items[items.length - 1];
      if (!last) return;
      const rows = await listNotifications({
        unreadOnly,
        limit: pageSize,
        before: last.created_at,
      });
      setItems((s) => [...s, ...(rows || [])]);
      if (rows?.length) setBefore(rows[rows.length - 1]?.created_at || null);
    } catch {
      // ignore
    }
  }, [items, unreadOnly, pageSize]);

  const onMarkRead = useCallback(async (id) => {
    await markRead(id);
    setItems((s) => s.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await refreshCounts();
  }, [refreshCounts]);

  const onMarkAll = useCallback(async () => {
    await markAllRead();
    setItems((s) => s.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    items, unreadCount, loading, err,
    refresh, loadMore,
    markRead: onMarkRead,
    markAllRead: onMarkAll,
  };
}
