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
 */
function useRoleHook() {
  const { userId: authUserId } = useSession(); // auth.users.id
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null); // public.users.id
  const [loading, setLoading] = useState(true);
  const [resolvedAuthUserId, setResolvedAuthUserId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        if (!authUserId) {
          if (!mounted) return;
          setRole(null);
          setUserId(null);
          setResolvedAuthUserId(null);
          setLoading(false);
          return;
        }

        // 1) Canonical mapping: public.users row by auth_id
        const { data: urow, error: uerr } = await supabase
          .from("users")
          .select("id, role, full_name, email, auth_id")
          .eq("auth_id", authUserId)
          .maybeSingle();

        if (!uerr && urow?.id) {
          if (!mounted) return;

          setUserId(urow.id);

          // Canonical role authority: DB helper/RPC via user_roles.
          // users.role remains compatibility-only fallback.
          let rr = "";
          try {
            rr = ((await getMyRole()) || "").toLowerCase().trim();
          } catch {
            rr = "";
          }
          const fallbackRole = (urow.role || "").toLowerCase().trim();
          setRole(rr || fallbackRole || "appraiser");
          setResolvedAuthUserId(authUserId);
          return;
        }

        // 2) Final fallback: role helper RPC + no internal mapping
        let r = "";
        try {
          r = ((await getMyRole()) || "").toLowerCase().trim();
        } catch {
          r = "";
        }
        if (mounted) {
          setRole(r || "appraiser");
          setUserId(null);
          setResolvedAuthUserId(authUserId);
        }
      } catch (e) {
        console.warn("[useRole] failed to resolve role; defaulting to appraiser", e);
        if (mounted) {
          setRole("appraiser");
          setUserId(null);
          setResolvedAuthUserId(authUserId);
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
  const unresolvedForAuthenticatedUser =
    !!authUserId && (resolvedAuthUserId !== authUserId || !String(role || "").trim());
  const roleLoading = loading || unresolvedForAuthenticatedUser;

  return { role, isAdmin, isReviewer, appraiserView, userId, authUserId, loading: roleLoading };
}

export function useRole() {
  return useRoleHook();
}
export default useRoleHook;
