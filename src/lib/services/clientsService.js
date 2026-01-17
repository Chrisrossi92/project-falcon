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
    .from("v_orders_frontend_v4")
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

/** Quick search for picking a merge target (excludes the current id). */
export async function searchClientsByName(term, { excludeId = null, limit = 10 } = {}) {
  const like = `%${(term || "").trim()}%`;
  let q = supabase.from("clients")
    .select("id,name,category,status,is_merged,merged_into_id")
    .ilike("name", like)
    .order("name", { ascending: true })
    .limit(limit);

  if (excludeId != null) q = q.neq("id", excludeId);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** RPC-driven merge */
export async function mergeClients(sourceId, targetId, strategy = {}) {
  const { data, error } = await supabase.rpc("merge_clients", {
    p_source_id: Number(sourceId),
    p_target_id: Number(targetId),
    p_strategy: strategy
  });
  if (error) throw error;
  return data;
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
/**
 * Case-insensitive exact-match check via RPC.
 * Accepts either { ignoreClientId } or { excludeId } for backward compatibility.
 */
export async function isClientNameAvailable(
  name,
  { ignoreClientId = null, excludeId = null } = {}
) {
  const trimmed = (name || "").trim();
  if (!trimmed) return true;

  // Coalesce option names and coerce to bigint-compatible Number (or null)
  const rawId = ignoreClientId ?? excludeId ?? null;
  const p_ignore_id =
    rawId == null ? null :
    typeof rawId === "string" ? Number(rawId.trim()) :
    typeof rawId === "number" ? rawId : null;

  const { data, error } = await supabase.rpc("client_name_taken", {
    p_name: trimmed,
    p_ignore_id,
  });
  if (error) throw error;

  // RPC returns "is taken?" -> available if false
  return !data;
}

/* ============================== COMPAT ALIASES ============================== */
// Older code sometimes imports these names:
export const fetchClients = listClients;
export const fetchClientById = getClient;
export const getClientById = getClient;
export const fetchClientOrders = listClientOrders;













