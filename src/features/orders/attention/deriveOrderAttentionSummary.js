import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 3;
const STALE_DAYS = 5;

const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  "accepted",
  "active",
  "assigned",
  "in_progress",
  "offered",
  "submitted",
]);

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(date, now) {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

function daysSince(date, now) {
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pluralizeDay(count) {
  return `${count} day${count === 1 ? "" : "s"}`;
}

function firstDate(order, keys) {
  for (const key of keys) {
    const date = parseDate(order?.[key]);
    if (date) return date;
  }
  return null;
}

function activeAssignmentStatus(order) {
  const status = String(
    order?.assignment_status ||
      order?.order_company_assignment_status ||
      order?.active_assignment_status ||
      order?.vendor_assignment_status ||
      "",
  ).toLowerCase().trim();

  return ACTIVE_ASSIGNMENT_STATUSES.has(status) ? status : "";
}

function addSignal(signals, signal) {
  signals.push({
    tone: "neutral",
    ...signal,
  });
}

export function deriveOrderAttentionSummary({
  order,
  documents = null,
  documentCount = null,
  now = new Date(),
} = {}) {
  if (!order) return [];

  const currentTime = parseDate(now) || new Date();
  const status = normalizeOrderStatus(order.status_normalized || order.status);
  const signals = [];
  const dueDate = firstDate(order, [
    "final_due_at",
    "final_due_date",
    "due_date",
    "due_at",
    "report_due_at",
  ]);
  const reviewDueDate = firstDate(order, ["review_due_at", "review_due_date"]);
  const appointmentDate = firstDate(order, [
    "site_visit_at",
    "site_visit_date",
    "inspection_at",
    "inspection_date",
    "appointment_at",
    "scheduled_at",
  ]);
  const lastActivityDate = firstDate(order, [
    "last_activity_at",
    "last_note_at",
    "updated_at",
    "created_at",
  ]);
  const activeStatus = ![
    ORDER_STATUS.COMPLETED,
    "cancelled",
    "canceled",
    "voided",
    "archived",
  ].includes(String(status || order.status || "").toLowerCase());

  if (dueDate && activeStatus) {
    const dueIn = daysUntil(dueDate, currentTime);
    if (dueIn < 0) {
      addSignal(signals, {
        id: "final_due_overdue",
        tone: "critical",
        label: "Overdue",
        message: `Final due date passed ${pluralizeDay(Math.abs(dueIn))} ago.`,
      });
    } else if (dueIn <= DUE_SOON_DAYS) {
      addSignal(signals, {
        id: "final_due_soon",
        tone: "attention",
        label: "Due soon",
        message: isSameCalendarDay(dueDate, currentTime)
          ? "Final due date is today."
          : `Final due date is in ${pluralizeDay(dueIn)}.`,
      });
    }
  }

  if (reviewDueDate && status === ORDER_STATUS.IN_REVIEW) {
    const dueIn = daysUntil(reviewDueDate, currentTime);
    addSignal(signals, {
      id: dueIn < 0 ? "review_due_overdue" : "review_pending",
      tone: dueIn < 0 ? "critical" : "attention",
      label: dueIn < 0 ? "Review overdue" : "Review pending",
      message:
        dueIn < 0
          ? `Review due date passed ${pluralizeDay(Math.abs(dueIn))} ago.`
          : isSameCalendarDay(reviewDueDate, currentTime)
          ? "Review is due today."
          : `Review is due in ${pluralizeDay(dueIn)}.`,
    });
  } else if (status === ORDER_STATUS.IN_REVIEW) {
    addSignal(signals, {
      id: "review_pending",
      tone: "attention",
      label: "Review pending",
      message: "Order is waiting in review.",
    });
  }

  if (status === ORDER_STATUS.NEEDS_REVISIONS) {
    addSignal(signals, {
      id: "revisions_open",
      tone: "attention",
      label: "Revisions open",
      message: "Reviewer requested revisions are still open.",
    });
  }

  if (activeStatus && !appointmentDate) {
    addSignal(signals, {
      id: "site_visit_missing",
      tone: "neutral",
      label: "Site visit not set",
      message: "No site visit or appointment date is loaded for this order.",
    });
  }

  const resolvedDocumentCount = Array.isArray(documents)
    ? documents.filter((document) => document?.status !== "archived").length
    : documentCount != null && Number.isFinite(Number(documentCount))
    ? Number(documentCount)
    : null;

  if (resolvedDocumentCount === 0) {
    addSignal(signals, {
      id: "files_missing",
      tone: "neutral",
      label: "No files loaded",
      message: "No supporting files are loaded for this order yet.",
    });
  } else if (resolvedDocumentCount > 0) {
    addSignal(signals, {
      id: "files_present",
      tone: "positive",
      label: "Files present",
      message: `${resolvedDocumentCount} supporting file${resolvedDocumentCount === 1 ? "" : "s"} loaded.`,
    });
  }

  const assignmentStatus = activeAssignmentStatus(order);
  if (assignmentStatus) {
    addSignal(signals, {
      id: "assignment_active",
      tone: "neutral",
      label: "Assignment active",
      message: "Assignment work is still active for this order.",
    });
  }

  if (lastActivityDate && activeStatus) {
    const inactiveDays = daysSince(lastActivityDate, currentTime);
    if (inactiveDays >= STALE_DAYS) {
      addSignal(signals, {
        id: "stale_activity",
        tone: "attention",
        label: "No recent update",
        message: `No loaded activity update in ${pluralizeDay(inactiveDays)}.`,
      });
    } else if (!signals.some((signal) => signal.tone === "critical" || signal.id === "stale_activity")) {
      addSignal(signals, {
        id: "recent_activity",
        tone: "positive",
        label: "Recently updated",
        message: "Recent loaded activity suggests work is moving.",
      });
    }
  }

  if (!signals.length) {
    addSignal(signals, {
      id: "no_loaded_attention",
      tone: "positive",
      label: "No immediate signal",
      message: "Loaded order context does not show immediate attention needs.",
    });
  }

  return signals.slice(0, 5);
}
