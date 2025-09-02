// src/lib/hooks/useOrders.js
import { useEffect, useMemo, useState } from "react";
import { listOrders, getOrderById } from "@/lib/services/ordersService";

/** Orders collection (unchanged) */
export function useOrders(opts = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const deps = useMemo(
    () => [
      opts.search || "",
      opts.status || "",
      opts.since instanceof Date ? opts.since.toISOString() : opts.since || "",
      opts.until instanceof Date ? opts.until.toISOString() : opts.until || "",
      opts.appraiserId || "",
    ],
    [opts.search, opts.status, opts.since, opts.until, opts.appraiserId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await listOrders(opts);
        if (!cancelled) setData(rows);
      } catch (e) {
        if (!cancelled) { setData([]); setError(e); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, deps);

  return { data, loading, error };
}

/** Single order with manual reload */
export function useOrder(orderId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!orderId) { setData(null); setLoading(false); setError(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const row = await getOrderById(orderId);
        if (!cancelled) setData(row);
      } catch (e) {
        if (!cancelled) { setData(null); setError(e); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [String(orderId || ""), version]);

  return { data, loading, error, reload };
}











