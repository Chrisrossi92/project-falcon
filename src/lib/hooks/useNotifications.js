import { useEffect, useRef, useState } from "react";
import { rpcGetNotifications, rpcMarkNotificationRead } from "@/lib/services/api";
import supabase from "@/lib/supabaseClient"; // default import works whether you also have named

export function useNotifications({ pollMs = 15000, enableRealtime = false } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const channelRef = useRef(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await rpcGetNotifications();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    await rpcMarkNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)));
  }

  useEffect(() => {
    refresh();
    if (pollMs > 0) timerRef.current = setInterval(refresh, pollMs);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [pollMs]);

  useEffect(() => {
    if (!enableRealtime) return;
    channelRef.current = supabase
      .channel("notif-center")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        refresh
      )
      .subscribe();
    return () => channelRef.current && supabase.removeChannel(channelRef.current);
  }, [enableRealtime]);

  const unreadCount = items.filter((n) => !n.read_at).length;
  return { items, unreadCount, loading, refresh, markRead };
}

// If you import it as default anywhere, keep this:
export default useNotifications;
