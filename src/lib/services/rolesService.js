// src/lib/services/rolesService.js
import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst";

export async function getMyRole() {
  const { data, error } = await supabase.rpc("rpc_get_my_role");
  if (error) throw error;
  return data || "appraiser";
}

export async function listUsersWithRoles() {
  const { data, error } = await supabase.rpc("rpc_list_users_with_roles");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function setUserRole(userId, role, feeSplit) {
  const { error } = await supabase.rpc("rpc_set_user_role", {
    p_user_id: userId,
    p_role: role,
    p_fee_split: feeSplit ?? null,
  });
  if (error) throw error;
}
