import { deriveReviewContextSummary } from "./deriveReviewContextSummary";

const TONE_CLASSES = Object.freeze({
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
});

export default function ReviewContextSummary({
  order = null,
  activities = null,
  documents = null,
  now,
  compact = false,
  className = "",
} = {}) {
  const summary = deriveReviewContextSummary({ order, activities, documents, now });
  if (!summary) return null;

  return (
    <section
      aria-label="Review context summary"
      className={`rounded-lg border px-3 py-2.5 ${
        TONE_CLASSES[summary.tone] || TONE_CLASSES.neutral
      } ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
            Review / Revision Context
          </div>
          <div className="mt-1 text-sm font-semibold">{summary.label}</div>
        </div>
        <span className="rounded-full border border-current/20 bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
          Derived
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-5">{summary.message}</p>
      {!compact && summary.details?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {summary.details.map((detail) => (
            <span
              key={detail}
              className="rounded-full border border-current/15 bg-white/60 px-2 py-0.5 text-[11px] font-medium"
            >
              {detail}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
