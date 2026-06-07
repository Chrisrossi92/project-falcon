import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createOrderDocumentDownloadUrl } from "@/features/order-documents/api.js";
import {
  createVendorProfile,
  listAmcVendorInvoices,
  listAmcVendorPaymentLedger,
  listVendorDirectory,
  listVendorProfileUpdateRequests,
  markAmcVendorPaymentPaid,
  reviewAmcVendorInvoice,
  reviewVendorProfileUpdateRequest,
  scheduleAmcVendorPayment,
} from "./api";
import CoverageBuilder from "./coverage/CoverageBuilder";
import { getVendorProductTypeLabel } from "./coverage/productTypes";
import { getVendorErrorMessage } from "./vendorErrors";

const VENDOR_STATUS_OPTIONS = Object.freeze([
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "preferred", label: "Preferred" },
  { value: "pending", label: "Pending" },
  { value: "probation", label: "Probation" },
  { value: "inactive", label: "Inactive" },
  { value: "do_not_use", label: "Do not use" },
]);

function formatDateTime(value) {
  if (!value) return "Not updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatStatus(value) {
  if (!value) return "Unknown";
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(amount, currency = "USD") {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "Not provided";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function summarizeServiceAreas(summary = {}) {
  if (!summary || typeof summary !== "object") return "No active coverage";

  const activeCount = Number(summary.active_count ?? 0);
  const states = Array.isArray(summary.states) ? summary.states.filter(Boolean) : [];
  const counties = Array.isArray(summary.counties) ? summary.counties.filter(Boolean) : [];
  const markets = Array.isArray(summary.markets) ? summary.markets.filter(Boolean) : [];

  const locationParts = [
    states.slice(0, 3).join(", "),
    counties.slice(0, 2).join(", "),
    markets.slice(0, 2).join(", "),
  ].filter(Boolean);

  if (!activeCount && locationParts.length === 0) return "No active coverage";
  return [activeCount ? `${activeCount} active` : null, ...locationParts].filter(Boolean).join(" · ");
}

function summarizeProductEligibility(productEligibility = {}) {
  if (!productEligibility || typeof productEligibility !== "object" || Object.keys(productEligibility).length === 0) {
    return "No product summary";
  }

  const enabledKeys = Object.entries(productEligibility)
    .filter(([, value]) => value === true || value === "true" || value === "eligible")
    .map(([key]) => getVendorProductTypeLabel(key) || formatStatus(key));

  if (enabledKeys.length > 0) return enabledKeys.slice(0, 4).join(", ");
  return "Product eligibility noted";
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      Loading vendors...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      No vendors found.
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 shadow-sm">
      <div className="font-semibold">Vendor Directory could not load.</div>
      <div className="mt-1">
        {getVendorErrorMessage(error, {
          fallback: "Vendor Directory could not load. Please try again.",
        })}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex h-8 items-center rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-800 hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}

function formatReviewValue(value) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None";
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== "")
      .map(([key, entryValue]) => `${formatStatus(key)}: ${formatReviewValue(entryValue)}`);
    return entries.length > 0 ? entries.join(" · ") : "None";
  }
  return String(value);
}

function ReviewPayloadSummary({ title, payload }) {
  const entries = payload && typeof payload === "object" ? Object.entries(payload) : [];
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</div>
      {entries.length === 0 ? (
        <div className="mt-2 text-sm text-slate-500">No values captured.</div>
      ) : (
        <dl className="mt-2 grid gap-2 text-sm">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="font-medium text-slate-700">{formatStatus(key)}</dt>
              <dd className="mt-0.5 text-slate-600">{formatReviewValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ProfileUpdateReviewModal({ request, onClose, onReviewed }) {
  const [reviewerNote, setReviewerNote] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!request) return;
    setReviewerNote("");
    setSubmittingDecision("");
    setError("");
  }, [request]);

  if (!request) return null;

  const handleReview = async (decision) => {
    if (submittingDecision) return;
    setSubmittingDecision(decision);
    setError("");
    try {
      const result = await reviewVendorProfileUpdateRequest(request.request_key, {
        decision,
        reviewer_note: reviewerNote.trim() || null,
      });
      if (result?.ok === false) {
        setError("This request could not be reviewed. Check the request status and try again.");
        setSubmittingDecision("");
        return;
      }
      await onReviewed(result?.request || null);
    } catch (reviewError) {
      console.debug("Vendor profile update review failed", {
        code: reviewError?.code,
        message: reviewError?.message,
      });
      setError("This request could not be reviewed. Please try again.");
      setSubmittingDecision("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-3 py-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Profile Review</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {request.vendor_company_name || "Vendor"} update request
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Submitted {formatDateTime(request.submitted_at)} · {formatStatus(request.status)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
            aria-label="Close review"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ReviewPayloadSummary title="Current" payload={request.current_snapshot} />
            <ReviewPayloadSummary title="Proposed" payload={request.proposed_changes} />
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Vendor-facing decision note</span>
            <textarea
              value={reviewerNote}
              onChange={(event) => setReviewerNote(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Add safe decision context for the vendor."
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
            />
          </label>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => handleReview("reject")}
            disabled={Boolean(submittingDecision)}
            className="inline-flex h-9 items-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingDecision === "reject" ? "Rejecting..." : "Reject"}
          </button>
          <button
            type="button"
            onClick={() => handleReview("approve")}
            disabled={Boolean(submittingDecision)}
            className="inline-flex h-9 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingDecision === "approve" ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VendorProfileUpdateReviewQueue({ enabled }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const loadRequests = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const rows = await listVendorProfileUpdateRequests({ status: "pending" });
      setRequests(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      console.debug("Vendor profile update requests failed to load", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setRequests([]);
      setError("Profile update requests could not load.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  if (!enabled) return null;

  const handleReviewed = async (reviewedRequest) => {
    setSelectedRequest(null);
    setSuccessMessage(
      reviewedRequest?.status === "approved"
        ? "Profile update request approved."
        : "Profile update request rejected.",
    );
    await loadRequests();
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Vendor profile update requests">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Review Queue</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Profile Update Requests</h2>
          <p className="mt-1 text-sm text-slate-500">
            Approve requests to apply vendor profile, contact, or coverage changes.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {successMessage && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-3 text-sm text-slate-500">Loading profile update requests...</div>
      ) : requests.length === 0 ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          No pending profile update requests.
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {requests.map((request) => (
            <article
              key={request.request_key}
              className="grid gap-3 rounded-md border border-slate-200 px-3 py-3 md:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-950">{request.vendor_company_name || "Vendor"}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {formatStatus(request.status)} · Submitted {formatDateTime(request.submitted_at)}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {formatReviewValue(request.proposed_changes)}
                </div>
              </div>
              <div className="flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(request)}
                  className="inline-flex h-8 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Review
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ProfileUpdateReviewModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onReviewed={handleReviewed}
      />
    </section>
  );
}

const INVOICE_STATUS_FILTERS = Object.freeze([
  { value: "invoice_received", label: "Invoice Received" },
  { value: "approved", label: "Approved" },
  { value: "on_hold", label: "On Hold" },
  { value: "rejected", label: "Rejected" },
]);

const PAYMENT_LEDGER_STATUS_FILTERS = Object.freeze([
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paid", label: "Paid" },
]);

function InvoiceReviewModal({ invoice, onClose, onReviewed }) {
  const [decision, setDecision] = useState("approve");
  const [reviewerNote, setReviewerNote] = useState("");
  const [vendorMessage, setVendorMessage] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoice) return;
    setDecision("approve");
    setReviewerNote("");
    setVendorMessage("");
    setApprovedAmount("");
    setSubmitting(false);
    setError("");
  }, [invoice]);

  if (!invoice) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    if ((decision === "hold" || decision === "reject") && !vendorMessage.trim()) {
      setError("Add a vendor-facing message for held or rejected invoices.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await reviewAmcVendorInvoice(invoice.invoice_key, {
        decision,
        reviewer_note: reviewerNote.trim() || null,
        vendor_message: vendorMessage.trim() || null,
        approved_amount: approvedAmount ? Number(approvedAmount) : null,
      });

      if (result?.ok === false) {
        setError("This invoice could not be reviewed. Check the invoice status and try again.");
        setSubmitting(false);
        return;
      }

      await onReviewed(result?.invoice || null);
    } catch (reviewError) {
      console.debug("Vendor invoice review failed", {
        code: reviewError?.code,
        message: reviewError?.message,
      });
      setError("This invoice could not be reviewed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-3 py-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Invoice Review</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {invoice.invoice_number || "Vendor invoice"} · {invoice.vendor?.company_name || "Vendor"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatMoney(invoice.invoice_amount, invoice.currency)} · Submitted {formatDateTime(invoice.submitted_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
            aria-label="Close invoice review"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-950">{invoice.order?.property_address || "Property pending"}</div>
            <div className="mt-1">
              {invoice.order?.order_number || "Order pending"} · {invoice.order?.report_type || "Report type pending"}
            </div>
            {invoice.vendor_note ? (
              <div className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-2">
                {invoice.vendor_note}
              </div>
            ) : null}
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Decision</span>
            <select
              value={decision}
              onChange={(event) => setDecision(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
            >
              <option value="approve">Approve</option>
              <option value="hold">Hold</option>
              <option value="reject">Reject</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Approved Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={approvedAmount}
              onChange={(event) => setApprovedAmount(event.target.value)}
              placeholder={String(invoice.invoice_amount || "")}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Internal Reviewer Note</span>
            <textarea
              value={reviewerNote}
              onChange={(event) => setReviewerNote(event.target.value)}
              rows={3}
              placeholder="Private internal note. Not sent to the vendor."
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Vendor-Facing Message</span>
            <textarea
              value={vendorMessage}
              onChange={(event) => setVendorMessage(event.target.value)}
              rows={3}
              placeholder="Safe message for held or rejected invoices."
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
            />
          </label>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Review"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PaymentScheduleModal({ payment, onClose, onSaved }) {
  const [scheduledPaymentDate, setScheduledPaymentDate] = useState("");
  const [paymentMethodLabel, setPaymentMethodLabel] = useState("");
  const [referenceLabel, setReferenceLabel] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [vendorPaymentNote, setVendorPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!payment) return;
    setScheduledPaymentDate(payment.scheduled_payment_date || "");
    setPaymentMethodLabel(payment.payment_method_label || "");
    setReferenceLabel(payment.reference_label || "");
    setInternalNote("");
    setVendorPaymentNote(payment.vendor_payment_note || "");
    setSubmitting(false);
    setError("");
  }, [payment]);

  if (!payment) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!scheduledPaymentDate) {
      setError("Choose a scheduled payment date.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await scheduleAmcVendorPayment(payment.invoice_key, {
        scheduled_payment_date: scheduledPaymentDate,
        payment_method_label: paymentMethodLabel.trim() || null,
        reference_label: referenceLabel.trim() || null,
        internal_note: internalNote.trim() || null,
        vendor_payment_note: vendorPaymentNote.trim() || null,
      });
      if (result?.ok === false) {
        setError(result.field_errors?.scheduled_payment_date || "Payment could not be scheduled.");
        return;
      }
      await onSaved?.(result);
    } catch {
      setError("Payment could not be scheduled.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Schedule Vendor Payment</h3>
          <p className="mt-1 text-sm text-slate-500">
            {payment.vendor?.company_name || "Vendor"} · {payment.invoice?.invoice_number || "Invoice"}
          </p>
        </div>
        <div className="grid gap-3 px-5 py-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Scheduled payment date
            <input
              type="date"
              value={scheduledPaymentDate}
              onChange={(event) => setScheduledPaymentDate(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Payment method label
            <input
              value={paymentMethodLabel}
              onChange={(event) => setPaymentMethodLabel(event.target.value)}
              placeholder="ACH, check, wire"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Reference / check / ACH note
            <input
              value={referenceLabel}
              onChange={(event) => setReferenceLabel(event.target.value)}
              placeholder="ACH ending 1234"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Internal note
            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              rows={3}
              placeholder="Private finance note. Not sent to the vendor."
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Vendor-facing payment note
            <textarea
              value={vendorPaymentNote}
              onChange={(event) => setVendorPaymentNote(event.target.value)}
              rows={3}
              placeholder="Safe payment note visible to the vendor."
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
            Close
          </button>
          <button type="submit" disabled={submitting} className="inline-flex h-9 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white disabled:opacity-60">
            {submitting ? "Scheduling..." : "Schedule Payment"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PaymentPaidModal({ payment, onClose, onSaved }) {
  const [paidDate, setPaidDate] = useState("");
  const [paymentMethodLabel, setPaymentMethodLabel] = useState("");
  const [referenceLabel, setReferenceLabel] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [vendorPaymentNote, setVendorPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!payment) return;
    setPaidDate("");
    setPaymentMethodLabel(payment.payment_method_label || "");
    setReferenceLabel(payment.reference_label || "");
    setInternalNote("");
    setVendorPaymentNote(payment.vendor_payment_note || "");
    setSubmitting(false);
    setError("");
  }, [payment]);

  if (!payment) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await markAmcVendorPaymentPaid(payment.payment_key, {
        paid_date: paidDate || null,
        payment_method_label: paymentMethodLabel.trim() || null,
        reference_label: referenceLabel.trim() || null,
        internal_note: internalNote.trim() || null,
        vendor_payment_note: vendorPaymentNote.trim() || null,
      });
      if (result?.ok === false) {
        setError(result.field_errors?.paid_date || "Payment could not be marked paid.");
        return;
      }
      await onSaved?.(result);
    } catch {
      setError("Payment could not be marked paid.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Mark Vendor Payment Paid</h3>
          <p className="mt-1 text-sm text-slate-500">
            {payment.vendor?.company_name || "Vendor"} · {payment.invoice?.invoice_number || "Invoice"}
          </p>
        </div>
        <div className="grid gap-3 px-5 py-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Paid date
            <input type="date" value={paidDate} onChange={(event) => setPaidDate(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Payment method label
            <input value={paymentMethodLabel} onChange={(event) => setPaymentMethodLabel(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Reference / check / ACH note
            <input value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Internal note
            <textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={3} placeholder="Private finance note. Not sent to the vendor." className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Vendor-facing payment note
            <textarea value={vendorPaymentNote} onChange={(event) => setVendorPaymentNote(event.target.value)} rows={3} placeholder="Safe payment note visible to the vendor." className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
          </label>
          {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
            Close
          </button>
          <button type="submit" disabled={submitting} className="inline-flex h-9 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white disabled:opacity-60">
            {submitting ? "Saving..." : "Mark Paid"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VendorInvoiceReviewQueue({ enabled }) {
  const [statusFilter, setStatusFilter] = useState("invoice_received");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [openingDocumentId, setOpeningDocumentId] = useState(null);
  const [documentError, setDocumentError] = useState("");

  const loadInvoices = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const rows = await listAmcVendorInvoices({ status: statusFilter });
      setInvoices(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      console.debug("Vendor invoice queue failed to load", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setInvoices([]);
      setError("Vendor invoices could not load.");
    } finally {
      setLoading(false);
    }
  }, [enabled, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  if (!enabled) return null;

  async function handleOpenDocument(document) {
    if (!document?.document_id) {
      setDocumentError("This invoice document cannot be opened right now.");
      return;
    }

    setOpeningDocumentId(document.document_id);
    setDocumentError("");
    try {
      const result = await createOrderDocumentDownloadUrl(document.document_id);
      window.open(result.signed_url, "_blank", "noopener,noreferrer");
    } catch {
      setDocumentError("This invoice document cannot be opened right now.");
    } finally {
      setOpeningDocumentId(null);
    }
  }

  const handleReviewed = async (invoice) => {
    setSelectedInvoice(null);
    setSuccessMessage(
      invoice?.invoice_status === "approved"
        ? "Invoice approved."
        : invoice?.invoice_status === "on_hold"
          ? "Invoice placed on hold."
          : "Invoice rejected.",
    );
    await loadInvoices();
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Vendor invoice review queue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Finance Review</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Vendor Invoice Review</h2>
          <p className="mt-1 text-sm text-slate-500">
            Approve, hold, or reject submitted vendor invoices before payment scheduling.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label>
            <span className="sr-only">Invoice status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
            >
              {INVOICE_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadInvoices}
            className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}
      {(error || documentError) ? (
        <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error || documentError}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 text-sm text-slate-500">Loading vendor invoices...</div>
      ) : invoices.length === 0 ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          No vendor invoices match this status.
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {invoices.map((invoice) => {
            const documents = Array.isArray(invoice.documents) ? invoice.documents : [];
            return (
              <article
                key={invoice.invoice_key}
                className="grid gap-3 rounded-md border border-slate-200 px-3 py-3 lg:grid-cols-[1.2fr_0.8fr_auto]"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-950">{invoice.vendor?.company_name || "Vendor"}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {invoice.invoice_number || "Invoice pending"} · {formatMoney(invoice.invoice_amount, invoice.currency)}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {invoice.order?.property_address || "Property pending"} · {invoice.order?.order_number || "Order pending"}
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <div>{invoice.invoice_status_label || formatStatus(invoice.invoice_status)}</div>
                  <div className="mt-1">Submitted {formatDateTime(invoice.submitted_at)}</div>
                  {documents.length ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDocument(documents[0])}
                      disabled={openingDocumentId === documents[0]?.document_id}
                      className="mt-2 inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {openingDocumentId === documents[0]?.document_id ? "Opening..." : "Open Invoice"}
                    </button>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">No invoice document available.</div>
                  )}
                </div>
                <div className="flex items-start justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(invoice)}
                    className="inline-flex h-8 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Review
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <InvoiceReviewModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onReviewed={handleReviewed}
      />
    </section>
  );
}

function VendorPaymentLedgerQueue({ enabled }) {
  const [statusFilter, setStatusFilter] = useState("approved");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [schedulePayment, setSchedulePayment] = useState(null);
  const [paidPayment, setPaidPayment] = useState(null);

  const loadPayments = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const rows = await listAmcVendorPaymentLedger({ status: statusFilter });
      setPayments(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      console.debug("Vendor payment ledger failed to load", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setPayments([]);
      setError("Vendor payments could not load.");
    } finally {
      setLoading(false);
    }
  }, [enabled, statusFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  if (!enabled) return null;

  const handleSaved = async (message) => {
    setSchedulePayment(null);
    setPaidPayment(null);
    setSuccessMessage(message);
    await loadPayments();
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Vendor payment ledger queue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Finance Ledger</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Vendor Payment Ledger</h2>
          <p className="mt-1 text-sm text-slate-500">
            Schedule approved vendor invoices and mark scheduled payments paid. No bank transfer is initiated.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label>
            <span className="sr-only">Payment status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
            >
              {PAYMENT_LEDGER_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadPayments}
            className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 text-sm text-slate-500">Loading vendor payments...</div>
      ) : payments.length === 0 ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          No vendor payments match this status.
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {payments.map((payment) => (
            <article
              key={payment.payment_key || payment.invoice_key}
              className="grid gap-3 rounded-md border border-slate-200 px-3 py-3 lg:grid-cols-[1.2fr_0.8fr_auto]"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-950">{payment.vendor?.company_name || "Vendor"}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {payment.invoice?.invoice_number || "Invoice"} · {formatMoney(payment.invoice?.approved_amount || payment.invoice?.invoice_amount, payment.invoice?.currency)}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {payment.order?.property_address || "Property pending"} · {payment.order?.order_number || "Order pending"}
                </div>
              </div>
              <div className="text-sm text-slate-600">
                <div>{payment.payment_status_label || formatStatus(payment.payment_status)}</div>
                <div className="mt-1">Scheduled {formatDateTime(payment.scheduled_payment_date)}</div>
                <div className="mt-1">Paid {formatDateTime(payment.paid_at)}</div>
                {payment.reference_label ? <div className="mt-1">{payment.reference_label}</div> : null}
              </div>
              <div className="flex items-start justify-end gap-2">
                {payment.payment_status === "approved" ? (
                  <button
                    type="button"
                    onClick={() => setSchedulePayment(payment)}
                    className="inline-flex h-8 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Schedule Payment
                  </button>
                ) : null}
                {payment.payment_status === "scheduled" && payment.payment_key ? (
                  <button
                    type="button"
                    onClick={() => setPaidPayment(payment)}
                    className="inline-flex h-8 items-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Mark Paid
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <PaymentScheduleModal
        payment={schedulePayment}
        onClose={() => setSchedulePayment(null)}
        onSaved={() => handleSaved("Vendor payment scheduled.")}
      />
      <PaymentPaidModal
        payment={paidPayment}
        onClose={() => setPaidPayment(null)}
        onSaved={() => handleSaved("Vendor payment marked paid.")}
      />
    </section>
  );
}

const EMPTY_VENDOR_FORM = Object.freeze({
  vendorCompanyName: "",
  website: "",
  publicPhone: "",
  vendorStatus: "active",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactRoleLabel: "",
  tags: "",
  defaultAssignmentInstructions: "",
  internalNotes: "",
});

function textOrNull(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function tagsFromText(value) {
  return [...new Set(
    String(value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  )];
}

function assignIfPresent(target, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    target[key] = value;
  }
}

function shouldLogVendorDiagnostics() {
  return import.meta.env?.DEV || import.meta.env?.MODE === "test";
}

function logVendorCreateFailure(error, payload) {
  const serviceAreas = Array.isArray(payload?.service_areas) ? payload.service_areas : [];
  const diagnostics = {
    code: error?.code,
    message: error?.message,
  };

  if (shouldLogVendorDiagnostics()) {
    diagnostics.details = error?.details;
    diagnostics.hint = error?.hint;
    diagnostics.serviceAreaCount = serviceAreas.length;
    diagnostics.serviceAreaSample = serviceAreas.slice(0, 3);
    diagnostics.payloadKeys = Object.keys(payload || {});
  }

  console.debug("Vendor create failed", diagnostics);
}

function AddVendorModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_VENDOR_FORM);
  const [formError, setFormError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coverageRows, setCoverageRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_VENDOR_FORM);
    setFormError("");
    setSubmitError("");
    setCoverageRows([]);
  }, [open]);

  if (!open) return null;

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setFormError("");
    setSubmitError("");

    const vendorCompanyName = textOrNull(form.vendorCompanyName);
    if (!vendorCompanyName) {
      setFormError("Vendor company name is required.");
      return;
    }

    const hasContactDetail = [
      form.contactName,
      form.contactEmail,
      form.contactPhone,
      form.contactRoleLabel,
    ].some((value) => textOrNull(value));
    const contactName = textOrNull(form.contactName);
    if (hasContactDetail && !contactName) {
      setFormError("Primary contact name is required when contact details are entered.");
      return;
    }

    const tags = tagsFromText(form.tags);

    const payload = {
      vendor_company: {
        name: vendorCompanyName,
      },
      create_relationship: true,
      vendor_status: form.vendorStatus || "active",
    };
    assignIfPresent(payload, "website", textOrNull(form.website));
    assignIfPresent(payload, "public_phone", textOrNull(form.publicPhone));
    assignIfPresent(
      payload,
      "default_assignment_instructions",
      textOrNull(form.defaultAssignmentInstructions),
    );
    assignIfPresent(payload, "internal_notes", textOrNull(form.internalNotes));
    if (tags.length > 0) {
      payload.tags = tags;
    }

    if (hasContactDetail) {
      const primaryContact = {
        name: contactName,
      };
      assignIfPresent(primaryContact, "email", textOrNull(form.contactEmail));
      assignIfPresent(primaryContact, "phone", textOrNull(form.contactPhone));
      assignIfPresent(primaryContact, "role_label", textOrNull(form.contactRoleLabel));
      payload.primary_contact = primaryContact;
    }

    if (coverageRows.length > 0) {
      payload.service_areas = coverageRows.map((row) => ({
        state: row.state || null,
        county: row.county || null,
        zip: row.zip || null,
        market: row.market || null,
        radius_miles: row.radius_miles ?? null,
        product_type: row.product_type || null,
        status: "active",
      }));
    }

    setSubmitting(true);
    try {
      const created = await createVendorProfile(payload);
      await onCreated?.(created);
      setForm(EMPTY_VENDOR_FORM);
      setCoverageRows([]);
    } catch (error) {
      logVendorCreateFailure(error, payload);
      setSubmitError(getVendorErrorMessage(error, {
        selfVendorMessage: true,
        permissionMessage: "You do not have permission to add vendors.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 px-4 py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-vendor-title"
        className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Network</div>
            <h2 id="add-vendor-title" className="mt-1 text-xl font-semibold text-slate-950">Add Vendor</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close Add Vendor"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 px-5 py-5">
          {(formError || submitError) && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>{formError || submitError}</div>
            </div>
          )}

          <section className="grid gap-3" aria-labelledby="vendor-company-section-title">
            <h3 id="vendor-company-section-title" className="text-sm font-semibold text-slate-950">Vendor company</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Vendor company name</span>
                <input
                  value={form.vendorCompanyName}
                  onChange={updateField("vendorCompanyName")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Vendor status</span>
                <select
                  value={form.vendorStatus}
                  onChange={updateField("vendorStatus")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                >
                  {VENDOR_STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Website</span>
                <input
                  value={form.website}
                  onChange={updateField("website")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Public phone</span>
                <input
                  value={form.publicPhone}
                  onChange={updateField("publicPhone")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </label>
            </div>
          </section>

          <section className="grid gap-3" aria-labelledby="primary-contact-section-title">
            <h3 id="primary-contact-section-title" className="text-sm font-semibold text-slate-950">Primary contact</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Contact name</span>
                <input value={form.contactName} onChange={updateField("contactName")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Contact email</span>
                <input value={form.contactEmail} onChange={updateField("contactEmail")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Contact phone</span>
                <input value={form.contactPhone} onChange={updateField("contactPhone")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Role label</span>
                <input value={form.contactRoleLabel} onChange={updateField("contactRoleLabel")} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </label>
            </div>
          </section>

          <section className="grid gap-3" aria-labelledby="coverage-section-title">
            <h3 id="coverage-section-title" className="text-sm font-semibold text-slate-950">Coverage</h3>
            <p className="text-sm text-slate-500">
              Coverage is used for directory visibility and future vendor matching. It does not assign work automatically.
            </p>
            <CoverageBuilder onRowsChange={setCoverageRows} />
          </section>

          <section className="grid gap-3">
            <h3 id="internal-notes-section-title" className="text-sm font-semibold text-slate-950">Internal notes</h3>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Tags</span>
              <input
                value={form.tags}
                onChange={updateField("tags")}
                placeholder="preferred, commercial"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Default coordination instructions</span>
              <textarea value={form.defaultAssignmentInstructions} onChange={updateField("defaultAssignmentInstructions")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Internal notes</span>
              <textarea value={form.internalNotes} onChange={updateField("internalNotes")} rows={3} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
            </label>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add Vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VendorDirectoryRow({ vendor }) {
  const tags = Array.isArray(vendor.tags) ? vendor.tags.filter(Boolean) : [];
  const contact = [
    vendor.primary_contact_name,
    vendor.primary_contact_email,
    vendor.primary_contact_phone,
  ].filter(Boolean).join(" · ");

  const detailPath = vendor.vendor_profile_id ? `/vendors/${vendor.vendor_profile_id}` : null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-950">
            {detailPath ? (
              <Link to={detailPath} className="hover:text-slate-700 hover:underline">
                {vendor.vendor_company_name || "Unnamed vendor"}
              </Link>
            ) : (
              vendor.vendor_company_name || "Unnamed vendor"
            )}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              {formatStatus(vendor.vendor_status)}
            </span>
            <span>Network: {vendor.relationship_status ? formatStatus(vendor.relationship_status) : "Staged"}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400">Updated {formatDateTime(vendor.updated_at)}</div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Contact</div>
          <div className="mt-1">{contact || "No primary contact"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Coverage</div>
          <div className="mt-1">{summarizeServiceAreas(vendor.service_area_summary)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Products</div>
          <div className="mt-1">{summarizeProductEligibility(vendor.product_eligibility)}</div>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 8).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function VendorDirectoryPage() {
  const navigate = useNavigate();
  const canCreateVendor = useCan(PERMISSIONS.VENDORS_CREATE);
  const canReviewProfileRequests = useCan(PERMISSIONS.VENDORS_UPDATE);
  const canReadVendors = useCan(PERMISSIONS.VENDORS_READ);
  const canReviewInvoices = useCan(PERMISSIONS.BILLING_UPDATE);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const filters = useMemo(() => ({ status: status || null, query: query || null }), [query, status]);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listVendorDirectory(filters);
      setVendors(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      console.debug("Vendor Directory load failed", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setVendors([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleVendorCreated = async (created) => {
    setAddVendorOpen(false);
    await loadVendors();
    if (created?.vendor_profile_id) {
      navigate(`/vendors/${created.vendor_profile_id}`);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor Network</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Vendor Directory</h1>
        </div>
        {canCreateVendor.allowed && (
          <button
            type="button"
            onClick={() => setAddVendorOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Vendor
          </button>
        )}
      </div>

      <VendorProfileUpdateReviewQueue enabled={canReviewProfileRequests.allowed} />
      <VendorInvoiceReviewQueue enabled={canReadVendors.allowed && canReviewInvoices.allowed} />
      <VendorPaymentLedgerQueue enabled={canReadVendors.allowed && canReviewInvoices.allowed} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Search vendors</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search vendors"
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
          />
        </label>
        <label>
          <span className="sr-only">Vendor status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400"
          >
            {VENDOR_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={loadVendors} />
      ) : vendors.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="grid gap-3" aria-label="Vendor Directory results">
          {vendors.map((vendor, index) => (
            <VendorDirectoryRow
              key={vendor.vendor_profile_id || `${vendor.vendor_company_id || "vendor"}-${index}`}
              vendor={vendor}
            />
          ))}
        </section>
      )}

      <AddVendorModal
        open={addVendorOpen}
        onClose={() => setAddVendorOpen(false)}
        onCreated={handleVendorCreated}
      />
    </main>
  );
}
