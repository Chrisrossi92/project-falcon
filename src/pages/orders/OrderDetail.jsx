// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import GoogleMapEmbed from "@/components/maps/GoogleMapEmbed";
import SiteVisitPicker from "@/components/dates/SiteVisitPicker";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import ActivityLog from "@/components/activity/ActivityLog";
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
import OfferAssignmentModal from "@/features/assignments/components/OfferAssignmentModal";
import OwnerOrderAssignmentsPanel from "@/features/assignments/components/OwnerOrderAssignmentsPanel";
import { updateSiteVisitAtViaRpc } from "@/lib/services/ordersService";

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
const categoryLabel = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Document";

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

function FilesCard({ orderId, canArchive, canUpload }) {
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
      setFiles(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setFiles([]);
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
        if (active) setFiles(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        if (active) {
          setFiles([]);
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
  }, [orderId]);

  const latestFiles = files.slice(0, 5);

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
        <div className="mt-3 text-sm text-gray-500">No files yet</div>
      ) : (
        <div className="mt-3 divide-y divide-gray-100">
          {latestFiles.map((document) => {
            const label = document.title || document.file_name || "Document";
            const size = fileSize(document.file_size);
            const isArchived = document.status === "archived";
            const isBusy = busyId === document.id;

            return (
              <div key={document.id} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900" title={label}>
                      {label}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span>{categoryLabel(document.category)}</span>
                      <span>{fmtDate(document.created_at)}</span>
                      {size && <span>{size}</span>}
                      {isArchived && (
                        <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">
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
                        className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Open
                      </button>
                    )}
                    {canArchive && !isArchived && (
                      <button
                        type="button"
                        onClick={() => handleArchive(document)}
                        disabled={isBusy}
                        className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
  const { success } = useToast();
  const [offerAssignmentOpen, setOfferAssignmentOpen] = useState(false);

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

  async function saveAppt(iso) {
    try {
      await updateSiteVisitAtViaRpc(order.id, iso || null);
    } catch (error) {
      alert(error?.message || "Failed to save site visit");
      return;
    }
    refresh();
  }

  if (loading) return <div className="p-4 text-sm">Loading...</div>;
  if (loadErr) return <div className="p-4 text-sm text-rose-600">Failed to load order.</div>;
  if (!order) return <div className="p-4 text-sm text-amber-700">Order not found.</div>;

  return (
    <div className="p-4 space-y-4">
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
            <Link to="/orders" className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              {"<- Back"}
            </Link>
            <Link to={`/orders/${order.id}/edit`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              Edit
            </Link>
          </div>
        </div>
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
            orderId={order.id}
            canArchive={canArchiveDocuments}
            canUpload={canUploadDocuments}
          />
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
              Activity
            </div>
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
  );
}
