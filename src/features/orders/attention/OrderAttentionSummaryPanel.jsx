import { deriveOrderAttentionSummary } from "./deriveOrderAttentionSummary";

const TONE_CLASSES = Object.freeze({
  critical: "border-rose-200 bg-rose-50 text-rose-900",
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-800",
});

export default function OrderAttentionSummaryPanel({
  order,
  documents = null,
  documentCount = null,
  title = "Attention Summary",
  description = "Read-only signals derived from loaded order context.",
  compact = false,
  className = "",
} = {}) {
  const signals = deriveOrderAttentionSummary({ order, documents, documentCount });

  if (!order) return null;

  return (
    <section
      aria-label="Order attention summary"
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`.trim()}
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Derived
        </span>
      </div>

      <div className={compact ? "grid gap-2" : "grid gap-2 sm:grid-cols-2 xl:grid-cols-3"}>
        {signals.map((signal) => (
          <div
            key={signal.id}
            className={`rounded-lg border px-3 py-2 ${TONE_CLASSES[signal.tone] || TONE_CLASSES.neutral}`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-current opacity-70">
              {signal.label}
            </div>
            <div className="mt-1 text-sm font-medium leading-5 text-current">{signal.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
