// src/lib/services/clientsService.js
import supabase from "@/lib/supabaseClient";

// Legacy compatibility service. Do not add new client-management call sites here.
// New client UI should use company-scoped RPC wrappers in features/clients.

/* ============================== ACTIVE COMPATIBILITY ============================== */
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
        site_visit_at, review_due_at, final_due_at, created_at, client_id
      `,
      { count: "exact" }
    )
    .eq("client_id", idNum)
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (error) throw error;
  return { rows: data || [], count: count || 0 };
}

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
