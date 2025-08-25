export default function mapOrderToEvents(order) {
  if (!order) return [];

  const events = [];

  const addr =
    order.property_address ||
    order.address ||
    [order.city, order.state, order.postal_code].filter(Boolean).join(", ") ||
    "Unknown Address";

  const toISO = (datetime) => (datetime ? new Date(datetime).toISOString() : null);

  // 📍 Site Visit
  if (order.site_visit_at) {
    events.push({
      title: `📍 Site Visit – ${addr}`,
      start: toISO(order.site_visit_at),
      orderId: order.id,
      type: "site",
    });
  }

  // 🔍 Review Due
  if (order.review_due_at) {
    events.push({
      title: `🔍 Review Due – ${addr}`,
      start: toISO(order.review_due_at),
      orderId: order.id,
      type: "review",
    });
  }

  // ⏰ Final Due
  if (order.final_due_at) {
    events.push({
      title: `⏰ Final Due – ${addr}`,
      start: toISO(order.final_due_at),
      orderId: order.id,
      type: "due",
    });
  }

  return events;
}




