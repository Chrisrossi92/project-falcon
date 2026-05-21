import supabase from "@/lib/supabaseClient";

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function listRelationships({ scope = "all", status = null } = {}) {
  return rpc("rpc_company_relationship_list", {
    p_scope: scope,
    p_status: status || null,
  });
}

export async function getRelationship(relationshipId) {
  return firstRow(await rpc("rpc_company_relationship_detail", { p_relationship_id: relationshipId }));
}

export async function searchRelationshipTargets({ query, relationshipType, limit = 10 } = {}) {
  return rpc("rpc_company_relationship_target_search", {
    p_query: query,
    p_relationship_type: relationshipType,
    p_limit: limit,
  });
}

export async function inviteRelationship(payload = {}) {
  return rpc("rpc_company_relationship_invite", {
    p_target_company_id: payload.targetCompanyId,
    p_relationship_type: payload.relationshipType,
    p_settings: payload.settings || {},
    p_compliance: payload.compliance || {},
    p_notes: payload.notes || null,
  });
}

export async function acceptRelationship(relationshipId, payload = {}) {
  return rpc("rpc_company_relationship_accept", {
    p_relationship_id: relationshipId,
    p_compliance: payload.compliance || {},
    p_notes: payload.notes || null,
  });
}

export async function declineRelationship(relationshipId, notes = "") {
  return rpc("rpc_company_relationship_decline", {
    p_relationship_id: relationshipId,
    p_notes: notes || null,
  });
}

export async function suspendRelationship(relationshipId, notes = "") {
  return rpc("rpc_company_relationship_suspend", {
    p_relationship_id: relationshipId,
    p_notes: notes || null,
  });
}

export async function reactivateRelationship(relationshipId, notes = "") {
  return rpc("rpc_company_relationship_reactivate", {
    p_relationship_id: relationshipId,
    p_notes: notes || null,
  });
}

export async function archiveRelationship(relationshipId, notes = "") {
  return rpc("rpc_company_relationship_archive", {
    p_relationship_id: relationshipId,
    p_notes: notes || null,
  });
}
