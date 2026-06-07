import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, RefreshCw } from "lucide-react";

import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { listOwnerAssignmentsForOrder } from "../api";
import { ActionButton, AssignmentStatusBadge, ErrorState } from "../AssignmentPrimitives";
import { ASSIGNMENT_STATUSES, formatDateTime, humanize, isPastDate } from "../assignmentFormat";

function statusCounts(items) {
  return items.reduce((acc, item) => {
    const key = item.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function relevantTimeline(item) {
  return [
    ["Offered", item.offered_at],
    item.status === "submitted" ? ["Submitted", item.submitted_at] : null,
    item.status === "revision_requested" ? ["Revision Requested", item.revision_requested_at] : null,
    item.status === "completed" ? ["Completed", item.completed_at] : null,
  ].filter(Boolean);
}

function timingFlags(item) {
  const terminal = ["completed", "declined", "cancelled", "revoked"].includes(String(item.status || ""));
  return {
    expiredOffer: item.status === "offered" && isPastDate(item.expires_at),
    pastDue: !terminal && isPastDate(item.due_at),
  };
}

export default function OwnerOrderAssignmentsPanel({
  orderId,
  canOfferAssignment,
  onOfferAssignment,
  assignmentRows,
  assignmentsLoading,
  assignmentsError,
  onRefreshAssignments,
}) {
  const permissions = useEffectivePermissions();
  const canReadOwner = !permissions.loading &&
    !permissions.error &&
    permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER);
  const isControlled = Array.isArray(assignmentRows);
  const [internalItems, setInternalItems] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState(null);

  const load = useCallback(async () => {
    if (isControlled) {
      onRefreshAssignments?.();
      return;
    }
    if (!orderId || !canReadOwner) return;
    setInternalLoading(true);
    setInternalError(null);
    try {
      const rows = await listOwnerAssignmentsForOrder(orderId);
      setInternalItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setInternalItems([]);
      setInternalError(err);
    } finally {
      setInternalLoading(false);
    }
  }, [canReadOwner, isControlled, onRefreshAssignments, orderId]);

  useEffect(() => {
    if (!isControlled) {
      load();
    }
  }, [isControlled, load]);

  const items = isControlled ? assignmentRows : internalItems;
  const loading = isControlled ? Boolean(assignmentsLoading) : internalLoading;
  const error = isControlled ? assignmentsError : internalError;
  const counts = useMemo(() => statusCounts(items), [items]);

  if (!canReadOwner) return null;

  return (
    <section className="rounded-md border bg-white p-3">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Company Assignments</div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Outside-company assignment packets for this owner order. Assignment packets do not grant assigned companies
            canonical order access, client access, or owner-company workflow visibility.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canOfferAssignment && (
            <ActionButton onClick={onOfferAssignment}>
              Offer Assignment
            </ActionButton>
          )}
          <ActionButton variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>
            Refresh
          </ActionButton>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Assignment status summary">
        {ASSIGNMENT_STATUSES.map((status) => (
          <span
            key={status}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
          >
            {humanize(status)} {counts[status] || 0}
          </span>
        ))}
      </div>

      {loading && <div className="mt-3 text-sm text-slate-500">Loading company assignments...</div>}

      {!loading && error && (
        <div className="mt-3">
          <ErrorState
            title="Company assignments unavailable"
            message="Falcon could not load assignment packets for this owner order. No broad assignment list or order fallback was attempted."
            onRetry={load}
          />
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">No company assignments</div>
          <p className="mt-1 leading-6">No outside-company assignment packets exist for this owner order.</p>
          {canOfferAssignment && (
            <div className="mt-3">
              <ActionButton onClick={onOfferAssignment}>Offer Assignment</ActionButton>
            </div>
          )}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
          {items.map((item) => {
            const { expiredOffer, pastDue } = timingFlags(item);
            return (
              <article key={item.id} className="grid gap-3 p-3 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-950">{item.assigned_company_name || "Assigned company"}</span>
                    <AssignmentStatusBadge status={item.status} />
                    {pastDue && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Past due
                      </span>
                    )}
                    {expiredOffer && (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        Offer expired
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {humanize(item.assignment_type)} via {humanize(item.relationship_type)}
                    {item.relationship_status ? ` (${humanize(item.relationship_status)} relationship)` : ""}
                  </p>
                  {item.instructions && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.instructions}</p>
                  )}
                  {item.status === "revision_requested" && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <div className="font-semibold">Revision requested</div>
                      {item.revision_summary && (
                        <p className="mt-1 line-clamp-2 leading-5">{item.revision_summary}</p>
                      )}
                      <div className="mt-1 text-amber-800">
                        Due {formatDateTime(item.revision_due_at || item.review_due_at)}
                      </div>
                    </div>
                  )}
                  <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Due</dt>
                      <dd className={pastDue ? "font-semibold text-amber-700" : ""}>{formatDateTime(item.due_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Review Due</dt>
                      <dd>{formatDateTime(item.review_due_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-[0.12em] text-slate-400">Expires</dt>
                      <dd className={expiredOffer ? "font-semibold text-rose-700" : ""}>{formatDateTime(item.expires_at)}</dd>
                    </div>
                  </dl>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {relevantTimeline(item).map(([label, value]) => (
                      <span key={label}>
                        <span className="font-semibold text-slate-600">{label}:</span> {formatDateTime(value)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-start lg:justify-end">
                  <Link
                    to={`/assignments/${item.id}`}
                    aria-label={`Open assignment packet for ${item.assigned_company_name || "assigned company"}`}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open Packet
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
