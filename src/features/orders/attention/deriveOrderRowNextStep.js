import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 3;
const STALE_DAYS = 5;

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

function firstNumber(order, keys) {
  for (const key of keys) {
    const value = order?.[key];
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

export function deriveOrderRowNextStep(order, { now = new Date() } = {}) {
  if (!order) return null;

  const currentTime = parseDate(now) || new Date();
  const status = normalizeOrderStatus(order.status_normalized || order.status);
  const finalDue = firstDate(order, [
    "final_due_at",
    "final_due_date",
    "due_date",
    "due_at",
    "report_due_at",
  ]);
  const reviewDue = firstDate(order, ["review_due_at", "review_due_date"]);
  const siteVisit = firstDate(order, [
    "site_visit_at",
    "site_visit_date",
    "inspection_at",
    "inspection_date",
    "appointment_at",
    "scheduled_at",
  ]);
  const lastUpdate = firstDate(order, [
    "last_activity_at",
    "last_note_at",
    "updated_at",
    "created_at",
  ]);
  const loadedFileCount = firstNumber(order, [
    "active_document_count",
    "document_count",
    "file_count",
    "files_count",
  ]);

  if (finalDue) {
    const dueIn = daysUntil(finalDue, currentTime);
    if (dueIn < 0) {
      return {
        id: "row_final_due_overdue",
        tone: "critical",
        label: "Overdue",
        message: `Final due passed ${pluralizeDay(Math.abs(dueIn))} ago.`,
      };
    }
    if (dueIn <= DUE_SOON_DAYS) {
      return {
        id: "row_final_due_soon",
        tone: "attention",
        label: "Due soon",
        message: isSameCalendarDay(finalDue, currentTime)
          ? "Final due date is today."
          : `Final due in ${pluralizeDay(dueIn)}.`,
      };
    }
  }

  if (status === ORDER_STATUS.NEEDS_REVISIONS) {
    return {
      id: "row_revisions_open",
      tone: "attention",
      label: "Needs revisions",
      message: "Revision request is still open.",
    };
  }

  if (status === ORDER_STATUS.IN_REVIEW) {
    if (reviewDue) {
      const dueIn = daysUntil(reviewDue, currentTime);
      return {
        id: dueIn < 0 ? "row_review_overdue" : "row_review_pending",
        tone: dueIn < 0 ? "critical" : "attention",
        label: dueIn < 0 ? "Review overdue" : "Review pending",
        message:
          dueIn < 0
            ? `Review due passed ${pluralizeDay(Math.abs(dueIn))} ago.`
            : isSameCalendarDay(reviewDue, currentTime)
            ? "Review is due today."
            : `Review due in ${pluralizeDay(dueIn)}.`,
      };
    }

    return {
      id: "row_review_pending",
      tone: "attention",
      label: "Review pending",
      message: "Work is waiting in review.",
    };
  }

  if (!siteVisit && [ORDER_STATUS.NEW, ORDER_STATUS.IN_PROGRESS].includes(status)) {
    return {
      id: "row_site_visit_missing",
      tone: "neutral",
      label: "Site visit",
      message: "No appointment date loaded.",
    };
  }

  if (loadedFileCount === 0) {
    return {
      id: "row_files_missing",
      tone: "neutral",
      label: "Files",
      message: "No supporting files loaded.",
    };
  }

  if (lastUpdate) {
    const inactiveDays = daysSince(lastUpdate, currentTime);
    if (inactiveDays >= STALE_DAYS) {
      return {
        id: "row_stale_update",
        tone: "attention",
        label: "No recent update",
        message: `No loaded update in ${pluralizeDay(inactiveDays)}.`,
      };
    }
  }

  return null;
}
