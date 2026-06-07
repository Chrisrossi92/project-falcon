import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  createVendorWorkspaceInvoiceUploadUrl,
  fetchVendorWorkspacePayments,
  registerVendorWorkspaceInvoiceDocument,
  resubmitVendorWorkspaceInvoice,
  submitVendorWorkspaceInvoice,
} from "@/features/vendorWorkspace/api.js";

const statusClasses = Object.freeze({
  not_ready: "border-slate-200 bg-slate-50 text-slate-600",
  ready_for_invoice: "border-amber-200 bg-amber-50 text-amber-700",
  invoice_received: "border-sky-200 bg-sky-50 text-sky-700",
  approved: "border-indigo-200 bg-indigo-50 text-indigo-700",
  scheduled: "border-violet-200 bg-violet-50 text-violet-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  on_hold: "border-rose-200 bg-rose-50 text-rose-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
});

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMoney(amount, currency = "USD") {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "Not available";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function formatFileSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "Size pending";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function marketFromOrder(order = {}) {
  return [order.city, order.state, order.postal_code].filter(Boolean).join(", ");
}

function LoadingState() {
  return (
    <section aria-label="Loading payments" className="grid gap-3 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <article key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-5 w-56 rounded bg-slate-200" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        </article>
      ))}
    </section>
  );
}

function ErrorState({ onRetry }) {
  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="font-semibold">Payment activity unavailable</div>
      <p className="mt-1">Payment activity could not be loaded.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800"
      >
        Retry
      </button>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <div className="font-semibold text-slate-950">No payment activity yet.</div>
      <p className="mt-1">
        Payments are visible once assignments reach payment-eligible states.
      </p>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article aria-label={`${label} payments`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value || "Not available"}</dd>
    </div>
  );
}

const invoiceErrorMessages = Object.freeze({
  payment_unavailable: "This payment item is no longer available.",
  invoice_upload_invalid: "This invoice file cannot be uploaded.",
  invoice_submission_invalid: "This invoice cannot be submitted yet.",
  invoice_already_submitted: "An invoice has already been submitted for this assignment.",
  invoice_resubmission_invalid: "This corrected invoice cannot be submitted yet.",
});

function InvoiceSubmissionPanel({ item, mode = "new", onSubmitted }) {
  const priorInvoice = item?.invoice || {};
  const isCorrection = mode === "correction";
  const [invoiceNumber, setInvoiceNumber] = useState(isCorrection ? priorInvoice.invoice_number || "" : "");
  const [invoiceAmount, setInvoiceAmount] = useState(
    Number.isFinite(Number(isCorrection ? priorInvoice.invoice_amount : item?.vendor_fee_amount))
      ? String(isCorrection ? priorInvoice.invoice_amount : item.vendor_fee_amount)
      : "",
  );
  const [invoiceDate, setInvoiceDate] = useState("");
  const [vendorNote, setVendorNote] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleUploadInvoice() {
    if (isUploading) return;

    if (!selectedFile) {
      setError("Choose an invoice PDF before uploading.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const prepared = await createVendorWorkspaceInvoiceUploadUrl(item.assignment_work_key, {
        file_name: selectedFile.name,
        mime_type: selectedFile.type || "application/pdf",
        file_size: selectedFile.size,
        document_role: "vendor_invoice",
      });

      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", selectedFile);

      const uploadResponse = await fetch(prepared.upload.signed_url, {
        method: "PUT",
        headers: {
          "x-upsert": "false",
        },
        body: uploadBody,
      });

      if (!uploadResponse.ok) {
        throw new Error("upload_failed");
      }

      const registered = await registerVendorWorkspaceInvoiceDocument(item.assignment_work_key, {
        document_key: prepared.document.document_key,
        file_name: selectedFile.name,
        mime_type: selectedFile.type || "application/pdf",
        file_size: selectedFile.size,
        document_role: "vendor_invoice",
      });

      if (registered.ok && registered.document?.document_key) {
        setUploadedDocuments((current) => [...current, registered.document]);
        setSelectedFile(null);
        return;
      }

      setError(
        registered.field_errors?.document_key ||
        registered.field_errors?.file_size ||
        registered.field_errors?.mime_type ||
        registered.field_errors?.action ||
        invoiceErrorMessages[registered.error] ||
        "Invoice file could not be registered. Try again or contact the AMC coordinator.",
      );
    } catch {
      setError("Invoice file could not be uploaded. Please try again or contact the AMC coordinator.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmitInvoice() {
    if (isSubmitting) return;

    setError("");

    if (!invoiceNumber.trim()) {
      setError("Enter an invoice number.");
      return;
    }

    const amount = Number(invoiceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid invoice amount.");
      return;
    }

    if (!uploadedDocuments.length) {
      setError("Upload at least one invoice PDF before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitAction = isCorrection ? resubmitVendorWorkspaceInvoice : submitVendorWorkspaceInvoice;
      const result = await submitAction(item.assignment_work_key, {
        invoice_number: invoiceNumber,
        invoice_amount: amount,
        currency: item?.currency || "USD",
        invoice_date: invoiceDate || null,
        vendor_note: vendorNote,
        document_keys: uploadedDocuments.map((document) => document.document_key),
      });

      if (result.ok) {
        setInvoiceNumber("");
        setVendorNote("");
        setInvoiceDate("");
        setUploadedDocuments([]);
        setSelectedFile(null);
        onSubmitted?.(result.message || (isCorrection ? "Corrected invoice submitted." : "Invoice submitted."));
        return;
      }

      setError(
        result.field_errors?.invoice_number ||
        result.field_errors?.invoice_amount ||
        result.field_errors?.document_keys ||
        result.field_errors?.action ||
        invoiceErrorMessages[result.error] ||
        isCorrection
          ? "Corrected invoice could not be submitted. Please try again or contact the AMC coordinator."
          : "Invoice could not be submitted. Please try again or contact the AMC coordinator.",
      );
    } catch {
      setError(
        isCorrection
          ? "Corrected invoice could not be submitted. Please try again or contact the AMC coordinator."
          : "Invoice could not be submitted. Please try again or contact the AMC coordinator.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-5 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">
          {isCorrection ? "Submit Corrected Invoice" : "Submit Invoice"}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          {isCorrection
            ? "Upload a corrected PDF invoice and submit it for payment review."
            : "Upload a PDF invoice and submit it for payment review."}
        </p>
      </div>
      {error ? (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {isCorrection ? "Corrected Invoice Number" : "Invoice Number"}
          <input
            type="text"
            value={invoiceNumber}
            disabled={isSubmitting}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {isCorrection ? "Corrected Invoice Amount" : "Invoice Amount"}
          <input
            type="number"
            min="0"
            step="0.01"
            value={invoiceAmount}
            disabled={isSubmitting}
            onChange={(event) => setInvoiceAmount(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {isCorrection ? "Corrected Invoice Date" : "Invoice Date"}
          <input
            type="date"
            value={invoiceDate}
            disabled={isSubmitting}
            onChange={(event) => setInvoiceDate(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {isCorrection ? "Corrected Invoice PDF" : "Invoice PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={isUploading || isSubmitting}
            onChange={(event) => {
              setError("");
              setSelectedFile(event.target.files?.[0] || null);
            }}
            className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-slate-700">
        Vendor Note
        <textarea
          value={vendorNote}
          disabled={isSubmitting}
          onChange={(event) => setVendorNote(event.target.value)}
          rows={3}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          placeholder="Optional note for the AMC coordinator."
        />
      </label>
      {selectedFile ? (
        <div className="rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-600">
          Selected: <span className="font-semibold text-slate-800">{selectedFile.name}</span>{" "}
          ({formatFileSize(selectedFile.size)})
        </div>
      ) : null}
      <button
        type="button"
        disabled={!selectedFile || isUploading || isSubmitting}
        onClick={handleUploadInvoice}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {isUploading ? "Uploading..." : "Upload Invoice File"}
      </button>
      {uploadedDocuments.length ? (
        <div className="space-y-2">
          {uploadedDocuments.map((document) => (
            <div
              key={document.document_key}
              className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900"
            >
              <div className="font-semibold">{document.file_name || document.title || "Uploaded invoice"}</div>
              <div>{formatFileSize(document.file_size)} uploaded and ready to submit</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-slate-600">
          {isCorrection
            ? "Upload at least one corrected invoice PDF before submitting."
            : "Upload at least one invoice PDF before submitting."}
        </p>
      )}
      <button
        type="button"
        disabled={isSubmitting || isUploading}
        onClick={handleSubmitInvoice}
        className="w-full rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
      >
        {isSubmitting ? "Submitting..." : isCorrection ? "Submit Corrected Invoice" : "Submit Invoice"}
      </button>
    </div>
  );
}

function PaymentCard({ item, onInvoiceSubmitted }) {
  const order = item?.order || {};
  const owner = item?.owner || {};
  const statusKey = item?.payment_status_key || "not_ready";
  const statusClass = statusClasses[statusKey] || statusClasses.not_ready;
  const market = marketFromOrder(order);
  const canSubmitInvoice = statusKey === "ready_for_invoice" && item?.assignment_work_key;
  const canSubmitCorrectedInvoice = statusKey === "rejected" && item?.assignment_work_key;
  const invoiceReview = item?.invoice?.review || {};

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {owner.company_name || "AMC coordinator"}
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">
            {order.property_address || "Property details pending"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{market || order.county || "Market pending"}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>
          {item?.payment_status || "Not Ready"}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
        <DetailRow label="Order" value={order.order_number || "Order pending"} />
        <DetailRow label="Report Type" value={order.report_type || "Report type pending"} />
        <DetailRow label="Assignment / Completion" value={formatDate(item?.assignment_completed_at)} />
        <DetailRow label="Payable Amount" value={formatMoney(item?.vendor_fee_amount, item?.currency)} />
        <DetailRow label="Invoice Status" value={item?.invoice_status} />
        <DetailRow label="Payment Date" value={formatDate(item?.payment_date)} />
        <DetailRow label="Payment Method" value={item?.payment_method_label} />
        <DetailRow label="Reference" value={item?.payment_reference_label} />
        <DetailRow
          label="Next Action"
          value={canSubmitInvoice ? "Submit invoice" : canSubmitCorrectedInvoice ? "Submit corrected invoice" : item?.next_action_label}
        />
      </dl>

      {item?.vendor_payment_note ? (
        <div className="mt-5 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
          <div className="font-semibold">Payment note</div>
          <p className="mt-1 whitespace-pre-wrap">{item.vendor_payment_note}</p>
        </div>
      ) : null}

      {statusKey === "rejected" ? (
        <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
          <div className="font-semibold">Invoice rejected</div>
          <p className="mt-1 whitespace-pre-wrap">
            {invoiceReview.vendor_message || "The AMC coordinator rejected this invoice. Submit a corrected invoice if requested."}
          </p>
          {item?.invoice?.invoice_number ? (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <DetailRow label="Prior Invoice" value={item.invoice.invoice_number} />
              <DetailRow label="Prior Amount" value={formatMoney(item.invoice.invoice_amount, item.invoice.currency || item.currency)} />
              <DetailRow label="Prior Submitted" value={formatDate(item.invoice.submitted_at)} />
              <DetailRow label="Reviewed" value={formatDate(invoiceReview.reviewed_at)} />
            </dl>
          ) : null}
        </div>
      ) : null}

      {item?.assignment_work_key ? (
        <div className="mt-5">
          <Link
            to={`/vendor-workspace/assigned-orders/${encodeURIComponent(item.assignment_work_key)}`}
            className="inline-flex rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            View Assigned Order
          </Link>
        </div>
      ) : null}

      {canSubmitInvoice ? (
        <InvoiceSubmissionPanel item={item} onSubmitted={onInvoiceSubmitted} />
      ) : null}
      {canSubmitCorrectedInvoice ? (
        <InvoiceSubmissionPanel item={item} mode="correction" onSubmitted={onInvoiceSubmitted} />
      ) : null}
    </article>
  );
}

export default function VendorPaymentsPage() {
  const [payments, setPayments] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      setIsLoading(true);
      setError(null);

      try {
        const nextPayments = await fetchVendorWorkspacePayments();
        if (isMounted) setPayments(nextPayments);
      } catch (nextError) {
        if (isMounted) setError(nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPayments();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const items = useMemo(() => (Array.isArray(payments?.items) ? payments.items : []), [payments?.items]);

  const counts = useMemo(() => ({
    readyForInvoice: items.filter((item) => item?.payment_status_key === "ready_for_invoice").length,
    invoiceReceived: items.filter((item) => item?.payment_status_key === "invoice_received").length,
    approved: items.filter((item) => item?.payment_status_key === "approved").length,
    scheduled: items.filter((item) => item?.payment_status_key === "scheduled").length,
    paid: items.filter((item) => item?.payment_status_key === "paid").length,
    onHold: items.filter((item) => item?.payment_status_key === "on_hold").length,
    rejected: items.filter((item) => item?.payment_status_key === "rejected").length,
  }), [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Vendor Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Payments</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review read-only invoice and payment status for assigned AMC work. Payments are visible
          once assignments reach payment-eligible states.
        </p>
      </section>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      ) : (
        <>
          <section aria-label="Payments summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Ready for Invoice" value={counts.readyForInvoice} />
            <SummaryCard label="Invoice Received" value={counts.invoiceReceived} />
            <SummaryCard label="Approved" value={counts.approved} />
            <SummaryCard label="Scheduled" value={counts.scheduled} />
            <SummaryCard label="Paid" value={counts.paid} />
            <SummaryCard label="On Hold" value={counts.onHold} />
            <SummaryCard label="Rejected" value={counts.rejected} />
          </section>

          {successMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              {successMessage}
            </div>
          ) : null}

          {items.length > 0 ? (
            <section aria-label="Payments list" className="grid gap-3 lg:grid-cols-2">
              {items.map((item, index) => (
                <PaymentCard
                  key={item?.payment_key || item?.assignment_work_key || index}
                  item={item}
                  onInvoiceSubmitted={(message) => {
                    setSuccessMessage(message);
                    setReloadKey((key) => key + 1);
                  }}
                />
              ))}
            </section>
          ) : (
            <EmptyState />
          )}
        </>
      )}
    </div>
  );
}
