import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  formatDateTime,
  humanize,
  isPastDate,
  isTerminalStatus,
  statusClass,
  timelineFromAssignment,
  visibleJsonLines,
} from "./assignmentFormat";

export function AssignmentStatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>
      {humanize(status || "unknown")}
    </span>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="min-w-0">
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</div>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function BackLink() {
  return (
    <Link to="/assignments" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Assignments
    </Link>
  );
}

export function FieldGrid({ fields }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-800">{value || "Not set"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AssignmentState({ title, message, action, tone = "neutral" }) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-600",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-lg border p-5 text-sm shadow-sm ${tones[tone] || tones.neutral}`}>
      <div className="font-semibold">{title}</div>
      {message && <p className="mt-1 leading-6">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = "Loading assignment..." }) {
  return (
    <AssignmentState
      title={message}
      message="This view only uses assignment packet access."
      action={<div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-slate-400" /></div>}
    />
  );
}

export function EmptyState({ title = "No assignments", message = "No assignment packets are available for this view." }) {
  return <AssignmentState title={title} message={message} />;
}

export function ErrorState({ title = "Assignment load failed", message, onRetry }) {
  return (
    <AssignmentState
      tone="error"
      title={title}
      message={message || "Falcon could not load this assignment packet. No order fallback was attempted."}
      action={onRetry ? <ActionButton variant="secondary" onClick={onRetry}>Retry</ActionButton> : null}
    />
  );
}

export function DeniedState() {
  return (
    <AssignmentState
      title="Assignment not found"
      message="This assignment is not available to your current company role, or it no longer has an assignment packet for this route."
    />
  );
}

export function TerminalState({ status }) {
  if (!isTerminalStatus(status)) return null;
  return (
    <AssignmentState
      tone="neutral"
      title={`${humanize(status)} assignment`}
      message="This assignment is in a terminal state. No further assignment action is available from this packet."
    />
  );
}

export function AssignmentMetaChips({ packet, side = "assigned" }) {
  const status = packet?.assignment_status || packet?.status;
  const expiresAt = packet?.expires_at;
  const dueAt = packet?.due_at || packet?.final_due_at;
  const isExpiredOffer = status === "offered" && isPastDate(expiresAt);
  const isPastDue = !["completed", "declined", "cancelled", "revoked"].includes(String(status || "")) && isPastDate(dueAt);
  const chips = [
    side === "owner" ? "Owner view" : "Assigned view",
    status === "submitted" ? "Awaiting owner action" : null,
    isExpiredOffer ? "Offer expired" : null,
    isPastDue ? "Past due" : null,
  ].filter(Boolean);

  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {chip}
        </span>
      ))}
    </div>
  );
}

export function TimelineLite({ packet }) {
  const items = timelineFromAssignment(packet);
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">Timeline</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No assignment timestamps recorded yet.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.label}-${item.value}`}
              className={`flex items-center justify-between gap-4 rounded-md border px-3 py-2 ${
                item.terminal
                  ? "border-slate-200 bg-slate-100"
                  : index === items.length - 1
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-100"
              }`}
            >
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              <time className="text-xs text-slate-500" dateTime={item.value}>{formatDateTime(item.value)}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function JsonSummary({ title, value, section }) {
  const lines = visibleJsonLines(value, section || title);
  if (lines.length === 0) return null;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <dl className="mt-3 grid gap-2">
        {lines.map(([label, entry]) => (
          <div key={label} className="grid gap-1 rounded-md bg-slate-50 px-3 py-2 sm:grid-cols-[180px_1fr]">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
            <dd className="min-w-0 break-words text-sm text-slate-700">{entry}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ActionButton({ children, onClick, disabled, variant = "primary", icon: Icon, type = "button" }) {
  const classes = {
    primary: "border-slate-950 bg-slate-950 text-white hover:bg-slate-800",
    secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]}`}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}
