import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

import { offerOrderToVendor } from "@/features/assignments/api";
import { createOrderVendorBidRequest } from "@/features/bids/api";
import { listVendorAssignmentCandidates } from "../api";
import { getVendorProductTypeLabel } from "../coverage/productTypes";
import { getVendorErrorMessage } from "../vendorErrors";

const ACTIVE_VENDOR_OFFER_ERROR = "order_vendor_assignment_active_exists";

function humanize(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function getMatchStrength(score) {
  const numericScore = Number(score);
  if (score === null || score === undefined || Number.isNaN(numericScore)) {
    return "Not scored";
  }
  if (numericScore >= 90) return "Strong match";
  if (numericScore >= 70) return "Good match";
  if (numericScore >= 50) return "Possible match";
  return "Limited match";
}

function formatScoreValue(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return "Not scored";
  return `${Number(score)} score`;
}

function formatCoverageMatch(match = {}) {
  const parts = [];
  if (match.state) parts.push(match.state);
  if (match.zip) parts.push(`ZIP ${match.zip}`);
  if (match.county) parts.push(`${match.county} County`);
  if (match.market) parts.push(match.market);
  if (match.radius_miles !== null && match.radius_miles !== undefined) {
    parts.push(`${match.radius_miles} mi`);
  }
  if (match.product_type) parts.push(getVendorProductTypeLabel(match.product_type));
  if (match.match_type) parts.push(humanize(match.match_type));
  return parts.length ? parts.join(" · ") : "Coverage match";
}

function compactCandidateSnapshot(candidate = {}) {
  return {
    vendor_profile_id: candidate.vendor_profile_id || null,
    vendor_company_id: candidate.vendor_company_id || null,
    vendor_company_name: candidate.vendor_company_name || null,
    relationship_id: candidate.relationship_id || null,
    relationship_status: candidate.relationship_status || null,
    vendor_status: candidate.vendor_status || null,
    match_score: candidate.match_score ?? null,
    match_reasons: candidate.match_reasons || {},
    coverage_matches: Array.isArray(candidate.coverage_matches) ? candidate.coverage_matches : [],
    primary_contact: candidate.primary_contact || {},
    warning_flags: Array.isArray(candidate.warning_flags) ? candidate.warning_flags : [],
  };
}

function toIsoDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toIsoDateOnlyOrDateTime(value) {
  return toIsoDateTime(value);
}

function formatCandidateOfferError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  if (message.includes(ACTIVE_VENDOR_OFFER_ERROR) || code === ACTIVE_VENDOR_OFFER_ERROR) {
    return "This order already has an active vendor offer or assignment.";
  }
  if (/permission|not authorized|42501/i.test(message) || code === "42501") {
    return "You do not have permission to offer this assignment.";
  }
  return "Assignment offer could not be sent. Review the details and try again.";
}

function formatRequestBidsError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  if (/permission|not authorized|42501/i.test(message) || code === "42501") {
    return "You do not have permission to create bid requests.";
  }
  if (/duplicate|open.*bid|already.*open/i.test(message)) {
    return "One or more selected vendors already have an open bid request for this order.";
  }
  if (/scope|amc_operations|order_scope_not_amc_operations/i.test(message)) {
    return "Bid requests are only available for AMC Operations orders.";
  }
  return "Bid request could not be created. Review the details and try again.";
}

function hasCandidateOfferFields(candidate = {}) {
  return Boolean(candidate.vendor_profile_id && candidate.vendor_company_id && candidate.relationship_id);
}

function getCandidateSelectionKey(candidate = {}) {
  return candidate.vendor_profile_id || candidate.vendor_company_id || candidate.relationship_id || "";
}

function getCandidateBidSelectionBlocker({
  candidate = {},
  enabled = true,
  activeVendorAssignment = null,
}) {
  if (!enabled) return "Vendor selection is unavailable right now.";
  if (activeVendorAssignment) return "Selection disabled while a vendor assignment is active.";
  if (!candidate.vendor_profile_id) return "Vendor profile is required before this vendor can receive a bid request.";
  if (!candidate.vendor_company_id) return "Vendor company is required before this vendor can receive a bid request.";
  if (!candidate.relationship_id) return "Active vendor relationship is required before this vendor can receive a bid request.";
  return "";
}

function formatGeographyReason(matchType) {
  switch (matchType) {
    case "zip":
      return "ZIP coverage matches this order";
    case "county":
      return "County coverage matches this order";
    case "statewide":
      return "Statewide coverage matches this order";
    case "market":
      return "Market coverage matches this order";
    default:
      return matchType ? `${humanize(matchType)} coverage matches this order` : null;
  }
}

function formatStatusReason(status) {
  switch (status) {
    case "preferred":
      return "Preferred vendor";
    case "active":
      return "Active vendor";
    case "probation":
      return "Probation vendor";
    default:
      return status ? `${humanize(status)} vendor` : null;
  }
}

function formatNetworkReason(status) {
  switch (status) {
    case "active":
      return "Active network vendor";
    case "invited":
      return "Pending network vendor";
    case "suspended":
      return "Suspended network vendor";
    default:
      return status ? `${humanize(status)} network vendor` : null;
  }
}

function formatWarning(warning) {
  switch (warning) {
    case "missing_order_zip":
      return "Order ZIP is missing, so ZIP coverage could not be checked.";
    case "missing_order_county":
      return "Order county is missing, so county coverage could not be checked.";
    case "unknown_order_product":
      return "Order product could not be mapped confidently.";
    case "market_text_match_only":
      return "Market match is text-only; radius distance was not verified.";
    case "probation_vendor":
      return "Vendor is on probation.";
    case "missing_order_state":
      return "Order state is missing, so state coverage could not be checked.";
    case "missing_order_market":
      return "Order market is missing, so market coverage could not be checked.";
    default:
      return humanize(warning);
  }
}

function formatReasonGroups(reasons = {}) {
  const entries = [];
  const geography = reasons.geography || {};
  const product = reasons.product || {};
  const geographyReason = formatGeographyReason(geography.best_match);
  const statusReason = formatStatusReason(reasons.vendor_status);
  const networkReason = formatNetworkReason(reasons.relationship_status);

  if (geographyReason) {
    entries.push({ label: "Geography", value: geographyReason });
  }

  if (Array.isArray(product.matched_product_types) && product.matched_product_types.length > 0) {
    const productLabels = product.matched_product_types.map(getVendorProductTypeLabel);
    entries.push({
      label: "Product",
      value: `${productLabels.join(", ")} product coverage`,
    });
  }

  if (statusReason) {
    entries.push({ label: "Vendor status", value: statusReason });
  }

  if (networkReason) {
    entries.push({ label: "Network status", value: networkReason });
  }

  return entries;
}

function PrimaryContact({ contact }) {
  if (!contact || Object.keys(contact).length === 0) {
    return <div className="text-xs font-medium text-slate-400">No primary contact listed</div>;
  }

  const details = [
    contact.email,
    contact.phone,
    contact.role_label,
  ].filter(Boolean);

  return (
    <div>
      <div className="text-sm font-semibold text-slate-800">{contact.name || "Primary contact"}</div>
      {details.length > 0 && (
        <div className="mt-1 text-xs text-slate-500">{details.join(" · ")}</div>
      )}
    </div>
  );
}

function CandidateOfferModal({
  candidate,
  orderId,
  orderDueAt,
  onClose,
  onSuccess,
}) {
  const closeButtonRef = useRef(null);
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reviewDueAt, setReviewDueAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const coverageMatches = Array.isArray(candidate?.coverage_matches) ? candidate.coverage_matches : [];
  const bestCoverageMatch = coverageMatches[0] || null;
  const matchStrength = getMatchStrength(candidate?.match_score);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);
    try {
      const assignmentId = await offerOrderToVendor({
        orderId,
        vendorProfileId: candidate.vendor_profile_id,
        vendorCompanyId: candidate.vendor_company_id,
        relationshipId: candidate.relationship_id,
        note: note.trim() || null,
        dueAt: toIsoDateTime(dueAt || orderDueAt),
        reviewDueAt: toIsoDateTime(reviewDueAt),
        expiresAt: toIsoDateTime(expiresAt),
        candidateSnapshot: compactCandidateSnapshot(candidate),
      });
      await onSuccess?.(assignmentId);
    } catch (offerError) {
      setError(formatCandidateOfferError(offerError));
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
        aria-labelledby="vendor-offer-assignment-title"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor offer</div>
            <h2 id="vendor-offer-assignment-title" className="mt-1 text-xl font-semibold text-slate-950">
              Offer Assignment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              This will send an assignment offer to the vendor.
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Close offer assignment modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vendor</div>
            <div className="mt-1 text-base font-semibold text-slate-950">
              {candidate.vendor_company_name || "Vendor"}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                {matchStrength}
                {candidate.match_score !== null && candidate.match_score !== undefined
                  ? ` · ${candidate.match_score} score`
                  : ""}
              </span>
              {bestCoverageMatch && (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                  {formatCoverageMatch(bestCoverageMatch)}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-blue-900">
            The vendor still needs to accept before work is considered assigned.
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Message to vendor
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              placeholder="Optional note or assignment instructions"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Due date
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Review due date
              <input
                type="datetime-local"
                value={reviewDueAt}
                onChange={(event) => setReviewDueAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Expiration date
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send offer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RequestBidsModal({ orderId, selectedCandidates, onClose, onSuccess }) {
  const closeButtonRef = useRef(null);
  const [message, setMessage] = useState("");
  const [responseDueAt, setResponseDueAt] = useState("");
  const [desiredVendorDueAt, setDesiredVendorDueAt] = useState("");
  const [clientDueAt, setClientDueAt] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !orderId || selectedCandidates.length === 0) return;

    setError("");
    setSubmitting(true);
    try {
      const recipients = selectedCandidates.map((candidate) => ({
        vendorProfileId: candidate.vendor_profile_id,
        vendorCompanyId: candidate.vendor_company_id,
        relationshipId: candidate.relationship_id,
        candidateSnapshot: compactCandidateSnapshot(candidate),
      }));
      const result = await createOrderVendorBidRequest({
        orderId,
        recipients,
        message: message.trim() || null,
        responseDueAt: toIsoDateOnlyOrDateTime(responseDueAt),
        desiredVendorDueAt: toIsoDateOnlyOrDateTime(desiredVendorDueAt),
        clientDueAt: toIsoDateOnlyOrDateTime(clientDueAt),
        metadata: {
          candidate_snapshots: selectedCandidates.map(compactCandidateSnapshot),
        },
      });
      await onSuccess?.(result);
    } catch (requestError) {
      setError(formatRequestBidsError(requestError));
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
        aria-labelledby="request-bids-title"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bid outreach</div>
            <h2 id="request-bids-title" className="mt-1 text-xl font-semibold text-slate-950">
              Request bids
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ask selected vendors for fee and turnaround.
            </p>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close request bids modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <div className="rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-blue-900">
            No assignment is created until a bid is selected.
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Selected vendors
            </div>
            <ul className="mt-2 grid gap-2" aria-label="Selected vendors for bid request">
              {selectedCandidates.map((candidate) => (
                <li
                  key={getCandidateSelectionKey(candidate)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {candidate.vendor_company_name || "Vendor"}
                </li>
              ))}
            </ul>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Message to vendors
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              placeholder="Optional bid request instructions"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Response due date
              <input
                type="datetime-local"
                value={responseDueAt}
                onChange={(event) => setResponseDueAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Desired vendor report due date
              <input
                type="datetime-local"
                value={desiredVendorDueAt}
                onChange={(event) => setDesiredVendorDueAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Client delivery due date
              <input
                type="datetime-local"
                value={clientDueAt}
                onChange={(event) => setClientDueAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !orderId || selectedCandidates.length === 0}
            className="rounded-md border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
          >
            {submitting ? "Sending..." : "Send bid request"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CandidateCard({
  candidate,
  canOfferAssignment,
  activeVendorAssignment,
  orderId,
  orderDueAt,
  onOfferSuccess,
  selectable = false,
  selected = false,
  selectionBlocker = "",
  onSelectionChange,
}) {
  const matchReasons = formatReasonGroups(candidate.match_reasons);
  const coverageMatches = Array.isArray(candidate.coverage_matches)
    ? candidate.coverage_matches
    : [];
  const [bestCoverageMatch, ...otherCoverageMatches] = coverageMatches;
  const warningFlags = Array.isArray(candidate.warning_flags) ? candidate.warning_flags : [];
  const matchStrength = getMatchStrength(candidate.match_score);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const canOfferThisCandidate =
    canOfferAssignment &&
    !activeVendorAssignment &&
    orderId &&
    hasCandidateOfferFields(candidate);
  const vendorName = candidate.vendor_company_name || "Vendor";

  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={selected}
                disabled={!selectable}
                onChange={(event) => onSelectionChange?.(event.target.checked)}
                aria-label={`Select ${vendorName} for bid request`}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-950">
                  {vendorName}
                </h3>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {humanize(candidate.vendor_status)}
                </span>
                {candidate.relationship_status && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Network: {humanize(candidate.relationship_status)}
                  </span>
                )}
              </div>
              <div className={`mt-1 text-xs ${selectable ? "text-slate-500" : "text-amber-700"}`}>
                {selectable ? "Selectable for future bid request outreach." : selectionBlocker}
              </div>
            </div>
          </div>
        </div>
        <div className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Match strength</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {matchStrength}
          </div>
          <div className="mt-0.5 text-xs font-medium text-slate-500">
            {formatScoreValue(candidate.match_score)}
          </div>
        </div>
      </div>

      {canOfferThisCandidate && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Direct award
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Direct assignment is available for known vendors. Multi-vendor bid requests are planned.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOfferModalOpen(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100"
            >
              Offer Assignment
            </button>
          </div>
        </div>
      )}

      {matchReasons.length > 0 && (
        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/60 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-500">
            Why this vendor?
          </div>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {matchReasons.map((reason) => (
              <div key={`${reason.label}-${reason.value}`}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                  {reason.label}
                </dt>
                <dd className="mt-0.5 text-xs font-semibold text-blue-800">
                  {reason.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Coverage
          </div>
          {coverageMatches.length > 0 ? (
            <div className="mt-2">
              <div className="text-xs font-semibold text-slate-800">
                Best match: {formatCoverageMatch(bestCoverageMatch)}
              </div>
              {otherCoverageMatches.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900">
                    View all coverage matches
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-1.5 overflow-auto pr-1">
                    {coverageMatches.map((match, index) => (
                      <li key={`${match.vendor_service_area_id || "coverage"}-${index}`} className="text-xs font-medium text-slate-700">
                        {formatCoverageMatch(match)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ) : (
            <div className="mt-2 text-xs font-medium text-slate-400">No coverage details returned</div>
          )}
        </div>

        <div className="rounded-md border border-slate-100 bg-slate-50/70 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Primary Contact
          </div>
          <div className="mt-2">
            <PrimaryContact contact={candidate.primary_contact} />
          </div>
        </div>
      </div>

      {warningFlags.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Review before using
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`Warnings for ${candidate.vendor_company_name || "vendor"}`}>
            {warningFlags.map((warning) => (
              <li key={warning} className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-semibold">
                {formatWarning(warning)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {offerModalOpen && (
        <CandidateOfferModal
          candidate={candidate}
          orderId={orderId}
          orderDueAt={orderDueAt}
          onClose={() => setOfferModalOpen(false)}
          onSuccess={async (assignmentId) => {
            setOfferModalOpen(false);
            await onOfferSuccess?.(assignmentId);
          }}
        />
      )}
    </article>
  );
}

export default function VendorAssignmentCandidatesPanel({
  orderId,
  enabled = true,
  activeVendorAssignment = null,
  canOfferAssignment = false,
  orderDueAt = null,
  onOfferSuccess,
  onBidRequestSuccess,
  className = "",
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState(() => new Set());
  const [requestBidsModalOpen, setRequestBidsModalOpen] = useState(false);

  const loadCandidates = useCallback(async () => {
    if (!enabled || !orderId) return;
    setLoading(true);
    setError(null);

    try {
      const rows = await listVendorAssignmentCandidates(orderId);
      setCandidates(Array.isArray(rows) ? rows : []);
      setSelectedCandidateKeys(new Set());
      setRequestBidsModalOpen(false);
    } catch (candidateError) {
      if (import.meta.env.DEV || import.meta.env.MODE === "test") {
        console.warn("[VendorAssignmentCandidatesPanel] candidate load failed", {
          code: candidateError?.code,
          message: candidateError?.message,
          details: candidateError?.details,
          hint: candidateError?.hint,
        });
      }
      setCandidates([]);
      setSelectedCandidateKeys(new Set());
      setRequestBidsModalOpen(false);
      setError(candidateError);
    } finally {
      setLoading(false);
    }
  }, [enabled, orderId]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    loadCandidates();
  }, [enabled, loadCandidates, orderId]);

  useEffect(() => {
    if (!enabled || activeVendorAssignment) {
      setSelectedCandidateKeys(new Set());
      setRequestBidsModalOpen(false);
    }
  }, [activeVendorAssignment, enabled]);

  if (!enabled) return null;

  const selectionRows = candidates.map((candidate) => {
    const key = getCandidateSelectionKey(candidate);
    const blocker = getCandidateBidSelectionBlocker({
      candidate,
      enabled,
      activeVendorAssignment,
    });

    return {
      candidate,
      key,
      blocker,
      selectable: Boolean(key && !blocker),
      selected: Boolean(key && selectedCandidateKeys.has(key)),
    };
  });
  const eligibleSelectionRows = selectionRows.filter((row) => row.selectable);
  const selectedCandidateRows = selectionRows.filter((row) => row.selected);
  const selectedCandidates = selectedCandidateRows.map((row) => row.candidate);
  const selectedCount = selectionRows.filter((row) => row.selected).length;
  const selectedCountLabel = `${selectedCount} selected`;

  const handleCandidateSelectionChange = (key, selected) => {
    if (!key) return;
    setSelectedCandidateKeys((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleSelectAllEligible = () => {
    setSelectedCandidateKeys(new Set(eligibleSelectionRows.map((row) => row.key)));
  };

  const handleClearSelection = () => {
    setSelectedCandidateKeys(new Set());
  };

  const handleOpenRequestBidsModal = () => {
    if (selectedCount === 0 || activeVendorAssignment) return;
    setRequestBidsModalOpen(true);
  };

  const handleBidRequestSuccess = async (result) => {
    setRequestBidsModalOpen(false);
    setSelectedCandidateKeys(new Set());
    await onBidRequestSuccess?.(result);
  };

  return (
    <section className={`rounded-md border border-slate-200 bg-white p-3 shadow-sm ${className}`} aria-label="Vendor candidates">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Suggested vendors
          </div>
          <p className="mt-1 text-sm font-medium text-slate-950">
            Based on vendor coverage and product fit.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This does not assign work automatically.
          </p>
          {activeVendorAssignment && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="font-semibold">Vendor assignment already active</div>
              <p className="mt-1">
                This order already has an active vendor offer or assignment, so new bid requests and direct awards are disabled.
              </p>
            </div>
          )}
        </div>
        {orderId && (
          <button
            type="button"
            onClick={loadCandidates}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>

      {!orderId && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Order context is required before vendor candidates can load.
        </div>
      )}

      {loading && (
        <div role="status" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Loading suggested vendors...
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div className="font-semibold">Suggested vendors could not load.</div>
          <p className="mt-1">
            {getVendorErrorMessage(error, {
              permissionMessage: "You do not have permission to view vendor suggestions.",
              fallback: "Review the order details and try again.",
            })}
          </p>
        </div>
      )}

      {!loading && !error && orderId && candidates.length === 0 && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">No suggested vendors</div>
          <p className="mt-1 leading-6">
            Falcon did not find active vendors with matching coverage and product fit for this order.
          </p>
        </div>
      )}

      {!loading && !error && candidates.length > 0 && (
        <div className="mt-3 grid gap-3">
          <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Bid request selection
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{selectedCountLabel}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!activeVendorAssignment && (
                <button
                  type="button"
                  onClick={handleOpenRequestBidsModal}
                  disabled={selectedCount === 0}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Request bids
                </button>
              )}
              <button
                type="button"
                onClick={handleSelectAllEligible}
                disabled={eligibleSelectionRows.length === 0}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select all eligible
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={selectedCount === 0}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear selection
              </button>
            </div>
          </div>
          {selectionRows.map(({ candidate, key, selectable, selected, blocker }) => (
            <CandidateCard
              key={key || `${candidate.vendor_company_id}-${candidate.match_score}`}
              candidate={candidate}
              canOfferAssignment={canOfferAssignment}
              activeVendorAssignment={activeVendorAssignment}
              orderId={orderId}
              orderDueAt={orderDueAt}
              onOfferSuccess={onOfferSuccess}
              selectable={selectable}
              selected={selected}
              selectionBlocker={blocker}
              onSelectionChange={(isSelected) => handleCandidateSelectionChange(key, isSelected)}
            />
          ))}
        </div>
      )}
      {requestBidsModalOpen && (
        <RequestBidsModal
          orderId={orderId}
          selectedCandidates={selectedCandidates}
          onClose={() => setRequestBidsModalOpen(false)}
          onSuccess={handleBidRequestSuccess}
        />
      )}
    </section>
  );
}
