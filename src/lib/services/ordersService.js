import supabase from '@/lib/supabaseClient';
import logOrderEvent from '@/lib/utils/logOrderEvent';


export async function createOrderWithLogs(orderInput) {
// 1) create order
const { data: order, error } = await supabase
.from('orders')
.insert(orderInput)
.select('*')
.single();
if (error) throw error;


// 2) log created
await logOrderEvent({
  order_id: order.id,
  action: 'order_created',
  message: 'order created',
});


// 3) if assigned immediately, log assignment
if (order.appraiser_id) {
await supabase.rpc('rpc_assign_order', {
p_order_id: order.id,
p_appraiser_id: order.appraiser_id,
});
}


return order;
}


export async function updateOrderStatus(orderId, newStatus) {
const { data, error } = await supabase.rpc('rpc_update_order_status', {
p_order_id: orderId,
p_new_status: newStatus,
});
if (error) throw error;
return data;
}


export async function assignOrder(orderId, appraiserId) {
const { data, error } = await supabase.rpc('rpc_assign_order', {
p_order_id: orderId,
p_appraiser_id: appraiserId,
});
if (error) throw error;
return data;
}


export async function addOrderNote(orderId, message, context = {}) {
const { data, error } = await supabase.rpc('rpc_log_note', {
p_order_id: orderId,
p_message: message,
p_context: context,
});
if (error) throw error;
return data;
}




