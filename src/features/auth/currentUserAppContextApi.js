import supabase from "@/lib/supabaseClient";

function normalizeRoleAssignment(role = {}) {
  return {
    role_assignment_id: role.role_assignment_id ?? null,
    role_id: role.role_id ?? null,
    role_key: role.role_key ?? null,
    role_name: role.role_name ?? null,
    display_name: role.display_name ?? role.role_name ?? null,
    is_primary: Boolean(role.is_primary),
  };
}

function normalizeContext(row = {}) {
  const roleAssignments = Array.isArray(row.role_assignments)
    ? row.role_assignments.map(normalizeRoleAssignment)
    : [];

  return {
    user_id: row.user_id ?? null,
    current_company_id: row.current_company_id ?? null,
    company_name: row.company_name ?? null,
    company_slug: row.company_slug ?? null,
    has_current_company_membership: Boolean(row.has_current_company_membership),
    display_name: row.display_name ?? null,
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    avatar_url: row.avatar_url ?? null,
    display_color: row.display_color ?? null,
    role_assignments: roleAssignments,
    role_keys: Array.isArray(row.role_keys) ? row.role_keys : [],
    primary_role_key: row.primary_role_key ?? null,
    is_owner: Boolean(row.is_owner),
    is_admin_role: Boolean(row.is_admin_role),
    is_reviewer_role: Boolean(row.is_reviewer_role),
    is_appraiser_role: Boolean(row.is_appraiser_role),
  };
}

export async function getCurrentUserAppContext() {
  const { data, error } = await supabase.rpc("rpc_current_user_app_context");
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeContext(row) : null;
}
