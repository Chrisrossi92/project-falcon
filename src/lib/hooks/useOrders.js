// src/lib/hooks/useOrders.js
import { useEffect, useMemo, useState } from "react";
import { fetchOrdersWithFilters } from "@/lib/api/orders";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import { mapOrderRows } from "@/lib/mappers/orderMapper";

const DEFAULT_FILTERS = {
  activeOnly: false,
  page: 0,
  pageSize: 15,
  orderBy: "order_number",
  ascending: false,
  search: "",
  statusIn: [],
  clientId: null,
  appraiserId: null,
  assignedAppraiserId: null,
  priority: "",
  dueWindow: "",
  from: "",
  to: "",
};

const ACTIVE_STATUSES = new Set([
  ORDER_STATUS.NEW,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.IN_REVIEW,
]);

/**
 * useOrders
 *
 * Now backed by the Supabase view (v_orders_frontend_v3) via fetchOrdersWithFilters.
 * Filters are sent to the API; paging/sorting happen server-side.
 */
export function useOrders(initialSeed = {}, options = {}) {
  const { mode = null, reviewerId = null, scope = null, enabled = true } = options || {};
  const seed = useMemo(
    () => ({ ...DEFAULT_FILTERS, ...(initialSeed || {}) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(initialSeed)]
  );

  const [filters, setFilters] = useState(seed);
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // keep filters in sync if the seed changes from outside
  useEffect(() => {
    setFilters((prev) => ({ ...prev, ...seed }));
  }, [seed]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled) {
        setLoading(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (mode === "reviewerQueue") {
          console.log("[useOrders] reviewerQueue mode", { reviewerId });
        }

        const { rows, count, error: fetchErr } = await fetchOrdersWithFilters({
          search: filters.search || "",
          statusIn: filters.statusIn?.filter(Boolean) || [],
          clientId: filters.clientId || null,
          appraiserId: filters.appraiserId || null,
          assignedAppraiserId: filters.assignedAppraiserId || null,
          from: filters.from || null,
          to: filters.to || null,
          activeOnly: false, // fetch all; we'll filter active locally if needed
          page: filters.page || 0,
          pageSize: filters.pageSize || 15,
          orderBy: filters.orderBy || "order_number",
          ascending: filters.ascending ?? false,
          mode,
          reviewerId,
          scope,
        });

        if (cancelled) return;
        if (fetchErr) {
          setError(fetchErr);
          setData([]);
          setCount(0);
          return;
        }
        setData(mapOrderRows(rows || []));
        setCount(count ?? (rows ? rows.length : 0));
      } catch (e) {
        if (cancelled) return;
        setError(e);
        setData([]);
        setCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(filters), enabled]);

  return {
    data,
    count,
    loading,
    error,
    filters,
    setFilters,
  };
}

/**
 * useOrdersSummary
 *
 * Lightweight summary for dashboards, using the same view-backed fetcher.
 * - count: total rows matching filters
 * - inProgress: status === in_progress
 * - dueIn7: final_due_at/due_date within next 7 days (>= today)
 */
export function useOrdersSummary(filters = {}, { enabled = true, scope = null } = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled) {
        setLoading(false);
        setRows([]);
        setCount(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { rows, count, error: fetchErr } = await fetchOrdersWithFilters({
          ...filters,
          activeOnly: false, // fetch all, filter active locally if needed
          page: 0,
          pageSize: 1000, // pull enough to compute aggregates client-side
          orderBy: filters.orderBy || "order_number",
          ascending: filters.ascending ?? false,
          scope,
        });
        if (fetchErr) throw fetchErr;
        if (cancelled) return;
        setRows(mapOrderRows(rows || []));
        setCount(count ?? (rows ? rows.length : 0));
      } catch (e) {
        if (cancelled) return;
        console.warn("[useOrdersSummary] failed to load orders summary", e);
        setError(e);
        setRows([]);
        setCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, JSON.stringify(filters)]);

  const inProgress = rows.filter((o) => o.status_normalized === ORDER_STATUS.IN_PROGRESS).length;

  const dueIn7 = rows.filter((o) => {
    const dateStr = o.final_due_at || o.due_date;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = (d - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  return {
    loading,
    error,
    count,
    inProgress,
    dueIn7,
    rows,
  };
}
