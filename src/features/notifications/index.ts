import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst";

// ---- Fetch + counts --------------------------------------------------------

export async function fetchNotifications(limit = 50) {
  // Prefer a view or RPC if you add one; fallback to table read.
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function unreadCount() {
  // Try RPC, fallback to table count (RLS must allow it)
  const rpc = async () => {
    const { data, error } = await supabase.rpc("rpc_unread_notifications_count");
    if (error) throw error;
    return Number(data || 0);
  };
  const tbl = async () => {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);
    if (error) throw error;
    return Number(count || 0);
  };
  return rpcFirst("rpc_unread_notifications_count", {}, rpc).catch(tbl);
}

// ---- Mark read -------------------------------------------------------------

export async function markAsRead(ids: string[]) {
  if (!ids?.length) return;
  // Try RPC first (more efficient); fallback to batch update
  const rpc = async () => {
    const { error } = await supabase.rpc("rpc_mark_notifications_read", { p_ids: ids });
    if (error) throw error;
  };
  const tbl = async () => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    if (error) throw error;
  };
  return rpcFirst("rpc_mark_notifications_read", { p_ids: ids }, rpc).catch(tbl);
}

export async function markAllRead() {
  const rpc = async () => {
    const { error } = await supabase.rpc("rpc_mark_all_notifications_read");
    if (error) throw error;
  };
  const tbl = async () => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    if (error) throw error;
  };
  return rpcFirst("rpc_mark_all_notifications_read", {}, rpc).catch(tbl);
}

// ---- Preferences / DND / Snooze -------------------------------------------

export type Pref = {
  id?: string;
  user_id?: string;
  type: "channel" | "category" | "dnd" | "snooze";
  channel?: "in_app" | "email";
  category?: "dates" | "status" | "assignments" | "messages" | "other";
  enabled: boolean;
  meta?: any;
};

export async function getNotificationPrefs(userId: string): Promise<Pref[]> {
  // Use RPC if present; fallback to table read
  const rpc = async () => {
    const { data, error } = await supabase.rpc("rpc_get_notification_prefs", { p_user_id: userId });
    if (error) throw error;
    return (data as Pref[]) || [];
  };
  const tbl = async () => {
    const { data, error } = await supabase.from("notification_prefs").select("*").eq("user_id", userId);
    if (error) throw error;
    return (data as Pref[]) || [];
  };
  try {
    return await rpcFirst("rpc_get_notification_prefs", { p_user_id: userId }, rpc);
  } catch {
    return await tbl();
  }
}

export function isDndActive(prefs: Pref[] = []) {
  // any DND pref with enabled === true
  return !!prefs.find((p) => p.type === "dnd" && p.enabled);
}

export function isSnoozed(prefs: Pref[] = []) {
  const entry = prefs.find((p) => p.type === "snooze" && p.channel === "in_app" && p.enabled);
  if (!entry?.meta?.until) return false;
  const until = new Date(entry.meta.until);
  return !Number.isNaN(until.getTime()) && until > new Date();
}

export async function setSnooze(userId: string, hours = 1) {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  // Prefer RPC upsert, fallback to direct upsert
  const rpc = async () => {
    const { error } = await supabase.rpc("rpc_set_snooze", { p_user_id: userId, p_until: until });
    if (error) throw error;
  };
  const tbl = async () => {
    const { error } = await supabase
      .from("notification_prefs")
      .upsert(
        [{ user_id: userId, type: "snooze", channel: "in_app", enabled: true, meta: { until } }],
        { onConflict: "user_id,type,channel" }
      );
    if (error) throw error;
  };
  await rpcFirst("rpc_set_snooze", { p_user_id: userId, p_until: until }, rpc).catch(tbl);
  return until;
}

export async function clearSnooze(userId: string) {
  const rpc = async () => {
    const { error } = await supabase.rpc("rpc_clear_snooze", { p_user_id: userId });
    if (error) throw error;
  };
  const tbl = async () => {
    const { error } = await supabase
      .from("notification_prefs")
      .upsert([{ user_id: userId, type: "snooze", channel: "in_app", enabled: false, meta: null }], {
        onConflict: "user_id,type,channel",
      });
    if (error) throw error;
  };
  return rpcFirst("rpc_clear_snooze", { p_user_id: userId }, rpc).catch(tbl);
}
