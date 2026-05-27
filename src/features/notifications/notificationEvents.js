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
  ORDER_ASSIGNED_APPRAISER: "order.assigned_appraiser",
  ORDER_REASSIGNED_APPRAISER: "order.reassigned_appraiser",
  ORDER_ASSIGNED_REVIEWER: "order.assigned_reviewer",
  ORDER_REASSIGNED_REVIEWER: "order.reassigned_reviewer",
  ORDER_SENT_TO_REVIEW: "order.sent_to_review",
  ORDER_RESUBMITTED_TO_REVIEW: "order.resubmitted_to_review",
  ORDER_SENT_BACK_TO_APPRAISER: "order.sent_back_to_appraiser",
  ORDER_REVIEW_CLEARED: "order.review_cleared",
  ORDER_READY_FOR_CLIENT: "order.ready_for_client",
  ORDER_COMPLETED: "order.completed",
  ORDER_DATES_UPDATED: "order.dates_updated",
  ORDER_SITE_VISIT_UPDATED: "order.site_visit_updated",
  NOTE_ADDED: "note.added",
  NOTE_APPRAISER_ADDED: "note.appraiser_added",
  NOTE_REVIEWER_ADDED: "note.reviewer_added",
  USER_INVITED: "user.invited",
  USER_ACCESS_CHANGED: "user.access_changed",
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

  [NOTIFICATION_EVENT_KEYS.ORDER_ASSIGNED_APPRAISER]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_ASSIGNED_APPRAISER,
    label: "Appraiser Assigned",
    category: "order",
    priority: "high",
    primaryRecipientRole: "appraiser",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Appraiser assignment: ${orderLabel(orderNumber)}`,
    buildBody: ({ order }) => `You were assigned the appraisal for ${clientLabel(order)}.`,
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_REASSIGNED_APPRAISER]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_REASSIGNED_APPRAISER,
    label: "Appraiser Reassigned",
    category: "order",
    priority: "high",
    primaryRecipientRole: "appraiser",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Appraiser reassignment: ${orderLabel(orderNumber)}`,
    buildBody: ({ order }) => `You were reassigned the appraisal for ${clientLabel(order)}.`,
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_ASSIGNED_REVIEWER]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_ASSIGNED_REVIEWER,
    label: "Reviewer Assigned",
    category: "order",
    priority: "high",
    primaryRecipientRole: "reviewer",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Reviewer assignment: ${orderLabel(orderNumber)}`,
    buildBody: ({ order }) => `You were assigned review for ${clientLabel(order)}.`,
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_REASSIGNED_REVIEWER]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_REASSIGNED_REVIEWER,
    label: "Reviewer Reassigned",
    category: "order",
    priority: "high",
    primaryRecipientRole: "reviewer",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Reviewer reassignment: ${orderLabel(orderNumber)}`,
    buildBody: ({ order }) => `You were reassigned review for ${clientLabel(order)}.`,
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_SENT_TO_REVIEW]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_SENT_TO_REVIEW,
    label: "Send to Review",
    category: "workflow",
    priority: "high",
    primaryRecipientRole: "reviewer",
    secondaryRecipientIntent: "admin_visibility",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Order ${orderLabel(orderNumber)} sent to review`,
    buildBody: ({ payload }) => {
      if (payload?.note_text) return payload.note_text;
      return "Appraiser sent this report for review.";
    },
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_RESUBMITTED_TO_REVIEW]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_RESUBMITTED_TO_REVIEW,
    label: "Resubmit to Review",
    category: "workflow",
    priority: "high",
    primaryRecipientRole: "reviewer",
    secondaryRecipientIntent: "admin_visibility",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Resubmitted to review: ${orderLabel(orderNumber)}`,
    buildBody: ({ payload }) => payload?.note_text || "Appraiser resubmitted this report to review.",
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

  [NOTIFICATION_EVENT_KEYS.ORDER_DATES_UPDATED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_DATES_UPDATED,
    label: "Dates Updated",
    category: "workflow",
    priority: "normal",
    primaryRecipientRole: "appraiser",
    secondaryRecipientIntent: "schedule_awareness",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Dates updated: ${orderLabel(orderNumber)}`,
    buildBody: () => "Review or final due dates changed for this order.",
  }),

  [NOTIFICATION_EVENT_KEYS.ORDER_SITE_VISIT_UPDATED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.ORDER_SITE_VISIT_UPDATED,
    label: "Site Visit Updated",
    category: "workflow",
    priority: "normal",
    primaryRecipientRole: "appraiser",
    secondaryRecipientIntent: "schedule_awareness",
    suppressActor: true,
    buildTitle: ({ orderNumber }) => `Site visit updated: ${orderLabel(orderNumber)}`,
    buildBody: () => "The site visit appointment changed for this order.",
  }),

  [NOTIFICATION_EVENT_KEYS.NOTE_ADDED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.NOTE_ADDED,
    label: "Note Added",
    category: "communication",
    priority: "high",
    primaryRecipientRole: "assigned_participant",
    suppressActor: true,
    buildTitle: ({ payload }) => `${actorLabel(payload)} added a note`,
    buildBody: ({ payload }) => payload?.note_text || payload?.message || "",
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

  [NOTIFICATION_EVENT_KEYS.USER_INVITED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.USER_INVITED,
    label: "User Invited",
    category: "user",
    priority: "normal",
    primaryRecipientRole: "admin",
    buildTitle: () => "Company invitation sent",
    buildBody: ({ payload }) => payload?.message || "A company invitation was sent.",
  }),

  [NOTIFICATION_EVENT_KEYS.USER_ACCESS_CHANGED]: Object.freeze({
    key: NOTIFICATION_EVENT_KEYS.USER_ACCESS_CHANGED,
    label: "User Access Changed",
    category: "user",
    priority: "normal",
    primaryRecipientRole: "admin",
    buildTitle: () => "User access changed",
    buildBody: ({ payload }) => payload?.message || "Company access was updated.",
  }),
});

export const NOTIFICATION_SETTINGS_EVENTS = Object.freeze([
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_NEW_ASSIGNED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_ASSIGNED_APPRAISER],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_REASSIGNED_APPRAISER],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_ASSIGNED_REVIEWER],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_REASSIGNED_REVIEWER],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_SENT_TO_REVIEW],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_RESUBMITTED_TO_REVIEW],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_SENT_BACK_TO_APPRAISER],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_REVIEW_CLEARED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_READY_FOR_CLIENT],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_COMPLETED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_DATES_UPDATED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.ORDER_SITE_VISIT_UPDATED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.NOTE_ADDED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.NOTE_APPRAISER_ADDED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.NOTE_REVIEWER_ADDED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.USER_INVITED],
  NOTIFICATION_EVENT_REGISTRY[NOTIFICATION_EVENT_KEYS.USER_ACCESS_CHANGED],
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
