import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createVendorWorkspaceDocumentDownloadUrl,
  declineVendorWorkspaceBidOpportunity,
  fetchVendorWorkspaceAvailableWorkDetail,
  submitVendorWorkspaceBidResponse,
} from "@/features/vendorWorkspace/api.js";

const statusLabels = Object.freeze({
  available: "Available",
  viewed: "Viewed",
  due_soon: "Due soon",
  overdue: "Overdue",
  expired: "Expired",
  submitted: "Submitted",
  declined: "Passed",
  selected: "Selected",
  not_selected: "Not Selected",
});

const statusClasses = Object.freeze({
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  viewed: "border-slate-200 bg-slate-50 text-slate-600",
  due_soon: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-rose-200 bg-rose-50 text-rose-700",
  expired: "border-rose-200 bg-rose-50 text-rose-700",
  submitted: "border-sky-200 bg-sky-50 text-sky-700",
  declined: "border-slate-200 bg-slate-50 text-slate-600",
  selected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  not_selected: "border-amber-200 bg-amber-50 text-amber-700",
});

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatFileSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "Size pending";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not specified";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function getMarket(order = {}) {
  return [order.city, order.state, order.postal_code].filter(Boolean).join(", ");
}

function LoadingState() {
  return (
    <section aria-label="Loading work detail" className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="mt-4 h-7 w-72 rounded bg-slate-200" />
        <div className="mt-4 h-3 w-full max-w-2xl rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="h-80 rounded-lg border border-slate-200 bg-white shadow-sm" />
        <div className="h-80 rounded-lg border border-slate-200 bg-white shadow-sm" />
      </div>
    </section>
  );
}

function UnavailableState({ onRetry }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-950">Work detail unavailable</h1>
      <p className="mt-2 max-w-2xl">
        This work item is no longer available, or your company does not have access to it.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/vendor-workspace/available-work"
          className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
        >
          Back to Available Work
        </Link>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-950">{value || "Not specified"}</dd>
    </div>
  );
}

function DocumentsList({ documents, workKey }) {
  const [busyDocumentKey, setBusyDocumentKey] = useState(null);
  const [documentErrors, setDocumentErrors] = useState({});

  if (!documents.length) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No vendor-visible documents are available for this opportunity yet.
      </div>
    );
  }

  async function handleOpenDocument(document) {
    if (!document.document_key) return;

    setBusyDocumentKey(document.document_key);
    setDocumentErrors((current) => {
      const next = { ...current };
      delete next[document.document_key];
      return next;
    });

    try {
      const result = await createVendorWorkspaceDocumentDownloadUrl(workKey, document.document_key);
      window.open(result.signed_url, "_blank", "noopener,noreferrer");
    } catch {
      setDocumentErrors((current) => ({
        ...current,
        [document.document_key]: "This document cannot be opened right now. Please try again later.",
      }));
    } finally {
      setBusyDocumentKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {documents.map((document, index) => (
        <article key={`${document.file_name || "document"}-${index}`} className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">
                {document.title || document.file_name || "Document"}
              </div>
              {!document.document_key ? (
                <p className="mt-1 text-xs text-slate-500">This document cannot be opened right now.</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!document.document_key || busyDocumentKey === document.document_key}
              onClick={() => handleOpenDocument(document)}
              className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {busyDocumentKey === document.document_key ? "Opening..." : "Open"}
            </button>
          </div>
          <dl className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <DetailRow label="Category" value={document.category} />
            <DetailRow label="Type" value={document.mime_type} />
            <DetailRow label="Size" value={formatFileSize(document.file_size)} />
            <DetailRow label="Added" value={formatDate(document.created_at)} />
          </dl>
          {documentErrors[document.document_key] ? (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
              {documentErrors[document.document_key]}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

const submitErrorMessages = Object.freeze({
  available_work_unavailable: "This work item is no longer available.",
  bid_already_submitted: "A bid has already been submitted for this opportunity.",
  bid_already_declined: "This opportunity has already been passed.",
  bid_opportunity_expired: "The bid deadline has passed.",
  bid_submission_invalid: "Check the highlighted fields and try again.",
});

const declineErrorMessages = Object.freeze({
  available_work_unavailable: "This work item is no longer available.",
  bid_already_submitted: "A bid has already been submitted for this opportunity.",
  bid_already_declined: "This opportunity has already been passed.",
  bid_opportunity_expired: "The bid deadline has passed.",
  bid_decline_invalid: "Check the decline details and try again.",
});

const declineReasons = Object.freeze([
  "Too busy / capacity",
  "Outside coverage area",
  "Fee does not work",
  "Due date / turn time does not work",
  "Other",
]);

function SubmittedBidSummary({ bid }) {
  if (!bid) return null;

  return (
    <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
      <h2 className="text-lg font-semibold">Bid Submitted</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailRow label="Fee" value={formatMoney(bid.fee_amount, bid.currency)} />
        <DetailRow label="Turn Time" value={bid.turn_time_days ? `${bid.turn_time_days} days` : null} />
        <DetailRow label="Proposed Due Date" value={formatDate(bid.proposed_due_at)} />
        <DetailRow label="Submitted" value={formatDate(bid.submitted_at)} />
      </dl>
      {bid.comments ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-white/70 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Comments</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{bid.comments}</p>
        </div>
      ) : null}
    </article>
  );
}

function DeclinedOpportunitySummary({ decline }) {
  if (!decline) return null;

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
      <h2 className="text-lg font-semibold text-slate-950">Opportunity Passed</h2>
      <dl className="mt-4 grid gap-3">
        <DetailRow label="Reason" value={decline.reason} />
        <DetailRow label="Passed" value={formatDate(decline.declined_at)} />
      </dl>
      {decline.comments ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Comments</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{decline.comments}</p>
        </div>
      ) : null}
    </article>
  );
}

function SelectionOutcomeSummary({ status, bid }) {
  if (status !== "selected" && status !== "not_selected") return null;

  const isSelected = status === "selected";

  return (
    <article
      className={`rounded-lg border p-5 text-sm ${
        isSelected
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <h2 className="text-lg font-semibold">{isSelected ? "Bid Selected" : "Bid Not Selected"}</h2>
      <p className="mt-2 leading-6">
        {isSelected
          ? "Your submitted bid was selected for this opportunity."
          : "This opportunity has closed and your submitted bid was not selected."}
      </p>
      {bid?.submitted_at ? (
        <dl className="mt-4 grid gap-3">
          <DetailRow label="Submitted" value={formatDate(bid.submitted_at)} />
        </dl>
      ) : null}
    </article>
  );
}

function ExpiredOpportunitySummary({ expiredAt }) {
  return (
    <article className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <h2 className="text-lg font-semibold">Opportunity Expired</h2>
      <p className="mt-2 leading-6">
        The bid deadline has passed. Bid submission and pass actions are no longer available.
      </p>
      <dl className="mt-4 grid gap-3">
        <DetailRow label="Expired" value={formatDate(expiredAt)} />
      </dl>
    </article>
  );
}

function DeclineOpportunityPanel({ workKey, onDeclined, onSubmitted, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    reason: "",
    comments: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [declineError, setDeclineError] = useState(null);
  const [isDeclining, setIsDeclining] = useState(false);

  function updateField(field, value) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setDeclineError(null);
  }

  async function handleDecline() {
    setIsDeclining(true);
    setDeclineError(null);
    setFieldErrors({});

    try {
      const result = await declineVendorWorkspaceBidOpportunity(workKey, formValues);
      if (result.ok || result.error === "bid_already_declined") {
        onDeclined(result.decline);
        return;
      }

      if (result.error === "bid_already_submitted") {
        onSubmitted(result.bid);
        return;
      }

      setFieldErrors(result.field_errors || {});
      setDeclineError(result.error || "available_work_unavailable");
    } catch (error) {
      setDeclineError(error?.message || "available_work_unavailable");
    } finally {
      setIsDeclining(false);
    }
  }

  const errorMessage = declineErrorMessages[declineError] || declineError || null;

  if (!isOpen) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        Pass Opportunity
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-950">Pass Opportunity</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Confirm that your company is passing on this bid opportunity.
      </p>

      {errorMessage ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Reason
        <select
          value={formValues.reason}
          onChange={(event) => updateField("reason", event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950"
        >
          <option value="">No reason selected</option>
          {declineReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
        {fieldErrors.reason ? <span className="mt-1 block text-xs text-rose-700">{fieldErrors.reason}</span> : null}
      </label>

      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Pass Comments
        <textarea
          value={formValues.comments}
          onChange={(event) => updateField("comments", event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950"
        />
        {fieldErrors.comments ? <span className="mt-1 block text-xs text-rose-700">{fieldErrors.comments}</span> : null}
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={isDeclining}
          onClick={handleDecline}
          className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isDeclining ? "Passing..." : "Confirm Pass"}
        </button>
        <button
          type="button"
          disabled={isDeclining}
          onClick={() => {
            setIsOpen(false);
            setDeclineError(null);
            setFieldErrors({});
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function BidSubmissionForm({ workKey, onSubmitted, onDeclined }) {
  const [formValues, setFormValues] = useState({
    fee_amount: "",
    currency: "USD",
    turn_time_days: "",
    proposed_due_at: "",
    comments: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      delete next.timing;
      return next;
    });
    setSubmitError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const result = await submitVendorWorkspaceBidResponse(workKey, formValues);
      if (result.ok || result.error === "bid_already_submitted") {
        onSubmitted(result.bid);
        return;
      }

      if (result.error === "bid_already_declined") {
        onDeclined(result.decline);
        return;
      }

      setFieldErrors(result.field_errors || {});
      setSubmitError(result.error || "available_work_unavailable");
    } catch (error) {
      setSubmitError(error?.message || "available_work_unavailable");
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorMessage = submitErrorMessages[submitError] || submitError || null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Fee
          <input
            type="number"
            min="0"
            step="0.01"
            value={formValues.fee_amount}
            onChange={(event) => updateField("fee_amount", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950"
          />
          {fieldErrors.fee_amount ? <span className="mt-1 block text-xs text-rose-700">{fieldErrors.fee_amount}</span> : null}
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Currency
          <input
            type="text"
            value={formValues.currency}
            onChange={(event) => updateField("currency", event.target.value.toUpperCase())}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950"
          />
          {fieldErrors.currency ? <span className="mt-1 block text-xs text-rose-700">{fieldErrors.currency}</span> : null}
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Turn Time Days
          <input
            type="number"
            min="0"
            step="1"
            value={formValues.turn_time_days}
            onChange={(event) => updateField("turn_time_days", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950"
          />
          {fieldErrors.turn_time_days ? <span className="mt-1 block text-xs text-rose-700">{fieldErrors.turn_time_days}</span> : null}
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Proposed Due Date
          <input
            type="datetime-local"
            value={formValues.proposed_due_at}
            onChange={(event) => updateField("proposed_due_at", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950"
          />
          {fieldErrors.proposed_due_at ? <span className="mt-1 block text-xs text-rose-700">{fieldErrors.proposed_due_at}</span> : null}
        </label>
      </div>

      {fieldErrors.timing ? <div className="text-xs text-rose-700">{fieldErrors.timing}</div> : null}

      <label className="block text-sm font-semibold text-slate-700">
        Comments
        <textarea
          value={formValues.comments}
          onChange={(event) => updateField("comments", event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950"
        />
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isSubmitting ? "Submitting Bid..." : "Submit Bid"}
        </button>
        <DeclineOpportunityPanel
          workKey={workKey}
          disabled={isSubmitting}
          onDeclined={onDeclined}
          onSubmitted={onSubmitted}
        />
      </div>
    </form>
  );
}

export default function VendorAvailableWorkDetailPage() {
  const { workKey } = useParams();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [submittedBid, setSubmittedBid] = useState(null);
  const [declinedOpportunity, setDeclinedOpportunity] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);

      try {
        const nextDetail = await fetchVendorWorkspaceAvailableWorkDetail(workKey);
        if (isMounted) setDetail(nextDetail);
      } catch (nextError) {
        if (isMounted) setError(nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, workKey]);

  if (isLoading) return <LoadingState />;

  if (error || !detail?.ok || !detail?.item) {
    return <UnavailableState onRetry={() => setReloadKey((key) => key + 1)} />;
  }

  const item = detail.item;
  const order = item.order || {};
  const owner = item.owner || {};
  const summary = item.summary || {};
  const documents = Array.isArray(item.documents) ? item.documents : [];
  const serverStatus = item.status || "available";
  const status = submittedBid ? "submitted" : declinedOpportunity ? "declined" : serverStatus;
  const effectiveBid = submittedBid || item.bid || null;
  const effectiveDecline = declinedOpportunity || item.decline || null;
  const statusClass = statusClasses[status] || statusClasses.available;
  const market = getMarket(order);
  const isOpenOpportunity = ["available", "viewed", "due_soon", "overdue"].includes(status);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Work Detail
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              {order.property_address || "Work detail"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{market || order.county || "Market pending"}</p>
          </div>
          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>
            {statusLabels[status] || statusLabels.available}
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Work Summary</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailRow label="Owner" value={owner.company_name || "AMC coordinator"} />
            <DetailRow label="Order" value={order.order_number} />
            <DetailRow label="Report Type" value={order.report_type} />
            <DetailRow label="Property Type" value={order.property_type} />
            <DetailRow label="County" value={order.county} />
            <DetailRow label="Bid Deadline" value={formatDate(item.bid_due_at)} />
            <DetailRow label="Requested Due Date" value={formatDate(item.requested_due_date)} />
            <DetailRow
              label="Requested Turn Time"
              value={item.requested_turn_time_days ? `${item.requested_turn_time_days} days` : null}
            />
          </dl>

          <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Scope Summary</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {summary.scope || "Scope summary has not been provided yet."}
            </p>
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Vendor Instructions</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {item.instructions || "No additional vendor instructions were provided."}
            </p>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Status and Actions</h2>
            {status === "selected" || status === "not_selected" ? (
              <div className="mt-4 space-y-4">
                <SelectionOutcomeSummary status={status} bid={effectiveBid} />
                <SubmittedBidSummary bid={effectiveBid} />
              </div>
            ) : status === "submitted" ? (
              <div className="mt-4">
                <SubmittedBidSummary bid={effectiveBid} />
              </div>
            ) : status === "declined" ? (
              <div className="mt-4">
                <DeclinedOpportunitySummary decline={effectiveDecline} />
              </div>
            ) : status === "expired" ? (
              <div className="mt-4">
                <ExpiredOpportunitySummary expiredAt={item.expired_at || item.bid_due_at} />
              </div>
            ) : isOpenOpportunity ? (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Submit a bid for this opportunity or pass if your company cannot take it.
                </p>
                <div className="mt-5">
                  <BidSubmissionForm
                    workKey={workKey}
                    onSubmitted={setSubmittedBid}
                    onDeclined={setDeclinedOpportunity}
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This opportunity is not currently available for bid actions.
              </p>
            )}
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
            <p className="mt-1 text-sm text-slate-500">
              {Number(summary.documents_available || documents.length || 0).toLocaleString()} vendor-visible documents
            </p>
            <div className="mt-4">
              <DocumentsList documents={documents} workKey={item.work_key || workKey} />
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
