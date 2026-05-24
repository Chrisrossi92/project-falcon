import { ORDER_STATUS, normalizeOrderStatus } from "@/lib/constants/orderStatus";

const RECENT_UPLOAD_DAYS = 2;
const MULTIPLE_FILE_THRESHOLD = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(date, now) {
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

function pluralizeFile(count) {
  return `${count} supporting file${count === 1 ? "" : "s"}`;
}

function categoryLabel(value) {
  return (
    String(value || "")
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Document"
  );
}

function documentCategory(document) {
  return (
    document?.category ||
    document?.document_type ||
    document?.type ||
    document?.file_category ||
    null
  );
}

function documentDate(document) {
  return parseDate(document?.created_at || document?.uploaded_at || document?.updated_at);
}

function isActiveDocument(document) {
  const status = String(document?.status || "").toLowerCase();
  return status !== "archived" && status !== "deleted";
}

function explicitCountFromOrder(order) {
  const keys = [
    "active_document_count",
    "document_count",
    "file_count",
    "files_count",
  ];

  for (const key of keys) {
    const value = order?.[key];
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }

  return null;
}

function categorySummary(categories) {
  if (categories.length < 2) return null;
  const visible = categories.slice(0, 3).map(categoryLabel).join(", ");
  return `File mix includes ${visible}${categories.length > 3 ? ", and more" : ""}.`;
}

export function deriveFileReadinessSummary({
  order = null,
  documents = null,
  documentCount = null,
  now = new Date(),
} = {}) {
  const currentTime = parseDate(now) || new Date();
  const activeDocuments = Array.isArray(documents)
    ? documents.filter(isActiveDocument)
    : null;
  const explicitCount =
    documentCount != null && Number.isFinite(Number(documentCount))
      ? Number(documentCount)
      : explicitCountFromOrder(order);
  const activeCount = activeDocuments ? activeDocuments.length : explicitCount;

  if (activeCount == null) return null;

  if (activeCount === 0) {
    return {
      id: "no_files_loaded",
      tone: "attention",
      label: "No files loaded",
      message: "No supporting files loaded yet.",
      details: ["File readiness is based only on loaded document metadata."],
    };
  }

  const categories = activeDocuments
    ? Array.from(new Set(activeDocuments.map(documentCategory).filter(Boolean))).sort()
    : [];
  const mostRecentUpload = activeDocuments
    ? activeDocuments
        .map(documentDate)
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null
    : null;
  const recentUpload =
    mostRecentUpload && daysSince(mostRecentUpload, currentTime) <= RECENT_UPLOAD_DAYS;
  const status = normalizeOrderStatus(order?.status_normalized || order?.status);
  const details = [`${pluralizeFile(activeCount)} loaded.`];
  const categoryDetail = categorySummary(categories);

  if (categoryDetail) details.push(categoryDetail);

  if (recentUpload) {
    return {
      id: "recent_file_uploads",
      tone: "ready",
      label: "Recent uploads",
      message: "Recent document uploads detected.",
      details,
    };
  }

  if (status === ORDER_STATUS.IN_REVIEW) {
    return {
      id: "documents_available_for_review",
      tone: "ready",
      label: "Documents available",
      message: "Documents are available for review.",
      details,
    };
  }

  if (activeCount >= MULTIPLE_FILE_THRESHOLD) {
    return {
      id: "multiple_files_present",
      tone: "ready",
      label: "Files available",
      message: "Multiple supporting documents are available.",
      details,
    };
  }

  return {
    id: "limited_files_present",
    tone: "neutral",
    label: "Limited files",
    message: "Limited supporting files uploaded so far.",
    details,
  };
}
