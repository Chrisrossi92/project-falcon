// src/components/NotificationBell.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useUnreadCount,
  useNotificationsList,
  useNotificationPrefs,
} from "@/features/notifications/hooks";
import {
  markAsRead,
  markAllRead,
} from "@/features/notifications/api";

/** Format like “5m ago”, “2h ago”, or local datetime */
function timeago(ts) {
  try {
    const d = new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleString();
  } catch {
    return "";
  }
}

/** Defensive: treat either `n.is_read` or `n.read_at` as read-state */
function isRead(n) {
  if (typeof n?.is_read === "boolean") return n.is_read;
  return !!n?.read_at;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Live counts + list
  const { count, loading: loadingCount, refresh: refreshCount } = useUnreadCount(30000);
  const {
    rows,
    loading: loadingList,
    err,
    refresh: refreshList,
    markOneRead, // not used because we want to navigate immediately after
    markAll,
  } = useNotificationsList({ is_read: false, limit: 50 });

  // Prefs (future: DND/Snooze UI)
  const { prefs } = useNotificationPrefs();

  const unreadCount = loadingCount ? 0 : (count || 0);

  // Close dropdown when clicking outside
  const onGlobalClick = useCallback((e) => {
    if (!ref.current) return;
    if (!ref.current.contains(e.target)) setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("click", onGlobalClick);
    return () => document.removeEventListener("click", onGlobalClick);
  }, [onGlobalClick]);

  // When opened, load latest list
  useEffect(() => {
    if (open) refreshList();
  }, [open, refreshList]);

  async function openItem(n) {
    try {
      await markAsRead(n.id);
      await Promise.all([refreshList(), refreshCount()]);
      if (n.order_id) navigate(`/orders/${n.order_id}`);
    } catch {
      // ignore for now
    }
  }

  async function onMarkAll() {
    try {
      await markAllRead();
      await Promise.all([refreshList(), refreshCount()]);
    } catch {
      // ignore for now
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-medium">Notifications</div>
            <button
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              onClick={onMarkAll}
              disabled={unreadCount === 0 || loadingList}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            {loadingList ? (
              <div className="p-3 text-sm text-gray-600">Loading…</div>
            ) : err ? (
              <div className="p-3 text-sm text-red-600">{String(err)}</div>
            ) : !rows || rows.length === 0 ? (
              <div className="p-3 text-sm text-gray-600">No notifications</div>
            ) : (
              rows.map((n) => (
                <button
                  key={n.id}
                  className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 ${
                    isRead(n) ? "opacity-70" : ""
                  }`}
                  onClick={() => openItem(n)}
                >
                  <div className="text-sm font-medium">{n.title || n.action || "Update"}</div>
                  {n.body ? <div className="text-xs text-gray-600">{n.body}</div> : null}
                  <div className="text-[10px] text-gray-500 mt-1">{timeago(n.created_at)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}










