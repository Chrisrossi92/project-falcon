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

        // 1) Canonical mapping: public.users row by auth_id
        const { data: urow, error: uerr } = await supabase
          .from("users")
          .select("id, role, full_name, email, auth_id")
          .eq("auth_id", authUserId)
          .maybeSingle();

        if (!uerr && urow?.id) {
          if (!mounted) return;

          setUserId(urow.id);

          const r = (urow.role || "").toLowerCase().trim();
          if (r) {
            setRole(r);
          } else {
            // fall back to RPC role if user row doesn't have role yet
            const rr = ((await getMyRole()) || "").toLowerCase().trim();
            setRole(rr || "appraiser");
          }

          return;
        }

        // 2) Legacy fallback: profiles (if it exists)
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("id, role, auth_id")
          .eq("auth_id", authUserId)
          .maybeSingle();

        if (!profileErr && profile?.id) {
          if (!mounted) return;

          // profiles.id might NOT equal public.users.id in your schema.
          // If we get here, still try to map into public.users by auth_id.
          const { data: u2 } = await supabase
            .from("users")
            .select("id, role")
            .eq("auth_id", authUserId)
            .maybeSingle();

          setUserId(u2?.id ?? null);

          const r = (profile.role || "").toLowerCase().trim();
          if (r) setRole(r);
          else setRole(((await getMyRole()) || "").toLowerCase().trim() || "appraiser");
          return;
        }

        // 3) Final fallback: RPC role + no internal mapping
        const r = ((await getMyRole()) || "").toLowerCase().trim();
        if (mounted) {
          setRole(r || "appraiser");
          setUserId(null);
        }
      } catch (e) {
        console.warn("[useRole] failed to resolve role; defaulting to appraiser", e);
        if (mounted) {
          setRole("appraiser");
          setUserId(null);
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

  useEffect(() => {
    console.log("AUTH USER ID", authUserId);
    console.log("PUBLIC USER ID", userId);
    console.log("ROLE", role);
  }, [authUserId, userId, role]);

  return { role, isAdmin, isReviewer, appraiserView, userId, authUserId, loading };
}

export function useRole() {
  return useRoleHook();
}
export default useRoleHook;
