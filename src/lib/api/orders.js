// src/lib/api/orders.js
import supabase from "@/lib/supabaseClient";

const SOURCE = "v_orders_frontend_v3";

function applyCommonFilters(q, {
  activeOnly = true,
  statusIn = null,
  clientId = null,
  appraiserId = null,
  from = null,
  to = null,
  search = "",
} = {}) {
  if (activeOnly) {
    // hide completed
    q = q.not("status", "in", '("Complete","Completed","COMPLETE")');
    // hide archived (treat null as false)
    q = q.or("is_archived.is.null,is_archived.eq.false");
  }

  if (statusIn?.length) q = q.in("status", statusIn);
  if (clientId) q = q.eq("client_id", clientId);
  if (appraiserId) q = q.eq("appraiser_id", appraiserId);
  if (from) q = q.gte("date_ordered", from);
  if (to)   q = q.lte("date_ordered", to);

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or([
      `order_no.ilike.${s}`,
      `display_title.ilike.${s}`,
      `display_subtitle.ilike.${s}`,
      `address.ilike.${s}`,
    ].join(","));
  }

  return q;
}

export async function fetchOrdersWithFilters(filters = {}) {
  const {
    search = "",
    statusIn = null,
    clientId = null,
    appraiserId = null,
    from = null,
    to = null,
    activeOnly = true,
    page = 0,
    pageSize = 50,
    orderBy = "date_ordered",
    ascending = false,
  } = filters;

  // COUNT (make sure filters are applied here too)
  let countQuery = supabase.from(SOURCE).select("*", { count: "exact", head: true });
  countQuery = applyCommonFilters(countQuery, { activeOnly, statusIn, clientId, appraiserId, from, to, search });
  const { count, error: countErr } = await countQuery;
  if (countErr) {
    console.error("fetchOrdersWithFilters count error:", countErr);
  }

  // DATA
  const fromIdx = page * pageSize;
  const toIdx   = fromIdx + pageSize - 1;

  let dataQuery = supabase
    .from(SOURCE)
    .select(`
  id,
  order_no,
  display_title,
  display_subtitle,
  client_id,
  client_name,
  appraiser_id,
  appraiser_name,
  assigned_appraiser_id,
  assigned_appraiser_name,
  status,
  property_type,
  address,
  city,
  state,
  postal_code,
  site_visit_at,
  review_due_at,
  final_due_at,
  due_date,
  fee_amount,
  fee,
  base_fee,
  date_ordered,
  is_archived
`)
    .order(orderBy, { ascending })
    .range(fromIdx, toIdx);

  dataQuery = applyCommonFilters(dataQuery, { activeOnly, statusIn, clientId, appraiserId, from, to, search });

  const { data, error } = await dataQuery;
  if (error) {
    console.error("fetchOrdersWithFilters error:", error);
    return { rows: [], count: 0 };
  }
  return { rows: data || [], count: count || 0 };
}

/* (the rest of the file can stay as in your last working version – updateOrderStatus,
   updateOrderDates, etc.) */


/* =========================================================================
   Mutations
   ========================================================================= */

/** Update only the order.status. */
export async function updateOrderStatus(orderId, next) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error("updateOrderStatus error:", error);
    throw error;
  }
  return data;
}

/** Update date fields; pass any subset: { siteVisit, reviewDue, finalDue } */
export async function updateOrderDates(
  orderId,
  { siteVisit = null, reviewDue = null, finalDue = null } = {}
) {
  const patch = {};
  if (siteVisit !== null) patch.site_visit_at = siteVisit;
  if (reviewDue !== null) patch.review_due_at = reviewDue;  // <-- correct field
  if (finalDue !== null)  patch.final_due_at  = finalDue;   // <-- correct field

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error("updateOrderDates error:", error);
    throw error;
  }
  return data;
}

/** Assign appraiser by user id. */
export async function assignAppraiser(orderId, appraiserId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ appraiser_id: appraiserId })
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error("assignAppraiser error:", error);
    throw error;
  }
  return data;
}

/** Assign client by client id. */
export async function assignClient(orderId, clientId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ client_id: clientId })
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error("assignClient error:", error);
    throw error;
  }
  return data;
}

/** Bulk status update. */
export async function bulkUpdateStatus(orderIds = [], status) {
  if (!orderIds.length) return { updated: 0 };
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", orderIds)
    .select("id");
  if (error) {
    console.error("bulkUpdateStatus error:", error);
    throw error;
  }
  return { updated: data?.length ?? 0 };
}

/** Bulk assign appraiser. */
export async function bulkAssignAppraiser(orderIds = [], appraiserId) {
  if (!orderIds.length) return { updated: 0 };
  const { data, error } = await supabase
    .from("orders")
    .update({ appraiser_id: appraiserId })
    .in("id", orderIds)
    .select("id");
  if (error) {
    console.error("bulkAssignAppraiser error:", error);
    throw error;
  }
  return { updated: data?.length ?? 0 };
}

/* =========================================================================
   Creation / soft delete
   ========================================================================= */

/** Minimal create (expand as your schema evolves). */
export async function createOrder(payload = {}) {
  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("createOrder error:", error);
    throw error;
  }
  return data;
}

/** Soft delete (archive). */
export async function archiveOrder(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error("archiveOrder error:", error);
    throw error;
  }
  return data;
}

/* =========================================================================
   Calendar helpers
   ========================================================================= */

/** Update site visit and mirror to calendar RPC (best-effort). */
export const updateSiteVisitAt = async (orderId, newDateTime, extras) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ site_visit_at: newDateTime, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select();

  if (error) {
    console.error("Error updating site visit:", error);
    return null;
  }

  try {
    await supabase.rpc("rpc_create_calendar_event", {
      p_event_type: "site_visit",
      p_title: `Site Visit – ${extras?.address || "Subject"}`,
      p_start_at: newDateTime,
      p_end_at: newDateTime,
      p_order_id: orderId,
      p_appraiser_id: extras?.appraiserId ?? null,
      p_location: extras?.address ?? null,
      p_notes: null,
    });
  } catch (e) {
    console.warn("rpc_create_calendar_event (site_visit) failed:", e?.message);
  }

  return data?.[0] || null;
};

/** Read back a single site visit field from orders. */
export const fetchSiteVisitAt = async (orderId) => {
  const { data, error } = await supabase
    .from("orders")
    .select("site_visit_at")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching site visit:", error);
    return null;
  }
  return data;
};


