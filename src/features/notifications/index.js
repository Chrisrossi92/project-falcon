import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst.js";

// ---- Fetch + counts --------------------------------------------------------

export async function fetchNotifications(limit = 50) {
  const { data, error } = await supabase.rpc("rpc_get_notifications", { p_limit: limit });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function unreadCount() {
  const { data, error } = await supabase.rpc("rpc_get_unread_count");
  if (error) throw error;
  return Number(data || 0);
}

// ---- Mark read -------------------------------------------------------------

export async function markAsRead(ids) {
  if (!ids?.length) return;
  const markOne = async (id) => {
    const { error } = await supabase.rpc("rpc_mark_notification_read", { p_notification_id: id });
    if (error) throw error;
  };
  for (const id of ids) {
    await markOne(id);
  }
}

export async function markAllRead() {
  const { error } = await supabase.rpc("rpc_mark_all_notifications_read");
  if (error) throw error;
}
