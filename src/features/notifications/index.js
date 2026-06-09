import supabase from "@/lib/supabaseClient";
import rpcFirst from "@/lib/utils/rpcFirst.js";
import {
  notificationListRpcParams,
  notificationRpcScopeParams,
} from "@/lib/notifications/notificationWorkspaceScope";

// ---- Fetch + counts --------------------------------------------------------

export async function fetchNotifications(limit = 50, operationsScope = null) {
  const { data, error } = await supabase.rpc(
    "rpc_get_notifications",
    notificationListRpcParams({ limit, operationsScope }),
  );
  if (error) throw new Error(error.message);
  return data || [];
}

export async function unreadCount(operationsScope = null) {
  const { data, error } = await supabase.rpc("rpc_get_unread_count", notificationRpcScopeParams(operationsScope));
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

export async function markAllRead(operationsScope = null) {
  const { error } = await supabase.rpc("rpc_mark_all_notifications_read", notificationRpcScopeParams(operationsScope));
  if (error) throw error;
}
