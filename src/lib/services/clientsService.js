// src/lib/services/clientsService.js
import supabase from "@/lib/supabaseClient";

/* READS (RLS governs) */
export async function listClients({ search, status } = {}) {
  let q = supabase.from("clients").select("*").order("name", { ascending: true });
  if (status) q = q.eq("status", status);
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`name.ilike.${s},contact_name.ilike.${s},contact_email.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getClientById(clientId) {
  if (!clientId) return null;
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/* WRITES (RPC-only) */
export async function createClient(patch) {
  const { data, error } = await supabase.rpc("rpc_client_create", { p: patch });
  if (error) throw error;
  return data;
}

export async function updateClient(clientId, patch) {
  const { data, error } = await supabase.rpc("rpc_client_update", {
    p_client_id: String(clientId),
    p_patch: patch,
  });
  if (error) throw error;
  return data;
}

export async function deleteClient(clientId) {
  const { data, error } = await supabase.rpc("rpc_client_delete", {
    p_client_id: String(clientId),
  });
  if (error) throw error;
  return data ?? true;
}

export async function isClientNameAvailable(name, { ignoreClientId } = {}) {
  const { data, error } = await supabase.rpc("rpc_is_client_name_available", {
    p_name: name || null,
    p_ignore_client_id: ignoreClientId ? String(ignoreClientId) : null,
  });
  if (error) throw error;
  return !!data;
}

export default {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  isClientNameAvailable,
};











