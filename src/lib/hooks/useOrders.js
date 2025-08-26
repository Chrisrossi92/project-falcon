// src/lib/hooks/useOrders.js
import { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";
import { fetchOrdersList } from "@/lib/services/ordersService";

/** Orders hook via service layer (SSOT). */
export function useOrders() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchOrdersList();
      setData(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Realtime refresh on any orders change
  useEffect(() => {
    const channel = supabase
      .channel("orders:realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();
    return () => { try { channel.unsubscribe(); } catch {} };
  }, [fetchOrders]);

  return { data, loading, error, refetch: fetchOrders };
}

export default useOrders;





