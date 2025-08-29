// src/lib/services/userCache.js
import supabase from "@/lib/supabaseClient";

const _cache = new Map(); // auth_id -> { auth_id, email, name, role }

/** Best-effort bulk lookup of users by auth_id (RLS-safe; returns only rows caller can read). */
export async function fetchUsersByAuthIds(authIds = []) {
  const unique = [...new Set((authIds || []).map(String).filter(Boolean))];
  if (unique.length === 0) return {};

  const missing = unique.filter((id) => !_cache.has(id));
  if (missing.length) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("auth_id, email, name, role")
        .in("auth_id", missing);
      if (!error && Array.isArray(data)) {
        data.forEach((u) => _cache.set(u.auth_id, u));
      }
    } catch {
      // RLS may block non-admins from seeing others; ignore and return what we can.
    }
  }

  const out = {};
  unique.forEach((id) => {
    if (_cache.has(id)) out[id] = _cache.get(id);
  });
  return out;
}

export function displayNameFromUser(u) {
  return (u?.name || u?.email || "").trim() || null;
}

export function shortId(id) {
  const s = String(id || "");
  return s ? `${s.slice(0, 8)}…` : "—";
}
