import { supa as defaultClient } from '../../lib/supa.client';

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
