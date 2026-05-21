const ASSIGNED_ACTIVE_STATUSES = new Set(["accepted", "in_progress"]);
const OWNER_ACTIVE_STATUSES = new Set(["offered", "accepted", "in_progress", "submitted"]);
const TERMINAL_STATUSES = new Set(["completed", "declined", "cancelled", "revoked"]);
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventDateValue(row) {
  return dateValue(
    row?.updated_at ||
      row?.submitted_at ||
      row?.started_at ||
      row?.accepted_at ||
      row?.offered_at ||
      row?.created_at
  );
}

function withinDays(value, days) {
  const date = dateValue(value);
  if (!date) return false;
  const now = Date.now();
  const limit = now + days * MILLIS_PER_DAY;
  const time = date.getTime();
  return time >= now && time <= limit;
}

function withinPastDays(value, days) {
  const date = dateValue(value);
  if (!date) return false;
  const now = Date.now();
  const limit = now - days * MILLIS_PER_DAY;
  const time = date.getTime();
  return time <= now && time >= limit;
}

function isPast(value) {
  const date = dateValue(value);
  return Boolean(date && date.getTime() < Date.now());
}

export function assignmentIdOf(row) {
  return row?.assignment_id || row?.id || null;
}

export function assignmentStatusOf(row) {
  return normalizeStatus(row?.assignment_status || row?.status);
}

export function assignmentDueAt(row) {
  return row?.due_at || row?.final_due_at || null;
}

export function assignmentCompanyName(row, side = "assigned") {
  if (side === "owner") return row?.assigned_company_name || "Assigned company";
  return row?.owner_company_name || "Owner company";
}

export function assignmentInstructionPreview(row, maxLength = 140) {
  const value = String(row?.instructions || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

export function isAssignmentOverdue(row) {
  const status = assignmentStatusOf(row);
  return !TERMINAL_STATUSES.has(status) && isPast(assignmentDueAt(row));
}

export function isAssignmentDueSoon(row, days = 7) {
  const status = assignmentStatusOf(row);
  return !TERMINAL_STATUSES.has(status) && withinDays(assignmentDueAt(row), days);
}

export function isAssignmentOfferExpiring(row, days = 2) {
  return assignmentStatusOf(row) === "offered" && withinDays(row?.expires_at, days);
}

export function isAssignmentCompletedRecently(row, days = 7) {
  return assignmentStatusOf(row) === "completed" && withinPastDays(row?.completed_at, days);
}

export function summarizeAssignedDashboard(rows = [], options = {}) {
  const dueSoonDays = options.dueSoonDays || 7;
  const items = Array.isArray(rows) ? rows : [];
  return {
    offered: items.filter((row) => assignmentStatusOf(row) === "offered").length,
    activeWork: items.filter((row) => ASSIGNED_ACTIVE_STATUSES.has(assignmentStatusOf(row))).length,
    dueSoon: items.filter((row) => isAssignmentDueSoon(row, dueSoonDays)).length,
    overdue: items.filter((row) => isAssignmentOverdue(row)).length,
    submitted: items.filter((row) => assignmentStatusOf(row) === "submitted").length,
  };
}

export function summarizeOwnerDashboard(rows = [], options = {}) {
  const dueSoonDays = options.dueSoonDays || 7;
  const expiringDays = options.expiringDays || 2;
  const recentDays = options.recentDays || 7;
  const items = Array.isArray(rows) ? rows : [];
  return {
    sentActive: items.filter((row) => OWNER_ACTIVE_STATUSES.has(assignmentStatusOf(row))).length,
    submittedAwaitingOwnerReview: items.filter((row) => assignmentStatusOf(row) === "submitted").length,
    overdue: items.filter((row) => isAssignmentOverdue(row)).length,
    expiringOffers: items.filter((row) => isAssignmentOfferExpiring(row, expiringDays)).length,
    completedRecently: items.filter((row) => isAssignmentCompletedRecently(row, recentDays)).length,
    dueSoon: items.filter((row) => isAssignmentDueSoon(row, dueSoonDays)).length,
  };
}

export function attentionRank(row, side = "assigned") {
  const status = assignmentStatusOf(row);
  if (isAssignmentOverdue(row)) return 0;
  if (side === "owner" && status === "submitted") return 1;
  if (side === "assigned" && status === "offered") return 1;
  if (side === "owner" && isAssignmentOfferExpiring(row)) return 2;
  if (isAssignmentDueSoon(row, 7)) return 2;
  if (isAssignmentCompletedRecently(row)) return 4;
  return 3;
}

export function sortAssignmentDashboardRows(rows = [], side = "assigned") {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const rankDiff = attentionRank(a, side) - attentionRank(b, side);
    if (rankDiff !== 0) return rankDiff;

    const aDue = dateValue(assignmentDueAt(a))?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = dateValue(assignmentDueAt(b))?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;

    const aUpdated = eventDateValue(a)?.getTime() ?? 0;
    const bUpdated = eventDateValue(b)?.getTime() ?? 0;
    return bUpdated - aUpdated;
  });
}

export function assignedDashboardRows(rows = [], limit = 8) {
  return sortAssignmentDashboardRows(rows, "assigned")
    .filter((row) => ["offered", "accepted", "in_progress", "submitted", "completed"].includes(assignmentStatusOf(row)))
    .slice(0, limit);
}

export function ownerDashboardRows(rows = [], limit = 8) {
  return sortAssignmentDashboardRows(rows, "owner")
    .filter((row) => OWNER_ACTIVE_STATUSES.has(assignmentStatusOf(row)) || isAssignmentCompletedRecently(row))
    .slice(0, limit);
}
