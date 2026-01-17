// src/lib/api/orders.js
import supabase from "@/lib/supabaseClient";
import { OrderStatus } from "@/lib/services/ordersService";

const VIEW_BY_SCOPE = {
  dashboard: "v_orders_active_frontend_v4",
  orders: "v_orders_frontend_v4",
};

const DEFAULT_VIEW = VIEW_BY_SCOPE.orders;
const ORDERABLE_COLUMNS = new Set([
  "created_at",
  "order_number",
  "status",
  "client_name",
  "appraiser_name",
  "review_due_date",
  "final_due_date",
]);

const BASE_SELECT = `
  id,
  order_id,
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
  created_at,
  updated_at
`;

function applyCommonFilters(
  q,
  {
    activeOnly = false,
    statusIn = null,
    clientId = null,
    appraiserId = null,
    reviewerId = null,
    assignedAppraiserId = null,
    from = null,
    to = null,
    search = "",
  } = {}
) {
  if (statusIn?.length) q = q.in("status", statusIn);
  if (clientId) q = q.eq("client_id", clientId);
  const targetAppraiserId = assignedAppraiserId || appraiserId;
  if (targetAppraiserId) q = q.eq("appraiser_id", targetAppraiserId);
  if (reviewerId) q = q.eq("reviewer_id", reviewerId);

  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(
      [
        `order_number.ilike.${s}`,
        `client_name.ilike.${s}`,
        `appraiser_name.ilike.${s}`,
        `address_line1.ilike.${s}`,
        `city.ilike.${s}`,
        `state.ilike.${s}`,
        `property_type.ilike.${s}`,
        `report_type.ilike.${s}`,
      ].join(",")
    );
  }

  return q;
}

export async function fetchOrdersWithFilters(filters = {}) {
  const {
    search = "",
    statusIn = null,
    clientId = null,
    appraiserId = null,
    reviewerId = null,
    assignedAppraiserId = null,
    from = null,
    to = null,
    activeOnly = false,
    page = 0,
    pageSize = 50,
    orderBy = "created_at",
    ascending = false,
    mode = null,
    scope = null,
  } = filters;

  const source = VIEW_BY_SCOPE[scope] || DEFAULT_VIEW;

  let countQuery = supabase
    .from(source)
    .select("*", { count: "exact", head: true });

  countQuery = applyCommonFilters(countQuery, {
    activeOnly,
    statusIn,
    clientId,
    appraiserId,
    assignedAppraiserId,
    reviewerId,
    from,
    to,
    search,
  });

  const { count, error: countErr } = await countQuery;
  if (countErr) console.warn("fetchOrdersWithFilters count error:", countErr?.message || countErr);

  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  const safeOrderBy = ORDERABLE_COLUMNS.has(orderBy) ? orderBy : "created_at";

  let dataQuery = supabase
    .from(source)
    .select(BASE_SELECT, { count: "exact" })
    .order(safeOrderBy, { ascending })
    .range(fromIdx, toIdx);

  dataQuery = applyCommonFilters(dataQuery, {
    activeOnly,
    statusIn,
    clientId,
    appraiserId,
    reviewerId,
    assignedAppraiserId,
    from,
    to,
    search,
  });

  if (mode === "reviewerQueue") {
    const REVIEW_QUEUE_STATUSES = [OrderStatus.IN_REVIEW];
    dataQuery = dataQuery.in("status", REVIEW_QUEUE_STATUSES);
  }

  const { data, error } = await dataQuery;
  const derivedCount = typeof count === "number" ? count : (data ? data.length : 0);
  if (error) return { rows: [], count: derivedCount, error };

  return { rows: data || [], count: derivedCount, countError: countErr || null };
}

// (rest of file unchanged)



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
  // Map form-friendly fields to real columns and drop unknown keys
  const prepared = {
    order_number: payload.order_number || payload.order_no || null,
    status: payload.status || "new",
    manual_client: payload.manual_client ?? payload.manual_client_name ?? payload.client_name ?? null,
    client_id: payload.client_id ?? null,
    manual_appraiser: payload.manual_appraiser ?? null,
    appraiser_id: payload.appraiser_id ?? null,
    reviewer_id: payload.reviewer_id ?? null,
    address: payload.address ?? payload.property_address ?? null,
    property_address: payload.property_address ?? payload.address ?? null,
    city: payload.city ?? payload.property_city ?? null,
    state: payload.state ?? payload.property_state ?? null,
    zip: payload.zip ?? payload.postal_code ?? payload.property_zip ?? null,
    property_type: payload.property_type ?? null,
    report_type: payload.report_type ?? null,
    base_fee: payload.base_fee ?? null,
    fee_amount: payload.fee_amount ?? null,
    appraiser_fee: payload.appraiser_fee ?? null,
    appraiser_split: payload.appraiser_split ?? null,
    split_pct: payload.split_pct ?? null,
    site_visit_at: payload.site_visit_at ?? null,
    review_due_at: payload.review_due_at ?? payload.due_for_review ?? null,
    final_due_at: payload.final_due_at ?? payload.due_to_client ?? null,
    date_ordered: payload.date_ordered ?? new Date().toISOString(),
    due_date: payload.due_date ?? null,
    notes: payload.notes ?? null,
    special_instructions: payload.special_instructions ?? null,
    entry_contact_name: payload.entry_contact_name ?? null,
    entry_contact_phone: payload.entry_contact_phone ?? null,
    property_contact_name: payload.property_contact_name ?? null,
    property_contact_phone: payload.property_contact_phone ?? null,
    access_notes: payload.access_notes ?? null,
    amc_id: payload.amc_id ?? null,
    managing_amc_id: payload.managing_amc_id ?? null,
    external_order_no: payload.external_order_no ?? null,
    client_invoice_amount: payload.client_invoice_amount ?? null,
    client_invoice: payload.client_invoice ?? null,
    invoice_number: payload.invoice_number ?? null,
    paid_status: payload.paid_status ?? null,
    paid_at: payload.paid_at ?? null,
  };

  // Strip undefined keys; allow nulls to be explicit
  const insertPayload = Object.fromEntries(
    Object.entries(prepared).filter(([, v]) => v !== undefined)
  );

  try {
    const { data, error } = await supabase
      .from("orders")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("createOrder failed", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("createOrder failed", err);
    throw err;
  }
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
