export type EmailQueueRow = {
  id: string;
  user_id?: string | null;
  to_email: string;
  subject?: string | null;
  template?: string | null;
  payload?: Record<string, unknown> | null;
};

type RpcResult<T> = { data?: T | null; error?: { message?: string } | null };

type SupabaseClientLike = {
  rpc: <T = unknown>(name: string, params?: Record<string, unknown>) => Promise<RpcResult<T>>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type EmailWorkerConfig = {
  resendApiKey?: string | null;
  emailFrom?: string | null;
  appBaseUrl?: string | null;
  batchLimit?: number;
  workerName?: string;
};

const DEFAULT_BATCH_LIMIT = 25;
const NOTE_PREVIEW_LIMIT = 240;

const TEMPLATE_LABELS: Record<string, { subject: string; body: string }> = {
  APPRAISER_ASSIGNED: {
    subject: "You've been assigned {order_summary}",
    body: [
      "You have been assigned this appraisal order.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Report:** {report_type}",
      "**Property type:** {property_type}",
      "Property contact: {property_contact}",
      "**Site visit:** {site_visit_at}",
      "**Review due:** {review_due_at}",
      "**Final due:** {final_due_at}",
      "**Reviewer:** {reviewer_name}",
      "",
      "**Next action:** Please coordinate access with the contact above and let us know if you have any questions.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  REVIEWER_ASSIGNED: {
    subject: "You've been assigned review for {order_summary}",
    body: [
      "You have been assigned review for this order.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Report:** {report_type}",
      "**Appraiser:** {appraiser_name}",
      "**Review due:** {review_due_at}",
      "**Final due:** {final_due_at}",
      "",
      "**Next action:** Watch for the report submission and review it in Falcon.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  ORDER_READY_FOR_REVIEW: {
    subject: "{order_summary} is ready for review",
    body: [
      "An appraiser submitted this report for review.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Appraiser:** {appraiser_name}",
      "**Reviewer:** {reviewer_name}",
      "**Review due:** {review_due_at}",
      "**Final due:** {final_due_at}",
      "",
      "{workflow_note}",
      "",
      "**Next action:** Open the order and complete review.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  REVISIONS_REQUIRED: {
    subject: "Revisions requested for {order_summary}",
    body: [
      "A reviewer returned this order for revisions.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Appraiser:** {appraiser_name}",
      "**Reviewer:** {reviewer_name}",
      "**Final due:** {final_due_at}",
      "",
      "{workflow_note}",
      "",
      "**Next action:** Review the requested changes and resubmit when ready.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  REVIEW_CLEARED: {
    subject: "Review cleared for {order_summary}",
    body: [
      "Review has been cleared for this order.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Appraiser:** {appraiser_name}",
      "**Reviewer:** {reviewer_name}",
      "",
      "**Next action:** Continue the client-release workflow in Falcon.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  READY_FOR_CLIENT: {
    subject: "{order_summary} is ready for client",
    body: [
      "This order is marked ready for client delivery.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Final due:** {final_due_at}",
      "",
      "**Next action:** Complete the client delivery step in Falcon.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  ORDER_COMPLETED: {
    subject: "{order_summary} completed",
    body: [
      "This order has been marked complete.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  DATES_UPDATED: {
    subject: "Dates updated for {order_summary}",
    body: [
      "Schedule dates changed for this order.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Site visit:** {site_visit_at}",
      "**Review due:** {review_due_at}",
      "**Final due:** {final_due_at}",
      "",
      "**Next action:** Review the updated schedule in Falcon.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  SITE_VISIT_UPDATED: {
    subject: "Site visit updated for {order_summary}",
    body: [
      "The site visit appointment changed for this order.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Site visit:** {site_visit_at}",
      "**Appraiser:** {appraiser_name}",
      "",
      "**Next action:** Confirm access and schedule details in Falcon.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  DUE_TODAY: {
    subject: "Order due today: {order_summary}",
    body: [
      "This appraisal order is due today.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Final due:** {final_due_at}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  OVERDUE: {
    subject: "Order overdue: {order_summary}",
    body: [
      "This appraisal order is overdue.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**Due date:** {due_date}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  NOTE_ADDRESSED: {
    subject: "New note on {order_summary}",
    body: [
      "{author_name} added a note to this order.",
      "",
      "**Order:** {order_number}",
      "**Property:** {property_address}",
      "**Client:** {client_name}",
      "**From:** {author_name}",
      "",
      "\"{note_preview}\"",
      "",
      "**Next action:** Open the order to respond or continue work.",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  USER_INVITED: {
    subject: "Falcon user invitation sent",
    body: [
      "A Falcon company invitation was sent.",
      "",
      "**User:** {target_user_label}",
      "**Role:** {role_label}",
      "",
      "{message}",
    ].join("\n"),
  },
  USER_ACCESS_CHANGED: {
    subject: "Falcon user access changed",
    body: [
      "Company user access changed in Falcon.",
      "",
      "**User:** {target_user_label}",
      "**Change:** {access_change_summary}",
      "",
      "{message}",
    ].join("\n"),
  },
  VENDOR_BID_INVITATION: {
    subject: "Bid request: {property_address}",
    body: [
      "Bid Request",
      "",
      "Submit your bid using the secure link below.",
      "",
      "Assignment Summary",
      "**Property:** {property_address}",
      "**Location:** {property_location}",
      "**Property type:** {property_type}",
      "**Report type:** {report_type}",
      "",
      "Requested Timeline",
      "**Response deadline:** {response_due_at}",
      "**Vendor due date:** {desired_vendor_due_at}",
      "**Client due date:** {client_due_at}",
      "",
      "Message from Coordinator",
      "{coordinator_message}",
      "",
      "Why You're Receiving This",
      "{why_receiving_this}",
      "",
      "Supporting Documents",
      "{safe_notes}",
      "{documents_status}",
      "",
      "Submit Bid",
      "[Submit Bid]({bid_invitation_url})",
    ].join("\n"),
  },
};

const EVENT_TEMPLATE_MAP: Record<string, string> = {
  "order.new_assigned": "APPRAISER_ASSIGNED",
  "order.assigned_appraiser": "APPRAISER_ASSIGNED",
  "order.reassigned_appraiser": "APPRAISER_ASSIGNED",
  "order.assigned_reviewer": "REVIEWER_ASSIGNED",
  "order.reassigned_reviewer": "REVIEWER_ASSIGNED",
  "order.sent_to_review": "ORDER_READY_FOR_REVIEW",
  "order.resubmitted_to_review": "ORDER_READY_FOR_REVIEW",
  "order.sent_back_to_appraiser": "REVISIONS_REQUIRED",
  "order.review_cleared": "REVIEW_CLEARED",
  "order.ready_for_client": "READY_FOR_CLIENT",
  "order.completed": "ORDER_COMPLETED",
  "order.dates_updated": "DATES_UPDATED",
  "order.site_visit_updated": "SITE_VISIT_UPDATED",
  "order.due_today": "DUE_TODAY",
  "order.overdue": "OVERDUE",
  "note.added": "NOTE_ADDRESSED",
  "note.addressed": "NOTE_ADDRESSED",
  "note.appraiser_added": "NOTE_ADDRESSED",
  "note.reviewer_added": "NOTE_ADDRESSED",
  "user.invited": "USER_INVITED",
  "user.access_changed": "USER_ACCESS_CHANGED",
};

const FIELD_FALLBACKS: Record<string, string> = {
  order_number: "Not provided",
  property_address: "Not provided",
  client_name: "Not provided",
  appraiser_name: "Not assigned",
  reviewer_name: "Not assigned",
  report_type: "Not provided",
  property_type: "Not provided",
  property_contact: "Not provided",
  property_contact_name: "Not provided",
  property_contact_phone: "Not provided",
  site_visit_at: "Not set",
  review_due_at: "Not set",
  final_due_at: "Not set",
  due_date: "Not set",
  author_name: "Someone",
  workflow_note: "",
  note_preview: "No note preview provided.",
  target_user_label: "Not provided",
  role_label: "Not provided",
  access_change_summary: "Access settings were updated.",
  message: "",
  property_location: "Not provided",
  response_due_at: "Not set",
  desired_vendor_due_at: "Not set",
  client_due_at: "Not set",
  request_message: "",
  coordinator_message: "",
  safe_notes: "",
  why_receiving_this: "This request appears to match your coverage and appraisal services.",
  documents_status: "No supporting documents were included with this bid request.",
  bid_invitation_url: "",
};

const OPTIONAL_LINE_KEYS = new Set(["workflow_note", "message", "request_message", "coordinator_message", "safe_notes"]);
const DATE_ONLY_KEYS = new Set(["review_due_at", "final_due_at", "due_date"]);
const SHORT_DATE_ONLY_KEYS = new Set(["desired_vendor_due_at", "client_due_at"]);
const DATE_TIME_WITH_ZONE_KEYS = new Set(["response_due_at"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nestedString(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    if (!isObject(current)) return "";
    current = current[key];
  }
  return stringValue(current);
}

function truncateText(value: string, limit: number) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function parseDateParts(value: string) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatDateOnly(value: string) {
  const parts = parseDateParts(value);
  const date = parts
    ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatShortDateOnly(value: string) {
  const parts = parseDateParts(value);
  const date = parts
    ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSiteVisitAt(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)
    ? `${trimmed}Z`
    : trimmed;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = formatDateOnly(trimmed);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
  return `${datePart} at ${timePart}`;
}

function isValidTimeZone(value: string) {
  const timeZone = String(value || "").trim();
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolvePayloadTimeZone(payload: Record<string, string>) {
  const candidates = [
    payload.order_time_zone,
    payload.property_time_zone,
    payload.time_zone,
    payload.timezone,
    payload.tz,
  ];
  return candidates.find(isValidTimeZone) || "America/New_York";
}

function formatDateTimeInTimeZone(value: string, timeZone: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)
    ? `${trimmed}Z`
    : trimmed;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function normalizeDateFields(payload: Record<string, string>) {
  const timeZone = resolvePayloadTimeZone(payload);
  if (payload.site_visit_at) payload.site_visit_at = formatSiteVisitAt(payload.site_visit_at);
  for (const key of DATE_ONLY_KEYS) {
    if (payload[key]) payload[key] = formatDateOnly(payload[key]);
  }
  for (const key of SHORT_DATE_ONLY_KEYS) {
    if (payload[key]) payload[key] = formatShortDateOnly(payload[key]);
  }
  for (const key of DATE_TIME_WITH_ZONE_KEYS) {
    if (payload[key]) payload[key] = formatDateTimeInTimeZone(payload[key], timeZone);
  }
}

function formatServiceLabel(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return "";
  const lower = normalized.toLowerCase();
  const known: Record<string, string> = {
    appraisal: "Appraisal",
    "full appraisal": "Full Appraisal",
    full: "Full Appraisal",
    "restricted appraisal": "Restricted Appraisal",
    restricted: "Restricted Appraisal",
    review: "Review",
    desktop: "Desktop",
    office: "Office",
    retail: "Retail",
    industrial: "Industrial",
    multifamily: "Multifamily",
    "mixed use": "Mixed Use",
    land: "Land",
    "special purpose": "Special Purpose",
    hospitality: "Hospitality",
    "self storage": "Self Storage",
    "medical office": "Medical Office",
    restaurant: "Restaurant",
    "single family": "Single Family",
    condo: "Condo",
    condominium: "Condo",
    "two to four family": "Two-to-Four Family",
    "2 4 family": "Two-to-Four Family",
    "manufactured home": "Manufactured Home",
    "residential land": "Residential Land",
  };
  return known[lower] || normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function combineContactParts(name: string, phone: string) {
  return [name, phone].map((value) => value.trim()).filter(Boolean).join(" · ");
}

function isOrderSafeUrl(value: string, appBaseUrl = "") {
  const url = String(value || "").trim();
  if (!url) return false;
  if (url.startsWith("/orders/")) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith("/orders/")) return false;
    if (!appBaseUrl) return true;
    return parsed.origin === new URL(appBaseUrl).origin;
  } catch {
    return false;
  }
}

function isVendorBidInvitationSafeUrl(value: string, appBaseUrl = "") {
  const url = String(value || "").trim();
  if (!url) return false;
  if (url.startsWith("/vendor/bid-invitations/")) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith("/vendor/bid-invitations/")) return false;
    if (!appBaseUrl) return true;
    return parsed.origin === new URL(appBaseUrl).origin;
  } catch {
    return false;
  }
}

function normalizePayload(row: EmailQueueRow, appBaseUrl = "") {
  const rawPayload = isObject(row.payload) ? row.payload : {};
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawPayload)) {
    if (isObject(value) || Array.isArray(value)) continue;
    payload[key] = stringValue(value);
  }

  payload.order_id = payload.order_id || "";
  payload.order_number = payload.order_number || payload.order_no || payload.order_id || "";
  payload.property_address =
    payload.property_address ||
    payload.address ||
    [payload.address_line1, payload.city, payload.state, payload.postal_code].filter(Boolean).join(", ");
  payload.property_location =
    payload.property_location ||
    [payload.city, payload.state, payload.postal_code || payload.zip].filter(Boolean).join(", ");
  payload.client_name = payload.client_name || payload.client || "";
  payload.property_contact = payload.property_contact || combineContactParts(
    payload.property_contact_name || "",
    payload.property_contact_phone || "",
  );
  payload.due_date = payload.due_date || payload.final_due_at || payload.review_due_at || "";
  payload.author_name =
    payload.author_name ||
    payload.actor_name ||
    payload.actorName ||
    nestedString(rawPayload, ["actor", "name"]);
  payload.workflow_note = truncateText(payload.workflow_note || payload.note_text || "", NOTE_PREVIEW_LIMIT);
  payload.note_preview = truncateText(
    payload.note_preview || payload.note_text || payload.message || "",
    NOTE_PREVIEW_LIMIT,
  );
  payload.target_user_label =
    payload.target_user_label ||
    payload.target_user_email ||
    payload.invite_email ||
    payload.email ||
    nestedString(rawPayload, ["target", "email"]);
  payload.role_label = payload.role_label || payload.role || payload.primary_role || "";
  payload.access_change_summary = payload.access_change_summary || payload.change_summary || "";
  payload.coordinator_message = payload.coordinator_message || payload.request_message || "";
  payload.safe_notes = payload.safe_notes || payload.special_instructions_safe || "";
  payload.why_receiving_this = payload.why_receiving_this || "This request appears to match your coverage and appraisal services.";
  payload.documents_status = payload.documents_status || "No supporting documents were included with this bid request.";
  payload.property_type = formatServiceLabel(payload.property_type) || payload.property_type;
  payload.report_type = formatServiceLabel(payload.report_type) || payload.report_type;

  const base = appBaseUrl.replace(/\/+$/, "");
  const linkPath = payload.link_path || "";
  if (!payload.order_url && linkPath) {
    payload.order_url = base ? `${base}${linkPath.startsWith("/") ? "" : "/"}${linkPath}` : linkPath;
  }
  if (!payload.order_url && payload.order_id) {
    payload.order_url = base ? `${base}/orders/${payload.order_id}` : `/orders/${payload.order_id}`;
  }
  if (payload.order_url && !isOrderSafeUrl(payload.order_url, base)) {
    payload.order_url = "";
  }
  const bidInvitationPath = payload.bid_invitation_path || "";
  if (!payload.bid_invitation_url && bidInvitationPath) {
    payload.bid_invitation_url = base
      ? `${base}${bidInvitationPath.startsWith("/") ? "" : "/"}${bidInvitationPath}`
      : bidInvitationPath;
  }
  if (payload.bid_invitation_url && !isVendorBidInvitationSafeUrl(payload.bid_invitation_url, base)) {
    payload.bid_invitation_url = "";
  }
  payload.order_summary =
    payload.order_summary ||
    [
      payload.order_number ? `Order ${payload.order_number}` : "Order",
      payload.property_address,
    ].filter(Boolean).join(" - ");
  normalizeDateFields(payload);

  return payload;
}

function replaceTokens(template: string, payload: Record<string, string>) {
  return template.replace(/#?\{([^}]+)\}/g, (_, token) => {
    const key = String(token).trim();
    const value = payload[key] ?? FIELD_FALLBACKS[key] ?? "";
    return value || FIELD_FALLBACKS[key] || "";
  });
}

function stripEmptyOptionalLines(text: string, payload: Record<string, string>) {
  return text
    .split("\n")
    .filter((line) => {
      if (line.includes("{order_url}") && !payload.order_url) return false;
      if (line.includes("{bid_invitation_url}") && !payload.bid_invitation_url) return false;
      const match = line.trim().match(/^\{([^}]+)\}$/);
      if (!match) return true;
      const key = match[1].trim();
      return !OPTIONAL_LINE_KEYS.has(key) || Boolean(payload[key]);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function markdownToHtml(text: string) {
  const escaped = escapeHtml(text || "");
  const paragraphs = escaped.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\n/g, "<br>"));
  let html = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function detailValue(payload: Record<string, string>, key: string) {
  return payload[key] || FIELD_FALLBACKS[key] || "";
}

function detailsForTemplate(templateName: string, payload: Record<string, string>) {
  const common = [
    ["Order", "order_number"],
    ["Property", "property_address"],
    ["Client", "client_name"],
  ];
  const assignment = [
    ...common,
    ["Report", "report_type"],
    ["Property type", "property_type"],
    ["Property contact", "property_contact"],
    ["Site visit", "site_visit_at"],
    ["Review due", "review_due_at"],
    ["Final due", "final_due_at"],
    ["Reviewer", "reviewer_name"],
  ];
  const reviewer = [
    ...common,
    ["Report", "report_type"],
    ["Appraiser", "appraiser_name"],
    ["Review due", "review_due_at"],
    ["Final due", "final_due_at"],
  ];
  const dateDetails = [
    ...common,
    ["Site visit", "site_visit_at"],
    ["Review due", "review_due_at"],
    ["Final due", "final_due_at"],
  ];
  const vendorBidInvitation = [
    ["Property", "property_address"],
    ["Location", "property_location"],
    ["Property type", "property_type"],
    ["Report type", "report_type"],
    ["Client due date", "client_due_at"],
    ["Vendor due date", "desired_vendor_due_at"],
    ["Response deadline", "response_due_at"],
  ];

  const fields = templateName === "APPRAISER_ASSIGNED"
    ? assignment
    : templateName === "REVIEWER_ASSIGNED"
      ? reviewer
      : templateName === "DATES_UPDATED" || templateName === "SITE_VISIT_UPDATED"
        ? dateDetails
        : templateName === "VENDOR_BID_INVITATION"
          ? vendorBidInvitation
          : common;

  return fields.map(([label, key]) => [label, detailValue(payload, key)] as const);
}

function renderVendorBidInvitationHtml(subject: string, payload: Record<string, string>) {
  const actionUrl = payload.bid_invitation_url || "";
  const propertyAddress = detailValue(payload, "property_address");
  const propertyLocation = detailValue(payload, "property_location");
  const coordinatorMessage = payload.coordinator_message || "";
  const documentsStatus = payload.safe_notes || payload.documents_status;
  const timeline = [
    ["Response deadline", detailValue(payload, "response_due_at")],
    ["Vendor due date", detailValue(payload, "desired_vendor_due_at")],
    ["Client due date", detailValue(payload, "client_due_at")],
  ];
  const summary = [
    ["Property", propertyAddress],
    ["Location", propertyLocation],
    ["Property type", detailValue(payload, "property_type")],
    ["Report type", detailValue(payload, "report_type")],
  ];
  const summaryRows = summary.map(([label, value]) => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:12px;line-height:16px;color:#64748b;width:34%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:15px;line-height:22px;color:#0f172a;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `).join("");
  const timelineRows = timeline.map(([label, value]) => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:12px;line-height:16px;color:#64748b;width:44%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:15px;line-height:22px;color:#0f172a;font-weight:700;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8fb;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#0f172a;color:#ffffff;padding:24px 28px;">
                <div style="font-size:12px;line-height:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#bfdbfe;">Bid request</div>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:34px;color:#ffffff;">${escapeHtml(propertyAddress || subject)}</h1>
                <p style="margin:8px 0 0;font-size:15px;line-height:23px;color:#cbd5e1;">Submit your fee, turn time, proposed due date, and comments through the secure bid link.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cbd5e1;border-radius:8px;border-collapse:separate;overflow:hidden;background:#f8fafc;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <div style="font-size:12px;line-height:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569;">Property summary</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-collapse:collapse;">
                        ${summaryRows}
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate;overflow:hidden;background:#ffffff;">
                  <tr><td style="padding:14px 16px;background:#f8fafc;font-size:17px;line-height:23px;font-weight:700;color:#0f172a;">Requested Timeline</td></tr>
                  <tr>
                    <td style="padding:6px 16px 14px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        ${timelineRows}
                      </table>
                    </td>
                  </tr>
                </table>

                ${coordinatorMessage ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #bfdbfe;border-radius:8px;border-collapse:separate;overflow:hidden;background:#eff6ff;">
                  <tr><td style="padding:14px 16px;font-size:17px;line-height:23px;font-weight:700;color:#1e3a8a;">Message from Coordinator</td></tr>
                  <tr><td style="padding:0 16px 16px;font-size:15px;line-height:24px;color:#1e3a8a;">${escapeHtml(coordinatorMessage)}</td></tr>
                </table>` : ""}

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate;overflow:hidden;background:#ffffff;">
                  <tr><td style="padding:14px 16px;background:#f8fafc;font-size:17px;line-height:23px;font-weight:700;color:#0f172a;">Why You&rsquo;re Receiving This</td></tr>
                  <tr><td style="padding:14px 16px;border-top:1px solid #e2e8f0;font-size:15px;line-height:24px;color:#334155;">${escapeHtml(payload.why_receiving_this)}</td></tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate;overflow:hidden;background:#ffffff;">
                  <tr><td style="padding:14px 16px;background:#f8fafc;font-size:17px;line-height:23px;font-weight:700;color:#0f172a;">Supporting Documents</td></tr>
                  <tr><td style="padding:14px 16px;border-top:1px solid #e2e8f0;font-size:15px;line-height:24px;color:#334155;">${escapeHtml(documentsStatus)}</td></tr>
                </table>

                ${actionUrl ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                  <tr>
                    <td style="padding:18px;text-align:center;">
                      <div style="font-size:16px;line-height:22px;font-weight:700;color:#0f172a;">Ready to respond?</div>
                      <p style="margin:6px 0 16px;font-size:14px;line-height:22px;color:#475569;">Open the secure bid invitation to submit your response.</p>
                      <a href="${escapeHtml(actionUrl)}" style="display:inline-block;border-radius:6px;background:#2563eb;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;">Submit Bid</a>
                      <p style="margin:14px 0 0;font-size:12px;line-height:18px;color:#64748b;word-break:break-all;">${escapeHtml(actionUrl)}</p>
                    </td>
                  </tr>
                </table>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:18px;">Powered by Falcon &middot; Continental Real Estate Solutions</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderFalconEmailHtml(templateName: string, subject: string, text: string, payload: Record<string, string>) {
  if (templateName === "VENDOR_BID_INVITATION") {
    return renderVendorBidInvitationHtml(subject, payload);
  }

  const details = detailsForTemplate(templateName, payload);
  const summary = payload.order_summary || subject;
  const actionUrl = payload.order_url || "";
  const eyebrow = "Order notification";
  const detailTitle = "Order summary";
  const actionLabel = "Open Order";
  const intro = text.split("\n").find((line) => line.trim() && !line.startsWith("**")) || "";
  const supportingMessage = templateName === "NOTE_ADDRESSED"
    ? payload.note_preview
    : payload.workflow_note || "";
  const detailRows: string[] = [];
  for (let index = 0; index < details.length; index += 2) {
    const left = details[index];
    const right = details[index + 1];
    detailRows.push(`
      <tr>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;width:50%;vertical-align:top;">
          <div style="font-size:12px;line-height:16px;color:#64748b;">${escapeHtml(left[0])}</div>
          <div style="font-size:14px;line-height:20px;color:#0f172a;font-weight:600;">${escapeHtml(left[1])}</div>
        </td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;width:50%;vertical-align:top;">
          ${right ? `<div style="font-size:12px;line-height:16px;color:#64748b;">${escapeHtml(right[0])}</div>
          <div style="font-size:14px;line-height:20px;color:#0f172a;font-weight:600;">${escapeHtml(right[1])}</div>` : "&nbsp;"}
        </td>
      </tr>`);
  }

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f8fb;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#0f172a;color:#ffffff;padding:22px 28px;font-size:22px;line-height:28px;font-weight:700;">Falcon</td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <div style="font-size:13px;line-height:18px;color:#2563eb;font-weight:700;text-transform:uppercase;">${escapeHtml(eyebrow)}</div>
                <h1 style="margin:6px 0 10px;font-size:24px;line-height:32px;color:#0f172a;">${escapeHtml(summary)}</h1>
                ${intro ? `<p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#334155;">${escapeHtml(intro)}</p>` : ""}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;overflow:hidden;background:#ffffff;">
                  <tr>
                    <td colspan="2" style="padding:14px 16px;background:#f8fafc;font-size:16px;line-height:22px;font-weight:700;color:#0f172a;">${escapeHtml(detailTitle)}</td>
                  </tr>
                  ${detailRows.join("")}
                </table>
                ${supportingMessage ? `<p style="margin:20px 0 0;padding:14px 16px;background:#f8fafc;border-left:3px solid #2563eb;font-size:15px;line-height:24px;color:#334155;">${escapeHtml(supportingMessage)}</p>` : ""}
                ${templateName === "APPRAISER_ASSIGNED" ? `<p style="margin:20px 0 0;font-size:15px;line-height:24px;color:#334155;">Please coordinate access with the contact above and let us know if you have any questions.</p>` : ""}
                ${actionUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;"><tr><td style="border-radius:6px;background:#2563eb;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;">${escapeHtml(actionLabel)}</a></td></tr></table>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:18px;">Powered by Falcon &middot; Continental Real Estate Solutions</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function resolveTemplateName(row: EmailQueueRow) {
  const payload = isObject(row.payload) ? row.payload : {};
  const explicit =
    stringValue(payload.email_template_key) ||
    stringValue(payload.template_key) ||
    stringValue(payload.templateKey);
  if (explicit && TEMPLATE_LABELS[explicit]) return explicit;

  const template = stringValue(row.template);
  if (template && TEMPLATE_LABELS[template]) return template;
  if (template && EVENT_TEMPLATE_MAP[template]) return EVENT_TEMPLATE_MAP[template];

  return null;
}

export function renderEmailQueueRow(row: EmailQueueRow, appBaseUrl = "") {
  const payload = normalizePayload(row, appBaseUrl);
  const templateName = resolveTemplateName(row);
  if (templateName) {
    const template = TEMPLATE_LABELS[templateName];
    const subject = replaceTokens(template.subject, payload) || row.subject || "Falcon notification";
    const text = replaceTokens(stripEmptyOptionalLines(template.body, payload), payload);
    return { subject, html: renderFalconEmailHtml(templateName, subject, text, payload), text };
  }

  const subject = row.subject || "Falcon notification";
  const message = payload.message || payload.body || subject;
  const fallbackUrl = payload.bid_invitation_url || payload.order_url || "";
  const fallbackLabel = payload.bid_invitation_url ? "Submit Bid" : "Open in Falcon";
  const link = fallbackUrl ? `\n\n[${fallbackLabel}](${fallbackUrl})` : "";
  const text = `${message}${link}`;
  return { subject, html: markdownToHtml(text), text };
}

async function claimBatch(supabase: SupabaseClientLike, limit: number, workerName: string) {
  const { data, error } = await supabase.rpc<EmailQueueRow[]>("rpc_claim_email_batch_v1", {
    p_limit: limit,
    p_worker: workerName,
  });
  if (error) throw new Error(`claim failed: ${error.message || "unknown error"}`);
  return data || [];
}

async function markSent(supabase: SupabaseClientLike, id: string) {
  const { error } = await supabase.rpc("rpc_mark_email_sent_v1", { p_id: id });
  if (error) throw new Error(`mark sent failed: ${error.message || "unknown error"}`);
}

async function markFailed(supabase: SupabaseClientLike, id: string, errorMessage: string) {
  await supabase.rpc("rpc_mark_email_failed_v1", {
    p_id: id,
    p_error: errorMessage.slice(0, 1000),
  });
}

async function sendViaResend(
  fetchImpl: FetchLike,
  apiKey: string,
  from: string,
  row: EmailQueueRow,
  rendered: { subject: string; html: string; text: string }
) {
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: row.to_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Resend returned ${response.status}`);
  }
}

export function createEmailQueueProcessor({
  supabase,
  fetchImpl,
  config,
}: {
  supabase: SupabaseClientLike;
  fetchImpl: FetchLike;
  config: EmailWorkerConfig;
}) {
  const batchLimit = Number.isFinite(config.batchLimit) && Number(config.batchLimit) > 0
    ? Number(config.batchLimit)
    : DEFAULT_BATCH_LIMIT;
  const workerName = config.workerName || "email-worker";
  const emailFrom = config.emailFrom || "";
  const appBaseUrl = config.appBaseUrl || "";
  const resendApiKey = config.resendApiKey || "";

  return async function processEmailQueue() {
    const items = await claimBatch(supabase, batchLimit, workerName);
    let sent = 0;
    let failed = 0;

    for (const row of items) {
      try {
        if (!resendApiKey) throw new Error("No RESEND_API_KEY configured");
        if (!emailFrom) throw new Error("No EMAIL_FROM configured");
        const rendered = renderEmailQueueRow(row, appBaseUrl);
        await sendViaResend(fetchImpl, resendApiKey, emailFrom, row, rendered);
        await markSent(supabase, row.id);
        sent += 1;
      } catch (error) {
        failed += 1;
        await markFailed(supabase, row.id, error instanceof Error ? error.message : String(error));
      }
    }

    return { claimed: items.length, sent, failed };
  };
}
