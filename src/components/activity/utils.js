// utils.js
import {
  Archive,
  CalendarCheck,
  DollarSign,
  FileArchive,
  FileText,
  MessageSquareText,
  ShieldAlert,
  Shuffle,
  UserPlus,
} from "lucide-react";
import { formatOrderStatusLabel, normalizeOrderStatus } from "@/lib/constants/orderStatus";
import { formatOperationalDate } from "@/lib/utils/dateOnly";

/** Build a "First L." style display name from name or email */
export function displayNameFrom(createdByName, createdByEmail, createdById) {
  // If we get a proper name: "Chris Rossi" -> "Chris R."
  const name = (createdByName || "").trim();
  if (name) {
    const parts = name.split(/\s+/);
    const first = parts[0];
    const last = parts[parts.length - 1];
    const initial = last ? `${last.charAt(0).toUpperCase()}.` : "";
    return [first, initial].filter(Boolean).join(" ");
  }

  // Else derive from email local: "chris.rossi" -> "Chris R."
  const emailLocal = String(createdByEmail || "").split("@")[0] || "";
  if (emailLocal) {
    const bits = emailLocal.split(/[._-]+/).filter(Boolean);
    const first = bits[0] ? bits[0].charAt(0).toUpperCase() + bits[0].slice(1) : "";
    const lastInitial = bits[1] ? `${bits[1].charAt(0).toUpperCase()}.` : "";
    return [first, lastInitial].filter(Boolean).join(" ") || emailLocal;
  }

  // Fallback to an ID-ish display
  return createdById || "User";
}

function firstText(...values) {
  return values
    .map((value) => String(value || "").trim())
    .find(Boolean) || null;
}

function isGenericUserLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === "user" || normalized === "demo user" || normalized === "system";
}

function shortenDisplayName(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.includes("@")) return displayNameFrom(null, raw, null);

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return raw;

  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = last ? `${last.charAt(0).toUpperCase()}.` : "";
  return [first, initial].filter(Boolean).join(" ");
}

function initialsFor(value) {
  const raw = String(value || "").trim();
  if (!raw) return "U";
  const source = raw.includes("@") ? raw.split("@")[0] : raw;
  const parts = source.split(/[._\-\s]+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function resolveActivityActor(item = {}) {
  const detail = item?.detail && typeof item.detail === "object" ? item.detail : {};
  const actor = detail?.actor && typeof detail.actor === "object" ? detail.actor : {};

  const realName = firstText(
    item.created_by_name,
    item.actor_name,
    actor.name,
    actor.full_name,
    detail.actor_name,
    detail.created_by_name
  );
  const email = firstText(
    item.created_by_email,
    item.actor_email,
    actor.email,
    detail.actor_email,
    detail.created_by_email
  );
  const id = firstText(
    item.actor_user_id,
    detail.actor_user_id,
    actor.user_id,
    item.actor_id,
    detail.actor_id,
    item.created_by
  );
  const fallback = !isGenericUserLabel(realName)
    ? realName
    : email
    ? displayNameFrom(null, email, null)
    : id || "User";
  const fullName = fallback || "User";
  const shortName = shortenDisplayName(fullName) || fullName;

  return {
    fullName,
    shortName,
    initials: initialsFor(fullName),
    email,
    id,
    isGeneric: fullName === "User",
  };
}

export function getActivityActorColorSeed(actor = {}) {
  return actor.id || actor.email || actor.fullName || actor.shortName || "";
}

export function colorForActivityActor(actor = {}) {
  const seed = getActivityActorColorSeed(actor);
  const color = colorForUser(seed);

  return {
    backgroundColor: hsl({ h: color.h, s: color.s, l: color.l }),
    borderColor: hsl({ h: color.h, s: color.s, l: color.borderL }),
    color: color.text,
  };
}

export const HUMAN_COMMUNICATION_TYPES = new Set(["note", "note_added"]);

export const WORKFLOW_EVENT_TYPES = new Set([
  "status_changed",
  "sent_to_review",
  "sent_back_to_appraiser",
  "ready_for_client",
  "completed",
]);

export const LIFECYCLE_EVENT_TYPES = new Set([
  "order.archived",
  "order.cancelled",
  "order.voided",
]);

export const ASSIGNMENT_EVENT_TYPES = new Set([
  "assignee_changed",
  "assignment",
]);

export const DOCUMENT_EVENT_TYPES = new Set([
  "order_document.uploaded",
  "order_document.archived",
]);

export const SYSTEM_EVENT_TYPES = new Set([
  "order_created",
  "dates_updated",
  "fee_changed",
  "order_number.manual_override",
  "site_visit",
]);

export function isHumanCommunicationEvent(eventType) {
  return HUMAN_COMMUNICATION_TYPES.has(eventType);
}

export function isWorkflowEvent(eventType) {
  return WORKFLOW_EVENT_TYPES.has(eventType);
}

export function isSystemEvent(eventType) {
  return (
    SYSTEM_EVENT_TYPES.has(eventType) ||
    WORKFLOW_EVENT_TYPES.has(eventType) ||
    LIFECYCLE_EVENT_TYPES.has(eventType) ||
    ASSIGNMENT_EVENT_TYPES.has(eventType) ||
    DOCUMENT_EVENT_TYPES.has(eventType)
  );
}

export const LABEL = {
  note: "Note",
  note_added: "Note",
  order_created: "Order created",
  status_changed: "Status changed",
  dates_updated: "Dates updated",
  assignee_changed: "Assignment changed",
  fee_changed: "Fee changed",
  sent_to_review: "Sent to review",
  sent_back_to_appraiser: "Revisions requested",
  ready_for_client: "Ready for client",
  completed: "Completed",
  "order.archived": "Order archived",
  "order.cancelled": "Order cancelled",
  "order.voided": "Order voided",
  "order_document.uploaded": "Document uploaded",
  "order_document.archived": "Document archived",
  "order_number.manual_override": "Order number changed",
  site_visit: "Site visit",
  assignment: "Assignment",
};

export const EVENT_ICON = {
  note: MessageSquareText,
  note_added: MessageSquareText,
  order_created: FileText,
  status_changed: Shuffle,
  dates_updated: CalendarCheck,
  assignee_changed: UserPlus,
  fee_changed: DollarSign,
  "order.archived": Archive,
  "order.cancelled": ShieldAlert,
  "order.voided": ShieldAlert,
  "order_document.uploaded": FileText,
  "order_document.archived": FileArchive,
  "order_number.manual_override": FileText,
  site_visit: CalendarCheck,
  assignment: UserPlus,
};

export const ACTIVITY_CATEGORY = {
  lifecycle: {
    label: "Lifecycle",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    rowClassName: "border-amber-200 bg-amber-50/40",
    iconClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
  workflow: {
    label: "Workflow",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    rowClassName: "border-sky-200 bg-sky-50/35",
    iconClassName: "border-sky-200 bg-sky-50 text-sky-700",
  },
  assignment: {
    label: "Assignment",
    className: "border-violet-200 bg-violet-50 text-violet-800",
    rowClassName: "border-violet-200 bg-violet-50/35",
    iconClassName: "border-violet-200 bg-violet-50 text-violet-700",
  },
  document: {
    label: "Documents",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rowClassName: "border-emerald-200 bg-emerald-50/35",
    iconClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  note: {
    label: "Notes",
    className: "border-slate-200 bg-white text-slate-700",
    rowClassName: "border-slate-200 bg-white",
    iconClassName: "border-slate-200 bg-slate-50 text-slate-500",
  },
  system: {
    label: "System",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    rowClassName: "border-slate-200/80 bg-white/80",
    iconClassName: "border-slate-200 bg-slate-50 text-slate-500",
  },
  unknown: {
    label: "Unknown",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    rowClassName: "border-slate-200 bg-white",
    iconClassName: "border-slate-200 bg-slate-50 text-slate-500",
  },
};

export function getActivityCategoryKey(eventType) {
  if (LIFECYCLE_EVENT_TYPES.has(eventType)) return "lifecycle";
  if (WORKFLOW_EVENT_TYPES.has(eventType)) return "workflow";
  if (ASSIGNMENT_EVENT_TYPES.has(eventType)) return "assignment";
  if (DOCUMENT_EVENT_TYPES.has(eventType)) return "document";
  if (HUMAN_COMMUNICATION_TYPES.has(eventType)) return "note";
  if (SYSTEM_EVENT_TYPES.has(eventType)) return "system";
  return "unknown";
}

export function getActivityCategory(eventType) {
  const key = getActivityCategoryKey(eventType);
  return { key, ...ACTIVITY_CATEGORY[key] };
}

export function titleCaseLocal(email) {
  const local = String(email || "").split("@")[0];
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function dayKey(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "invalid";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function dayLabel(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const today = new Date(), yd = new Date(today); yd.setDate(today.getDate()-1);
  const same = (a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  if (same(d,today)) return "Today";
  if (same(d,yd)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday:"long", month:"long", day:"numeric",
    year: d.getFullYear()!==today.getFullYear()? "numeric": undefined,
  });
}

// Deterministic per-user color (nice, readable HSL)
export function colorForUser(seed) {
  const s = String(seed || "");
  let h = 0;
  for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) % 360;
  // pastel-ish with good foreground contrast
  return { h, s: 70, l: 92, borderL: 45, text: "#1f2937" }; // text ~ gray-800
}

export function hsl({ h, s, l }) { return `hsl(${h} ${s}% ${l}%)`; }

function statusLabel(raw) {
  if (!raw) return null;
  return formatOrderStatusLabel(normalizeOrderStatus(raw)) || raw;
}

function fmtDateLocal(raw) {
  const formatted = formatOperationalDate(raw, "");
  return formatted || null;
}

function firstSafeText(...values) {
  return values
    .map((value) => String(value || "").trim())
    .find(Boolean) || null;
}

function joinSafeParts(parts) {
  return parts.filter(Boolean).join(" • ");
}

export function formatActivity(item = {}) {
  const type = item.event_type || "";
  let parsedBody = null;
  if (typeof item.body === "string") {
    const trimmed = item.body.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        parsedBody = JSON.parse(trimmed);
      } catch {
        parsedBody = null;
      }
    }
  }
  const detail = item.detail || {};
  const meta = (detail && Object.keys(detail).length > 0 && detail) ||
    (typeof item.body === "object" && item.body !== null ? item.body : null) ||
    (parsedBody && typeof parsedBody === "object" ? parsedBody : null) ||
    null;

  switch (type) {
    case "status_changed": {
      const from = statusLabel(meta?.from || meta?.from_status);
      const to = statusLabel(meta?.to || meta?.to_status);
      if (from && to) return `${from} → ${to}`;
      if (to) return `${to}`;
      return "";
    }
    case "sent_to_review":
      return "Sent to Review";
    case "sent_back_to_appraiser":
      return "Revisions requested";
    case "ready_for_client":
      return "Marked ready for client";
    case "completed":
      return "Order completed";
    case "order.archived": {
      const reason = firstSafeText(meta?.reason);
      return reason ? `Archived: ${reason}` : "Order archived";
    }
    case "order.cancelled": {
      const reason = firstSafeText(meta?.reason);
      return reason ? `Cancelled: ${reason}` : "Order cancelled";
    }
    case "order.voided": {
      const reason = firstSafeText(meta?.reason);
      return reason ? `Voided: ${reason}` : "Order voided";
    }
    case "order_document.uploaded":
    case "order_document.archived": {
      const title = firstSafeText(meta?.title, meta?.file_name, meta?.name);
      const category = firstSafeText(meta?.category);
      const visibility = firstSafeText(meta?.visibility_scope);
      const reason = type === "order_document.archived" ? firstSafeText(meta?.reason) : null;
      const prefix = type === "order_document.archived" ? "Document archived" : "Document uploaded";
      const detailText = joinSafeParts([
        title,
        category ? `Category: ${category}` : null,
        visibility ? `Visibility: ${visibility}` : null,
        reason ? `Reason: ${reason}` : null,
      ]);
      return detailText ? `${prefix}: ${detailText}` : prefix;
    }
    case "order_number.manual_override": {
      const oldNumber = firstSafeText(meta?.old_order_number);
      const newNumber = firstSafeText(meta?.new_order_number);
      const reason = firstSafeText(meta?.reason);
      const changed = oldNumber && newNumber ? `${oldNumber} → ${newNumber}` : newNumber || oldNumber;
      return joinSafeParts([
        changed ? `Order number ${changed}` : "Order number changed",
        reason ? `Reason: ${reason}` : null,
      ]);
    }
    case "site_visit": {
      const visit = fmtDateLocal(meta?.site_visit_at || meta?.site_visit_date || meta?.date);
      return visit ? `Site visit ${visit}` : "Site visit updated";
    }
    case "dates_updated": {
      const parts = [];
      const review = fmtDateLocal(meta?.review_due_at || meta?.review_due_date);
      const final = fmtDateLocal(meta?.final_due_at || meta?.final_due_date || meta?.due_date);
      const site = fmtDateLocal(meta?.site_visit_at || meta?.site_visit_date);
      if (review) parts.push(`Review due ${review}`);
      if (final) parts.push(`Final due ${final}`);
      if (site) parts.push(`Site visit ${site}`);
      if (parts.length) return `Dates updated: ${parts.join(" • ")}`;
      return "Dates updated";
    }
    case "assignee_changed": {
      const toName =
        meta?.assignee_to_name ||
        meta?.to_name ||
        meta?.name ||
        meta?.assignee_name;
      const toEmail =
        meta?.assignee_to_email ||
        meta?.to_email ||
        meta?.email ||
        null;
      const toDisplay = toName || (toEmail ? titleCaseLocal(toEmail) : null);
      const field = (meta?.assignee_field || meta?.field || "").toLowerCase();
      if (toDisplay && field) {
        if (field.includes("reviewer")) return `Reviewer assigned: ${toDisplay}`;
        if (field.includes("appraiser")) return `Appraiser assigned: ${toDisplay}`;
        if (field.includes("owner")) return `Owner assigned: ${toDisplay}`;
      }

      const pieces = [];
      if (meta?.appraiser_name) pieces.push(`Appraiser: ${meta.appraiser_name}`);
      if (meta?.reviewer_name) pieces.push(`Reviewer: ${meta.reviewer_name}`);
      if (pieces.length === 1) return pieces[0].replace("Appraiser:", "Appraiser assigned:").replace("Reviewer:", "Reviewer assigned:");
      if (pieces.length > 1) return `Assignees updated: ${pieces.join(" • ")}`;
      return "Assignees updated";
    }
    default:
      break;
  }

  // Fallbacks: prefer explicit message/body text if meaningful
  const msg = typeof item.message === "string" ? item.message.trim() : "";
  if (msg) return msg;

  if (typeof item.body === "string") {
    const trimmed = item.body.trim();
    if (!trimmed) return "";
    // Avoid dumping raw JSON blobs
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.message || parsed.note || parsed.text || "";
      } catch {
        return "";
      }
    }
    return trimmed;
  }

  return "Event recorded";
}
