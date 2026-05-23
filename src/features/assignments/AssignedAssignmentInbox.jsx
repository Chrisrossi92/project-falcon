import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { listAssignedAssignments } from "./api";
import { AssignmentStatusBadge, ActionButton, EmptyState, ErrorState } from "./AssignmentPrimitives";
import { ASSIGNMENT_STATUSES, formatDateTime, humanize, isPastDate, locationLabel } from "./assignmentFormat";

function statusCounts(items) {
  return items.reduce((acc, item) => {
    const key = item.assignment_status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default function AssignedAssignmentInbox() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listAssignedAssignments({ status }));
    } catch (err) {
      setItems([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const visibleItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const counts = useMemo(() => statusCounts(visibleItems), [visibleItems]);

  return (
    <section
      aria-label="Received assignment packets"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Received Work</div>
          <h2 className="mt-1 text-base font-semibold text-slate-950">Assignment packets assigned to your company</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Offers and active work packets stay assignment-scoped and do not open full order operations.
          </p>
          {visibleItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(counts).map(([key, count]) => (
                <span key={key} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {humanize(key)} {count}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            aria-label="Received work status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All active</option>
            {ASSIGNMENT_STATUSES.filter((key) => !["declined", "cancelled", "revoked"].includes(key)).map((key) => (
              <option key={key} value={key}>{humanize(key)}</option>
            ))}
          </select>
          <ActionButton variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>
            Refresh
          </ActionButton>
        </div>
      </div>

      {loading && <div className="p-4 text-sm text-slate-500">Loading received assignment packets...</div>}
      {!loading && error && (
        <div className="p-4">
          <ErrorState message="Falcon could not load assigned-company packets." onRetry={load} />
        </div>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <div className="p-4">
          <EmptyState title="No received work" message="No assignment offers or active work packets are currently available for your company." />
        </div>
      )}
      {!loading && !error && visibleItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {visibleItems.map((item) => {
            const expiredOffer = item.assignment_status === "offered" && isPastDate(item.expires_at);
            const submitted = item.assignment_status === "submitted";
            const pastDue = !["completed", "declined", "cancelled", "revoked"].includes(item.assignment_status) && isPastDate(item.due_at);
            const packetLabel = item.order_number ? `#${item.order_number}` : "Assignment packet";
            const ownerCompany = item.owner_company_name || "Owner company";
            const location = locationLabel(item);
            return (
              <Link
                key={item.assignment_id}
                to={`/assignments/${item.assignment_id}`}
                aria-label={`Open received assignment packet ${packetLabel}`}
                className="group grid gap-3 px-4 py-3 transition hover:bg-slate-50 lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Received Packet</div>
                      <div className="mt-0.5 truncate text-base font-semibold text-slate-950">{packetLabel}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AssignmentStatusBadge status={item.assignment_status} />
                      {expiredOffer && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Offer expired</span>}
                      {submitted && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Awaiting owner action</span>}
                      {pastDue && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Past due</span>}
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                    <div className="rounded-md bg-slate-50 px-2.5 py-2">
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Owner</dt>
                      <dd className="mt-0.5 font-medium text-slate-700">{ownerCompany}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2.5 py-2">
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Type</dt>
                      <dd className="mt-0.5 font-medium text-slate-700">{humanize(item.assignment_type)}</dd>
                    </div>
                    <div className="rounded-md bg-slate-50 px-2.5 py-2">
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Location</dt>
                      <dd className="mt-0.5 font-medium text-slate-700">{location}</dd>
                    </div>
                  </dl>
                  {item.instructions && (
                    <p className="mt-2 line-clamp-2 rounded-md border border-slate-100 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                      {item.instructions}
                    </p>
                  )}
                </div>
                <div className="flex items-end justify-between gap-3 text-xs text-slate-500 lg:block lg:text-right">
                  <div>
                    <div className={pastDue ? "font-semibold text-amber-700" : ""}>Due {formatDateTime(item.due_at)}</div>
                    {item.expires_at && <div className={expiredOffer ? "font-semibold text-rose-700" : ""}>Expires {formatDateTime(item.expires_at)}</div>}
                  </div>
                  <span className="inline-flex font-semibold text-slate-700 group-hover:text-slate-950 lg:mt-2">
                    Open packet
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
