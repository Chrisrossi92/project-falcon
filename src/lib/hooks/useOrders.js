// src/lib/hooks/useOrders.js
import { useEffect, useMemo, useState } from "react";
import {
  listOrders,
  getOrder,
  setOrderStatus,
  setOrderDates,
  assignParticipants,
  archiveOrder,
  deleteOrder,
} from "@/lib/services/ordersService";

/**
 * useOrders — list with filters/pagination
 * NO direct supabase usage here (service only).
 */
export function useOrders(initial = {}) {
  const [filters, setFilters] = useState({
    search: "",
    statusIn: [],
    clientId: null,
    appraiserId: null,
    from: "",
    to: "",
    activeOnly: true,
    page: 0,
    pageSize: 50,
    orderBy: "date_ordered",
    ascending: false,
    ...initial,
  });

  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function reload() {
    try {
      setLoading(true);
      setError(null);
      const res = await listOrders(filters);
      setData(res.rows);
      setCount(res.count);
    } catch (e) {
      setError(e);
      setData([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.search,
    filters.statusIn.join("|"),
    filters.clientId,
    filters.appraiserId,
    filters.from,
    filters.to,
    filters.activeOnly,
    filters.page,
    filters.pageSize,
    filters.orderBy,
    filters.ascending,
  ]);

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
    reload,
  };
}

/**
 * useOrder — single order detail + handy RPC actions (status/dates/assign)
 */
export function useOrder(orderId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function reload() {
    try {
      setLoading(true);
      setError(null);
      setData(await getOrder(orderId));
    } catch (e) {
      setError(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Bound actions (RPC-only)
  async function updateStatus(status, note = null) {
    await setOrderStatus(orderId, status, note);
    await reload();
  }
  async function updateDates(patch) {
    await setOrderDates(orderId, patch);
    await reload();
  }
  async function assign(patch) {
    await assignParticipants(orderId, patch);
    await reload();
  }
  async function archive() {
    await archiveOrder(orderId);
  }
  async function hardDelete() {
    await deleteOrder(orderId);
  }

  return {
    data,
    loading,
    error,
    reload,
    updateStatus,
    updateDates,
    assign,
    archive,
    hardDelete,
  };
}













