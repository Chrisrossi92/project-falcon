import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, RefreshCw } from "lucide-react";

import { listAssignedAssignments } from "../api";
import {
  assignedDashboardRows,
  assignmentCompanyName,
  assignmentDueAt,
  assignmentIdOf,
  assignmentInstructionPreview,
  assignmentStatusOf,
  isAssignmentDueSoon,
  isAssignmentOverdue,
  summarizeAssignedDashboard,
} from "../assignmentDashboardMetrics";
import { AssignmentStatusBadge, ActionButton, EmptyState, ErrorState } from "../AssignmentPrimitives";
import { formatDateTime, humanize } from "../assignmentFormat";

function MetricCard({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    purple: "border-purple-200 bg-purple-50 text-purple-900",
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
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  );
}

function AssignedWorkRow({ item }) {
  const assignmentId = assignmentIdOf(item);
  const status = assignmentStatusOf(item);
  const dueAt = assignmentDueAt(item);
  const dueSoon = isAssignmentDueSoon(item);
  const overdue = isAssignmentOverdue(item);
  const preview = assignmentInstructionPreview(item);

  return (
    <Link
      to={`/assignments/${assignmentId}`}
      className="grid gap-3 px-4 py-3 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto]"
      aria-label={`Open assignment packet for ${assignmentCompanyName(item, "assigned")}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-950">{assignmentCompanyName(item, "assigned")}</span>
          <AssignmentStatusBadge status={status} />
          {status === "offered" && <StatusChip tone="blue">Offer</StatusChip>}
          {status === "submitted" && <StatusChip>Submitted</StatusChip>}
          {overdue && <StatusChip tone="rose">Overdue</StatusChip>}
          {!overdue && dueSoon && <StatusChip tone="amber">Due soon</StatusChip>}
        </div>
        <p className="mt-1 text-sm text-slate-600">{humanize(item.assignment_type || "assignment")}</p>
        {preview && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{preview}</p>}
      </div>
      <div className="flex items-end justify-between gap-3 text-xs text-slate-500 sm:block sm:text-right">
        <div>
          <div className={overdue ? "font-semibold text-rose-700" : ""}>Due {formatDateTime(dueAt)}</div>
          {item.review_due_at && <div>Review {formatDateTime(item.review_due_at)}</div>}
          {item.expires_at && <div>Expires {formatDateTime(item.expires_at)}</div>}
        </div>
        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 sm:mt-2">
          Open Packet <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export default function AssignedWorkDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listAssignedAssignments());
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
  const metrics = useMemo(() => summarizeAssignedDashboard(visibleItems), [visibleItems]);
  const rows = useMemo(() => assignedDashboardRows(visibleItems), [visibleItems]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Assigned Work</h2>
          <p className="text-xs text-slate-500">Assignment packet work for your active company.</p>
        </div>
        <ActionButton variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>
          Refresh
        </ActionButton>
      </div>

      <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Offered" value={metrics.offered} tone="blue" />
        <MetricCard label="Active Work" value={metrics.activeWork} />
        <MetricCard label="Due Soon" value={metrics.dueSoon} tone="amber" />
        <MetricCard label="Overdue" value={metrics.overdue} tone="rose" />
        <MetricCard label="Submitted" value={metrics.submitted} tone="purple" />
      </div>

      {loading && <div className="p-4 text-sm text-slate-500">Loading assignment dashboard...</div>}
      {!loading && error && (
        <div className="p-4">
          <ErrorState
            message="Assignment dashboard unavailable. No order dashboard fallback was attempted."
            onRetry={load}
          />
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="p-4">
          <EmptyState title="No assigned work" message="No assigned company work needs attention." />
        </div>
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="divide-y divide-slate-100">
          {rows.map((item) => (
            <AssignedWorkRow key={assignmentIdOf(item)} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
