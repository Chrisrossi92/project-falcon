import supabase from "@/lib/supabaseClient";

function normalizeClientRow(row = {}) {
  return {
    id: row.client_id,
    name: row.client_name,
    status: row.status,
    category: row.category,
    amc_id: row.amc_id,
    amc_name: row.amc_name,
    primary_contact: row.contact_name,
    phone: row.contact_phone,
    email: row.contact_email,
    contact_name_1: row.contact_name,
    contact_email_1: row.contact_email,
    contact_phone_1: row.contact_phone,
    total_orders: Number(row.order_count ?? 0),
    orders_count: Number(row.order_count ?? 0),
    avg_fee: row.avg_fee == null ? null : Number(row.avg_fee),
    avg_total_fee: row.avg_fee == null ? null : Number(row.avg_fee),
    last_activity: row.last_order_date,
    last_order_date: row.last_order_date,
    is_merged: row.is_merged,
    merged_into_id: row.merged_into_id,
  };
}

function normalizeClientDetail(row = {}) {
  return {
    id: row.client_id,
    name: row.client_name,
    status: row.status,
    category: row.category,
    amc_id: row.amc_id,
    amc_name: row.amc_name,
    notes: row.notes,
    primary_contact_name: row.contact_name_1,
    primary_contact_phone: row.contact_phone_1,
    primary_contact_email: row.contact_email_1,
    contact_name_1: row.contact_name_1,
    contact_email_1: row.contact_email_1,
    contact_phone_1: row.contact_phone_1,
    contact_name_2: row.contact_name_2,
    contact_email_2: row.contact_email_2,
    contact_phone_2: row.contact_phone_2,
    is_merged: row.is_merged,
    merged_into_id: row.merged_into_id,
    total_orders: Number(row.order_count ?? 0),
    orders_count: Number(row.order_count ?? 0),
    avg_fee: row.avg_fee == null ? null : Number(row.avg_fee),
    avg_total_fee: row.avg_fee == null ? null : Number(row.avg_fee),
    last_order_date: row.last_order_date,
    last_activity: row.last_order_date,
  };
}

function normalizeClientMutation(row = {}) {
  return {
    id: row.client_id,
    name: row.client_name,
    status: row.status,
    category: row.category,
    amc_id: row.amc_id,
    amc_name: row.amc_name,
    notes: row.notes,
    primary_contact_name: row.contact_name_1,
    primary_contact_phone: row.contact_phone_1,
    primary_contact_email: row.contact_email_1,
    contact_name_1: row.contact_name_1,
    contact_email_1: row.contact_email_1,
    contact_phone_1: row.contact_phone_1,
  };
}

function normalizeAmcOption(row = {}) {
  return {
    id: row.amc_id,
    name: row.amc_name,
  };
}

export async function listClientManagementClients({
  search = "",
  category = "all",
  sort = "orders_desc",
} = {}) {
  const rpcSort = sort === "orders_asc" ? "orders_desc" : sort;
  const { data, error } = await supabase.rpc("rpc_client_management_list", {
    p_search: search,
    p_category: category,
    p_sort: rpcSort,
  });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeClientRow) : [];
}

export async function getClientManagementDetail(clientId) {
  const { data, error } = await supabase.rpc("rpc_client_management_detail", {
    p_client_id: Number(clientId),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientDetail(row) : null;
}

export async function listClientManagementAmcOptions() {
  const { data, error } = await supabase.rpc("rpc_client_management_amc_options");
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeAmcOption) : [];
}

export async function createClientManagementClient(payload) {
  const { data, error } = await supabase.rpc("rpc_client_management_create", {
    p_client: payload,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientMutation(row) : null;
}

export async function updateClientManagementClient(clientId, patch) {
  const { data, error } = await supabase.rpc("rpc_client_management_update", {
    p_client_id: Number(clientId),
    p_patch: patch,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientMutation(row) : null;
}

export async function archiveClientManagementClient(clientId, reason = null, requestId = null) {
  const { data, error } = await supabase.rpc("rpc_client_management_archive", {
    p_client_id: Number(clientId),
    p_reason: reason ?? null,
    p_request_id: requestId ?? null,
  });
  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}
