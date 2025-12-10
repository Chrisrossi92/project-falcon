import { supabase } from "@/lib/supabaseClient";

/**
 * recipients: array of { userId: string, role: "appraiser" | "admin" | "reviewer" | "owner" }
 * order: OrderFrontend or raw order row (must at least have id & order_number)
 */
export async function emitNotification(eventKey, { recipients, order, payload = {} }) {
  console.log("[emitNotification] called", { eventKey, recipients, orderId: order?.id });
  if (!recipients || recipients.length === 0) return;

  // 1. Load policy for this event
  const { data: policyRow, error: policyError } = await supabase
    .from("notification_policies")
    .select("rules")
    .eq("key", eventKey)
    .maybeSingle();

  if (policyError || !policyRow?.rules) {
    console.error("[emitNotification] no policy for key", eventKey, policyError);
    return;
  }
  console.log("[emitNotification] policy loaded", { eventKey });

  const rules = policyRow.rules;
  const category = rules.category || "order";
  const priority = rules.priority || "normal";

  const notificationsToInsert = [];

  for (const recipient of recipients) {
    const { userId, role } = recipient;
    if (!userId || !role) continue;

    const roleRules = rules.roles?.[role];
    if (!roleRules) continue;

    // For MVP we only care about in_app.default / required
    const inAppDefault = !!roleRules.in_app?.default;
    const inAppRequired = !!roleRules.in_app?.required;

    const shouldInApp = inAppRequired || inAppDefault;
    if (!shouldInApp) continue;

    // Build title/body – keep it simple for now
    const orderNumber = order?.order_number || order?.orderNumber || order?.id;
    const title = buildNotificationTitle(eventKey, orderNumber);
    const body = buildNotificationBody(eventKey, order, payload);

    notificationsToInsert.push({
      user_id: userId,
      type: eventKey,
      category,
      priority,
      title,
      body,
      order_id: order?.id || null,
      link_path: order?.id ? `/orders/${order.id}` : null,
      payload: {
        order_number: orderNumber,
        status: order?.status,
        client_name: order?.client_name,
        address_line1: order?.address_line1,
        city: order?.city,
        state: order?.state,
        review_due_at: order?.review_due_at,
        final_due_at: order?.final_due_at,
        ...payload,
      },
    });
  }

  if (notificationsToInsert.length === 0) {
    console.log("[emitNotification] nothing to insert for", eventKey);
    return;
  }

  console.log("[emitNotification] inserting", notificationsToInsert);
  const { error: insertError } = await supabase
    .from("notifications")
    .insert(notificationsToInsert);

  if (insertError) {
    console.error("[emitNotification] insert failed", insertError);
  } else {
    console.log("[emitNotification] insert success", { count: notificationsToInsert.length });
  }
}

export async function markRead(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("[markRead] failed", error);
    throw error;
  }
  return data;
}

function buildNotificationTitle(eventKey, orderNumber) {
  const num = orderNumber || "order";
  switch (eventKey) {
    case "order.new_assigned":
      return `Order ${num} assigned`;
    case "order.sent_to_review":
      return `Order ${num} sent to review`;
    case "order.sent_back_to_appraiser":
      return `Revisions requested: ${num}`;
    case "order.completed":
      return `Order ${num} completed`;
    default:
      return `Order ${num} updated`;
  }
}

function buildNotificationBody(eventKey, order, payload) {
  const client = order?.client_name || "client";
  switch (eventKey) {
    case "order.new_assigned":
      // keep admin anonymous
      return `A new order was assigned for ${client}.`;
    case "order.sent_to_review":
      return `Appraiser sent this report for review.`;
    case "order.sent_back_to_appraiser":
      return `Reviewer requested changes to this report.`;
    case "order.completed":
      return `Report for ${client} was marked complete.`;
    default:
      return payload?.message || "";
  }
}
