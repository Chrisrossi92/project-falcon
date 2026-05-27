// src/lib/api/orders.js
import supabase from "@/lib/supabaseClient";
import { OrderStatus, updateSiteVisitAtViaRpc } from "@/lib/services/ordersService";

const VIEW_BY_SCOPE = {
  dashboard: "v_orders_active_frontend_v4",
  orders: "v_orders_frontend_v4",
};

const DEFAULT_VIEW = VIEW_BY_SCOPE.orders;
const RETIRED_LIFECYCLE_STATUSES = ["cancelled", "voided"];
const ORDERABLE_COLUMNS = new Set([
  "created_at",
  "updated_at",
  "order_number",
  "status",
  "client_name",
  "appraiser_name",
  "review_due_date",
  "final_due_date",
]);
const REPORT_WRITING_STATUSES = ["new", "in_progress", "needs_revisions"];
const REVIEW_QUEUE_STATUSES = [
  OrderStatus.IN_REVIEW,
  OrderStatus.NEEDS_REVISIONS,
  OrderStatus.REVIEW_CLEARED,
];

function warnDeprecatedDirectOrderMutation(helperName, replacement) {
  if (import.meta.env?.DEV !== true) return;
  const suffix = replacement ? ` Use ${replacement} instead.` : "";
  console.warn(
    `[ordersApi] ${helperName} performs a direct orders table mutation and is deprecated.${suffix}`
  );
}

function throwDeprecatedOrderStatusHelper() {
  throw new Error("Order status changes must use canonical workflow transition RPCs.");
}

function throwDeprecatedOrderAssignmentHelper() {
  throw new Error("Order assignment changes must use backend-owned assignment/order RPCs.");
}

const BASE_SELECT = `
  id,
  order_id,
  order_number,
  status,
  is_archived,
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
  site_visit_at,
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
  client_contact_id,
  client_contact_name,
  client_contact_title,
  client_contact_email,
  client_contact_phone,
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
    assignedToMeUserId = null,
    inspectedAwaitingReport = false,
    finalDueWithinDays = null,
    dueWindow = "",
    from = null,
    to = null,
  search = "",
  includeArchived = false,
  includeRetiredLifecycle = false,
  } = {}
) {
  if (!includeArchived) {
    q = q.or("is_archived.is.null,is_archived.eq.false");
  }

  if (!includeRetiredLifecycle) {
    q = q.not("status", "in", `(${RETIRED_LIFECYCLE_STATUSES.join(",")})`);
  }

  if (statusIn?.length) q = q.in("status", statusIn);
  if (clientId) q = q.eq("client_id", clientId);
  const targetAppraiserId = assignedAppraiserId || appraiserId;
  if (targetAppraiserId) q = q.eq("appraiser_id", targetAppraiserId);
  if (reviewerId) q = q.eq("reviewer_id", reviewerId);
  if (assignedToMeUserId) {
    q = q.or(`appraiser_id.eq.${assignedToMeUserId},reviewer_id.eq.${assignedToMeUserId}`);
  }
  if (inspectedAwaitingReport) {
    q = q
      .in("status", REPORT_WRITING_STATUSES)
      .lte("site_visit_date", new Date().toISOString())
      .not("site_visit_date", "is", null);
  }
  if (finalDueWithinDays != null && finalDueWithinDays !== "") {
    const days = Number(finalDueWithinDays);
    if (Number.isFinite(days)) {
      const now = new Date();
      const dueLimit = new Date(now);
      dueLimit.setDate(dueLimit.getDate() + days);
      q = q
        .gte("final_due_date", now.toISOString())
        .lte("final_due_date", dueLimit.toISOString())
        .not("final_due_date", "is", null);
    }
  }
  if (dueWindow === "overdue") {
    q = q
      .lt("final_due_date", new Date().toISOString())
      .not("final_due_date", "is", null);
  }

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
    assignedToMeUserId = null,
    inspectedAwaitingReport = false,
    finalDueWithinDays = null,
    dueWindow = "",
    from = null,
    to = null,
    activeOnly = false,
    includeArchived = false,
    includeRetiredLifecycle = false,
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
    includeArchived,
    includeRetiredLifecycle,
    statusIn,
    clientId,
    appraiserId,
    assignedAppraiserId,
    reviewerId,
    assignedToMeUserId,
    inspectedAwaitingReport,
    finalDueWithinDays,
    dueWindow,
    from,
    to,
    search,
  });

  if (mode === "reviewerQueue") {
    countQuery = countQuery.in("status", REVIEW_QUEUE_STATUSES);
  }

  const { count, error: countErr } = await countQuery;
  if (countErr) console.warn("fetchOrdersWithFilters count error:", countErr?.message || countErr);

  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  const safeOrderBy = ORDERABLE_COLUMNS.has(orderBy) ? orderBy : "created_at";

  let dataQuery = supabase
    .from(source)
    .select(BASE_SELECT, { count: "exact" })
    .range(fromIdx, toIdx);

  if (scope === "dashboard") {
    dataQuery = dataQuery
      .order("order_number", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false });
  } else {
    dataQuery = dataQuery.order(safeOrderBy, { ascending });
  }

  dataQuery = applyCommonFilters(dataQuery, {
    activeOnly,
    includeArchived,
    includeRetiredLifecycle,
    statusIn,
    clientId,
    appraiserId,
    reviewerId,
    assignedAppraiserId,
    assignedToMeUserId,
    inspectedAwaitingReport,
    finalDueWithinDays,
    dueWindow,
    from,
    to,
    search,
  });

  if (mode === "reviewerQueue") {
    dataQuery = dataQuery.in("status", REVIEW_QUEUE_STATUSES);
  }

  const { data, error } = await dataQuery;
  const derivedCount = typeof count === "number" ? count : (data ? data.length : 0);
  if (error) return { rows: [], count: derivedCount, error };

  return { rows: data || [], count: derivedCount, countError: countErr || null };
}

export async function listHistoricalOrders(filters = {}) {
  const {
    includeArchived: _includeArchived,
    includeRetiredLifecycle: _includeRetiredLifecycle,
    scope: _scope,
    ...readFilters
  } = filters;

  return fetchOrdersWithFilters({
    ...readFilters,
    scope: "orders",
    includeArchived: true,
    includeRetiredLifecycle: true,
  });
}

// (rest of file unchanged)



/* =========================================================================
   Mutations
   ========================================================================= */

/**
 * Legacy/quarantined status mutation path.
 * Do not use for lifecycle transitions; use canonical workflow transition helpers/RPC.
 *
 * Deprecated for normal workflow lifecycle actions.
 * This bypasses the guarded workflow helpers in src/lib/services/ordersService.js.
 * Use those workflow helpers for normal status transitions.
 */
export async function updateOrderStatus(_orderId, _next) {
  warnDeprecatedDirectOrderMutation("updateOrderStatus", "canonical workflow transition helpers");
  return throwDeprecatedOrderStatusHelper();
}

/** Update date fields; pass any subset: { siteVisit, reviewDue, finalDue } */
export async function updateOrderDates(
  orderId,
  { siteVisit = null, reviewDue = null, finalDue = null } = {}
) {
  warnDeprecatedDirectOrderMutation("updateOrderDates", "updateSiteVisitAtViaRpc or updateOrderViaRpc");
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
export async function assignAppraiser(_orderId, _appraiserId) {
  warnDeprecatedDirectOrderMutation("assignAppraiser", "backend-owned assignment/order RPCs");
  return throwDeprecatedOrderAssignmentHelper();
}

/** Assign client by client id. */
export async function assignClient(orderId, clientId) {
  warnDeprecatedDirectOrderMutation("assignClient", "a guarded order/client attachment RPC");
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

/**
 * Legacy/quarantined status mutation path.
 * Do not use for lifecycle transitions; use canonical workflow transition helpers/RPC.
 *
 * Deprecated for normal workflow lifecycle actions.
 * This bypasses the guarded workflow helpers in src/lib/services/ordersService.js.
 * Use those workflow helpers for normal status transitions.
 */
export async function bulkUpdateStatus(_orderIds = [], _status) {
  warnDeprecatedDirectOrderMutation("bulkUpdateStatus", "canonical workflow transition helpers");
  return throwDeprecatedOrderStatusHelper();
}

/** Bulk assign appraiser. */
export async function bulkAssignAppraiser(_orderIds = [], _appraiserId) {
  warnDeprecatedDirectOrderMutation("bulkAssignAppraiser", "backend-owned assignment/order RPCs");
  return throwDeprecatedOrderAssignmentHelper();
}

/* =========================================================================
   Creation / soft delete
   ========================================================================= */

/** Minimal create (expand as your schema evolves). */
export async function createOrder(payload = {}) {
  warnDeprecatedDirectOrderMutation("createOrder", "createOrderViaRpc");
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
    client_contact_id: payload.client_contact_id ?? null,
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
export async function archiveOrder(_orderId) {
  warnDeprecatedDirectOrderMutation("archiveOrder", "rpc_order_archive");
  throw new Error("Order archive/delete must use backend-owned lifecycle RPCs.");
}

/* =========================================================================
   Calendar helpers
   ========================================================================= */

/** Update site visit and mirror to calendar RPC (best-effort). */
export const updateSiteVisitAt = async (orderId, newDateTime, extras) => {
  let updatedOrder = null;
  try {
    updatedOrder = await updateSiteVisitAtViaRpc(orderId, newDateTime);
  } catch (error) {
    console.error("Error updating site visit:", error);
    return null;
  }

  if (newDateTime) {
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
  }

  return updatedOrder;
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
