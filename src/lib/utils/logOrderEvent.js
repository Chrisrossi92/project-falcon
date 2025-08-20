import supabase from '@/lib/supabaseClient';

// RLS-friendly event logger using RPCs only.
export default async function logOrderEvent(args) {
  const orderId    = args.orderId ?? args.order_id;
  const action     = String(args.action ?? 'note').toLowerCase();
  const message    = args.message ?? null;
  const prevStatus = args.prevStatus ?? args.prev_status ?? null;
  const newStatus  = args.newStatus ?? args.new_status ?? null;

  if (!orderId) {
    throw new Error('logOrderEvent: orderId/order_id is required');
  }

  // Status change path
  if (action === 'status_changed' || action === 'status_change') {
    const { error } = await supabase.rpc('rpc_log_status_change', {
      p_order_id:    orderId,
      p_prev_status: prevStatus,
      p_new_status:  newStatus,
      p_message:     message,
    });
    if (error) {
      throw new Error(`rpc_log_status_change failed: ${error.message}`);
    }
    return true;
  }

  // Default = log a note/comment
  const { error } = await supabase.rpc('rpc_log_note', {
    p_order_id: orderId,
    p_message:  message ?? String(action),
  });
  if (error) {
    throw new Error(`rpc_log_note failed: ${error.message}`);
  }
  return true;
}

