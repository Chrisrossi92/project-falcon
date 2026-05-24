import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 3;
const STALE_UPDATE_DAYS = 5;

const TERMINAL_ORDER_STATUSES = new Set([
  ORDER_STATUS.COMPLETED,
  "cancelled",
  "canceled",
  "voided",
  "archived",
]);

const TERMINAL_ASSIGNMENT_STATUSES = new Set(["completed", "declined", "cancelled", "canceled", "revoked"]);

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

function firstDate(source, keys) {
  for (const key of keys) {
    const date = parseDate(source?.[key]);
    if (date) return date;
  }
  return null;
}

function firstNumber(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function pluralizeDay(count) {
  return `${count} day${count === 1 ? "" : "s"}`;
}

function isActiveDocument(document) {
  const status = String(document?.status || "").toLowerCase();
  return status !== "archived" && status !== "deleted";
}

function loadedDocumentCount(order, documents, documentCount) {
  if (Array.isArray(documents)) return documents.filter(isActiveDocument).length;

  if (documentCount != null && Number.isFinite(Number(documentCount))) {
    return Number(documentCount);
  }

  return firstNumber(order, [
    "active_document_count",
    "document_count",
    "file_count",
    "files_count",
  ]);
}

function loadedAssignmentRows({ order, assignment, assignments }) {
  if (Array.isArray(assignments)) return assignments.filter(Boolean);
  if (assignment) return [assignment];

  const status =
    order?.assignment_status ||
    order?.order_company_assignment_status ||
    order?.active_assignment_status ||
    order?.vendor_assignment_status;

  if (!status) return [];

  return [{
    status,
    assignment_status: status,
    due_at: order?.assignment_due_at || order?.due_at || order?.final_due_at,
    expires_at: order?.assignment_expires_at || order?.expires_at,
    review_due_at: order?.assignment_review_due_at || order?.review_due_at,
  }];
}

function assignmentStatus(row) {
  return String(row?.assignment_status || row?.status || "").toLowerCase().trim();
}

function addSignal(signals, signal) {
  signals.push({
    severity: "info",
    source: "derived",
    ...signal,
  });
}

export function deriveOperationalStatusSignals({
  order = null,
  activities = null,
  documents = null,
  documentCount = null,
  assignment = null,
  assignments = null,
  now = new Date(),
} = {}) {
  if (!order && !assignment && !Array.isArray(assignments)) return [];

  const currentTime = parseDate(now) || new Date();
  const status = normalizeOrderStatus(order?.status_normalized || order?.status);
  const activeOrder = !TERMINAL_ORDER_STATUSES.has(String(status || order?.status || "").toLowerCase());
  const signals = [];

  const appointmentDate = firstDate(order, [
    "site_visit_at",
    "site_visit_date",
    "inspection_at",
    "inspection_date",
    "appointment_at",
    "scheduled_at",
  ]);
  const finalDueDate = firstDate(order, [
    "final_due_at",
    "final_due_date",
    "due_date",
    "due_at",
    "report_due_at",
  ]);
  const reviewDueDate = firstDate(order, ["review_due_at", "review_due_date"]);
  const lastUpdateDate =
    firstDate(order, ["last_activity_at", "last_note_at", "updated_at", "created_at"]) ||
    latestActivityDate(activities);
  const fileCount = loadedDocumentCount(order, documents, documentCount);

  if (activeOrder && status && appointmentDate) {
    addSignal(signals, {
      id: "appointment_scheduled",
      severity: "ready",
      label: "Appointment scheduled",
      message: "Appointment or site visit date is loaded.",
      sourceHints: ["appointment_date"],
    });
  } else if (activeOrder && [ORDER_STATUS.NEW, ORDER_STATUS.IN_PROGRESS].includes(status) && !appointmentDate) {
    addSignal(signals, {
      id: "appointment_not_scheduled",
      severity: "attention",
      label: "Appointment not scheduled",
      message: "No appointment or site visit date is loaded.",
      sourceHints: ["missing_appointment_date"],
    });
  }

  let overdue = false;
  let stale = false;

  if (activeOrder && finalDueDate) {
    const dueIn = daysUntil(finalDueDate, currentTime);
    if (dueIn < 0) {
      overdue = true;
      addSignal(signals, {
        id: "overdue",
        severity: "critical",
        label: "Overdue",
        message: `Final due date passed ${pluralizeDay(Math.abs(dueIn))} ago.`,
        sourceHints: ["final_due_date"],
      });
    } else if (dueIn <= DUE_SOON_DAYS) {
      addSignal(signals, {
        id: "due_soon",
        severity: "attention",
        label: "Due soon",
        message: dueIn === 0 ? "Final due date is today." : `Final due date is in ${pluralizeDay(dueIn)}.`,
        sourceHints: ["final_due_date"],
      });
    }
  }

  if (activeOrder && lastUpdateDate) {
    const age = daysSince(lastUpdateDate, currentTime);
    if (age >= STALE_UPDATE_DAYS) {
      stale = true;
      addSignal(signals, {
        id: "stale_update",
        severity: "attention",
        label: "No recent update",
        message: `No loaded update in ${pluralizeDay(age)}.`,
        sourceHints: ["last_loaded_update"],
      });
    }
  }

  if (overdue && stale) {
    addSignal(signals, {
      id: "overdue_no_recent_update",
      severity: "critical",
      label: "Overdue with no recent update",
      message: "Overdue with no recent update.",
      sourceHints: ["final_due_date", "last_loaded_update"],
    });
  }

  if (status === ORDER_STATUS.IN_REVIEW) {
    const reviewDueIn = reviewDueDate ? daysUntil(reviewDueDate, currentTime) : null;
    addSignal(signals, {
      id: "review_pending",
      severity: reviewDueIn != null && reviewDueIn < 0 ? "critical" : "attention",
      label: reviewDueIn != null && reviewDueIn < 0 ? "Review overdue" : "Review pending",
      message: reviewDueIn != null && reviewDueIn < 0
        ? `Review due date passed ${pluralizeDay(Math.abs(reviewDueIn))} ago.`
        : "Review appears pending.",
      sourceHints: reviewDueDate ? ["status", "review_due_date"] : ["status"],
    });
  }

  if (status === ORDER_STATUS.NEEDS_REVISIONS) {
    addSignal(signals, {
      id: "revisions_open",
      severity: "attention",
      label: "Revisions open",
      message: "Revision follow-up may still be needed.",
      sourceHints: ["status"],
    });
  }

  if (fileCount != null && fileCount <= 2) {
    addSignal(signals, {
      id: "limited_files",
      severity: "attention",
      label: "Limited files",
      message: "Supporting files are still limited.",
      sourceHints: ["document_count"],
    });
  }

  if (status === ORDER_STATUS.IN_REVIEW && fileCount != null && fileCount > 0) {
    addSignal(signals, {
      id: "files_ready_for_review",
      severity: "ready",
      label: "Files ready for review",
      message: "Supporting files are available for review.",
      sourceHints: ["status", "document_count"],
    });
  }

  for (const row of loadedAssignmentRows({ order, assignment, assignments })) {
    const rowStatus = assignmentStatus(row);
    if (!rowStatus || TERMINAL_ASSIGNMENT_STATUSES.has(rowStatus)) continue;

    if (rowStatus === "offered") {
      addSignal(signals, {
        id: "assignment_offer_waiting",
        severity: "attention",
        label: "Assignment response pending",
        message: "Assignment response is still pending.",
        sourceHints: ["assignment_status"],
      });
    }

    if (rowStatus === "submitted") {
      addSignal(signals, {
        id: "assignment_review_pending",
        severity: "attention",
        label: "Assignment review pending",
        message: "Submitted assignment is awaiting owner review.",
        sourceHints: ["assignment_status"],
      });
    }
  }

  return dedupeSignals(signals);
}

function latestActivityDate(activities) {
  if (!Array.isArray(activities)) return null;
  return activities
    .map((activity) => firstDate(activity, ["created_at", "updated_at", "occurred_at"]))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function dedupeSignals(signals) {
  const seen = new Set();
  return signals.filter((signal) => {
    if (seen.has(signal.id)) return false;
    seen.add(signal.id);
    return true;
  });
}
