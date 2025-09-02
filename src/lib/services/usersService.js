// src/lib/services/usersService.js
import supabase from "@/lib/supabaseClient";

/* READS (RLS governs) */
export async function listUsers({ search, role } = {}) {
  let q = supabase
    .from("users")
    .select("id, auth_id, email, name, role, status, fee_split, display_color")
    .order("email", { ascending: true });

  if (role) q = q.eq("role", String(role).toLowerCase());
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`email.ilike.${s},name.ilike.${s},role.ilike.${s}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getUserByAuthId(authId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_id, email, name, role, status, fee_split, display_color")
    .eq("auth_id", authId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/* WRITES (RPC-only) */
export async function setUserRole(authId, role) {
  const { data, error } = await supabase.rpc("rpc_user_set_role", {
    p_auth_id: String(authId),
    p_role: String(role).toLowerCase(),
  });
  if (error) throw error;
  return data ?? true;
}

export async function setUserFeeSplit(authId, feeSplit) {
  const { data, error } = await supabase.rpc("rpc_user_set_fee_split", {
    p_auth_id: String(authId),
    p_fee: feeSplit == null ? null : Number(feeSplit),
  });
  if (error) throw error;
  return data ?? true;
}

export async function setUserStatus(authId, status) {
  const { data, error } = await supabase.rpc("rpc_user_set_status", {
    p_auth_id: String(authId),
    p_status: String(status).toLowerCase(),
  });
  if (error) throw error;
  return data ?? true;
}

export async function setUserColor(authId, color) {
  const { data, error } = await supabase.rpc("rpc_user_set_color", {
    p_auth_id: String(authId),
    p_color: color || null,
  });
  if (error) throw error;
  return data ?? true;
}

export default {
  listUsers,
  getUserByAuthId,
  setUserRole,
  setUserFeeSplit,
  setUserStatus,
  setUserColor,
};


