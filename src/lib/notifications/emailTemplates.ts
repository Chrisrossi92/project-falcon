export type EmailTemplateKey =
  | "APPRAISER_ASSIGNED"
  | "ORDER_READY_FOR_REVIEW"
  | "REVISIONS_REQUIRED"
  | "DUE_TODAY"
  | "OVERDUE"
  | "NOTE_ADDRESSED";

type Template = { subject: string; body: string };

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, Template> = {
  APPRAISER_ASSIGNED: {
    subject: "New Order Assigned – #{order_number}",
    body: `You’ve been assigned a new appraisal order.

**Order:** #{order_number}
**Property:** {property_address}
**Due Date:** {due_date}

**Entry Contact:** {contact_name}
**Phone:** {contact_phone}

**Special Instructions:**
{special_instructions}

Per office policy, please contact the entry contact within 24 hours to coordinate access.

[Open Order]({order_url})`,
  },
  ORDER_READY_FOR_REVIEW: {
    subject: "Order Ready for Review – #{order_number}",
    body: `An appraisal order has been submitted for review.

**Order:** #{order_number}
**Property:** {property_address}

Please review the report and take the appropriate action.

[Open Order]({order_url})`,
  },
  REVISIONS_REQUIRED: {
    subject: "Revisions Required – #{order_number}",
    body: `Revisions are required for the following appraisal order.

**Order:** #{order_number}
**Property:** {property_address}

Please review the comments and update the report accordingly.

[Open Order]({order_url})`,
  },
  DUE_TODAY: {
    subject: "Order Due Today – #{order_number}",
    body: `This appraisal order is due today.

**Order:** #{order_number}
**Property:** {property_address}

Please ensure the order is completed or updated as needed.

[Open Order]({order_url})`,
  },
  OVERDUE: {
    subject: "Order Overdue – #{order_number}",
    body: `This appraisal order is now overdue.

**Order:** #{order_number}
**Property:** {property_address}
**Due Date:** {due_date}

Please review the order status and take action as soon as possible.

[Open Order]({order_url})`,
  },
  NOTE_ADDRESSED: {
    subject: "New Note – Order #{order_number}",
    body: `A new note was added to an appraisal order and addressed to you.

**Order:** #{order_number}
**Property:** {property_address}
**From:** {author_name}

“{note_preview}”

[Open Order]({order_url})`,
  },
};

function isBlank(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function truncateNotePreview(raw: unknown) {
  const text = raw === undefined || raw === null ? "" : String(raw);
  if (text.length > 200) return `${text.slice(0, 200)}…`;
  return text;
}

function normalizePayload(payload: Record<string, unknown>) {
  const base: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (value === undefined || value === null) continue;
    base[key] = String(value);
  }

  base.contact_name = !isBlank(payload?.contact_name) ? String(payload?.contact_name) : "Not provided";
  base.contact_phone = !isBlank(payload?.contact_phone) ? String(payload?.contact_phone) : "Not provided";

  const special = payload?.special_instructions;
  base.special_instructions = !isBlank(special) ? String(special) : "None";

  base.note_preview = truncateNotePreview(payload?.note_preview);

  return base;
}

function replaceTokens(template: string, payload: Record<string, string>) {
  if (!template) return "";
  return template.replace(/#?\{([^}]+)\}/g, (_, token) => {
    const key = String(token).trim();
    const value = payload[key];
    return value !== undefined && value !== null ? value : "";
  });
}

export function renderEmailTemplate(key: EmailTemplateKey, payload: Record<string, unknown> = {}) {
  const tpl = EMAIL_TEMPLATES[key];
  const normalizedPayload = normalizePayload(payload);

  const subjectTemplate = tpl.subject.replace(/#\{([^}]+)\}/g, "{$1}");
  const subject = replaceTokens(subjectTemplate, normalizedPayload);
  const body = replaceTokens(tpl.body, normalizedPayload);

  return { subject, body };
}
