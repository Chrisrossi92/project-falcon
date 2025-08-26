// src/lib/services/ordersService.js
import supabase from "@/lib/supabaseClient";
import logOrderEvent from "@/lib/utils/logOrderEvent";
import { createNotification } from "@/lib/services/notificationsService";


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
    // MVP notification to the assigned appraiser
    await createNotification({
      user_id: order.appraiser_id,
      title: "New appraisal assignment",
      body: `Order ${order.order_number || order.id.slice(0,8)} has been assigned to you.`,
      order_id: order.id,
      action: "order_assigned",
    });
  }
  return order;
}
export async function setReadyForReview(orderId) {
  // Log the intent first
  await logOrderEvent({
    order_id: orderId,
    action: "ready_for_review",
    message: "appraiser marked ready for review",
  });

  // Move to In Review (RPC-first via your existing helper)
  await updateOrderStatus(orderId, "in_review");

  // Announce a review task and notify the assigned reviewer
  const order = await fetchOrderById(orderId);
  await logOrderEvent({
    order_id: orderId,
    action: "review_task_created",
    message: `assigned to ${order?.current_reviewer_id || "—"}`,
  });

  if (order?.current_reviewer_id) {
    await createNotification({
      user_id: order.current_reviewer_id,
      title: "New review assignment",
      body: `Order ${order.order_number || orderId.slice(0,8)} is ready for review.`,
      order_id: orderId,
      action: "in_review",
    });
  }
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

  // MVP notification to the new appraiser
  await createNotification({
    user_id: appraiserId,
    title: "New appraisal assignment",
    body: `You’ve been assigned to Order ${orderId}.`,
    order_id: orderId,
    action: "order_assigned",
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
    // Notify the appraiser
    const order = await fetchOrderById(orderId);
    if (order?.appraiser_id) {
      await createNotification({
        user_id: order.appraiser_id,
        title: "Changes requested",
        body: message || "Reviewer requested changes.",
        order_id: orderId,
        action: "review_changes_requested",
      });
    }
    return;
  }

  // Fallback
  await updateOrderStatus(orderId, "revisions");
  await logOrderEvent({
    order_id: orderId,
    action: "review_changes_requested",
    message: message || "changes requested",
  });
  const order = await fetchOrderById(orderId);
  if (order?.appraiser_id) {
    await createNotification({
      user_id: order.appraiser_id,
      title: "Changes requested",
      body: message || "Reviewer requested changes.",
      order_id: orderId,
      action: "review_changes_requested",
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
  const reviewerId = target?.reviewer_id;   // <-- fixed line
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
  // Try RPC first
  const rpc = await supabase.rpc("rpc_approve_review", { p_order_id: orderId });
  if (!rpc.error) {
    await logOrderEvent({ order_id: orderId, action: "review_step_approved", message: "approved (rpc)" });
    return;
  }

  // Fallback: client-side advance using review_route
  const order = await fetchOrderById(orderId);
  const route = order?.review_route || {};
  const steps = Array.isArray(route.steps) ? route.steps : [];

  // If there is no route, just finalize
  if (steps.length === 0) {
    await updateOrderStatus(orderId, "ready_to_send");
    await logOrderEvent({ order_id: orderId, action: "review_final_approved", message: "final approval; ready to send" });
    return;
  }

  // Find current index by matching current_reviewer_id
  const curId = order.current_reviewer_id || null;
  let idx = steps.findIndex(s => s?.reviewer_id && s.reviewer_id === curId);

  // If we don't know where we are (e.g., not claimed yet), assume we just finished step 0
  if (idx < 0) idx = 0;

  const nextIdx = idx + 1;
  const next = steps[nextIdx];

  if (next && next.reviewer_id) {
    // Advance to next reviewer
    await safeUpdateOrders(orderId, { current_reviewer_id: next.reviewer_id });
    await logOrderEvent({
      order_id: orderId,
      action: "review_task_created",
      message: `assigned to ${next.reviewer_id}`,
    });
    return;
  }

  // No next step → finalize
  await updateOrderStatus(orderId, "ready_to_send");
  await logOrderEvent({
    order_id: orderId,
    action: "review_final_approved",
    message: "final approval; ready to send",
  });
}

export async function sendToClient(orderId) {
  // Move to final status
  await updateOrderStatus(orderId, "sent_to_client");

  // Best-effort timestamp (ignore 42703 if column doesn't exist)
  await safeUpdateOrders(orderId, { sent_to_client_at: new Date().toISOString() });

  // Log activity
  await logOrderEvent({
    order_id: orderId,
    action: "order_sent_to_client",
    message: "order sent to client",
  });

  // Notify appraiser (and optionally reviewer/admin if desired)
  const order = await fetchOrderById(orderId);
  if (order?.appraiser_id) {
    await createNotification({
      user_id: order.appraiser_id,
      title: "Order sent to client",
      body: `Order ${order.order_number || orderId.slice(0, 8)} has been sent to the client.`,
      order_id: orderId,
      action: "order_sent_to_client",
    });
  }
}


/** ------------------------------------------------------------------
 *  NEW: calendar-friendly list with NO embeds (prevents relationship
 *  ambiguity errors in Supabase when multiple FKs share a name).
 *  Returns unique orders that have any of the three date fields
 *  within [startISO, endISO).
 *  ------------------------------------------------------------------ */
export async function fetchOrdersInRange(startISO, endISO) {
  const columns = [
    "id",
    "order_number",
    "status",
    "property_address",
    "address",
    "city",
    "state",
    "postal_code",
    "site_visit_at",
    "review_due_at",
    "final_due_at",
    "client_id",
    "appraiser_id",
  ].join(", ");

  const q = (col) =>
    supabase
      .from("orders")
      .select(columns)
      .gte(col, startISO)
      .lt(col, endISO);

  const [site, review, final] = await Promise.allSettled([
    q("site_visit_at"),
    q("review_due_at"),
    q("final_due_at"),
  ]);

  const ok = (res) => res.status === "fulfilled" && !res.value.error;
  const data = (res) => res.value?.data || [];

  if (!ok(site) && !ok(review) && !ok(final)) {
    const err =
      site.value?.error ||
      review.value?.error ||
      final.value?.error ||
      new Error("Failed to load orders");
    throw err;
  }

  const merged = [...data(site), ...data(review), ...data(final)];
  const uniqMap = new Map();
  for (const o of merged) uniqMap.set(o.id, o);
  return Array.from(uniqMap.values());
}










