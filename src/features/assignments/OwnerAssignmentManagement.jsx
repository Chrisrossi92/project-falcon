import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { listOwnerAssignments } from "./api";
import { AssignmentStatusBadge, ActionButton, EmptyState, ErrorState } from "./AssignmentPrimitives";
import { ASSIGNMENT_STATUSES, formatDateTime, humanize, isPastDate } from "./assignmentFormat";

function statusCounts(items) {
  return items.reduce((acc, item) => {
    const key = item.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default function OwnerAssignmentManagement() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listOwnerAssignments({ status }));
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
          <h2 className="text-sm font-semibold text-slate-950">Work We Assigned Out</h2>
          <p className="text-xs text-slate-500">Owner-side assignment management for work offered by your active company.</p>
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
            <option value="">All statuses</option>
            {ASSIGNMENT_STATUSES.map((key) => (
              <option key={key} value={key}>{humanize(key)}</option>
            ))}
          </select>
          <ActionButton variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>
            Refresh
          </ActionButton>
        </div>
      </div>

      {loading && <div className="p-4 text-sm text-slate-500">Loading assignment management...</div>}
      {!loading && error && (
        <div className="p-4">
          <ErrorState message="Falcon could not load owner-side assignment packets." onRetry={load} />
        </div>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <div className="p-4">
          <EmptyState title="No owner-managed assignments" message="No assignments have been offered by your company for this filter." />
        </div>
      )}
      {!loading && !error && visibleItems.length > 0 && (
        <div className="divide-y divide-slate-100">
          {visibleItems.map((item) => {
            const expiredOffer = item.status === "offered" && isPastDate(item.expires_at);
            const submitted = item.status === "submitted";
            const pastDue = !["completed", "declined", "cancelled", "revoked"].includes(item.status) && isPastDate(item.due_at);
            return (
              <Link
                key={item.id}
                to={`/assignments/${item.id}`}
                className="grid gap-3 px-4 py-3 transition hover:bg-slate-50 lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">{item.assigned_company_name || "Assigned company"}</span>
                    <AssignmentStatusBadge status={item.status} />
                    {submitted && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Needs owner review</span>}
                    {expiredOffer && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Offer expired</span>}
                    {pastDue && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Past due</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {humanize(item.assignment_type)} via {humanize(item.relationship_type)}
                  </p>
                  {item.instructions && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.instructions}</p>}
                </div>
                <div className="text-left text-xs text-slate-500 lg:text-right">
                  <div className={pastDue ? "font-semibold text-amber-700" : ""}>Due {formatDateTime(item.due_at)}</div>
                  <div>Updated {formatDateTime(item.updated_at)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
