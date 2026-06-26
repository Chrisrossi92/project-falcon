const EMPTY_VALUE = "Not provided";
const NO_DOCUMENTS_TEXT = "No documents are currently loaded for this package section.";

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

function keyOf(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function findInObject(source, keys = []) {
  if (!source || typeof source !== "object") return undefined;

  for (const key of keys) {
    if (source[key] !== null && source[key] !== undefined && String(source[key]).trim() !== "") {
      return source[key];
    }
  }

  return undefined;
}

function findInOrder(order = {}, keys = []) {
  return firstPresent(
    findInObject(order, keys),
    findInObject(order.metadata, keys),
    findInObject(order.details, keys),
    findInObject(order.custom_fields, keys),
    findInObject(order.client_request, keys),
    findInObject(order.request_metadata, keys),
  );
}

function parseLabeledNotes(notes) {
  const values = new Map();

  for (const line of String(notes || "").split(/\r?\n/)) {
    const match = line.match(/^\s*([^:]+?)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const [, label, value] = match;
    if (!value) continue;
    values.set(keyOf(label), value);
  }

  return values;
}

function findInNotes(notesMap, labels = []) {
  for (const label of labels) {
    const value = notesMap.get(keyOf(label));
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return undefined;
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

function formatFileSize(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const size = Number(value);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function formatLocation(order = {}) {
  const city = firstPresent(order.city, order.property_city);
  const state = firstPresent(order.state, order.property_state);
  const postalCode = firstPresent(order.postal_code, order.zip, order.property_postal_code);
  const locality = [city, [state, postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return valueOrEmpty(locality);
}

function documentCategoryKey(document) {
  return keyOf(firstPresent(document?.category, document?.document_type, document?.type));
}

function documentSectionKey(document) {
  const category = documentCategoryKey(document);

  if (["company_guidelines", "company_guideline", "guidelines", "guideline"].includes(category)) {
    return "company-guidelines";
  }

  if ([
    "client_documents",
    "client_document",
    "client_uploads",
    "client_upload",
    "borrower_documents",
    "borrower_document",
    "borrower_uploads",
    "borrower_upload",
    "engagement",
    "engagement_documents",
    "engagement_document",
  ].includes(category)) {
    return "client-documents";
  }

  if ([
    "source_documents",
    "source_document",
    "property_media",
    "property_photos",
    "property_photo",
    "property_documents",
    "property_document",
    "media",
  ].includes(category)) {
    return "property-source-documents";
  }

  return "other-attachments";
}

function normalizeDocuments(attachments, order = {}) {
  const source = Array.isArray(attachments)
    ? attachments
    : Array.isArray(order.attachments)
      ? order.attachments
      : Array.isArray(order.documents)
        ? order.documents
        : [];

  return source
    .filter((document) => keyOf(document?.status) !== "archived")
    .map((document, index) => ({
      id: document?.id || document?.document_id || document?.document_key || document?.name || `document-${index}`,
      name: valueOrEmpty(document?.title || document?.name || document?.file_name),
      type: humanize(firstPresent(document?.category, document?.document_type, document?.type)),
      visibilityScope: humanize(document?.visibility_scope),
      uploadedAt: formatDateTime(document?.created_at || document?.uploaded_at),
      size: formatFileSize(document?.file_size || document?.size),
      sectionKey: documentSectionKey(document),
    }))
    .filter((document) => document.name !== EMPTY_VALUE || document.type !== EMPTY_VALUE);
}

function buildDocumentSections(documents) {
  const sections = [
    {
      key: "company-guidelines",
      title: "Company Guidelines",
      emptyText: "No company guideline documents are currently loaded for this order.",
      documents: [],
    },
    {
      key: "client-documents",
      title: "Client Documents",
      emptyText: "No client documents are currently loaded for this order.",
      documents: [],
    },
    {
      key: "property-source-documents",
      title: "Property / Source Documents",
      emptyText: "No property or source documents are currently loaded for this order.",
      documents: [],
    },
    {
      key: "other-attachments",
      title: "Other Attachments",
      emptyText: "No other attachments are currently loaded for this order.",
      documents: [],
    },
  ];
  const sectionByKey = new Map(sections.map((section) => [section.key, section]));

  for (const document of documents) {
    const section = sectionByKey.get(document.sectionKey) || sectionByKey.get("other-attachments");
    section.documents.push(document);
  }

  return sections;
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

function buildEngagementLetterPreview({ order = {}, assignment = {}, vendor = {}, clientName, assignmentDueAt }) {
  const notesMap = parseLabeledNotes(firstPresent(order.notes, order.special_instructions, order.assignment_notes));
  const vendorName = firstPresent(vendor.vendor_company_name, vendor.company_name, vendor.name);
  const propertyAddress = firstPresent(order.property_address, order.address);
  const fee = formatMoney(
    firstPresent(assignment.feeAmount, assignment.fee_amount, order.vendor_fee, order.appraiser_fee, order.base_fee),
    assignment.currency || order.currency,
  );
  const deliveryDate = formatDateTime(assignmentDueAt);
  const scopeNotes = firstPresent(assignment.instructions, assignment.note, order.special_instructions, order.notes);

  const fields = [
    { label: "Order Number", value: firstPresent(order.order_number, order.orderNumber) },
    { label: "Client", value: clientName },
    { label: "Property", value: propertyAddress },
    { label: "Vendor", value: vendorName },
    { label: "Assignment Fee", value: fee },
    { label: "Requested Delivery", value: deliveryDate },
    {
      label: "Intended Use",
      value: firstPresent(
        findInOrder(order, ["intended_use", "intendedUse"]),
        findInNotes(notesMap, ["Intended use", "Use"]),
      ),
    },
    {
      label: "Intended User",
      value: firstPresent(
        findInOrder(order, ["intended_user", "intendedUser"]),
        findInNotes(notesMap, ["Intended user", "User"]),
      ),
    },
    {
      label: "Parcel Number(s)",
      value: firstPresent(
        findInOrder(order, ["parcel_numbers", "parcelNumbers", "parcel_number", "parcelNumber"]),
        findInNotes(notesMap, ["Parcel number(s)", "Parcel numbers", "Parcel number"]),
      ),
    },
    {
      label: "Interest Appraised",
      value: firstPresent(
        findInOrder(order, ["interest_appraised", "interestAppraised"]),
        findInNotes(notesMap, ["Interest appraised"]),
      ),
    },
    {
      label: "Premise / Condition",
      value: firstPresent(
        findInOrder(order, ["premise_condition", "premiseCondition", "condition"]),
        findInNotes(notesMap, ["Premise / Condition", "Premise", "Condition"]),
      ),
    },
    {
      label: "Approaches to Value",
      value: firstPresent(
        findInOrder(order, ["approaches_to_value", "approachesToValue", "valuation_approaches"]),
        findInNotes(notesMap, ["Approaches to Value", "Approaches"]),
      ),
    },
    { label: "Scope Notes", value: scopeNotes },
  ].map((item) => ({
    ...item,
    value: valueOrEmpty(item.value),
    missing: valueOrEmpty(item.value) === EMPTY_VALUE,
  }));

  return {
    title: "Engagement Letter Preview",
    dateLine: formatDateTime(new Date().toISOString()),
    recipient: valueOrEmpty(vendorName),
    salutation: `To ${valueOrEmpty(vendorName)},`,
    intro:
      "This preview represents the engagement letter that will later be generated for the vendor assignment package.",
    body:
      "The assignment terms below are populated only from current order, client, vendor, and assignment data already available in Falcon.",
    fields,
    closing: "Prepared for review in Falcon. No signature or PDF is generated from this preview.",
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
  const packageDocuments = normalizeDocuments(attachments, order);

  return {
    title: "Engagement Package Preview",
    subtitle: "Read-only package foundation for the vendor assignment.",
    documents: ENGAGEMENT_PACKAGE_DOCUMENTS,
    letterPreview: buildEngagementLetterPreview({
      order,
      assignment,
      vendor,
      clientName,
      assignmentDueAt,
    }),
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
    documentSections: buildDocumentSections(packageDocuments),
    attachments: packageDocuments,
    emptyAttachmentText: NO_DOCUMENTS_TEXT,
  };
}
