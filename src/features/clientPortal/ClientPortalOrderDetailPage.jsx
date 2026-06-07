import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getClientPortalOrderDetail } from "@/features/clientPortal/api";

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

export default function ClientPortalOrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Order Detail
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">{order.orderNumber}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Client-safe appraisal status and report availability for this property.
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Order summary">
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <DetailItem label="Status" value={order.status} />
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <DetailItem label="Due Date" value={formatDate(order.dueAt)} />
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <DetailItem
            label="Report"
            value={order.reportDownloadReady ? "Ready for download" : "Not released yet"}
          />
        </article>
      </section>

      <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4" aria-label="Property">
        <h2 className="text-base font-semibold text-slate-950">Property</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Address" value={order.propertyAddress} />
          <DetailItem label="Property Type" value={order.propertyType} />
          <DetailItem label="Loan Purpose" value={order.loanPurpose} />
          <DetailItem label="Contact" value={order.contactName} />
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4" aria-label="Important dates">
        <h2 className="text-base font-semibold text-slate-950">Important dates</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <DetailItem label="Ordered" value={formatDate(order.orderedAt)} />
          <DetailItem label="Inspection" value={formatDate(order.inspectionAt)} />
          <DetailItem label="Report Ready" value={formatDate(order.reportReadyAt)} />
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4" aria-label="Report download">
        <h2 className="text-base font-semibold text-slate-950">Download report</h2>
        {order.reportDownloadReady && order.reportDownloadUrl ? (
          <a
            href={order.reportDownloadUrl}
            className="inline-flex w-fit rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Download report
          </a>
        ) : (
          <p className="text-sm leading-6 text-slate-600">
            The final report will be available here after it is released to your account.
          </p>
        )}
      </section>
    </div>
  );
}
