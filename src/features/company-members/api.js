import supabase from "@/lib/supabaseClient";

export async function listCompanyMembers({ includeInactive = false } = {}) {
  const { data, error } = await supabase.rpc("rpc_company_member_list", {
    p_include_inactive: !!includeInactive,
  });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

export async function updateCompanyMemberRoles(userId, roleIds, primaryRoleId, reason = null, requestId = null) {
  const { data, error } = await supabase.rpc("rpc_company_member_role_update", {
    p_user_id: userId,
    p_role_ids: Array.isArray(roleIds) ? roleIds : [],
    p_primary_role_id: primaryRoleId ?? null,
    p_reason: reason ?? null,
    p_request_id: requestId ?? null,
  });

  if (error) throw error;
  return firstRow(data);
}

export async function listCompanyMemberPermissionOverrides(userId) {
  const { data, error } = await supabase.rpc("rpc_company_member_permission_overrides", {
    p_user_id: userId,
  });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function saveCompanyMemberPermissionOverrides(userId, overrides, reason = null, requestId = null) {
  const { data, error } = await supabase.rpc("rpc_company_member_permission_overrides_save", {
    p_user_id: userId,
    p_overrides: Array.isArray(overrides) ? overrides : [],
    p_reason: reason ?? null,
    p_request_id: requestId ?? null,
  });

  if (error) throw error;
  return firstRow(data);
}

export async function saveCompanyMemberAccess(
  userId,
  roleIds,
  primaryRoleId,
  overrides,
  { savePermissionOverrides = true, reason = null, requestId = null } = {},
) {
  const { data, error } = await supabase.rpc("rpc_company_member_access_save", {
    p_user_id: userId,
    p_role_ids: Array.isArray(roleIds) ? roleIds : [],
    p_primary_role_id: primaryRoleId ?? null,
    p_overrides: Array.isArray(overrides) ? overrides : [],
    p_save_permission_overrides: !!savePermissionOverrides,
    p_reason: reason ?? null,
    p_request_id: requestId ?? null,
  });

  if (error) throw error;
  return firstRow(data);
}

export async function setCompanyMemberStatus(userId, status, reason = null, requestId = null) {
  const { data, error } = await supabase.rpc("rpc_company_member_set_status", {
    p_user_id: userId,
    p_status: status,
    p_reason: reason ?? null,
    p_request_id: requestId ?? null,
  });

  if (error) throw error;
  return firstRow(data);
}
