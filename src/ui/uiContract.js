// src/ui/uiContract.js
// Single source of truth for Falcon UI tokens and vocabulary.
// All new UI work should consume these tokens to avoid design drift.

/* Layout */
export const CONTAINER_MAX_W = "1280px";
export const PAGE_PADDING = { desktop: 24, mobile: 16 };
export const SECTION_GAP = { desktop: 24, mobile: 16 };
export const CARD_PADDING = { desktop: 16, mobile: 12 };
export const RADIUS = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
};

/* Typography (never go below 13px for important text) */
export const TYPE = {
  TITLE: { size: 22, weight: 600, lh: 1.3 },
  SECTION_LABEL: { size: 16, weight: 600, lh: 1.3, uppercase: true, tracking: 0.08 },
  BODY: { size: 15, weight: 400, lh: 1.5 },
  TABLE: { size: 14, weight: 400, lh: 1.4 },
  MUTED: { size: 13, weight: 400, lh: 1.4 },
};

/* Status vocabulary */
export const STATUS = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  NEEDS_REVISIONS: "needs_revisions",
  READY_FOR_CLIENT: "ready_for_client",
  COMPLETED: "completed",
};

export const STATUS_LABEL = {
  [STATUS.NEW]: "New",
  [STATUS.IN_PROGRESS]: "In Progress",
  [STATUS.IN_REVIEW]: "In Review",
  [STATUS.NEEDS_REVISIONS]: "Needs Revisions",
  [STATUS.READY_FOR_CLIENT]: "Ready for Client",
  [STATUS.COMPLETED]: "Completed",
};

export function STATUS_GROUP(status) {
  const s = String(status || "").toLowerCase();
  if (s === STATUS.COMPLETED) return "complete";
  if (s === STATUS.READY_FOR_CLIENT) return "ready";
  if (s === STATUS.IN_REVIEW || s === STATUS.NEEDS_REVISIONS) return "review";
  if (s === STATUS.NEW || s === STATUS.IN_PROGRESS) return "progress";
  return "other";
}

/* Status badge classes (Tailwind-style strings) */
export const STATUS_BADGE_CLASS = {
  [STATUS.NEW]: "bg-blue-50 text-blue-700 border border-blue-100",
  [STATUS.IN_PROGRESS]: "bg-sky-50 text-sky-700 border border-sky-100",
  [STATUS.IN_REVIEW]: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  [STATUS.NEEDS_REVISIONS]: "bg-rose-50 text-rose-700 border border-rose-100",
  [STATUS.READY_FOR_CLIENT]: "bg-amber-50 text-amber-700 border border-amber-100",
  [STATUS.COMPLETED]: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  fallback: "bg-slate-100 text-slate-700 border border-slate-200",
};

/* Motion */
export const TRANSITION_FAST_MS = 150;
export const TRANSITION_DEFAULT_MS = 200;
export const EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)"; // iOS-like ease
export const TW_TRANSITION = `transition duration-${TRANSITION_DEFAULT_MS} ease-[${EASING}]`;

/* Toast templates (optional helpers) */
export const TOAST = {
  SENT_TO_REVIEW: { title: "Sent to review", tone: "success" },
  SENT_BACK: { title: "Sent back to appraiser", tone: "success" },
  READY_FOR_CLIENT: { title: "Marked ready for client", tone: "success" },
  COMPLETED: { title: "Order completed", tone: "success" },
};

// TODO: migrate StatusPill, OrderStatusBadge, Dashboard status chips, and any table badge renderers to use STATUS_BADGE_CLASS and STATUS_LABEL from this contract.
