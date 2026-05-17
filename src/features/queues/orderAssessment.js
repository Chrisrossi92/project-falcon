import {
  OPERATIONAL_QUEUE_DEFINITIONS,
  OPERATIONAL_QUEUE_IDS,
} from "./queueDefinitions";
import {
  DEFAULT_ACTIVE_APPRAISER_STATUSES,
  DEFAULT_COMPLETED_STATUSES,
  DEFAULT_DUE_SOON_HOURS,
} from "@/lib/policies/defaultQueuePolicy";

const ACTIVE_APPRAISER_STATUSES = new Set(DEFAULT_ACTIVE_APPRAISER_STATUSES);
const COMPLETED_STATUSES = new Set(DEFAULT_COMPLETED_STATUSES);

const QUEUE_DEFINITION_BY_ID = new Map(
  OPERATIONAL_QUEUE_DEFINITIONS.map((definition, index) => [
    definition.id,
    { ...definition, index },
  ])
);

const TONE_PRIORITY = Object.freeze({
  muted: 0,
  medium: 1,
  high: 2,
  critical: 3,
});

function normalizeStatus(status) {
  return String(status || "").toLowerCase().trim();
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? null;
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCompleted(order) {
  return COMPLETED_STATUSES.has(normalizeStatus(order?.status));
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

function getAppraiserName(order) {
  return firstValue(order?.appraiser_name, order?.assigned_appraiser_name);
}

function getReviewerName(order) {
  return firstValue(order?.reviewer_name);
}

function buildSignal(id, label, { tone = "muted", ownerRole = null, source = null } = {}) {
  return { id, label, tone, ownerRole, source };
}

function buildOwner(role, userId, name) {
  if (!role && !userId && !name) return null;
  return {
    role: role || null,
    userId: userId || null,
    name: name || null,
  };
}

function isDueSoon(order, now, dueSoonHours) {
  if (isCompleted(order)) return false;

  const dueDate = getFinalDueDate(order);
  if (!dueDate) return false;

  const dueSoonMs = dueSoonHours * 60 * 60 * 1000;
  const dueMs = dueDate.getTime();
  const nowMs = now.getTime();

  return dueMs >= nowMs && dueMs <= nowMs + dueSoonMs;
}

function isOverdue(order, now) {
  if (isCompleted(order)) return false;

  const dueDate = getFinalDueDate(order);
  if (!dueDate) return false;

  return dueDate.getTime() < now.getTime();
}

function selectPrimaryQueueId(signals) {
  const prioritized = [...signals].sort((a, b) => {
    const toneDelta = (TONE_PRIORITY[b.tone] ?? 0) - (TONE_PRIORITY[a.tone] ?? 0);
    if (toneDelta) return toneDelta;

    const aDef = QUEUE_DEFINITION_BY_ID.get(a.id);
    const bDef = QUEUE_DEFINITION_BY_ID.get(b.id);
    return (aDef?.index ?? 999) - (bDef?.index ?? 999);
  });

  return prioritized[0]?.id || null;
}

function buildContext(options = {}) {
  return {
    now: parseDate(options.now) ?? new Date(),
    dueSoonHours: Number(options.dueSoonHours ?? DEFAULT_DUE_SOON_HOURS),
  };
}

export function assessOrderOperationalQueues(order, options = {}) {
  const context = buildContext(options);
  const status = normalizeStatus(order?.status);
  const signals = [];
  const appraiserId = getAppraiserId(order);
  const reviewerId = getReviewerId(order);

  if (isDueSoon(order, context.now, context.dueSoonHours)) {
    signals.push(
      buildSignal(OPERATIONAL_QUEUE_IDS.DUE_SOON, "Client due date is within 48 hours.", {
        tone: "high",
        ownerRole: status === "in_review" ? "reviewer" : "appraiser",
        source: "final_due_at",
      })
    );
  }

  if (isOverdue(order, context.now)) {
    signals.push(
      buildSignal(OPERATIONAL_QUEUE_IDS.OVERDUE, "Client due date has passed.", {
        tone: "high",
        ownerRole: "admin",
        source: "final_due_at",
      })
    );
  }

  if (status === "in_review" && reviewerId) {
    signals.push(
      buildSignal(OPERATIONAL_QUEUE_IDS.WAITING_ON_REVIEWER, "Review is waiting on reviewer.", {
        tone: "medium",
        ownerRole: "reviewer",
        source: "status",
      })
    );
  }

  if (ACTIVE_APPRAISER_STATUSES.has(status) && appraiserId) {
    signals.push(
      buildSignal(OPERATIONAL_QUEUE_IDS.WAITING_ON_APPRAISER, "Work is waiting on appraiser.", {
        tone: "medium",
        ownerRole: "appraiser",
        source: "status",
      })
    );
  }

  if (status === "pending_final_approval") {
    signals.push(
      buildSignal(OPERATIONAL_QUEUE_IDS.FINAL_APPROVAL_QUEUE, "Final approval is pending.", {
        tone: "high",
        ownerRole: "admin",
        source: "status",
      })
    );
  }

  if (status === "ready_for_client") {
    signals.push(
      buildSignal(OPERATIONAL_QUEUE_IDS.READY_FOR_DELIVERY, "Order is ready for delivery.", {
        tone: "high",
        ownerRole: "admin",
        source: "status",
      })
    );
  }

  if (!isCompleted(order)) {
    const missingAppraiser = !appraiserId;
    const missingReviewerForReview = status === "in_review" && !reviewerId;

    if (missingAppraiser || missingReviewerForReview) {
      signals.push(
        buildSignal(OPERATIONAL_QUEUE_IDS.UNASSIGNED_ORDERS, "Ownership assignment is incomplete.", {
          tone: "high",
          ownerRole: "admin",
          source: missingAppraiser ? "appraiser_id" : "reviewer_id",
        })
      );
    }
  }

  const queueIds = OPERATIONAL_QUEUE_DEFINITIONS
    .map((definition) => definition.id)
    .filter((queueId) => signals.some((signal) => signal.id === queueId));
  const primaryQueueId = selectPrimaryQueueId(signals);
  const primarySignal = signals.find((signal) => signal.id === primaryQueueId) || null;
  const nextOwner =
    primarySignal?.ownerRole === "reviewer"
      ? buildOwner("reviewer", reviewerId, getReviewerName(order))
      : primarySignal?.ownerRole === "appraiser"
      ? buildOwner("appraiser", appraiserId, getAppraiserName(order))
      : primarySignal?.ownerRole === "admin"
      ? buildOwner("admin", null, null)
      : null;

  return {
    queueIds,
    signals,
    nextOwner,
    primaryQueueId,
  };
}

export function orderHasOperationalQueue(order, queueId, options = {}) {
  if (!queueId) return false;
  return assessOrderOperationalQueues(order, options).queueIds.includes(queueId);
}
