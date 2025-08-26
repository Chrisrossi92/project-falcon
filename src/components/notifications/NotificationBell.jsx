// src/components/NotificationBell.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/services/notificationsService";

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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const unreadCount = rows.filter((n) => !n.read_at).length;

  async function load(unreadOnly = false) {
    setLoading(true);
    const data = await listNotifications({ onlyUnread: unreadOnly, limit: 20 });
    setRows(data);
    setLoading(false);
  }

  function onGlobalClick(e) {
    if (!ref.current) return;
    if (!ref.current.contains(e.target)) setOpen(false);
  }

  useEffect(() => {
    document.addEventListener("click", onGlobalClick);
    return () => document.removeEventListener("click", onGlobalClick);
  }, []);

  useEffect(() => {
    if (open) load(false);
  }, [open]);

  async function openItem(n) {
    await markNotificationRead(n.id);
    setRows((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    if (n.order_id) navigate(`/orders/${n.order_id}`);
  }

  async function markAll() {
    await markAllNotificationsRead();
    setRows((cur) => cur.map((x) => ({ ...x, read_at: new Date().toISOString() })));
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
              onClick={markAll}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-600">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-3 text-sm text-gray-600">No notifications</div>
            ) : (
              rows.map((n) => (
                <button
                  key={n.id}
                  className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-gray-50 ${
                    n.read_at ? "opacity-70" : ""
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









