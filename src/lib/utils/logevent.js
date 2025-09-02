// File: src/lib/utils/logevent.js
export async function logEvent(supabase, { orderId, action, message, prevStatus, newStatus, context = {} }) {
const { data, error } = await supabase.rpc('rpc_log_event', {
p_order_id: orderId,
p_action: action,
p_message: message ?? null,
p_prev_status: prevStatus ?? null,
p_new_status: newStatus ?? null,
p_context: context,
});
if (error) throw error;
return data;
}