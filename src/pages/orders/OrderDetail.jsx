// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import GoogleMapEmbed from "@/components/maps/GoogleMapEmbed";
import SiteVisitPicker from "@/components/dates/SiteVisitPicker";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import ActivityLog from "@/components/activity/ActivityLog";
import OrderAttentionSummaryPanel from "@/features/orders/attention/OrderAttentionSummaryPanel";
import FileReadinessSummary from "@/features/orders/readiness/FileReadinessSummary";
import OperationalInputsReadOnly from "@/features/orders/operational-inputs/OperationalInputsReadOnly";
import useOrderOperationalInputs from "@/features/orders/operational-inputs/useOrderOperationalInputs";
import ReviewContextSummary from "@/features/orders/review/ReviewContextSummary";
import useOrder from "@/lib/hooks/useOrder";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { useToast } from "@/lib/hooks/useToast";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  archiveOrderDocument,
  createOrderDocumentDownloadUrl,
  listOrderDocuments,
  uploadOrderDocument,
} from "@/features/order-documents/api";
import {
  canArchiveOrder,
  canCancelOrder,
  canVoidOrder,
} from "@/features/orders/orderArchiveReadiness";
import OfferAssignmentModal from "@/features/assignments/components/OfferAssignmentModal";
import OwnerOrderAssignmentsPanel from "@/features/assignments/components/OwnerOrderAssignmentsPanel";
import OrderPrintPacket from "@/features/orders/print/OrderPrintPacket";
import {
  archiveOrderViaRpc,
  cancelOrderViaRpc,
  updateSiteVisitAtViaRpc,
  voidOrderViaRpc,
} from "@/lib/services/ordersService";

/* ---------- helpers ---------- */
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : "-");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "-");
const money = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });
const fileSize = (n) => {
  if (n == null || Number.isNaN(Number(n))) return null;
  const size = Number(n);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
};

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "") ?? null;
const reviewDateOf = (o) => pick(o.review_due_at);
const DOCUMENT_CATEGORIES = Object.freeze([
  "engagement",
  "source_documents",
  "property_media",
  "review_revisions",
  "final_report",
  "internal_workfile",
]);
const ARCHIVE_ORDER_COPY = Object.freeze({
  title: "Archive order",
  warning:
    "This removes the order from active operational lists. It does not delete the order, change its status, remove documents, remove activity, or release the order number.",
  reasonLabel: "Reason for archive (optional)",
  confirmLabel: "Archive order",
  success: "Order archived. It was removed from active lists, and its history was preserved.",
  failure: "Could not archive order. No changes were made.",
  noticeTitle: "Archived order",
  notice:
    "This order is preserved for history. It is hidden from active operational lists and archive does not change status, remove documents, remove activity, or release the order number.",
});
const LIFECYCLE_ACTION_COPY = Object.freeze({
  cancel: {
    title: "Cancel order",
    warning:
      "Cancelling marks a legitimate order as stopped before completion. It does not delete the order, release the order number, or remove documents/activity.",
    reasonLabel: "Reason for cancellation",
    confirmLabel: "Cancel order",
    pendingLabel: "Cancelling...",
    success: "Order cancelled. Its history was preserved.",
    failure: "Could not cancel order. No changes were made.",
    submit: cancelOrderViaRpc,
    buttonClass:
      "px-3 py-1.5 border border-rose-300 bg-rose-50 text-rose-800 rounded text-sm font-semibold hover:bg-rose-100",
    confirmClass:
      "rounded border border-rose-700 bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50",
  },
  void: {
    title: "Void order",
    warning:
      "Voiding marks this order as administratively invalid, such as a duplicate, mistake, or record opened in error. It does not delete the order, release the order number, or remove documents/activity.",
    reasonLabel: "Reason for voiding",
    confirmLabel: "Void order",
    pendingLabel: "Voiding...",
    success: "Order voided. Its history was preserved.",
    failure: "Could not void order. No changes were made.",
    submit: voidOrderViaRpc,
    buttonClass:
      "px-3 py-1.5 border border-slate-300 bg-slate-50 text-slate-800 rounded text-sm font-semibold hover:bg-slate-100",
    confirmClass:
      "rounded border border-slate-800 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50",
  },
});
const LIFECYCLE_HISTORY_NOTICE = Object.freeze({
  cancelled: {
    title: "Cancelled order",
    notice:
      "This order is preserved for history. It is hidden from active operational queues and cancellation does not delete the order, release the order number, or remove documents/activity.",
  },
  voided: {
    title: "Voided order",
    notice:
      "This order is preserved for history. It is hidden from active operational queues and voiding does not delete the order, release the order number, or remove documents/activity.",
  },
});
const categoryLabel = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Document";

const documentCategoryKey = (document) =>
  pick(document?.category, document?.document_type, document?.type) || "uncategorized";

const documentCategoryLabel = (document) => {
  const key = documentCategoryKey(document);
  return key === "uncategorized" ? "Uncategorized" : categoryLabel(key);
};

const groupDocumentsByCategory = (documents) => {
  const groups = new Map();

  for (const document of documents || []) {
    const key = documentCategoryKey(document);
    const label = documentCategoryLabel(document);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        documents: [],
      });
    }

    groups.get(key).documents.push(document);
  }

  return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const buildDocumentCategoryCounts = (documents) => {
  const counts = new Map();

  for (const document of documents || []) {
    const label = documentCategoryLabel(document);
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

function SummaryField({ label, value, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      {children ? (
        <div className="mt-1 text-sm font-medium text-gray-900">{children}</div>
      ) : (
        <div className="mt-1 truncate text-sm font-medium text-gray-900" title={value || "-"}>
          {value || "-"}
        </div>
      )}
    </div>
  );
}

function OverviewSection({ title, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-gray-100 bg-gray-50/60 p-3 ${className}`}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FilesCard({ order, orderId, canArchive, canUpload, onFilesLoaded }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [category, setCategory] = useState("engagement");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState(false);
  const fileInputRef = useRef(null);

  const loadFiles = async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const rows = await listOrderDocuments(orderId);
      const nextFiles = Array.isArray(rows) ? rows : [];
      setFiles(nextFiles);
      onFilesLoaded?.(nextFiles);
    } catch (loadError) {
      setFiles([]);
      onFilesLoaded?.([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function load() {
      if (!orderId) return;
      setLoading(true);
      setError(null);

      try {
        const rows = await listOrderDocuments(orderId);
        const nextFiles = Array.isArray(rows) ? rows : [];
        if (active) {
          setFiles(nextFiles);
          onFilesLoaded?.(nextFiles);
        }
      } catch (loadError) {
        if (active) {
          setFiles([]);
          onFilesLoaded?.([]);
          setError(loadError);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [onFilesLoaded, orderId]);

  const latestFiles = files.slice(0, 5);
  const groupedFiles = groupDocumentsByCategory(latestFiles);

  async function handleDownload(document) {
    setBusyId(document.id);

    try {
      const result = await createOrderDocumentDownloadUrl(document.id);
      window.open(result.signed_url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      alert(downloadError?.message || "Could not open this file.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(document) {
    if (!window.confirm(`Archive ${document.title || document.file_name}?`)) return;

    setBusyId(document.id);

    try {
      await archiveOrderDocument(document.id);
      await loadFiles();
    } catch (archiveError) {
      alert(archiveError?.message || "Could not archive this file.");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadFile(file) {
    if (!file || uploading) return;

    setUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    setUploadError(false);
    setError(null);

    try {
      await uploadOrderDocument({
        orderId,
        file,
        category,
        title: file.name,
        visibilityScope: "internal",
      });
      setUploadStatus("Upload complete");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadFiles();
    } catch (uploadError) {
      setUploadStatus(uploadError?.message || "Upload failed");
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    uploadFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    uploadFile(file);
  }

  return (
    <div className="mt-4 rounded-md bg-white p-3 border" aria-label="Order files">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
          Files
        </div>
        {!loading && !error && (
          <div className="text-[11px] text-gray-500">
            {files.length} {files.length === 1 ? "file" : "files"}
          </div>
        )}
      </div>

      {!loading && !error && (
        <FileReadinessSummary order={order} documents={files} className="mt-3" />
      )}

      {canUpload && (
        <div className="mt-3 rounded border border-dashed border-gray-200 bg-gray-50/70 p-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Document category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={uploading}
              className="rounded border bg-white px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              {DOCUMENT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {categoryLabel(option)}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              aria-label="Choose order file"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="min-w-0 flex-1 text-xs text-gray-600 file:mr-2 file:rounded file:border file:bg-white file:px-2 file:py-1 file:text-xs file:text-gray-700 disabled:opacity-50"
            />
          </div>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`mt-2 rounded border px-2 py-2 text-center text-xs ${
              dragActive
                ? "border-slate-400 bg-white text-slate-700"
                : "border-gray-200 bg-white/70 text-gray-500"
            }`}
          >
            Drop a file here
          </div>
          {(uploading || uploadStatus) && (
            <div
              className={`mt-2 text-xs ${
                uploading ? "text-gray-600" : uploadError ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {uploadStatus}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="mt-3 text-sm text-gray-500">Loading files...</div>
      ) : error ? (
        <div className="mt-3 text-sm text-amber-700">Files unavailable.</div>
      ) : latestFiles.length === 0 ? (
        <div className="mt-3 rounded border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500">
          No files uploaded yet.
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {groupedFiles.map((group) => (
            <section
              key={group.key}
              aria-label={`${group.label} files`}
              className="rounded-md border border-gray-100 bg-white"
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-2.5 py-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {group.label}
                </div>
                <div className="text-[11px] text-gray-500">
                  {group.documents.length} {group.documents.length === 1 ? "file" : "files"}
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {group.documents.map((document) => {
                  const label = document.title || document.file_name || "Document";
                  const category = documentCategoryLabel(document);
                  const size = fileSize(document.file_size);
                  const isArchived = document.status === "archived";
                  const isBusy = busyId === document.id;

                  return (
                    <div key={document.id} className="px-2.5 py-2.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div
                            className="truncate text-sm font-medium text-gray-900"
                            title={label}
                          >
                            {label}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
                              {category}
                            </span>
                            <span>Uploaded {fmtDate(document.created_at)}</span>
                            {size && <span>{size}</span>}
                            {isArchived && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!isArchived && (
                            <button
                              type="button"
                              onClick={() => handleDownload(document)}
                              disabled={isBusy}
                              className="rounded border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Download
                            </button>
                          )}
                          {canArchive && !isArchived && (
                            <button
                              type="button"
                              onClick={() => handleArchive(document)}
                              disabled={isBusy}
                              className="rounded border px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== component ============================== */
export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { order, loading, error: loadErr, refresh } = useOrder(id);
  const permissions = useEffectivePermissions();
  const { success, error: toastError } = useToast();
  const [offerAssignmentOpen, setOfferAssignmentOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [lifecycleAction, setLifecycleAction] = useState(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);
  const [lifecycleError, setLifecycleError] = useState("");
  const [printPacketOpen, setPrintPacketOpen] = useState(false);
  const [orderFiles, setOrderFiles] = useState([]);
  const [orderFilesLoaded, setOrderFilesLoaded] = useState(false);
  const {
    inputs: operationalInputs,
    loading: operationalInputsLoading,
    error: operationalInputsError,
  } = useOrderOperationalInputs(id);

  // Display names
  const [clientName, setClientName] = useState("-");
  const [amcName, setAmcName] = useState("-");
  const [appraiserName, setAppraiserName] = useState("-");

  useEffect(() => {
    if (order) {
      setClientName(order.client_name || "-");
      setAmcName(order.amc_name || "-");
      setAppraiserName(order.appraiser_name || "-");
    }
  }, [order]);

  const titleNo = useMemo(
    () => (order?.order_number || (order?.id ? String(order.id).slice(0, 8) : "")),
    [order]
  );

  const addr1 = order?.address_line1 || "";
  const addr2 =
    [order?.city, order?.state].filter(Boolean).join(", ") +
    (order?.postal_code ? ` ${order.postal_code}` : "");
  const propertyAddress = [addr1, addr2].filter(Boolean).join(", ");
  const contactName = order?.property_contact_name || order?.entry_contact_name || "";
  const contactPhone = order?.property_contact_phone || order?.entry_contact_phone || "";

  const copyNo = () => navigator.clipboard?.writeText(titleNo).catch(() => {});
  const handleFilesLoaded = React.useCallback((files) => {
    setOrderFiles(Array.isArray(files) ? files : []);
    setOrderFilesLoaded(true);
  }, []);
  const documentCategoryCounts = useMemo(
    () => buildDocumentCategoryCounts(orderFiles),
    [orderFiles],
  );

  const canOfferAssignment =
    !permissions.loading &&
    !permissions.error &&
    permissions.hasAllPermissions([
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_OFFER,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.RELATIONSHIPS_ASSIGN_WORK,
      PERMISSIONS.RELATIONSHIPS_READ,
    ]);
  const canArchiveDocuments =
    !permissions.loading &&
    !permissions.error &&
    permissions.hasPermission(PERMISSIONS.DOCUMENTS_DELETE);
  const canUploadDocuments =
    !permissions.loading &&
    !permissions.error &&
    permissions.hasAnyPermission([
      PERMISSIONS.DOCUMENTS_UPLOAD_ASSIGNED,
      PERMISSIONS.DOCUMENTS_UPLOAD_ALL,
    ]);
  const canArchiveThisOrder = canArchiveOrder(order, permissions);
  const canCancelThisOrder = canCancelOrder(order, permissions);
  const canVoidThisOrder = canVoidOrder(order, permissions);
  const lifecycleCopy = lifecycleAction ? LIFECYCLE_ACTION_COPY[lifecycleAction] : null;
  const lifecycleReasonTrimmed = lifecycleReason.trim();
  const lifecycleHistoryNotice =
    LIFECYCLE_HISTORY_NOTICE[String(order?.status || "").toLowerCase()] || null;

  async function saveAppt(iso) {
    try {
      await updateSiteVisitAtViaRpc(order.id, iso || null);
    } catch (error) {
      alert(error?.message || "Failed to save site visit");
      return;
    }
    refresh();
  }

  async function handleArchiveOrder() {
    if (!order?.id || archiveSubmitting) return;

    setArchiveSubmitting(true);
    setArchiveError("");

    try {
      const reason = archiveReason.trim();
      await archiveOrderViaRpc(order.id, reason || null);
      setArchiveConfirmOpen(false);
      setArchiveReason("");
      success(ARCHIVE_ORDER_COPY.success);
      await refresh();
    } catch {
      setArchiveError(ARCHIVE_ORDER_COPY.failure);
      toastError(ARCHIVE_ORDER_COPY.failure);
    } finally {
      setArchiveSubmitting(false);
    }
  }

  function openLifecycleAction(action) {
    setLifecycleAction(action);
    setLifecycleReason("");
    setLifecycleError("");
  }

  function closeLifecycleAction() {
    setLifecycleAction(null);
    setLifecycleReason("");
    setLifecycleError("");
  }

  async function handleLifecycleAction() {
    if (!order?.id || !lifecycleCopy || lifecycleSubmitting || !lifecycleReasonTrimmed) return;

    setLifecycleSubmitting(true);
    setLifecycleError("");

    try {
      await lifecycleCopy.submit(order.id, lifecycleReasonTrimmed);
      closeLifecycleAction();
      success(lifecycleCopy.success);
      await refresh();
    } catch {
      setLifecycleError(lifecycleCopy.failure);
      toastError(lifecycleCopy.failure);
    } finally {
      setLifecycleSubmitting(false);
    }
  }

  function handlePrintPacket() {
    window.print();
  }

  if (loading) return <div className="p-4 text-sm">Loading...</div>;
  if (loadErr) return <div className="p-4 text-sm text-rose-600">Failed to load order.</div>;
  if (!order) return <div className="p-4 text-sm text-amber-700">Order not found.</div>;

  return (
    <div className="p-4 space-y-4 print:p-0">
      <div className="space-y-4 print:hidden">
        {/* Operational overview */}
        <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-semibold flex items-center gap-3">
              <span>Order {titleNo}</span>
              <OrderStatusBadge status={order.status} />
              <button
                type="button"
                onClick={copyNo}
                title="Copy order number"
                className="text-xs rounded border px-1.5 py-0.5 text-gray-500 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
            <div className="text-xs text-gray-500">Created {fmtDateTime(order.created_at)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canOfferAssignment && (
              <button
                type="button"
                onClick={() => setOfferAssignmentOpen(true)}
                className="px-3 py-1.5 border border-slate-950 bg-slate-950 text-white rounded text-sm font-semibold hover:bg-slate-800"
              >
                Offer Assignment
              </button>
            )}
            {canArchiveThisOrder && (
              <button
                type="button"
                onClick={() => {
                  setArchiveError("");
                  setArchiveConfirmOpen(true);
                }}
                className="px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-800 rounded text-sm font-semibold hover:bg-amber-100"
              >
                Archive order
              </button>
            )}
            {canCancelThisOrder && (
              <button
                type="button"
                onClick={() => openLifecycleAction("cancel")}
                className={LIFECYCLE_ACTION_COPY.cancel.buttonClass}
              >
                Cancel order
              </button>
            )}
            {canVoidThisOrder && (
              <button
                type="button"
                onClick={() => openLifecycleAction("void")}
                className={LIFECYCLE_ACTION_COPY.void.buttonClass}
              >
                Void order
              </button>
            )}
            <button
              type="button"
              onClick={() => setPrintPacketOpen(true)}
              className="px-3 py-1.5 border rounded text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Print Packet
            </button>
            <Link to="/orders" className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              {"<- Back"}
            </Link>
            <Link to={`/orders/${order.id}/edit`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              Edit
            </Link>
          </div>
        </div>
        {order.is_archived === true && (
          <div
            className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            role="status"
          >
            <div className="font-semibold">{ARCHIVE_ORDER_COPY.noticeTitle}</div>
            <div className="mt-1">{ARCHIVE_ORDER_COPY.notice}</div>
          </div>
        )}
        {lifecycleHistoryNotice && (
          <div
            className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            role="status"
          >
            <div className="font-semibold">{lifecycleHistoryNotice.title}</div>
            <div className="mt-1">{lifecycleHistoryNotice.notice}</div>
          </div>
        )}
        <div
          className="mt-4 border-t border-gray-100 pt-4"
          aria-label="Operational Overview"
        >
          <div className="mb-3 text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            Operational Overview
          </div>
          <div className="grid gap-3 lg:grid-cols-12">
            <OverviewSection title="Order / Client" className="lg:col-span-4">
              <SummaryField label="Client" value={clientName} />
              <SummaryField label="AMC" value={amcName} />
            </OverviewSection>

            <OverviewSection title="Property / Assignment" className="lg:col-span-8">
              <SummaryField label="Property Address" value={propertyAddress} />
              <SummaryField label="Property Type" value={order.property_type} />
              <SummaryField label="Report Type" value={order.report_type} />
            </OverviewSection>

            <OverviewSection title="Schedule" className="lg:col-span-7">
              <SummaryField label="Site Visit">
                <SiteVisitPicker value={order.site_visit_at} onChange={saveAppt} />
              </SummaryField>
              <SummaryField label="Review Due" value={fmtDate(reviewDateOf(order))} />
              <SummaryField label="Final Due" value={fmtDate(order.final_due_at ?? order.due_date)} />
              <SummaryField label="Updated" value={fmtDateTime(order.updated_at)} />
            </OverviewSection>

            <OverviewSection title="Team / Fees" className="lg:col-span-5">
              <SummaryField label="Appraiser" value={appraiserName} />
              <SummaryField label="Reviewer" value={order.reviewer_name || "-"} />
              <SummaryField label="Split %" value={order.split_pct != null ? `${order.split_pct}` : "-"} />
              <SummaryField label="Base Fee" value={money(order.base_fee)} />
              <SummaryField label="Appraiser Fee" value={money(order.appraiser_fee)} />
            </OverviewSection>

            <OverviewSection title="Property Contact / Access" className="lg:col-span-12">
              <SummaryField label="Contact" value={contactName} />
              <SummaryField label="Contact Phone" value={contactPhone} />
            </OverviewSection>
          </div>
        </div>

        <OrderAttentionSummaryPanel
          order={order}
          documents={orderFilesLoaded ? orderFiles : null}
          className="mt-4"
        />
        <OperationalInputsReadOnly
          inputs={operationalInputs}
          loading={operationalInputsLoading}
          error={operationalInputsError}
          className="mt-3"
        />
        </div>

        {/* Detail body */}
        <div className="grid grid-cols-12 gap-4 items-start" aria-label="Order detail body">
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property / Map</div>

            <div className="mb-3 text-sm">
              <div className="text-xs text-gray-500 mb-0.5">Address</div>
              <div className="text-gray-800">{addr1 || "-"}</div>
              <div className="text-xs text-gray-500">{addr2 || "-"}</div>
            </div>

            <div className="w-full h-64 md:h-72">
              <GoogleMapEmbed
                addressLine1={order.address_line1 || order.address || order.property_address}
                city={order.city}
                state={order.state}
                zip={order.postal_code || order.zip}
                height={260}
                zoom={13}
              />
            </div>
          </div>

          <FilesCard
            order={order}
            orderId={order.id}
            canArchive={canArchiveDocuments}
            canUpload={canUploadDocuments}
            onFilesLoaded={handleFilesLoaded}
          />
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
              Activity
            </div>
            <ReviewContextSummary
              order={order}
              documents={orderFilesLoaded ? orderFiles : null}
              className="mb-3"
            />
            <ActivityLog orderId={order.id} order={order} showComposer height={420} />
          </div>
        </div>
        </div>

        <OwnerOrderAssignmentsPanel
          orderId={order.id}
          canOfferAssignment={canOfferAssignment}
          onOfferAssignment={() => setOfferAssignmentOpen(true)}
        />

        {/* Notes */}
        <div className="rounded-md bg-white p-3 border">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Notes</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.access_notes || order.notes || "-"}</div>
        </div>

        <OfferAssignmentModal
          open={offerAssignmentOpen}
          order={order}
          onClose={() => setOfferAssignmentOpen(false)}
          onSuccess={(assignmentId) => {
            setOfferAssignmentOpen(false);
            success("Assignment offer created.");
            navigate(`/assignments/${assignmentId}`);
          }}
        />
      </div>

      {printPacketOpen && (
        <div
          className="order-print-surface fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 px-4 py-6 print:static print:inset-auto print:z-auto print:block print:overflow-visible print:bg-white print:p-0"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-print-packet-title"
            className="mx-auto max-w-5xl rounded-lg border bg-white shadow-xl print:max-w-none print:border-0 print:shadow-none"
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3 print:hidden">
              <div>
                <div id="order-print-packet-title" className="text-base font-semibold text-gray-950">
                  Print Packet
                </div>
                <div className="text-xs text-gray-500">
                  Read-only internal summary. Browser print handles output.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPacket}
                  className="rounded border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPacketOpen(false)}
                  className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 print:p-0">
              <OrderPrintPacket
                order={order}
                clientName={clientName}
                amcName={amcName}
                appraiserName={appraiserName}
                fileCount={orderFiles.length}
                documentCategoryCounts={documentCategoryCounts}
              />
            </div>
          </div>
        </div>
      )}

      {archiveConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-order-title"
            className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl"
          >
            <div id="archive-order-title" className="text-base font-semibold text-gray-950">
              {ARCHIVE_ORDER_COPY.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{ARCHIVE_ORDER_COPY.warning}</p>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              {ARCHIVE_ORDER_COPY.reasonLabel}
              <textarea
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                disabled={archiveSubmitting}
                rows={3}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>

            {archiveError && (
              <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {archiveError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveConfirmOpen(false);
                  setArchiveReason("");
                  setArchiveError("");
                }}
                disabled={archiveSubmitting}
                className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveOrder}
                disabled={archiveSubmitting}
                className="rounded border border-amber-700 bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {archiveSubmitting ? "Archiving..." : ARCHIVE_ORDER_COPY.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {lifecycleCopy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-lifecycle-action-title"
            className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl"
          >
            <div id="order-lifecycle-action-title" className="text-base font-semibold text-gray-950">
              {lifecycleCopy.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{lifecycleCopy.warning}</p>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              {lifecycleCopy.reasonLabel}
              <textarea
                value={lifecycleReason}
                onChange={(event) => {
                  setLifecycleReason(event.target.value);
                  setLifecycleError("");
                }}
                disabled={lifecycleSubmitting}
                rows={3}
                required
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>

            {lifecycleError && (
              <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {lifecycleError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeLifecycleAction}
                disabled={lifecycleSubmitting}
                className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLifecycleAction}
                disabled={lifecycleSubmitting || !lifecycleReasonTrimmed}
                className={lifecycleCopy.confirmClass}
              >
                {lifecycleSubmitting ? lifecycleCopy.pendingLabel : lifecycleCopy.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
