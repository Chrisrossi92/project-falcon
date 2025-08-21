import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';
import rpcFirst from '@/lib/utils/rpcFirst';

/**
 * Create order, then log a simple "Order created".
 * RPC (if you add one) could be: rpc_create_order(p_order jsonb) -> orders
 */
export async function createOrderWithLogs({ order, user }) {
  // Try a hypothetical RPC first; fall back to direct insert.
  const data = await rpcFirst(
    'rpc_create_order',
    { p_order: order },
    async () => {
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  );

  // Log (note: comment UI also supports 'note')
  await logOrderEvent({
    orderId: data.id,
    action: 'note',
    message: 'Order created',
  });

  return data;
}

/**
 * Update status via RPC, fall back to direct + log.
 */
export async function updateOrderStatus({ orderId, newStatus, user }) {
  // Fetch current status for prev_status if we need to log manually.
  const { data: prevRow, error: readErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();
  if (readErr) throw readErr;
  const prev = prevRow?.status ?? null;

  // Preferred: RPC that also logs in the DB
  const data = await rpcFirst(
    'rpc_update_order_status',
    { p_order_id: orderId, p_new_status: newStatus, p_note: null },
    async () => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;

      // manual log when falling back
      await logOrderEvent({
        orderId,
        action: 'status_change',
        prev_status: prev,
        new_status: newStatus,
        message: `Status changed to ${newStatus}`,
      });
      return data;
    }
  );

  return data;
}

/**
 * Assign appraiser via RPC, fall back to direct + log.
 */
export async function assignAppraiser({ orderId, appraiserId, user }) {
  const data = await rpcFirst(
    'rpc_assign_order',
    { p_order_id: orderId, p_assigned_to: appraiserId, p_note: null },
    async () => {
      const { data, error } = await supabase
        .from('orders')
        .update({ appraiser_id: appraiserId })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;

      await logOrderEvent({
        orderId,
        action: 'assignment',
        message: `Assigned to appraiser ${appraiserId}`,
      });
      return data;
    }
  );

  return data;
}

/**
 * Comment on an order.
 * There isn't a stock RPC for "comment"; try rpc_log_note as a close analogue,
 * else fall back to direct insert with action='comment'.
 */
export async function addOrderComment({ orderId, text, user }) {
  await rpcFirst(
    'rpc_log_note',
    { p_order_id: orderId, p_message: text },
    async () => {
      const { error } = await supabase
        .from('activity_log')
        .insert({ order_id: orderId, action: 'comment', message: text });
      if (error) throw error;
    }
  );
  return true;
}




