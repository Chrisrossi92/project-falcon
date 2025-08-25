// src/lib/services/ordersService.js
import supabase from "@/lib/supabaseClient";
import logOrderEvent from "@/lib/utils/logOrderEvent";

/** Normalize inputs to ISO strings (UTC) or null. */
function toISO(value) {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  const iso = d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  return iso;
}

/** -----------------------------
 *  Fetchers (list / one)
 *  ----------------------------- */

/**
 * List orders for the Orders page.
 * Prefers the helper view (v_orders_list) to get last_activity_at; falls back to table.
 * Always sorts by order_number DESC (newest first).
 */
export async function fetchOrdersList() {
  // Try the view first
  const { data, error } = await supabase
    .from("v_orders_list")
    .select(`
      *,
      client:client_id ( name ),
      appraiser:appraiser_id ( id, display_name, name, email )
    `)
    .order("order_number", { ascending: false });

  if (!error && data) {
    return (data || []).map((r) => ({
      ...r,
      client_name: r.client?.name ?? r.manual_client ?? "—",
      appraiser_name: r.appraiser?.display_name || r.appraiser?.name || "—",
    }));
  }

  // Fallback to base table if the view doesn't exist yet
  const fb = await supabase
    .from("orders")
    .select(`
      *,
      client:client_id ( name ),
      appraiser:appraiser_id ( id, display_name, name, email )
    `)
    .order("order_number", { ascending: false });

  if (fb.error) throw fb.error;

  return (fb.data || []).map((r) => ({
    ...r,
    client_name: r.client?.name ?? r.manual_client ?? "—",
    appraiser_name: r.appraiser?.display_name || r.appraiser?.name || "—",
  }));
}

/** Fetch one order by id (joined). */
export async function fetchOrderById(id) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      client:client_id ( name ),
      appraiser:appraiser_id ( id, display_name, name, email )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return {
    ...data,
    client_name: data.client?.name ?? data.manual_client ?? "—",
    appraiser_name:
      data.appraiser?.display_name || data.appraiser?.name || data.manual_appraiser || "—",
  };
}

/** -----------------------------
 *  Create / assign / status / dates
 *  ----------------------------- */

export async function createOrderWithLogs(orderInput) {
  const { data: order, error } = await supabase
    .from("orders")
    .insert(orderInput)
    .select("*")
    .single();
  if (error) throw error;

  await logOrderEvent({
    order_id: order.id,
    action: "order_created",
    message: "order created",
  });

  if (order.appraiser_id) {
    await logOrderEvent({
      order_id: order.id,
      action: "order_assigned",
      message: `assigned to ${order.appraiser_id}`,
    });
  }
  return order;
}

export async function assignOrder(orderId, appraiserId) {
  const { error } = await supabase.rpc("rpc_update_order_v1", {
    p_order_id: orderId,
    p_appraiser_id: appraiserId,
    p_actor: { source: "ui" },
  });
  if (error) throw error;

  await logOrderEvent({
    order_id: orderId,
    action: "order_assigned",
    message: `assigned to ${appraiserId}`,
  });
}

export async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabase.rpc("rpc_update_order_v1", {
    p_order_id: orderId,
    p_status: newStatus,
    p_actor: { source: "ui" },
  });
  if (error) throw error;

  await logOrderEvent({
    order_id: orderId,
    action: "status_changed",
    new_status: newStatus,
    message: `status → ${newStatus}`,
  });
}

export async function updateOrderDates(orderId, { siteVisit, reviewDue, finalDue }) {
  const payload = {
    p_order_id: orderId,
    p_site_visit: toISO(siteVisit),
    p_review_due: toISO(reviewDue),
    p_final_due: toISO(finalDue),
    p_actor: { source: "ui" },
  };
  const { error } = await supabase.rpc("rpc_update_order_v1", payload);
  if (error) throw error;

  if (payload.p_site_visit) {
    await logOrderEvent({
      order_id: orderId,
      action: "site_visit_set",
      event_type: "appointment",
      event_data: { when: payload.p_site_visit },
      message: "site visit scheduled",
    });
  }
  if (payload.p_review_due || payload.p_final_due) {
    await logOrderEvent({
      order_id: orderId,
      action: "due_dates_updated",
      event_data: { review_due: payload.p_review_due, final_due: payload.p_final_due },
      message: "due dates updated",
    });
  }
}

/** -----------------------------
 *  Review routing & actions
 *  Only Admin/Mike can set route / reassign / finalize.
 *  Reviewers can claim/approve/request changes on their assigned task.
 *  ----------------------------- */

/** Helper: best-effort update on orders table, ignore column-missing (42703). */
async function safeUpdateOrders(orderId, patch) {
  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) {
    const code = String(error.code || "");
    if (code === "42703") return; // column does not exist — ignore for MVP fallback
    throw error;
  }
}

/** Set the review route JSON on an order. Admin/Mike only (enforced by RPC/RLS). */
export async function setReviewRoute(orderId, routeJson) {
  const rpc = await supabase.rpc("rpc_set_review_route", {
    p_order_id: orderId,
    p_route: routeJson,
  });
  if (!rpc.error) {
    await logOrderEvent({
      order_id: orderId,
      action: "review_route_set",
      message: "review route updated",
      context: routeJson,
    });
    return;
  }

  // Fallback
  await safeUpdateOrders(orderId, { review_route: routeJson });
  await logOrderEvent({
    order_id: orderId,
    action: "review_route_set",
    message: "review route updated",
    context: routeJson,
  });
}

/** Choose next reviewer from route and assign. Admin/Mike only. */
export async function assignNextReviewer(orderId) {
  const rpc = await supabase.rpc("rpc_assign_next_reviewer", { p_order_id: orderId });
  if (!rpc.error) {
    await logOrderEvent({
      order_id: orderId,
      action: "review_task_created",
      message: "next reviewer assigned (rpc)",
    });
    return;
  }

  // Fallback (simple): pick first step and assign
  const order = await fetchOrderById(orderId);
  const route = order.review_route || {};
  const steps = Array.isArray(route.steps) ? route.steps : [];
  if (!steps.length) return;

  const target = steps[0];
  const reviewerId = target?.reviewer_id;
  if (!reviewerId) return;

  await safeUpdateOrders(orderId, { current_reviewer_id: reviewerId });
  await logOrderEvent({
    order_id: orderId,
    action: "review_task_created",
    message: `assigned to ${reviewerId}`,
  });
}

/** Manually reassign current reviewer. Admin/Mike only. */
export async function reassignReview(orderId, reviewerId, note) {
  const rpc = await supabase.rpc("rpc_reassign_review", {
    p_order_id: orderId,
    p_reviewer_id: reviewerId,
    p_note: note ?? null,
  });
  if (!rpc.error) {
    await logOrderEvent({
      order_id: orderId,
      action: "review_task_reassigned",
      message: note ?? `reassigned to ${reviewerId}`,
    });
    return;
  }

  // Fallback
  await safeUpdateOrders(orderId, { current_reviewer_id: reviewerId });
  await logOrderEvent({
    order_id: orderId,
    action: "review_task_reassigned",
    message: note ?? `reassigned to ${reviewerId}`,
  });
}

/** Reviewer claims current assignment (must equal auth user). */
export async function claimReview(orderId) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id || null;

  const rpc = await supabase.rpc("rpc_claim_review", { p_order_id: orderId });
  if (!rpc.error) {
    await logOrderEvent({ order_id: orderId, action: "review_claimed", message: `claimed by ${uid}` });
    return;
  }

  // Fallback
  await safeUpdateOrders(orderId, {
    review_claimed_by: uid,
    review_claimed_at: new Date().toISOString(),
  });
  await logOrderEvent({ order_id: orderId, action: "review_claimed", message: `claimed by ${uid}` });
}

/** Reviewer approves. If next step exists, route onward; else finalize to ready_to_send. */
export async function approveReview(orderId) {
  const rpc = await supabase.rpc("rpc_approve_review", { p_order_id: orderId });
  if (!rpc.error) {
    await logOrderEvent({ order_id: orderId, action: "review_step_approved", message: "approved (rpc)" });
    return;
  }

  // Fallback: simple client-side advance
  const order = await fetchOrderById(orderId);
  const route = order.review_route || {};
  const steps = Array.isArray(route.steps) ? route.steps : [];

  if (steps.length > 1) {
    const next = steps[1];
    const reviewerId = next?.reviewer_id || null;
    if (reviewerId) {
      await safeUpdateOrders(orderId, { current_reviewer_id: reviewerId });
      await logOrderEvent({
        order_id: orderId,
        action: "review_task_created",
        message: `assigned to ${reviewerId}`,
      });
      return;
    }
  }

  // Finalize
  await updateOrderStatus(orderId, "ready_to_send");
  await logOrderEvent({
    order_id: orderId,
    action: "review_final_approved",
    message: "final approval; ready to send",
  });
}

/** Reviewer requests changes → set status to revisions. */
export async function requestChanges(orderId, message) {
  const rpc = await supabase.rpc("rpc_request_changes", {
    p_order_id: orderId,
    p_message: message ?? null,
  });
  if (!rpc.error) {
    await logOrderEvent({
      order_id: orderId,
      action: "review_changes_requested",
      message: message || "changes requested",
    });
    return;
  }

  // Fallback
  await updateOrderStatus(orderId, "revisions");
  await logOrderEvent({
    order_id: orderId,
    action: "review_changes_requested",
    message: message || "changes requested",
  });
}









