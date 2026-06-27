import { WorkspaceSurface } from "@/components/workspace/WorkspaceSurface";

const INPUT_LABELS = Object.freeze({
  inspection_scheduled: "Inspection scheduled",
  report_on_track: "Report on track",
  waiting_on_client: "Waiting on client",
});

function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeInput(input) {
  const label = INPUT_LABELS[input?.input_type];
  if (!label) return null;

  return {
    id: input.id || `${input.input_type}-${input.created_at || ""}`,
    label,
    actorRole: input.actor_role || null,
    createdAt: formatDateTime(input.created_at),
    expiresAt: formatDateTime(input.expires_at),
    note: typeof input.note === "string" && input.note.trim() ? input.note.trim() : null,
  };
}

export default function OperationalInputsReadOnly({
  inputs = [],
  loading = false,
  error = null,
  compact = false,
  className = "",
} = {}) {
  const rows = (Array.isArray(inputs) ? inputs : []).map(normalizeInput).filter(Boolean);

  if (loading || error || rows.length === 0) return null;

  if (compact) {
    return (
      <div
        aria-label="Operational status evidence"
        className={`rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-700 ${className}`.trim()}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Context
          </span>
          {rows.map((row) => (
            <span
              key={row.id}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
            >
              {row.label}
              {row.actorRole ? ` · ${row.actorRole}` : ""}
            </span>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-slate-500">
          {rows.map((row) => (
            <span key={`${row.id}-meta`}>
              {row.createdAt ? `Added ${row.createdAt}` : row.expiresAt ? `Fresh until ${row.expiresAt}` : "Temporary context"}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <WorkspaceSurface
      variant="evidence"
      aria-label="Operational status evidence"
      className={`bg-white p-3 ${className}`.trim()}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Operational Context</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Read-only status evidence for this order.
          </p>
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Evidence
        </span>
      </div>

      <div className={compact ? "space-y-2" : "grid gap-2 sm:grid-cols-2"}>
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-700"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">{row.label}</div>
              {row.actorRole && (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {row.actorRole}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-slate-500">
              {row.createdAt && <span>Added {row.createdAt}</span>}
              {row.expiresAt && <span>Fresh until {row.expiresAt}</span>}
            </div>
            {row.note && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">{row.note}</p>
            )}
          </div>
        ))}
      </div>
    </WorkspaceSurface>
  );
}
