export const ASSIGNMENT_STATUSES = [
  "offered",
  "accepted",
  "in_progress",
  "submitted",
  "revision_requested",
  "completed",
  "declined",
  "cancelled",
  "revoked",
];

export function humanize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString();
}

export function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString();
}

export function isPastDate(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

export function statusClass(status) {
  const key = String(status || "").toLowerCase();
  if (key === "offered") return "border-blue-200 bg-blue-50 text-blue-700";
  if (key === "accepted") return "border-amber-200 bg-amber-50 text-amber-700";
  if (key === "in_progress") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (key === "submitted") return "border-purple-200 bg-purple-50 text-purple-700";
  if (key === "revision_requested") return "border-amber-200 bg-amber-50 text-amber-800";
  if (key === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["declined", "cancelled", "revoked"].includes(key)) return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-white text-slate-600";
}

export function isTerminalStatus(status) {
  return ["completed", "declined", "cancelled", "revoked"].includes(String(status || "").toLowerCase());
}

export function isActionableOwnerStatus(status) {
  return ["offered", "accepted", "in_progress", "submitted", "revision_requested"].includes(String(status || "").toLowerCase());
}

export function isActionableAssignedStatus(status) {
  return ["offered", "accepted", "in_progress"].includes(String(status || "").toLowerCase());
}

export function assignmentTitle(packet) {
  const orderNumber = packet?.order_number ? `#${packet.order_number}` : "Assignment";
  return `${orderNumber} · ${humanize(packet?.assignment_type)}`;
}

export function locationLabel(packet) {
  return [packet?.city, packet?.state].filter(Boolean).join(", ") || "Location not provided";
}

const PAYLOAD_FIELD_ALLOWLISTS = Object.freeze({
  terms: new Set([
    "scope",
    "scope_of_work",
    "deliverable",
    "deliverables",
    "turn_time",
    "turnaround",
    "due_at",
    "review_due_at",
    "expires_at",
    "requirements",
    "revision_policy",
    "contact_method",
  ]),
  handoff: new Set([
    "property_summary",
    "scope_notes",
    "special_instructions",
    "documents_available_note",
    "client_facing_contact_note",
    "scope",
    "scope_of_work",
    "deliverable",
    "deliverables",
    "property_type",
    "report_type",
    "city",
    "state",
    "site_visit_at",
    "due_at",
    "review_due_at",
    "requirements",
    "attachments",
    "reference",
  ]),
  submission: new Set([
    "note",
    "status",
    "submitted_at",
    "submitted_from",
    "deliverable",
    "deliverables",
    "attachments",
    "summary",
    "revision",
    "resubmission",
    "document_keys",
  ]),
  compliance: new Set([
    "status",
    "requirements",
    "reviewed_at",
    "expires_at",
    "insurance_status",
    "license_status",
    "eligible",
  ]),
});

function normalizePayloadSection(section) {
  const key = String(section || "").toLowerCase();
  if (key.includes("term")) return "terms";
  if (key.includes("handoff")) return "handoff";
  if (key.includes("submission")) return "submission";
  if (key.includes("compliance")) return "compliance";
  return "";
}

function formatPayloadValue(value) {
  if (Array.isArray(value)) return value.map((entry) => formatPayloadValue(entry)).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function visibleJsonLines(value, section = "") {
  if (!value || typeof value !== "object") return [];
  const allowlist = PAYLOAD_FIELD_ALLOWLISTS[normalizePayloadSection(section)];
  if (!allowlist) return [];
  return Object.entries(value)
    .filter(([key, entry]) => allowlist.has(String(key || "").toLowerCase()) && entry !== null && entry !== undefined && entry !== "")
    .map(([key, entry]) => [humanize(key), formatPayloadValue(entry)])
    .filter(([, entry]) => entry && entry !== "{}" && entry !== "[]");
}

export function timelineFromAssignment(packet) {
  const status = String(packet?.assignment_status || packet?.status || "").toLowerCase();
  return [
    ["Offered", packet?.offered_at],
    ["Accepted", packet?.accepted_at],
    ["Started", packet?.started_at],
    ["Submitted", packet?.submitted_at],
    ["Revision Requested", packet?.revision_requested_at || packet?.submission_payload?.revision?.requested_at],
    ["Completed", packet?.completed_at],
    ["Declined", packet?.declined_at],
    ["Cancelled", packet?.cancelled_at],
    ["Revoked", packet?.revoked_at],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({
      label,
      value,
      current: label.toLowerCase().replace(" ", "_") === status,
      terminal: ["Completed", "Declined", "Cancelled", "Revoked"].includes(label),
    }));
}
