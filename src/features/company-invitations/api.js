import supabase from "@/lib/supabaseClient";

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

async function throwFunctionError(error, fallbackMessage) {
  let details = null;
  try {
    if (error?.context?.clone) {
      details = await error.context.clone().json();
    }
  } catch {
    details = null;
  }

  throw Object.assign(new Error(details?.message || error?.message || fallbackMessage), {
    code: details?.code || error?.code,
    details,
    cause: error,
  });
}

export async function acceptCompanyInvite(invitationId, requestId) {
  const { data, error } = await supabase.rpc("rpc_company_member_invite_accept", {
    p_invitation_id: invitationId,
    p_request_id: requestId,
  });

  if (error) throw error;
  return firstRow(data);
}

export async function listCompanyInvitations(status = "open", limit = 100) {
  const { data, error } = await supabase.rpc("rpc_company_member_invitations_list", {
    p_status: status,
    p_limit: limit,
  });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function cancelCompanyInvitation(invitationId, reason = null, requestId = null) {
  const { data, error } = await supabase.rpc("rpc_company_member_invitation_cancel", {
    p_invitation_id: invitationId,
    p_reason: reason ?? null,
    p_request_id: requestId,
  });

  if (error) throw error;
  return firstRow(data);
}

export async function resendCompanyInvitation(invitationId, options = {}) {
  const { data, error } = await supabase.functions.invoke("resend-company-member-invite", {
    body: {
      invitationId,
      expiresInDays: options?.expiresInDays ?? 7,
      reason: options?.reason ?? null,
    },
  });

  if (error) await throwFunctionError(error, "Falcon could not resend this invitation.");
  if (data?.success === false) {
    throw Object.assign(new Error(data.message || "Falcon could not resend this invitation."), {
      code: data.code,
      details: data,
    });
  }
  return data;
}

export async function sendCompanyInvitation(payload) {
  const { data, error } = await supabase.functions.invoke("invite-company-member", {
    body: {
      email: payload.email,
      role_ids: payload.role_ids,
      primary_role_id: payload.primary_role_id ?? null,
      reason: payload.reason ?? null,
      request_id: payload.request_id ?? null,
      redirect_to: payload.redirect_to ?? undefined,
    },
  });

  if (error) await throwFunctionError(error, "Falcon could not send this invitation.");
  if (data?.ok === false) {
    throw Object.assign(new Error(data.message || "Falcon could not send this invitation."), {
      code: data.code,
      details: data,
    });
  }
  return data;
}

export async function listCompanyRolePresets() {
  const { data, error } = await supabase.rpc("rpc_company_role_preset_list");

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function listCompanyRolePermissionPreview() {
  const { data, error } = await supabase.rpc("rpc_company_role_permission_preview");

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
