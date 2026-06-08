import supabase from "@/lib/supabaseClient";

const CLIENT_PORTAL_INVITATION_CREATE_RPC = "rpc_client_portal_invitation_create";

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeClientContact(row = {}) {
  return {
    id: row.contact_id,
    contact_id: row.contact_id,
    company_id: row.company_id,
    client_id: row.client_id,
    name: row.name,
    title: row.title,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    status: row.status || "active",
    is_default: row.is_default === true,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_user_id: row.created_by_user_id,
  };
}

function absoluteInviteUrl(pathOrToken) {
  const value = textOrNull(pathOrToken);
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const path = value.startsWith("/client-portal/invitations/")
    ? value
    : `/client-portal/invitations/${value}`;

  if (typeof window === "undefined" || !window.location?.origin) return path;
  return `${window.location.origin}${path}`;
}

export function normalizeClientPortalInvitation(row = {}) {
  const token = textOrNull(row.invitation_token ?? row.invitationToken);
  const path = textOrNull(row.invitation_path ?? row.invitationPath);
  const link = absoluteInviteUrl(path || token);

  return {
    invitationId: textOrNull(row.invitation_id ?? row.invitationId),
    clientId: row.client_id ?? row.clientId ?? null,
    clientName: textOrNull(row.client_name ?? row.clientName),
    contactId: row.client_contact_id ?? row.clientContactId ?? null,
    contactName: textOrNull(row.contact_name ?? row.contactName),
    email: textOrNull(row.email),
    status: textOrNull(row.status) || "pending",
    expiresAt: textOrNull(row.expires_at ?? row.expiresAt),
    tokenLastFour: textOrNull(row.token_last_four ?? row.tokenLastFour),
    inviteLink: link,
  };
}

export async function listClientContacts(clientId) {
  const { data, error } = await supabase.rpc("rpc_client_contact_list", {
    p_client_id: Number(clientId),
  });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeClientContact) : [];
}

export async function createClientContact(clientId, contact) {
  const { data, error } = await supabase.rpc("rpc_client_contact_create", {
    p_client_id: Number(clientId),
    p_contact: contact,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientContact(row) : null;
}

export async function updateClientContact(contactId, patch) {
  const { data, error } = await supabase.rpc("rpc_client_contact_update", {
    p_contact_id: Number(contactId),
    p_patch: patch,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientContact(row) : null;
}

export async function setClientContactStatus(contactId, status) {
  const { data, error } = await supabase.rpc("rpc_client_contact_set_status", {
    p_contact_id: Number(contactId),
    p_status: status,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientContact(row) : null;
}

export async function setDefaultClientContact(contactId) {
  const { data, error } = await supabase.rpc("rpc_client_contact_set_default", {
    p_contact_id: Number(contactId),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientContact(row) : null;
}

export async function createClientPortalInvitation({ clientId, contactId = null, email = null }) {
  const safeClientId = Number(clientId);
  if (!Number.isFinite(safeClientId)) {
    throw new Error("client_id_required");
  }

  const safeContactId = contactId === null || contactId === undefined ? null : Number(contactId);
  if (safeContactId !== null && !Number.isFinite(safeContactId)) {
    throw new Error("client_contact_id_invalid");
  }

  const { data, error } = await supabase.rpc(CLIENT_PORTAL_INVITATION_CREATE_RPC, {
    p_client_id: safeClientId,
    p_client_contact_id: safeContactId,
    p_email: textOrNull(email),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientPortalInvitation(row) : null;
}

export const clientPortalInvitationRpcNames = Object.freeze({
  create: CLIENT_PORTAL_INVITATION_CREATE_RPC,
});
