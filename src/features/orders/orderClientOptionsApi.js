import supabase from "@/lib/supabaseClient";

function normalizeClientOption(row = {}) {
  return {
    id: row.client_id,
    name: row.client_name,
    category: row.category,
    amc_id: row.amc_id,
    is_merged: row.is_merged,
    contact_name_1: row.contact_name,
    contact_email_1: row.contact_email,
    contact_phone_1: row.contact_phone,
  };
}

function normalizeClientSearchResult(row = {}) {
  return {
    id: row.client_id,
    name: row.client_name,
    category: row.category,
    status: row.status,
    is_merged: row.is_merged,
    merged_into_id: row.merged_into_id,
  };
}

function normalizeCreatedClient(row = {}) {
  return {
    id: row.client_id,
    name: row.client_name,
    category: row.category,
    amc_id: row.amc_id,
    status: row.status,
  };
}

export async function listOrderFormClientOptions() {
  const { data, error } = await supabase.rpc("rpc_order_form_client_options");
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeClientOption) : [];
}

export async function searchOrderFormClientsByName(search, limit = 5) {
  const { data, error } = await supabase.rpc("rpc_order_form_client_name_search", {
    p_search: search,
    p_limit: limit,
  });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeClientSearchResult) : [];
}

export async function createOrderFormClient({ name, amcId }) {
  const { data, error } = await supabase.rpc("rpc_order_form_client_create", {
    p_client: {
      name,
      amc_id: amcId ?? null,
    },
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeCreatedClient(row) : null;
}
