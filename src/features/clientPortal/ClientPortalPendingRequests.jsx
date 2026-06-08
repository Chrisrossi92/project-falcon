function formatDate(value, fallback = "Not scheduled") {
  if (!value) return fallback;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(...value.split("-").map((part, index) => Number(part) - (index === 1 ? 1 : 0)))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function StatusPill({ children }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
      {children}
    </span>
  );
}

export default function ClientPortalPendingRequests({
  requests = [],
  loading = false,
  limit = null,
}) {
  const visibleRequests = Number.isFinite(limit) ? requests.slice(0, limit) : requests;

  if (loading) {
    return <div className="text-sm text-slate-500">Loading pending requests...</div>;
  }

  if (visibleRequests.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-slate-500">
        No pending requests are waiting for review.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleRequests.map((request) => (
        <article key={request.requestKey} className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill>{request.statusLabel || "Submitted"}</StatusPill>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Pending request
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {request.propertyAddress || "Property address pending"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {request.reportType || "Appraisal request"}
                {request.propertyType ? ` - ${request.propertyType}` : ""}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {request.statusCopy || "Your appraisal team is reviewing this request."}
              </p>
            </div>
            <dl className="grid shrink-0 gap-1 text-xs text-slate-500 sm:text-right">
              <div>
                <dt className="font-semibold text-slate-700">Requested due</dt>
                <dd>{formatDate(request.requestedDueDate)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Submitted</dt>
                <dd>{formatDate(request.submittedAt, "Submitted")}</dd>
              </div>
            </dl>
          </div>
        </article>
      ))}
    </div>
  );
}
