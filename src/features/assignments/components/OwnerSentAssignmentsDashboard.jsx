import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, RefreshCw } from "lucide-react";

import { listOwnerAssignments } from "../api";
import {
  assignmentCompanyName,
  assignmentDueAt,
  assignmentIdOf,
  assignmentInstructionPreview,
  assignmentStatusOf,
  isAssignmentOfferExpiring,
  isAssignmentOverdue,
  ownerDashboardRows,
  summarizeOwnerDashboard,
} from "../assignmentDashboardMetrics";
import { AssignmentStatusBadge, ActionButton, EmptyState, ErrorState } from "../AssignmentPrimitives";
import { formatDateTime, humanize } from "../assignmentFormat";

function MetricCard({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-950",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    purple: "border-purple-200 bg-purple-50 text-purple-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={`rounded-md border px-3 py-2 ${tones[tone] || tones.neutral}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-current opacity-60">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusChip({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}

function OwnerSentAssignmentRow({ item }) {
  const assignmentId = assignmentIdOf(item);
  const status = assignmentStatusOf(item);
  const dueAt = assignmentDueAt(item);
  const overdue = isAssignmentOverdue(item);
  const expiring = isAssignmentOfferExpiring(item);
  const preview = assignmentInstructionPreview(item);

  return (
    <Link
      to={`/assignments/${assignmentId}`}
      className="grid gap-3 px-4 py-3 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
      aria-label={`Open assignment packet for ${assignmentCompanyName(item, "owner")}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-950">{assignmentCompanyName(item, "owner")}</span>
          <AssignmentStatusBadge status={status} />
          {status === "submitted" && <StatusChip tone="purple">Needs review</StatusChip>}
          {expiring && <StatusChip tone="amber">Offer expiring</StatusChip>}
          {overdue && <StatusChip tone="rose">Overdue</StatusChip>}
        </div>
        <p className="mt-1 text-sm text-slate-600">{humanize(item.assignment_type || "assignment")}</p>
        {preview && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{preview}</p>}
      </div>
      <div className="flex items-end justify-between gap-3 text-xs text-slate-500 sm:block sm:text-right">
        <div>
          <div className={overdue ? "font-semibold text-rose-700" : ""}>Due {formatDateTime(dueAt)}</div>
          {item.review_due_at && <div>Review {formatDateTime(item.review_due_at)}</div>}
          {item.expires_at && <div className={expiring ? "font-semibold text-amber-700" : ""}>Expires {formatDateTime(item.expires_at)}</div>}
        </div>
        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 sm:mt-2">
          Open Packet <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export default function OwnerSentAssignmentsDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listOwnerAssignments());
    } catch (err) {
      setItems([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const metrics = useMemo(() => summarizeOwnerDashboard(visibleItems), [visibleItems]);
  const rows = useMemo(() => ownerDashboardRows(visibleItems), [visibleItems]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Sent Assignments</h2>
          <p className="text-xs text-slate-500">Owner-side assignment packets requiring operational attention.</p>
        </div>
        <ActionButton variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>
          Refresh
        </ActionButton>
      </div>

      <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Sent Active" value={metrics.sentActive} />
        <MetricCard label="Submitted" value={metrics.submittedAwaitingOwnerReview} tone="purple" />
        <MetricCard label="Overdue" value={metrics.overdue} tone="rose" />
        <MetricCard label="Expiring Offers" value={metrics.expiringOffers} tone="amber" />
        <MetricCard label="Completed Recently" value={metrics.completedRecently} tone="emerald" />
      </div>

      {loading && <div className="p-4 text-sm text-slate-500">Loading sent assignment dashboard...</div>}
      {!loading && error && (
        <div className="p-4">
          <ErrorState
            message="Sent assignment dashboard unavailable. No order dashboard fallback was attempted."
            onRetry={load}
          />
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="p-4">
          <EmptyState title="No sent assignment attention" message="No sent assignments need attention." />
        </div>
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="divide-y divide-slate-100">
          {rows.map((item) => (
            <OwnerSentAssignmentRow key={assignmentIdOf(item)} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
