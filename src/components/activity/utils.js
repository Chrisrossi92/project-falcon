// utils.js
import { FileText, Shuffle, CalendarCheck, UserPlus, DollarSign, MessageSquareText } from "lucide-react";

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
  status_changed: "Status changed",
  dates_updated: "Dates updated",
  assignee_changed: "Assignee changed",
  fee_changed: "Fee changed",
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
