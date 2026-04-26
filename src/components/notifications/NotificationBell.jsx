import { useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react";
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

  const typeStyleFor = (n) => {
    const type = String(n?.type || n?.category || "").toLowerCase();
    const title = String(n?.title || "").toLowerCase();
    const priority = String(n?.priority || n?.payload?.priority || "").toLowerCase();
    const value = `${type} ${title} ${priority}`;

    if (/(overdue|critical|urgent|past_due)/.test(value)) {
      return { label: "Critical", badge: "bg-red-50 text-red-700 border-red-200", accent: "border-l-red-500" };
    }
    if (/(revision|request|action|needed|sent_back|review)/.test(value)) {
      return { label: "Action needed", badge: "bg-orange-50 text-orange-700 border-orange-200", accent: "border-l-orange-500" };
    }
    if (/(assign|assigned|new_assigned|new order|new_order)/.test(value)) {
      return { label: "Assignment", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", accent: "border-l-emerald-500" };
    }
    if (/(system|admin|lock|policy)/.test(value)) {
      return { label: "System", badge: "bg-violet-50 text-violet-700 border-violet-200", accent: "border-l-violet-500" };
    }
    return { label: "Communication", badge: "bg-blue-50 text-blue-700 border-blue-200", accent: "border-l-blue-500" };
  };

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

  const openOrder = (n) => {
    if (!n) return;
    if (n.link_path) {
      navigate(n.link_path);
    } else if (n.order_id) {
      navigate(`/orders/${n.order_id}`);
    }
    setOpen(false);
  };

  const openActivity = () => {
    navigate("/activity");
    setOpen(false);
  };

  const markOneRead = async (n) => {
    if (!n?.id || n.read_at) return;
    setError(null);
    const { error } = await supabase.rpc("rpc_mark_notification_read", { p_notification_id: n.id });
    if (error) {
      console.error("markOneRead error", error);
      setError(error);
      return;
    }
    await loadNotifications();
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

  const bodyFor = (n) => n?.body || n?.message || n?.payload?.message || "";

  const priorityFor = (n) => n?.priority || n?.payload?.priority || null;

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
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
        onClick={() => handleOpenChange(!open)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[420px] max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-hidden bg-white border rounded-lg shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <div>
              <h3 className="font-semibold text-sm text-slate-950">Notification Center</h3>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={markAllRead}
                disabled={markingAllRead}
                title="Mark all seen"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {markingAllRead ? "Marking..." : "Mark all seen"}
              </button>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-700 hover:bg-slate-50"
                onClick={loadNotifications}
                title="Refresh"
                aria-label="Refresh notifications"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="max-h-[calc(70vh-58px)] overflow-y-auto p-2">
            {loading && (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && error && (
              <div className="p-3 text-sm text-rose-600">Failed to load notifications.</div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">No notifications yet.</div>
            )}
            {!loading &&
              !error &&
              items.length > 0 &&
              items.map((n) => {
                const style = typeStyleFor(n);
                const orderLabel = orderLabelFor(n);
                const priority = priorityFor(n);
                const body = bodyFor(n);
                const isUnread = !n.read_at;

                return (
                  <article
                    key={n.id}
                    className={`mb-2 rounded-md border border-l-4 p-3 text-sm transition ${
                      isUnread
                        ? `bg-white shadow-sm ${style.accent}`
                        : "border-l-slate-200 border-slate-200 bg-slate-50/70 text-slate-500"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isUnread && (
                            <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />
                          )}
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              isUnread ? style.badge : "border-slate-200 bg-slate-100 text-slate-500"
                            }`}
                          >
                            {style.label}
                          </span>
                          {priority && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                isUnread
                                  ? "border-slate-200 bg-slate-50 text-slate-600"
                                  : "border-slate-200 bg-slate-100 text-slate-500"
                              }`}
                            >
                              {priority}
                            </span>
                          )}
                          {!isUnread && (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                              Seen
                            </span>
                          )}
                        </div>
                        <h4 className={`mt-2 text-sm leading-5 ${isUnread ? "font-semibold text-slate-950" : "font-medium text-slate-600"}`}>
                          {titleFor(n)}
                        </h4>
                      </div>
                      {isUnread && (
                        <button
                          type="button"
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          onClick={() => markOneRead(n)}
                          title="Mark seen"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Mark seen
                        </button>
                      )}
                    </div>

                    {body && (
                      <p className={`mt-1 text-xs leading-5 ${isUnread ? "text-slate-600" : "text-slate-500"}`}>
                        {body}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      {orderLabel ? (
                        <button
                          type="button"
                          className={`text-xs font-bold underline underline-offset-2 hover:text-slate-700 ${
                            isUnread ? "text-slate-950" : "text-slate-500"
                          }`}
                          onClick={() => openOrder(n)}
                        >
                          {orderLabel}
                        </button>
                      ) : (
                        <span />
                      )}
                      {n.created_at && (
                        <time className="text-[11px] text-slate-500" dateTime={n.created_at}>
                          {formatTimestamp(n.created_at)}
                        </time>
                      )}
                    </div>
                  </article>
                );
              })}
          </div>
          <div className="border-t bg-slate-50 px-3 py-2">
            <button
              type="button"
              className="text-xs font-medium text-slate-600 hover:text-slate-950"
              onClick={openActivity}
            >
              View all activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
