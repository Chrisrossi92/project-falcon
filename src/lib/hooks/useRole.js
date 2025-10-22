import { useEffect, useState } from "react";
import useSession from "@/lib/hooks/useSession";
import { getMyRole } from "@/lib/services/rolesService";

/**
 * Resolves role via RPC (rpc_get_my_role) and exposes flags.
 * Exports default AND named so imports can be either:
 *   import useRole from "@/lib/hooks/useRole"
 * or
 *   import { useRole } from "@/lib/hooks/useRole"
 */
function useRoleHook() {
  const { userId } = useSession();
  const [role, setRole] = useState(null);       // "admin" | "reviewer" | "appraiser" | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (!userId) { setRole(null); return; }
        const r = await getMyRole();            // <- your rolesService RPC
        if (mounted) setRole((r || "").toLowerCase());
      } catch {
        if (mounted) setRole("appraiser");      // safe fallback
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [userId]);

  const isAdmin    = role === "admin";
  const isReviewer = role === "reviewer";
  const appraiserView = !isAdmin && !isReviewer;  // treat others as appraiser

  return { role, isAdmin, isReviewer, appraiserView, userId, loading };
}

// allow both import styles
export function useRole() { return useRoleHook(); }
export default useRoleHook;




