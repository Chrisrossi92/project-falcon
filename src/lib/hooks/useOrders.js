// src/lib/hooks/useOrders.js
import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { fetchOrders } from "@/lib/services/ordersService";
import { useSession } from "@/lib/hooks/useSession";

/**
 * Loads orders and auto-refreshes on realtime changes.
 * For appraisers, returns only their orders.
 */
export function useOrders() {
  const { user, isAdmin, isReviewer } = useSession();
  const uid = user?.id || null;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const rows = await fetchOrders();
      setData(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setErr(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // Client-side scope for MVP
  const scoped = useMemo(() => {
    if (!uid) return data;
    if (isAdmin || isReviewer) return data;
    // appraiser → only orders assigned to them
    return data.filter((o) => String(o.appraiser_id || "") === String(uid));
  }, [data, uid, isAdmin, isReviewer]);

  return { data: scoped, loading, error, refetch: load };
}







