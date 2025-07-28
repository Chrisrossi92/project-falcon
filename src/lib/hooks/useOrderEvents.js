// lib/hooks/useOrderEvents.js
import holidays from '@/data/usHolidays2025.json';
import { canViewSiteVisit, canViewReviewDue, canViewDueDate } from '@/lib/utils/permissions'; // Import new permissions

const useOrderEvents = ({ orders = [], user, filters = {}, compact = false }) => {
  const allEvents = [];

  if (filters.site) {
    orders.forEach(order => {
      if (
        order.site_visit_at &&
        canViewSiteVisit(user.role, order.appraiser_id, user.id) // Replaced inline check
      ) {
        allEvents.push({
          title: `📍 ${order.address}`,
          date: order.site_visit_date,
          backgroundColor: '#6EE7B7',
          borderColor: '#059669',
          textColor: '#065F46',
          extendedProps: { type: 'site', orderId: order.id }
        });
      }
    });
  }

  if (filters.review) {
    orders.forEach(order => {
      if (
        order.review_due_date &&
        canViewReviewDue(user.role, order.status) && // Replaced; assumes reviewer check
        ['Needs Review'].includes(order.status)
      ) {
        allEvents.push({
          title: `🔍 ${order.address}`,
          date: order.review_due_date,
          backgroundColor: '#FDE68A',
          borderColor: '#F59E0B',
          textColor: '#92400E',
          extendedProps: { type: 'review', orderId: order.id }
        });
      }
    });
  }

  if (filters.due) {
    orders.forEach(order => {
      if (
        order.due_date &&
        canViewDueDate(user.role, order.appraiser_id, user.id) // Replaced inline check
      ) {
        allEvents.push({
          title: `⏰ ${order.address}`,
          date: order.due_date,
          backgroundColor: '#BFDBFE',
          borderColor: '#2563EB',
          textColor: '#1E3A8A',
          extendedProps: { type: 'due', orderId: order.id }
        });
      }
    });
  }

  if (filters.holidays && !compact) {
    holidays.forEach(holiday => {
      allEvents.push({
        title: `🎉 ${holiday.name}`,
        date: holiday.date,
        display: 'background',
        backgroundColor: '#F3F4F6',
        textColor: '#6B7280'
      });
    });
  }

  return allEvents;
};

export default useOrderEvents;