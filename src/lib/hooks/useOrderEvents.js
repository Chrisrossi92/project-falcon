import { useMemo } from 'react';
import mapOrderToEvents from '@/lib/utils/mapOrderToEvents';
import autoUpdateOrderStatus from '@/lib/utils/autoUpdateOrderStatus';

/**
 * @param {Object} params
 * @param {Array} params.orders - list of order objects
 * @param {Object} params.user - current user
 * @param {Object} params.filters - which event types to show (e.g. { site: true, review: false })
 * @param {Boolean} params.compact - optional flag for future adjustments
 */
export default function useOrderEvents({ orders = [], user, filters = {}, compact = false }) {
  return useMemo(() => {
    if (!orders.length) return [];

    return orders
      .flatMap((order) => {
  // Trigger auto-status update logic
  autoUpdateOrderStatus(order);
  return mapOrderToEvents(order);
})
      .filter((event) => {
        // If event has a "type" and it's disabled in filters, skip it
        if (filters[event.type] === false) return false;
        return true;
      });
  }, [orders, filters, user?.id, compact]);
}
