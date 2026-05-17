// Legacy/quarantined workflow adapter. Do not reintroduce without aligning with Smart Actions / canonical workflow.
import { supabase as defaultClient } from '@/lib/supabaseClient';

/**
 * Deprecated for normal workflow lifecycle actions.
 * This bypasses the guarded workflow helpers in src/lib/services/ordersService.js.
 * Use those workflow helpers for normal status transitions.
 */
export async function updateOrderStatus(orderId, newStatus, note, client = defaultClient) {
  const { data, error } = await client.rpc('rpc_update_order_status', {
    p_order_id: orderId, p_new_status: newStatus, p_note: note ?? null
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function assignOrder(orderId, userId, note, client = defaultClient) {
  const { data, error } = await client.rpc('rpc_assign_order', {
    p_order_id: orderId, p_assigned_to: userId, p_note: note ?? null
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDueDates(orderId, due, reviewDue, client = defaultClient) {
  const { data, error } = await client.rpc('rpc_update_due_dates', {
    p_order_id: orderId, p_due_date: due ?? null, p_review_due_date: reviewDue ?? null
  });
  if (error) throw new Error(error.message);
  return data;
}
