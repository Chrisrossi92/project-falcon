import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { listVendorAssignmentCandidates } from "../api";
import { getVendorProductTypeLabel } from "../coverage/productTypes";

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

function CandidateCard({ candidate }) {
  const matchReasons = formatReasonGroups(candidate.match_reasons);
  const coverageMatches = Array.isArray(candidate.coverage_matches)
    ? candidate.coverage_matches
    : [];
  const [bestCoverageMatch, ...otherCoverageMatches] = coverageMatches;
  const warningFlags = Array.isArray(candidate.warning_flags) ? candidate.warning_flags : [];
  const matchStrength = getMatchStrength(candidate.match_score);

  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">
              {candidate.vendor_company_name || "Vendor"}
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
    </article>
  );
}

export default function VendorAssignmentCandidatesPanel({
  orderId,
  enabled = true,
  activeVendorAssignment = null,
  className = "",
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCandidates = useCallback(async () => {
    if (!enabled || !orderId) return;
    setLoading(true);
    setError(null);

    try {
      const rows = await listVendorAssignmentCandidates(orderId);
      setCandidates(Array.isArray(rows) ? rows : []);
    } catch (candidateError) {
      setCandidates([]);
      setError(candidateError);
    } finally {
      setLoading(false);
    }
  }, [enabled, orderId]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    loadCandidates();
  }, [enabled, loadCandidates, orderId]);

  if (!enabled) return null;

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
              This order already has an active vendor offer or assignment.
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
          <p className="mt-1">Review the order details and try again.</p>
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
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.vendor_profile_id || `${candidate.vendor_company_id}-${candidate.match_score}`}
              candidate={candidate}
            />
          ))}
        </div>
      )}
    </section>
  );
}
