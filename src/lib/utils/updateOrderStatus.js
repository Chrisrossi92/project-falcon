// src/lib/utils/updateOrderStatus.js
function warnLegacyUpdateOrderStatus() {
  if (import.meta.env?.DEV !== true) return;
  console.warn(
    '[updateOrderStatus] Legacy direct status fallback is deprecated. Use canonical workflow transition helpers for active UI.'
  );
}

/**
 * Legacy/quarantined status mutation path.
 * Do not use for lifecycle transitions; use canonical workflow transition helpers/RPC.
 *
 * Deprecated for normal workflow lifecycle actions.
 * This bypasses the guarded workflow helpers in src/lib/services/ordersService.js.
 * Use those workflow helpers for normal status transitions.
 */
export default async function updateOrderStatus(_orderId, _newStatus, _note = null)  {
  warnLegacyUpdateOrderStatus();
  throw new Error('Order status changes must use canonical workflow transition RPCs.');
}
