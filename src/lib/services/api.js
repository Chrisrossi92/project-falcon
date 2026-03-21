// src/lib/api.js
// DEPRECATED: Do not add new imports here.
// Prefer domain modules (e.g. "@/features/notifications/api", "@/lib/api/users", "@/lib/api/orders").
// Adjust supabase import path to your project
import supabase from "@/lib/supabaseClient";

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
 * Get current user's notification prefs (canonical prefs RPC path).
 * Maps to: public.rpc_notification_prefs_get(p_user_id uuid?)
 */
export async function rpcGetMyNotificationPrefs() {
  await supabase.rpc("rpc_notification_prefs_ensure", { p_user_id: null }).catch(() => {});
  const { data, error } = await supabase.rpc("rpc_notification_prefs_get", {
    p_user_id: null, // use auth.uid()
  });
  if (error) throw error;
  return data ?? null;
}

/**
 * Get notification policy rows (canonical policy source).
 * Returns rows from public.notification_policies.
 */
export async function rpcGetNotificationPolicies() {
  const { data, error } = await supabase
    .from("notification_policies")
    .select("key, rules, updated_at")
    .order("key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Upsert a single policy row by key.
 * `rules` should be a JSON object.
 */
export async function rpcSetNotificationPolicy(key, rules = {}) {
  if (!key) throw new Error("rpcSetNotificationPolicy: key is required");
  const rulesObj =
    typeof rules === "object" && rules !== null ? rules : { enabled: !!rules };
  const { error } = await supabase
    .from("notification_policies")
    .upsert({ key, rules: rulesObj }, { onConflict: "key" });
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
  // 1) Auth user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const authUser = authData?.user;
  if (!authUser) return null;

  const authId = authUser.id;
  const authEmail = authUser.email || "";

  // columns we want from canonical public.users
  const cols =
    "id, auth_id, uid, email, display_name, full_name, name, role, fee_split, display_color, avatar_url, status, updated_at";

  // 2) Canonical mapping: auth.uid() -> users.auth_id
  let row = null;
  if (authId) {
    const { data, error } = await supabase.from("users").select(cols).eq("auth_id", authId).limit(1);
    if (error) throw error;
    row = data?.[0] || null;
  }

  // 3) Compatibility fallback by email
  if (!row && authEmail) {
    const { data, error } = await supabase.from("users").select(cols).eq("email", authEmail).limit(1);
    if (error) throw error;
    row = data?.[0] || null;
  }

  // 4) Fallback: synthesize from auth user if view returned nothing (should be rare)
  if (!row) {
    row = {
      id: authId,
      auth_id: authId,
      uid: authId,
      email: authEmail,
      display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authEmail,
      full_name: authUser.user_metadata?.full_name || null,
      name: authUser.user_metadata?.name || null,
      role: null,
      status: "active",
      updated_at: authUser?.updated_at || null,
    };
  }

  const display_name = row.display_name || row.full_name || row.name || row.email;
  let canonicalRole = "";
  try {
    canonicalRole = String((await supabase.rpc("rpc_get_my_role")).data || "").toLowerCase().trim();
  } catch {
    canonicalRole = "";
  }

  // ✅ IMPORTANT: return *app user* id as .id, and auth id as .auth_id
  return {
    id: row.id,               // public.users.id  <-- use this in links: /users/view/:id
    auth_id: row.auth_id || row.uid || authId, // auth.users.id    <-- use this only for policy checks
    email: row.email,
    display_name,
    full_name: row.full_name || null,
    name: row.name || null,
    role: canonicalRole || row.role || "appraiser",
    fee_split: row.fee_split ?? null,
    display_color: row.display_color || null,
    avatar_url: row.avatar_url || null,
    status: row.status || "active",
    updated_at: row.updated_at || null,
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
    p_patch: nextPrefs,
    p_user_id: null,
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
