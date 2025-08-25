import { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";
import { useSession } from "@/lib/hooks/useSession";
import { fetchOrdersList } from "@/lib/services/ordersService";

/** Orders hook using the service layer (RPC/view-ready). */
export function useOrders() {
  const { user } = useSession(); // RLS governs visibility
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchOrdersList();
      setData(rows);
    } catch (err) {
      console.error("[useOrders] fetch error:", err);
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime: refresh list on any orders change
  useEffect(() => {
    const channel = supabase
      .channel("orders:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        fetchOrders
      )
      .subscribe();
    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, [fetchOrders]);

  return { data, loading, error, refetch: fetchOrders };
}

export default useOrders;



