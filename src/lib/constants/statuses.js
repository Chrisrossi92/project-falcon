// src/lib/constants/statuses.js
/** Canonical, snake_case status values used across the app */
export const STATUSES = [
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

// Status type removed

/** Human label for UI */
export function humanizeStatus(s) {
  if (!s) return "—";
  return String(s).replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
