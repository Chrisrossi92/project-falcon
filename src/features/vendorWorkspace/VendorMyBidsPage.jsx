import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchVendorWorkspaceMyBids } from "@/features/vendorWorkspace/api.js";

const statusLabels = Object.freeze({
  submitted: "Submitted",
  passed: "Passed",
  selected: "Selected",
  not_selected: "Not Selected",
  expired: "Expired",
});

const statusClasses = Object.freeze({
  submitted: "border-sky-200 bg-sky-50 text-sky-700",
  passed: "border-slate-200 bg-slate-50 text-slate-600",
  selected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  not_selected: "border-amber-200 bg-amber-50 text-amber-700",
  expired: "border-rose-200 bg-rose-50 text-rose-700",
});

const tabs = Object.freeze([
  { key: "submitted", label: "Submitted Bids", statuses: ["submitted"] },
  { key: "passed", label: "Passed Opportunities", statuses: ["passed"] },
  { key: "selected", label: "Selected", statuses: ["selected"] },
  { key: "closed", label: "Not Selected / Expired", statuses: ["not_selected", "expired"] },
]);

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
    <section aria-label="Loading my bids" className="grid gap-3 lg:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <article key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-5 w-56 rounded bg-slate-200" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        </article>
      ))}
    </section>
  );
}

function ErrorState({ onRetry }) {
  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="font-semibold">My bids unavailable</div>
      <p className="mt-1">Bid history could not be loaded.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800"
      >
        Retry
      </button>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <div className="font-semibold text-slate-950">No bids yet.</div>
      <p className="mt-1">
        Submitted bids, selected bids, and passed opportunities will appear here after your company
        responds to available work.
      </p>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value || "Not specified"}</dd>
    </div>
  );
}

function BidHistoryCard({ item }) {
  const order = item?.order || {};
  const owner = item?.owner || {};
  const bid = item?.bid || {};
  const decline = item?.decline || {};
  const status = item?.bid_status || "submitted";
  const statusClass = statusClasses[status] || statusClasses.submitted;
  const market = getMarket(order);
  const actionAt = item?.submitted_at || item?.declined_at || item?.expired_at;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {owner.company_name || "AMC coordinator"}
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-950">
            {order.property_address || "Property details pending"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{market || order.county || "Market pending"}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>
          {statusLabels[status] || statusLabels.submitted}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
        <DetailRow label="Order" value={order.order_number || "Order pending"} />
        <DetailRow label="Report Type" value={order.report_type || "Report type pending"} />
        <DetailRow label="Property Type" value={order.property_type || "Property type pending"} />
        <DetailRow label="Bid Due" value={formatDate(item?.bid_due_at)} />
        <DetailRow label="Requested Due Date" value={formatDate(item?.requested_due_date)} />
        <DetailRow
          label="Action Date"
          value={formatDate(actionAt)}
        />
      </dl>

      {status === "passed" ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-700">{decline.reason || "Passed"}</div>
          {decline.comments ? <p className="mt-1 whitespace-pre-wrap">{decline.comments}</p> : null}
        </div>
      ) : bid && Object.keys(bid).length > 0 ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Bid Amount" value={formatMoney(bid.fee_amount, bid.currency)} />
            <DetailRow
              label="Turn Time"
              value={bid.turn_time_days ? `${bid.turn_time_days} days` : null}
            />
            <DetailRow label="Proposed Due Date" value={formatDate(bid.proposed_due_at)} />
            <DetailRow label="Selection Outcome" value={item?.selection_outcome ? statusLabels[item.selection_outcome] : null} />
          </dl>
          {bid.comments ? <p className="mt-3 whitespace-pre-wrap">{bid.comments}</p> : null}
        </div>
      ) : null}

      <div className="mt-5">
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

export default function VendorMyBidsPage() {
  const [myBids, setMyBids] = useState(null);
  const [activeTab, setActiveTab] = useState("submitted");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadMyBids() {
      setIsLoading(true);
      setError(null);

      try {
        const nextMyBids = await fetchVendorWorkspaceMyBids();
        if (isMounted) setMyBids(nextMyBids);
      } catch (nextError) {
        if (isMounted) setError(nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMyBids();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const items = useMemo(() => (Array.isArray(myBids?.items) ? myBids.items : []), [myBids?.items]);
  const counts = useMemo(() => {
    const nextCounts = {
      submitted: 0,
      passed: 0,
      selected: 0,
      closed: 0,
    };

    items.forEach((item) => {
      if (item?.bid_status === "selected") nextCounts.selected += 1;
      else if (item?.bid_status === "passed") nextCounts.passed += 1;
      else if (item?.bid_status === "not_selected" || item?.bid_status === "expired") nextCounts.closed += 1;
      else if (item?.bid_status === "submitted") nextCounts.submitted += 1;
    });

    return nextCounts;
  }, [items]);

  const activeTabDefinition = tabs.find((tab) => tab.key === activeTab) || tabs[0];
  const visibleItems = items.filter((item) => activeTabDefinition.statuses.includes(item?.bid_status));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Vendor Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">My Bids</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review bid responses and passed opportunities submitted by your company.
        </p>
      </section>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section aria-label="My bids summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Submitted Bids" value={counts.submitted} />
            <SummaryCard label="Passed Opportunities" value={counts.passed} />
            <SummaryCard label="Selected" value={counts.selected} />
            <SummaryCard label="Not Selected / Expired" value={counts.closed} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div role="tablist" aria-label="My bids filters" className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-md border px-3 py-2 text-xs font-semibold",
                    activeTab === tab.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {visibleItems.length > 0 ? (
            <section aria-label="My bids list" className="grid gap-3 lg:grid-cols-2">
              {visibleItems.map((item, index) => (
                <BidHistoryCard key={item?.work_key || index} item={item} />
              ))}
            </section>
          ) : (
            <EmptyState />
          )}
        </>
      )}
    </div>
  );
}
