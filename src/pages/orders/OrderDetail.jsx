// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import GoogleMapEmbed from "@/components/maps/GoogleMapEmbed";
import SiteVisitPicker from "@/components/dates/SiteVisitPicker";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import ActivityLog from "@/components/activity/ActivityLog";
import OrderAttentionSummaryPanel from "@/features/orders/attention/OrderAttentionSummaryPanel";
import FileReadinessSummary from "@/features/orders/readiness/FileReadinessSummary";
import OperationalInputsCreateClearControls from "@/features/orders/operational-inputs/OperationalInputsCreateClearControls";
import OperationalInputsReadOnly from "@/features/orders/operational-inputs/OperationalInputsReadOnly";
import useOrderOperationalInputs from "@/features/orders/operational-inputs/useOrderOperationalInputs";
import ReviewContextSummary from "@/features/orders/review/ReviewContextSummary";
import WorkspaceBadge from "@/components/workspace/WorkspaceBadge";
import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";
import useOrder from "@/lib/hooks/useOrder";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { useToast } from "@/lib/hooks/useToast";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { useShellProfile } from "@/lib/shell/useShellProfile";
import { SHELL_PROFILE_IDS } from "@/lib/shell/resolveShellProfile";
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
import { listOwnerAssignmentsForOrder } from "@/features/assignments/api";
import OfferAssignmentModal from "@/features/assignments/components/OfferAssignmentModal";
import OwnerOrderAssignmentsPanel from "@/features/assignments/components/OwnerOrderAssignmentsPanel";
import BidRequestsPanel from "@/features/bids/components/BidRequestsPanel";
import { deriveOrderBidStatus } from "@/features/bids/bidStatus";
import OrderPrintPacket from "@/features/orders/print/OrderPrintPacket";
import VendorAssignmentCandidatesPanel from "@/features/vendors/components/VendorAssignmentCandidatesPanel";
import {
  createBidRequestFromEligibleVendors,
  getMatchingVendorsForOrder,
} from "@/features/vendors/api";
import {
  archiveOrderViaRpc,
  cancelOrderViaRpc,
  clearReview,
  completeOrder,
  markReadyForClient,
  overrideOrderStatusViaRpc,
  requestFinalApproval,
  sendOrderBackToAppraiser,
  sendOrderToReview,
  updateSiteVisitAtViaRpc,
  voidOrderViaRpc,
} from "@/lib/services/ordersService";
import { getSmartOrderActions } from "@/features/orders/smartActions";
import { formatPhoneForDisplay } from "@/lib/utils/phoneFormat";
import { formatOperationalDate } from "@/lib/utils/dateOnly";
import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { getWorkspacePageChrome } from "@/lib/workspace/workspaceIdentity";
import { buildOrderListPath } from "@/features/orders/orderRoutePaths";

/* ---------- helpers ---------- */
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : "-");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "-");
const money = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });
const formatTurnTime = (days) => {
  if (days === null || days === undefined || days === "") return "-";
  const value = Number(days);
  if (!Number.isFinite(value)) return "-";
  return `${value} day${value === 1 ? "" : "s"}`;
};
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
const STATUS_OVERRIDE_TARGETS = Object.freeze([
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "needs_revisions", label: "Needs revisions" },
  { value: "review_cleared", label: "Review cleared" },
  { value: "pending_final_approval", label: "Pending final approval" },
  { value: "ready_for_client", label: "Ready for client" },
  { value: "completed", label: "Completed" },
]);
const TERMINAL_STATUS_OVERRIDE_BLOCKLIST = new Set(["cancelled", "voided"]);
const TERMINAL_BID_REQUEST_STATUS_BLOCKLIST = new Set(["archived", "cancelled", "canceled", "voided", "completed"]);
const ACTIVE_VENDOR_ASSIGNMENT_STATUSES = new Set([
  "offered",
  "accepted",
  "in_progress",
  "submitted",
  "revision_requested",
]);
const BID_STATUS_TONE_CLASSES = Object.freeze({
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  muted: "border-slate-200 bg-slate-100 text-slate-600",
});
const ORDER_SCOPE_BY_OPERATIONS_MODE = Object.freeze({
  [OPERATIONS_MODES.INTERNAL_OPERATIONS]: "internal_operations",
  [OPERATIONS_MODES.AMC_OPERATIONS]: "amc_operations",
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

function formatMatchDimension(value) {
  return categoryLabel(value);
}

function vendorProfileIdOf(vendor) {
  return vendor?.vendorProfileId || vendor?.vendor_profile_id || vendor?.id || null;
}

function vendorCompanyNameOf(vendor) {
  return (
    vendor?.vendorCompanyName ||
    vendor?.vendor_company_name ||
    vendor?.companyName ||
    vendor?.company_name ||
    "Vendor"
  );
}

function EligibleVendorsPanel({
  order,
  orderId,
  enabled,
  canRequestBids,
  onBidRequestCreated,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [requestMessage, setRequestMessage] = useState("");
  const [responseDueDate, setResponseDueDate] = useState("");
  const [vendorDueDate, setVendorDueDate] = useState("");
  const [clientDueDate, setClientDueDate] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!enabled || !orderId) {
      setRows([]);
      setLoading(false);
      setLoadError(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    getMatchingVendorsForOrder(orderId)
      .then((matchingVendors) => {
        if (!active) return;
        setRows(Array.isArray(matchingVendors) ? matchingVendors : []);
      })
      .catch((error) => {
        if (!active) return;
        console.warn("[EligibleVendorsPanel] deterministic vendor matching failed", {
          code: error?.code,
          message: error?.message,
        });
        setRows([]);
        setLoadError(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, orderId]);

  if (!enabled) return null;

  const visibleRows = rows.filter((vendor) => Boolean(vendorProfileIdOf(vendor)));
  const canOpenRequestModal = Boolean(canRequestBids) && !loading && !loadError && visibleRows.length > 0;
  const selectedVendorSet = new Set(selectedVendorIds);
  const selectedRows = visibleRows.filter((vendor) => selectedVendorSet.has(vendorProfileIdOf(vendor)));
  const requestMessageTrimmed = requestMessage.trim();
  const canSubmitBidRequest =
    selectedRows.length > 0 &&
    Boolean(requestMessageTrimmed) &&
    Boolean(responseDueDate) &&
    !submitting;

  function openRequestBidsModal() {
    setSelectedVendorIds(visibleRows.map((vendor) => vendorProfileIdOf(vendor)));
    setRequestMessage("");
    setResponseDueDate("");
    setVendorDueDate("");
    setClientDueDate("");
    setSubmitError("");
    setRequestModalOpen(true);
  }

  function closeRequestBidsModal() {
    if (submitting) return;
    setRequestModalOpen(false);
    setSubmitError("");
  }

  function toggleSelectedVendor(vendorProfileId) {
    setSelectedVendorIds((current) =>
      current.includes(vendorProfileId)
        ? current.filter((id) => id !== vendorProfileId)
        : [...current, vendorProfileId],
    );
  }

  async function submitBidRequest() {
    if (!canSubmitBidRequest) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      await createBidRequestFromEligibleVendors(
        orderId,
        selectedRows.map((vendor) => vendorProfileIdOf(vendor)),
        {
          request_message: requestMessageTrimmed,
          response_due_at: responseDueDate,
          desired_vendor_due_at: vendorDueDate || null,
          client_due_at: clientDueDate || null,
        },
      );
      setRequestModalOpen(false);
      onBidRequestCreated?.();
    } catch (error) {
      setSubmitError(error?.message || "Could not request bids from eligible vendors.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-label="Eligible vendors" className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Eligible vendors</h2>
          <p className="mt-1 text-xs text-slate-500">
            Deterministic coverage matching only. This is not a recommendation, score, ranking, or bid request.
          </p>
        </div>
        {canOpenRequestModal && (
          <button
            type="button"
            onClick={openRequestBidsModal}
            className="rounded border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Request bids
          </button>
        )}
      </div>

      <div className="mt-3 text-sm text-slate-600">
        {loading ? (
          <div>Loading eligible vendors...</div>
        ) : loadError ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
            Eligible vendor matching could not load.
          </div>
        ) : rows.length === 0 ? (
          <div>No eligible vendors matched this order&apos;s normalized coverage.</div>
        ) : (
          <div className="grid gap-2">
            {rows.map((vendor) => {
              const key = vendorProfileIdOf(vendor) || vendor.company_id || vendor.vendorCompanyId;
              const companyName = vendorCompanyNameOf(vendor);

              return (
                <article key={key} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="font-medium text-slate-950">{companyName}</div>
                  <dl className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">State</dt>
                      <dd className="mt-0.5">{vendor.matchedState || vendor.matched_state || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">County</dt>
                      <dd className="mt-0.5">{vendor.matchedCounty || vendor.matched_county || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Property type</dt>
                      <dd className="mt-0.5">
                        {formatMatchDimension(vendor.matchedPropertyType || vendor.matched_property_type)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Assignment type</dt>
                      <dd className="mt-0.5">
                        {formatMatchDimension(vendor.matchedAssignmentType || vendor.matched_assignment_type)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {requestModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="eligible-vendor-bid-request-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="eligible-vendor-bid-request-title" className="text-base font-semibold text-slate-950">
                  Request bids from eligible vendors
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Bid requests will be sent only after you confirm this action. Matching is deterministic coverage matching, not a score or recommendation.
                </p>
              </div>
              <button
                type="button"
                onClick={closeRequestBidsModal}
                className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Confirm the selected vendors before sending. This will create bid request recipient records; it will not create an assignment.
            </div>

            <fieldset className="mt-4 space-y-2">
              <legend className="text-sm font-semibold text-slate-800">Selected vendors</legend>
              {visibleRows.map((vendor) => {
                const vendorProfileId = vendorProfileIdOf(vendor);
                const selected = selectedVendorSet.has(vendorProfileId);
                return (
                  <label
                    key={vendorProfileId}
                    className="flex gap-3 rounded-md border border-slate-200 p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelectedVendor(vendorProfileId)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium text-slate-950">{vendorCompanyNameOf(vendor)}</span>
                      <span className="mt-1 block text-xs text-slate-600">
                        {vendor.matchedState || vendor.matched_state || "-"} / {vendor.matchedCounty || vendor.matched_county || "-"} /{" "}
                        {formatMatchDimension(vendor.matchedPropertyType || vendor.matched_property_type)} /{" "}
                        {formatMatchDimension(vendor.matchedAssignmentType || vendor.matched_assignment_type)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-sm font-medium text-slate-800">Message/instructions</span>
                <textarea
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`Please provide a fee and timing for order ${order?.order_number || ""}.`}
                />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-800">Response due date</span>
                <input
                  type="date"
                  value={responseDueDate}
                  onChange={(event) => setResponseDueDate(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-800">Vendor due date</span>
                <input
                  type="date"
                  value={vendorDueDate}
                  onChange={(event) => setVendorDueDate(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-800">Client due date</span>
                <input
                  type="date"
                  value={clientDueDate}
                  onChange={(event) => setClientDueDate(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            {submitError && (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {submitError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRequestBidsModal}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBidRequest}
                disabled={!canSubmitBidRequest}
                className="rounded border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send bid requests"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function resolveOrderWorkspaceRedirect(orderOperationsScope, operationsMode) {
  const expectedScope = ORDER_SCOPE_BY_OPERATIONS_MODE[operationsMode];
  if (!expectedScope) return null;

  const actualScope = orderOperationsScope || "internal_operations";
  if (actualScope === expectedScope) return null;

  return {
    expectedScope,
    actualScope,
    redirectPath: "/dashboard",
  };
}

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
    <WorkspaceSurface variant="evidence" className={`bg-white p-3 ${className}`}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </WorkspaceSurface>
  );
}

function BidStatusSummaryCard({ summary, activeVendorAssignment, order }) {
  if (!summary) return null;

  const toneClass = BID_STATUS_TONE_CLASSES[summary.tone] || BID_STATUS_TONE_CLASSES.neutral;
  const assignmentPacketPath = activeVendorAssignment?.id
    ? `/assignments/${activeVendorAssignment.id}`
    : null;
  const acceptedFee = summary.selectedFee ?? null;
  const feeLabel = acceptedFee != null ? "Accepted Fee" : "Lowest Fee";
  const feeValue = acceptedFee != null ? money(acceptedFee) : money(summary.lowestFee);
  const turnTimeValue =
    summary.selectedTurnTimeDays != null
      ? formatTurnTime(summary.selectedTurnTimeDays)
      : summary.fastestTurnTimeDays != null
        ? formatTurnTime(summary.fastestTurnTimeDays)
        : formatOperationalDate(summary.selectedProposedDueAt || summary.earliestProposedDueAt);
  const clientDueAt = summary.clientDueAt || order?.client_due_at || order?.final_due_at || order?.due_date;

  return (
    <section
      aria-label="AMC bid status"
      className="mt-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            AMC bid status
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${toneClass}`}>
              {summary.label}
            </span>
            <span className="text-sm text-slate-500">
              {summary.contactedCount} contacted / {summary.respondedCount} responded
            </span>
          </div>
        </div>
        {summary.assignmentStatus && (
          <div className="text-left md:text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Assignment status
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {categoryLabel(summary.assignmentStatus)}
            </div>
            {assignmentPacketPath && (
              <Link
                to={assignmentPacketPath}
                className="mt-2 inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Packet
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryField label={feeLabel} value={feeValue} />
        <SummaryField label="Turn Time" value={turnTimeValue || "-"} />
        <SummaryField label="Selected Vendor" value={summary.selectedVendorName || "-"} />
        <SummaryField label="Vendor Due" value={formatOperationalDate(summary.selectedProposedDueAt)} />
        <SummaryField label="Client Due" value={formatOperationalDate(clientDueAt)} />
      </div>
    </section>
  );
}

function VendorAssignmentSummaryCard({ assignment, summary }) {
  const vendorName = assignment?.assigned_company_name || summary?.selectedVendorName || "-";
  const status = assignment?.status || summary?.assignmentStatus;
  const acceptedFee = assignment?.accepted_fee_amount ?? summary?.selectedFee;
  const turnTimeDays = assignment?.accepted_turn_time_days ?? summary?.selectedTurnTimeDays;
  const vendorDueAt =
    assignment?.accepted_vendor_due_at ||
    assignment?.due_at ||
    summary?.selectedProposedDueAt ||
    null;

  return (
    <OverviewSection title="Vendor Assignment" className="lg:col-span-5">
      <SummaryField label="Vendor" value={vendorName} />
      <SummaryField label="Assignment Status" value={status ? categoryLabel(status) : "-"} />
      <SummaryField label="Accepted Fee" value={money(acceptedFee)} />
      <SummaryField label="Turn Time" value={formatTurnTime(turnTimeDays)} />
      <SummaryField label="Vendor Due" value={formatOperationalDate(vendorDueAt)} />
      <SummaryField label="Accepted On" value={formatOperationalDate(assignment?.accepted_at)} />
    </OverviewSection>
  );
}

function FilesCard({ order, orderId, canArchive, canUpload, onFilesLoaded, showReadinessSummary = true }) {
  const { success, error: toastError } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [archiveCandidate, setArchiveCandidate] = useState(null);
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
  const archiveCandidateLabel =
    archiveCandidate?.title || archiveCandidate?.file_name || "this file";

  async function handleDownload(document) {
    setBusyId(document.id);

    try {
      const result = await createOrderDocumentDownloadUrl(document.id);
      window.open(result.signed_url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      toastError(downloadError?.message || "Could not open this file.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive() {
    if (!archiveCandidate) return;

    setBusyId(archiveCandidate.id);

    try {
      await archiveOrderDocument(archiveCandidate.id);
      setArchiveCandidate(null);
      success("File archived.");
      await loadFiles();
    } catch (archiveError) {
      toastError(archiveError?.message || "Could not archive this file.");
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
    <WorkspaceSurface
      as="div"
      variant="secondary"
      className="bg-white p-3"
      aria-label="Order files"
    >
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

      {showReadinessSummary && !loading && !error && (
        <FileReadinessSummary order={order} documents={files} className="mt-3" />
      )}

      {archiveCandidate && (
        <div
          role="alertdialog"
          aria-label="Archive file"
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <div className="font-semibold">Archive {archiveCandidateLabel}?</div>
          <div className="mt-1 text-xs text-amber-800">
            This removes the file from active document lists. It does not delete the order or
            activity history.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setArchiveCandidate(null)}
              disabled={busyId === archiveCandidate.id}
              className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={busyId === archiveCandidate.id}
              className="rounded border border-amber-700 bg-amber-700 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {busyId === archiveCandidate.id ? "Archiving..." : "Archive file"}
            </button>
          </div>
        </div>
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
        <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
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
                              onClick={() => setArchiveCandidate(document)}
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
    </WorkspaceSurface>
  );
}

/* ============================== component ============================== */
export default function OrderDetail() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { order, loading, error: loadErr, refresh } = useOrder(id);
  const permissions = useEffectivePermissions();
  const shellProfile = useShellProfile();
  const { operationsMode } = useOperationsMode();
  const { success, error: toastError } = useToast();
  const [offerAssignmentOpen, setOfferAssignmentOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [statusOverrideOpen, setStatusOverrideOpen] = useState(false);
  const [statusOverrideTarget, setStatusOverrideTarget] = useState("");
  const [statusOverrideReason, setStatusOverrideReason] = useState("");
  const [statusOverrideSubmitting, setStatusOverrideSubmitting] = useState(false);
  const [statusOverrideError, setStatusOverrideError] = useState("");
  const [smartActionSubmitting, setSmartActionSubmitting] = useState("");
  const [smartActionError, setSmartActionError] = useState("");
  const [lifecycleAction, setLifecycleAction] = useState(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);
  const [lifecycleError, setLifecycleError] = useState("");
  const [printPacketOpen, setPrintPacketOpen] = useState(false);
  const [orderFiles, setOrderFiles] = useState([]);
  const [orderFilesLoaded, setOrderFilesLoaded] = useState(false);
  const [ownerAssignments, setOwnerAssignments] = useState([]);
  const [ownerAssignmentsLoading, setOwnerAssignmentsLoading] = useState(false);
  const [ownerAssignmentsError, setOwnerAssignmentsError] = useState(null);
  const [bidRequestRows, setBidRequestRows] = useState([]);
  const [bidRequestsRefreshToken, setBidRequestsRefreshToken] = useState(0);
  const {
    inputs: operationalInputs,
    loading: operationalInputsLoading,
    error: operationalInputsError,
    refresh: refreshOperationalInputs,
  } = useOrderOperationalInputs(id);

  // Display names
  const [clientName, setClientName] = useState("-");
  const [amcName, setAmcName] = useState("-");
  const [appraiserName, setAppraiserName] = useState("-");
  const orderId = order?.id;
  const orderOperationsScope = order?.operations_scope;
  const orderDetailChrome = getWorkspacePageChrome(operationsMode, "orderDetail");
  const orderWorkspaceRedirect = useMemo(
    () => (orderId ? resolveOrderWorkspaceRedirect(orderOperationsScope, operationsMode) : null),
    [operationsMode, orderId, orderOperationsScope],
  );

  useEffect(() => {
    if (order) {
      setClientName(order.client_name || "-");
      setAmcName(order.amc_name || "-");
      setAppraiserName(order.appraiser_name || "-");
    }
  }, [order]);

  useEffect(() => {
    if (!orderWorkspaceRedirect) return;

    setOfferAssignmentOpen(false);
    setArchiveConfirmOpen(false);
    setArchiveReason("");
    setArchiveError("");
    setMoreActionsOpen(false);
    setStatusOverrideOpen(false);
    setStatusOverrideTarget("");
    setStatusOverrideReason("");
    setStatusOverrideError("");
    setLifecycleAction(null);
    setLifecycleReason("");
    setLifecycleError("");
    setPrintPacketOpen(false);
    setOrderFiles([]);
    setOrderFilesLoaded(false);
    setOwnerAssignments([]);
    setOwnerAssignmentsError(null);
    setBidRequestRows([]);
    setBidRequestsRefreshToken(0);

    navigate(orderWorkspaceRedirect.redirectPath, {
      replace: true,
      state: {
        workspaceRedirect: {
          from: "order_detail",
          selectedOperationsMode: operationsMode,
          expectedOrderScope: orderWorkspaceRedirect.expectedScope,
          actualOrderScope: orderWorkspaceRedirect.actualScope,
        },
      },
    });
  }, [navigate, operationsMode, orderWorkspaceRedirect]);

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
  const contactPhone = formatPhoneForDisplay(order?.property_contact_phone || order?.entry_contact_phone || "");

  const copyNo = () => navigator.clipboard?.writeText(titleNo).catch(() => {});
  const handleFilesLoaded = React.useCallback((files) => {
    setOrderFiles(Array.isArray(files) ? files : []);
    setOrderFilesLoaded(true);
  }, []);
  const documentCategoryCounts = useMemo(
    () => buildDocumentCategoryCounts(orderFiles),
    [orderFiles],
  );
  const isAppraiserExecutionWorkspace = shellProfile.profileId === SHELL_PROFILE_IDS.MY_WORK;
  const isReviewerReviewWorkspace = shellProfile.profileId === SHELL_PROFILE_IDS.REVIEW_QUEUE;
  const isOwnerAdminStaffAppraisalShell =
    shellProfile.profileId === SHELL_PROFILE_IDS.OPERATIONS ||
    Boolean(shellProfile.appContext?.is_owner || shellProfile.appContext?.is_admin_role);
  const showManagementSurfaces = !isAppraiserExecutionWorkspace && !isReviewerReviewWorkspace;
  const showAssignmentSurfaces = showManagementSurfaces && !isOwnerAdminStaffAppraisalShell;
  const showDerivedContextSurfaces = showManagementSurfaces && !isReviewerReviewWorkspace;
  const showOrderEditAction = showManagementSurfaces && !isReviewerReviewWorkspace;
  const overviewLabel = isReviewerReviewWorkspace ? "Order Summary" : "Operational Overview";

  const canOfferAssignment =
    showAssignmentSurfaces &&
    !permissions.loading &&
    !permissions.error &&
    permissions.hasAllPermissions([
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_OFFER,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.RELATIONSHIPS_ASSIGN_WORK,
      PERMISSIONS.RELATIONSHIPS_READ,
    ]);
  const canReadOwnerAssignments =
    !permissions.loading &&
    !permissions.error &&
    permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER);
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
  const canArchiveThisOrder = showManagementSurfaces && canArchiveOrder(order, permissions);
  const canCancelThisOrder = showManagementSurfaces && canCancelOrder(order, permissions);
  const canVoidThisOrder = showManagementSurfaces && canVoidOrder(order, permissions);
  const normalizedOrderStatus = String(order?.status || "").toLowerCase().trim();
  const canOverrideOrderStatus =
    showManagementSurfaces &&
    isOwnerAdminStaffAppraisalShell &&
    !permissions.loading &&
    !permissions.error &&
    !order?.is_archived &&
    !TERMINAL_STATUS_OVERRIDE_BLOCKLIST.has(normalizedOrderStatus) &&
    permissions.hasPermission(PERMISSIONS.WORKFLOW_OVERRIDE_STATUS);
  const smartActionRole = isOwnerAdminStaffAppraisalShell
    ? "admin"
    : isReviewerReviewWorkspace
      ? "reviewer"
      : "appraiser";
  const showVendorCandidatePanel =
    operationsMode === OPERATIONS_MODES.AMC_OPERATIONS &&
    order?.operations_scope === "amc_operations" &&
    !permissions.loading &&
    !permissions.error &&
    permissions.hasPermission(PERMISSIONS.VENDORS_READ) &&
    Boolean(order?.id);
  const showEligibleVendorsPanel = showVendorCandidatePanel;
  const canRequestEligibleVendorBids =
    showEligibleVendorsPanel &&
    !order?.is_archived &&
    !TERMINAL_BID_REQUEST_STATUS_BLOCKLIST.has(normalizedOrderStatus) &&
    permissions.hasPermission(PERMISSIONS.BID_REQUESTS_CREATE) &&
    permissions.hasPermission(PERMISSIONS.VENDORS_READ);
  const showBidRequestsPanel =
    operationsMode === OPERATIONS_MODES.AMC_OPERATIONS &&
    order?.operations_scope === "amc_operations" &&
    !permissions.loading &&
    !permissions.error &&
    permissions.hasPermission(PERMISSIONS.BID_REQUESTS_READ) &&
    Boolean(order?.id);
  const canRecordBidResponses =
    showBidRequestsPanel &&
    permissions.hasPermission(PERMISSIONS.BID_REQUESTS_UPDATE);
  const canSelectBidResponses =
    showBidRequestsPanel &&
    permissions.hasPermission(PERMISSIONS.BID_REQUESTS_SELECT);
  const canCreateBidAssignmentOffer =
    showBidRequestsPanel &&
    permissions.hasAllPermissions([
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_OFFER,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.RELATIONSHIPS_ASSIGN_WORK,
    ]);
  const canOfferVendorCandidateAssignment =
    showVendorCandidatePanel &&
    permissions.hasAllPermissions([
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_OFFER,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.RELATIONSHIPS_ASSIGN_WORK,
    ]);
  const shouldLoadOwnerAssignments =
    Boolean(order?.id) &&
    canReadOwnerAssignments &&
    (showAssignmentSurfaces || showVendorCandidatePanel || showBidRequestsPanel);
  const activeVendorAssignment = useMemo(
    () =>
      ownerAssignments.find(
        (assignment) =>
          assignment?.assignment_type === "vendor_appraisal" &&
          ACTIVE_VENDOR_ASSIGNMENT_STATUSES.has(String(assignment?.status || "")),
      ) || null,
    [ownerAssignments],
  );
  const isAmcOrderDetail =
    operationsMode === OPERATIONS_MODES.AMC_OPERATIONS &&
    order?.operations_scope === "amc_operations";
  const hasActiveVendorAssignment = Boolean(activeVendorAssignment);
  const bidStatusSummary = useMemo(
    () => deriveOrderBidStatus({
      bidRequests: bidRequestRows,
      activeVendorAssignment,
    }),
    [activeVendorAssignment, bidRequestRows],
  );
  const lifecycleCopy = lifecycleAction ? LIFECYCLE_ACTION_COPY[lifecycleAction] : null;
  const lifecycleReasonTrimmed = lifecycleReason.trim();
  const statusOverrideReasonTrimmed = statusOverrideReason.trim();
  const statusOverrideWorkspaceLabel = isAmcOrderDetail ? "Falcon AMC" : "Internal";
  const smartActionWorkspaceLabel = statusOverrideWorkspaceLabel;
  const canSubmitStatusOverride =
    Boolean(statusOverrideTarget) &&
    statusOverrideTarget !== normalizedOrderStatus &&
    Boolean(statusOverrideReasonTrimmed) &&
    !statusOverrideSubmitting;
  const lifecycleHistoryNotice =
    LIFECYCLE_HISTORY_NOTICE[String(order?.status || "").toLowerCase()] || null;

  const runSmartWorkflowAction = React.useCallback(async (actionId, runner) => {
    if (!order?.id || smartActionSubmitting) return;

    setSmartActionSubmitting(actionId);
    setSmartActionError("");

    try {
      await runner();
      success("Workflow action completed.");
      await refresh();
    } catch (error) {
      const message = error?.message || "Could not complete the recommended workflow action.";
      setSmartActionError(message);
      toastError(message);
    } finally {
      setSmartActionSubmitting("");
    }
  }, [order?.id, refresh, smartActionSubmitting, success, toastError]);

  const smartWorkflowActions = useMemo(() => {
    if (!order || order.is_archived || TERMINAL_STATUS_OVERRIDE_BLOCKLIST.has(normalizedOrderStatus)) {
      return [];
    }

    return getSmartOrderActions({
      order,
      role: smartActionRole,
      permissions: {
        loading: permissions.loading,
        error: permissions.error,
        canSubmitToReview: permissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_SUBMIT_TO_REVIEW),
        canResubmit: permissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_RESUBMIT),
        canRequestRevisions: permissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS),
        canApproveReview: permissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_APPROVE_REVIEW),
        canReadyForClient: permissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_READY_FOR_CLIENT),
        canComplete: permissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_COMPLETE),
      },
      handlers: {
        onSendToReview: () =>
          runSmartWorkflowAction("send_to_review", () => sendOrderToReview(order.id, null)),
        onSendBackToAppraiser: () =>
          runSmartWorkflowAction("send_back_to_appraiser", () =>
            sendOrderBackToAppraiser(order.id, null),
          ),
        onClearReview: () =>
          runSmartWorkflowAction("clear_review", () => clearReview(order.id)),
        onRequestFinalApproval: () =>
          runSmartWorkflowAction("request_final_approval", () => requestFinalApproval(order.id)),
        onReadyForClient: () =>
          runSmartWorkflowAction("ready_for_client", () => markReadyForClient(order.id)),
        onComplete: () =>
          runSmartWorkflowAction("complete", () => completeOrder(order.id, null)),
      },
    });
  }, [
    normalizedOrderStatus,
    order,
    permissions,
    runSmartWorkflowAction,
    smartActionRole,
  ]);
  const visibleSmartActions = smartWorkflowActions.filter((action) => action.visible);
  const primarySmartAction =
    visibleSmartActions.find((action) => action.isPrimary && !action.disabled) ||
    visibleSmartActions.find((action) => !action.disabled) ||
    null;

  async function saveAppt(iso) {
    try {
      await updateSiteVisitAtViaRpc(order.id, iso || null);
    } catch (error) {
      toastError(error?.message || "Failed to save site visit");
      return;
    }
    refresh();
  }

  const loadOwnerAssignments = React.useCallback(async () => {
    if (!shouldLoadOwnerAssignments) {
      setOwnerAssignments([]);
      setOwnerAssignmentsError(null);
      setOwnerAssignmentsLoading(false);
      return;
    }

    setOwnerAssignmentsLoading(true);
    setOwnerAssignmentsError(null);
    try {
      const rows = await listOwnerAssignmentsForOrder(order.id);
      setOwnerAssignments(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setOwnerAssignments([]);
      setOwnerAssignmentsError(error);
    } finally {
      setOwnerAssignmentsLoading(false);
    }
  }, [order?.id, shouldLoadOwnerAssignments]);

  useEffect(() => {
    loadOwnerAssignments();
  }, [loadOwnerAssignments]);

  useEffect(() => {
    if (!showBidRequestsPanel) {
      setBidRequestRows([]);
    }
  }, [order?.id, showBidRequestsPanel]);

  const handleBidRequestsChange = React.useCallback((rows) => {
    setBidRequestRows(Array.isArray(rows) ? rows : []);
  }, []);

  const handleBidAssignmentOfferCreated = React.useCallback(async () => {
    success("Assignment offer created.");
    await loadOwnerAssignments();
    setBidRequestsRefreshToken((value) => value + 1);
  }, [loadOwnerAssignments, success]);

  const handleEligibleVendorBidRequestCreated = React.useCallback(async () => {
    success("Bid requests sent to selected eligible vendors.");
    setBidRequestsRefreshToken((value) => value + 1);
    await refresh();
  }, [refresh, success]);

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

  function openStatusOverride() {
    setMoreActionsOpen(false);
    setStatusOverrideTarget("");
    setStatusOverrideReason("");
    setStatusOverrideError("");
    setStatusOverrideOpen(true);
  }

  function closeStatusOverride() {
    setStatusOverrideOpen(false);
    setStatusOverrideTarget("");
    setStatusOverrideReason("");
    setStatusOverrideError("");
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

  async function handleStatusOverride() {
    if (!order?.id || !canSubmitStatusOverride) return;

    setStatusOverrideSubmitting(true);
    setStatusOverrideError("");

    try {
      await overrideOrderStatusViaRpc(order.id, statusOverrideTarget, statusOverrideReasonTrimmed);
      closeStatusOverride();
      success("Order status overridden. The override reason was recorded in activity.");
      await refresh();
    } catch (error) {
      const message = error?.message || "Could not override order status. No changes were made.";
      setStatusOverrideError(message);
      toastError(message);
    } finally {
      setStatusOverrideSubmitting(false);
    }
  }

  function handlePrintPacket() {
    window.print();
  }

  if (loading) return <div className="p-4 text-sm">Loading...</div>;
  if (loadErr) return <div className="p-4 text-sm text-rose-600">Failed to load order.</div>;
  if (!order) return <div className="p-4 text-sm text-amber-700">Order not found.</div>;
  if (orderWorkspaceRedirect) {
    return <div className="p-4 text-sm text-slate-600">Switching workspace...</div>;
  }

  return (
    <div className="p-4 space-y-4 print:p-0">
      <div className="space-y-4 print:hidden">
        {/* Operational overview */}
        <WorkspaceSurface variant="primary" className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <WorkspaceBadge operationsMode={operationsMode} />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {orderDetailChrome.eyebrow || "Order Detail"}
              </span>
            </div>
            <div className="text-lg font-semibold flex items-center gap-3">
              <span>{orderDetailChrome.title || "Order"} {titleNo}</span>
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
            {orderDetailChrome.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {orderDetailChrome.description}
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[320px] md:items-end">
            <section
              aria-label="Recommended workflow action"
              className="w-full rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-800 shadow-sm md:max-w-[380px]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                    Recommended next step
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {smartActionWorkspaceLabel} workflow guidance
                  </div>
                  {smartActionError ? (
                    <div className="mt-2 text-xs font-medium text-rose-700">{smartActionError}</div>
                  ) : null}
                </div>
                {primarySmartAction ? (
                  <button
                    type="button"
                    onClick={primarySmartAction.onClick}
                    disabled={primarySmartAction.disabled || Boolean(smartActionSubmitting)}
                    className="shrink-0 rounded-md border border-sky-700 bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {smartActionSubmitting === primarySmartAction.id
                      ? "Working..."
                      : primarySmartAction.label}
                  </button>
                ) : (
                  <div className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                    No guided action
                  </div>
                )}
              </div>
            </section>
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2">
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
              {canOverrideOrderStatus && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreActionsOpen((value) => !value)}
                    aria-expanded={moreActionsOpen}
                    aria-haspopup="menu"
                    className="px-3 py-1.5 border rounded text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    More actions
                  </button>
                  {moreActionsOpen && (
                    <div
                      role="menu"
                      aria-label="More order actions"
                      className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={openStatusOverride}
                        className="w-full rounded px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Override status
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setPrintPacketOpen(true)}
                className="px-3 py-1.5 border rounded text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Print Packet
              </button>
              <Link to={buildOrderListPath(pathname)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
                {"<- Back"}
              </Link>
              {showOrderEditAction && (
                <Link to={`/orders/${order.id}/edit`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
                  Edit
                </Link>
              )}
            </div>
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
        {showBidRequestsPanel && (
          <BidStatusSummaryCard
            summary={bidStatusSummary}
            activeVendorAssignment={activeVendorAssignment}
            order={order}
          />
        )}
        {showDerivedContextSurfaces && (
          <OrderAttentionSummaryPanel
            order={order}
            documents={orderFilesLoaded ? orderFiles : null}
            className="mt-4"
          />
        )}
        {showDerivedContextSurfaces && (
          <>
            <OperationalInputsCreateClearControls
              orderId={order.id}
              inputs={operationalInputs}
              onChanged={refreshOperationalInputs}
              className="mt-3"
            />
            <OperationalInputsReadOnly
              inputs={operationalInputs}
              loading={operationalInputsLoading}
              error={operationalInputsError}
              className="mt-3"
            />
          </>
        )}
        <div
          className="mt-4 border-t border-gray-100 pt-4"
          aria-label={overviewLabel}
        >
          <div className="mb-3 text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            {overviewLabel}
          </div>
          <div className="grid gap-3 lg:grid-cols-12">
            <OverviewSection title="Order / Client" className="lg:col-span-4">
              <SummaryField label="Client" value={clientName} />
              {isAmcOrderDetail && <SummaryField label="AMC" value={amcName} />}
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
              <SummaryField label="Review Due" value={formatOperationalDate(reviewDateOf(order))} />
              <SummaryField label="Final Due" value={formatOperationalDate(order.final_due_at ?? order.due_date)} />
              <SummaryField label="Updated" value={fmtDateTime(order.updated_at)} />
            </OverviewSection>

            {isAmcOrderDetail ? (
              <VendorAssignmentSummaryCard
                assignment={activeVendorAssignment}
                summary={bidStatusSummary}
              />
            ) : (
              <OverviewSection title="Team / Fees" className="lg:col-span-5">
                <SummaryField label="Appraiser" value={appraiserName} />
                <SummaryField label="Reviewer" value={order.reviewer_name || "-"} />
                <SummaryField label="Split %" value={order.split_pct != null ? `${order.split_pct}` : "-"} />
                <SummaryField label="Base Fee" value={money(order.base_fee)} />
                <SummaryField label="Appraiser Fee" value={money(order.appraiser_fee)} />
              </OverviewSection>
            )}

            <OverviewSection title="Property Contact" className="lg:col-span-12">
              <SummaryField label="Contact" value={contactName} />
              <SummaryField label="Contact Phone" value={contactPhone} />
            </OverviewSection>
          </div>
        </div>
        </WorkspaceSurface>

        {/* Detail body */}
        <div className="grid grid-cols-12 gap-4 items-start" aria-label="Order detail body">
        <div className="col-span-12 lg:col-span-7">
          <WorkspaceSurface variant="primary" className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
              Activity
            </div>
            {!isReviewerReviewWorkspace && (
              <ReviewContextSummary
                order={order}
                documents={orderFilesLoaded ? orderFiles : null}
                className="mb-3"
              />
            )}
            <ActivityLog orderId={order.id} order={order} showComposer height={360} />
          </WorkspaceSurface>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <WorkspaceSurface variant="secondary" className="bg-white p-3">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Contacts / Map</div>

            <div className="mb-3 text-sm">
              <div className="text-xs text-gray-500 mb-0.5">Address</div>
              <div className="text-gray-800">{addr1 || "-"}</div>
              <div className="text-xs text-gray-500">{addr2 || "-"}</div>
            </div>

            <div className="mb-3 grid gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Property Contact</div>
                <div className="text-gray-800">{contactName || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Contact Phone</div>
                <div className="text-gray-800">{contactPhone || "-"}</div>
              </div>
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
          </WorkspaceSurface>
        </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-start" aria-label="Order support body">
          <div className="col-span-12 lg:col-span-7">
            <FilesCard
              order={order}
              orderId={order.id}
              canArchive={canArchiveDocuments}
              canUpload={canUploadDocuments}
              onFilesLoaded={handleFilesLoaded}
              showReadinessSummary={!isReviewerReviewWorkspace}
            />
          </div>

          <div className="col-span-12 lg:col-span-5">
            <WorkspaceSurface variant="evidence" className="bg-white p-3" aria-label="Order notes">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Notes
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/40 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {order.notes || "-"}
              </div>
            </WorkspaceSurface>
          </div>
        </div>

        {showAssignmentSurfaces && (
          <OwnerOrderAssignmentsPanel
            orderId={order.id}
            canOfferAssignment={canOfferAssignment}
            onOfferAssignment={() => setOfferAssignmentOpen(true)}
            assignmentRows={ownerAssignments}
            assignmentsLoading={ownerAssignmentsLoading}
            assignmentsError={ownerAssignmentsError}
            onRefreshAssignments={loadOwnerAssignments}
          />
        )}

        {(showVendorCandidatePanel || showBidRequestsPanel) && (
          <div id="amc-procurement">
            {hasActiveVendorAssignment ? (
              <details className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Show Procurement Details
                </summary>
                <div className="mt-3 space-y-4">
                  {showEligibleVendorsPanel && (
                    <EligibleVendorsPanel
                      order={order}
                      orderId={order.id}
                      enabled={showEligibleVendorsPanel}
                      canRequestBids={canRequestEligibleVendorBids}
                      onBidRequestCreated={handleEligibleVendorBidRequestCreated}
                    />
                  )}

                  {showVendorCandidatePanel && (
                    <VendorAssignmentCandidatesPanel
                      orderId={order.id}
                      enabled={showVendorCandidatePanel}
                      activeVendorAssignment={activeVendorAssignment}
                      canOfferAssignment={canOfferVendorCandidateAssignment}
                      orderDueAt={order.final_due_at ?? order.due_date ?? null}
                      orderSummary={{
                        property_address: order.property_address || order.address,
                        address: order.address,
                        city: order.city,
                        state: order.state,
                        postal_code: order.postal_code || order.zip,
                        property_type: order.property_type,
                        report_type: order.report_type,
                        client_due_at: order.client_due_at,
                        final_due_at: order.final_due_at,
                        due_date: order.due_date,
                      }}
                      onOfferSuccess={async () => {
                        success("Assignment offer sent.");
                        await loadOwnerAssignments();
                      }}
                      onBidRequestSuccess={() => {
                        success("Bid request created.");
                        setBidRequestsRefreshToken((value) => value + 1);
                      }}
                    />
                  )}

                  {showBidRequestsPanel && (
                    <BidRequestsPanel
                      orderId={order.id}
                      enabled={showBidRequestsPanel}
                      hasActiveVendorAssignment={hasActiveVendorAssignment}
                      canRecordResponses={canRecordBidResponses}
                      canSelectResponses={canSelectBidResponses}
                      canCreateAssignmentOffer={canCreateBidAssignmentOffer}
                      orderSummary={{
                        order_number: titleNo,
                        city: order.city,
                        state: order.state,
                        report_type: order.report_type,
                      }}
                      refreshToken={bidRequestsRefreshToken}
                      onBidRequestsChange={handleBidRequestsChange}
                      onAssignmentOfferCreated={handleBidAssignmentOfferCreated}
                    />
                  )}
                </div>
              </details>
            ) : (
              <>
                {showEligibleVendorsPanel && (
                  <EligibleVendorsPanel
                    order={order}
                    orderId={order.id}
                    enabled={showEligibleVendorsPanel}
                    canRequestBids={canRequestEligibleVendorBids}
                    onBidRequestCreated={handleEligibleVendorBidRequestCreated}
                  />
                )}

                {showVendorCandidatePanel && (
                  <VendorAssignmentCandidatesPanel
                    orderId={order.id}
                    enabled={showVendorCandidatePanel}
                    activeVendorAssignment={activeVendorAssignment}
                    canOfferAssignment={canOfferVendorCandidateAssignment}
                    orderDueAt={order.final_due_at ?? order.due_date ?? null}
                    orderSummary={{
                      property_address: order.property_address || order.address,
                      address: order.address,
                      city: order.city,
                      state: order.state,
                      postal_code: order.postal_code || order.zip,
                      property_type: order.property_type,
                      report_type: order.report_type,
                      client_due_at: order.client_due_at,
                      final_due_at: order.final_due_at,
                      due_date: order.due_date,
                    }}
                    onOfferSuccess={async () => {
                      success("Assignment offer sent.");
                      await loadOwnerAssignments();
                    }}
                    onBidRequestSuccess={() => {
                      success("Bid request created.");
                      setBidRequestsRefreshToken((value) => value + 1);
                    }}
                  />
                )}

                {showBidRequestsPanel && (
                  <BidRequestsPanel
                    orderId={order.id}
                    enabled={showBidRequestsPanel}
                    hasActiveVendorAssignment={hasActiveVendorAssignment}
                    canRecordResponses={canRecordBidResponses}
                    canSelectResponses={canSelectBidResponses}
                    canCreateAssignmentOffer={canCreateBidAssignmentOffer}
                    orderSummary={{
                      order_number: titleNo,
                      city: order.city,
                      state: order.state,
                      report_type: order.report_type,
                    }}
                    refreshToken={bidRequestsRefreshToken}
                    onBidRequestsChange={handleBidRequestsChange}
                    onAssignmentOfferCreated={handleBidAssignmentOfferCreated}
                  />
                )}
              </>
            )}
          </div>
        )}

        {showAssignmentSurfaces && (
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
        )}
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

      {statusOverrideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-status-override-title"
            className="w-full max-w-md rounded-lg border bg-white p-4 shadow-xl"
          >
            <div id="order-status-override-title" className="text-base font-semibold text-gray-950">
              Override status
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              This owner/admin override changes the order workflow status outside the suggested path.
              The reason is required and will be recorded in activity.
            </p>

            <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                <span className="font-medium text-slate-600">Workspace: </span>
                <span className="font-semibold text-slate-950">{statusOverrideWorkspaceLabel}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Current status: </span>
                <span className="font-semibold text-slate-950">{order.status || "Unknown"}</span>
              </div>
            </div>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Target status
              <select
                value={statusOverrideTarget}
                onChange={(event) => {
                  setStatusOverrideTarget(event.target.value);
                  setStatusOverrideError("");
                }}
                disabled={statusOverrideSubmitting}
                className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Select status</option>
                {STATUS_OVERRIDE_TARGETS.map((target) => (
                  <option key={target.value} value={target.value}>
                    {target.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Override reason
              <textarea
                value={statusOverrideReason}
                onChange={(event) => {
                  setStatusOverrideReason(event.target.value);
                  setStatusOverrideError("");
                }}
                disabled={statusOverrideSubmitting}
                rows={3}
                required
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>

            {statusOverrideError && (
              <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {statusOverrideError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeStatusOverride}
                disabled={statusOverrideSubmitting}
                className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusOverride}
                disabled={!canSubmitStatusOverride}
                className="rounded border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {statusOverrideSubmitting ? "Overriding..." : "Override status"}
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
