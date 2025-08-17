import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';

/**
 * CREATE new order + write activity row
 */
export async function createOrderWithLogs({ order, user }) {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;

  await logOrderEvent({
    userId: user?.id ?? null,
    orderId: data.id,
    action: 'order_created',
    role: 'admin',
    message: 'Order created',
  });

  return data;
}

/**
 * UPDATE order status + write activity row
 */
export async function updateOrderStatus({ orderId, newStatus, user }) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  await logOrderEvent({
    userId: user?.id ?? null,
    orderId,
    action: 'status_changed',
    role: 'admin',
    message: `Status changed to ${newStatus}`,
    context: { status: newStatus },
  });

  return data;
}

/**
 * ASSIGN appraiser + write activity row
 */
export async function assignAppraiser({ orderId, appraiserId, user }) {
  const { data, error } = await supabase
    .from('orders')
    .update({ appraiser_id: appraiserId })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;

  await logOrderEvent({
    userId: user?.id ?? null,
    orderId,
    action: 'assigned',
    role: 'admin',
    message: `Assigned to appraiser ${appraiserId}`,
    context: { appraiserId },
  });

  return data;
}

/**
 * OPTIONAL helper: add a free-text comment to an order’s activity log
 */
export async function addOrderComment({ orderId, text, user }) {
  await logOrderEvent({
    userId: user?.id ?? null,
    orderId,
    action: 'comment',
    role: 'admin',
    message: text,
  });
  return true;
}


