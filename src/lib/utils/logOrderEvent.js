import supabase from '@/lib/supabaseClient';

/**
 * Persist an activity row for an order.
 * Supports both camelCase and snake_case args.
 */
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
    order_id: orderId,          // keep UUID as-is
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

    order_id: orderId,
    user_id: userId,
    role,
    action,
    visible_to: visibleTo,
    context: { message, ...context },
  };

  const { error } = await supabase.from('activity_log').insert(payload);
  if (error) {
    // Keep this console for quick field/policy debugging in dev
    console.error('logOrderEvent failed:', error.message, payload);
    throw error;
  }
  return true;
}

