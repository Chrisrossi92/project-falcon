import { supabase } from "@/lib/supabaseClient";

const debug = process.env.NODE_ENV === "development";

export async function fetchAdminRecipients() {
  try {
    // Prefer public.users when it has role/status; fall back to profiles.
    const tables = [
      { name: "users", fields: "id, role, status" },
      { name: "profiles", fields: "id, role, status" },
    ];

    for (const tbl of tables) {
      try {
        const { data, error } = await supabase
          .from(tbl.name)
          .select(tbl.fields)
          .in("role", ["owner", "admin"]);
        if (error) throw error;
        if (data && data.length) {
          return (data || [])
            .filter((u) => !u.status || u.status.toLowerCase() === "active")
            .map((u) => ({ userId: u.id, role: "admin" }));
        }
      } catch (innerErr) {
        if (debug) console.debug(`[fetchAdminRecipients] ${tbl.name} fallback`, innerErr?.message || innerErr);
        continue;
      }
    }
  } catch (err) {
    if (debug) console.debug("[fetchAdminRecipients] failed", err?.message || err);
  }
  return [];
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
    const category = rules.category || "order";
    const priority = rules.priority || "normal";

    const inserts = [];

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

      const orderNumber = order?.order_number || order?.orderNumber || order?.id;
      const title = buildNotificationTitle(eventKey, orderNumber);
      const body = buildNotificationBody(eventKey, order, payload);

      inserts.push({
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

    if (!inserts.length) return;

    await Promise.all(
      inserts.map((row) =>
        supabase.rpc("rpc_notification_create", { patch: row }).catch((err) => {
          if (debug) console.debug("[emitNotification] insert failed", err?.message || err);
          return null;
        })
      )
    );
  } catch (err) {
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
