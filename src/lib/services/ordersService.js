// src/lib/services/ordersService.js
import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst";
import { ORDER_STATUSES, normalizeStatus } from "@/lib/constants/orderStatus";
import { createNotification } from "@/lib/services/notificationsService"; // ✅ use fallback creator

const nowIso = () => new Date().toISOString();

/* ---------- quiet the RPC 404 spam (cache once) ---------- */
let RPC_LOG_EVENT_AVAILABLE = true;
let RPC_NOTIFY_EVENT_AVAILABLE = true;

/** best-effort event logger (never throws) */
async function logEvent(orderId, eventType, message) {
  try {
    // try RPC once; if 404/undefined, stop trying in future
    if (RPC_LOG_EVENT_AVAILABLE) {
      const { error } = await supabase.rpc("rpc_log_event", {
        order_id: orderId,
        event_type: eventType,
        message,
      });
      if (!error) {
        // fanout notifications (optional)
        if (RPC_NOTIFY_EVENT_AVAILABLE) {
          const { error: e2 } = await supabase.rpc(
            "rpc_create_notifications_for_order_event",
            { order_id: orderId, event_type: eventType, message }
          );
          if (e2?.code === "404" || String(e2?.message || "").toLowerCase().includes("could not find the function")) {
            RPC_NOTIFY_EVENT_AVAILABLE = false;
          }
        }
        return;
      }
      if (error?.code === "404" || String(error?.message || "").toLowerCase().includes("could not find the function")) {
        RPC_LOG_EVENT_AVAILABLE = false;
      }
    }

    // ✅ fallback: write activity_log *and* a notification with order_id
    await supabase.from("activity_log").insert({
      order_id: orderId,
      event_type: eventType,
      message,
      created_at: nowIso(),
    });

    try {
      await createNotification({
        user_id: undefined,        // server will set auth uid for RPC; fallback will fill from client
        category: "orders",
        title: eventType,
        body: message,
        order_id: orderId,         // ✅ ensures NotificationBell can navigate
        is_read: false,
        created_at: nowIso(),
      });
    } catch { /* no-op */ }
  } catch {
    /* no-op */
  }
}

/* ---------- helpers to hydrate names without embeds ---------- */
async function hydrateNames(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return list;

  const clientIds = Array.from(
    new Set(list.map((r) => r.client_id).filter((x) => x !== null && x !== undefined))
  );
  const appraiserIds = Array.from(
    new Set(list.map((r) => r.appraiser_id).filter((x) => x))
  );

  const clientsById = {};
  const usersById = {};

  if (clientIds.length) {
    const { data: cs } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", clientIds);
    (cs || []).forEach((c) => (clientsById[c.id] = c));
  }

  if (appraiserIds.length) {
    const { data: us } = await supabase
      .from("users")
      .select("id, display_name, name")
      .in("id", appraiserIds);
    (us || []).forEach((u) => (usersById[u.id] = u));
  }

  return list.map((r) => ({
    ...r,
    client_name:
      r.client_name ??
      (r.client_id != null ? clientsById[r.client_id]?.name : null) ??
      r.manual_client ??
      null,
    appraiser_name:
      r.appraiser_name ??
      (r.appraiser_id ? usersById[r.appraiser_id]?.display_name || usersById[r.appraiser_id]?.name : null) ??
      null,
  }));
}

/* ===========================
   Reads
   =========================== */

export async function fetchOrders() {
  const { data, error } = await rpcFirst(
    async () => supabase.from("orders").select("*").order("created_at", { ascending: false })
  );
  if (error) throw error;
  return hydrateNames(data);
}

export async function fetchOrderById(orderId) {
  const { data, error } = await rpcFirst(async () =>
    supabase.from("orders").select("*").eq("id", orderId).single()
  );
  if (error) throw error;
  const [row] = await hydrateNames([data]);
  return row || null;
}

/* ===========================
   Create / Update / Delete
   =========================== */

export async function createOrder(patch) {
  const safe = { ...patch, created_at: nowIso(), updated_at: nowIso() };
  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_create_order", { payload: safe }),
    async () => {
      const { data: rows, error: err } = await supabase
        .from("orders")
        .insert(safe)
        .select("*");
      return { data: Array.isArray(rows) ? rows[0] : rows, error: err };
    }
  );
  if (error) throw error;
  await logEvent(data.id, "order_created", "Order created");
  return data;
}

export async function updateOrder(orderId, patch) {
  const safe = { ...patch, updated_at: nowIso() };
  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_update_order", { order_id: orderId, patch: safe }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("orders")
        .update(safe)
        .eq("id", orderId)
        .select("*")
        .single();
      return { data: row, error: err };
    }
  );
  if (error) throw error;
  await logEvent(orderId, "order_updated", "Order updated");
  return data;
}

export async function deleteOrder(orderId) {
  const { error } = await rpcFirst(
    () => supabase.rpc("rpc_delete_order", { order_id: orderId }),
    async () => {
      const { error: err } = await supabase.from("orders").delete().eq("id", orderId);
      return { data: null, error: err };
    }
  );
  if (error) throw error;
  await logEvent(orderId, "order_deleted", "Order deleted");
}

/* ===========================
   Status + Dates
   =========================== */

export async function updateOrderStatus(orderId, nextStatus) {
  const normalized = normalizeStatus(nextStatus);
  if (!ORDER_STATUSES.includes(normalized)) {
    throw new Error(`Invalid status: ${nextStatus}`);
  }
  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_update_order_status", { order_id: orderId, next_status: normalized }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("orders")
        .update({ status: normalized, updated_at: nowIso() })
        .eq("id", orderId)
        .select("*")
        .single();
      return { data: row, error: err };
    }
  );
  if (error) throw error;
  await logEvent(orderId, "status_changed", `Status → ${normalized}`);
  return data;
}

/** args: { siteVisit?: ISO, reviewDue?: ISO, finalDue?: ISO } */
export async function updateOrderDates(orderId, args = {}) {
  const patch = {};
  if (args.siteVisit !== undefined) patch.site_visit_at = args.siteVisit;
  if (args.reviewDue !== undefined) patch.review_due_at = args.reviewDue;
  if (args.finalDue !== undefined) patch.final_due_at = args.finalDue;
  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_update_order_dates", { order_id: orderId, ...patch }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("orders")
        .update({ ...patch, updated_at: nowIso() })
        .eq("id", orderId)
        .select("*")
        .single();
      return { data: row, error: err };
    }
  );
  if (error) throw error;

  if ("siteVisit" in args) await logEvent(orderId, "date_changed", "Site visit updated");
  if ("reviewDue" in args) await logEvent(orderId, "date_changed", "Review due updated");
  if ("finalDue" in args) await logEvent(orderId, "date_changed", "Final due updated");
  return data;
}

/* ===========================
   Assignments
   =========================== */

export async function assignReviewer(orderId, reviewerId) {
  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_assign_reviewer", { order_id: orderId, reviewer_id: reviewerId }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("orders")
        .update({ current_reviewer_id: reviewerId, updated_at: nowIso() })
        .eq("id", orderId)
        .select("*")
        .single();
      return { data: row, error: err };
    }
  );
  if (error) throw error;
  await logEvent(orderId, "reviewer_assigned", `Reviewer → ${reviewerId}`);
  return data;
}

export async function assignAppraiser(orderId, appraiserId) {
  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_assign_appraiser", { order_id: orderId, appraiser_id: appraiserId }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("orders")
        .update({ appraiser_id: appraiserId, updated_at: nowIso() })
        .eq("id", orderId)
        .select("*")
        .single();
      return { data: row, error: err };
    }
  );
  if (error) throw error;
  await logEvent(orderId, "appraiser_assigned", `Appraiser → ${appraiserId}`);
  return data;
}

/** Back-compat alias */
export async function assignOrder(orderId, appraiserId) {
  return assignAppraiser(orderId, appraiserId);
}

/* ===========================
   Review route + reviewer flow
   =========================== */

export async function saveReviewRoute(orderId, route) {
  const routeJson = route && typeof route === "object" ? route : { steps: [] };
  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_set_review_route", { order_id: orderId, route: routeJson }),
    async () => {
      const { data: row, error: err } = await supabase
        .from("orders")
        .update({ review_route: routeJson, updated_at: nowIso() })
        .eq("id", orderId)
        .select("*")
        .single();
      return { data: row, error: err };
    }
  );
  if (error) throw error;
  await logEvent(orderId, "review_route_saved", "Review route updated");
  return data;
}
export async function setReviewRoute(orderId, route) {
  return saveReviewRoute(orderId, route);
}

export async function assignNextReviewer(orderId) {
  const { data, error } = await rpcFirst(
    () => supabase.rpc("rpc_assign_next_reviewer", { order_id: orderId }),
    async () => {
      const { data: ord, error: getErr } = await supabase
        .from("orders")
        .select("id, current_reviewer_id, review_route")
        .eq("id", orderId)
        .single();
      if (getErr) return { data: null, error: getErr };
      const steps = Array.isArray(ord?.review_route?.steps) ? ord.review_route.steps : [];
      const first = steps.find((s) => s?.reviewer_id);
      if (!first?.reviewer_id) return { data: null, error: { message: "No reviewer in route" } };
      const reviewerId = first.reviewer_id;
      const { data: row, error: updErr } = await supabase
        .from("orders")
        .update({ current_reviewer_id: reviewerId, updated_at: nowIso() })
        .eq("id", orderId)
        .select("*")
        .single();
      return { data: row, error: updErr };
    }
  );
  if (error) throw error;
  await logEvent(orderId, "reviewer_assigned", "Assigned next reviewer from route");
  return data;
}

export async function startReview(orderId, note) {
  const row = await updateOrderStatus(orderId, "in_review");
  await logEvent(orderId, "review_started", note || "Review started");
  return row;
}
export async function approveReview(orderId, note) {
  const row = await updateOrderStatus(orderId, "ready_to_send");
  await logEvent(orderId, "review_approved", note || "Review approved");
  return row;
}
export async function requestRevisions(orderId, note) {
  const row = await updateOrderStatus(orderId, "revisions");
  await logEvent(orderId, "revisions_requested", note || "Revisions requested");
  return row;
}
export async function requestChanges(orderId, note) {
  return requestRevisions(orderId, note);
}
export async function rejectReview(orderId, note) {
  return requestRevisions(orderId, note || "Review rejected → revisions");
}
export async function sendToClient(orderId, note) {
  const row = await updateOrderStatus(orderId, "sent_to_client");
  await logEvent(orderId, "sent_to_client", note || "Report sent to client");
  return row;
}
export async function markComplete(orderId, note) {
  const row = await updateOrderStatus(orderId, "complete");
  await logEvent(orderId, "order_completed", note || "Order completed");
  return row;
}

/* ===========================
   Misc
   =========================== */

/** Is an order number available? (true = free) */
export async function isOrderNumberAvailable(orderNumber, opts = {}) {
  const ignoreOrderId = opts.ignoreOrderId || null;
  if (!orderNumber) return true;

  const { count, error } = await supabase
    .from("orders")
    .select("*", { head: true, count: "exact" })
    .eq("order_number", orderNumber);
  if (error) throw error;

  if (count > 0 && ignoreOrderId) {
    const { data, error: err2 } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", orderNumber);
    if (err2) throw err2;
    const others = (data || []).filter((r) => r.id !== ignoreOrderId);
    return others.length === 0;
  }
  return (count || 0) === 0;
}




















