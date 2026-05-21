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
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Work Assigned To Us</h2>
          <p className="text-xs text-slate-500">Assignment-scoped offers and work packets for your active company.</p>
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
        <div className="flex flex-wrap items-center gap-2">
          <select
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

      {loading && <div className="p-4 text-sm text-slate-500">Loading assignments...</div>}
      {!loading && error && (
        <div className="p-4">
          <ErrorState message="Falcon could not load assigned-company packets." onRetry={load} />
        </div>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <div className="p-4">
          <EmptyState title="No assigned work" message="No assignment packets are currently available for your company." />
        </div>
      )}
      {!loading && !error && visibleItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {visibleItems.map((item) => {
            const expiredOffer = item.assignment_status === "offered" && isPastDate(item.expires_at);
            const submitted = item.assignment_status === "submitted";
            const pastDue = !["completed", "declined", "cancelled", "revoked"].includes(item.assignment_status) && isPastDate(item.due_at);
            return (
              <Link
                key={item.assignment_id}
                to={`/assignments/${item.assignment_id}`}
                className="grid gap-3 px-4 py-3 transition hover:bg-slate-50 lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">#{item.order_number || "Assignment"}</span>
                    <AssignmentStatusBadge status={item.assignment_status} />
                    {expiredOffer && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Offer expired</span>}
                    {submitted && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Awaiting owner action</span>}
                    {pastDue && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Past due</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {humanize(item.assignment_type)} from {item.owner_company_name || "owner company"} · {locationLabel(item)}
                  </p>
                  {item.instructions && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.instructions}</p>}
                </div>
                <div className="text-left text-xs text-slate-500 lg:text-right">
                  <div className={pastDue ? "font-semibold text-amber-700" : ""}>Due {formatDateTime(item.due_at)}</div>
                  {item.expires_at && <div className={expiredOffer ? "font-semibold text-rose-700" : ""}>Expires {formatDateTime(item.expires_at)}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
