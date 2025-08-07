export default function mapOrderToEvents(order) {
  if (!order) return [];

  const events = [];

  const address = order.address || 'Unknown Address';

  // Convert to ISO (UTC) string to avoid timezone offset bugs
  const toISO = (datetime) => {
    return datetime ? new Date(datetime).toISOString() : null;
  };

  // Site Visit
  if (order.site_visit_at) {
    events.push({
      title: `📍 Site Visit – ${address}`,
      start: toISO(order.site_visit_at),
      end: toISO(order.site_visit_at),
      orderId: order.id,
      type: 'site_visit',
      backgroundColor: '#2563eb', // blue-600
      textColor: 'white',
    });
  }

  // Review Due
  if (order.review_due_date) {
    events.push({
      title: `🔍 Review Due – ${address}`,
      start: toISO(order.review_due_date),
      orderId: order.id,
      type: 'review_due',
      backgroundColor: '#f59e0b', // amber-500
      textColor: 'white',
    });
  }

  // Final Due Date
  if (order.due_date) {
    events.push({
      title: `⏰ Final Due – ${address}`,
      start: toISO(order.due_date),
      orderId: order.id,
      type: 'due',
      backgroundColor: '#dc2626', // red-600
      textColor: 'white',
    });
  }

  return events;
}

