import { useState } from "react";
import { useNotifications } from "@/lib/hooks/useNotifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, loading, markRead, refresh } = useNotifications({ pollMs: 15000 });

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-xl border"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[60vh] overflow-auto bg-white border rounded-xl shadow-lg p-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Notification Center</h3>
            <button className="text-sm underline" onClick={refresh}>
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No notifications.</div>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`p-2 rounded-lg border ${n.is_read ? "bg-white" : "bg-blue-50"}`}
                >
                  <div className="text-sm font-medium">{n.title || n.event}</div>
                  {n.body && <div className="text-xs text-gray-600">{n.body}</div>}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <a
                      className="text-xs underline"
                      href={`/orders/${n.target_id}`}
                      onClick={() => setOpen(false)}
                    >
                      View order
                    </a>
                    {!n.is_read && (
                      <button
                        className="text-xs underline"
                        onClick={() => markRead(n.id)}
                      >
                        Mark read
                      </button>
                    )}
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










