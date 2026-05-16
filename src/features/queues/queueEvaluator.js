import {
  OPERATIONAL_QUEUE_DEFINITIONS,
  OPERATIONAL_QUEUE_IDS,
} from "./queueDefinitions";

const ACTIVE_APPRAISER_STATUSES = new Set(["new", "in_progress", "needs_revisions"]);
const COMPLETED_STATUSES = new Set(["completed"]);
const DEFAULT_DUE_SOON_HOURS = 48;

function normalizeStatus(status) {
  return String(status || "").toLowerCase().trim();
}

function isCompleted(order) {
  return COMPLETED_STATUSES.has(normalizeStatus(order?.status));
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? null;
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFinalDueDate(order) {
  return parseDate(
    firstValue(
      order?.final_due_at,
      order?.final_due_date,
      order?.final_due,
      order?.client_due_at,
      order?.due_to_client,
      order?.due_date
    )
  );
}

function getAppraiserId(order) {
  return firstValue(order?.appraiser_id, order?.assigned_to);
}

function getReviewerId(order) {
  return firstValue(order?.reviewer_id);
}

function isDueSoon(order, now, dueSoonHours) {
  if (isCompleted(order)) return false;

  const dueDate = getFinalDueDate(order);
  if (!dueDate) return false;

  const dueMs = dueDate.getTime();
  const nowMs = now.getTime();
  const dueSoonMs = dueSoonHours * 60 * 60 * 1000;

  return dueMs >= nowMs && dueMs <= nowMs + dueSoonMs;
}

function isOverdue(order, now) {
  if (isCompleted(order)) return false;

  const dueDate = getFinalDueDate(order);
  if (!dueDate) return false;

  return dueDate.getTime() < now.getTime();
}

function isWaitingOnReviewer(order) {
  return normalizeStatus(order?.status) === "in_review" && Boolean(getReviewerId(order));
}

function isWaitingOnAppraiser(order) {
  return ACTIVE_APPRAISER_STATUSES.has(normalizeStatus(order?.status)) && Boolean(getAppraiserId(order));
}

function isFinalApproval(order) {
  return normalizeStatus(order?.status) === "pending_final_approval";
}

function isReadyForDelivery(order) {
  return normalizeStatus(order?.status) === "ready_for_client";
}

function isUnassigned(order) {
  if (isCompleted(order)) return false;

  const status = normalizeStatus(order?.status);
  const missingAppraiser = !getAppraiserId(order);
  const missingReviewerForReview = status === "in_review" && !getReviewerId(order);

  return missingAppraiser || missingReviewerForReview;
}

const EVALUATORS = Object.freeze({
  [OPERATIONAL_QUEUE_IDS.DUE_SOON]: (order, context) =>
    isDueSoon(order, context.now, context.dueSoonHours),
  [OPERATIONAL_QUEUE_IDS.OVERDUE]: (order, context) => isOverdue(order, context.now),
  [OPERATIONAL_QUEUE_IDS.WAITING_ON_REVIEWER]: (order) => isWaitingOnReviewer(order),
  [OPERATIONAL_QUEUE_IDS.WAITING_ON_APPRAISER]: (order) => isWaitingOnAppraiser(order),
  [OPERATIONAL_QUEUE_IDS.FINAL_APPROVAL_QUEUE]: (order) => isFinalApproval(order),
  [OPERATIONAL_QUEUE_IDS.READY_FOR_DELIVERY]: (order) => isReadyForDelivery(order),
  [OPERATIONAL_QUEUE_IDS.UNASSIGNED_ORDERS]: (order) => isUnassigned(order),
});

// Queues are derived operational intelligence. This evaluator intentionally uses
// pure deterministic rules so every queue result can be explained from order data.
export function evaluateOrderQueues(order, options = {}) {
  const context = {
    now: parseDate(options.now) ?? new Date(),
    dueSoonHours: Number(options.dueSoonHours ?? DEFAULT_DUE_SOON_HOURS),
  };

  return OPERATIONAL_QUEUE_DEFINITIONS
    .filter((definition) => EVALUATORS[definition.id]?.(order, context))
    .map((definition) => definition.id);
}

export function orderHasQueue(order, queueId) {
  return evaluateOrderQueues(order).includes(queueId);
}
