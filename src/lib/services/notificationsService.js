// src/lib/services/notificationsService.js
import supabase from "@/lib/supabaseClient";

/** Utilities */
const rpcMissing = (e) => {
  const m = (e?.message || "").toLowerCase();
  return m.includes("404") || m.includes("not found") || m.includes("does not exist");
};

/** ------------------------------------------------------------------ */
/** Fetch notifications (with simple filters/pagination)               */
/** ------------------------------------------------------------------ */
export async function listNotifications({
  unreadOnly = false,
  limit = 25,
  before = null,       // ISO string or Date
} = {}) {
  // Try RPC first if you add it later:
  // const { data, error } = await supabase.rpc("rpc_list_notifications", { p_unread_only: unreadOnly, p_limit: limit, p_before: before });
  // if (!error) return data ?? [];

  // Fallback: direct view/table query
  let q = supabase
    .from("notifications")
    .select(`
      id,
      type,
      title,
      message,
      link_url,
      order_id,
      created_at,
      read_at
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) q = q.is("read_at", null);
  if (before) {
    const iso = before instanceof Date ? before.toISOString() : String(before);
    q = q.lt("created_at", iso);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Unread count */
export async function getUnreadCount() {
  // RPC version (add when ready)
  // const { data, error } = await supabase.rpc("rpc_notifications_unread_count");
  // if (!error && typeof data === "number") return data;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { head: true, count: "exact" })
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

/** Mark one notification read */
export async function markRead(notificationId) {
  // RPC first
  // const { error } = await supabase.rpc("rpc_notification_mark_read", { p_id: notificationId });
  // if (!error) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
}

/** Mark all read */
export async function markAllRead() {
  // RPC first
  // const { error } = await supabase.rpc("rpc_notifications_mark_all_read");
  // if (!error) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw error;
}

/** ------------------------------------------------------------------ */
/** Preferences (get / update)                                         */
/** ------------------------------------------------------------------ */
export async function getNotificationPrefs() {
  // RPC version:
  // const { data, error } = await supabase.rpc("rpc_notification_prefs_get");
  // if (!error) return data ?? {};

  const { data, error } = await supabase
    .from("notification_prefs")
    .select(`
      dnd,
      dnd_until,
      snooze_until
    `)
    .single();

  if (error && !rpcMissing(error)) throw error;
  return data ?? { dnd: false, dnd_until: null, snooze_until: null };
}

export async function updateNotificationPrefs(patch) {
  // RPC version:
  // const { error } = await supabase.rpc("rpc_notification_prefs_set", { p: patch });
  // if (!error) return;

  // Upsert (one row per user)
  const { error } = await supabase
    .from("notification_prefs")
    .upsert(
      {
        dnd: !!patch.dnd,
        dnd_until: patch.dnd_until ?? null,
        snooze_until: patch.snooze_until ?? null,
      },
      { onConflict: "user_id" } // ensure your table has (user_id) unique
    );

  if (error) throw error;
}


