import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  FalconEmptyState,
  FalconErrorState,
  FalconLoadingState,
  FalconSkeleton,
} from "@/components/state";
import { PortalPageShell } from "@/components/portal";
import { fetchVendorWorkspaceAvailableWork } from "@/features/vendorWorkspace/api.js";

const statusLabels = Object.freeze({
  available: "Available",
  viewed: "Viewed",
  due_soon: "Due soon",
  overdue: "Overdue",
});

const statusClasses = Object.freeze({
  available: "border-emerald-200 bg-emerald-50 text-emerald-700",
  viewed: "border-slate-200 bg-slate-50 text-slate-600",
  due_soon: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-rose-200 bg-rose-50 text-rose-700",
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

function getMarket(order = {}) {
  return [order.city, order.state, order.postal_code].filter(Boolean).join(", ");
}

function getPropertyLine(order = {}) {
  return order.property_address || "Property details pending";
}

function LoadingState() {
  return (
    <FalconLoadingState
      aria-label="Loading available work"
      className="rounded-xl"
      title="Loading available work"
      description="Loading bid opportunities available to your company."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <article key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <FalconSkeleton aria-label="Loading opportunity owner" height="0.75rem" width="7rem" />
            <FalconSkeleton className="mt-4" aria-label="Loading opportunity property" height="1.25rem" width="14rem" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <FalconSkeleton height="2.5rem" />
              <FalconSkeleton height="2.5rem" />
              <FalconSkeleton height="2.5rem" />
              <FalconSkeleton height="2.5rem" />
            </div>
          </article>
        ))}
      </div>
    </FalconLoadingState>
  );
}

function ErrorState({ onRetry }) {
  return (
    <FalconErrorState
      title="Available work unavailable"
      description="Falcon could not refresh available bid opportunities for this vendor workspace."
      action={(
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:border-rose-400 hover:bg-rose-50"
        >
          Retry
        </button>
      )}
    />
  );
}

function EmptyState() {
  return (
    <FalconEmptyState
      title="No available work right now"
      description="No available work is waiting for your review. New bid opportunities will appear here when an AMC coordinator sends them to your company."
    />
  );
}

function WorkCard({ item }) {
  const order = item?.order || {};
  const owner = item?.owner || {};
  const summary = item?.summary || {};
  const status = item?.status || "available";
  const statusClass = statusClasses[status] || statusClasses.available;
  const market = getMarket(order);
  const complexity = Array.isArray(summary.complexity) ? summary.complexity : [];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {owner.company_name || "AMC coordinator"}
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">
            {getPropertyLine(order)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{market || order.county || "Market pending"}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>
          {statusLabels[status] || statusLabels.available}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-500">Order</dt>
          <dd className="mt-1 text-slate-900">{order.order_number || "Order pending"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Bid Due</dt>
          <dd className="mt-1 text-slate-900">{formatDate(item?.bid_due_at)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Requested Due Date</dt>
          <dd className="mt-1 text-slate-900">{formatDate(item?.requested_due_date)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Requested Turn Time</dt>
          <dd className="mt-1 text-slate-900">
            {item?.requested_turn_time_days ? `${item.requested_turn_time_days} days` : "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Property Type</dt>
          <dd className="mt-1 text-slate-900">{order.property_type || "Property type pending"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Report Type</dt>
          <dd className="mt-1 text-slate-900">{order.report_type || "Report type pending"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">County</dt>
          <dd className="mt-1 text-slate-900">{order.county || "County pending"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Documents</dt>
          <dd className="mt-1 text-slate-900">
            {Number(summary.documents_available || 0).toLocaleString()}
          </dd>
        </div>
      </dl>

      {summary.scope || complexity.length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          {summary.scope ? <p>{summary.scope}</p> : null}
          {complexity.length > 0 ? (
            <p className="mt-1 font-semibold text-slate-700">{complexity.join(", ")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {item?.work_key ? (
          <Link
            to={`/vendor-workspace/available-work/${encodeURIComponent(item.work_key)}`}
            className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
          >
            View Work Detail
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500"
          >
            View Work Detail
          </button>
        )}
      </div>
    </article>
  );
}

export default function VendorAvailableWorkPage() {
  const [availableWork, setAvailableWork] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAvailableWork() {
      setIsLoading(true);
      setError(null);

      try {
        const nextAvailableWork = await fetchVendorWorkspaceAvailableWork();
        if (isMounted) setAvailableWork(nextAvailableWork);
      } catch (nextError) {
        if (isMounted) setError(nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAvailableWork();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const items = Array.isArray(availableWork?.items) ? availableWork.items : [];

  return (
    <PortalPageShell
      label="Vendor Workspace"
      title="Available Work"
      description="Review bid opportunities available to your company, then open Work Detail to submit a bid or pass on the opportunity."
    >
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      ) : items.length > 0 ? (
        <section aria-label="Available work list" className="grid gap-3 lg:grid-cols-2">
          {items.map((item, index) => (
            <WorkCard key={item?.work_key || index} item={item} />
          ))}
        </section>
      ) : (
        <EmptyState />
      )}
    </PortalPageShell>
  );
}
