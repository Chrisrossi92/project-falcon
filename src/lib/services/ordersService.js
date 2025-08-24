// src/lib/services/ordersService.js
import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';

/**
 * Helper to normalize inputs to ISO strings (or null).
 */
function toISO(value) {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  const iso = d instanceof Date && !isNaN(d) ? d.toISOString() : null;
  return iso;
}

/**
 * Create an order (example; keep if you use it).
 */
export async function createOrderWithLogs(orderInput) {
  const { data: order, error } = await supabase
    .from('orders')
    .insert(orderInput)
    .select('*')
    .single();
  if (error) throw error;

  await logOrderEvent({
    order_id: order.id,
    action: 'order_created',
    message: 'order created',
  });

  // If assigned at create time, log it too
  if (order.appraiser_id) {
    await logOrderEvent({
      order_id: order.id,
      action: 'order_assigned',
      message: `assigned to ${order.appraiser_id}`,
    });
  }
  return order;
}

/**
 * Assign an order to an appraiser.
 */
export async function assignOrder(orderId, appraiserId) {
  const { error } = await supabase.rpc('rpc_update_order_v1', {
    p_order_id: orderId,
    p_appraiser_id: appraiserId,
    p_actor: { source: 'ui' },
  });
  if (error) throw error;

  await logOrderEvent({
    order_id: orderId,
    action: 'order_assigned',
    message: `assigned to ${appraiserId}`,
  });
}

/**
 * Update order status.
 */
export async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabase.rpc('rpc_update_order_v1', {
    p_order_id: orderId,
    p_status: newStatus,
    p_actor: { source: 'ui' },
  });
  if (error) throw error;

  await logOrderEvent({
    order_id: orderId,
    action: 'status_changed',
    new_status: newStatus,
    message: `status → ${newStatus}`,
  });
}

/**
 * Update dates (site visit, review due, final due).
 * Pass any subset; nulls are ignored.
 */
export async function updateOrderDates(orderId, { siteVisit, reviewDue, finalDue }) {
  const payload = {
    p_order_id: orderId,
    p_site_visit: toISO(siteVisit),
    p_review_due: toISO(reviewDue),
    p_final_due: toISO(finalDue),
    p_actor: { source: 'ui' },
  };
  const { error } = await supabase.rpc('rpc_update_order_v1', payload);
  if (error) throw error;

  if (payload.p_site_visit) {
    await logOrderEvent({
      order_id: orderId,
      action: 'site_visit_set',
      event_type: 'appointment',
      event_data: { when: payload.p_site_visit },
      message: 'site visit scheduled',
    });
  }
  if (payload.p_review_due || payload.p_final_due) {
    await logOrderEvent({
      order_id: orderId,
      action: 'due_dates_updated',
      event_data: {
        review_due: payload.p_review_due,
        final_due: payload.p_final_due,
      },
      message: 'due dates updated',
    });
  }
}





