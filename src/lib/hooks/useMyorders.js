// src/lib/hooks/useMyOrders.js
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentUser } from "./useCurrentUser";
import { getCapabilities } from "../utils/roles";

/**
 * Fetches orders visible to the current user.
 *
 * We rely entirely on Postgres RLS for access control:
 * - owner/admin: all orders
 * - appraiser: only their assignments
 * - reviewer: (currently none, until we add reviewer RLS)
 */
export function useMyOrders() {
  const { user, loading: userLoading } = useCurrentUser();
  const { role, isAdmin, isOwner, isReviewer, isAppraiser } = getCapabilities(user);

  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userLoading) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, count, error } = await supabase
        .from("orders")
        .select(
          `
            id,
            order_number,
            status,
            client_id,
            appraiser_id,
            address,
            city,
            state,
            zip,
            fee_amount,
            review_due_at,
            final_due_at,
            due_date,
            created_at
          `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error);
        setData([]);
        setCount(0);
      } else {
        setError(null);
        setData(data || []);
        setCount(count ?? (data ? data.length : 0));
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userLoading, role]);

  return {
    data,
    count,
    loading: loading || userLoading,
    error,
    isAdmin,
    isOwner,
    isReviewer,
    isAppraiser,
  };
}



