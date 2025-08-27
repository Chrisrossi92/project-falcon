// src/lib/services/usersService.js
import supabase from "@/lib/supabaseClient";

/**
 * Return a Map of userId -> display name (or name) for the given ids.
 */
export async function fetchUsersMapByIds(ids = []) {
  const uniq = Array.from(new Set((ids || []).filter(Boolean)));
  const result = new Map();
  if (!uniq.length) return result;

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, name")
    .in("id", uniq);

  if (error) {
    console.warn("[usersService] fetchUsersMapByIds error:", error);
    return result;
  }

  for (const u of data || []) {
    const label = u.display_name || u.name || "";
    if (label) result.set(u.id, label);
  }
  return result;
}

/**
 * Fetch a list of appraisers for pickers/search.
 * Strategy:
 *  1) Try a dedicated view 'v_appraisers' if it exists (best).
 *  2) Fallback to 'users' and filter client-side by role-ish fields.
 *
 * Scalar selects only (no embeds). Search is applied client-side for safety.
 *
 * @param {Object} opts
 * @param {string} [opts.search]  - partial name/email match
 * @param {number} [opts.limit=20]
 * @returns {Promise<Array<{id:string,display_name?:string,name?:string,email?:string}>>}
 */
export async function fetchAppraisersList({ search, limit = 20 } = {}) {
  const norm = (rows = []) =>
    rows.map((u) => ({
      id: u.id,
      display_name: u.display_name || "",
      name: u.name || "",
      email: u.email || "",
      role: u.role || "",
      is_appraiser: u.is_appraiser === true,
      roles: Array.isArray(u.roles) ? u.roles : [],
    }));

  const matchesSearch = (u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  };

  const looksLikeAppraiser = (u) => {
    const r = String(u.role || "").toLowerCase();
    return (
      u.is_appraiser === true ||
      r.includes("appraiser") ||
      (Array.isArray(u.roles) && u.roles.map(String).some((x) => x.toLowerCase() === "appraiser"))
    );
  };

  // 1) Try view first
  try {
    const { data, error } = await supabase
      .from("v_appraisers")
      .select("id, display_name, name, email")
      .order("display_name", { ascending: true })
      .limit(200);
    if (!error && Array.isArray(data)) {
      const list = norm(data).filter(matchesSearch).slice(0, limit);
      return list;
    }
  } catch {
    // ignore and fallback
  }

  // 2) Fallback to users (select superset, filter client-side)
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, name, email, role, is_appraiser, roles")
    .order("display_name", { ascending: true })
    .limit(500);

  if (error) throw error;

  const list = norm(data).filter(looksLikeAppraiser).filter(matchesSearch).slice(0, limit);
  return list;
}

