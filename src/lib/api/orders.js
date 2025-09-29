// src/lib/api/orders.js
import supabase from "@/lib/supabaseClient";

/* =========================================================================
   Core list fetchers
   ========================================================================= */

/** UI list for Orders page (uses v_orders_frontend; safe display fields). */
export async function fetchOrdersForList({ limit = 500, ascending = false } = {}) {
  const { data, error } = await supabase
    .from("v_orders_frontend")
    .select(`
      id,
      order_no,
      display_title,
      display_subtitle,
      client_name,
      appraiser_name,
      status,
      due_date,
      fee_amount,
      date_ordered
    `)
    .order("date_ordered", { ascending })
    .limit(limit);

  if (error) {
    console.error("fetchOrdersForList error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Powerful list with filters & pagination (for tables, exports, dashboards).
 * filters: { search, statusIn, clientId, appraiserId, from, to, activeOnly, page, pageSize, orderBy, ascending }
 * Returns { rows, count }
 */
export async function fetchOrdersWithFilters(filters = {}) {
  const {
    search = "",
    statusIn = null,           // e.g., ['in_progress','in_review']
    clientId = null,
    appraiserId = null,
    from = null,               // date_ordered >= from (YYYY-MM-DD)
    to = null,                 // date_ordered <= to (YYYY-MM-DD)
    activeOnly = true,         // exclude Complete by default
    page = 0,
    pageSize = 50,
    orderBy = "date_ordered",
    ascending = false,
  } = filters;

  // count first
  let queryForCount = supabase
    .from("v_orders_frontend")
    .select("*", { count: "exact", head: true });

  // build filters for both queries
  const applyFilters = (q) => {
    if (activeOnly) {
      // v_orders_frontend uses "Complete" (not "Completed"); include a few variants to be safe.
      const hide = ['Complete', 'COMPLETE', 'Completed'];
      // If you also want to hide cancelled by default, add "Cancelled" here:
      // hide.push('Cancelled', 'CANCELLED');
      q = q.not('status', 'in', `("${hide.join('","')}")`);
    }
    if (statusIn?.length) q = q.in("status", statusIn);
    if (clientId) q = q.eq("client_id", clientId);
    if (appraiserId) q = q.eq("appraiser_id", appraiserId);
    if (from) q = q.gte("date_ordered", from);
    if (to) q = q.lte("date_ordered", to);
    if (search) {
      // simple tri-field ilike; add more fields if needed
      const s = `%${search}%`;
      q = q.or(`order_no.ilike.${s},display_title.ilike.${s},display_subtitle.ilike.${s}`);
    }
    return q;
  };

  // apply filters to count
  const { count, error: countErr } = await applyFilters(queryForCount);
  if (countErr) console.error("fetchOrdersWithFilters count error:", countErr);

  // page rows
  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let query = supabase
    .from("v_orders_frontend")
    .select(`
      id,
      order_no,
      display_title,
      display_subtitle,
      client_id,
      client_name,
      appraiser_id,
      appraiser_name,
      status,
      due_date,
      fee_amount,
      date_ordered
    `)
    .order(orderBy, { ascending })
    .range(fromIdx, toIdx);

  const { data, error } = await applyFilters(query);
  if (error) {
    console.error("fetchOrdersWithFilters error:", error);
    return { rows: [], count: 0 };
  }
  return { rows: data ?? [], count: count ?? 0 };
}

/** All orders for a specific client (for Client Profile page). */
export async function fetchOrdersByClient(clientId, { limit = 1000 } = {}) {
  const { data, error } = await supabase
    .from("v_orders_frontend")
    .select(`
      id,
      order_no,
      display_title,
      display_subtitle,
      status,
      due_date,
      fee_amount,
      date_ordered
    `)
    .eq("client_id", clientId)
    .order("date_ordered", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchOrdersByClient error:", error);
    return [];
  }
  return data ?? [];
}

/** One order for detailed view/drawer (UI-safe). */
export async function fetchOrderForView(orderId) {
  const { data, error } = await supabase
    .from("v_orders_frontend")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("fetchOrderForView error:", error);
    return null;
  }
  return data;
}

/* =========================================================================
   Mutations
   ========================================================================= */

/** Update only the order.status. */
export async function updateOrderStatus(orderId, next) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: next })
    .eq("id", orderId)
    .select()
    .single();
  if (error) {
    console.error("updateOrderStatus error:", error);
    throw error;
  }
  return data;
}

/** Update important date fields; pass any subset: { siteVisit, reviewDue, finalDue } */
export async function updateOrderDates(orderId, { siteVisit = null, reviewDue = null, finalDue = null } = {}) {
  const patch = {};
  if (siteVisit !== null) patch.site_visit_at = siteVisit;
  if (reviewDue !== null) patch.due_for_review = reviewDue;
  if (finalDue !== null) patch.due_to_client = finalDue;

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
    .update({ status })
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
    .update({ is_archived: true })
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
   Calendar helpers (kept from your previous file)
   ========================================================================= */

/** Update site visit and mirror to calendar RPC (best-effort). */
export const updateSiteVisitAt = async (orderId, newDateTime, extras) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ site_visit_at: newDateTime })
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

