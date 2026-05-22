// Legacy/quarantined workflow adapter. Do not reintroduce without aligning with Smart Actions / canonical workflow.
import { supabase as defaultClient } from '@/lib/supabaseClient';

function warnLegacyOrderAction(helperName) {
  if (import.meta.env?.DEV !== true) return;
  console.warn(
    `[orders/actions] ${helperName} is a legacy order action adapter. Use canonical order service RPC helpers for active UI.`
  );
}

/**
 * Deprecated for normal workflow lifecycle actions.
 * This bypasses the guarded workflow helpers in src/lib/services/ordersService.js.
 * Use those workflow helpers for normal status transitions.
 */
export async function updateOrderStatus(_orderId, _newStatus, _note, _client = defaultClient) {
  warnLegacyOrderAction("updateOrderStatus");
  throw new Error("Order status changes must use canonical workflow transition RPCs.");
}

export async function assignOrder(orderId, userId, note, client = defaultClient) {
  warnLegacyOrderAction("assignOrder");
  const { data, error } = await client.rpc('rpc_assign_order', {
    p_order_id: orderId, p_assigned_to: userId, p_note: note ?? null
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDueDates(orderId, due, reviewDue, client = defaultClient) {
  warnLegacyOrderAction("updateDueDates");
  const { data, error } = await client.rpc('rpc_update_due_dates', {
    p_order_id: orderId, p_due_date: due ?? null, p_review_due_date: reviewDue ?? null
  });
  if (error) throw new Error(error.message);
  return data;
}
