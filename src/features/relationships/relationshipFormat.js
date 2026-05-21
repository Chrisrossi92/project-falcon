export const RELATIONSHIP_SCOPES = Object.freeze([
  { key: "outgoing", label: "Outgoing" },
  { key: "incoming", label: "Incoming" },
  { key: "all", label: "All" },
]);

export const RELATIONSHIP_STATUSES = Object.freeze([
  { key: "", label: "Any status" },
  { key: "invited", label: "Invited" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
  { key: "archived", label: "Archived" },
]);

export const RELATIONSHIP_TYPES = Object.freeze([
  { key: "amc_vendor", label: "AMC Vendor" },
  { key: "staff_overflow_vendor", label: "Staff Overflow Vendor" },
  { key: "review_provider", label: "Review Provider" },
  { key: "enterprise_child", label: "Enterprise Child" },
  { key: "billing_managed", label: "Billing Managed" },
  { key: "support_managed", label: "Support Managed" },
]);

export function humanize(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatRelationshipType(type, label) {
  return label || RELATIONSHIP_TYPES.find((entry) => entry.key === type)?.label || humanize(type || "unknown");
}

export function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function statusClass(status) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "invited":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "suspended":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "declined":
    case "expired":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "archived":
      return "border-slate-300 bg-slate-200 text-slate-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function blockedReasonLabel(reason) {
  switch (reason) {
    case "self_company":
      return "Current company";
    case "inactive_company":
      return "Inactive company";
    case "incompatible_company_type":
      return "Incompatible type";
    case "relationship_already_invited":
      return "Already invited";
    case "relationship_already_active":
      return "Already active";
    case "relationship_suspended":
      return "Relationship suspended";
    case "not_authorized":
      return "Not authorized";
    case "none":
    case "":
    case null:
    case undefined:
      return "Eligible";
    default:
      return humanize(reason);
  }
}

export function relationshipCompanyLabel(relationship, direction = null) {
  if (!relationship) return "Relationship";
  if (direction === "incoming") return relationship.source_company_name || "Source company";
  if (direction === "outgoing") return relationship.target_company_name || "Target company";
  return `${relationship.source_company_name || "Source"} -> ${relationship.target_company_name || "Target"}`;
}

export function relationshipDirection(scope) {
  if (scope === "incoming") return "incoming";
  if (scope === "outgoing") return "outgoing";
  return null;
}
