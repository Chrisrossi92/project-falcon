import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { readOrderVendorBidInvitation } from "@/features/bids/api";

const unavailableTitle = "This bid invitation is unavailable.";
const unavailableMessage =
  "The link may be expired, revoked, already submitted, or no longer open. Contact the AMC coordinator for a new invitation.";

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

function VendorOrderDetail({ payload }) {
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

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <button
                type="button"
                disabled
                className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400"
              >
                Submit Bid
              </button>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Bid submission is not available yet. Contact the coordinator to submit your response for now.
              </p>
            </section>
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

  return <VendorOrderDetail payload={state.payload} />;
}
