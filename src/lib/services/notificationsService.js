import { supabase } from "@/lib/supabaseClient";

const debug = process.env.NODE_ENV === "development";

export async function fetchAdminRecipients() {
  try {
    // Prefer public.users when it has role/status; fall back to profiles.
    const tables = [
      { name: "users", fields: "id, auth_id, role, status" },
      { name: "profiles", fields: "id, auth_id, role, status" },
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
            .filter((u) => !!u.id)
            .map((u) => ({ userId: u.id, role: "admin" }))
            .filter((u) => !!u.userId);
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

  try {
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select("id, auth_id")
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .maybeSingle();

    if (!profileErr && profileRow?.auth_id) {
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", profileRow.auth_id)
        .maybeSingle();

      if (!userErr && userRow?.id) return userRow.id;
    }
  } catch (err) {
    if (debug) console.debug("[resolveRecipientUserId] profiles lookup failed", err?.message || err);
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
    const isAssignedDebug = eventKey === "order.new_assigned";
    const isWorkflowNoteDebug = eventKey === "note.reviewer_added" || eventKey === "note.appraiser_added";
    if (!recipients || recipients.length === 0) return;
    if (isAssignedDebug) {
      console.log("[emitNotification][order.new_assigned] start", {
        eventKey,
        rawRecipients: recipients,
        orderId: order?.id ?? null,
      });
    }
    if (isWorkflowNoteDebug) {
      console.log("[emitNotification][workflow-note] start", {
        eventKey,
        rawRecipients: recipients,
        orderId: order?.id ?? null,
      });
    }

    const { data: policyRow, error: policyError } = await supabase
      .from("notification_policies")
      .select("rules")
      .eq("key", eventKey)
      .maybeSingle();

    if (policyError || !policyRow?.rules) {
      if (isAssignedDebug) {
        console.log("[emitNotification][order.new_assigned] policy lookup", {
          foundPolicy: Boolean(policyRow?.rules),
          policyError: policyError ?? null,
        });
      }
      if (isWorkflowNoteDebug) {
        console.log("[emitNotification][workflow-note] policy lookup", {
          eventKey,
          foundPolicy: Boolean(policyRow?.rules),
          policyError: policyError ?? null,
        });
      }
      if (debug) console.debug("[emitNotification] no policy for key", eventKey);
      return;
    }
    if (isAssignedDebug) {
      console.log("[emitNotification][order.new_assigned] policy lookup", {
        foundPolicy: true,
        policyKeys: Object.keys(policyRow.rules || {}),
      });
    }
    if (isWorkflowNoteDebug) {
      console.log("[emitNotification][workflow-note] policy lookup", {
        eventKey,
        foundPolicy: true,
        policyKeys: Object.keys(policyRow.rules || {}),
      });
    }

    const rules = policyRow.rules;
    const category = rules.category || "order";
    const priority = rules.priority || "normal";

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
      if (isAssignedDebug) {
        console.log("[emitNotification][order.new_assigned] recipient resolution", {
          rawUserId: userId,
          role,
          resolvedUserId: recipientUserId,
        });
      }
      if (isWorkflowNoteDebug) {
        console.log("[emitNotification][workflow-note] recipient resolution", {
          eventKey,
          rawUserId: userId,
          role,
          resolvedUserId: recipientUserId,
        });
      }
      if (!recipientUserId) continue;
      if (seenRecipientIds.has(recipientUserId)) continue;

      const roleRules = rules.roles?.[role];
      if (isAssignedDebug) {
        console.log("[emitNotification][order.new_assigned] role rules", {
          role,
          roleRules: roleRules ?? null,
        });
      }
      if (isWorkflowNoteDebug) {
        console.log("[emitNotification][workflow-note] role rules", {
          eventKey,
          role,
          roleRules: roleRules ?? null,
        });
      }
      if (!roleRules) continue;

      // For MVP we only care about in_app.default / required
      const inAppDefault = !!roleRules.in_app?.default;
      const inAppRequired = !!roleRules.in_app?.required;

      const shouldInApp = inAppRequired || inAppDefault;
      if (isAssignedDebug) {
        console.log("[emitNotification][order.new_assigned] in_app decision", {
          role,
          inAppDefault,
          inAppRequired,
          shouldInApp,
        });
      }
      if (isWorkflowNoteDebug) {
        console.log("[emitNotification][workflow-note] in_app decision", {
          eventKey,
          role,
          inAppDefault,
          inAppRequired,
          shouldInApp,
        });
      }
      if (!shouldInApp) continue;

      const orderNumber = await resolveOrderNumber(order, payload);
      const title = buildNotificationTitle(eventKey, orderNumber, payload);
      const body = buildNotificationBody(eventKey, order, payload);
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

    if (isAssignedDebug) {
      console.log("[emitNotification][order.new_assigned] inserts prepared", {
        insertsLength: inserts.length,
        inserts,
      });
    }
    if (isWorkflowNoteDebug) {
      console.log("[emitNotification][workflow-note] inserts prepared", {
        eventKey,
        insertsLength: inserts.length,
      });
    }
    if (!inserts.length) return;

    await Promise.all(
      inserts.map(async (row) => {
        try {
          const { error } = await supabase.rpc("rpc_notification_create", { patch: row });
          if (!error) return;
          if (isAssignedDebug) {
            console.error("[emitNotification][order.new_assigned] rpc_notification_create failed", {
              patch: row,
              error,
            });
          }
          if (isWorkflowNoteDebug) {
            console.error("[emitNotification][workflow-note] rpc_notification_create failed", {
              eventKey,
              patch: row,
              error,
            });
          }
          if (debug) console.debug("[emitNotification] insert failed", error?.message || error);
        } catch (err) {
          if (isAssignedDebug) {
            console.error("[emitNotification][order.new_assigned] rpc_notification_create failed", {
              patch: row,
              error: err,
            });
          }
          if (isWorkflowNoteDebug) {
            console.error("[emitNotification][workflow-note] rpc_notification_create failed", {
              eventKey,
              patch: row,
              error: err,
            });
          }
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

function buildNotificationTitle(eventKey, orderNumber, payload = {}) {
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
    case "note.appraiser_added":
    case "note.reviewer_added":
      return `${payload?.actor?.name || "Someone"} added a note`;
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
      if (payload?.note_text) return payload.note_text;
      return `Reviewer requested changes to this report.`;
    case "order.completed":
      return `Report for ${client} was marked complete.`;
    case "note.appraiser_added":
    case "note.reviewer_added":
      return payload?.note_text || payload?.message || "";
    default:
      return payload?.message || "";
  }
}
