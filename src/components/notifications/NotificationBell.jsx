// src/features/notifications/NotificationBell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, Settings, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import {
  fetchNotifications,
  unreadCount as getUnreadCount,
  markRead,
  markAllRead,
  getPrefs,
  setPrefs,
} from "@/lib/services/notificationsService"; // TS file is fine to import in JS

/**
 * Minimal, dependency-light dropdown. If you have shadcn/ui Menu, you can swap easily.
 */
export default function NotificationBell() {
  const navigate = useNavigate?.() ?? ((path) => (window.location.href = path));
  const [open, setOpen] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [unread, setUnread] = useState(0);
  const [prefs, setLocalPrefs] = useState(null);
  const pollingRef = useRef(null);

  const load = async () => {
    try {
      setErr(null);
      setLoading(true);
      const [list, count, p] = await Promise.all([
        fetchNotifications({ limit: 30, offset: 0 }),
        getUnreadCount(),
        safeGetPrefs(),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setUnread(Number(count || 0));
      if (p) setLocalPrefs(p);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  const safeGetPrefs = async () => {
    try {
      return await getPrefs();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    load();

    // Polling (keeps badge fresh even if dropdown closed)
    if (!pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        try {
          const c = await getUnreadCount();
          setUnread(Number(c || 0));
        } catch {
          /* no-op */
        }
      }, 30000);
    }

    // Realtime: update on notifications table changes
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        async () => {
          // lightweight refresh: unread only
          try {
            const c = await getUnreadCount();
            setUnread(Number(c || 0));
          } catch {
            /* no-op */
          }
        }
      )
      .subscribe();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, []);

  const onOpenToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // hydrate full list when opening
      await load();
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (e) {
      setErr(e);
    }
  };

  const handleClickItem = async (n) => {
    try {
      if (!n?.is_read) {
        await markRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      }
      // Click-through behavior (MVP): go to order if present
      if (n?.order_id) {
        navigate(`/orders/${n.order_id}`);
        setOpen(false);
      }
    } catch (e) {
      setErr(e);
    }
  };

  const toggleDnd = async () => {
    // Simple example: flip a boolean flag in prefs
    const next = { ...(prefs || {}), dnd: !(prefs?.dnd ?? false) };
    try {
      await setPrefs(next);
      setLocalPrefs(next);
    } catch (e) {
      setErr(e);
    }
  };

  const unreadBadge = useMemo(() => {
    if (!unread || unread < 0) return null;
    const val = unread > 99 ? "99+" : String(unread);
    return (
      <span
        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] leading-[18px] text-white bg-red-600 text-center shadow"
        aria-label={`${val} unread notifications`}
      >
        {val}
      </span>
    );
  }, [unread]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpenToggle}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadBadge}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[360px] max-h-[70vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-2">
              <span className="font-medium">Notifications</span>
              {prefs?.dnd ? (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">DND</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-gray-100"
                onClick={handleMarkAll}
                title="Mark all as read"
              >
                <Check className="w-4 h-4" /> Mark all
              </button>
              <button
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-gray-100"
                onClick={toggleDnd}
                title="Toggle Do Not Disturb"
              >
                <Settings className="w-4 h-4" /> {prefs?.dnd ? "Disable DND" : "Enable DND"}
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : err ? (
              <div className="px-4 py-6 text-sm text-red-600">
                {err?.message || "Failed to load notifications."}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-600">No notifications.</div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClickItem(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                        n.is_read ? "opacity-70" : "opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {n.title || "Update"}
                          </div>
                          {n.body ? (
                            <div className="truncate text-sm text-gray-600">{n.body}</div>
                          ) : null}
                          {n.order_id ? (
                            <div className="text-xs text-gray-500 mt-0.5">Order: {n.order_id}</div>
                          ) : null}
                        </div>
                        {!n.is_read ? (
                          <span className="mt-0.5 shrink-0 w-2 h-2 rounded-full bg-blue-600" />
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}











