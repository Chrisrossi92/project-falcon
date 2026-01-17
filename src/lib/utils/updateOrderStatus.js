// src/lib/utils/updateOrderStatus.js
import rpcFirst from '@/lib/utils/rpcFirst';
import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';

export default async function updateOrderStatus(orderId, newStatus, note = null)  {
  // Read prev status for manual logging if we fall back
  const { data: prevRow, error: readErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();
  if (readErr) throw readErr;
  const prev = prevRow?.status ?? null;

  await rpcFirst(
    'rpc_update_order_status',
    { p_order_id: orderId, p_new_status: newStatus, p_note: note },
    async () => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) throw error;

      await logOrderEvent({
        order_id: orderId,
        action: 'status_changed',
        prev_status: prev,
        new_status: newStatus,
        message: note ?? null,
      });
    }
  );

  return true;
}


