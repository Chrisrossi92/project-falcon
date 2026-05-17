import { DEFAULT_CALENDAR_POLICY } from "@/lib/policies/defaultCalendarPolicy";

export function normalizeCalendarEventType(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("site")) return "site";
  if (raw.includes("review")) return "review";
  if (raw.includes("final") || raw.includes("client")) return "final";
  return "other";
}

export function canonicalCalendarEventType(type) {
  switch (normalizeCalendarEventType(type)) {
    case "site":
      return "site_visit";
    case "review":
      return "due_for_review";
    case "final":
      return "due_to_client";
    default:
      return "event";
  }
}

export function formatCalendarEventTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start, end) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function streetAddressOf(row = {}) {
  return row.street || row.address_line1 || row.street_address || row.address || "";
}

export function fullAddressOf(row = {}, { includePostal = true } = {}) {
  const street = streetAddressOf(row);
  const cityState = [row.city, row.state].filter(Boolean).join(", ");
  const postal = includePostal ? row.postal_code || row.zip || "" : "";
  return [street, cityState, postal].filter(Boolean).join(", ");
}

export function orderIdOf(row = {}) {
  return row.orderId || row.order_id || row.id || null;
}

export function orderNumberOf(row = {}) {
  return row.orderNumber || row.order_number || row.order_no || null;
}

export function formatCalendarEventTitle(type, { address = "", orderId = null, eventTime = "" } = {}) {
  const normalizedType = normalizeCalendarEventType(type);
  const addr = String(address || "").trim();
  if (normalizedType === "site" && addr && eventTime) return `${addr} · ${eventTime}`;
  if (addr) return addr;
  if (orderId) return `Order ${orderId.toString().slice(0, 8)}`;
  return "Event";
}

export function deriveCalendarOperationalSignals(order = {}, eventType = "") {
  const type = normalizeCalendarEventType(eventType);
  const siteVisit = order.site_visit_at || order.site_visit_date || null;
  const reviewDue = order.review_due_at || order.review_due_date || null;
  const finalDue = order.final_due_at || order.final_due_date || order.due_date || null;
  const signals = [];

  if ((type === "review" || type === "final") && !siteVisit && (reviewDue || finalDue)) {
    signals.push({
      id: "missing_site_visit",
      label: "No site visit scheduled.",
      tone: "muted",
    });
  }

  const reviewToFinalDays = daysBetween(reviewDue, finalDue);
  if (
    (type === "review" || type === "final") &&
    reviewToFinalDays !== null &&
    reviewToFinalDays >= 0 &&
    reviewToFinalDays <= DEFAULT_CALENDAR_POLICY.reviewCompressionThresholdDays
  ) {
    signals.push({
      id: "review_compression",
      label: "Review and client due dates are tightly compressed.",
      tone: "muted",
    });
  }

  if (type === "site" && !(order.appraiserId || order.appraiser_id || order.assigned_appraiser_id || order.assigned_to)) {
    signals.push({
      id: "appraiser_unassigned",
      label: "Appraiser not assigned.",
      tone: "muted",
    });
  }

  if (type === "review" && !(order.reviewerId || order.reviewer_id)) {
    signals.push({
      id: "reviewer_unassigned",
      label: "Reviewer not assigned.",
      tone: "muted",
    });
  }

  return signals;
}

export function normalizeCalendarEvent(row = {}, options = {}) {
  const type = normalizeCalendarEventType(row.type || row.event_type || row.kind || options.type);
  const orderId = orderIdOf(row);
  const orderNumber = orderNumberOf(row);
  const startValue = row.start || row.start_at || row.at || options.start || null;
  const endValue = row.end || row.end_at || options.end || startValue;
  const sourceField = row.sourceField || row.source_field || options.sourceField || null;
  const street = row.street || streetAddressOf(row);
  const address = row.fullAddress || row.full_address || fullAddressOf(row, { includePostal: options.includePostal !== false }) || street;
  const eventTime = row.eventTime || row.event_time || (type === "site" ? formatCalendarEventTime(startValue) : "");
  const title = row.title || row.label || formatCalendarEventTitle(type, {
    address: street || address,
    orderId,
    eventTime,
  });

  return {
    ...row,
    id: row.id || `${orderId || "order"}-${type}-${startValue || "unscheduled"}`,
    type,
    eventType: row.eventType || row.event_type || canonicalCalendarEventType(type),
    sourceField,
    title,
    label: row.label || title,
    start: startValue,
    date: startValue,
    end: endValue,
    orderId,
    orderNumber,
    order_number: orderNumber,
    order_no: orderNumber,
    clientName: row.clientName || row.client_name || null,
    client_name: row.client_name || row.clientName || null,
    status: row.status || null,
    appraiserId: row.appraiserId || row.appraiser_id || row.assigned_appraiser_id || row.assigned_to || null,
    appraiserName: row.appraiserName || row.appraiser_name || row.assigned_appraiser_name || null,
    appraiser_name: row.appraiser_name || row.appraiserName || row.assigned_appraiser_name || null,
    appraiserColor: row.appraiserColor || row.appraiser_color || null,
    appraiser_color: row.appraiser_color || row.appraiserColor || null,
    reviewerId: row.reviewerId || row.reviewer_id || null,
    reviewerName: row.reviewerName || row.reviewer_name || null,
    reviewer_name: row.reviewer_name || row.reviewerName || null,
    reviewerColor: row.reviewerColor || row.reviewer_color || null,
    reviewer_color: row.reviewer_color || row.reviewerColor || null,
    street,
    address,
    address_line1: row.address_line1 || street,
    city: row.city || null,
    state: row.state || null,
    zip: row.zip || row.postal_code || null,
    postalCode: row.postalCode || row.postal_code || row.zip || null,
    fullAddress: address,
    eventTime,
    operationalSignals: row.operationalSignals || row.operational_signals || options.operationalSignals || [],
    raw: row.raw || row,
  };
}

export function calendarEventsFromOrder(order = {}, options = {}) {
  const orderId = orderIdOf(order);
  const eventSpecs = [
    { type: "site", start: order.site_visit_at || order.site_visit_date, sourceField: order.site_visit_at ? "site_visit_at" : "site_visit_date" },
    { type: "review", start: order.review_due_at || order.review_due_date, sourceField: order.review_due_at ? "review_due_at" : "review_due_date" },
    { type: "final", start: order.final_due_at || order.final_due_date || order.due_date, sourceField: order.final_due_at ? "final_due_at" : order.final_due_date ? "final_due_date" : "due_date" },
  ];

  return eventSpecs
    .filter((spec) => spec.start)
    .map((spec) => {
      const when = new Date(spec.start);
      const start = Number.isNaN(when.getTime()) ? spec.start : when.toISOString();
      return normalizeCalendarEvent(
        {
          ...order,
          id: `${orderId || "order"}-${spec.type}-${Number.isNaN(when.getTime()) ? spec.start : when.getTime()}`,
          type: spec.type,
          start,
          end: start,
          sourceField: spec.sourceField,
          operationalSignals: deriveCalendarOperationalSignals(order, spec.type),
          raw: order,
        },
        options
      );
    });
}

export function filterCalendarEventsByRange(events = [], start, end) {
  if (!start || !end) return [];
  const startMs = start.getTime();
  const endMs = end.getTime();

  return (events || []).filter((event) => {
    const ms = new Date(event.start || event.date).getTime();
    if (Number.isNaN(ms)) return false;
    return ms >= startMs && ms <= endMs;
  });
}
