import supabase from "@/lib/supabaseClient";

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
