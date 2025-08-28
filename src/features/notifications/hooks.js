// src/features/notifications/hooks.js
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchNotifications,
  unreadCount as unreadCountApi,
  // legacy actions kept for consumers
  markAsRead,
  markAllRead,
  // prefs API (aliased in service for back-compat)
  getNotificationPrefs,
  updateNotificationPrefs,
  // optional legacy helpers
  isDndActive as isDndActiveApi,
  isSnoozed as isSnoozedApi,
} from "./api";

/**
 * Unread count with lightweight polling.
 */
export function useUnreadCount(pollMs = 30000) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const n = await unreadCountApi();
      setCount(Number(n || 0));
    } catch (e) {
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

/**
 * Paginated notifications list loader.
 */
export function useNotificationsList(opts) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const list = await fetchNotifications(opts);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [opts]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, err, refresh: load, markAsRead, markAllRead };
}

/**
 * Notification preferences hook (used by NotificationPrefsCard).
 * Exposes prefs object, save(update), refresh, and helper queries.
 */
export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const p = await getNotificationPrefs();
      setPrefs(p || {});
    } catch (e) {
      setErr(e?.message || String(e));
      setPrefs({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Save partial patch and merge locally for snappy UI
  const save = useCallback(async (patch = {}) => {
    const next = await updateNotificationPrefs(patch);
    // If API returns the full row, prefer it; otherwise merge
    setPrefs((prev) => (next && typeof next === "object" ? next : { ...(prev || {}), ...patch }));
    return next;
  }, []);

  // Helper functions (used by some consumers; also cheap to compute locally)
  const isDndActive = useCallback(async () => {
    // Prefer local derivation to avoid extra trips
    const p = prefs || (await getNotificationPrefs()) || {};
    if (p.dnd_until) return new Date(p.dnd_until).getTime() > Date.now();
    if (typeof p.dnd === "boolean") return p.dnd;
    try { return await isDndActiveApi(); } catch { return false; }
  }, [prefs]);

  const isSnoozed = useCallback(async () => {
    const p = prefs || (await getNotificationPrefs()) || {};
    const raw = p.snooze_until ?? p.dnd_until ?? null;
    if (!raw) return false;
    return new Date(raw).getTime() > Date.now();
  }, [prefs]);

  // Useful derived flags for immediate UI (no async await)
  const derived = useMemo(() => {
    const p = prefs || {};
    const dndNow = p.dnd_until ? new Date(p.dnd_until).getTime() > Date.now() : !!p.dnd;
    const snoozeNow = p.snooze_until ? new Date(p.snooze_until).getTime() > Date.now() : false;
    return { dndNow, snoozeNow };
  }, [prefs]);

  return {
    prefs,
    loading,
    err,
    refresh,
    save,
    // helpers (async)
    isDndActive,
    isSnoozed,
    // instant flags (optional — UI can use these too)
    dndNow: derived.dndNow,
    snoozeNow: derived.snoozeNow,
  };
}
