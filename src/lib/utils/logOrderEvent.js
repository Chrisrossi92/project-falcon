import supabase from '@/lib/supabaseClient';

/**
 * Write a persistent activity row for an order.
 * action:
 *  - 'system'  (status change, assignment, order created, site visit scheduled)
 *  - 'comment' (free-text message)
 * context: free JSON; we render context.message in the UI
 */
export default async function logOrderEvent({
  orderId,
  userId = null,
  role = 'system',
  action = 'system',
  message,
  context = {},
  visibleTo = ['admin', 'appraiser'],
}) {
  if (!orderId) throw new Error('logOrderEvent: orderId is required');
  const payload = {
    order_id: Number(orderId),
    user_id: userId,
    role,
    action,
    visible_to: visibleTo,
    context: { message, ...context },
  };

  const { error } = await supabase.from('activity_log').insert(payload);
  if (error) {
    console.error('logOrderEvent failed:', error.message, payload);
    throw error;
  }
  return true;
}
