import { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";
import { useSession } from "@/lib/hooks/useSession";

export function useOrders() {
  const { user } = useSession(); // don't gate on isAdmin here; RLS handles visibility
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: rows, error: err } = await supabase
      .from("orders")
      .select(`
        *,
        client:client_id ( name ),
        appraiser:appraiser_id ( id, display_name, name, email )
      `)
      .order("created_at", { ascending: false });

    if (err) {
      console.error("[useOrders] select error:", err);
      setError(err);
      setData([]);
    } else {
      const mapped = (rows || []).map((r) => ({
        ...r,
        client_name: r.client?.name ?? r.client_name ?? "—",
        appraiser_name: r.appraiser?.display_name || r.appraiser?.name || "—",
      }));
      setData(mapped);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    // Realtime: whenever orders change, refetch the list
    const channel = supabase
      .channel("orders:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, [fetchOrders]);

  return { data, loading, error, refetch: fetchOrders };
}

