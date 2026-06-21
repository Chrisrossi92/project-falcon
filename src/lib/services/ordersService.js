// src/lib/services/ordersService.js
import supabase from "@/lib/supabaseClient";
import { listCompanyAssignableUsers } from "@/features/company-members/assignableUsersApi";
import {
  emitNotification,
  fetchAdminRecipients,
  fetchOrderRoleRecipients,
} from "@/lib/services/notificationsService";
import { resolveOrderParticipants } from "@/lib/orders/resolveOrderParticipants";
import { assertOrderWorkflowTransition } from "@/lib/workflow/orderWorkflowGuards";
import {
  applyOperationalOrderUserNames,
  buildOperationalUserNameMap,
} from "@/lib/utils/userDisplayName";

/** Source of truth */
const ORDERS_TABLE = "orders";
const ORDERS_VIEW  = "v_orders_frontend_v4";
const RETIRED_LIFECYCLE_STATUSES = ["cancelled", "voided"];

function warnDeprecatedDirectOrderMutation(helperName, replacement) {
  if (import.meta.env?.DEV !== true) return;
  const suffix = replacement ? ` Use ${replacement} instead.` : "";
  console.warn(
    `[ordersService] ${helperName} performs a direct orders table mutation and is deprecated.${suffix}`
  );
}

function throwDeprecatedOrderRetirementHelper() {
  throw new Error("Order archive/delete must use backend-owned lifecycle RPCs.");
}

function throwDeprecatedOrderStatusHelper() {
  throw new Error("Order status changes must use canonical workflow transition RPCs.");
}

function throwDeprecatedOrderAssignmentHelper() {
  throw new Error("Order assignment changes must use backend-owned assignment/order RPCs.");
}

async function transitionOrderStatusViaRpc({ orderId, transitionKey, note = null }) {
  const { data: order, error } = await supabase.rpc("rpc_transition_order_status", {
    p_order_id: orderId,
    p_transition_key: transitionKey,
    p_note: note ?? null,
  });

  if (error) throw error;
  if (!order) throw new Error("No order updated (permission or id mismatch).");
  return order;
}

export const OrderStatus = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  NEEDS_REVISIONS: "needs_revisions",
  REVIEW_CLEARED: "review_cleared",
  PENDING_FINAL_APPROVAL: "pending_final_approval",
  READY_FOR_CLIENT: "ready_for_client",
  COMPLETED: "completed",
};

/* ============================================================================
   READS
   ========================================================================== */

/**
 * List orders from the normalized view.
 * - activeOnly: excludes archived, completed, cancelled, and voided statuses.
 * - appraiserId: pins results to the assigned appraiser (used for appraiser dashboards/tables)
 */
export async function listOrders({
  search = "",
  statusIn = [],
  activeOnly = true,
  page = 0,
  pageSize = 50,
  orderBy = "created_at",
  ascending = false,
  appraiserId = null,
  operationsScope = null,
} = {}) {
  const fromIdx = page * pageSize;
  const toIdx   = fromIdx + pageSize - 1;

  let q = supabase
    .from(ORDERS_VIEW)
    .select(
      `
        id,
        operations_scope,
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
        client_contact_id,
        client_contact_name,
        client_contact_title,
        client_contact_email,
        client_contact_phone,
        access_notes,
      `,
      { count: "exact" }
    );

  // Active only: not archived + (status is NULL OR NOT ILIKE 'complete%')
  if (activeOnly) {
    q = q.neq("is_archived", true);
    q = q.not("status", "in", `(${["completed", ...RETIRED_LIFECYCLE_STATUSES].join(",")})`);
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
  if (operationsScope) q = q.eq("operations_scope", operationsScope);

  // Pin to appraiser when provided (appraiser dashboards/tables)
  if (appraiserId) q = q.eq("appraiser_id", String(appraiserId));

  q = q.order(orderBy, { ascending }).range(fromIdx, toIdx);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0, page, pageSize };
}

/** Single order (detail) from the view */
export async function getOrder(orderId) {
  if (!orderId) return null;

  const viewPromise = supabase
    .from(ORDERS_VIEW)
    .select(
      `
        id,
        operations_scope,
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
        client_contact_id,
        client_contact_name,
        client_contact_title,
        client_contact_email,
        client_contact_phone,
        access_notes,
        notes,
        created_at,
        updated_at
      `
    )
    .eq("id", orderId)
    .single();

  const ordersPromise = supabase
    .from(ORDERS_TABLE)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  const [{ data: viewRow, error: viewError }, { data: ordersRow, error: ordersError }] =
    await Promise.all([viewPromise, ordersPromise]);

  if (viewError) throw viewError;
  if (ordersError) throw ordersError;

  const order = viewRow || ordersRow ? { ...(viewRow || {}), ...(ordersRow || {}) } : null;
  if (!order || !(order.appraiser_id || order.reviewer_id || order.assigned_to)) return order;

  try {
    const users = await listCompanyAssignableUsers("all");
    return applyOperationalOrderUserNames(order, buildOperationalUserNameMap(users));
  } catch (error) {
    console.warn("[ordersService] failed to load operational user names", error);
    return order;
  }
}

/* ============================================================================
   WRITES
   ========================================================================== */

/**
 * Deprecated direct order create helper.
 * Use createOrderViaRpc(...) so server-side order numbering, company scope, and
 * client/AMC guards stay authoritative.
 */
export async function createOrder(payload, context = {}) {
  warnDeprecatedDirectOrderMutation("createOrder", "createOrderViaRpc");
  const { data: order, error } = await supabase
    .from(ORDERS_TABLE)
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  return order;
}

export async function createOrderViaRpc(payload) {
  const { data: order, error } = await supabase.rpc("rpc_create_order", {
    payload,
  });
  if (error) throw error;
  return order ?? null;
}

export async function updateOrderViaRpc(orderId, patch) {
  const { data: order, error } = await supabase.rpc("rpc_update_order", {
    order_id: orderId,
    patch,
  });
  if (error) throw error;
  return order ?? null;
}

export async function updateSiteVisitAtViaRpc(orderId, siteVisitAt) {
  return updateOrderViaRpc(orderId, {
    site_visit_at: siteVisitAt || null,
  });
}

export async function overrideOrderNumber(orderId, orderNumber, reason = null) {
  const { data, error } = await supabase.rpc("rpc_order_number_override", {
    p_order_id: orderId,
    p_order_number: orderNumber,
    p_reason: reason,
  });
  if (error) throw error;
  return data ?? null;
}

export async function archiveOrderViaRpc(orderId, reason = null) {
  const { data, error } = await supabase.rpc("rpc_order_archive", {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) throw error;
  return data ?? null;
}

export async function cancelOrderViaRpc(orderId, reason) {
  const normalizedReason = String(reason ?? "").trim();
  if (!normalizedReason) {
    throw new Error("Order cancellation reason is required.");
  }

  const { data, error } = await supabase.rpc("rpc_order_cancel", {
    p_order_id: orderId,
    p_reason: normalizedReason,
  });
  if (error) throw error;
  return data ?? null;
}

export async function voidOrderViaRpc(orderId, reason) {
  const normalizedReason = String(reason ?? "").trim();
  if (!normalizedReason) {
    throw new Error("Order void reason is required.");
  }

  const { data, error } = await supabase.rpc("rpc_order_void", {
    p_order_id: orderId,
    p_reason: normalizedReason,
  });
  if (error) throw error;
  return data ?? null;
}

export async function overrideOrderStatusViaRpc(orderId, targetStatus, reason) {
  const normalizedReason = String(reason ?? "").trim();
  if (!normalizedReason) {
    throw new Error("Order status override reason is required.");
  }

  const { data, error } = await supabase.rpc("rpc_order_status_override", {
    p_order_id: orderId,
    p_target_status: targetStatus,
    p_reason: normalizedReason,
  });
  if (error) throw error;
  return data ?? null;
}

export async function updateOrder(orderId, patch) {
  warnDeprecatedDirectOrderMutation("updateOrder", "updateOrderViaRpc");
  if (Object.prototype.hasOwnProperty.call(patch || {}, "status")) {
    return throwDeprecatedOrderStatusHelper();
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

export async function deleteOrder(_orderId) {
  warnDeprecatedDirectOrderMutation("deleteOrder", "backend-owned lifecycle RPCs");
  return throwDeprecatedOrderRetirementHelper();
}

export async function archiveOrder(_orderId) {
  warnDeprecatedDirectOrderMutation("archiveOrder", "rpc_order_archive");
  return throwDeprecatedOrderRetirementHelper();
}

/**
 * Legacy/quarantined status mutation path.
 * Do not use for lifecycle transitions; use canonical workflow transition helpers/RPC.
 */
export async function setOrderStatus(_orderId, _status /* note optional */) {
  warnDeprecatedDirectOrderMutation("setOrderStatus", "canonical workflow transition helpers");
  return throwDeprecatedOrderStatusHelper();
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
  warnDeprecatedDirectOrderMutation("updateOrderDates", "updateSiteVisitAtViaRpc or updateOrderViaRpc");
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
export async function assignParticipants(_orderId, _participants = {}) {
  warnDeprecatedDirectOrderMutation("assignParticipants", "backend-owned assignment/order RPCs");
  return throwDeprecatedOrderAssignmentHelper();
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

// Legacy/quarantined aliases. Do not use for lifecycle transitions; use canonical workflow transition helpers/RPC.
export async function startReview(orderId, _note = null)        { return setOrderStatus(orderId, OrderStatus.IN_REVIEW); }
export async function requestRevisions(orderId, _note = null)   { return setOrderStatus(orderId, OrderStatus.NEEDS_REVISIONS); }
export async function clearReview(orderId, note = null) {
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from(ORDERS_TABLE)
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError) throw existingOrderError;
  if (!existingOrder) throw new Error("Order not found.");

  const currentStatus = String(existingOrder.status || "").toLowerCase().trim();
  try {
    assertOrderWorkflowTransition({
      currentStatus,
      transitionKey: "approve_review",
      permissions: { loading: true },
      allowDuringPermissionFallback: true,
    });
  } catch (error) {
    if (error?.code === "invalid_status") {
      throw new Error("Order cannot be approved from its current status.");
    }
    throw error;
  }

  const order = await transitionOrderStatusViaRpc({
    orderId,
    transitionKey: "approve_review",
    note,
  });

  const recipients = await fetchAdminRecipients({ orderId: order.id });

  if (recipients.length > 0) {
    emitNotification("order.review_cleared", { recipients, order }).catch(
      (err) => console.error("order.review_cleared notification failed", err)
    );
  }

  return order;
}
export async function requestFinalApproval(orderId, note = null) {
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from(ORDERS_TABLE)
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError) throw existingOrderError;
  if (!existingOrder) throw new Error("Order not found.");

  const currentStatus = String(existingOrder.status || "").toLowerCase().trim();
  try {
    assertOrderWorkflowTransition({
      currentStatus,
      transitionKey: "request_final_approval",
      permissions: { loading: true },
      allowDuringPermissionFallback: true,
    });
  } catch (error) {
    if (error?.code === "invalid_status") {
      throw new Error("Order cannot request final approval from its current status.");
    }
    throw error;
  }

  const order = await transitionOrderStatusViaRpc({
    orderId,
    transitionKey: "request_final_approval",
    note,
  });
  return order;
}
export async function markReadyForClient(orderId, note = null) {
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from(ORDERS_TABLE)
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError) throw existingOrderError;
  if (!existingOrder) throw new Error("Order not found.");

  const currentStatus = String(existingOrder.status || "").toLowerCase().trim();
  try {
    assertOrderWorkflowTransition({
      currentStatus,
      transitionKey: "ready_for_client",
      permissions: { loading: true },
      allowDuringPermissionFallback: true,
    });
  } catch (error) {
    if (error?.code === "invalid_status") {
      throw new Error("Order cannot be marked ready for client from its current status.");
    }
    throw error;
  }

  const order = await transitionOrderStatusViaRpc({
    orderId,
    transitionKey: "ready_for_client",
    note,
  });

  const recipients = [];

  recipients.push(...await fetchOrderRoleRecipients(order.id, "reviewer"));

  const adminRecipients = await fetchAdminRecipients({ orderId: order.id });
  recipients.push(...adminRecipients);

  if (recipients.length > 0) {
    emitNotification("order.ready_for_client", { recipients, order }).catch(
      (err) => console.error("order.ready_for_client notification failed", err)
    );
  }

  return order;
}
export async function approveReview(orderId, note = null)      { return clearReview(orderId, note); }
export async function markReadyToSend(orderId, note = null)    { return clearReview(orderId, note); }
export async function markComplete(orderId, _note = null)       { return setOrderStatus(orderId, OrderStatus.COMPLETED); }
export async function putOnHold(orderId, _note = null)          { return setOrderStatus(orderId, OrderStatus.IN_PROGRESS); }
export async function resumeInProgress(orderId, _note = null)   { return setOrderStatus(orderId, OrderStatus.IN_PROGRESS); }
export async function sendToClient(orderId, note = null)       { return markComplete(orderId, note); }
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

export async function updateOrderStatus(_orderId, _status, _extra = {}) {
  warnDeprecatedDirectOrderMutation("updateOrderStatus", "canonical workflow transition helpers");
  return throwDeprecatedOrderStatusHelper();
}

export async function sendOrderToReview(orderId, actorId, options = {}) {
  const actorUserId = actorId || null;
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from(ORDERS_TABLE)
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError) throw existingOrderError;
  if (!existingOrder) throw new Error("Order not found.");

  const currentStatus = String(existingOrder.status || "").toLowerCase().trim();
  const isResubmission = currentStatus === OrderStatus.NEEDS_REVISIONS;
  try {
    assertOrderWorkflowTransition({
      currentStatus,
      transitionKey: "submit_to_review",
      permissions: { loading: true },
      allowDuringPermissionFallback: true,
    });
  } catch (error) {
    if (error?.code === "invalid_status") {
      throw new Error("Order cannot be sent to review from its current status.");
    }
    throw error;
  }

  const order = await transitionOrderStatusViaRpc({
    orderId,
    transitionKey: "submit_to_review",
    note: options?.note ?? null,
  });

  const resolvedParticipants = resolveOrderParticipants(order, {
    actorUserId,
    actorRole: null,
    event: "workflow.sent_to_review",
    status: order.status,
  });

  let recipients = await fetchOrderRoleRecipients(order.id, "reviewer");

  const adminRecipients = await fetchAdminRecipients({ orderId: order.id });
  recipients.push(...adminRecipients);
  const suppressUserIds = new Set(resolvedParticipants.suppressUserIds.filter(Boolean));
  recipients = recipients.filter((recipient) => !suppressUserIds.has(recipient.userId));

  if (recipients.length > 0) {
    const payload = {
      ...(options?.noteText ? { note_text: options.noteText } : {}),
      ...(isResubmission
        ? { is_resubmission: true, previous_status: OrderStatus.NEEDS_REVISIONS }
        : {}),
    };
    const eventKey = isResubmission ? "order.resubmitted_to_review" : "order.sent_to_review";
    emitNotification(eventKey, { recipients, order, payload }).catch(
      (err) => console.error(`${eventKey} notification failed`, err)
    );
  }

  return order;
}

export async function sendOrderBackToAppraiser(orderId, actorId, options = {}) {
  const actorUserId = actorId || null;

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from(ORDERS_TABLE)
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError) throw existingOrderError;
  if (!existingOrder) throw new Error("Order not found.");

  const currentStatus = String(existingOrder.status || "").toLowerCase().trim();
  try {
    assertOrderWorkflowTransition({
      currentStatus,
      transitionKey: "request_revisions",
      permissions: { loading: true },
      allowDuringPermissionFallback: true,
    });
  } catch (error) {
    if (error?.code === "invalid_status") {
      throw new Error("Order cannot be sent back to appraiser from its current status.");
    }
    throw error;
  }

  const order = await transitionOrderStatusViaRpc({
    orderId,
    transitionKey: "request_revisions",
    note: options?.note ?? null,
  });

  const resolvedParticipants = resolveOrderParticipants(order, {
    actorUserId,
    actorRole: null,
    event: "workflow.sent_back_to_appraiser",
    status: order.status,
  });

  let recipients = await fetchOrderRoleRecipients(order.id, "appraiser");

  const adminRecipients = await fetchAdminRecipients({ orderId: order.id });
  recipients.push(...adminRecipients);
  const suppressUserIds = new Set(resolvedParticipants.suppressUserIds.filter(Boolean));
  recipients = recipients.filter((recipient) => !suppressUserIds.has(recipient.userId));

  if (recipients.length > 0) {
    const payload = options?.noteText ? { note_text: options.noteText } : {};
    emitNotification("order.sent_back_to_appraiser", { recipients, order, payload }).catch(
      (err) =>
        console.error("order.sent_back_to_appraiser notification failed", err)
    );
  }

  return order;
}


export async function completeOrder(orderId, actorId) {
  const actorUserId = actorId || null;

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from(ORDERS_TABLE)
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (existingOrderError) throw existingOrderError;
  if (!existingOrder) throw new Error("Order not found.");

  const currentStatus = String(existingOrder.status || "").toLowerCase().trim();
  try {
    assertOrderWorkflowTransition({
      currentStatus,
      transitionKey: "complete",
      permissions: { loading: true },
      allowDuringPermissionFallback: true,
    });
  } catch (error) {
    if (error?.code === "invalid_status") {
      throw new Error("Order cannot be completed from its current status.");
    }
    throw error;
  }

  const order = await transitionOrderStatusViaRpc({
    orderId,
    transitionKey: "complete",
    note: null,
  });

  const adminRecipients = await fetchAdminRecipients({ orderId: order.id });
  const resolvedParticipants = resolveOrderParticipants(order, {
    actorUserId,
    actorRole: null,
    event: "workflow.completed",
    status: order.status,
  });
  let recipients = [];
  recipients.push(...adminRecipients);

  const appraiserRecipients = await fetchOrderRoleRecipients(order.id, "appraiser");

  recipients.push(...appraiserRecipients);
  const suppressUserIds = new Set(resolvedParticipants.suppressUserIds.filter(Boolean));
  recipients = recipients.filter((recipient) => !suppressUserIds.has(recipient.userId));

  if (recipients.length > 0) {
    emitNotification("order.completed", { recipients, order }).catch((err) =>
      console.error("order.completed notification failed", err)
    );
  }

  return order;
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

export async function isOrderNumberAvailableV2(orderNo, { orderId = null } = {}) {
  const { data, error } = await supabase.rpc("rpc_is_order_number_available_v2", {
    p_order_number: orderNo,
    p_order_id: orderId,
  });

  if (error) throw error;
  return data?.available === true;
}
