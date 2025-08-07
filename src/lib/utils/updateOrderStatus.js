import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';

export default async function updateOrderStatus({
  orderId,
  newStatus,
  oldStatus,
  triggeredBy,
  triggerType = 'manual',
  reason = '',
}) {
  if (!orderId || !newStatus) {
    throw new Error('Missing orderId or newStatus in updateOrderStatus');
  }

  // 1) update order
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);
  if (updateError) throw updateError;

  // 2) audit table
  const { error: logError } = await supabase.from('order_status_log').insert({
    order_id: Number(orderId),
    old_status: oldStatus,
    new_status: newStatus,
    triggered_by: triggeredBy || null,
    trigger_type: triggerType,
    reason,
  });
  if (logError) throw logError;

  // 3) visible activity
  await logOrderEvent({
    orderId,
    userId: triggeredBy || null,
    role: 'system',
    action: 'system',
    message: `Status changed from ${oldStatus ?? '[none]'} → ${newStatus}${reason ? ` — ${reason}` : ''}`,
    context: { event: 'status_change', reason },
  });

  return true;
}


