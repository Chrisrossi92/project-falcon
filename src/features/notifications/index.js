import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst.js";

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

export async function markAsRead(ids) {
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
