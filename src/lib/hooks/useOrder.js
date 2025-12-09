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
      setOrder(row ? mapOrderRow(row) : null);
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
