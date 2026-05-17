// Current single-company platform defaults.
// Future company policy layer should override through company-aware policy resolution.

export const DEFAULT_WORKFLOW_NOTIFICATION_DEFAULTS = Object.freeze({
  "order.new_assigned": Object.freeze({
    primaryRecipientRole: "appraiser",
    suppressActor: true,
  }),
  "order.sent_to_review": Object.freeze({
    primaryRecipientRole: "reviewer",
    secondaryRecipientIntent: "admin_visibility",
    suppressActor: true,
  }),
  "order.sent_back_to_appraiser": Object.freeze({
    primaryRecipientRole: "appraiser",
    secondaryRecipientIntent: "admin_visibility",
    suppressActor: true,
  }),
  "order.review_cleared": Object.freeze({
    primaryRecipientRole: "admin",
    secondaryRecipientIntent: "owner_visibility",
    suppressActor: true,
  }),
  "order.ready_for_client": Object.freeze({
    primaryRecipientRole: "admin",
    secondaryRecipientIntent: "release_awareness",
    suppressActor: true,
  }),
  "order.completed": Object.freeze({
    primaryRecipientRole: "admin",
    secondaryRecipientIntent: "completion_awareness",
    suppressActor: true,
  }),
});

export const DEFAULT_NOTE_NOTIFICATION_DEFAULTS = Object.freeze({
  "note.appraiser_added": Object.freeze({
    primaryRecipientRole: "reviewer",
    suppressActor: true,
  }),
  "note.reviewer_added": Object.freeze({
    primaryRecipientRole: "appraiser",
    suppressActor: true,
  }),
});

export const DEFAULT_NOTIFICATION_POLICY = Object.freeze({
  suppressActorDefault: true,
  adminVisibilityDefault: "configured_visibility_without_broad_noise",
  ownerVisibilityDefault: "configured_visibility_without_broad_noise",
  queueSignalDelivery: "contextual_only",
  calendarSignalDelivery: "contextual_only",
  activityRecordIsSourceOfTruth: true,
  workflowNotificationDefaults: DEFAULT_WORKFLOW_NOTIFICATION_DEFAULTS,
  noteNotificationDefaults: DEFAULT_NOTE_NOTIFICATION_DEFAULTS,
});

export function getDefaultNotificationPolicy() {
  return DEFAULT_NOTIFICATION_POLICY;
}
