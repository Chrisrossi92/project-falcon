// src/lib/api.js
// Adjust supabase import path to your project
import supabase from "@/lib/supabaseClient";
import { getCurrentUserAppContext } from "@/features/auth/currentUserAppContextApi";

/* ----------------------------- NOTIFICATIONS ----------------------------- */

/**
 * List notifications for the current user (RPC-only).
 * Maps to: public.rpc_get_notifications(p_limit int, p_before timestamptz)
 */
export async function rpcGetNotifications({
  category = null,
  isRead = null,
  limit = 50,
  before = null,
  after = null,
} = {}) {
  const { data, error } = await supabase.rpc("rpc_get_notifications", {
    p_limit: limit,
    p_before: before ?? after ?? null, // simple cursor fallback; API ignores filters today
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Mark one (or many) notifications as read (read_at populated).
 * Maps to: public.rpc_mark_notification_read(p_notification_id uuid)
 */
export async function rpcMarkNotificationRead(idOrIds) {
  const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
  if (!ids.length) return;
  for (const id of ids) {
    const { error } = await supabase.rpc("rpc_mark_notification_read", { p_notification_id: id });
    if (error) throw error;
  }
}

/* Optionally expose “mark all read” if you want it in UI later.
export async function rpcMarkAllNotificationsRead() {
  const { error } = await supabase.rpc("rpc_mark_all_notifications_read");
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

export async function rpcGetCurrentUserNotificationPreferences() {
  const { data, error } = await supabase.rpc("rpc_current_user_notification_preferences_get");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function rpcUpdateCurrentUserNotificationPreference({
  eventKey,
  channel,
  enabled,
  meta = null,
}) {
  const { data, error } = await supabase.rpc("rpc_current_user_notification_preference_update", {
    p_event_key: eventKey,
    p_channel: channel,
    p_enabled: !!enabled,
    p_meta: meta,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

export async function rpcUpdateNotificationPolicyLock({
  eventKey,
  channel,
  locked,
  role = "appraiser",
  lockReason = null,
}) {
  const { data, error } = await supabase.rpc("rpc_notification_policy_lock_update", {
    p_event_key: eventKey,
    p_channel: channel,
    p_locked: !!locked,
    p_role: role,
    p_lock_reason: lockReason,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

export async function rpcGetNotificationPolicyLocks({ role = "appraiser" } = {}) {
  const { data, error } = await supabase.rpc("rpc_notification_policy_locks_get", {
    p_role: role,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
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
 * Uses the V1 app-context RPC. The legacy public.profiles view is intentionally
 * quarantined and must not be queried by active runtime surfaces.
 */
export async function getCurrentUserProfile() {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const authUser = authData?.user;
  if (!authUser) return null;

  const authEmail = authUser.email || "";
  const context = await getCurrentUserAppContext();
  const displayName =
    context?.display_name ||
    context?.full_name ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    context?.email ||
    authEmail;
  const primaryRole =
    context?.primary_role_key ||
    context?.role_keys?.[0] ||
    "appraiser";

  return {
    id: context?.user_id || null,
    auth_id: authUser.id,
    email: context?.email || authEmail,
    display_name: displayName,
    full_name: context?.full_name || authUser.user_metadata?.full_name || null,
    name: displayName,
    role: primaryRole,
    fee_split: null,
    display_color: context?.display_color || null,
    avatar_url: context?.avatar_url || null,
    status: context?.has_current_company_membership ? "active" : null,
    updated_at: authUser?.updated_at || null,
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
