// src/lib/hooks/useOrder.js
import { useEffect, useState } from "react";
import { getOrder } from "@/lib/services/ordersService";
import { mapOrderRow } from "@/lib/mappers/orderMapper";

export default function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
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
      setOrder(mapped);
    } catch (err) {
      console.error("Failed to load order", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  return { order, loading, error, refresh: load };
}
