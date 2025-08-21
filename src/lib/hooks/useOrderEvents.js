import { useMemo } from 'react';
import mapOrderToEvents from '@/lib/utils/mapOrderToEvents';
import colorForId from '@/lib/utils/colorForId';

/**
 * @param {Object} params
 * @param {Array}  params.orders   list of order objects
 * @param {Object} params.user     current user (unused here, reserved)
 * @param {Object} params.filters  { site:bool, review:bool, due:bool, holidays:bool }
 * @param {Boolean}params.compact
 */
export default function useOrderEvents({ orders = [], user, filters = {}, compact = false }) {
  return useMemo(() => {
    if (!orders.length) return [];

    return orders
      .flatMap((order) => {
        // Build base events (title has 📍 / 🔍 / ⏰ icon already)
        const base = mapOrderToEvents(order);

        // Color by appraiser (per MVP spec). White text for contrast.
        const bg = colorForId(order.appraiser_id || order.assigned_to || order.appraiserId);
        base.forEach((e) => {
          e.backgroundColor = bg;
          e.textColor = 'white';
        });
        return base;
      })
      .filter((event) => {
        // Only keep the three admin event types; honor toggles
        if (event.type === 'site'   && filters.site   === false) return false;
        if (event.type === 'review' && filters.review === false) return false;
        if (event.type === 'due'    && filters.due    === false) return false;
        return true;
      });
  }, [orders, filters, user?.id, compact]);
}

