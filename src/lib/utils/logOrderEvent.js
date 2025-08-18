import supabase from '@/lib/supabaseClient';

export default async function logOrderEvent(args) {
  const orderId   = args.orderId ?? args.order_id;
  const userId    = args.userId  ?? args.user_id ?? null;
  const role      = args.role ?? 'system';
  const action    = args.action ?? 'system';
  const message   = args.message;
  const context   = args.context ?? {};
  const visibleTo = args.visibleTo ?? args.visible_to ?? ['admin', 'appraiser'];

  if (!orderId) throw new Error('logOrderEvent: orderId/order_id is required');

  const payload = {
    order_id: orderId,
    user_id: userId,
    role,
    action,
    visible_to: visibleTo,
    context: { message, ...context },
  };

  const { error } = await supabase.from('activity_log').insert(payload);
  if (error) {
    console.error('logOrderEvent failed:', error.message, payload);
    throw error;
  }
  return true;
}


