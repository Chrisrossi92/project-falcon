// src/components/notifications/NotificationBell.jsx
import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
} from "@/features/notifications/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [uid, setUid] = useState(null);

  async function refresh() {
    const [c, list] = await Promise.all([getUnreadCount(), listNotifications({ limit: 10 })]);
    setCount(c || 0);
    setItems(Array.isArray(list) ? list : []);
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUid(data?.user?.id ?? null);
      } catch {
        setUid(null);
      }
      await refresh();
    })();
  }, []);

  // Realtime subscription for this user
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [uid]);

  async function onToggle() {
    if (!open) await refresh();
    setOpen((v) => !v);
  }

  async function onMarkAll() {
    await markAllRead();
    await refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
        onClick={onToggle}
        aria-label="Notifications"
        title="Notifications"
      >
        🔔 {count > 0 ? <span className="ml-1 text-xs">({count})</span> : null}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow p-2 z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Notifications</div>
            <button
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
              onClick={onMarkAll}
            >
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-xs text-gray-500 p-2">No notifications.</div>
          ) : (
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="text-xs border rounded p-2">
                  <div className="font-medium truncate">{n.title || "Notification"}</div>
                  <div className="text-gray-600 line-clamp-2">{n.body || n.message || ""}</div>
                  <div className="text-gray-400 mt-1">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    {n.read_at ? " • read" : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}












