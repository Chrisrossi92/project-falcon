// Owns order business workflow/status transitions and notification side effects.
// Generic raw reads/writes should live in "@/lib/api/orders".
import supabase from "@/lib/supabaseClient";
import { emitNotification, fetchAdminRecipients } from "@/lib/services/notificationsService";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";

const ORDERS_TABLE = "orders";

export const OrderStatus = ORDER_STATUS;

/** Compatibility helper used by legacy UI callers. */
export async function updateOrderStatus(orderId, status, extra = {}) {
  const patch = { status, ...(extra || {}) };
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function startReview(orderId, note = null) {
  return updateOrderStatus(orderId, OrderStatus.IN_REVIEW);
}
export async function requestRevisions(orderId, note = null) {
  return updateOrderStatus(orderId, OrderStatus.NEEDS_REVISIONS);
}
export async function markReadyForClient(orderId, note = null) {
  return updateOrderStatus(orderId, OrderStatus.READY_FOR_CLIENT);
}
export async function approveReview(orderId, note = null) {
  return markReadyForClient(orderId, note);
}
export async function markReadyToSend(orderId, note = null) {
  return markReadyForClient(orderId, note);
}
export async function markComplete(orderId, note = null) {
  return updateOrderStatus(orderId, OrderStatus.COMPLETED);
}
export async function putOnHold(orderId, note = null) {
  return updateOrderStatus(orderId, OrderStatus.IN_PROGRESS);
}
export async function resumeInProgress(orderId, note = null) {
  return updateOrderStatus(orderId, OrderStatus.IN_PROGRESS);
}
export async function sendToClient(orderId, note = null) {
  return markComplete(orderId, note);
}
export async function markDelivered(orderId, note = null) {
  return sendToClient(orderId, note);
}

export async function sendOrderToReview(orderId, actorId) {
  const { data: order, error } = await supabase
    .from(ORDERS_TABLE)
    .update({ status: OrderStatus.IN_REVIEW })
    .eq("id", orderId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new Error("No order updated (permission or id mismatch).");

  const recipients = [];
  if (order.reviewer_id) {
    recipients.push({ userId: order.reviewer_id, role: "reviewer" });
  }
  recipients.push(...(await fetchAdminRecipients()));

  if (recipients.length > 0) {
    emitNotification("order.sent_to_review", { recipients, order }).catch((err) =>
      console.error("order.sent_to_review notification failed", err)
    );
  }

  return order;
}

export async function sendOrderBackToAppraiser(orderId, actorId) {
  const { data: order, error } = await supabase
    .from(ORDERS_TABLE)
    .update({ status: OrderStatus.NEEDS_REVISIONS })
    .eq("id", orderId)
    .select("id, appraiser_id, reviewer_id, order_number, status")
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new Error("No order updated (permission or id mismatch).");

  const recipients = [];
  if (order.appraiser_id) {
    recipients.push({ userId: order.appraiser_id, role: "appraiser" });
  }
  recipients.push(...(await fetchAdminRecipients()));

  if (recipients.length > 0) {
    emitNotification("order.sent_back_to_appraiser", { recipients, order }).catch((err) =>
      console.error("order.sent_back_to_appraiser notification failed", err)
    );
  }

  return order;
}

export async function completeOrder(orderId, actorId) {
  const { data: order, error } = await supabase
    .from(ORDERS_TABLE)
    .update({ status: OrderStatus.COMPLETED })
    .eq("id", orderId)
    .select("id, appraiser_id, reviewer_id, order_number, status")
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new Error("No order updated (permission or id mismatch).");

  const recipients = [...(await fetchAdminRecipients())];
  if (order.appraiser_id) {
    recipients.push({ userId: order.appraiser_id, role: "appraiser" });
  }

  if (recipients.length > 0) {
    emitNotification("order.completed", { recipients, order }).catch((err) =>
      console.error("order.completed notification failed", err)
    );
  }

  return order;
}
