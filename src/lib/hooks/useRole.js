import { useEffect, useState } from "react";
import useSession from "@/lib/hooks/useSession";
import { getMyRole } from "@/lib/services/rolesService";
import supabase from "@/lib/supabaseClient";

/**
 * Resolves role via profiles (preferred) then RPC fallback (rpc_get_my_role).
 * Exports default AND named so imports can be either:
 *   import useRole from "@/lib/hooks/useRole"
 * or
 *   import { useRole } from "@/lib/hooks/useRole"
 */
function useRoleHook() {
  const { userId: authUserId } = useSession(); // auth.users.id
  const [role, setRole] = useState(null);      // "admin" | "reviewer" | "appraiser" | null
  const [userId, setUserId] = useState(null);  // internal id (we'll use profiles.id by default)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        if (!authUserId) {
          if (!mounted) return;
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        // Preferred: profiles row keyed by auth user id
        // (common Supabase pattern: public.profiles.id = auth.users.id)
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("auth_id", authUserId)
          .maybeSingle();

        if (!profileErr && profile?.id) {
          if (mounted) {
            setUserId(profile.id);
            const r = (profile.role || "").toLowerCase();
            if (r) setRole(r);
            else setRole(((await getMyRole()) || "").toLowerCase());
          }
          return;
        }

        // Fallback: RPC-based role resolution
        const r = ((await getMyRole()) || "").toLowerCase();
        if (mounted) {
          setRole(r || "appraiser");
          setUserId(authUserId);
        }
      } catch (e) {
        // keep a *visible* hint in dev so we stop silently masking real issues
        console.warn("[useRole] failed to resolve role; defaulting to appraiser", e);
        if (mounted) {
          setRole("appraiser");
          setUserId(authUserId || null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [authUserId]);

  const isAdmin = role === "admin" || role === "owner";
  const isReviewer = role === "reviewer";
  const appraiserView = !isAdmin && !isReviewer;

  useEffect(() => {
    console.log("AUTH USER ID", authUserId);
    console.log("ROLE", role);
  }, [authUserId, role]);

  return { role, isAdmin, isReviewer, appraiserView, userId, authUserId, loading };
}

export function useRole() { return useRoleHook(); }
export default useRoleHook;
