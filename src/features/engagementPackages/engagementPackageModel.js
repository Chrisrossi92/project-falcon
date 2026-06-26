const EMPTY_VALUE = "Not provided";

export const ENGAGEMENT_PACKAGE_DOCUMENTS = [
  {
    key: "engagement-letter",
    title: "Engagement Letter",
    description: "Assignment terms, vendor acknowledgement, and engagement scope.",
  },
  {
    key: "assignment-summary",
    title: "Assignment Summary",
    description: "Property, client, timing, fee, and instruction snapshot.",
  },
  {
    key: "company-guidelines",
    title: "Company Guidelines",
    description: "Production expectations and delivery standards for the assignment.",
  },
  {
    key: "client-documents",
    title: "Client Documents",
    description: "Supporting files attached to the order when available.",
  },
];

function valueOrEmpty(value) {
  if (value === null || value === undefined) return EMPTY_VALUE;
  const text = String(value).trim();
  return text || EMPTY_VALUE;
}

function humanize(value) {
  const text = String(value || "").trim();
  if (!text) return EMPTY_VALUE;
  return text
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function formatDateTime(value) {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return valueOrEmpty(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(amount, currency = "USD") {
  if (amount === null || amount === undefined || amount === "") return EMPTY_VALUE;
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return valueOrEmpty(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function formatLocation(order = {}) {
  const city = firstPresent(order.city, order.property_city);
  const state = firstPresent(order.state, order.property_state);
  const postalCode = firstPresent(order.postal_code, order.zip, order.property_postal_code);
  const locality = [city, [state, postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return valueOrEmpty(locality);
}

function normalizeAttachments(attachments, order = {}) {
  const source = Array.isArray(attachments)
    ? attachments
    : Array.isArray(order.attachments)
      ? order.attachments
      : Array.isArray(order.documents)
        ? order.documents
        : [];

  return source
    .map((attachment, index) => ({
      id: attachment?.id || attachment?.document_id || attachment?.name || `attachment-${index}`,
      name: valueOrEmpty(attachment?.name || attachment?.file_name || attachment?.title),
      type: valueOrEmpty(attachment?.document_type || attachment?.type || attachment?.category),
    }))
    .filter((attachment) => attachment.name !== EMPTY_VALUE || attachment.type !== EMPTY_VALUE);
}

function makeSection(key, title, items) {
  return {
    key,
    title,
    items: items.map(({ label, value }) => ({
      label,
      value: valueOrEmpty(value),
      missing: valueOrEmpty(value) === EMPTY_VALUE,
    })),
  };
}

export function buildEngagementPackagePreviewModel({
  order = {},
  assignment = {},
  vendor = {},
  client = {},
  attachments,
} = {}) {
  const primaryContact = vendor.primary_contact || {};
  const clientName = firstPresent(
    client.name,
    client.client_name,
    order.client_name,
    order.clientName,
    order.client_company_name,
  );
  const assignmentDueAt = firstPresent(assignment.dueAt, assignment.due_at, order.final_due_at, order.due_date);
  const reviewDueAt = firstPresent(assignment.reviewDueAt, assignment.review_due_at, order.review_due_at);
  const expirationAt = firstPresent(assignment.expiresAt, assignment.expires_at);
  const packageAttachments = normalizeAttachments(attachments, order);

  return {
    title: "Engagement Package Preview",
    subtitle: "Read-only package foundation for the vendor assignment.",
    documents: ENGAGEMENT_PACKAGE_DOCUMENTS,
    sections: [
      makeSection("property-information", "Property Information", [
        { label: "Property", value: firstPresent(order.property_address, order.address) },
        { label: "Location", value: formatLocation(order) },
        { label: "Property Type", value: humanize(firstPresent(order.property_type, order.asset_type)) },
        { label: "Report Type", value: humanize(firstPresent(order.report_type, order.product_type)) },
      ]),
      makeSection("assignment-information", "Assignment Information", [
        { label: "Order Number", value: firstPresent(order.order_number, order.orderNumber) },
        { label: "Assignment Type", value: humanize(firstPresent(assignment.assignmentType, assignment.assignment_type, "vendor_appraisal")) },
        { label: "Package Status", value: "Preview only" },
      ]),
      makeSection("vendor-information", "Vendor Information", [
        { label: "Vendor", value: firstPresent(vendor.vendor_company_name, vendor.company_name, vendor.name) },
        { label: "Primary Contact", value: firstPresent(primaryContact.name, vendor.contact_name) },
        { label: "Email", value: firstPresent(primaryContact.email, vendor.email) },
      ]),
      makeSection("client-information", "Client Information", [
        { label: "Client", value: clientName },
        { label: "Client Contact", value: firstPresent(client.contact_name, order.client_contact_name) },
      ]),
      makeSection("scope", "Scope", [
        { label: "Service", value: humanize(firstPresent(order.report_type, order.product_type, assignment.scope)) },
        { label: "Instructions", value: firstPresent(assignment.instructions, assignment.note, order.special_instructions) },
      ]),
      makeSection("due-dates", "Due Dates", [
        { label: "Vendor Due", value: formatDateTime(assignmentDueAt) },
        { label: "Review Due", value: formatDateTime(reviewDueAt) },
        { label: "Offer Expires", value: formatDateTime(expirationAt) },
        { label: "Client Due", value: formatDateTime(firstPresent(order.client_due_at, order.clientDueAt)) },
      ]),
      makeSection("fee", "Fee", [
        {
          label: "Vendor Fee",
          value: formatMoney(firstPresent(assignment.feeAmount, assignment.fee_amount), assignment.currency),
        },
      ]),
      makeSection("special-instructions", "Special Instructions", [
        { label: "Notes", value: firstPresent(assignment.instructions, assignment.note, order.assignment_notes) },
      ]),
    ],
    attachments: packageAttachments,
    emptyAttachmentText: "No client documents are currently attached to this preview.",
  };
}

