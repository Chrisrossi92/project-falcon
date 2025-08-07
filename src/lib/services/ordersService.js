// src/lib/services/ordersService.js
import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';
import updateOrderStatus from '@/lib/utils/updateOrderStatus';

/**
 * Insert a new order and write initial activity entries.
 * @param {Object} params
 * @param {Object} params.payload - the raw form data (editedData)
 * @param {string} params.createdByUserId - user.id of creator
 * @param {Array}  params.appraisers - optional list of users to resolve appraiser name
 */
export async function createOrderWithLogs({ payload, createdByUserId, appraisers = [] }) {
  // Only send DB columns on insert (avoid virtual/derived fields)
  const insertable = {
    client_id: payload.client_id ?? null,
    branch_id: payload.branch_id ?? null,
    manual_client: payload.manual_client ?? null,
    address: payload.address ?? null,
    city: payload.city ?? null,
    county: payload.county ?? null,
    state: payload.state ?? null,
    zip: payload.zip ?? null,
    appraiser_id: payload.appraiser_id ?? null,
    due_date: payload.due_date ?? null,
    site_visit_at: payload.site_visit_at ?? null,
    property_type: payload.property_type ?? null,
    report_type: payload.report_type ?? null,
    status: payload.status || 'New',
    notes: payload.notes ?? null,
  };

  const { data: order, error } = await supabase
    .from('orders')
    .insert([insertable])
    .select()
    .single();

  if (error) throw error;

  const orderId = order.id;

  // A) Order created
  await logOrderEvent({
    orderId,
    userId: createdByUserId,
    role: 'system',
    action: 'system',
    message: 'Order created.',
    context: { event: 'order_created' },
  });

  // B) Initial status (audit + visible activity)
  await updateOrderStatus({
    orderId,
    newStatus: order.status || 'New',
    oldStatus: null,
    triggeredBy: createdByUserId,
    triggerType: 'system',
    reason: 'Order created',
  });

  // C) If assigned on create, log it
  if (order.appraiser_id) {
    const a = appraisers.find((u) => u.id === order.appraiser_id);
    const appraiserName = a?.name || 'Appraiser';
    await logOrderEvent({
      orderId,
      userId: createdByUserId,
      role: 'system',
      action: 'system',
      message: `Assigned to ${appraiserName}.`,
      context: { event: 'assigned', appraiser_id: order.appraiser_id },
    });
  }

  // D) If site visit set on create, log it
  if (order.site_visit_at) {
    await logOrderEvent({
      orderId,
      userId: createdByUserId,
      role: 'system',
      action: 'system',
      message: `Site visit scheduled: ${new Date(order.site_visit_at).toLocaleString()}.`,
      context: { event: 'site_visit_scheduled', site_visit_at: order.site_visit_at },
    });
  }

  return order;
}
