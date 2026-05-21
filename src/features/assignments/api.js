import supabase from "@/lib/supabaseClient";

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function listAssignedAssignments(filters = {}) {
  return rpc("rpc_order_company_assignment_inbox", {
    p_status: filters.status || null,
    p_assignment_type: filters.assignmentType || null,
  });
}

export async function listOwnerAssignments(filters = {}) {
  return rpc("rpc_order_company_assignment_list", {
    p_status: filters.status || null,
    p_assignment_type: filters.assignmentType || null,
  });
}

export async function listOwnerAssignmentsForOrder(orderId) {
  return rpc("rpc_order_company_assignment_list_for_order", {
    p_order_id: orderId,
  });
}

export async function listAssignmentActivity(assignmentId) {
  return rpc("rpc_order_company_assignment_activity", {
    p_assignment_id: assignmentId,
  });
}

export async function listOutgoingActiveRelationships() {
  return rpc("rpc_company_relationship_list", {
    p_scope: "outgoing",
    p_status: "active",
  });
}

export async function offerAssignment(payload = {}) {
  return rpc("rpc_order_company_assignment_offer", {
    p_order_id: payload.orderId,
    p_assigned_company_id: payload.assignedCompanyId,
    p_relationship_id: payload.relationshipId,
    p_assignment_type: payload.assignmentType,
    p_instructions: payload.instructions,
    p_terms: payload.terms || {},
    p_handoff_payload: payload.handoffPayload || {},
    p_due_at: payload.dueAt || null,
    p_review_due_at: payload.reviewDueAt || null,
    p_expires_at: payload.expiresAt || null,
  });
}

export async function getOwnerAssignmentPacket(assignmentId) {
  return firstRow(await rpc("rpc_order_company_assignment_owner_packet", { p_assignment_id: assignmentId }));
}

export async function getAssignedOfferPacket(assignmentId) {
  return firstRow(await rpc("rpc_order_company_assignment_offer_packet", { p_assignment_id: assignmentId }));
}

export async function getAssignedWorkPacket(assignmentId) {
  return firstRow(await rpc("rpc_order_company_assignment_work_packet", { p_assignment_id: assignmentId }));
}

export async function acceptAssignment(assignmentId) {
  return rpc("rpc_order_company_assignment_accept", { p_assignment_id: assignmentId });
}

export async function declineAssignment(assignmentId, reason = "") {
  return rpc("rpc_order_company_assignment_decline", {
    p_assignment_id: assignmentId,
    p_reason: reason || null,
  });
}

export async function startAssignment(assignmentId) {
  return rpc("rpc_order_company_assignment_start", { p_assignment_id: assignmentId });
}

export async function submitAssignment(assignmentId, submissionPayload = {}) {
  return rpc("rpc_order_company_assignment_submit", {
    p_assignment_id: assignmentId,
    p_submission_payload: submissionPayload || {},
  });
}

export async function completeAssignment(assignmentId, completionNote = "") {
  return rpc("rpc_order_company_assignment_complete", {
    p_assignment_id: assignmentId,
    p_completion_note: completionNote || null,
  });
}

export async function cancelAssignment(assignmentId, reason = "") {
  return rpc("rpc_order_company_assignment_cancel", {
    p_assignment_id: assignmentId,
    p_reason: reason || null,
  });
}

export async function revokeAssignment(assignmentId, reason = "") {
  return rpc("rpc_order_company_assignment_revoke", {
    p_assignment_id: assignmentId,
    p_reason: reason || null,
  });
}
