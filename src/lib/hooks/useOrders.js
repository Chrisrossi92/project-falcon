// src/lib/hooks/useOrders.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOrders, subscribeToOrders } from "@/lib/services/ordersService";
import { useSession } from "@/lib/hooks/useSession";

/**
 * Loads orders and auto-refreshes on realtime changes.
 * Until RLS hardening is complete, appraisers are scoped client-side.
 */
export function useOrders() {
  const { user, isAdmin, isReviewer } = useSession();
  const uid = user?.id || null;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState(null);

  const load = useCallback(
    async (reason = "init") => {
      try {
        setLoading(true);
        setErr(null);

        // If admin/reviewer → fetch all; if appraiser → prefer server-scope but pass appraiserId for fallbacks
        const rows = await fetchOrders({
          appraiserId: isAdmin || isReviewer ? null : uid,
          // Add status/search/pagination params here when UI wires them up
        });

        setData(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setErr(e);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [uid, isAdmin, isReviewer]
  );

  useEffect(() => {
    load("mount");

    // Realtime updates (scoped for appraisers where possible)
    const unsubscribe = subscribeToOrders(
      { forUserId: isAdmin || isReviewer ? null : uid },
      () => load("realtime")
    );
    return () => unsubscribe();
  }, [load, uid, isAdmin, isReviewer]);

  // Client-side scope for MVP (safety net until RLS task finishes)
  const scoped = useMemo(() => {
    if (!uid) return data;
    if (isAdmin || isReviewer) return data;
    return data.filter((o) => String(o.appraiser_id || "") === String(uid));
  }, [data, uid, isAdmin, isReviewer]);

  return { data: scoped, loading, error, refetch: load };
}








