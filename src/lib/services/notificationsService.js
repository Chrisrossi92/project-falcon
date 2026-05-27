import { supabase } from "@/lib/supabaseClient";
import {
  buildNotificationBodyFromRegistry,
  buildNotificationTitleFromRegistry,
  getNotificationEvent,
} from "@/features/notifications/notificationEvents";

const debug = process.env.NODE_ENV === "development";

export async function fetchAdminRecipients() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, role, status")
      .in("role", ["owner", "admin"]);
    if (error) throw error;
    if (data && data.length) {
      return (data || [])
        .filter((u) => !u.status || u.status.toLowerCase() === "active")
        .filter((u) => !!u.id)
        .map((u) => ({ userId: u.id, role: "admin" }))
        .filter((u) => !!u.userId);
    }
  } catch (err) {
    if (debug) console.debug("[fetchAdminRecipients] failed", err?.message || err);
  }
  return [];
}

async function resolveRecipientUserId(userId) {
  if (!userId) return null;

  try {
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("id, auth_id")
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .maybeSingle();

    if (!userErr && userRow?.id) return userRow.id;
  } catch (err) {
    if (debug) console.debug("[resolveRecipientUserId] users lookup failed", err?.message || err);
  }

  return null;
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function isShortIdLike(value, orderId) {
  const raw = String(value || "").trim();
  const id = String(orderId || "").trim();
  return !!raw && !!id && raw === id.slice(0, 8);
}

async function resolveOrderNumber(order, payload) {
  const orderId = order?.id || null;
  const candidates = [
    order?.order_number,
    order?.orderNumber,
    order?.order_no,
    payload?.order_number,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value && !isUuidLike(value) && !isShortIdLike(value, orderId)) return value;
  }

  if (!orderId) return null;

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("order_number")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;

    const value = String(data?.order_number || "").trim();
    if (value && !isUuidLike(value) && !isShortIdLike(value, orderId)) return value;
  } catch (err) {
    if (debug) console.debug("[resolveOrderNumber] lookup failed", err?.message || err);
  }

  return null;
}

/**
 * recipients: array of { userId: string, role: "appraiser" | "admin" | "reviewer" | "owner" }
 * order: OrderFrontend or raw order row (must at least have id & order_number)
 */
export async function emitNotification(eventKey, { recipients, order, payload = {} }) {
  try {
    if (!recipients || recipients.length === 0) return;

    const { data: policyRow, error: policyError } = await supabase
      .from("notification_policies")
      .select("rules")
      .eq("key", eventKey)
      .maybeSingle();

    if (policyError || !policyRow?.rules) {
      if (debug) console.debug("[emitNotification] no policy for key", eventKey);
      return;
    }

    const rules = policyRow.rules;
    const eventDefinition = getNotificationEvent(eventKey);
    const category = rules.category || eventDefinition?.category || "order";
    const priority = rules.priority || eventDefinition?.priority || "normal";

    const inserts = [];
    const seenRecipientIds = new Set();

    for (const recipient of recipients) {
      const userId = recipient?.userId ?? null;
      const role =
        typeof recipient?.role === "string" && recipient.role.trim()
          ? recipient.role.trim().toLowerCase()
          : null;
      if (!userId || !role) continue;

      const recipientUserId = await resolveRecipientUserId(userId);
      if (!recipientUserId) continue;
      if (seenRecipientIds.has(recipientUserId)) continue;

      const roleRules = rules.roles?.[role];
      if (!roleRules) continue;

      // For MVP we only care about in_app.default / required
      const inAppDefault = !!roleRules.in_app?.default;
      const inAppRequired = !!roleRules.in_app?.required;

      const shouldInApp = inAppRequired || inAppDefault;
      if (!shouldInApp) continue;

      const orderNumber = await resolveOrderNumber(order, payload);
      const notificationContext = { order, orderNumber, payload, recipient };
      const title = buildNotificationTitleFromRegistry(eventKey, notificationContext);
      const body = buildNotificationBodyFromRegistry(eventKey, notificationContext);
      const normalizedPayload = {
        order_number: orderNumber,
        status: order?.status,
        client_name: order?.client_name,
        address_line1: order?.address_line1,
        city: order?.city,
        state: order?.state,
        review_due_at: order?.review_due_at,
        final_due_at: order?.final_due_at,
        ...payload,
      };
      normalizedPayload.order_number = orderNumber;

      seenRecipientIds.add(recipientUserId);
      inserts.push({
        user_id: recipientUserId,
        type: eventKey,
        category,
        priority,
        title,
        body,
        order_id: order?.id || null,
        link_path: order?.id ? `/orders/${order.id}` : null,
        payload: normalizedPayload,
      });
    }

    if (!inserts.length) return;

    await Promise.all(
      inserts.map(async (row) => {
        try {
          const { error } = await supabase.rpc("rpc_notification_create", { patch: row });
          if (!error) return;
          if (debug) console.debug("[emitNotification] insert failed", error?.message || error);
        } catch (err) {
          if (debug) console.debug("[emitNotification] insert failed", err?.message || err);
        }
        return null;
      })
    );
  } catch (err) {
    if (eventKey === "order.new_assigned") {
      console.error("[emitNotification][order.new_assigned] failed", err);
    }
    if (debug) console.debug("[emitNotification] failed", err?.message || err);
  }
}

export async function markRead(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabase.rpc("rpc_mark_notification_read", { p_notification_id: id });
    if (error) throw error;
    return data;
  } catch (err) {
    if (debug) console.debug("[markRead] failed", err?.message || err);
    return null;
  }
}
