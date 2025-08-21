// src/lib/utils/autoUpdateOrderStatus.js
import supabase from '@/lib/supabaseClient';

/**
 * Auto-update order status if site visit has passed.
 * Uses RPC if present, otherwise falls back to direct update.
 */
export default async function autoUpdateOrderStatus(order) {
  if (!order) return;

  const now = new Date();
  const hasVisit = !!order.site_visit_at;
  const siteVisit = hasVisit ? new Date(order.site_visit_at) : null;

  const shouldFlipToInspected =
    hasVisit &&
    siteVisit <= now &&
    String(order.status).toLowerCase() === 'inspection scheduled';

  if (!shouldFlipToInspected) return;

  // Try RPC first (preferred; also logs via DB)
  const tryRpc = async () => {
    const { data, error } = await supabase.rpc('rpc_update_order_status', {
      p_order_id: order.id,
      p_new_status: 'Inspected',
      p_note: 'Auto-updated after site visit',
    });
    if (error) throw error;
    return data;
  };

  // Fallback direct update (MVP safety)
  const tryDirect = async () => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'Inspected' })
      .eq('id', order.id);
    if (error) throw error;
  };

  try {
    await tryRpc();
  } catch {
    await tryDirect();
  }
}


