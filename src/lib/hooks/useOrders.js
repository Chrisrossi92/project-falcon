// src/lib/hooks/useOrders.js
import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { listOrders, getOrder } from "@/lib/services/ordersService";

/* ------------------------ small debounce helper ------------------------ */
function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ============================== LIST HOOK ============================== */
/**
 * Unified orders list
 * - reads via ordersService.listOrders (v_orders_frontend)
 * - role scoping enforced by RLS
 * - lightweight realtime: refreshes on INSERT/UPDATE/DELETE to public.orders
 */
export function useOrders(initial = {}) {
  const [filters, setFilters] = useState({
    activeOnly: true,
    search: "",
    statusIn: [],
    clientId: null,
    appraiserId: null,
    from: "",
    to: "",
    page: 0,
    pageSize: 50,
    orderBy: "date_ordered",
    ascending: false,
    ...initial,
  });

  const debouncedSearch = useDebounce(filters.search, 350);
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState(null);

  const refreshLock = useRef(false);
  const refresh = async () => {
    try {
      setLoading(true);
      setErr(null);
      const { rows, count: c } = await listOrders({
        ...filters,
        search: debouncedSearch,
      });
      setData(rows || []);
      setCount(c || 0);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  // fetch on filter changes
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    filters.activeOnly,
    filters.statusIn.join("|"),
    filters.clientId,
    filters.appraiserId,
    filters.from,
    filters.to,
    filters.page,
    filters.pageSize,
    filters.orderBy,
    filters.ascending,
  ]);

  // realtime: refresh list after small debounce whenever orders change
  useEffect(() => {
    const chan = supabase
      .channel("orders:list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, schedule)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, schedule)
      .subscribe();

    let timer;
    function schedule() {
      if (refreshLock.current) return;
      refreshLock.current = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        refresh().finally(() => (refreshLock.current = false));
      }, 250);
    }

    return () => {
      clearTimeout(timer);
      try { supabase.removeChannel(chan); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((count || 0) / (filters.pageSize || 50))),
    [count, filters.pageSize]
  );

  return {
    data,
    count,
    loading,
    error,
    filters,
    setFilters,
    totalPages,
    refresh,
  };
}

/* ============================= DETAIL HOOK ============================= */
/**
 * Single order detail
 * - reads via ordersService.getOrder
 * - realtime: refresh on UPDATE/DELETE for this id
 * Returns: { data, loading, error, reload }
 */
export function useOrder(orderId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setErr] = useState(null);

  const reload = async () => {
    if (!orderId) { setData(null); setLoading(false); setErr(null); return; }
    try {
      setLoading(true);
      setErr(null);
      const row = await getOrder(orderId);
      setData(row || null);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [orderId]); // load on id change

  // realtime updates for this specific order id
  useEffect(() => {
    if (!orderId) return;
    const chan = supabase
      .channel(`orders:detail:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => reload()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => reload()
      )
      .subscribe();

    return () => { try { supabase.removeChannel(chan); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return { data, loading, error, reload };
}

// Optional alias if any legacy code expects a different name
export const useOrderById = useOrder;















