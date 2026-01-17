// src/lib/hooks/useDashboardKpis.js
import { useEffect, useState } from "react";
import { fetchDashboardKpis } from "@/lib/api/dashboardKpis";

/**
 * Computes dashboard KPIs from v_orders_active_frontend_v4 with role-aware scoping.
 */
export function useDashboardKpis(scope = {}, { enabled = true } = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ total_active: 0, in_progress: 0, due_in_7: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!enabled) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetchDashboardKpis(scope);
        if (cancelled) return;
        setData(res);
      } catch (e) {
        if (cancelled) return;
        console.warn("[useDashboardKpis] failed to load KPIs", e);
        setError(e);
        setData({ total_active: 0, in_progress: 0, due_in_7: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, JSON.stringify(scope)]);

  return { ...data, loading, error };
}

export default useDashboardKpis;
