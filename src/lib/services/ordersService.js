// src/lib/services/ordersService.js
import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';

/**
 * Create an order, then add an activity note ("Order created").
 * Note: OrderForm already prefers RPC create/update; this is a simple insert for now.
 */
export async function createOrderWithLogs({ order, user }) {
  const { data, error } = await supabase.from('orders').insert(order).select().single();
  if (error) throw error;

  await logOrderEvent({
    orderId: data.id,
    action: 'note',
    message: 'Order created',
  });

  return data;
  return data;
}

/**
 * Update order status through RPC so the DB logs the status change.
 */
export async function updateOrderStatus({ orderId, newStatus, user }) {
  const { data, error } = await supabase.rpc('rpc_update_order_status', {
    p_order_id:   orderId,
    p_new_status: newStatus,
    p_note:       null,
  });
  if (error) throw new Error(`rpc_update_order_status failed: ${error.message}`);
  return data;
}

/**
 * Assign appraiser through RPC so the DB logs the assignment.
 */
export async function assignAppraiser({ orderId, appraiserId, user }) {
  const { data, error } = await supabase.rpc('rpc_assign_order', {
    p_order_id:    orderId,
    p_assigned_to: appraiserId,
    p_note:        null,
  });
  if (error) throw new Error(`rpc_assign_order failed: ${error.message}`);
  return data;
}

/**
 * Add a comment to the order's activity using the RPC path (via logOrderEvent).
 */
export async function addOrderComment({ orderId, text, user }) {
  await logOrderEvent({ orderId, action: 'comment', message: text });
  return true;
}


