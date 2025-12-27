// src/lib/constants/orderStatus.js
/**
 * Canonical order statuses + helpers used across services & UI.
 * Keep this as the *only* place that knows the vocabulary.
 */

// Canonical vocabulary (server-aligned: lowercase snake_case)
export const ORDER_STATUS = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  NEEDS_REVISIONS: "needs_revisions",
  COMPLETED: "completed",
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
  on_hold: ORDER_STATUS.IN_PROGRESS,
  hold_client: ORDER_STATUS.IN_PROGRESS,
  waiting_on_client: ORDER_STATUS.IN_PROGRESS,
  paused: ORDER_STATUS.IN_PROGRESS,

  // review / in review
  review: ORDER_STATUS.IN_REVIEW,
  Review: ORDER_STATUS.IN_REVIEW,
  "In Review": ORDER_STATUS.IN_REVIEW,
  in_review: ORDER_STATUS.IN_REVIEW,
  IN_REVIEW: ORDER_STATUS.IN_REVIEW,
  ready_to_send: ORDER_STATUS.IN_REVIEW,
  "ready to send": ORDER_STATUS.IN_REVIEW,

  // needs revisions
  revisions: ORDER_STATUS.NEEDS_REVISIONS,
  REVISIONS: ORDER_STATUS.NEEDS_REVISIONS,
  needs_revisions: ORDER_STATUS.NEEDS_REVISIONS,
  "needs revisions": ORDER_STATUS.NEEDS_REVISIONS,
  needs_revision: ORDER_STATUS.NEEDS_REVISIONS,
  revision: ORDER_STATUS.NEEDS_REVISIONS,

  // complete
  complete: ORDER_STATUS.COMPLETED,
  COMPLETE: ORDER_STATUS.COMPLETED,
  completed: ORDER_STATUS.COMPLETED,
  Completed: ORDER_STATUS.COMPLETED,
  cancelled: ORDER_STATUS.COMPLETED,
  canceled: ORDER_STATUS.COMPLETED,
  CANCELLED: ORDER_STATUS.COMPLETED,
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
  const key = normalizeStatus(normalized);
  const labels = {
    [ORDER_STATUS.NEW]: "New",
    [ORDER_STATUS.IN_PROGRESS]: "In Progress",
    [ORDER_STATUS.IN_REVIEW]: "In Review",
    [ORDER_STATUS.NEEDS_REVISIONS]: "Needs Revisions",
    [ORDER_STATUS.COMPLETED]: "Completed",
  };
  return labels[key] || key;
}

/**
 * High-level visual grouping used by badges & due/overdue logic.
 * Returns one of: "progress" | "review" | "ready" | "hold" | "complete"
 */
export function statusGroup(s) {
  const x = normalizeStatus(s);
  if ([ORDER_STATUS.IN_REVIEW, ORDER_STATUS.NEEDS_REVISIONS].includes(x)) {
    return "review";
  }
  if ([ORDER_STATUS.COMPLETED].includes(x)) {
    return "complete";
  }
  return "progress"; // new, in_progress, etc.
}

/** Is this considered "active" for dashboards/lists? */
export function isActiveStatus(s) {
  const x = normalizeStatus(s);
  return x !== ORDER_STATUS.COMPLETED;
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
  [ORDER_STATUS.NEEDS_REVISIONS]: "Needs Revisions",
  [ORDER_STATUS.COMPLETED]: "Completed",
};

export const isInReview = (s) => normalizeStatus(s) === ORDER_STATUS.IN_REVIEW;
export const isReadyToSend = (s) => normalizeStatus(s) === ORDER_STATUS.READY_TO_SEND;
export function labelForStatus(s) {
  const key = normalizeStatus(s);
  if (STATUS_LABEL[key]) return STATUS_LABEL[key];
  // fallback: "some_status" -> "Some status"
  return key ? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "";
}


