import { useEffect, useState } from "react";
import useSession from "@/lib/hooks/useSession";
import { getMyRole } from "@/lib/services/rolesService";
import supabase from "@/lib/supabaseClient";

/**
 * Resolves role + internal user id.
 *
 * IMPORTANT:
 * - authUserId = auth.users.id (Supabase auth)
 * - userId     = public.users.id (internal id used by orders.appraiser_id/reviewer_id/owner_id)
 *
 * We map via public.users.auth_id = authUserId.
 * Role resolution is canonicalized as:
 *   1) rpc_get_my_role()
 *   2) profiles.role
 *   3) null
 */
function useRoleHook() {
  const { userId: authUserId } = useSession(); // auth.users.id
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null); // public.users.id
  const [loading, setLoading] = useState(true);
  const [settledAuthUserId, setSettledAuthUserId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        if (!authUserId) {
          if (!mounted) return;
          setRole(null);
          setUserId(null);
          setSettledAuthUserId(null);
          setLoading(false);
          return;
        }

        // Resolve internal public.users.id, but do not trust users.role.
        const { data: urow, error: uerr } = await supabase
          .from("users")
          .select("id, auth_id")
          .eq("auth_id", authUserId)
          .maybeSingle();

        if (!uerr && urow?.id && mounted) {
          setUserId(urow.id);
        }

        let resolvedRole = null;

        try {
          const rpcRole = await getMyRole();
          const normalizedRpcRole = String(rpcRole || "").toLowerCase().trim();
          if (normalizedRpcRole) resolvedRole = normalizedRpcRole;
        } catch {
          // Fall through to profiles.role when RPC is unavailable or errors.
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("auth_id", authUserId)
          .maybeSingle();

        if (!resolvedRole && !profileErr) {
          const normalizedProfileRole = String(profile?.role || "").toLowerCase().trim();
          if (normalizedProfileRole) resolvedRole = normalizedProfileRole;
        }

        if (mounted) {
          setRole(resolvedRole || null);
          setSettledAuthUserId(authUserId);
        }
      } catch (e) {
        console.warn("[useRole] failed to resolve role", e);
        if (mounted) {
          setRole(null);
          setUserId(null);
          setSettledAuthUserId(authUserId);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [authUserId]);

  const isAdmin = role === "admin" || role === "owner";
  const isReviewer = role === "reviewer";
  const appraiserView = !isAdmin && !isReviewer;
  const unresolvedForAuthUser = !!authUserId && settledAuthUserId !== authUserId;
  const effectiveLoading = loading || unresolvedForAuthUser;

  useEffect(() => {
    console.log("AUTH USER ID", authUserId);
    console.log("PUBLIC USER ID", userId);
    console.log("ROLE", role);
  }, [authUserId, userId, role]);

  return { role, isAdmin, isReviewer, appraiserView, userId, authUserId, loading: effectiveLoading };
}

export function useRole() {
  return useRoleHook();
}
export default useRoleHook;
