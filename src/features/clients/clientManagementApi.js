import supabase from "@/lib/supabaseClient";
import { fetchOrdersWithFilters } from "@/lib/api/orders";

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

const parseFee = (value) => {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(number) ? number : null;
};

const orderClientSorters = {
  orders_desc: (a, b) => b.total_orders - a.total_orders || a.name.localeCompare(b.name),
  orders_asc: (a, b) => a.total_orders - b.total_orders || a.name.localeCompare(b.name),
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
};

function orderClientDate(row = {}) {
  return row.updated_at || row.created_at || row.final_due_date || row.review_due_date || null;
}

function normalizeAssignedOrderClientRows(orderRows = [], { search = "", category = "all", sort = "orders_desc" } = {}) {
  const grouped = new Map();

  for (const order of orderRows) {
    const clientId = order.client_id ?? null;
    const clientName = String(order.client_name || "").trim();
    if (!clientId && !clientName) continue;

    const key = clientId ? `id:${clientId}` : `name:${clientName.toLowerCase()}`;
    const existing = grouped.get(key) || {
      id: clientId || key,
      name: clientName || "Untitled client",
      status: "inactive",
      category: "Client",
      primary_contact: null,
      phone: null,
      email: null,
      contact_name_1: null,
      contact_email_1: null,
      contact_phone_1: null,
      total_orders: 0,
      orders_count: 0,
      avg_fee: null,
      avg_total_fee: null,
      last_activity: null,
      last_order_date: null,
      is_merged: false,
      merged_into_id: null,
      feeTotal: 0,
      feeCount: 0,
      activeCount: 0,
    };

    existing.total_orders += 1;
    existing.orders_count = existing.total_orders;

    const status = String(order.status || "").toLowerCase();
    if (!["completed", "complete", "cancelled", "voided"].includes(status)) {
      existing.activeCount += 1;
      existing.status = "active";
    }

    const fee = [order.appraiser_fee, order.base_fee].map(parseFee).find((value) => value != null);
    if (fee != null) {
      existing.feeTotal += fee;
      existing.feeCount += 1;
    }

    const candidateDate = orderClientDate(order);
    if (candidateDate) {
      const candidateTs = new Date(candidateDate).getTime();
      const currentTs = existing.last_order_date ? new Date(existing.last_order_date).getTime() : 0;
      if (Number.isFinite(candidateTs) && candidateTs > currentTs) {
        existing.last_activity = candidateDate;
        existing.last_order_date = candidateDate;
      }
    }

    grouped.set(key, existing);
  }

  const searchTerm = String(search || "").trim().toLowerCase();
  const rows = [...grouped.values()]
    .map(({ feeTotal, feeCount, activeCount, ...row }) => ({
      ...row,
      status: activeCount > 0 ? "active" : row.status,
      avg_fee: feeCount > 0 ? Math.round(feeTotal / feeCount) : null,
      avg_total_fee: feeCount > 0 ? Math.round(feeTotal / feeCount) : null,
    }))
    .filter((row) => {
      if (category !== "all" && String(row.category || "").toLowerCase() !== category) return false;
      if (!searchTerm) return true;
      return String(row.name || "").toLowerCase().includes(searchTerm);
    });

  rows.sort(orderClientSorters[sort] || orderClientSorters.orders_desc);
  return rows;
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

export async function listAssignedOrderClients({
  search = "",
  category = "all",
  sort = "orders_desc",
  appraiserId = null,
} = {}) {
  if (!appraiserId) return [];

  const { rows, error } = await fetchOrdersWithFilters({
    appraiserId,
    includeArchived: true,
    includeRetiredLifecycle: true,
    orderBy: "created_at",
    ascending: false,
    page: 0,
    pageSize: 1000,
    scope: "orders",
  });
  if (error) throw error;

  return normalizeAssignedOrderClientRows(rows, { search, category, sort });
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
