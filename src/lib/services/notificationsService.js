// src/lib/services/notificationsService.js
import supabase from "@/lib/supabaseClient";

/** Resolve current user id (null if not signed in). */
async function getUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * List notifications for the current user.
 * Columns expected (MVP): id, user_id, title, body, action, order_id, created_at, read_at
 * If table is missing, returns an empty array (MVP-safe).
 */
export async function listNotifications({ onlyUnread = true, limit = 20 } = {}) {
  const uid = await getUserId();
  if (!uid) return [];

  try {
    let q = supabase
      .from("notifications")
      .select("id, title, body, action, order_id, created_at, read_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyUnread) q = q.is("read_at", null);

    const { data, error } = await q;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Mark a single notification as read (MVP). */
export async function markNotificationRead(id) {
  if (!id) return;
  try {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  } catch {}
}

/** Mark all my notifications as read (MVP). */
export async function markAllNotificationsRead() {
  const uid = await getUserId();
  if (!uid) return;
  try {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", uid)
      .is("read_at", null);
  } catch {}
}

/**
 * Create a notification (MVP-safe).
 * If the table or RLS isn’t ready yet, this will quietly no-op.
 */
export async function createNotification({ user_id, title, body = null, order_id = null, action = null }) {
  if (!user_id || !title) return;
  try {
    await supabase
      .from("notifications")
      .insert({
        user_id,
        title,
        body,
        order_id,
        action,
        // created_at defaults in DB is fine; omit read_at to mark as unread
      });
  } catch {
    // Silent no-op for MVP if table/policy isn't present yet
  }
}

