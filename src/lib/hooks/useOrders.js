// src/lib/hooks/useOrders.js
import { useEffect, useMemo, useState } from "react";
import { fetchOrdersWithFilters } from "@/lib/api/orders";
import { listCompanyAssignableUsers } from "@/features/company-members/assignableUsersApi";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import { mapOrderRows } from "@/lib/mappers/orderMapper";
import { applyOperationalOrderUserNamesToRows } from "@/lib/utils/userDisplayName";

const DEFAULT_FILTERS = {
  page: 0,
  pageSize: 15,
  orderBy: "created_at",
  ascending: false,
  search: "",
  statusIn: [],
  clientId: null,
  appraiserId: null,
  reviewerId: null,
  assignedAppraiserId: null,
  assignedToMe: false,
  assignedToMeUserId: null,
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

async function mapOperationalOrderRows(rows = []) {
  const mappedRows = mapOrderRows(rows || []);
  const hasAssignedUsers = mappedRows.some((row) => row?.appraiser_id || row?.reviewer_id || row?.assigned_to);

  if (!hasAssignedUsers) return mappedRows;

  try {
    const users = await listCompanyAssignableUsers("all");
    return applyOperationalOrderUserNamesToRows(mappedRows, users);
  } catch (error) {
    console.warn("[useOrders] failed to load operational user names", error);
    return mappedRows;
  }
}

/**
 * useOrders
 *
 * Now backed by the Supabase view (v_orders_frontend_v4) via fetchOrdersWithFilters.
 * Filters are sent to the API; paging/sorting happen server-side.
 */
export function useOrders(initialSeed = {}, options = {}) {
  const {
    mode = null,
    reviewerId = null,
    scope = null,
    operationsScope = null,
    enabled = true,
  } = options || {};
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
        const { rows, count, error: fetchErr } = await fetchOrdersWithFilters({
          search: filters.search || "",
          statusIn: filters.statusIn?.filter(Boolean) || [],
          clientId: filters.clientId || null,
          appraiserId: filters.appraiserId || null,
          reviewerId: filters.reviewerId || reviewerId || null,
          assignedAppraiserId: filters.assignedAppraiserId || null,
          assignedToMeUserId: filters.assignedToMe ? filters.assignedToMeUserId || null : null,
          inspectedAwaitingReport: filters.inspectedAwaitingReport || false,
          finalDueWithinDays: filters.finalDueWithinDays ?? null,
          dueWindow: filters.dueWindow || "",
          from: filters.from || null,
          to: filters.to || null,
          page: filters.page || 0,
          pageSize: filters.pageSize || 15,
          orderBy: filters.orderBy || "created_at",
          ascending: filters.ascending ?? false,
          mode,
          scope,
          operationsScope,
        });

        if (cancelled) return;
        if (fetchErr) {
          setError(fetchErr);
          setData([]);
          setCount(0);
          return;
        }
        const mappedRows = await mapOperationalOrderRows(rows || []);
        if (cancelled) return;
        setData(mappedRows);
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
  }, [JSON.stringify(filters), enabled, mode, operationsScope, reviewerId, scope]);

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
export function useOrdersSummary(
  filters = {},
  { enabled = true, scope = null, operationsScope = null, refreshKey = 0 } = {},
) {
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
          page: 0,
          pageSize: 1000, // pull enough to compute aggregates client-side
          orderBy: filters.orderBy || "created_at",
          ascending: filters.ascending ?? false,
          scope,
          operationsScope,
        });
        if (fetchErr) throw fetchErr;
        if (cancelled) return;
        const mappedRows = await mapOperationalOrderRows(rows || []);
        if (cancelled) return;
        setRows(mappedRows);
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
  }, [enabled, JSON.stringify(filters), operationsScope, refreshKey, scope]);

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
