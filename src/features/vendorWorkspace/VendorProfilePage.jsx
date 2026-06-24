import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchVendorWorkspaceProfile,
  fetchVendorWorkspaceProfileUpdateRequests,
  submitVendorWorkspaceProfileUpdateRequest,
} from "@/features/vendorWorkspace/api.js";

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function joinList(value, fallback = "Not provided") {
  const items = asArray(value);
  return items.length ? items.join(", ") : fallback;
}

function splitList(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLineList(value) {
  return String(value || "")
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (Array.isArray(entry)) return entry.length > 0;
      return entry !== null && entry !== undefined && String(entry).trim() !== "";
    }),
  );
}

function requestStatusLabel(status) {
  switch (status) {
    case "pending":
      return "Pending review";
    case "reviewing":
      return "In review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    default:
      return "Submitted";
  }
}

function Section({ title, children, action }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailGrid({ rows }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyText({ children }) {
  return (
    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
      {children}
    </p>
  );
}

function RequestSummary({ requests }) {
  const items = asArray(requests);
  const pendingCount = items.filter((request) => ["pending", "reviewing"].includes(request.status)).length;

  return (
    <Section title="Profile Update Requests">
      {pendingCount > 0 ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {pendingCount === 1
            ? "1 profile update request is waiting for AMC review."
            : `${pendingCount} profile update requests are waiting for AMC review.`}
        </div>
      ) : null}
      {items.length ? (
        <div className="space-y-2">
          {items.slice(0, 5).map((request) => (
            <div
              key={request.request_key || `${request.status}-${request.submitted_at}`}
              className="rounded-md border border-slate-200 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-800">
                  {requestStatusLabel(request.status)}
                </div>
                <div className="text-xs text-slate-500">
                  Submitted {formatDate(request.submitted_at)}
                </div>
              </div>
              {request.proposed_changes?.comments ? (
                <p className="mt-2 text-sm text-slate-600">{request.proposed_changes.comments}</p>
              ) : null}
              {request.reviewer_message ? (
                <p className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-sm text-slate-600">
                  {request.reviewer_message}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyText>No profile update requests have been submitted yet.</EmptyText>
      )}
    </Section>
  );
}

function CoverageSection({ coverage }) {
  const serviceAreas = asArray(coverage?.service_areas);
  const counties = asArray(coverage?.counties)
    .map((entry) => [entry?.county, entry?.state].filter(Boolean).join(", "))
    .filter(Boolean);

  return (
    <Section title="Coverage">
      <DetailGrid
        rows={[
          ["Coverage rows", coverage?.row_count ? String(coverage.row_count) : "0"],
          ["States", joinList(coverage?.states)],
          ["Counties", joinList(counties)],
          ["Markets", joinList(coverage?.markets)],
        ]}
      />
      {serviceAreas.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {serviceAreas.slice(0, 12).map((area, index) => (
            <div key={`${area.state || "state"}-${area.county || area.market || area.zip || index}`} className="rounded-md border border-slate-200 px-3 py-2">
              <div className="text-sm font-semibold text-slate-800">
                {[area.county, area.state].filter(Boolean).join(", ") || area.market || area.zip || "Coverage area"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {[area.product_type, area.radius_miles ? `${area.radius_miles} mi radius` : null].filter(Boolean).join(" · ") || "Active"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyText>No coverage areas are currently listed for your profile.</EmptyText>
        </div>
      )}
    </Section>
  );
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    publicPhone: "",
    website: "",
    coverageStates: "",
    coverageCounties: "",
    coverageMarkets: "",
    propertyTypes: "",
    reportTypes: "",
    comments: "",
  });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [requestFieldErrors, setRequestFieldErrors] = useState({});

  const loadProfile = useCallback(async ({ cancelled } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [result, requestResult] = await Promise.all([
        fetchVendorWorkspaceProfile(),
        fetchVendorWorkspaceProfileUpdateRequests(),
      ]);
      if (cancelled?.()) return;
      if (result.ok && result.profile) {
        setProfile(result.profile);
        setRequests(Array.isArray(requestResult.requests) ? requestResult.requests : []);
      } else {
        setProfile(null);
        setError(new Error("Vendor profile unavailable"));
      }
    } catch (err) {
      if (!cancelled?.()) setError(err);
    } finally {
      if (!cancelled?.()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    loadProfile({ cancelled: () => isCancelled });

    return () => {
      isCancelled = true;
    };
  }, [loadProfile]);

  const contacts = asArray(profile?.contacts);
  const acceptedWorkTypes = profile?.accepted_work_types || {};
  const compliance = useMemo(() => profile?.compliance || {}, [profile?.compliance]);
  const primaryContact = profile?.primary_contact;
  const company = profile?.company || {};
  const status = profile?.status || {};
  const coverage = profile?.coverage || {};

  const complianceRows = useMemo(() => [
    ["Compliance status", compliance.status || "Not provided"],
    ["Insurance", compliance.insurance_status || "Not provided"],
    ["License", compliance.license_status || "Not provided"],
    ["Documents", Number.isFinite(Number(compliance.document_count)) ? String(compliance.document_count) : "Not provided"],
    ["Last updated", formatDate(compliance.last_updated_at)],
  ], [compliance]);

  const hasComplianceSummary = Boolean(
    compliance.status ||
      compliance.insurance_status ||
      compliance.license_status ||
      Number(compliance.document_count) > 0 ||
      compliance.last_updated_at,
  );

  const openRequestModal = () => {
    setRequestForm({
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      publicPhone: "",
      website: "",
      coverageStates: "",
      coverageCounties: "",
      coverageMarkets: "",
      propertyTypes: "",
      reportTypes: "",
      comments: "",
    });
    setRequestFieldErrors({});
    setRequestError(null);
    setRequestSuccess(null);
    setRequestModalOpen(true);
  };

  const handleRequestInput = (event) => {
    const { name, value } = event.target;
    setRequestForm((current) => ({ ...current, [name]: value }));
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setRequestSubmitting(true);
    setRequestError(null);
    setRequestFieldErrors({});
    setRequestSuccess(null);

    const payload = {
      contact_changes: compactObject({
        name: requestForm.contactName,
        email: requestForm.contactEmail,
        phone: requestForm.contactPhone,
      }),
      company_changes: compactObject({
        public_phone: requestForm.publicPhone,
        website: requestForm.website,
      }),
      coverage_changes: compactObject({
        states: splitList(requestForm.coverageStates),
        counties: splitLineList(requestForm.coverageCounties),
        markets: splitList(requestForm.coverageMarkets),
      }),
      accepted_work_types: compactObject({
        property_types: splitList(requestForm.propertyTypes),
        report_types: splitList(requestForm.reportTypes),
      }),
      comments: requestForm.comments.trim(),
    };

    try {
      const result = await submitVendorWorkspaceProfileUpdateRequest(payload);
      if (!result.ok) {
        setRequestFieldErrors(result.field_errors || {});
        setRequestError("Review the request details and try again.");
        return;
      }

      setRequestSuccess("Profile update request submitted for AMC review.");
      setRequestModalOpen(false);
      const requestResult = await fetchVendorWorkspaceProfileUpdateRequests();
      setRequests(Array.isArray(requestResult.requests) ? requestResult.requests : []);
    } catch {
      setRequestError("Profile update request could not be submitted. Try again or contact the AMC coordinator.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        aria-label="Loading vendor profile"
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm"
        role="status"
      >
        Loading vendor profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        <div>Vendor profile unavailable. Confirm your vendor profile is active or contact the AMC coordinator.</div>
        <button
          className="mt-4 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          type="button"
          onClick={() => loadProfile()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Vendor Workspace
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Profile</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review your company profile, contacts, coverage, accepted work types, and compliance summary.
            </p>
          </div>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Profile editing requires AMC review
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-slate-900">Need to update this profile?</div>
          <p className="mt-1 text-sm text-slate-500">
            Submit profile, contact, coverage, and accepted work type changes for AMC review.
          </p>
          {requestSuccess ? <p className="mt-2 text-sm font-medium text-emerald-700">{requestSuccess}</p> : null}
        </div>
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          type="button"
          onClick={openRequestModal}
        >
          Request Update
        </button>
      </div>

      <Section title="Company">
        <DetailGrid
          rows={[
            ["Company", company.name],
            ["Status", status.is_active ? "Active" : "Inactive"],
            ["Profile status", status.vendor_status],
            ["Phone", company.public_phone],
            ["Website", company.website],
            ["Default turn time", profile.default_turn_time_days ? `${profile.default_turn_time_days} days` : "Not provided"],
            ["Last updated", formatDate(profile.last_updated_at)],
          ]}
        />
      </Section>

      <Section title="Vendor Manager & Contacts">
        {primaryContact ? (
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Primary vendor manager / signing appraiser</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{primaryContact.name || "Not provided"}</div>
            <div className="mt-1 text-sm text-slate-600">
              {[primaryContact.email, primaryContact.phone].filter(Boolean).join(" · ") || "No contact details listed"}
            </div>
          </div>
        ) : (
          <EmptyText>No vendor manager is currently listed.</EmptyText>
        )}
        {contacts.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {contacts.map((contact, index) => (
              <div key={`${contact.name || "contact"}-${contact.email || index}`} className="rounded-md border border-slate-200 px-3 py-2">
                <div className="text-sm font-semibold text-slate-800">{contact.name || "Contact"}</div>
                <div className="mt-1 text-xs text-slate-500">{contact.role_label || "Vendor contact"}</div>
                <div className="mt-1 text-sm text-slate-600">{[contact.email, contact.phone].filter(Boolean).join(" · ") || "No details listed"}</div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <CoverageSection coverage={profile.coverage} />

      <Section title="Accepted Work Types">
        <DetailGrid
          rows={[
            ["Product types", joinList(acceptedWorkTypes.product_types)],
            ["Property types", joinList(acceptedWorkTypes.property_types)],
            ["Report types", joinList(acceptedWorkTypes.report_types)],
          ]}
        />
        {!asArray(acceptedWorkTypes.product_types).length &&
          !asArray(acceptedWorkTypes.property_types).length &&
          !asArray(acceptedWorkTypes.report_types).length && (
            <div className="mt-4">
              <EmptyText>No accepted work types are currently listed.</EmptyText>
            </div>
          )}
      </Section>

      <Section title="Compliance / Documents">
        <DetailGrid rows={complianceRows} />
        {!hasComplianceSummary && (
          <div className="mt-4">
            <EmptyText>No compliance summary is currently listed.</EmptyText>
          </div>
        )}
      </Section>

      <RequestSummary requests={requests} />

      {requestModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <form
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            onSubmit={submitRequest}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Request Profile Update</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Proposed changes are reviewed before they affect operational coverage or matching.
                </p>
              </div>
              <button
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                type="button"
                onClick={() => setRequestModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">Current profile</div>
              <div className="mt-1">
                {company.name || "Vendor company"} · {primaryContact?.name || "No vendor manager"} ·{" "}
                {joinList(coverage.states)}
              </div>
            </div>

            {requestError ? (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {requestError}
              </div>
            ) : null}

            {requestFieldErrors.request ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {requestFieldErrors.request}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Vendor manager name
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="contactName"
                  placeholder={primaryContact?.name || "Proposed vendor manager name"}
                  value={requestForm.contactName}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Vendor manager email
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="contactEmail"
                  placeholder={primaryContact?.email || "Proposed vendor manager email"}
                  type="email"
                  value={requestForm.contactEmail}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Vendor manager phone
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="contactPhone"
                  placeholder={primaryContact?.phone || "Proposed vendor manager phone"}
                  value={requestForm.contactPhone}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Company phone
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="publicPhone"
                  placeholder={company.public_phone || "Proposed company phone"}
                  value={requestForm.publicPhone}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Website
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="website"
                  placeholder={company.website || "Proposed website"}
                  value={requestForm.website}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Coverage states
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="coverageStates"
                  placeholder={joinList(coverage.states, "Proposed states")}
                  value={requestForm.coverageStates}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Coverage counties
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="coverageCounties"
                  placeholder={joinList(
                    asArray(coverage.counties)
                      .map((entry) => [entry?.county, entry?.state].filter(Boolean).join(", "))
                      .filter(Boolean),
                    "One county per line",
                  )}
                  value={requestForm.coverageCounties}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Coverage markets
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="coverageMarkets"
                  placeholder={joinList(coverage.markets, "Proposed markets")}
                  value={requestForm.coverageMarkets}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Accepted property types
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="propertyTypes"
                  placeholder={joinList(acceptedWorkTypes.property_types, "Proposed property types")}
                  value={requestForm.propertyTypes}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Accepted report types
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="reportTypes"
                  placeholder={joinList(acceptedWorkTypes.report_types, "Proposed report types")}
                  value={requestForm.reportTypes}
                  onChange={handleRequestInput}
                />
              </label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Comments / explanation
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  name="comments"
                  value={requestForm.comments}
                  onChange={handleRequestInput}
                />
                {requestFieldErrors.comments ? (
                  <span className="mt-1 block text-xs text-rose-600">{requestFieldErrors.comments}</span>
                ) : null}
              </label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                type="button"
                onClick={() => setRequestModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                type="submit"
                disabled={requestSubmitting}
              >
                {requestSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
