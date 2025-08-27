// src/lib/constants/orderStatus.js

// Canonical, snake_case statuses used across the app + DB
export const ORDER_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "site_visit_done",
  "in_review",
  "ready_to_send",
  "sent_to_client",
  "revisions",
  "complete",
];

// Subset used to represent the reviewer workflow
export const REVIEW_STATUSES = ["in_review", "ready_to_send", "revisions"];

/** Normalize any status-ish value to snake_case lowercase string */
export function normalizeStatus(value) {
  if (!value) return "";
  const s = String(value).trim();
  // already snake_case?
  if (s.includes("_")) return s.toLowerCase();
  // convert spaces / hyphens to underscores and lowercase
  return s.replace(/[\s-]+/g, "_").toLowerCase();
}

/** Pretty label for UI (e.g., "ready_to_send" → "Ready To Send") */
export function labelForStatus(value) {
  const s = normalizeStatus(value);
  return s
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/** Is the given status part of the reviewer queue? */
export function isReviewStatus(value) {
  const s = normalizeStatus(value);
  return REVIEW_STATUSES.includes(s);
}

/** Validate status against our canonical list */
export function isValidStatus(value) {
  const s = normalizeStatus(value);
  return ORDER_STATUSES.includes(s);
}
