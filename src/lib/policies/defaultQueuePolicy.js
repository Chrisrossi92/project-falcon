// Current single-company platform defaults.
// Future company policy layer should override through company-aware policy resolution.

export const DEFAULT_DUE_SOON_HOURS = 48;
export const DEFAULT_REVIEW_COMPRESSION_DAYS = 2;

export const DEFAULT_ACTIVE_APPRAISER_STATUSES = Object.freeze([
  "new",
  "in_progress",
  "needs_revisions",
]);

export const DEFAULT_COMPLETED_STATUSES = Object.freeze(["completed"]);

export const DEFAULT_ENABLED_OPERATIONAL_QUEUES = Object.freeze([
  "due_soon",
  "overdue",
  "waiting_on_reviewer",
  "waiting_on_appraiser",
  "final_approval_queue",
  "ready_for_delivery",
  "unassigned_orders",
]);

export const DEFAULT_QUEUE_VISIBILITY = Object.freeze({
  appraiserActiveWork: "assigned_active_production",
  reviewerActiveWork: "assigned_review_work",
  adminOwnerVisibility: "operational_bottlenecks_and_delivery_pressure",
});

export const DEFAULT_QUEUE_POLICY = Object.freeze({
  dueSoonHours: DEFAULT_DUE_SOON_HOURS,
  reviewCompressionDays: DEFAULT_REVIEW_COMPRESSION_DAYS,
  activeAppraiserStatuses: DEFAULT_ACTIVE_APPRAISER_STATUSES,
  completedStatuses: DEFAULT_COMPLETED_STATUSES,
  enabledQueues: DEFAULT_ENABLED_OPERATIONAL_QUEUES,
  visibility: DEFAULT_QUEUE_VISIBILITY,
});

export function getDefaultQueuePolicy() {
  return DEFAULT_QUEUE_POLICY;
}
