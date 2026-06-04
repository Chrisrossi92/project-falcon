import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  readOrderCompanyAssignmentInvitation,
  respondOrderCompanyAssignmentInvitation,
} from "@/features/assignments/api";

const unavailableTitle = "This assignment offer is unavailable.";
const unavailableMessage =
  "The link may be expired, revoked, already answered, or no longer open. Contact the AMC coordinator for a new assignment offer.";

function formatDateTime(value) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(amount, currency = "USD") {
  if (amount === null || amount === undefined || amount === "") return "Not provided";
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return String(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function joinLocation(order = {}) {
  return [order.city, order.state, order.postal_code].filter(Boolean).join(", ");
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
            Vendor Assignment Offer
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
          Loading assignment offer...
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

function SuccessState({ status }) {
  const accepted = status === "accepted";
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="text-base font-semibold text-emerald-950">
        {accepted ? "Assignment accepted." : "Assignment declined."}
      </div>
      <p className="mt-2 text-sm leading-6 text-emerald-800">
        The AMC coordinator can now review your response.
      </p>
    </section>
  );
}

function AssignmentOfferActions({ token, onUnavailable }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState("");
  const [actionError, setActionError] = useState("");
  const [successStatus, setSuccessStatus] = useState("");

  async function respond(action) {
    if (submitting || successStatus) return;
    setSubmitting(action);
    setActionError("");

    try {
      const result = await respondOrderCompanyAssignmentInvitation(
        token,
        action,
        action === "decline" ? reason : null,
      );

      if (result?.ok) {
        setSuccessStatus(result.status || (action === "accept" ? "accepted" : "declined"));
        return;
      }

      if (result?.error === "assignment_invitation_invalid_or_expired") {
        onUnavailable?.();
        return;
      }

      if (result?.error === "assignment_response_invalid") {
        setActionError(result.field_errors?.action || "Choose accept or decline.");
        return;
      }

      setActionError("Assignment response failed. Try again or contact the AMC coordinator.");
    } catch {
      setActionError("Assignment response failed. Try again or contact the AMC coordinator.");
    } finally {
      setSubmitting("");
    }
  }

  if (successStatus) return <SuccessState status={successStatus} />;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Assignment Response</h2>
      <div className="mt-4 grid gap-4">
        {actionError && (
          <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {actionError}
          </div>
        )}

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Decline reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder="Optional context for the AMC coordinator."
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={Boolean(submitting)}
            onClick={() => respond("accept")}
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting === "accept" ? "Accepting..." : "Accept Assignment"}
          </button>
          <button
            type="button"
            disabled={Boolean(submitting)}
            onClick={() => respond("decline")}
            className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting === "decline" ? "Declining..." : "Decline Assignment"}
          </button>
        </div>
      </div>
    </section>
  );
}

function VendorAssignmentOfferDetail({ payload, token, onUnavailable }) {
  const invitation = payload.invitation || {};
  const vendor = payload.vendor || {};
  const owner = payload.owner || {};
  const order = payload.order || {};
  const assignment = payload.assignment || {};
  const location = joinLocation(order);
  const currency = assignment.currency || "USD";

  return (
    <PublicShell>
      <div className="space-y-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Falcon</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">Assignment Offer</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review the assignment terms and respond through this secure vendor link.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-800">
              Offered
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            <Panel title="Decision Summary">
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Status" value="Offered" />
                <DetailItem label="Order Number" value={order.order_number} />
                <DetailItem label="Due Date" value={formatDateTime(assignment.due_at)} />
                <DetailItem label="Review Due" value={formatDateTime(assignment.review_due_at)} />
                <DetailItem label="Fee" value={formatMoney(assignment.fee_amount, currency)} />
                <DetailItem label="Turn Time" value={assignment.turn_time_days ? `${assignment.turn_time_days} days` : "Not provided"} />
              </dl>
            </Panel>

            <Panel title="Property / Order Summary">
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Property Address" value={order.property_address} />
                <DetailItem label="Location" value={location} />
                <DetailItem label="County" value={order.county} />
                <DetailItem label="Property Type" value={order.property_type} />
                <DetailItem label="Report Type" value={order.report_type} />
                <DetailItem label="Proposed Due" value={formatDateTime(assignment.proposed_due_at)} />
              </dl>
            </Panel>

            <Panel title="Assignment Instructions">
              <p className="text-sm leading-6 text-slate-700">
                {assignment.instructions || "No assignment instructions were provided."}
              </p>
            </Panel>

            {assignment.comments && (
              <Panel title="Vendor Bid Comments">
                <p className="text-sm leading-6 text-slate-700">{assignment.comments}</p>
              </Panel>
            )}
          </div>

          <aside className="space-y-5">
            <Panel title="Vendor">
              <dl className="space-y-4">
                <DetailItem label="Company" value={vendor.company_name} />
                <DetailItem label="Contact" value={vendor.contact_name} />
                <DetailItem label="Email" value={vendor.contact_email} />
              </dl>
            </Panel>

            <Panel title="Owner">
              <dl className="space-y-4">
                <DetailItem label="Company" value={owner.company_name} />
                <DetailItem label="Offer Expires" value={formatDateTime(invitation.expires_at)} />
                <DetailItem label="Sent To" value={invitation.sent_to_email} />
              </dl>
            </Panel>

            <AssignmentOfferActions token={token} onUnavailable={onUnavailable} />
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}

export default function VendorAssignmentOfferPage() {
  const { token } = useParams();
  const [state, setState] = useState({
    status: "loading",
    payload: null,
  });

  useEffect(() => {
    let cancelled = false;

    setState({ status: "loading", payload: null });

    readOrderCompanyAssignmentInvitation(token)
      .then((payload) => {
        if (cancelled) return;
        setState({ status: payload?.ok ? "valid" : "unavailable", payload });
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
  if (state.status !== "valid") return <UnavailableState />;

  return (
    <VendorAssignmentOfferDetail
      payload={state.payload}
      token={token}
      onUnavailable={() => setState({ status: "unavailable", payload: null })}
    />
  );
}
