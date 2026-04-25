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
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const channelName = useMemo(() => (userId ? `notif:${userId}` : null), [userId]);
  const unreadItems = useMemo(() => items.filter((n) => !n.read_at), [items]);

  const formatTimestamp = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

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

  const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

  const shortOrderId = (value) => {
    const raw = String(value || "");
    return raw ? raw.slice(0, 8) : null;
  };

  const orderLabelFor = (n) => {
    const orderNumber = n?.payload?.order_number || n?.order_number || null;
    if (orderNumber && !isUuid(orderNumber)) return orderNumber;
    return shortOrderId(n?.order_id);
  };

  const titleFor = (n) => {
    if ((n?.type === "note.appraiser_added" || n?.type === "note.reviewer_added") && n?.payload?.actor?.name) {
      return `${n.payload.actor.name} added a note`;
    }
    return n?.title || n?.type || "Notification";
  };

  const markAllRead = async () => {
    if (!userId || markingAllRead) return;
    setMarkingAllRead(true);
    setError(null);
    const { error } = await supabase.rpc("rpc_mark_all_notifications_read");
    if (error) {
      console.error("markAllRead error", error);
      setError(error);
      setMarkingAllRead(false);
      return;
    }
    await loadNotifications();
    setMarkingAllRead(false);
  };

  const handleOpenChange = async (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen) {
      await loadNotifications();
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
            <div className="flex items-center gap-3">
              <button
                className="text-sm underline disabled:opacity-60"
                onClick={markAllRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? "Marking..." : "Mark all as read"}
              </button>
              <button className="text-sm underline" onClick={loadNotifications}>
                Refresh
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && error && (
              <div className="p-3 text-sm text-rose-600">Failed to load notifications.</div>
            )}
            {!loading && !error && unreadItems.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">All caught up.</div>
            )}
            {!loading &&
              !error &&
              unreadItems.length > 0 &&
              unreadItems.map((n) => (
                <div
                  key={n.id}
                  className={`w-full px-3 py-2 text-left text-sm ${
                    n.read_at ? "opacity-60" : ""
                  }`}
                >
                  <div className="font-medium">{titleFor(n)}</div>
                  {n.body && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {n.body}
                    </div>
                  )}
                  {orderLabelFor(n) && (
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-700"
                      onClick={() => handleNotificationClick(n)}
                    >
                      {orderLabelFor(n)}
                    </button>
                  )}
                  {n.created_at && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {formatTimestamp(n.created_at)}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}


