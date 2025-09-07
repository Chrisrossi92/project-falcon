// src/lib/services/clientsService.js
import supabase from "@/lib/supabaseClient";

/* ============================== LIST / METRICS ============================== */
/** Biggest clients first by default, with optional name search. */
export async function listClients({
  search = "",
  orderBy = "orders_count",
  descending = true,
} = {}) {
  let q = supabase.from("v_client_metrics").select("*", { count: "exact" });

  if (search) {
    const like = `%${search}%`;
    q = q.or([`name.ilike.${like}`].join(","));
  }

  q = q.order(orderBy, { ascending: !descending }).order("name", { ascending: true });

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data || [], count: count || 0 };
}

/** Orders for a single client (newest first) from normalized orders view. */
export async function listClientOrders(clientId, { page = 0, pageSize = 25 } = {}) {
  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  // Normalize/validate clientId for bigint column
  const idNum =
    typeof clientId === "string" ? Number(clientId.trim()) :
    typeof clientId === "number" ? clientId :
    null;

  if (!Number.isFinite(idNum)) {
    // No valid client id -> don't hit DB with “undefined”
    return { rows: [], count: 0 };
  }

  const { data, error, count } = await supabase
    .from("v_orders_frontend")
    .select(
      `
        id, order_no, client_name, address, status, fee_amount,
        site_visit_at, review_due_at, final_due_at, date_ordered, created_at, client_id
      `,
      { count: "exact" }
    )
    .eq("client_id", idNum)
    .order("date_ordered", { ascending: false })
    .range(fromIdx, toIdx);

  if (error) throw error;
  return { rows: data || [], count: count || 0 };
}


/* ============================== CRUD (clients) ============================== */

export async function getClient(clientId) {
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (error) throw error;
  return data;
}

export async function createClient(payload) {
  const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateClient(clientId, patch) {
  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", clientId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(clientId) {
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
  return true;
}

/* ============================== VALIDATION ============================== */
/** Case-insensitive exact match; optional excludeId for edits. */
export async function isClientNameAvailable(name, { excludeId = null } = {}) {
  const trimmed = (name || "").trim();
  if (!trimmed) return true;

  // First try exact (case-sensitive)
  let q = supabase.from("clients").select("id", { count: "exact", head: true }).eq("name", trimmed);
  if (excludeId) q = q.neq("id", excludeId);
  let { count, error } = await q;
  if (error) throw error;
  if ((count || 0) > 0) return false;

  // Then case-insensitive equality (ILIKE without wildcards)
  let q2 = supabase.from("clients").select("id", { count: "exact", head: true }).ilike("name", trimmed);
  if (excludeId) q2 = q2.neq("id", excludeId);
  const r2 = await q2;
  if (r2.error) throw r2.error;
  return (r2.count || 0) === 0;
}

/* ============================== COMPAT ALIASES ============================== */
// Older code sometimes imports these names:
export const fetchClients = listClients;
export const fetchClientById = getClient;
export const getClientById = getClient;
export const fetchClientOrders = listClientOrders;













