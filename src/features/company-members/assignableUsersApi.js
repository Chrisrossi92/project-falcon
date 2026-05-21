import supabase from "@/lib/supabaseClient";

function normalizeAssignableUser(row = {}) {
  const defaultSplit = row.default_split_pct ?? null;
  return {
    ...row,
    id: row.user_id,
    fee_split: defaultSplit,
    split: defaultSplit,
  };
}

export async function listCompanyAssignableUsers(purpose = "all") {
  const { data, error } = await supabase.rpc("rpc_company_assignable_users", {
    p_purpose: purpose,
  });

  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeAssignableUser) : [];
}

export function listCompanyAssignableAppraisers() {
  return listCompanyAssignableUsers("appraiser");
}

export function listCompanyAssignableReviewers() {
  return listCompanyAssignableUsers("reviewer");
}

export function listCompanyOrderAssignableUsers() {
  return listCompanyAssignableUsers("order_assignment");
}
