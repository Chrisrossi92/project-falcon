// src/lib/hooks/useOrder.js
import { useCallback, useEffect, useRef, useState } from "react";
import { getOrder } from "@/lib/services/ordersService";
import { mapOrderRow } from "@/lib/mappers/orderMapper";

export default function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const requestSeqRef = useRef(0);

  const load = useCallback(async () => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    if (!id) {
      hasLoadedRef.current = false;
      if (mountedRef.current) {
        setOrder(null);
        setLoading(false);
        setError(null);
      }
      return null;
    }

    const showPageLoading = !hasLoadedRef.current;

    if (showPageLoading) {
      if (mountedRef.current) {
        setLoading(true);
      }
    }

    if (mountedRef.current) {
      setError(null);
    }

    try {
      const row = await getOrder(id);
      const mapped = row ? mapOrderRow(row) : null;
      if (import.meta?.env?.DEV && mapped) {
        console.debug("[useOrder] loaded", {
          id: mapped.id,
          managing_amc_id: mapped.managing_amc_id,
          amc_name: mapped.amc_name,
          split_pct: mapped.split_pct,
        });
      }

      if (requestSeq !== requestSeqRef.current || !mountedRef.current) return mapped;

      setOrder(mapped);
      hasLoadedRef.current = true;
      return mapped;
    } catch (err) {
      if (requestSeq !== requestSeqRef.current || !mountedRef.current) return null;
      console.error("Failed to load order", err);
      setError(err);
      return null;
    } finally {
      if (requestSeq === requestSeqRef.current && mountedRef.current && showPageLoading) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    hasLoadedRef.current = false;
    setOrder(null);
    load();

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { order, loading, error, refresh: load };
}
