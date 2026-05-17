const DEFAULT_ORDER_LABEL = "order";

function orderLabel(orderNumber) {
  return orderNumber || DEFAULT_ORDER_LABEL;
}

function clientLabel(order) {
  return order?.client_name || "client";
}

function actorLabel(payload, fallback = "Someone") {
  return payload?.actor?.name || payload?.actorName || fallback;
}

export const NOTIFICATION_EVENT_KEYS = Object.freeze({
  ORDER_NEW_ASSIGNED: "order.new_assigned",
  ORDER_SENT_TO_REVIEW: "order.sent_to_review",
  ORDER_SENT_BACK_TO_APPRAISER: "order.sent_back_to_appraiser",
  ORDER_REVIEW_CLEARED: "order.review_cleared",
  ORDER_READY_FOR_CLIENT: "order.ready_for_client",
  ORDER_COMPLETED: "order.completed",
  NOTE_APPRAISER_ADDED: "note.appraiser_added",
  NOTE_REVIEWER_ADDED: "note.reviewer_added",
});

export const NOTIFICATION_EVENT_REGISTRY = Object.freeze({
  [NOTIFICATION_EVENT_KEYS.ORDER_NEW_ASSIGNED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_NEW_ASSIGNED,
    label: "New Order Assigned",
    category: "order",
    priority: "high",
    primaryRecipientRole: "appraiser",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Order ${orderLabel(orderNumber)} assigned`,
    buildBody: ({ order }) => `A new order was assigned for ${clientLabel(order)}.`,
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_SENT_TO_REVIEW]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_SENT_TO_REVIEW,
    label: "Send to Review",
    resubmissionLabel: "Resubmit to Review",
    category: "workflow",
    priority: "high",
    primaryRecipientRole: "reviewer",
    secondaryRecipientIntent: "admin_visibility",
    suppressActor: true,
    buildTitle: ({ orderNumber, payload }) =>
      payload?.is_resubmission
        ? `Resubmitted to review: ${orderLabel(orderNumber)}`
        : `Order ${orderLabel(orderNumber)} sent to review`,
    buildBody: ({ payload }) => {
      if (payload?.note_text) return payload.note_text;
      if (payload?.is_resubmission) return "Appraiser resubmitted this report to review.";
      return "Appraiser sent this report for review.";
    },
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_SENT_BACK_TO_APPRAISER]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_SENT_BACK_TO_APPRAISER,
    label: "Request Revisions",
    category: "workflow",
    priority: "high",
    primaryRecipientRole: "appraiser",
    secondaryRecipientIntent: "admin_visibility",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Revisions requested: ${orderLabel(orderNumber)}`,
    buildBody: ({ payload }) => payload?.note_text || "Reviewer requested changes to this report.",
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_REVIEW_CLEARED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_REVIEW_CLEARED,
    label: "Clear Review",
    category: "workflow",
    priority: "normal",
    primaryRecipientRole: "admin",
    secondaryRecipientIntent: "owner_visibility",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Review cleared: ${orderLabel(orderNumber)}`,
    buildBody: () => "Reviewer cleared this order for admin release.",
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_READY_FOR_CLIENT]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_READY_FOR_CLIENT,
    label: "Mark Ready for Client",
    category: "workflow",
    priority: "normal",
    primaryRecipientRole: "admin",
    secondaryRecipientIntent: "release_awareness",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Ready for client: ${orderLabel(orderNumber)}`,
    buildBody: () => "Order is ready for client delivery.",
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_COMPLETED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_COMPLETED,
    label: "Mark Complete",
    category: "workflow",
    priority: "normal",
    primaryRecipientRole: "admin",
    secondaryRecipientIntent: "completion_awareness",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Order ${orderLabel(orderNumber)} completed`,
    buildBody: ({ order }) => `Report for ${clientLabel(order)} was marked complete.`,
  }),

  [NOTIFICATION_EVENT_KEYS.NOTE_APPRAISER_ADDED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.NOTE_APPRAISER_ADDED,
    label: "Appraiser Note",
    category: "communication",
    priority: "high",
    primaryRecipientRole: "reviewer",
    suppressActor: true,
    buildTitle: ({ payload }) => `${actorLabel(payload)} added a note`,
    buildBody: ({ payload }) => payload?.note_text || payload?.message || "",
  }),

  [NOTIFICATION_EVENT_KEYS.NOTE_REVIEWER_ADDED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.NOTE_REVIEWER_ADDED,
    label: "Reviewer Note",
    category: "communication",
    priority: "high",
    primaryRecipientRole: "appraiser",
    suppressActor: true,
    buildTitle: ({ payload }) => `${actorLabel(payload)} added a note`,
    buildBody: ({ payload }) => payload?.note_text || payload?.message || "",
  }),
});

export const NOTIFICATION_SETTINGS_EVENTS = Object.freeze([
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_NEW_ASSIGNED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_SENT_TO_REVIEW],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_SENT_BACK_TO_APPRAISER],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_REVIEW_CLEARED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_READY_FOR_CLIENT],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_COMPLETED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.NOTE_APPRAISER_ADDED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.NOTE_REVIEWER_ADDED],
]);

export function getNotificationEvent(eventKey) {
  return NOTIFICATION_EVENT_REGISTRY[eventKey] || null;
}

export function buildNotificationTitleFromRegistry(eventKey, context = {}) {
  const event = getNotificationEvent(eventKey);
  if (event?.buildTitle) return event.buildTitle(context);
  return `Order ${orderLabel(context.orderNumber)} updated`;
}

export function buildNotificationBodyFromRegistry(eventKey, context = {}) {
  const event = getNotificationEvent(eventKey);
  if (event?.buildBody) return event.buildBody(context);
  return context.payload?.message || "";
}
