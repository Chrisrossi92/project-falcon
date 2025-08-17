import supabase from '@/lib/supabaseClient';

/**
 * Persist an activity row for an order.
 *
 * Supports both camelCase and snake_case args:
 *  - orderId / order_id: UUID (required)
 *  - userId  / user_id : UUID | null
 *  - role               : 'system' | 'admin' | 'appraiser' | ...
 *  - action             : 'system' | 'comment' | 'order_created' | 'status_changed' | 'assigned' | ...
 *  - message            : string (shown in UI)
 *  - context            : object (merged under context JSON)
 *  - visibleTo / visible_to: string[] (roles allowed to see entry)
 */
export default async function logOrderEvent(args) {
  // Accept both naming styles
  const orderId   = args.orderId ?? args.order_id;
  const userId    = args.userId  ?? args.user_id ?? null;
  const role      = args.role ?? 'system';
  const action    = args.action ?? 'system';
  const message   = args.message;
  const context   = args.context ?? {};
  const visibleTo = args.visibleTo ?? args.visible_to ?? ['admin', 'appraiser'];

  if (!orderId) throw new Error('logOrderEvent: orderId/order_id is required');

  // DO NOT cast UUIDs. Store as-is.
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
    // Keep this console for quick field/policy debugging in dev
    console.error('logOrderEvent failed:', error.message, payload);
    throw error;
  }
  return true;
}

