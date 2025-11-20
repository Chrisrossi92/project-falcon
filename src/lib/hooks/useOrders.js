// src/lib/hooks/useOrders.js
import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabaseClient";

/* Debounce helper */
function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ============================== LIST HOOK ============================== */
export function useOrders(initial = {}) {
  const [filters, setFilters] = useState({
    activeOnly: false,
    search: "",
    statusIn: [],            // expect UPPERCASE, e.g., ['IN_PROGRESS']
    clientId: null,
    appraiserId: null,
    from: "",                // ISO (created_at)
    to: "",
    dueWindow: "",           // "", "1","2","7","this_week","next_week","overdue"
    page: 0,
    pageSize: 15,
    orderBy: "order_number", // your actual column
    ascending: false,
    ...initial,
  });

const titleCase = (s) =>
    s.replace(/[_\s]+/g, " ")
     .toLowerCase()
     .replace(/\b\w/g, (m) => m.toUpperCase());

  const variants = new Set();
  for (const raw of filters.statusIn) {
    const up   = String(raw).toUpperCase();             // IN_PROGRESS
    const low  = String(raw).toLowerCase();             // in_progress
    const withSpaceUp  = up.replace(/_/g, " ");         // IN PROGRESS  (rare, but include)
    const withSpaceLow = low.replace(/_/g, " ");        // in progress
    const nice = titleCase(raw);                        // In Progress

    [up, low, withSpaceUp, withSpaceLow, nice].forEach((v) => variants.add(v));
  }

  const debouncedSearch = useDebounce(filters.search, 350);

  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState(null);

  // exactly the columns your table needs; alias to match UI code
  const SELECT = `
  id,
  order_no:order_number,
  status,
  client_name,
  appraiser_name,
  address, city, state, zip,
  property_type, report_type,
  fee_amount, base_fee, appraiser_fee,
  review_due_at, final_due_at, due_date,
  client_id, appraiser_id,
  created_at
`;

const fetchOrders = async () => {
  // use the view we just (re)created
  let q = supabase.from("v_orders_frontend_v3").select(SELECT, { count: "exact" });

    // Active only (exclude COMPLETE)
    if (filters.activeOnly) {
      q = q.neq("status", "COMPLETE");
    }

    // Status filter (array of UPPERCASE)
    if (filters.statusIn && filters.statusIn.length) {
      q = q.in("status", Array.from(variants));
}

    // Client/Appraiser filters (IDs)
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    if (filters.appraiserId) q = q.eq("appraiser_id", filters.appraiserId);

    // Created range
    if (filters.from) q = q.gte("created_at", filters.from);
    if (filters.to)   q = q.lte("created_at", filters.to);

    // Due windows (use final_due_at as primary)
    const today = new Date(); today.setHours(0,0,0,0);
    const startOfWeek = (d) => {
      const x = new Date(d); const day = x.getDay();
      x.setHours(0,0,0,0); x.setDate(x.getDate() - day);
      return x;
    };
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const iso = (d) => d.toISOString();

    if (filters.dueWindow) {
      if (filters.dueWindow === "overdue") {
        q = q.lt("final_due_at", iso(today));
      } else if (["1", "2", "7"].includes(filters.dueWindow)) {
        const end = addDays(today, Number(filters.dueWindow));
        q = q.gte("final_due_at", iso(today)).lte("final_due_at", iso(end));
      } else if (filters.dueWindow === "this_week") {
        const start = startOfWeek(today);
        const end = addDays(start, 6);
        q = q.gte("final_due_at", iso(start)).lte("final_due_at", iso(end));
      } else if (filters.dueWindow === "next_week") {
        const start = addDays(startOfWeek(today), 7);
        const end = addDays(start, 6);
        q = q.gte("final_due_at", iso(start)).lte("final_due_at", iso(end));
      }
    }

    // Search: order_number, title/address/city
    if (debouncedSearch) {
      const s = debouncedSearch.trim();
      if (/^\d+$/u.test(s)) {
        q = q.or(`order_number.ilike.${s}%`);
      } else {
        const like = `%${s}%`;
        q = q.or(`order_number.ilike.${like},title.ilike.${like},address.ilike.${like},city.ilike.${like}`);
      }
    }

    // Sort (map UI alias -> real column)
  const rawSort = filters.orderBy || "order_number";
  const sortCol = rawSort === "order_no" ? "order_number" : rawSort;
  q = q.order(sortCol, { ascending: !!filters.ascending, nullsFirst: false });


    // Paging
    const from = (filters.page || 0) * (filters.pageSize || 15);
    const to = from + (filters.pageSize || 15) - 1;
    q = q.range(from, to);

     const { data, count, error } = await q;
  if (error) throw error;
  return { rows: data || [], count: count || 0 };
};

  const refreshLock = useRef(false);
  const refresh = async () => {
    try {
      setLoading(true);
      setErr(null);
      const { rows, count } = await fetchOrders();
      setData(rows);
      setCount(count);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

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
    filters.dueWindow,
    filters.page,
    filters.pageSize,
    filters.orderBy,
    filters.ascending,
  ]);

  // realtime refresh on insert/update/delete
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

    return () => { clearTimeout(timer); try { supabase.removeChannel(chan); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((count || 0) / (filters.pageSize || 15))),
    [count, filters.pageSize]
  );

  return { data, count, loading, error, filters, setFilters, totalPages, refresh };
}

/* ============================= DETAIL HOOK ============================= */
export function useOrder(orderId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setErr] = useState(null);

  const reload = async () => {
    if (!orderId) { setData(null); setLoading(false); setErr(null); return; }
    try {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_no:order_number,
          status,
          client_name:manual_client_name,
          appraiser_name:manual_appraiser,
          address, city, state, zip,
          property_type, report_type,
          fee_amount, base_fee, appraiser_fee,
          review_due_at, final_due_at, due_date,
          title, notes,
          created_at, updated_at
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setData(data || null);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [orderId]);

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

export const useOrderById = useOrder;















