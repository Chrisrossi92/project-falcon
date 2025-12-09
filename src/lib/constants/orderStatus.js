// src/lib/constants/orderStatus.js
/**
 * Canonical order statuses + helpers used across services & UI.
 * Keep this as the *only* place that knows the vocabulary.
 */

// Vocabulary (server-aligned: lowercase snake_case)
export const ORDER_STATUS = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  REVISIONS: "revisions",
  READY_TO_SEND: "ready_to_send",
  COMPLETE: "complete",
  ON_HOLD: "on_hold",
  HOLD_CLIENT: "hold_client",
  WAITING_ON_CLIENT: "waiting_on_client",
  PAUSED: "paused",
  CANCELLED: "cancelled",
};

const STATUS_MAP = {
  // new
  new: ORDER_STATUS.NEW,
  New: ORDER_STATUS.NEW,
  NEW: ORDER_STATUS.NEW,

  // in progress
  in_progress: ORDER_STATUS.IN_PROGRESS,
  "in progress": ORDER_STATUS.IN_PROGRESS,
  IN_PROGRESS: ORDER_STATUS.IN_PROGRESS,

  // review / in review
  review: ORDER_STATUS.IN_REVIEW,
  Review: ORDER_STATUS.IN_REVIEW,
  "In Review": ORDER_STATUS.IN_REVIEW,
  in_review: ORDER_STATUS.IN_REVIEW,
  IN_REVIEW: ORDER_STATUS.IN_REVIEW,

  // complete
  complete: ORDER_STATUS.COMPLETE,
  COMPLETE: ORDER_STATUS.COMPLETE,
  completed: ORDER_STATUS.COMPLETE,
  Completed: ORDER_STATUS.COMPLETE,

  // cancelled
  cancelled: ORDER_STATUS.CANCELLED,
  canceled: ORDER_STATUS.CANCELLED,
  CANCELLED: ORDER_STATUS.CANCELLED,
};

// Normalize to lowercase snake_case (defensive)
export function normalizeStatus(s) {
  return String(s ?? "").toLowerCase().trim();
}

export function normalizeOrderStatus(raw) {
  if (!raw) return null;
  const key = String(raw).trim();
  const lower = key.toLowerCase();
  return STATUS_MAP[key] || STATUS_MAP[lower] || normalizeStatus(raw) || null;
}

export function formatOrderStatusLabel(normalized) {
  if (!normalized) return "";
  switch (normalized) {
    case ORDER_STATUS.NEW:
      return "New";
    case ORDER_STATUS.IN_PROGRESS:
      return "In Progress";
    case ORDER_STATUS.IN_REVIEW:
      return "In Review";
    case ORDER_STATUS.COMPLETE:
      return "Complete";
    case ORDER_STATUS.CANCELLED:
      return "Cancelled";
    default:
      return normalized;
  }
}

/**
 * High-level visual grouping used by badges & due/overdue logic.
 * Returns one of: "progress" | "review" | "ready" | "hold" | "complete"
 */
export function statusGroup(s) {
  const x = normalizeStatus(s);
  if ([ORDER_STATUS.ON_HOLD, ORDER_STATUS.HOLD_CLIENT, ORDER_STATUS.WAITING_ON_CLIENT, ORDER_STATUS.PAUSED].includes(x)) {
    return "hold";
  }
  if ([ORDER_STATUS.IN_REVIEW, ORDER_STATUS.REVISIONS].includes(x)) {
    return "review";
  }
  if ([ORDER_STATUS.READY_TO_SEND].includes(x)) {
    return "ready";
  }
  if ([ORDER_STATUS.COMPLETE, ORDER_STATUS.CANCELLED].includes(x)) {
    return "complete";
  }
  return "progress"; // new, in_progress, etc.
}

/** Is this considered "active" for dashboards/lists? */
export function isActiveStatus(s) {
  const x = normalizeStatus(s);
  return x !== ORDER_STATUS.COMPLETE && x !== ORDER_STATUS.CANCELLED;
}

/** Badge palette (Tailwind classes) by group */
export const BADGE_GROUPS = {
  progress: { label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  hold:     { label: "On Hold",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  review:   { label: "In Review",   cls: "bg-purple-50 text-purple-700 border-purple-200" },
  ready:    { label: "Ready",       cls: "bg-green-50 text-green-700 border-green-200" },
  complete: { label: "Complete",    cls: "bg-gray-50 text-gray-700 border-gray-200" },
};

/** Optional: friendly display strings if you need them elsewhere */
export const STATUS_LABEL = {
  [ORDER_STATUS.NEW]: "New",
  [ORDER_STATUS.IN_PROGRESS]: "In Progress",
  [ORDER_STATUS.IN_REVIEW]: "In Review",
  [ORDER_STATUS.REVISIONS]: "Revisions",
  [ORDER_STATUS.READY_TO_SEND]: "Ready to Send",
  [ORDER_STATUS.COMPLETE]: "Complete",
  [ORDER_STATUS.ON_HOLD]: "On Hold",
  [ORDER_STATUS.HOLD_CLIENT]: "On Hold (Client)",
  [ORDER_STATUS.WAITING_ON_CLIENT]: "Waiting on Client",
  [ORDER_STATUS.PAUSED]: "Paused",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
};

export const isInReview = (s) => normalizeStatus(s) === ORDER_STATUS.IN_REVIEW;
export const isReadyToSend = (s) => normalizeStatus(s) === ORDER_STATUS.READY_TO_SEND;
export function labelForStatus(s) {
  const key = normalizeStatus(s);
  if (STATUS_LABEL[key]) return STATUS_LABEL[key];
  // fallback: "some_status" -> "Some status"
  return key ? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "";
}



