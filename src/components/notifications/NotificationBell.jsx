import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import useSession from "@/lib/hooks/useSession";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { session } = useSession() || {};
  const userId = session?.user?.id || null;
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const channelName = useMemo(() => (userId ? `notif:${userId}` : null), [userId]);

  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("rpc_get_notifications", { p_limit: 20 });
    if (error) {
      console.error("loadNotifications error", error);
      setError(error);
      setItems([]);
      setUnreadCount(0);
    } else {
      setItems(data || []);
      setUnreadCount((data || []).filter((n) => !n.read_at).length);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleNotificationClick = async (n) => {
    if (!n) return;
    if (!n.read_at) {
      await supabase.rpc("rpc_mark_notification_read", { p_notification_id: n.id });
    }
    if (n.link_path) {
      navigate(n.link_path);
    } else if (n.order_id) {
      navigate(`/orders/${n.order_id}`);
    }
    loadNotifications();
    setOpen(false);
  };

  const markAllRead = async () => {
    if (!userId) return;
    const { error } = await supabase.rpc("rpc_mark_all_notifications_read");
    if (error) {
      console.error("markAllRead error", error);
      return;
    }
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleOpenChange = async (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      await loadNotifications();
      await markAllRead();
    }
  };

  useEffect(() => {
    if (!channelName) return;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          loadNotifications();
        }
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [channelName, userId]);

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-xl border"
        onClick={() => handleOpenChange(!open)}
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
            <button className="text-sm underline" onClick={loadNotifications}>
              Refresh
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && error && (
              <div className="p-3 text-sm text-rose-600">Failed to load notifications.</div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">No notifications.</div>
            )}
            {!loading &&
              !error &&
              items.length > 0 &&
              items.map((n) => (
                <button
                  key={n.id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                    n.read_at ? "opacity-60" : ""
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="font-medium">{n.title || n.type || "Notification"}</div>
                  {n.body && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {n.body}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}






