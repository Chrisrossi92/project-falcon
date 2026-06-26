import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { readOrderVendorBidInvitation, submitOrderVendorBidInvitation } from "@/features/bids/api";

const unavailableTitle = "This bid invitation is no longer available.";
const unavailableMessage =
  "Please contact the assigning office if you believe this is an error.";
const expiredTitle = "This bid invitation has expired.";
const expiredMessage = "Please contact the assigning office if you believe this is an error.";
const submittedTitle = "This bid has already been submitted.";
const submittedMessage = "The assigning office has received a bid response for this invitation.";

function formatDateTime(value) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatSiteVisit(order = {}) {
  if (order.site_visit_at) return formatDateTime(order.site_visit_at);
  return formatDate(order.site_visit_date);
}

function joinLocation(order = {}) {
  return [order.city, order.state, order.postal_code].filter(Boolean).join(", ");
}

function normalizeCurrency(value) {
  return String(value || "USD").trim().toUpperCase() || "USD";
}

function PublicShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="text-lg font-semibold tracking-wide text-slate-950">Falcon</div>
            <div className="text-xs font-medium uppercase text-slate-500">Continental Real Estate Solutions</div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
            Vendor Bid Invitation
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Continental Real Estate Solutions
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <PublicShell>
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          Loading bid invitation...
        </div>
      </div>
    </PublicShell>
  );
}

function UnavailableState() {
  return (
    <PublicShell>
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center">
        <section className="w-full rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-950">{unavailableTitle}</div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{unavailableMessage}</p>
        </section>
      </div>
    </PublicShell>
  );
}

function ExpiredState() {
  return (
    <PublicShell>
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center">
        <section className="w-full rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-950">{expiredTitle}</div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{expiredMessage}</p>
        </section>
      </div>
    </PublicShell>
  );
}

function SubmittedState() {
  return (
    <PublicShell>
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center">
        <section className="w-full rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-950">{submittedTitle}</div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{submittedMessage}</p>
        </section>
      </div>
    </PublicShell>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FieldError({ errors, name }) {
  const message = errors?.[name];
  if (!message) return null;

  return <div className="text-xs font-medium text-rose-700">{message}</div>;
}

function SubmittedConfirmation({ result }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="text-base font-semibold text-emerald-950">Thank you for submitting your bid.</div>
      {result?.submitted_at && (
        <p className="mt-2 text-sm leading-6 text-emerald-800">Submitted {formatDateTime(result.submitted_at)}</p>
      )}
      <p className="mt-2 text-sm leading-6 text-emerald-800">
        The AMC coordinator can now review your response.
      </p>
    </section>
  );
}

function isExpiredInvitation(payload = {}) {
  const invitation = payload.invitation || {};
  const status = String(invitation.status || payload.status || "").trim().toLowerCase();

  if (status === "expired" || status === "bid_invitation_expired") return true;

  const expiresAt = invitation.expires_at || invitation.expiresAt || payload.expires_at || payload.expiresAt;
  if (!expiresAt) return false;

  const expiresAtDate = new Date(expiresAt);
  if (Number.isNaN(expiresAtDate.getTime())) return false;

  return expiresAtDate <= new Date();
}

function resolveClosedInvitationState(payload = {}) {
  const error = String(payload.error || "").trim().toLowerCase();
  const status = String(payload.status || payload.invitation?.status || "").trim().toLowerCase();
  const reason = String(payload.reason || "").trim().toLowerCase();

  if (error === "bid_invitation_expired" || status === "expired" || reason === "expired") {
    return "expired";
  }
  if (
    error === "bid_invitation_already_submitted" ||
    status === "submitted" ||
    reason === "already_submitted"
  ) {
    return "submitted";
  }
  return "unavailable";
}

function SubmitBidPanel({ token, vendor, onUnavailable }) {
  const [feeAmount, setFeeAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [turnTimeDays, setTurnTimeDays] = useState("");
  const [proposedDueAt, setProposedDueAt] = useState("");
  const [comments, setComments] = useState("");
  const [contactName, setContactName] = useState(vendor?.contact_name || "");
  const [contactEmail, setContactEmail] = useState(vendor?.contact_email || "");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submittedResult, setSubmittedResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || submittedResult) return;

    const nextFieldErrors = {};
    if (!feeAmount.trim()) {
      nextFieldErrors.fee_amount = "Fee amount is required.";
    }
    if (!turnTimeDays.trim() && !proposedDueAt.trim()) {
      nextFieldErrors.timing = "Provide either turn time days or a proposed due date.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError("Review the highlighted fields before submitting.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFieldErrors({});

    try {
      const result = await submitOrderVendorBidInvitation(token, {
        fee_amount: feeAmount,
        currency: normalizeCurrency(currency),
        turn_time_days: turnTimeDays,
        proposed_due_at: proposedDueAt,
        comments,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
      });

      if (result?.ok) {
        setSubmittedResult(result);
        return;
      }

      if (result?.error === "bid_invitation_invalid_or_expired") {
        onUnavailable?.();
        return;
      }

      if (result?.error === "bid_submission_invalid") {
        setFieldErrors(result.field_errors || {});
        setFormError("Bid submission could not be accepted. Review the fields and try again.");
        return;
      }

      setFormError("Bid submission failed. Review the fields and try again.");
    } catch {
      setFormError("Bid submission failed. Try again or contact the AMC coordinator.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedResult) return <SubmittedConfirmation result={submittedResult} />;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Submit Bid</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        {formError && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {formError}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Fee amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={feeAmount}
              onChange={(event) => setFeeAmount(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
            />
            <FieldError errors={fieldErrors} name="fee_amount" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Currency
            <input
              type="text"
              maxLength={3}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm uppercase text-slate-900"
            />
            <FieldError errors={fieldErrors} name="currency" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Turn time days
            <input
              type="number"
              min="0"
              step="1"
              value={turnTimeDays}
              onChange={(event) => setTurnTimeDays(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
            />
            <FieldError errors={fieldErrors} name="turn_time_days" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Proposed due date
            <input
              type="datetime-local"
              value={proposedDueAt}
              onChange={(event) => setProposedDueAt(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
            />
            <FieldError errors={fieldErrors} name="proposed_due_at" />
          </label>
        </div>
        <FieldError errors={fieldErrors} name="timing" />

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Comments
          <textarea
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            rows={4}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
          <FieldError errors={fieldErrors} name="comments" />
        </label>

        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Contact name
            <input
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
            />
            <FieldError errors={fieldErrors} name="contact_name" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Contact email
            <input
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
            />
            <FieldError errors={fieldErrors} name="contact_email" />
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Contact phone
            <input
              type="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
            />
            <FieldError errors={fieldErrors} name="contact_phone" />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Bid"}
        </button>
      </form>
    </section>
  );
}

function VendorOrderDetail({ payload, token, onUnavailable }) {
  const invitation = payload.invitation || {};
  const vendor = payload.vendor || {};
  const order = payload.order || {};
  const bidRequest = payload.bid_request || {};
  const location = joinLocation(order);

  const scopeSummary = useMemo(() => {
    const report = order.report_type || "the requested report";
    const property = order.property_type || "the property";
    const due = bidRequest.response_due_at
      ? `Please respond by ${formatDateTime(bidRequest.response_due_at)}.`
      : "Review the request details and coordinate your response with the AMC coordinator.";

    return `${report} for ${property}. ${due}`;
  }, [bidRequest.response_due_at, order.property_type, order.report_type]);

  return (
    <PublicShell>
      <div className="space-y-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Falcon</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">Vendor Bid Invitation</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review the vendor-safe order context and bid request details for this assignment opportunity.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-800">
              {invitation.status === "available_to_bid" ? "Available to Bid" : "Available to Bid"}
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <Panel title="Property / Order Summary">
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Order Number" value={order.order_number} />
                <DetailItem label="Property Address" value={order.property_address} />
                <DetailItem label="Location" value={location} />
                <DetailItem label="County" value={order.county} />
                <DetailItem label="Property Type" value={order.property_type} />
                <DetailItem label="Report Type" value={order.report_type} />
                <DetailItem label="Site Visit" value={formatSiteVisit(order)} />
                <DetailItem label="Client Due" value={formatDateTime(order.client_due_at)} />
                <DetailItem label="Final Due" value={formatDateTime(order.final_due_at)} />
              </dl>
            </Panel>

            <Panel title="Bid Request">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">Request Message</div>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {bidRequest.request_message || "No message was provided with this bid request."}
                  </p>
                </div>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <DetailItem label="Response Due" value={formatDateTime(bidRequest.response_due_at)} />
                  <DetailItem label="Desired Vendor Due" value={formatDateTime(bidRequest.desired_vendor_due_at)} />
                  <DetailItem label="Client Due" value={formatDateTime(bidRequest.client_due_at)} />
                </dl>
              </div>
            </Panel>

            <Panel title="Scope">
              <p className="text-sm leading-6 text-slate-700">{scopeSummary}</p>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel title="Vendor">
              <dl className="space-y-4">
                <DetailItem label="Company" value={vendor.company_name} />
                <DetailItem label="Contact" value={vendor.contact_name} />
                <DetailItem label="Email" value={vendor.contact_email} />
              </dl>
            </Panel>

            <Panel title="Invitation">
              <dl className="space-y-4">
                <DetailItem label="Status" value="Available to Bid" />
                <DetailItem label="Expires" value={formatDateTime(invitation.expires_at)} />
                <DetailItem label="Sent To" value={invitation.sent_to_email} />
              </dl>
            </Panel>

            <SubmitBidPanel token={token} vendor={vendor} onUnavailable={onUnavailable} />
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}

export default function VendorBidInvitationPage() {
  const { token } = useParams();
  const [state, setState] = useState({
    status: "loading",
    payload: null,
  });

  useEffect(() => {
    let cancelled = false;

    setState({ status: "loading", payload: null });

    readOrderVendorBidInvitation(token)
      .then((payload) => {
        if (cancelled) return;
        if (!payload?.ok) {
          setState({ status: resolveClosedInvitationState(payload), payload });
          return;
        }
        setState({ status: isExpiredInvitation(payload) ? "expired" : "valid", payload });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "unavailable", payload: null });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "expired") return <ExpiredState />;
  if (state.status === "submitted") return <SubmittedState />;
  if (state.status !== "valid") return <UnavailableState />;

  return (
    <VendorOrderDetail
      payload={state.payload}
      token={token}
      onUnavailable={() => setState({ status: "unavailable", payload: null })}
    />
  );
}
