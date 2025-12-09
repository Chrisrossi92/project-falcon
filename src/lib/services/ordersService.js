// src/lib/services/ordersService.js
import supabase from "@/lib/supabaseClient";

/** Source of truth */
const ORDERS_TABLE = "orders";
const ORDERS_VIEW  = "v_orders_frontend_v4";

/* ============================================================================
   READS
   ========================================================================== */

/**
 * List orders from the normalized view.
 * - activeOnly: excludes archived AND any status starting with 'complete' (case-insensitive)
 * - appraiserId: pins results to the assigned appraiser (used for appraiser dashboards/tables)
 */
export async function listOrders({
  search = "",
  statusIn = [],
  activeOnly = true,
  page = 0,
  pageSize = 50,
  orderBy = "date_ordered",
  ascending = false,
  appraiserId = null,
} = {}) {
  const fromIdx = page * pageSize;
  const toIdx   = fromIdx + pageSize - 1;

  let q = supabase
    .from(ORDERS_VIEW)
    .select(
      `
        id,
        order_no:order_number,
        order_number,
        status,
        client_name,
        appraiser_name,
        reviewer_name,
        client_id,
        appraiser_id,
        reviewer_id,
        address_line1,
        city,
        state,
        postal_code,
        property_type,
        report_type,
        fee_amount,
        base_fee,
        appraiser_fee,
        review_due_date:review_due_at,
        final_due_date:final_due_at,
        site_visit_date:site_visit_at,
        created_at,
        updated_at,
        property_contact_name,
        property_contact_phone,
        access_notes,
        appraiser_color,
        reviewer_color
      `,
      { count: "exact" }
    );

  // Active only: not archived + (status is NULL OR NOT ILIKE 'complete%')
  if (activeOnly) {
    q = q.neq("is_archived", true);
    q = q.or("status.is.null,status.not.ilike.complete*");
  }

  if (search) {
    const like = `%${search}%`;
    q = q.or(
  [
    `order_number.ilike.${like}`,
    `client_name.ilike.${like}`,
    `address_line1.ilike.${like}`,
    `city.ilike.${like}`,
  ].join(",")
);

  }

  if (statusIn?.length) q = q.in("status", statusIn);

  // Pin to appraiser when provided (appraiser dashboards/tables)
  if (appraiserId) q = q.eq("assigned_appraiser_id", String(appraiserId));

  q = q.order(orderBy, { ascending }).range(fromIdx, toIdx);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0, page, pageSize };
}

/** Single order (detail) from the view */
export async function getOrder(orderId) {
  if (!orderId) return null;

  const { data, error } = await supabase
    .from(ORDERS_VIEW)
    .select(
      `
        id,
        order_number,
        status,
        client_id,
        client_name,
        amc_id,
        amc_name,
        address_line1,
        city,
        state,
        postal_code,
        property_type,
        report_type,
        site_visit_date,
        review_due_date,
        final_due_date,
        base_fee,
        appraiser_fee,
        split_pct,
        appraiser_id,
        appraiser_name,
        reviewer_id,
        reviewer_name,
        property_contact_name,
        property_contact_phone,
        entry_contact_name,
        entry_contact_phone,
        access_notes,
        notes,
        created_at,
        updated_at
      `
    )
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data ?? null;
}

/* ============================================================================
   WRITES (direct table; RLS enforces permissions)
   ========================================================================== */

export async function createOrder(payload) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(orderId, patch) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOrder(orderId) {
  const { error } = await supabase
    .from(ORDERS_TABLE)
    .delete()
    .eq("id", orderId);
  if (error) throw error;
  return true;
}

export async function archiveOrder(orderId) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update({ is_archived: true })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Set status */
export async function setOrderStatus(orderId, status /* note optional */) {
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update({ status })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update timeline dates; accepts any subset:
 *  - site_visit_at
 *  - review_due_at
 *  - final_due_at (or due_date as alias)
 * Keeps legacy date-only fields in sync (if present) for compatibility.
 */
export async function updateOrderDates(
  orderId,
  { site_visit_at = null, review_due_at = null, final_due_at = null, due_date = null } = {}
) {
  const patch = {};

  if (site_visit_at !== null) {
    patch.site_visit_at = site_visit_at;
    // legacy date-only examples (uncomment if you keep them):
    // patch.inspection_date = site_visit_at ? new Date(site_visit_at) : null;
    // patch.site_visit_date = site_visit_at ? new Date(site_visit_at) : null;
  }

  if (review_due_at !== null) {
    patch.review_due_at   = review_due_at;
    patch.review_due_date = review_due_at ? new Date(review_due_at) : null; // legacy date-only column
  }

  const finalTs = final_due_at ?? due_date ?? null;
  if (finalTs !== null) {
    patch.final_due_at  = finalTs;
    patch.client_due_at = finalTs;                            // legacy alias
    patch.due_to_client = finalTs ? new Date(finalTs) : null; // legacy date-only
    patch.due_date      = finalTs ? new Date(finalTs) : null; // legacy date-only
  }

  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Assign participants (appraiser / reviewer) */
export async function assignParticipants(orderId, { appraiser_id = null, reviewer_id = null } = {}) {
  const patch = {};
  if (appraiser_id !== null) patch.appraiser_id = appraiser_id;
  if (reviewer_id  !== null) patch.reviewer_id  = reviewer_id;

  if (!Object.keys(patch).length) return null;

  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Convenience wrappers (used by forms/drawers) */
export async function assignAppraiser(orderId, appraiser_id) {
  return assignParticipants(orderId, { appraiser_id, reviewer_id: null });
}
export async function assignReviewer(orderId, reviewer_id) {
  return assignParticipants(orderId, { appraiser_id: null, reviewer_id });
}

/* ============================================================================
   WORKFLOW HELPERS
   ========================================================================== */

export async function startReview(orderId, note = null)        { return setOrderStatus(orderId, "in_review"); }
export async function requestRevisions(orderId, note = null)   { return setOrderStatus(orderId, "revisions"); }
export async function approveReview(orderId, note = null)      { return setOrderStatus(orderId, "ready_to_send"); }
export async function markReadyToSend(orderId, note = null)    { return setOrderStatus(orderId, "ready_to_send"); }
export async function markComplete(orderId, note = null)       { return setOrderStatus(orderId, "complete"); }
export async function putOnHold(orderId, note = null)          { return setOrderStatus(orderId, "on_hold"); }
export async function resumeInProgress(orderId, note = null)   { return setOrderStatus(orderId, "in_progress"); }
export async function sendToClient(orderId, note = null)       { return setOrderStatus(orderId, "delivered"); }
export async function markDelivered(orderId, note = null)      { return sendToClient(orderId, note); }

/* ============================================================================
   COMPAT / ALIASES (for older imports)
   ========================================================================== */

export const fetchOrders    = listOrders;
export const fetchOrderById = getOrder;

export async function updateAssignees(orderId, patch) {
  const { appraiser_id = null, reviewer_id = null } = patch || {};
  return assignParticipants(orderId, { appraiser_id, reviewer_id });
}

export async function updateOrderStatus(orderId, status, extra = {}) {
  const patch = { status, ...(extra || {}) };
  return updateOrder(orderId, patch);
}

export async function sendOrderToReview(order, actorId) {
  const patch = {
    status: "IN_REVIEW",
  };
  return updateOrder(order.id, patch);
}

export async function sendOrderBackToAppraiser(order, actorId) {
  return updateOrderStatus(order.id, "NEEDS_REVISIONS");
}

export async function completeOrder(order, actorId) {
  return updateOrderStatus(order.id, "COMPLETE");
}

/** Utility used elsewhere */
export async function isOrderNumberAvailable(orderNo, { excludeId = null } = {}) {
  // First try order_number (if your schema uses it)
  let q = supabase.from(ORDERS_TABLE).select("id", { count: "exact", head: true }).eq("order_number", orderNo);
  if (excludeId) q = q.neq("id", excludeId);
  let { count, error } = await q;
  if (!error && typeof count === "number") return (count || 0) === 0;

  // Fallback to order_no (legacy)
  let q2 = supabase.from(ORDERS_TABLE).select("id", { count: "exact", head: true }).eq("order_no", orderNo);
  if (excludeId) q2 = q2.neq("id", excludeId);
  const res2 = await q2;
  if (res2.error) throw res2.error;
  return (res2.count || 0) === 0;
}
















































