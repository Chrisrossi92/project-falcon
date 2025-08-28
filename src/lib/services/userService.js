// src/lib/services/userService.js
import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst.js";

/**
 * List the visible team for the current user (RLS enforced).
 * RPC-first: team_list_users(include_inactive boolean)
 * Fallback: direct read (no fee_split in select to avoid missing-column errors)
 */
export async function listTeam({ includeInactive = false } = {}) {
  const { data, error } = await rpcFirst(
    () =>
      supabase.rpc("team_list_users", { include_inactive: includeInactive }),
    async () => {
      let q = supabase
        .from("users")
        .select("id, display_name, name, email, role, status, avatar_url")
        .order("display_name", { ascending: true });

      if (!includeInactive) q = q.eq("status", "active");
      return q;
    }
  );

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * Get a single user by id (directory-safe fields).
 * RPC-first: team_get_user(user_id)  (optional; falls back to direct read)
 */
export async function getUserById(userId) {
  if (!userId) throw new Error("getUserById: userId required");

  const { data, error } = await rpcFirst(
    () => supabase.rpc("team_get_user", { user_id: userId }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("users")
        .select("id, display_name, name, email, role, status, avatar_url")
        .eq("id", userId)
        .single();
      return { data: row, error: err };
    }
  );

  if (error) throw error;
  return data || null;
}

/**
 * Convenience: list only appraisers (client-side filter).
 */
export async function listAppraisers({ includeInactive = false } = {}) {
  const team = await listTeam({ includeInactive });
  return team
    .filter((u) => String(u.role || "").toLowerCase() === "appraiser")
    .sort((a, b) =>
      String(a.display_name || a.name || "").localeCompare(
        String(b.display_name || b.name || "")
      )
    );
}


