// src/lib/utils/autoUpdateOrderStatus.js
import supabase from '@/lib/supabaseClient';

/**
 * Auto-update order status if applicable
 * @param {Object} order
 * @returns {Promise<void>}
 */
export default async function autoUpdateOrderStatus(order) {
  if (!order) return;

  const now = new Date();
  const hasVisit = !!order.site_visit_at;
  const siteVisit = hasVisit ? new Date(order.site_visit_at) : null;

  const isPastSiteVisit =
    hasVisit &&
    siteVisit <= now &&
    order.status === 'Inspection Scheduled';

  if (isPastSiteVisit) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'Inspected' })
      .eq('id', order.id);

    if (!error) {
      await supabase.from('order_status_log').insert([
        {
          order_id: order.id,
          old_status: 'Inspection Scheduled',
          new_status: 'Inspected',
          triggered_by: null,
          trigger_type: 'system',
          reason: 'Site visit date/time has passed',
        },
      ]);
      // Optional: send a notification here
    }
  }
}

