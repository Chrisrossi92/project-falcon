import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createClientPortalReportDownloadUrl,
  getClientPortalOrderDetail,
} from "@/features/clientPortal/api";

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value || "Not available"}</div>
    </div>
  );
}

function SummaryCard({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <DetailItem label={label} value={value} />
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </article>
  );
}

function Timeline({ milestones = [] }) {
  const visibleMilestones = milestones.length
    ? milestones
    : [{ label: "Order received", date: null, state: "complete" }];

  return (
    <ol className="grid gap-3">
      {visibleMilestones.map((milestone, index) => {
        const isComplete = milestone.state === "complete";
        return (
          <li key={`${milestone.label}-${index}`} className="grid grid-cols-[24px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span
                className={[
                  "mt-1 h-3 w-3 rounded-full border",
                  isComplete ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white",
                ].join(" ")}
              />
              {index < visibleMilestones.length - 1 ? (
                <span className="mt-1 h-full min-h-8 w-px bg-stone-200" />
              ) : null}
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="text-sm font-semibold text-slate-950">{milestone.label}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDate(milestone.date)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ClientPortalOrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadState, setDownloadState] = useState({
    loading: false,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      setLoading(true);
      setError(null);

      try {
        const row = await getClientPortalOrderDetail(orderId);
        if (!active) return;
        setOrder(row);
      } catch (err) {
        if (!active) return;
        setOrder(null);
        setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  async function handleDownloadReport() {
    if (!order?.reportDownloadReady || downloadState.loading) return;

    setDownloadState({ loading: true, error: null });

    try {
      const result = await createClientPortalReportDownloadUrl(order.orderKey);
      window.location.assign(result.signedUrl);
    } catch (err) {
      setDownloadState({
        loading: false,
        error: err?.message || "The report download could not be prepared.",
      });
      return;
    }

    setDownloadState({ loading: false, error: null });
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div className="grid gap-4">
        <Link to="/client-portal/orders" className="text-sm font-semibold text-slate-700">
          Back to orders
        </Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          This order is not available in the Client Portal.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <Link to="/client-portal/orders" className="text-sm font-semibold text-slate-700">
          Back to orders
        </Link>
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Appraisal Detail
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{order.orderNumber}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {order.propertyAddress}
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Order summary">
        <SummaryCard label="Status" value={order.status} helper="Client-facing appraisal status." />
        <SummaryCard
          label="Expected Completion"
          value={formatDate(order.dueAt)}
          helper="Subject to confirmation by the appraisal team."
        />
        <SummaryCard
          label="Assigned Appraiser"
          value={order.appraiserName || "Appraisal team assigned"}
          helper="Appraiser details appear when safely available."
        />
        <SummaryCard
          label="Report"
          value={order.reportDownloadReady ? "Ready for download" : "Not released yet"}
          helper={order.reportDownloadReady ? "Final report is available." : "Released reports appear here."}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <main className="grid gap-5">
          <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Timeline">
            <h2 className="text-base font-semibold text-slate-950">Timeline</h2>
            <Timeline milestones={order.milestones} />
          </section>

          <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Property">
            <h2 className="text-base font-semibold text-slate-950">Property</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem label="Address" value={order.propertyAddress} />
              <DetailItem label="Property Type" value={order.propertyType} />
              <DetailItem label="Loan Purpose" value={order.loanPurpose} />
              <DetailItem label="Contact" value={order.contactName} />
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Important dates">
            <h2 className="text-base font-semibold text-slate-950">Important dates</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <DetailItem label="Ordered" value={formatDate(order.orderedAt)} />
              <DetailItem label="Inspection" value={formatDate(order.inspectionAt)} />
              <DetailItem label="Report Ready" value={formatDate(order.reportReadyAt)} />
            </div>
          </section>
        </main>

        <aside className="grid gap-5 content-start">
          <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Documents">
            <h2 className="text-base font-semibold text-slate-950">Documents</h2>
            {order.reportDownloadReady ? (
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={downloadState.loading}
                  className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloadState.loading ? "Preparing report..." : "Download final report"}
                </button>
                {order.reportFileName ? (
                  <p className="text-xs text-slate-500">{order.reportFileName}</p>
                ) : null}
                {downloadState.error ? (
                  <p className="text-sm leading-6 text-rose-700" role="alert">
                    {downloadState.error}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm leading-6 text-slate-600">
                  The final report will be available here after it is released to your account.
                </p>
                <button
                  type="button"
                  disabled
                  className="inline-flex w-fit cursor-not-allowed rounded-md border border-stone-200 bg-stone-100 px-3 py-2 text-sm font-semibold text-slate-500"
                >
                  Download final report
                </button>
              </div>
            )}
          </section>

          <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm" aria-label="Messages">
            <h2 className="text-base font-semibold text-slate-950">Messages</h2>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-slate-600">
              No portal messages are available for this appraisal. Your appraisal team will contact
              you directly if more information is needed.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
