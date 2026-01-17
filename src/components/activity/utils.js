// utils.js
import { FileText, Shuffle, CalendarCheck, UserPlus, DollarSign, MessageSquareText } from "lucide-react";
import { formatOrderStatusLabel, normalizeOrderStatus } from "@/lib/constants/orderStatus";

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

export const LABEL = {
  note_added: "Note",
  order_created: "Order created",
  status_changed: "Status",
  dates_updated: "Dates",
  assignee_changed: "Assignment",
  fee_changed: "Fee changed",
  sent_to_review: "Workflow",
  sent_back_to_appraiser: "Workflow",
  ready_for_client: "Workflow",
  completed: "Workflow",
};

export const EVENT_ICON = {
  note_added: MessageSquareText,
  order_created: FileText,
  status_changed: Shuffle,
  dates_updated: CalendarCheck,
  assignee_changed: UserPlus,
  fee_changed: DollarSign,
};

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
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
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
  const hasMeta = meta && Object.keys(meta).length > 0;

  switch (type) {
    case "status_changed": {
      const from = statusLabel(meta?.from || meta?.from_status);
      const to = statusLabel(meta?.to || meta?.to_status);
      if (from && to) return `${from} → ${to}`;
      if (to) return `${to}`;
      return "";
    }
    case "sent_to_review":
      return "Sent to review";
    case "sent_back_to_appraiser":
      return "Returned to appraiser for revisions";
    case "ready_for_client":
      return "Marked ready for client";
    case "completed":
      return "Order completed";
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

  // If meta is empty and no message, skip rendering
  if (!hasMeta) return "";

  return "";
}
