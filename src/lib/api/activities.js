import supabase from "@/lib/supabaseClient";

// Fetch activity log for a specific order (most recent first)
export async function getActivityLog(orderId) {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, order_id, action, prev_status, new_status, message, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Error fetching activity log");
  return data || [];
}

// Post a new message (RPC-first via rpc_log_note; fallback to action='comment')
export async function postActivityComment(orderId, message) {
  const { error: rpcErr } = await supabase.rpc('rpc_log_note', {
    p_order_id: orderId,
    p_message: message,
  });
  if (rpcErr) {
    const code = String(rpcErr.code || '');
    const msg  = String(rpcErr.message || '').toLowerCase();
    if (code === '42883' || code === '404' || (msg.includes('function') && msg.includes('does not exist'))) {
      const { error } = await supabase
        .from("activity_log")
        .insert({ order_id: orderId, action: 'comment', message });
      if (error) throw new Error(error.message || "Error posting comment");
      return true;
    }
    throw new Error(rpcErr.message || "Error posting comment");
  }
  return true;
}




