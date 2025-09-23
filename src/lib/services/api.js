// src/lib/api.js
// Adjust supabase import path to your project
import supabase from "@/lib/supabaseClient";

/* ----------------------------- NOTIFICATIONS ----------------------------- */

/**
 * List notifications for the current user.
 * Maps to: public.rpc_notifications_list(category, is_read, page_limit, before, after)
 */
export async function rpcGetNotifications({
  category = null,
  isRead = null,
  limit = 50,
  before = null,
  after = null,
} = {}) {
  const { data, error } = await supabase.rpc("rpc_notifications_list", {
    category,
    is_read: isRead,
    page_limit: limit,
    before,
    after,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Mark one (or many) notifications as read.
 * Maps to: public.rpc_notifications_mark_read(ids uuid[])
 */
export async function rpcMarkNotificationRead(idOrIds) {
  const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
  if (!ids.length) return;
  const { error } = await supabase.rpc("rpc_notifications_mark_read", { ids });
  if (error) throw error;
}

/* Optionally expose “mark all read” if you want it in UI later.
export async function rpcMarkAllNotificationsRead() {
  const { error } = await supabase.rpc("rpc_notifications_mark_all_read");
  if (error) throw error;
}
*/

/**
 * Get current user's notification prefs (row from notification_prefs).
 * Maps to: public.rpc_notification_prefs_get(p_user_id uuid?)
 */
export async function rpcGetNotificationPolicies() {
  // Ensure a row exists, then fetch it
  await supabase.rpc("rpc_notification_prefs_ensure").catch(() => {});
  const { data, error } = await supabase.rpc("rpc_notification_prefs_get", {
    p_user_id: null, // use auth.uid()
  });
  if (error) throw error;
  return data ?? null;
}

/**
 * Set a single policy toggle.
 * For fine-grained per-type/channel toggles, your DB exposes:
 *   public.rpc_set_notification_pref_v1(p_user_id, p_type, p_channel, p_enabled, p_meta)
 * This wrapper keeps the old signature: (key, rules)
 *   - key: the notification type (e.g., 'order_assigned', 'self_actions', '*', etc.)
 *   - rules: { channel: 'in_app'|'email', enabled: boolean, meta?: object, userId?: uuid }
 */
export async function rpcSetNotificationPolicy(key, rules = {}) {
  const {
    channel = "in_app",
    enabled = true,
    meta = null,
    userId = null,
  } = typeof rules === "boolean" ? { enabled: rules } : rules;

  const { error } = await supabase.rpc("rpc_set_notification_pref_v1", {
    p_user_id: userId, // null → auth.uid()
    p_type: key,
    p_channel: channel,
    p_enabled: !!enabled,
    p_meta: meta,
  });
  if (error) throw error;
}

/* -------------------------------- CALENDAR ------------------------------- */

/**
 * Calendar events.
 * Your DB has two overloads:
 *   1) get_calendar_events(p_from timestamptz, p_to timestamptz)
 *   2) get_calendar_events()  -- (admin/appraiser aware, returns starts_at/ends_at/title)
 *
 * This wrapper prefers the ranged version when dates are provided,
 * otherwise calls the zero-arg version. It returns raw rows from the RPC.
 *
 * If you need normalized shape elsewhere, do it at the call site.
 */
export async function rpcGetCalendarEvents({ from = null, to = null } = {}) {
  if (from || to) {
    const { data, error } = await supabase.rpc("get_calendar_events", {
      p_from: from ? new Date(from).toISOString() : null,
      p_to: to ? new Date(to).toISOString() : null,
    });
    if (error) throw error;
    return data ?? [];
  } else {
    // zero-arg version (admin/appraiser aware)
    const { data, error } = await supabase.rpc("get_calendar_events");
    if (error) throw error;
    return data ?? [];
  }
}

/* --------------------------- USER / PROFILE HELPERS ---------------------- */

/**
 * Current user profile (lightweight).
 * We avoid selecting non-existent columns. Compose display_name from available fields.
 */
export async function getCurrentUserProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Pull a safe subset of columns we know exist in your schema
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, name, role, fee_split, updated_at")
    .eq("id", user.id)
    .single();

  if (error) throw error;

  const display_name = data?.full_name || data?.name || data?.email || "";
  // Attach prefs for convenience
  let prefs = null;
  try {
    const res = await supabase.rpc("rpc_notification_prefs_get", {
      p_user_id: data.id,
    });
    prefs = res.data ?? null;
  } catch {
    prefs = null;
  }

  return {
    id: data.id,
    email: data.email,
    display_name,
    notification_prefs: prefs,
  };
}

/**
 * Update current user's notification prefs document.
 * Maps to: public.rpc_notification_prefs_update(patch jsonb [, p_user_id uuid])
 */
export async function updateMyNotificationPrefs(nextPrefs) {
  if (!nextPrefs || typeof nextPrefs !== "object") {
    throw new Error("updateMyNotificationPrefs: patch must be an object");
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) throw new Error("No auth user");
  const { error } = await supabase.rpc("rpc_notification_prefs_update", {
    patch: nextPrefs,
  });
  if (error) throw error;
}

/* --------------------------------- CLIENTS ------------------------------- */
/* Leaving these as-is; your project already defines these RPCs elsewhere. */

export async function rpcGetClientsForUser() {
  const { data, error } = await supabase.rpc("get_clients_for_user");
  if (error) throw error;
  return data ?? [];
}

export async function rpcGetClientOrders(clientId) {
  const { data, error } = await supabase.rpc("get_client_orders", {
    p_client_id: clientId,
  });
  if (error) throw error;
  return data ?? [];
}
