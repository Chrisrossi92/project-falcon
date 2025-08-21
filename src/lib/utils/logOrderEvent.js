import supabase from '@/lib/supabaseClient';

/**
 * Write to activity_log with columns:
 *   order_id, action, prev_status, new_status, message, created_at (default)
 * action ∈ ('status_change','note','assignment','comment')
 */
export default async function logOrderEvent(args) {
  const orderId    = args.orderId ?? args.order_id;
  if (!orderId) throw new Error('logOrderEvent: orderId/order_id is required');

  const action     = args.action ?? 'note';
  const message    = args.message ?? null;
  const prevStatus = args.prev_status ?? args.prevStatus ?? null;
  const newStatus  = args.new_status ?? args.newStatus ?? null;
  // actor_user_id defaults to auth.uid() in DB, so we don't need to send it

  const { error } = await supabase.from('activity_log').insert({
    order_id: orderId,
    action: action,
    prev_status: prevStatus,
    new_status: newStatus,
    message: message,
  });

  if (error) {
    console.error('logOrderEvent failed:', error.message, { orderId, action });
    throw error;
  }
  return true;
}


